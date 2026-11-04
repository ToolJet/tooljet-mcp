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

  it('refuses a route with a query resource type, or with a resource id', async () => {
    const tool = manageAppPermissionsTool(clientWith());
    const asQuery = await tool.handler({ action: 'get', app_id: APP, route: 'payroll', resource_type: 'query' });
    expect(asQuery.isError).toBe(true);
    const both = await tool.handler({ action: 'get', app_id: APP, route: 'payroll', resource_id: ORDERS_PAGE });
    expect(both.isError).toBe(true);
  });
});
