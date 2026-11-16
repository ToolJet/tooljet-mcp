import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listWorkspacesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspaces',
    title: 'List Workspaces',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
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

export function listWorkspaceBranchesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspace_branches', title: 'List Workspace Branches',
    description: 'List existing workspace branches and whether multi-branching is enabled. For a branching workspace, select the requested feature branch and pass its exact branch_id on every app/data tool call. The default branch is protected. Does not create, activate, push or merge branches.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    inputSchema: {},
    async handler() {
      try { return ok(await client.listWorkspaceBranches()); } catch (error) { return fail(error); }
    },
  };
}
