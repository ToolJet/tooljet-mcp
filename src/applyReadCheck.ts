import type { ToolJetClient } from './tooljetClient.js';
import { runUnattended } from './unattendedRun.js';
import { declaredParameterDefaults, emptyViewerOnlyParams, resolveStaticBindings } from './staticBindings.js';
import { containsComponentBinding, schemaNameHint } from './tools/runQuery.js';
import { NOT_CHECKED_AUTOMATICALLY, autoReadPreflight } from './autoReadPreflight.js';

/**
 * The reads a phase wrote, run once after it is applied.
 *
 * A build can apply a query that fails on first load and never find out: the model decides whether to run anything,
 * and on one app it ran a single query in forty-two tool calls while four others failed at runtime (2026-09-29).
 * apply_app_phase knows which queries the phase created or updated, so it runs the ones run_queries would accept
 * (proven, bounded reads: never a write, a remote or paid call, or RunJS) and reports the outcome by query name.
 *
 * - `failed`: the read ran and the datasource refused it. The query needs fixing.
 * - `inconclusive`: the read takes a component's value, which a browser-free run leaves empty; it failed, and the
 *   failure may be about the missing value rather than the query.
 * - `not_run`: not a read this check may run, with the reason. What runs is decided by autoReadPreflight.ts, the
 *   same preflight run_queries uses: a raw SQL read whose bound or functions it cannot prove (CM-36), and a GUI query
 *   that is not a bounded list_rows of a known connector (CM-37), are not run: neither passed nor failed, with a
 *   reason that says to run it explicitly.
 * - `queries`: one entry per query, in the order asked: `checked` (it ran; `outcome` passed, failed or
 *   inconclusive), `refused` (the preflight would not run it) or `skipped` (over the per-phase cap). Only a checked
 *   query with outcome passed is a passed check.
 *
 * It never fails the apply: the phase is already written, and the result says what to repair.
 */
export interface ReadCheck {
  /** How many reads were executed. */
  ran: number;
  /** Rows each successful read returned, by query name. */
  rows: Record<string, number>;
  failed: Array<{ name: string; message: string; schema_hint?: unknown }>;
  inconclusive: Array<{ name: string; message: string; note: string }>;
  not_run: Array<{ name: string; reason: string }>;
  queries: ReadCheckEntry[];
}

export type ReadCheckEntry =
  | { name: string; status: 'checked'; outcome: 'passed' | 'failed' | 'inconclusive' }
  | { name: string; status: 'refused' | 'skipped'; reason: string };

const MAX_READS = 10;
const CLOCK_SKEW = /JWT issued at future/i;
const CLOCK_SKEW_RETRY_MS = 1500;
const REASON_CHARS = 160;

const PARAMETER_BINDING = /^\{\{\s*parameters\.([A-Za-z_$][\w$]*)\s*\}\}$/;
const SQL_EQUALS_PARAMETER = /=\s*\{\{\s*parameters\.([A-Za-z_$][\w$]*)\s*\}\}/g;
const SQL_EQUALS_PLACEHOLDER = /=\s*:([A-Za-z_]\w*)/g;

/**
 * Parameters a read matches one record by (`id eq {{parameters.id}}`, `WHERE id = {{parameters.id}}`, or `= :id` with
 * `query_params` [["id", "{{parameters.id}}"]]) that have no default: a record's detail, which the screen runs with the
 * id it shows. Run without one it can only fail, so the check reports it as needing a value rather than as broken.
 */
export function parametersWithoutValue(options: unknown): string[] {
  const defaults = declaredParameterDefaults(options);
  const bound = new Set<string>();
  const sqlPlaceholders = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      for (const m of value.matchAll(SQL_EQUALS_PARAMETER)) bound.add(m[1]!);
      for (const m of value.matchAll(SQL_EQUALS_PLACEHOLDER)) sqlPlaceholders.add(m[1]!);
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      const clause = value as { operator?: unknown; value?: unknown };
      const m = clause.operator === 'eq' && typeof clause.value === 'string' ? clause.value.trim().match(PARAMETER_BINDING) : null;
      if (m) bound.add(m[1]!);
      Object.values(value).forEach(visit);
    }
  };
  visit(options);
  const params = options && typeof options === 'object' ? (options as { query_params?: unknown }).query_params : undefined;
  for (const pair of Array.isArray(params) ? params : []) {
    const m = Array.isArray(pair) && typeof pair[1] === 'string' ? pair[1].trim().match(PARAMETER_BINDING) : null;
    if (m && sqlPlaceholders.has(String(pair[0]))) bound.add(m[1]!);
  }
  return [...bound].filter((name) => {
    const value = defaults[name];
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  });
}

const rowCount = (result: Record<string, unknown>): number | undefined => {
  const data = result.data;
  if (Array.isArray(data)) return data.length;
  return undefined;
};

export async function checkPlanReads(
  client: ToolJetClient,
  params: { versionId: string; queryIds: string[]; environmentId?: string; retryDelayMs?: number },
): Promise<ReadCheck | undefined> {
  const wanted = [...new Set(params.queryIds)];
  if (!wanted.length) return undefined;
  const saved = await client.getQueries(params.versionId);
  const byId = new Map(saved.map((query) => [query.id, query]));
  const check: ReadCheck = { ran: 0, rows: {}, failed: [], inconclusive: [], not_run: [], queries: [] };
  const entries = new Map<string, ReadCheckEntry>();
  const runnable: string[] = [];
  let missing: string[] = [];
  for (const id of wanted) {
    const query = byId.get(id);
    if (!query) continue;
    const name = query.name ?? id;
    const verdict = autoReadPreflight(query);
    if (!verdict.run) {
      // A refusal by the preflight's own rules keeps its whole reason: it is what to fix or how to run it.
      const reason = verdict.reason.startsWith(NOT_CHECKED_AUTOMATICALLY) ? verdict.reason : verdict.reason.slice(0, REASON_CHARS);
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: 'refused', reason });
    } else if ((missing = parametersWithoutValue(query.options)).length) {
      const reason = `not checked: needs a value for ${missing.map((p) => `parameters.${p}`).join(', ')}, which ` +
        `${missing.length > 1 ? 'have' : 'has'} no default (a record's detail runs with the id the screen passes). ` +
        'Neither passed nor failed: open a record in the app to check it.';
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: 'skipped', reason });
    } else if (runnable.length >= MAX_READS) {
      const reason = `only the first ${MAX_READS} reads of a phase are checked; run this one with run_queries`;
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: 'skipped', reason });
    } else {
      runnable.push(id);
    }
  }
  const ledger = (): ReadCheck => {
    check.queries = wanted.flatMap((id) => entries.get(id) ?? []);
    return check;
  };
  if (!runnable.length) return ledger();
  const environmentId = params.environmentId ?? await client.getDevelopmentEnvironmentId();
  await Promise.all(runnable.map(async (id) => {
    const query = byId.get(id)!;
    const name = query.name ?? id;
    const needsViewer = containsComponentBinding(query.options);
    const run = async (): Promise<Record<string, unknown>> => {
      try {
        const bindings = resolveStaticBindings(query.options);
        emptyViewerOnlyParams(query.options, bindings);
        // Bounded on this side: a deadline (unattendedRun.ts); the LIMIT and the cross-product refusal are the preflight's.
        return await runUnattended(client, { queryId: id, versionId: params.versionId, environmentId, resolvedOptions: bindings.resolved });
      } catch (error) {
        return { status: 'failed', message: error instanceof Error ? error.message : String(error) };
      }
    };
    let result = await run();
    // ToolJet mints the ToolJet DB token a moment ahead of PostgREST's clock now and then, and the read is refused as
    // "JWT issued at future" (s61, 2026-09-30): not the query's fault, so it is asked again once before it is reported.
    if (result.status === 'failed' && CLOCK_SKEW.test(String(result.message ?? result.description ?? ''))) {
      await new Promise((resolve) => setTimeout(resolve, params.retryDelayMs ?? CLOCK_SKEW_RETRY_MS));
      result = await run();
    }
    if (result.timed_out === true) {
      // Not checked, neither passed nor failed: the run outlasted the automatic check's deadline (unattendedRun.ts).
      const reason = String(result.message);
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: 'skipped', reason });
      return;
    }
    check.ran += 1;
    if (result.status !== 'failed') {
      const rows = rowCount(result);
      if (rows !== undefined) check.rows[name] = rows;
      entries.set(id, { name, status: 'checked', outcome: 'passed' });
      return;
    }
    const message = String(result.message ?? result.description ?? 'the query failed').slice(0, 600);
    if (needsViewer) {
      check.inconclusive.push({ name, message,
        note: 'This query reads components.*, which a browser-free run leaves empty: the failure may be about the missing value. ' +
          'Check that the query also works when that input is empty, or give the input a default.' });
      entries.set(id, { name, status: 'checked', outcome: 'inconclusive' });
      return;
    }
    const schemaHint = await schemaNameHint(client, query, result).catch(() => undefined);
    check.failed.push({ name, message, ...(schemaHint ? { schema_hint: schemaHint } : {}) });
    entries.set(id, { name, status: 'checked', outcome: 'failed' });
  }));
  return ledger();
}
