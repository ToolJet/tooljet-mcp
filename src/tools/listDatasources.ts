import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listDatasourcesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_datasources',
    description:
      "List the workspace-connected datasources available to the current user/environment, including the built-in " +
      "ToolJet-DB datasource (kind 'tooljetdb') to use as the datasource_id for add_query. These sources appear " +
      'automatically in both existing and newly created apps; there is no per-app attach/link step. If an expected ' +
      'source is absent, check workspace, permissions, connection, and environment configuration.',
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
