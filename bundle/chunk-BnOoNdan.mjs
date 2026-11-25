import { createRequire } from "node:module";
import { ax as getComponentSchema, ay as isLibraryPackType, az as serverLibraryPacks, aA as libraryPacksAll } from "./chunk-Cd9iyktb.mjs";
import { p as parseExpression, a as parse } from "./chunk-DdyAhmbE.mjs";
createRequire(import.meta.url);
var UI2_COMMON_RENAMES = {
  actions: { visibility: "setVisibility", disable: "setDisable", loading: "setLoading" }
};
var CHART = { exposed: { clickedDatum: "clickedDataPoint" } };
var PICKER = { events: { onChange: "onSelect" }, actions: { clear: "clearValue" } };
var UI2_RENAMES = {
  ShadAreaChart: CHART,
  ShadBarChart: CHART,
  ShadComboChart: CHART,
  ShadFunnelChart: CHART,
  ShadHeatmapChart: CHART,
  ShadLineChart: CHART,
  ShadPieChart: CHART,
  ShadRadarChart: CHART,
  ShadRadialChart: CHART,
  ShadScatterChart: CHART,
  ShadBreadcrumb: { events: { onItemClick: "onItemClicked" } },
  ShadButtonGroup: { exposed: { values: "selected" } },
  ShadCalendar: { events: { onMonthChange: "onMonthChanged" } },
  ShadCardGrid: { events: { onCardClick: "onCardClicked" } },
  ShadCarousel: { events: { onSlideChange: "onSlideChanged", onSlideClick: "onSlideClicked" } },
  ShadCheckbox: { actions: { setChecked: "setValue" } },
  ShadColorPicker: { exposed: { selectedColorHex: "value", rgb: "selectedColorRGB", rgba: "selectedColorRGBA" } },
  ShadCombobox: { events: { onChange: "onSelect" } },
  ShadDatePicker: {
    events: { onChange: "onSelect" },
    actions: { setDate: "setValue", clear: "clearValue" },
    exposed: { selectedDate: "value" }
  },
  ShadDateTimePicker: { ...PICKER, actions: { setDate: "setValue", clear: "clearValue" } },
  ShadEmpty: { events: { onAction: "onActionClicked" } },
  ShadFileUpload: { actions: { clear: "clearFiles" }, exposed: { files: "file" } },
  ShadHero: { events: { onActionClick: "onActionClicked", onSecondaryActionClick: "onSecondaryActionClicked" } },
  ShadImage: { properties: { src: "source", alt: "alternativeText", fit: "imageFit" } },
  ShadKanban: {
    events: { onCardClicked: "onCardSelected" },
    actions: { updateCard: "updateCardData" },
    exposed: {
      cards: "updatedCardData",
      selectedCard: "lastSelectedCard",
      lastMove: "lastCardMovement",
      movedCard: "lastCardMovement.card"
    }
  },
  ShadLink: { properties: { href: "linkTarget", text: "linkText", target: "targetType" } },
  ShadListView: {
    events: { onRowClicked: "onRecordClicked" },
    exposed: { selectedRow: "selectedRecord", selectedRowId: "selectedRecordId" }
  },
  ShadMap: {
    events: { onMapClick: "onMapClicked", onShapeClick: "onShapeClicked", onLocationPick: "onLocationPicked" }
  },
  ShadMultiselect: { events: { onChange: "onSelect" } },
  ShadNavigation: { events: { onSelect: "onClick" }, actions: { setActive: "selectItem" }, exposed: { activeItem: "selectedItem" } },
  ShadPhoneInput: { actions: { setCountry: "setCountryCode" } },
  ShadNumberInput: { actions: { setValue: "setText" } },
  ShadProgressList: { events: { onItemClick: "onItemClicked" } },
  ShadQuestionnaire: { events: { onStepChange: "onStepChanged" } },
  ShadRadioGroup: { events: { onChange: "onSelectionChange" } },
  ShadRecordList: {
    events: { onRowClicked: "onItemClicked", onRecordClicked: "onItemClicked" },
    exposed: {
      selectedRecord: "selectedItem",
      selectedRow: "selectedItem",
      selectedRecordId: "selectedItemId",
      selectedRowId: "selectedItemId"
    }
  },
  ShadSchedule: { events: { onBookingClick: "onBookingClicked", onSlotClick: "onSlotClicked" } },
  ShadSelect: { events: { onChange: "onSelect" } },
  ShadSteps: { actions: { setDisabled: "setDisable" }, properties: { schema: "steps" } },
  ShadTable: { properties: { pageSize: "rowsPerPage" } },
  ShadTags: { events: { onTagClick: "onTagClicked" } },
  ShadTagsInput: {
    events: { onTagRemoved: "onTagDeleted" },
    exposed: { tags: "values", value: "values", selectedTags: "values" }
  },
  ShadTimePicker: { ...PICKER, actions: { setTime: "setValue", clear: "clearValue" } },
  ShadTimeline: { events: { onItemClick: "onItemClicked" } },
  ShadToggleGroup: { exposed: { selected: "value" } }
};
function retiredUi2Name(type, kind, name) {
  if (!type || !type.startsWith("Shad"))
    return void 0;
  const own = UI2_RENAMES[type]?.[kind];
  if (own && Object.prototype.hasOwnProperty.call(own, name))
    return own[name];
  const common = UI2_COMMON_RENAMES[kind];
  return common && Object.prototype.hasOwnProperty.call(common, name) ? common[name] : void 0;
}
var isNode = (value) => !!value && typeof value === "object" && typeof value.type === "string";
var isMember = (value) => isNode(value) && ["MemberExpression", "OptionalMemberExpression"].includes(value.type);
function memberName(node2) {
  const property = node2.property;
  if (!isNode(property))
    return void 0;
  if (!node2.computed && property.type === "Identifier")
    return String(property.name);
  if (node2.computed && property.type === "StringLiteral")
    return String(property.value);
  return void 0;
}
function bindsComponents(value) {
  if (!isNode(value))
    return false;
  if (value.type === "Identifier")
    return value.name === "components";
  if (value.type === "RestElement")
    return bindsComponents(value.argument);
  if (value.type === "AssignmentPattern")
    return bindsComponents(value.left);
  if (value.type === "ArrayPattern")
    return value.elements.some(bindsComponents);
  if (value.type === "ObjectPattern")
    return value.properties.some((p) => bindsComponents(p.type === "RestElement" ? p.argument : p.value));
  return false;
}
function lintComponentStateBindings(value, components, path) {
  if (Array.isArray(value))
    return value.flatMap((child, i) => lintComponentStateBindings(child, components, `${path}[${i}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key3, child]) => lintComponentStateBindings(child, components, `${path}.${key3}`));
  if (typeof value !== "string")
    return [];
  const binding = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  let root;
  if (binding) {
    try {
      root = parseExpression(binding[1]);
    } catch {
      return [];
    }
  } else if (/\.code$/.test(path)) {
    try {
      root = parse(value, { sourceType: "script", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }).program;
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
    if (!isNode(node2))
      return;
    if (node2.type === "VariableDeclarator" && bindsComponents(node2.id) || /^(Function|Class)(Declaration|Expression)$/.test(node2.type) && bindsComponents(node2.id) || Array.isArray(node2.params) && node2.params.some(bindsComponents) || node2.type === "CatchClause" && bindsComponents(node2.param) || node2.type === "WithStatement" || node2.type === "CallExpression" && isNode(node2.callee) && node2.callee.type === "Identifier" && node2.callee.name === "eval")
      shadowed = true;
    const prop = isMember(node2) ? memberName(node2) : void 0;
    if (prop && isMember(node2.object) && isMember(node2.object.object)) {
      const value2 = node2.object;
      const owner = value2.object;
      if (isNode(owner.object) && owner.object.type === "Identifier" && owner.object.name === "components") {
        const name = memberName(owner);
        const variable = memberName(value2);
        const type = name ? components.find((c) => c.name === name)?.type : void 0;
        if (name && variable && type && missingMember(type, variable, prop)) {
          wrongNames.add(`${name}\0${type}\0${variable}.${prop}`);
        }
      }
    }
    if (prop && isMember(node2.object)) {
      const owner = node2.object;
      if (isNode(owner.object) && owner.object.type === "Identifier" && owner.object.name === "components") {
        const name = memberName(owner);
        const type = name ? components.find((c) => c.name === name)?.type : void 0;
        if (name && type && (WRONG_ALIASES[type]?.[prop] || retiredUi2Message(type, prop, name))) {
          wrongNames.add(`${name}\0${type}\0${prop}`);
        }
      }
    }
    Object.values(node2).forEach(visit);
  };
  visit(root);
  return shadowed ? [] : [...wrongNames].map((key3) => {
    const [name, type, prop] = key3.split("\0");
    if (prop.includes(".")) {
      const [variable, member3] = prop.split(".");
      return `${path}: ${type} "${name}" ${variable} has no ${member3}; it reads undefined at runtime. It has ${missingMember(type, variable, member3).join(", ")}.`;
    }
    return `${path}: ${WRONG_ALIASES[type]?.[prop]?.(name) ?? retiredUi2Message(type, prop, name)}`;
  });
}
function retiredUi2Message(type, prop, name) {
  if (!type.startsWith("Shad") && !isLibraryPackType(type))
    return void 0;
  const schema = getComponentSchema(type);
  if (schema?.exposedVariables?.some((variable) => variable.name === prop))
    return void 0;
  if (schema?.actions?.some((action2) => action2.handle === prop))
    return void 0;
  const exposed = retiredUi2Name(type, "exposed", prop);
  if (exposed) {
    return `${type} "${name}" exposes ${exposed}, not ${prop} (renamed); read components.${name}.${exposed}. The old name is undefined at runtime.`;
  }
  const action = retiredUi2Name(type, "actions", prop);
  if (action) {
    return `${type} "${name}" action ${prop}() was renamed ${action}(); call components.${name}.${action}(...). The old name is undefined at runtime.`;
  }
  const published = schema?.exposedVariables?.map((variable) => variable.name) ?? [];
  if (prop === "id" || !published.length)
    return void 0;
  const meant = UI2_MEANT[prop]?.find((candidate) => published.includes(candidate));
  return `${type} "${name}" has no ${prop}; it reads undefined at runtime. ` + (meant ? `Read components.${name}.${meant}. ` : "") + `It publishes ${published.join(", ")}.`;
}
var UI2_MEANT = {
  checked: ["value"],
  selected: ["value", "selectedItem"],
  selectedValue: ["value"],
  text: ["value"],
  selectedCard: ["selectedItem", "lastSelectedCard"],
  selectedCardId: ["selectedItemId", "selectedItem"],
  selectedId: ["selectedItemId", "selectedRowId"],
  selectedRow: ["selectedItem", "selectedRow"]
};
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
var DATE_PICKERS = /* @__PURE__ */ new Set(["ShadDatePicker", "ShadDateTimePicker", "ShadTimePicker", "Datepicker", "DatePickerV2", "DatetimePickerV2", "TimePicker"]);
function lintEmptyDateWrites(value, components, path) {
  if (Array.isArray(value))
    return value.flatMap((child, i) => lintEmptyDateWrites(child, components, `${path}[${i}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key3, child]) => lintEmptyDateWrites(child, components, `${path}.${key3}`));
  if (typeof value !== "string" || !/\.(create_row|update_rows\.columns)\.[^.]+\.value$/.test(path))
    return [];
  const read = value.trim().match(/^\{\{\s*components\??\.([A-Za-z_$][\w$]*)\??\.value\s*\}\}$/);
  const picker = read ? components.find((c) => c.name === read[1]) : void 0;
  if (!picker?.type || !DATE_PICKERS.has(picker.type))
    return [];
  return [`${path}: ${picker.type} "${picker.name}" is '' while no date is picked, and a date or timestamp column rejects '', so the save fails whenever it is left blank. Write {{ components.${picker.name}.value || null }}.`];
}
function missingMember(type, variable, member3) {
  if (!type.startsWith("Shad"))
    return void 0;
  const entry = getComponentSchema(type)?.exposedVariables?.find((v) => v.name === variable);
  const shape = entry?.shape;
  if (!shape || typeof shape !== "object" || Array.isArray(shape))
    return void 0;
  const members = Object.keys(shape);
  if (members.includes("...") || members.includes(member3))
    return void 0;
  return members;
}
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
    const value = decl.slice(idx + 1).trim().replace(/\s*!important$/i, "");
    if (key3)
      style[key3] = value;
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
    const value = unitless ? parseFloat(lh) * fontSize : px(lh, fontSize);
    if (value !== void 0)
      lineHeight = value;
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
  const key3 = c.type === "Html" ? "rawHtml" : "text";
  const value = propVal(c.properties, key3);
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
function finalChartPointKeys(value) {
  const binding = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value);
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
  const key3 = c.type === "Html" ? "rawHtml" : "text";
  const value = propVal(c.properties, key3);
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
    const value = propVal(props, key3);
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
    errors.push(`${c.type} "${label(c)}": ${key3} reads ${[...bad].join(", ")} without optional chaining. The component evaluates when it mounts, before the inputs it references exist (queries already hold data after in-app navigation), so the reference throws and the ` + (c.type === "Table" ? "Table shows No data" : "binding fails") + " until a filter changes. Write " + fixes.join(", ") + " instead.");
  }
  return errors;
}
createRequire(import.meta.url);
var member = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var rootRef = (n) => {
  if (!member(n) || !["components", "queries"].includes(n.object?.name) || n.object?.type !== "Identifier")
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
  for (const [key3, value] of Object.entries(n))
    if (!["loc", "extra", "comments"].includes(key3))
      walk(value, visit);
}
function lintUntrackedReactiveBindings(value, label2) {
  if (Array.isArray(value))
    return value.flatMap((v) => lintUntrackedReactiveBindings(v, label2));
  if (value && typeof value === "object")
    return Object.values(value).flatMap((v) => lintUntrackedReactiveBindings(v, label2));
  if (typeof value !== "string")
    return [];
  const match = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
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
    if (!member(n))
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
function lintQueryArrayMutations(value, label2) {
  if (Array.isArray(value))
    return value.flatMap((v) => lintQueryArrayMutations(v, label2));
  if (value && typeof value === "object")
    return Object.values(value).flatMap((v) => lintQueryArrayMutations(v, label2));
  if (typeof value !== "string")
    return [];
  const match = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
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
    const ref = member(n) && key(n) === "data" ? rootRef(n.object) : void 0;
    return ref?.startsWith("queries.") ? ref : void 0;
  };
  walk(ast, (n) => {
    if (n.params && /"queries"/.test(JSON.stringify(n.params)) || n.type === "VariableDeclarator" && /"queries"/.test(JSON.stringify(n.id)))
      shadowed = true;
    if (!["CallExpression", "OptionalCallExpression"].includes(n.type) || !member(n.callee) || !["sort", "reverse"].includes(key(n.callee)))
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
var member2 = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
function key2(n) {
  if (!n)
    return;
  const p = node(n.property ?? n.key);
  if (!n.computed && p?.type === "Identifier")
    return String(p.name);
  if (p?.type === "StringLiteral")
    return String(p.value);
}
function expression(value) {
  if (typeof value !== "string")
    return;
  const m = value.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!m)
    return;
  try {
    return parseExpression(m[1]);
  } catch {
    return;
  }
}
function walk2(value, visit) {
  if (Array.isArray(value)) {
    for (const child of value)
      walk2(child, visit);
    return;
  }
  const n = node(value);
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
  if (!member2(callee) || key2(callee) !== "map")
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
  for (const prop of body.properties) {
    const p = node(prop);
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
    const name = member2(selected) && key2(selected) === "selectedRow" && member2(table) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(table) : void 0;
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
  function inspect(value, label2) {
    if (Array.isArray(value)) {
      for (const v of value)
        inspect(v, label2);
      return;
    }
    if (node(value)) {
      for (const v of Object.values(node(value)))
        inspect(v, label2);
      return;
    }
    const root = expression(value);
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
      if (!member2(n))
        return;
      const field = key2(n), selection = node(n.object), table = node(selection?.object), namespace = node(table?.object);
      if (field && member2(selection) && table?.type === "Identifier" && table.name === "variables") {
        const alias = key2(selection), names = alias ? aliases.get(alias) : void 0;
        for (const name2 of names ?? []) {
          const fields = tables.get(name2);
          if (fields && !fields.has(field) && !["toString", "valueOf", "constructor", "hasOwnProperty", "__proto__", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"].includes(field)) {
            const id2 = JSON.stringify([alias, name2]);
            if (!aliasOmissions.has(id2))
              aliasOmissions.set(id2, { alias, table: name2, fields: /* @__PURE__ */ new Set() });
            aliasOmissions.get(id2).fields.add(field);
          }
        }
      }
      if (!field || !member2(selection) || key2(selection) !== "selectedRow" || !member2(table) || namespace?.type !== "Identifier" || namespace.name !== "components")
        return;
      const name = key2(table), keys = name ? tables.get(name) : void 0;
      if (!name || !keys || keys.has(field) || ["toString", "valueOf", "constructor", "hasOwnProperty", "__proto__", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString"].includes(field))
        return;
      warnings.add(`${label2}: reads components.${name}.selectedRow.${field}, but Table "${name}" has a closed map projection that omits "${field}". Preserve the raw field in the row (hide its column if needed), or look up the source record by its stable id. Check edit/review prefill and avoid overwriting omitted values with blanks. If the missing-field fallback is intentional, no change is required.`);
    });
  }
  for (const c of components) {
    const value = { p: c.properties, s: c.styles }, label2 = `Component "${c.name ?? c.id ?? "?"}"`;
    inspect(value, label2);
    for (const warning of lintUntrackedReactiveBindings(value, label2))
      warnings.add(warning);
    for (const warning of lintQueryArrayMutations(value, label2))
      warnings.add(warning);
  }
  for (const source of extraSources)
    inspect(source.value, source.label);
  for (const { alias, table, fields } of aliasOmissions.values()) {
    warnings.add(`Bindings read ${[...fields].map((field) => `variables.${alias}.${field}`).join(", ")}; an event assigns that variable from Table "${table}" selectedRow, whose closed map projection omits ${[...fields].map((field) => `"${field}"`).join(", ")}. This edit can overwrite missing values with a blank/false default. Preserve raw fields or resolve the raw record by stable id before opening the editor; generate_edit_contract can provide that snapshot. Unknown runtime writes are not certified by this advisory.`);
  }
  const unwrap = (value) => node(value) && "value" in node(value) ? node(value).value : value;
  for (const c of components) {
    if (!["TextInput", "TextArea", "EmailInput", "PhoneInput"].includes(c.type ?? ""))
      continue;
    let selected = expression(unwrap(c.properties?.value));
    if (selected?.type === "LogicalExpression" && ["||", "??"].includes(String(selected.operator)))
      selected = node(selected.left);
    if (!member2(selected))
      continue;
    const field = key2(selected), selection = node(selected?.object), owner = node(selection?.object), namespace = node(owner?.object);
    if (!field || !member2(selection))
      continue;
    const tableName = owner?.type === "Identifier" && owner.name === "variables" ? singleAlias(key2(selection) ?? "") : key2(selection) === "selectedRow" && member2(owner) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(owner) : void 0;
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
    let selected = expression(unwrap(c.properties?.[property]));
    if (selected?.type === "LogicalExpression" && ["||", "??"].includes(String(selected.operator)))
      selected = node(selected.left);
    if (!member2(selected))
      continue;
    const field = key2(selected), selection = node(selected?.object), table = node(selection?.object), namespace = node(table?.object);
    if (!field || !member2(selection))
      continue;
    const tableName = table?.type === "Identifier" && table.name === "variables" ? singleAlias(key2(selection) ?? "") : key2(selection) === "selectedRow" && member2(table) && namespace?.type === "Identifier" && namespace.name === "components" ? key2(table) : void 0;
    const value = tableName ? tables.get(tableName)?.get(field) : void 0;
    if (!value)
      continue;
    const formats = [];
    let localizedNumber = false;
    walk2(value, (n) => {
      if (n.type !== "CallExpression")
        return;
      const callee = node(n.callee);
      if (!member2(callee))
        return;
      if (key2(callee) === "toLocaleString" || key2(callee) === "toFixed")
        localizedNumber = true;
      const args = n.arguments;
      if (key2(callee) === "format" && Array.isArray(args) && node(args[0])?.type === "StringLiteral")
        formats.push(String(node(args[0]).value));
    });
    const expected = unwrap(c.properties?.dateFormat) ?? "DD/MM/YYYY";
    if (c.type === "DatePickerV2" && member2(value) && typeof expected === "string" && !expected.includes("{{")) {
      const source = components.find((t) => t.type === "Table" && t.name === tableName);
      const columns = unwrap(source?.properties?.columns);
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
createRequire(import.meta.url);
function componentLibraryChoices() {
  return serverLibraryPacks().map((p) => ({
    value: p.kind === "builtin" ? `pack:${p.pack}` : `lib:${p.libraryId}`,
    name: p.kind === "builtin" && p.pack === "shadcn" ? "Rocket 2.0" : p.libraryName,
    ...p.kind === "builtin" && p.pack === "shadcn" && p.libraryName !== "Rocket 2.0" && { aliases: [p.libraryName] },
    pack: p.prefix.slice(4, -1)
  }));
}
function checkedLibrarySelection(value, library, pack) {
  if (library !== void 0 || pack !== void 0)
    throw new Error("Provide only one library selection.");
  if (!componentLibraryChoices().some((choice) => choice.value === value)) {
    throw new Error(`Component library "${value}" is unavailable in this workspace. Read get_app_summary for the available choices.`);
  }
  return value;
}
var defaultPack = () => {
  const raw = process.env.MCP_AGENT_PACK;
  return (raw === void 0 ? "shadcn" : raw).trim().toLowerCase() || void 0;
};
var savedComponentLibrary = (library, pack) => {
  const chosen = pack?.trim().toLowerCase() || defaultPack();
  return library === "ui2" && chosen ? `pack:${chosen}` : library;
};
var COMPONENT_PACK_DESCRIPTION = "A shipped component pack ID for UI 2.0. For named libraries use library_selection with a value from the workspace catalog.";
var COMPONENT_LIBRARY_NAMES = {
  ui1: "ToolJet UI 1.0",
  ui2: "ToolJet UI 2.0"
};
var isUi2Type = (type) => typeof type === "string" && /^Shad[A-Z]/.test(type);
var isPackType = (type) => typeof type === "string" && /^Lib_[a-z0-9]+_/i.test(type);
function resolveComponentLibrary(globalSettings, componentTypes) {
  const settings = globalSettings;
  const saved = settings?.componentLibrary ?? settings?.component_library;
  if (saved === "ui1" || saved === "ui2")
    return { library: saved, source: "saved" };
  if (typeof saved === "string" && saved.startsWith("pack:") && saved.length > 5) {
    const id2 = saved.slice(5);
    const catalogId = componentLibraryChoices().find((choice) => choice.value === saved)?.pack ?? id2;
    return { library: "ui2", source: "saved", pack: catalogId, ...id2 !== catalogId && { selection: saved } };
  }
  if (typeof saved === "string" && saved.startsWith("lib:")) {
    const choice = componentLibraryChoices().find((item) => item.value === saved);
    return { library: "ui2", source: "saved", selection: saved, ...choice && { pack: choice.pack } };
  }
  for (const type of componentTypes)
    if (isUi2Type(type) || isPackType(type))
      return { library: "ui2", source: "inferred" };
  return { library: "ui1", source: "inferred" };
}
var styleValue = (styles, key3) => {
  const entry = styles?.[key3];
  return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
};
function nativeFitsUi2(component) {
  if (component.type === "FlexContainer" || component.type === "Map")
    return true;
  return component.type === "Table" && styleValue(component.styles, "tableLook") !== "default";
}
function buildPack(library) {
  if (library.pack)
    return library.pack;
  return serverLibraryPacks().length ? defaultPack() : void 0;
}
function packFix(pack) {
  const components = libraryPacksAll().find((p) => p.prefix === `Lib_${pack}_`)?.components ?? {};
  const first = (...names) => names.find((name) => components[name]);
  const dialog = first("Dialog", "Modal");
  const sheet = first("Drawer", "Sheet");
  return `Build with the app's component pack instead: types whose names start with Lib_${pack}_ (get_component_catalog lists them), laid out in FlexContainers; ` + (dialog ? `Lib_${pack}_${dialog} for dialogs; ` : "") + (sheet ? `Lib_${pack}_${sheet} for side sheets; ` : "") + `for tables ToolJet's Table (styles.tableLook "shadcn").`;
}
function componentLibraryWarnings(library, pages, request) {
  if (request?.trim())
    return [];
  const selectedPack = "pack" in library ? library.pack : void 0;
  const off = /* @__PURE__ */ new Map();
  for (const page of pages ?? []) {
    for (const component of page.components ?? []) {
      const type = String(component.type ?? "");
      const ui2Side = isUi2Type(type) || isPackType(type);
      const mismatch = library.library === "ui1" ? ui2Side : selectedPack ? !type.startsWith(`Lib_${selectedPack}_`) && !nativeFitsUi2(component) && type !== "ModalV2" : !ui2Side && !nativeFitsUi2(component);
      if (!mismatch)
        continue;
      off.set(type, [...off.get(type) ?? [], component.name ?? type]);
    }
  }
  if (!off.size)
    return [];
  const listed = [...off].map(([type, names]) => `${type} (${names.slice(0, 3).join(", ")}${names.length > 3 ? ", ..." : ""})`).join("; ");
  const how = library.source === "saved" ? "its saved library" : library.source === "inferred" ? "the library its widgets imply" : "new apps are; pass app_id to check the plan against an existing app";
  const appName = COMPONENT_LIBRARY_NAMES[library.library];
  const pack = library.library === "ui2" ? buildPack(library) : void 0;
  const fix = library.library === "ui1" ? "Build with the native ToolJet types instead (Table, Chart, TextInput, DropdownV2, ModalV2, Container, ...)." : pack ? packFix(pack) : `Build with the UI 2.0 types instead: types whose names start with Shad, laid out in FlexContainers; ShadDialog for dialogs and side sheets; for tables ToolJet's Table (styles.tableLook "shadcn").`;
  return [
    `This app is built in ${appName} (${how}), and the plan adds widgets from the other library: ${listed}. ${fix} If the user asked for the other library in this request, keep the plan and put their words in component_library_request.`
  ];
}
function verifyLibrarySelection(library, pages, expected, existingIds) {
  const choice = componentLibraryChoices().find((item) => item.value === expected);
  const saved = library?.selection ?? (library?.pack ? `pack:${library.pack}` : void 0);
  if (!choice || saved !== expected)
    return ["The app version does not have the requested component library selected and available."];
  const existing = new Set(existingIds);
  const added = pages.flatMap((page) => page.components).filter((component) => !existing.has(component.id));
  const prefix = `Lib_${choice.pack}_`;
  const mismatches = added.filter((c) => !c.type?.startsWith(prefix) && !nativeFitsUi2(c) && c.type !== "ModalV2");
  if (mismatches.length)
    return [`Use ${choice.name} components for: ${mismatches.map((c) => c.name ?? c.id).join(", ")} (expected ${prefix}*).`];
  if (!existing.size && added.length && !added.some((c) => c.type?.startsWith(prefix))) {
    return [`The new UI contains no components from ${choice.name}.`];
  }
  return [];
}
createRequire(import.meta.url);
var DefaultBufferLength = 1024;
var nextPropID = 0;
var Range = class {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }
};
var NodeProp = class {
  /**
  Create a new node prop type.
  */
  constructor(config = {}) {
    this.id = nextPropID++;
    this.perNode = !!config.perNode;
    this.deserialize = config.deserialize || (() => {
      throw new Error("This node type doesn't define a deserialize function");
    });
    this.combine = config.combine || null;
  }
  /**
  This is meant to be used with
  [`NodeSet.extend`](#common.NodeSet.extend) or
  [`LRParser.configure`](#lr.ParserConfig.props) to compute
  prop values for each node type in the set. Takes a [match
  object](#common.NodeType^match) or function that returns undefined
  if the node type doesn't get this prop, and the prop's value if
  it does.
  */
  add(match) {
    if (this.perNode)
      throw new RangeError("Can't add per-node props to node types");
    if (typeof match != "function")
      match = NodeType.match(match);
    return (type) => {
      let result = match(type);
      return result === void 0 ? null : [this, result];
    };
  }
};
NodeProp.closedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.openedBy = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.group = new NodeProp({ deserialize: (str) => str.split(" ") });
NodeProp.isolate = new NodeProp({ deserialize: (value) => {
  if (value && value != "rtl" && value != "ltr" && value != "auto")
    throw new RangeError("Invalid value for isolate: " + value);
  return value || "auto";
} });
NodeProp.contextHash = new NodeProp({ perNode: true });
NodeProp.lookAhead = new NodeProp({ perNode: true });
NodeProp.mounted = new NodeProp({ perNode: true });
var MountedTree = class {
  constructor(tree, overlay, parser, bracketed = false) {
    this.tree = tree;
    this.overlay = overlay;
    this.parser = parser;
    this.bracketed = bracketed;
  }
  /**
  @internal
  */
  static get(tree) {
    return tree && tree.props && tree.props[NodeProp.mounted.id];
  }
};
var noProps = /* @__PURE__ */ Object.create(null);
var NodeType = class _NodeType {
  /**
  @internal
  */
  constructor(name, props, id2, flags = 0) {
    this.name = name;
    this.props = props;
    this.id = id2;
    this.flags = flags;
  }
  /**
  Define a node type.
  */
  static define(spec) {
    let props = spec.props && spec.props.length ? /* @__PURE__ */ Object.create(null) : noProps;
    let flags = (spec.top ? 1 : 0) | (spec.skipped ? 2 : 0) | (spec.error ? 4 : 0) | (spec.name == null ? 8 : 0);
    let type = new _NodeType(spec.name || "", props, spec.id, flags);
    if (spec.props)
      for (let src of spec.props) {
        if (!Array.isArray(src))
          src = src(type);
        if (src) {
          if (src[0].perNode)
            throw new RangeError("Can't store a per-node prop on a node type");
          props[src[0].id] = src[1];
        }
      }
    return type;
  }
  /**
  Retrieves a node prop for this type. Will return `undefined` if
  the prop isn't present on this node.
  */
  prop(prop) {
    return this.props[prop.id];
  }
  /**
  True when this is the top node of a grammar.
  */
  get isTop() {
    return (this.flags & 1) > 0;
  }
  /**
  True when this node is produced by a skip rule.
  */
  get isSkipped() {
    return (this.flags & 2) > 0;
  }
  /**
  Indicates whether this is an error node.
  */
  get isError() {
    return (this.flags & 4) > 0;
  }
  /**
  When true, this node type doesn't correspond to a user-declared
  named node, for example because it is used to cache repetition.
  */
  get isAnonymous() {
    return (this.flags & 8) > 0;
  }
  /**
  Returns true when this node's name or one of its
  [groups](#common.NodeProp^group) matches the given string.
  */
  is(name) {
    if (typeof name == "string") {
      if (this.name == name)
        return true;
      let group = this.prop(NodeProp.group);
      return group ? group.indexOf(name) > -1 : false;
    }
    return this.id == name;
  }
  /**
  Create a function from node types to arbitrary values by
  specifying an object whose property names are node or
  [group](#common.NodeProp^group) names. Often useful with
  [`NodeProp.add`](#common.NodeProp.add). You can put multiple
  names, separated by spaces, in a single property name to map
  multiple node names to a single value.
  */
  static match(map) {
    let direct = /* @__PURE__ */ Object.create(null);
    for (let prop in map)
      for (let name of prop.split(" "))
        direct[name] = map[prop];
    return (node2) => {
      for (let groups = node2.prop(NodeProp.group), i = -1; i < (groups ? groups.length : 0); i++) {
        let found = direct[i < 0 ? node2.name : groups[i]];
        if (found)
          return found;
      }
    };
  }
};
NodeType.none = new NodeType(
  "",
  /* @__PURE__ */ Object.create(null),
  0,
  8
  /* NodeFlag.Anonymous */
);
var NodeSet = class _NodeSet {
  /**
  Create a set with the given types. The `id` property of each
  type should correspond to its position within the array.
  */
  constructor(types) {
    this.types = types;
    for (let i = 0; i < types.length; i++)
      if (types[i].id != i)
        throw new RangeError("Node type ids should correspond to array positions when creating a node set");
  }
  /**
  Create a copy of this set with some node properties added. The
  arguments to this method can be created with
  [`NodeProp.add`](#common.NodeProp.add).
  */
  extend(...props) {
    let newTypes = [];
    for (let type of this.types) {
      let newProps = null;
      for (let source of props) {
        let add = source(type);
        if (add) {
          if (!newProps)
            newProps = Object.assign({}, type.props);
          let value = add[1], prop = add[0];
          if (prop.combine && prop.id in newProps)
            value = prop.combine(newProps[prop.id], value);
          newProps[prop.id] = value;
        }
      }
      newTypes.push(newProps ? new NodeType(type.name, newProps, type.id, type.flags) : type);
    }
    return new _NodeSet(newTypes);
  }
};
var CachedNode = /* @__PURE__ */ new WeakMap();
var CachedInnerNode = /* @__PURE__ */ new WeakMap();
var IterMode;
(function(IterMode2) {
  IterMode2[IterMode2["ExcludeBuffers"] = 1] = "ExcludeBuffers";
  IterMode2[IterMode2["IncludeAnonymous"] = 2] = "IncludeAnonymous";
  IterMode2[IterMode2["IgnoreMounts"] = 4] = "IgnoreMounts";
  IterMode2[IterMode2["IgnoreOverlays"] = 8] = "IgnoreOverlays";
  IterMode2[IterMode2["EnterBracketed"] = 16] = "EnterBracketed";
})(IterMode || (IterMode = {}));
var Tree = class _Tree {
  /**
  Construct a new tree. See also [`Tree.build`](#common.Tree^build).
  */
  constructor(type, children, positions, length, props) {
    this.type = type;
    this.children = children;
    this.positions = positions;
    this.length = length;
    this.props = null;
    if (props && props.length) {
      this.props = /* @__PURE__ */ Object.create(null);
      for (let [prop, value] of props)
        this.props[typeof prop == "number" ? prop : prop.id] = value;
    }
  }
  /**
  @internal
  */
  toString() {
    let mounted = MountedTree.get(this);
    if (mounted && !mounted.overlay)
      return mounted.tree.toString();
    let children = "";
    for (let ch of this.children) {
      let str = ch.toString();
      if (str) {
        if (children)
          children += ",";
        children += str;
      }
    }
    return !this.type.name ? children : (/\W/.test(this.type.name) && !this.type.isError ? JSON.stringify(this.type.name) : this.type.name) + (children.length ? "(" + children + ")" : "");
  }
  /**
  Get a [tree cursor](#common.TreeCursor) positioned at the top of
  the tree. Mode can be used to [control](#common.IterMode) which
  nodes the cursor visits.
  */
  cursor(mode = 0) {
    return new TreeCursor(this.topNode, mode);
  }
  /**
  Get a [tree cursor](#common.TreeCursor) pointing into this tree
  at the given position and side (see
  [`moveTo`](#common.TreeCursor.moveTo).
  */
  cursorAt(pos, side = 0, mode = 0) {
    let scope = CachedNode.get(this) || this.topNode;
    let cursor = new TreeCursor(scope);
    cursor.moveTo(pos, side);
    CachedNode.set(this, cursor._tree);
    return cursor;
  }
  /**
  Get a [syntax node](#common.SyntaxNode) object for the top of the
  tree.
  */
  get topNode() {
    return new TreeNode(this, 0, 0, null);
  }
  /**
  Get the [syntax node](#common.SyntaxNode) at the given position.
  If `side` is -1, this will move into nodes that end at the
  position. If 1, it'll move into nodes that start at the
  position. With 0, it'll only enter nodes that cover the position
  from both sides.
  
  Note that this will not enter
  [overlays](#common.MountedTree.overlay), and you often want
  [`resolveInner`](#common.Tree.resolveInner) instead.
  */
  resolve(pos, side = 0) {
    let node2 = resolveNode(CachedNode.get(this) || this.topNode, pos, side, false);
    CachedNode.set(this, node2);
    return node2;
  }
  /**
  Like [`resolve`](#common.Tree.resolve), but will enter
  [overlaid](#common.MountedTree.overlay) nodes, producing a syntax node
  pointing into the innermost overlaid tree at the given position
  (with parent links going through all parent structure, including
  the host trees).
  */
  resolveInner(pos, side = 0) {
    let node2 = resolveNode(CachedInnerNode.get(this) || this.topNode, pos, side, true);
    CachedInnerNode.set(this, node2);
    return node2;
  }
  /**
  In some situations, it can be useful to iterate through all
  nodes around a position, including those in overlays that don't
  directly cover the position. This method gives you an iterator
  that will produce all nodes, from small to big, around the given
  position.
  */
  resolveStack(pos, side = 0) {
    return stackIterator(this, pos, side);
  }
  /**
  Iterate over the tree and its children, calling `enter` for any
  node that touches the `from`/`to` region (if given) before
  running over such a node's children, and `leave` (if given) when
  leaving the node. When `enter` returns `false`, that node will
  not have its children iterated over (or `leave` called).
  */
  iterate(spec) {
    let { enter, leave, from = 0, to = this.length } = spec;
    let mode = spec.mode || 0, anon = (mode & IterMode.IncludeAnonymous) > 0;
    for (let c = this.cursor(mode | IterMode.IncludeAnonymous); ; ) {
      let entered = false;
      if (c.from <= to && c.to >= from && (!anon && c.type.isAnonymous || enter(c) !== false)) {
        if (c.firstChild())
          continue;
        entered = true;
      }
      for (; ; ) {
        if (entered && leave && (anon || !c.type.isAnonymous))
          leave(c);
        if (c.nextSibling())
          break;
        if (!c.parent())
          return;
        entered = true;
      }
    }
  }
  /**
  Get the value of the given [node prop](#common.NodeProp) for this
  node. Works with both per-node and per-type props.
  */
  prop(prop) {
    return !prop.perNode ? this.type.prop(prop) : this.props ? this.props[prop.id] : void 0;
  }
  /**
  Returns the node's [per-node props](#common.NodeProp.perNode) in a
  format that can be passed to the [`Tree`](#common.Tree)
  constructor.
  */
  get propValues() {
    let result = [];
    if (this.props)
      for (let id2 in this.props)
        result.push([+id2, this.props[id2]]);
    return result;
  }
  /**
  Balance the direct children of this tree, producing a copy of
  which may have children grouped into subtrees with type
  [`NodeType.none`](#common.NodeType^none).
  */
  balance(config = {}) {
    return this.children.length <= 8 ? this : balanceRange(NodeType.none, this.children, this.positions, 0, this.children.length, 0, this.length, (children, positions, length) => new _Tree(this.type, children, positions, length, this.propValues), config.makeTree || ((children, positions, length) => new _Tree(NodeType.none, children, positions, length)));
  }
  /**
  Build a tree from a postfix-ordered buffer of node information,
  or a cursor over such a buffer.
  */
  static build(data) {
    return buildTree(data);
  }
};
Tree.empty = new Tree(NodeType.none, [], [], 0);
var FlatBufferCursor = class _FlatBufferCursor {
  constructor(buffer, index) {
    this.buffer = buffer;
    this.index = index;
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  get pos() {
    return this.index;
  }
  next() {
    this.index -= 4;
  }
  fork() {
    return new _FlatBufferCursor(this.buffer, this.index);
  }
};
var TreeBuffer = class _TreeBuffer {
  /**
  Create a tree buffer.
  */
  constructor(buffer, length, set) {
    this.buffer = buffer;
    this.length = length;
    this.set = set;
  }
  /**
  @internal
  */
  get type() {
    return NodeType.none;
  }
  /**
  @internal
  */
  toString() {
    let result = [];
    for (let index = 0; index < this.buffer.length; ) {
      result.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result.join(",");
  }
  /**
  @internal
  */
  childString(index) {
    let id2 = this.buffer[index], endIndex = this.buffer[index + 3];
    let type = this.set.types[id2], result = type.name;
    if (/\W/.test(result) && !type.isError)
      result = JSON.stringify(result);
    index += 4;
    if (endIndex == index)
      return result;
    let children = [];
    while (index < endIndex) {
      children.push(this.childString(index));
      index = this.buffer[index + 3];
    }
    return result + "(" + children.join(",") + ")";
  }
  /**
  @internal
  */
  findChild(startIndex, endIndex, dir, pos, side) {
    let { buffer } = this, pick = -1;
    for (let i = startIndex; i != endIndex; i = buffer[i + 3]) {
      if (checkSide(side, pos, buffer[i + 1], buffer[i + 2])) {
        pick = i;
        if (dir > 0)
          break;
      }
    }
    return pick;
  }
  /**
  @internal
  */
  slice(startI, endI, from) {
    let b = this.buffer;
    let copy = new Uint16Array(endI - startI), len = 0;
    for (let i = startI, j = 0; i < endI; ) {
      copy[j++] = b[i++];
      copy[j++] = b[i++] - from;
      let to = copy[j++] = b[i++] - from;
      copy[j++] = b[i++] - startI;
      len = Math.max(len, to);
    }
    return new _TreeBuffer(copy, len, this.set);
  }
};
function checkSide(side, pos, from, to) {
  switch (side) {
    case -2:
      return from < pos;
    case -1:
      return to >= pos && from < pos;
    case 0:
      return from < pos && to > pos;
    case 1:
      return from <= pos && to > pos;
    case 2:
      return to > pos;
    case 4:
      return true;
  }
}
function resolveNode(node2, pos, side, overlays) {
  var _a;
  while (node2.from == node2.to || (side < 1 ? node2.from >= pos : node2.from > pos) || (side > -1 ? node2.to <= pos : node2.to < pos)) {
    let parent = !overlays && node2 instanceof TreeNode && node2.index < 0 ? null : node2.parent;
    if (!parent)
      return node2;
    node2 = parent;
  }
  let mode = overlays ? 0 : IterMode.IgnoreOverlays;
  if (overlays)
    for (let scan = node2, parent = scan.parent; parent; scan = parent, parent = scan.parent) {
      if (scan instanceof TreeNode && scan.index < 0 && ((_a = parent.enter(pos, side, mode)) === null || _a === void 0 ? void 0 : _a.from) != scan.from)
        node2 = parent;
    }
  for (; ; ) {
    let inner = node2.enter(pos, side, mode);
    if (!inner)
      return node2;
    node2 = inner;
  }
}
var BaseNode = class {
  cursor(mode = 0) {
    return new TreeCursor(this, mode);
  }
  getChild(type, before = null, after = null) {
    let r = getChildren(this, type, before, after);
    return r.length ? r[0] : null;
  }
  getChildren(type, before = null, after = null) {
    return getChildren(this, type, before, after);
  }
  resolve(pos, side = 0) {
    return resolveNode(this, pos, side, false);
  }
  resolveInner(pos, side = 0) {
    return resolveNode(this, pos, side, true);
  }
  matchContext(context) {
    return matchNodeContext(this.parent, context);
  }
  enterUnfinishedNodesBefore(pos) {
    let scan = this.childBefore(pos), node2 = this;
    while (scan) {
      let last = scan.lastChild;
      if (!last || last.to != scan.to)
        break;
      if (last.type.isError && last.from == last.to) {
        node2 = scan;
        scan = last.prevSibling;
      } else {
        scan = last;
      }
    }
    return node2;
  }
  get node() {
    return this;
  }
  get next() {
    return this.parent;
  }
};
var TreeNode = class _TreeNode extends BaseNode {
  constructor(_tree, from, index, _parent) {
    super();
    this._tree = _tree;
    this.from = from;
    this.index = index;
    this._parent = _parent;
  }
  get type() {
    return this._tree.type;
  }
  get name() {
    return this._tree.type.name;
  }
  get to() {
    return this.from + this._tree.length;
  }
  nextChild(i, dir, pos, side, mode = 0) {
    for (let parent = this; ; ) {
      for (let { children, positions } = parent._tree, e = dir > 0 ? children.length : -1; i != e; i += dir) {
        let next = children[i], start = positions[i] + parent.from, mounted;
        if (!(mode & IterMode.EnterBracketed && next instanceof Tree && (mounted = MountedTree.get(next)) && !mounted.overlay && mounted.bracketed && pos >= start && pos <= start + next.length) && !checkSide(side, pos, start, start + next.length))
          continue;
        if (next instanceof TreeBuffer) {
          if (mode & IterMode.ExcludeBuffers)
            continue;
          let index = next.findChild(0, next.buffer.length, dir, pos - start, side);
          if (index > -1)
            return new BufferNode(new BufferContext(parent, next, i, start), null, index);
        } else if (mode & IterMode.IncludeAnonymous || (!next.type.isAnonymous || hasChild(next))) {
          let mounted2;
          if (!(mode & IterMode.IgnoreMounts) && (mounted2 = MountedTree.get(next)) && !mounted2.overlay)
            return new _TreeNode(mounted2.tree, start, i, parent);
          let inner = new _TreeNode(next, start, i, parent);
          return mode & IterMode.IncludeAnonymous || !inner.type.isAnonymous ? inner : inner.nextChild(dir < 0 ? next.children.length - 1 : 0, dir, pos, side, mode);
        }
      }
      if (mode & IterMode.IncludeAnonymous || !parent.type.isAnonymous)
        return null;
      if (parent.index >= 0)
        i = parent.index + dir;
      else
        i = dir < 0 ? -1 : parent._parent._tree.children.length;
      parent = parent._parent;
      if (!parent)
        return null;
    }
  }
  get firstChild() {
    return this.nextChild(
      0,
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.nextChild(
      0,
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.nextChild(
      this._tree.children.length - 1,
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  prop(prop) {
    return this._tree.prop(prop);
  }
  enter(pos, side, mode = 0) {
    let mounted;
    if (!(mode & IterMode.IgnoreOverlays) && (mounted = MountedTree.get(this._tree)) && mounted.overlay) {
      let rPos = pos - this.from, enterBracketed = mode & IterMode.EnterBracketed && mounted.bracketed;
      for (let { from, to } of mounted.overlay) {
        if ((side > 0 || enterBracketed ? from <= rPos : from < rPos) && (side < 0 || enterBracketed ? to >= rPos : to > rPos))
          return new _TreeNode(mounted.tree, mounted.overlay[0].from + this.from, -1, this);
      }
    }
    return this.nextChild(0, 1, pos, side, mode);
  }
  nextSignificantParent() {
    let val = this;
    while (val.type.isAnonymous && val._parent)
      val = val._parent;
    return val;
  }
  get parent() {
    return this._parent ? this._parent.nextSignificantParent() : null;
  }
  get nextSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index + 1,
      1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get prevSibling() {
    return this._parent && this.index >= 0 ? this._parent.nextChild(
      this.index - 1,
      -1,
      0,
      4
      /* Side.DontCare */
    ) : null;
  }
  get tree() {
    return this._tree;
  }
  toTree() {
    return this._tree;
  }
  /**
  @internal
  */
  toString() {
    return this._tree.toString();
  }
};
function getChildren(node2, type, before, after) {
  let cur = node2.cursor(), result = [];
  if (!cur.firstChild())
    return result;
  if (before != null)
    for (let found = false; !found; ) {
      found = cur.type.is(before);
      if (!cur.nextSibling())
        return result;
    }
  for (; ; ) {
    if (after != null && cur.type.is(after))
      return result;
    if (cur.type.is(type))
      result.push(cur.node);
    if (!cur.nextSibling())
      return after == null ? result : [];
  }
}
function matchNodeContext(node2, context, i = context.length - 1) {
  for (let p = node2; i >= 0; p = p.parent) {
    if (!p)
      return false;
    if (!p.type.isAnonymous) {
      if (context[i] && context[i] != p.name)
        return false;
      i--;
    }
  }
  return true;
}
var BufferContext = class {
  constructor(parent, buffer, index, start) {
    this.parent = parent;
    this.buffer = buffer;
    this.index = index;
    this.start = start;
  }
};
var BufferNode = class _BufferNode extends BaseNode {
  get name() {
    return this.type.name;
  }
  get from() {
    return this.context.start + this.context.buffer.buffer[this.index + 1];
  }
  get to() {
    return this.context.start + this.context.buffer.buffer[this.index + 2];
  }
  constructor(context, _parent, index) {
    super();
    this.context = context;
    this._parent = _parent;
    this.index = index;
    this.type = context.buffer.set.types[context.buffer.buffer[index]];
  }
  child(dir, pos, side) {
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.context.start, side);
    return index < 0 ? null : new _BufferNode(this.context, this, index);
  }
  get firstChild() {
    return this.child(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  get lastChild() {
    return this.child(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  childAfter(pos) {
    return this.child(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  childBefore(pos) {
    return this.child(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  prop(prop) {
    return this.type.prop(prop);
  }
  enter(pos, side, mode = 0) {
    if (mode & IterMode.ExcludeBuffers)
      return null;
    let { buffer } = this.context;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], side > 0 ? 1 : -1, pos - this.context.start, side);
    return index < 0 ? null : new _BufferNode(this.context, this, index);
  }
  get parent() {
    return this._parent || this.context.parent.nextSignificantParent();
  }
  externalSibling(dir) {
    return this._parent ? null : this.context.parent.nextChild(
      this.context.index + dir,
      dir,
      0,
      4
      /* Side.DontCare */
    );
  }
  get nextSibling() {
    let { buffer } = this.context;
    let after = buffer.buffer[this.index + 3];
    if (after < (this._parent ? buffer.buffer[this._parent.index + 3] : buffer.buffer.length))
      return new _BufferNode(this.context, this._parent, after);
    return this.externalSibling(1);
  }
  get prevSibling() {
    let { buffer } = this.context;
    let parentStart = this._parent ? this._parent.index + 4 : 0;
    if (this.index == parentStart)
      return this.externalSibling(-1);
    return new _BufferNode(this.context, this._parent, buffer.findChild(
      parentStart,
      this.index,
      -1,
      0,
      4
      /* Side.DontCare */
    ));
  }
  get tree() {
    return null;
  }
  toTree() {
    let children = [], positions = [];
    let { buffer } = this.context;
    let startI = this.index + 4, endI = buffer.buffer[this.index + 3];
    if (endI > startI) {
      let from = buffer.buffer[this.index + 1];
      children.push(buffer.slice(startI, endI, from));
      positions.push(0);
    }
    return new Tree(this.type, children, positions, this.to - this.from);
  }
  /**
  @internal
  */
  toString() {
    return this.context.buffer.childString(this.index);
  }
};
function iterStack(heads) {
  if (!heads.length)
    return null;
  let pick = 0, picked = heads[0];
  for (let i = 1; i < heads.length; i++) {
    let node2 = heads[i];
    if (node2.from > picked.from || node2.to < picked.to) {
      picked = node2;
      pick = i;
    }
  }
  let next = picked instanceof TreeNode && picked.index < 0 ? null : picked.parent;
  let newHeads = heads.slice();
  if (next)
    newHeads[pick] = next;
  else
    newHeads.splice(pick, 1);
  return new StackIterator(newHeads, picked);
}
var StackIterator = class {
  constructor(heads, node2) {
    this.heads = heads;
    this.node = node2;
  }
  get next() {
    return iterStack(this.heads);
  }
};
function stackIterator(tree, pos, side) {
  let inner = tree.resolveInner(pos, side), layers = null;
  for (let scan = inner instanceof TreeNode ? inner : inner.context.parent; scan; scan = scan.parent) {
    if (scan.index < 0) {
      let parent = scan.parent;
      (layers || (layers = [inner])).push(parent.resolve(pos, side));
      scan = parent;
    } else {
      let mount = MountedTree.get(scan.tree);
      if (mount && mount.overlay && mount.overlay[0].from <= pos && mount.overlay[mount.overlay.length - 1].to >= pos) {
        let root = new TreeNode(mount.tree, mount.overlay[0].from + scan.from, -1, scan);
        (layers || (layers = [inner])).push(resolveNode(root, pos, side, false));
      }
    }
  }
  return layers ? iterStack(layers) : inner;
}
var TreeCursor = class {
  /**
  Shorthand for `.type.name`.
  */
  get name() {
    return this.type.name;
  }
  /**
  @internal
  */
  constructor(node2, mode = 0) {
    this.buffer = null;
    this.stack = [];
    this.index = 0;
    this.bufferNode = null;
    this.mode = mode & ~IterMode.EnterBracketed;
    if (node2 instanceof TreeNode) {
      this.yieldNode(node2);
    } else {
      this._tree = node2.context.parent;
      this.buffer = node2.context;
      for (let n = node2._parent; n; n = n._parent)
        this.stack.unshift(n.index);
      this.bufferNode = node2;
      this.yieldBuf(node2.index);
    }
  }
  yieldNode(node2) {
    if (!node2)
      return false;
    this._tree = node2;
    this.type = node2.type;
    this.from = node2.from;
    this.to = node2.to;
    return true;
  }
  yieldBuf(index, type) {
    this.index = index;
    let { start, buffer } = this.buffer;
    this.type = type || buffer.set.types[buffer.buffer[index]];
    this.from = start + buffer.buffer[index + 1];
    this.to = start + buffer.buffer[index + 2];
    return true;
  }
  /**
  @internal
  */
  yield(node2) {
    if (!node2)
      return false;
    if (node2 instanceof TreeNode) {
      this.buffer = null;
      return this.yieldNode(node2);
    }
    this.buffer = node2.context;
    return this.yieldBuf(node2.index, node2.type);
  }
  /**
  @internal
  */
  toString() {
    return this.buffer ? this.buffer.buffer.childString(this.index) : this._tree.toString();
  }
  /**
  @internal
  */
  enterChild(dir, pos, side) {
    if (!this.buffer)
      return this.yield(this._tree.nextChild(dir < 0 ? this._tree._tree.children.length - 1 : 0, dir, pos, side, this.mode));
    let { buffer } = this.buffer;
    let index = buffer.findChild(this.index + 4, buffer.buffer[this.index + 3], dir, pos - this.buffer.start, side);
    if (index < 0)
      return false;
    this.stack.push(this.index);
    return this.yieldBuf(index);
  }
  /**
  Move the cursor to this node's first child. When this returns
  false, the node has no child, and the cursor has not been moved.
  */
  firstChild() {
    return this.enterChild(
      1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /**
  Move the cursor to this node's last child.
  */
  lastChild() {
    return this.enterChild(
      -1,
      0,
      4
      /* Side.DontCare */
    );
  }
  /**
  Move the cursor to the first child that ends after `pos`.
  */
  childAfter(pos) {
    return this.enterChild(
      1,
      pos,
      2
      /* Side.After */
    );
  }
  /**
  Move to the last child that starts before `pos`.
  */
  childBefore(pos) {
    return this.enterChild(
      -1,
      pos,
      -2
      /* Side.Before */
    );
  }
  /**
  Move the cursor to the child around `pos`. If side is -1 the
  child may end at that position, when 1 it may start there. This
  will also enter [overlaid](#common.MountedTree.overlay)
  [mounted](#common.NodeProp^mounted) trees unless `overlays` is
  set to false.
  */
  enter(pos, side, mode = this.mode) {
    if (!this.buffer)
      return this.yield(this._tree.enter(pos, side, mode));
    return mode & IterMode.ExcludeBuffers ? false : this.enterChild(1, pos, side);
  }
  /**
  Move to the node's parent node, if this isn't the top node.
  */
  parent() {
    if (!this.buffer)
      return this.yieldNode(this.mode & IterMode.IncludeAnonymous ? this._tree._parent : this._tree.parent);
    if (this.stack.length)
      return this.yieldBuf(this.stack.pop());
    let parent = this.mode & IterMode.IncludeAnonymous ? this.buffer.parent : this.buffer.parent.nextSignificantParent();
    this.buffer = null;
    return this.yieldNode(parent);
  }
  /**
  @internal
  */
  sibling(dir) {
    if (!this.buffer)
      return !this._tree._parent ? false : this.yield(this._tree.index < 0 ? null : this._tree._parent.nextChild(this._tree.index + dir, dir, 0, 4, this.mode));
    let { buffer } = this.buffer, d = this.stack.length - 1;
    if (dir < 0) {
      let parentStart = d < 0 ? 0 : this.stack[d] + 4;
      if (this.index != parentStart)
        return this.yieldBuf(buffer.findChild(
          parentStart,
          this.index,
          -1,
          0,
          4
          /* Side.DontCare */
        ));
    } else {
      let after = buffer.buffer[this.index + 3];
      if (after < (d < 0 ? buffer.buffer.length : buffer.buffer[this.stack[d] + 3]))
        return this.yieldBuf(after);
    }
    return d < 0 ? this.yield(this.buffer.parent.nextChild(this.buffer.index + dir, dir, 0, 4, this.mode)) : false;
  }
  /**
  Move to this node's next sibling, if any.
  */
  nextSibling() {
    return this.sibling(1);
  }
  /**
  Move to this node's previous sibling, if any.
  */
  prevSibling() {
    return this.sibling(-1);
  }
  atLastNode(dir) {
    let index, parent, { buffer } = this;
    if (buffer) {
      if (dir > 0) {
        if (this.index < buffer.buffer.buffer.length)
          return false;
      } else {
        for (let i = 0; i < this.index; i++)
          if (buffer.buffer.buffer[i + 3] < this.index)
            return false;
      }
      ({ index, parent } = buffer);
    } else {
      ({ index, _parent: parent } = this._tree);
    }
    for (; parent; { index, _parent: parent } = parent) {
      if (index > -1)
        for (let i = index + dir, e = dir < 0 ? -1 : parent._tree.children.length; i != e; i += dir) {
          let child = parent._tree.children[i];
          if (this.mode & IterMode.IncludeAnonymous || child instanceof TreeBuffer || !child.type.isAnonymous || hasChild(child))
            return false;
        }
    }
    return true;
  }
  move(dir, enter) {
    if (enter && this.enterChild(
      dir,
      0,
      4
      /* Side.DontCare */
    ))
      return true;
    for (; ; ) {
      if (this.sibling(dir))
        return true;
      if (this.atLastNode(dir) || !this.parent())
        return false;
    }
  }
  /**
  Move to the next node in a
  [pre-order](https://en.wikipedia.org/wiki/Tree_traversal#Pre-order,_NLR)
  traversal, going from a node to its first child or, if the
  current node is empty or `enter` is false, its next sibling or
  the next sibling of the first parent node that has one.
  */
  next(enter = true) {
    return this.move(1, enter);
  }
  /**
  Move to the next node in a last-to-first pre-order traversal. A
  node is followed by its last child or, if it has none, its
  previous sibling or the previous sibling of the first parent
  node that has one.
  */
  prev(enter = true) {
    return this.move(-1, enter);
  }
  /**
  Move the cursor to the innermost node that covers `pos`. If
  `side` is -1, it will enter nodes that end at `pos`. If it is 1,
  it will enter nodes that start at `pos`.
  */
  moveTo(pos, side = 0) {
    while (this.from == this.to || (side < 1 ? this.from >= pos : this.from > pos) || (side > -1 ? this.to <= pos : this.to < pos))
      if (!this.parent())
        break;
    while (this.enterChild(1, pos, side)) {
    }
    return this;
  }
  /**
  Get a [syntax node](#common.SyntaxNode) at the cursor's current
  position.
  */
  get node() {
    if (!this.buffer)
      return this._tree;
    let cache = this.bufferNode, result = null, depth = 0;
    if (cache && cache.context == this.buffer) {
      scan: for (let index = this.index, d = this.stack.length; d >= 0; ) {
        for (let c = cache; c; c = c._parent)
          if (c.index == index) {
            if (index == this.index)
              return c;
            result = c;
            depth = d + 1;
            break scan;
          }
        index = this.stack[--d];
      }
    }
    for (let i = depth; i < this.stack.length; i++)
      result = new BufferNode(this.buffer, result, this.stack[i]);
    return this.bufferNode = new BufferNode(this.buffer, result, this.index);
  }
  /**
  Get the [tree](#common.Tree) that represents the current node, if
  any. Will return null when the node is in a [tree
  buffer](#common.TreeBuffer).
  */
  get tree() {
    return this.buffer ? null : this._tree._tree;
  }
  /**
  Iterate over the current node and all its descendants, calling
  `enter` when entering a node and `leave`, if given, when leaving
  one. When `enter` returns `false`, any children of that node are
  skipped, and `leave` isn't called for it.
  */
  iterate(enter, leave) {
    for (let depth = 0; ; ) {
      let mustLeave = false;
      if (this.type.isAnonymous || enter(this) !== false) {
        if (this.firstChild()) {
          depth++;
          continue;
        }
        if (!this.type.isAnonymous)
          mustLeave = true;
      }
      for (; ; ) {
        if (mustLeave && leave)
          leave(this);
        mustLeave = this.type.isAnonymous;
        if (!depth)
          return;
        if (this.nextSibling())
          break;
        this.parent();
        depth--;
        mustLeave = true;
      }
    }
  }
  /**
  Test whether the current node matches a given context—a sequence
  of direct parent node names. Empty strings in the context array
  are treated as wildcards.
  */
  matchContext(context) {
    if (!this.buffer)
      return matchNodeContext(this.node.parent, context);
    let { buffer } = this.buffer, { types } = buffer.set;
    for (let i = context.length - 1, d = this.stack.length - 1; i >= 0; d--) {
      if (d < 0)
        return matchNodeContext(this._tree, context, i);
      let type = types[buffer.buffer[this.stack[d]]];
      if (!type.isAnonymous) {
        if (context[i] && context[i] != type.name)
          return false;
        i--;
      }
    }
    return true;
  }
};
function hasChild(tree) {
  return tree.children.some((ch) => ch instanceof TreeBuffer || !ch.type.isAnonymous || hasChild(ch));
}
function buildTree(data) {
  var _a;
  let { buffer, nodeSet, maxBufferLength = DefaultBufferLength, reused = [], minRepeatType = nodeSet.types.length } = data;
  let cursor = Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer;
  let types = nodeSet.types;
  let contextHash = 0, lookAhead = 0;
  function takeNode(parentStart, minPos, children2, positions2, inRepeat, depth) {
    let { id: id2, start, end, size } = cursor;
    let lookAheadAtStart = lookAhead, contextAtStart = contextHash;
    if (size < 0) {
      cursor.next();
      if (size == -1) {
        let node22 = reused[id2];
        children2.push(node22);
        positions2.push(start - parentStart);
        return;
      } else if (size == -3) {
        contextHash = id2;
        return;
      } else if (size == -4) {
        lookAhead = id2;
        return;
      } else {
        throw new RangeError(`Unrecognized record size: ${size}`);
      }
    }
    let type = types[id2], node2, buffer2;
    let startPos = start - parentStart;
    if (end - start <= maxBufferLength && (buffer2 = findBufferSize(cursor.pos - minPos, inRepeat))) {
      let data2 = new Uint16Array(buffer2.size - buffer2.skip);
      let endPos = cursor.pos - buffer2.size, index = data2.length;
      while (cursor.pos > endPos)
        index = copyToBuffer(buffer2.start, data2, index);
      node2 = new TreeBuffer(data2, end - buffer2.start, nodeSet);
      startPos = buffer2.start - parentStart;
    } else {
      let endPos = cursor.pos - size;
      cursor.next();
      let localChildren = [], localPositions = [];
      let localInRepeat = id2 >= minRepeatType ? id2 : -1;
      let lastGroup = 0, lastEnd = end, groupLookAhead = lookAheadAtStart;
      while (cursor.pos > endPos) {
        if (localInRepeat >= 0 && cursor.id == localInRepeat && cursor.size >= 0) {
          if (cursor.end <= lastEnd - maxBufferLength) {
            makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor.end, lastEnd, localInRepeat, groupLookAhead, contextAtStart);
            lastGroup = localChildren.length;
            lastEnd = cursor.end;
            groupLookAhead = lookAhead;
          }
          cursor.next();
        } else if (depth > 2500) {
          takeFlatNode(start, endPos, localChildren, localPositions);
        } else {
          if (localInRepeat >= 0 && cursor.size == -1 && reused[cursor.id].type == nodeSet.types[localInRepeat]) {
            if (lastGroup < localChildren.length)
              makeRepeatLeaf(localChildren, localPositions, start, lastGroup, cursor.end, lastEnd, localInRepeat, groupLookAhead, contextAtStart);
            lastGroup = localChildren.length + 1;
            lastEnd = cursor.start;
            groupLookAhead = lookAhead;
          }
          takeNode(start, endPos, localChildren, localPositions, localInRepeat, depth + 1);
        }
      }
      if (localInRepeat >= 0 && lastGroup > 0 && lastGroup < localChildren.length)
        makeRepeatLeaf(localChildren, localPositions, start, lastGroup, start, lastEnd, localInRepeat, groupLookAhead, contextAtStart);
      localChildren.reverse();
      localPositions.reverse();
      if (localInRepeat > -1 && lastGroup > 0) {
        let make = makeBalanced(type, contextAtStart);
        node2 = balanceRange(type, localChildren, localPositions, 0, localChildren.length, 0, end - start, make, make);
      } else {
        node2 = makeTree(type, localChildren, localPositions, end - start, lookAheadAtStart - end, contextAtStart);
      }
    }
    children2.push(node2);
    positions2.push(startPos);
  }
  function takeFlatNode(parentStart, minPos, children2, positions2) {
    let nodes = [];
    let nodeCount = 0, stopAt = -1;
    while (cursor.pos > minPos) {
      let { id: id2, start, end, size } = cursor;
      if (size > 4) {
        cursor.next();
      } else if (stopAt > -1 && start < stopAt) {
        break;
      } else {
        if (stopAt < 0)
          stopAt = end - maxBufferLength;
        nodes.push(id2, start, end);
        nodeCount++;
        cursor.next();
      }
    }
    if (nodeCount) {
      let buffer2 = new Uint16Array(nodeCount * 4);
      let start = nodes[nodes.length - 2];
      for (let i = nodes.length - 3, j = 0; i >= 0; i -= 3) {
        buffer2[j++] = nodes[i];
        buffer2[j++] = nodes[i + 1] - start;
        buffer2[j++] = nodes[i + 2] - start;
        buffer2[j++] = j;
      }
      children2.push(new TreeBuffer(buffer2, nodes[2] - start, nodeSet));
      positions2.push(start - parentStart);
    }
  }
  function makeBalanced(type, contextHash2) {
    return (children2, positions2, length2) => {
      let lookAhead2 = 0, lastI = children2.length - 1, last, lookAheadProp;
      if (lastI >= 0 && (last = children2[lastI]) instanceof Tree) {
        if (!lastI && last.type == type && last.length == length2)
          return last;
        if (lookAheadProp = last.prop(NodeProp.lookAhead))
          lookAhead2 = positions2[lastI] + last.length + lookAheadProp - length2;
      }
      return makeTree(type, children2, positions2, length2, lookAhead2, contextHash2);
    };
  }
  function makeRepeatLeaf(children2, positions2, base, i, from, to, type, lookAhead2, contextHash2) {
    let localChildren = [], localPositions = [];
    while (children2.length > i) {
      localChildren.push(children2.pop());
      localPositions.push(positions2.pop() + base - from);
    }
    children2.push(makeTree(nodeSet.types[type], localChildren, localPositions, to - from, lookAhead2 - to, contextHash2));
    positions2.push(from - base);
  }
  function makeTree(type, children2, positions2, length2, lookAhead2, contextHash2, props) {
    if (contextHash2) {
      let pair2 = [NodeProp.contextHash, contextHash2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    if (lookAhead2 > 25) {
      let pair2 = [NodeProp.lookAhead, lookAhead2];
      props = props ? [pair2].concat(props) : [pair2];
    }
    return new Tree(type, children2, positions2, length2, props);
  }
  function findBufferSize(maxSize, inRepeat) {
    let fork = cursor.fork();
    let size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
    let result = { size: 0, start: 0, skip: 0 };
    scan: for (let minPos = fork.pos - maxSize; fork.pos > minPos; ) {
      let nodeSize2 = fork.size;
      if (fork.id == inRepeat && nodeSize2 >= 0) {
        result.size = size;
        result.start = start;
        result.skip = skip;
        skip += 4;
        size += 4;
        fork.next();
        continue;
      }
      let startPos = fork.pos - nodeSize2;
      if (nodeSize2 < 0 || startPos < minPos || fork.start < minStart)
        break;
      let localSkipped = fork.id >= minRepeatType ? 4 : 0;
      let nodeStart = fork.start;
      fork.next();
      while (fork.pos > startPos) {
        if (fork.size < 0) {
          if (fork.size == -3 || fork.size == -4)
            localSkipped += 4;
          else
            break scan;
        } else if (fork.id >= minRepeatType) {
          localSkipped += 4;
        }
        fork.next();
      }
      start = nodeStart;
      size += nodeSize2;
      skip += localSkipped;
    }
    if (inRepeat < 0 || size == maxSize) {
      result.size = size;
      result.start = start;
      result.skip = skip;
    }
    return result.size > 4 ? result : void 0;
  }
  function copyToBuffer(bufferStart, buffer2, index) {
    let { id: id2, start, end, size } = cursor;
    cursor.next();
    if (size >= 0 && id2 < minRepeatType) {
      let startIndex = index;
      if (size > 4) {
        let endPos = cursor.pos - (size - 4);
        while (cursor.pos > endPos)
          index = copyToBuffer(bufferStart, buffer2, index);
      }
      buffer2[--index] = startIndex;
      buffer2[--index] = end - bufferStart;
      buffer2[--index] = start - bufferStart;
      buffer2[--index] = id2;
    } else if (size == -3) {
      contextHash = id2;
    } else if (size == -4) {
      lookAhead = id2;
    }
    return index;
  }
  let children = [], positions = [];
  while (cursor.pos > 0)
    takeNode(data.start || 0, data.bufferStart || 0, children, positions, -1, 0);
  let length = (_a = data.length) !== null && _a !== void 0 ? _a : children.length ? positions[0] + children[0].length : 0;
  return new Tree(types[data.topID], children.reverse(), positions.reverse(), length);
}
var nodeSizeCache = /* @__PURE__ */ new WeakMap();
function nodeSize(balanceType, node2) {
  if (!balanceType.isAnonymous || node2 instanceof TreeBuffer || node2.type != balanceType)
    return 1;
  let size = nodeSizeCache.get(node2);
  if (size == null) {
    size = 1;
    for (let child of node2.children) {
      if (child.type != balanceType || !(child instanceof Tree)) {
        size = 1;
        break;
      }
      size += nodeSize(balanceType, child);
    }
    nodeSizeCache.set(node2, size);
  }
  return size;
}
function balanceRange(balanceType, children, positions, from, to, start, length, mkTop, mkTree) {
  let total = 0;
  for (let i = from; i < to; i++)
    total += nodeSize(balanceType, children[i]);
  let maxChild = Math.ceil(
    total * 1.5 / 8
    /* Balance.BranchFactor */
  );
  let localChildren = [], localPositions = [];
  function divide(children2, positions2, from2, to2, offset) {
    for (let i = from2; i < to2; ) {
      let groupFrom = i, groupStart = positions2[i], groupSize = nodeSize(balanceType, children2[i]);
      i++;
      for (; i < to2; i++) {
        let nextSize = nodeSize(balanceType, children2[i]);
        if (groupSize + nextSize >= maxChild)
          break;
        groupSize += nextSize;
      }
      if (i == groupFrom + 1) {
        if (groupSize > maxChild) {
          let only = children2[groupFrom];
          divide(only.children, only.positions, 0, only.children.length, positions2[groupFrom] + offset);
          continue;
        }
        localChildren.push(children2[groupFrom]);
      } else {
        let length2 = positions2[i - 1] + children2[i - 1].length - groupStart;
        localChildren.push(balanceRange(balanceType, children2, positions2, groupFrom, i, groupStart, length2, null, mkTree));
      }
      localPositions.push(groupStart + offset - start);
    }
  }
  divide(children, positions, from, to, 0);
  return (mkTop || mkTree)(localChildren, localPositions, length);
}
var Parser = class {
  /**
  Start a parse, returning a [partial parse](#common.PartialParse)
  object. [`fragments`](#common.TreeFragment) can be passed in to
  make the parse incremental.
  
  By default, the entire input is parsed. You can pass `ranges`,
  which should be a sorted array of non-empty, non-overlapping
  ranges, to parse only those ranges. The tree returned in that
  case will start at `ranges[0].from`.
  */
  startParse(input, fragments, ranges) {
    if (typeof input == "string")
      input = new StringInput(input);
    ranges = !ranges ? [new Range(0, input.length)] : ranges.length ? ranges.map((r) => new Range(r.from, r.to)) : [new Range(0, 0)];
    return this.createParse(input, fragments || [], ranges);
  }
  /**
  Run a full parse, returning the resulting tree.
  */
  parse(input, fragments, ranges) {
    let parse2 = this.startParse(input, fragments, ranges);
    for (; ; ) {
      let done = parse2.advance();
      if (done)
        return done;
    }
  }
};
var StringInput = class {
  constructor(string) {
    this.string = string;
  }
  get length() {
    return this.string.length;
  }
  chunk(from) {
    return this.string.slice(from);
  }
  get lineChunks() {
    return false;
  }
  read(from, to) {
    return this.string.slice(from, to);
  }
};
new NodeProp({ perNode: true });
var Stack = class _Stack {
  /**
  @internal
  */
  constructor(p, stack, state, reducePos, pos, score, buffer, bufferBase, curContext, lookAhead = 0, parent) {
    this.p = p;
    this.stack = stack;
    this.state = state;
    this.reducePos = reducePos;
    this.pos = pos;
    this.score = score;
    this.buffer = buffer;
    this.bufferBase = bufferBase;
    this.curContext = curContext;
    this.lookAhead = lookAhead;
    this.parent = parent;
  }
  /**
  @internal
  */
  toString() {
    return `[${this.stack.filter((_, i) => i % 3 == 0).concat(this.state)}]@${this.pos}${this.score ? "!" + this.score : ""}`;
  }
  // Start an empty stack
  /**
  @internal
  */
  static start(p, state, pos = 0) {
    let cx = p.parser.context;
    return new _Stack(p, [], state, pos, pos, 0, [], 0, cx ? new StackContext(cx, cx.start) : null, 0, null);
  }
  /**
  The stack's current [context](#lr.ContextTracker) value, if
  any. Its type will depend on the context tracker's type
  parameter, or it will be `null` if there is no context
  tracker.
  */
  get context() {
    return this.curContext ? this.curContext.context : null;
  }
  // Push a state onto the stack, tracking its start position as well
  // as the buffer base at that point.
  /**
  @internal
  */
  pushState(state, start) {
    this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
    this.state = state;
  }
  // Apply a reduce action
  /**
  @internal
  */
  reduce(action) {
    var _a;
    let depth = action >> 19, type = action & 65535;
    let { parser } = this.p;
    let lookaheadRecord = this.reducePos < this.pos - 25 && this.setLookAhead(this.pos);
    let dPrec = parser.dynamicPrecedence(type);
    if (dPrec)
      this.score += dPrec;
    if (depth == 0) {
      if (type < parser.minRepeatTerm && this.reducePos < this.pos)
        this.reducePos = this.pos;
      this.pushState(parser.getGoto(this.state, type, true), this.reducePos);
      if (type < parser.minRepeatTerm)
        this.storeNode(type, this.reducePos, this.reducePos, lookaheadRecord ? 8 : 4, true);
      this.reduceContext(type, this.reducePos);
      return;
    }
    let base = this.stack.length - (depth - 1) * 3 - (action & 262144 ? 6 : 0);
    let start = base ? this.stack[base - 2] : this.p.ranges[0].from;
    if (type < parser.minRepeatTerm && start == this.reducePos && this.reducePos < this.pos)
      this.reducePos = this.pos;
    let size = this.reducePos - start;
    if (size >= 2e3 && !((_a = this.p.parser.nodeSet.types[type]) === null || _a === void 0 ? void 0 : _a.isAnonymous)) {
      if (start == this.p.lastBigReductionStart) {
        this.p.bigReductionCount++;
        this.p.lastBigReductionSize = size;
      } else if (this.p.lastBigReductionSize < size) {
        this.p.bigReductionCount = 1;
        this.p.lastBigReductionStart = start;
        this.p.lastBigReductionSize = size;
      }
    }
    let bufferBase = base ? this.stack[base - 1] : 0, count = this.bufferBase + this.buffer.length - bufferBase;
    if (type < parser.minRepeatTerm || action & 131072) {
      let pos = parser.stateFlag(
        this.state,
        1
        /* StateFlag.Skipped */
      ) ? this.pos : this.reducePos;
      this.storeNode(type, start, pos, count + 4, true);
    }
    if (action & 262144) {
      this.state = this.stack[base];
    } else {
      let baseStateID = this.stack[base - 3];
      this.state = parser.getGoto(baseStateID, type, true);
    }
    while (this.stack.length > base)
      this.stack.pop();
    this.reduceContext(type, start);
  }
  // Shift a value into the buffer
  /**
  @internal
  */
  storeNode(term, start, end, size = 4, mustSink = false) {
    if (term == 0 && (!this.stack.length || this.stack[this.stack.length - 1] < this.buffer.length + this.bufferBase)) {
      let top = this.buffer.length;
      if (top > 0 && this.buffer[top - 4] == 0 && this.buffer[top - 1] > -1) {
        if (start == end)
          return;
        if (this.buffer[top - 2] >= start) {
          this.buffer[top - 2] = end;
          return;
        }
      }
    }
    if (!mustSink || this.pos == end) {
      this.buffer.push(term, start, end, size);
    } else {
      let index = this.buffer.length;
      if (index > 0 && (this.buffer[index - 4] != 0 || this.buffer[index - 1] < 0)) {
        let mustMove = false;
        for (let scan = index; scan > 0 && this.buffer[scan - 2] > end; scan -= 4) {
          if (this.buffer[scan - 1] >= 0) {
            mustMove = true;
            break;
          }
        }
        if (mustMove)
          while (index > 0 && this.buffer[index - 2] > end) {
            this.buffer[index] = this.buffer[index - 4];
            this.buffer[index + 1] = this.buffer[index - 3];
            this.buffer[index + 2] = this.buffer[index - 2];
            this.buffer[index + 3] = this.buffer[index - 1];
            index -= 4;
            if (size > 4)
              size -= 4;
          }
      }
      this.buffer[index] = term;
      this.buffer[index + 1] = start;
      this.buffer[index + 2] = end;
      this.buffer[index + 3] = size;
    }
  }
  // Apply a shift action
  /**
  @internal
  */
  shift(action, type, start, end) {
    if (action & 131072) {
      this.pushState(action & 65535, this.pos);
    } else if ((action & 262144) == 0) {
      let nextState = action, { parser } = this.p;
      this.pos = end;
      let skipped = parser.stateFlag(
        nextState,
        1
        /* StateFlag.Skipped */
      );
      if (!skipped && (end > start || type <= parser.maxNode))
        this.reducePos = end;
      this.pushState(nextState, skipped ? start : Math.min(start, this.reducePos));
      this.shiftContext(type, start);
      if (type <= parser.maxNode)
        this.buffer.push(type, start, end, 4);
    } else {
      this.pos = end;
      this.shiftContext(type, start);
      if (type <= this.p.parser.maxNode)
        this.buffer.push(type, start, end, 4);
    }
  }
  // Apply an action
  /**
  @internal
  */
  apply(action, next, nextStart, nextEnd) {
    if (action & 65536)
      this.reduce(action);
    else
      this.shift(action, next, nextStart, nextEnd);
  }
  // Add a prebuilt (reused) node into the buffer.
  /**
  @internal
  */
  useNode(value, next, start) {
    let index = this.p.reused.length - 1;
    if (index < 0 || this.p.reused[index] != value) {
      this.p.reused.push(value);
      index++;
    }
    let end = this.reducePos = this.pos = start + value.length;
    this.pushState(next, start);
    this.buffer.push(
      index,
      start,
      end,
      -1
      /* size == -1 means this is a reused value */
    );
    if (this.curContext)
      this.updateContext(this.curContext.tracker.reuse(this.curContext.context, value, this, this.p.stream.reset(this.pos - value.length)));
  }
  // Split the stack. Due to the buffer sharing and the fact
  // that `this.stack` tends to stay quite shallow, this isn't very
  // expensive.
  /**
  @internal
  */
  split() {
    let parent = this;
    let off = parent.buffer.length;
    if (off && parent.buffer[off - 4] == 0)
      off -= 4;
    while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
      off -= 4;
    let buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
    while (parent && base == parent.bufferBase)
      parent = parent.parent;
    return new _Stack(this.p, this.stack.slice(), this.state, this.reducePos, this.pos, this.score, buffer, base, this.curContext, this.lookAhead, parent);
  }
  // Try to recover from an error by 'deleting' (ignoring) one token.
  /**
  @internal
  */
  recoverByDelete(next, nextEnd) {
    let isNode2 = next <= this.p.parser.maxNode;
    if (isNode2)
      this.storeNode(next, this.pos, nextEnd, 4);
    this.storeNode(0, this.pos, nextEnd, isNode2 ? 8 : 4);
    this.pos = this.reducePos = nextEnd;
    this.score -= 190;
  }
  /**
  Check if the given term would be able to be shifted (optionally
  after some reductions) on this stack. This can be useful for
  external tokenizers that want to make sure they only provide a
  given token when it applies.
  */
  canShift(term) {
    for (let sim = new SimulatedStack(this); ; ) {
      let action = this.p.parser.stateSlot(
        sim.state,
        4
        /* ParseState.DefaultReduce */
      ) || this.p.parser.hasAction(sim.state, term);
      if (action == 0)
        return false;
      if ((action & 65536) == 0)
        return true;
      sim.reduce(action);
    }
  }
  // Apply up to Recover.MaxNext recovery actions that conceptually
  // inserts some missing token or rule.
  /**
  @internal
  */
  recoverByInsert(next) {
    if (this.stack.length >= 300)
      return [];
    let nextStates = this.p.parser.nextStates(this.state);
    if (nextStates.length > 4 << 1 || this.stack.length >= 120) {
      let best = [];
      for (let i = 0, s; i < nextStates.length; i += 2) {
        if ((s = nextStates[i + 1]) != this.state && this.p.parser.hasAction(s, next))
          best.push(nextStates[i], s);
      }
      if (this.stack.length < 120)
        for (let i = 0; best.length < 4 << 1 && i < nextStates.length; i += 2) {
          let s = nextStates[i + 1];
          if (!best.some((v, i2) => i2 & 1 && v == s))
            best.push(nextStates[i], s);
        }
      nextStates = best;
    }
    let result = [];
    for (let i = 0; i < nextStates.length && result.length < 4; i += 2) {
      let s = nextStates[i + 1];
      if (s == this.state)
        continue;
      let stack = this.split();
      stack.pushState(s, this.pos);
      stack.storeNode(0, stack.pos, stack.pos, 4, true);
      stack.shiftContext(nextStates[i], this.pos);
      stack.reducePos = this.pos;
      stack.score -= 200;
      result.push(stack);
    }
    return result;
  }
  // Force a reduce, if possible. Return false if that can't
  // be done.
  /**
  @internal
  */
  forceReduce() {
    let { parser } = this.p;
    let reduce = parser.stateSlot(
      this.state,
      5
      /* ParseState.ForcedReduce */
    );
    if ((reduce & 65536) == 0)
      return false;
    if (!parser.validAction(this.state, reduce)) {
      let depth = reduce >> 19, term = reduce & 65535;
      let target = this.stack.length - depth * 3;
      if (target < 0 || parser.getGoto(this.stack[target], term, false) < 0) {
        let backup = this.findForcedReduction();
        if (backup == null)
          return false;
        reduce = backup;
      }
      this.storeNode(0, this.pos, this.pos, 4, true);
      this.score -= 100;
    }
    this.reducePos = this.pos;
    this.reduce(reduce);
    return true;
  }
  /**
  Try to scan through the automaton to find some kind of reduction
  that can be applied. Used when the regular ForcedReduce field
  isn't a valid action. @internal
  */
  findForcedReduction() {
    let { parser } = this.p, seen = [];
    let explore = (state, depth) => {
      if (seen.includes(state))
        return;
      seen.push(state);
      return parser.allActions(state, (action) => {
        if (action & (262144 | 131072)) ;
        else if (action & 65536) {
          let rDepth = (action >> 19) - depth;
          if (rDepth > 1) {
            let term = action & 65535, target = this.stack.length - rDepth * 3;
            if (target >= 0 && parser.getGoto(this.stack[target], term, false) >= 0)
              return rDepth << 19 | 65536 | term;
          }
        } else {
          let found = explore(action, depth + 1);
          if (found != null)
            return found;
        }
      });
    };
    return explore(this.state, 0);
  }
  /**
  @internal
  */
  forceAll() {
    while (!this.p.parser.stateFlag(
      this.state,
      2
      /* StateFlag.Accepting */
    )) {
      if (!this.forceReduce()) {
        this.storeNode(0, this.pos, this.pos, 4, true);
        break;
      }
    }
    return this;
  }
  /**
  Check whether this state has no further actions (assumed to be a direct descendant of the
  top state, since any other states must be able to continue
  somehow). @internal
  */
  get deadEnd() {
    if (this.stack.length != 3)
      return false;
    let { parser } = this.p;
    return parser.data[parser.stateSlot(
      this.state,
      1
      /* ParseState.Actions */
    )] == 65535 && !parser.stateSlot(
      this.state,
      4
      /* ParseState.DefaultReduce */
    );
  }
  /**
  Restart the stack (put it back in its start state). Only safe
  when this.stack.length == 3 (state is directly below the top
  state). @internal
  */
  restart() {
    this.storeNode(0, this.pos, this.pos, 4, true);
    this.state = this.stack[0];
    this.stack.length = 0;
  }
  /**
  @internal
  */
  sameState(other) {
    if (this.state != other.state || this.stack.length != other.stack.length)
      return false;
    for (let i = 0; i < this.stack.length; i += 3)
      if (this.stack[i] != other.stack[i])
        return false;
    return true;
  }
  /**
  Get the parser used by this stack.
  */
  get parser() {
    return this.p.parser;
  }
  /**
  Test whether a given dialect (by numeric ID, as exported from
  the terms file) is enabled.
  */
  dialectEnabled(dialectID) {
    return this.p.parser.dialect.flags[dialectID];
  }
  shiftContext(term, start) {
    if (this.curContext)
      this.updateContext(this.curContext.tracker.shift(this.curContext.context, term, this, this.p.stream.reset(start)));
  }
  reduceContext(term, start) {
    if (this.curContext)
      this.updateContext(this.curContext.tracker.reduce(this.curContext.context, term, this, this.p.stream.reset(start)));
  }
  /**
  @internal
  */
  emitContext() {
    let last = this.buffer.length - 1;
    if (last < 0 || this.buffer[last] != -3)
      this.storeNode(this.curContext.hash, this.reducePos, this.reducePos, -3, true);
  }
  /**
  @internal
  */
  emitLookAhead() {
    let last = this.buffer.length - 1;
    if (last < 0 || this.buffer[last] != -4)
      this.buffer.push(this.lookAhead, this.pos, this.pos, -4);
  }
  updateContext(context) {
    if (context != this.curContext.context) {
      let newCx = new StackContext(this.curContext.tracker, context);
      if (newCx.hash != this.curContext.hash)
        this.emitContext();
      this.curContext = newCx;
    }
  }
  /**
  @internal
  */
  setLookAhead(lookAhead) {
    if (lookAhead <= this.lookAhead)
      return false;
    this.emitLookAhead();
    this.lookAhead = lookAhead;
    return true;
  }
  /**
  @internal
  */
  close() {
    if (this.curContext && this.curContext.tracker.strict)
      this.emitContext();
    if (this.lookAhead > 0)
      this.emitLookAhead();
  }
};
var StackContext = class {
  constructor(tracker, context) {
    this.tracker = tracker;
    this.context = context;
    this.hash = tracker.strict ? tracker.hash(context) : 0;
  }
};
var SimulatedStack = class {
  constructor(start) {
    this.start = start;
    this.state = start.state;
    this.stack = start.stack;
    this.base = this.stack.length;
  }
  reduce(action) {
    let term = action & 65535, depth = action >> 19;
    if (depth == 0) {
      if (this.stack == this.start.stack)
        this.stack = this.stack.slice();
      this.stack.push(this.state, 0, 0);
      this.base += 3;
    } else {
      this.base -= (depth - 1) * 3;
    }
    let goto = this.start.p.parser.getGoto(this.stack[this.base - 3], term, true);
    this.state = goto;
  }
};
var StackBufferCursor = class _StackBufferCursor {
  constructor(stack, pos, index) {
    this.stack = stack;
    this.pos = pos;
    this.index = index;
    this.buffer = stack.buffer;
    if (this.index == 0)
      this.maybeNext();
  }
  static create(stack, pos = stack.bufferBase + stack.buffer.length) {
    return new _StackBufferCursor(stack, pos, pos - stack.bufferBase);
  }
  maybeNext() {
    let next = this.stack.parent;
    if (next != null) {
      this.index = this.stack.bufferBase - next.bufferBase;
      this.stack = next;
      this.buffer = next.buffer;
    }
  }
  get id() {
    return this.buffer[this.index - 4];
  }
  get start() {
    return this.buffer[this.index - 3];
  }
  get end() {
    return this.buffer[this.index - 2];
  }
  get size() {
    return this.buffer[this.index - 1];
  }
  next() {
    this.index -= 4;
    this.pos -= 4;
    if (this.index == 0)
      this.maybeNext();
  }
  fork() {
    return new _StackBufferCursor(this.stack, this.pos, this.index);
  }
};
function decodeArray(input, Type = Uint16Array) {
  if (typeof input != "string")
    return input;
  let array = null;
  for (let pos = 0, out = 0; pos < input.length; ) {
    let value = 0;
    for (; ; ) {
      let next = input.charCodeAt(pos++), stop = false;
      if (next == 126) {
        value = 65535;
        break;
      }
      if (next >= 92)
        next--;
      if (next >= 34)
        next--;
      let digit = next - 32;
      if (digit >= 46) {
        digit -= 46;
        stop = true;
      }
      value += digit;
      if (stop)
        break;
      value *= 46;
    }
    if (array)
      array[out++] = value;
    else
      array = new Type(value);
  }
  return array;
}
var CachedToken = class {
  constructor() {
    this.start = -1;
    this.value = -1;
    this.end = -1;
    this.extended = -1;
    this.lookAhead = 0;
    this.mask = 0;
    this.context = 0;
  }
};
var nullToken = new CachedToken();
var InputStream = class {
  /**
  @internal
  */
  constructor(input, ranges) {
    this.input = input;
    this.ranges = ranges;
    this.chunk = "";
    this.chunkOff = 0;
    this.chunk2 = "";
    this.chunk2Pos = 0;
    this.next = -1;
    this.token = nullToken;
    this.rangeIndex = 0;
    this.pos = this.chunkPos = ranges[0].from;
    this.range = ranges[0];
    this.end = ranges[ranges.length - 1].to;
    this.readNext();
  }
  /**
  @internal
  */
  resolveOffset(offset, assoc) {
    let range = this.range, index = this.rangeIndex;
    let pos = this.pos + offset;
    while (pos < range.from) {
      if (!index)
        return null;
      let next = this.ranges[--index];
      pos -= range.from - next.to;
      range = next;
    }
    while (assoc < 0 ? pos > range.to : pos >= range.to) {
      if (index == this.ranges.length - 1)
        return null;
      let next = this.ranges[++index];
      pos += next.from - range.to;
      range = next;
    }
    return pos;
  }
  /**
  @internal
  */
  clipPos(pos) {
    if (pos >= this.range.from && pos < this.range.to)
      return pos;
    for (let range of this.ranges)
      if (range.to > pos)
        return Math.max(pos, range.from);
    return this.end;
  }
  /**
  Look at a code unit near the stream position. `.peek(0)` equals
  `.next`, `.peek(-1)` gives you the previous character, and so
  on.
  
  Note that looking around during tokenizing creates dependencies
  on potentially far-away content, which may reduce the
  effectiveness incremental parsing—when looking forward—or even
  cause invalid reparses when looking backward more than 25 code
  units, since the library does not track lookbehind.
  */
  peek(offset) {
    let idx = this.chunkOff + offset, pos, result;
    if (idx >= 0 && idx < this.chunk.length) {
      pos = this.pos + offset;
      result = this.chunk.charCodeAt(idx);
    } else {
      let resolved = this.resolveOffset(offset, 1);
      if (resolved == null)
        return -1;
      pos = resolved;
      if (pos >= this.chunk2Pos && pos < this.chunk2Pos + this.chunk2.length) {
        result = this.chunk2.charCodeAt(pos - this.chunk2Pos);
      } else {
        let i = this.rangeIndex, range = this.range;
        while (range.to <= pos)
          range = this.ranges[++i];
        this.chunk2 = this.input.chunk(this.chunk2Pos = pos);
        if (pos + this.chunk2.length > range.to)
          this.chunk2 = this.chunk2.slice(0, range.to - pos);
        result = this.chunk2.charCodeAt(0);
      }
    }
    if (pos >= this.token.lookAhead)
      this.token.lookAhead = pos + 1;
    return result;
  }
  /**
  Accept a token. By default, the end of the token is set to the
  current stream position, but you can pass an offset (relative to
  the stream position) to change that.
  */
  acceptToken(token, endOffset = 0) {
    let end = endOffset ? this.resolveOffset(endOffset, -1) : this.pos;
    if (end == null || end < this.token.start)
      throw new RangeError("Token end out of bounds");
    this.token.value = token;
    this.token.end = end;
  }
  /**
  Accept a token ending at a specific given position.
  */
  acceptTokenTo(token, endPos) {
    this.token.value = token;
    this.token.end = endPos;
  }
  getChunk() {
    if (this.pos >= this.chunk2Pos && this.pos < this.chunk2Pos + this.chunk2.length) {
      let { chunk, chunkPos } = this;
      this.chunk = this.chunk2;
      this.chunkPos = this.chunk2Pos;
      this.chunk2 = chunk;
      this.chunk2Pos = chunkPos;
      this.chunkOff = this.pos - this.chunkPos;
    } else {
      this.chunk2 = this.chunk;
      this.chunk2Pos = this.chunkPos;
      let nextChunk = this.input.chunk(this.pos);
      let end = this.pos + nextChunk.length;
      this.chunk = end > this.range.to ? nextChunk.slice(0, this.range.to - this.pos) : nextChunk;
      this.chunkPos = this.pos;
      this.chunkOff = 0;
    }
  }
  readNext() {
    if (this.chunkOff >= this.chunk.length) {
      this.getChunk();
      if (this.chunkOff == this.chunk.length)
        return this.next = -1;
    }
    return this.next = this.chunk.charCodeAt(this.chunkOff);
  }
  /**
  Move the stream forward N (defaults to 1) code units. Returns
  the new value of [`next`](#lr.InputStream.next).
  */
  advance(n = 1) {
    this.chunkOff += n;
    while (this.pos + n >= this.range.to) {
      if (this.rangeIndex == this.ranges.length - 1)
        return this.setDone();
      n -= this.range.to - this.pos;
      this.range = this.ranges[++this.rangeIndex];
      this.pos = this.range.from;
    }
    this.pos += n;
    if (this.pos >= this.token.lookAhead)
      this.token.lookAhead = this.pos + 1;
    return this.readNext();
  }
  setDone() {
    this.pos = this.chunkPos = this.end;
    this.range = this.ranges[this.rangeIndex = this.ranges.length - 1];
    this.chunk = "";
    return this.next = -1;
  }
  /**
  @internal
  */
  reset(pos, token) {
    if (token) {
      this.token = token;
      token.start = pos;
      token.lookAhead = pos + 1;
      token.value = token.extended = -1;
    } else {
      this.token = nullToken;
    }
    if (this.pos != pos) {
      this.pos = pos;
      if (pos == this.end) {
        this.setDone();
        return this;
      }
      while (pos < this.range.from)
        this.range = this.ranges[--this.rangeIndex];
      while (pos >= this.range.to)
        this.range = this.ranges[++this.rangeIndex];
      if (pos >= this.chunkPos && pos < this.chunkPos + this.chunk.length) {
        this.chunkOff = pos - this.chunkPos;
      } else {
        this.chunk = "";
        this.chunkOff = 0;
      }
      this.readNext();
    }
    return this;
  }
  /**
  @internal
  */
  read(from, to) {
    if (from >= this.chunkPos && to <= this.chunkPos + this.chunk.length)
      return this.chunk.slice(from - this.chunkPos, to - this.chunkPos);
    if (from >= this.chunk2Pos && to <= this.chunk2Pos + this.chunk2.length)
      return this.chunk2.slice(from - this.chunk2Pos, to - this.chunk2Pos);
    if (from >= this.range.from && to <= this.range.to)
      return this.input.read(from, to);
    let result = "";
    for (let r of this.ranges) {
      if (r.from >= to)
        break;
      if (r.to > from)
        result += this.input.read(Math.max(r.from, from), Math.min(r.to, to));
    }
    return result;
  }
};
var TokenGroup = class {
  constructor(data, id2) {
    this.data = data;
    this.id = id2;
  }
  token(input, stack) {
    let { parser } = stack.p;
    readToken(this.data, input, stack, this.id, parser.data, parser.tokenPrecTable);
  }
};
TokenGroup.prototype.contextual = TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
TokenGroup.prototype.fallback = TokenGroup.prototype.extend = false;
var ExternalTokenizer = class {
  /**
  Create a tokenizer. The first argument is the function that,
  given an input stream, scans for the types of tokens it
  recognizes at the stream's position, and calls
  [`acceptToken`](#lr.InputStream.acceptToken) when it finds
  one.
  */
  constructor(token, options = {}) {
    this.token = token;
    this.contextual = !!options.contextual;
    this.fallback = !!options.fallback;
    this.extend = !!options.extend;
  }
};
function readToken(data, input, stack, group, precTable, precOffset) {
  let state = 0, groupMask = 1 << group, { dialect } = stack.p.parser;
  scan: for (; ; ) {
    if ((groupMask & data[state]) == 0)
      break;
    let accEnd = data[state + 1];
    for (let i = state + 3; i < accEnd; i += 2)
      if ((data[i + 1] & groupMask) > 0) {
        let term = data[i];
        if (dialect.allows(term) && (input.token.value == -1 || input.token.value == term || overrides(term, input.token.value, precTable, precOffset))) {
          input.acceptToken(term);
          break;
        }
      }
    let next = input.next, low = 0, high = data[state + 2];
    if (input.next < 0 && high > low && data[accEnd + high * 3 - 3] == 65535) {
      state = data[accEnd + high * 3 - 1];
      continue scan;
    }
    for (; low < high; ) {
      let mid = low + high >> 1;
      let index = accEnd + mid + (mid << 1);
      let from = data[index], to = data[index + 1] || 65536;
      if (next < from)
        high = mid;
      else if (next >= to)
        low = mid + 1;
      else {
        state = data[index + 2];
        input.advance();
        continue scan;
      }
    }
    break;
  }
}
function findOffset(data, start, term) {
  for (let i = start, next; (next = data[i]) != 65535; i++)
    if (next == term)
      return i - start;
  return -1;
}
function overrides(token, prev, tableData, tableOffset) {
  let iPrev = findOffset(tableData, tableOffset, prev);
  return iPrev < 0 || findOffset(tableData, tableOffset, token) < iPrev;
}
var verbose = typeof process != "undefined" && process.env && /\bparse\b/.test(process.env.LOG);
var stackIDs = null;
function cutAt(tree, pos, side) {
  let cursor = tree.cursor(IterMode.IncludeAnonymous);
  cursor.moveTo(pos);
  for (; ; ) {
    if (!(side < 0 ? cursor.childBefore(pos) : cursor.childAfter(pos)))
      for (; ; ) {
        if ((side < 0 ? cursor.to < pos : cursor.from > pos) && !cursor.type.isError)
          return side < 0 ? Math.max(0, Math.min(
            cursor.to - 1,
            pos - 25
            /* Lookahead.Margin */
          )) : Math.min(tree.length, Math.max(
            cursor.from + 1,
            pos + 25
            /* Lookahead.Margin */
          ));
        if (side < 0 ? cursor.prevSibling() : cursor.nextSibling())
          break;
        if (!cursor.parent())
          return side < 0 ? 0 : tree.length;
      }
  }
}
var FragmentCursor = class {
  constructor(fragments, minRepeat) {
    this.fragments = fragments;
    this.minRepeat = minRepeat;
    this.i = 0;
    this.fragment = null;
    this.safeFrom = -1;
    this.safeTo = -1;
    this.trees = [];
    this.start = [];
    this.index = [];
    this.lastRepeat = null;
    this.lastRepeatPos = -1;
    this.nextFragment();
  }
  nextFragment() {
    let fr = this.fragment = this.i == this.fragments.length ? null : this.fragments[this.i++];
    if (fr) {
      this.safeFrom = fr.openStart ? cutAt(fr.tree, fr.from + fr.offset, 1) - fr.offset : fr.from;
      this.safeTo = fr.openEnd ? cutAt(fr.tree, fr.to + fr.offset, -1) - fr.offset : fr.to;
      while (this.trees.length) {
        this.trees.pop();
        this.start.pop();
        this.index.pop();
      }
      this.trees.push(fr.tree);
      this.start.push(-fr.offset);
      this.index.push(0);
      this.nextStart = this.safeFrom;
    } else {
      this.nextStart = 1e9;
    }
  }
  // `pos` must be >= any previously given `pos` for this cursor
  nodeAt(pos) {
    if (pos < this.nextStart)
      return null;
    while (this.fragment && this.safeTo <= pos)
      this.nextFragment();
    if (!this.fragment)
      return null;
    for (; ; ) {
      let last = this.trees.length - 1;
      if (last < 0) {
        this.nextFragment();
        return null;
      }
      if (pos < this.safeFrom)
        return null;
      let top = this.trees[last], index = this.index[last];
      if (index == top.children.length) {
        this.trees.pop();
        this.start.pop();
        this.index.pop();
        continue;
      }
      let next = top.children[index];
      let start = this.start[last] + top.positions[index];
      if (start > pos) {
        this.nextStart = start;
        return null;
      }
      if (next instanceof Tree) {
        let storeRepeat = start > this.lastRepeatPos && next.type.id >= this.minRepeat;
        if (start == pos || storeRepeat) {
          let end = start + next.length, lookahead;
          if (start >= this.safeFrom && end <= this.safeTo && (!(lookahead = next.prop(NodeProp.lookAhead)) || end + lookahead < this.fragment.to)) {
            if (storeRepeat) {
              this.lastRepeat = next;
              this.lastRepeatPos = start;
            }
            if (start == pos)
              return next;
          }
        }
        this.index[last]++;
        if (start + next.length >= Math.max(this.safeFrom, pos)) {
          this.trees.push(next);
          this.start.push(start);
          this.index.push(0);
        }
      } else {
        this.index[last]++;
        this.nextStart = start + next.length;
      }
    }
  }
};
var TokenCache = class {
  constructor(parser, stream) {
    this.stream = stream;
    this.tokens = [];
    this.mainToken = null;
    this.actions = [];
    this.tokens = parser.tokenizers.map((_) => new CachedToken());
  }
  getActions(stack) {
    let actionIndex = 0;
    let main = null;
    let { parser } = stack.p, { tokenizers } = parser;
    let mask = parser.stateSlot(
      stack.state,
      3
      /* ParseState.TokenizerMask */
    );
    let context = stack.curContext ? stack.curContext.hash : 0;
    let lookAhead = 0;
    for (let i = 0; i < tokenizers.length; i++) {
      if ((1 << i & mask) == 0)
        continue;
      let tokenizer = tokenizers[i], token = this.tokens[i];
      if (main && !tokenizer.fallback)
        continue;
      if (tokenizer.contextual || token.start != stack.pos || token.mask != mask || token.context != context) {
        this.updateCachedToken(token, tokenizer, stack);
        token.mask = mask;
        token.context = context;
      }
      if (token.lookAhead > token.end + 25)
        lookAhead = Math.max(token.lookAhead, lookAhead);
      if (token.value != 0) {
        let startIndex = actionIndex;
        if (token.extended > -1)
          actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
        actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
        if (!tokenizer.extend) {
          main = token;
          if (actionIndex > startIndex)
            break;
        }
      }
    }
    while (this.actions.length > actionIndex)
      this.actions.pop();
    if (lookAhead)
      stack.setLookAhead(lookAhead);
    if (!main && stack.pos == this.stream.end) {
      main = new CachedToken();
      main.value = stack.p.parser.eofTerm;
      main.start = main.end = stack.pos;
      actionIndex = this.addActions(stack, main.value, main.end, actionIndex);
    }
    this.mainToken = main;
    return this.actions;
  }
  getMainToken(stack) {
    if (this.mainToken)
      return this.mainToken;
    let main = new CachedToken(), { pos, p } = stack;
    main.start = pos;
    main.end = Math.min(pos + 1, p.stream.end);
    main.value = pos == p.stream.end ? p.parser.eofTerm : 0;
    return main;
  }
  updateCachedToken(token, tokenizer, stack) {
    let start = this.stream.clipPos(stack.pos);
    tokenizer.token(this.stream.reset(start, token), stack);
    if (token.value > -1) {
      let { parser } = stack.p;
      for (let i = 0; i < parser.specialized.length; i++)
        if (parser.specialized[i] == token.value) {
          let result = parser.specializers[i](this.stream.read(token.start, token.end), stack);
          if (result >= 0 && stack.p.parser.dialect.allows(result >> 1)) {
            if ((result & 1) == 0)
              token.value = result >> 1;
            else
              token.extended = result >> 1;
            break;
          }
        }
    } else {
      token.value = 0;
      token.end = this.stream.clipPos(start + 1);
    }
  }
  putAction(action, token, end, index) {
    for (let i = 0; i < index; i += 3)
      if (this.actions[i] == action)
        return index;
    this.actions[index++] = action;
    this.actions[index++] = token;
    this.actions[index++] = end;
    return index;
  }
  addActions(stack, token, end, index) {
    let { state } = stack, { parser } = stack.p, { data } = parser;
    for (let set = 0; set < 2; set++) {
      for (let i = parser.stateSlot(
        state,
        set ? 2 : 1
        /* ParseState.Actions */
      ); ; i += 3) {
        if (data[i] == 65535) {
          if (data[i + 1] == 1) {
            i = pair(data, i + 2);
          } else {
            if (index == 0 && data[i + 1] == 2)
              index = this.putAction(pair(data, i + 2), token, end, index);
            break;
          }
        }
        if (data[i] == token)
          index = this.putAction(pair(data, i + 1), token, end, index);
      }
    }
    return index;
  }
};
var Parse = class {
  constructor(parser, input, fragments, ranges) {
    this.parser = parser;
    this.input = input;
    this.ranges = ranges;
    this.recovering = 0;
    this.nextStackID = 9812;
    this.minStackPos = 0;
    this.reused = [];
    this.stoppedAt = null;
    this.lastBigReductionStart = -1;
    this.lastBigReductionSize = 0;
    this.bigReductionCount = 0;
    this.stream = new InputStream(input, ranges);
    this.tokens = new TokenCache(parser, this.stream);
    this.topTerm = parser.top[1];
    let { from } = ranges[0];
    this.stacks = [Stack.start(this, parser.top[0], from)];
    this.fragments = fragments.length && this.stream.end - from > parser.bufferLength * 4 ? new FragmentCursor(fragments, parser.minRepeatTerm) : null;
  }
  get parsedPos() {
    return this.minStackPos;
  }
  // Move the parser forward. This will process all parse stacks at
  // `this.pos` and try to advance them to a further position. If no
  // stack for such a position is found, it'll start error-recovery.
  //
  // When the parse is finished, this will return a syntax tree. When
  // not, it returns `null`.
  advance() {
    let stacks = this.stacks, pos = this.minStackPos;
    let newStacks = this.stacks = [];
    let stopped, stoppedTokens;
    if (this.bigReductionCount > 300 && stacks.length == 1) {
      let [s] = stacks;
      while (s.forceReduce() && s.stack.length && s.stack[s.stack.length - 2] >= this.lastBigReductionStart) {
      }
      this.bigReductionCount = this.lastBigReductionSize = 0;
    }
    for (let i = 0; i < stacks.length; i++) {
      let stack = stacks[i];
      for (; ; ) {
        this.tokens.mainToken = null;
        if (stack.pos > pos) {
          newStacks.push(stack);
        } else if (this.advanceStack(stack, newStacks, stacks)) {
          continue;
        } else {
          if (!stopped) {
            stopped = [];
            stoppedTokens = [];
          }
          stopped.push(stack);
          let tok = this.tokens.getMainToken(stack);
          stoppedTokens.push(tok.value, tok.end);
        }
        break;
      }
    }
    if (!newStacks.length) {
      let finished = stopped && findFinished(stopped);
      if (finished) {
        if (verbose)
          console.log("Finish with " + this.stackID(finished));
        return this.stackToTree(finished);
      }
      if (this.parser.strict) {
        if (verbose && stopped)
          console.log("Stuck with token " + (this.tokens.mainToken ? this.parser.getName(this.tokens.mainToken.value) : "none"));
        throw new SyntaxError("No parse at " + pos);
      }
      if (!this.recovering)
        this.recovering = 5;
    }
    if (this.recovering && stopped) {
      let finished = this.stoppedAt != null && stopped[0].pos > this.stoppedAt ? stopped[0] : this.runRecovery(stopped, stoppedTokens, newStacks);
      if (finished) {
        if (verbose)
          console.log("Force-finish " + this.stackID(finished));
        return this.stackToTree(finished.forceAll());
      }
    }
    if (this.recovering) {
      let maxRemaining = this.recovering == 1 ? 1 : this.recovering * 3;
      if (newStacks.length > maxRemaining) {
        newStacks.sort((a, b) => b.score - a.score);
        while (newStacks.length > maxRemaining)
          newStacks.pop();
      }
      if (newStacks.some((s) => s.reducePos > pos))
        this.recovering--;
    } else if (newStacks.length > 1) {
      outer: for (let i = 0; i < newStacks.length - 1; i++) {
        let stack = newStacks[i];
        for (let j = i + 1; j < newStacks.length; j++) {
          let other = newStacks[j];
          if (stack.sameState(other) || stack.buffer.length > 500 && other.buffer.length > 500) {
            if ((stack.score - other.score || stack.buffer.length - other.buffer.length) > 0) {
              newStacks.splice(j--, 1);
            } else {
              newStacks.splice(i--, 1);
              continue outer;
            }
          }
        }
      }
      if (newStacks.length > 12) {
        newStacks.sort((a, b) => b.score - a.score);
        newStacks.splice(
          12,
          newStacks.length - 12
          /* Rec.MaxStackCount */
        );
      }
    }
    this.minStackPos = newStacks[0].pos;
    for (let i = 1; i < newStacks.length; i++)
      if (newStacks[i].pos < this.minStackPos)
        this.minStackPos = newStacks[i].pos;
    return null;
  }
  stopAt(pos) {
    if (this.stoppedAt != null && this.stoppedAt < pos)
      throw new RangeError("Can't move stoppedAt forward");
    this.stoppedAt = pos;
  }
  // See if a given tree, or a descendant right at its start, can be
  // reused in the given stack.
  tryReuse(stack, start, tree, repeatOnly) {
    if (!tree)
      return null;
    let strictCx = stack.curContext && stack.curContext.tracker.strict, cxHash = strictCx ? stack.curContext.hash : 0;
    for (; tree; ) {
      let match = this.parser.nodeSet.types[tree.type.id] != tree.type ? -1 : this.parser.getGoto(stack.state, tree.type.id);
      if (match > -1 && tree.length && (!strictCx || (tree.prop(NodeProp.contextHash) || 0) == cxHash)) {
        stack.useNode(tree, match, start);
        return tree;
      }
      if (tree.children.length == 0 || tree.positions[0] > 0)
        break;
      let inner = tree.children[0];
      if (inner instanceof Tree && (!repeatOnly || inner.type.id >= this.parser.minRepeatTerm))
        tree = inner;
      else
        break;
    }
    return null;
  }
  // Returns an updated version of the given stack, or null if the
  // stack can't advance normally. When `split` and `stacks` are
  // given, stacks split off by ambiguous operations will be pushed to
  // `split`, or added to `stacks` if they move `pos` forward.
  advanceStack(stack, stacks, split) {
    let start = stack.pos, { parser } = this;
    let base = verbose ? this.stackID(stack) + " -> " : "";
    if (this.stoppedAt != null && start > this.stoppedAt)
      return stack.forceReduce() ? stack : null;
    if (this.fragments) {
      let reused = stack.reducePos < start && stack.buffer.length && stack.buffer[stack.buffer.length - 2] <= stack.reducePos && this.fragments.lastRepeatPos == stack.reducePos && this.tryReuse(stack, stack.reducePos, this.fragments.lastRepeat, true) || this.tryReuse(stack, start, this.fragments.nodeAt(start), false);
      if (reused) {
        if (verbose)
          console.log(base + this.stackID(stack) + ` (via reuse of ${parser.getName(reused.type.id)})`);
        return true;
      }
    }
    let defaultReduce = parser.stateSlot(
      stack.state,
      4
      /* ParseState.DefaultReduce */
    );
    if (defaultReduce > 0) {
      stack.reduce(defaultReduce);
      if (verbose)
        console.log(base + this.stackID(stack) + ` (via always-reduce ${parser.getName(
          defaultReduce & 65535
          /* Action.ValueMask */
        )})`);
      return true;
    }
    if (stack.stack.length >= 8400) {
      while (stack.stack.length > 6e3 && stack.forceReduce()) {
      }
    }
    let actions = this.tokens.getActions(stack);
    for (let i = 0; i < actions.length; ) {
      let action = actions[i++], term = actions[i++], end = actions[i++];
      let last = i == actions.length || !split;
      let localStack = last ? stack : stack.split();
      let main = this.tokens.mainToken;
      localStack.apply(action, term, main ? main.start : localStack.pos, end);
      if (verbose)
        console.log(base + this.stackID(localStack) + ` (via ${(action & 65536) == 0 ? "shift" : `reduce of ${parser.getName(
          action & 65535
          /* Action.ValueMask */
        )}`} for ${parser.getName(term)} @ ${start}${localStack == stack ? "" : ", split"})`);
      if (last)
        return true;
      else if (localStack.pos > start)
        stacks.push(localStack);
      else
        split.push(localStack);
    }
    return false;
  }
  // Advance a given stack forward as far as it will go. Returns the
  // (possibly updated) stack if it got stuck, or null if it moved
  // forward and was given to `pushStackDedup`.
  advanceFully(stack, newStacks) {
    let pos = stack.pos;
    for (; ; ) {
      if (!this.advanceStack(stack, null, null))
        return false;
      if (stack.pos > pos) {
        pushStackDedup(stack, newStacks);
        return true;
      }
    }
  }
  runRecovery(stacks, tokens, newStacks) {
    let finished = null, restarted = false;
    for (let i = 0; i < stacks.length; i++) {
      let stack = stacks[i], token = tokens[i << 1], tokenEnd = tokens[(i << 1) + 1];
      let base = verbose ? this.stackID(stack) + " -> " : "";
      if (stack.deadEnd) {
        if (restarted)
          continue;
        restarted = true;
        stack.restart();
        if (verbose)
          console.log(base + this.stackID(stack) + " (restarted)");
        let done = this.advanceFully(stack, newStacks);
        if (done)
          continue;
      }
      let force = stack.split(), forceBase = base;
      for (let j = 0; j < 10 && force.forceReduce(); j++) {
        if (verbose)
          console.log(forceBase + this.stackID(force) + " (via force-reduce)");
        let done = this.advanceFully(force, newStacks);
        if (done)
          break;
        if (verbose)
          forceBase = this.stackID(force) + " -> ";
      }
      for (let insert of stack.recoverByInsert(token)) {
        if (verbose)
          console.log(base + this.stackID(insert) + " (via recover-insert)");
        this.advanceFully(insert, newStacks);
      }
      if (this.stream.end > stack.pos) {
        if (tokenEnd == stack.pos) {
          tokenEnd++;
          token = 0;
        }
        stack.recoverByDelete(token, tokenEnd);
        if (verbose)
          console.log(base + this.stackID(stack) + ` (via recover-delete ${this.parser.getName(token)})`);
        pushStackDedup(stack, newStacks);
      } else if (!finished || finished.score < force.score) {
        finished = force;
      }
    }
    return finished;
  }
  // Convert the stack's buffer to a syntax tree.
  stackToTree(stack) {
    stack.close();
    return Tree.build({
      buffer: StackBufferCursor.create(stack),
      nodeSet: this.parser.nodeSet,
      topID: this.topTerm,
      maxBufferLength: this.parser.bufferLength,
      reused: this.reused,
      start: this.ranges[0].from,
      length: stack.pos - this.ranges[0].from,
      minRepeatType: this.parser.minRepeatTerm
    });
  }
  stackID(stack) {
    let id2 = (stackIDs || (stackIDs = /* @__PURE__ */ new WeakMap())).get(stack);
    if (!id2)
      stackIDs.set(stack, id2 = String.fromCodePoint(this.nextStackID++));
    return id2 + stack;
  }
};
function pushStackDedup(stack, newStacks) {
  for (let i = 0; i < newStacks.length; i++) {
    let other = newStacks[i];
    if (other.pos == stack.pos && other.sameState(stack)) {
      if (newStacks[i].score < stack.score)
        newStacks[i] = stack;
      return;
    }
  }
  newStacks.push(stack);
}
var Dialect = class {
  constructor(source, flags, disabled) {
    this.source = source;
    this.flags = flags;
    this.disabled = disabled;
  }
  allows(term) {
    return !this.disabled || this.disabled[term] == 0;
  }
};
var id = (x) => x;
var ContextTracker = class {
  /**
  Define a context tracker.
  */
  constructor(spec) {
    this.start = spec.start;
    this.shift = spec.shift || id;
    this.reduce = spec.reduce || id;
    this.reuse = spec.reuse || id;
    this.hash = spec.hash || (() => 0);
    this.strict = spec.strict !== false;
  }
};
var LRParser = class _LRParser extends Parser {
  /**
  @internal
  */
  constructor(spec) {
    super();
    this.wrappers = [];
    if (spec.version != 14)
      throw new RangeError(`Parser version (${spec.version}) doesn't match runtime version (${14})`);
    let nodeNames = spec.nodeNames.split(" ");
    this.minRepeatTerm = nodeNames.length;
    for (let i = 0; i < spec.repeatNodeCount; i++)
      nodeNames.push("");
    let topTerms = Object.keys(spec.topRules).map((r) => spec.topRules[r][1]);
    let nodeProps = [];
    for (let i = 0; i < nodeNames.length; i++)
      nodeProps.push([]);
    function setProp(nodeID, prop, value) {
      nodeProps[nodeID].push([prop, prop.deserialize(String(value))]);
    }
    if (spec.nodeProps)
      for (let propSpec of spec.nodeProps) {
        let prop = propSpec[0];
        if (typeof prop == "string")
          prop = NodeProp[prop];
        for (let i = 1; i < propSpec.length; ) {
          let next = propSpec[i++];
          if (next >= 0) {
            setProp(next, prop, propSpec[i++]);
          } else {
            let value = propSpec[i + -next];
            for (let j = -next; j > 0; j--)
              setProp(propSpec[i++], prop, value);
            i++;
          }
        }
      }
    this.nodeSet = new NodeSet(nodeNames.map((name, i) => NodeType.define({
      name: i >= this.minRepeatTerm ? void 0 : name,
      id: i,
      props: nodeProps[i],
      top: topTerms.indexOf(i) > -1,
      error: i == 0,
      skipped: spec.skippedNodes && spec.skippedNodes.indexOf(i) > -1
    })));
    if (spec.propSources)
      this.nodeSet = this.nodeSet.extend(...spec.propSources);
    this.strict = false;
    this.bufferLength = DefaultBufferLength;
    let tokenArray = decodeArray(spec.tokenData);
    this.context = spec.context;
    this.specializerSpecs = spec.specialized || [];
    this.specialized = new Uint16Array(this.specializerSpecs.length);
    for (let i = 0; i < this.specializerSpecs.length; i++)
      this.specialized[i] = this.specializerSpecs[i].term;
    this.specializers = this.specializerSpecs.map(getSpecializer);
    this.states = decodeArray(spec.states, Uint32Array);
    this.data = decodeArray(spec.stateData);
    this.goto = decodeArray(spec.goto);
    this.maxTerm = spec.maxTerm;
    this.tokenizers = spec.tokenizers.map((value) => typeof value == "number" ? new TokenGroup(tokenArray, value) : value);
    this.topRules = spec.topRules;
    this.dialects = spec.dialects || {};
    this.dynamicPrecedences = spec.dynamicPrecedences || null;
    this.tokenPrecTable = spec.tokenPrec;
    this.termNames = spec.termNames || null;
    this.maxNode = this.nodeSet.types.length - 1;
    this.dialect = this.parseDialect();
    this.top = this.topRules[Object.keys(this.topRules)[0]];
  }
  createParse(input, fragments, ranges) {
    let parse2 = new Parse(this, input, fragments, ranges);
    for (let w of this.wrappers)
      parse2 = w(parse2, input, fragments, ranges);
    return parse2;
  }
  /**
  Get a goto table entry @internal
  */
  getGoto(state, term, loose = false) {
    let table = this.goto;
    if (term >= table[0])
      return -1;
    for (let pos = table[term + 1]; ; ) {
      let groupTag = table[pos++], last = groupTag & 1;
      let target = table[pos++];
      if (last && loose)
        return target;
      for (let end = pos + (groupTag >> 1); pos < end; pos++)
        if (table[pos] == state)
          return target;
      if (last)
        return -1;
    }
  }
  /**
  Check if this state has an action for a given terminal @internal
  */
  hasAction(state, terminal) {
    let data = this.data;
    for (let set = 0; set < 2; set++) {
      for (let i = this.stateSlot(
        state,
        set ? 2 : 1
        /* ParseState.Actions */
      ), next; ; i += 3) {
        if ((next = data[i]) == 65535) {
          if (data[i + 1] == 1)
            next = data[i = pair(data, i + 2)];
          else if (data[i + 1] == 2)
            return pair(data, i + 2);
          else
            break;
        }
        if (next == terminal || next == 0)
          return pair(data, i + 1);
      }
    }
    return 0;
  }
  /**
  @internal
  */
  stateSlot(state, slot) {
    return this.states[state * 6 + slot];
  }
  /**
  @internal
  */
  stateFlag(state, flag) {
    return (this.stateSlot(
      state,
      0
      /* ParseState.Flags */
    ) & flag) > 0;
  }
  /**
  @internal
  */
  validAction(state, action) {
    return !!this.allActions(state, (a) => a == action ? true : null);
  }
  /**
  @internal
  */
  allActions(state, action) {
    let deflt = this.stateSlot(
      state,
      4
      /* ParseState.DefaultReduce */
    );
    let result = deflt ? action(deflt) : void 0;
    for (let i = this.stateSlot(
      state,
      1
      /* ParseState.Actions */
    ); result == null; i += 3) {
      if (this.data[i] == 65535) {
        if (this.data[i + 1] == 1)
          i = pair(this.data, i + 2);
        else
          break;
      }
      result = action(pair(this.data, i + 1));
    }
    return result;
  }
  /**
  Get the states that can follow this one through shift actions or
  goto jumps. @internal
  */
  nextStates(state) {
    let result = [];
    for (let i = this.stateSlot(
      state,
      1
      /* ParseState.Actions */
    ); ; i += 3) {
      if (this.data[i] == 65535) {
        if (this.data[i + 1] == 1)
          i = pair(this.data, i + 2);
        else
          break;
      }
      if ((this.data[i + 2] & 65536 >> 16) == 0) {
        let value = this.data[i + 1];
        if (!result.some((v, i2) => i2 & 1 && v == value))
          result.push(this.data[i], value);
      }
    }
    return result;
  }
  /**
  Configure the parser. Returns a new parser instance that has the
  given settings modified. Settings not provided in `config` are
  kept from the original parser.
  */
  configure(config) {
    let copy = Object.assign(Object.create(_LRParser.prototype), this);
    if (config.props)
      copy.nodeSet = this.nodeSet.extend(...config.props);
    if (config.top) {
      let info = this.topRules[config.top];
      if (!info)
        throw new RangeError(`Invalid top rule name ${config.top}`);
      copy.top = info;
    }
    if (config.tokenizers)
      copy.tokenizers = this.tokenizers.map((t) => {
        let found = config.tokenizers.find((r) => r.from == t);
        return found ? found.to : t;
      });
    if (config.specializers) {
      copy.specializers = this.specializers.slice();
      copy.specializerSpecs = this.specializerSpecs.map((s, i) => {
        let found = config.specializers.find((r) => r.from == s.external);
        if (!found)
          return s;
        let spec = Object.assign(Object.assign({}, s), { external: found.to });
        copy.specializers[i] = getSpecializer(spec);
        return spec;
      });
    }
    if (config.contextTracker)
      copy.context = config.contextTracker;
    if (config.dialect)
      copy.dialect = this.parseDialect(config.dialect);
    if (config.strict != null)
      copy.strict = config.strict;
    if (config.wrap)
      copy.wrappers = copy.wrappers.concat(config.wrap);
    if (config.bufferLength != null)
      copy.bufferLength = config.bufferLength;
    return copy;
  }
  /**
  Tells you whether any [parse wrappers](#lr.ParserConfig.wrap)
  are registered for this parser.
  */
  hasWrappers() {
    return this.wrappers.length > 0;
  }
  /**
  Returns the name associated with a given term. This will only
  work for all terms when the parser was generated with the
  `--names` option. By default, only the names of tagged terms are
  stored.
  */
  getName(term) {
    return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.nodeSet.types[term].name || term);
  }
  /**
  The eof term id is always allocated directly after the node
  types. @internal
  */
  get eofTerm() {
    return this.maxNode + 1;
  }
  /**
  The type of top node produced by the parser.
  */
  get topNode() {
    return this.nodeSet.types[this.top[1]];
  }
  /**
  @internal
  */
  dynamicPrecedence(term) {
    let prec = this.dynamicPrecedences;
    return prec == null ? 0 : prec[term] || 0;
  }
  /**
  @internal
  */
  parseDialect(dialect) {
    let values = Object.keys(this.dialects), flags = values.map(() => false);
    if (dialect)
      for (let part of dialect.split(" ")) {
        let id2 = values.indexOf(part);
        if (id2 >= 0)
          flags[id2] = true;
      }
    let disabled = null;
    for (let i = 0; i < values.length; i++)
      if (!flags[i]) {
        for (let j = this.dialects[values[i]], id2; (id2 = this.data[j++]) != 65535; )
          (disabled || (disabled = new Uint8Array(this.maxTerm + 1)))[id2] = 1;
      }
    return new Dialect(dialect, flags, disabled);
  }
  /**
  Used by the output of the parser generator. Not available to
  user code. @hide
  */
  static deserialize(spec) {
    return new _LRParser(spec);
  }
};
function pair(data, off) {
  return data[off] | data[off + 1] << 16;
}
function findFinished(stacks) {
  let best = null;
  for (let stack of stacks) {
    let stopped = stack.p.stoppedAt;
    if ((stack.pos == stack.p.stream.end || stopped != null && stack.pos > stopped) && stack.p.parser.stateFlag(
      stack.state,
      2
      /* StateFlag.Accepting */
    ) && (!best || best.score < stack.score))
      best = stack;
  }
  return best;
}
function getSpecializer(spec) {
  if (spec.external) {
    let mask = spec.extend ? 1 : 0;
    return (value, stack) => spec.external(value, stack) << 1 | mask;
  }
  return spec.get;
}
export {
  verifyLibrarySelection as A,
  BARE_QUERY_DATA_BINDING as B,
  ContextTracker as C,
  ExternalTokenizer as E,
  LRParser as L,
  NodeProp as N,
  lintOversizedWidths as a,
  lintHtmlContentHeight as b,
  lintHtmlRootSurface as c,
  lintUnguardedComponentRefs as d,
  lintEmbeddedBindingSyntax as e,
  lintChartDataShape as f,
  lintUnguardedSelectionText as g,
  defaultPack as h,
  lintTextFormat as i,
  lintTableColumnsShape as j,
  lintComponentStateBindings as k,
  lintSelectedRowProjections as l,
  lintEmptyDateWrites as m,
  lintUntriggeredDataQueries as n,
  lintAutomaticWrites as o,
  parseHtml as p,
  stripHtmlBindings as q,
  retiredUi2Name as r,
  surfaceAroundResolver as s,
  suggestedHtmlHeight as t,
  componentLibraryChoices as u,
  resolveComponentLibrary as v,
  savedComponentLibrary as w,
  checkedLibrarySelection as x,
  COMPONENT_PACK_DESCRIPTION as y,
  componentLibraryWarnings as z
};
