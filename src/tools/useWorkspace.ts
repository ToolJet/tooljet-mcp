import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function useWorkspaceTool(client: ToolJetClient): ToolDef {
  return {
    name: 'use_workspace',
    description:
      'Switch the ACTIVE workspace (organization) for all subsequent calls — apps/tables/datasources you ' +
      'create afterwards go into this workspace. Pass a workspace id from list_workspaces. Returns the now-' +
      'active { id, name, slug, datasources_url }. Errors if the user has no access to that workspace. Do this at setup when ' +
      'the user is in more than one workspace, and any time they ask to switch.',
    inputSchema: {
      workspace_id: z.string(),
    },
    async handler(args: { workspace_id: string }) {
      try {
        return ok(await client.useWorkspace(args.workspace_id));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
