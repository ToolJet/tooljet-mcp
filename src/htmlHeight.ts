/**
 * Static estimate of the rendered height of an Html component's `rawHtml`.
 *
 * The Html widget never grows: it renders a box of the authored height (about 4px shorter, measured)
 * with an inner scrollbar that macOS hides, so content taller than the box simply looks cut off. On
 * 2026-09-05 seven of fourteen Html blocks in one Luna build overflowed by 5 to 42px: the model wrote
 * 18px paddings and 34px figures and then sized the strip from a rule of thumb. This estimator walks
 * the inline styles the model wrote (paddings, margins, borders, font sizes, grid/flex rows, line
 * wrapping at the authored width) and returns the height that markup needs. It is an estimate, so
 * the lint that uses it keeps a tolerance; it does not need to be exact to catch a 20px miss.
 */

export interface HtmlHeightEstimate {
  /** Estimated content height in px, including the root's own padding, border and margins. */
  height: number;
  /** True when a binding repeats markup (`.map(`) and the estimate is only a lower bound. */
  lowerBound: boolean;
}

interface Node {
  tag: string; // '#text' for text nodes
  style: Record<string, string>;
  attrs: Record<string, string>;
  children: Node[];
  text: string;
}

const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col']);
const INLINE_TAGS = new Set([
  'span', 'b', 'strong', 'i', 'em', 'a', 'small', 'code', 'u', 's', 'sup', 'sub', 'abbr', 'time', 'mark',
  'label', 'kbd', 'q', 'cite', 'var', 'bdi', 'font',
]);
const DEFAULT_FONT_SIZE = 14;
const LINE_HEIGHT_FACTOR = 1.5; // ToolJet inherits bootstrap body line-height 1.5 inside Html
/** Average glyph width as a fraction of font size (Inter/Arial mixed text, digits and capitals). */
const GLYPH_WIDTH_FACTOR = 0.52;

/** Browser/bootstrap defaults ToolJet's canvas still applies inside sanitized Html. */
const TAG_DEFAULTS: Record<string, { fontSize?: number; marginTop?: number; marginBottom?: number; block?: boolean }> = {
  h1: { fontSize: 32, marginBottom: 8 },
  h2: { fontSize: 24, marginBottom: 8 },
  h3: { fontSize: 20, marginBottom: 8 },
  h4: { fontSize: 18, marginBottom: 8 },
  h5: { fontSize: 16, marginBottom: 8 },
  h6: { fontSize: 14, marginBottom: 8 },
  p: { marginBottom: 16 },
  ul: { marginBottom: 16 },
  ol: { marginBottom: 16 },
  hr: { marginTop: 16, marginBottom: 16 },
};

// ---------------------------------------------------------------- bindings

/** Replace `{{ ... }}` bindings (balanced) with a short placeholder so the markup parses as plain
 *  HTML; a whole-template `{{`<div>...</div>`}}` is unwrapped and its `${...}` holes replaced. */
export function stripHtmlBindings(raw: string): { html: string; repeats: boolean } {
  let repeats = false;
  const trimmed = raw.trim();
  const template = /^\{\{\s*`([\s\S]*)`\s*\}\}$/.exec(trimmed);
  if (template) {
    const body = template[1]!;
    const html = replaceBalanced(body, '${', '}', (inner) => {
      if (/\.map\s*\(/.test(inner)) {
        repeats = true;
        return '';
      }
      return '00';
    });
    return { html, repeats };
  }
  const html = replaceBalanced(raw, '{{', '}}', (inner) => {
    if (/\.map\s*\(/.test(inner)) {
      repeats = true;
      return '';
    }
    return '00';
  });
  return { html, repeats };
}

function replaceBalanced(src: string, open: string, close: string, fn: (inner: string) => string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf(open, i);
    if (start < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, start);
    let depth = 0;
    let j = start;
    let end = -1;
    while (j < src.length) {
      if (src.startsWith(open, j)) {
        depth += 1;
        j += open.length;
        continue;
      }
      if (src.startsWith(close, j)) {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
        j += close.length;
        continue;
      }
      // `{{` vs `${`: inside a `${ }` hole braces nest one character at a time.
      if (open === '${' && src[j] === '{') depth += 1;
      j += 1;
    }
    if (end < 0) {
      out += src.slice(start);
      break;
    }
    out += fn(src.slice(start + open.length, end));
    i = end + close.length;
  }
  return out;
}

// ---------------------------------------------------------------- parsing

function parseStyle(text: string | undefined): Record<string, string> {
  const style: Record<string, string> = {};
  if (!text) return style;
  for (const decl of text.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim().replace(/\s*!important$/i, '');
    if (key) style[key] = value;
  }
  return style;
}

function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    attrs[m[1]!.toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return attrs;
}

export function parseHtml(html: string): Node {
  const root: Node = { tag: '#root', style: {}, attrs: {}, children: [], text: '' };
  const stack: Node[] = [root];
  const re = /<!--[\s\S]*?-->|<\/\s*([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^>]*?)?)\s*(\/?)>|([^<]+)|</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let k = stack.length - 1; k > 0; k -= 1) {
        if (stack[k]!.tag === tag) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    if (m[2]) {
      const tag = m[2].toLowerCase();
      if (tag === 'style' || tag === 'script') {
        // skip to the closing tag
        const close = html.indexOf(`</${tag}`, re.lastIndex);
        if (close >= 0) re.lastIndex = close;
        continue;
      }
      const attrs = parseAttrs(m[3] ?? '');
      const node: Node = { tag, style: parseStyle(attrs.style), attrs, children: [], text: '' };
      stack[stack.length - 1]!.children.push(node);
      if (!VOID_TAGS.has(tag) && !m[4]) stack.push(node);
      continue;
    }
    if (m[5] !== undefined) {
      const text = decodeEntities(m[5]);
      if (text.trim() || /\s/.test(text)) {
        stack[stack.length - 1]!.children.push({ tag: '#text', style: {}, attrs: {}, children: [], text });
      }
    }
  }
  return root;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&[a-z]+;|&#\d+;/gi, 'x');
}

// ---------------------------------------------------------------- CSS helpers

function px(value: string | undefined, fontSize: number, base = 0): number | undefined {
  if (value === undefined) return undefined;
  const v = value.trim();
  const m = /^(-?\d*\.?\d+)(px|em|rem|%|pt)?$/.exec(v);
  if (!m) return v === '0' ? 0 : undefined;
  const n = parseFloat(m[1]!);
  switch (m[2]) {
    case undefined:
    case 'px':
      return n;
    case 'em':
      return n * fontSize;
    case 'rem':
      return n * 16;
    case 'pt':
      return n * (4 / 3);
    case '%':
      return base ? (n / 100) * base : undefined;
    default:
      return undefined;
  }
}

/** Vertical parts of a box shorthand: top and bottom. */
function vertical(style: Record<string, string>, prop: string, fontSize: number): [number, number] {
  let top = 0;
  let bottom = 0;
  const shorthand = style[prop];
  if (shorthand) {
    const parts = shorthand.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
    if (parts.length === 1) top = bottom = parts[0]!;
    else if (parts.length === 2 || parts.length === 3) {
      top = parts[0]!;
      bottom = parts[2] ?? parts[0]!;
    } else if (parts.length >= 4) {
      top = parts[0]!;
      bottom = parts[2]!;
    }
  }
  const t = px(style[`${prop}-top`], fontSize);
  const b = px(style[`${prop}-bottom`], fontSize);
  if (t !== undefined) top = t;
  if (b !== undefined) bottom = b;
  return [top, bottom];
}

function horizontal(style: Record<string, string>, prop: string, fontSize: number): number {
  let left = 0;
  let right = 0;
  const shorthand = style[prop];
  if (shorthand) {
    const parts = shorthand.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
    if (parts.length === 1) left = right = parts[0]!;
    else if (parts.length === 2 || parts.length === 3) left = right = parts[1]!;
    else if (parts.length >= 4) {
      right = parts[1]!;
      left = parts[3]!;
    }
  }
  const l = px(style[`${prop}-left`], fontSize);
  const r = px(style[`${prop}-right`], fontSize);
  if (l !== undefined) left = l;
  if (r !== undefined) right = r;
  return left + right;
}

function borderWidth(value: string | undefined): number {
  if (!value) return 0;
  if (/^(none|0)$/i.test(value.trim())) return 0;
  const m = /(\d*\.?\d+)px/.exec(value);
  if (m) return parseFloat(m[1]!);
  if (/\b(thin)\b/.test(value)) return 1;
  if (/\b(medium)\b/.test(value)) return 3;
  if (/\b(thick)\b/.test(value)) return 5;
  return /\b(solid|dashed|dotted|double)\b/.test(value) ? 1 : 0;
}

function borders(style: Record<string, string>): [number, number] {
  const all = borderWidth(style.border);
  const top = style['border-top'] !== undefined ? borderWidth(style['border-top']) : all;
  const bottom = style['border-bottom'] !== undefined ? borderWidth(style['border-bottom']) : all;
  const t = px(style['border-top-width'], 0);
  const b = px(style['border-bottom-width'], 0);
  return [t ?? top, b ?? bottom];
}

function gridColumns(value: string | undefined): number {
  if (!value) return 1;
  let count = 0;
  const re = /repeat\(\s*(\d+|auto-fit|auto-fill)\s*,([^)]*)\)|[^\s,]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) {
    if (m[1]) {
      const n = parseInt(m[1], 10);
      const inner = (m[2] ?? '').trim().split(/\s+/).filter(Boolean).length || 1;
      count += (Number.isFinite(n) ? n : 1) * inner;
    } else count += 1;
  }
  return Math.max(1, count);
}

function gapOf(style: Record<string, string>, axis: 'row' | 'column', fontSize: number): number {
  const specific = px(style[`${axis}-gap`], fontSize);
  if (specific !== undefined) return specific;
  const gap = style.gap ?? style['grid-gap'];
  if (!gap) return 0;
  const parts = gap.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
  if (axis === 'row') return parts[0] ?? 0;
  return parts[1] ?? parts[0] ?? 0;
}

// ---------------------------------------------------------------- layout

interface Ctx {
  fontSize: number;
  lineHeight: number;
  width: number;
}

function isInline(node: Node): boolean {
  if (node.tag === '#text') return true;
  const display = node.style.display;
  if (display) {
    if (/^inline(?!-block|-flex|-grid)/.test(display)) return true;
    return false;
  }
  return INLINE_TAGS.has(node.tag);
}

function isHidden(node: Node): boolean {
  return node.style.display === 'none' || node.style.visibility === 'hidden';
}

function contextFor(node: Node, parent: Ctx): Ctx {
  const defaults = TAG_DEFAULTS[node.tag];
  let fontSize = px(node.style['font-size'], parent.fontSize) ?? defaults?.fontSize ?? parent.fontSize;
  if (!fontSize || fontSize <= 0) fontSize = parent.fontSize;
  let lineHeight = parent.lineHeight;
  const lh = node.style['line-height'];
  if (lh !== undefined) {
    const unitless = /^\d*\.?\d+$/.test(lh.trim());
    const value = unitless ? parseFloat(lh) * fontSize : px(lh, fontSize);
    if (value !== undefined) lineHeight = value;
    else if (lh.trim() === 'normal') lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  } else if (node.style['font-size'] || defaults?.fontSize || parent.lineHeight === 0) {
    lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  }
  return { fontSize, lineHeight, width: parent.width };
}

/** Height of one run of inline content (text plus inline elements) laid out at `width`. */
function inlineRunHeight(run: Node[], ctx: Ctx): number {
  // Collect text with <br> as hard breaks; inline children contribute their text at their own size.
  let maxLine = ctx.lineHeight;
  const segments: string[] = [''];
  const walk = (nodes: Node[], c: Ctx) => {
    for (const n of nodes) {
      if (n.tag === '#text') {
        segments[segments.length - 1] += n.text;
      } else if (n.tag === 'br') {
        segments.push('');
      } else if (n.tag === 'img') {
        const h = px(n.style.height, c.fontSize) ?? (n.attrs.height ? parseFloat(n.attrs.height) : undefined);
        if (h) maxLine = Math.max(maxLine, h);
      } else {
        const inner = contextFor(n, c);
        const [pt, pb] = vertical(n.style, 'padding', inner.fontSize);
        maxLine = Math.max(maxLine, inner.lineHeight + pt + pb);
        walk(n.children, inner);
      }
    }
  };
  walk(run, ctx);
  let lines = 0;
  for (const segment of segments) {
    const text = segment.replace(/\s+/g, ' ').trim();
    if (!text) {
      if (segments.length > 1) lines += 1; // an explicit <br> keeps an empty line
      continue;
    }
    const textWidth = text.length * ctx.fontSize * GLYPH_WIDTH_FACTOR;
    lines += Math.max(1, Math.ceil(textWidth / Math.max(ctx.width, 40)));
  }
  if (lines === 0) return 0;
  return lines * maxLine;
}

/** Outer height (content + padding + border + margins) of a block-level node. */
function blockHeight(node: Node, parent: Ctx): number {
  if (isHidden(node)) return 0;
  const ctx = contextFor(node, parent);
  const defaults = TAG_DEFAULTS[node.tag];
  const [pt, pb] = vertical(node.style, 'padding', ctx.fontSize);
  const [bt, bb] = borders(node.style);
  let [mt, mb] = vertical(node.style, 'margin', ctx.fontSize);
  if (node.style.margin === undefined && node.style['margin-top'] === undefined && defaults?.marginTop) mt = defaults.marginTop;
  if (node.style.margin === undefined && node.style['margin-bottom'] === undefined && defaults?.marginBottom) mb = defaults.marginBottom;
  const explicitWidth = px(node.style.width, ctx.fontSize, parent.width);
  const innerWidth = Math.max(40, (explicitWidth ?? parent.width) - horizontal(node.style, 'padding', ctx.fontSize));
  const inner: Ctx = { ...ctx, width: innerWidth };

  let content: number;
  if (node.tag === 'hr') content = 1;
  else if (node.tag === 'img') content = px(node.style.height, ctx.fontSize) ?? 0;
  else content = childrenHeight(node, inner, px(node.style.height, ctx.fontSize) !== undefined);

  const explicit = px(node.style.height, ctx.fontSize);
  if (explicit !== undefined && !/%|auto/.test(node.style.height ?? '')) {
    const borderBox = node.style['box-sizing'] === 'border-box';
    const boxHeight = borderBox ? explicit : explicit + pt + pb + bt + bb;
    const overflowHidden = /^(hidden|auto|scroll|clip)$/.test(node.style.overflow ?? node.style['overflow-y'] ?? '');
    const full = content + pt + pb + bt + bb;
    return (overflowHidden ? boxHeight : Math.max(boxHeight, full)) + mt + mb;
  }
  const minHeight = px(node.style['min-height'], ctx.fontSize);
  let total = content + pt + pb + bt + bb;
  if (minHeight !== undefined) total = Math.max(total, node.style['box-sizing'] === 'border-box' ? minHeight : minHeight + pt + pb);
  return total + mt + mb;
}

function childrenHeight(node: Node, ctx: Ctx, pinned = false): number {
  const display = node.style.display ?? '';
  const children = node.children.filter((c) => !isHidden(c));
  if (/grid/.test(display)) return gridHeight(node, children, ctx);
  if (/flex/.test(display)) return flexHeight(node, children, ctx, pinned);
  if (node.tag === 'tr') return rowHeight(children, ctx);
  // Normal flow: inline runs and block boxes stacked.
  let total = 0;
  let run: Node[] = [];
  const flush = () => {
    if (run.length) total += inlineRunHeight(run, ctx);
    run = [];
  };
  for (const child of children) {
    if (isInline(child)) run.push(child);
    else {
      flush();
      total += blockHeight(child, ctx);
    }
  }
  flush();
  return total;
}

function rowHeight(children: Node[], ctx: Ctx): number {
  const cells = children.filter((c) => !isInline(c));
  if (!cells.length) return inlineRunHeight(children, ctx);
  const width = Math.max(40, ctx.width / cells.length);
  return Math.max(...cells.map((c) => blockHeight(c, { ...ctx, width })));
}

function gridHeight(node: Node, children: Node[], ctx: Ctx): number {
  const columns = gridColumns(node.style['grid-template-columns']);
  const rowGap = gapOf(node.style, 'row', ctx.fontSize);
  const colGap = gapOf(node.style, 'column', ctx.fontSize);
  const width = Math.max(40, (ctx.width - colGap * (columns - 1)) / columns);
  const items = children.filter((c) => c.tag !== '#text' || c.text.trim());
  if (!items.length) return 0;
  let total = 0;
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns);
    total += Math.max(...row.map((c) => (isInline(c) ? inlineRunHeight([c], { ...ctx, width }) : blockHeight(c, { ...ctx, width }))));
    if (i + columns < items.length) total += rowGap;
  }
  return total;
}

function flexHeight(node: Node, children: Node[], ctx: Ctx, pinned = false): number {
  const direction = node.style['flex-direction'] ?? 'row';
  const items = children.filter((c) => c.tag !== '#text' || c.text.trim());
  if (!items.length) return 0;
  if (/column/.test(direction)) {
    const gap = gapOf(node.style, 'row', ctx.fontSize);
    return items.reduce((sum, c, i) => sum + (isInline(c) ? inlineRunHeight([c], ctx) : blockHeight(c, ctx)) + (i ? gap : 0), 0);
  }
  const gap = gapOf(node.style, 'column', ctx.fontSize);
  const weights = items.map((c) => {
    const flex = c.style.flex ?? c.style['flex-grow'];
    const n = flex ? parseFloat(flex) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const free = ctx.width - gap * (items.length - 1);
  // Row items of a container with a definite height are stretched to it and never grow: their
  // content spills over their own bottom padding first (cosmetic), so what must fit is
  // top padding + content. Grid rows and free-height flex rows size to their content.
  const stretched = pinned && !/^(flex-start|center|flex-end|baseline|start|end)$/.test(node.style['align-items'] ?? '');
  return Math.max(
    ...items.map((c, i) => {
      const explicit = px(c.style.width, ctx.fontSize, ctx.width);
      const width = Math.max(40, explicit ?? (free * weights[i]!) / totalWeight);
      if (isInline(c)) return inlineRunHeight([c], { ...ctx, width });
      if (!stretched) return blockHeight(c, { ...ctx, width });
      const inner = contextFor(c, { ...ctx, width });
      const [pt] = vertical(c.style, 'padding', inner.fontSize);
      const [bt] = borders(c.style);
      const [mt] = vertical(c.style, 'margin', inner.fontSize);
      const innerWidth = Math.max(40, width - horizontal(c.style, 'padding', inner.fontSize));
      return mt + pt + bt + childrenHeight(c, { ...inner, width: innerWidth });
    })
  );
}


/** The outermost element is what the model sizes against the widget. When it is given `height:100%`
 *  its box is pinned to the widget box, so its own bottom padding only gets clipped (cosmetic) and a
 *  vertically centred flex/grid root lets its children eat both paddings. What must fit is the
 *  children: top padding + children normally, children alone when centred. Everything nested inside
 *  (cards with their own padding, figures, lines) is counted in full. */
function rootHeight(root: Node, ctx: Ctx): number {
  let total = 0;
  let run: Node[] = [];
  const flush = () => {
    if (run.length) total += inlineRunHeight(run, ctx);
    run = [];
  };
  for (const child of root.children.filter((c) => !isHidden(c))) {
    if (isInline(child)) {
      run.push(child);
      continue;
    }
    flush();
    const percentHeight = /%$/.test((child.style.height ?? '').trim());
    if (!percentHeight) {
      total += blockHeight(child, ctx);
      continue;
    }
    const inner = contextFor(child, ctx);
    const [pt] = vertical(child.style, 'padding', inner.fontSize);
    const [bt] = borders(child.style);
    const [mt] = vertical(child.style, 'margin', inner.fontSize);
    const innerWidth = Math.max(40, ctx.width - horizontal(child.style, 'padding', inner.fontSize));
    const content = childrenHeight(child, { ...inner, width: innerWidth }, true);
    const display = child.style.display ?? '';
    const column = /column/.test(child.style['flex-direction'] ?? '');
    const centred =
      (/flex|grid/.test(display) && !column && /center/.test(child.style['align-items'] ?? child.style['align-content'] ?? '')) ||
      (/flex/.test(display) && column && /center/.test(child.style['justify-content'] ?? ''));
    total += mt + (centred ? content : pt + bt + content);
  }
  flush();
  return total;
}

/** Estimate the rendered height of `rawHtml` laid out at `widthPx`. Returns null when there is
 *  nothing measurable (empty markup, or only bindings). */
export function estimateHtmlHeight(rawHtml: string, widthPx: number): HtmlHeightEstimate | null {
  const { html, repeats } = stripHtmlBindings(rawHtml);
  if (!html.trim()) return null;
  const root = parseHtml(html);
  const ctx: Ctx = { fontSize: DEFAULT_FONT_SIZE, lineHeight: DEFAULT_FONT_SIZE * LINE_HEIGHT_FACTOR, width: Math.max(40, widthPx) };
  const height = rootHeight(root, ctx);
  if (!Number.isFinite(height) || height <= 0) return null;
  return { height: Math.round(height), lowerBound: repeats };
}
