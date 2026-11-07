import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { axeRunInFrame, codePageAuditScript, type AxeViolation, type RenderFinding } from '../src/tools/verifyPageRender.js';

/*
  Colour contrast inside a Code mode frame, in a real Chrome with axe-core, on the colour pairs of QA Expense Approvals
  (2026-11-05). The render check said "some text is hard to read" on every screen and named only "p:nth-child(2)"; that
  was ToolJet's own refusal of the screen (#816d65 on #f9f5f3, 4.49:1), shown because the check's user may not open the
  screen, while the app's light-on-dark header text passed. Runs where MCP_RENDER_AUDIT_PLAYWRIGHT names a playwright-core
  and Chrome is installed; skipped elsewhere.
*/
const playwrightPath = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
const available = !!playwrightPath && existsSync(playwrightPath);

// The app's theme tokens as the build compiles them: Tailwind colours are color-mix(in srgb, var(--x) <alpha>, transparent),
// which Chrome computes as color(srgb r g b / a).
const THEME = '--page:#f9f5f3;--foreground:#2a1d18;--background:#ffffff;--muted-foreground:#816d65;--warning:#d97706;';
const mix = (token: string, pct = 100) => `color-mix(in srgb, var(--${token}) ${pct}%, transparent)`;
const app = (body: string) =>
  `<!doctype html><html><head><style>:root{${THEME}}body{margin:0;font:14px sans-serif;background:${mix('page')};color:${mix('foreground')}}</style></head>` +
  `<body><div id="tj-frame-root">${body}</div></body></html>`;
const HEADER =
  `<header style="background:${mix('foreground')};color:${mix('background')};padding:12px 24px">` +
  `<p style="margin:0;font-weight:600">QA Expense Approvals</p>` +
  `<p id="subtitle" style="margin:0;font-size:12px;color:${mix('background', 70)}">Team spending and review</p>` +
  `<a href="#" style="color:${mix('background', 75)}">Approvals</a></header>`;
const REFUSAL_LINE = "This screen is restricted to certain groups. Ask the app's owner if you need access.";
const refusal = (wrapper = 'code-screen-no-access') =>
  `<div role="alert" data-cy="${wrapper}" style="max-width:420px;margin:72px auto;text-align:center">` +
  `<p style="margin:0;font-size:16px;font-weight:600">You don't have access to this screen</p>` +
  `<p style="margin:6px 0 0;color:#816d65">${REFUSAL_LINE}</p></div>`;

describe.skipIf(!available)('colour contrast in a Code mode frame', () => {
  let browser: any;
  let axeSource: string;
  beforeAll(async () => {
    const pw = createRequire(import.meta.url)(playwrightPath!);
    browser = await pw.chromium.launch({ headless: true, channel: process.env.MCP_RENDER_AUDIT_CHANNEL || 'chrome' });
    axeSource = (await import('axe-core')).default.source;
  }, 60_000);
  afterAll(async () => browser?.close());

  const check = async (frameHtml: string, route?: string) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await page.setContent('<!doctype html><html><body style="margin:0"><iframe data-tj-code-page-frame style="border:0;width:100vw;height:100vh;display:block"></iframe></body></html>');
      await page.evaluate((html: string) => {
        const doc = (document.querySelector('iframe') as HTMLIFrameElement).contentDocument!;
        doc.open(); doc.write(html); doc.close();
      }, frameHtml);
      await page.waitForTimeout(200);
      const frame = page.frames().find((f: any) => f !== page.mainFrame());
      await frame.evaluate(`${axeSource}\n;void 0`);
      const violations = (await frame.evaluate(axeRunInFrame)) as AxeViolation[];
      const findings = ((await page.evaluate(codePageAuditScript, route)) as RenderFinding[]) ?? [];
      const computed = (await frame.evaluate(() => {
        const el = document.getElementById('subtitle');
        return el ? getComputedStyle(el).color : null;
      })) as string | null;
      return { contrast: violations.find((v) => v.id === 'color-contrast'), findings, computed };
    } finally {
      await page.close();
    }
  };

  it('passes light text on the dark header, whose colours Chrome computes as color(srgb ...)', async () => {
    const { contrast, computed } = await check(app(HEADER + '<main><p>Recent requests</p></main>'));
    expect(computed).toMatch(/^color\(srgb 1 1 1 \/ 0\.7\)$/);
    expect(contrast).toBeUndefined();
  }, 30_000);

  it("leaves ToolJet's refusal of a screen out, and says the screen was not checked", async () => {
    const { contrast, findings } = await check(app(HEADER + `<main>${refusal()}</main>`), '/manager/approvals');
    expect(contrast).toBeUndefined();
    const refused = findings.find((f) => f.reason === 'screen_refused');
    expect(refused?.kind).toBe('unreachable');
    expect(refused?.detail).toMatch(/for \/manager\/approvals: .* so this screen was not checked/);
  }, 30_000);

  it('leaves out a refusal that replaces the whole app too', async () => {
    const page = `<div data-cy="code-screen-no-access-page" style="min-height:100%;background:#f9f5f3"><header data-cy="code-screen-no-access-header">QA Expense Approvals</header>${refusal()}</div>`;
    const { contrast, findings } = await check(app(page), '/');
    expect(contrast).toBeUndefined();
    expect(findings.some((f) => f.reason === 'screen_refused')).toBe(true);
  }, 30_000);

  it('names the element, its text and its colours when the same line is the app\'s own', async () => {
    const own = `<main><p>Requests</p><p id="note" style="color:#816d65">${REFUSAL_LINE}</p></main>`;
    const { contrast, findings } = await check(app(own));
    expect(findings.some((f) => f.reason === 'screen_refused')).toBe(false);
    expect(contrast?.impact).toBe('serious');
    expect(contrast?.elements).toEqual([
      { target: '#note', text: "This screen is restricted to certain groups. Ask the app'...", fg: '#816d65', bg: '#f9f5f3', ratio: 4.49, needs: '4.5:1' },
    ]);
  }, 30_000);

  it('names a status badge that really is hard to read (amber on pale amber, 2.71:1)', async () => {
    const badge = `<main><span id="pending" style="font-size:12px;color:${mix('warning')};background:${mix('warning', 15)}">Pending review</span></main>`;
    const { contrast } = await check(app(badge));
    expect(contrast?.elements?.[0]).toMatchObject({ target: '#pending', text: 'Pending review', fg: '#d97706', needs: '4.5:1' });
    expect(contrast?.elements?.[0]?.ratio).toBeLessThan(3);
  }, 30_000);
});
