import { z } from 'zod';
import type { QuerySummary, ToolJetClient } from '../tooljetClient.js';
import { assessQueryRead } from '../queryExecutionSafety.js';
import { containsComponentBinding, failureRecovery, schemaNameHint } from './runQuery.js';
import { ok, fail, type ToolDef } from './types.js';
import { resolveRef } from '../refResolution.js';

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
    title: 'Run Queries',
    // Executes whatever the queries hold against the customer datasource — which may write or delete.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Run 1–10 already-created, proven read-only queries concurrently and return ordered per-query ' +
      'results. It currently accepts ToolJet DB list_rows/join_tables and SQL datasource list_rows or ' +
      'one bounded explicit-column SELECT/SHOW/DESCRIBE/EXPLAIN read. Every query is preflighted before any execution; SELECT *, unbounded reads, mutations, ' +
      'RunJS, paid/remote API operations, and unknown kinds are refused. Metadata and the environment are ' +
      'loaded once. Returns {queries:[{query_id,name,status,data|message,warnings?}]}; one runtime failure ' +
      'does not hide other read results. Pass include_data:false to only confirm each query runs — the ' +
      'result drops the rows and returns {status,row_count} instead, for lightweight post-build verification. ' +
      'Use singular run_query with count_query_id for a count-first large-read preflight. Component-bound options receive the run_query viewer warning.',
    inputSchema: {
      query_ids: z.array(z.string()).min(1).max(10),
      version_id: z.string(),
      environment_id: z.string().optional(),
      include_data: z.boolean().optional().describe(
        'Default true. Set false to verify execution without returning rows: each result keeps status/' +
          'message/warnings and adds row_count, but omits data. Use for smoke checks that only need the run status.'
      ),
    },
    async handler(args: {
      query_ids: string[];
      version_id: string;
      environment_id?: string;
      include_data?: boolean;
    }) {
      try {
        if (new Set(args.query_ids).size !== args.query_ids.length) {
          return fail(new Error('run_queries query_ids must be unique.'));
        }
        const saved = await client.getQueries(args.version_id);
        const byId = new Map(saved.map((query) => [query.id, query]));
        // Accept query NAMES here too — {{queries.<name>}} is the handle the model works in, so a bare
        // "could not find query ids" is a false negative that invites a re-read loop. See refResolution.ts.
        const resolveWarnings: string[] = [];
        const resolveErrors: string[] = [];
        args = {
          ...args,
          query_ids: args.query_ids.map((queryId) => {
            if (byId.has(queryId)) return queryId;
            const resolution = resolveRef(saved, queryId, 'Query', `on version "${args.version_id}"`);
            if (!resolution.ok) {
              resolveErrors.push(resolution.error);
              return queryId;
            }
            if (resolution.warning) resolveWarnings.push(resolution.warning);
            return resolution.target.id;
          }),
        };
        if (resolveErrors.length) return fail(new Error(resolveErrors.join(' ')));
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
            const failed = result.status === 'failed';
            const recovery = failed ? failureRecovery(query, result as Record<string, unknown>) : undefined;
            const schemaHint = failed ? await schemaNameHint(client, query, result as Record<string, unknown>) : undefined;
            // include_data:false keeps only the run status (+ row_count), dropping the row payload — the
            // caller just needs to confirm the query executed, and a large data array would bloat/risk the
            // response for no benefit.
            const shaped =
              args.include_data === false
                ? (() => {
                    const { data, ...rest } = result as Record<string, unknown>;
                    return Array.isArray(data) ? { ...rest, row_count: data.length } : rest;
                  })()
                : result;
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              ...shaped,
              ...(warnings.length ? { warnings } : {}),
              ...(recovery ? { recovery } : {}),
              ...(schemaHint ? { schema_hint: schemaHint } : {}),
            };
          } catch (error) {
            const failure = { status: 'failed', message: error instanceof Error ? error.message : String(error) };
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              ...failure,
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
