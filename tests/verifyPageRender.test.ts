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

function browserFixture({ status = 200, widgets = 1, landed = 'http://viewer.test/applications/app1/home', resource, redirect }: {
  status?: number; widgets?: number; landed?: string; resource?: string; redirect?: string;
} = {}) {
  let handler: (route: any) => Promise<void>;
  const route = {
    request: () => ({ url: () => resource ?? 'http://viewer.test/applications/app1/home' }),
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
      goto: async () => { if (resource || redirect) { await handler(route); if (route.abort.mock.calls.length) throw new Error('aborted'); } return { status: () => status }; },
      waitForTimeout: vi.fn(), waitForFunction: vi.fn().mockResolvedValue(undefined),
      url: () => landed, evaluate: vi.fn().mockResolvedValue({ widgets, findings: [] }),
    }),
  };
  const browser = { newContext: vi.fn().mockResolvedValue(context), close: vi.fn() };
  const driver = async () => ({ chromium: { launch: vi.fn().mockResolvedValue(browser) } });
  return { route, context, browser, driver };
}
const target = [{ page: 'home', url: 'http://viewer.test/applications/app1/home' }];

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

  it('distinguishes no widgets, sign-in and browser setup failure from a clean render', async () => {
    expect((await auditPages(target, {}, browserFixture({ widgets: 0 }).driver))[0].findings[0].reason).toBe('no_widgets');
    expect((await auditPages(target, {}, browserFixture({ landed: 'http://viewer.test/login' }).driver))[0].findings[0].reason).toBe('auth_required');
    expect((await auditPages(target, {}, browserFixture({ redirect: '/login' }).driver))[0].findings[0].reason).toBe('auth_required');
    const driver = async () => ({ chromium: { launch: async () => { throw new Error('missing chrome'); } } });
    expect((await auditPages(target, {}, driver))[0].findings[0].reason).toBe('browser_unavailable');
    expect((await auditPages(target, {}, browserFixture().driver))[0].findings).toEqual([]);
  });
});
