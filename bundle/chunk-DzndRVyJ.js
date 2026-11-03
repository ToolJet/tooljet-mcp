import { createRequire } from "node:module";
createRequire(import.meta.url);
var VOID_TAGS = /* @__PURE__ */ new Set(["br", "img", "hr", "input", "meta", "link", "source", "wbr", "col"]);
var INLINE_TAGS = /* @__PURE__ */ new Set([
  "span",
  "b",
  "strong",
  "i",
  "em",
  "a",
  "small",
  "code",
  "u",
  "s",
  "sup",
  "sub",
  "abbr",
  "time",
  "mark",
  "label",
  "kbd",
  "q",
  "cite",
  "var",
  "bdi",
  "font"
]);
var DEFAULT_FONT_SIZE = 14;
var LINE_HEIGHT_FACTOR = 1.5;
var GLYPH_WIDTH_FACTOR = 0.52;
var TAG_DEFAULTS = {
  h1: { fontSize: 32, marginBottom: 8 },
  h2: { fontSize: 24, marginBottom: 8 },
  h3: { fontSize: 20, marginBottom: 8 },
  h4: { fontSize: 18, marginBottom: 8 },
  h5: { fontSize: 16, marginBottom: 8 },
  h6: { fontSize: 14, marginBottom: 8 },
  p: { marginBottom: 16 },
  ul: { marginBottom: 16 },
  ol: { marginBottom: 16 },
  hr: { marginTop: 16, marginBottom: 16 }
};
function stripHtmlBindings(raw) {
  let repeats = false;
  const trimmed = raw.trim();
  const template = /^\{\{\s*`([\s\S]*)`\s*\}\}$/.exec(trimmed);
  if (template) {
    const body = template[1];
    const html2 = replaceBalanced(body, "${", "}", (inner) => {
      if (/\.map\s*\(/.test(inner)) {
        repeats = true;
        return "";
      }
      return "00";
    });
    return { html: html2, repeats };
  }
  const html = replaceBalanced(raw, "{{", "}}", (inner) => {
    if (/\.map\s*\(/.test(inner)) {
      repeats = true;
      return "";
    }
    return "00";
  });
  return { html, repeats };
}
function replaceBalanced(src, open, close, fn) {
  let out = "";
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
      if (open === "${" && src[j] === "{")
        depth += 1;
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
function parseStyle(text) {
  const style = {};
  if (!text)
    return style;
  for (const decl of text.split(";")) {
    const idx = decl.indexOf(":");
    if (idx < 0)
      continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim().replace(/\s*!important$/i, "");
    if (key)
      style[key] = value;
  }
  return style;
}
function parseAttrs(text) {
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while (m = re.exec(text)) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}
function parseHtml(html) {
  const root = { tag: "#root", style: {}, attrs: {}, children: [], text: "" };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/\s*([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^>]*?)?)\s*(\/?)>|([^<]+)|</g;
  let m;
  while (m = re.exec(html)) {
    if (m[0].startsWith("<!--"))
      continue;
    if (m[1]) {
      const tag = m[1].toLowerCase();
      for (let k = stack.length - 1; k > 0; k -= 1) {
        if (stack[k].tag === tag) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    if (m[2]) {
      const tag = m[2].toLowerCase();
      if (tag === "style" || tag === "script") {
        const close = html.indexOf(`</${tag}`, re.lastIndex);
        if (close >= 0)
          re.lastIndex = close;
        continue;
      }
      const attrs = parseAttrs(m[3] ?? "");
      const node = { tag, style: parseStyle(attrs.style), attrs, children: [], text: "" };
      stack[stack.length - 1].children.push(node);
      if (!VOID_TAGS.has(tag) && !m[4])
        stack.push(node);
      continue;
    }
    if (m[5] !== void 0) {
      const text = decodeEntities(m[5]);
      if (text.trim() || /\s/.test(text)) {
        stack[stack.length - 1].children.push({ tag: "#text", style: {}, attrs: {}, children: [], text });
      }
    }
  }
  return root;
}
function decodeEntities(text) {
  return text.replace(/&nbsp;/g, "\xA0").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&[a-z]+;|&#\d+;/gi, "x");
}
function px(value, fontSize, base = 0) {
  if (value === void 0)
    return void 0;
  const v = value.trim();
  const m = /^(-?\d*\.?\d+)(px|em|rem|%|pt)?$/.exec(v);
  if (!m)
    return v === "0" ? 0 : void 0;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case void 0:
    case "px":
      return n;
    case "em":
      return n * fontSize;
    case "rem":
      return n * 16;
    case "pt":
      return n * (4 / 3);
    case "%":
      return base ? n / 100 * base : void 0;
    default:
      return void 0;
  }
}
function vertical(style, prop, fontSize) {
  let top = 0;
  let bottom = 0;
  const shorthand = style[prop];
  if (shorthand) {
    const parts = shorthand.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
    if (parts.length === 1)
      top = bottom = parts[0];
    else if (parts.length === 2 || parts.length === 3) {
      top = parts[0];
      bottom = parts[2] ?? parts[0];
    } else if (parts.length >= 4) {
      top = parts[0];
      bottom = parts[2];
    }
  }
  const t = px(style[`${prop}-top`], fontSize);
  const b = px(style[`${prop}-bottom`], fontSize);
  if (t !== void 0)
    top = t;
  if (b !== void 0)
    bottom = b;
  return [top, bottom];
}
function horizontal(style, prop, fontSize) {
  let left = 0;
  let right = 0;
  const shorthand = style[prop];
  if (shorthand) {
    const parts = shorthand.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
    if (parts.length === 1)
      left = right = parts[0];
    else if (parts.length === 2 || parts.length === 3)
      left = right = parts[1];
    else if (parts.length >= 4) {
      right = parts[1];
      left = parts[3];
    }
  }
  const l = px(style[`${prop}-left`], fontSize);
  const r = px(style[`${prop}-right`], fontSize);
  if (l !== void 0)
    left = l;
  if (r !== void 0)
    right = r;
  return left + right;
}
function borderWidth(value) {
  if (!value)
    return 0;
  if (/^(none|0)$/i.test(value.trim()))
    return 0;
  const m = /(\d*\.?\d+)px/.exec(value);
  if (m)
    return parseFloat(m[1]);
  if (/\b(thin)\b/.test(value))
    return 1;
  if (/\b(medium)\b/.test(value))
    return 3;
  if (/\b(thick)\b/.test(value))
    return 5;
  return /\b(solid|dashed|dotted|double)\b/.test(value) ? 1 : 0;
}
function borders(style) {
  const all = borderWidth(style.border);
  const top = style["border-top"] !== void 0 ? borderWidth(style["border-top"]) : all;
  const bottom = style["border-bottom"] !== void 0 ? borderWidth(style["border-bottom"]) : all;
  const t = px(style["border-top-width"], 0);
  const b = px(style["border-bottom-width"], 0);
  return [t ?? top, b ?? bottom];
}
function gridColumns(value) {
  if (!value)
    return 1;
  let count = 0;
  const re = /repeat\(\s*(\d+|auto-fit|auto-fill)\s*,([^)]*)\)|[^\s,]+/g;
  let m;
  while (m = re.exec(value)) {
    if (m[1]) {
      const n = parseInt(m[1], 10);
      const inner = (m[2] ?? "").trim().split(/\s+/).filter(Boolean).length || 1;
      count += (Number.isFinite(n) ? n : 1) * inner;
    } else
      count += 1;
  }
  return Math.max(1, count);
}
function gapOf(style, axis, fontSize) {
  const specific = px(style[`${axis}-gap`], fontSize);
  if (specific !== void 0)
    return specific;
  const gap = style.gap ?? style["grid-gap"];
  if (!gap)
    return 0;
  const parts = gap.split(/\s+/).map((p) => px(p, fontSize) ?? 0);
  if (axis === "row")
    return parts[0] ?? 0;
  return parts[1] ?? parts[0] ?? 0;
}
function isInline(node) {
  if (node.tag === "#text")
    return true;
  const display = node.style.display;
  if (display) {
    if (/^inline(?!-block|-flex|-grid)/.test(display))
      return true;
    return false;
  }
  return INLINE_TAGS.has(node.tag);
}
function isHidden(node) {
  return node.style.display === "none" || node.style.visibility === "hidden";
}
function contextFor(node, parent) {
  const defaults = TAG_DEFAULTS[node.tag];
  let fontSize = px(node.style["font-size"], parent.fontSize) ?? defaults?.fontSize ?? parent.fontSize;
  if (!fontSize || fontSize <= 0)
    fontSize = parent.fontSize;
  let lineHeight = parent.lineHeight;
  const lh = node.style["line-height"];
  if (lh !== void 0) {
    const unitless = /^\d*\.?\d+$/.test(lh.trim());
    const value = unitless ? parseFloat(lh) * fontSize : px(lh, fontSize);
    if (value !== void 0)
      lineHeight = value;
    else if (lh.trim() === "normal")
      lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  } else if (node.style["font-size"] || defaults?.fontSize || parent.lineHeight === 0) {
    lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  }
  return { fontSize, lineHeight, width: parent.width };
}
function inlineRunHeight(run, ctx) {
  let maxLine = ctx.lineHeight;
  const segments = [""];
  const walk = (nodes, c) => {
    for (const n of nodes) {
      if (n.tag === "#text") {
        segments[segments.length - 1] += n.text;
      } else if (n.tag === "br") {
        segments.push("");
      } else if (n.tag === "img") {
        const h = px(n.style.height, c.fontSize) ?? (n.attrs.height ? parseFloat(n.attrs.height) : void 0);
        if (h)
          maxLine = Math.max(maxLine, h);
      } else {
        const inner = contextFor(n, c);
        const [pt, pb] = vertical(n.style, "padding", inner.fontSize);
        maxLine = Math.max(maxLine, inner.lineHeight + pt + pb);
        walk(n.children, inner);
      }
    }
  };
  walk(run, ctx);
  let lines = 0;
  for (const segment of segments) {
    const text = segment.replace(/\s+/g, " ").trim();
    if (!text) {
      if (segments.length > 1)
        lines += 1;
      continue;
    }
    const textWidth = text.length * ctx.fontSize * GLYPH_WIDTH_FACTOR;
    lines += Math.max(1, Math.ceil(textWidth / Math.max(ctx.width, 40)));
  }
  if (lines === 0)
    return 0;
  return lines * maxLine;
}
function blockHeight(node, parent) {
  if (isHidden(node))
    return 0;
  const ctx = contextFor(node, parent);
  const defaults = TAG_DEFAULTS[node.tag];
  const [pt, pb] = vertical(node.style, "padding", ctx.fontSize);
  const [bt, bb] = borders(node.style);
  let [mt, mb] = vertical(node.style, "margin", ctx.fontSize);
  if (node.style.margin === void 0 && node.style["margin-top"] === void 0 && defaults?.marginTop)
    mt = defaults.marginTop;
  if (node.style.margin === void 0 && node.style["margin-bottom"] === void 0 && defaults?.marginBottom)
    mb = defaults.marginBottom;
  const explicitWidth = px(node.style.width, ctx.fontSize, parent.width);
  const innerWidth = Math.max(40, (explicitWidth ?? parent.width) - horizontal(node.style, "padding", ctx.fontSize));
  const inner = { ...ctx, width: innerWidth };
  let content;
  if (node.tag === "hr")
    content = 1;
  else if (node.tag === "img")
    content = px(node.style.height, ctx.fontSize) ?? 0;
  else
    content = childrenHeight(node, inner, px(node.style.height, ctx.fontSize) !== void 0);
  const explicit = px(node.style.height, ctx.fontSize);
  if (explicit !== void 0 && !/%|auto/.test(node.style.height ?? "")) {
    const borderBox = node.style["box-sizing"] === "border-box";
    const boxHeight = borderBox ? explicit : explicit + pt + pb + bt + bb;
    const overflowHidden = /^(hidden|auto|scroll|clip)$/.test(node.style.overflow ?? node.style["overflow-y"] ?? "");
    const full = content + pt + pb + bt + bb;
    return (overflowHidden ? boxHeight : Math.max(boxHeight, full)) + mt + mb;
  }
  const minHeight = px(node.style["min-height"], ctx.fontSize);
  let total = content + pt + pb + bt + bb;
  if (minHeight !== void 0)
    total = Math.max(total, node.style["box-sizing"] === "border-box" ? minHeight : minHeight + pt + pb);
  return total + mt + mb;
}
function childrenHeight(node, ctx, pinned = false) {
  const display = node.style.display ?? "";
  const children = node.children.filter((c) => !isHidden(c));
  if (/grid/.test(display))
    return gridHeight(node, children, ctx);
  if (/flex/.test(display))
    return flexHeight(node, children, ctx, pinned);
  if (node.tag === "tr")
    return rowHeight(children, ctx);
  let total = 0;
  let run = [];
  const flush = () => {
    if (run.length)
      total += inlineRunHeight(run, ctx);
    run = [];
  };
  for (const child of children) {
    if (isInline(child))
      run.push(child);
    else {
      flush();
      total += blockHeight(child, ctx);
    }
  }
  flush();
  return total;
}
function rowHeight(children, ctx) {
  const cells = children.filter((c) => !isInline(c));
  if (!cells.length)
    return inlineRunHeight(children, ctx);
  const width = Math.max(40, ctx.width / cells.length);
  return Math.max(...cells.map((c) => blockHeight(c, { ...ctx, width })));
}
function gridHeight(node, children, ctx) {
  const columns = gridColumns(node.style["grid-template-columns"]);
  const rowGap = gapOf(node.style, "row", ctx.fontSize);
  const colGap = gapOf(node.style, "column", ctx.fontSize);
  const width = Math.max(40, (ctx.width - colGap * (columns - 1)) / columns);
  const items = children.filter((c) => c.tag !== "#text" || c.text.trim());
  if (!items.length)
    return 0;
  let total = 0;
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns);
    total += Math.max(...row.map((c) => isInline(c) ? inlineRunHeight([c], { ...ctx, width }) : blockHeight(c, { ...ctx, width })));
    if (i + columns < items.length)
      total += rowGap;
  }
  return total;
}
function flexHeight(node, children, ctx, pinned = false) {
  const direction = node.style["flex-direction"] ?? "row";
  const items = children.filter((c) => c.tag !== "#text" || c.text.trim());
  if (!items.length)
    return 0;
  if (/column/.test(direction)) {
    const gap2 = gapOf(node.style, "row", ctx.fontSize);
    return items.reduce((sum, c, i) => sum + (isInline(c) ? inlineRunHeight([c], ctx) : blockHeight(c, ctx)) + (i ? gap2 : 0), 0);
  }
  const gap = gapOf(node.style, "column", ctx.fontSize);
  const weights = items.map((c) => {
    const flex = c.style.flex ?? c.style["flex-grow"];
    const n = flex ? parseFloat(flex) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const free = ctx.width - gap * (items.length - 1);
  const stretched = pinned && !/^(flex-start|center|flex-end|baseline|start|end)$/.test(node.style["align-items"] ?? "");
  return Math.max(...items.map((c, i) => {
    const explicit = px(c.style.width, ctx.fontSize, ctx.width);
    const width = Math.max(40, explicit ?? free * weights[i] / totalWeight);
    if (isInline(c))
      return inlineRunHeight([c], { ...ctx, width });
    if (!stretched)
      return blockHeight(c, { ...ctx, width });
    const inner = contextFor(c, { ...ctx, width });
    const [pt] = vertical(c.style, "padding", inner.fontSize);
    const [bt] = borders(c.style);
    const [mt] = vertical(c.style, "margin", inner.fontSize);
    const innerWidth = Math.max(40, width - horizontal(c.style, "padding", inner.fontSize));
    return mt + pt + bt + childrenHeight(c, { ...inner, width: innerWidth });
  }));
}
function rootHeight(root, ctx) {
  let total = 0;
  let run = [];
  const flush = () => {
    if (run.length)
      total += inlineRunHeight(run, ctx);
    run = [];
  };
  for (const child of root.children.filter((c) => !isHidden(c))) {
    if (isInline(child)) {
      run.push(child);
      continue;
    }
    flush();
    const percentHeight = /%$/.test((child.style.height ?? "").trim());
    if (!percentHeight) {
      total += blockHeight(child, ctx);
      continue;
    }
    const inner = contextFor(child, ctx);
    const [pt] = vertical(child.style, "padding", inner.fontSize);
    const [bt] = borders(child.style);
    const [mt] = vertical(child.style, "margin", inner.fontSize);
    const innerWidth = Math.max(40, ctx.width - horizontal(child.style, "padding", inner.fontSize));
    const content = childrenHeight(child, { ...inner, width: innerWidth }, true);
    const display = child.style.display ?? "";
    const column = /column/.test(child.style["flex-direction"] ?? "");
    const centred = /flex|grid/.test(display) && !column && /center/.test(child.style["align-items"] ?? child.style["align-content"] ?? "") || /flex/.test(display) && column && /center/.test(child.style["justify-content"] ?? "");
    total += mt + (centred ? content : pt + bt + content);
  }
  flush();
  return total;
}
function estimateHtmlHeight(rawHtml, widthPx) {
  const { html, repeats } = stripHtmlBindings(rawHtml);
  if (!html.trim())
    return null;
  const root = parseHtml(html);
  const ctx = { fontSize: DEFAULT_FONT_SIZE, lineHeight: DEFAULT_FONT_SIZE * LINE_HEIGHT_FACTOR, width: Math.max(40, widthPx) };
  const height = rootHeight(root, ctx);
  if (!Number.isFinite(height) || height <= 0)
    return null;
  return { height: Math.round(height), lowerBound: repeats };
}
var GRID_COLUMNS = 43;
function propVal(props, key) {
  const p = props?.[key];
  return p && typeof p === "object" && "value" in p ? p.value : p;
}
function truthy(v) {
  if (typeof v === "boolean")
    return v;
  if (typeof v !== "string")
    return false;
  const s = v.trim().replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "").toLowerCase();
  return s === "true";
}
function label(c) {
  return c.name ?? c.id ?? "?";
}
function lintTableColumnsShape(c) {
  if (c.type !== "Table")
    return [];
  const columns = propVal(c.properties, "columns");
  if (columns === void 0 || columns === null || Array.isArray(columns))
    return [];
  if (typeof columns === "string") {
    let parsesToArray = false;
    try {
      parsesToArray = Array.isArray(JSON.parse(columns));
    } catch {
      parsesToArray = false;
    }
    return [
      `Table "${label(c)}": properties.columns.value is a JSON string${parsesToArray ? " that happens to parse as an array" : ""}. ToolJet stores it as text and the Table crashes on render ("Something went wrong"). Pass the column objects as a real array value: columns: { value: [ { key, name, columnType, ... } ] }.`
    ];
  }
  return [
    `Table "${label(c)}": properties.columns.value must be an array of column objects, not ${typeof columns}.`
  ];
}
var MARKDOWN_SIGNS = /(^|\n)\s*#{1,6}\s+\S|\*\*[^*\n]+\*\*|(^|\n)\s*[-*]\s+\S|\[[^\]\n]+\]\([^)\n]+\)|(^|\n)\s*\d+\.\s+\S/;
function lintTextFormat(c) {
  if (c.type !== "Text")
    return [];
  const text = propVal(c.properties, "text");
  if (typeof text !== "string")
    return [];
  const format = propVal(c.properties, "textFormat");
  const effective = typeof format === "string" && format ? format : "html";
  if (effective === "markdown")
    return [];
  const literal = text.replace(/\{\{[\s\S]*?\}\}/g, " ");
  if (!MARKDOWN_SIGNS.test(literal))
    return [];
  return [
    `Text "${label(c)}": the text uses markdown (a "#" heading, **bold**, a list or a link) but textFormat is "${effective}", so it renders literally. Set properties.textFormat.value = "markdown", or write the heading as HTML / plain text.`
  ];
}
var WIDTH_EXEMPT = /* @__PURE__ */ new Set(["Modal", "ModalV2", "ShadDialog", "Drawer"]);
function lintOversizedWidths(components) {
  const errors = [];
  for (const c of components) {
    if (!c.type || WIDTH_EXEMPT.has(c.type))
      continue;
    const rect = c.layouts?.desktop ?? c.layout;
    if (!rect)
      continue;
    const width = typeof rect.width === "number" ? rect.width : void 0;
    const left = typeof rect.left === "number" ? rect.left : 0;
    if (width === void 0)
      continue;
    if (width > GRID_COLUMNS || left + width > GRID_COLUMNS) {
      errors.push(`${c.type} "${label(c)}": desktop left ${left} + width ${width} exceeds ToolJet's ${GRID_COLUMNS}-column grid. Widths and lefts are grid columns, not pixels: a full-width row is left 2, width 39; a half is width 19; a quarter is width 9.`);
    }
  }
  return errors;
}
function eventPayload(event) {
  return event && typeof event === "object" ? event : void 0;
}
function queryTriggers(summary) {
  const byId = new Map(summary.queries.map((q) => [q.id, q]));
  const byName = new Map(summary.queries.flatMap((q) => q.name ? [[q.name, q]] : []));
  const resolve = (ref) => typeof ref === "string" ? byId.get(ref) ?? byName.get(ref) : void 0;
  const triggers = /* @__PURE__ */ new Map();
  for (const q of summary.queries) {
    const options = q.options && typeof q.options === "object" ? q.options : {};
    const automatic = truthy(propVal(options, "runOnPageLoad")) || truthy(propVal(options, "runOnDependencyChange"));
    triggers.set(q.id, { automatic, manual: [] });
  }
  const chains = [];
  for (const e of summary.events) {
    const payload = eventPayload(e.event);
    if (!payload || payload.actionId !== "run-query")
      continue;
    const target = resolve(payload.queryId ?? payload.queryName);
    if (!target)
      continue;
    const entry = triggers.get(target.id);
    if (!entry)
      continue;
    const trigger = String(payload.eventId ?? "");
    if (e.target === "page" && trigger === "onPageLoad") {
      entry.automatic = true;
    } else if (e.target === "data_query" && trigger === "onDataQuerySuccess" && e.sourceId) {
      chains.push([e.sourceId, target.id]);
    } else {
      entry.manual.push(`${e.target ?? "component"} ${trigger || "event"}`);
    }
  }
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
var DATA_BOUND = /* @__PURE__ */ new Set(["Table", "ListView", "Chart", "Kanban"]);
function lintUntriggeredDataQueries(summary) {
  const errors = [];
  const warnings = [];
  if (!summary.queries.length)
    return { errors, warnings };
  const triggers = queryTriggers(summary);
  const byName = new Map(summary.queries.flatMap((q) => q.name ? [[q.name, q]] : []));
  for (const page of summary.pages) {
    for (const c of page.components) {
      if (!c.type || !DATA_BOUND.has(c.type))
        continue;
      const data = propVal(c.properties, "data");
      if (typeof data !== "string")
        continue;
      const names = [...new Set([...data.matchAll(/\bqueries\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]))];
      for (const name of names) {
        const query = byName.get(name);
        if (!query)
          continue;
        const t = triggers.get(query.id);
        if (!t || t.automatic)
          continue;
        const who = `${c.type} "${c.name ?? c.id}"`;
        if (t.manual.length) {
          warnings.push(`${who} binds queries.${name}.data, but "${name}" only runs from ${[...new Set(t.manual)].join(", ")}, so the component is empty until then. If it should show data on open, set the query's runOnPageLoad: true or run it from the page's onPageLoad event.`);
          continue;
        }
        const message = `${who} binds queries.${name}.data, but nothing runs "${name}": it has no runOnPageLoad, no page onPageLoad event, no success chain from a query that does, and no user event. It will show No data forever. Set the query's runOnPageLoad: true (or add a page onPageLoad run-query event).`;
        if (c.type === "Table")
          errors.push(message);
        else
          warnings.push(message);
      }
    }
  }
  return { errors, warnings };
}
var TOOLJETDB_WRITES = /* @__PURE__ */ new Set(["create_row", "update_rows", "delete_rows", "bulk_update_with_primary_key", "bulk_upsert_with_primary_key", "bulk_insert"]);
function lintAutomaticWrites(summary) {
  const triggers = queryTriggers(summary);
  return summary.queries.flatMap((q) => {
    const options = q.options && typeof q.options === "object" ? q.options : {};
    const op = String(options.operation ?? "");
    if (q.kind !== "tooljetdb" || !TOOLJETDB_WRITES.has(op) || !triggers.get(q.id)?.automatic)
      return [];
    return [`Query "${q.name ?? q.id}" writes (${op}) and runs on its own when the page opens, so every visit changes the data. Run it from a user action instead.`];
  });
}
var HTML_PX_PER_COLUMN = 32;
var HTML_WIDGET_HEIGHT_LOSS = 4;
var HTML_HEIGHT_TOLERANCE = 8;
function suggestedHtmlHeight(c) {
  if (c.type !== "Html")
    return null;
  if (truthy(propVal(c.properties, "dynamicHeight")))
    return null;
  const raw = propVal(c.properties, "rawHtml");
  if (typeof raw !== "string" || !raw.trim())
    return null;
  const rect = c.layouts?.desktop ?? c.layout;
  const height = typeof rect?.height === "number" ? rect.height : void 0;
  const width = typeof rect?.width === "number" ? rect.width : 39;
  if (height === void 0)
    return null;
  const estimate = estimateHtmlHeight(raw, width * HTML_PX_PER_COLUMN);
  if (!estimate)
    return null;
  const overflow = estimate.height - (height - HTML_WIDGET_HEIGHT_LOSS);
  if (overflow <= HTML_HEIGHT_TOLERANCE)
    return null;
  return { from: height, to: Math.ceil((estimate.height + HTML_WIDGET_HEIGHT_LOSS + 8) / 10) * 10, needed: estimate.height };
}
var SELECTION_READ = /components(?:\.[A-Za-z_$][\w$]*|\[\s*['"][^'"]+['"]\s*\])\??\.(?:selectedRow|selectedRows\s*\[\s*0\s*\])\??\.[A-Za-z_$][\w$]*/;
function lintUnguardedSelectionText(c) {
  if (c.type !== "Html" && c.type !== "Text")
    return [];
  const key = c.type === "Html" ? "rawHtml" : "text";
  const value = propVal(c.properties, key);
  if (typeof value !== "string" || !value.includes("selectedRow"))
    return [];
  const bad = [];
  for (const m of value.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    const expr = m[1];
    const read = expr.match(SELECTION_READ);
    if (!read)
      continue;
    const hasFallback = /\?\?|\|\||\?[^.?][\s\S]*:/.test(expr);
    if (!hasFallback)
      bad.push(read[0]);
  }
  if (!bad.length)
    return [];
  return [
    `${c.type} "${label(c)}": ${key} reads ${[...new Set(bad)].join(", ")} without a fallback. Until a row is selected that value is undefined and the page prints the word. Write (components.table?.selectedRow?.field ?? 'Select a row') or wrap the panel in a ternary on a stable selected-row key such as components.table?.selectedRow?.id. The row object itself may be empty but truthy.`
  ];
}
function lintHtmlContentHeight(c) {
  if (c.type !== "Html")
    return [];
  if (truthy(propVal(c.properties, "dynamicHeight")))
    return [];
  const raw = propVal(c.properties, "rawHtml");
  if (typeof raw !== "string" || !raw.trim())
    return [];
  const rect = c.layouts?.desktop ?? c.layout;
  const height = typeof rect?.height === "number" ? rect.height : void 0;
  const width = typeof rect?.width === "number" ? rect.width : 39;
  if (height === void 0)
    return [];
  const estimate = estimateHtmlHeight(raw, width * HTML_PX_PER_COLUMN);
  if (!estimate)
    return [];
  const usable = height - HTML_WIDGET_HEIGHT_LOSS;
  const overflow = estimate.height - usable;
  if (overflow <= HTML_HEIGHT_TOLERANCE)
    return [];
  const suggested = Math.ceil((estimate.height + HTML_WIDGET_HEIGHT_LOSS + 8) / 10) * 10;
  return [
    `Html "${label(c)}": its markup needs about ${estimate.height}px${estimate.lowerBound ? " at least (a .map() repeats rows)" : ""} (paddings, margins, font sizes \xD7 1.5 line height and wrapped lines, summed from its inline CSS) but desktop height is ${height}px and the widget renders ${HTML_WIDGET_HEIGHT_LOSS}px shorter than authored. The bottom ${overflow}px is cut off behind a hidden scrollbar. Set height to ${suggested}px, or trim the padding and font sizes to fit the height you have. An Html block never grows to its content.`
  ];
}
var SURFACE_TOKENS = /var\(--cc-(appBackground|surface1|surface2)-surface\)/;
var LITERAL_SURFACE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i;
var CLEAR_SURFACE = /^(transparent|#[0-9a-f]{3}0|#[0-9a-f]{6}00)$|^rgba\([^)]*,\s*0(\.0+)?\s*\)$/i;
var sameColour = (a, b) => a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();
function surfaceAroundResolver(components, canvasColor) {
  const find = (key) => components.find((o) => o.clientRef === key || o.id === key) ?? components.find((o) => typeof o.id === "string" && key.startsWith(`${o.id}-`)) ?? components.find((o) => o.name === key);
  const canvas = typeof canvasColor === "string" && LITERAL_SURFACE.test(canvasColor.trim()) ? canvasColor.trim() : void 0;
  return (c) => {
    let current = c;
    for (let depth = 0; depth < 12; depth++) {
      const key = current.parentRef ?? current.parent;
      if (!key)
        return canvas;
      const parent = find(key);
      if (!parent)
        return void 0;
      const slot = current.slotName ?? current.slot_name ?? (typeof parent.id === "string" && key.startsWith(`${parent.id}-`) ? key.slice(parent.id.length + 1) : void 0);
      const own = slot === "header" ? propVal(parent.styles, "headerBackgroundColor") : slot === "footer" ? propVal(parent.styles, "footerBackgroundColor") : void 0;
      const raw = own ?? propVal(parent.styles, "backgroundColor");
      const colour = typeof raw === "string" ? raw.trim() : "";
      if (CLEAR_SURFACE.test(colour)) {
        current = parent;
        continue;
      }
      return LITERAL_SURFACE.test(colour) ? colour : void 0;
    }
    return void 0;
  };
}
function lintHtmlRootSurface(c, surfaceAround) {
  if (c.type !== "Html")
    return [];
  const raw = propVal(c.properties, "rawHtml");
  if (typeof raw !== "string" || !raw.trim())
    return [];
  const { html } = stripHtmlBindings(raw);
  const tree = parseHtml(html);
  const roots = tree.children.filter((n) => n.tag !== "#text" || n.text.trim());
  const who = `Html "${label(c)}"`;
  const parented = Boolean(c.parent || c.parentRef);
  const surface = surfaceAround ?? (parented ? "var(--cc-surface1-surface)" : "var(--cc-appBackground-surface)");
  const template = `<div style="height:100%;box-sizing:border-box;margin:0;background:${surface}"> ...your markup... </div>`;
  const why = "ToolJet's Html widget paints its box white underneath the markup, so on a tinted canvas anything the root does not cover shows as a white edge.";
  if (roots.length !== 1 || roots[0].tag === "#text") {
    return [
      `${who}: rawHtml has ${roots.length} top-level nodes. ${why} Wrap everything in one root element: ${template}`
    ];
  }
  const root = roots[0];
  const style = root.style;
  const problems = [];
  const dynamic = truthy(propVal(c.properties, "dynamicHeight"));
  const heightValue = (style.height ?? style["min-height"] ?? "").trim();
  if (!dynamic && heightValue !== "100%") {
    problems.push(heightValue ? `its height is "${heightValue}" instead of 100%, so the rest of the box stays white` : "it has no height:100%, so the box below the content stays white");
  }
  const background = (style.background ?? style["background-color"] ?? "").trim();
  if (!background || /^(transparent|none|inherit|initial|unset)$/i.test(background)) {
    problems.push(`it paints no background of its own, so the widget's white shows through; use ${surface}` + (parented ? " (or the surface2 token for a tinted rail)" : ""));
  } else if (surfaceAround && sameColour(background, surfaceAround)) ;
  else if (parented ? !SURFACE_TOKENS.test(background) : !/var\(--cc-appBackground-surface\)/.test(background)) {
    problems.push(`its background is "${background.slice(0, 60)}" rather than the surface it sits on (${surface}); a tint, gradient or literal colour belongs on a child card so the root still matches the canvas around it`);
  }
  const radius = (style["border-radius"] ?? "").trim();
  if (radius && !/^0(px)?$/.test(radius)) {
    problems.push(`it has border-radius ${radius}, and the corners outside the curve show the widget's white`);
  }
  const margin = (style.margin ?? "").trim();
  if (margin && !/^0(px)?(\s+0(px)?){0,3}$/.test(margin)) {
    problems.push(`it has margin ${margin}, which leaves a white gap around it`);
  }
  const width = (style.width ?? "").trim();
  if (width && !/^(100%|auto)$/.test(width)) {
    problems.push(`its width is "${width}", which leaves white at the sides`);
  }
  if (!problems.length)
    return [];
  return [
    `${who}: the root element ${problems.join("; ")}. ${why} Make the root a plain full-bleed box and move the card (tint, gradient, radius, padding, shadow) into a child element: ${template}`
  ];
}
var DATA_BOUND_FOR_REFS = /* @__PURE__ */ new Set(["Table", "ListView", "Chart", "Kanban", "Statistics", "Text", "Html"]);
var COMPONENT_REF = /components(?:\.([A-Za-z_$][\w$]*)|\[\s*(['"])((?:(?!\2).)+)\2\s*\])(\??\.)(value|selectedRow|selectedRowId|selectedRows|isValid|searchText|selectedOptionLabel|checked|filteredData|text)\b/g;
function chartExpressionSurface(source) {
  const stack = [];
  let quote = "";
  let text = "";
  let lastGroupStart = -1;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\")
        i++;
      else if (ch === quote)
        quote = "";
      continue;
    }
    if (ch === "/" || ch === "`")
      return void 0;
    if (ch === "'" || ch === '"') {
      quote = ch;
      if (!stack.length)
        text += "?";
      continue;
    }
    if ("([{".includes(ch)) {
      if (!stack.length) {
        text += ch;
        lastGroupStart = i;
      }
      stack.push(ch);
    } else if (")]}".includes(ch)) {
      if (stack.pop() !== { ")": "(", "]": "[", "}": "{" }[ch])
        return void 0;
      if (!stack.length)
        text += ch;
    } else if (!stack.length)
      text += ch;
  }
  return quote || stack.length ? void 0 : { text, lastGroupStart };
}
function finalChartPointKeys(value) {
  const binding = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value);
  if (!binding)
    return void 0;
  const expression = binding[1].trim();
  const surface = chartExpressionSurface(expression);
  if (!surface || !/^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*|\s*\(\s*\)|\s*\[\s*\])*\s*\.\s*map\s*\(\s*\)$/.test(surface.text.trim()))
    return void 0;
  const callback = expression.slice(surface.lastGroupStart + 1, -1).trim();
  const callbackSurface = chartExpressionSurface(callback);
  if (!callbackSurface || !/^(?:[A-Za-z_$][\w$]*|\(\s*\))\s*=>\s*\(\s*\)$/.test(callbackSurface.text.trim()))
    return void 0;
  const object = callback.slice(callbackSurface.lastGroupStart + 1, -1).trim();
  if (!object.startsWith("{") || !object.endsWith("}"))
    return void 0;
  const properties = chartExpressionSurface(object.slice(1, -1));
  if (!properties)
    return void 0;
  const keys = [];
  for (const property of properties.text.split(",")) {
    if (!property.trim())
      continue;
    const key = /^\s*([A-Za-z_$][\w$]*)\s*(?::|$)/.exec(property);
    if (!key)
      return void 0;
    keys.push(key[1]);
  }
  return keys;
}
var BARE_QUERY_DATA_BINDING = /^\{\{\s*queries\.([A-Za-z_$][\w$]*)\??\.data(?:\??\.results)?\s*(?:\|\|\s*\[\]\s*)?\}\}$/;
function lintChartDataShape(c) {
  if (c.type !== "Chart")
    return [];
  const props = c.properties ?? {};
  if (truthy(propVal(props, "plotFromJson")))
    return [];
  const value = propVal(props, "data");
  if (typeof value !== "string" || !value.includes("{{"))
    return [];
  const keys = finalChartPointKeys(value);
  if (!keys || keys.includes("x") && keys.includes("y"))
    return [];
  return [
    `Chart "${label(c)}": data maps rows to {${keys.join(", ")}} but the Chart plots [{x, y}] only; any other key names draw an empty plot with no error. Name the category x and the number y.`
  ];
}
var EMBEDDED_BINDING = /\{\{([\s\S]*?)\}\}/g;
var BACKSLASH_QUOTE = /\\["']/;
function lintEmbeddedBindingSyntax(c) {
  if (c.type !== "Html" && c.type !== "Text")
    return [];
  const key = c.type === "Html" ? "rawHtml" : "text";
  const value = propVal(c.properties, key);
  if (typeof value !== "string" || !value.includes("{{"))
    return [];
  const errors = [];
  for (const m of value.matchAll(EMBEDDED_BINDING)) {
    const expr = m[1];
    if (expr.includes("{{"))
      continue;
    let message = "";
    try {
      new Function(`return (
${expr}
);`);
      continue;
    } catch (error) {
      if (!(error instanceof SyntaxError))
        continue;
      message = error.message;
    }
    const balanced = (expr.match(/\{/g) ?? []).length === (expr.match(/\}/g) ?? []).length;
    const escaped = BACKSLASH_QUOTE.test(expr);
    if (!balanced && !escaped)
      continue;
    const snippet = expr.length > 90 ? `${expr.slice(0, 90)}\u2026` : expr;
    errors.push(`${c.type} "${label(c)}": ${key} contains a binding that is not valid JavaScript (${message}): {{${snippet}}}. ` + (escaped ? `Quotes inside {{ }} must not be backslash-escaped: the markup is a plain string, so write "Cancelled" or 'Cancelled', not \\"Cancelled\\". ` : "") + "A failed binding renders as nothing, which leaves the card or line blank.");
  }
  return errors;
}
function lintUnguardedComponentRefs(c) {
  if (!c.type || !DATA_BOUND_FOR_REFS.has(c.type))
    return [];
  const props = c.properties ?? {};
  const keys = c.type === "Html" ? ["rawHtml"] : c.type === "Text" ? ["text"] : ["data"];
  const errors = [];
  for (const key of keys) {
    const value = propVal(props, key);
    if (typeof value !== "string" || !value.includes("components"))
      continue;
    const bad = /* @__PURE__ */ new Set();
    for (const m of value.matchAll(COMPONENT_REF)) {
      if (m[4] === "?.")
        continue;
      const name = m[1] ?? m[3];
      bad.add(m[1] ? `components.${name}.${m[5]}` : `components['${name}'].${m[5]}`);
    }
    if (!bad.size)
      continue;
    const fixes = [...bad].map((ref) => `${ref.replace(/\.([A-Za-z]+)$/, "?.$1")}`);
    errors.push(`${c.type} "${label(c)}": ${key} reads ${[...bad].join(", ")} without optional chaining. The component evaluates when it mounts, before the inputs it references exist (queries already hold data after in-app navigation), so the reference throws and the ` + (c.type === "Table" ? "Table shows No data" : "binding fails") + " until a filter changes. Write " + fixes.join(", ") + " instead.");
  }
  return errors;
}
export {
  BARE_QUERY_DATA_BINDING as B,
  lintHtmlContentHeight as a,
  lintHtmlRootSurface as b,
  lintUnguardedComponentRefs as c,
  lintEmbeddedBindingSyntax as d,
  lintChartDataShape as e,
  lintUnguardedSelectionText as f,
  lintTextFormat as g,
  lintTableColumnsShape as h,
  lintUntriggeredDataQueries as i,
  lintAutomaticWrites as j,
  stripHtmlBindings as k,
  lintOversizedWidths as l,
  suggestedHtmlHeight as m,
  parseHtml as p,
  surfaceAroundResolver as s
};
