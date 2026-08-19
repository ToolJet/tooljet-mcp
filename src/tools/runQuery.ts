import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import {
  LARGE_READ_ROW_THRESHOLD,
  assessQueryRead,
  extractRowCount,
  sameReadSource,
} from '../queryExecutionSafety.js';
import { ok, fail, type ToolDef } from './types.js';

export function containsComponentBinding(value: unknown): boolean {
  if (typeof value === 'string') return /\bcomponents\s*\./.test(value);
  if (Array.isArray(value)) return value.some(containsComponentBinding);
  if (value && typeof value === 'object') return Object.values(value).some(containsComponentBinding);
  return false;
}

export function runQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_query',
    description:
      'Run an already-created query and return its REAL result — the browser-free way to see actual data. ' +
      'Use it to (a) verify a query works before binding UI to it, and (b) inspect real column values / ' +
      'distinct values (statuses, categories) before writing chart series, dropdown options, or filters. ' +
      'The query must already exist (create it with add_query first). Returns { status: "ok"|"failed", ' +
      'data: [...rows], ... } — HTTP is 200 even on failure, so CHECK `status` and read `message` on failure. ' +
      `Runs the SAVED query as-is; it does not mutate it. SELECT * is always refused. Reads with no static ` +
      `limit at or below ${LARGE_READ_ROW_THRESHOLD} rows require a same-source count_query_id first; if the ` +
      `observed count is larger, retry only after explicit user approval with user_confirmed_large_read:true. ` +
      'Never set that flag from inferred consent. If saved options reference `components.*`, the result ' +
      'includes a warning because browser-free execution cannot prove the component-resolved pagination/filter behavior.',
    inputSchema: {
      query_id: z.string(),
      version_id: z.string(),
      environment_id: z.string().optional(),
      count_query_id: z.string().optional(),
      user_confirmed_large_read: z.boolean().optional(),
    },
    async handler(args: {
      query_id: string;
      version_id: string;
      environment_id?: string;
      count_query_id?: string;
      user_confirmed_large_read?: boolean;
    }) {
      try {
        const warnings: string[] = [];
        const query = await client.getQuery(args.query_id, args.version_id);
        const assessment = assessQueryRead(query);
        if (!assessment.provenRead || assessment.selectStar) {
          return fail(new Error(
            `run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? 'not a proven read'}`
          ));
        }
        if (containsComponentBinding(query.options)) {
          warnings.push(
            'Saved query options reference components.*. Browser-free run_query does not resolve live component state, so status:"ok" validates only the static datasource path; verify pagination/filter values in the viewer.'
          );
        }

        let preflight: Record<string, unknown> | undefined;
        if (!assessment.directSafe) {
          if (!assessment.requiresCountPreflight || !args.count_query_id) {
            return fail(new Error(
              `run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? 'result size is not bounded'}` +
                ` Create a same-source COUNT(*)/ToolJet DB count-aggregate query and retry with count_query_id. ` +
                `Use server-side pagination when the count exceeds ${LARGE_READ_ROW_THRESHOLD}.`
            ));
          }
          if (args.count_query_id === args.query_id) {
            return fail(new Error('count_query_id must be a separate count-only query.'));
          }
          const countQuery = await client.getQuery(args.count_query_id, args.version_id);
          const countAssessment = assessQueryRead(countQuery);
          if (!countAssessment.countOnly || !countAssessment.directSafe || !sameReadSource(assessment, countAssessment)) {
            return fail(new Error(
              `run_query refused the count preflight: "${countQuery.name ?? countQuery.id}" must be a proven count-only ` +
                'query against the same simple table as the target query.'
            ));
          }
          const countResult = await client.runQuery({
            queryId: countQuery.id,
            versionId: args.version_id,
            environmentId: args.environment_id,
          });
          const rowCount = extractRowCount(countResult);
          if (rowCount === undefined) {
            return fail(new Error(
              `Count preflight "${countQuery.name ?? countQuery.id}" did not return one row with exactly one numeric count; target query was not run.`
            ));
          }
          preflight = { count_query_id: countQuery.id, row_count: rowCount, threshold: LARGE_READ_ROW_THRESHOLD };
          if (rowCount > LARGE_READ_ROW_THRESHOLD && !args.user_confirmed_large_read) {
            return fail(new Error(
              `Target query was not run: count preflight found ${rowCount} rows, above the ` +
                `${LARGE_READ_ROW_THRESHOLD}-row threshold. Recommend server-side pagination. If a full read is still ` +
                'necessary, tell the user the observed count and ask explicitly; retry with ' +
                'user_confirmed_large_read:true only after they approve.'
            ));
          }
          if (rowCount > LARGE_READ_ROW_THRESHOLD) {
            warnings.push(
              `User-confirmed large read: count preflight found ${rowCount} rows. Server-side pagination remains recommended.`
            );
          }
        }
        const result = await client.runQuery({
          queryId: args.query_id,
          versionId: args.version_id,
          environmentId: args.environment_id,
        });
        return ok({
          ...result,
          ...(preflight ? { preflight } : {}),
          ...(warnings.length ? { warnings } : {}),
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
