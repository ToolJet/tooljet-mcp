import { createRequire } from "node:module";
import { p as parseExpression, a as parse } from "./chunk-tj2BrYhx.js";
import { e6 as __commonJS, e7 as __toESM } from "./chunk-BSIUjP8l.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AsyncLocalStorage } from "node:async_hooks";
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
var FORMAT = "tooljet-catalog-parts-v1";
var json = (value) => JSON.stringify(value, null, 2) + "\n";
function readCatalog(file) {
  const index = JSON.parse(readFileSync(file, "utf8"));
  if (index.format !== FORMAT) return index;
  const result = {};
  for (const part of index.parts) {
    if (!/^[\w-]+\/part-\d+\.json$/.test(part)) throw new Error(`Invalid catalog part: ${part}`);
    const data = JSON.parse(readFileSync(resolve(dirname(file), part), "utf8"));
    for (const [key3, value] of Object.entries(data)) {
      if (Object.hasOwn(result, key3)) throw new Error(`Duplicate catalog key: ${key3}`);
      Object.defineProperty(result, key3, { value, enumerable: true, writable: true, configurable: true });
    }
  }
  return result;
}
function readCatalogBytes(file) {
  const bytes = readFileSync(file);
  const value = JSON.parse(bytes.toString("utf8"));
  return value.format === FORMAT ? Buffer.from(json(readCatalog(file))) : bytes;
}
createRequire(import.meta.url);
var newPackSet = () => ({ schemas: null, definitions: {}, packs: null, derived: /* @__PURE__ */ new Map() });
var processSet = newPackSet();
var store = new AsyncLocalStorage();
var activePackSet = () => store.getStore() ?? processSet;
var inPackSet = (set, work) => store.run(set, work);
var dataPath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/component-schemas.json");
var compatibilityPath = resolve(dirname(fileURLToPath(import.meta.url)), "../data/component-compatibility.json");
var cache = null;
var legacyReplacements = null;
function load() {
  if (!cache)
    cache = readCatalog(dataPath);
  return cache;
}
function loadLegacyReplacements() {
  if (!legacyReplacements) {
    const compatibility = JSON.parse(readFileSync(compatibilityPath, "utf8"));
    legacyReplacements = compatibility.legacyReplacements ?? {};
  }
  return legacyReplacements;
}
var PACK_TYPE = /^Lib_[a-z0-9]+_/;
function merged() {
  const set = activePackSet();
  if (!set.schemas)
    return load();
  let all = set.derived.get("catalog");
  if (!all) {
    const extra = set.schemas;
    all = Object.fromEntries(Object.entries(load()).filter(([key3]) => !PACK_TYPE.test(key3) || key3 in extra));
    Object.assign(all, extra);
    set.derived.set("catalog", all);
  }
  return all;
}
function allComponentSchemas() {
  return merged();
}
function registerComponentSchemas(extra) {
  const set = activePackSet();
  set.schemas = { ...extra };
  set.derived.clear();
}
var INTERNAL_TYPES = {
  LibraryComponent: "is ToolJet's internal host for a custom or pack component; write the pack's own type, Lib_<pack>_<Component> (get_component_catalog lists them), which is stored with the component it draws.",
  PackComponent: "is ToolJet's internal host for a pack component; write the pack's own type, Lib_<pack>_<Component> (get_component_catalog lists them), which is stored with the component it draws.",
  ModuleContainer: "is a module app's own root, which ToolJet creates with the module; in an app it draws an empty box. To show a module in an app, use ModuleViewer."
};
function internalComponentTypeNote(type) {
  return INTERNAL_TYPES[type] ?? null;
}
function getCatalog() {
  const legacy = loadLegacyReplacements();
  return Object.values(merged()).filter((c) => !legacy[c.type] && !INTERNAL_TYPES[c.type]).map((c) => ({ type: c.type, description: c.description })).sort((a, b) => a.type.localeCompare(b.type));
}
function getComponentSchema(type) {
  return merged()[type] ?? null;
}
function getLegacyComponentReplacement(type) {
  return loadLegacyReplacements()[type] ?? null;
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
var require_unicode = __commonJS({
  "node_modules/json5/lib/unicode.js"(exports, module) {
    module.exports.Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/;
    module.exports.ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
    module.exports.ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;
  }
});
var require_util = __commonJS({
  "node_modules/json5/lib/util.js"(exports, module) {
    var unicode = require_unicode();
    module.exports = {
      isSpaceSeparator(c) {
        return typeof c === "string" && unicode.Space_Separator.test(c);
      },
      isIdStartChar(c) {
        return typeof c === "string" && (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "$" || c === "_" || unicode.ID_Start.test(c));
      },
      isIdContinueChar(c) {
        return typeof c === "string" && (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c >= "0" && c <= "9" || c === "$" || c === "_" || c === "\u200C" || c === "\u200D" || unicode.ID_Continue.test(c));
      },
      isDigit(c) {
        return typeof c === "string" && /[0-9]/.test(c);
      },
      isHexDigit(c) {
        return typeof c === "string" && /[0-9A-Fa-f]/.test(c);
      }
    };
  }
});
var require_parse = __commonJS({
  "node_modules/json5/lib/parse.js"(exports, module) {
    var util = require_util();
    var source;
    var parseState;
    var stack;
    var pos;
    var line;
    var column;
    var token;
    var key3;
    var root;
    module.exports = function parse2(text, reviver) {
      source = String(text);
      parseState = "start";
      stack = [];
      pos = 0;
      line = 1;
      column = 0;
      token = void 0;
      key3 = void 0;
      root = void 0;
      do {
        token = lex();
        parseStates[parseState]();
      } while (token.type !== "eof");
      if (typeof reviver === "function") {
        return internalize({ "": root }, "", reviver);
      }
      return root;
    };
    function internalize(holder, name, reviver) {
      const value = holder[name];
      if (value != null && typeof value === "object") {
        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const key22 = String(i);
            const replacement = internalize(value, key22, reviver);
            if (replacement === void 0) {
              delete value[key22];
            } else {
              Object.defineProperty(value, key22, {
                value: replacement,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        } else {
          for (const key22 in value) {
            const replacement = internalize(value, key22, reviver);
            if (replacement === void 0) {
              delete value[key22];
            } else {
              Object.defineProperty(value, key22, {
                value: replacement,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          }
        }
      }
      return reviver.call(holder, name, value);
    }
    var lexState;
    var buffer;
    var doubleQuote;
    var sign;
    var c;
    function lex() {
      lexState = "default";
      buffer = "";
      doubleQuote = false;
      sign = 1;
      for (; ; ) {
        c = peek();
        const token2 = lexStates[lexState]();
        if (token2) {
          return token2;
        }
      }
    }
    function peek() {
      if (source[pos]) {
        return String.fromCodePoint(source.codePointAt(pos));
      }
    }
    function read() {
      const c2 = peek();
      if (c2 === "\n") {
        line++;
        column = 0;
      } else if (c2) {
        column += c2.length;
      } else {
        column++;
      }
      if (c2) {
        pos += c2.length;
      }
      return c2;
    }
    var lexStates = {
      default() {
        switch (c) {
          case "	":
          case "\v":
          case "\f":
          case " ":
          case "\xA0":
          case "\uFEFF":
          case "\n":
          case "\r":
          case "\u2028":
          case "\u2029":
            read();
            return;
          case "/":
            read();
            lexState = "comment";
            return;
          case void 0:
            read();
            return newToken("eof");
        }
        if (util.isSpaceSeparator(c)) {
          read();
          return;
        }
        return lexStates[parseState]();
      },
      comment() {
        switch (c) {
          case "*":
            read();
            lexState = "multiLineComment";
            return;
          case "/":
            read();
            lexState = "singleLineComment";
            return;
        }
        throw invalidChar(read());
      },
      multiLineComment() {
        switch (c) {
          case "*":
            read();
            lexState = "multiLineCommentAsterisk";
            return;
          case void 0:
            throw invalidChar(read());
        }
        read();
      },
      multiLineCommentAsterisk() {
        switch (c) {
          case "*":
            read();
            return;
          case "/":
            read();
            lexState = "default";
            return;
          case void 0:
            throw invalidChar(read());
        }
        read();
        lexState = "multiLineComment";
      },
      singleLineComment() {
        switch (c) {
          case "\n":
          case "\r":
          case "\u2028":
          case "\u2029":
            read();
            lexState = "default";
            return;
          case void 0:
            read();
            return newToken("eof");
        }
        read();
      },
      value() {
        switch (c) {
          case "{":
          case "[":
            return newToken("punctuator", read());
          case "n":
            read();
            literal("ull");
            return newToken("null", null);
          case "t":
            read();
            literal("rue");
            return newToken("boolean", true);
          case "f":
            read();
            literal("alse");
            return newToken("boolean", false);
          case "-":
          case "+":
            if (read() === "-") {
              sign = -1;
            }
            lexState = "sign";
            return;
          case ".":
            buffer = read();
            lexState = "decimalPointLeading";
            return;
          case "0":
            buffer = read();
            lexState = "zero";
            return;
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            buffer = read();
            lexState = "decimalInteger";
            return;
          case "I":
            read();
            literal("nfinity");
            return newToken("numeric", Infinity);
          case "N":
            read();
            literal("aN");
            return newToken("numeric", NaN);
          case '"':
          case "'":
            doubleQuote = read() === '"';
            buffer = "";
            lexState = "string";
            return;
        }
        throw invalidChar(read());
      },
      identifierNameStartEscape() {
        if (c !== "u") {
          throw invalidChar(read());
        }
        read();
        const u = unicodeEscape();
        switch (u) {
          case "$":
          case "_":
            break;
          default:
            if (!util.isIdStartChar(u)) {
              throw invalidIdentifier();
            }
            break;
        }
        buffer += u;
        lexState = "identifierName";
      },
      identifierName() {
        switch (c) {
          case "$":
          case "_":
          case "\u200C":
          case "\u200D":
            buffer += read();
            return;
          case "\\":
            read();
            lexState = "identifierNameEscape";
            return;
        }
        if (util.isIdContinueChar(c)) {
          buffer += read();
          return;
        }
        return newToken("identifier", buffer);
      },
      identifierNameEscape() {
        if (c !== "u") {
          throw invalidChar(read());
        }
        read();
        const u = unicodeEscape();
        switch (u) {
          case "$":
          case "_":
          case "\u200C":
          case "\u200D":
            break;
          default:
            if (!util.isIdContinueChar(u)) {
              throw invalidIdentifier();
            }
            break;
        }
        buffer += u;
        lexState = "identifierName";
      },
      sign() {
        switch (c) {
          case ".":
            buffer = read();
            lexState = "decimalPointLeading";
            return;
          case "0":
            buffer = read();
            lexState = "zero";
            return;
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9":
            buffer = read();
            lexState = "decimalInteger";
            return;
          case "I":
            read();
            literal("nfinity");
            return newToken("numeric", sign * Infinity);
          case "N":
            read();
            literal("aN");
            return newToken("numeric", NaN);
        }
        throw invalidChar(read());
      },
      zero() {
        switch (c) {
          case ".":
            buffer += read();
            lexState = "decimalPoint";
            return;
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
          case "x":
          case "X":
            buffer += read();
            lexState = "hexadecimal";
            return;
        }
        return newToken("numeric", sign * 0);
      },
      decimalInteger() {
        switch (c) {
          case ".":
            buffer += read();
            lexState = "decimalPoint";
            return;
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      decimalPointLeading() {
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalFraction";
          return;
        }
        throw invalidChar(read());
      },
      decimalPoint() {
        switch (c) {
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalFraction";
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      decimalFraction() {
        switch (c) {
          case "e":
          case "E":
            buffer += read();
            lexState = "decimalExponent";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      decimalExponent() {
        switch (c) {
          case "+":
          case "-":
            buffer += read();
            lexState = "decimalExponentSign";
            return;
        }
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalExponentInteger";
          return;
        }
        throw invalidChar(read());
      },
      decimalExponentSign() {
        if (util.isDigit(c)) {
          buffer += read();
          lexState = "decimalExponentInteger";
          return;
        }
        throw invalidChar(read());
      },
      decimalExponentInteger() {
        if (util.isDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      hexadecimal() {
        if (util.isHexDigit(c)) {
          buffer += read();
          lexState = "hexadecimalInteger";
          return;
        }
        throw invalidChar(read());
      },
      hexadecimalInteger() {
        if (util.isHexDigit(c)) {
          buffer += read();
          return;
        }
        return newToken("numeric", sign * Number(buffer));
      },
      string() {
        switch (c) {
          case "\\":
            read();
            buffer += escape();
            return;
          case '"':
            if (doubleQuote) {
              read();
              return newToken("string", buffer);
            }
            buffer += read();
            return;
          case "'":
            if (!doubleQuote) {
              read();
              return newToken("string", buffer);
            }
            buffer += read();
            return;
          case "\n":
          case "\r":
            throw invalidChar(read());
          case "\u2028":
          case "\u2029":
            separatorChar(c);
            break;
          case void 0:
            throw invalidChar(read());
        }
        buffer += read();
      },
      start() {
        switch (c) {
          case "{":
          case "[":
            return newToken("punctuator", read());
        }
        lexState = "value";
      },
      beforePropertyName() {
        switch (c) {
          case "$":
          case "_":
            buffer = read();
            lexState = "identifierName";
            return;
          case "\\":
            read();
            lexState = "identifierNameStartEscape";
            return;
          case "}":
            return newToken("punctuator", read());
          case '"':
          case "'":
            doubleQuote = read() === '"';
            lexState = "string";
            return;
        }
        if (util.isIdStartChar(c)) {
          buffer += read();
          lexState = "identifierName";
          return;
        }
        throw invalidChar(read());
      },
      afterPropertyName() {
        if (c === ":") {
          return newToken("punctuator", read());
        }
        throw invalidChar(read());
      },
      beforePropertyValue() {
        lexState = "value";
      },
      afterPropertyValue() {
        switch (c) {
          case ",":
          case "}":
            return newToken("punctuator", read());
        }
        throw invalidChar(read());
      },
      beforeArrayValue() {
        if (c === "]") {
          return newToken("punctuator", read());
        }
        lexState = "value";
      },
      afterArrayValue() {
        switch (c) {
          case ",":
          case "]":
            return newToken("punctuator", read());
        }
        throw invalidChar(read());
      },
      end() {
        throw invalidChar(read());
      }
    };
    function newToken(type, value) {
      return {
        type,
        value,
        line,
        column
      };
    }
    function literal(s) {
      for (const c2 of s) {
        const p = peek();
        if (p !== c2) {
          throw invalidChar(read());
        }
        read();
      }
    }
    function escape() {
      const c2 = peek();
      switch (c2) {
        case "b":
          read();
          return "\b";
        case "f":
          read();
          return "\f";
        case "n":
          read();
          return "\n";
        case "r":
          read();
          return "\r";
        case "t":
          read();
          return "	";
        case "v":
          read();
          return "\v";
        case "0":
          read();
          if (util.isDigit(peek())) {
            throw invalidChar(read());
          }
          return "\0";
        case "x":
          read();
          return hexEscape();
        case "u":
          read();
          return unicodeEscape();
        case "\n":
        case "\u2028":
        case "\u2029":
          read();
          return "";
        case "\r":
          read();
          if (peek() === "\n") {
            read();
          }
          return "";
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          throw invalidChar(read());
        case void 0:
          throw invalidChar(read());
      }
      return read();
    }
    function hexEscape() {
      let buffer2 = "";
      let c2 = peek();
      if (!util.isHexDigit(c2)) {
        throw invalidChar(read());
      }
      buffer2 += read();
      c2 = peek();
      if (!util.isHexDigit(c2)) {
        throw invalidChar(read());
      }
      buffer2 += read();
      return String.fromCodePoint(parseInt(buffer2, 16));
    }
    function unicodeEscape() {
      let buffer2 = "";
      let count = 4;
      while (count-- > 0) {
        const c2 = peek();
        if (!util.isHexDigit(c2)) {
          throw invalidChar(read());
        }
        buffer2 += read();
      }
      return String.fromCodePoint(parseInt(buffer2, 16));
    }
    var parseStates = {
      start() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        push();
      },
      beforePropertyName() {
        switch (token.type) {
          case "identifier":
          case "string":
            key3 = token.value;
            parseState = "afterPropertyName";
            return;
          case "punctuator":
            pop();
            return;
          case "eof":
            throw invalidEOF();
        }
      },
      afterPropertyName() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        parseState = "beforePropertyValue";
      },
      beforePropertyValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        push();
      },
      beforeArrayValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        if (token.type === "punctuator" && token.value === "]") {
          pop();
          return;
        }
        push();
      },
      afterPropertyValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        switch (token.value) {
          case ",":
            parseState = "beforePropertyName";
            return;
          case "}":
            pop();
        }
      },
      afterArrayValue() {
        if (token.type === "eof") {
          throw invalidEOF();
        }
        switch (token.value) {
          case ",":
            parseState = "beforeArrayValue";
            return;
          case "]":
            pop();
        }
      },
      end() {
      }
    };
    function push() {
      let value;
      switch (token.type) {
        case "punctuator":
          switch (token.value) {
            case "{":
              value = {};
              break;
            case "[":
              value = [];
              break;
          }
          break;
        case "null":
        case "boolean":
        case "numeric":
        case "string":
          value = token.value;
          break;
      }
      if (root === void 0) {
        root = value;
      } else {
        const parent = stack[stack.length - 1];
        if (Array.isArray(parent)) {
          parent.push(value);
        } else {
          Object.defineProperty(parent, key3, {
            value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      if (value !== null && typeof value === "object") {
        stack.push(value);
        if (Array.isArray(value)) {
          parseState = "beforeArrayValue";
        } else {
          parseState = "beforePropertyName";
        }
      } else {
        const current = stack[stack.length - 1];
        if (current == null) {
          parseState = "end";
        } else if (Array.isArray(current)) {
          parseState = "afterArrayValue";
        } else {
          parseState = "afterPropertyValue";
        }
      }
    }
    function pop() {
      stack.pop();
      const current = stack[stack.length - 1];
      if (current == null) {
        parseState = "end";
      } else if (Array.isArray(current)) {
        parseState = "afterArrayValue";
      } else {
        parseState = "afterPropertyValue";
      }
    }
    function invalidChar(c2) {
      if (c2 === void 0) {
        return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
      }
      return syntaxError(`JSON5: invalid character '${formatChar(c2)}' at ${line}:${column}`);
    }
    function invalidEOF() {
      return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
    }
    function invalidIdentifier() {
      column -= 5;
      return syntaxError(`JSON5: invalid identifier character at ${line}:${column}`);
    }
    function separatorChar(c2) {
      console.warn(`JSON5: '${formatChar(c2)}' in strings is not valid ECMAScript; consider escaping`);
    }
    function formatChar(c2) {
      const replacements = {
        "'": "\\'",
        '"': '\\"',
        "\\": "\\\\",
        "\b": "\\b",
        "\f": "\\f",
        "\n": "\\n",
        "\r": "\\r",
        "	": "\\t",
        "\v": "\\v",
        "\0": "\\0",
        "\u2028": "\\u2028",
        "\u2029": "\\u2029"
      };
      if (replacements[c2]) {
        return replacements[c2];
      }
      if (c2 < " ") {
        const hexString = c2.charCodeAt(0).toString(16);
        return "\\x" + ("00" + hexString).substring(hexString.length);
      }
      return c2;
    }
    function syntaxError(message) {
      const err = new SyntaxError(message);
      err.lineNumber = line;
      err.columnNumber = column;
      return err;
    }
  }
});
var require_stringify = __commonJS({
  "node_modules/json5/lib/stringify.js"(exports, module) {
    var util = require_util();
    module.exports = function stringify(value, replacer, space) {
      const stack = [];
      let indent = "";
      let propertyList;
      let replacerFunc;
      let gap = "";
      let quote;
      if (replacer != null && typeof replacer === "object" && !Array.isArray(replacer)) {
        space = replacer.space;
        quote = replacer.quote;
        replacer = replacer.replacer;
      }
      if (typeof replacer === "function") {
        replacerFunc = replacer;
      } else if (Array.isArray(replacer)) {
        propertyList = [];
        for (const v of replacer) {
          let item;
          if (typeof v === "string") {
            item = v;
          } else if (typeof v === "number" || v instanceof String || v instanceof Number) {
            item = String(v);
          }
          if (item !== void 0 && propertyList.indexOf(item) < 0) {
            propertyList.push(item);
          }
        }
      }
      if (space instanceof Number) {
        space = Number(space);
      } else if (space instanceof String) {
        space = String(space);
      }
      if (typeof space === "number") {
        if (space > 0) {
          space = Math.min(10, Math.floor(space));
          gap = "          ".substr(0, space);
        }
      } else if (typeof space === "string") {
        gap = space.substr(0, 10);
      }
      return serializeProperty("", { "": value });
      function serializeProperty(key3, holder) {
        let value2 = holder[key3];
        if (value2 != null) {
          if (typeof value2.toJSON5 === "function") {
            value2 = value2.toJSON5(key3);
          } else if (typeof value2.toJSON === "function") {
            value2 = value2.toJSON(key3);
          }
        }
        if (replacerFunc) {
          value2 = replacerFunc.call(holder, key3, value2);
        }
        if (value2 instanceof Number) {
          value2 = Number(value2);
        } else if (value2 instanceof String) {
          value2 = String(value2);
        } else if (value2 instanceof Boolean) {
          value2 = value2.valueOf();
        }
        switch (value2) {
          case null:
            return "null";
          case true:
            return "true";
          case false:
            return "false";
        }
        if (typeof value2 === "string") {
          return quoteString(value2);
        }
        if (typeof value2 === "number") {
          return String(value2);
        }
        if (typeof value2 === "object") {
          return Array.isArray(value2) ? serializeArray(value2) : serializeObject(value2);
        }
        return void 0;
      }
      function quoteString(value2) {
        const quotes = {
          "'": 0.1,
          '"': 0.2
        };
        const replacements = {
          "'": "\\'",
          '"': '\\"',
          "\\": "\\\\",
          "\b": "\\b",
          "\f": "\\f",
          "\n": "\\n",
          "\r": "\\r",
          "	": "\\t",
          "\v": "\\v",
          "\0": "\\0",
          "\u2028": "\\u2028",
          "\u2029": "\\u2029"
        };
        let product = "";
        for (let i = 0; i < value2.length; i++) {
          const c = value2[i];
          switch (c) {
            case "'":
            case '"':
              quotes[c]++;
              product += c;
              continue;
            case "\0":
              if (util.isDigit(value2[i + 1])) {
                product += "\\x00";
                continue;
              }
          }
          if (replacements[c]) {
            product += replacements[c];
            continue;
          }
          if (c < " ") {
            let hexString = c.charCodeAt(0).toString(16);
            product += "\\x" + ("00" + hexString).substring(hexString.length);
            continue;
          }
          product += c;
        }
        const quoteChar = quote || Object.keys(quotes).reduce((a, b) => quotes[a] < quotes[b] ? a : b);
        product = product.replace(new RegExp(quoteChar, "g"), replacements[quoteChar]);
        return quoteChar + product + quoteChar;
      }
      function serializeObject(value2) {
        if (stack.indexOf(value2) >= 0) {
          throw TypeError("Converting circular structure to JSON5");
        }
        stack.push(value2);
        let stepback = indent;
        indent = indent + gap;
        let keys = propertyList || Object.keys(value2);
        let partial = [];
        for (const key3 of keys) {
          const propertyString = serializeProperty(key3, value2);
          if (propertyString !== void 0) {
            let member3 = serializeKey(key3) + ":";
            if (gap !== "") {
              member3 += " ";
            }
            member3 += propertyString;
            partial.push(member3);
          }
        }
        let final;
        if (partial.length === 0) {
          final = "{}";
        } else {
          let properties;
          if (gap === "") {
            properties = partial.join(",");
            final = "{" + properties + "}";
          } else {
            let separator = ",\n" + indent;
            properties = partial.join(separator);
            final = "{\n" + indent + properties + ",\n" + stepback + "}";
          }
        }
        stack.pop();
        indent = stepback;
        return final;
      }
      function serializeKey(key3) {
        if (key3.length === 0) {
          return quoteString(key3);
        }
        const firstChar = String.fromCodePoint(key3.codePointAt(0));
        if (!util.isIdStartChar(firstChar)) {
          return quoteString(key3);
        }
        for (let i = firstChar.length; i < key3.length; i++) {
          if (!util.isIdContinueChar(String.fromCodePoint(key3.codePointAt(i)))) {
            return quoteString(key3);
          }
        }
        return key3;
      }
      function serializeArray(value2) {
        if (stack.indexOf(value2) >= 0) {
          throw TypeError("Converting circular structure to JSON5");
        }
        stack.push(value2);
        let stepback = indent;
        indent = indent + gap;
        let partial = [];
        for (let i = 0; i < value2.length; i++) {
          const propertyString = serializeProperty(String(i), value2);
          partial.push(propertyString !== void 0 ? propertyString : "null");
        }
        let final;
        if (partial.length === 0) {
          final = "[]";
        } else {
          if (gap === "") {
            let properties = partial.join(",");
            final = "[" + properties + "]";
          } else {
            let separator = ",\n" + indent;
            let properties = partial.join(separator);
            final = "[\n" + indent + properties + ",\n" + stepback + "]";
          }
        }
        stack.pop();
        indent = stepback;
        return final;
      }
    };
  }
});
var require_lib = __commonJS({
  "node_modules/json5/lib/index.js"(exports, module) {
    var parse2 = require_parse();
    var stringify = require_stringify();
    var JSON5 = {
      parse: parse2,
      stringify
    };
    module.exports = JSON5;
  }
});
createRequire(import.meta.url);
var import_json5 = __toESM(require_lib(), 1);
var toSlotName = (prefix, key3) => `${prefix}_${key3.replace(/[^A-Za-z0-9_]/g, "_")}`;
var keyTag = (key3) => {
  let h = 2166136261;
  for (let i = 0; i < key3.length; i += 1)
    h = Math.imul(h ^ key3.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};
function slotNames(prefix, keys) {
  const names = [];
  const taken = /* @__PURE__ */ new Set();
  const distinct = [...new Set(keys)];
  const plain = distinct.filter((k) => /^[A-Za-z0-9_]*$/.test(k));
  const folded = distinct.filter((k) => !/^[A-Za-z0-9_]*$/.test(k)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  for (const k of plain) {
    names.push(toSlotName(prefix, k));
    taken.add(toSlotName(prefix, k));
  }
  for (const k of folded) {
    const base = toSlotName(prefix, k);
    let name = base;
    for (let n = 1; taken.has(name); n += 1)
      name = `${base}_${keyTag(k)}${n > 1 ? `_${n}` : ""}`;
    names.push(name);
    taken.add(name);
  }
  return names;
}
var KEY_FIELDS = ["key", "id", "value", "name"];
function keysOf(items, field) {
  const keys = items.map((item) => {
    const value = item && typeof item === "object" ? item[field] : void 0;
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  });
  return keys.every(Boolean) ? keys : null;
}
function packSlotsFromManifest(slots, props) {
  if (!slots)
    return void 0;
  if (!slots.length)
    return { fixed: [], families: [], rows: [] };
  const names = slots.map((slot) => slot.name);
  const families = [];
  const claimed = /* @__PURE__ */ new Set();
  const prefixes = [...new Set(names.flatMap((name) => /^([A-Za-z0-9]+)_./.exec(name)?.[1] ?? []))];
  for (const prefix of prefixes) {
    const listed = names.filter((name) => name.startsWith(`${prefix}_`));
    const family = (props ?? []).flatMap((prop) => {
      if (!Array.isArray(prop.default) || !prop.default.length)
        return [];
      return KEY_FIELDS.flatMap((field) => {
        const keys = keysOf(prop.default, field);
        const drawn = keys ? new Set(slotNames(prefix, keys)) : void 0;
        return drawn && listed.every((name) => drawn.has(name)) ? [{ prefix, itemsProp: prop.name, keyField: field, defaultItems: prop.default }] : [];
      });
    })[0];
    if (!family)
      continue;
    families.push(family);
    listed.forEach((name) => claimed.add(name));
  }
  return {
    fixed: names.filter((name) => !claimed.has(name)),
    families,
    rows: slots.filter((slot) => slot.kind === "rows").map((slot) => slot.name)
  };
}
function describePackSlots(slots) {
  if (!slots)
    return void 0;
  const parts = [
    ...slots.fixed.map((name) => slots.rows.includes(name) ? `${name} (drawn once per item; its children read {{listItem}})` : name),
    ...slots.families.map((family) => {
      const sample = slotNames(family.prefix, keysOf(family.defaultItems, family.keyField) ?? []);
      return `${family.prefix}_<${family.keyField} of each ${family.itemsProp} item>${sample.length ? ` (by default ${sample.join(", ")})` : ""}`;
    })
  ];
  return parts.length ? `Child components go in slot_name ${parts.join(", ")}.` : void 0;
}
function packSlotsOfType(type) {
  if (typeof type !== "string" || !type.startsWith("Lib_"))
    return void 0;
  return getComponentSchema(type)?.pack?.slotInfo;
}
function itemsOf(properties, key3) {
  const entry = properties?.[key3];
  if (entry === void 0)
    return void 0;
  const raw = entry && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry.value : entry;
  if (raw === void 0 || raw === null || raw === "")
    return void 0;
  if (Array.isArray(raw))
    return raw;
  if (typeof raw !== "string")
    return [];
  const body = /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(raw)?.[1]?.trim() ?? (raw.trim().startsWith("[") ? raw : void 0);
  if (body === void 0)
    return raw.includes("{{") ? null : [];
  try {
    const value = import_json5.default.parse(body.replace(/^\(([\s\S]*)\)$/, "$1"));
    return Array.isArray(value) ? value : [];
  } catch {
    return null;
  }
}
function widgetSlots(component, { propertiesKnown = true } = {}) {
  const slots = packSlotsOfType(component.type);
  if (!slots)
    return void 0;
  const known = [...slots.fixed];
  const open = [];
  for (const family of slots.families) {
    const items = propertiesKnown ? itemsOf(component.properties, family.itemsProp) : null;
    const keys = items === null ? null : keysOf(items ?? family.defaultItems, family.keyField);
    if (keys)
      known.push(...slotNames(family.prefix, keys));
    else
      open.push({ prefix: family.prefix, itemsProp: family.itemsProp });
  }
  return { known, open };
}
function resolvePackSlot(parent, slotName, child, options = {}) {
  const slots = widgetSlots(parent, options);
  if (!slots)
    return { ok: true, slotName };
  const listed = [...slots.known, ...slots.open.map((family) => `${family.prefix}_<key of each ${family.itemsProp} item>`)];
  const where = `${String(parent.type)} "${parent.name ?? parent.id ?? "?"}"`;
  if (!listed.length) {
    return {
      ok: false,
      error: `Component "${child}": ${where} draws no child components, so a component inside it is saved and never shown. Place it beside the widget, or inside a container (a Card or FlexContainer).`
    };
  }
  if (slotName === void 0) {
    if (slots.known.includes("body"))
      return { ok: true, slotName: "body" };
    if (slots.known.length === 1 && !slots.open.length)
      return { ok: true, slotName: slots.known[0] };
    return {
      ok: false,
      error: `Component "${child}": ${where} draws its children in named slots; set slot_name to one of ${listed.join(", ")}. Without one the component is saved on a canvas the widget does not draw, and never shown.`
    };
  }
  if (slots.known.includes(slotName))
    return { ok: true, slotName };
  if (slots.open.some((family) => slotName.startsWith(`${family.prefix}_`) && slotName.length > family.prefix.length + 1)) {
    return { ok: true, slotName };
  }
  return {
    ok: false,
    error: `Component "${child}": ${where} has no slot "${slotName}" (its slots: ${listed.join(", ")}), so the component would be saved and never shown. Use one of those slots, or add the item it should go in to the widget first.`
  };
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
export {
  verifyLibrarySelection as $,
  lintEmptyDateWrites as A,
  BARE_QUERY_DATA_BINDING as B,
  lintUntriggeredDataQueries as C,
  lintAutomaticWrites as D,
  packRowSlotNames as E,
  parseHtml as F,
  stripHtmlBindings as G,
  packSlotNames as H,
  activePackSet as I,
  registerComponentSchemas as J,
  registerLibraryPacks as K,
  packSlotsFromManifest as L,
  describePackSlots as M,
  suggestedHtmlHeight as N,
  componentLibraryChoices as O,
  downgradeFlexForLibrary as P,
  resolveComponentLibrary as Q,
  toLibraryComponent as R,
  missingLibraryPins as S,
  libraryTypeOf as T,
  savedComponentLibrary as U,
  checkedLibrarySelection as V,
  COMPONENT_PACK_DESCRIPTION as W,
  componentLibraryWarnings as X,
  unpinnedLibraries as Y,
  inPackSet as Z,
  newPackSet as _,
  require_lib as a,
  readCatalogBytes as a0,
  allComponentSchemas as a1,
  packSlotOnOwnId as b,
  lintOversizedWidths as c,
  lintHtmlContentHeight as d,
  emptyLibraryHostError as e,
  lintHtmlRootSurface as f,
  lintUnguardedComponentRefs as g,
  lintEmbeddedBindingSyntax as h,
  internalComponentTypeNote as i,
  lintChartDataShape as j,
  lintUnguardedSelectionText as k,
  lintSelectedRowProjections as l,
  isLibraryPackType as m,
  resolvePackSlot as n,
  getComponentSchema as o,
  packSlotsOfType as p,
  getCatalog as q,
  readCatalog as r,
  surfaceAroundResolver as s,
  defaultPack as t,
  serverLibraryPacks as u,
  getLegacyComponentReplacement as v,
  retiredUi2Name as w,
  lintTextFormat as x,
  lintTableColumnsShape as y,
  lintComponentStateBindings as z
};
