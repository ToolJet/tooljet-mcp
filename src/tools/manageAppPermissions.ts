import { z } from 'zod';
import type {
  AppPermissionAccessType,
  AppPermissionResourceType,
  AppPermissionSubjects,
  AppSummary,
  ToolJetClient,
  WorkspaceGroup,
} from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

type ManageAppPermissionsArgs = {
  action: 'list_subjects' | 'list_screens' | 'get' | 'set' | 'clear';
  app_id: string;
  resource_type?: AppPermissionResourceType;
  resource_id?: string;
  route?: string;
  access_type?: AppPermissionAccessType;
  user_ids?: string[];
  group_ids?: string[];
  confirm?: boolean;
  grant_app_access?: boolean;
};

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`${label} is required for this action.`);
  return value;
}

const CODE_PAGE_TRUE = new Set<unknown>([true, 'true', '{{true}}']);

export type CodeScreen = { route_id: string; path: string; title?: string; page_id: string; code_page_id: string };

/**
 * The screens of an app's Code mode pages: each route of a code page's root component (`routes`, the registry the CLI
 * writes) with the hidden page that carries its page permissions.
 */
export function codeScreens(summary: AppSummary): CodeScreen[] {
  const pageIds = new Set(summary.pages.map((page) => page.id));
  const screens: CodeScreen[] = [];
  for (const page of summary.pages) {
    for (const component of page.components) {
      const props = (component.properties ?? {}) as Record<string, { value?: unknown } | undefined>;
      if (component.parent || !CODE_PAGE_TRUE.has(props.codePage?.value)) continue;
      let routes: unknown = props.routes?.value;
      if (typeof routes === 'string') {
        try {
          routes = JSON.parse(routes);
        } catch {
          routes = [];
        }
      }
      if (!Array.isArray(routes)) continue;
      for (const route of routes as Array<Record<string, unknown>>) {
        if (typeof route?.id !== 'string' || typeof route?.path !== 'string') continue;
        if (typeof route.pageId !== 'string' || !pageIds.has(route.pageId)) continue;
        screens.push({
          route_id: route.id,
          path: route.path,
          ...(typeof route.title === 'string' ? { title: route.title } : {}),
          page_id: route.pageId,
          code_page_id: page.id,
        });
      }
    }
  }
  return screens;
}

/** The hidden page of a Code mode screen, by its route id (`orders`) or path (`/orders/:id`). */
export function findScreen(summary: AppSummary, route: string): CodeScreen {
  const screens = codeScreens(summary);
  const screen = screens.find((s) => s.route_id === route) ?? screens.find((s) => s.path === route);
  if (screen) return screen;
  throw new Error(
    `No Code mode screen "${route}" in app "${summary.app_id}". ` +
      (screens.length
        ? `Its screens: ${screens.map((s) => `${s.route_id} (${s.path})`).join(', ')}.`
        : 'The app has no Code mode screens.')
  );
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

type SubjectGroup = { id: string; name?: string; type?: string; count?: number; can_open_app: boolean; disabled?: true };

/** The plan's answer on what a build can protect, from the license features (unknown ones are left out). */
function planLimits(features: Record<string, unknown> | undefined) {
  if (!features) return undefined;
  const known = Object.entries({
    query_limits: features.appPermissionQuery,
    screen_limits: features.appPermissionPages,
    server_side_current_user: features.serverSideGlobalResolve,
  }).filter(([, value]) => typeof value === 'boolean');
  return known.length ? Object.fromEntries(known) : undefined;
}

/**
 * Every group of the workspace, each marked with whether its members can open this app. ToolJet's own subject list
 * (pages/user-groups) holds only the groups with an app access rule that covers it, so a custom group such as Finance
 * was missing until someone gave it access in Workspace settings (roles test, 2026-11-04).
 */
async function subjectGroups(client: ToolJetClient, open: AppPermissionSubjects['groups']) {
  const openIds = new Map(open.map((group) => [group.id, group]));
  let workspace: WorkspaceGroup[] | undefined;
  try {
    workspace = await client.listWorkspaceGroups();
  } catch {
    workspace = undefined;
  }
  if (!workspace) {
    return {
      groups: open.map((group): SubjectGroup => ({ ...group, can_open_app: true })),
      complete: false,
    };
  }
  const groups = workspace.map((group): SubjectGroup => ({
    id: group.id,
    name: group.name,
    type: group.type,
    ...(typeof openIds.get(group.id)?.count === 'number' ? { count: openIds.get(group.id)!.count } : {}),
    can_open_app: openIds.has(group.id),
    ...(group.disabled ? { disabled: true as const } : {}),
  }));
  for (const group of open) if (!groups.some((known) => known.id === group.id)) groups.push({ ...group, can_open_app: true });
  return { groups, complete: true };
}

/** The access rule a group gets for this one app: view, on the released app, nothing else. */
function viewRule(appId: string, appName: string | undefined, groupId: string) {
  return {
    name: `${(appName || 'App').slice(0, 40)} (view)`,
    type: 'app',
    groupId,
    isAll: false,
    createResourcePermissionObject: {
      canEdit: false,
      canView: true,
      hideFromDashboard: false,
      canAccessDevelopment: false,
      canAccessStaging: false,
      canAccessProduction: false,
      canAccessReleased: true,
      resourcesToAdd: [{ appId }],
    },
  };
}

/**
 * A limit to groups whose members cannot open the app would leave them with nothing. With grant_app_access, each such
 * group first gets view access to this app only (the access rule Workspace settings > Groups creates); without it, the
 * set is refused and says so.
 */
async function ensureGroupsCanOpen(
  client: ToolJetClient,
  appId: string,
  appName: string | undefined,
  groupIds: string[],
  grant: boolean
): Promise<Array<{ group_id: string; name?: string; rule_name: string }>> {
  const subjects = await client.listAppPermissionSubjects(appId);
  const openIds = new Set(subjects.groups.map((group) => group.id));
  const missing = groupIds.filter((id) => !openIds.has(id));
  if (!missing.length) return [];
  const { groups, complete } = await subjectGroups(client, subjects.groups);
  const byId = new Map(groups.map((group) => [group.id, group]));
  const unknown = complete ? missing.filter((id) => !byId.has(id)) : [];
  if (unknown.length) {
    throw new Error(`${unknown.join(', ')} ${unknown.length > 1 ? 'are not groups' : 'is not a group'} of this workspace. Use list_subjects for the group ids. Nothing was changed.`);
  }
  const names = missing.map((id) => byId.get(id)?.name ?? id);
  if (!grant) {
    throw new Error(
      `${names.join(', ')} cannot open this app yet, so a limit to ${missing.length > 1 ? 'them' : 'it'} would leave ` +
        `${missing.length > 1 ? 'their' : 'its'} members without the screen or query. Pass grant_app_access: true with ` +
        'confirm: true to give each of them view access to this app only (the released app), or give them access in ' +
        'Workspace settings > Groups. Nothing was changed.'
    );
  }
  const disabled = missing.filter((id) => byId.get(id)?.disabled);
  if (disabled.length) {
    throw new Error(
      `${disabled.map((id) => byId.get(id)?.name ?? id).join(', ')} cannot be changed under the current plan, so it cannot be given access to this app. Nothing was changed.`
    );
  }
  const granted: Array<{ group_id: string; name?: string; rule_name: string }> = [];
  for (const id of missing) {
    const rule = viewRule(appId, appName, id);
    await client.writeWorkspaceGroupAccess('POST', id, 'app', undefined, rule);
    granted.push({ group_id: id, ...(byId.get(id)?.name ? { name: byId.get(id)!.name } : {}), rule_name: rule.name });
  }
  const after = new Set((await client.listAppPermissionSubjects(appId)).groups.map((group) => group.id));
  const still = missing.filter((id) => !after.has(id));
  if (still.length) {
    throw new Error(
      `ToolJet did not confirm that ${still.map((id) => byId.get(id)?.name ?? id).join(', ')} can open this app after ` +
        'the access rule was added, so no limit was set. Check the group in Workspace settings > Groups.'
    );
  }
  return granted;
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
      'component. Use list_subjects first and exact ids from get_app_summary. list_subjects lists every workspace ' +
      'group with can_open_app, and plan says whether this plan enforces query and screen limits and resolves ' +
      '{{globals.server.currentUser}} on the server. Users must already have access to the app; a group that cannot ' +
      'open it is refused unless set has grant_app_access:true, which first gives that group view access to this app ' +
      'only (released app). set restricts access to the selected users or groups. clear broadens access to every ' +
      'user who can access the app. Mutations require confirm:true after the user explicitly requests the exact ' +
      'access rule. ToolJet license gates still apply. Code mode screens: list_screens lists each route with its ' +
      'hidden page and access; pass route (its id or path from app.json) with resource_type page instead of ' +
      'resource_id. A screen limit hides the screen (navigation and direct links); the data it shows is protected ' +
      'only by limiting the queries that return it (resource_type query).',
    inputSchema: {
      action: z.enum(['list_subjects', 'list_screens', 'get', 'set', 'clear']),
      app_id: z.string().uuid(),
      resource_type: z.enum(['page', 'query', 'component']).optional(),
      resource_id: z.string().uuid().optional(),
      route: z
        .string()
        .min(1)
        .max(200)
        .optional()
        .describe('A Code mode screen by route id or path (app.json routes), in place of resource_id for a page.'),
      access_type: z.enum(['users', 'groups']).optional(),
      user_ids: z.array(z.string().uuid()).min(1).max(100).optional(),
      group_ids: z.array(z.string().uuid()).min(1).max(100).optional(),
      confirm: z.boolean().optional(),
      grant_app_access: z
        .boolean()
        .optional()
        .describe('set with groups only: give each named group that cannot open the app view access to this app only first'),
    },
    async handler(args: ManageAppPermissionsArgs) {
      try {
        if (args.action === 'list_subjects') {
          const [subjects, features] = await Promise.all([
            client.listAppPermissionSubjects(args.app_id),
            client.getLicenseFeatureAccess().catch(() => undefined),
          ]);
          const { groups, complete } = await subjectGroups(client, subjects.groups);
          const plan = planLimits(features);
          return ok({
            app_id: args.app_id,
            users: subjects.users,
            groups,
            ...(plan ? { plan } : {}),
            note: complete
              ? 'A group with can_open_app false cannot open the app: set with grant_app_access:true gives it view access to this app only first.'
              : 'Only the groups that can open the app are listed: the workspace group list could not be read.',
          });
        }
        if (args.grant_app_access !== undefined && (args.action !== 'set' || args.access_type !== 'groups')) {
          throw new Error('grant_app_access applies only to set with access_type groups.');
        }

        if (args.action === 'list_screens') {
          const summary = await client.getAppSummary(args.app_id);
          const screens = await Promise.all(
            codeScreens(summary).map(async (screen) => ({
              ...screen,
              ...normalizePermission(await client.getAppPermission(args.app_id, 'page', screen.page_id)),
            }))
          );
          return ok({ app_id: args.app_id, screens });
        }

        if (args.route !== undefined && args.resource_id !== undefined) {
          throw new Error('Pass either route or resource_id, not both.');
        }
        if (args.route !== undefined && args.resource_type !== undefined && args.resource_type !== 'page') {
          throw new Error('route names a Code mode screen, whose access is a page permission: use resource_type page.');
        }
        const resourceType = args.route !== undefined ? 'page' : requireValue(args.resource_type, 'resource_type');
        const summary = await client.getAppSummary(args.app_id);
        const screen = args.route !== undefined ? findScreen(summary, args.route) : undefined;
        const resourceId = screen ? screen.page_id : requireValue(args.resource_id, 'resource_id');
        const resource = {
          ...findResource(summary, resourceType, resourceId),
          ...(screen ? { screen: { route_id: screen.route_id, path: screen.path, title: screen.title } } : {}),
        };

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
        const granted =
          accessType === 'groups'
            ? await ensureGroupsCanOpen(client, args.app_id, summary.name, [...new Set(subjectIds!)], args.grant_app_access === true)
            : [];
        const permissions = await client.setAppPermission({
          appId: args.app_id,
          resourceType,
          resourceId,
          accessType,
          subjectIds: [...new Set(subjectIds)],
        });
        return ok({
          app_id: args.app_id,
          resource,
          ...normalizePermission(permissions),
          ...(granted.length ? { granted_app_access: granted } : {}),
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
