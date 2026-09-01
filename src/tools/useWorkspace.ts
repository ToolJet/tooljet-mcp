import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function useWorkspaceTool(client: ToolJetClient): ToolDef {
  return {
    name: 'use_workspace',
    title: 'Confirm Active Workspace',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'Confirm the ACTIVE workspace (organization). This server is scoped to a single workspace by its ' +
      'personal access token and cannot switch: passing that workspace id returns it, and any other id ' +
      'errors naming the one in use. Everything is created in that workspace, so there is nothing to ' +
      'select at setup — call list_workspaces if you need its id, name, slug or datasources_url.',
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
