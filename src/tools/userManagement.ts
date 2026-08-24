import { z } from 'zod';
import type {
  UserGroupRef,
  UserWorkspaceRef,
  InstanceUserStatus,
  ToolJetClient,
  WorkspaceUserRole,
} from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const userStatus = z.enum(['active', 'archived', 'invited']);
const userRole = z.enum(['admin', 'builder', 'end-user']);

const groupRef = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((group) => group.id !== undefined || group.name !== undefined, {
    message: 'Each group requires either id or name.',
  });

const workspaceRef = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    role: userRole.optional(),
    status: userStatus.optional(),
    groups: z.array(groupRef).max(100).optional(),
  })
  .strict()
  .refine((workspace) => workspace.id !== undefined || workspace.name !== undefined, {
    message: 'Each workspace requires either id or name.',
  });

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`${label} is required for this action.`);
  return value;
}

function requireUuid(value: string, label: string): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new Error(`${label} must be a UUID for this action.`);
  return parsed.data;
}

export function listInstanceWorkspacesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_instance_workspaces',
    description:
      'List every workspace visible to ToolJet\'s instance-wide external API, including the existing custom ' +
      'groups that can be assigned to users. This is different from list_workspaces, which lists only the ' +
      'signed-in app-builder user\'s workspaces. Requires TOOLJET_EXTERNAL_API_ACCESS_TOKEN.',
    inputSchema: {},
    async handler() {
      try {
        return ok({ workspaces: await client.listInstanceWorkspaces() });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

export function listWorkspaceAppsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workspace_apps',
    description:
      'List app ids, names, slugs, and versions for one workspace through ToolJet\'s external API. ' +
      'Use list_instance_workspaces first instead of guessing a workspace id.',
    inputSchema: {
      workspace_id: z.string().uuid(),
    },
    async handler(args: { workspace_id: string }) {
      try {
        return ok({ apps: await client.listWorkspaceApps(args.workspace_id) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

type ManageUsersArgs = {
  action: 'list' | 'get' | 'create' | 'update';
  user_id?: string;
  group_names?: string[];
  statuses?: InstanceUserStatus[];
  name?: string;
  email?: string;
  password?: string;
  status?: InstanceUserStatus;
  default_workspace_id?: string;
  workspaces?: UserWorkspaceRef[];
  confirm?: boolean;
};

export function manageUsersTool(client: ToolJetClient): ToolDef {
  return {
    name: 'manage_users',
    description:
      'List, get, create/invite, or update ToolJet instance users through the public external API. ' +
      'Create defaults to invited and never invents a password. Update changes only supplied fields; archiving ' +
      'requires confirm:true after exact-target approval. Passwords are write-only and are never returned.',
    inputSchema: {
      action: z.enum(['list', 'get', 'create', 'update']),
      user_id: z.string().trim().min(1).optional().describe('User UUID; get also accepts an exact email.'),
      group_names: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
      statuses: z.array(userStatus).max(3).optional(),
      name: z.string().trim().min(1).max(100).optional(),
      email: z.string().email().optional(),
      password: z.string().min(5).max(100).optional().describe('Write-only; provide only when explicitly requested.'),
      status: userStatus.optional(),
      default_workspace_id: z.string().uuid().optional(),
      workspaces: z.array(workspaceRef).min(1).max(100).optional(),
      confirm: z.boolean().optional(),
    },
    async handler(args: ManageUsersArgs) {
      try {
        if (args.action === 'list') {
          return ok({
            users: await client.listInstanceUsers({
              groupNames: args.group_names,
              statuses: args.statuses,
            }),
          });
        }

        if (args.action === 'get') {
          return ok({ user: await client.getInstanceUser(requireValue(args.user_id, 'user_id')) });
        }

        if (args.action === 'create') {
          const created = await client.createInstanceUser({
            name: requireValue(args.name, 'name'),
            email: requireValue(args.email, 'email'),
            ...(args.password !== undefined ? { password: args.password } : {}),
            status: args.status ?? 'invited',
            ...(args.default_workspace_id ? { defaultWorkspaceId: args.default_workspace_id } : {}),
            workspaces: requireValue(args.workspaces, 'workspaces'),
          });
          return ok({ user: created });
        }

        const userId = requireUuid(requireValue(args.user_id, 'user_id'), 'user_id');
        const current = await client.getInstanceUser(userId);
        const update = {
          ...(args.name !== undefined ? { name: args.name } : {}),
          ...(args.email !== undefined ? { email: args.email } : {}),
          ...(args.password !== undefined ? { password: args.password } : {}),
          ...(args.status !== undefined ? { status: args.status } : {}),
          ...(args.default_workspace_id !== undefined
            ? { defaultWorkspaceId: args.default_workspace_id }
            : {}),
        };
        if (!Object.keys(update).length) {
          throw new Error('manage_users update requires at least one changed field.');
        }
        if (args.status === 'archived' && args.confirm !== true) {
          throw new Error(
            `Archiving user "${current.email ?? current.name ?? userId}" requires confirm:true after exact-target approval.`
          );
        }
        await client.updateInstanceUser(userId, update);
        return ok({ user: await client.getInstanceUser(userId) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

type ManageUserAccessArgs = {
  action: 'set_role' | 'update_workspace' | 'replace_workspaces';
  user_id?: string;
  workspace_id?: string;
  role?: WorkspaceUserRole;
  status?: InstanceUserStatus;
  groups?: UserGroupRef[];
  workspaces?: UserWorkspaceRef[];
  confirm?: boolean;
};

export function manageUserAccessTool(client: ToolJetClient): ToolDef {
  return {
    name: 'manage_user_access',
    description:
      'Change one ToolJet user\'s workspace role, status, or existing custom-group membership, or replace the ' +
      'user\'s complete workspace set. All actions require confirm:true after exact user/workspace approval. ' +
      'update_workspace replaces that workspace\'s complete custom-group list when groups is supplied; ' +
      'replace_workspaces removes every omitted membership. This tool does not create groups or permission policies.',
    inputSchema: {
      action: z.enum(['set_role', 'update_workspace', 'replace_workspaces']),
      user_id: z.string().uuid(),
      workspace_id: z.string().uuid().optional(),
      role: userRole.optional(),
      status: userStatus.optional(),
      groups: z.array(groupRef).max(100).optional(),
      workspaces: z.array(workspaceRef).max(100).optional(),
      confirm: z.boolean().optional(),
    },
    async handler(args: ManageUserAccessArgs) {
      try {
        const userId = requireValue(args.user_id, 'user_id');
        const current = await client.getInstanceUser(userId);
        if (args.confirm !== true) {
          throw new Error(
            `Changing access for user "${current.email ?? current.name ?? userId}" requires confirm:true after exact-target approval.`
          );
        }

        if (args.action === 'set_role') {
          await client.updateInstanceUserRole({
            userId,
            workspaceId: requireValue(args.workspace_id, 'workspace_id'),
            role: requireValue(args.role, 'role'),
          });
        } else if (args.action === 'update_workspace') {
          if (args.status === undefined && args.groups === undefined) {
            throw new Error('update_workspace requires status and/or groups.');
          }
          await client.updateInstanceUserWorkspace({
            userId,
            workspaceId: requireValue(args.workspace_id, 'workspace_id'),
            ...(args.status !== undefined ? { status: args.status } : {}),
            ...(args.groups !== undefined ? { groups: args.groups } : {}),
          });
        } else {
          await client.replaceInstanceUserWorkspaces(
            userId,
            requireValue(args.workspaces, 'workspaces')
          );
        }

        return ok({ user: await client.getInstanceUser(userId) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
