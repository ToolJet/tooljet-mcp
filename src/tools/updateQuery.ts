import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function updateQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_query',
    description:
      'Change an existing query in place. `options` REPLACES the stored options wholesale — send the ' +
      'FULL options object (e.g. the complete { operation, table_id, list_rows, runOnPageLoad } for a ' +
      'ToolJet-DB list), not a partial. Get the current options from get_app_summary before editing.',
    inputSchema: {
      query_id: z.string(),
      version_id: z.string(),
      options: z.record(z.string(), z.any()),
      name: z.string().optional(),
    },
    async handler(args: { query_id: string; version_id: string; options: Record<string, unknown>; name?: string }) {
      try {
        const result = await client.updateQuery({
          queryId: args.query_id,
          versionId: args.version_id,
          options: args.options,
          name: args.name,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
