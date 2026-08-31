import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listWorkspacesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspaces',
    title: 'List Workspaces',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'List the ToolJet workspaces (organizations) this user belongs to: [{ id, name, slug, datasources_url, is_default, ' +
      'is_current }]. datasources_url opens ToolJet connection management for user-assisted setup/repair. ' +
      'A user can be in multiple workspaces, and apps/tables/datasources are scoped to the ' +
      'ACTIVE one. This server is token-scoped to a single workspace, so exactly one is returned and there ' +
      'anything. `is_current` marks the active workspace.',
    inputSchema: {},
    async handler() {
      try {
        return ok(await client.listWorkspaces());
      } catch (err) {
        return fail(err);
      }
    },
  };
}
