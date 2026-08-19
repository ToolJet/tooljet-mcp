import { z } from 'zod';
import type { QuerySummary, ToolJetClient } from '../tooljetClient.js';
import { containsComponentBinding } from './runQuery.js';
import { ok, fail, type ToolDef } from './types.js';

const SQL_KINDS = new Set([
  'postgresql', 'mysql', 'mariadb', 'mssql', 'sqlserver', 'cockroachdb', 'redshift',
  'snowflake', 'bigquery', 'clickhouse', 'oracle', 'sqlite',
]);

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

/** Conservative proof, not a guess: unknown/plugin/API operations stay on singular run_query. */
export function batchSafeRead(query: QuerySummary): { safe: boolean; reason?: string } {
  const kind = query.kind?.toLowerCase();
  const options = record(query.options);
  if (!kind || !options) return { safe: false, reason: 'kind/options are unavailable' };
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;

  if (kind === 'tooljetdb') {
    return operation === 'list_rows' || operation === 'join_tables'
      ? { safe: true }
      : { safe: false, reason: `ToolJet DB operation ${operation ?? '<missing>'} is not a proven read` };
  }

  if (SQL_KINDS.has(kind)) {
    if (operation === 'list_rows') return { safe: true };
    const sql = typeof options.query === 'string'
      ? options.query
      : typeof options.sql === 'string'
        ? options.sql
        : undefined;
    if (!sql) return { safe: false, reason: 'SQL text is unavailable' };
    const compact = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    return /^(select\b|show\b|describe\b|explain\s+(select\b|show\b))/i.test(compact) && !/;\s*\S/.test(compact)
      ? { safe: true }
      : { safe: false, reason: 'SQL is not a single proven read statement' };
  }

  return { safe: false, reason: `datasource kind ${kind} has no batch-safe read classifier` };
}

export function runQueriesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_queries',
    description:
      'Run 1–10 already-created, proven read-only queries concurrently and return ordered per-query ' +
      'results. It currently accepts ToolJet DB list_rows/join_tables and SQL datasource list_rows or ' +
      'one SELECT/SHOW/DESCRIBE/EXPLAIN read. Every query is preflighted before any execution; mutations, ' +
      'RunJS, paid/remote API operations, and unknown kinds are refused. Metadata and the environment are ' +
      'loaded once. Returns {queries:[{query_id,name,status,data|message,warnings?}]}; one runtime failure ' +
      'does not hide other read results. Component-bound options receive the run_query viewer warning.',
    inputSchema: {
      query_ids: z.array(z.string()).min(1).max(10),
      version_id: z.string(),
      environment_id: z.string().optional(),
    },
    async handler(args: { query_ids: string[]; version_id: string; environment_id?: string }) {
      try {
        if (new Set(args.query_ids).size !== args.query_ids.length) {
          return fail(new Error('run_queries query_ids must be unique.'));
        }
        const saved = await client.getQueries(args.version_id);
        const byId = new Map(saved.map((query) => [query.id, query]));
        const missing = args.query_ids.filter((queryId) => !byId.has(queryId));
        if (missing.length) return fail(new Error(`run_queries could not find query ids: ${missing.join(', ')}.`));
        const unsafe = args.query_ids.flatMap((queryId) => {
          const verdict = batchSafeRead(byId.get(queryId)!);
          return verdict.safe ? [] : [`${queryId}: ${verdict.reason}`];
        });
        if (unsafe.length) {
          return fail(new Error(`run_queries refused non-proven reads before execution: ${unsafe.join('; ')}.`));
        }

        const environmentId = args.environment_id ?? await client.getDevelopmentEnvironmentId();
        const queries = await Promise.all(args.query_ids.map(async (queryId) => {
          const query = byId.get(queryId)!;
          const warnings = containsComponentBinding(query.options)
            ? ['Saved query options reference components.*. Browser-free run_queries does not resolve live component state; verify pagination/filter values in the viewer.']
            : [];
          try {
            const result = await client.runQuery({ queryId, versionId: args.version_id, environmentId });
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              ...result,
              ...(warnings.length ? { warnings } : {}),
            };
          } catch (error) {
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              status: 'failed',
              message: error instanceof Error ? error.message : String(error),
              ...(warnings.length ? { warnings } : {}),
            };
          }
        }));
        return ok({ queries });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
