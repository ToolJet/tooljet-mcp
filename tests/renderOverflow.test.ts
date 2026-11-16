import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { codePageAuditScript, type RenderFinding } from '../src/tools/verifyPageRender.js';

/*
  Content wider than its own box, in a real Chrome: layout cannot be measured without one. The two fixtures are the
  Code mode frames of the DeepSeek round of 2026-11-03 that the graders caught and the check passed (the expense queue
  table at 1280 px, the maintenance dashboard grid at 375 px), captured with their stylesheets inlined (fonts and data
  URIs dropped). Runs where MCP_RENDER_AUDIT_PLAYWRIGHT names a playwright-core and Chrome is installed; skipped
  elsewhere.
*/
const playwrightPath = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
const available = !!playwrightPath && existsSync(playwrightPath);
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', 'render-overflow', name), 'utf8');

describe.skipIf(!available)('a Code mode page whose content is wider than its box', () => {
  let browser: any;
  beforeAll(async () => {
    const pw = createRequire(import.meta.url)(playwrightPath!);
    browser = await pw.chromium.launch({ headless: true, channel: process.env.MCP_RENDER_AUDIT_CHANNEL || 'chrome' });
  }, 60_000);
  afterAll(async () => browser?.close());

  const audit = async (frameHtml: string, width: number, route?: string): Promise<RenderFinding[]> => {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 812 : 900 } });
    try {
      await page.setContent('<!doctype html><html><body style="margin:0"><iframe data-tj-code-page-frame style="border:0;width:100vw;height:100vh;display:block"></iframe></body></html>');
      await page.evaluate((html: string) => {
        const doc = (document.querySelector('iframe') as HTMLIFrameElement).contentDocument!;
        doc.open(); doc.write(html); doc.close();
      }, frameHtml);
      await page.waitForTimeout(300);
      return ((await page.evaluate(codePageAuditScript, route)) as RenderFinding[]) ?? [];
    } finally {
      await page.close();
    }
  };
  const spill = (findings: RenderFinding[]) => findings.find((f) => f.detail.startsWith('content wider than its box'));
  const app = (body: string) => `<!doctype html><html><head><style>body{margin:0;font:14px sans-serif}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}</style></head><body><div id="tj-frame-root">${body}</div></body></html>`;

  it('names the expense queue table that spills out of its card at 1280 px', async () => {
    const found = spill(await audit(fixture('expense-queue-1280.html'), 1280, '/'));
    expect(found?.detail).toMatch(/on \/ at 1280px: table .*\(69\dpx\) in div .*\(64\dpx\) and spills out/);
  }, 30_000);

  it('names the maintenance dashboard grid whose column is wider than its box at 375 px', async () => {
    const found = spill(await audit(fixture('maintenance-dashboard-375.html'), 375, '/dashboard'));
    expect(found?.detail).toMatch(/on \/dashboard at 375px: .*its grid columns \(35\dpx\) are wider than the box/);
  }, 30_000);

  it('says a card that hides the overflow cuts its table off', async () => {
    const found = spill(await audit(app('<div style="width:300px;overflow:hidden"><table style="width:520px"><tr><td>Decision</td></tr></table></div>'), 1280));
    expect(found?.detail).toMatch(/table .*\(520px\) in div .*\(300px\) and is cut off/);
  }, 30_000);

  it('leaves alone a table that scrolls on purpose, screen-reader text and truncated text', async () => {
    const findings = await audit(app(
      '<div style="width:300px;overflow-x:auto"><table style="width:520px"><tr><td>Decision</td></tr></table></div>' +
      '<span class="sr-only">Open the request for Kestrel Cloud Services, raised 3 days ago</span>' +
      '<p style="width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">A very long vendor name that is truncated</p>'
    ), 1280);
    expect(spill(findings)).toBeUndefined();
    expect(findings.filter((f) => f.kind === 'clipped')).toEqual([]);
  }, 30_000);
});
