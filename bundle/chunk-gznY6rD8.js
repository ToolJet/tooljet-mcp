import { createRequire } from "node:module";
import { e5 as getComponentSchema, ea as getCatalog, eb as getLegacyComponentReplacement } from "./chunk-BEuHHGL1.js";
import { o as external_exports } from "./chunk-8iUq0slz.js";
import { l as lintBindingNames, p as parseExpression, a as parse, b as bindingSpans } from "./chunk-yxr8SUor.js";
import { readFileSync } from "node:fs";
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
    const key3 = decl.slice(0, idx).trim().toLowerCase();
    const value2 = decl.slice(idx + 1).trim().replace(/\s*!important$/i, "");
    if (key3)
      style[key3] = value2;
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
      const node2 = { tag, style: parseStyle(attrs.style), attrs, children: [], text: "" };
      stack[stack.length - 1].children.push(node2);
      if (!VOID_TAGS.has(tag) && !m[4])
        stack.push(node2);
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
function px(value2, fontSize, base = 0) {
  if (value2 === void 0)
    return void 0;
  const v = value2.trim();
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
function vertical(style, prop2, fontSize) {
  let top = 0;
  let bottom = 0;
  const shorthand = style[prop2];
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
  const t = px(style[`${prop2}-top`], fontSize);
  const b = px(style[`${prop2}-bottom`], fontSize);
  if (t !== void 0)
    top = t;
  if (b !== void 0)
    bottom = b;
  return [top, bottom];
}
function horizontal(style, prop2, fontSize) {
  let left = 0;
  let right = 0;
  const shorthand = style[prop2];
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
  const l = px(style[`${prop2}-left`], fontSize);
  const r = px(style[`${prop2}-right`], fontSize);
  if (l !== void 0)
    left = l;
  if (r !== void 0)
    right = r;
  return left + right;
}
function borderWidth(value2) {
  if (!value2)
    return 0;
  if (/^(none|0)$/i.test(value2.trim()))
    return 0;
  const m = /(\d*\.?\d+)px/.exec(value2);
  if (m)
    return parseFloat(m[1]);
  if (/\b(thin)\b/.test(value2))
    return 1;
  if (/\b(medium)\b/.test(value2))
    return 3;
  if (/\b(thick)\b/.test(value2))
    return 5;
  return /\b(solid|dashed|dotted|double)\b/.test(value2) ? 1 : 0;
}
function borders(style) {
  const all = borderWidth(style.border);
  const top = style["border-top"] !== void 0 ? borderWidth(style["border-top"]) : all;
  const bottom = style["border-bottom"] !== void 0 ? borderWidth(style["border-bottom"]) : all;
  const t = px(style["border-top-width"], 0);
  const b = px(style["border-bottom-width"], 0);
  return [t ?? top, b ?? bottom];
}
function gridColumns(value2) {
  if (!value2)
    return 1;
  let count = 0;
  const re = /repeat\(\s*(\d+|auto-fit|auto-fill)\s*,([^)]*)\)|[^\s,]+/g;
  let m;
  while (m = re.exec(value2)) {
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
function isInline(node2) {
  if (node2.tag === "#text")
    return true;
  const display = node2.style.display;
  if (display) {
    if (/^inline(?!-block|-flex|-grid)/.test(display))
      return true;
    return false;
  }
  return INLINE_TAGS.has(node2.tag);
}
function isHidden(node2) {
  return node2.style.display === "none" || node2.style.visibility === "hidden";
}
function contextFor(node2, parent) {
  const defaults = TAG_DEFAULTS[node2.tag];
  let fontSize = px(node2.style["font-size"], parent.fontSize) ?? defaults?.fontSize ?? parent.fontSize;
  if (!fontSize || fontSize <= 0)
    fontSize = parent.fontSize;
  let lineHeight = parent.lineHeight;
  const lh = node2.style["line-height"];
  if (lh !== void 0) {
    const unitless = /^\d*\.?\d+$/.test(lh.trim());
    const value2 = unitless ? parseFloat(lh) * fontSize : px(lh, fontSize);
    if (value2 !== void 0)
      lineHeight = value2;
    else if (lh.trim() === "normal")
      lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  } else if (node2.style["font-size"] || defaults?.fontSize || parent.lineHeight === 0) {
    lineHeight = fontSize * LINE_HEIGHT_FACTOR;
  }
  return { fontSize, lineHeight, width: parent.width };
}
function inlineRunHeight(run, ctx) {
  let maxLine = ctx.lineHeight;
  const segments = [""];
  const walk3 = (nodes, c) => {
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
        walk3(n.children, inner);
      }
    }
  };
  walk3(run, ctx);
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
function blockHeight(node2, parent) {
  if (isHidden(node2))
    return 0;
  const ctx = contextFor(node2, parent);
  const defaults = TAG_DEFAULTS[node2.tag];
  const [pt, pb] = vertical(node2.style, "padding", ctx.fontSize);
  const [bt, bb] = borders(node2.style);
  let [mt, mb] = vertical(node2.style, "margin", ctx.fontSize);
  if (node2.style.margin === void 0 && node2.style["margin-top"] === void 0 && defaults?.marginTop)
    mt = defaults.marginTop;
  if (node2.style.margin === void 0 && node2.style["margin-bottom"] === void 0 && defaults?.marginBottom)
    mb = defaults.marginBottom;
  const explicitWidth = px(node2.style.width, ctx.fontSize, parent.width);
  const innerWidth = Math.max(40, (explicitWidth ?? parent.width) - horizontal(node2.style, "padding", ctx.fontSize));
  const inner = { ...ctx, width: innerWidth };
  let content;
  if (node2.tag === "hr")
    content = 1;
  else if (node2.tag === "img")
    content = px(node2.style.height, ctx.fontSize) ?? 0;
  else
    content = childrenHeight(node2, inner, px(node2.style.height, ctx.fontSize) !== void 0);
  const explicit = px(node2.style.height, ctx.fontSize);
  if (explicit !== void 0 && !/%|auto/.test(node2.style.height ?? "")) {
    const borderBox = node2.style["box-sizing"] === "border-box";
    const boxHeight = borderBox ? explicit : explicit + pt + pb + bt + bb;
    const overflowHidden = /^(hidden|auto|scroll|clip)$/.test(node2.style.overflow ?? node2.style["overflow-y"] ?? "");
    const full = content + pt + pb + bt + bb;
    return (overflowHidden ? boxHeight : Math.max(boxHeight, full)) + mt + mb;
  }
  const minHeight = px(node2.style["min-height"], ctx.fontSize);
  let total = content + pt + pb + bt + bb;
  if (minHeight !== void 0)
    total = Math.max(total, node2.style["box-sizing"] === "border-box" ? minHeight : minHeight + pt + pb);
  return total + mt + mb;
}
function childrenHeight(node2, ctx, pinned = false) {
  const display = node2.style.display ?? "";
  const children = node2.children.filter((c) => !isHidden(c));
  if (/grid/.test(display))
    return gridHeight(node2, children, ctx);
  if (/flex/.test(display))
    return flexHeight(node2, children, ctx, pinned);
  if (node2.tag === "tr")
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
function gridHeight(node2, children, ctx) {
  const columns = gridColumns(node2.style["grid-template-columns"]);
  const rowGap = gapOf(node2.style, "row", ctx.fontSize);
  const colGap = gapOf(node2.style, "column", ctx.fontSize);
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
function flexHeight(node2, children, ctx, pinned = false) {
  const direction = node2.style["flex-direction"] ?? "row";
  const items = children.filter((c) => c.tag !== "#text" || c.text.trim());
  if (!items.length)
    return 0;
  if (/column/.test(direction)) {
    const gap2 = gapOf(node2.style, "row", ctx.fontSize);
    return items.reduce((sum, c, i) => sum + (isInline(c) ? inlineRunHeight([c], ctx) : blockHeight(c, ctx)) + (i ? gap2 : 0), 0);
  }
  const gap = gapOf(node2.style, "column", ctx.fontSize);
  const weights = items.map((c) => {
    const flex = c.style.flex ?? c.style["flex-grow"];
    const n = flex ? parseFloat(flex) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const free = ctx.width - gap * (items.length - 1);
  const stretched = pinned && !/^(flex-start|center|flex-end|baseline|start|end)$/.test(node2.style["align-items"] ?? "");
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
function propVal(props, key3) {
  const p = props?.[key3];
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
var WIDTH_EXEMPT = /* @__PURE__ */ new Set(["Modal", "ModalV2", "Drawer"]);
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
  const key3 = c.type === "Html" ? "rawHtml" : "text";
  const value2 = propVal(c.properties, key3);
  if (typeof value2 !== "string" || !value2.includes("selectedRow"))
    return [];
  const bad = [];
  for (const m of value2.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
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
    `${c.type} "${label(c)}": ${key3} reads ${[...new Set(bad)].join(", ")} without a fallback. Until a row is selected that value is undefined and the page prints the word. Write (components.table?.selectedRow?.field ?? 'Select a row') or wrap the panel in a ternary on a stable selected-row key such as components.table?.selectedRow?.id. The row object itself may be empty but truthy.`
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
  const find = (key3) => components.find((o) => o.clientRef === key3 || o.id === key3) ?? components.find((o) => typeof o.id === "string" && key3.startsWith(`${o.id}-`)) ?? components.find((o) => o.name === key3);
  const canvas = typeof canvasColor === "string" && LITERAL_SURFACE.test(canvasColor.trim()) ? canvasColor.trim() : void 0;
  return (c) => {
    let current = c;
    for (let depth = 0; depth < 12; depth++) {
      const key3 = current.parentRef ?? current.parent;
      if (!key3)
        return canvas;
      const parent = find(key3);
      if (!parent)
        return void 0;
      const slot = current.slotName ?? current.slot_name ?? (typeof parent.id === "string" && key3.startsWith(`${parent.id}-`) ? key3.slice(parent.id.length + 1) : void 0);
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
function finalChartPointKeys(value2) {
  const binding = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value2);
  if (!binding)
    return void 0;
  const expression2 = binding[1].trim();
  const surface = chartExpressionSurface(expression2);
  if (!surface || !/^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*|\s*\(\s*\)|\s*\[\s*\])*\s*\.\s*map\s*\(\s*\)$/.test(surface.text.trim()))
    return void 0;
  const callback = expression2.slice(surface.lastGroupStart + 1, -1).trim();
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
    const key3 = /^\s*([A-Za-z_$][\w$]*)\s*(?::|$)/.exec(property);
    if (!key3)
      return void 0;
    keys.push(key3[1]);
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
  const value2 = propVal(props, "data");
  if (typeof value2 !== "string" || !value2.includes("{{"))
    return [];
  const keys = finalChartPointKeys(value2);
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
  const key3 = c.type === "Html" ? "rawHtml" : "text";
  const value2 = propVal(c.properties, key3);
  if (typeof value2 !== "string" || !value2.includes("{{"))
    return [];
  const errors = [];
  for (const m of value2.matchAll(EMBEDDED_BINDING)) {
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
    errors.push(`${c.type} "${label(c)}": ${key3} contains a binding that is not valid JavaScript (${message}): {{${snippet}}}. ` + (escaped ? `Quotes inside {{ }} must not be backslash-escaped: the markup is a plain string, so write "Cancelled" or 'Cancelled', not \\"Cancelled\\". ` : "") + "A failed binding renders as nothing, which leaves the card or line blank.");
  }
  return errors;
}
function lintUnguardedComponentRefs(c) {
  if (!c.type || !DATA_BOUND_FOR_REFS.has(c.type))
    return [];
  const props = c.properties ?? {};
  const keys = c.type === "Html" ? ["rawHtml"] : c.type === "Text" ? ["text"] : ["data"];
  const errors = [];
  for (const key3 of keys) {
    const value2 = propVal(props, key3);
    if (typeof value2 !== "string" || !value2.includes("components"))
      continue;
    const bad = /* @__PURE__ */ new Set();
    for (const m of value2.matchAll(COMPONENT_REF)) {
      if (m[4] === "?.")
        continue;
      const name = m[1] ?? m[3];
      bad.add(m[1] ? `components.${name}.${m[5]}` : `components['${name}'].${m[5]}`);
    }
    if (!bad.size)
      continue;
    const fixes = [...bad].map((ref) => `${ref.replace(/\.([A-Za-z]+)$/, "?.$1")}`);
    errors.push(`${c.type} "${label(c)}": ${key3} reads ${[...bad].join(", ")} without optional chaining. The component evaluates when it mounts, before the inputs it references exist (queries already hold data after in-app navigation), so the reference throws and the ` + (c.type === "Table" ? "Table shows No data" : "binding fails") + " until a filter changes. Write " + fixes.join(", ") + " instead.");
  }
  return errors;
}
function isNode(value2) {
  return !!value2 && typeof value2 === "object" && typeof value2.type === "string";
}
function bindsNamespace(value2, namespace) {
  if (!isNode(value2))
    return false;
  if (value2.type === "Identifier")
    return value2.name === namespace;
  if (value2.type === "RestElement")
    return bindsNamespace(value2.argument, namespace);
  if (value2.type === "AssignmentPattern")
    return bindsNamespace(value2.left, namespace);
  if (value2.type === "ArrayPattern")
    return value2.elements.some((item) => bindsNamespace(item, namespace));
  if (value2.type === "ObjectPattern") {
    return value2.properties.some((property) => bindsNamespace(property.type === "RestElement" ? property.argument : property.value, namespace));
  }
  return false;
}
function namespaceReads(code, namespace) {
  let root;
  try {
    root = parse(code, { sourceType: "script", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true });
  } catch {
    return [];
  }
  const reads = [];
  let shadowed = false;
  const visit = (value2) => {
    if (Array.isArray(value2)) {
      value2.forEach(visit);
      return;
    }
    if (!isNode(value2))
      return;
    if (value2.type === "VariableDeclarator" && bindsNamespace(value2.id, namespace) || /^(Function|Class)(Declaration|Expression)$/.test(value2.type) && bindsNamespace(value2.id, namespace) || Array.isArray(value2.params) && value2.params.some((item) => bindsNamespace(item, namespace)) || value2.type === "CatchClause" && bindsNamespace(value2.param, namespace) || value2.type === "WithStatement" || value2.type === "CallExpression" && isNode(value2.callee) && value2.callee.type === "Identifier" && value2.callee.name === "eval")
      shadowed = true;
    if ((value2.type === "MemberExpression" || value2.type === "OptionalMemberExpression") && isNode(value2.object) && value2.object.type === "Identifier" && value2.object.name === namespace && isNode(value2.property)) {
      const name = !value2.computed && value2.property.type === "Identifier" ? value2.property.name : value2.computed && value2.property.type === "StringLiteral" ? value2.property.value : void 0;
      if (typeof name === "string" && typeof value2.start === "number" && typeof value2.end === "number") {
        reads.push({ name, start: value2.start, end: value2.end, optional: value2.optional === true });
      }
    }
    for (const child of Object.values(value2))
      visit(child);
  };
  visit(root);
  return shadowed ? [] : reads;
}
function runjsQueryReferences(code) {
  return [...new Set(namespaceReads(code, "queries").map((read) => read.name))];
}
function runjsComponentReferences(code) {
  return [...new Set(namespaceReads(code, "components").map((read) => read.name))];
}
function bindingReferences(value2) {
  if (Array.isArray(value2))
    return value2.flatMap(bindingReferences);
  if (value2 && typeof value2 === "object")
    return Object.values(value2).flatMap(bindingReferences);
  if (typeof value2 !== "string")
    return [];
  const refs = [];
  for (const binding of bindingSpans(value2)) {
    const reads = ["components", "queries"].flatMap((namespace) => namespaceReads(`(${binding.body})`, namespace).map((read) => ({ ...read, namespace })));
    refs.push(...reads.sort((a, b) => a.start - b.start).map(({ namespace, name }) => ({ namespace, name })));
  }
  return refs;
}
var COMPONENT_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
var COMPONENT_NAME_RULE = "Component names must be non-empty and contain only ASCII letters, numbers, underscores, or hyphens. Use camelCase for multi-word names; put display text in component properties.";
var componentNameSchema = external_exports.string().regex(COMPONENT_NAME_PATTERN, COMPONENT_NAME_RULE).describe(COMPONENT_NAME_RULE);
function componentNameError(name) {
  if (typeof name !== "string" || !COMPONENT_NAME_PATTERN.test(name)) {
    return `Invalid component name ${JSON.stringify(name)}. ${COMPONENT_NAME_RULE}`;
  }
  return void 0;
}
var record = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
var unwrap = (v) => Object.hasOwn(record(v), "value") ? record(v).value : v;
function lintEditPrefill(summary) {
  const controls = summary.pages.flatMap((p) => p.components);
  const names = new Map(controls.filter((c) => c.name).map((c) => [c.name, c]));
  const warnings = [];
  for (const q of summary.queries) {
    const options = record(q.options);
    if (q.kind !== "tooljetdb" || options.operation !== "update_rows")
      continue;
    const update = record(options.update_rows);
    if (!Object.keys(record(update.where_filters)).length)
      continue;
    const entries = Object.values(record(update.columns)).map(record);
    if (entries.some((entry) => Object.hasOwn(entry, "value") && (typeof entry.value !== "string" || !entry.value.includes("{{"))))
      continue;
    const referenced = [...new Set(bindingReferences(update.columns).filter((r) => r.namespace === "components").map((r) => r.name))];
    const blank = referenced.flatMap((name) => {
      const c = names.get(name);
      if (!c || !["TextInput", "EmailInput", "PhoneInput", "NumberInput", "TextArea"].includes(c.type ?? ""))
        return [];
      const p = record(c.properties);
      if (["value", "defaultValue"].some((k) => {
        const v = unwrap(p[k]);
        return v !== void 0 && v !== null && v !== "";
      }))
        return [];
      if (summary.events.some((e) => JSON.stringify(e.event).includes(c.id)))
        return [];
      if (summary.queries.some((other) => other.kind === "runjs" && JSON.stringify(other.options).includes(name)))
        return [];
      return [name];
    });
    if (blank.length < 2)
      continue;
    warnings.push(`Query "${q.name ?? q.id}" updates an existing row from blank controls ${blank.map((n) => JSON.stringify(n)).join(", ")} with no visible prefill path. If these edit existing values, initialize them from the selected raw record (generate_edit_contract can supply supported field defaults/events), then verify a one-field edit preserves untouched values. Do not require users to re-enter existing contact details. An intentional multi-field replacement form may be valid; this advisory does not change values or layout.`);
  }
  return warnings;
}
function lintUninitializedWriteSelections(summary) {
  const controls = summary.pages.flatMap((p) => p.components);
  const warnings = [];
  for (const q of summary.queries) {
    const options = record(q.options);
    if (q.kind !== "tooljetdb" || options.operation !== "update_rows")
      continue;
    const update = record(options.update_rows);
    if (!Object.keys(record(update.where_filters)).length)
      continue;
    const reads = new Set(bindingReferences(update.columns).filter((r) => r.namespace === "components").map((r) => r.name));
    for (const c of controls) {
      if (c.type !== "DropdownV2" || !c.name || !reads.has(c.name))
        continue;
      const p = record(c.properties);
      const choices = unwrap(p.options);
      if (unwrap(p.advanced) || !Array.isArray(choices) || !choices.length)
        continue;
      if (choices.some((choice) => {
        const item = record(choice);
        return item.default !== void 0 && item.default !== false || item.value === "" || item.value === null;
      }))
        continue;
      if (summary.events.some((e) => JSON.stringify(e.event).includes(c.id)))
        continue;
      if (summary.queries.some((other) => other.kind === "runjs" && JSON.stringify(other.options).includes(c.name)))
        continue;
      const guardSources = [
        options.disableQuery,
        q.disableQuery,
        ...controls.filter((b) => b.type === "Button").map((b) => record(b.properties).disabledState)
      ];
      if (guardSources.some((g) => bindingReferences(g).some((r) => r.namespace === "components" && r.name === c.name)))
        continue;
      warnings.push(`Query "${q.name ?? q.id}" writes from DropdownV2 "${c.name}" with static choices but no default, explicit empty option, visible initialization or selection guard. Saving before a choice can clear the stored value. Prefill the existing value or guard the write until a valid choice exists; if clearing is intentional, model that choice explicitly. This advisory never chooses a default for the user.`);
    }
  }
  return warnings;
}
var obj = (x) => x && typeof x === "object" && !Array.isArray(x) ? x : {};
var prop = (x) => obj(x.property)[x.computed ? "value" : "name"];
function lintWhitespaceGuards(summary) {
  const controls = summary.pages.flatMap((p) => p.components);
  const textAreas = new Set(controls.filter((c) => c.type === "TextArea").map((c) => c.name));
  const sources = controls.filter((c) => c.type === "Button").map((c) => ({ name: c.name ?? c.id, value: obj(c.properties).disabledState }));
  const warnings = [];
  for (const source of sources) {
    const value2 = Object.hasOwn(obj(source.value), "value") ? obj(source.value).value : source.value;
    if (typeof value2 !== "string")
      continue;
    const reads = new Set(bindingReferences(value2).filter((r) => r.namespace === "components").map((r) => r.name));
    const found = /* @__PURE__ */ new Set();
    const walk3 = (x) => {
      if (Array.isArray(x)) {
        x.forEach(walk3);
        return;
      }
      const n = obj(x);
      if (n.type === "UnaryExpression" && n.operator === "!") {
        const field = obj(n.argument), control = obj(field.object), root = obj(control.object);
        const name = prop(control);
        if (prop(field) === "value" && root.type === "Identifier" && root.name === "components" && typeof name === "string" && reads.has(name) && textAreas.has(name))
          found.add(name);
      }
      for (const child of Object.values(n))
        if (child && typeof child === "object")
          walk3(child);
    };
    for (const span of bindingSpans(value2)) {
      try {
        walk3(parseExpression(span.body));
      } catch {
      }
    }
    if (found.size)
      warnings.push(`Button "${source.name}" tests TextArea ${[...found].map((n) => JSON.stringify(n)).join(", ")} with a truthiness-only empty guard. Spaces pass that check. If a meaningful reason/note is required, test String(value ?? '').trim().length and repeat the guard at the write boundary; preserve the user's original text. Intentional whitespace-only input may be valid, so this is advisory.`);
  }
  return warnings;
}
var obj2 = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : {};
var member = (n) => obj2(n.property)[n.computed ? "value" : "name"];
function lintSelectedRowObjectGuards(summary) {
  const controls = summary.pages.flatMap((p) => p.components);
  const tables = new Set(controls.filter((c) => c.type === "Table").map((c) => c.name));
  const warnings = [];
  for (const c of controls.filter((c2) => ["Button", "Text", "Html"].includes(c2.type ?? ""))) {
    const key3 = c.type === "Button" ? "disabledState" : c.type === "Html" ? "rawHtml" : "text";
    const raw = obj2(c.properties)[key3];
    const value2 = Object.hasOwn(obj2(raw), "value") ? obj2(raw).value : raw;
    if (typeof value2 !== "string")
      continue;
    const found = /* @__PURE__ */ new Set();
    const rowName = (v) => {
      const row = obj2(v), table = obj2(row.object), root = obj2(table.object);
      const name = member(table);
      if (["MemberExpression", "OptionalMemberExpression"].includes(String(row.type)) && member(row) === "selectedRow" && ["MemberExpression", "OptionalMemberExpression"].includes(String(table.type)) && root.type === "Identifier" && root.name === "components" && typeof name === "string" && tables.has(name))
        return name;
      return void 0;
    };
    const walk3 = (v, booleanContext = false) => {
      if (Array.isArray(v)) {
        v.forEach((x) => walk3(x));
        return;
      }
      const n = obj2(v);
      if (["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration", "ObjectMethod"].includes(String(n.type)))
        return;
      const name = booleanContext ? rowName(n) : void 0;
      if (name)
        found.add(name);
      if (n.type === "UnaryExpression" && n.operator === "!") {
        walk3(n.argument, true);
        return;
      }
      if (n.type === "ConditionalExpression") {
        walk3(n.test, true);
        walk3(n.consequent, booleanContext);
        walk3(n.alternate, booleanContext);
        return;
      }
      if (n.type === "LogicalExpression" && ["&&", "||"].includes(String(n.operator))) {
        walk3(n.left, true);
        walk3(n.right, booleanContext);
        return;
      }
      for (const child of Object.values(n))
        if (child && typeof child === "object")
          walk3(child);
    };
    for (const span of bindingSpans(value2)) {
      try {
        walk3(parseExpression(span.body), c.type === "Button");
      } catch {
      }
    }
    if (found.size)
      warnings.push(`${c.type} "${c.name ?? c.id}" ${key3} tests the selectedRow object from ${[...found].map((n) => JSON.stringify(n)).join(", ")} as a boolean. An unselected/refreshed Table can return {}, which is truthy. Check the real record's stable key (for example selectedRow?.id != null) and show the empty-selection state; do not infer selection from the object itself. Verify the guard after filtering or refreshing the queue.`);
  }
  return warnings;
}
var value = (o, key3) => {
  const v = o?.[key3];
  return v && typeof v === "object" && "value" in v ? v.value : v;
};
var positive = (v) => {
  if (typeof v === "number")
    return v > 0;
  if (typeof v !== "string")
    return false;
  const literal = v.replace(/^\{\{\s*(\d*\.?\d+)\s*\}\}$/, "$1");
  return /^\s*\d*\.?\d+(?:px|em|rem|%)?\s*$/.test(literal) && parseFloat(literal) > 0;
};
function horizontal2(style, key3) {
  const parts = (style[key3] ?? "").trim().split(/\s+/);
  return positive(parts.length === 1 ? parts[0] : parts[1]) || positive(parts[3]) || positive(style[key3 + "-left"]) || positive(style[key3 + "-right"]) || positive(style[key3 + "-inline"]) || positive(style[key3 + "-inline-start"]) || positive(style[key3 + "-inline-end"]);
}
function concatenatedMarkup(body) {
  let ast;
  try {
    ast = parseExpression(body);
  } catch {
    return;
  }
  if (ast.type !== "StringLiteral" && ast.type !== "TemplateLiteral" && !(ast.type === "BinaryExpression" && ast.operator === "+"))
    return;
  const render = (n) => n.type === "StringLiteral" ? n.value ?? "" : n.type === "TemplateLiteral" ? (n.quasis ?? []).map((q) => q.value.cooked ?? "").join("VALUE") : n.type === "BinaryExpression" && n.operator === "+" ? render(n.left) + render(n.right) : "VALUE";
  return render(ast);
}
function lintSurfaceInsets(c) {
  if (c.type === "Html") {
    const raw2 = value(c.properties, "rawHtml");
    if (typeof raw2 !== "string")
      return [];
    const roots = parseHtml(stripHtmlBindings(raw2).html).children.filter((n) => n.tag !== "#text" || n.text.trim());
    if (roots.length !== 1 || roots[0].tag === "#text")
      return [];
    const root = roots[0];
    if (!horizontal2(root.style, "padding") && !horizontal2(root.style, "margin"))
      return [];
    const paintedChild = root.children.some((n) => n.tag !== "#text" && (n.style.background || n.style["background-color"] || n.style.border));
    if (!paintedChild)
      return [];
    return [`Html "${c.name ?? c.id}": the background-covering root has horizontal padding/margin around a painted child surface. This shrinks its visible edges inside the component box. If it should align with adjacent native surfaces, keep the root horizontal inset at zero and put text padding inside the painted child. Preserve intentional insets/shadow clearance when browser-verified; this is advisory, not a full-width requirement.`];
  }
  if (c.type !== "Text")
    return [];
  const background = value(c.styles, "backgroundColor");
  if (typeof background !== "string" || !background.trim() || /transparent|^#(?:[0-9a-f]{6}00|0000)$|^rgba\([^)]*,\s*0\s*\)/i.test(background))
    return [];
  const radius = value(c.styles, "borderRadius");
  if (!positive(radius))
    return [];
  const alignment = value(c.styles, "textAlign");
  if (alignment != null && !["left", "start", ""].includes(String(alignment)))
    return [];
  const raw = value(c.properties, "text");
  if (typeof raw !== "string" || !raw.trim())
    return [];
  let markup = raw;
  for (const span of [...bindingSpans(raw)].reverse()) {
    if (!/<[a-z]/i.test(span.body))
      continue;
    const known = concatenatedMarkup(span.body);
    if (known === void 0)
      return [];
    markup = markup.slice(0, span.start) + known + markup.slice(span.end);
  }
  const tree = parseHtml(stripHtmlBindings(markup).html);
  const unknownOrInset = (n) => Boolean(n.attrs.class || n.style["text-indent"] || ["padding", "padding-inline", "padding-inline-start", "padding-inline-end", "padding-left", "padding-right", "margin", "margin-inline", "margin-left", "margin-right"].some((k) => n.style[k] && !/^0(?:px)?$/.test(n.style[k])) || ["center", "right", "end"].includes(n.style["text-align"] ?? "") || n.children.some(unknownOrInset));
  if (unknownOrInset(tree))
    return [];
  return [`Text "${c.name ?? c.id}": left-aligned text sits on a rounded colored surface without an authored content inset. Native Text's styles.padding does not add inner text padding. Use padded HTML content (with enough height), inset native Text within a Container, or center a compact metric when appropriate. Keep transparent headings/plain labels unchanged; verify the visible text-to-card edge spacing.`];
}
var isNode2 = (value2) => !!value2 && typeof value2 === "object" && typeof value2.type === "string";
var isMember = (value2) => isNode2(value2) && ["MemberExpression", "OptionalMemberExpression"].includes(value2.type);
function memberName(node2) {
  const property = node2.property;
  if (!isNode2(property))
    return void 0;
  if (!node2.computed && property.type === "Identifier")
    return String(property.name);
  if (node2.computed && property.type === "StringLiteral")
    return String(property.value);
  return void 0;
}
function bindsComponents(value2) {
  if (!isNode2(value2))
    return false;
  if (value2.type === "Identifier")
    return value2.name === "components";
  if (value2.type === "RestElement")
    return bindsComponents(value2.argument);
  if (value2.type === "AssignmentPattern")
    return bindsComponents(value2.left);
  if (value2.type === "ArrayPattern")
    return value2.elements.some(bindsComponents);
  if (value2.type === "ObjectPattern")
    return value2.properties.some((p) => bindsComponents(p.type === "RestElement" ? p.argument : p.value));
  return false;
}
function lintComponentStateBindings(value2, components, path) {
  if (Array.isArray(value2))
    return value2.flatMap((child, i) => lintComponentStateBindings(child, components, `${path}[${i}]`));
  if (value2 && typeof value2 === "object")
    return Object.entries(value2).flatMap(([key3, child]) => lintComponentStateBindings(child, components, `${path}.${key3}`));
  if (typeof value2 !== "string")
    return [];
  const binding = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  let root;
  if (binding) {
    try {
      root = parseExpression(binding[1]);
    } catch {
      return [];
    }
  } else if (/\.code$/.test(path)) {
    try {
      root = parse(value2, { sourceType: "script", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }).program;
    } catch {
      return [];
    }
  } else
    return [];
  const wrongNames = /* @__PURE__ */ new Set();
  let shadowed = false;
  const visit = (node2) => {
    if (Array.isArray(node2)) {
      node2.forEach(visit);
      return;
    }
    if (!isNode2(node2))
      return;
    if (node2.type === "VariableDeclarator" && bindsComponents(node2.id) || /^(Function|Class)(Declaration|Expression)$/.test(node2.type) && bindsComponents(node2.id) || Array.isArray(node2.params) && node2.params.some(bindsComponents) || node2.type === "CatchClause" && bindsComponents(node2.param) || node2.type === "WithStatement" || node2.type === "CallExpression" && isNode2(node2.callee) && node2.callee.type === "Identifier" && node2.callee.name === "eval")
      shadowed = true;
    const prop2 = isMember(node2) ? memberName(node2) : void 0;
    if (prop2 && isMember(node2.object)) {
      const owner = node2.object;
      if (isNode2(owner.object) && owner.object.type === "Identifier" && owner.object.name === "components") {
        const name = memberName(owner);
        const type = name ? components.find((c) => c.name === name)?.type : void 0;
        if (name && type && WRONG_ALIASES[type]?.[prop2])
          wrongNames.add(`${name}\0${type}\0${prop2}`);
      }
    }
    Object.values(node2).forEach(visit);
  };
  visit(root);
  return shadowed ? [] : [...wrongNames].map((key3) => {
    const [name, type, prop2] = key3.split("\0");
    return `${path}: ${WRONG_ALIASES[type][prop2](name)}`;
  });
}
var WRONG_ALIASES = {
  Kanban: {
    selectedCard: (name) => `Kanban "${name}" does not expose selectedCard. Use components.${name}.lastSelectedCard after onCardSelected; the incorrect alias is undefined and opens an empty detail form. Keep the selected record id and raw fields for edits.`
  },
  // A claims build filtered its queue on a radio's label, the caption "Type", so no row matched (2026-10-04).
  RadioButtonV2: {
    label: (name) => `RadioButton "${name}": label is the field's caption, not the chosen option, so a filter or write reading it matches nothing. Read components.${name}.value for the selection.`
  },
  // Widgets/ReorderableList/ReorderableList.jsx publishes values, including before onChange; never value.
  ReorderableList: {
    value: (name) => `ReorderableList "${name}" does not expose value. Use components.${name}.values for the ordered option values; the incorrect alias is undefined, even with optional chaining or a fallback.`
  },
  // MultiselectV2.jsx setInputValue publishes values before onSelect; DropdownV2's scalar value is different.
  MultiselectV2: {
    value: (name) => `MultiselectV2 "${name}" does not expose value. Use components.${name}.values for the selected option values; the incorrect alias is undefined, even with optional chaining or a fallback. An empty selection is [].`
  }
};
var cached;
var normalizedName = (value2) => value2.trim().replace(/^icon/i, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
function icons() {
  if (cached)
    return cached;
  const catalog = JSON.parse(readFileSync(new URL("../data/page-icons.json", import.meta.url), "utf8"));
  if (catalog.package !== "@tabler/icons-react" || !catalog.version || !Array.isArray(catalog.names) || !catalog.names.length || !catalog.names.every((name) => typeof name === "string" && /^Icon[A-Za-z0-9]+$/.test(name))) {
    throw new Error("Invalid page icon catalog; regenerate data/page-icons.json from ToolJet frontend dependencies.");
  }
  const aliases = /* @__PURE__ */ new Map();
  for (const name of catalog.names) {
    const key3 = normalizedName(name);
    aliases.set(key3, [...aliases.get(key3) ?? [], name]);
  }
  return cached = { catalog, names: new Set(catalog.names), aliases };
}
function pageIconError(value2) {
  const { catalog, names, aliases } = icons();
  if (typeof value2 === "string" && names.has(value2))
    return void 0;
  const suggestions = typeof value2 === "string" && value2.length <= 128 ? aliases.get(normalizedName(value2))?.slice(0, 3) : void 0;
  const correction = suggestions?.length ? ` Use ${suggestions.map((name) => JSON.stringify(name)).join(" or ")}.` : ' Use an exact exported Tabler name such as "IconLayoutDashboard", "IconUsers" or "IconChartBar".';
  const label2 = typeof value2 === "string" ? JSON.stringify(value2.slice(0, 128)) : String(value2);
  return `Invalid page icon ${label2}: not in the ToolJet @tabler/icons-react@${catalog.version} catalog.` + correction + " Invalid names render a generic fallback icon; names are case-sensitive, not kebab-case. If the deployment uses newer icons, refresh the catalog from its frontend dependencies.";
}
function assertPageIcon(value2, context) {
  const error = pageIconError(value2);
  if (error)
    throw new Error(`${context}: ${error}`);
}
var pageIconSchema = external_exports.string().min(1).superRefine((value2, ctx) => {
  const error = pageIconError(value2);
  if (error)
    ctx.addIssue({ code: "custom", message: error });
}).describe("Exact case-sensitive Tabler React export, e.g. IconLayoutDashboard, IconUsers, IconChartLine. Not layout-dashboard/users/chart-line.");
function lintBindingSyntax(value2, path, wholeValueRequired = false) {
  if (Array.isArray(value2))
    return value2.flatMap((child, index) => lintBindingSyntax(child, `${path}[${index}]`, wholeValueRequired));
  if (value2 && typeof value2 === "object") {
    return Object.entries(value2).flatMap(([key3, child]) => lintBindingSyntax(child, `${path}.${key3}`, wholeValueRequired));
  }
  if (typeof value2 !== "string")
    return [];
  const multiline = multilineBindings(value2);
  if (multiline.length) {
    return multiline.map((snippet) => `${path}: a {{ }} binding contains a line break (${snippet}); ToolJet evaluates bindings as one line and renders a multi-line one as empty. Put the expression on a single line, or compute the value in a JavaScript query / transformation and bind {{queries.name.data}}.`);
  }
  const match = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!match) {
    return wholeValueRequired && value2.includes("{{") ? [`${path}: expected one whole-value JavaScript binding, without text before or after {{...}}; this property is not an interpolated text field.`] : [];
  }
  if (match[1].includes("}}") && !match[1].includes("{{")) {
    return [`${path}: the binding contains "}}" before its end; ToolJet ends a binding at the first "}}", so the code is cut there and the value renders empty. Put a space between adjacent closing braces ("} }") inside the expression.`];
  }
  if (!wholeValueRequired && (match[1].includes("{{") || match[1].includes("}}")))
    return [];
  try {
    new Function(`return (
${match[1]}
);`);
    return [];
  } catch (error) {
    if (!(error instanceof SyntaxError))
      return [];
    return [`${path}: invalid JavaScript binding syntax (${error.message}). Fix the expression before saving; a failed binding can render as empty data. This check does not execute the expression.`];
  }
}
function multilineBindings(value2) {
  const found = [];
  let from = 0;
  for (; ; ) {
    const open = value2.indexOf("{{", from);
    if (open === -1)
      break;
    const close = value2.indexOf("}}", open + 2);
    if (close === -1)
      break;
    const body = value2.slice(open + 2, close);
    if (/[\r\n]/.test(body))
      found.push(JSON.stringify(body.trim().slice(0, 40)) + (body.trim().length > 40 ? "\u2026" : ""));
    from = close + 2;
  }
  return found;
}
var member2 = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var rootRef = (n) => {
  if (!member2(n) || !["components", "queries"].includes(n.object?.name) || n.object?.type !== "Identifier")
    return;
  const k = key(n);
  return k ? `${n.object.name}.${k}` : void 0;
};
function walk(n, visit) {
  if (!n || typeof n !== "object")
    return;
  if (Array.isArray(n)) {
    for (const child of n)
      walk(child, visit);
    return;
  }
  visit(n);
  for (const [key3, value2] of Object.entries(n))
    if (!["loc", "extra", "comments"].includes(key3))
      walk(value2, visit);
}
function lintUntrackedReactiveBindings(value2, label2) {
  if (Array.isArray(value2))
    return value2.flatMap((v) => lintUntrackedReactiveBindings(v, label2));
  if (value2 && typeof value2 === "object")
    return Object.values(value2).flatMap((v) => lintUntrackedReactiveBindings(v, label2));
  if (typeof value2 !== "string")
    return [];
  const match = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!match)
    return [];
  let ast;
  try {
    ast = parseExpression(match[1]);
  } catch {
    return [];
  }
  const tracked = /* @__PURE__ */ new Set(), suspects = /* @__PURE__ */ new Set();
  let shadowed = false;
  walk(ast, (n) => {
    if (n.params && /"(?:components|queries)"/.test(JSON.stringify(n.params)) || n.type === "VariableDeclarator" && /"(?:components|queries)"/.test(JSON.stringify(n.id)))
      shadowed = true;
    if (!member2(n))
      return;
    const direct = rootRef(n.object);
    if (direct && key(n))
      tracked.add(direct);
    if (n.object?.type === "LogicalExpression" && ["||", "??"].includes(n.object.operator)) {
      const wrapped = rootRef(n.object.left);
      if (wrapped && key(n))
        suspects.add(wrapped);
    }
  });
  if (shadowed)
    return [];
  return [...suspects].filter((ref) => !tracked.has(ref)).map((ref) => `${label2}: a logical fallback wraps ${ref} before its exposed value is read. ToolJet cannot track this dependency, so filters/prefill may stay stale. Keep a complete optional chain, e.g. ${ref}?.value (use the actual exposed property). Valid JavaScript alone does not guarantee reactive updates. No expression was rewritten.`);
}
function lintQueryArrayMutations(value2, label2) {
  if (Array.isArray(value2))
    return value2.flatMap((v) => lintQueryArrayMutations(v, label2));
  if (value2 && typeof value2 === "object")
    return Object.values(value2).flatMap((v) => lintQueryArrayMutations(v, label2));
  if (typeof value2 !== "string")
    return [];
  const match = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!match)
    return [];
  let ast;
  try {
    ast = parseExpression(match[1]);
  } catch {
    return [];
  }
  let shadowed = false;
  const mutations = /* @__PURE__ */ new Set();
  const queryData = (n) => {
    if (n?.type === "LogicalExpression" && ["||", "??"].includes(n.operator) && n.right?.type === "ArrayExpression" && n.right.elements.length === 0)
      return queryData(n.left);
    const ref = member2(n) && key(n) === "data" ? rootRef(n.object) : void 0;
    return ref?.startsWith("queries.") ? ref : void 0;
  };
  walk(ast, (n) => {
    if (n.params && /"queries"/.test(JSON.stringify(n.params)) || n.type === "VariableDeclarator" && /"queries"/.test(JSON.stringify(n.id)))
      shadowed = true;
    if (!["CallExpression", "OptionalCallExpression"].includes(n.type) || !member2(n.callee) || !["sort", "reverse"].includes(key(n.callee)))
      return;
    const ref = queryData(n.callee.object);
    if (ref)
      mutations.add(`${ref}.data.${key(n.callee)}`);
  });
  if (shadowed)
    return [];
  return [...mutations].map((ref) => `${label2}: ${ref}() mutates the shared query array inside a display binding. ToolJet state can be frozen, so this may throw and render an empty table even when the query has rows. Copy first with slice() or a spread, then sort/reverse the copy; a prior map/filter already creates a new array. No expression was rewritten.`);
}
var node = (v) => v !== null && typeof v === "object" && !Array.isArray(v) ? v : void 0;
var member3 = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
function key2(n) {
  if (!n)
    return;
  const p = node(n.property ?? n.key);
  if (!n.computed && p?.type === "Identifier")
    return String(p.name);
  if (p?.type === "StringLiteral")
    return String(p.value);
}
function expression(value2) {
  if (typeof value2 !== "string")
    return;
  const m = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!m)
    return;
  try {
    return parseExpression(m[1]);
  } catch {
    return;
  }
}
function walk2(value2, visit) {
  if (Array.isArray(value2)) {
    for (const child of value2)
      walk2(child, visit);
    return;
  }
  const n = node(value2);
  if (!n)
    return;
  visit(n);
  for (const [k, child] of Object.entries(n)) {
    if (k !== "loc" && k !== "extra" && k !== "comments")
      walk2(child, visit);
  }
}
function projectedFields(c) {
  if (c.type !== "Table")
    return;
  const raw = c.properties?.data;
  const root = expression(node(raw) && "value" in node(raw) ? node(raw).value : raw);
  if (root?.type !== "CallExpression")
    return;
  const callee = node(root.callee);
  if (!member3(callee) || key2(callee) !== "map")
    return;
  const args = root.arguments;
  if (!Array.isArray(args) || args.length !== 1)
    return;
  const callback = node(args[0]);
  if (callback?.type !== "ArrowFunctionExpression")
    return;
  const body = node(callback.body);
  if (body?.type !== "ObjectExpression" || !Array.isArray(body.properties))
    return;
  const keys = /* @__PURE__ */ new Map();
  for (const prop2 of body.properties) {
    const p = node(prop2);
    if (p?.type !== "ObjectProperty" || p.computed)
      return;
    const name = key2(p);
    if (name === void 0 || name === "__proto__")
      return;
    keys.set(name, node(p.value));
  }
  return keys;
}
function lintSelectedRowProjections(components, extraSources = []) {
  const tables = /* @__PURE__ */ new Map();
  for (const c of components) {
    if (!c.name)
      continue;
    tables.set(c.name, tables.has(c.name) ? void 0 : projectedFields(c));
  }
  const aliases = /* @__PURE__ */ new Map();
  const singleAlias = (alias) => {
    const names = aliases.get(alias);
    return names?.size === 1 ? [...names][0] : void 0;
  };
  for (const source of extraSources) {
    const action = node(source.value);
    if (action?.actionId !== "set-custom-variable" || typeof action.key !== "string")
      continue;
    const selected = expression(action.value);
    if (action.value === null || selected?.type === "NullLiteral")
      continue;
    const table = node(selected?.object), namespace = node(table?.object);
    const name = member3(selected) && key2(selected) === "selectedRow" && member3(table) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(table) : void 0;
    if (!name)
      aliases.set(action.key, void 0);
    else if (!aliases.has(action.key))
      aliases.set(action.key, /* @__PURE__ */ new Set([name]));
    else
      aliases.get(action.key)?.add(name);
  }
  if (extraSources.some((s) => /actions\s*(?:\.\s*(?:setVariable|unsetVariable)|\[\s*["'](?:setVariable|unsetVariable)["']\s*\])/.test(JSON.stringify(s.value))))
    aliases.clear();
  const warnings = /* @__PURE__ */ new Set();
  const aliasOmissions = /* @__PURE__ */ new Map();
  function inspect(value2, label2) {
    if (Array.isArray(value2)) {
      for (const v of value2)
        inspect(v, label2);
      return;
    }
    if (node(value2)) {
      for (const v of Object.values(node(value2)))
        inspect(v, label2);
      return;
    }
    const root = expression(value2);
    if (!root)
      return;
    let shadowed = false;
    walk2(root, (n) => {
      if (Array.isArray(n.params) && /"(?:components|variables)"/.test(JSON.stringify(n.params)))
        shadowed = true;
      if (n.type === "VariableDeclarator" && /"(?:components|variables)"/.test(JSON.stringify(n.id)))
        shadowed = true;
    });
    if (shadowed)
      return;
    walk2(root, (n) => {
      if (!member3(n))
        return;
      const field = key2(n), selection = node(n.object), table = node(selection?.object), namespace = node(table?.object);
      if (field && member3(selection) && table?.type === "Identifier" && table.name === "variables") {
        const alias = key2(selection), names = alias ? aliases.get(alias) : void 0;
        for (const name2 of names ?? []) {
          const fields = tables.get(name2);
          if (fields && !fields.has(field) && !["toString", "valueOf", "constructor", "hasOwnProperty", "__proto__", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"].includes(field)) {
            const id = JSON.stringify([alias, name2]);
            if (!aliasOmissions.has(id))
              aliasOmissions.set(id, { alias, table: name2, fields: /* @__PURE__ */ new Set() });
            aliasOmissions.get(id).fields.add(field);
          }
        }
      }
      if (!field || !member3(selection) || key2(selection) !== "selectedRow" || !member3(table) || namespace?.type !== "Identifier" || namespace.name !== "components")
        return;
      const name = key2(table), keys = name ? tables.get(name) : void 0;
      if (!name || !keys || keys.has(field) || ["toString", "valueOf", "constructor", "hasOwnProperty", "__proto__", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"].includes(field))
        return;
      warnings.add(`${label2}: reads components.${name}.selectedRow.${field}, but Table "${name}" has a closed map projection that omits "${field}". Preserve the raw field in the row (hide its column if needed), or look up the source record by its stable id. Check edit/review prefill and avoid overwriting omitted values with blanks. If the missing-field fallback is intentional, no change is required.`);
    });
  }
  for (const c of components) {
    const value2 = { p: c.properties, s: c.styles }, label2 = `Component "${c.name ?? c.id ?? "?"}"`;
    inspect(value2, label2);
    for (const warning of lintUntrackedReactiveBindings(value2, label2))
      warnings.add(warning);
    for (const warning of lintQueryArrayMutations(value2, label2))
      warnings.add(warning);
  }
  for (const source of extraSources)
    inspect(source.value, source.label);
  for (const { alias, table, fields } of aliasOmissions.values()) {
    warnings.add(`Bindings read ${[...fields].map((field) => `variables.${alias}.${field}`).join(", ")}; an event assigns that variable from Table "${table}" selectedRow, whose closed map projection omits ${[...fields].map((field) => `"${field}"`).join(", ")}. This edit can overwrite missing values with a blank/false default. Preserve raw fields or resolve the raw record by stable id before opening the editor; generate_edit_contract can provide that snapshot. Unknown runtime writes are not certified by this advisory.`);
  }
  const unwrap2 = (value2) => node(value2) && "value" in node(value2) ? node(value2).value : value2;
  for (const c of components) {
    if (!["TextInput", "TextArea", "EmailInput", "PhoneInput"].includes(c.type ?? ""))
      continue;
    let selected = expression(unwrap2(c.properties?.value));
    if (selected?.type === "LogicalExpression" && ["||", "??"].includes(String(selected.operator)))
      selected = node(selected.left);
    if (!member3(selected))
      continue;
    const field = key2(selected), selection = node(selected?.object), owner = node(selection?.object), namespace = node(owner?.object);
    if (!field || !member3(selection))
      continue;
    const tableName = owner?.type === "Identifier" && owner.name === "variables" ? singleAlias(key2(selection) ?? "") : key2(selection) === "selectedRow" && member3(owner) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(owner) : void 0;
    const projected = tableName ? tables.get(tableName)?.get(field) : void 0;
    if (projected?.type !== "LogicalExpression" || !["||", "??"].includes(String(projected.operator)))
      continue;
    const fallback = node(projected.right);
    if (fallback?.type !== "StringLiteral" || !String(fallback.value).trim())
      continue;
    warnings.add(`Component "${c.name ?? c.id ?? "?"}": editable value reads "${field}" from Table "${tableName}", whose projection replaces missing raw text with a non-empty display fallback. Saving another field can persist that label as real data. Keep raw text separate from display labels, or resolve the raw record by stable id; preserve untouched null/empty values. This is advisory, not a claim that every fallback is unintended.`);
  }
  for (const c of components) {
    const property = c.type === "DatePickerV2" ? "defaultValue" : ["NumberInput", "CurrencyInput"].includes(c.type ?? "") ? "value" : void 0;
    if (!property)
      continue;
    let selected = expression(unwrap2(c.properties?.[property]));
    if (selected?.type === "LogicalExpression" && ["||", "??"].includes(String(selected.operator)))
      selected = node(selected.left);
    if (!member3(selected))
      continue;
    const field = key2(selected), selection = node(selected?.object), table = node(selection?.object), namespace = node(table?.object);
    if (!field || !member3(selection))
      continue;
    const tableName = table?.type === "Identifier" && table.name === "variables" ? singleAlias(key2(selection) ?? "") : key2(selection) === "selectedRow" && member3(table) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(table) : void 0;
    const value2 = tableName ? tables.get(tableName)?.get(field) : void 0;
    if (!value2)
      continue;
    const formats = [];
    let localizedNumber = false;
    walk2(value2, (n) => {
      if (n.type !== "CallExpression")
        return;
      const callee = node(n.callee);
      if (!member3(callee))
        return;
      if (key2(callee) === "toLocaleString" || key2(callee) === "toFixed")
        localizedNumber = true;
      const args = n.arguments;
      if (key2(callee) === "format" && Array.isArray(args) && node(args[0])?.type === "StringLiteral")
        formats.push(String(node(args[0]).value));
    });
    const expected = unwrap2(c.properties?.dateFormat) ?? "DD/MM/YYYY";
    if (c.type === "DatePickerV2" && member3(value2) && typeof expected === "string" && !expected.includes("{{")) {
      const source = components.find((t) => t.type === "Table" && t.name === tableName);
      const columns = unwrap2(source?.properties?.columns);
      const matches = Array.isArray(columns) ? columns.filter((col) => {
        const entry = node(col);
        return entry?.key === field && entry.columnType === "datepicker";
      }) : [];
      const parseFormat = matches.length === 1 ? node(matches[0])?.parseDateFormat : void 0;
      const yearLast = /^(?:D{1,2}[^A-Za-z]+M{1,4}|M{1,4}[^A-Za-z]+D{1,2})[^A-Za-z]+Y{2,4}$/.test(expected);
      if (typeof parseFormat === "string" && parseFormat.startsWith("YYYY-MM-DD") && !parseFormat.includes("{{") && yearLast) {
        warnings.add(`Component "${c.name ?? c.id ?? "?"}": defaultValue reads raw ${tableName}.selectedRow.${field}; that Table column declares parseDateFormat "${parseFormat}", but the DatePickerV2 parses its default with dateFormat "${expected}". A name-only edit can silently change the date. Match the editor's input format or explicitly format the raw default before opening it; table display formatting does not convert selectedRow. Advisory only: verify the actual source value before changing it.`);
      }
    }
    if (c.type === "DatePickerV2" && formats.some((f) => typeof expected === "string" && !expected.includes("{{") && f !== expected) || c.type !== "DatePickerV2" && localizedNumber) {
      warnings.add(`Component "${c.name ?? c.id ?? "?"}": ${property} reads display-formatted ${tableName}.selectedRow.${field} into a typed ${c.type} editor${c.type === "DatePickerV2" ? ` (dateFormat ${String(expected)})` : ""}. Look up the raw record by stable id, or explicitly convert to the editor's input format. Preserve untouched fields on save; generate_edit_contract can provide raw-record defaults and changed-field-only payloads.`);
    }
  }
  return [...warnings];
}
function dropdownSelfDefaultWarning(value2, name) {
  if (typeof value2 !== "string")
    return [];
  const binding = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding)
    return [];
  let root;
  try {
    root = parseExpression(binding[1]);
  } catch {
    return [];
  }
  const member4 = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
  const key3 = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
  const readsSelf = (n) => {
    if (!n || typeof n !== "object")
      return false;
    if (/Function/.test(n.type ?? ""))
      return false;
    if (member4(n) && key3(n) === "value" && member4(n.object) && key3(n.object) === name && n.object.object?.type === "Identifier" && n.object.object.name === "components")
      return true;
    return Object.values(n).some((v) => Array.isArray(v) ? v.some(readsSelf) : v && typeof v === "object" && readsSelf(v));
  };
  let self = false;
  const option = (n) => {
    if (n?.type !== "ObjectExpression" || n.properties.some((p) => p.type !== "ObjectProperty" || p.computed))
      return;
    const defaults = n.properties.filter((p) => (p.key?.name ?? p.key?.value) === "default");
    if (defaults.length === 1 && readsSelf(defaults[0].value))
      self = true;
  };
  const list = (n) => {
    if (n?.type === "ArrayExpression")
      n.elements.forEach(option);
    else if (n?.type === "CallExpression" && member4(n.callee) && !n.callee.computed) {
      if (n.callee.property?.name === "concat") {
        list(n.callee.object);
        n.arguments.forEach(list);
      } else if (n.callee.property?.name === "map" && n.arguments.length === 1) {
        const callback = n.arguments[0];
        if (callback?.type === "ArrowFunctionExpression" && callback.params.every((p) => p.type === "Identifier" && p.name !== "components"))
          option(callback.body);
      }
    }
  };
  list(root);
  return self ? [`DropdownV2 "${name}": option.default reads this dropdown's own value. This does not initialize it from an existing record and can leave edit fields blank or stale when switching records. For record editing compare option.value with the raw record/draft field, preserving ID types and null; or verify explicit initialization/reset events before every edit. A missing selection must not silently clear a stored relationship. Advisory only: intentional event-driven initialization is not verified.`] : [];
}
function dropdownDefaultVisibilityWarning(value2, label2) {
  let missing = false;
  if (Array.isArray(value2)) {
    missing = value2.some((option) => option && typeof option === "object" && option.default === true && !Object.prototype.hasOwnProperty.call(option, "visible"));
  } else if (typeof value2 === "string") {
    const binding = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!binding)
      return [];
    let root;
    try {
      root = parseExpression(binding[1]);
    } catch {
      return [];
    }
    const option = (entry) => {
      if (entry?.type !== "ObjectExpression")
        return;
      if (entry.properties.some((p) => p.type !== "ObjectProperty" || p.computed))
        return;
      const properties = entry.properties;
      const name = (p) => p.key?.name ?? p.key?.value;
      const defaults = properties.filter((p) => name(p) === "default");
      if (defaults.length !== 1 || properties.some((p) => name(p) === "visible"))
        return;
      const d = defaults[0].value;
      if (d.type === "BooleanLiteral" && d.value === false || d.type === "NullLiteral")
        return;
      missing = true;
    };
    if (root.type === "ArrayExpression")
      root.elements.forEach(option);
    else if (root.type === "CallExpression" && root.callee?.type === "MemberExpression" && !root.callee.computed && root.callee.property?.name === "map" && root.arguments.length === 1) {
      const callback = root.arguments[0];
      if (callback?.type === "ArrowFunctionExpression")
        option(callback.body);
    }
  }
  return missing ? [`DropdownV2 "${label2}": an option declares a default but omits visible. ToolJet's default lookup requires visible:true even though the menu displays options with omitted visibility. Set visible:true on selectable default options; preserve intentional hidden options. Otherwise edit preselection can appear blank. This is advisory; unknown dynamic option sources are not verified.`] : [];
}
var COMPONENT_SLOT_NAMES = ["body", "header", "footer", "modal"];
var TAB_SLOT = /^tab-(t\d+)$/;
var TAB_CANVAS_SUFFIX = /-(t\d+)$/;
function isComponentSlotName(value2) {
  return typeof value2 === "string" && (COMPONENT_SLOT_NAMES.includes(value2) || TAB_SLOT.test(value2));
}
function isTabSlot(value2) {
  return typeof value2 === "string" && TAB_SLOT.test(value2);
}
var componentSlotSchema = external_exports.union([external_exports.enum(COMPONENT_SLOT_NAMES), external_exports.string().regex(TAB_SLOT)]);
var ENCODED_SLOT_SUFFIXES = ["header", "footer", "modal"];
function encodeComponentParent(parentId, slotName) {
  if (!slotName)
    return parentId;
  if (slotName === "body")
    return decodeComponentParent(parentId).parentId;
  const base = decodeComponentParent(parentId).parentId;
  const tab = TAB_SLOT.exec(slotName);
  return tab ? `${base}-${tab[1]}` : `${base}-${slotName}`;
}
function decodeComponentParent(parentId) {
  for (const slotName of ENCODED_SLOT_SUFFIXES) {
    const suffix = `-${slotName}`;
    if (parentId.endsWith(suffix)) {
      return { parentId: parentId.slice(0, -suffix.length), slotName };
    }
  }
  const tab = TAB_CANVAS_SUFFIX.exec(parentId);
  if (tab)
    return { parentId: parentId.slice(0, -tab[0].length), slotName: `tab-${tab[1]}` };
  return { parentId, slotName: "body" };
}
var FORM_SCHEMA_FIELD_TYPES = [
  "textinput",
  "textarea",
  "dropdown",
  "multiselect",
  "number",
  "emailinput",
  "password",
  "datepicker",
  "checkbox",
  "radio",
  "toggle",
  "starrating",
  "filepicker"
];
var FORM_SCHEMA_FIELD_TYPE_SET = new Set(FORM_SCHEMA_FIELD_TYPES);
var SAFE_GENERATED_FORM_FIELD_TYPES = [
  "textinput",
  "number",
  "emailinput",
  "password",
  "datepicker",
  "checkbox"
];
var SAFE_GENERATED_FORM_FIELD_TYPE_SET = new Set(SAFE_GENERATED_FORM_FIELD_TYPES);
var STYLE_KEYS_IN_PROPERTIES = /* @__PURE__ */ new Set([
  "styles",
  "textSize",
  "fontWeight",
  "textColor",
  "backgroundColor",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "textAlign",
  "fontVariant",
  "padding",
  "accentColor",
  "iconColor"
]);
var PROPERTY_KEY_ALIASES = {
  disabled: "disabledState",
  isdisabled: "disabledState",
  fontsize: "textSize",
  font_size: "textSize",
  size: "textSize",
  fontcolor: "textColor",
  fontcolour: "textColor",
  color: "textColor",
  colour: "textColor",
  textcolour: "textColor",
  bgcolor: "backgroundColor",
  bgcolour: "backgroundColor",
  background: "backgroundColor",
  background_color: "backgroundColor",
  backgroundcolour: "backgroundColor",
  bordercolour: "borderColor",
  weight: "fontWeight",
  align: "textAlign"
};
var VALID_HEADER_CASING = /* @__PURE__ */ new Set(["none", "uppercase"]);
var DEPRECATED_TABLE_COLUMN_TYPES = {
  default: "string",
  badge: "newMultiSelect",
  badges: "newMultiSelect",
  tags: "tagsV2",
  dropdown: "select",
  radio: "select",
  toggle: "select",
  multiselect: "newMultiSelect"
};
var VALID_TABLE_COLUMN_TYPES = /* @__PURE__ */ new Set([
  "string",
  "number",
  "text",
  "datepicker",
  "select",
  "newMultiSelect",
  "tagsV2",
  "boolean",
  "image",
  "link",
  "json",
  "markdown",
  "html",
  "rating",
  "button"
]);
var FORM_INPUT_TYPES = /* @__PURE__ */ new Set([
  "TextInput",
  "NumberInput",
  "CurrencyInput",
  "PasswordInput",
  "EmailInput",
  "PhoneInput",
  "TextArea",
  "DropdownV2",
  "MultiselectV2",
  "DatePickerV2",
  "DatetimePickerV2",
  "TimePicker",
  "TreeSelect",
  "RadioButtonV2"
]);
var TOP_ALIGNED_INPUT_TYPES = /* @__PURE__ */ new Set([
  "TextInput",
  "PasswordInput",
  "EmailInput",
  "PhoneInput",
  "CurrencyInput",
  "NumberInput",
  "DropdownV2",
  "MultiselectV2",
  "Cascader",
  "RadioButtonV2",
  "DatetimePickerV2",
  "Checkbox",
  "ToggleSwitchV2",
  "DatePickerV2",
  "TimePicker",
  "DaterangePicker",
  "TextArea",
  "StarRating",
  "TagsInput",
  "ColorPicker",
  "ButtonGroupV2"
]);
var TOP_ALIGNMENT_HEIGHT_INCREMENT = 20;
var NARROW_SIDE_LABEL_COLS = 18;
var STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS = 9;
var STATISTICS_WITH_SECONDARY_MIN_WIDTH_COLS = 18;
var STATISTICS_VALUE_ONLY_WITH_ICON_MIN_WIDTH_COLS = 18;
var STATISTICS_SAFE_VALUE_FONT_PX = 22;
var TABLE_REGULAR_ROW_HEIGHT_PX = 45;
var TABLE_CONDENSED_ROW_HEIGHT_PX = 42;
var TABLE_COLUMN_HEADER_HEIGHT_PX = 34;
var TABLE_TOOLBAR_HEIGHT_PX = 56;
var TABLE_FOOTER_HEIGHT_PX = 46;
var TABLE_BORDER_PX = 2;
var TABLE_VISIBLE_COLUMN_WARN = 10;
var SLOT_PARENT_TYPES = /* @__PURE__ */ new Set(["ModalV2", "Form", "Container", "Accordion"]);
var CANVAS_COLUMN_PX = 28;
var CONTENT_COLUMNS = 39;
var TABLE_UNSIZED_COLUMN_MIN_PX = 100;
var KANBAN_CARD_WIDTH_PX = 300;
var KANBAN_CARD_CHILD_MIN_COLS = 30;
var BUTTON_CHAR_PX = 7.5;
var TABLE_COLUMN_MIN_PX = {
  string: 120,
  text: 120,
  number: 80,
  datepicker: 110,
  html: 130,
  button: 90,
  badge: 110,
  badges: 130,
  tags: 130,
  link: 120,
  boolean: 70,
  toggle: 70,
  image: 60,
  select: 110,
  multiselect: 130,
  radio: 110,
  dropdown: 110
};
var TABLE_COLUMN_MONEY_MIN_PX = 130;
var TABLE_COLUMN_NAME_MIN_PX = 150;
var MONEY_COLUMN_NAME = /\b(amount|price|cost|spend|revenue|budget|salary|fee)\b/i;
var NAME_COLUMN_NAME = /\b(email|contact|customer|vendor|product|title|subject|description|address|category)\b/i;
var columnWords = (value2) => value2.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ");
var BUTTON_PADDING_PX = 32;
function propVal2(props, key3) {
  const p = props?.[key3];
  return p && typeof p === "object" && "value" in p ? p.value : p;
}
function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}
function nearestCatalogKey(value2, candidates) {
  const normalized = value2.toLowerCase();
  const ranked = candidates.map((candidate) => ({ candidate, distance: editDistance(normalized, candidate.toLowerCase()) })).sort((left, right) => left.distance - right.distance || left.candidate.localeCompare(right.candidate));
  const best = ranked[0];
  return best && best.distance <= Math.max(2, Math.floor(normalized.length * 0.25)) ? best.candidate : void 0;
}
function projectedTableDataKeys(value2) {
  if (typeof value2 !== "string" || !/\.map\s*\(/.test(value2))
    return void 0;
  const arrowObjects = [...value2.matchAll(/=>\s*\(\s*\{/g)];
  const arrowObject = arrowObjects[arrowObjects.length - 1] ?? null;
  const returnedObject = value2.match(/=>\s*\{[\s\S]*?\breturn\s*\{/);
  const projection = arrowObject ?? returnedObject;
  if (projection?.index === void 0)
    return void 0;
  const objectOffset = projection[0].lastIndexOf("{");
  if (objectOffset < 0)
    return void 0;
  const objectStart = projection.index + objectOffset;
  const chunks = [];
  let chunkStart = objectStart + 1;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let quote;
  let escaped = false;
  for (let index = objectStart + 1; index < value2.length; index++) {
    const char = value2[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = void 0;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{")
      braceDepth++;
    else if (char === "}") {
      if (braceDepth === 0) {
        chunks.push(value2.slice(chunkStart, index));
        break;
      }
      braceDepth--;
    } else if (char === "[")
      bracketDepth++;
    else if (char === "]")
      bracketDepth--;
    else if (char === "(")
      parenDepth++;
    else if (char === ")")
      parenDepth--;
    else if (char === "," && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      chunks.push(value2.slice(chunkStart, index));
      chunkStart = index + 1;
    }
  }
  if (!chunks.length)
    return void 0;
  const keys = [];
  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim();
    if (!chunk)
      continue;
    if (chunk.startsWith("...") || chunk.startsWith("["))
      return void 0;
    const identifier = chunk.match(/^([A-Za-z_$][\w$]*)\s*(?::|$)/);
    if (identifier) {
      keys.push(identifier[1]);
      continue;
    }
    const quoted = chunk.match(/^(?:"([^"]+)"|'([^']+)')\s*:/);
    const quotedKey = quoted?.[1] ?? quoted?.[2];
    if (quotedKey !== void 0) {
      keys.push(quotedKey);
      continue;
    }
    return void 0;
  }
  return keys;
}
function explicitlyProjectsObjectData(value2) {
  if (typeof value2 !== "string")
    return false;
  const expression2 = value2.trim().replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "").trim();
  const directObject = /^\(*\s*\{/.test(expression2);
  const returnedObject = /\breturn\s*\{/.test(expression2);
  return (directObject || returnedObject) && !expression2.includes("...");
}
function visibilityExpression(component) {
  const value2 = propVal2(component.properties, "visibility");
  if (typeof value2 !== "string")
    return void 0;
  const trimmed = value2.trim();
  return trimmed.startsWith("{{") && trimmed.endsWith("}}") ? trimmed.slice(2, -2).trim() : void 0;
}
function stripOuterParens(value2) {
  let result = value2;
  while (result.startsWith("(") && result.endsWith(")")) {
    let depth = 0;
    let enclosesWholeExpression = true;
    for (let index = 0; index < result.length; index++) {
      if (result[index] === "(")
        depth++;
      if (result[index] === ")")
        depth--;
      if (depth === 0 && index < result.length - 1) {
        enclosesWholeExpression = false;
        break;
      }
    }
    if (!enclosesWholeExpression)
      break;
    result = result.slice(1, -1);
  }
  return result;
}
function rowsStateExpression(value2) {
  const compact = value2.replace(/\s+/g, "").replace(/[()]/g, "");
  const queries = [...compact.matchAll(/queries\.([A-Za-z_$][\w$]*)\.(?:isLoading|data)/g)].map((match) => match[1]);
  if (!queries.length || new Set(queries).size !== 1)
    return void 0;
  const query = queries[0];
  if (compact === `queries.${query}.isLoading||queries.${query}.data||[].length>0`) {
    return { query, state: "present" };
  }
  if (compact === `!queries.${query}.isLoading&&queries.${query}.data||[].length===0`) {
    return { query, state: "empty" };
  }
  return void 0;
}
function mutuallyExclusiveVisibility(a, b) {
  const aVisibility = propVal2(a.properties, "visibility");
  const bVisibility = propVal2(b.properties, "visibility");
  if (isFalseBinding(aVisibility) || isFalseBinding(bVisibility))
    return true;
  const aExpression = visibilityExpression(a);
  const bExpression = visibilityExpression(b);
  if (!aExpression || !bExpression)
    return false;
  const aCompact = stripOuterParens(aExpression.replace(/\s+/g, ""));
  const bCompact = stripOuterParens(bExpression.replace(/\s+/g, ""));
  const negates = (left, right) => left.startsWith("!") && stripOuterParens(left.slice(1)) === stripOuterParens(right);
  if (negates(aCompact, bCompact) || negates(bCompact, aCompact))
    return true;
  const aRowsState = rowsStateExpression(aExpression);
  const bRowsState = rowsStateExpression(bExpression);
  return !!aRowsState && !!bRowsState && aRowsState.query === bRowsState.query && aRowsState.state !== bRowsState.state;
}
function recordValue(value2) {
  return value2 && typeof value2 === "object" && !Array.isArray(value2) ? value2 : void 0;
}
function authorComputesKey(data, key3) {
  const binding = String(data?.value ?? data ?? "");
  if (typeof key3 !== "string" || !key3 || !/\.map\s*\(/.test(binding))
    return false;
  const escaped = key3.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignments = [...binding.matchAll(new RegExp(`(?:^|[{,\\s])${escaped}\\s*:\\s*([^,}]+)`, "g"))].map((m) => m[1].trim());
  return assignments.some((value2) => !new RegExp(`^[A-Za-z_$][\\w$]*\\??\\.${escaped}$`).test(value2));
}
function looksDateLikeField(value2) {
  if (typeof value2 !== "string")
    return false;
  const normalized = value2.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return /(?:^|_)(?:date|datetime|timestamp|created|updated|submitted|requested|started|ended|expires|expired|due)(?:_at|_date|_time)?$/.test(normalized);
}
function isTruthyBinding(v) {
  return v === true || v === "{{true}}" || v === "true";
}
function looksRawFieldHeader(value2) {
  return typeof value2 === "string" && /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(value2.trim());
}
function looksInternalIdField(value2) {
  if (typeof value2 !== "string")
    return false;
  const normalized = value2.trim().toLowerCase();
  return /^id$/.test(normalized) || /_id$/.test(normalized) || /(?:^|_)uuid$/.test(normalized);
}
function isTrueBinding(v) {
  if (v === true)
    return true;
  return typeof v === "string" && /^\s*(\{\{\s*true\s*\}\}|true)\s*$/i.test(v);
}
function isFalseBinding(v) {
  return v === false || v === "{{false}}" || v === "false";
}
function differsFromCatalogDefault(type, key3, value2) {
  if (value2 === void 0)
    return false;
  const defaultValue = getComponentSchema(type)?.properties.find((property) => property.key === key3)?.default;
  return defaultValue === void 0 || JSON.stringify(value2) !== JSON.stringify(defaultValue);
}
function catalogValue(type, entries, key3, section = "properties") {
  const authored = propVal2(entries, key3);
  if (authored !== void 0)
    return authored;
  return getComponentSchema(type)?.[section].find((entry) => entry.key === key3)?.default;
}
function isDynamicBinding(value2) {
  return typeof value2 === "string" && value2.includes("{{");
}
function nestedMapInValue(value2) {
  if (typeof value2 === "string")
    return value2.includes("{{") && hasNestedMapCall(value2);
  if (Array.isArray(value2))
    return value2.some(nestedMapInValue);
  if (value2 && typeof value2 === "object")
    return Object.values(value2).some(nestedMapInValue);
  return false;
}
function functionStyleTableMap(value2) {
  if (typeof value2 !== "string")
    return false;
  const binding = value2.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding)
    return false;
  let root;
  try {
    root = parseExpression(binding[1]);
  } catch {
    return false;
  }
  const visit = (value3) => {
    if (Array.isArray(value3))
      return value3.some(visit);
    if (!value3 || typeof value3 !== "object")
      return false;
    const node2 = value3;
    const callee = node2.callee;
    if (["CallExpression", "OptionalCallExpression"].includes(node2.type) && callee && ["MemberExpression", "OptionalMemberExpression"].includes(callee.type) && (callee.computed ? callee.property?.value === "map" : callee.property?.name === "map") && node2.arguments?.[0]?.type === "FunctionExpression")
      return true;
    return Object.values(node2).some(visit);
  };
  return visit(root);
}
function statementBodyMapInValue(value2) {
  if (typeof value2 === "string") {
    return value2.includes("{{") && /\.map\s*\(\s*(?:async\s+)?(?:[A-Za-z_$][\w$]*|\([^)]*\))\s*=>\s*\{/.test(value2);
  }
  if (Array.isArray(value2))
    return value2.some(statementBodyMapInValue);
  if (value2 && typeof value2 === "object") {
    return Object.values(value2).some(statementBodyMapInValue);
  }
  return false;
}
function unsafeEmptyArrayFirstRowFallback(value2) {
  if (typeof value2 === "string") {
    return value2.includes("{{") && /\|\|\s*\[\s*\{\s*\}\s*\]\s*\)\s*\[\s*0\s*\]\s*\./.test(value2);
  }
  if (Array.isArray(value2))
    return value2.some(unsafeEmptyArrayFirstRowFallback);
  if (value2 && typeof value2 === "object") {
    return Object.values(value2).some(unsafeEmptyArrayFirstRowFallback);
  }
  return false;
}
function hasNestedMapCall(source) {
  const parenthesisStack = [];
  let quote;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === "\n")
        lineComment = false;
      continue;
    }
    if (blockComment) {
      if (current === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped)
        escaped = false;
      else if (current === "\\")
        escaped = true;
      else if (current === quote)
        quote = void 0;
      continue;
    }
    if (current === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (current === "'" || current === '"') {
      quote = current;
      continue;
    }
    if (current === "(") {
      const isMapCall = /\.map\s*$/.test(source.slice(Math.max(0, index - 24), index));
      if (isMapCall && parenthesisStack.some(Boolean))
        return true;
      parenthesisStack.push(isMapCall);
    } else if (current === ")") {
      parenthesisStack.pop();
    }
  }
  return false;
}
function staticNumber(v, fallback) {
  return optionalStaticNumber(v) ?? fallback;
}
function optionalStaticNumber(v) {
  if (typeof v === "number" && Number.isFinite(v))
    return v;
  if (typeof v === "string") {
    const match = v.trim().match(/^(?:\{\{\s*)?(\d+(?:\.\d+)?)(?:\s*\}\})?(?:px)?$/);
    if (match)
      return Number(match[1]);
  }
  return void 0;
}
function renderedHeight(component, rect) {
  const layout = rect ?? component.layouts?.desktop ?? component.layout;
  const authored = layout?.height ?? 0;
  if (!TOP_ALIGNED_INPUT_TYPES.has(component.type ?? ""))
    return authored;
  if (propVal2(component.styles, "alignment") !== "top")
    return authored;
  const labelType = propVal2(component.properties, "labelType");
  const label2 = propVal2(component.properties, "label");
  const hasRenderedLabel = labelType === void 0 || labelType === "auto" || label2 === void 0 || (typeof label2 === "string" ? label2.trim().length > 0 : Boolean(label2));
  return authored + (hasRenderedLabel ? TOP_ALIGNMENT_HEIGHT_INCREMENT : 0);
}
function lintStandardSingleLineInputHeight(component) {
  const schema = component.type ? getComponentSchema(component.type) : void 0;
  const defaultHeight = schema?.defaultSize?.height;
  if (!schema?.renderingHints?.compactFormHeight || defaultHeight === void 0)
    return [];
  const layouts = [];
  if (component.layout)
    layouts.push(["layout", component.layout]);
  if (component.layouts?.desktop)
    layouts.push(["desktop", component.layouts.desktop]);
  if (component.layouts?.mobile)
    layouts.push(["mobile", component.layouts.mobile]);
  const label2 = component.name ?? component.type ?? "component";
  return layouts.flatMap(([layoutName, layout]) => {
    const authoredHeight = layout.height;
    if (authoredHeight === void 0 || authoredHeight <= defaultHeight)
      return [];
    return [
      `${component.type} "${label2}": ${layoutName} authored height ${authoredHeight}px exceeds the standard single-line height ${defaultHeight}px. Oversizing does not enlarge the value text. Keep height at ${defaultHeight}px; a top-aligned label renders ${TOP_ALIGNMENT_HEIGHT_INCREMENT}px outside the authored box, so move the following row down instead of increasing this field's height.`
    ];
  });
}
function minimumTextHeight(component) {
  if (component.type !== "Text")
    return void 0;
  const dynamicHeight = propVal2(component.properties, "dynamicHeight");
  if (isTruthyBinding(dynamicHeight))
    return void 0;
  if (typeof dynamicHeight === "string" && /\{\{/.test(dynamicHeight) && !isFalseBinding(dynamicHeight))
    return void 0;
  const textSizeValue = propVal2(component.styles, "textSize");
  const lineHeightValue = propVal2(component.styles, "lineHeight");
  const textSize = textSizeValue === void 0 ? 14 : optionalStaticNumber(textSizeValue);
  const lineHeight = lineHeightValue === void 0 ? 1.5 : optionalStaticNumber(lineHeightValue);
  if (textSize === void 0 || lineHeight === void 0)
    return void 0;
  return Math.ceil(textSize * lineHeight + 6);
}
function minimumTextContentHeight(component) {
  const minimum = minimumTextHeight(component);
  return minimum === void 0 ? void 0 : minimum - 6;
}
function lintUnusableTextGeometry(components) {
  const errors = [];
  for (const component of components) {
    const minimum = minimumTextContentHeight(component);
    if (minimum === void 0)
      continue;
    const layouts = [
      [component.layouts?.desktop ? "desktop" : "layout", component.layouts?.desktop ?? component.layout],
      ["mobile", component.layouts?.mobile]
    ];
    const undersized = layouts.filter((entry) => !!entry[1] && typeof entry[1].height === "number" && entry[1].height < minimum);
    if (undersized.length) {
      const recommended = minimumTextHeight(component);
      errors.push(`Text "${component.name ?? component.id ?? "Text"}" is too short to render one line: ${undersized.map(([resolution, layout]) => `${resolution} height ${layout.height}px`).join(", ")}; use at least ${recommended}px or enable dynamicHeight.`);
    }
  }
  return errors;
}
function introducedLintFindings(before, after) {
  const existing = new Set(before);
  return after.filter((finding) => !existing.has(finding));
}
function lintTextGeometry(components) {
  const warnings = [];
  for (const component of components) {
    const minimum = minimumTextHeight(component);
    if (minimum === void 0)
      continue;
    const desktop = component.layouts?.desktop ?? component.layout;
    const mobile = component.layouts?.mobile ?? component.layout;
    const layouts = [];
    if (desktop)
      layouts.push([component.layouts?.desktop ? "desktop" : "layout", desktop]);
    if (mobile && mobile !== desktop)
      layouts.push(["mobile", mobile]);
    const undersized = layouts.filter(([, rect]) => typeof rect.height === "number" && rect.height < minimum);
    if (!undersized.length)
      continue;
    const recommended = Math.ceil(minimum / 10) * 10;
    warnings.push(`Text "${component.name ?? component.id ?? "Text"}" is too short for its static font/line height: ${undersized.map(([resolution, rect]) => `${resolution} height ${rect.height}px`).join(", ")}; a single line needs at least ${minimum}px (use ${recommended}px on ToolJet's 10px grid), otherwise bold glyphs and descenders are clipped. Enable dynamicHeight for intentionally wrapping content.`);
  }
  return warnings;
}
function componentKey(component) {
  return component.clientRef ?? component.id ?? component.name;
}
function parentPlacement(component) {
  if (component.parentRef) {
    return { parentId: component.parentRef, slotName: component.slotName ?? "body" };
  }
  if (!component.parent)
    return void 0;
  const decoded = decodeComponentParent(component.parent);
  return { parentId: decoded.parentId, slotName: component.slotName ?? decoded.slotName };
}
function placementKey(component) {
  const placement = parentPlacement(component);
  return placement ? `${placement.parentId}::${placement.slotName}` : "__page__";
}
function lintComponentSlots(components) {
  const errors = [];
  const refs = new Map(components.flatMap((component) => {
    const key3 = componentKey(component);
    return key3 ? [[key3, component]] : [];
  }));
  for (const component of components) {
    const persistedSlot = component.parent ? decodeComponentParent(component.parent).slotName : "body";
    const slotName = component.slotName ?? (persistedSlot === "body" ? void 0 : persistedSlot);
    if (!slotName)
      continue;
    const placement = parentPlacement(component);
    const parent = placement ? refs.get(placement.parentId) : void 0;
    const validParent = slotName === "modal" ? parent?.type === "Kanban" : isTabSlot(slotName) ? parent?.type === "Tabs" : SLOT_PARENT_TYPES.has(parent?.type ?? "") || slotName === "body" && parent?.type === "Kanban";
    if (parent?.type === "Tabs" && isTabSlot(slotName) && !isTruthyBinding(propVal2(parent.properties, "useDynamicOptions"))) {
      const items = propVal2(parent.properties, "tabItems");
      const ids = Array.isArray(items) ? items.map((item) => String(item?.id ?? "")) : void 0;
      if (ids && !ids.includes(slotName.slice("tab-".length))) {
        errors.push(`Component "${component.name ?? component.id ?? component.type}" uses slot_name:"${slotName}", but Tabs "${parent.name ?? parent.id}" has no tab with that id (its tabItems ids: ${ids.join(", ") || "none"}). Use one of those slots, or add the tab to tabItems.`);
      }
    }
    if (parent && !validParent) {
      errors.push(`Component "${component.name ?? component.id ?? component.type}" uses slot_name:"${slotName}" with ${parent.type ?? "unknown"} parent "${parent.name ?? parent.id}"; header/body/footer belong to ModalV2, Form, and Container (header and body also to Accordion); Kanban supports body (card) and modal; tab-t0, tab-t1 ... belong to Tabs.`);
    }
  }
  return errors;
}
function lintKanbanInteractions(components) {
  const warnings = [];
  const boards = components.filter((component) => component.type === "Kanban");
  for (const board of boards) {
    const key3 = componentKey(board);
    if (!key3)
      continue;
    const openModal = propVal2(board.properties, "openModalOnCardClick");
    const nativeModalEnabled = openModal === void 0 || isTruthyBinding(openModal);
    if (!nativeModalEnabled)
      continue;
    const modalChildren = components.filter((component) => {
      const p = parentPlacement(component);
      return p?.parentId === key3 && p.slotName === "modal";
    });
    if (modalChildren.length)
      continue;
    warnings.push(`Kanban "${board.name ?? board.id ?? "Kanban"}" enables the native card modal but has no modal children. Cards (including custom Html) can look correct while a blank built-in modal covers page-level detail controls. Parent the detail controls to this Kanban with slot_name:"modal"; ordinary body children only populate cards. For a board without card selection use openModalOnCardClick:false and omit onCardSelected. Never merely enable the modal to satisfy the event lint without giving it content.`);
  }
  return warnings;
}
function lintKanbanCardChildren(components) {
  const errors = [];
  for (const board of components.filter((component) => component.type === "Kanban")) {
    const key3 = componentKey(board);
    if (!key3)
      continue;
    for (const child of components) {
      if (parentPlacement(child)?.parentId !== key3 || parentPlacement(child)?.slotName !== "body")
        continue;
      if (child.type !== "Text" && child.type !== "Html")
        continue;
      const rect = child.layouts?.desktop ?? child.layout;
      const width = rect?.width;
      if (typeof width !== "number" || width >= KANBAN_CARD_CHILD_MIN_COLS)
        continue;
      const sharesRow = components.some((other) => other !== child && parentPlacement(other)?.parentId === key3 && parentPlacement(other)?.slotName === "body" && (() => {
        const o = other.layouts?.desktop ?? other.layout;
        return !!o && o.top !== void 0 && o.height !== void 0 && rect.top !== void 0 && rect.height !== void 0 && rect.top < o.top + o.height && o.top < rect.top + rect.height;
      })());
      if (sharesRow)
        continue;
      const px2 = Math.round(width / 43 * KANBAN_CARD_WIDTH_PX);
      errors.push(`Kanban "${board.name ?? board.id ?? "Kanban"}" card child ${child.type} "${child.name ?? child.id ?? child.type}": width ${width} columns is about ${px2}px of the ${KANBAN_CARD_WIDTH_PX}px card (card children use the card's own 43-column grid), so a name or title is cut after a few characters. For long titles prefer left 2, width 39; short badges or metadata may stay compact after checking their actual text.`);
    }
  }
  return errors;
}
function lintStatisticsRows(components) {
  const errors = [];
  const tiles = components.filter((component) => component.type === "Statistics" && !parentPlacement(component)?.parentId);
  if (tiles.length < 2)
    return errors;
  const rect = (component) => component.layouts?.desktop ?? component.layout;
  const rows = [];
  for (const tile of [...tiles].sort((a, b) => (rect(a)?.top ?? 0) - (rect(b)?.top ?? 0))) {
    const row = rows.find((candidate) => Math.abs((rect(candidate[0])?.top ?? 0) - (rect(tile)?.top ?? 0)) <= 6);
    if (row)
      row.push(tile);
    else
      rows.push([tile]);
  }
  for (const row of rows) {
    const span = row.reduce((sum, tile) => sum + (rect(tile)?.width ?? 0), 0);
    if (span >= CONTENT_COLUMNS - 5)
      continue;
    const names = row.map((tile) => `"${tile.name ?? tile.id ?? "Statistics"}"`).join(", ");
    errors.push(`Statistics row at top ${rect(row[0])?.top ?? 0}px (${names}) spans ${span} of the ${CONTENT_COLUMNS} content columns and leaves an empty slot, which may be intentional beside another region. Check hierarchy and alignment; widen/rebalance an accidental gap, but retain deliberate compact or multi-row groups when the content is readable.`);
  }
  return errors;
}
function lintTableProjectionRender(spec, warnings = []) {
  if (spec.type !== "Table")
    return [];
  const data = propVal2(spec.properties, "data");
  if (typeof data !== "string")
    return [];
  const binding = data.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding)
    return [];
  let root;
  try {
    root = parseExpression(binding[1]);
  } catch {
    return [];
  }
  const errors = [];
  const columns = propVal2(spec.properties, "columns");
  const reported = /* @__PURE__ */ new Map();
  const variants = (node2, depth = 0) => {
    if (!node2 || depth > 32)
      return null;
    if (["StringLiteral", "NumericLiteral", "BooleanLiteral"].includes(node2.type))
      return [node2.value];
    if (node2.type === "NullLiteral")
      return [null];
    if (node2.type === "LogicalExpression" && node2.operator === "||") {
      const left = variants(node2.left, depth + 1);
      if (!left)
        return null;
      if (left.every(Boolean))
        return left;
      if (left.every((v) => !v))
        return variants(node2.right, depth + 1);
      return null;
    }
    if (node2.type === "BinaryExpression" && node2.operator === "+") {
      const left = variants(node2.left, depth + 1), right = variants(node2.right, depth + 1);
      if (!left || !right || left.length * right.length > 16)
        return null;
      const values = [];
      for (const a of left)
        for (const b of right) {
          if (typeof a !== "string" && typeof b !== "string")
            return null;
          const value2 = String(a) + String(b);
          if (value2.length > 8192)
            return null;
          values.push(value2);
        }
      return values;
    }
    if (node2.type === "TemplateLiteral" && node2.expressions.length === 0)
      return [node2.quasis[0].value.cooked];
    if (["MemberExpression", "OptionalMemberExpression"].includes(node2.type) && node2.object?.type === "ObjectExpression") {
      const props = node2.object.properties;
      if (props.length > 15 || props.some((p) => p.type !== "ObjectProperty" || p.computed || p.method || (p.key.name ?? p.key.value) === "__proto__"))
        return null;
      const key3 = node2.computed ? ["StringLiteral", "NumericLiteral"].includes(node2.property?.type) ? String(node2.property.value) : void 0 : node2.property?.name;
      if (key3 === void 0)
        return null;
      const prop2 = [...props].reverse().find((p) => String(p.key.name ?? p.key.value) === key3);
      return prop2 ? variants(prop2.value, depth + 1) : null;
    }
    return null;
  };
  const skeleton = (node2, depth = 0) => {
    if (!node2 || depth > 32)
      return "?";
    if (node2.type === "StringLiteral")
      return node2.value;
    if (node2.type === "BinaryExpression" && node2.operator === "+")
      return (skeleton(node2.left, depth + 1) + skeleton(node2.right, depth + 1)).slice(0, 8192);
    if (node2.type === "TemplateLiteral")
      return node2.quasis.map((q) => q.value.cooked ?? "").join("?");
    return "?";
  };
  const unfinishedTag = (text) => {
    const start = /<[A-Za-z][\w:-]*(?=[\s/>]|$)/g;
    while (start.exec(text)) {
      let quote = "", closed = false;
      for (let i = start.lastIndex; i < text.length; i++) {
        const c = text[i];
        if (quote) {
          if (c === quote)
            quote = "";
        } else if (c === '"' || c === "'")
          quote = c;
        else if (c === ">") {
          start.lastIndex = i + 1;
          closed = true;
          break;
        }
      }
      if (!closed)
        return true;
    }
    return false;
  };
  const inspect = (node2, key3, depth = 0, canBlock = true) => {
    if (!node2 || depth > 32)
      return;
    if (node2.type === "ConditionalExpression") {
      const test = variants(node2.test);
      if (!test || !test.every((v) => !v))
        inspect(node2.consequent, key3, depth + 1, canBlock);
      if (!test || !test.every(Boolean))
        inspect(node2.alternate, key3, depth + 1, canBlock);
      return;
    }
    if (node2.type !== "LogicalExpression" || node2.operator !== "||")
      return;
    inspect(node2.left, key3, depth + 1, canBlock);
    const left = variants(node2.left);
    if (!left || !left.every(Boolean))
      inspect(node2.right, key3, depth + 1, canBlock);
    const possible = unfinishedTag(skeleton(node2.left)) || left?.some((v) => typeof v === "string" && unfinishedTag(v));
    if (!possible)
      return;
    const column = Array.isArray(columns) ? columns.find((c) => c?.key === key3) : void 0;
    const proven = canBlock && column?.columnType === "html" && left !== null && left.every((v) => typeof v === "string" && v.length > 0 && unfinishedTag(v));
    const message = 'Table "' + (spec.name ?? spec.type) + '" column "' + key3 + '": ' + (proven ? "the data projection renders broken markup for this cell. " : "the data projection may short-circuit while constructing HTML; runtime values must be verified. ") + "The left branch of || contains an unfinished opening tag. When truthy, it skips the fallback and its closing markup. If the fallback is part of the attribute, group it before concatenating the closing markup: (lookup[x] || fallback).";
    if (!reported.has(key3) || proven && !reported.get(key3).proven)
      reported.set(key3, { proven, message });
  };
  let remaining = 2e4;
  const visit = (value2, depth = 0) => {
    if (--remaining < 0 || depth > 128 || !value2 || typeof value2 !== "object")
      return;
    if (Array.isArray(value2)) {
      for (const item of value2)
        visit(item, depth + 1);
      return;
    }
    const node2 = value2, callee = node2.callee;
    if (["CallExpression", "OptionalCallExpression"].includes(node2.type) && ["MemberExpression", "OptionalMemberExpression"].includes(callee?.type) && (callee.computed ? callee.property?.value === "map" : callee.property?.name === "map") && node2.arguments?.[0]?.type === "ArrowFunctionExpression" && node2.arguments[0].body.type === "ObjectExpression") {
      const seen = /* @__PURE__ */ new Set();
      let unknownOverride = false;
      for (const prop2 of [...node2.arguments[0].body.properties].reverse()) {
        if (prop2.type !== "ObjectProperty" || prop2.computed && prop2.key.type !== "StringLiteral") {
          unknownOverride = true;
          continue;
        }
        const key3 = String(prop2.key.name ?? prop2.key.value);
        if (seen.has(key3))
          continue;
        seen.add(key3);
        inspect(prop2.value, key3, 0, node2 === root && !unknownOverride);
      }
    }
    for (const child of Object.values(node2))
      visit(child, depth + 1);
  };
  visit(root);
  for (const { proven, message } of reported.values())
    (proven ? errors : warnings).push(message);
  return errors;
}
var EMPTY_STATE_TEXT = /^(?:no\s+(?:\w+\s+){0,3}(?:found|available|yet|records?|results?|items?)|nothing\s+(?:found|available|yet)|keine?\s+\w+\s+gefunden)[.!\s]*$/i;
function lintUnboundEmptyState(spec) {
  if (spec.type !== "Text" && spec.type !== "Html")
    return [];
  const key3 = spec.type === "Html" ? "rawHtml" : "text";
  const text = propVal2(spec.properties ?? {}, key3);
  if (typeof text !== "string" || text.includes("{{"))
    return [];
  const name = spec.name ?? "";
  if (!EMPTY_STATE_TEXT.test(text.replace(/<[^>]*>/g, "").trim()) && !/empty/i.test(name))
    return [];
  const visibility = propVal2(spec.properties ?? {}, "visibility") ?? propVal2(spec.styles ?? {}, "visibility");
  if (typeof visibility === "string" && visibility.includes("{{") && !/^\{\{\s*(true|false)\s*\}\}$/.test(visibility.trim()))
    return [];
  return [
    `${spec.type} "${name || spec.id || spec.type}": the empty-state message "${text.trim().slice(0, 40)}" has no visibility binding, so it shows under a populated table. Bind visibility to the data being empty ({{(queries.<q>.data || []).length === 0}}), or drop the component: a Table shows its own empty message.`
  ];
}
function lintEmptyTabs(components) {
  const errors = [];
  for (const tabs of components.filter((component) => component.type === "Tabs")) {
    const key3 = componentKey(tabs);
    if (!key3)
      continue;
    const children = components.filter((component) => {
      const parentId = parentPlacement(component)?.parentId;
      return parentId === key3 || typeof parentId === "string" && parentId.startsWith(`${key3}-`) && /^\d+$/.test(parentId.slice(key3.length + 1));
    });
    if (children.length)
      continue;
    const height = (tabs.layouts?.desktop ?? tabs.layout)?.height;
    errors.push(`Tabs "${tabs.name ?? tabs.id ?? "Tabs"}" has no child components, so it renders its tab strip over an empty ${height ?? ""}px box. Give every tab its content (Text, Html, Table) as children with parent_ref and the tab's slot, or replace the Tabs with a plain panel.`);
  }
  return errors;
}
var LABELLED_INPUT_TYPES = /* @__PURE__ */ new Set(["TextInput", "NumberInput", "TextArea", "PasswordInput", "EmailInput", "DatePickerV2", "DatetimePickerV2", "TimePicker", "DaterangePicker", "Checkbox", "ToggleSwitchV2", "RadioButtonV2", "FilePicker"]);
function lintDefaultInputLabel(spec) {
  if (!LABELLED_INPUT_TYPES.has(spec.type ?? ""))
    return [];
  const label2 = propVal2(spec.properties ?? {}, "label");
  const text = typeof label2 === "string" ? label2.trim() : label2;
  if (text !== void 0 && text !== "" && text !== "Label")
    return [];
  return [
    `${spec.type} "${spec.name ?? spec.id ?? spec.type}": ${text === void 0 ? "no label" : "an empty label"} renders the catalog's literal "Label" caption above the box. Give it the field's name ("Search", "Warehouse name"); a search box is labelled Search.`
  ];
}
var DISABLED_SURFACE_TYPES = /* @__PURE__ */ new Set(["Kanban", "Table", "Listview", "Chart", "Form", "Tabs", "Container"]);
function lintStaticDisabledSurface(spec) {
  if (!DISABLED_SURFACE_TYPES.has(spec.type ?? ""))
    return [];
  const value2 = propVal2(spec.styles ?? {}, "disabledState") ?? propVal2(spec.properties ?? {}, "disabledState");
  const staticTrue = value2 === true || typeof value2 === "string" && /^\s*(\{\{\s*true\s*\}\}|true)\s*$/.test(value2);
  if (!staticTrue)
    return [];
  return [
    `${spec.type} "${spec.name ?? spec.id ?? spec.type}": disabledState is a static true, so the whole component renders faded and inert and reads as broken. For a read-only surface leave disabledState off and turn the editing affordances off instead (a Kanban: no add-card, no card modal; a Table: allowSelection false, no row actions).`
  ];
}
function lintButtonLabelWidth(spec) {
  if (spec.type !== "Button" || parentPlacement(spec)?.parentId)
    return [];
  const text = propVal2(spec.properties ?? {}, "text");
  if (typeof text !== "string" || text.includes("{{") || !text.trim())
    return [];
  const width = (spec.layouts?.desktop ?? spec.layout)?.width;
  if (typeof width !== "number" || width <= 0)
    return [];
  const neededPx = Math.ceil(text.trim().length * BUTTON_CHAR_PX + BUTTON_PADDING_PX);
  const px2 = Math.round(width * CANVAS_COLUMN_PX);
  if (px2 >= neededPx)
    return [];
  return [
    `Button "${spec.name ?? spec.id ?? "Button"}": the label "${text.trim()}" needs about ${neededPx}px but the button is ${width} columns, about ${px2}px, so the label wraps or is cut. Use at least ${Math.ceil(neededPx / CANVAS_COLUMN_PX)} columns.`
  ];
}
function lintListviewChildren(components) {
  const warnings = [];
  const refs = new Map(components.flatMap((component) => {
    const key3 = componentKey(component);
    return key3 ? [[key3, component]] : [];
  }));
  const childrenByParent = /* @__PURE__ */ new Map();
  for (const child of components) {
    const parentId = parentPlacement(child)?.parentId;
    if (!parentId || refs.get(parentId)?.type !== "Listview")
      continue;
    childrenByParent.set(parentId, [...childrenByParent.get(parentId) ?? [], child]);
  }
  for (const [parentId, children] of childrenByParent) {
    const parent = refs.get(parentId);
    if (propVal2(parent.properties, "mode") !== "grid")
      continue;
    for (const child of children) {
      const rect = child.layouts?.desktop ?? child.layout;
      if (!rect || rect.top === void 0 || rect.height === void 0)
        continue;
      const sharesRow = children.some((sibling) => {
        if (sibling === child)
          return false;
        const siblingRect = sibling.layouts?.desktop ?? sibling.layout;
        if (!siblingRect || siblingRect.top === void 0 || siblingRect.height === void 0)
          return false;
        return rect.top < siblingRect.top + siblingRect.height && siblingRect.top < rect.top + rect.height;
      });
      if (sharesRow || rect.left === 0 && (rect.width === 43 || rect.width === 42))
        continue;
      warnings.push(`Component "${child.name ?? child.id ?? child.type}" is the only child on its row inside grid-mode Listview "${parent.name ?? parent.id ?? "Listview"}", but uses left:${rect.left ?? "unset"}, width:${rect.width ?? "unset"}. Each repeated grid cell has its own fresh 43-column local canvas; for a full-row child use left:0, width:43. Do not divide the child width by the parent grid column count.`);
    }
  }
  for (const child of components.filter((component) => component.type === "Html")) {
    const parent = refs.get(parentPlacement(child)?.parentId ?? "");
    if (parent?.type !== "Listview")
      continue;
    const rawHtml = propVal2(child.properties, "rawHtml");
    if (typeof rawHtml !== "string" || !/\bheight\s*:\s*\d+(?:\.\d+)?px\b/i.test(rawHtml))
      continue;
    if (/\bheight\s*:\s*100%/i.test(rawHtml))
      continue;
    warnings.push(`Html "${child.name ?? child.id ?? "Html"}" is repeated inside Listview "${parent.name ?? parent.id ?? "Listview"}" and uses a fixed pixel CSS height. The Listview wrapper's inner canvas can be shorter than the authored component, creating a scrollbar in every item. Use height:100%; box-sizing:border-box on the Html root instead.`);
  }
  return warnings;
}
function lintCanvasSideGutter(components) {
  const MIN_LEFT = 2;
  const MAX_RIGHT = 41;
  const EXEMPT = /* @__PURE__ */ new Set(["Modal", "ModalV2", "Drawer"]);
  const roots = components.filter((component) => !parentPlacement(component) && !EXEMPT.has(component.type ?? ""));
  if (roots.length < 3)
    return [];
  const offenders = roots.filter((component) => {
    const rect = component.layouts?.desktop ?? component.layout;
    if (!rect || typeof rect.left !== "number" || typeof rect.width !== "number")
      return false;
    return rect.left < MIN_LEFT || rect.left + rect.width > MAX_RIGHT;
  });
  if (!offenders.length)
    return [];
  const names = offenders.map((component) => component.name ?? component.id).filter(Boolean);
  return [
    `Page content has no side gutter: ${names.slice(0, 4).join(", ")}` + (names.length > 4 ? ` and ${names.length - 4} more` : "") + ` reach the edges of ToolJet's 43-column canvas, so the app renders flush against the window. Keep top-level content within columns ${MIN_LEFT}-${MAX_RIGHT} (left >= ${MIN_LEFT}, left + width <= ${MAX_RIGHT}); a full-width row is left:${MIN_LEFT} width:${MAX_RIGHT - MIN_LEFT}. Only go edge-to-edge if the user explicitly asked for a full-bleed layout.`
  ];
}
function lintDesktopCanvasCoverage(components) {
  const roots = components.filter((component) => !parentPlacement(component));
  if (roots.length < 4)
    return [];
  if (!roots.some((component) => ["Table", "Chart", "Listview", "Kanban"].includes(component.type ?? "")))
    return [];
  const rects = roots.map((component) => component.layouts?.desktop ?? component.layout).filter((rect) => Boolean(rect && typeof rect.left === "number" && typeof rect.width === "number"));
  if (rects.length < 4)
    return [];
  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  if (right - left > 27 || right > 29)
    return [];
  return [
    `Desktop page content spans only columns ${left}-${right} of ToolJet's 43-column canvas despite having multiple operational/analytical surfaces. This often produces an accidental half-width app. Expand the main composition toward the standard columns 2-41, or browser-verify that the narrow rail is deliberate.`
  ];
}
var RENDERED_TEXT_KEYS = ["text", "rawHtml", "label", "title", "placeholder", "description", "subtitle", "primaryValue", "secondaryValue"];
var CONTAINER_ITEMS = { Tabs: "tabs", Steps: "steps", Timeline: "data" };
function lintRenderedText(spec) {
  const errors = [];
  const label2 = spec.name ?? spec.type ?? "component";
  const props = spec.properties ?? {};
  for (const key3 of RENDERED_TEXT_KEYS) {
    const value2 = propVal2(props, key3);
    if (typeof value2 !== "string" || !value2)
      continue;
    if (value2.replace(/\{\{[\s\S]*?\}\}/g, "").includes("\\n")) {
      errors.push(`Component "${label2}".properties.${key3} contains a literal backslash-n; ToolJet prints it as the two characters "\\n". Use a real line break, <br> in Html, or separate components.`);
    }
    const outside = expressionOutsideBinding(value2);
    if (outside) {
      errors.push(`Component "${label2}".properties.${key3} has JavaScript outside a {{ }} binding (${outside}); it renders as source text. Wrap the whole expression in one {{ }} or move it into a query.`);
    }
  }
  if (spec.type === "Tabs") {
    const dynamic = isTrueBinding(propVal2(props, "useDynamicOptions"));
    const tabs = propVal2(props, "tabs");
    const tabItems = propVal2(props, "tabItems");
    const authoredItems = Array.isArray(tabItems) && tabItems.length > 0 && !tabItems.every((item) => /^Tab \d+$/.test(String(item?.title ?? "")));
    if (dynamic && (tabs === void 0 || tabs === null || tabs === "")) {
      errors.push(`Tabs "${label2}": useDynamicOptions is on but properties.tabs is empty, so nothing renders. Bind tabs to an array of {id, title}.`);
    } else if (!dynamic && !authoredItems) {
      errors.push(`Tabs "${label2}": ToolJet renders properties.tabItems (default "Tab 1 / Tab 2 / Tab 3") unless useDynamicOptions is true; ` + (tabs !== void 0 ? "the authored properties.tabs is ignored. " : "") + 'Either set properties.useDynamicOptions to "{{true}}" and keep tabs as [{id, title}], or author properties.tabItems with the real titles.');
    }
  }
  const itemsKey = spec.type === "Tabs" ? void 0 : CONTAINER_ITEMS[spec.type ?? ""];
  if (itemsKey) {
    const dynamicSchema = isTruthyBinding(propVal2(props, "advanced")) ? propVal2(props, "schema") : void 0;
    const items = dynamicSchema ?? propVal2(props, itemsKey);
    const authored = Array.isArray(items) ? items.length > 0 : typeof items === "string" && items.includes("{{");
    if (!authored) {
      errors.push(`${spec.type} "${label2}" has no properties.${itemsKey}: it renders ToolJet's placeholder items ("Tab 1 / Tab 2 / Tab 3"). Author ${itemsKey} with the real titles, or use a different component.`);
    }
  }
  return errors;
}
function expressionOutsideBinding(value2) {
  const outside = value2.replace(/\{\{[\s\S]*?\}\}/g, " ");
  const match = outside.match(/'\s*\+\s*(?:moment|queries|components|globals|variables|page|new Date)\b[^\n]{0,40}|\b(?:moment|queries|components)\.[A-Za-z_]+\([^\n]{0,30}|\+\s*'[^']{0,30}'\s*\+/);
  return match ? JSON.stringify(match[0].trim().slice(0, 60)) : null;
}
var WRAP_REQUIRED_COLUMNS = 5;
function estimateTextHeight(text, baseSize, options = {}) {
  const dynamic = text.includes("{{");
  if (dynamic) {
    const literals = [];
    let from = 0;
    for (const span of bindingSpans(text)) {
      literals.push(text.slice(from, span.start));
      from = span.end;
    }
    literals.push(text.slice(from));
    const standIn = options.bindingLines && literals.some((part) => part.replace(/<[^>]+>/g, "").trim() || /<br\s*\/?>/i.test(part)) ? "x" : " ";
    text = literals.join(standIn).split("{{", 1)[0];
  }
  const blankLines = (text.match(/<br\s*\/?>\s*<br\s*\/?>/gi) ?? []).length;
  const rawParts = text.split(/<br\s*\/?>|<\/(?:div|p|h[1-6]|li)>|\n/i);
  const parts = rawParts.map((part) => part.replace(/<[^>]+>/g, "").trim() === "" ? null : part).filter((part) => part !== null);
  const sizes = parts.map((part) => {
    const found = [...part.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)].map((m) => Number(m[1]));
    if (found.length)
      return Math.max(...found);
    if (/<h1\b/i.test(part))
      return baseSize * 2;
    if (/<h2\b/i.test(part))
      return baseSize * 1.5;
    if (/<h3\b/i.test(part))
      return baseSize * 1.17;
    return baseSize;
  });
  const blockBoundaries = parts.filter((part) => /<(?:h[1-6]|p|div|li)\b/i.test(part)).length;
  const px2 = Math.round(sizes.reduce((sum, size) => sum + Math.max(18, size * 1.5), 0) + blankLines * 10 + blockBoundaries * 8 + 6);
  return { lines: parts.length + blankLines, px: px2, sizes, ...dynamic ? { dynamic: true } : {} };
}
var CHART_HOUSE_LAYOUT_KEYS = ["font", "family"];
var CHART_PADDING_MAX_PX = 24;
function lintChartHouseStyle(spec, warnings = []) {
  if (spec.type !== "Chart")
    return [];
  const label2 = spec.name ?? spec.type;
  const props = spec.properties ?? {};
  const fromJson = propVal2(props, "plotFromJson");
  if (!isTrueBinding(fromJson)) {
    const kind = String(propVal2(props, "type") ?? "bar");
    warnings.push(`Chart "${label2}": native type "${kind}" renders Plotly's defaults (Verdana labels, grey grid, flat unlabeled bars, the rainbow pie). Set properties.plotFromJson to "{{true}}" and write properties.jsonDescription as the house chart from references/ui-layout.md for finer control, or retain native rendering when its themed presentation is verified.`);
    return [];
  }
  const raw = propVal2(props, "jsonDescription");
  const description = typeof raw === "string" ? raw : raw && typeof raw === "object" ? JSON.stringify(raw) : "";
  if (!description.trim()) {
    return [`Chart "${label2}": plotFromJson is on but properties.jsonDescription is empty, so nothing renders.`];
  }
  const padding = propVal2(spec.styles ?? {}, "padding");
  const paddingPx = typeof padding === "number" ? padding : typeof padding === "string" && /^\s*\d+\s*$/.test(padding) ? Number(padding) : void 0;
  if (paddingPx === void 0 || paddingPx > CHART_PADDING_MAX_PX) {
    warnings.push(`Chart "${label2}": styles.padding ${padding === void 0 ? "is unset (catalog default 50)" : `is ${JSON.stringify(padding)}`}; the wrapper uses it as the Plotly margin on all four sides and ignores layout.margin, which can shrink the plot. Start with styles.padding 16 (usually at most ${CHART_PADDING_MAX_PX}); the axes add their own room for tick labels. Keep a larger margin only when labels need it and verify the rendered plot.`);
  }
  if (!description.includes("layout") && /^\s*\{\{[\s\S]*\}\}\s*$/.test(description) && !description.includes("data"))
    return [];
  if (!description.includes("layout") && /^\s*\{\{\s*[\w.]+\s*\}\}\s*$/.test(description))
    return [];
  if (/\bdata\s*:\s*\(?\s*queries\.[\w.$]+\.data\b[^,;]*?\)?\s*\.map\(/.test(description)) {
    return [
      `Chart "${label2}": jsonDescription sets data to rows.map(r => ({x, y})), a list of points, so Plotly draws empty axes. data is a list of traces: [{ type: 'bar', x: rows.map(r => r.label), y: rows.map(r => r.value), ... }].`
    ];
  }
  if (/textposition\s*:\s*['"]outside['"]/.test(description) && !/cliponaxis\s*:\s*false/.test(description)) {
    return [
      `Chart "${label2}": a bar trace uses textposition 'outside' without cliponaxis:false, so the tallest bar's value label is cut in half by the plot area. Add cliponaxis:false to every bar trace that places its text outside.`
    ];
  }
  const missing = CHART_HOUSE_LAYOUT_KEYS.filter((key3) => !description.includes(key3));
  if (missing.length) {
    warnings.push(`Chart "${label2}": jsonDescription has no layout.${missing.join(", layout.")}; without the house layout the chart falls back to Plotly defaults. Prefer explicit theme typography; retain inherited defaults only after verifying the result.`);
  }
  if (!description.includes("{{")) {
    try {
      const parsed = JSON.parse(description);
      const traces = Array.isArray(parsed.data) ? parsed.data : [];
      const dataless = traces.filter((trace) => {
        const type = String(trace.type ?? "scatter");
        if (type === "pie")
          return !Array.isArray(trace.values) || trace.values.length === 0;
        if (type === "heatmap")
          return !Array.isArray(trace.z) || trace.z.length === 0;
        return !Array.isArray(trace.y) || trace.y.length === 0;
      });
      if (dataless.length) {
        return [
          `Chart "${label2}": ${dataless.length} of ${traces.length} trace(s) carry no data (no x/y, values or z arrays), so the chart draws empty axes. Put the arrays in the trace, or build the whole { data, layout } object in a JavaScript query and bind jsonDescription to it.`
        ];
      }
    } catch {
    }
  }
  return [];
}
var INSPECTOR_ONLY_PROPERTIES = {
  PhoneInput: ["defaultCountry"],
  CurrencyInput: ["defaultCountry"]
};
function lintComponentSpec(spec, context = {}) {
  const errors = [];
  const warnings = [];
  const props = spec.properties ?? {};
  const label2 = spec.name ?? spec.type ?? "component";
  if (spec.type === "Text" && propVal2(props, "text") === void 0) {
    warnings.push(`Text "${label2}" has no properties.text and will render ToolJet's default greeting. Supply the intended text or binding; use an explicit empty string if this display is intentionally blank. Do not invent replacement copy or change its layout.`);
  }
  if (spec.type === "Table") {
    const columns = propVal2(props, "columns");
    if (Array.isArray(columns)) {
      const hasClockFormat = (c) => typeof c.dateFormat === "string" && !c.dateFormat.includes("{{") && /[Hhms]/.test(c.dateFormat.replace(/\[[^\]]*\]/g, ""));
      const timed = columns.filter((c) => c && typeof c === "object" && c.columnType === "datepicker" && (isTrueBinding(c.isTimeChecked) || hasClockFormat(c)) && c.columnVisibility !== false && c.columnVisibility !== "{{false}}");
      const local = timed.filter((c) => !c.timeZoneDisplay);
      if (local.length)
        warnings.push(`Table "${label2}" time columns ${local.map((c) => JSON.stringify(c.key ?? c.name)).join(", ")} have no timeZoneDisplay, so times follow the viewer's browser timezone. For a location-bound schedule, set the business IANA timeZoneDisplay and appropriate source timeZoneValue; keep viewer-local time only when intended and labelled. Do not infer a timezone from locale or currency.`);
      const doubled = timed.filter((c) => isTrueBinding(c.isTimeChecked) && hasClockFormat(c));
      if (doubled.length)
        warnings.push(`Table "${label2}" time columns ${doubled.map((c) => JSON.stringify(c.key ?? c.name)).join(", ")} include time tokens in dateFormat while isTimeChecked is on. The renderer appends time itself; use a date-only dateFormat and isTwentyFourHrFormatEnabled for 24-hour time to avoid displaying the time twice.`);
    }
  }
  if (spec.type === "Button" && propVal2(spec.styles ?? {}, "type") === "outline") {
    const textColor = propVal2(spec.styles ?? {}, "textColor") ?? getComponentSchema("Button")?.styles.find((style) => style.key === "textColor")?.default;
    if (textColor === "var(--cc-surface1-surface)") {
      warnings.push(`Button "${label2}": outline background is transparent even when backgroundColor is set. Surface-colored text can disappear against the page or card. Set textColor to a contrasting token such as var(--cc-primary-text), and check iconColor/loaderColor against the actual parent; retain surface-colored text only when the parent provides sufficient contrast.`);
    }
  }
  if (spec.type === "NumberInput") {
    for (const key3 of ["minValue", "maxValue"]) {
      const value2 = propVal2(props, key3);
      if (value2 == null || typeof value2 === "string" && value2.trim() === "")
        continue;
      errors.push(`NumberInput "${label2}": properties.${key3} is ignored by the renderer. Move the limit to top-level validation.${key3}: {value: ...} and clear the legacy property. Gate standalone submit actions on field validity and the intended numeric range; truthiness accepts negative values.`);
    }
  }
  errors.push(...lintBindingSyntax(props, `Component "${label2}".properties`));
  errors.push(...lintBindingSyntax(spec.styles, `Component "${label2}".styles`));
  errors.push(...lintRenderedText(spec));
  errors.push(...lintChartHouseStyle(spec, warnings));
  if (spec.type === "Text") {
    const text = propVal2(props, "text");
    const height = (spec.layouts?.desktop ?? spec.layout)?.height;
    if (typeof text === "string" && typeof height === "number") {
      const needed = estimateTextHeight(text, optionalStaticNumber(propVal2(spec.styles, "textSize")) ?? 14);
      if (needed.lines > 1 && needed.px > height + 6) {
        errors.push(`Text "${label2}": its ${needed.lines}${needed.dynamic ? " static" : ""} lines (font sizes ${needed.sizes.join("/")}px) need about ${needed.px}px but the widget is ${height}px tall, so the last line is cut off. Set height to at least ${Math.ceil(needed.px / 10) * 10}, or split the lines into separate Text widgets.`);
      } else if (needed.dynamic) {
        const likely = estimateTextHeight(text, optionalStaticNumber(propVal2(spec.styles, "textSize")) ?? 14, { bindingLines: true });
        if (likely.lines > 1 && likely.px > height + 6) {
          warnings.push(`Text "${label2}": with one line for each binding between its line breaks, its ${likely.lines} lines need about ${likely.px}px but the widget is ${height}px tall, so the last line is likely cut off. Set height to at least ${Math.ceil(likely.px / 10) * 10}, or turn on dynamicHeight.`);
        }
      }
    }
  }
  if (spec.type === "ModalV2" && !isFalseBinding(propVal2(props, "useDefaultButton"))) {
    const top = (spec.layouts?.desktop ?? spec.layout)?.top;
    errors.push(`ModalV2 "${label2}": properties.useDefaultButton is on (the catalog default), so ToolJet renders a "Launch Modal" trigger button at the modal's own coordinates${typeof top === "number" ? ` (top ${top})` : ""} as a stray block on the page. Set properties.useDefaultButton to false and open the modal from your own Button with a show-modal event.`);
  }
  if ((spec.type === "DropdownV2" || spec.type === "MultiselectV2") && !differsFromCatalogDefault(spec.type, "placeholder", propVal2(props, "placeholder"))) {
    const labelText = propVal2(props, "label");
    if (typeof labelText === "string" && labelText.trim()) {
      warnings.push(`${spec.type} "${label2}": placeholder is the catalog default, so the control reads "Select" until a value is chosen. Set properties.placeholder to the neutral choice for "${labelText.trim()}" (for example "All ${labelText.trim().toLowerCase()}") or give it a default value.`);
    }
  }
  for (const key3 of ["disabledState", "loadingState", "visibility", "collapseWhenHidden"]) {
    const path = `Component "${label2}".properties.${key3}`;
    for (const error of lintBindingSyntax(props[key3], path, true)) {
      if (!errors.includes(error))
        errors.push(error);
    }
  }
  if (["DropdownV2", "MultiselectV2"].includes(spec.type ?? "") && isTruthyBinding(propVal2(props, "advanced"))) {
    for (const error of lintBindingSyntax(props.schema, `Component "${label2}".properties.schema`, true)) {
      if (!errors.includes(error))
        errors.push(error);
    }
  }
  if (spec.slotName !== void 0) {
    if (!isComponentSlotName(spec.slotName)) {
      errors.push(`Component "${label2}": unsupported slot_name "${String(spec.slotName)}"; use header, body, footer, Kanban modal, or a Tabs tab (tab-t0, tab-t1, ...).`);
    }
    if (!spec.parentRef && !spec.parent) {
      errors.push(`Component "${label2}": slot_name requires parent_ref or parent.`);
    }
  }
  const misplaced = Object.keys(props).filter((k) => STYLE_KEYS_IN_PROPERTIES.has(k));
  if (misplaced.length) {
    errors.push(`Component "${label2}": style keys ${JSON.stringify(misplaced)} are under \`properties\`, where ToolJet ignores them \u2014 move them to the top-level \`styles\` object.`);
  }
  const rects = [spec.layout, spec.layouts?.desktop, spec.layouts?.mobile].filter(Boolean);
  for (const r of rects) {
    if ((r.width ?? 0) <= 0 || (r.height ?? 0) <= 0) {
      errors.push(`Component "${label2}": layout has non-positive size (${r.width}\xD7${r.height}) \u2014 it may be invisible.`);
    }
  }
  const componentSchema = spec.type ? getComponentSchema(spec.type) : null;
  if (!spec.type) {
    errors.push(`Component "${label2}": type is required.`);
  } else if (!componentSchema) {
    const suggestion = nearestCatalogKey(spec.type, getCatalog().map((entry) => entry.type));
    errors.push(`Component "${label2}": unknown component type "${spec.type}"; ToolJet may persist an unusable component.` + (suggestion ? ` Did you mean "${suggestion}"?` : " Call get_component_catalog with no type to list supported types."));
  } else {
    const replacement = getLegacyComponentReplacement(spec.type);
    if (replacement) {
      warnings.push(`Component "${label2}": "${spec.type}" is legacy. Keep it only when repairing an existing app; use "${replacement}" for new components.`);
    }
  }
  for (const [sectionName, authored, entries] of [
    ["property", spec.properties, componentSchema?.properties],
    ["style", spec.styles, componentSchema?.styles]
  ]) {
    if (!authored || !entries)
      continue;
    const knownKeys = entries.map((entry) => entry.key);
    for (const key3 of Object.keys(authored)) {
      if (knownKeys.includes(key3))
        continue;
      if (sectionName === "property" && STYLE_KEYS_IN_PROPERTIES.has(key3))
        continue;
      if (sectionName === "property" && INSPECTOR_ONLY_PROPERTIES[spec.type ?? ""]?.includes(key3))
        continue;
      const aliasTarget = PROPERTY_KEY_ALIASES[key3.toLowerCase()];
      const alias = aliasTarget && (knownKeys.includes(aliasTarget) || STYLE_KEYS_IN_PROPERTIES.has(aliasTarget)) ? aliasTarget : void 0;
      const suggestion = alias ?? nearestCatalogKey(key3, knownKeys);
      if (suggestion) {
        errors.push(`Component "${label2}": "${key3}" is not a valid ${sectionName} key for ${spec.type} and is silently ignored \u2014 use "${suggestion}" instead.`);
      } else {
        warnings.push(`Component "${label2}": unknown ${sectionName} key "${key3}" for ${spec.type}; ToolJet may silently ignore it. Check get_component_catalog before authoring this key.`);
      }
    }
    for (const entry of entries) {
      if (!entry.allowedValues?.length)
        continue;
      if (spec.type === "Form" && entry.key === "buttonToSubmit")
        continue;
      const value2 = propVal2(authored, entry.key);
      if (value2 === void 0 || isDynamicBinding(value2))
        continue;
      if (!entry.allowedValues.some((allowed) => Object.is(allowed, value2))) {
        errors.push(`Component "${label2}": unsupported ${sectionName} value ${JSON.stringify(value2)} for "${entry.key}"; allowed values are ${entry.allowedValues.map((allowed) => JSON.stringify(allowed)).join(", ")}. ToolJet silently ignores unsupported enum values.`);
      }
    }
  }
  if (spec.type === "Chart") {
    const title = propVal2(props, "title");
    if (title === void 0) {
      warnings.push(`Chart "${label2}": native title defaults to a non-empty string that clips at common sizes \u2014 set properties.title.value = "" and put a separate Text heading above the chart.`);
    } else if (typeof title === "string" && title.trim() !== "") {
      warnings.push(`Chart "${label2}": native title "${title}" can clip at dashboard sizes \u2014 prefer properties.title.value = "" + a separate Text heading (enable a native title only after visual verification).`);
    }
    const plotFromJson = propVal2(props, "plotFromJson");
    const jsonDescription = propVal2(props, "jsonDescription");
    if (isTruthyBinding(plotFromJson)) {
      if (jsonDescription === void 0) {
        errors.push(`Chart "${label2}": plotFromJson is enabled without an explicit jsonDescription, so ToolJet falls back to demo data. Provide a static Plotly object/string, or prefer the proven simple type + data mode.`);
      } else if (isDynamicBinding(jsonDescription)) {
        warnings.push(`Chart "${label2}": dynamic plotFromJson/jsonDescription cannot be evaluated statically. This is a verification gap, not evidence of a broken chart. Preserve the authored chart configuration; browser-verify that the evaluated chart has at least one trace. Without runtime evidence, report the gap rather than switching chart modes just to clear this warning.`);
      } else {
        let parsed = jsonDescription;
        if (typeof jsonDescription === "string") {
          try {
            parsed = JSON.parse(jsonDescription);
          } catch {
            errors.push(`Chart "${label2}": plotFromJson requires jsonDescription to be valid JSON with a non-empty data array; ToolJet silently renders an empty chart for invalid JSON.`);
            parsed = void 0;
          }
        }
        if (parsed !== void 0) {
          const description = recordValue(parsed);
          if (!description || !Array.isArray(description.data) || description.data.length === 0) {
            errors.push(`Chart "${label2}": plotFromJson jsonDescription must contain a non-empty data array. Use simple type + data mode when an advanced Plotly object is not required.`);
          }
        }
      }
    }
  }
  if (spec.type === "Html" && nestedMapInValue(propVal2(props, "rawHtml"))) {
    warnings.push(`Html "${label2}": rawHtml contains .map() inside another .map(); ToolJet's Html expression evaluator can throw and render the component completely blank before an || fallback runs. Flatten to one filter().map() chain, or pre-shape the nested data in a datasource/RunJS query and bind the simple result. Do not generalize this warning to Table data bindings, where lookup joins such as filter(...)[0] inside map() are supported.`);
  }
  if (unsafeEmptyArrayFirstRowFallback(spec.properties) || unsafeEmptyArrayFirstRowFallback(spec.styles)) {
    warnings.push(`Component "${label2}": a binding uses (data || [{}])[0].field as a first-row fallback, but an empty array is truthy, so zero rows still produce undefined.field and can blank the component. Use (data || [])[0]?.field or data?.[0]?.field instead.`);
  }
  if (spec.type === "Statistics") {
    const secondaryValue = propVal2(props, "secondaryValue");
    if (typeof secondaryValue === "string" && !secondaryValue.includes("{{") && /[A-Za-z]/.test(secondaryValue)) {
      warnings.push(`Statistics "${label2}": secondaryValue "${secondaryValue}" is prose, but ToolJet renders it in a narrow delta slot that can wrap letter-by-letter. Put prose in secondaryValueLabel and leave secondaryValue empty; reserve the value for a number or percentage.`);
    }
    const width = (spec.layouts?.desktop ?? spec.layout)?.width;
    const secondaryHidden = isTruthyBinding(propVal2(props, "hideSecondary"));
    const minimumWidth = secondaryHidden ? STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS : STATISTICS_WITH_SECONDARY_MIN_WIDTH_COLS;
    if (typeof width === "number" && width < minimumWidth) {
      warnings.push(`Statistics "${label2}": desktop width ${width} columns is too narrow; ${secondaryHidden ? "a value-only tile" : "a tile with visible secondary content"} needs at least ${minimumWidth} columns to keep labels and values readable. ${secondaryHidden ? "Use no more than four tiles per content row." : `Use a two-column KPI grid, or set hideSecondary:true and use at least ${STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS} columns.`}`);
    }
    const iconName = catalogValue("Statistics", props, "icon");
    const iconVisible = typeof iconName === "string" && iconName.trim() !== "" && propVal2(props, "iconVisibility") !== false && propVal2(props, "iconVisibility") !== "{{false}}";
    const valueFontPx = optionalStaticNumber(catalogValue("Statistics", spec.styles, "primaryValueSize", "styles"));
    const largeValueFont = valueFontPx === void 0 || valueFontPx > STATISTICS_SAFE_VALUE_FONT_PX;
    if (secondaryHidden && iconVisible && largeValueFont && typeof width === "number" && width < STATISTICS_VALUE_ONLY_WITH_ICON_MIN_WIDTH_COLS) {
      errors.push(`Statistics "${label2}": a value-only tile with an icon at ${width} columns clips its value \u2014 the default ~34px value font plus the icon leaves too little room, so a currency/large number renders truncated (e.g. "$3" for $37,781.64). Fix any one: widen to at least ${STATISTICS_VALUE_ONLY_WITH_ICON_MIN_WIDTH_COLS} columns, set primaryValueSize to ${STATISTICS_SAFE_VALUE_FONT_PX} or less, or remove the icon.`);
    }
    const primaryLabel = catalogValue("Statistics", props, "primaryValueLabel");
    if (secondaryHidden && typeof width === "number" && width >= STATISTICS_VALUE_ONLY_MIN_WIDTH_COLS && width < STATISTICS_WITH_SECONDARY_MIN_WIDTH_COLS && typeof primaryLabel === "string" && !primaryLabel.includes("{{") && // About 25px a column at laptop widths and 7-8px a label character: two characters a column stay on one
    // line (a 13-column tile is ~325px; the old 12-character limit flagged "Arrived / waiting", vet n1).
    primaryLabel.trim().length > width * 2) {
      warnings.push(`Statistics "${label2}": value-only width ${width} columns fits a label of about ${width * 2} characters, but "${primaryLabel}" can wrap vertically and hide the value in the viewer. Shorten the label, use at least 18 columns, or browser-verify the exact viewer width.`);
    }
  }
  if (spec.type === "DropdownV2") {
    for (const key3 of ["value", "defaultValue"]) {
      if (Object.prototype.hasOwnProperty.call(props, key3)) {
        errors.push(`DropdownV2 "${label2}": properties.${key3} is not a supported preselection property. Set visible:true and default:true on the matching option; for an edit form use advanced:true and a schema binding whose option.default compares its value with the raw selected record ID/field. Preserve ID types. Remove this unsupported property after wiring the selection; silently dropping it can clear saved relationships.`);
      }
    }
    const advanced = propVal2(props, "advanced");
    const schema = propVal2(props, "schema");
    const options = propVal2(props, "options");
    const customSchema = differsFromCatalogDefault("DropdownV2", "schema", schema);
    const customOptions = differsFromCatalogDefault("DropdownV2", "options", options);
    if (isTruthyBinding(advanced)) {
      warnings.push(...dropdownDefaultVisibilityWarning(schema, label2));
      if (spec.name)
        warnings.push(...dropdownSelfDefaultWarning(schema, spec.name));
    } else if (advanced === void 0 || isFalseBinding(advanced))
      warnings.push(...dropdownDefaultVisibilityWarning(options, label2));
    if (customOptions && !Array.isArray(options)) {
      errors.push(`DropdownV2 "${label2}": properties.options is static-array-only, but received ${typeof options === "string" && isDynamicBinding(options) ? "a dynamic {{ }} binding" : typeof options}. ToolJet can silently split a binding string into character objects. Use properties.schema with properties.advanced.value="{{true}}" for dynamic options, or pass a literal options array.`);
    } else if (Array.isArray(options)) {
      const malformedIndexes = options.flatMap((option, index) => {
        const entry = recordValue(option);
        return entry && "label" in entry && "value" in entry ? [] : [index];
      });
      if (malformedIndexes.length) {
        errors.push(`DropdownV2 "${label2}": properties.options contains malformed entries at indexes ${malformedIndexes.join(", ")}; each static option must be an object with label and value. This can indicate a previously shredded dynamic binding; replace it with properties.schema + advanced="{{true}}".`);
      }
    }
    if (customSchema && customOptions) {
      warnings.push(`DropdownV2 "${label2}": custom \`schema\` and custom \`options\` are both present, but the modes are mutually exclusive. Use schema with properties.advanced.value="{{true}}", or options with advanced="{{false}}".`);
    }
    if (customSchema && (advanced === void 0 || isFalseBinding(advanced))) {
      warnings.push(`DropdownV2 "${label2}": custom \`schema\` is silently ignored unless properties.advanced.value="{{true}}"; ToolJet will render the static options instead.`);
    }
    if (customOptions && isTruthyBinding(advanced)) {
      warnings.push(`DropdownV2 "${label2}": custom \`options\` are silently ignored while properties.advanced is true; use \`schema\` for dynamic mode or set advanced="{{false}}".`);
    }
  }
  if (spec.type === "DatePickerV2") {
    const defaultValue = propVal2(props, "defaultValue");
    const dateFormat = catalogValue("DatePickerV2", props, "dateFormat");
    const literal = typeof defaultValue === "string" ? defaultValue.trim().replace(/^\{\{\s*(['"])([^'"]+)\1\s*\}\}$/, "$2") : void 0;
    const yearLastFormat = typeof dateFormat === "string" && /^(?:D{1,2}[^A-Za-z]+M{1,4}|M{1,4}[^A-Za-z]+D{1,2})[^A-Za-z]+Y{2,4}$/.test(dateFormat);
    if (literal && /^\d{4}-\d{2}-\d{2}$/.test(literal) && yearLastFormat) {
      errors.push(`DatePickerV2 "${label2}": ISO defaultValue "${literal}" does not match dateFormat "${dateFormat}". ToolJet parses the default with dateFormat, not as ISO automatically. Use dateFormat:"YYYY-MM-DD" or format the default into the selected display format; otherwise the initial day can silently change.`);
    }
    if (typeof defaultValue === "string" && defaultValue.includes("{{") && typeof dateFormat === "string" && !dateFormat.includes("{{")) {
      const formats = [...defaultValue.matchAll(/\.format\(\s*(['"])([^'"]+)\1\s*\)/g)].map((m) => m[2]);
      if (formats.length === 1 && formats[0] !== dateFormat) {
        warnings.push(`DatePickerV2 "${label2}": defaultValue formats as "${formats[0]}" but dateFormat is "${dateFormat}". Check the evaluated default: the parser and display share dateFormat. Match them before authoring dependent queries.`);
      }
    }
    const demoDefault = getComponentSchema("DatePickerV2")?.properties.find((property) => property.key === "defaultValue")?.default;
    if (defaultValue === void 0 || JSON.stringify(defaultValue) === JSON.stringify(demoDefault)) {
      warnings.push(`DatePickerV2 "${label2}": the untouched default renders ToolJet's 01/01/2022 demo date. Set properties.defaultValue.value="{{null}}" for an empty/create field, or bind an explicit date for edit/filter state.`);
    }
  }
  if (spec.type === "KeyValuePair") {
    const data = propVal2(props, "data");
    const fields = propVal2(props, "fields");
    if (data !== void 0 && Array.isArray(fields) && fields.length > 0) {
      const declaredKeys = new Set(fields.flatMap((field) => {
        const key3 = recordValue(field)?.key;
        return typeof key3 === "string" && key3.length > 0 ? [key3] : [];
      }));
      const staticData = recordValue(data);
      const undeclaredKeys = staticData ? Object.keys(staticData).filter((key3) => !declaredKeys.has(key3)) : [];
      if (undeclaredKeys.length > 0 || !staticData && !explicitlyProjectsObjectData(data)) {
        warnings.push(`KeyValuePair "${label2}": explicit fields do not suppress undeclared data keys; ToolJet appends them as visible rows. ` + (undeclaredKeys.length > 0 ? `Undeclared keys: ${undeclaredKeys.join(", ")}. ` : "") + "Project data to a new object containing only the intended field keys; object spreads are not safe projections.");
      }
    }
    if (Array.isArray(fields) && fields.length > 0) {
      const catalogFields = getComponentSchema("KeyValuePair")?.properties.find((property) => property.key === "fields")?.default;
      const catalogKeyById = /* @__PURE__ */ new Map();
      if (Array.isArray(catalogFields)) {
        for (const field of catalogFields) {
          const entry = recordValue(field);
          if (typeof entry?.id === "string" && typeof entry.key === "string") {
            catalogKeyById.set(entry.id, entry.key);
          }
        }
      }
      const deletionHistoryValue = propVal2(props, "fieldDeletionHistory");
      const deletionHistory = new Set(Array.isArray(deletionHistoryValue) ? deletionHistoryValue.filter((key3) => typeof key3 === "string") : []);
      const hasCustomField = fields.some((field) => {
        const id = recordValue(field)?.id;
        return typeof id !== "string" || !catalogKeyById.has(id);
      });
      const contradictoryDemoKeys = hasCustomField ? fields.flatMap((field) => {
        const id = recordValue(field)?.id;
        const key3 = typeof id === "string" ? catalogKeyById.get(id) : void 0;
        return key3 && deletionHistory.has(key3) ? [key3] : [];
      }) : [];
      if (contradictoryDemoKeys.length) {
        warnings.push(`KeyValuePair "${label2}": persisted catalog demo fields (${[...new Set(contradictoryDemoKeys)].join(", ")}) are still present even though fieldDeletionHistory marks them deleted. Deletion history does not remove already-persisted rows; replace properties.fields with the complete intended array in one update.`);
      }
      fields.forEach((field, index) => {
        const entry = recordValue(field);
        if (entry?.fieldType === "string" && (looksDateLikeField(entry.key) || looksDateLikeField(entry.name))) {
          warnings.push(`KeyValuePair "${label2}" field[${index}] "${String(entry.key ?? entry.name)}" looks date/time-like but uses fieldType:"string", which can expose a raw ISO timestamp. Use fieldType:"datepicker" with explicit dateFormat/parseDateFormat matching the source, unless the raw timestamp is intentional.`);
        }
      });
    }
  }
  errors.push(...lintTextFormat(spec));
  errors.push(...lintHtmlContentHeight(spec));
  errors.push(...lintHtmlRootSurface(spec, context.surfaceAround));
  errors.push(...lintUnguardedComponentRefs(spec));
  errors.push(...lintEmbeddedBindingSyntax(spec));
  errors.push(...lintChartDataShape(spec));
  errors.push(...lintUnguardedSelectionText(spec));
  warnings.push(...lintSurfaceInsets(spec));
  if (spec.type === "Table") {
    errors.push(...lintTableColumnsShape(spec));
    const data = propVal2(props, "data");
    const selector = propVal2(props, "dataSourceSelector");
    const autogen = propVal2(props, "autogenerateColumns");
    const columns = propVal2(props, "columns");
    const hasColumns = Array.isArray(columns);
    const projectedDataKeys = projectedTableDataKeys(data);
    const projectsDataKeys = projectedDataKeys !== void 0;
    const desktopHeight = (spec.layouts?.desktop ?? spec.layout)?.height;
    const dynamicHeight = catalogValue("Table", props, "dynamicHeight");
    const contentWrap = catalogValue("Table", spec.styles, "contentWrap", "styles");
    const expandableRows = catalogValue("Table", props, "enableExpandableRows");
    const paginationEnabled = catalogValue("Table", props, "enablePagination");
    const serverSide = catalogValue("Table", props, "serverSidePagination");
    const rowsPerPage = optionalStaticNumber(isTruthyBinding(serverSide) ? catalogValue("Table", props, "serverSideRowsPerPage") : catalogValue("Table", props, "rowsPerPage"));
    if (functionStyleTableMap(data)) {
      errors.push(`Table "${label2}": the projection checker cannot certify a function-style .map() callback. Rewrite map(function(row) { return {id:row.id}; }) as map(row => ({id:row.id})), keeping the same explicit keys. Do not remove columns or disable autogenerateColumns to work around this; use the expression-body arrow or pre-shape complex logic in a query.`);
    } else if (statementBodyMapInValue(data) && typeof data === "string" && data.trim().slice(2, -2).includes("}}")) {
      errors.push(`Table "${label2}": data uses a statement-body .map() callback whose code contains \`}}\`, which ends the binding early, so the table shows no data. Put a space between the braces (} }), use an expression body such as map(row => ({...})), or pre-shape the rows in a RunJS query.`);
    }
    if (typeof desktopHeight === "number" && rowsPerPage !== void 0 && rowsPerPage > 0 && isTruthyBinding(paginationEnabled) && !isTruthyBinding(dynamicHeight) && !isTruthyBinding(expandableRows)) {
      const cellSize = catalogValue("Table", spec.styles, "cellSize", "styles");
      const textRowHeight = cellSize === "condensed" ? TABLE_CONDENSED_ROW_HEIGHT_PX : TABLE_REGULAR_ROW_HEIGHT_PX;
      const hasVisibleChips = Array.isArray(columns) && columns.some((column) => {
        const c = recordValue(column);
        return c?.columnVisibility !== false && c?.columnType === "tagsV2";
      });
      const baseRowHeight = hasVisibleChips ? Math.max(49, textRowHeight) : textRowHeight;
      const rowHeight2 = Math.max(baseRowHeight, isTruthyBinding(contentWrap) ? textRowHeight + 4 : textRowHeight);
      const toolbarVisible = ["displaySearchBox", "showFilterButton", "showDownloadButton", "showAddNewRowButton", "showBulkUpdateActions"].some((key3) => isTruthyBinding(catalogValue("Table", props, key3)));
      const chromeHeight = (toolbarVisible ? TABLE_TOOLBAR_HEIGHT_PX : 0) + TABLE_COLUMN_HEADER_HEIGHT_PX + TABLE_FOOTER_HEIGHT_PX + TABLE_BORDER_PX;
      const minimumHeight = chromeHeight + rowsPerPage * baseRowHeight;
      const estimatedHeight = chromeHeight + rowsPerPage * rowHeight2;
      if (desktopHeight < chromeHeight + baseRowHeight) {
        errors.push(`Table "${label2}": desktop height ${desktopHeight}px cannot show even one data row; use at least ${chromeHeight + baseRowHeight}px.`);
      } else if (desktopHeight < minimumHeight) {
        warnings.push(`Table "${label2}": desktop height ${desktopHeight}px is too short to show ${rowsPerPage} ${cellSize === "condensed" ? "condensed" : "regular"} rows without an inner scrollbar; use about ${estimatedHeight}px, reduce rowsPerPage, or enable dynamicHeight. This is an estimate; wrapped rows vary. Deliberate inner scrolling is valid when the rows and actions remain usable.`);
      }
    }
    if (data !== void 0 && selector !== "rawJson") {
      warnings.push(`Table "${label2}": binds \`data\` but dataSourceSelector is not "rawJson" \u2014 it may render blank. Set properties.dataSourceSelector.value = "rawJson".`);
    }
    if (data !== void 0 && !isTruthyBinding(autogen) && !hasColumns) {
      warnings.push(`Table "${label2}": binds \`data\` with neither autogenerateColumns:true nor an explicit columns array \u2014 columns may not render.`);
    }
    if (data !== void 0 && !hasColumns && !projectsDataKeys && (autogen === void 0 || isTruthyBinding(autogen))) {
      errors.push(`Table "${label2}": bound straight to the query's rows with no authored columns, so ToolJet generates one column per database field and labels each with the raw field name ("flight_number", "delay_code"). Project the data to the keys you want (.map(r => ({...}))) and author the columns array, each {name,key,id,columnType,columnSize,autogenerated:false} with a readable name.`);
    }
    if (hasColumns) {
      const columnKeys = /* @__PURE__ */ new Map();
      columns.forEach((column, index) => {
        const key3 = column?.key;
        if (typeof key3 !== "string" || !key3)
          return;
        const indexes = columnKeys.get(key3) ?? [];
        indexes.push(index);
        columnKeys.set(key3, indexes);
      });
      for (const [key3, indexes] of columnKeys) {
        if (indexes.length > 1) {
          errors.push(`Table "${label2}": duplicate column key "${key3}" at indexes ${indexes.join(", ")} \u2014 ToolJet silently keeps the last column. Use unique keys.`);
        }
      }
      if (isTruthyBinding(autogen) && projectedDataKeys) {
        const undeclaredKeys = projectedDataKeys.filter((key3) => !columnKeys.has(key3));
        if (undeclaredKeys.length) {
          warnings.push(`Table "${label2}": projected data keys ${undeclaredKeys.join(", ")} have no matching explicit column while autogenerateColumns is true, so ToolJet will append them as visible columns. Add matching columns with columnVisibility:false when the data is still needed (for example an id used by row actions), or remove the keys from the projection.`);
        }
      }
      if (isTruthyBinding(autogen) && !projectsDataKeys && data !== void 0) {
        errors.push(`Table "${label2}": has an explicit columns array but autogenerateColumns is still true \u2014 ToolJet will append undeclared datasource fields (often technical IDs) as raw snake_case columns. Project the Table data binding to a new object with only intended keys (.map(r => ({...}))); identity maps and object spreads are not safe projections. This is safer than disabling autogeneration, which can crash some ToolJet Table versions.`);
      }
      const authoredColumns = columns.filter((col) => {
        const c = col;
        return c != null && c.autogenerated !== true && c.autogenerated !== "true";
      });
      if (data !== void 0 && authoredColumns.length === 0 && !projectsDataKeys && (autogen === void 0 || isTruthyBinding(autogen))) {
        errors.push(`Table "${label2}": bound straight to the query's rows with only columns ToolJet generated for itself, so every header is the raw field name ("flight_number", "delay_code"). Project the data to the keys you want (.map(r => ({...}))) and author the columns array, each {name,key,id,columnType,columnSize,autogenerated:false} with a readable name.`);
      }
      const visibleColumnCount = columns.filter((col) => {
        const c = col;
        return c && c.columnVisibility !== false && c.columnVisibility !== "{{false}}";
      }).length;
      const tableWidth = (spec.layouts?.desktop ?? spec.layout)?.width;
      if (typeof tableWidth === "number" && tableWidth > 0 && !parentPlacement(spec)?.parentId) {
        const widthPx = Math.round(tableWidth * CANVAS_COLUMN_PX);
        let sizedPx = 0;
        let unsized = 0;
        for (const col of columns) {
          const c = col;
          if (!c || c.columnVisibility === false || c.columnVisibility === "{{false}}")
            continue;
          if (typeof c.columnSize === "number" && c.columnSize >= 16)
            sizedPx += c.columnSize;
          else
            unsized += 1;
        }
        const neededPx = sizedPx + unsized * TABLE_UNSIZED_COLUMN_MIN_PX;
        if (neededPx > widthPx + 8) {
          errors.push(`Table "${label2}": its ${visibleColumnCount} visible columns need about ${neededPx}px (the columnSize values plus ${TABLE_UNSIZED_COLUMN_MIN_PX}px per unsized column) but the table is ${tableWidth} columns wide, about ${widthPx}px on a laptop, so the last columns are cut off at the right edge. Show fewer columns (detail belongs in a side panel or modal), shrink the columnSize values, or widen the table.`);
        }
      }
      if (visibleColumnCount >= WRAP_REQUIRED_COLUMNS && !isTrueBinding(propVal2(spec.styles, "contentWrap"))) {
        errors.push(`Table "${label2}" has ${visibleColumnCount} columns and styles.contentWrap off (the catalog default), so any value wider than its cell (an email, a description, a timestamp) is cut mid word with no ellipsis. Set styles.contentWrap to true (rows grow to fit) and keep long text columns at columnSize 180 or more.`);
      }
      columns.forEach((col, i) => {
        const c = col;
        for (const req of ["name", "key"]) {
          if (c == null || c[req] === void 0) {
            warnings.push(`Table "${label2}" column[${i}]: missing \`${req}\` \u2014 explicit columns should be {name,key,id,columnType,columnSize,autogenerated:false}.`);
          }
        }
        const deprecatedReplacement = typeof c?.columnType === "string" ? DEPRECATED_TABLE_COLUMN_TYPES[c.columnType] : void 0;
        if (c && c.columnVisibility !== false && c.columnVisibility !== "{{false}}" && typeof c.header === "string" && c.header.trim() && !c.header.includes("{{") && c.header !== c.name) {
          errors.push(`Table "${label2}" column[${i}] "${String(c.key ?? c.name ?? "")}": header is ignored by ToolJet. Put the intended display label in name, keep the source field in key, and remove header.`);
        }
        if (c && c.columnVisibility !== false && c.columnVisibility !== "{{false}}" && typeof c.columnSize === "number" && c.columnSize > 0 && c.columnSize < 16 && ["string", "text", "number", "datepicker", "button"].includes(String(c.columnType))) {
          errors.push(`Table "${label2}" column[${i}] "${String(c.key ?? c.name)}": columnSize ${c.columnSize} is in pixels, not proportional weights or grid columns. Use a readable pixel width (for example 240 for a name, 140 for a date), or omit columnSize for the default.`);
        } else if (c && c.columnVisibility !== false && c.columnVisibility !== "{{false}}" && typeof c.columnSize === "number" && c.columnSize > 0) {
          const type = String(c.columnType ?? "string");
          const heading = columnWords(`${String(c.name ?? "")} ${String(c.key ?? "")}`);
          const base = TABLE_COLUMN_MIN_PX[type] ?? 100;
          const minimum = ["string", "text", "html", "number"].includes(type) ? Math.max(base, MONEY_COLUMN_NAME.test(heading) ? TABLE_COLUMN_MONEY_MIN_PX : 0, NAME_COLUMN_NAME.test(heading) ? TABLE_COLUMN_NAME_MIN_PX : 0) : base;
          if (c.columnSize < minimum) {
            warnings.push(`Table "${label2}" column[${i}] "${String(c.key ?? c.name)}": columnSize ${c.columnSize} is below the readable minimum of ${minimum}px for a ${type} column (possible mid-word wrapping or clipped values). Size for the actual content; deliberate compact columns are valid after visual verification.`);
          }
        }
        if (deprecatedReplacement) {
          errors.push(`Table "${label2}" column[${i}] "${String(c?.key ?? c?.name ?? "")}" uses deprecated columnType:"${String(c?.columnType)}". ToolJet marks it deprecated in the inspector and some deprecated types render an empty cell. Use columnType:"${deprecatedReplacement}" instead.`);
        }
        if (typeof c?.columnType === "string" && !c.columnType.startsWith("{{") && !deprecatedReplacement && !VALID_TABLE_COLUMN_TYPES.has(c.columnType)) {
          errors.push(`Table "${label2}" column[${i}] "${String(c.key ?? c.name)}" has unsupported columnType:"${c.columnType}". ` + (c.columnType === "date" || c.columnType === "datetime" ? 'Use columnType:"datepicker" with explicit dateFormat/parseDateFormat matching the source; unknown types fall back to raw text.' : `Use a supported type: ${[...VALID_TABLE_COLUMN_TYPES].join(", ")}.`));
        }
        if (c && c.headerCasing !== void 0 && !VALID_HEADER_CASING.has(c.headerCasing)) {
          warnings.push(`Table "${label2}" column[${i}]: headerCasing "${String(c.headerCasing)}" is invalid \u2014 use "none" (as typed) or "uppercase".`);
        }
        if (c?.columnType === "string" && // Hidden raw fields preserve selectedRow data; they do not display timestamp cells.
        c.columnVisibility !== false && c.columnVisibility !== "{{false}}" && // The key says what the cell holds; a header alone ("Due" over due_display) is not evidence of a raw timestamp.
        (typeof c.key === "string" && c.key ? looksDateLikeField(c.key) : looksDateLikeField(c.name)) && !authorComputesKey(props?.data, c.key)) {
          warnings.push(`Table "${label2}" column[${i}] "${String(c.key ?? c.name)}" looks date/time-like but uses columnType:"string", which can expose a raw ISO timestamp. Use columnType:"datepicker" with explicit dateFormat/parseDateFormat matching the source, unless the raw timestamp is intentional.`);
        }
        if (c?.columnType === "button") {
          const buttons = c.buttons;
          if (!Array.isArray(buttons) || buttons.length === 0) {
            warnings.push(`Table "${label2}" column[${i}]: button column needs a non-empty \`buttons\` array; read get_component_catalog({type:"Table",sections:["authoringHints"]}).`);
          } else {
            const ids = /* @__PURE__ */ new Set();
            buttons.forEach((button, buttonIndex) => {
              const id = button?.id;
              if (typeof id !== "string" || id.length === 0) {
                warnings.push(`Table "${label2}" column[${i}] button[${buttonIndex}]: missing string \`id\`; its event ref must be <column key or name>::<button id>.`);
              } else if (ids.has(id)) {
                warnings.push(`Table "${label2}" column[${i}]: duplicate button id "${id}" makes event refs ambiguous.`);
              } else {
                ids.add(id);
              }
            });
          }
        }
      });
      const visibleColumns = columns.map((column) => column).filter((column) => column && column.columnVisibility !== false && column.columnVisibility !== "{{false}}");
      const rawHeaderColumns = visibleColumns.map((column) => String(column.name ?? column.key ?? "").trim()).filter((header) => header && (looksRawFieldHeader(header) || looksInternalIdField(header)));
      if (rawHeaderColumns.length) {
        warnings.push(`Table "${label2}": visible columns ${rawHeaderColumns.map((header) => `"${header}"`).join(", ")} expose raw database field names or internal IDs as user-facing headers. Give them human-readable \`name\` labels, or hide internal IDs with columnVisibility:false.`);
      }
      if (visibleColumns.length > TABLE_VISIBLE_COLUMN_WARN) {
        warnings.push(`Table "${label2}": ${visibleColumns.length} visible columns likely overflow the viewport width and force horizontal scrolling. Show only the most useful columns (about ${TABLE_VISIBLE_COLUMN_WARN} or fewer) and hide the rest with columnVisibility:false.`);
      }
    }
    const legacyActions = propVal2(props, "actions");
    if (Array.isArray(legacyActions) && legacyActions.length > 0) {
      warnings.push(`Table "${label2}": properties.actions is the deprecated row-action surface and can render without a reachable event. Use a columnType:"button" column plus table_column onClick events.`);
    }
    if (isTruthyBinding(propVal2(props, "serverSidePagination"))) {
      if (propVal2(props, "serverSideRowsPerPage") === void 0) {
        warnings.push(`Table "${label2}": server-side pagination needs serverSideRowsPerPage bound to the query page size.`);
      }
      if (propVal2(props, "totalRecords") === void 0) {
        warnings.push(`Table "${label2}": server-side pagination needs totalRecords bound to a separate count/metadata query.`);
      }
    }
  }
  if (spec.type === "Form") {
    const mode = propVal2(props, "generateFormFrom");
    const schemaValue = propVal2(props, "newJsonSchema");
    if (mode === "jsonSchema" && schemaValue === void 0) {
      warnings.push(`Form "${label2}": generateFormFrom is "jsonSchema" but newJsonSchema is missing.`);
    }
    if (mode === "rawJson" && propVal2(props, "JSONData") === void 0) {
      warnings.push(`Form "${label2}": generateFormFrom is "rawJson" but JSONData is missing.`);
    }
    const fields = recordValue(recordValue(schemaValue)?.properties);
    if (mode === "jsonSchema" && fields) {
      const standaloneRequiredFields = [];
      for (const [fieldName, rawField] of Object.entries(fields)) {
        const field = recordValue(rawField);
        if (!field)
          continue;
        const type = field.type;
        if (typeof type !== "string" || !FORM_SCHEMA_FIELD_TYPE_SET.has(type)) {
          errors.push(`Form "${label2}" field "${fieldName}": unsupported type "${String(type)}". Use the authoritative Form field-type list; aliases such as email/star/file do not work.`);
          continue;
        }
        if (type === "filepicker") {
          errors.push(`Form "${label2}" field "${fieldName}": type "filepicker" crashes the entire Form. Use a standalone FilePicker component and read components.<picker>.file instead.`);
        }
        if (type === "datepicker" && (field.value === null || field.value === void 0)) {
          warnings.push(`Form "${label2}" field "${fieldName}": a null/omitted datepicker value renders ToolJet's 01/01/2022 demo date. Set value to "{{null}}" for an empty create field.`);
        }
        if (["dropdown", "multiselect"].includes(type)) {
          if ("options" in field) {
            errors.push(`Form "${label2}" field "${fieldName}": ${type} uses "values" and "displayValues", not "options".`);
          }
          if (!("values" in field) || !("displayValues" in field)) {
            warnings.push(`Form "${label2}" field "${fieldName}": ${type} should define both "values" and "displayValues".`);
          }
        }
        if (type !== "filepicker" && !SAFE_GENERATED_FORM_FIELD_TYPE_SET.has(type)) {
          standaloneRequiredFields.push(`${fieldName} (${type})`);
        }
        const validation = recordValue(field.validation);
        if ("required" in field || validation?.required !== void 0) {
          warnings.push(`Form "${label2}" field "${fieldName}": "required" is not a supported Form schema validator. Use validation.minLength or validation.customRule.`);
        }
      }
      if (standaloneRequiredFields.length > 0) {
        errors.push(`Form "${label2}": generated fields ${standaloneRequiredFields.join(", ")} are not layout-safe. FormUtils cannot pass alignment through consistently; Dropdown/Multiselect labels become misaligned and TextArea retains a literal "Label". Build the entire form from standalone components with styles.alignment.value="top"; use a consistent two-column grid and full-width TextArea fields.`);
      }
    }
  }
  if (FORM_INPUT_TYPES.has(spec.type ?? "")) {
    const align = propVal2(spec.styles, "alignment");
    const width = (spec.layouts?.desktop ?? spec.layout)?.width;
    if ((align === void 0 || align === "side") && typeof width === "number" && width <= NARROW_SIDE_LABEL_COLS) {
      warnings.push(`${spec.type} "${label2}": narrow (${width} cols) with a SIDE-aligned label (the default) \u2014 the label eats the input width. Set styles.alignment.value = "top" (label above the control), especially in forms/modals.`);
    }
  }
  return { errors, warnings };
}
function detectOverlaps(components) {
  const warnings = [];
  const items = components.filter((c) => !(c.type === "ModalV2" && isFalseBinding(propVal2(c.properties, "useDefaultButton")))).map((c) => ({
    component: c,
    name: c.name ?? c.type ?? "?",
    r: c.layouts?.desktop ?? c.layout,
    parent: placementKey(c)
  })).filter((x) => !!x.r);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].parent !== items[j].parent)
        continue;
      if (mutuallyExclusiveVisibility(items[i].component, items[j].component))
        continue;
      const a = items[i].r;
      const b = items[j].r;
      const ax = a.left ?? 0, ay = a.top ?? 0, aw = a.width ?? 0, ah = renderedHeight(items[i].component, a);
      const bx = b.left ?? 0, by = b.top ?? 0, bw = b.width ?? 0, bh = renderedHeight(items[j].component, b);
      if (ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah) {
        const increments = [items[i], items[j]].filter((item) => renderedHeight(item.component, item.r) > (item.r.height ?? 0)).map((item) => `"${item.name}" renders ${renderedHeight(item.component, item.r)}px tall (authored ${item.r.height ?? 0}px + ${TOP_ALIGNMENT_HEIGHT_INCREMENT}px for its top-aligned label)`);
        warnings.push(`Components "${items[i].name}" and "${items[j].name}" overlap at rendered desktop size` + (increments.length ? `; ${increments.join(" and ")}` : "") + `.`);
      }
    }
  }
  return warnings;
}
function lintHiddenModalHitTargets(components) {
  const interactive = /* @__PURE__ */ new Set(["Button", "ButtonGroup", "ButtonGroupV2", "Table", "Kanban", "Calendar", "Map", ...FORM_INPUT_TYPES]);
  const warnings = [];
  for (const modal of components) {
    if (modal.type !== "ModalV2" || !isFalseBinding(propVal2(modal.properties, "useDefaultButton")))
      continue;
    const a = modal.layouts?.desktop ?? modal.layout;
    if (!a)
      continue;
    const targets = [];
    for (const target of components) {
      if (!interactive.has(target.type ?? "") || placementKey(target) !== placementKey(modal) || mutuallyExclusiveVisibility(modal, target))
        continue;
      const b = target.layouts?.desktop ?? target.layout;
      if (!b)
        continue;
      if ((a.left ?? 0) < (b.left ?? 0) + (b.width ?? 0) && (b.left ?? 0) < (a.left ?? 0) + (a.width ?? 0) && (a.top ?? 0) < (b.top ?? 0) + renderedHeight(target, b) && (b.top ?? 0) < (a.top ?? 0) + (a.height ?? 0)) {
        targets.push(target.name ?? target.type ?? "?");
      }
    }
    if (targets.length)
      warnings.push(`ModalV2 "${modal.name ?? "?"}" hides its launch button but its canvas footprint overlaps interactive component(s) ${targets.map((n) => `"${n}"`).join(", ")}. The invisible wrapper can intercept clicks even with useDefaultButton:false. Move its footprint to unused canvas space, keeping modal contents in their own slots, and verify the actual trigger is clickable. Do not disable the modal or remove its open action.`);
  }
  return warnings;
}
var TOOLBAR_BUTTON_TYPES = /* @__PURE__ */ new Set(["Button", "ButtonGroup"]);
function lintToolbarButtonAlignment(components) {
  const errors = [];
  const items = components.map((c) => ({ component: c, name: c.name ?? c.type ?? "?", r: c.layouts?.desktop ?? c.layout, parent: placementKey(c) })).filter((x) => !!x.r);
  const grownInputs = items.filter((x) => renderedHeight(x.component, x.r) > (x.r.height ?? 0));
  if (!grownInputs.length)
    return errors;
  for (const button of items) {
    if (!button.component.type || !TOOLBAR_BUTTON_TYPES.has(button.component.type))
      continue;
    const bTop = button.r.top ?? 0;
    const bBottom = bTop + (button.r.height ?? 0);
    for (const input of grownInputs) {
      if (input.parent !== button.parent)
        continue;
      const iTop = input.r.top ?? 0;
      const labelBand = iTop + TOP_ALIGNMENT_HEIGHT_INCREMENT;
      const boxBottom = iTop + renderedHeight(input.component, input.r);
      if (bBottom <= iTop || bTop >= boxBottom)
        continue;
      const bLeft = button.r.left ?? 0, bRight = bLeft + (button.r.width ?? 0);
      const iLeft = input.r.left ?? 0, iRight = iLeft + (input.r.width ?? 0);
      if (bLeft < iRight && iLeft < bRight)
        continue;
      if (bTop >= labelBand)
        continue;
      errors.push(`Button "${button.name}" shares its row with the top-labelled input "${input.name}" but sits at top ${bTop}: the input's label renders in its first ${TOP_ALIGNMENT_HEIGHT_INCREMENT}px and its field box from ${labelBand} to ${boxBottom}, so the button lands on the label band. Set the button's top to ${labelBand} (height ${Math.max(0, boxBottom - labelBand)}) so it aligns with the field, or give the inputs no label and a placeholder instead.`);
      break;
    }
  }
  return errors;
}
function modalTitleText(component) {
  if (component.type !== "Text")
    return void 0;
  const value2 = propVal2(component.properties, "text");
  if (typeof value2 !== "string")
    return void 0;
  let text = "";
  let from = 0;
  for (const span of bindingSpans(value2)) {
    let literal;
    try {
      literal = parseExpression(`(${span.body})`);
    } catch {
      return void 0;
    }
    if (literal.type !== "StringLiteral" && !(literal.type === "TemplateLiteral" && literal.expressions.length === 0))
      return void 0;
    text += value2.slice(from, span.start) + (literal.type === "StringLiteral" ? literal.value : literal.quasis[0]?.value.cooked ?? "");
    from = span.end;
  }
  text += value2.slice(from);
  if (text.includes("{{"))
    return void 0;
  return text.replace(/<[^>]*>/g, " ").replace(/&(?:nbsp|#160|#x0*a0);/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().toLowerCase();
}
function isTitleLikeText(component, headerChildren) {
  if (component.type !== "Text")
    return false;
  const top = (component.layouts?.desktop ?? component.layout)?.top ?? 0;
  if (top > 100)
    return false;
  const text = modalTitleText(component);
  if (!text)
    return false;
  if (headerChildren.length)
    return headerChildren.some((header) => modalTitleText(header) === text);
  if (text.length > 80 || text.split(" ").length > 8 || /[.!?;…]/.test(text) || /^(?:please|enter|select|choose|use|fill|provide)\b/.test(text) || /^(?:add|create|edit|update)\s+(?:the|your)\b/.test(text) || /\b(?:below|above|to continue|to get started)\b/.test(text))
    return false;
  const fontWeight = propVal2(component.styles, "fontWeight");
  const textSize = optionalStaticNumber(propVal2(component.styles, "textSize"));
  const bold = typeof fontWeight === "number" ? fontWeight >= 600 : typeof fontWeight === "string" && /^(?:bold|[6-9]00)$/.test(fontWeight);
  const rawText = propVal2(component.properties, "text");
  return /<h[1-6]\b/i.test(rawText) || bold && /(?:title|heading|header)/i.test(component.name ?? "") || textSize !== void 0 && textSize >= 18;
}
function lintModalChildren(components) {
  const warnings = [];
  const refs = new Map(components.flatMap((component) => {
    const key3 = componentKey(component);
    return key3 ? [[key3, component]] : [];
  }));
  const parentOf = (component) => refs.get(parentPlacement(component)?.parentId ?? "");
  const modalChildren = components.filter((component) => {
    const parent = parentOf(component);
    return parent?.type === "ModalV2" || parent?.type === "Modal";
  });
  const bodyChildren = modalChildren.filter((component) => parentPlacement(component)?.slotName === "body");
  for (const child of bodyChildren) {
    if (!FORM_INPUT_TYPES.has(child.type ?? ""))
      continue;
    const align = propVal2(child.styles, "alignment");
    if (align === void 0 || align === "side") {
      warnings.push(`${child.type} "${child.name ?? child.type}": modal form child uses a SIDE-aligned label \u2014 set styles.alignment.value = "top" so the control gets the full field width.`);
    }
  }
  for (let i = 0; i < bodyChildren.length; i++) {
    for (let j = i + 1; j < bodyChildren.length; j++) {
      const a = bodyChildren[i];
      const b = bodyChildren[j];
      if (parentPlacement(a)?.parentId !== parentPlacement(b)?.parentId || !FORM_INPUT_TYPES.has(a.type ?? "") || !FORM_INPUT_TYPES.has(b.type ?? ""))
        continue;
      const ar = a.layouts?.desktop ?? a.layout;
      const br = b.layouts?.desktop ?? b.layout;
      if (!ar || !br)
        continue;
      const ax = ar.left ?? 0, aw = ar.width ?? 0, ay = ar.top ?? 0, ah = renderedHeight(a, ar);
      const bx = br.left ?? 0, bw = br.width ?? 0, by = br.top ?? 0, bh = renderedHeight(b, br);
      if (!(ax < bx + bw && bx < ax + aw))
        continue;
      const gap = by >= ay + ah ? by - (ay + ah) : ay >= by + bh ? ay - (by + bh) : -1;
      if (gap >= 0 && gap < 10) {
        warnings.push(`Modal fields "${a.name ?? a.type}" and "${b.name ?? b.type}" have only ${gap}px vertical gap \u2014 use at least 10px on ToolJet's vertical grid.`);
      }
    }
  }
  for (const modal of components.filter((component) => component.type === "ModalV2" || component.type === "Modal")) {
    const key3 = componentKey(modal);
    if (!key3)
      continue;
    const children = bodyChildren.filter((child) => parentPlacement(child)?.parentId === key3);
    if (modal.type === "ModalV2" && !isFalseBinding(propVal2(modal.properties, "showHeader"))) {
      const headerChildren = modalChildren.filter((child) => {
        const placement = parentPlacement(child);
        return placement?.parentId === key3 && placement.slotName === "header";
      });
      if (!headerChildren.length) {
        warnings.push(`Modal "${modal.name ?? modal.type}" has showHeader enabled but its native header slot is empty, so it renders reserved blank chrome. Add a Text child with the modal parent_ref/parent and slot_name:"header", or set showHeader:false.`);
      }
      for (const child of children.filter((child2) => isTitleLikeText(child2, headerChildren))) {
        warnings.push(`Modal "${modal.name ?? modal.type}" has title-like Text "${child.name ?? child.type}" in the body while the native header is visible. ` + (headerChildren.length ? "It repeats the native header text; consider removing the duplicate body title." : 'Move that Text to slot_name:"header" to fill the empty native header.'));
      }
    }
    const childBottoms = children.flatMap((child) => {
      const rect = child.layouts?.desktop ?? child.layout;
      return rect ? [{ child, bottom: (rect.top ?? 0) + renderedHeight(child, rect) }] : [];
    });
    if (!childBottoms.length)
      continue;
    const lowest = childBottoms.reduce((current, candidate) => candidate.bottom > current.bottom ? candidate : current);
    const modalHeight = staticNumber(propVal2(modal.properties, "modalHeight"), 400);
    const isV2 = modal.type === "ModalV2";
    const headerHeight = !isV2 || isFalseBinding(propVal2(modal.properties, "showHeader")) ? 0 : staticNumber(propVal2(modal.properties, "headerHeight"), 80);
    const footerHeight = !isV2 || isFalseBinding(propVal2(modal.properties, "showFooter")) ? 0 : staticNumber(propVal2(modal.properties, "footerHeight"), 80);
    const bottomSlack = 20;
    const requiredHeight = lowest.bottom + headerHeight + footerHeight + bottomSlack;
    if (modalHeight < requiredHeight) {
      warnings.push(`Modal "${modal.name ?? modal.type}" has modalHeight ${modalHeight}px but needs at least ${requiredHeight}px for child "${lowest.child.name ?? lowest.child.type}" (rendered bottom ${lowest.bottom}px + ${headerHeight}px header + ${footerHeight}px footer + ${bottomSlack}px bottom slack); content can be clipped or forced into unintended scrolling.`);
    }
  }
  return warnings;
}
function lintRenderedGeometryBlocking(components) {
  return [
    ...detectOverlaps(components),
    ...lintToolbarButtonAlignment(components),
    ...lintModalChildren(components).filter((warning) => !MODAL_HEADER_ADVICE.test(warning)),
    ...lintListviewChildren(components)
  ];
}
var MODAL_HEADER_ADVICE = /native header (?:slot is empty|is visible)/;
function lintNestedContainerWidths(components) {
  const warnings = [];
  const refs = new Map(components.flatMap((component) => {
    const key3 = componentKey(component);
    return key3 ? [[key3, component]] : [];
  }));
  const contentTypes = /* @__PURE__ */ new Set(["Text", "Html", "Table", "Chart", ...FORM_INPUT_TYPES]);
  for (const child of components) {
    const placement = parentPlacement(child);
    const parent = placement && refs.get(placement.parentId);
    if (!parent || !["Container", "Form"].includes(parent.type ?? "") || !contentTypes.has(child.type ?? ""))
      continue;
    const findings = /* @__PURE__ */ new Map();
    for (const resolution of ["desktop", "mobile"]) {
      const rect = child.layouts?.[resolution] ?? child.layout;
      const parentRect = parent.layouts?.[resolution] ?? parent.layout;
      const parentWidth = parentRect?.width;
      if (!rect || typeof parentWidth !== "number" || parentWidth <= 0 || parentWidth > 21 || typeof rect.width !== "number" || rect.width <= 0 || typeof rect.left !== "number" || rect.left < 0 || rect.left + rect.width > parentWidth || typeof rect.top !== "number" || typeof rect.height !== "number")
        continue;
      let rowLeft = rect.left;
      let rowRight = rect.left + rect.width;
      for (const sibling of components) {
        if (sibling === child || placementKey(sibling) !== placementKey(child))
          continue;
        const other = sibling.layouts?.[resolution] ?? sibling.layout;
        if (!other || typeof other.top !== "number" || typeof other.height !== "number" || typeof other.left !== "number" || typeof other.width !== "number")
          continue;
        if (rect.top < other.top + renderedHeight(sibling, other) && other.top < rect.top + renderedHeight(child, rect)) {
          rowLeft = Math.min(rowLeft, other.left);
          rowRight = Math.max(rowRight, other.left + other.width);
        }
      }
      if (rowLeft < 0 || rowRight > parentWidth)
        continue;
      const detail = `${rect.width} occupies only ${Math.round(rect.width / 43 * 100)}% of ${parent.type} "${parent.name ?? parent.id ?? "?"}". The content row spans local columns ${rowLeft}-${rowRight}, fitting the parent's outer ${parentWidth}-column span, which may confuse the two grids. Every Container/Form slot has its own 43-column grid regardless of the outer width. For an inset full-row child use left:2,width:39 (or left:0,width:43 for full width); keep a narrower width only when intentional and browser-verified.`;
      findings.set(detail, [...findings.get(detail) ?? [], resolution]);
    }
    for (const [detail, resolutions] of findings) {
      warnings.push(`${child.type} "${child.name ?? child.id ?? "?"}": ${resolutions.join("/")} width ${detail}`);
    }
  }
  return warnings;
}
function lintRenderedGeometryAdvisory(components) {
  return [
    ...lintNestedContainerWidths(components),
    ...lintDesktopCanvasCoverage(components),
    ...lintCanvasSideGutter(components),
    ...lintModalChildren(components).filter((warning) => MODAL_HEADER_ADVICE.test(warning))
  ];
}
function lintRenderedGeometry(components) {
  return [...lintRenderedGeometryBlocking(components), ...lintRenderedGeometryAdvisory(components)];
}
var THIN_BY_DESIGN = /* @__PURE__ */ new Set(["Divider", "VerticalDivider", "Spacer", "ModalV2", "Modal", "Icon"]);
var MIN_RENDERABLE_HEIGHT = 24;
function lintUnrenderableHeights(components) {
  const errors = [];
  for (const c of components) {
    if (!c.type || THIN_BY_DESIGN.has(c.type))
      continue;
    const height = c.layouts?.desktop?.height;
    if (typeof height !== "number" || height >= MIN_RENDERABLE_HEIGHT)
      continue;
    errors.push(`${c.type} "${c.name ?? c.id ?? "?"}": desktop height ${height}px cannot render its content; heights are pixels on a 10px grid, not row units. Use at least ${MIN_RENDERABLE_HEIGHT}px (inputs 40, headers 60+, KPI strips 120+, tables 300+).`);
  }
  return errors;
}
function lintWidgetContracts(c) {
  const errors = [];
  const label2 = `${c.type} "${c.name ?? c.id ?? c.type}"`;
  const props = c.properties;
  const rect = c.layouts?.desktop ?? c.layout;
  const nested = Boolean(c.parentRef ?? c.parent);
  const wrappedTrue = (v) => Boolean(v && typeof v === "object" && v.value);
  if (c.type === "RadioButtonV2" && !isTruthyBinding(propVal2(props, "advanced"))) {
    const options = propVal2(props, "options");
    if (Array.isArray(options) && options.some((o) => wrappedTrue(o?.default))) {
      errors.push(`${label2}: a static option marked default:{value:true} is never preselected (RadioButtonV2 checks default === true). Set advanced to "{{true}}" and give schema as [{label, value, default: true, visible: true}] with plain booleans.`);
    }
  }
  if (c.type === "TreeSelect" && !isTruthyBinding(propVal2(props, "advanced"))) {
    const hasWrapped = (nodes) => Array.isArray(nodes) && nodes.some((n) => {
      const o = n ?? {};
      return ["visible", "disable", "selected", "expanded"].some((k) => o[k] && typeof o[k] === "object") || hasWrapped(o.children);
    });
    const options = propVal2(props, "options");
    if (Array.isArray(options) && options.some((o) => hasWrapped(o?.children))) {
      errors.push(`${label2}: nested options keep their flags wrapped as {value}, and a wrapped false is truthy (a hidden child shows, an unselected one counts as checked). Set advanced to "{{true}}" and give data with plain boolean flags.`);
    }
  }
  if (c.type === "Navigation") {
    const shownAsTrue = (items) => Array.isArray(items) && items.some((it) => {
      const o = it ?? {};
      const f = o.visible && typeof o.visible === "object" ? o.visible.value : o.visible;
      return f === true || f === "true" || f === "{{true}}" || shownAsTrue(o.children);
    });
    if (shownAsTrue(propVal2(props, "menuItems"))) {
      errors.push(`${label2}: an item with visible true is HIDDEN (Navigation stores "hidden" under visible). Write visible:{value:"{{false}}"} for an item that shows, and {value:"{{true}}"} only to hide one.`);
    }
  }
  if (c.type === "Timer" && propVal2(props, "type") === "countDown" && /^[0:]*$/.test(String(propVal2(props, "value") ?? ""))) {
    errors.push(`${label2}: a countDown timer starting at zero fires onCountDownFinish as the page opens; set value to its start, e.g. "00:05:00:000".`);
  }
  const pages = propVal2(props, "numberOfPages");
  if (c.type === "Pagination" && typeof pages === "string" && !pages.includes("{{")) {
    errors.push(`${label2}: numberOfPages "${pages}" is text, so the last page never matches and next stays enabled; write "{{${pages}}}".`);
  }
  const twoHandle = propVal2(props, "enableTwoHandle");
  if (c.type === "RangeSliderV2" && twoHandle !== void 0 && !["slider", "rangeSlider"].includes(String(twoHandle))) {
    errors.push(`${label2}: enableTwoHandle is "slider" or "rangeSlider" (two handles read startValue/endValue), not ${JSON.stringify(twoHandle)}.`);
  }
  const height = rect?.height;
  const width = rect?.width;
  if (typeof height === "number") {
    const min = c.type === "QrScanner" ? nested || typeof width !== "number" ? 200 : Math.round(width * 28 * 0.9) : c.type === "Camera" ? 300 : c.type === "FilePicker" ? 176 : 0;
    if (height < min) {
      errors.push(`${label2}: height ${height} cuts it off; use at least ${min} (` + (c.type === "QrScanner" ? "its reader is square, as tall as it is wide" : c.type === "Camera" ? "the preview and its buttons" : "the drop zone and the chosen file") + ").");
    }
  }
  return errors;
}
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function lintFormSubmitButtons(components) {
  const errors = [];
  for (const form of components.filter((c) => c.type === "Form")) {
    const value2 = propVal2(form.properties ?? {}, "buttonToSubmit");
    if (value2 === void 0 || value2 === "none" || typeof value2 === "string" && (UUID_RE.test(value2) || isDynamicBinding(value2)))
      continue;
    const formKeys = new Set([form.clientRef, form.name, form.id].filter(Boolean));
    const button = components.find((c) => (c.clientRef ?? c.name) === value2);
    const inForm = button && [button.parentRef, button.parent].some((p) => p && formKeys.has(p.replace(/-(header|footer)$/, "")));
    if (!button || button.type !== "Button" || !inForm) {
      errors.push(`Component "${form.name ?? form.clientRef}": buttonToSubmit ${JSON.stringify(value2)} must name a Button inside this Form (its body, header or footer) by its client_ref (or its name when it has none), or be "none"; the form submits when that Button is clicked.`);
    }
  }
  return errors;
}
function lintComponents(components, options = {}) {
  const errors = [];
  const warnings = [];
  const around = surfaceAroundResolver(components, options.canvasColor);
  warnings.push(...lintSelectedRowProjections(components));
  for (const c of components) {
    const nameError = componentNameError(c.name);
    if (nameError)
      errors.push(nameError);
    const r = lintComponentSpec(c, { surfaceAround: around(c) });
    errors.push(...r.errors);
    errors.push(...lintStandardSingleLineInputHeight(c));
    errors.push(...lintButtonLabelWidth(c));
    warnings.push(...lintUnboundEmptyState(c));
    errors.push(...lintTableProjectionRender(c, warnings));
    errors.push(...lintStaticDisabledSurface(c));
    errors.push(...lintDefaultInputLabel(c));
    errors.push(...lintWidgetContracts(c));
    warnings.push(...r.warnings);
  }
  errors.push(...lintComponentSlots(components));
  errors.push(...lintFormSubmitButtons(components));
  warnings.push(...lintKanbanCardChildren(components));
  warnings.push(...lintStatisticsRows(components));
  warnings.push(...lintEmptyTabs(components));
  errors.push(...lintUnusableTextGeometry(components));
  errors.push(...lintUnrenderableHeights(components));
  errors.push(...lintOversizedWidths(components));
  for (const c of components)
    errors.push(...lintHtmlContentHeight(c), ...lintHtmlRootSurface(c, around(c)), ...lintUnguardedComponentRefs(c), ...lintEmbeddedBindingSyntax(c), ...lintChartDataShape(c), ...lintUnguardedSelectionText(c));
  warnings.push(...lintTextGeometry(components));
  for (const c of components)
    warnings.push(...lintSurfaceInsets(c));
  errors.push(...lintRenderedGeometryBlocking(components));
  warnings.push(...lintRenderedGeometryAdvisory(components));
  warnings.push(...lintKanbanInteractions(components));
  warnings.push(...lintHiddenModalHitTargets(components));
  return { errors, warnings };
}
var uniq = (xs) => [...new Set(xs)];
var KPI_STRIP_VALUE_FONT_MIN_PX = 20;
function isHtmlKpiStrip(rawHtml) {
  if (typeof rawHtml !== "string")
    return false;
  const html = rawHtml.replace(/\s+/g, "");
  if (!/display:(grid|flex)/.test(html))
    return false;
  return [...html.matchAll(/font-size:(\d+)px/g)].some((m) => Number(m[1]) >= KPI_STRIP_VALUE_FONT_MIN_PX);
}
var distinct = (xs) => [...new Set(xs)];
function lintStatTileConsistency(summary) {
  const warnings = [];
  const tiles = [];
  const stripPages = /* @__PURE__ */ new Map();
  for (const page of summary.pages) {
    const pageName = page.name ?? page.id;
    for (const component of page.components) {
      if (component.parent)
        continue;
      const height = (component.layouts?.desktop ?? component.layout)?.height;
      if (component.type === "Statistics") {
        tiles.push({
          page: pageName,
          height: typeof height === "number" ? height : void 0,
          valueSize: optionalStaticNumber(catalogValue("Statistics", component.styles, "primaryValueSize", "styles")),
          labelSize: optionalStaticNumber(catalogValue("Statistics", component.styles, "primaryLabelSize", "styles"))
        });
      } else if (component.type === "Html" && typeof height === "number" && isHtmlKpiStrip(propVal2(component.properties, "rawHtml"))) {
        stripPages.set(pageName, [...stripPages.get(pageName) ?? [], height]);
      }
    }
  }
  const tilePages = distinct(tiles.map((t) => t.page));
  if (tilePages.length > 1) {
    const heights = distinct(tiles.map((t) => t.height).filter((h) => h !== void 0));
    if (heights.length > 1) {
      const perPage = tilePages.map((page) => `${page}: ${distinct(tiles.filter((t) => t.page === page).map((t) => t.height)).join("/")}`).join("; ");
      warnings.push(`Statistics tiles differ in height across pages (${perPage}). Compare equivalent visual roles for accidental drift; overview and detail metrics may intentionally differ. Do not normalize all pages automatically.`);
    }
    const typeScales = distinct(tiles.map((t) => `${t.valueSize ?? "?"}/${t.labelSize ?? "?"}`));
    if (typeScales.length > 1) {
      const perPage = tilePages.map((page) => `${page}: ${distinct(tiles.filter((t) => t.page === page).map((t) => `${t.valueSize ?? "?"}/${t.labelSize ?? "?"}`)).join(", ")}`).join("; ");
      warnings.push(`Statistics tiles use different value/label font sizes across pages (${perPage}, as primaryValueSize/primaryLabelSize). Check equivalent roles for consistency; intentional emphasis and compact detail metrics may use different scales.`);
    }
  }
  if (stripPages.size > 1) {
    const stripHeights = distinct([...stripPages.values()].flat());
    if (stripHeights.length > 1) {
      const perPage = [...stripPages].map(([page, hs]) => `${page}: ${distinct(hs).join("/")}`).join("; ");
      warnings.push(`Html KPI strips differ in height across pages (${perPage}). Check whether their roles and content differ before changing them; different page jobs do not require equal heights or type scales.`);
    }
  }
  const mechanismPages = distinct([...tilePages, ...stripPages.keys()]);
  if (mechanismPages.length > 1 && tilePages.length > 0 && stripPages.size > 0) {
    warnings.push(`Stat rows are built two different ways in one app (Statistics on ${tilePages.join(", ")}; Html KPI strip on ${[...stripPages.keys()].join(", ")}). Both mechanisms are valid; compare equivalent roles for visual consistency without replacing components or adding metrics merely to make pages identical.`);
  }
  return warnings;
}
function validateAppStructure(summary, options = {}) {
  const errors = [];
  const warnings = [];
  warnings.push(...lintEditPrefill(summary));
  warnings.push(...lintUninitializedWriteSelections(summary));
  warnings.push(...lintWhitespaceGuards(summary));
  warnings.push(...lintSelectedRowObjectGuards(summary));
  const allComponents = summary.pages.flatMap((p) => p.components);
  const around = surfaceAroundResolver(allComponents, options.canvasColor);
  const componentNames = new Set(allComponents.map((c) => c.name).filter(Boolean));
  const componentIds = new Set(allComponents.map((c) => c.id));
  const queryNames = new Set(summary.queries.map((q) => q.name).filter(Boolean));
  const queryIds = new Set(summary.queries.map((q) => q.id));
  const pageIds = new Set(summary.pages.map((p) => p.id));
  for (const p of summary.pages) {
    const isNativeHome = p.handle === "home" || p.name === "Home";
    if (p.icon) {
      const iconError = pageIconError(p.icon);
      if (iconError)
        warnings.push(`Page "${p.name ?? p.id}": ${iconError}`);
    }
    if (!isNativeHome && !p.icon) {
      warnings.push(`Page "${p.name ?? p.id}" has no icon \u2014 set a relevant Tabler export so the left sidebar does not use a generic fallback icon.`);
    }
    const counts = /* @__PURE__ */ new Map();
    for (const c of p.components)
      if (c.name)
        counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
    for (const [name, n] of counts) {
      if (n > 1)
        warnings.push(`Page "${p.name}": ${n} components named "${name}" \u2014 {{components.${name}}} is ambiguous.`);
    }
    for (const kanban of p.components.filter((component) => component.type === "Kanban")) {
      if (!p.components.some((component) => component.parent === kanban.id)) {
        warnings.push(`Kanban "${kanban.name ?? kanban.id}" has no nested card child components, so cards can render with correct columns/counts but blank bodies. Recreate it through add_component(s), or add an Html/Text child parented to this Kanban.`);
      }
    }
  }
  {
    const counts = /* @__PURE__ */ new Map();
    for (const q of summary.queries)
      if (q.name)
        counts.set(q.name, (counts.get(q.name) ?? 0) + 1);
    for (const [name, n] of counts) {
      if (n > 1)
        warnings.push(`${n} queries named "${name}" \u2014 {{queries.${name}}} is ambiguous.`);
    }
  }
  const homePage = summary.pages.find((page) => page.handle === "home" || page.name === "Home");
  if (homePage) {
    const appLoadQueryIds = new Set(summary.queries.filter((query) => isTruthyBinding(propVal2(recordValue(query.options), "runOnPageLoad"))).map((query) => query.id));
    for (const event of summary.events) {
      if (event.target !== "page" || event.sourceId !== homePage.id)
        continue;
      const value2 = recordValue(event.event);
      if (value2?.eventId === "onPageLoad" && value2.actionId === "run-query" && typeof value2.queryId === "string" && appLoadQueryIds.has(value2.queryId)) {
        const query = summary.queries.find((candidate) => candidate.id === value2.queryId);
        warnings.push(`Query "${query?.name ?? value2.queryId}" has runOnPageLoad=true and is also run by Home.onPageLoad, so the initial page executes it twice. Keep one lifecycle path; use focused page events for later navigation refreshes.`);
      }
    }
  }
  const queryByName = new Map(summary.queries.flatMap((query) => query.name ? [[query.name, query]] : []));
  for (const query of summary.queries.filter((candidate) => candidate.kind === "runjs")) {
    const options2 = recordValue(query.options);
    const code = options2?.code;
    if (typeof code !== "string")
      continue;
    for (const name of runjsComponentReferences(code)) {
      if (!componentNames.has(name))
        errors.push(`RunJS query "${query.name ?? query.id}" references components[${JSON.stringify(name)}], but no component is named ${JSON.stringify(name)}. Use the persisted component name exactly (bracket notation for spaces); a plan client_ref is not a runtime component name. A fallback can hide the missing reference and silently ignore user input.`);
    }
    const referencedNames = runjsQueryReferences(code);
    for (const name of referencedNames) {
      if (!queryNames.has(name))
        errors.push(`RunJS query "${query.name ?? query.id}" references queries[${JSON.stringify(name)}], but no query is named ${JSON.stringify(name)}. Names are case-sensitive; use the persisted query name exactly (bracket notation for spaces). An empty-array fallback can hide this mistake and make a populated dashboard show zero records.`);
    }
    if (!isTruthyBinding(propVal2(options2, "runOnDependencyChange")))
      continue;
    if (!referencedNames.length)
      continue;
    const explicitlyChained = new Set(summary.events.flatMap((event) => {
      if (event.target !== "data_query")
        return [];
      const payload = recordValue(event.event);
      return payload?.eventId === "onDataQuerySuccess" && payload.actionId === "run-query" && payload.queryId === query.id ? [event.sourceId] : [];
    }));
    const missing = referencedNames.filter((name) => {
      const source = queryByName.get(name);
      return source && !explicitlyChained.has(source.id);
    });
    if (missing.length) {
      warnings.push(`RunJS query "${query.name ?? query.id}" sets runOnDependencyChange=true but reads ${missing.map((name) => `queries.${name}`).join(", ")} as plain JavaScript. ToolJet does not infer those reads as reactive dependencies, so the result can stay empty or stale. Run this query explicitly from each source query's onDataQuerySuccess event (after the source data exists), or invoke it from a later user/page event.`);
    }
  }
  const successChains = new Set(summary.events.flatMap((event) => {
    if (event.target !== "data_query")
      return [];
    const payload = recordValue(event.event);
    return payload?.eventId === "onDataQuerySuccess" && payload.actionId === "run-query" && typeof payload.queryId === "string" ? [`${event.sourceId}->${payload.queryId}`] : [];
  }));
  for (const query of summary.queries.filter((candidate) => candidate.kind !== "runjs")) {
    const options2 = recordValue(query.options);
    if (!options2)
      continue;
    const automatic = isTruthyBinding(propVal2(options2, "runOnPageLoad")) || isTruthyBinding(propVal2(options2, "runOnDependencyChange"));
    if (!automatic)
      continue;
    const blob = JSON.stringify(options2);
    const referencedNames = [...new Set([...blob.matchAll(/\bqueries\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]))];
    const missing = referencedNames.filter((name) => {
      const source = queryByName.get(name);
      return source && source.id !== query.id && !successChains.has(`${source.id}->${query.id}`);
    });
    if (missing.length) {
      warnings.push(`Query dependency race: query "${query.name ?? query.id}" starts automatically but reads ${missing.map((name) => `queries.${name}.data`).join(", ")}. The dependent query can run before its source has returned and remain empty or stale. Disable its automatic start and run it explicitly from each source query's onDataQuerySuccess event, or pass a stable custom-variable/component value instead.`);
    }
  }
  for (const component of allComponents) {
    const blob = JSON.stringify(component.properties ?? "");
    const bad = /* @__PURE__ */ new Set();
    for (const m of blob.matchAll(/\bqueries\.([A-Za-z_][A-Za-z0-9_]*)\??\.data\??\.results\b/g)) {
      const query = queryByName.get(m[1]);
      if (!query || query.kind !== "tooljetdb")
        continue;
      const operation = recordValue(query.options)?.operation;
      if (operation === "sql_execution" || operation === void 0)
        continue;
      bad.add(m[1]);
    }
    for (const name of bad) {
      const operation = String(recordValue(queryByName.get(name)?.options)?.operation);
      errors.push(`${component.type ?? "Component"} "${component.name ?? component.id}": reads queries.${name}.data.results, but "${name}" is a ToolJet DB ${operation} query whose data is the rows array itself; only sql_execution returns {results: rows}. Bind queries.${name}.data instead, or the component shows No data.`);
    }
  }
  for (const component of allComponents) {
    if (!["Table", "ListView", "Chart", "Kanban", "Statistics", "Text", "Html"].includes(component.type ?? ""))
      continue;
    const blob = JSON.stringify(component.properties ?? "");
    const bad = /* @__PURE__ */ new Set();
    for (const m of blob.matchAll(/\bqueries\.([A-Za-z_][A-Za-z0-9_]*)\??\.data(?![\w?]*\.results)\b/g)) {
      const query = queryByName.get(m[1]);
      if (!query || query.kind !== "tooljetdb")
        continue;
      if (recordValue(query.options)?.operation !== "sql_execution")
        continue;
      if (blob.includes(`queries.${m[1]}.data.results`) || blob.includes(`queries.${m[1]}?.data?.results`) || blob.includes(`queries.${m[1]}.data?.results`))
        continue;
      bad.add(m[1]);
    }
    for (const name of bad) {
      errors.push(`${component.type} "${component.name ?? component.id}": reads queries.${name}.data, but "${name}" is a ToolJet DB sql_execution query whose data is {results: rows}. Bind queries.${name}.data.results (or data.results[0].<column> for a single value), or the component shows No data.`);
    }
  }
  for (const component of allComponents) {
    const blob = JSON.stringify(component.properties ?? "");
    const bad = /* @__PURE__ */ new Set();
    for (const m of blob.matchAll(/\bqueries\.([A-Za-z_][A-Za-z0-9_]*)\??\.data\??\.result\b/g)) {
      const query = queryByName.get(m[1]);
      if (!query || query.kind !== "servicenow")
        continue;
      if (isTruthyBinding(propVal2(recordValue(query.options), "enableTransformation")))
        continue;
      bad.add(m[1]);
    }
    for (const name of bad) {
      errors.push(`${component.type ?? "Component"} "${component.name ?? component.id}": reads queries.${name}.data.result, but "${name}" is a ServiceNow query and the plugin already unwraps the REST result envelope: queries.<q>.data is the records array (or the record for get/create/update). Bind queries.${name}.data instead, or the component shows No data.`);
    }
  }
  for (const component of allComponents) {
    const blob = JSON.stringify(component.properties ?? "");
    const bare = /* @__PURE__ */ new Set();
    for (const name of queryByName.keys()) {
      if (!name || !/^[A-Za-z_$][\w$]*$/.test(name))
        continue;
      const pattern = new RegExp(`(?<![\\w$.\\]'"])${name.replace(/\$/g, "\\$")}\\??\\.(data|rawData|isLoading)\\b`);
      if (pattern.test(blob))
        bare.add(name);
    }
    for (const name of bare) {
      errors.push(`${component.type ?? "Component"} "${component.name ?? component.id}": reads ${name}.data by bare name; queries are referenced as queries.${name}.data. A bare name is undefined at runtime and the component shows No data.`);
    }
  }
  for (const component of allComponents) {
    if (component.type !== "Chart")
      continue;
    const props = component.properties ?? {};
    if (isTruthyBinding(propVal2(props, "plotFromJson")))
      continue;
    const data = propVal2(props, "data");
    const m = typeof data === "string" ? data.trim().match(BARE_QUERY_DATA_BINDING) : null;
    if (!m)
      continue;
    const query = queryByName.get(m[1]);
    if (!query || query.kind === "runjs" || query.kind === "runpy")
      continue;
    const options2 = recordValue(query.options);
    const sql = typeof options2?.query === "string" ? options2.query : typeof recordValue(options2?.sql_execution)?.sqlQuery === "string" ? String(recordValue(options2?.sql_execution)?.sqlQuery) : "";
    if (sql && /\bas\s+["'`]?x["'`]?\b/i.test(sql) && /\bas\s+["'`]?y["'`]?\b/i.test(sql))
      continue;
    errors.push(`Chart "${component.name ?? component.id}": data binds queries.${m[1]}.data directly, but "${m[1]}" is a ${query.kind ?? "datasource"} query that does not return columns named x and y. The Chart plots [{x, y}] only and draws an empty axis otherwise. Map the rows: {{queries.${m[1]}.data.map(r => ({x: r.<label>, y: Number(r.<value>)}))}}.`);
  }
  for (const e of summary.events) {
    const name = e.name ?? e.id;
    const validSources = e.target === "data_query" ? queryIds : e.target === "page" ? pageIds : e.target === "component" || e.target === "table_column" || e.target === "table_action" ? componentIds : /* @__PURE__ */ new Set([...componentIds, ...queryIds, ...pageIds]);
    if (e.sourceId && !validSources.has(e.sourceId)) {
      errors.push(`Event "${name}" is attached to a source (${e.sourceId}) that no longer exists.`);
    }
    const ev = e.event ?? {};
    if (ev.actionId === "run-query" && typeof ev.queryId === "string" && !queryIds.has(ev.queryId)) {
      errors.push(`Event "${name}" runs a query (${ev.queryId}) that no longer exists.`);
    }
  }
  const bindingSources = [
    ...allComponents.map((c) => ({ label: `Component "${c.name ?? c.id}"`, value: { p: c.properties, s: c.styles, v: c.validation, o: c.others } })),
    ...summary.queries.map((q) => ({ label: `Query "${q.name ?? q.id}"`, value: q.options })),
    ...summary.events.map((e) => ({ label: `Event "${e.name ?? e.id}"`, value: e.event }))
  ];
  warnings.push(...lintSelectedRowProjections(allComponents, bindingSources.filter((s) => !s.label.startsWith("Component "))));
  for (const source of bindingSources) {
    errors.push(...lintComponentStateBindings(source.value, allComponents, source.label));
    if (!source.label.startsWith("Query "))
      errors.push(...lintBindingNames(source.value, source.label));
    const seen = /* @__PURE__ */ new Set();
    for (const ref of bindingReferences(source.value)) {
      const names = ref.namespace === "components" ? componentNames : queryNames;
      const ids = ref.namespace === "components" ? componentIds : queryIds;
      const key3 = `${ref.namespace}.${ref.name}`;
      if (!names.has(ref.name) && !ids.has(ref.name) && !seen.has(key3)) {
        seen.add(key3);
        errors.push(`${source.label} references ${key3}, but no ${ref.namespace === "components" ? "component" : "query"} is named "${ref.name}". Binding names are case-sensitive; use the persisted name.`);
      }
    }
  }
  for (const c of allComponents) {
    const blob = JSON.stringify({ p: c.properties ?? {}, s: c.styles ?? {} });
    for (const m of blob.matchAll(/\{\{\s*queries\.([A-Za-z0-9_]+)/g)) {
      if (!queryNames.has(m[1])) {
        warnings.push(`Component "${c.name ?? c.id}" binds {{queries.${m[1]}\u2026}} but no query is named "${m[1]}".`);
      }
    }
    for (const m of blob.matchAll(/\{\{\s*components\.([A-Za-z0-9_]+)/g)) {
      if (!componentNames.has(m[1])) {
        warnings.push(`Component "${c.name ?? c.id}" binds {{components.${m[1]}\u2026}} but no component is named "${m[1]}".`);
      }
    }
    const r = lintComponentSpec({
      id: c.id,
      name: c.name ?? c.id,
      type: c.type,
      properties: c.properties,
      styles: c.styles,
      layouts: c.layouts,
      parent: c.parent
    }, { surfaceAround: around(c) });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  const eventsBySource = /* @__PURE__ */ new Map();
  for (const event of summary.events) {
    if (!event.sourceId || event.target !== "component")
      continue;
    const trigger = event.event?.eventId;
    if (typeof trigger !== "string")
      continue;
    const triggers = eventsBySource.get(event.sourceId) ?? /* @__PURE__ */ new Set();
    triggers.add(trigger);
    eventsBySource.set(event.sourceId, triggers);
  }
  for (const table of allComponents.filter((component) => component.type === "Table")) {
    const triggers = eventsBySource.get(table.id) ?? /* @__PURE__ */ new Set();
    const dataBinding = JSON.stringify(propVal2(table.properties, "data") ?? "");
    const boundDataQueries = [...new Set([...dataBinding.matchAll(/queries\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]))];
    const hasReactiveDataQuery = (stateName) => boundDataQueries.some((queryName) => {
      const query = queryByName.get(queryName);
      const options2 = recordValue(query?.options);
      if (!options2 || !isTruthyBinding(propVal2(options2, "runOnDependencyChange")))
        return false;
      return typeof table.name === "string" && JSON.stringify(options2).includes(`components.${table.name}.${stateName}`);
    });
    const requirements = [
      ["serverSidePagination", "onPageChanged", "pageIndex"],
      ["serverSideSearch", "onSearch", "searchText"],
      ["serverSideSort", "onSort", "sortApplied"],
      ["serverSideFilter", "onFilterChanged", "filters"]
    ];
    for (const [property, trigger, stateName] of requirements) {
      if (isTruthyBinding(propVal2(table.properties, property)) && !triggers.has(trigger) && !hasReactiveDataQuery(stateName)) {
        warnings.push(`Table "${table.name ?? table.id}": ${property} is enabled but no ${trigger} event refreshes its data query and no runOnDependencyChange data query is bound to components.${table.name ?? "<table>"}.${stateName}.`);
      }
    }
    const tableColumnRefs = new Set(summary.events.filter((event) => event.sourceId === table.id && event.target === "table_column").map((event) => event.event?.ref).filter((ref) => typeof ref === "string"));
    const columns = propVal2(table.properties, "columns");
    if (Array.isArray(columns)) {
      columns.forEach((column, columnIndex) => {
        const col = column;
        if (col?.columnType !== "button" || col.useDynamicColumn === true || !Array.isArray(col.buttons))
          return;
        const columnKey = col.key ?? col.name;
        if (typeof columnKey !== "string")
          return;
        col.buttons.forEach((button, buttonIndex) => {
          const b = button;
          if (Array.isArray(b?.events) && b.events.length > 0)
            return;
          if (typeof b?.id !== "string")
            return;
          const ref = `${columnKey}::${b.id}`;
          if (!tableColumnRefs.has(ref)) {
            warnings.push(`Table "${table.name ?? table.id}" column[${columnIndex}] button[${buttonIndex}] has no table_column onClick event with ref "${ref}".`);
          }
        });
      });
    }
  }
  for (const p of summary.pages) {
    errors.push(...lintUnusableTextGeometry(p.components));
    errors.push(...lintUnrenderableHeights(p.components));
    errors.push(...lintOversizedWidths(p.components));
    for (const c of p.components)
      errors.push(...lintHtmlContentHeight(c), ...lintHtmlRootSurface(c, around(c)), ...lintUnguardedComponentRefs(c), ...lintEmbeddedBindingSyntax(c), ...lintChartDataShape(c), ...lintUnguardedSelectionText(c));
    warnings.push(...lintTextGeometry(p.components));
    for (const c of p.components)
      warnings.push(...lintSurfaceInsets(c));
    errors.push(...lintRenderedGeometryBlocking(p.components));
    warnings.push(...lintRenderedGeometryAdvisory(p.components));
    warnings.push(...lintKanbanInteractions(p.components));
  }
  warnings.push(...lintInnerPageBands(summary));
  const readiness = lintUntriggeredDataQueries(summary);
  errors.push(...readiness.errors);
  warnings.push(...readiness.warnings);
  warnings.push(...lintAutomaticWrites(summary));
  warnings.push(...lintStatTileConsistency(summary));
  return { errors: uniq(errors), warnings: uniq(warnings) };
}
function hexLuminance(hex) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full))
    return NaN;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function htmlRootHasDarkBackground(rawHtml) {
  const root = rawHtml.match(/<[a-z][a-z0-9]*\b[^>]*\bstyle\s*=\s*"([^"]*)"/i);
  if (!root)
    return false;
  const declaration = root[1].match(/(?:^|;)\s*background(?:-color|-image)?\s*:\s*([^;]+)/i);
  if (!declaration)
    return false;
  const value2 = declaration[1];
  if (/var\(--cc-primary-brand\)/i.test(value2))
    return true;
  const hexes = value2.match(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi) ?? [];
  return hexes.some((hex) => hexLuminance(hex) < 0.35);
}
function lintInnerPageBands(summary) {
  const warnings = [];
  const pages = summary.pages ?? [];
  const explicitHome = pages.some((p) => p.handle === "home" || p.name === "Home" || p.index === 1);
  pages.forEach((page, pageIndex) => {
    const isHome = page.handle === "home" || page.name === "Home" || page.index === 1 || !explicitHome && pageIndex === 0;
    if (isHome)
      return;
    for (const component of page.components ?? []) {
      if (component.type !== "Html" || component.parent)
        continue;
      const rawHtml = propVal2(component.properties ?? {}, "rawHtml");
      if (typeof rawHtml !== "string")
        continue;
      const desktop = component.layouts?.desktop;
      if (!desktop || (desktop.top ?? 0) > 60 || (desktop.height ?? 0) > 200 || (desktop.width ?? 0) < 20)
        continue;
      if (!htmlRootHasDarkBackground(rawHtml))
        continue;
      warnings.push(`Page "${page.name ?? page.id}": Html "${component.name ?? component.id}" is a dark or brand-filled header band on a page that is not Home. The skill's header treatments put a statement band on the home page only; inner pages take a plain title, toolbar or masthead. Keep it only if the design brief chose it for this page deliberately.`);
    }
  });
  return warnings;
}
export {
  SAFE_GENERATED_FORM_FIELD_TYPE_SET as A,
  FORM_SCHEMA_FIELD_TYPE_SET as F,
  PROPERTY_KEY_ALIASES as P,
  STYLE_KEYS_IN_PROPERTIES as S,
  componentNameSchema as a,
  componentNameError as b,
  componentSlotSchema as c,
  decodeComponentParent as d,
  encodeComponentParent as e,
  lintComponentSlots as f,
  lintUnusableTextGeometry as g,
  lintStandardSingleLineInputHeight as h,
  introducedLintFindings as i,
  lintTextGeometry as j,
  lintRenderedGeometry as k,
  lintComponentSpec as l,
  lintKanbanInteractions as m,
  nearestCatalogKey as n,
  assertPageIcon as o,
  lintComponentStateBindings as p,
  minimumTextHeight as q,
  pageIconError as r,
  suggestedHtmlHeight as s,
  lintComponents as t,
  pageIconSchema as u,
  validateAppStructure as v,
  namespaceReads as w,
  lintRenderedGeometryBlocking as x,
  lintRenderedGeometryAdvisory as y,
  lintNestedContainerWidths as z
};
