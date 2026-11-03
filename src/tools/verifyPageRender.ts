import { z } from 'zod';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import axe from 'axe-core';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';
import { renderAuditBase, renderAuditOrigins, renderAuditUrlAllowed, renderAuditRequest, type RenderAuditQueries } from '../renderAuditPolicy.js';

/**
 * Render audit: open a page in a headless browser and report what static checks cannot see. Built from
 * the 2026-09-12 review of 224 generated pages, where 81 were broken and the largest classes (clipped text,
 * overlapping components, empty Html blocks, "undefined" in cells, placeholder items) were invisible to the
 * linter. Needs `playwright-core` and a Chrome; without them the tool says so instead of guessing.
 */

export interface RenderFinding {
  /** blocked_socket: a WebSocket to a third-party destination was closed; reported, but the render still counts. */
  kind: 'empty_render' | 'placeholder_text' | 'clipped' | 'overlap' | 'overflow' | 'unreachable' | 'blocked_socket';
  component: string;
  detail: string;
  reason?: 'browser_unavailable' | 'auth_required' | 'navigation_failed' | 'blocked_destination' | 'redirect_blocked' | 'blocked_execution' | 'no_widgets';
}

export interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: number;
  targets: string[];
}

export interface PageRenderReport {
  page: string;
  url: string;
  widgets: number;
  findings: RenderFinding[];
  /** Code pages: axe-core violations inside the page's frame (WCAG 2 A/AA rules). Reported, not counted as findings. */
  accessibility?: AxeViolation[];
  /** Code pages: a screenshot of the window at this width. */
  screenshot?: string;
}

/** Where code page screenshots go: MCP_RENDER_AUDIT_SCREENSHOTS, else a folder under the system temp directory. */
const screenshotDir = (): string => process.env.MCP_RENDER_AUDIT_SCREENSHOTS || join(tmpdir(), 'tooljet-render-audit');

/**
 * axe-core inside a code page's frame. The source is evaluated through the browser's debugging protocol, which the
 * frame's Content Security Policy (no eval, no inline scripts) does not apply to, so the page's own policy stays on.
 */
async function axeInCodePage(page: any): Promise<AxeViolation[] | undefined> {
  const handle = await page.$('iframe[data-tj-code-page-frame]');
  const frame = await handle?.contentFrame();
  if (!frame) return undefined;
  await frame.evaluate(`${(axe as any).source}\n;void 0`);
  return frame.evaluate(() =>
    (window as any).axe
      .run(document, { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
      .then((r: any) =>
        r.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact ?? null,
          help: v.help,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 3).map((n: any) => [].concat(n.target).join(' ')),
        }))
      )
  );
}

/** Runs inside the page: the same walk as the campaign's audit script, over ToolJet's widget containers. */
function auditScript(): { widgets: number; findings: RenderFinding[] } {
  const widgets = Array.from(document.querySelectorAll('[data-cy^="draggable-widget-"]')) as HTMLElement[];
  const boxes: Array<{ name: string; x: number; y: number; w: number; h: number; el: HTMLElement }> = [];
  const findings: RenderFinding[] = [];
  const seenNames = new Set<string>();
  // Raw formats a user notices at once: undefined/NaN/null, Invalid date, an ISO timestamp, a doubled percent sign.
  // Also: adjacent separators from empty values ("· · plan"), and money with five or more digits and no grouping ("$ 989700").
  const bad = /\bundefined\b|\bNaN\b|\bnull\b|Invalid date|\bTab [123]\b|Select\.\.|\\n|\[object Object\]|\{\{|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}|%%|·\s*·|[$€£]\s?\d{5,}(?![,.]\d)/;
  for (const el of widgets) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cy = el.getAttribute('data-cy') || '';
    const type = (el.className.toString().match(/_tooljet-([A-Za-z0-9]+)/) || [])[1] || '?';
    const name = `${type}:${cy.replace('draggable-widget-', '')}`;
    if (seenNames.has(cy)) continue; // a widget's inner container repeats its data-cy
    seenNames.add(cy);
    const text = (el.innerText || '').trim();
    boxes.push({ name, x: r.x, y: r.y, w: r.width, h: r.height, el });
    const textual = /^(Html|Text|Statistics|Table|Tabs|Listview|Kanban|KeyValuePair|Timeline|Steps):/.test(name);
    // An empty-state block ("No products match") is empty by design while data exists; its name says so.
    const emptyStateByName = /empty|placeholder|no_?data|nothing/i.test(cy);
    if (textual && text.length === 0 && r.height > 30 && !emptyStateByName) {
      findings.push({ kind: 'empty_render', component: name, detail: `${Math.round(r.width)}x${Math.round(r.height)}px box renders no text (a multi-line binding or a broken expression)` });
    }
    const m = text.match(bad);
    if (m) findings.push({ kind: 'placeholder_text', component: name, detail: `rendered text contains "${m[0]}"` });
    let clippedHere = false;
    for (const node of [el, ...(Array.from(el.querySelectorAll('*')) as HTMLElement[])]) {
      const cs = getComputedStyle(node);
      const hidden = cs.overflow === 'hidden' || cs.overflowY === 'hidden' || cs.overflowX === 'hidden';
      if (!hidden || (node.innerText || '').trim().length === 0) continue;
      if (node.scrollHeight > node.clientHeight + 6 && node.clientHeight > 12) {
        findings.push({ kind: 'clipped', component: name, detail: `"${(node.innerText || '').trim().slice(0, 40)}" needs ${node.scrollHeight}px but has ${node.clientHeight}px` });
        clippedHere = true;
        break;
      }
    }
    if (!clippedHere && !/^(Table|Listview|Kanban|Container|Form|Tabs):/.test(name)) {
      // Text drawn past the widget's bottom edge (scrolling widgets excluded: their rows scroll): an Html header authored shorter than its lines.
      const leaves = (Array.from(el.querySelectorAll('*')) as HTMLElement[]).filter((n) => n.children.length === 0 && (n.textContent || '').trim());
      const overflow = Math.max(0, ...leaves.map((n) => n.getBoundingClientRect().bottom)) - (r.top + r.height);
      if (overflow > 4) {
        findings.push({ kind: 'clipped', component: name, detail: `text runs ${Math.round(overflow)}px past the widget's bottom edge; the widget needs ${Math.round(r.height + overflow)}px` });
        clippedHere = true;
      }
    }
    if (/^Chart:/.test(name)) {
      const tick = el.querySelector('.xtick text, .ytick text, .legendtext') as SVGElement | null;
      const family = tick ? getComputedStyle(tick).fontFamily.toLowerCase() : '';
      if (family.includes('open sans') || family.includes('verdana')) {
        findings.push({ kind: 'placeholder_text', component: name, detail: 'chart uses Plotly default styling (Open Sans/Verdana labels); draw it with plotFromJson and the house layout' });
      }
      const traces = el.querySelectorAll('.trace, .bars path, .slice, .scatterlayer path, .heatmaplayer image').length;
      if (el.querySelector('.js-plotly-plot, .plot-container') && traces === 0) {
        findings.push({ kind: 'empty_render', component: name, detail: 'chart has axes but no data trace; the query feeding it returned the wrong shape (a chart needs {data:[...], layout:{...}})' });
      }
      const slices = Array.from(el.querySelectorAll('.slice path, .pie path')) as SVGElement[];
      const fills = new Set(slices.map((n) => (n.getAttribute('style') || '').match(/fill:\s*([^;]+)/)?.[1] ?? n.getAttribute('fill') ?? '').filter(Boolean));
      if (fills.has('rgb(31, 119, 180)') && fills.has('rgb(255, 127, 14)')) {
        findings.push({ kind: 'placeholder_text', component: name, detail: 'pie chart uses Plotly default rainbow colours; use the theme series palette' });
      }
      // Outside bar labels clipped to the plot area (cliponaxis true): the tallest bar's number is cut in half.
      const drag = el.querySelector('.nsewdrag');
      const dr = drag ? drag.getBoundingClientRect() : null;
      if (dr) {
        const cutLabels = (Array.from(el.querySelectorAll('.bartext')) as Element[]).filter((t) => {
          const tr = t.getBoundingClientRect();
          if (tr.top >= dr.top - 1 && tr.right <= dr.right + 1) return false;
          let n: Element | null = t.parentElement;
          while (n && n !== el) { if (n.getAttribute('clip-path')) return true; n = n.parentElement; }
          return false;
        });
        if (cutLabels.length) findings.push({ kind: 'clipped', component: name, detail: `${cutLabels.length} bar value label(s) are cut by the plot area (e.g. "${(cutLabels[0].textContent || '').trim()}"); set cliponaxis:false on the bar trace` });
      }
      // Duplicate categories in a bar trace stack on top of each other (a month listed twice reads as double
      // its value): the query should aggregate before charting.
      const plotEl = el.querySelector('.js-plotly-plot') as (Element & { data?: Array<{ type?: string; x?: unknown[] }> }) | null;
      for (const trace of plotEl?.data ?? []) {
        if ((trace.type ?? 'scatter') !== 'bar' || !Array.isArray(trace.x)) continue;
        const seen = new Set<string>(); const dup = trace.x.map(String).find((v) => (seen.has(v) ? true : (seen.add(v), false)));
        if (dup !== undefined) { findings.push({ kind: 'placeholder_text', component: name, detail: `category "${dup}" appears more than once in a bar trace, so its bars stack and read as one taller bar; aggregate the rows per category in the query` }); break; }
      }
      // A plot area much smaller than the chart box: styles.padding left at the default 50 or "default".
      if (dr && r.height > 120 && dr.height < r.height * 0.55) findings.push({ kind: 'clipped', component: name, detail: `plot area is ${Math.round(dr.height)}px of a ${Math.round(r.height)}px chart (styles.padding is the Plotly margin on every side; set it to 16)` });
      // Bar value labels left as raw numbers ("103745") next to a formatted KPI.
      const rawLabels = (Array.from(el.querySelectorAll('.bartext')) as Element[]).filter((t) => /^\d{5,}(\.\d+)?$/.test((t.textContent || '').trim()));
      if (rawLabels.length) findings.push({ kind: 'placeholder_text', component: name, detail: `bar value labels are unformatted numbers (e.g. "${(rawLabels[0].textContent || '').trim()}"); format them with toLocaleString and the unit` });
      // Long category names: Plotly rotates the x ticks and they run past the chart's bottom edge.
      const ticks = Array.from(el.querySelectorAll('.xaxislayer-above .xtick text, .xtick text')) as Element[];
      const runOff = ticks.filter((t) => t.getBoundingClientRect().bottom > r.bottom - 2);
      if (runOff.length) findings.push({ kind: 'clipped', component: name, detail: `${runOff.length} category label(s) run off the bottom of the chart (e.g. "${(runOff[0].textContent || '').trim().slice(0, 30)}"); shorten the categories or draw horizontal bars (orientation 'h')` });
    }
    if (!clippedHere && /^Table:/.test(name)) {
      const cut: string[] = [];
      for (const cell of Array.from(el.querySelectorAll('td, [role="cell"], .td')) as HTMLElement[]) {
        const text = (cell.innerText || '').trim();
        if (!text) continue;
        // A non-wrapping chip or value wider than its cell is cut at the cell edge with no ellipsis.
        const cellRect = cell.getBoundingClientRect();
        const spill = (Array.from(cell.querySelectorAll('*')) as HTMLElement[]).find((node) => {
          if (!(node.innerText || '').trim() || node.children.length > 0) return false;
          const nr = node.getBoundingClientRect();
          return nr.width > 0 && (nr.right > cellRect.right + 2 || nr.left < cellRect.left - 2);
        });
        if (spill) { cut.push(text.slice(0, 24)); if (cut.length >= 3) break; continue; }
        for (const node of [cell, ...(Array.from(cell.querySelectorAll('*')) as HTMLElement[])]) {
          const cs = getComputedStyle(node);
          if ((cs.overflow === 'hidden' || cs.overflowX === 'hidden') && cs.textOverflow !== 'ellipsis' && node.scrollWidth > node.clientWidth + 4 && node.clientWidth > 20) {
            cut.push(text.slice(0, 24));
            break;
          }
        }
        if (cut.length >= 3) break;
      }
      if (cut.length) findings.push({ kind: 'clipped', component: name, detail: `${cut.length}+ cells cut mid value (e.g. "${cut[0]}"); widen the column with columnSize or shorten the value` });
      // Headers ToolJet generated for itself: the raw field name, snake_case and lowercase.
      const rawHeaders = (Array.from(el.querySelectorAll('th, [role="columnheader"], .th')) as HTMLElement[])
        .map((h) => (h.innerText || '').trim())
        .filter((text) => /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text));
      if (rawHeaders.length) findings.push({ kind: 'placeholder_text', component: name, detail: `${rawHeaders.length} column header(s) are raw field names (e.g. "${rawHeaders[0]}"); author the columns with readable names instead of letting ToolJet generate them` });
      // Columns wider than the table: the scroll container is wider than its box, so the last columns sit past the right edge.
      const scroller = (Array.from(el.querySelectorAll('*')) as HTMLElement[]).find((node) => node.scrollWidth > node.clientWidth + 12 && node.clientWidth > 200 && /table/i.test(node.className.toString()));
      if (scroller) findings.push({ kind: 'clipped', component: name, detail: `columns overflow the table by ${scroller.scrollWidth - scroller.clientWidth}px to the right (the columnSize values exceed the table width); show fewer columns or shrink them` });
      // The last visible row sliced by the table body's edge: the table height does not fit whole rows.
      const body = el.querySelector('.table-responsive, .tbody, tbody, [class*="table-body"]') as HTMLElement | null;
      const rows = body ? (Array.from(body.querySelectorAll('tr, [role="row"], .tr')) as HTMLElement[]) : [];
      if (body && rows.length) {
        const bodyBottom = body.getBoundingClientRect().bottom;
        const sliced = rows.filter((row) => { const rr = row.getBoundingClientRect(); return rr.top < bodyBottom - 4 && rr.bottom > bodyBottom + 6 && (row.innerText || '').trim().length > 0; });
        if (sliced.length) findings.push({ kind: 'clipped', component: name, detail: `a row is sliced by the table's bottom edge; size the table to whole rows (header 40 + rows x row height + footer) or enable pagination` });
      }
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (/^(ModalV2|ShadDialog):/.test(a.name) || /^(ModalV2|ShadDialog):/.test(b.name)) continue;
      if (a.name.split(':')[1] === b.name.split(':')[1]) continue; // a widget's inner container repeats its name
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue; // a child inside its parent (a Kanban card, a modal body) is not an overlap
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 8 && iy > 8) findings.push({ kind: 'overlap', component: `${a.name} and ${b.name}`, detail: `${Math.round(ix)}x${Math.round(iy)}px shared; move one` });
    }
  }
  return { widgets: widgets.length, findings: findings.slice(0, 60) };
}

/**
 * `playwright-core` is optional: resolved from node_modules when installed, otherwise from the directory
 * named by MCP_RENDER_AUDIT_PLAYWRIGHT (a path to a playwright-core package). Bundles mark it external.
 */
/**
 * Runs inside the page: a code page draws its whole app in one same-origin iframe, which the widget walk cannot see
 * into. Checks the frame's own document: nothing scrolls sideways, nothing sits past the right edge, the app drew
 * something, and no placeholder text shows. Returns null when the page has no code page.
 */
export function codePageAuditScript(): RenderFinding[] | null {
  const frame = document.querySelector('iframe[data-tj-code-page-frame]') as HTMLIFrameElement | null;
  if (!frame) return null;
  const findings: RenderFinding[] = [];
  const doc = frame.contentDocument;
  const width = window.innerWidth;
  const host = document.scrollingElement;
  if (host && host.scrollWidth > host.clientWidth + 1)
    findings.push({ kind: 'overflow', component: 'Code mode app', detail: `the page scrolls sideways at ${width}px (${host.scrollWidth}px wide)` });
  if (!doc || !doc.body) {
    findings.push({ kind: 'empty_render', component: 'Code mode app', detail: 'the Code mode frame has no document' });
    return findings;
  }
  const root = doc.getElementById('tj-frame-root');
  const text = (root?.innerText ?? '').trim();
  if (!root || root.children.length === 0 || (!text && !root.querySelector('svg,canvas,img'))) {
    findings.push({ kind: 'empty_render', component: 'Code mode app', detail: 'the Code mode app rendered nothing' });
    return findings;
  }
  const scroller = doc.scrollingElement;
  if (scroller && scroller.scrollWidth > scroller.clientWidth + 1)
    findings.push({ kind: 'overflow', component: 'Code mode app', detail: `the app scrolls sideways at ${width}px (${scroller.scrollWidth}px of content in ${scroller.clientWidth}px)` });
  const frameRect = frame.getBoundingClientRect();
  if (frameRect.bottom > window.innerHeight + 1)
    findings.push({ kind: 'clipped', component: 'Code mode app', detail: `the app runs ${Math.round(frameRect.bottom - window.innerHeight)}px below the window` });
  const describe = (el: Element) => {
    const id = el.getAttribute('data-testid') || el.id;
    const label = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${id ? `#${id}` : ''}${label ? ` "${label}"` : ''}`;
  };
  // Elements that end past the frame's right edge and are not inside a container that scrolls on purpose.
  const cut: string[] = [];
  const frameWidth = doc.documentElement.clientWidth;
  for (const el of Array.from(doc.querySelectorAll('#tj-frame-root *'))) {
    if (cut.length >= 3) break;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.right <= frameWidth + 1) continue;
    let scrolls = false;
    for (let a = el.parentElement; a && a !== doc.body; a = a.parentElement) {
      const ox = doc.defaultView!.getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { scrolls = true; break; }
    }
    if (!scrolls) cut.push(describe(el));
  }
  if (cut.length) findings.push({ kind: 'clipped', component: 'Code mode app', detail: `cut off at the right edge at ${width}px: ${cut.join(', ')}` });
  const placeholder = text.match(/\b(undefined|NaN|Invalid date|\[object Object\])\b/);
  if (placeholder) findings.push({ kind: 'placeholder_text', component: 'Code mode app', detail: `the app shows "${placeholder[1]}"` });
  return findings;
}

async function loadPlaywright(): Promise<any | null> {
  const explicit = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
  if (explicit) {
    try {
      const { pathToFileURL } = await import('node:url');
      const { createRequire } = await import('node:module');
      const req = createRequire(pathToFileURL(explicit.replace(/\/?$/, '/')).href);
      return req(explicit);
    } catch {
      /* fall through to the normal resolution */
    }
  }
  try {
    const specifier = 'playwright-core'; // a variable so tsc does not require the optional package's types
    return await import(specifier);
  } catch {
    return null;
  }
}

/** Resource types the audit lets through from an allowed origin without refetching them. */
const STATIC_RESOURCES = new Set(['script', 'stylesheet', 'image', 'font']);

/** A WebSocket URL as the http(s) URL whose origin it shares, so the audit origins decide both. */
const socketHttpUrl = (url: string): string => url.replace(/^ws(s?):/i, 'http$1:');

/** Findings that report a blocked dependency without saying the page is wrong; they do not make `ok` false. */
const INFORMATIONAL_KINDS = new Set<RenderFinding['kind']>(['blocked_socket']);

/** A URL's path, without its query string (which can carry ids and tokens). */
const pathOf = (url: string): string => { try { return new URL(url).pathname; } catch { return '?'; } };

export async function auditPages(
  pages: Array<{ page: string; url: string }>,
  options: { channel?: string; executablePath?: string; settleMs?: number; chartWaitMs?: number; concurrency?: number; allowedOrigins?: Set<string>;
    /** The builder's ToolJet session (tj_auth_token), set as a cookie for the viewer origin so a private app opens. */
    session?: string; savedQueries?: RenderAuditQueries;
    /** Window width in px (default 1600); a code page is checked at 375, 768 and 1280. */
    viewportWidth?: number } = {},
  driver: () => Promise<any | null> = loadPlaywright
): Promise<PageRenderReport[]> {
  const unreachable = (p: { page: string; url: string }, reason: RenderFinding['reason'], detail: string): PageRenderReport =>
    ({ ...p, widgets: 0, findings: [{ kind: 'unreachable', component: '-', reason, detail }] });
  if (!pages.length) return [];
  // Callers are server code; the MCP handler supplies an operator-derived allowlist, never tool args.
  const origins = options.allowedOrigins ?? renderAuditOrigins(pages[0].url);
  if (pages.some((p) => !renderAuditUrlAllowed(p.url, origins))) {
    return pages.map((p) => unreachable(p, 'blocked_destination', 'The requested viewer is outside the configured render-audit origins'));
  }
  const pw = await driver();
  if (!pw) {
    return pages.map((p) => unreachable(p, 'browser_unavailable', 'playwright-core is not installed on the MCP host; the render audit cannot run'));
  }
  const launch: Record<string, unknown> = { headless: true };
  if (options.executablePath) launch.executablePath = options.executablePath;
  else launch.channel = options.channel ?? 'chrome';
  let browser: any;
  try { browser = await pw.chromium.launch(launch); }
  catch { return pages.map((p) => unreachable(p, 'browser_unavailable', 'Chrome could not start on the MCP host; check the configured executable/channel')); }
  // Pages are audited a few at a time in their own contexts: a 13-page app took over three minutes
  // sequentially (settle 6s + chart wait per page) and tripped the harness's 60s tool timeout.
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, pages.length || 1));
  const reports: PageRenderReport[] = new Array(pages.length);
  const auditOne = async (index: number): Promise<void> => {
    const p = pages[index];
    let ctx: any;
    let blocked: RenderFinding | undefined;
    // Every distinct block, for a page that ends up empty: the first one alone (a WebSocket) did not say why.
    const blocks: string[] = [];
    // One finding per distinct kind of block, for a page that did render: the always-blocked WebSocket came first and
    // hid a blocked query run behind it, so a page whose data never loaded read as verified (2026-10-12).
    const blockFindings: RenderFinding[] = [];
    const block = (finding: RenderFinding, where: string) => {
      blocked ??= finding;
      const line = `${finding.reason}: ${where}`;
      if (blocks.length < 4 && !blocks.includes(line)) blocks.push(line);
      if (blockFindings.length < 4 && !blockFindings.some((f) => f.reason === finding.reason && f.detail === finding.detail)) blockFindings.push(finding);
    };
    try {
      const width = options.viewportWidth ?? 1600;
      // A phone width gets a phone's height; wider windows keep 900.
      ctx = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, serviceWorkers: 'block' });
      if (!ctx.routeWebSocket) {
        reports[index] = unreachable(p, 'browser_unavailable', 'The render audit requires Playwright 1.48+ for WebSocket interception');
        return;
      }
      // Sockets are routed too: none may bypass the origin boundary.
      if (options.session) {
        // Only the viewer's own origin gets the session, and every request to any other origin is aborted below.
        await ctx.addCookies([{ name: 'tj_auth_token', value: options.session, url: new URL(p.url).origin }]);
      }
      await ctx.routeWebSocket('**/*', (socket: any) => {
        const url = String(socket.url?.() ?? '');
        // The ToolJet instance's own socket (the viewer's /ws) passes through: the merged viewer waits on it, and with
        // every socket blocked some Code mode pages never rendered and every result carried a finding (2026-11-02).
        if (renderAuditUrlAllowed(socketHttpUrl(url), origins)) {
          socket.connectToServer();
          return;
        }
        block({ kind: 'blocked_socket', component: '-', reason: 'blocked_destination', detail: 'A WebSocket to a destination outside the audit origins was blocked; its live behavior was not verified' }, `WebSocket ${(() => { try { return new URL(url).host; } catch { return '?'; } })()}`);
        socket.close();
      });
      await ctx.route('**/*', async (route: any) => {
        const request = route.request();
        const url = request.url();
        if (!renderAuditUrlAllowed(url, origins)) {
          block({ kind: 'unreachable', component: '-', reason: 'blocked_destination', detail: 'A navigation or resource outside the configured audit origins was blocked' }, `${request.method()} ${new URL(url).origin}`);
          await route.abort();
          return;
        }
        try {
          const policy = renderAuditRequest(url, request.method(), options.savedQueries);
          if (!policy.allowed) {
            block({ kind: 'unreachable', component: '-', reason: 'blocked_execution',
              detail: `${policy.detail!} (${request.method()} ${pathOf(url)})` }, `${request.method()} ${pathOf(url)}`);
            await route.abort();
            return;
          }
          // The viewer's own scripts, styles, images and fonts pass through: a dev frontend's unminified bundles
          // are tens of megabytes, and fetching then fulfilling them killed Chrome two seconds into every audit of
          // a local viewer (2026-10-12). They run no query and carry no session; documents and API calls are
          // still fetched below, so redirects and query runs stay checked.
          if (request.method() === 'GET' && STATIC_RESOURCES.has(request.resourceType?.())) {
            await route.continue();
            return;
          }
          // route.continue() may automatically follow redirects before another interception. Fetch
          // with redirects disabled, and never fulfill a redirect response: use canonical URLs.
          const response = await route.fetch({ maxRedirects: 0, maxRetries: 0, timeout: 30_000,
            ...(policy.postData === undefined ? {} : { postData: policy.postData }) });
          try {
            if (response.status() >= 300 && response.status() < 400 && response.headers().location) {
              const dest = new URL(response.headers().location, url);
              const signIn = renderAuditUrlAllowed(dest.href, origins) && /\/(?:login|sign-in|signin)\b/i.test(dest.pathname);
              block({ kind: 'unreachable', component: '-', reason: signIn ? 'auth_required' : 'redirect_blocked',
                detail: signIn ? 'The viewer requires sign-in; private app rendering was not verified' : 'An HTTP redirect was blocked. Configure the canonical viewer/resource URL and its trusted origin' }, `${request.method()} ${pathOf(url)} redirected`);
              await route.abort();
            } else await route.fulfill({ response });
          } finally { await response.dispose(); }
        } catch {
          block({ kind: 'unreachable', component: '-', reason: 'navigation_failed', detail: 'A viewer resource could not be loaded; the audit is incomplete' }, `${request.method()} ${pathOf(url)}`);
          await route.abort().catch(() => {});
        }
      });
      const page = await ctx.newPage();
      const response = await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      if (response && response.status() >= 400) {
        const status = response.status();
        reports[index] = unreachable(p, [401, 403].includes(status) ? 'auth_required' : 'navigation_failed', 'Viewer returned HTTP ' + status);
        return;
      }
      await page.waitForTimeout(options.settleMs ?? 6000);
      // Charts mount after their queries resolve; judging them before Plotly has drawn reports a
      // healthy chart as empty, and judging before it has mounted misses an empty one entirely.
      await page
        .waitForFunction(
          () => {
            const charts = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart').length;
            const plots = document.querySelectorAll('[data-cy^="draggable-widget-"]._tooljet-Chart .js-plotly-plot').length;
            return charts === 0 || plots >= charts;
          },
          undefined,
          { timeout: options.chartWaitMs ?? 20000 }
        )
        .catch(() => undefined);
      await page.waitForTimeout(1500);
      const landed: string = page.url();
      if (/\/(?:login|sign-in|signin)\b/i.test(new URL(landed).pathname)) {
        reports[index] = unreachable(p, 'auth_required', 'The viewer requires sign-in; private app rendering was not verified');
        return;
      }
      const result = (await page.evaluate(auditScript)) as { widgets: number; findings: RenderFinding[] };
      const codePage = (await page.evaluate(codePageAuditScript)) as RenderFinding[] | null;
      if (Array.isArray(codePage)) {
        // The root widget is the code page's container; its own findings come from inside the frame.
        const accessibility = await axeInCodePage(page).catch(() => undefined);
        let screenshot: string | undefined;
        try {
          const dir = screenshotDir();
          mkdirSync(dir, { recursive: true });
          const route = new URL(p.url).searchParams.get('route') || '/';
          const app = /\/applications\/([^/?]+)/.exec(new URL(p.url).pathname)?.[1]?.slice(0, 8) ?? 'app';
          const slug = `${app}-${p.page}${route.replace(/[^A-Za-z0-9]+/g, '-')}`.replace(/-+$/, '');
          screenshot = join(dir, `${slug}-${options.viewportWidth ?? 1600}.png`);
          await page.screenshot({ path: screenshot, fullPage: false });
        } catch {
          screenshot = undefined;
        }
        reports[index] = {
          page: p.page,
          url: p.url,
          widgets: result.widgets,
          findings: [...codePage, ...blockFindings],
          ...(accessibility ? { accessibility } : {}),
          ...(screenshot ? { screenshot } : {}),
        };
        return;
      }
      // A page left empty after a blocked request names that request: a bare no_widgets hid why every page of
      // every build read empty (compiler round 3, 2026-10-04).
      reports[index] = result.widgets === 0 && blocked
        ? { page: p.page, url: p.url, widgets: 0, findings: [{ ...blocked, kind: 'unreachable', detail: `${blocked.detail}; the page then showed no widgets. Blocked: ${blocks.join('; ')}` }] }
        : result.widgets === 0
        ? unreachable(p, 'no_widgets', 'No ToolJet widgets were found; the page may be empty, unauthenticated, or not loaded')
        : { page: p.page, url: p.url, widgets: result.widgets, findings: [...result.findings, ...blockFindings] };
    } catch (err) {
      // What failed, first line only: "could not load" alone left an audit that never ran undiagnosable.
      const why = String((err as Error)?.message ?? err).split('\n')[0]!.slice(0, 200);
      reports[index] = blocked ? { ...p, widgets: 0, findings: [{ ...blocked, kind: 'unreachable', detail: `${blocked.detail}; the audit then stopped: ${why}. Blocked: ${blocks.join('; ')}` }] }
        : unreachable(p, 'navigation_failed', `Could not load or inspect the viewer page: ${why}`);
    } finally {
      await ctx?.close().catch(() => {});
    }
  };
  try {
    let next = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (next < pages.length) {
        const index = next++;
        await auditOne(index);
      }
    });
    await Promise.all(workers);
  } finally {
    await browser.close();
  }
  return reports;
}

export function verifyPageRenderTool(client: ToolJetClient, viewerBase: () => string, driver: () => Promise<any | null> = loadPlaywright): ToolDef {
  return {
    name: 'verify_page_render',
    title: 'Verify Page Render',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'Render audit of one page or every page of an app in a headless browser (1600x900 unless viewport_width is set), after the app is built. ' +
      'On an app in Code mode it checks inside the app: sideways scrolling, content cut off at the right edge, an empty app and placeholder ' +
      'text; pass route to open one route of it and viewport_width (375, 768, 1280) to check each width. An app in Code mode also gets ' +
      'an axe-core accessibility run (WCAG 2 A/AA; `accessibility` lists violations by impact) and a screenshot path. ' +
      'Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken ' +
      'expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", ' +
      '"Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. ' +
      'Run it once per page before the handoff and review every finding; report unverified behavior explicitly. ' +
      'Opens the version being edited with the builder\'s own ToolJet session (limited to the viewer origin), so a private app is ' +
      'audited without being made public. Only saved, static, bounded read queries may run; writes, dynamic queries ' +
      'and queries requiring confirmation are blocked and reported as unverified. WebSockets to the ToolJet origin pass; any other ' +
      'WebSocket is closed and reported as a `blocked_socket` finding, which does not make `ok` false. ' +
      'Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.',
    inputSchema: {
      app_id: z.string().regex(/^[A-Za-z0-9_-]+$/),
      page_handle: z.string().optional().describe('one page handle; omit to audit every page'),
      viewer_url: z.string().optional().describe('canonical viewer base URL; alternate origins require host configuration in MCP_RENDER_AUDIT_ALLOWED_ORIGINS'),
      viewport_width: z.number().int().min(320).max(2560).optional().describe('window width in px; default 1600'),
      route: z.string().regex(/^\/[A-Za-z0-9_\-\/:.]*$/).optional().describe('a Code mode route path to open, such as /orders/36'),
    },
    async handler(args: { app_id: string; page_handle?: string; viewer_url?: string; viewport_width?: number; route?: string }) {
      try {
        if (!/^[A-Za-z0-9_-]+$/.test(args.app_id)) return fail(new Error('Invalid app id'));
        const { base, origins } = renderAuditBase(viewerBase(), args.viewer_url);
        const summary = await client.getAppSummary(args.app_id);
        const pages = (summary.pages ?? []) as Array<{ handle?: string; name?: string }>;
        // The version being edited (preview), not the released one: a build audits what it just changed.
        const version = await client.editingVersionName?.(args.app_id).catch(() => undefined);
        const query = new URLSearchParams();
        if (version) { query.set('env', 'development'); query.set('version', version); }
        if (args.route) query.set('route', args.route);
        const preview = query.toString() ? `?${query}` : '';
        const targets = pages
          .filter((p) => !args.page_handle || p.handle === args.page_handle)
          .map((p) => ({ page: p.handle ?? p.name ?? 'home', url: `${base}/applications/${args.app_id}/${encodeURIComponent(p.handle ?? 'home')}${preview}` }));
        if (!targets.length) return fail(new Error(`no page ${args.page_handle ?? ''} in app ${args.app_id}`));
        const options = {
          channel: process.env.MCP_RENDER_AUDIT_CHANNEL || 'chrome',
          executablePath: process.env.MCP_RENDER_AUDIT_CHROME || undefined,
          allowedOrigins: origins,
          savedQueries: summary,
          viewportWidth: args.viewport_width,
          // MCP_RENDER_AUDIT_SESSION=off keeps the browser unauthenticated (private apps are then reported unverified).
          session: process.env.MCP_RENDER_AUDIT_SESSION === 'off' ? undefined : await client.viewerSession?.(args.app_id).catch(() => undefined),
        };
        const reports = await auditPages(targets, options, driver);
        // A private app redirects the headless browser to sign-in, and this audit will NOT publish it
        // to get around that. Making someone's app world-readable is not a diagnostic step: the window
        // is not ours to choose, the restore is a best-effort call that can fail, and a failure leaves
        // the app public with nothing to notice it. An unreachable page is reported as unreachable and
        // the operator gives the audit a viewer session instead.
        const total = reports.reduce((n, r) => n + r.findings.filter((f) => !INFORMATIONAL_KINDS.has(f.kind)).length, 0);
        const axeCount = reports.reduce((n, r) => n + (r.accessibility?.length ?? 0), 0);
        return ok({ pages: reports, ok: total === 0, findings: total, ...(reports.some((r) => r.accessibility) ? { accessibility_violations: axeCount } : {}) });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
