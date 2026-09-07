/**
 * Render-readiness lints: shapes that lint clean, apply clean, and then render as an empty or broken
 * page. Each one was shipped by a Gemini or Luna build on the four-page benchmark:
 *  - a Table bound to a query that nothing ever runs (No data on every page);
 *  - a Table whose `columns` value is a JSON string, not an array (the Table component crashes);
 *  - a Text holding markdown while its format is the default html (headings render as "## Title");
 *  - component widths authored in pixels on the 43-column grid (a 1160-wide sliver of layout);
 *  - an Html block whose inline CSS needs more height than it was given (the widget never grows, so
 *    the bottom of every header band and KPI card is cut off behind a hidden scrollbar).
 * The skill documents the right shape for every one of these; the linter is where it has to be enforced.
 */
import type { AppSummary } from './tooljetClient.js';
import { estimateHtmlHeight, parseHtml, stripHtmlBindings } from './htmlHeight.js';

export interface ReadinessComponent {
  id?: string;
  name?: string;
  type?: string;
  parent?: string;
  parentRef?: string;
  properties?: Record<string, unknown>;
  layout?: { left?: number; width?: number; top?: number; height?: number };
  layouts?: { desktop?: { left?: number; width?: number; top?: number; height?: number } };
}

export const GRID_COLUMNS = 43;

function propVal(props: Record<string, unknown> | undefined, key: string): unknown {
  const p = props?.[key] as { value?: unknown } | undefined;
  return p && typeof p === 'object' && 'value' in p ? p.value : p;
}

function truthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'string') return false;
  const s = v.trim().replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '').toLowerCase();
  return s === 'true';
}

function label(c: ReadinessComponent): string {
  return c.name ?? c.id ?? '?';
}

/** `columns` must be an array of column objects. A JSON string that happens to parse is still wrong:
 *  ToolJet stores it as a string and the Table component throws while reading `columns.length`. */
export function lintTableColumnsShape(c: ReadinessComponent): string[] {
  if (c.type !== 'Table') return [];
  const columns = propVal(c.properties, 'columns');
  if (columns === undefined || columns === null || Array.isArray(columns)) return [];
  if (typeof columns === 'string') {
    let parsesToArray = false;
    try {
      parsesToArray = Array.isArray(JSON.parse(columns));
    } catch {
      parsesToArray = false;
    }
    return [
      `Table "${label(c)}": properties.columns.value is a JSON string${parsesToArray ? ' that happens to parse as an array' : ''}. ` +
        'ToolJet stores it as text and the Table crashes on render ("Something went wrong"). Pass the column ' +
        'objects as a real array value: columns: { value: [ { key, name, columnType, ... } ] }.',
    ];
  }
  return [
    `Table "${label(c)}": properties.columns.value must be an array of column objects, not ${typeof columns}.`,
  ];
}

const MARKDOWN_SIGNS = /(^|\n)\s*#{1,6}\s+\S|\*\*[^*\n]+\*\*|(^|\n)\s*[-*]\s+\S|\[[^\]\n]+\]\([^)\n]+\)|(^|\n)\s*\d+\.\s+\S/;

/** Text renders `html` by default. Markdown syntax in a non-markdown Text shows up literally. */
export function lintTextFormat(c: ReadinessComponent): string[] {
  if (c.type !== 'Text') return [];
  const text = propVal(c.properties, 'text');
  if (typeof text !== 'string') return [];
  const format = propVal(c.properties, 'textFormat');
  const effective = typeof format === 'string' && format ? format : 'html';
  if (effective === 'markdown') return [];
  // Ignore what sits inside bindings: {{ a ** b }} is arithmetic, not emphasis.
  const literal = text.replace(/\{\{[\s\S]*?\}\}/g, ' ');
  if (!MARKDOWN_SIGNS.test(literal)) return [];
  return [
    `Text "${label(c)}": the text uses markdown (a "#" heading, **bold**, a list or a link) but textFormat is ` +
      `"${effective}", so it renders literally. Set properties.textFormat.value = "markdown", or write the ` +
      'heading as HTML / plain text.',
  ];
}

const WIDTH_EXEMPT = new Set(['Modal', 'ModalV2', 'Drawer']);

/** Widths and lefts are columns on a 43-column grid. A value past the grid is pixels by mistake. */
export function lintOversizedWidths(components: ReadinessComponent[]): string[] {
  const errors: string[] = [];
  for (const c of components) {
    if (!c.type || WIDTH_EXEMPT.has(c.type)) continue;
    const rect = c.layouts?.desktop ?? c.layout;
    if (!rect) continue;
    const width = typeof rect.width === 'number' ? rect.width : undefined;
    const left = typeof rect.left === 'number' ? rect.left : 0;
    if (width === undefined) continue;
    if (width > GRID_COLUMNS || left + width > GRID_COLUMNS) {
      errors.push(
        `${c.type} "${label(c)}": desktop left ${left} + width ${width} exceeds ToolJet's ${GRID_COLUMNS}-column grid. ` +
          'Widths and lefts are grid columns, not pixels: a full-width row is left 2, width 39; a half is width 19; ' +
          'a quarter is width 9.'
      );
    }
  }
  return errors;
}

interface QueryTriggers {
  automatic: boolean;
  manual: string[];
}

function eventPayload(event: unknown): Record<string, unknown> | undefined {
  return event && typeof event === 'object' ? (event as Record<string, unknown>) : undefined;
}

/** Which queries run on their own (page load, dependency change, or a success chain from one that
 *  does) and which only run from a user event. */
function queryTriggers(summary: AppSummary): Map<string, QueryTriggers> {
  const byId = new Map(summary.queries.map((q) => [q.id, q]));
  const byName = new Map(summary.queries.flatMap((q) => (q.name ? [[q.name, q] as const] : [])));
  const resolve = (ref: unknown) =>
    typeof ref === 'string' ? (byId.get(ref) ?? byName.get(ref)) : undefined;
  const triggers = new Map<string, QueryTriggers>();
  for (const q of summary.queries) {
    const options = (q.options && typeof q.options === 'object' ? q.options : {}) as Record<string, unknown>;
    const automatic = truthy(propVal(options, 'runOnPageLoad')) || truthy(propVal(options, 'runOnDependencyChange'));
    triggers.set(q.id, { automatic, manual: [] });
  }
  const chains: Array<[string, string]> = [];
  for (const e of summary.events) {
    const payload = eventPayload(e.event);
    if (!payload || payload.actionId !== 'run-query') continue;
    const target = resolve(payload.queryId ?? payload.queryName);
    if (!target) continue;
    const entry = triggers.get(target.id);
    if (!entry) continue;
    const trigger = String(payload.eventId ?? '');
    if (e.target === 'page' && trigger === 'onPageLoad') {
      entry.automatic = true;
    } else if (e.target === 'data_query' && trigger === 'onDataQuerySuccess' && e.sourceId) {
      chains.push([e.sourceId, target.id]);
    } else {
      entry.manual.push(`${e.target ?? 'component'} ${trigger || 'event'}`);
    }
  }
  // A query chained from an automatic one is automatic too; iterate to a fixpoint.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [sourceId, targetId] of chains) {
      const source = triggers.get(sourceId);
      const target = triggers.get(targetId);
      if (source?.automatic && target && !target.automatic) {
        target.automatic = true;
        changed = true;
      }
    }
  }
  return triggers;
}

const DATA_BOUND = new Set(['Table', 'ListView', 'Chart', 'Kanban']);

/** A data-bound component whose query nothing runs stays empty forever. Table gets an error (it is the
 *  one users notice first); other data-bound components get a warning. A query with only manual triggers
 *  is a warning: the component fills after that click, which may be intended. */
export function lintUntriggeredDataQueries(summary: AppSummary): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!summary.queries.length) return { errors, warnings };
  const triggers = queryTriggers(summary);
  const byName = new Map(summary.queries.flatMap((q) => (q.name ? [[q.name, q] as const] : [])));
  for (const page of summary.pages) {
    for (const c of page.components) {
      if (!c.type || !DATA_BOUND.has(c.type)) continue;
      const data = propVal(c.properties as Record<string, unknown> | undefined, 'data');
      if (typeof data !== 'string') continue;
      const names = [...new Set([...data.matchAll(/\bqueries\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]!))];
      for (const name of names) {
        const query = byName.get(name);
        if (!query) continue; // unknown query names are reported by the reference lint
        const t = triggers.get(query.id);
        if (!t || t.automatic) continue;
        const who = `${c.type} "${c.name ?? c.id}"`;
        if (t.manual.length) {
          warnings.push(
            `${who} binds queries.${name}.data, but "${name}" only runs from ${[...new Set(t.manual)].join(', ')}, ` +
              'so the component is empty until then. If it should show data on open, set the query\'s ' +
              'runOnPageLoad: true or run it from the page\'s onPageLoad event.'
          );
          continue;
        }
        const message =
          `${who} binds queries.${name}.data, but nothing runs "${name}": it has no runOnPageLoad, no page ` +
          'onPageLoad event, no success chain from a query that does, and no user event. It will show No data ' +
          "forever. Set the query's runOnPageLoad: true (or add a page onPageLoad run-query event).";
        if (c.type === 'Table') errors.push(message);
        else warnings.push(message);
      }
    }
  }
  return { errors, warnings };
}

/** Canvas columns to pixels at a typical 1300px canvas (39 columns of content span about 1250px). */
export const HTML_PX_PER_COLUMN = 32;
/** The Html widget's box renders about 4px shorter than the authored height (measured 2026-09-05). */
export const HTML_WIDGET_HEIGHT_LOSS = 4;
/** The estimator is within a few px on real blocks; only flag a clear miss so a borderline fit never costs a turn. */
export const HTML_HEIGHT_TOLERANCE = 8;

/** An Html block never grows. When the height its own CSS needs exceeds the authored height, the
 *  bottom (or, for a vertically centred flex header, both edges) is clipped behind a hidden scrollbar.
 *  Seven of fourteen Html blocks in one Luna build did this on 2026-09-05, by 5 to 42px each. */
/** The height an Html block needs for its markup, when it is short: {from, to, needed}. Shared by the
 *  lint (which reports it) and the plan preflight (which now applies it). */
export function suggestedHtmlHeight(c: ReadinessComponent): { from: number; to: number; needed: number } | null {
  if (c.type !== 'Html') return null;
  if (truthy(propVal(c.properties, 'dynamicHeight'))) return null;
  const raw = propVal(c.properties, 'rawHtml');
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const rect = c.layouts?.desktop ?? c.layout;
  const height = typeof rect?.height === 'number' ? rect.height : undefined;
  const width = typeof rect?.width === 'number' ? rect.width : 39;
  if (height === undefined) return null;
  const estimate = estimateHtmlHeight(raw, width * HTML_PX_PER_COLUMN);
  if (!estimate) return null;
  const overflow = estimate.height - (height - HTML_WIDGET_HEIGHT_LOSS);
  if (overflow <= HTML_HEIGHT_TOLERANCE) return null;
  return { from: height, to: Math.ceil((estimate.height + HTML_WIDGET_HEIGHT_LOSS + 8) / 10) * 10, needed: estimate.height };
}

/** A selection panel reads `components.table.selectedRow.field`; before any row is selected that is
 *  `undefined`, and ToolJet prints the word. Observed on three of twelve Nordlicht apps and on the Luna max
 *  Lufthansa build ("undefined · undefined · undefined" under "Select a flight"). Each read needs a fallback. */
const SELECTION_READ = /components(?:\.[A-Za-z_$][\w$]*|\[\s*['"][^'"]+['"]\s*\])\??\.(?:selectedRow|selectedRows\s*\[\s*0\s*\])\??\.[A-Za-z_$][\w$]*/;
export function lintUnguardedSelectionText(c: ReadinessComponent): string[] {
  if (c.type !== 'Html' && c.type !== 'Text') return [];
  const key = c.type === 'Html' ? 'rawHtml' : 'text';
  const value = propVal(c.properties, key);
  if (typeof value !== 'string' || !value.includes('selectedRow')) return [];
  const bad: string[] = [];
  for (const m of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    const expr = m[1]!;
    const read = expr.match(SELECTION_READ);
    if (!read) continue;
    const hasFallback = /\?\?|\|\||\?[^.?][\s\S]*:/.test(expr);
    if (!hasFallback) bad.push(read[0]);
  }
  if (!bad.length) return [];
  return [
    `${c.type} "${label(c)}": ${key} reads ${[...new Set(bad)].join(', ')} without a fallback. Until a row is selected that ` +
      "value is undefined and the page prints the word. Write (components.table?.selectedRow?.field ?? 'Select a row') " +
      'or wrap the panel in a ternary on components.table?.selectedRow.',
  ];
}

export function lintHtmlContentHeight(c: ReadinessComponent): string[] {
  if (c.type !== 'Html') return [];
  if (truthy(propVal(c.properties, 'dynamicHeight'))) return [];
  const raw = propVal(c.properties, 'rawHtml');
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const rect = c.layouts?.desktop ?? c.layout;
  const height = typeof rect?.height === 'number' ? rect.height : undefined;
  const width = typeof rect?.width === 'number' ? rect.width : 39;
  if (height === undefined) return [];
  const estimate = estimateHtmlHeight(raw, width * HTML_PX_PER_COLUMN);
  if (!estimate) return [];
  const usable = height - HTML_WIDGET_HEIGHT_LOSS;
  const overflow = estimate.height - usable;
  if (overflow <= HTML_HEIGHT_TOLERANCE) return [];
  const suggested = Math.ceil((estimate.height + HTML_WIDGET_HEIGHT_LOSS + 8) / 10) * 10;
  return [
    `Html "${label(c)}": its markup needs about ${estimate.height}px${estimate.lowerBound ? ' at least (a .map() repeats rows)' : ''} ` +
      `(paddings, margins, font sizes × 1.5 line height and wrapped lines, summed from its inline CSS) but desktop ` +
      `height is ${height}px and the widget renders ${HTML_WIDGET_HEIGHT_LOSS}px shorter than authored. The bottom ` +
      `${overflow}px is cut off behind a hidden scrollbar. Set height to ${suggested}px, or trim the padding and font sizes ` +
      'to fit the height you have. An Html block never grows to its content.',
  ];
}

const SURFACE_TOKENS = /var\(--cc-(appBackground|surface1|surface2)-surface\)/;

/** ToolJet's Html widget paints its whole box white (`#ffffff`, `#47505D` in dark mode) underneath the
 *  markup. On a tinted canvas anything the root element does not cover shows as a white edge: the
 *  leftover height under a root without `height:100%`, the corners outside a rounded root, a root
 *  with no background of its own. Every build measured on 2026-09-05 (Sol, Luna, Terra at every
 *  effort) put the card's tint and radius on the root, so the fix has to be enforced here: the root
 *  is a plain full-bleed box painted with the surface it sits on; the card is a child. */
export function lintHtmlRootSurface(c: ReadinessComponent): string[] {
  if (c.type !== 'Html') return [];
  const raw = propVal(c.properties, 'rawHtml');
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const { html } = stripHtmlBindings(raw);
  const tree = parseHtml(html);
  const roots = tree.children.filter((n) => n.tag !== '#text' || n.text.trim());
  const who = `Html "${label(c)}"`;
  const parented = Boolean(c.parent || c.parentRef);
  const surface = parented ? 'var(--cc-surface1-surface)' : 'var(--cc-appBackground-surface)';
  const template =
    `<div style="height:100%;box-sizing:border-box;margin:0;background:${surface}"> ...your markup... </div>`;
  const why =
    "ToolJet's Html widget paints its box white underneath the markup, so on a tinted canvas anything the root " +
    'does not cover shows as a white edge.';
  if (roots.length !== 1 || roots[0]!.tag === '#text') {
    return [
      `${who}: rawHtml has ${roots.length} top-level nodes. ${why} Wrap everything in one root element: ${template}`,
    ];
  }
  const root = roots[0]!;
  const style = root.style;
  const problems: string[] = [];
  const dynamic = truthy(propVal(c.properties, 'dynamicHeight'));
  const heightValue = (style.height ?? style['min-height'] ?? '').trim();
  if (!dynamic && heightValue !== '100%') {
    problems.push(
      heightValue
        ? `its height is "${heightValue}" instead of 100%, so the rest of the box stays white`
        : 'it has no height:100%, so the box below the content stays white'
    );
  }
  const background = (style.background ?? style['background-color'] ?? '').trim();
  if (!background || /^(transparent|none|inherit|initial|unset)$/i.test(background)) {
    problems.push(
      `it paints no background of its own, so the widget's white shows through; use ${surface}` +
        (parented ? ' (or the surface2 token for a tinted rail)' : '')
    );
  } else if (parented ? !SURFACE_TOKENS.test(background) : !/var\(--cc-appBackground-surface\)/.test(background)) {
    problems.push(
      `its background is "${background.slice(0, 60)}" rather than the surface it sits on (${surface}); a tint, ` +
        'gradient or literal colour belongs on a child card so the root still matches the canvas around it'
    );
  }
  const radius = (style['border-radius'] ?? '').trim();
  if (radius && !/^0(px)?$/.test(radius)) {
    problems.push(`it has border-radius ${radius}, and the corners outside the curve show the widget's white`);
  }
  const margin = (style.margin ?? '').trim();
  if (margin && !/^0(px)?(\s+0(px)?){0,3}$/.test(margin)) {
    problems.push(`it has margin ${margin}, which leaves a white gap around it`);
  }
  const width = (style.width ?? '').trim();
  if (width && !/^(100%|auto)$/.test(width)) {
    problems.push(`its width is "${width}", which leaves white at the sides`);
  }
  if (!problems.length) return [];
  return [
    `${who}: the root element ${problems.join('; ')}. ${why} Make the root a plain full-bleed box and move the ` +
      `card (tint, gradient, radius, padding, shadow) into a child element: ${template}`,
  ];
}

const DATA_BOUND_FOR_REFS = new Set(['Table', 'ListView', 'Chart', 'Kanban', 'Statistics', 'Text', 'Html']);
const COMPONENT_REF = /components(?:\.([A-Za-z_$][\w$]*)|\[\s*(['"])((?:(?!\2).)+)\2\s*\])(\??\.)(value|selectedRow|selectedRowId|selectedRows|isValid|searchText|selectedOptionLabel|checked|filteredData|text)\b/g;

/** A data-bound component evaluates the moment it mounts. Reached through in-app navigation, the
 *  queries already hold data, so the Table evaluates before the filter inputs on the same page
 *  exist: `components.filter.value` throws, the Table shows No data, and nothing re-evaluates it
 *  until a filter changes or the page reloads (a Luna clinic build on 2026-09-05 shipped exactly
 *  this). `components.filter?.value` is the shape the skill asks for; this makes it mandatory. */
/** The Chart widget plots `data` as an array of `{x, y}` points (plus optional `color`/`type`); any other key
 *  names render a blank plot with no error. Observed live on the Nordlicht benchmark (2026-09-07): Terra
 *  bound `queries.orders_by_day.data` straight from a list_rows query and Luna medium mapped rows to
 *  `{date, orders}`; both "orders per day" charts drew an empty axis. */
/** Collapse balanced groups to inspect only the outer expression. Strings are opaque; regexes,
 * templates and comments are deliberately unverified. This is not a general JavaScript parser. */
function chartExpressionSurface(source: string): { text: string; lastGroupStart: number } | undefined {
  const stack: string[] = [];
  let quote = '';
  let text = '';
  let lastGroupStart = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' || ch === '`') return undefined;
    if (ch === "'" || ch === '"') {
      quote = ch;
      if (!stack.length) text += '?';
      continue;
    }
    if ('([{'.includes(ch)) {
      if (!stack.length) { text += ch; lastGroupStart = i; }
      stack.push(ch);
    } else if (')]}'.includes(ch)) {
      if (stack.pop() !== ({ ')': '(', ']': '[', '}': '{' } as Record<string, string>)[ch]) return undefined;
      if (!stack.length) text += ch;
    } else if (!stack.length) text += ch;
  }
  return quote || stack.length ? undefined : { text, lastGroupStart };
}

/** Check simple final .map() object shapes only. Intermediate maps and nested callbacks are ignored;
 * ambiguous transformations, spreads and computed/quoted keys are left unverified. */
function finalChartPointKeys(value: string): string[] | undefined {
  const binding = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value);
  if (!binding) return undefined;
  const expression = binding[1]!.trim();
  const surface = chartExpressionSurface(expression);
  // Only a member/call chain ending in .map(), with no outer operator or enclosing function.
  if (!surface || !/^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*|\s*\(\s*\)|\s*\[\s*\])*\s*\.\s*map\s*\(\s*\)$/.test(surface.text.trim())) return undefined;
  const callback = expression.slice(surface.lastGroupStart + 1, -1).trim();
  const callbackSurface = chartExpressionSurface(callback);
  if (!callbackSurface || !/^(?:[A-Za-z_$][\w$]*|\(\s*\))\s*=>\s*\(\s*\)$/.test(callbackSurface.text.trim())) return undefined;
  const object = callback.slice(callbackSurface.lastGroupStart + 1, -1).trim();
  if (!object.startsWith('{') || !object.endsWith('}')) return undefined;
  const properties = chartExpressionSurface(object.slice(1, -1));
  if (!properties) return undefined;
  const keys: string[] = [];
  for (const property of properties.text.split(',')) {
    if (!property.trim()) continue;
    const key = /^\s*([A-Za-z_$][\w$]*)\s*(?::|$)/.exec(property);
    if (!key) return undefined;
    keys.push(key[1]!);
  }
  return keys;
}
export const BARE_QUERY_DATA_BINDING = /^\{\{\s*queries\.([A-Za-z_$][\w$]*)\??\.data(?:\??\.results)?\s*(?:\|\|\s*\[\]\s*)?\}\}$/;
export function lintChartDataShape(c: ReadinessComponent): string[] {
  if (c.type !== 'Chart') return [];
  const props = c.properties ?? {};
  if (truthy(propVal(props, 'plotFromJson'))) return [];
  const value = propVal(props, 'data');
  if (typeof value !== 'string' || !value.includes('{{')) return [];
  const keys = finalChartPointKeys(value);
  if (!keys || keys.includes('x') && keys.includes('y')) return [];
  return [
    `Chart "${label(c)}": data maps rows to {${keys.join(', ')}} but the Chart plots [{x, y}] only; ` +
      'any other key names draw an empty plot with no error. Name the category x and the number y.',
  ];
}

/** Bindings embedded in Html/Text markup are compiled one `{{...}}` at a time. Observed live (Luna high,
 *  2026-09-06): two KPI cards rendered blank because the model wrote `r.status!==\"Cancelled\"` inside
 *  the markup, escaping the quotes as if the expression sat inside a JSON string. A backslash outside a
 *  string literal is a JavaScript syntax error, and ToolJet renders a failed binding as nothing. */
const EMBEDDED_BINDING = /\{\{([\s\S]*?)\}\}/g;
const BACKSLASH_QUOTE = /\\["']/;
export function lintEmbeddedBindingSyntax(c: ReadinessComponent): string[] {
  if (c.type !== 'Html' && c.type !== 'Text') return [];
  const key = c.type === 'Html' ? 'rawHtml' : 'text';
  const value = propVal(c.properties, key);
  if (typeof value !== 'string' || !value.includes('{{')) return [];
  const errors: string[] = [];
  for (const m of value.matchAll(EMBEDDED_BINDING)) {
    const expr = m[1]!;
    if (expr.includes('{{')) continue;
    let message = '';
    try {
      new Function(`return (\n${expr}\n);`);
      continue;
    } catch (error) {
      if (!(error instanceof SyntaxError)) continue;
      message = error.message;
    }
    // A `}}` that closes an object literal splits the expression early; only report a fragment when the
    // braces balance (so the cut is not the cause) or the tell-tale backslash-quote is present.
    const balanced = (expr.match(/\{/g) ?? []).length === (expr.match(/\}/g) ?? []).length;
    const escaped = BACKSLASH_QUOTE.test(expr);
    if (!balanced && !escaped) continue;
    const snippet = expr.length > 90 ? `${expr.slice(0, 90)}…` : expr;
    errors.push(
      `${c.type} "${label(c)}": ${key} contains a binding that is not valid JavaScript (${message}): {{${snippet}}}. ` +
        (escaped
          ? 'Quotes inside {{ }} must not be backslash-escaped: the markup is a plain string, so write "Cancelled" or ' +
            "'Cancelled', not \\\"Cancelled\\\". "
          : '') +
        'A failed binding renders as nothing, which leaves the card or line blank.'
    );
  }
  return errors;
}

export function lintUnguardedComponentRefs(c: ReadinessComponent): string[] {
  if (!c.type || !DATA_BOUND_FOR_REFS.has(c.type)) return [];
  const props = c.properties ?? {};
  const keys = c.type === 'Html' ? ['rawHtml'] : c.type === 'Text' ? ['text'] : ['data'];
  const errors: string[] = [];
  for (const key of keys) {
    const value = propVal(props, key);
    if (typeof value !== 'string' || !value.includes('components')) continue;
    const bad = new Set<string>();
    for (const m of value.matchAll(COMPONENT_REF)) {
      if (m[4] === '?.') continue;
      const name = m[1] ?? m[3]!;
      bad.add(m[1] ? `components.${name}.${m[5]}` : `components['${name}'].${m[5]}`);
    }
    if (!bad.size) continue;
    const fixes = [...bad].map((ref) => `${ref.replace(/\.([A-Za-z]+)$/, '?.$1')}`);
    errors.push(
      `${c.type} "${label(c)}": ${key} reads ${[...bad].join(', ')} without optional chaining. The component ` +
        'evaluates when it mounts, before the inputs it references exist (queries already hold data after in-app ' +
        'navigation), so the reference throws and the ' +
        (c.type === 'Table' ? 'Table shows No data' : 'binding fails') +
        ' until a filter changes. Write ' +
        fixes.join(', ') +
        ' instead.'
    );
  }
  return errors;
}
