import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function runQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_query',
    description:
      'Run an already-created query and return its REAL result — the browser-free way to see actual data. ' +
      'Use it to (a) verify a query works before binding UI to it, and (b) inspect real column values / ' +
      'distinct values (statuses, categories) before writing chart series, dropdown options, or filters. ' +
      'The query must already exist (create it with add_query first). Returns { status: "ok"|"failed", ' +
      'data: [...rows], ... } — HTTP is 200 even on failure, so CHECK `status` and read `message` on failure. ' +
      'Runs the SAVED query as-is; it does not mutate it.',
    inputSchema: {
      query_id: z.string(),
      version_id: z.string(),
      environment_id: z.string().optional(),
    },
    async handler(args: { query_id: string; version_id: string; environment_id?: string }) {
      try {
        const result = await client.runQuery({
          queryId: args.query_id,
          versionId: args.version_id,
          environmentId: args.environment_id,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
