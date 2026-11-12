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
  action: 'list_subjects' | 'list_screens' | 'list_queries' | 'get' | 'set' | 'clear';
  app_id: string;
  resource_type?: AppPermissionResourceType | 'screen';
  resource_id?: string;
  route?: string;
  routes?: string[];
  query?: string;
  queries?: string[];
  access_type?: AppPermissionAccessType;
  groups?: string[];
  users?: string[];
  user_ids?: string[];
  group_ids?: string[];
  confirm?: boolean;
  grant_app_access?: boolean;
};

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

/** A query of the app by id, by exact name, or by name in any case. */
function findQuery(summary: AppSummary, ref: string) {
  const lower = ref.toLowerCase();
  return (
    summary.queries.find((q) => q.id === ref) ??
    summary.queries.find((q) => q.name === ref) ??
    summary.queries.find((q) => q.name?.toLowerCase() === lower)
  );
}

/** Whether the app is a Code mode app: a top-level component of one of its pages is a code page. */
export function isCodeApp(summary: AppSummary): boolean {
  return summary.pages.some((page) =>
    page.components.some((component) => {
      const props = (component.properties ?? {}) as Record<string, { value?: unknown } | undefined>;
      return !component.parent && CODE_PAGE_TRUE.has(props.codePage?.value);
    })
  );
}

function findResource(summary: AppSummary, resourceType: AppPermissionResourceType, resourceId: string) {
  if (resourceType === 'page') {
    const page =
      summary.pages.find((candidate) => candidate.id === resourceId) ??
      summary.pages.find((candidate) => candidate.name === resourceId);
    if (page) return { type: resourceType, id: page.id, name: page.name };
  } else if (resourceType === 'query') {
    const query = findQuery(summary, resourceId);
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

type Granted = { group_id: string; name?: string; rule_name: string };
type GroupDirectory = { groups: SubjectGroup[]; complete: boolean; openIds: Set<string> };

/** Every group of the workspace (with can_open_app), read once per call. */
async function groupDirectory(client: ToolJetClient, appId: string): Promise<GroupDirectory> {
  const subjects = await client.listAppPermissionSubjects(appId);
  const { groups, complete } = await subjectGroups(client, subjects.groups);
  return { groups, complete, openIds: new Set(subjects.groups.map((group) => group.id)) };
}

/** Group names (any case) or ids to ids; the ones that match no group are returned apart. */
function resolveGroups(directory: GroupDirectory, refs: string[]) {
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const ref of refs) {
    const lower = ref.toLowerCase();
    const group =
      directory.groups.find((g) => g.id === ref) ??
      directory.groups.find((g) => g.name === ref) ??
      directory.groups.find((g) => g.name?.toLowerCase() === lower);
    if (group) ids.push(group.id);
    // An id ToolJet did not list may still be a group when the workspace list could not be read.
    else if (!directory.complete && UUID.test(ref)) ids.push(ref);
    else unknown.push(ref);
  }
  return { ids: [...new Set(ids)], unknown };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A limit to groups whose members cannot open the app would leave them with nothing. The groups that need view access
 * to this app first, checked before anything is written: without grant, or for a group the plan does not let change,
 * the set is refused and says so.
 */
function groupsToGrant(directory: GroupDirectory, groupIds: string[], grant: boolean): string[] {
  const missing = groupIds.filter((id) => !directory.openIds.has(id));
  if (!missing.length) return [];
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const names = missing.map((id) => byId.get(id)?.name ?? id);
  if (!grant) {
    throw new Error(
      `${names.join(', ')} cannot open this app yet, so a limit to ${missing.length > 1 ? 'them' : 'it'} would leave ` +
        `${missing.length > 1 ? 'their' : 'its'} members without the screen or query. Pass grant_app_access: true ` +
        'to give each of them view access to this app only (the released app), or give them access in ' +
        'Workspace settings > Groups. Nothing was changed.'
    );
  }
  const disabled = missing.filter((id) => byId.get(id)?.disabled);
  if (disabled.length) {
    throw new Error(
      `${disabled.map((id) => byId.get(id)?.name ?? id).join(', ')} cannot be changed under the current plan, so it cannot be given access to this app. Nothing was changed.`
    );
  }
  return missing;
}

/** Remove the view rules this call added (by name, for this app), best effort; the groups that still have one. */
async function removeGrants(client: ToolJetClient, appId: string, granted: Granted[]): Promise<string[]> {
  const left: string[] = [];
  for (const grant of granted) {
    try {
      const rules = await client.listWorkspaceGroupAccess(grant.group_id);
      const added = rules.filter((rule) => rule.id && rule.name === grant.rule_name && rule.resources.some((r) => r.id === appId));
      for (const rule of added) await client.writeWorkspaceGroupAccess('DELETE', grant.group_id, 'app', rule.id);
    } catch {
      left.push(grant.name ?? grant.group_id);
    }
  }
  return left;
}

/**
 * Give each group view access to this app only (the access rule Workspace settings > Groups creates), after the limits
 * are set, so a failure leaves less access, never more. When a rule cannot be added or ToolJet does not confirm the
 * groups can open the app, the rules this call added are removed again and it throws.
 */
async function grantGroups(
  client: ToolJetClient,
  appId: string,
  appName: string | undefined,
  directory: GroupDirectory,
  missing: string[]
): Promise<Granted[]> {
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const granted: Granted[] = [];
  const undo = async (reason: string): Promise<never> => {
    const left = await removeGrants(client, appId, granted);
    throw new Error(
      `${reason} The access rules added here were removed${left.length ? `, except for ${left.join(', ')} (remove it in Workspace settings > Groups)` : ''}.`
    );
  };
  for (const id of missing) {
    const rule = viewRule(appId, appName, id);
    try {
      await client.writeWorkspaceGroupAccess('POST', id, 'app', undefined, rule);
    } catch (error) {
      await undo(`${byId.get(id)?.name ?? id} could not be given access to this app: ${(error as Error).message}.`);
    }
    granted.push({ group_id: id, ...(byId.get(id)?.name ? { name: byId.get(id)!.name } : {}), rule_name: rule.name });
  }
  const after = new Set((await client.listAppPermissionSubjects(appId)).groups.map((group) => group.id));
  const still = missing.filter((id) => !after.has(id));
  if (still.length) {
    await undo(`ToolJet did not confirm that ${still.map((id) => byId.get(id)?.name ?? id).join(', ')} can open this app after the access rule was added.`);
  }
  return granted;
}

type Target = {
  resourceType: AppPermissionResourceType;
  resourceId: string;
  resource: Record<string, unknown>;
};

/** The screens, queries, pages or components a call names, each resolved against the app; problems are collected. */
function resolveTargets(args: ManageAppPermissionsArgs, summary: AppSummary, problems: string[]): Target[] {
  const targets: Target[] = [];
  const routes = [...(args.route !== undefined ? [args.route] : []), ...(args.routes ?? [])];
  const queries = [...(args.query !== undefined ? [args.query] : []), ...(args.queries ?? [])];
  const type = args.resource_type === 'screen' ? 'page' : args.resource_type;
  if (routes.length && type && type !== 'page') {
    problems.push(`route names a Code mode screen (a page permission), so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  if (queries.length && type && type !== 'query') {
    problems.push(`query names a query, so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  for (const route of [...new Set(routes)]) {
    try {
      const screen = findScreen(summary, route);
      targets.push({
        resourceType: 'page',
        resourceId: screen.page_id,
        resource: {
          ...findResource(summary, 'page', screen.page_id),
          screen: { route_id: screen.route_id, path: screen.path, title: screen.title },
        },
      });
    } catch (error) {
      problems.push((error as Error).message);
    }
  }
  const unknownQueries: string[] = [];
  for (const ref of [...new Set(queries)]) {
    const query = findQuery(summary, ref);
    if (!query) unknownQueries.push(ref);
    else targets.push({ resourceType: 'query', resourceId: query.id, resource: { type: 'query', id: query.id, name: query.name } });
  }
  if (unknownQueries.length) {
    const names = summary.queries.map((q) => q.name ?? q.id);
    problems.push(
      `No query ${unknownQueries.map((q) => `"${q}"`).join(', ')} in this app. ` +
        (names.length ? `Its queries: ${names.join(', ')}.` : 'The app has no queries.')
    );
  }
  if (args.resource_id !== undefined) {
    const kinds: AppPermissionResourceType[] = type ? [type] : ['query', 'page', 'component'];
    let found: Target | undefined;
    for (const kind of kinds) {
      try {
        found = { resourceType: kind, resourceId: '', resource: findResource(summary, kind, args.resource_id) };
        found.resourceId = String(found.resource.id);
        break;
      } catch {
        // try the next kind
      }
    }
    if (found) targets.push(found);
    else
      problems.push(
        `resource_id "${args.resource_id}" is no ${type ?? 'page, query or component'} of this app. Pass a query by ` +
          'its name with query, or a screen with route.'
      );
  }
  if (!routes.length && !queries.length && args.resource_id === undefined) {
    const screens = codeScreens(summary);
    problems.push(
      'Name what to limit: route (or routes) for screens, query (or queries) for queries, by name or id.' +
        (screens.length ? ` Screens: ${screens.map((s) => s.path).join(', ')}.` : '') +
        (summary.queries.length ? ` Queries: ${summary.queries.map((q) => q.name ?? q.id).join(', ')}.` : '') +
        // A build sent set with groups and grant_app_access but nothing to limit, four times over (2026-11-09).
        (args.grant_app_access || args.groups?.length || args.group_ids?.length
          ? ' There is no app-wide grant: a group gets into this app with the first screen or query limited to it ' +
            '(grant_app_access does that part). Everyone who can open the app already sees what is not limited, so ' +
            'when no screen or query should be limited, there is nothing to set.' +
            (isCodeApp(summary) && !screens.length ? ' Screens are listed here after code_app_install has saved the routes.' : '')
          : '')
    );
  }
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.resourceType}:${target.resourceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** One call that would work, built from what this call sent, for a refusal to show. */
function exampleCall(args: ManageAppPermissionsArgs, summary: AppSummary | undefined, codeApp: boolean) {
  const example: Record<string, unknown> = { action: args.action === 'get' ? 'get' : args.action, app_id: args.app_id };
  const screens = summary ? codeScreens(summary) : [];
  if (args.routes?.length) example.routes = args.routes;
  else if (args.route) example.route = args.route;
  else if (args.queries?.length) example.queries = args.queries;
  else if (args.query) example.query = args.query;
  else if (screens.length) example.route = screens[screens.length - 1]!.path;
  else if (summary?.queries.length) example.query = summary.queries[0]!.name ?? summary.queries[0]!.id;
  else example.route = '/finance';
  if (args.action === 'set') {
    if (args.users?.length || args.user_ids?.length) example.users = args.users ?? args.user_ids;
    else example.groups = args.groups ?? args.group_ids ?? ['Finance'];
    if (!codeApp) example.confirm = true;
  }
  if (args.action === 'clear') example.confirm = true;
  return JSON.stringify(example);
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
      'Server-enforced access to an app\'s screens and queries: who can open a Code mode screen (route) or run a ' +
      'query. Example: {"action":"set","app_id":"<id>","route":"/finance","groups":["Finance"]}; for queries ' +
      '"query":"finance_queue" (name or id), and "routes" or "queries" take several at once with the same groups. ' +
      'groups take names or ids, users take emails or ids; access_type and resource_type are inferred. In a Code ' +
      'mode app, set needs no confirm, and a named group that cannot open the app first gets view access to this ' +
      'app only (grant_app_access defaults to true; false refuses instead). In other apps set needs confirm:true ' +
      'after the user approves the exact rule. clear (back to everyone who can open the app) always needs ' +
      'confirm:true. list_subjects: every workspace group with can_open_app, and plan (whether this plan enforces ' +
      'query and screen limits and resolves {{globals.server.currentUser}} on the server). list_screens: each route ' +
      'with its access. list_queries: each query of the app with its access. A screen limit hides the screen; the data it shows is protected only by limiting the ' +
      'queries that return it. Visual pages and components: resource_id (resource_type is optional). License gates apply.',
    inputSchema: {
      action: z.enum(['list_subjects', 'list_screens', 'list_queries', 'get', 'set', 'clear']),
      app_id: z.string().uuid(),
      route: z.string().min(1).max(200).optional().describe('A Code mode screen by route path or id (app.json routes).'),
      routes: z.array(z.string().min(1).max(200)).min(1).max(50).optional().describe('Several screens at once.'),
      query: z.string().min(1).max(200).optional().describe('A query by name or id.'),
      queries: z.array(z.string().min(1).max(200)).min(1).max(100).optional().describe('Several queries at once.'),
      groups: z.array(z.string().min(1).max(200)).min(1).max(100).optional().describe('Group names or ids.'),
      users: z.array(z.string().min(1).max(320)).min(1).max(100).optional().describe('User emails or ids.'),
      resource_type: z.enum(['page', 'query', 'component', 'screen']).optional().describe('Inferred; only needed with resource_id.'),
      resource_id: z.string().min(1).max(200).optional(),
      access_type: z.enum(['users', 'groups']).optional().describe('Inferred from groups or users.'),
      user_ids: z.array(z.string().min(1)).min(1).max(100).optional(),
      group_ids: z.array(z.string().min(1)).min(1).max(100).optional(),
      confirm: z.boolean().optional(),
      grant_app_access: z
        .boolean()
        .optional()
        .describe('set with groups: give a group that cannot open the app view access to this app only first (default true in a Code mode app)'),
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
              ? 'A group with can_open_app false cannot open the app: a set naming it gives it view access to this app only first (in a Code mode app by default, elsewhere with grant_app_access:true).'
              : 'Only the groups that can open the app are listed: the workspace group list could not be read.',
          });
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

        if (args.action === 'list_queries') {
          // Every query with its access, in one read: an edit names the limits set before it (the agent's access check
          // said "no query is limited" on an edit of an app with 11 limits, 2026-11-05, because it counted only its own).
          const summary = await client.getAppSummary(args.app_id);
          const queries = await Promise.all(
            summary.queries.map(async (q) => ({
              query_id: q.id,
              name: q.name,
              ...normalizePermission(await client.getAppPermission(args.app_id, 'query', q.id)),
            }))
          );
          return ok({ app_id: args.app_id, queries, limited: queries.filter((q) => q.access !== 'all').length });
        }

        const summary = await client.getAppSummary(args.app_id);
        const codeApp = isCodeApp(summary);
        const problems: string[] = [];
        const targets = resolveTargets(args, summary, problems);

        let accessType: AppPermissionAccessType | undefined;
        let subjectIds: string[] = [];
        let directory: GroupDirectory | undefined;
        if (args.action === 'set') {
          const groupRefs = [...(args.groups ?? []), ...(args.group_ids ?? [])];
          const userRefs = [...(args.users ?? []), ...(args.user_ids ?? [])];
          if (groupRefs.length && userRefs.length) {
            problems.push('Pass groups or users, not both: one limit is to groups or to named users.');
          } else if (!groupRefs.length && !userRefs.length) {
            problems.push('Name who keeps access: groups (names or ids) or users (emails or ids).');
          } else {
            accessType = groupRefs.length ? 'groups' : 'users';
            if (args.access_type && args.access_type !== accessType) {
              problems.push(`access_type "${args.access_type}" does not match the ${accessType} passed: leave access_type out.`);
            }
          }
          if (accessType === 'groups') {
            directory = await groupDirectory(client, args.app_id);
            const { ids, unknown } = resolveGroups(directory, groupRefs);
            if (unknown.length) {
              problems.push(
                `${unknown.map((g) => `"${g}"`).join(', ')} ${unknown.length > 1 ? 'are not groups' : 'is not a group'} of this workspace. ` +
                  `Its groups: ${directory.groups.map((g) => g.name ?? g.id).join(', ')}.`
              );
            }
            subjectIds = ids;
          } else if (accessType === 'users') {
            const users = (await client.listAppPermissionSubjects(args.app_id)).users;
            const unknown: string[] = [];
            for (const ref of userRefs) {
              const lower = ref.toLowerCase();
              const user = users.find((u) => u.id === ref) ?? users.find((u) => u.email?.toLowerCase() === lower);
              if (user) subjectIds.push(user.id);
              else unknown.push(ref);
            }
            if (unknown.length) {
              problems.push(
                `${unknown.map((u) => `"${u}"`).join(', ')} cannot open this app or is not a user of this workspace ` +
                  '(users must already have access to the app; list_subjects lists them).'
              );
            }
            subjectIds = [...new Set(subjectIds)];
            if (args.grant_app_access === true) {
              problems.push('grant_app_access applies only to a limit to groups: leave it out with users.');
            }
          }
          if (!codeApp && args.confirm !== true) {
            problems.push('set on this app needs confirm:true after the user explicitly approves the exact access rule.');
          }
        }
        if (args.action === 'clear' && args.confirm !== true) {
          problems.push('clear opens the resource to everyone who can open the app, so it needs confirm:true after the user approves it.');
        }

        if (problems.length) {
          throw new Error(
            `manage_app_permissions ${args.action} was refused and nothing was changed:\n` +
              problems.map((problem) => `- ${problem}`).join('\n') +
              `\nA call that works: ${exampleCall(args, summary, codeApp)}`
          );
        }

        const one = targets.length === 1;
        if (args.action === 'get') {
          const results = await Promise.all(
            targets.map(async (t) => ({ resource: t.resource, ...normalizePermission(await client.getAppPermission(args.app_id, t.resourceType, t.resourceId)) }))
          );
          return ok(one ? { app_id: args.app_id, ...results[0]! } : { app_id: args.app_id, results });
        }

        if (args.action === 'clear') {
          for (const t of targets) await client.clearAppPermission(args.app_id, t.resourceType, t.resourceId);
          const results = targets.map((t) => ({ resource: t.resource, access: 'all', permission_id: null }));
          return ok(one ? { app_id: args.app_id, ...results[0]! } : { app_id: args.app_id, results });
        }

        const grant = args.grant_app_access ?? codeApp;
        // Checked before anything is written; the access rules are added only after the limits are set, so a failure
        // part way leaves less access than asked for, never more.
        const toGrant = accessType === 'groups' ? groupsToGrant(directory!, subjectIds, grant) : [];
        const results: Array<Record<string, unknown>> = [];
        for (const t of targets) {
          try {
            const permissions = await client.setAppPermission({
              appId: args.app_id,
              resourceType: t.resourceType,
              resourceId: t.resourceId,
              accessType: accessType!,
              subjectIds,
            });
            results.push({ resource: t.resource, ...normalizePermission(permissions) });
          } catch (error) {
            results.push({ resource: t.resource, error: (error as Error).message });
          }
        }
        const failed = results.filter((r) => r.error);
        const failures = failed.map((r) => `${(r.resource as any).name ?? (r.resource as any).id}: ${r.error}`).join('; ');
        if (failed.length === results.length) {
          throw new Error(failures + (toGrant.length ? ' No access to the app was given.' : ''));
        }
        if (failed.length) {
          // A partial failure is a failure (review, 2026-11-11): reported as success with a warning, the agent counted
          // every resource of the call as limited, the one whose limit failed included. App access waits until every
          // limit is set; the limits that were set stay, so sending the failed ones again completes the call.
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: `${failed.length} of ${results.length} limits were not set: ${failures}.` +
                  (toGrant.length ? ' No access to the app was given.' : '') +
                  ' Set the failed ones again; the others are in place.',
                app_id: args.app_id,
                applied: results.filter((r) => !r.error),
                failed,
              }),
            }],
            isError: true,
          };
        }
        let granted: Granted[] = [];
        if (toGrant.length) {
          try {
            granted = await grantGroups(client, args.app_id, summary.name, directory!, toGrant);
          } catch (error) {
            throw new Error(
              `The limits were set, but their groups cannot open this app, so their members cannot use those screens or queries yet: ${(error as Error).message} ` +
                'Give the groups access in Workspace settings > Groups, or run this again.'
            );
          }
        }
        const grantNote = granted.length
          ? `${granted.map((g) => g.name ?? g.group_id).join(', ')} could not open this app, so ${granted.length > 1 ? 'each now has' : 'it now has'} view access to this app only (released app, rule "${granted[0]!.rule_name}").`
          : undefined;
        const body = {
          app_id: args.app_id,
          ...(one ? results[0]! : { results }),
          ...(granted.length ? { granted_app_access: granted, note: grantNote } : {}),
        };
        return ok(body);
      } catch (error) {
        return fail(error);
      }
    },
  };
}
