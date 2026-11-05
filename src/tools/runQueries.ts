import { emptyParamsNote, emptyViewerOnlyParams, resolveStaticBindings, unresolvedNote } from '../staticBindings.js';
import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { autoReadPreflight } from '../autoReadPreflight.js';
import { containsComponentBinding, failureRecovery, failureVerification, schemaNameHint, queryResultBindingHint } from './runQuery.js';
import { ok, fail, type ToolDef } from './types.js';
import { resolveRef } from '../refResolution.js';

// The general check, kept here for its callers; run_queries itself runs only what the automatic preflight allows.
export { batchSafeRead } from '../autoReadPreflight.js';

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
      'results. It runs only what the automatic read check may run: ToolJet DB list_rows (bounded at list_rows.limit) ' +
      'or one bounded SELECT in sql_execution, and PostgreSQL/MySQL/MariaDB/SQL Server/Oracle GUI list_rows bounded at ' +
      'the top-level limit or one bounded explicit-column SELECT in mode sql that calls only well-known pure functions. ' +
      'Every query is preflighted before any execution; if any is refused, none runs and the error names each refused ' +
      'query and why ("not checked automatically" means run that one with singular run_query). SELECT *, unbounded reads, mutations, ' +
      'RunJS, paid/remote API operations, and other kinds are refused — remote API reads (restapi, openapi, '+
      'servicenow, influxdb) can never run here; use singular run_query with user_confirmed_remote_read. '+
      'Metadata and the environment are ' +
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
        // The same preflight as the automatic read check after apply (autoReadPreflight.ts): the agent's finish step and
        // binding probes call this tool with nobody watching, and a query the apply check refused ran here (CM-36).
        const unsafe = args.query_ids.flatMap((queryId) => {
          const verdict = autoReadPreflight(byId.get(queryId)!);
          return verdict.run ? [] : [`${queryId}: ${verdict.reason}`];
        });
        if (unsafe.length) {
          return fail(new Error(`run_queries refused ${unsafe.length === 1 ? 'a query' : 'queries'} before execution: ${unsafe.join('; ')}`));
        }

        const environmentId = args.environment_id ?? await client.getDevelopmentEnvironmentId();
        const queries = await Promise.all(args.query_ids.map(async (queryId) => {
          const query = byId.get(queryId)!;
          const warnings = containsComponentBinding(query.options)
            ? ['Saved query options reference components.*. Browser-free run_queries does not resolve live component state; verify pagination/filter values in the viewer.']
            : [];
          try {
            const bindings = resolveStaticBindings(query.options);
            const emptied = emptyViewerOnlyParams(query.options, bindings);
            if (emptied.length) warnings.push(emptyParamsNote(emptied));
            const liveOnly = bindings.unresolved.filter((b) => !/components\./.test(b));
            if (liveOnly.length) warnings.push(unresolvedNote(liveOnly));
            const result = await client.runQuery({ queryId, versionId: args.version_id, environmentId, resolvedOptions: bindings.resolved });
            const failed = result.status === 'failed';
            const bindingHint = queryResultBindingHint(query, result as Record<string, unknown>);
            const recovery = failed ? failureRecovery(query, result as Record<string, unknown>) : undefined;
            const verification = failed ? failureVerification(query, result as Record<string, unknown>) : undefined;
            const schemaHint = failed ? await schemaNameHint(client, query, result as Record<string, unknown>) : undefined;
            // include_data:false keeps only the run status (+ row_count), dropping the row payload — the
            // caller just needs to confirm the query executed, and a large data array would bloat/risk the
            // response for no benefit.
            const shaped =
              args.include_data === false
                ? (() => {
                    const { data, ...rest } = result as Record<string, unknown>;
                    return Array.isArray(data) ? { ...rest, row_count: data.length }
                      : bindingHint ? { ...rest, row_count: bindingHint.row_count } : rest;
                  })()
                : result;
            return {
              query_id: queryId,
              ...(query.name ? { name: query.name } : {}),
              ...shaped,
              // What let it run, not a claim about its effects: the preflight is a static check (CM-37).
              execution: { query_id: queryId, datasource_kind: query.kind, preflight: 'automatic_read' },
              ...(bindingHint ? { binding_hint: bindingHint } : {}),
              ...(warnings.length ? { warnings } : {}),
              ...(recovery ? { recovery } : {}),
              ...(verification ? { verification } : {}),
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
