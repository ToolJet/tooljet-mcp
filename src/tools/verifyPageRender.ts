import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

/**
 * Render audit: open a page in a headless browser and report what static checks cannot see. Built from
 * the 2026-09-12 review of 224 generated pages, where 81 were broken and the largest classes (clipped text,
 * overlapping components, empty Html blocks, "undefined" in cells, placeholder items) were invisible to the
 * linter. Needs `playwright-core` and a Chrome; without them the tool says so instead of guessing.
 */

export interface RenderFinding {
  kind: 'empty_render' | 'placeholder_text' | 'clipped' | 'overlap' | 'unreachable';
  component: string;
  detail: string;
}

export interface PageRenderReport {
  page: string;
  url: string;
  widgets: number;
  findings: RenderFinding[];
}

/** Runs inside the page: the same walk as the campaign's audit script, over ToolJet's widget containers. */
function auditScript(): { widgets: number; findings: RenderFinding[] } {
  const widgets = Array.from(document.querySelectorAll('[data-cy^="draggable-widget-"]')) as HTMLElement[];
  const boxes: Array<{ name: string; x: number; y: number; w: number; h: number }> = [];
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
    boxes.push({ name, x: r.x, y: r.y, w: r.width, h: r.height });
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
      // A plot area much smaller than the chart box: styles.padding left at the default 50 or "default".
      if (dr && r.height > 120 && dr.height < r.height * 0.55) findings.push({ kind: 'clipped', component: name, detail: `plot area is ${Math.round(dr.height)}px of a ${Math.round(r.height)}px chart (styles.padding is the Plotly margin on every side; set it to 16)` });
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
      if (a.name.startsWith('ModalV2:') || b.name.startsWith('ModalV2:')) continue;
      if (a.name.split(':')[1] === b.name.split(':')[1]) continue; // a widget's inner container repeats its name
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

export async function auditPages(
  pages: Array<{ page: string; url: string }>,
  options: { channel?: string; executablePath?: string; settleMs?: number; chartWaitMs?: number } = {}
): Promise<PageRenderReport[]> {
  const pw = await loadPlaywright();
  if (!pw) {
    return pages.map((p) => ({ page: p.page, url: p.url, widgets: 0, findings: [{ kind: 'unreachable', component: '-', detail: 'playwright-core is not installed on the MCP host; the render audit cannot run' }] }));
  }
  const launch: Record<string, unknown> = { headless: true };
  if (options.executablePath) launch.executablePath = options.executablePath;
  else launch.channel = options.channel ?? 'chrome';
  const browser = await pw.chromium.launch(launch);
  const reports: PageRenderReport[] = [];
  try {
    for (const p of pages) {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
      const page = await ctx.newPage();
      try {
        await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
        if (/\/login\b/.test(landed)) {
          reports.push({ page: p.page, url: p.url, widgets: 0, findings: [{ kind: 'unreachable', component: '-', detail: 'the viewer redirected to sign-in; the page is not public and no viewer session was provided' }] });
          continue;
        }
        const result = (await page.evaluate(auditScript)) as { widgets: number; findings: RenderFinding[] };
        reports.push({ page: p.page, url: p.url, widgets: result.widgets, findings: result.findings });
      } catch (err) {
        reports.push({ page: p.page, url: p.url, widgets: 0, findings: [{ kind: 'unreachable', component: '-', detail: `could not load the page: ${(err as Error).message}` }] });
      } finally {
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  return reports;
}

export function verifyPageRenderTool(client: ToolJetClient, viewerBase: () => string): ToolDef {
  return {
    name: 'verify_page_render',
    title: 'Verify Page Render',
    annotations: { readOnlyHint: true, openWorldHint: true },
    description:
      'Render audit of one page or every page of an app in a headless browser at 1600x900, after the app is built. ' +
      'Reports what lint cannot see: Html/Text widgets that render empty (a multi-line binding, a broken ' +
      'expression), placeholder text a customer would read as a bug ("undefined", "NaN", "Invalid date", ' +
      '"Tab 1", "Select..", a literal \\n), text clipped inside its box, and components overlapping each other. ' +
      'Run it once per page before the handoff and fix every finding; a page with findings is not finished. ' +
      'The page must be reachable by the browser: a public app, or a viewer session configured on the MCP host. ' +
      'Returns { pages: [{ page, url, widgets, findings: [{ kind, component, detail }] }], ok }.',
    inputSchema: {
      app_id: z.string(),
      page_handle: z.string().optional().describe('one page handle; omit to audit every page'),
      viewer_url: z.string().optional().describe('override the viewer origin (e.g. a tunnel) when the MCP host cannot reach the configured one'),
    },
    async handler(args: { app_id: string; page_handle?: string; viewer_url?: string }) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const pages = (summary.pages ?? []) as Array<{ handle?: string; name?: string }>;
        const base = (args.viewer_url ?? viewerBase()).replace(/\/$/, '');
        const targets = pages
          .filter((p) => !args.page_handle || p.handle === args.page_handle)
          .map((p) => ({ page: p.handle ?? p.name ?? 'home', url: `${base}/applications/${args.app_id}/${encodeURIComponent(p.handle ?? 'home')}` }));
        if (!targets.length) return fail(new Error(`no page ${args.page_handle ?? ''} in app ${args.app_id}`));
        const options = {
          channel: process.env.MCP_RENDER_AUDIT_CHANNEL || 'chrome',
          executablePath: process.env.MCP_RENDER_AUDIT_CHROME || undefined,
        };
        let reports = await auditPages(targets, options);
        // A private app redirects the headless browser to sign-in. When the deployment allows it
        // (MCP_RENDER_AUDIT_MAKE_PUBLIC=1: local and CI builders, never a shared workspace), open the
        // viewer for the audit and close it again afterwards.
        const unreachable = reports.every((r) => r.findings.some((f) => f.kind === 'unreachable' && /sign-in/.test(f.detail)));
        if (unreachable && /^(1|true|yes)$/i.test(process.env.MCP_RENDER_AUDIT_MAKE_PUBLIC ?? '')) {
          await client.setAppPublic(args.app_id, true);
          try {
            reports = await auditPages(targets, options);
          } finally {
            await client.setAppPublic(args.app_id, false).catch(() => undefined);
          }
        }
        const total = reports.reduce((n, r) => n + r.findings.length, 0);
        return ok({ pages: reports, ok: total === 0, findings: total });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
