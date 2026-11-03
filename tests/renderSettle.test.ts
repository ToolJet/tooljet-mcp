import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditPages, verifyPageRenderTool } from '../src/tools/verifyPageRender.js';

/*
  A Code mode page settles when its network goes quiet instead of a fixed 6 s plus 1.5 s (2026-11-03: 58 checks in a
  day of builds, median 15 s each, half of it fixed waits). The clock is faked: each waitForTimeout moves it on.
*/
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

function fakePage({ codeFrame, requests }: { codeFrame: boolean; requests: Array<{ start: number; end?: number; url?: () => string }> }) {
  const handlers: Record<string, Array<(r: unknown) => void>> = {};
  const waits: number[] = [];
  const t0 = Date.now();
  let fired = 0;
  // Requests start and finish at their simulated times, as the clock passes them.
  const advance = (ms: number) => {
    vi.setSystemTime(Date.now() + ms);
    const now = Date.now() - t0;
    requests.forEach((r, i) => {
      if (!(fired & (1 << (2 * i))) && now >= r.start) { fired |= 1 << (2 * i); handlers.request?.forEach((h) => h(r)); }
      if (r.end !== undefined && !(fired & (1 << (2 * i + 1))) && now >= r.end) { fired |= 1 << (2 * i + 1); handlers.requestfinished?.forEach((h) => h(r)); }
    });
  };
  const evaluate = vi.fn().mockResolvedValueOnce(codeFrame).mockResolvedValue({ widgets: 1, findings: [] });
  const page = {
    on: (event: string, cb: (r: unknown) => void) => { (handlers[event] ??= []).push(cb); },
    goto: async () => { advance(0); return { status: () => 200 }; },
    waitForFunction: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn(async (ms: number) => { waits.push(ms); advance(ms); }),
    url: () => 'http://viewer.test/applications/app1/home',
    evaluate,
  };
  const context = { route: vi.fn(), routeWebSocket: vi.fn(), close: vi.fn().mockResolvedValue(undefined), newPage: vi.fn().mockResolvedValue(page) };
  const browser = { newContext: vi.fn().mockResolvedValue(context), close: vi.fn() };
  const driver = async () => ({ chromium: { launch: vi.fn().mockResolvedValue(browser) } });
  return { driver, waits, elapsed: () => Date.now() - t0 };
}
const target = [{ page: 'home', url: 'http://viewer.test/applications/app1/home' }];

describe('render audit settle', () => {
  it('judges a Code mode page once its queries have answered, not after a fixed 7.5 s', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = fakePage({ codeFrame: true, requests: [{ start: 0, end: 400 }, { start: 200, end: 900 }] });
    await auditPages(target, {}, f.driver);
    expect(f.elapsed()).toBeGreaterThanOrEqual(900 + 750); // the last answer, then a quiet window
    expect(f.elapsed()).toBeLessThan(2500);
    expect(f.waits).not.toContain(6000);
    expect(f.waits).not.toContain(1500);
  });

  it('waits the whole settle for a Code mode page that keeps loading', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // A new request every 500 ms, each answering in 400 ms: never quiet.
    const requests = Array.from({ length: 12 }, (_, i) => ({ start: i * 500, end: i * 500 + 400 }));
    const f = fakePage({ codeFrame: true, requests });
    await auditPages(target, { settleMs: 3000 }, f.driver);
    expect(f.elapsed()).toBeGreaterThanOrEqual(3000);
    expect(f.elapsed()).toBeLessThan(3300);
  });

  // The viewer keeps /api/code-page-security open for as long as the page is (live check, 2026-11-03).
  it('does not let a request that stays open hold the settle', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = fakePage({ codeFrame: true, requests: [{ start: 0 }, { start: 100, end: 300 }] });
    await auditPages(target, { settleMs: 6000 }, f.driver);
    expect(f.elapsed()).toBeGreaterThanOrEqual(3000); // an unknown open request counts as loading for its first 3 s
    expect(f.elapsed()).toBeLessThan(3500);
  });

  it('ignores the code page security stream from the start', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const stream = { start: 0, url: () => 'http://localhost:3055/api/code-page-security' };
    const f = fakePage({ codeFrame: true, requests: [stream, { start: 100, end: 300 }] });
    await auditPages(target, { settleMs: 6000 }, f.driver);
    expect(f.elapsed()).toBeLessThan(2000); // the query, then the least settle and a quiet window
  });

  it('keeps the fixed settle and the chart wait for a ToolJet page', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = fakePage({ codeFrame: false, requests: [{ start: 0, end: 100 }] });
    await auditPages(target, {}, f.driver);
    expect(f.waits).toEqual([6000, 1500]);
  });
});

// The purchase approvals app has its code page and six hidden route pages; a route check audited all seven (2026-11-02).
describe('a Code mode route check', () => {
  const summary = { pages: [
    { handle: 'home', name: 'Home', hidden: false },
    { handle: 'home-requests', name: 'Home: All requests', hidden: true },
    { handle: 'home-finance', name: 'Home: Finance', hidden: true },
  ] };
  const client = { getAppSummary: async () => summary } as any;
  const audited = (driver: any) => verifyPageRenderTool(client, () => 'http://viewer.test', driver);
  const fake = () => {
    const urls: string[] = [];
    const page = { goto: async (u: string) => { urls.push(u); return { status: () => 200 }; }, waitForFunction: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined), url: () => 'http://viewer.test/applications/app1/home', evaluate: vi.fn().mockResolvedValue({ widgets: 1, findings: [] }) };
    const context = { route: vi.fn(), routeWebSocket: vi.fn(), close: vi.fn().mockResolvedValue(undefined), newPage: vi.fn().mockResolvedValue(page) };
    const browser = { newContext: vi.fn().mockResolvedValue(context), close: vi.fn() };
    return { urls, driver: async () => ({ chromium: { launch: vi.fn().mockResolvedValue(browser) } }) };
  };

  it('opens the visible code page once, not every hidden route page', async () => {
    vi.stubEnv('MCP_RENDER_AUDIT_ALLOWED_ORIGINS', 'http://viewer.test');
    const f = fake();
    await audited(f.driver).handler({ app_id: 'app1', route: '/finance', viewport_width: 1280 });
    expect(f.urls).toHaveLength(1);
    expect(f.urls[0]).toMatch(/\/applications\/app1\/home\?route=%2Ffinance$/);
  });

  it('still audits the named page, or every page when no route is given', async () => {
    vi.stubEnv('MCP_RENDER_AUDIT_ALLOWED_ORIGINS', 'http://viewer.test');
    const named = fake();
    await audited(named.driver).handler({ app_id: 'app1', route: '/finance', page_handle: 'home-finance' });
    expect(named.urls).toEqual([expect.stringContaining('/home-finance?route=%2Ffinance')]);
    const all = fake();
    await audited(all.driver).handler({ app_id: 'app1' });
    expect(all.urls).toHaveLength(3);
  });
});
