import { afterEach, describe, expect, it, vi } from 'vitest';
import { auditPages } from '../src/tools/verifyPageRender.js';

/*
  A Code mode page settles when its network goes quiet instead of a fixed 6 s plus 1.5 s (2026-11-03: 58 checks in a
  day of builds, median 15 s each, half of it fixed waits). The clock is faked: each waitForTimeout moves it on.
*/
afterEach(() => vi.useRealTimers());

function fakePage({ codeFrame, requests }: { codeFrame: boolean; requests: Array<{ start: number; end?: number }> }) {
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

  it('waits the whole settle for a Code mode page whose network never goes quiet', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = fakePage({ codeFrame: true, requests: [{ start: 0 }] });
    await auditPages(target, { settleMs: 3000 }, f.driver);
    expect(f.elapsed()).toBeGreaterThanOrEqual(3000);
    expect(f.elapsed()).toBeLessThan(3300);
  });

  it('keeps the fixed settle and the chart wait for a ToolJet page', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const f = fakePage({ codeFrame: false, requests: [{ start: 0, end: 100 }] });
    await auditPages(target, {}, f.driver);
    expect(f.waits).toEqual([6000, 1500]);
  });
});
