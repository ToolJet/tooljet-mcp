import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listWorkspacesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspaces',
    description:
      'List the ToolJet workspaces (organizations) this user belongs to: [{ id, name, slug, is_default, ' +
      'is_current }]. A user can be in multiple workspaces, and apps/tables/datasources are scoped to the ' +
      'ACTIVE one. If there is more than one, confirm which to use (then use_workspace) BEFORE creating ' +
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
