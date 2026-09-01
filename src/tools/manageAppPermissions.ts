import { z } from 'zod';
import type {
  AppPermissionAccessType,
  AppPermissionResourceType,
  AppSummary,
  ToolJetClient,
} from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

type ManageAppPermissionsArgs = {
  action: 'list_subjects' | 'get' | 'set' | 'clear';
  app_id: string;
  resource_type?: AppPermissionResourceType;
  resource_id?: string;
  access_type?: AppPermissionAccessType;
  user_ids?: string[];
  group_ids?: string[];
  confirm?: boolean;
};

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`${label} is required for this action.`);
  return value;
}

function findResource(summary: AppSummary, resourceType: AppPermissionResourceType, resourceId: string) {
  if (resourceType === 'page') {
    const page = summary.pages.find((candidate) => candidate.id === resourceId);
    if (page) return { type: resourceType, id: page.id, name: page.name };
  } else if (resourceType === 'query') {
    const query = summary.queries.find((candidate) => candidate.id === resourceId);
    if (query) return { type: resourceType, id: query.id, name: query.name };
  } else {
    for (const page of summary.pages) {
      const component = page.components.find((candidate) => candidate.id === resourceId);
      if (component) {
        return {
          type: resourceType,
          id: component.id,
          name: component.name,
          component_type: component.type,
          page_id: page.id,
          page_name: page.name,
        };
      }
    }
  }
  throw new Error(
    `${resourceType} "${resourceId}" does not belong to app "${summary.app_id}". ` +
      'Use get_app_summary and do not guess resource ids.'
  );
}

function normalizePermission(permissions: Array<Record<string, unknown>>) {
  const permission = permissions[0] as any;
  if (!permission) return { access: 'all', permission_id: null };
  if (permission.type === 'SINGLE') {
    return {
      access: 'users',
      permission_id: permission.id,
      users: (Array.isArray(permission.users) ? permission.users : [])
        .map((entry: any) => entry?.user)
        .filter(Boolean)
        .map((user: any) => ({
          id: user.id,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          email: user.email,
        })),
    };
  }
  if (permission.type === 'GROUP') {
    return {
      access: 'groups',
      permission_id: permission.id,
      groups: (Array.isArray(permission.groups) ? permission.groups : [])
        .map((entry: any) => entry?.permissionGroup)
        .filter(Boolean)
        .map((group: any) => ({ id: group.id, name: group.name })),
    };
  }
  return { access: String(permission.type ?? 'unknown').toLowerCase(), permission_id: permission.id };
}

export function manageAppPermissionsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'manage_app_permissions',
    title: 'Manage App Permissions',
    // get/list_subjects only read, but set overwrites an access rule and clear broadens access to
    // every user who can reach the app, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'List eligible subjects, inspect, set, or clear server-enforced access for one app page, query, or ' +
      'component. Use list_subjects first and exact ids from get_app_summary; users/groups must already have ' +
      'access to the app. set restricts access to the selected users or groups. clear broadens access to every ' +
      'user who can access the app. Mutations require confirm:true after the user explicitly requests the exact ' +
      'access rule. ToolJet license gates still apply.',
    inputSchema: {
      action: z.enum(['list_subjects', 'get', 'set', 'clear']),
      app_id: z.string().uuid(),
      resource_type: z.enum(['page', 'query', 'component']).optional(),
      resource_id: z.string().uuid().optional(),
      access_type: z.enum(['users', 'groups']).optional(),
      user_ids: z.array(z.string().uuid()).min(1).max(100).optional(),
      group_ids: z.array(z.string().uuid()).min(1).max(100).optional(),
      confirm: z.boolean().optional(),
    },
    async handler(args: ManageAppPermissionsArgs) {
      try {
        if (args.action === 'list_subjects') {
          return ok({ app_id: args.app_id, ...(await client.listAppPermissionSubjects(args.app_id)) });
        }

        const resourceType = requireValue(args.resource_type, 'resource_type');
        const resourceId = requireValue(args.resource_id, 'resource_id');
        const summary = await client.getAppSummary(args.app_id);
        const resource = findResource(summary, resourceType, resourceId);

        if (args.action === 'get') {
          const permissions = await client.getAppPermission(args.app_id, resourceType, resourceId);
          return ok({ app_id: args.app_id, resource, ...normalizePermission(permissions) });
        }

        if (args.confirm !== true) {
          throw new Error(
            `${args.action} permission for ${resourceType} "${resource.name ?? resource.id}" requires ` +
              'confirm:true after explicit approval of the exact access rule.'
          );
        }

        if (args.action === 'clear') {
          await client.clearAppPermission(args.app_id, resourceType, resourceId);
          return ok({ app_id: args.app_id, resource, access: 'all', permission_id: null });
        }

        const accessType = requireValue(args.access_type, 'access_type');
        const subjectIds = accessType === 'users' ? args.user_ids : args.group_ids;
        requireValue(subjectIds, accessType === 'users' ? 'user_ids' : 'group_ids');
        if (accessType === 'users' && args.group_ids !== undefined) {
          throw new Error('group_ids must be omitted when access_type is users.');
        }
        if (accessType === 'groups' && args.user_ids !== undefined) {
          throw new Error('user_ids must be omitted when access_type is groups.');
        }
        const permissions = await client.setAppPermission({
          appId: args.app_id,
          resourceType,
          resourceId,
          accessType,
          subjectIds: [...new Set(subjectIds)],
        });
        return ok({ app_id: args.app_id, resource, ...normalizePermission(permissions) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
