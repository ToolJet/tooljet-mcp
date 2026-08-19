import { z } from 'zod';
import type { QuerySummary, ToolJetClient } from '../tooljetClient.js';
import { assessQueryRead } from '../queryExecutionSafety.js';
import { containsComponentBinding, datasourceRecovery } from './runQuery.js';
import { ok, fail, type ToolDef } from './types.js';

/** Conservative proof, not a guess: unknown/plugin/API operations stay on singular run_query. */
export function batchSafeRead(query: QuerySummary): { safe: boolean; reason?: string } {
  const assessment = assessQueryRead(query);
  return assessment.provenRead && assessment.directSafe && !assessment.selectStar
    ? { safe: true }
    : {
        safe: false,
        reason: assessment.reason ??
          (assessment.requiresCountPreflight
            ? 'read requires a count-first preflight through singular run_query'
            : 'query is not a proven bounded read'),
      };
}

export function runQueriesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_queries',
    description:
      'Run 1–10 already-created, proven read-only queries concurrently and return ordered per-query ' +
      'results. It currently accepts ToolJet DB list_rows/join_tables and SQL datasource list_rows or ' +
      'one bounded explicit-column SELECT/SHOW/DESCRIBE/EXPLAIN read. Every query is preflighted before any execution; SELECT *, unbounded reads, mutations, ' +
      'RunJS, paid/remote API operations, and unknown kinds are refused. Metadata and the environment are ' +
      'loaded once. Returns {queries:[{query_id,name,status,data|message,warnings?}]}; one runtime failure ' +
      'does not hide other read results. Use singular run_query with count_query_id for a count-first large-read preflight. Component-bound options receive the run_query viewer warning.',
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
          const datasourceRepair = datasourceRecovery(query);
          try {
            const result = await client.runQuery({ queryId, versionId: args.version_id, environmentId });
            const recovery = result.status === 'failed' ? datasourceRepair : undefined;
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              ...result,
              ...(warnings.length ? { warnings } : {}),
              ...(recovery ? { recovery } : {}),
            };
          } catch (error) {
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              status: 'failed',
              message: error instanceof Error ? error.message : String(error),
              ...(warnings.length ? { warnings } : {}),
              ...(datasourceRepair ? { recovery: datasourceRepair } : {}),
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
