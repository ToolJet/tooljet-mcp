import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listDatasourcesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_datasources',
    title: 'List Datasources',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      "List the workspace-connected datasources available to the current user/environment, including the built-in " +
      "ToolJet-DB datasource (kind 'tooljetdb') to use as the datasource_id for add_query. These sources appear " +
      'automatically in both existing and newly created apps; there is no per-app attach/link step. If an expected ' +
      'source is absent, check workspace, permissions, connection, and environment configuration. Each returned ' +
      'source includes settings_url for user-assisted connection repair; never enter credentials or save changes for the user. ' +
      'Pass the actual app version_id: for a new app, create_app must return it before this call.',
    inputSchema: {
      version_id: z.string().trim().min(1),
    },
    async handler(args: { version_id: string }) {
      try {
        if (typeof args.version_id !== 'string' || !args.version_id.trim()) {
          throw new Error('version_id is required. For a new app, call create_app first and use its returned version_id.');
        }
        const result = await client.listDatasources(args.version_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
