import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { codeScreens, findScreen, manageAppPermissionsTool } from '../src/tools/manageAppPermissions.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

const APP = '11111111-1111-4111-8111-111111111111';
const CODE_PAGE = '22222222-2222-4222-8222-222222222222';
const ORDERS_PAGE = '33333333-3333-4333-8333-333333333333';
const PAYROLL_PAGE = '44444444-4444-4444-8444-444444444444';
const GROUP = '55555555-5555-4555-8555-555555555555';

const routes = [
  { id: 'orders', path: '/', title: 'Orders', pageId: ORDERS_PAGE },
  { id: 'payroll', path: '/payroll', title: 'Payroll', pageId: PAYROLL_PAGE },
  { id: 'gone', path: '/gone', pageId: '66666666-6666-4666-8666-666666666666' },
];

const summary: AppSummary = {
  app_id: APP,
  pages: [
    {
      id: CODE_PAGE,
      name: 'Home',
      components: [
        {
          id: 'root',
          type: 'Lib_App',
          properties: { codePage: { value: '{{true}}' }, routes: { value: JSON.stringify(routes) } },
        },
      ],
    },
    { id: ORDERS_PAGE, name: 'Home: Orders', hidden: true, components: [] },
    { id: PAYROLL_PAGE, name: 'Home: Payroll', hidden: true, components: [] },
  ],
  queries: [],
  events: [],
};

const clientWith = (overrides: Partial<ToolJetClient> = {}) =>
  ({
    getAppSummary: vi.fn().mockResolvedValue(summary),
    getAppPermission: vi.fn().mockResolvedValue([]),
    setAppPermission: vi.fn().mockResolvedValue([
      { id: 'perm', type: 'GROUP', groups: [{ permissionGroup: { id: GROUP, name: 'Finance' } }] },
    ]),
    clearAppPermission: vi.fn().mockResolvedValue(undefined),
    listAppPermissionSubjects: vi.fn().mockResolvedValue({ users: [], groups: [{ id: GROUP, name: 'Finance', count: 2 }] }),
    ...overrides,
  }) as unknown as ToolJetClient;

describe('Code mode screens in manage_app_permissions', () => {
  it("lists a code page's routes with their hidden pages, skipping routes whose page is gone", () => {
    expect(codeScreens(summary)).toEqual([
      { route_id: 'orders', path: '/', title: 'Orders', page_id: ORDERS_PAGE, code_page_id: CODE_PAGE },
      { route_id: 'payroll', path: '/payroll', title: 'Payroll', page_id: PAYROLL_PAGE, code_page_id: CODE_PAGE },
    ]);
  });

  it('finds a screen by route id or path, and names the screens when none matches', () => {
    expect(findScreen(summary, 'payroll').page_id).toBe(PAYROLL_PAGE);
    expect(findScreen(summary, '/payroll').page_id).toBe(PAYROLL_PAGE);
    expect(() => findScreen(summary, 'nope')).toThrow(/Its screens: orders \(\/\), payroll \(\/payroll\)/);
  });

  it("list_screens returns each screen's access", async () => {
    const client = clientWith();
    const result = textOf(await manageAppPermissionsTool(client).handler({ action: 'list_screens', app_id: APP }));
    expect(result.screens).toHaveLength(2);
    expect(result.screens[0]).toMatchObject({ route_id: 'orders', page_id: ORDERS_PAGE, access: 'all' });
    expect(client.getAppPermission).toHaveBeenCalledWith(APP, 'page', PAYROLL_PAGE);
  });

  it('list_queries returns each query with its access and counts the limited ones', async () => {
    // An edit's access check reads the limits set before it (2026-11-05: 11 limits, reported as "no query is limited").
    const withQueries = { ...summary, queries: [{ id: 'q-own', name: 'my_expenses' }, { id: 'q-queue', name: 'manager_pending_page' }] } as AppSummary;
    const client = clientWith({
      getAppSummary: vi.fn().mockResolvedValue(withQueries),
      getAppPermission: vi.fn(async (_app: string, _type: string, id: string) =>
        id === 'q-queue' ? [{ id: 'perm', type: 'GROUP', groups: [{ permissionGroup: { id: GROUP, name: 'Managers' } }] }] : []
      ) as any,
    });
    const result = textOf(await manageAppPermissionsTool(client).handler({ action: 'list_queries', app_id: APP }));
    expect(result.limited).toBe(1);
    expect(result.queries[0]).toMatchObject({ query_id: 'q-own', name: 'my_expenses', access: 'all' });
    expect(result.queries[1]).toMatchObject({ query_id: 'q-queue', name: 'manager_pending_page', access: 'groups' });
    expect(client.getAppPermission).toHaveBeenCalledWith(APP, 'query', 'q-queue');
  });

  it("set with a route limits that screen's hidden page", async () => {
    const client = clientWith();
    const result = textOf(
      await manageAppPermissionsTool(client).handler({
        action: 'set',
        app_id: APP,
        route: '/payroll',
        access_type: 'groups',
        group_ids: [GROUP],
        confirm: true,
      })
    );
    expect(client.setAppPermission).toHaveBeenCalledWith({
      appId: APP,
      resourceType: 'page',
      resourceId: PAYROLL_PAGE,
      accessType: 'groups',
      subjectIds: [GROUP],
    });
    expect(result.resource).toMatchObject({ id: PAYROLL_PAGE, screen: { route_id: 'payroll', path: '/payroll' } });
    expect(result.access).toBe('groups');
  });

  it('refuses a route with a query resource type, and reads a route with a resource id as two targets', async () => {
    const tool = manageAppPermissionsTool(clientWith());
    const asQuery = await tool.handler({ action: 'get', app_id: APP, route: 'payroll', resource_type: 'query' });
    expect(asQuery.isError).toBe(true);
    expect(asQuery.content[0]!.text).toMatch(/leave resource_type out/);
    const both = textOf(await tool.handler({ action: 'get', app_id: APP, route: 'payroll', resource_id: ORDERS_PAGE }));
    expect(both.results.map((r: any) => r.resource.id)).toEqual([PAYROLL_PAGE, ORDERS_PAGE]);
  });
});

const MANAGERS = '77777777-7777-4777-8777-777777777777';
const ADMIN = '88888888-8888-4888-8888-888888888888';
const QUERY = '99999999-9999-4999-8999-999999999999';
const QUERY2 = 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd';
const USER = 'efefefef-efef-4fef-8fef-efefefefefef';

const workspaceGroups = [
  { id: ADMIN, name: 'admin', type: 'default' },
  { id: GROUP, name: 'Finance', type: 'custom' },
  { id: MANAGERS, name: 'Managers', type: 'custom' },
];

describe('groups that cannot open the app (roles test, 2026-11-04)', () => {
  const withQuery = { ...summary, name: 'Spend approvals', queries: [{ id: QUERY, name: 'decide_manager', kind: 'tooljetdb' }] } as AppSummary;
  const roleClient = (overrides: Partial<ToolJetClient> = {}) =>
    clientWith({
      getAppSummary: vi.fn().mockResolvedValue(withQuery),
      listWorkspaceGroups: vi.fn().mockResolvedValue(workspaceGroups),
      // Only the groups whose access rule covers the app, as ToolJet's pages/user-groups returns them.
      listAppPermissionSubjects: vi.fn().mockResolvedValue({ users: [], groups: [{ id: ADMIN, name: 'admin', count: 1 }] }),
      getLicenseFeatureAccess: vi.fn().mockResolvedValue({ appPermissionQuery: true, appPermissionPages: true, serverSideGlobalResolve: false }),
      writeWorkspaceGroupAccess: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    });
  const setManagers = (extra: Record<string, unknown> = {}) => ({
    action: 'set', app_id: APP, resource_type: 'query', resource_id: QUERY, access_type: 'groups', group_ids: [MANAGERS], confirm: true, ...extra,
  });

  it('list_subjects lists every workspace group, marking which can open the app, and what the plan enforces', async () => {
    const result = textOf(await manageAppPermissionsTool(roleClient()).handler({ action: 'list_subjects', app_id: APP }));
    expect(result.groups).toEqual([
      { id: ADMIN, name: 'admin', type: 'default', count: 1, can_open_app: true },
      { id: GROUP, name: 'Finance', type: 'custom', can_open_app: false },
      { id: MANAGERS, name: 'Managers', type: 'custom', can_open_app: false },
    ]);
    expect(result.plan).toEqual({ query_limits: true, screen_limits: true, server_side_current_user: false });
    expect(result.note).toMatch(/grant_app_access:true/);
  });

  it('list_subjects falls back to the groups that can open the app when the workspace list is refused', async () => {
    const client = roleClient({
      listWorkspaceGroups: vi.fn().mockRejectedValue(new Error('403')),
      getLicenseFeatureAccess: vi.fn().mockRejectedValue(new Error('404')),
    });
    const result = textOf(await manageAppPermissionsTool(client).handler({ action: 'list_subjects', app_id: APP }));
    expect(result.groups).toEqual([{ id: ADMIN, name: 'admin', count: 1, can_open_app: true }]);
    expect(result.plan).toBeUndefined();
    expect(result.note).toMatch(/could not be read/);
  });

  it('refuses a limit to a group that cannot open the app, naming the fix, and changes nothing', async () => {
    const client = roleClient();
    const result = await manageAppPermissionsTool(client).handler(setManagers({ grant_app_access: false }));
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Managers cannot open this app yet.*grant_app_access: true/);
    expect(client.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
    expect(client.setAppPermission).not.toHaveBeenCalled();
  });

  it('with grant_app_access, gives the group view access to this app only, then sets the limit', async () => {
    const subjects = vi.fn()
      .mockResolvedValueOnce({ users: [], groups: [{ id: ADMIN, name: 'admin' }] })
      .mockResolvedValueOnce({ users: [], groups: [{ id: ADMIN, name: 'admin' }, { id: MANAGERS, name: 'Managers' }] });
    const client = roleClient({ listAppPermissionSubjects: subjects });
    const result = textOf(await manageAppPermissionsTool(client).handler(setManagers({ grant_app_access: true })));
    expect(client.writeWorkspaceGroupAccess).toHaveBeenCalledWith('POST', MANAGERS, 'app', undefined, {
      name: 'Spend approvals (view)',
      type: 'app',
      groupId: MANAGERS,
      isAll: false,
      createResourcePermissionObject: {
        canEdit: false, canView: true, hideFromDashboard: false, canAccessDevelopment: false, canAccessStaging: false,
        canAccessProduction: false, canAccessReleased: true, resourcesToAdd: [{ appId: APP }],
      },
    });
    expect(client.setAppPermission).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'query', resourceId: QUERY, subjectIds: [MANAGERS] }));
    expect(result.granted_app_access).toEqual([{ group_id: MANAGERS, name: 'Managers', rule_name: 'Spend approvals (view)' }]);
  });

  // The limit first, then the grant: a failure part way leaves less access than asked for, never more, and the access
  // rule this call added is removed again (security audit, 2026-11-05: the grant used to come first, with no rollback).
  it('removes the access rule it added when ToolJet does not confirm the grant, after setting the limit', async () => {
    const client = roleClient({
      listWorkspaceGroupAccess: vi.fn().mockResolvedValue([
        { id: 'rule-1', name: 'Spend approvals (view)', type: 'app', is_all: false, actions: {}, resources: [{ id: APP, name: 'Spend approvals', membership_id: 'm' }] },
        { id: 'rule-other', name: 'Other (view)', type: 'app', is_all: false, actions: {}, resources: [{ id: 'other-app', name: 'Other', membership_id: 'n' }] },
      ]),
    });
    const result = await manageAppPermissionsTool(client).handler(setManagers({ grant_app_access: true }));
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/limits were set.*did not confirm that Managers can open this app.*access rules added here were removed/);
    expect(client.setAppPermission).toHaveBeenCalledOnce();
    expect(client.writeWorkspaceGroupAccess).toHaveBeenCalledWith('DELETE', MANAGERS, 'app', 'rule-1');
    expect(client.writeWorkspaceGroupAccess).not.toHaveBeenCalledWith('DELETE', MANAGERS, 'app', 'rule-other');
  });

  it('gives no app access when every limit fails', async () => {
    const client = roleClient({ setAppPermission: vi.fn().mockRejectedValue(new Error('Query permission not found')) });
    const result = await manageAppPermissionsTool(client).handler(setManagers({ grant_app_access: true }));
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Query permission not found.*No access to the app was given/);
    expect(client.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });

  it('removes the first group\'s rule when the second group\'s cannot be added', async () => {
    const write = vi.fn().mockImplementation(async (method: string, groupId: string) => {
      if (method === 'POST' && groupId === MANAGERS) throw new Error('500');
    });
    const client = roleClient({
      writeWorkspaceGroupAccess: write,
      listWorkspaceGroupAccess: vi.fn().mockResolvedValue([
        { id: 'rule-finance', name: 'Spend approvals (view)', type: 'app', is_all: false, actions: {}, resources: [{ id: APP, name: 'Spend approvals', membership_id: 'm' }] },
      ]),
    });
    const result = await manageAppPermissionsTool(client).handler(setManagers({ group_ids: [GROUP, MANAGERS], grant_app_access: true }));
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Managers could not be given access/);
    expect(write).toHaveBeenCalledWith('DELETE', GROUP, 'app', 'rule-finance');
  });

  it('needs no grant for a group that can already open the app, and refuses an unknown group', async () => {
    const client = roleClient();
    await manageAppPermissionsTool(client).handler(setManagers({ group_ids: [ADMIN] }));
    expect(client.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
    expect(client.setAppPermission).toHaveBeenCalled();
    const unknown = await manageAppPermissionsTool(roleClient()).handler(
      setManagers({ group_ids: ['abababab-abab-4bab-8bab-abababababab'], grant_app_access: true })
    );
    expect(unknown.content[0]!.text).toMatch(/is not a group of this workspace/);
  });

  it('refuses grant_app_access on a limit to users', async () => {
    const client = roleClient({ listAppPermissionSubjects: vi.fn().mockResolvedValue({ users: [{ id: USER, email: 'a@x.com' }], groups: [] }) });
    const result = await manageAppPermissionsTool(client).handler({ action: 'set', app_id: APP, query: 'decide_manager', users: ['a@x.com'], grant_app_access: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/grant_app_access applies only to a limit to groups/);
    expect(client.setAppPermission).not.toHaveBeenCalled();
  });
});

describe('the minimal call a model sends (DeepSeek role build, 2026-11-04)', () => {
  const app = {
    ...summary,
    name: 'Spend approvals',
    queries: [
      { id: QUERY, name: 'finance_queue', kind: 'tooljetdb' },
      { id: QUERY2, name: 'finance_approve', kind: 'tooljetdb' },
    ],
  } as AppSummary;
  const subjects = () =>
    vi.fn()
      .mockResolvedValueOnce({ users: [], groups: [{ id: ADMIN, name: 'admin' }] })
      .mockResolvedValue({ users: [], groups: [{ id: ADMIN, name: 'admin' }, { id: GROUP, name: 'Finance' }, { id: MANAGERS, name: 'Managers' }] });
  const client = (overrides: Partial<ToolJetClient> = {}) =>
    clientWith({
      getAppSummary: vi.fn().mockResolvedValue(app),
      listWorkspaceGroups: vi.fn().mockResolvedValue(workspaceGroups),
      listAppPermissionSubjects: subjects(),
      writeWorkspaceGroupAccess: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    });

  it('limits a screen to a group by name, with no confirm, access_type or resource_type, granting app access', async () => {
    const c = client();
    const result = textOf(await manageAppPermissionsTool(c).handler({ action: 'set', app_id: APP, route: '/payroll', groups: ['finance'] }));
    expect(c.writeWorkspaceGroupAccess).toHaveBeenCalledWith('POST', GROUP, 'app', undefined, expect.objectContaining({ groupId: GROUP }));
    expect(c.setAppPermission).toHaveBeenCalledWith({ appId: APP, resourceType: 'page', resourceId: PAYROLL_PAGE, accessType: 'groups', subjectIds: [GROUP] });
    expect(result.granted_app_access).toEqual([{ group_id: GROUP, name: 'Finance', rule_name: 'Spend approvals (view)' }]);
    expect(result.note).toMatch(/Finance could not open this app, so it now has view access to this app only/);
  });

  it('limits several queries by name to several groups in one call', async () => {
    const c = client();
    const result = textOf(
      await manageAppPermissionsTool(c).handler({ action: 'set', app_id: APP, queries: ['finance_queue', QUERY2], groups: ['Finance', 'Managers'] })
    );
    expect(c.writeWorkspaceGroupAccess).toHaveBeenCalledTimes(2);
    expect(c.setAppPermission).toHaveBeenCalledTimes(2);
    expect(c.setAppPermission).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'query', resourceId: QUERY, subjectIds: [GROUP, MANAGERS] }));
    expect(c.setAppPermission).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'query', resourceId: QUERY2 }));
    expect(result.results.map((r: any) => r.resource.name)).toEqual(['finance_queue', 'finance_approve']);
  });

  it('names every problem at once, with a call that works, and changes nothing', async () => {
    const c = client();
    const result = await manageAppPermissionsTool(c).handler({ action: 'set', app_id: APP, query: 'nope', groups: ['Auditors'] });
    expect(result.isError).toBe(true);
    const text = result.content[0]!.text;
    expect(text).toMatch(/No query "nope" in this app\. Its queries: finance_queue, finance_approve\./);
    expect(text).toMatch(/"Auditors" is not a group of this workspace\. Its groups: admin, Finance, Managers\./);
    expect(text).toMatch(/A call that works: \{"action":"set","app_id":"[^"]+","query":"nope","groups":\["Auditors"\]\}/);
    expect(c.setAppPermission).not.toHaveBeenCalled();
    expect(c.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });

  it('asks what to limit and for whom when both are missing', async () => {
    const result = await manageAppPermissionsTool(client()).handler({ action: 'set', app_id: APP });
    const text = result.content[0]!.text;
    expect(text).toMatch(/Name what to limit.*Screens: \/, \/payroll\..*Queries: finance_queue, finance_approve/);
    expect(text).toMatch(/Name who keeps access/);
  });

  it('still needs confirm for clear, and for set on an app that is not a Code mode app', async () => {
    const c = client();
    const clear = await manageAppPermissionsTool(c).handler({ action: 'clear', app_id: APP, route: '/payroll' });
    expect(clear.content[0]!.text).toMatch(/clear opens the resource to everyone.*confirm:true/s);
    expect(c.clearAppPermission).not.toHaveBeenCalled();
    const visual = { ...app, pages: [{ id: ORDERS_PAGE, name: 'Orders', components: [] }] } as AppSummary;
    const v = client({ getAppSummary: vi.fn().mockResolvedValue(visual) });
    const set = await manageAppPermissionsTool(v).handler({ action: 'set', app_id: APP, query: 'finance_queue', groups: ['Finance'] });
    expect(set.content[0]!.text).toMatch(/needs confirm:true/);
    expect(set.content[0]!.text).toMatch(/"confirm":true/);
    expect(v.setAppPermission).not.toHaveBeenCalled();
    await manageAppPermissionsTool(v).handler({ action: 'set', app_id: APP, query: 'finance_queue', groups: ['admin'], confirm: true });
    expect(v.setAppPermission).toHaveBeenCalled();
  });

  it('limits to users by email', async () => {
    const c = client({ listAppPermissionSubjects: vi.fn().mockResolvedValue({ users: [{ id: USER, email: 'Mgr@x.com' }], groups: [] }) });
    await manageAppPermissionsTool(c).handler({ action: 'set', app_id: APP, query: 'finance_queue', users: ['mgr@x.com'] });
    expect(c.setAppPermission).toHaveBeenCalledWith(expect.objectContaining({ accessType: 'users', subjectIds: [USER] }));
  });
});
