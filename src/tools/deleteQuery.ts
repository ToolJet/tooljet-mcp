import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function deleteQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_query',
    description:
      'Delete a query by id. Any component/event bindings that referenced it (e.g. run-query actions, ' +
      '{{queries.<name>.data}}) will break — update those first.',
    inputSchema: {
      query_id: z.string(),
      version_id: z.string(),
    },
    async handler(args: { query_id: string; version_id: string }) {
      try {
        const result = await client.deleteQuery({ queryId: args.query_id, versionId: args.version_id });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
