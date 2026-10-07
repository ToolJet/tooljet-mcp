import type { ToolJetClient } from './tooljetClient.js';
import { emptyViewerOnlyParams, resolveStaticBindings } from './staticBindings.js';
import { batchSafeRead } from './tools/runQueries.js';
import { containsComponentBinding, schemaNameHint } from './tools/runQuery.js';

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
 * - `not_run`: not a read this check may run, with the reason.
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
}

const MAX_READS = 10;
const CLOCK_SKEW = /JWT issued at future/i;
const CLOCK_SKEW_RETRY_MS = 1500;
const REASON_CHARS = 160;

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
  const check: ReadCheck = { ran: 0, rows: {}, failed: [], inconclusive: [], not_run: [] };
  const runnable: string[] = [];
  for (const id of wanted) {
    const query = byId.get(id);
    if (!query) continue;
    const name = query.name ?? id;
    const verdict = batchSafeRead(query);
    if (!verdict.safe) {
      check.not_run.push({ name, reason: String(verdict.reason ?? 'not a proven bounded read').slice(0, REASON_CHARS) });
    } else if (runnable.length >= MAX_READS) {
      check.not_run.push({ name, reason: `only the first ${MAX_READS} reads of a phase are checked; run this one with run_queries` });
    } else {
      runnable.push(id);
    }
  }
  if (!runnable.length) return check;
  const environmentId = params.environmentId ?? await client.getDevelopmentEnvironmentId();
  await Promise.all(runnable.map(async (id) => {
    const query = byId.get(id)!;
    const name = query.name ?? id;
    const needsViewer = containsComponentBinding(query.options);
    const run = async (): Promise<Record<string, unknown>> => {
      try {
        const bindings = resolveStaticBindings(query.options);
        emptyViewerOnlyParams(query.options, bindings);
        return await client.runQuery({ queryId: id, versionId: params.versionId, environmentId, resolvedOptions: bindings.resolved }) as Record<string, unknown>;
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
    check.ran += 1;
    if (result.status !== 'failed') {
      const rows = rowCount(result);
      if (rows !== undefined) check.rows[name] = rows;
      return;
    }
    const message = String(result.message ?? result.description ?? 'the query failed').slice(0, 600);
    if (needsViewer) {
      check.inconclusive.push({ name, message,
        note: 'This query reads components.*, which a browser-free run leaves empty: the failure may be about the missing value. ' +
          'Check that the query also works when that input is empty, or give the input a default.' });
      return;
    }
    const schemaHint = await schemaNameHint(client, query, result).catch(() => undefined);
    check.failed.push({ name, message, ...(schemaHint ? { schema_hint: schemaHint } : {}) });
  }));
  return check;
}
