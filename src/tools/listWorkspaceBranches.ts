import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

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
