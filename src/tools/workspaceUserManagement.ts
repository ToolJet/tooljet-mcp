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
  return {
    name: 'manage_workspace_users',
    title: 'Manage Workspace Users',
    // invite is additive, but update overwrites a member's role and archive revokes their access to
    // the workspace, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Manage users only in the workspace pinned to the current ToolJet PAT. Invite, update, archive, and unarchive ' +
      'require confirm:true. Updates can change names/role and add existing custom groups; they cannot ' +
      'remove groups, change passwords, manage other workspaces, or bypass the PAT owner\'s ToolJet permissions.',
    inputSchema: {
      action: z.enum(['invite', 'update', 'archive', 'unarchive']),
      organization_user_id: z.string().uuid().optional(),
      email: z.string().email().optional(),
      first_name: z.string().trim().max(99).optional(),
      last_name: z.string().trim().max(99).optional(),
      role: userRole.optional(),
      group_ids: z.array(z.string().uuid()).max(100).optional(),
      user_metadata: z.record(z.string(), z.unknown()).optional(),
      confirm: z.boolean().optional(),
    },
    async handler(args: ManageWorkspaceUsersArgs) {
      try {
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
          args.group_ids === undefined &&
          args.user_metadata === undefined
        ) {
          throw new Error('update requires at least one changed field.');
        }
        await client.updateWorkspaceUser(organizationUserId, {
          firstName: args.first_name,
          lastName: args.last_name,
          role: args.role,
          addGroupIds: args.group_ids,
          userMetadata: args.user_metadata,
        });
        return ok({ organization_user_id: organizationUserId, updated: true });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
