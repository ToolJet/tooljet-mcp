import { z } from 'zod';
import type { ToolJetClient, WorkspaceUserRole, WorkspaceUserStatus } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const userRole = z.enum(['admin', 'builder', 'end-user']);
const userStatus = z.enum(['active', 'archived', 'invited']);

export function listWorkspaceAppsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspace_apps',
    title: 'List Workspace Apps',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'List apps in the workspace pinned to the current ToolJet PAT. This cannot inspect or switch to another workspace.',
    inputSchema: {
      page: z.number().int().positive().optional(),
      search_text: z.string().trim().max(100).optional(),
    },
    async handler(args: { page?: number; search_text?: string }) {
      try {
        return ok(await client.listWorkspaceApps({ page: args.page, searchText: args.search_text }));
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export function listWorkspaceUsersTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspace_users',
    title: 'List Workspace Users',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'List users in the workspace pinned to the current ToolJet PAT. Supports pagination, search, and status filtering.',
    inputSchema: {
      page: z.number().int().positive().optional(),
      search_text: z.string().trim().max(100).optional(),
      filter_status: userStatus.optional(),
    },
    async handler(args: { page?: number; search_text?: string; filter_status?: WorkspaceUserStatus }) {
      try {
        return ok(
          await client.listWorkspaceUsers({
            page: args.page,
            searchText: args.search_text,
            status: args.filter_status,
          })
        );
      } catch (error) {
        return fail(error);
      }
    },
  };
}

type ManageWorkspaceUsersArgs = {
  action: 'invite' | 'update' | 'archive' | 'unarchive';
  organization_user_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: WorkspaceUserRole;
  group_ids?: string[];
  user_metadata?: Record<string, unknown>;
  confirm?: boolean;
};

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required for this action.`);
  return value;
}

export function manageWorkspaceUsersTool(client: ToolJetClient): ToolDef {
  const schema = z.object({
    action: z.enum(['invite', 'update', 'archive', 'unarchive']),
    organization_user_id: z.string().uuid().optional(),
    email: z.string().email().optional(),
    first_name: z.string().trim().max(99).optional(),
    last_name: z.string().trim().max(99).optional(),
    role: userRole.optional(),
    group_ids: z.array(z.string().uuid()).max(100).optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional(),
    confirm: z.boolean().optional(),
  }).strict();
  return {
    name: 'manage_workspace_users',
    title: 'Manage Workspace Users',
    strictInput: true,
    // invite is additive, but update overwrites a member's role and archive revokes their access to
    // the workspace, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Manage users only in the workspace pinned to the current ToolJet PAT. Invite, update, archive, and unarchive ' +
      'require confirm:true. Updates can change role, add existing custom group_ids while preserving all other memberships, ' +
      'and merge supplied user_metadata keys while preserving other keys. Empty group_ids never removes groups. ' +
      'first_name/last_name are only supported for invitations: editing an existing name requires a Super Admin in ToolJet ' +
      'and is refused by this workspace-scoped tool before any mutation. Updates are read back before success is reported. ' +
      'Use manage_workspace_groups remove_member for explicit membership removal. Updates cannot change email or passwords. ' +
      'Changing a role to end-user also transfers any apps owned by that user to the acting admin under ToolJet\'s existing behavior; disclose this before confirmation. ' +
      'Invite accepts email, optional names/role/group_ids; archive/unarchive accepts only organization_user_id. ' +
      'Never substitute role or membership changes for a rejected name edit, or bypass the PAT owner\'s ToolJet permissions.',
    inputSchema: schema.shape,
    async handler(input: ManageWorkspaceUsersArgs) {
      try {
        const args = schema.parse(input);
        const allowed = args.action === 'invite' ? ['email', 'first_name', 'last_name', 'role', 'group_ids'] :
          args.action === 'update' ? ['organization_user_id', 'first_name', 'last_name', 'role', 'group_ids', 'user_metadata'] : ['organization_user_id'];
        for (const key of Object.keys(args)) {
          if (!['action', 'confirm', ...allowed].includes(key)) throw new Error(`${key} is not supported for ${args.action}; no changes were made.`);
        }
        if (args.action === 'update' && (args.first_name !== undefined || args.last_name !== undefined)) {
          throw new Error('Name changes require a Super Admin and are not supported by this workspace-scoped tool. No changes were made. Ask a Super Admin to edit the name in ToolJet.');
        }
        if (args.confirm !== true) {
          throw new Error(`${args.action} requires confirm:true after checking the exact workspace user.`);
        }

        if (args.action === 'invite') {
          await client.inviteWorkspaceUser({
            email: required(args.email, 'email'),
            role: args.role ?? 'end-user',
            firstName: args.first_name,
            lastName: args.last_name,
            groupIds: args.group_ids,
          });
          return ok({ invited: true, email: args.email });
        }

        const organizationUserId = required(args.organization_user_id, 'organization_user_id');
        if (args.action === 'archive' || args.action === 'unarchive') {
          await client.setWorkspaceUserArchived(organizationUserId, args.action === 'archive');
          return ok({ organization_user_id: organizationUserId, status: args.action === 'archive' ? 'archived' : 'active' });
        }

        if (
          args.first_name === undefined &&
          args.last_name === undefined &&
          args.role === undefined &&
          !args.group_ids?.length &&
          args.user_metadata === undefined
        ) {
          throw new Error('update requires at least one changed field.');
        }
        const result = await client.updateWorkspaceUser(organizationUserId, {
          firstName: args.first_name,
          lastName: args.last_name,
          role: args.role,
          addGroupIds: args.group_ids,
          userMetadata: args.user_metadata,
        });
        return ok({ organization_user_id: organizationUserId, ...result,
          ...(!result.updated ? { already_satisfied: true } : {}) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
