import { createRequire } from "node:module";
import { p as parseExpression, a as parse } from "./chunk-CyEU6e6J.mjs";
import { a as activePackSet, g as getComponentSchema } from "./chunk-w14kofOC.mjs";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
            const id = JSON.stringify([alias, name2]);
            if (!aliasOmissions.has(id))
              aliasOmissions.set(id, { alias, table: name2, fields: /* @__PURE__ */ new Set() });
            aliasOmissions.get(id).fields.add(field);
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
var offline;
function libraryPacksAll() {
  const discovered = activePackSet().packs;
  if (discovered)
    return discovered;
  if (offline === void 0) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), "../data/library-pack.json");
      offline = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      offline = null;
    }
  }
  return offline ? [offline] : [];
}
function registerLibraryPacks(packs) {
  const set = activePackSet();
  set.packs = packs;
}
var serverLibraryPacks = () => activePackSet().packs ?? [];
function libraryPack() {
  return libraryPacksAll()[0] ?? null;
}
var isBuiltin = (pack) => pack.kind === "builtin";
var packOfType = (type) => typeof type === "string" ? libraryPacksAll().find((p) => type.startsWith(p.prefix)) : void 0;
var isLibraryPackType = (type) => !!packOfType(type);
var packComponentOf = (type) => Object.values(packOfType(type)?.components ?? {}).find((entry) => entry.type === type);
var slotNamesOf = (component, kind) => (component?.slots ?? []).filter((slot) => kind === void 0 || slot.kind === kind).map((slot) => String(slot.name ?? "")).filter(Boolean);
function packSlotNames(type) {
  const component = packComponentOf(type);
  return component && component.slotsKnown !== false ? slotNamesOf(component) : void 0;
}
function packRowSlotNames(type) {
  return slotNamesOf(packComponentOf(type), "rows");
}
function packSlotOnOwnId(type, slotName) {
  const component = packComponentOf(type);
  const rows = slotNamesOf(component, "rows");
  if (!rows.length)
    return false;
  if (slotName)
    return rows.includes(slotName);
  return slotNamesOf(component).every((name) => rows.includes(name));
}
var dashless = (id) => id.replace(/-/g, "");
var propertyValue = (properties, key3) => {
  const entry = properties?.[key3];
  return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
};
function libraryCorrelationId(component) {
  const properties = component.properties;
  const id = propertyValue(properties, "correlationId");
  return typeof id === "string" && id && !propertyValue(properties, "codePage") ? id : void 0;
}
var isPinned = (pins, correlationId) => pins[dashless(correlationId)] != null || pins[correlationId] != null;
function missingLibraryPins(components, pins) {
  const missing = {};
  for (const component of components) {
    const id = libraryCorrelationId(component);
    if (!id || isPinned(pins, id))
      continue;
    const pack = libraryPacksAll().find((p) => !isBuiltin(p) && p.correlationId === id);
    if (pack)
      missing[dashless(id)] = pack.version;
  }
  return Object.keys(missing).length ? missing : void 0;
}
function unpinnedLibraries(components, pins) {
  const byLibrary = /* @__PURE__ */ new Map();
  for (const component of components) {
    const id = libraryCorrelationId(component);
    if (!id || isPinned(pins, id))
      continue;
    const library = String(propertyValue(component.properties, "libraryName") ?? id);
    byLibrary.set(library, [...byLibrary.get(library) ?? [], String(component.name ?? "unnamed")]);
  }
  return [...byLibrary].map(([library, names]) => ({ library, components: names }));
}
function toLibraryComponent(spec) {
  const pack = packOfType(spec.type);
  if (!pack)
    return spec;
  const componentName = spec.type.slice(pack.prefix.length);
  if (isBuiltin(pack)) {
    return {
      ...spec,
      type: "PackComponent",
      properties: {
        ...spec.properties ?? {},
        pack: { value: pack.pack },
        componentName: { value: componentName }
      }
    };
  }
  return {
    ...spec,
    type: "LibraryComponent",
    properties: {
      ...spec.properties ?? {},
      libraryId: { value: pack.libraryId },
      correlationId: { value: pack.correlationId },
      libraryName: { value: pack.libraryName },
      componentName: { value: componentName }
    }
  };
}
function isEmptyLibraryHost(component) {
  if (component.type !== "LibraryComponent" && component.type !== "PackComponent")
    return false;
  return !["componentName", "pack", "libraryId", "correlationId", "libraryName"].some((key3) => {
    const entry = component.properties?.[key3];
    const value = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
    return typeof value === "string" && value.trim() !== "";
  });
}
function emptyLibraryHostError(component, options = {}) {
  if (!isEmptyLibraryHost(component))
    return null;
  return `Component "${component.name ?? component.id ?? component.type}" is a ${component.type} that names no component, so it draws an empty box: it is ToolJet's internal host, stored with the component it draws. ${options.persisted ? "Delete it and add" : "Write"} the pack's own type, Lib_<pack>_<Component> (get_component_catalog lists them).`;
}
function libraryTypeOf(component) {
  if (component.type !== "LibraryComponent" && component.type !== "PackComponent")
    return void 0;
  const value = (key3) => {
    const entry = component.properties?.[key3];
    return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  };
  if (component.type === "PackComponent") {
    const id = value("pack");
    const name2 = value("componentName");
    if (typeof id !== "string" || typeof name2 !== "string")
      return void 0;
    const known = libraryPacksAll().find((p) => p.pack === id);
    if (!known)
      return `Lib_${id.toLowerCase().replace(/[^a-z0-9]+/g, "")}_${name2}`;
    return known.components[name2] ? `${known.prefix}${name2}` : void 0;
  }
  const pack = libraryPacksAll().find((p) => p.correlationId === value("correlationId"));
  const name = value("componentName");
  return pack && typeof name === "string" && pack.components[name] ? `${pack.prefix}${name}` : void 0;
}
var FLEX_DOWNGRADE = {
  alignItems: { stretch: "flex-start", "last baseline": "flex-start" },
  justifyContent: { "space-between": "flex-start" }
};
function downgradeFlexForLibrary(spec) {
  if (process.env.TOOLJET_FLEX_V1 !== "1" || !libraryPack() || spec.type !== "FlexContainer" || !spec.properties)
    return spec;
  const properties = { ...spec.properties };
  for (const [key3, map] of Object.entries(FLEX_DOWNGRADE)) {
    const entry = properties[key3];
    const value = entry && typeof entry === "object" ? entry.value : entry;
    if (typeof value === "string" && map[value])
      properties[key3] = { value: map[value] };
  }
  return { ...spec, properties };
}
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
    const id = saved.slice(5);
    const catalogId = componentLibraryChoices().find((choice) => choice.value === saved)?.pack ?? id;
    return { library: "ui2", source: "saved", pack: catalogId, ...id !== catalogId && { selection: saved } };
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
  const resolve2 = (ref) => typeof ref === "string" ? byId.get(ref) ?? byName.get(ref) : void 0;
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
    const target = resolve2(payload.queryId ?? payload.queryName);
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
export {
  componentLibraryChoices as A,
  BARE_QUERY_DATA_BINDING as B,
  downgradeFlexForLibrary as C,
  resolveComponentLibrary as D,
  toLibraryComponent as E,
  missingLibraryPins as F,
  libraryTypeOf as G,
  savedComponentLibrary as H,
  checkedLibrarySelection as I,
  COMPONENT_PACK_DESCRIPTION as J,
  componentLibraryWarnings as K,
  unpinnedLibraries as L,
  verifyLibrarySelection as M,
  registerLibraryPacks as N,
  lintOversizedWidths as a,
  lintHtmlContentHeight as b,
  lintHtmlRootSurface as c,
  lintUnguardedComponentRefs as d,
  emptyLibraryHostError as e,
  lintEmbeddedBindingSyntax as f,
  lintChartDataShape as g,
  lintUnguardedSelectionText as h,
  isLibraryPackType as i,
  defaultPack as j,
  serverLibraryPacks as k,
  lintSelectedRowProjections as l,
  lintTextFormat as m,
  lintTableColumnsShape as n,
  lintComponentStateBindings as o,
  packSlotOnOwnId as p,
  lintEmptyDateWrites as q,
  retiredUi2Name as r,
  surfaceAroundResolver as s,
  lintUntriggeredDataQueries as t,
  lintAutomaticWrites as u,
  packRowSlotNames as v,
  parseHtml as w,
  stripHtmlBindings as x,
  packSlotNames as y,
  suggestedHtmlHeight as z
};
