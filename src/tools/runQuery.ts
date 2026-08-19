import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
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
      'Runs the SAVED query as-is; it does not mutate it. If saved options reference `components.*`, the result ' +
      'includes a warning because browser-free execution cannot prove the component-resolved pagination/filter behavior.',
    inputSchema: {
      query_id: z.string(),
      version_id: z.string(),
      environment_id: z.string().optional(),
    },
    async handler(args: { query_id: string; version_id: string; environment_id?: string }) {
      try {
        const warnings: string[] = [];
        try {
          const query = await client.getQuery(args.query_id, args.version_id);
          if (containsComponentBinding(query.options)) {
            warnings.push(
              'Saved query options reference components.*. Browser-free run_query does not resolve live component state, so status:"ok" validates only the static datasource path; verify pagination/filter values in the viewer.'
            );
          }
        } catch {
          warnings.push(
            'Saved query options could not be inspected before execution; this result does not validate browser-bound component inputs.'
          );
        }
        const result = await client.runQuery({
          queryId: args.query_id,
          versionId: args.version_id,
          environmentId: args.environment_id,
        });
        return ok(warnings.length ? { ...result, warnings } : result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
