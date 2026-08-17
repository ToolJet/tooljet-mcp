import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listDatasourcesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_datasources',
    description:
      "List the datasources available to an app version, including the built-in ToolJet-DB datasource (kind 'tooljetdb') to use as the datasource_id for add_query.",
    inputSchema: {
      version_id: z.string(),
    },
    async handler(args: { version_id: string }) {
      try {
        const result = await client.listDatasources(args.version_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
