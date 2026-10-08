import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditPages, verifyPageRenderTool } from '../src/tools/verifyPageRender.js';
import { renderAuditBase, renderAuditOrigins, renderAuditUrlAllowed } from '../src/renderAuditPolicy.js';

afterEach(() => vi.unstubAllEnvs());

const client = {
  getAppSummary: async () => ({ pages: [{ handle: 'home', name: 'Home' }, { handle: 'orders', name: 'Orders' }] }),
} as any;

describe('verify_page_render', () => {
  it('fails clearly when the page handle does not exist', async () => {
    const tool = verifyPageRenderTool(client, () => 'http://viewer.test');
    const res: any = await tool.handler({ app_id: 'app1', page_handle: 'nope' });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res)).toContain('no page nope');
  });

  it('reports the audit as unreachable instead of guessing when no browser driver is installed', async () => {
    process.env.MCP_RENDER_AUDIT_PLAYWRIGHT = '/definitely/not/here';
    const reports = await auditPages([{ page: 'home', url: 'http://viewer.test/applications/app1/home' }]);
    delete process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
    expect(reports).toHaveLength(1);
    expect(reports[0].findings[0].kind).toBe('unreachable');
  });
});

function browserFixture({ status = 200, widgets = 1, landed = 'http://viewer.test/applications/app1/home', resource, redirect, method = 'GET', duringSettle = false }: {
  status?: number; widgets?: number; landed?: string; resource?: string; redirect?: string; method?: string; duringSettle?: boolean;
} = {}) {
  let handler: (route: any) => Promise<void>;
  const route = {
    request: () => ({ url: () => resource ?? 'http://viewer.test/applications/app1/home', method: () => method }),
    abort: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn().mockResolvedValue({
      status: () => redirect ? 302 : 200, headers: () => redirect ? { location: redirect } : {},
      dispose: vi.fn().mockResolvedValue(undefined),
    }),
    fulfill: vi.fn().mockResolvedValue(undefined),
  };
  const context = {
    route: vi.fn(async (_: string, cb: typeof handler) => { handler = cb; }),
    routeWebSocket: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    newPage: vi.fn().mockResolvedValue({
      goto: async () => { if (!duringSettle && (resource || redirect)) { await handler(route); if (route.abort.mock.calls.length) throw new Error('aborted'); } return { status: () => status }; },
      waitForTimeout: vi.fn(async () => { if (duringSettle) await handler(route); }), waitForFunction: vi.fn().mockResolvedValue(undefined),
      url: () => landed, evaluate: vi.fn().mockResolvedValue({ widgets, findings: [] }),
    }),
  };
  const browser = { newContext: vi.fn().mockResolvedValue(context), close: vi.fn() };
  const driver = async () => ({ chromium: { launch: vi.fn().mockResolvedValue(browser) } });
  return { route, context, browser, driver };
}
const target = [{ page: 'home', url: 'http://viewer.test/applications/app1/home' }];

describe('render audit query execution', () => {
  const savedQueries = { version_id: 'v-library', queries: [{ id: 'q-shelves', kind: 'postgresql',
    data_source_id: 'ds-library', options: { query: 'SELECT shelf_id FROM shelves LIMIT 5' } }] };
  const run = 'http://viewer.test/api/data-queries/q-shelves/versions/v-library/run/env-dev?mode=view';

  it.each([run, 'http://viewer.test/api/data-queries/q-shelves/run'])('allows saved static bounded reads without option overrides: %s', async resource => {
    const f = browserFixture({ resource, method: 'POST' });
    const [report] = await auditPages(target, { savedQueries }, f.driver);
    expect(report.findings).toEqual([]);
    expect(f.route.fetch).toHaveBeenCalledWith(expect.objectContaining({ postData: '{"resolvedOptions":{}}' }));
    expect(f.route.fulfill).toHaveBeenCalledOnce();
  });

  it.each([
    ['POST', '/api/apps/library/public'],
    ['PATCH', '/api/data-queries/q-shelves/versions/v-library'],
    ['DELETE', '/api/apps/library'],
    ['POST', '/api/data-queries/unknown/run'],
    ['POST', '/api/data-queries/q-shelves/versions/other/run/env-dev?mode=view'],
    ['POST', '/api/data-queries/q-shelves/versions/v-library/preview/env-dev'],
    ['POST', '/api/data-queries/q-shelves/versions/v-library/run/env-dev?mode=edit'],
  ])('blocks %s %s before dispatch', async (method, path) => {
    const f = browserFixture({ resource: `http://viewer.test${path}`, method });
    const [report] = await auditPages(target, { savedQueries }, f.driver);
    expect(report.findings[0].reason).toBe('blocked_execution');
    expect(f.route.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { kind: 'postgresql', options: { query: 'DELETE FROM shelves' } },
    { kind: 'postgresql', options: { query: 'SELECT shelf_id FROM shelves' } },
    { kind: 'postgresql', options: { query: 'SELECT shelf_id FROM shelves LIMIT 5 {{variables.tail}}' } },
    { kind: 'postgresql', options: { query: 'SELECT shelf_id FROM shelves LIMIT 5', requestConfirmation: true } },
    { kind: 'bigquery', options: { query: 'SELECT shelf_id FROM shelves LIMIT 5' } },
    { kind: 'restapi', options: { method: 'get', url: 'https://catalogue.test/shelves?limit=5' } },
    { kind: 'runjs', options: { code: 'queries.removeShelf.run()' } },
  ])('blocks unsafe or unverified query events even after navigation: %j', async query => {
    const f = browserFixture({ resource: run, method: 'POST', duringSettle: true });
    const saved = { ...savedQueries, queries: [{ ...savedQueries.queries[0], ...query }] };
    const [report] = await auditPages(target, { savedQueries: saved }, f.driver);
    expect(report.widgets).toBe(1);
    expect(report.findings[0].reason).toBe('blocked_execution');
    expect(f.route.fetch).not.toHaveBeenCalled();
  });

  it('passes the audited app queries into the authenticated browser gate', async () => {
    const f = browserFixture({ resource: run, method: 'POST' });
    const session = { ...client, getAppSummary: async () => ({ ...await client.getAppSummary(), ...savedQueries }) };
    const result = await verifyPageRenderTool(session as any, () => 'http://viewer.test', f.driver).handler({ app_id: 'app1' });
    expect(result.isError).toBeFalsy();
    expect(f.route.fetch).toHaveBeenCalled();
  });
});

describe('render audit network boundary and honest results', () => {
  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'http://user:password@viewer.test', 'http://169.254.169.254', 'http://viewer.test.attacker.test'])('rejects untrusted viewer overrides: %s', async (viewer_url) => {
    const getAppSummary = vi.fn();
    const tool = verifyPageRenderTool({ getAppSummary } as any, () => 'http://viewer.test');
    expect((await tool.handler({ app_id: 'app1', viewer_url })).isError).toBe(true);
    expect(getAppSummary).not.toHaveBeenCalled();
  });

  it('preserves explicitly configured private viewers and subpaths', () => {
    expect(renderAuditBase('http://127.0.0.1:8082/tooljet').base).toBe('http://127.0.0.1:8082/tooljet');
    vi.stubEnv('MCP_RENDER_AUDIT_ALLOWED_ORIGINS', 'https://tunnel.test');
    expect(renderAuditBase('http://viewer.test', 'https://tunnel.test').base).toBe('https://tunnel.test');
    const origins = renderAuditOrigins('http://10.0.0.1:8082');
    expect(renderAuditUrlAllowed('http://10.0.0.1:8082/applications/a', origins)).toBe(true);
    expect(renderAuditUrlAllowed('http://10.0.0.1:8083/', origins)).toBe(false);
  });

  it('blocks off-origin subresources before fetching them', async () => {
    const f = browserFixture({ resource: 'http://169.254.169.254/latest/meta-data' });
    const [report] = await auditPages(target, {}, f.driver);
    expect(report.findings[0].reason).toBe('blocked_destination');
    expect(f.route.fetch).not.toHaveBeenCalled();
    expect(f.context.routeWebSocket).toHaveBeenCalled();
    expect(f.browser.newContext).toHaveBeenCalledWith(expect.objectContaining({ serviceWorkers: 'block' }));
    expect(f.context.close).toHaveBeenCalled();
  });

  it.each(['http://169.254.169.254/', '/canonical'])('does not follow HTTP redirects: %s', async (redirect) => {
    const f = browserFixture({ redirect });
    const [report] = await auditPages(target, {}, f.driver);
    expect(report.findings[0].reason).toBe('redirect_blocked');
    expect(f.route.fetch).toHaveBeenCalledWith(expect.objectContaining({ maxRedirects: 0 }));
    expect(f.route.fulfill).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 500])('does not certify HTTP %s as a clean page', async (status) => {
    const f = browserFixture({ status });
    const [report] = await auditPages(target, {}, f.driver);
    expect(report.findings[0].reason).toBe(status === 401 || status === 403 ? 'auth_required' : 'navigation_failed');
  });

  it('names what it blocked when a page then shows no widgets, instead of a bare no_widgets', async () => {
    // Compiler round 3 (2026-10-04): every page of every build read "no widgets" and the blocked request that
    // emptied them was dropped from the report.
    const f = browserFixture({ resource: 'http://viewer.test/api/apps/app1/session', method: 'POST', duringSettle: true, widgets: 0 });
    const [report] = await auditPages(target, {}, f.driver);
    expect(report.widgets).toBe(0);
    expect(report.findings[0].reason).toBe('blocked_execution');
    expect(report.findings[0].detail).toMatch(/POST \/api\/apps\/app1\/session/);
    expect(report.findings[0].detail).toMatch(/no widgets/i);
  });

  it('distinguishes no widgets, sign-in and browser setup failure from a clean render', async () => {
    expect((await auditPages(target, {}, browserFixture({ widgets: 0 }).driver))[0].findings[0].reason).toBe('no_widgets');
    expect((await auditPages(target, {}, browserFixture({ landed: 'http://viewer.test/login' }).driver))[0].findings[0].reason).toBe('auth_required');
    expect((await auditPages(target, {}, browserFixture({ redirect: '/login' }).driver))[0].findings[0].reason).toBe('auth_required');
    const driver = async () => ({ chromium: { launch: async () => { throw new Error('missing chrome'); } } });
    expect((await auditPages(target, {}, driver))[0].findings[0].reason).toBe('browser_unavailable');
    expect((await auditPages(target, {}, browserFixture().driver))[0].findings).toEqual([]);
  });
});

// Every build's audit reported "could not open the viewer (private app, no viewer session)" (2026-09-26): nearly all
// apps are private while they are built, so no page was ever audited. The browser now carries the MCP server's own
// session, scoped to the audit origins it may visit, and opens the version being edited (a released app's public URL
// would show the old version).
describe('render audit with the builder\'s session', () => {
  it('adds the session cookie for the viewer origin only', async () => {
    const f = browserFixture();
    (f.context as any).addCookies = vi.fn().mockResolvedValue(undefined);
    await auditPages(target, { session: 'tok123' }, f.driver);
    expect((f.context as any).addCookies).toHaveBeenCalledWith([{ name: 'tj_auth_token', value: 'tok123', url: 'http://viewer.test' }]);
  });
  it('opens the edited version of every page with the session', async () => {
    const f = browserFixture();
    (f.context as any).addCookies = vi.fn().mockResolvedValue(undefined);
    const gotoUrls: string[] = [];
    const page = await f.context.newPage();
    const goto = page.goto;
    f.context.newPage = vi.fn().mockResolvedValue({ ...page, goto: async (url: string, o: unknown) => { gotoUrls.push(url); return goto(url, o); } });
    const session = { ...client, viewerSession: async () => 'tok123', editingVersionName: async () => 'v2' };
    const tool = verifyPageRenderTool(session, () => 'http://viewer.test', f.driver);
    const res: any = await tool.handler({ app_id: 'app1' });
    expect(res.isError).toBeFalsy();
    expect(gotoUrls).toEqual(['http://viewer.test/applications/app1/home?env=development&version=v2', 'http://viewer.test/applications/app1/orders?env=development&version=v2']);
    expect((f.context as any).addCookies).toHaveBeenCalled();
  });
  it('stays unauthenticated when the host turns the session off', async () => {
    vi.stubEnv('MCP_RENDER_AUDIT_SESSION', 'off');
    const f = browserFixture();
    (f.context as any).addCookies = vi.fn().mockResolvedValue(undefined);
    const session = { ...client, viewerSession: async () => 'tok123', editingVersionName: async () => 'v2' };
    await verifyPageRenderTool(session, () => 'http://viewer.test', f.driver).handler({ app_id: 'app1' });
    expect((f.context as any).addCookies).not.toHaveBeenCalled();
  });
});
