import { createRequire } from "node:module";
import { C as COMPONENT_FX_UPDATE_GUIDANCE } from "./chunk-D0rVi1EZ.js";
import { S as STYLE_KEYS_IN_PROPERTIES, P as PROPERTY_KEY_ALIASES, n as nearestCatalogKey, c as componentSlotSchema, a as componentNameSchema, b as componentNameError, d as decodeComponentParent, e as encodeComponentParent, s as suggestedHtmlHeight, i as introducedLintFindings, l as lintComponentSpec, f as lintComponentSlots, g as lintUnusableTextGeometry, h as lintStandardSingleLineInputHeight, j as lintTextGeometry, k as lintRenderedGeometry, m as lintKanbanInteractions, o as assertPageIcon } from "./chunk-DKzM5TGJ.js";
import { S as getComponentSchema, Z as assertPersistableQueryToggles, _ as normalizeQueryOptions, a0 as validateQueryOptions, a1 as issueMessages } from "./chunk-C8mwOWJa.js";
import { e as external_exports } from "./chunk-Dx0NqId0.js";
import { randomUUID, createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { g as getDatasourceQuerySchema, s as singleSpecRef, b as SPEC_DISCOVERY_METHODS, c as hubspotSpecs, e as extractSpec, l as loadKindSpec, d as listEndpoints, f as specHost, r as rankEndpoints, i as endpointTagCounts, j as endpointParameters } from "./chunk-CWXC6H5y.js";
import { Script } from "node:vm";
createRequire(import.meta.url);
function resolveRef(candidates, ref2, kind, scope, describe = (candidate) => `${candidate.name ?? "(unnamed)"}=${candidate.id}`) {
  const byId = candidates.find((candidate) => candidate.id === ref2);
  if (byId)
    return { ok: true, target: byId };
  const byName = candidates.filter((candidate) => candidate.name === ref2);
  if (byName.length === 1)
    return { ok: true, target: byName[0] };
  if (byName.length > 1) {
    return {
      ok: false,
      error: `${kind} name "${ref2}" is ambiguous ${scope} (${byName.length} share it). Pass the id instead: ${byName.map((candidate) => candidate.id).join(", ")}.`
    };
  }
  const available = candidates.map(describe).join(", ");
  return {
    ok: false,
    // The "do not re-read" clause matters: the previous phrasing ("does not exist") invited exactly
    // the re-read that caused the loop.
    error: `No ${kind.toLowerCase()} with id or name "${ref2}" ${scope}. Do not re-read \u2014 it currently holds: ${available || "(none)"}.`
  };
}
function separateAdjacentClosingBraces(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (!text.startsWith("{{", i)) {
      out += text[i];
      i += 1;
      continue;
    }
    let j = i + 2;
    let depth = 0;
    let quote = null;
    let expr = "";
    let terminated = false;
    while (j < n) {
      const c = text[j];
      if (quote) {
        expr += c;
        if (c === "\\" && j + 1 < n) {
          expr += text[j + 1];
          j += 2;
          continue;
        }
        if (c === quote)
          quote = null;
        j += 1;
        continue;
      }
      if (c === "'" || c === '"' || c === "`") {
        quote = c;
        expr += c;
        j += 1;
        continue;
      }
      if (c === "{") {
        depth += 1;
        expr += c;
        j += 1;
        continue;
      }
      if (c === "}") {
        if (depth === 0 && text[j + 1] === "}") {
          terminated = true;
          break;
        }
        depth = Math.max(depth - 1, 0);
        expr += c;
        if (text[j + 1] === "}")
          expr += " ";
        j += 1;
        continue;
      }
      expr += c;
      j += 1;
    }
    if (!terminated) {
      out += text.slice(i);
      break;
    }
    out += `{{${expr}}}`;
    i = j + 2;
  }
  return out;
}
function separateAdjacentClosingBracesDeep(value) {
  if (typeof value === "string") {
    if (!value.includes("{{"))
      return { value, changed: false };
    const fixed = separateAdjacentClosingBraces(value);
    return { value: fixed, changed: fixed !== value };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      next[key] = result.value;
    }
    return { value: changed ? next : value, changed };
  }
  return { value, changed: false };
}
function normalizeSection(section) {
  if (!section)
    return { value: void 0, patch: void 0 };
  const value = {};
  const patch = {};
  for (const [key, entry] of Object.entries(section)) {
    const canonical2 = entry !== null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry : { value: entry };
    value[key] = canonical2;
    if (canonical2 !== entry)
      patch[key] = canonical2;
  }
  return {
    value,
    patch: Object.keys(patch).length ? patch : void 0
  };
}
function propValue(properties, key) {
  const entry = properties[key];
  return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
}
function isTruthy(value) {
  if (value === true || value === 1)
    return true;
  if (typeof value !== "string")
    return false;
  const compact = value.replace(/\s+/g, "").toLowerCase();
  return compact === "true" || compact === "{{true}}" || compact === "1" || compact === "{{1}}";
}
function catalogDefault(type, key, fallback) {
  return getComponentSchema(type)?.properties.find((property) => property.key === key)?.default ?? fallback;
}
var CLIENT_SERVER_BOOLEAN_KEYS = /* @__PURE__ */ new Set([
  "serverSidePagination",
  "serverSideSearch",
  "serverSideSort",
  "serverSideFilter"
]);
var STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS = 24;
function isStrippableUnknownKey(type, section, key, knownKeys) {
  if (knownKeys.includes(key))
    return false;
  if (type === "DropdownV2" && section === "properties" && ["value", "defaultValue"].includes(key))
    return false;
  if (section === "properties" && STYLE_KEYS_IN_PROPERTIES.has(key))
    return false;
  const aliasTarget = PROPERTY_KEY_ALIASES[key.toLowerCase()];
  if (aliasTarget && (knownKeys.includes(aliasTarget) || STYLE_KEYS_IN_PROPERTIES.has(aliasTarget)))
    return false;
  if (nearestCatalogKey(key, knownKeys))
    return false;
  return true;
}
function normalizeComponentSpec(component, options = {}) {
  const normalizedSections = Object.fromEntries(["properties", "styles", "validation", "others"].map((section) => [
    section,
    normalizeSection(component[section])
  ]));
  const properties = { ...normalizedSections.properties.value ?? {} };
  const propertyPatch = {};
  const stylePatch = {};
  const warnings = [];
  const setProperty = (key, value) => {
    const current = properties[key];
    const wrapped = current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
  };
  const stylesValue = normalizedSections.styles.value ?? {};
  let stylesChanged = false;
  const setStyle = (key, value) => {
    const current = stylesValue[key];
    stylesValue[key] = current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value };
    stylePatch[key] = stylesValue[key];
    normalizedSections.styles.value = stylesValue;
  };
  const schema = getComponentSchema(component.type);
  const knownPropertyKeys = schema ? new Set(schema.properties.map((entry) => entry.key)) : void 0;
  const knownStyleKeys = schema ? new Set(schema.styles.map((entry) => entry.key)) : void 0;
  const aliasTargetFor = (key) => {
    if (knownPropertyKeys?.has(key))
      return void 0;
    const target = PROPERTY_KEY_ALIASES[key.toLowerCase()];
    if (!target)
      return void 0;
    if (!schema)
      return target;
    return knownStyleKeys.has(target) || knownPropertyKeys.has(target) ? target : void 0;
  };
  for (const key of Object.keys(properties)) {
    const aliasTarget = aliasTargetFor(key);
    const canonical2 = aliasTarget ?? key;
    const belongsInStyles = canonical2 !== "styles" && (STYLE_KEYS_IN_PROPERTIES.has(canonical2) || !!aliasTarget && !!knownStyleKeys?.has(canonical2) && !knownPropertyKeys?.has(canonical2));
    if (!aliasTarget && !belongsInStyles)
      continue;
    if (belongsInStyles) {
      if (stylesValue[canonical2] === void 0)
        stylesValue[canonical2] = properties[key];
      delete properties[key];
      stylesChanged = true;
      warnings.push(`${component.type} "${component.name}": moved ${aliasTarget ? `alias "${key}"` : `style key "${key}"`} to styles.${canonical2} (ToolJet reads it from styles, not properties).`);
    } else if (canonical2 !== key) {
      if (properties[canonical2] === void 0)
        properties[canonical2] = properties[key];
      delete properties[key];
      warnings.push(`${component.type} "${component.name}": renamed alias "${key}" to "${canonical2}".`);
    }
  }
  if (stylesChanged)
    normalizedSections.styles.value = stylesValue;
  if (options.stripUnknownKeys && component.type === "NumberInput") {
    for (const key of ["minValue", "maxValue"]) {
      const value = propValue(properties, key);
      if (value == null || typeof value === "string" && !value.trim())
        continue;
      const validation = normalizedSections.validation.value ?? {};
      const current = propValue(validation, key);
      if (validation[key] !== void 0 && current !== value)
        continue;
      validation[key] = properties[key];
      normalizedSections.validation.value = validation;
      normalizedSections.validation.patch = { ...normalizedSections.validation.patch, [key]: validation[key] };
      delete properties[key];
      warnings.push(`NumberInput "${component.name}": moved properties.${key} to validation.${key}, where the renderer reads the bound.`);
    }
  }
  for (const key of CLIENT_SERVER_BOOLEAN_KEYS) {
    const current = propValue(properties, key);
    if (current !== "clientSide" && current !== "serverSide")
      continue;
    setProperty(key, current === "serverSide");
    warnings.push(`${component.name} "${key}": normalized ${JSON.stringify(current)} to a boolean ToolJet binding.`);
  }
  if (component.type === "Table") {
    if (properties.useDynamicColumn === void 0) {
      setProperty("useDynamicColumn", catalogDefault("Table", "useDynamicColumn", "{{false}}"));
    }
    if (properties.columnData === void 0) {
      setProperty("columnData", catalogDefault("Table", "columnData", "{{[{name: 'email', key: 'email', id: '1'}, {name: 'Full name', key: 'name', id: '2', isEditable: true}]}}"));
    }
    const columns = propValue(properties, "columns");
    const dynamicColumns = isTruthy(propValue(properties, "useDynamicColumn"));
    const autogenerateColumns = propValue(properties, "autogenerateColumns");
    if (options.stripUnknownKeys && columns === void 0 && !dynamicColumns && isTruthy(autogenerateColumns) && typeof propValue(properties, "data") === "string" && /\bqueries(?:\.|\[)/.test(String(propValue(properties, "data")))) {
      setProperty("columns", []);
    }
    if (Array.isArray(columns) && !dynamicColumns && !isTruthy(autogenerateColumns)) {
      setProperty("autogenerateColumns", true);
      if (autogenerateColumns !== void 0) {
        warnings.push(`Table "${component.name}": normalized autogenerateColumns from false to true for runtime compatibility. Some ToolJet Table versions crash while generating transformations for explicit static columns when it is false. Project the data binding to intended keys and declare behavior-only keys with columnVisibility:false.`);
      }
    }
    if (Array.isArray(columns)) {
      let changedColumns = false;
      const repairedColumns = columns.map((column) => {
        if (options.stripUnknownKeys && column && typeof column === "object" && !Array.isArray(column) && column.columnType === "button" && Array.isArray(column.buttons)) {
          const buttons = column.buttons.map((button) => {
            if (!button || typeof button !== "object" || Array.isArray(button))
              return button;
            const b = button;
            if (typeof b.label !== "string" || b.buttonLabel !== void 0)
              return button;
            const { label, ...rest } = b;
            changedColumns = true;
            warnings.push(`Table "${component.name}" action "${b.id}": moved label to buttonLabel, where the renderer reads the caption.`);
            return { ...rest, buttonLabel: label };
          });
          column = { ...column, buttons };
        }
        if (column && typeof column === "object" && !Array.isArray(column) && column.columnType === "datepicker" && column.isDateSelectionEnabled === false && column.isTimeChecked !== true) {
          changedColumns = true;
          const entry = column;
          warnings.push(`Table "${component.name}" date column "${entry.name ?? entry.key}": enabled date selection \u2014 a datepicker column with both date selection and time disabled renders blank regardless of the data.`);
          return { ...entry, isDateSelectionEnabled: true };
        }
        return column;
      });
      if (changedColumns)
        setProperty("columns", repairedColumns);
    }
  }
  if (component.type === "KeyValuePair") {
    const fields = propValue(properties, "fields");
    if (Array.isArray(fields) && fields.length > 0) {
      const explicitIds = new Set(fields.flatMap((field) => {
        const id = field && typeof field === "object" ? field.id : void 0;
        return typeof id === "string" && id.length > 0 ? [id] : [];
      }));
      const demoFields = catalogDefault("KeyValuePair", "fields", []);
      const currentHistory = propValue(properties, "fieldDeletionHistory");
      const deletionHistory = new Set(Array.isArray(currentHistory) ? currentHistory.filter((key) => typeof key === "string" && key.length > 0) : []);
      const before = deletionHistory.size;
      if (Array.isArray(demoFields)) {
        for (const field of demoFields) {
          if (!field || typeof field !== "object")
            continue;
          const { id, key } = field;
          if (typeof key === "string" && !explicitIds.has(String(id ?? "")))
            deletionHistory.add(key);
        }
      }
      if (deletionHistory.size > before || properties.fieldDeletionHistory === void 0) {
        setProperty("fieldDeletionHistory", [...deletionHistory]);
        warnings.push(`KeyValuePair "${component.name}": normalized fieldDeletionHistory so ToolJet does not append or positionally merge catalog demo fields into the explicit fields array.`);
      }
    }
  }
  if (component.type === "Statistics") {
    const width = (component.layouts?.desktop ?? component.layout)?.width;
    const iconName = propValue(properties, "icon");
    const iconVisible = typeof iconName === "string" && iconName.trim() !== "" && propValue(properties, "iconVisibility") !== false && propValue(properties, "iconVisibility") !== "{{false}}";
    const rawSize = propValue(stylesValue, "primaryValueSize") ?? propValue(properties, "primaryValueSize");
    const sizeText = typeof rawSize === "string" ? rawSize.replace(/[{}]/g, "").trim() : rawSize;
    const numericSize = typeof sizeText === "number" ? sizeText : typeof sizeText === "string" && /^\d+$/.test(sizeText) ? Number(sizeText) : void 0;
    const rawValue = propValue(properties, "primaryValue");
    const currencyValue = typeof rawValue === "string" && /minimumFractionDigits|style\s*:\s*['"]currency['"]|[$£€¥]/.test(rawValue);
    const widthKnown = typeof width === "number";
    const narrowTile = widthKnown && width < STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS;
    const clipProne = iconVisible && narrowTile || currencyValue && (narrowTile || !widthKnown);
    if (isTruthy(propValue(properties, "hideSecondary")) && (numericSize === void 0 || numericSize > 22) && clipProne) {
      setStyle("primaryValueSize", "{{22}}");
      warnings.push(`Statistics "${component.name}": set styles.primaryValueSize to 22 so the ${currencyValue ? "currency " : ""}value fits a value-only tile${widthKnown ? ` (${width} columns wide)` : ""} (larger sizes clip or wrap the value).`);
    }
  }
  if (options.stripUnknownKeys) {
    const schema2 = getComponentSchema(component.type);
    if (schema2) {
      const sections = [
        ["properties", properties],
        ["styles", normalizedSections.styles.value]
      ];
      for (const [section, sectionValue] of sections) {
        if (!sectionValue)
          continue;
        const knownKeys = (schema2[section] ?? []).map((entry) => entry.key);
        for (const key of Object.keys(sectionValue)) {
          if (!isStrippableUnknownKey(component.type, section, key, knownKeys))
            continue;
          delete sectionValue[key];
          warnings.push(`${component.type} "${component.name}": removed unknown ${section} key "${key}" \u2014 ToolJet ignores it, so it is kept out of the saved definition rather than persisted as an unusable key.`);
        }
      }
    }
  }
  const braceFixedKeys = [];
  for (const key of Object.keys(properties)) {
    const result = separateAdjacentClosingBracesDeep(propValue(properties, key));
    if (!result.changed)
      continue;
    setProperty(key, result.value);
    braceFixedKeys.push(`properties.${key}`);
  }
  for (const key of Object.keys(stylesValue)) {
    const result = separateAdjacentClosingBracesDeep(propValue(stylesValue, key));
    if (!result.changed)
      continue;
    setStyle(key, result.value);
    braceFixedKeys.push(`styles.${key}`);
  }
  if (braceFixedKeys.length) {
    warnings.push(`${component.type} "${component.name}": separated adjacent closing braces inside ${braceFixedKeys.join(", ")} (ToolJet ends a {{ }} expression at the first "}}", which would have left the component blank). Write nested closes as "} }" inside bindings.`);
  }
  const patch = Object.fromEntries(["properties", "styles", "validation", "others"].flatMap((section) => {
    const envelopePatch = normalizedSections[section].patch ?? {};
    const semanticPatch = section === "properties" ? propertyPatch : section === "styles" ? stylePatch : {};
    const merged = { ...envelopePatch, ...semanticPatch };
    return Object.keys(merged).length ? [[section, merged]] : [];
  }));
  return {
    component: {
      ...component,
      properties,
      ...normalizedSections.styles.value ? { styles: normalizedSections.styles.value } : {},
      ...normalizedSections.validation.value ? { validation: normalizedSections.validation.value } : {},
      ...normalizedSections.others.value ? { others: normalizedSections.others.value } : {}
    },
    patch,
    warnings
  };
}
createRequire(import.meta.url);
var TableQuotaError = class extends Error {
  code = "TJDB_TABLE_LIMIT_REACHED";
  status = 451;
  retryable = false;
  constructor() {
    super("The workspace has reached its ToolJet Database table limit. Stop creating tables. Ask the user to reuse existing tables, free table capacity, or increase the workspace allowance before continuing. Keep resources already created; do not delete tables automatically.");
    this.name = "TableQuotaError";
  }
};
function tableQuotaError(error) {
  const seen = /* @__PURE__ */ new Set();
  while (error instanceof Error && !seen.has(error)) {
    if (error instanceof TableQuotaError)
      return error;
    seen.add(error);
    error = error.cause;
  }
  return void 0;
}
createRequire(import.meta.url);
function ok(value) {
  return { content: [{ type: "text", text: JSON.stringify(value) }] };
}
function fail(err) {
  const message = err instanceof Error ? err.message : String(err);
  const quota = tableQuotaError(err);
  const text = quota ? JSON.stringify({ error: {
    code: quota.code,
    status: quota.status,
    retryable: quota.retryable,
    message: quota.message,
    details: message
  } }) : `Error: ${message}`;
  return { content: [{ type: "text", text }], isError: true };
}
createRequire(import.meta.url);
function strictEntry(shape, describeUnknown) {
  return external_exports.strictObject(shape, {
    error: (issue) => issue.code === "unrecognized_keys" ? issue.keys.map(describeUnknown).join(" ") : void 0
  });
}
function hasNonEmptyDefinition(definition2) {
  if (!definition2)
    return false;
  return Object.values(definition2).some((section) => section !== null && typeof section === "object" && Object.keys(section).length > 0);
}
createRequire(import.meta.url);
var DEFINITION_SECTIONS = ["properties", "styles", "validation", "general", "general_styles", "others"];
var definitionSchema = strictEntry({
  properties: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  validation: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  general: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  general_styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  others: external_exports.record(external_exports.string(), external_exports.any()).optional()
}, (key) => key === "layout" || key === "layouts" ? `definition."${key}" is not a component definition section; move/resize with update_layout instead.` : `definition."${key}" is not a component definition section; use one of ${DEFINITION_SECTIONS.join("/")}.`);
var updateSchema = strictEntry({
  component_id: external_exports.string(),
  definition: definitionSchema.optional(),
  name: componentNameSchema.optional(),
  parent: external_exports.string().optional(),
  slot_name: componentSlotSchema.optional()
}, (key) => {
  if (DEFINITION_SECTIONS.includes(key)) {
    return `Update entry key "${key}" must be nested under \`definition\` (e.g. { component_id, definition: { ${key}: {...} } }); top-level ${key} would write nothing.`;
  }
  if (key === "layout" || key === "layouts") {
    return `Update entry key "${key}" is not accepted by update_components; move/resize with update_layout instead.`;
  }
  return `Unknown update entry key "${key}"; accepted keys are component_id, definition, name, parent, slot_name.`;
});
function updateComponentsTool(client) {
  return {
    name: "update_components",
    title: "Update Components",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves under `definition` (properties/styles/validation/others) \u2014 ToolJet deep-merges, so untouched values are preserved. Leaves may be raw values or `{ value: ... }` envelopes; MCP canonicalizes them. " + COMPONENT_FX_UPDATE_GUIDANCE + "NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent/slot_name per entry, not both. `slot_name` accepts header/body/footer and can move a child between native ModalV2/Form/Container regions, or modal for Kanban card-click content; omit parent to keep the current parent. Unknown entry keys are rejected (a top-level properties/styles patch is an error, not a silent no-op), and an entry that changes nothing fails. Get component ids + current values from get_app_summary / get_component.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      updates: external_exports.array(updateSchema).min(1)
    },
    async handler(args) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page)
          return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const projected = new Map(page.components.map((component) => [component.id, component]));
        const warnings = [];
        const errors = [];
        const changedComponents = [];
        let placementChanged = false;
        const layoutFixes = [];
        const resolvedUpdates = [];
        for (const update of args.updates) {
          if (update.name !== void 0) {
            const nameError = componentNameError(update.name);
            if (nameError) {
              errors.push(`Component "${update.component_id}": ${nameError}`);
              continue;
            }
          }
          const resolution = resolveRef(page.components, update.component_id, "Component", `on page "${args.page_id}"`);
          if (!resolution.ok) {
            errors.push(resolution.error);
            continue;
          }
          if (resolution.warning)
            warnings.push(resolution.warning);
          const current = resolution.target;
          const componentId = current.id;
          if (update.definition && (update.name !== void 0 || update.parent !== void 0 || update.slot_name !== void 0)) {
            errors.push(`Component "${update.component_id}": set EITHER definition OR name/parent/slot_name in one entry.`);
            continue;
          }
          if (!hasNonEmptyDefinition(update.definition) && update.name === void 0 && update.parent === void 0 && update.slot_name === void 0) {
            errors.push(`Component "${update.component_id}": nothing to update. Send the changed leaves under definition (properties/styles/validation/others) or a name/parent/slot_name change.`);
            continue;
          }
          let parent = update.parent;
          let slotName = update.slot_name;
          if (slotName !== void 0) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : void 0;
            if (!parent) {
              if (slotName === "body") {
                warnings.push(`Component "${update.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`);
                slotName = void 0;
              } else {
                errors.push(`Component "${update.component_id}": slot_name:"${slotName}" requires an existing or explicit parent.`);
                continue;
              }
            }
          }
          const definition2 = update.definition;
          const next = {
            id: current.id,
            name: update.name ?? current.name ?? current.id,
            type: current.type,
            properties: { ...current.properties ?? {}, ...definition2?.properties ?? {} },
            styles: { ...current.styles ?? {}, ...definition2?.styles ?? {} },
            layouts: current.layouts,
            parent: parent !== void 0 ? encodeComponentParent(parent, slotName) : current.parent,
            slotName
          };
          const normalized2 = normalizeComponentSpec({
            name: next.name ?? current.id,
            type: next.type ?? current.type ?? "",
            properties: next.properties ?? {},
            styles: next.styles,
            validation: definition2?.validation,
            others: { ...current.others ?? {}, ...definition2?.others ?? {} },
            layouts: next.layouts,
            parent: next.parent
          });
          const normalizedNext = { ...normalized2.component, id: current.id };
          const heightFix = update.definition ? suggestedHtmlHeight(normalizedNext) : null;
          const desktopRect = current.layouts?.desktop;
          if (heightFix && desktopRect && typeof desktopRect.top === "number") {
            normalizedNext.layouts = { ...normalizedNext.layouts ?? {}, desktop: { ...desktopRect, height: heightFix.to } };
            layoutFixes.push({ componentId: current.id, desktop: { ...desktopRect, height: heightFix.to } });
            warnings.push(`Html "${normalizedNext.name ?? current.id}" needed about ${heightFix.needed}px for its new markup but was ${heightFix.from}px; its height is now ${heightFix.to}px. Anything within ${heightFix.to - heightFix.from}px below it now overlaps; move it down.`);
          }
          projected.set(current.id, normalizedNext);
          if (update.definition)
            changedComponents.push({ before: current, after: normalizedNext });
          placementChanged ||= update.parent !== void 0 || update.slot_name !== void 0;
          warnings.push(...onlyTouchedBraceNotes(normalized2.warnings, definition2));
          let normalizedDefinition = update.definition;
          if (update.definition && Object.keys(normalized2.patch).length) {
            normalizedDefinition = { ...update.definition };
            for (const section of ["properties", "styles", "validation", "others"]) {
              const sectionPatch = normalized2.patch[section];
              if (!sectionPatch)
                continue;
              normalizedDefinition[section] = {
                ...update.definition[section] ?? {},
                ...sectionPatch
              };
            }
          }
          resolvedUpdates.push({
            componentId,
            definition: normalizedDefinition,
            name: update.name,
            parent,
            slotName: update.slot_name
          });
          if (!update.definition)
            continue;
          errors.push(...introducedLintFindings(lintComponentSpec(current).errors, lintComponentSpec(normalizedNext).errors));
          warnings.push(...introducedLintFindings(lintComponentSpec(current).warnings, lintComponentSpec(normalizedNext).warnings));
        }
        const allComponents = [...projected.values()];
        const introducedForChanged = (lint2) => changedComponents.flatMap(({ before, after }) => introducedLintFindings(lint2([before]), lint2([after])));
        if (placementChanged) {
          errors.push(...introducedLintFindings(lintComponentSlots(page.components), lintComponentSlots(allComponents)));
        }
        errors.push(...introducedForChanged(lintUnusableTextGeometry));
        if (errors.length)
          return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
        warnings.push(...introducedForChanged((items) => items.flatMap(lintStandardSingleLineInputHeight)));
        warnings.push(...introducedForChanged(lintTextGeometry));
        warnings.push(...lintRenderedGeometry(allComponents));
        warnings.push(...lintKanbanInteractions(allComponents));
        const result = await client.updateComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          updates: resolvedUpdates
        });
        if (layoutFixes.length) {
          await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: args.page_id, layouts: layoutFixes });
        }
        return ok({ ...result, warnings: [...new Set(warnings)] });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function onlyTouchedBraceNotes(warnings, definition2) {
  const touched = /* @__PURE__ */ new Set([
    ...Object.keys(definition2?.properties ?? {}).map((key) => `properties.${key}`),
    ...Object.keys(definition2?.styles ?? {}).map((key) => `styles.${key}`)
  ]);
  return warnings.flatMap((warning) => {
    const m = /^(.*?: separated adjacent closing braces inside )(.+?)( \(ToolJet ends.*)$/s.exec(warning);
    if (!m)
      return [warning];
    const keys = m[2].split(", ").filter((key) => touched.has(key));
    return keys.length ? [`${m[1]}${keys.join(", ")}${m[3]}`] : [];
  });
}
createRequire(import.meta.url);
var ref = external_exports.string().min(1).max(100);
var base = { ref, existing_id: external_exports.string().uuid().optional(), label: external_exports.string().max(100).optional(), position: external_exports.object({ x: external_exports.number().finite(), y: external_exports.number().finite() }).optional() };
var query = { name: external_exports.string().regex(/^[A-Za-z_$][\w$]*$/), datasource_id: external_exports.string().min(1), options: external_exports.record(external_exports.string(), external_exports.unknown()) };
var agentModel = external_exports.object(query).strict();
var nodeSchema = external_exports.discriminatedUnion("type", [
  external_exports.object({ ...base, type: external_exports.literal("start") }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("javascript"), name: query.name, code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("query"), ...query }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("loop"), name: query.name, iteration_values_code: external_exports.string().min(1), code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("condition"), code: external_exports.string().min(1) }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("response"), code: external_exports.string().min(1), status_code: external_exports.number().int().min(100).max(599).optional() }).strict(),
  external_exports.object({ ...base, type: external_exports.literal("agent"), system_prompt: external_exports.string().optional(), user_prompt: external_exports.string().optional(), output_format: external_exports.record(external_exports.string(), external_exports.unknown()).nullable().optional(), model: agentModel.nullable().optional() }).strict()
]);
var specSchema = external_exports.object({
  schema_version: external_exports.literal(1).default(1),
  nodes: external_exports.array(nodeSchema).max(200).default([]),
  edges: external_exports.array(external_exports.object({ ref, existing_id: external_exports.string().optional(), from: ref, to: ref, port: external_exports.enum(["default", "success", "failure", "true", "false"]) }).strict()).max(500).default([]),
  remove_node_ids: external_exports.array(external_exports.string()).default([]),
  remove_edge_ids: external_exports.array(external_exports.string()).default([]),
  test_parameters: external_exports.record(external_exports.string(), external_exports.unknown()).optional()
}).strict();
function assertWorkflowJavaScript(code, label) {
  if (typeof code !== "string" || !code.trim())
    throw new Error(`Missing JavaScript code in ${label}.`);
  try {
    new Script(`(async function() {${code}
})`);
  } catch {
    throw new Error(`Invalid JavaScript syntax in ${label}.`);
  }
}
function isAttachmentEdge(edge) {
  return edge.targetHandle === "ai-model" || edge.targetHandle === "tool";
}
function controlFlowEdges(graph) {
  return graph.edges.filter((edge) => !isAttachmentEdge(edge));
}
function definition(value) {
  if (value == null)
    return { nodes: [], edges: [], queries: [] };
  const parsed = external_exports.object({
    nodes: external_exports.array(external_exports.object({ id: external_exports.string(), type: external_exports.string(), data: external_exports.record(external_exports.string(), external_exports.unknown()) }).passthrough()).default([]),
    edges: external_exports.array(external_exports.object({ id: external_exports.string(), source: external_exports.string(), target: external_exports.string(), sourceHandle: external_exports.string().nullable().optional(), targetHandle: external_exports.string().nullable().optional(), data: external_exports.record(external_exports.string(), external_exports.unknown()).optional() }).passthrough()).default([]),
    queries: external_exports.array(external_exports.object({ id: external_exports.string(), idOnDefinition: external_exports.string() }).passthrough()).default([])
  }).passthrough().parse(value);
  return structuredClone(parsed);
}
function validateGraph(graph, queryIds) {
  const errors = [], warnings = [];
  const error = (code, path, message) => errors.push({ code, path, message });
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (nodes.size !== graph.nodes.length)
    error("duplicate_node", "nodes", "Node IDs must be unique.");
  if (new Set(graph.edges.map((e) => e.id)).size !== graph.edges.length)
    error("duplicate_edge", "edges", "Edge IDs must be unique.");
  const starts = graph.nodes.filter((n) => n.type === "input" && n.data.nodeType === "start");
  if (starts.length !== 1)
    error("start_count", "nodes", "Exactly one start node is required.");
  const mappings = new Map(graph.queries.map((q) => [q.idOnDefinition, q.id]));
  if (mappings.size !== graph.queries.length)
    error("duplicate_mapping", "queries", "Query definition IDs must be unique.");
  for (const mapping of graph.queries)
    if (queryIds && !queryIds.has(mapping.id))
      error("missing_query", "queries", `Query ${mapping.id} does not belong to this version.`);
  for (const n of graph.nodes) {
    if (n.type === "query" && !mappings.has(String(n.data.idOnDefinition)))
      error("missing_mapping", `nodes.${n.id}`, "Query node has no query mapping.");
    if (!["input", "query", "if-condition", "output", "agent"].includes(n.type))
      warnings.push({ code: "unsupported_node", path: `nodes.${n.id}`, message: `Retained ${n.type} node; configuration not validated.` });
  }
  const flowEdges = controlFlowEdges(graph);
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source), target = nodes.get(edge.target), path = `edges.${edge.id}`;
    if (!source || !target) {
      error("missing_endpoint", path, "Edge endpoint does not exist.");
      continue;
    }
    if (isAttachmentEdge(edge)) {
      if (edge.targetHandle === "ai-model" && !(source.type === "query" && source.data.isChildOfAgent === true && source.data.agentConnectionType === "ai-model" && target.type === "agent")) {
        error("invalid_attachment", path, "AI model attachment must connect an Agent model query child to an Agent.");
      }
      continue;
    }
    if (target.type === "input")
      error("start_inbound", path, "Start cannot have inbound edges.");
    const ports = { input: [null, void 0], query: ["success", "failure"], "if-condition": ["true", "false"], output: [], agent: ["output"] };
    if (ports[source.type] && !ports[source.type].includes(edge.sourceHandle))
      error("invalid_port", path, `Invalid source port for ${source.type}.`);
    if (source.type === "query" && edge.sourceHandle === "failure" && !source.data.errorHandler)
      error("error_handler_disabled", path, "Failure edge requires query error handling.");
  }
  for (const agent of graph.nodes.filter((node) => node.type === "agent")) {
    if (graph.edges.filter((edge) => edge.target === agent.id && edge.targetHandle === "ai-model").length > 1) {
      error("duplicate_agent_model", `nodes.${agent.id}.model`, "Agent can have only one AI model attachment.");
    }
  }
  const adjacency = new Map(graph.nodes.map((n) => [n.id, flowEdges.filter((e) => e.source === n.id).map((e) => e.target)]));
  const visited = /* @__PURE__ */ new Set(), active = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (active.has(id))
      return true;
    if (visited.has(id))
      return false;
    visited.add(id);
    active.add(id);
    const cyclic = (adjacency.get(id) ?? []).some(visit);
    active.delete(id);
    return cyclic;
  };
  if (graph.nodes.some((n) => visit(n.id)))
    error("cycle", "edges", "Cycles are unsupported in the basic node set.");
  const reachable = /* @__PURE__ */ new Set();
  const reach = (id) => {
    if (reachable.has(id))
      return;
    reachable.add(id);
    (adjacency.get(id) ?? []).forEach(reach);
  };
  starts.forEach((n) => reach(n.id));
  for (const n of graph.nodes)
    if (!reachable.has(n.id) && n.data.isChildOfAgent !== true)
      warnings.push({ code: "unreachable", path: `nodes.${n.id}`, message: "Node is unreachable from start." });
  return { errors, warnings, runtime_verified: false };
}
function compileGraph(current, spec, ids, datasourceKinds = /* @__PURE__ */ new Map()) {
  const graph = structuredClone(current);
  const node_ids = /* @__PURE__ */ Object.create(null), edge_ids = /* @__PURE__ */ Object.create(null);
  const model_ids = /* @__PURE__ */ Object.create(null);
  const query_nodes = [];
  const checkUnique = (refs) => {
    if (new Set(refs).size !== refs.length)
      throw new Error("Duplicate logical refs.");
  };
  checkUnique(spec.nodes.map((n) => n.ref));
  checkUnique(spec.edges.map((e) => e.ref));
  for (const id of spec.remove_node_ids)
    if (!graph.nodes.some((n) => n.id === id))
      throw new Error(`Unknown node to remove: ${id}`);
  for (const id of spec.remove_edge_ids)
    if (!graph.edges.some((e) => e.id === id))
      throw new Error(`Unknown edge to remove: ${id}`);
  const removedNodeIds = new Set(spec.remove_node_ids);
  const cascadedChildIds = /* @__PURE__ */ new Set();
  for (const agentId of spec.remove_node_ids) {
    for (const edge of graph.edges.filter((candidate) => candidate.target === agentId && candidate.targetHandle === "ai-model")) {
      removedNodeIds.add(edge.source);
      cascadedChildIds.add(edge.source);
    }
  }
  const removedDefinitionIds = graph.nodes.filter((n) => removedNodeIds.has(n.id)).map((n) => n.data.idOnDefinition);
  graph.nodes = graph.nodes.filter((n) => !removedNodeIds.has(n.id));
  graph.edges = graph.edges.filter((e) => !spec.remove_edge_ids.includes(e.id) && !cascadedChildIds.has(e.source) && !cascadedChildIds.has(e.target));
  const editedIds = /* @__PURE__ */ new Set();
  for (const input of spec.nodes) {
    if ("code" in input) {
      try {
        new Script(input.type === "condition" ? `(${input.code})` : `(async function() {${input.code}
})`);
      } catch {
        throw new Error(`Invalid JavaScript syntax in node ${input.ref}.`);
      }
    }
    if (input.type === "loop") {
      try {
        new Script(`(async function() {${input.iteration_values_code}
})`);
      } catch {
        throw new Error(`Invalid iteration JavaScript syntax in node ${input.ref}.`);
      }
    }
    const id = input.existing_id ?? ids?.node_ids[input.ref] ?? randomUUID();
    if (editedIds.has(id))
      throw new Error("Multiple node edits target the same ID.");
    editedIds.add(id);
    const old = graph.nodes.find((n) => n.id === id);
    if (input.existing_id && !old)
      throw new Error(`Unknown existing node: ${id}`);
    const type = { start: "input", javascript: "query", query: "query", loop: "query", condition: "if-condition", response: "output", agent: "agent" }[input.type];
    if (old && old.type !== type)
      throw new Error("Changing node type is unsupported; remove and add explicitly.");
    const data = { ...old?.data, label: input.label ?? old?.data.label ?? input.ref };
    if (input.type !== "condition")
      data.nodeType = input.type === "javascript" || input.type === "loop" ? "query" : input.type;
    if (input.type === "condition" || input.type === "response")
      data.code = input.code;
    if (input.type === "response" && (input.status_code !== void 0 || data.statusCode === void 0)) {
      data.statusCode = { fxActive: false, value: String(input.status_code ?? 200) };
    }
    if (input.type === "loop") {
      data.looped = true;
      data.iterationValuesCode = input.iteration_values_code;
    }
    if (input.type === "agent") {
      const oldOptions = old?.data.options && typeof old.data.options === "object" && !Array.isArray(old.data.options) ? old.data.options : {};
      data.nodeName = old?.data.nodeName ?? input.ref;
      data.options = {
        ...oldOptions,
        systemPrompt: input.system_prompt ?? oldOptions.systemPrompt ?? "",
        userPrompt: input.user_prompt ?? oldOptions.userPrompt ?? "",
        outputFormat: input.output_format === void 0 ? oldOptions.outputFormat ?? null : input.output_format === null ? null : { example: input.output_format }
      };
      const attachments = graph.edges.filter((edge) => edge.target === id && edge.targetHandle === "ai-model");
      if (attachments.length > 1)
        throw new Error(`Agent ${input.ref} has multiple AI model attachments.`);
      const attachment = attachments[0];
      const child = attachment && graph.nodes.find((node2) => node2.id === attachment.source);
      if (input.model === null && attachment) {
        if (typeof child?.data.idOnDefinition === "string")
          removedDefinitionIds.push(child.data.idOnDefinition);
        graph.edges = graph.edges.filter((edge) => edge.id !== attachment.id);
        graph.nodes = graph.nodes.filter((node2) => node2.id !== attachment.source);
      } else if (input.model) {
        const modelNodeId = child?.id ?? ids?.model_ids[input.ref]?.node_id ?? randomUUID();
        const definitionId = typeof child?.data.idOnDefinition === "string" ? child.data.idOnDefinition : randomUUID();
        const kind = datasourceKinds.get(input.model.datasource_id);
        const modelNode = {
          ...child,
          id: modelNodeId,
          type: "query",
          sourcePosition: "right",
          targetPosition: "left",
          deletable: false,
          data: { ...child?.data, idOnDefinition: definitionId, nodeType: "query", kind, isChildOfAgent: true, agentConnectionType: "ai-model" },
          position: child?.position ?? { x: 100, y: 70 }
        };
        if (child)
          graph.nodes[graph.nodes.indexOf(child)] = modelNode;
        else
          graph.nodes.push(modelNode);
        const edgeId = attachment?.id ?? ids?.model_ids[input.ref]?.edge_id ?? randomUUID();
        const modelEdge = { ...attachment, id: edgeId, source: modelNodeId, target: id, sourceHandle: "output", targetHandle: "ai-model", type: "custom", data: { direction: "vertical" } };
        if (attachment)
          graph.edges[graph.edges.indexOf(attachment)] = modelEdge;
        else
          graph.edges.push(modelEdge);
        model_ids[input.ref] = { node_id: modelNodeId, edge_id: edgeId };
        query_nodes.push({ role: "agent-model", parent_agent_id: id, node_id: modelNodeId, definition_id: definitionId, datasource_id: input.model.datasource_id, name: input.model.name, options: input.model.options });
      }
    }
    if (input.type === "query" || input.type === "javascript" || input.type === "loop") {
      const definitionId = typeof data.idOnDefinition === "string" ? data.idOnDefinition : randomUUID();
      data.idOnDefinition = definitionId;
      query_nodes.push({ role: "workflow-node", spec: input, node_id: id, definition_id: definitionId });
    }
    const node = { ...old, id, type, sourcePosition: "right", targetPosition: "left", deletable: false, data, position: input.position ?? old?.position ?? { x: 100 + graph.nodes.length * 320, y: 250 } };
    if (old)
      graph.nodes[graph.nodes.indexOf(old)] = node;
    else
      graph.nodes.push(node);
    node_ids[input.ref] = id;
  }
  const resolve = (ref2) => node_ids[ref2] ?? (graph.nodes.some((n) => n.id === ref2) ? ref2 : void 0);
  const editedEdges = /* @__PURE__ */ new Set();
  for (const input of spec.edges) {
    const id = input.existing_id ?? ids?.edge_ids[input.ref] ?? randomUUID();
    if (editedEdges.has(id))
      throw new Error("Multiple edge edits target the same ID.");
    editedEdges.add(id);
    const old = graph.edges.find((e) => e.id === id);
    if (input.existing_id && !old)
      throw new Error(`Unknown existing edge: ${id}`);
    const source = resolve(input.from), target = resolve(input.to);
    if (!source || !target)
      throw new Error(`Unknown endpoint in edge ${input.ref}. Use a supplied ref or existing node ID.`);
    const sourceNode = graph.nodes.find((node) => node.id === source);
    const sourceHandle = input.port === "default" ? sourceNode?.type === "agent" ? "output" : null : input.port;
    const edge = { ...old, id, source, target, sourceHandle, type: "custom" };
    if (old)
      graph.edges[graph.edges.indexOf(old)] = edge;
    else
      graph.edges.push(edge);
    edge_ids[input.ref] = id;
    if (input.port === "failure") {
      const n = graph.nodes.find((n2) => n2.id === source);
      if (n.type === "query")
        n.data.errorHandler = true;
    }
  }
  graph.queries = graph.queries.filter((q) => !removedDefinitionIds.includes(q.idOnDefinition) || graph.nodes.some((n) => n.data.idOnDefinition === q.idOnDefinition));
  const depths = new Map(graph.nodes.map((n) => [n.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of controlFlowEdges(graph)) {
      const next = (depths.get(edge.source) ?? 0) + 1;
      if (next > (depths.get(edge.target) ?? 0)) {
        depths.set(edge.target, next);
        changed = true;
      }
    }
    if (!changed)
      break;
  }
  const placed = graph.nodes.filter((n) => current.nodes.some((old) => old.id === n.id) || spec.nodes.some((input) => node_ids[input.ref] === n.id && input.position));
  for (const n of graph.nodes.filter((n2) => !placed.includes(n2))) {
    const x = 100 + (depths.get(n.id) ?? 0) * 320;
    let y = 250;
    while (placed.some((other) => other.position && Math.abs(other.position.x - x) < 300 && Math.abs(other.position.y - y) < 160))
      y += 180;
    n.position = { x, y };
    placed.push(n);
  }
  if (spec.test_parameters !== void 0)
    graph.defaultParams = JSON.stringify(spec.test_parameters);
  return { graph, node_ids, edge_ids, model_ids, query_nodes };
}
var nodeCatalog = {
  schema_version: 1,
  runtime_context: {
    inputs: "Read workflow inputs from startTrigger.params, for example startTrigger.params.left. A logical start-node ref does not create a JavaScript global.",
    query_results: "Read a preceding query result as <persisted_query_name>.data, for example computeSum.data. There is no app-style queries namespace in workflow code.",
    code: "JavaScript, condition and response code runs in a server-side function body. Return the result explicitly. Read only preceding nodes on the current execution path.",
    example: {
      query_name: "computeSum",
      javascript: "return { sum: Number(startTrigger.params.left) + Number(startTrigger.params.right) };",
      response: "return computeSum.data;"
    }
  },
  nodes: [
    { type: "start", renderer: "input", ports: ["default"] },
    { type: "javascript", renderer: "query", ports: ["success", "failure"], fields: ["name", "code"] },
    { type: "query", renderer: "query", ports: ["success", "failure"], fields: ["name", "datasource_id", "options"] },
    { type: "loop", renderer: "query", ports: ["success", "failure"], fields: ["name", "iteration_values_code", "code"] },
    { type: "condition", renderer: "if-condition", ports: ["true", "false"], fields: ["code"] },
    { type: "response", renderer: "output", ports: [], fields: ["code", "status_code"] },
    { type: "agent", renderer: "agent", ports: ["default"], fields: ["system_prompt", "user_prompt", "output_format", "model"] }
  ],
  edit_semantics: "Patch. Use existing_id to edit nodes/edges; edge endpoints may use existing node IDs. Omitted objects are preserved. Removal requires explicit IDs and incident edge removal.",
  limitations: ["Agent tool connections are not authored", "No publishing or trigger setup", "No concurrent-edit protection", "No automatic execution during authoring", "Advanced nodes are preserved but not authored"]
};
createRequire(import.meta.url);
var SAMPLE_DATASOURCE_REFUSAL = "Sample data source is unavailable to AI. Do not inspect, test, read, write, or create queries on it. Use ToolJet Database for new app data, or another connected user-owned datasource.";
function isSampleDatasource(source) {
  return String(source.type ?? "").trim().toLowerCase() === "sample" || String(source.name ?? "").toLowerCase().replace(/[\s_-]+/g, "") === "sampledatasource";
}
function assertAiDatasource(source) {
  if (isSampleDatasource(source))
    throw new Error(SAMPLE_DATASOURCE_REFUSAL);
}
function createAppVersionLifecycle(auth, getApp) {
  const enc = encodeURIComponent;
  async function request(path, method = "GET", body) {
    const response = await auth.authedFetch(path, method === "GET" ? void 0 : {
      method,
      headers: { "Content-Type": "application/json" },
      ...body === void 0 ? {} : { body: JSON.stringify(body) }
    });
    if (!response.ok)
      throw new Error(`App version ${method} failed (${response.status}): ${await response.text()}`);
    return response;
  }
  function normalize(raw) {
    if (typeof raw.id !== "string" || typeof raw.name !== "string")
      throw new Error("Invalid version metadata.");
    const environmentId = raw.current_environment_id ?? raw.currentEnvironmentId;
    return {
      id: raw.id,
      name: raw.name,
      ...typeof raw.description === "string" || raw.description === null ? { description: raw.description } : {},
      ...typeof raw.status === "string" ? { status: raw.status } : {},
      ...typeof environmentId === "string" ? { environmentId } : {}
    };
  }
  async function versions(appId) {
    const data = await (await request(`/api/apps/${enc(appId)}/versions`)).json();
    if (!Array.isArray(data.versions))
      throw new Error("Missing app version inventory.");
    return data.versions.map(normalize);
  }
  async function version(appId, versionId) {
    const found = (await versions(appId)).find((v) => v.id === versionId);
    if (!found)
      throw new Error(`Version ${versionId} does not belong to app ${appId}.`);
    return found;
  }
  async function environments(appId) {
    const data = await (await request(`/api/app-environments?app_id=${enc(appId)}`)).json();
    if (!Array.isArray(data.environments))
      throw new Error("Missing environment inventory.");
    return data.environments.map((e) => {
      if (typeof e.id !== "string" || typeof e.name !== "string" || typeof e.priority !== "number") {
        throw new Error("Cannot verify environment promotion order.");
      }
      return { id: e.id, name: e.name, priority: e.priority, enabled: e.enabled !== false };
    }).sort((a, b) => a.priority - b.priority);
  }
  function environment(envs, name2) {
    const matches = envs.filter((e) => e.name.toLowerCase() === name2.trim().toLowerCase());
    if (matches.length !== 1)
      throw new Error(`Unknown or ambiguous environment: ${name2}. Inspect list_app_versions.`);
    if (!matches[0].enabled)
      throw new Error(`Environment ${name2} is not enabled for this workspace.`);
    return matches[0];
  }
  function selection(appId, v, environmentId = v.environmentId) {
    return {
      app_id: appId,
      version_id: v.id,
      version_name: v.name,
      selected: true,
      ...v.status ? { status: v.status } : {},
      ...environmentId ? { current_environment_id: environmentId } : {}
    };
  }
  async function available(appId, v, env) {
    const data = await (await request(`/api/app-environments/${enc(env.id)}/versions?app_id=${enc(appId)}`)).json();
    const rows = data.appVersions ?? data.app_versions;
    if (!Array.isArray(rows) || !rows.some((row) => row.id === v.id)) {
      throw new Error(`Version ${v.name} is not available in ${env.name}. No promotion or release was performed.`);
    }
  }
  async function list(appId) {
    const vs = await versions(appId);
    const envs = await environments(appId);
    return { app_id: appId, versions: vs.map((v) => ({ ...selection(appId, v), selected: void 0, description: v.description })), environments: envs };
  }
  async function switchEnvironment(appId, versionId, environmentName) {
    const v = await version(appId, versionId);
    const env = environment(await environments(appId), environmentName);
    await available(appId, v, env);
    return { ...selection(appId, v, env.id), environment_name: env.name };
  }
  async function promote(appId, versionId, environmentName) {
    let v = await version(appId, versionId);
    const envs = await environments(appId);
    const target = environment(envs, environmentName);
    const start = envs.find((e) => e.id === v.environmentId);
    if (!start || envs.some((e, i) => i > 0 && e.priority === envs[i - 1].priority)) {
      throw new Error("Cannot verify current environment and promotion order.");
    }
    if (target.priority < start.priority)
      throw new Error("Promotion cannot move a version backwards; use switch_app_environment to view an earlier environment.");
    if (target.id === start.id)
      return { ...selection(appId, v), environment_name: target.name, promoted_to_environments: [] };
    const steps = envs.filter((e) => e.priority > start.priority && e.priority <= target.priority);
    let published = false;
    let canViewPromotedEnvironment = true;
    const promoted = [];
    try {
      if (v.status?.toUpperCase() === "DRAFT") {
        await request(`/api/v2/apps/${enc(appId)}/versions/${enc(versionId)}`, "PUT", { status: "PUBLISHED" });
        published = true;
      }
      for (const next of steps) {
        const response = await request(`/api/v2/apps/${enc(appId)}/versions/${enc(versionId)}/promote`, "PUT", { currentEnvironmentId: v.environmentId });
        const body = await response.text();
        const result = body ? JSON.parse(body) : {};
        canViewPromotedEnvironment = (result.hasAccessToPromotedEnvironment ?? result.has_access_to_promoted_environment) !== false;
        v = await version(appId, versionId);
        if (v.environmentId !== next.id)
          throw new Error("Promotion readback did not match the next expected environment.");
        promoted.push(next.name);
      }
    } catch (err) {
      throw new Error(`${String(err)} Draft saved: ${published}; verified promotions: ${promoted.join(", ") || "none"}. Inspect this exact version before retrying. No release was requested.`);
    }
    const selected = selection(appId, v);
    if (!canViewPromotedEnvironment)
      delete selected.current_environment_id;
    return {
      ...selected,
      environment_name: target.name,
      promoted_environment_id: v.environmentId,
      has_access_to_promoted_environment: canViewPromotedEnvironment,
      published_for_promotion: published,
      promoted_to_environments: promoted
    };
  }
  async function update(appId, versionId, changes) {
    const before = await version(appId, versionId);
    if (changes.name === void 0 && changes.description === void 0)
      throw new Error("Provide a version name or description.");
    const patch = {
      ...changes.name !== void 0 ? { name: changes.name.trim() } : {},
      ...changes.description !== void 0 ? { description: changes.description } : {}
    };
    if (patch.name !== void 0 && (!patch.name || patch.name.length > 50))
      throw new Error("Version name must contain 1\u201350 characters.");
    await request(`/api/v2/apps/${enc(appId)}/versions/${enc(versionId)}`, "PUT", { name: before.name, ...patch });
    const saved = await version(appId, versionId);
    if (patch.name !== void 0 && saved.name !== patch.name || patch.description !== void 0 && saved.description !== patch.description)
      throw new Error("Version metadata update could not be verified; inspect the version before retrying.");
    return {
      app_id: appId,
      version_id: saved.id,
      version_name: saved.name,
      description: saved.description,
      updated: true
    };
  }
  async function remove(appId, versionId, fallbackVersionId) {
    const all = await versions(appId);
    const v = all.find((v2) => v2.id === versionId);
    const fallback = all.find((v2) => v2.id === fallbackVersionId);
    if (!v || !fallback || v.id === fallback.id)
      throw new Error("Delete requires an existing target and a different remaining version in the same app.");
    const app = await getApp(appId);
    if ((app.current_version_id ?? app.currentVersionId) === versionId)
      throw new Error("Cannot delete the released version.");
    await request(`/api/apps/${enc(appId)}/versions/${enc(versionId)}`, "DELETE");
    const remaining = await versions(appId);
    if (remaining.some((v2) => v2.id === versionId))
      throw new Error("Version deletion could not be verified.");
    const selected = remaining.find((v2) => v2.id === fallbackVersionId);
    if (!selected)
      throw new Error("Version was deleted but the requested remaining version disappeared. Refresh the editor.");
    return { ...selection(appId, selected), deleted_version_id: versionId, deleted: true };
  }
  return { list, switchEnvironment, promote, update, remove };
}
var record = (x) => x && typeof x === "object" && !Array.isArray(x) ? x : {};
var required = (x, label) => {
  if (typeof x !== "string" || !x)
    throw new Error(`Workflow response missing ${label}.`);
  return x;
};
function createWorkflowClient(auth, config, queries) {
  async function request(path, body, method = "POST") {
    const mutation = body !== void 0;
    let response;
    try {
      response = await auth.authedFetch(path, { ...mutation ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}, signal: AbortSignal.timeout(9e4) });
    } catch {
      throw new Error(mutation ? `Workflow request outcome is unknown (${method} ${path}). Inspect persisted state before retrying; it may have completed.` : `Workflow read failed (${path}).`);
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 600);
      throw new Error(`Workflow API ${method === "POST" && !mutation ? "GET" : method} ${path} failed (HTTP ${response.status}). Check session, workspace, permissions, license and version state.${detail ? ` Response: ${detail}` : ""}`);
    }
    if (response.status === 204)
      return {};
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }
  const versionPath = (id, version) => `/api/v2/apps/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`;
  async function get(workflowId, versionId) {
    if (!versionId) {
      const app2 = record(await request(`/api/apps/${encodeURIComponent(workflowId)}`));
      versionId = required(record(app2.editing_version ?? app2.editingVersion).id, "editing version");
    }
    const app = record(await request(versionPath(workflowId, versionId)));
    if (app.type !== "workflow")
      throw new Error("Target is not a workflow.");
    const workspace = await auth.getOrganizationId();
    if ((app.organizationId ?? app.organization_id) !== workspace)
      throw new Error("Workflow does not belong to the active workspace.");
    if (app.id !== workflowId)
      throw new Error("Workflow response ID mismatch.");
    const version = record(app.editing_version ?? app.editingVersion);
    if (version.id !== versionId)
      throw new Error("Workflow version response mismatch.");
    const environmentId = required(version.currentEnvironmentId ?? version.current_environment_id, "environment ID");
    const status = String(version.status ?? "").toUpperCase();
    const released = (app.currentVersionId ?? app.current_version_id) === versionId;
    const frozen = Boolean(app.should_freeze_editor ?? app.shouldFreezeEditor);
    const exported = record(await request("/api/v2/resources/export", {
      organization_id: workspace,
      app: [{ id: workflowId, search_params: { version_id: versionId } }]
    }));
    const apps = Array.isArray(exported.app) ? exported.app : [];
    const rawApp = record(record(record(apps[0]).definition).appV2);
    if (apps.length !== 1 || rawApp.id !== workflowId || rawApp.type !== "workflow" || rawApp.organizationId !== workspace) {
      throw new Error("Lossless workflow export response mismatch. No definition can be safely edited.");
    }
    const versions = Array.isArray(rawApp.appVersions) ? rawApp.appVersions : [];
    const rawVersion = record(versions.find((candidate) => record(candidate).id === versionId));
    if (rawVersion.id !== versionId || !Object.hasOwn(rawVersion, "definition")) {
      throw new Error("Lossless workflow export is missing the requested version definition.");
    }
    return {
      workflow_id: workflowId,
      version_id: versionId,
      workspace_id: workspace,
      environment_id: environmentId,
      editable: status === "DRAFT" && !released && !frozen,
      enabled: (app.isMaintenanceOn ?? app.is_maintenance_on) === true,
      editor_url: `${config.appUrl}/${encodeURIComponent(await auth.getOrganizationSlug())}/apps/${encodeURIComponent(typeof app.slug === "string" && app.slug ? app.slug : workflowId)}`,
      definition: definition(rawVersion.definition)
    };
  }
  async function assertWorkflowDatasources(versionId, environmentId, graph, visited = /* @__PURE__ */ new Set()) {
    if (visited.has(versionId))
      return;
    if (visited.size >= 50)
      throw new Error("Cannot verify all nested workflow datasources; refusing AI execution.");
    visited.add(versionId);
    const saved = await queries.getQueries(versionId);
    const savedIds = new Set(saved.map((query2) => query2.id));
    if (graph.queries.some((mapping) => !savedIds.has(mapping.id))) {
      throw new Error("Workflow definition references a query outside its version; refusing AI execution.");
    }
    if (saved.some((query2) => !query2.data_source_id))
      throw new Error("Cannot verify a workflow query datasource; refusing AI execution.");
    if (saved.length)
      await queries.listDatasources(versionId);
    await Promise.all([...new Set(saved.map((query2) => query2.data_source_id))].map((id) => queries.assertDatasourceAllowed(id, versionId, environmentId)));
    for (const query2 of saved) {
      if (query2.kind !== "workflows")
        continue;
      const options = record(query2.options);
      const workflowId = required(options.workflowId, "nested workflow ID");
      if (!/^[A-Za-z0-9_-]+$/.test(workflowId))
        throw new Error("Cannot verify a dynamic nested workflow target.");
      let childVersion = options.workflowVersionId;
      if (!childVersion) {
        const child2 = record(await request(`/api/apps/${encodeURIComponent(workflowId)}`));
        childVersion = child2.current_version_id ?? child2.currentVersionId;
      }
      const childVersionId = required(childVersion, "nested workflow version");
      if (!/^[A-Za-z0-9_-]+$/.test(childVersionId))
        throw new Error("Cannot verify a dynamic nested workflow version.");
      if (visited.has(childVersionId))
        continue;
      const childApp = record(await request(versionPath(workflowId, childVersionId)));
      const child = record(childApp.editing_version ?? childApp.editingVersion);
      if (childApp.type !== "workflow" || childApp.id !== workflowId || child.id !== childVersionId || (childApp.organizationId ?? childApp.organization_id) !== await auth.getOrganizationId() || !Object.hasOwn(child, "definition")) {
        throw new Error("Cannot verify the nested workflow version definition; refusing AI execution.");
      }
      await assertWorkflowDatasources(childVersionId, environmentId, definition(child.definition), visited);
    }
  }
  return {
    ...queries,
    workspaceId: () => auth.getOrganizationId(),
    async planScope() {
      if (config.isOAuthDelegation && !config.oauthGrantId)
        throw new Error("OAuth workflow plans require a trusted grant identifier.");
      const identity = config.isOAuthDelegation ? ["oauth", config.oauthGrantId] : config.sessionToken ?? config.pat;
      return createHash("sha256").update(JSON.stringify([config.apiUrl, identity, await auth.getOrganizationId()])).digest("hex");
    },
    async list(page = 1, search = "") {
      return request(`/api/apps?${new URLSearchParams({ type: "workflow", page: String(page), searchKey: search })}`);
    },
    get,
    async create(name2) {
      const created = record(await request("/api/workflows", { name: name2, type: "workflow" }));
      const id = required(created.id, "created workflow ID");
      try {
        return await get(id);
      } catch (error) {
        throw new Error(`Workflow ${id} was created, but readback failed. Do not recreate it. ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    async save(snapshot, graph) {
      if (!snapshot.editable)
        throw new Error("Only editable draft workflow versions can be changed.");
      return request(versionPath(snapshot.workflow_id, snapshot.version_id), { definition: graph }, "PUT");
    },
    /** Workflow nodes use their own creation route. It supplies ToolJet's static RunJS source
     * when no datasource is needed, and carries workflow-specific guards/metadata. */
    async createWorkflowQuery(params) {
      if (params.dataSourceId)
        await queries.assertDatasourceAllowed(params.dataSourceId, params.versionId);
      const body = record(await request("/api/data-queries/workflow-node", {
        app_id: params.workflowId,
        app_version_id: params.versionId,
        name: params.name,
        kind: params.kind,
        options: params.options,
        ...params.dataSourceId ? { data_source_id: params.dataSourceId } : {}
      }));
      return { query_id: required(body.id, "created workflow query ID"), name: required(body.name, "created workflow query name") };
    },
    async run(workflowId, versionId, environmentId, params) {
      const snapshot = await get(workflowId, versionId);
      if (snapshot.environment_id !== environmentId)
        throw new Error("Environment must match the selected workflow version.");
      if (!snapshot.enabled)
        throw new Error("Workflow is disabled. Enable it in ToolJet before running it.");
      await assertWorkflowDatasources(versionId, environmentId, snapshot.definition);
      return request("/api/workflow_executions", { executeUsing: "version", appVersionId: versionId, appId: workflowId, environmentId, params });
    },
    async execution(id, page = 1, perPage = 20) {
      const base2 = `/api/workflow_executions/${encodeURIComponent(id)}`;
      const response = record(await request(`${base2}/status`));
      const status = { status: response.status, logs: response.logs };
      const nodes = await request(`${base2}/nodes?${new URLSearchParams({ page: String(page), per_page: String(perPage) })}`);
      return { execution_id: id, status, nodes, page, per_page: perPage };
    }
  };
}
var TOOLJET_DB_RESERVED_COLUMN_NAMES = /* @__PURE__ */ new Set([
  "abort",
  "abs",
  "absolute",
  "access",
  "action",
  "ada",
  "add",
  "admin",
  "after",
  "aggregate",
  "all",
  "allocate",
  "alter",
  "analyse",
  "analyze",
  "and",
  "any",
  "are",
  "array",
  "as",
  "asc",
  "asensitive",
  "assertion",
  "assignment",
  "asymmetric",
  "at",
  "atomic",
  "attribute",
  "attributes",
  "authorization",
  "avg",
  "backward",
  "before",
  "begin",
  "bernoulli",
  "between",
  "bigint",
  "binary",
  "bit",
  "bit_length",
  "bitvar",
  "blob",
  "boolean",
  "both",
  "breadth",
  "by",
  "c",
  "cache",
  "call",
  "called",
  "cardinality",
  "cascade",
  "cascaded",
  "case",
  "cast",
  "catalog",
  "catalog_name",
  "ceil",
  "ceiling",
  "chain",
  "char",
  "char_length",
  "character",
  "character_length",
  "character_set_catalog",
  "character_set_name",
  "character_set_schema",
  "characteristics",
  "characters",
  "check",
  "checked",
  "checkpoint",
  "class",
  "class_origin",
  "clob",
  "close",
  "cluster",
  "coalesce",
  "cobol",
  "collate",
  "collation",
  "collation_catalog",
  "collation_name",
  "collation_schema",
  "collect",
  "column",
  "column_name",
  "command_function",
  "command_function_code",
  "comment",
  "commit",
  "committed",
  "completion",
  "condition",
  "condition_number",
  "connect",
  "connection",
  "connection_name",
  "constraint",
  "constraint_catalog",
  "constraint_name",
  "constraint_schema",
  "constraints",
  "constructor",
  "contains",
  "continue",
  "conversion",
  "convert",
  "copy",
  "corr",
  "corresponding",
  "count",
  "covar_pop",
  "covar_samp",
  "create",
  "createdb",
  "createrole",
  "createuser",
  "cross",
  "csv",
  "cube",
  "cume_dist",
  "current",
  "current_date",
  "current_default_transform_group",
  "current_path",
  "current_role",
  "current_time",
  "current_timestamp",
  "current_transform_group_for_type",
  "current_user",
  "cursor",
  "cursor_name",
  "cycle",
  "data",
  "database",
  "date",
  "datetime_interval_code",
  "datetime_interval_precision",
  "day",
  "deallocate",
  "dec",
  "decimal",
  "declare",
  "default",
  "defaults",
  "deferrable",
  "deferred",
  "defined",
  "definer",
  "delete",
  "delimiter",
  "delimiters",
  "dense_rank",
  "depth",
  "deref",
  "derived",
  "from"
]);
var RESERVED_SUGGESTIONS = {
  data: "payload or details",
  date: "event_date or scheduled_on",
  day: "day_of_week",
  count: "item_count",
  default: "is_default",
  action: "step_action",
  comment: "note or result_comment",
  condition: "item_condition",
  check: "check_name",
  current: "is_current",
  class: "class_name",
  case: "case_ref",
  begin: "starts_at"
};
function normalized(value) {
  return value.trim().toLowerCase();
}
function validateTableBatch(tables) {
  const errors = [];
  const tablesByName = /* @__PURE__ */ new Map();
  for (const table of tables) {
    const tableKey = normalized(table.tableName);
    if (tablesByName.has(tableKey)) {
      errors.push(`Duplicate table name "${table.tableName}" in batch.`);
    } else {
      tablesByName.set(tableKey, table);
    }
    const columnsByName = /* @__PURE__ */ new Map();
    for (const column of table.columns) {
      const columnKey = normalized(column.name);
      if (columnsByName.has(columnKey)) {
        errors.push(`Table "${table.tableName}" has duplicate column name "${column.name}".`);
      } else {
        columnsByName.set(columnKey, column.name);
      }
      if (TOOLJET_DB_RESERVED_COLUMN_NAMES.has(columnKey)) {
        errors.push(`Table "${table.tableName}" uses reserved column name "${column.name}" (ToolJet DB rejects SQL keywords). Rename it, e.g. ${RESERVED_SUGGESTIONS[columnKey] ?? `${columnKey}_value`}.`);
      }
      const dataType = normalizeType(column.type);
      if (!TOOLJET_DB_DATA_TYPES.has(dataType)) {
        errors.push(`Table "${table.tableName}" column "${column.name}" has type "${column.type}", which ToolJet DB does not accept. Use one of: string, integer, bigint, serial, number (double precision), boolean, timestamp, jsonb.` + (/^(numeric|money|dec)/i.test(column.type.trim()) ? " numeric is not supported. For money choose on purpose: integer cents where sums must be exact, or number shown with a currency format for prices; never swap one in silently." : ""));
      }
    }
    for (const foreignKey of table.foreignKeys ?? []) {
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) {
        errors.push(`Table "${table.tableName}" foreign key to "${foreignKey.referencedTable}" must have the same number of local and referenced columns.`);
      }
      const missingLocal = foreignKey.columns.filter((column) => !columnsByName.has(normalized(column)));
      if (missingLocal.length) {
        errors.push(`Table "${table.tableName}" foreign key references missing local columns: ${missingLocal.join(", ")}.`);
      }
    }
  }
  for (const table of tables) {
    for (const foreignKey of table.foreignKeys ?? []) {
      const referenced = tablesByName.get(normalized(foreignKey.referencedTable));
      if (!referenced)
        continue;
      const referencedColumns = new Set(referenced.columns.map((column) => normalized(column.name)));
      if (!referenced.columns.some((column) => column.primaryKey))
        referencedColumns.add("id");
      const missing = foreignKey.referencedColumns.filter((column) => !referencedColumns.has(normalized(column)));
      if (missing.length) {
        errors.push(`Table "${table.tableName}" foreign key references missing columns on "${foreignKey.referencedTable}": ${missing.join(", ")}.`);
      }
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length)
        continue;
      for (let index = 0; index < foreignKey.columns.length; index++) {
        const local = table.columns.find((column) => normalized(column.name) === normalized(foreignKey.columns[index]));
        const remoteName = foreignKey.referencedColumns[index];
        const remote = referenced.columns.find((column) => normalized(column.name) === normalized(remoteName));
        const remoteType = remote ? normalizeType(remote.type) : normalized(remoteName) === "id" && !referenced.columns.some((column) => column.primaryKey) ? "serial" : void 0;
        if (local && normalizeType(local.type) === "double precision" && remoteType && ["serial", "integer", "bigint"].includes(remoteType)) {
          errors.push(`Table "${table.tableName}" foreign-key column "${local.name}" uses "${local.type}" (double precision), but "${referenced.tableName}.${remoteName}" is ${remoteType}. Use an integer-compatible foreign-key type (integer for serial/integer IDs, bigint for bigint IDs); number is not an integer ID. No types were changed.`);
        }
      }
    }
  }
  try {
    tableCreationLevels(tables);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return [...new Set(errors)];
}
function tableCreationLevels(tables) {
  const byName = new Map(tables.map((table) => [normalized(table.tableName), table]));
  const dependencies = /* @__PURE__ */ new Map();
  for (const table of tables) {
    const key = normalized(table.tableName);
    dependencies.set(key, new Set((table.foreignKeys ?? []).map((foreignKey) => normalized(foreignKey.referencedTable)).filter((referenced) => referenced !== key && byName.has(referenced))));
  }
  const remaining = new Set(byName.keys());
  const completed = /* @__PURE__ */ new Set();
  const levels = [];
  while (remaining.size) {
    const ready = [...remaining].filter((name2) => [...dependencies.get(name2) ?? []].every((dependency) => completed.has(dependency)));
    if (!ready.length) {
      throw new Error(`Table batch contains a circular foreign-key dependency: ${[...remaining].map((name2) => byName.get(name2)?.tableName ?? name2).join(", ")}. Create one side first, then add the circular foreign key as a column change.`);
    }
    levels.push(ready.map((name2) => byName.get(name2)));
    ready.forEach((name2) => {
      remaining.delete(name2);
      completed.add(name2);
    });
  }
  return levels;
}
function staticBooleanBinding(value) {
  return { value: `{{${value}}}`, fxActive: false };
}
function booleanBindingValue(value) {
  if (typeof value === "boolean")
    return value;
  if (typeof value !== "string")
    return void 0;
  const match = /^\{\{\s*(true|false)\s*\}\}$/.exec(value);
  return match ? match[1] === "true" : void 0;
}
function isCanonicalStaticBooleanBinding(value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return false;
  const binding = value;
  return binding.value === `{{${expected}}}` && binding.fxActive === false;
}
function invalidSeedTimestamps(columns, rows) {
  const dates = columns.filter((c) => /^(date|timestamp(?:tz)?(?:\(\d+\))?(?: (?:with|without) time zone)?)$/i.test(c.type.trim()));
  const errors = [];
  for (const column of dates) {
    const invalid = [];
    for (const [index, row] of rows.entries()) {
      const value = row[column.name];
      if (value == null)
        continue;
      const obvious = typeof value === "boolean" || typeof value === "object" || typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) < 100) || typeof value === "string" && (!value.trim() || /^[+-]?\d{1,2}$/.test(value.trim()));
      if (obvious || typeof value === "string" && notOnCalendar(value))
        invalid.push(index + 1);
    }
    if (invalid.length)
      errors.push(`Column "${column.name}" (${column.type}) has non-date literals in seed row(s) ${invalid.slice(0, 12).join(", ")}${invalid.length > 12 ? ` and ${invalid.length - 12} more` : ""}. Supply actual date/timestamp values (prefer ISO 8601), or null only when permitted. No values were rewritten.`);
  }
  for (const column of columns.filter((c) => /^(text|character varying|varchar)(\(\d+\))?$/i.test(c.type.trim()))) {
    const invalid = rows.flatMap((row, index) => {
      const value = row[column.name];
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value.trim()) && notOnCalendar(value) ? [index + 1] : [];
    });
    if (invalid.length)
      errors.push(`Column "${column.name}" (${column.type}) has dates that do not exist in seed row(s) ${invalid.slice(0, 12).join(", ")}${invalid.length > 12 ? ` and ${invalid.length - 12} more` : ""} (a month has no such day). Supply real dates. No values were rewritten.`);
  }
  return errors;
}
function notOnCalendar(value) {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?![\d])/);
  if (!m)
    return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1)
    return true;
  return day > new Date(Date.UTC(year, month, 0)).getUTCDate();
}
var WORKSPACE_PERMISSION_KEYS = [
  "appCreate",
  "appDelete",
  "moduleCreate",
  "moduleDelete",
  "workflowCreate",
  "workflowDelete",
  "folderCRUD",
  "orgConstantCRUD",
  "tjdbCRUD",
  "dataSourceCreate",
  "dataSourceDelete",
  "appPromote",
  "appRelease"
];
var WORKSPACE_ACCESS_KEYS = [
  "canEdit",
  "canView",
  "hideFromDashboard",
  "canAccessDevelopment",
  "canAccessStaging",
  "canAccessProduction",
  "canAccessReleased",
  "canConfigure",
  "canUse"
];
function workspaceAccessKeys(type) {
  if (type === "data_source")
    return ["canConfigure", "canUse"];
  if (type === "module")
    return ["canEdit", "canView", "hideFromDashboard"];
  if (type === "workflow")
    return ["canEdit", "canView"];
  return WORKSPACE_ACCESS_KEYS.filter((key) => !["canConfigure", "canUse"].includes(key));
}
var PartialWriteError = class extends Error {
  completed;
  failures;
  constructor(operation, completed, failures, cause) {
    super(`ToolJet ${operation} partially failed. Persisted before failure: ${JSON.stringify(completed)}. Failed: ${failures.join(" | ")}. Persisted resources were not deleted automatically.`, { cause });
    this.name = "PartialWriteError";
    this.completed = completed;
    this.failures = failures;
  }
};
function completedPartialWrites(error) {
  return error instanceof PartialWriteError ? error.completed : [];
}
function assertAllowedToolJetDbColumnNames(operation, columns) {
  const reserved = columns.map((column) => column.name).filter((name2) => TOOLJET_DB_RESERVED_COLUMN_NAMES.has(name2.toLowerCase()));
  if (reserved.length) {
    throw new Error(`ToolJet ${operation} failed: reserved column name${reserved.length === 1 ? "" : "s"}: ${reserved.join(", ")}. Use a descriptive name such as step_action, result_comment, or item_condition.`);
  }
}
function condenseErrorBody(detail, limit = 600) {
  const text = String(detail ?? "");
  if (/<!doctype html|<html[\s>]/i.test(text)) {
    const title = /<title>([^<]*)<\/title>/i.exec(text)?.[1]?.trim();
    return `${title || "HTML error page"} (HTML error page from the proxy, markup omitted)`;
  }
  return text.length > limit ? `${text.slice(0, limit)} \u2026[${text.length - limit} more chars]` : text;
}
var ToolJetHttpError = class extends Error {
  status;
  method;
  detail;
  constructor(status, method, detail) {
    super(`ToolJet ${method} failed (${status}): ${condenseErrorBody(detail)}`);
    this.status = status;
    this.method = method;
    this.detail = detail;
    this.name = "ToolJetHttpError";
  }
};
function isPageHidden(page) {
  return booleanBindingValue(page?.hidden?.value) === true;
}
function pageHiddenNeedsUpdate(page, expected) {
  if (page?.hidden === void 0 || page?.hidden === null)
    return expected;
  return booleanBindingValue(page.hidden?.value) !== expected || !isCanonicalStaticBooleanBinding(page.hidden, expected);
}
async function assertOk(res, method) {
  if (!res.ok) {
    const detail = await res.text();
    if (method === "createTable" && res.status === 451)
      throw new TableQuotaError();
    throw new ToolJetHttpError(res.status, method, detail);
  }
}
var TYPE_ALIASES = {
  string: "character varying",
  text: "character varying",
  varchar: "character varying",
  int: "integer",
  integer: "integer",
  number: "double precision",
  float: "double precision",
  decimal: "double precision",
  double: "double precision",
  bigint: "bigint",
  bool: "boolean",
  boolean: "boolean",
  timestamp: "timestamp with time zone",
  datetime: "timestamp with time zone",
  date: "timestamp with time zone",
  json: "jsonb",
  jsonb: "jsonb",
  serial: "serial"
};
var normalizeType = (t) => TYPE_ALIASES[t.trim().toLowerCase()] ?? t.trim().toLowerCase();
var TOOLJET_DB_DATA_TYPES = /* @__PURE__ */ new Set([
  "character varying",
  "integer",
  "bigint",
  "serial",
  "double precision",
  "boolean",
  "timestamp with time zone",
  "jsonb"
]);
function tableColumnDto(column) {
  return {
    column_name: column.name,
    data_type: normalizeType(column.type),
    constraints_type: {
      is_not_null: !!column.notNull || !!column.primaryKey,
      is_primary_key: !!column.primaryKey,
      is_unique: !!column.unique || !!column.primaryKey
    },
    ...column.defaultValue !== void 0 ? { column_default: column.defaultValue } : {},
    ...column.configurations ? { configurations: column.configurations } : {}
  };
}
function tableForeignKeyDto(foreignKey) {
  return {
    column_names: foreignKey.columns,
    referenced_table_name: foreignKey.referencedTable,
    referenced_column_names: foreignKey.referencedColumns,
    ...foreignKey.onDelete ? { on_delete: foreignKey.onDelete } : {},
    ...foreignKey.onUpdate ? { on_update: foreignKey.onUpdate } : {}
  };
}
function createClient(auth, config) {
  let developmentEnvironmentIdPromise;
  const datasourceManagementUrl = (workspaceSlug, datasourceId) => `${config.appUrl}/${encodeURIComponent(workspaceSlug)}/data-sources` + (datasourceId ? `/${encodeURIComponent(datasourceId)}` : "");
  async function listWorkspaceApps(params = {}) {
    const query2 = new URLSearchParams({ page: String(params.page ?? 1), type: "front-end" });
    if (params.searchText)
      query2.set("searchKey", params.searchText);
    const res = await auth.authedFetch(`/api/apps?${query2}`);
    await assertOk(res, "listWorkspaceApps");
    return await res.json();
  }
  async function listWorkspaceUsers(params = {}) {
    const query2 = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.searchText)
      query2.set("searchText", params.searchText);
    if (params.status)
      query2.set("status", params.status);
    const res = await auth.authedFetch(`/api/organization-users?${query2}`);
    await assertOk(res, "listWorkspaceUsers");
    const data = await res.json();
    if (!Array.isArray(data?.users) || !Number.isInteger(data?.meta?.total_pages) || data.meta.total_pages < 0) {
      throw new Error("Unexpected workspace users response.");
    }
    const fields = ["id", "user_id", "email", "first_name", "last_name", "name", "status", "groups", "user_metadata"];
    return { meta: data.meta, users: data.users.map((user) => {
      if (!user || typeof user.id !== "string")
        throw new Error("Unexpected workspace user response.");
      const result = Object.fromEntries(fields.filter((key) => Object.hasOwn(user, key)).map((key) => [key, user[key]]));
      const roles = user.role_group;
      if (Array.isArray(roles) && roles.length === 1 && ["admin", "builder", "end-user"].includes(roles[0]?.name)) {
        result.role = roles[0].name;
      }
      return result;
    }) };
  }
  const groupPath = "/api/v2/group-permissions";
  function workspaceGroup(value) {
    if (!value || typeof value.id !== "string" || typeof value.name !== "string" || !["default", "custom"].includes(value.type)) {
      throw new Error("Unexpected workspace group response.");
    }
    const permissions = booleanFields(value, WORKSPACE_PERMISSION_KEYS);
    return {
      id: value.id,
      name: value.name,
      type: value.type,
      ...typeof value.disabled === "boolean" ? { disabled: value.disabled } : {},
      ...Object.keys(permissions).length ? { permissions } : {}
    };
  }
  function booleanFields(value, keys) {
    return Object.fromEntries(keys.filter((key) => typeof value?.[key] === "boolean").map((key) => [key, value[key]]));
  }
  async function updateWorkspaceGroupPermissions(groupId, permissions, allowRoleChange = false) {
    const res = await auth.authedFetch(`${groupPath}/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...permissions, allowRoleChange })
    });
    await assertOk(res, "updateWorkspaceGroupPermissions");
  }
  async function duplicateWorkspaceGroup(groupId, options) {
    const res = await auth.authedFetch(`${groupPath}/${groupId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options)
    });
    await assertOk(res, "duplicateWorkspaceGroup");
    const created = await res.json();
    if (typeof created?.id !== "string")
      throw new Error("Unexpected duplicated group response.");
    return getWorkspaceGroup(created.id);
  }
  async function listWorkspaceGroupResources(type) {
    const res = await auth.authedFetch(`${groupPath}/granular-permissions/addable-${type === "data_source" ? "data-sources" : "apps"}`);
    await assertOk(res, "listWorkspaceGroupResources");
    const items = await res.json();
    if (!Array.isArray(items))
      throw new Error("Unexpected group resources response.");
    const appType = { app: "front-end", module: "module", workflow: "workflow" };
    return items.filter((item) => type === "data_source" || item.type === appType[type]).map((item) => {
      if (typeof item.id !== "string" || typeof item.name !== "string")
        throw new Error("Unexpected group resource.");
      return { id: item.id, name: item.name };
    });
  }
  async function listWorkspaceGroupAccess(groupId) {
    const res = await auth.authedFetch(`${groupPath}/${groupId}/granular-permissions`);
    await assertOk(res, "listWorkspaceGroupAccess");
    const items = await res.json();
    if (!Array.isArray(items))
      throw new Error("Unexpected granular permissions response.");
    return items.map((item) => {
      if (!item || item.id != null && typeof item.id !== "string" || typeof item.name !== "string" || typeof item.isAll !== "boolean" || !["app", "module", "workflow", "data_source"].includes(item.type))
        throw new Error("Unexpected granular permission.");
      const synthetic = item.id == null;
      if (synthetic && !item.isAll)
        throw new Error("Unexpected granular permission without a persisted ID.");
      const ds = item.type === "data_source";
      const detail = ds ? item.dataSourcesGroupPermission : item.appsGroupPermissions;
      return {
        ...synthetic ? {
          read_only: true,
          read_only_reason: "These effective permissions are supplied by the current license/plan and cannot be edited."
        } : { id: item.id },
        name: item.name,
        type: item.type,
        is_all: item.isAll,
        actions: booleanFields(detail, workspaceAccessKeys(item.type)),
        resources: (detail?.[ds ? "groupDataSources" : "groupApps"] ?? []).map((link) => {
          const resource = link[ds ? "dataSource" : "app"];
          if (!resource || typeof resource.id !== "string" || typeof resource.name !== "string" || typeof link.id !== "string") {
            throw new Error("Unexpected granular permission resource.");
          }
          return { id: resource.id, name: resource.name, membership_id: link.id };
        })
      };
    });
  }
  async function writeWorkspaceGroupAccess(method, groupId, type, ruleId, body) {
    const route = type === "app" ? "app" : "data-source";
    const path = method === "POST" ? `${groupId}/granular-permissions/${route}` : `granular-permissions/${route}/${ruleId}`;
    const res = await auth.authedFetch(`${groupPath}/${path}`, {
      method,
      ...body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}
    });
    await assertOk(res, "writeWorkspaceGroupAccess");
  }
  async function listWorkspaceGroups() {
    const res = await auth.authedFetch(groupPath);
    await assertOk(res, "listWorkspaceGroups");
    const data = await res.json();
    if (!Array.isArray(data.groupPermissions))
      throw new Error("Unexpected workspace groups response.");
    return data.groupPermissions.map(workspaceGroup);
  }
  async function getWorkspaceGroup(groupId) {
    const res = await auth.authedFetch(`${groupPath}/${encodeURIComponent(groupId)}`);
    await assertOk(res, "getWorkspaceGroup");
    return workspaceGroup((await res.json()).group);
  }
  async function listWorkspaceGroupMembers(groupId) {
    const res = await auth.authedFetch(`${groupPath}/${encodeURIComponent(groupId)}/users`);
    await assertOk(res, "listWorkspaceGroupMembers");
    const data = await res.json();
    if (!Array.isArray(data))
      throw new Error("Unexpected workspace group members response.");
    return data.map((entry) => {
      if (typeof entry?.id !== "string" || typeof entry?.userId !== "string") {
        throw new Error("Unexpected workspace group member response.");
      }
      return {
        group_user_id: entry.id,
        user_id: entry.userId,
        email: entry.user?.email,
        first_name: entry.user?.firstName,
        last_name: entry.user?.lastName
      };
    });
  }
  async function createWorkspaceGroup(name2) {
    const res = await auth.authedFetch(groupPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name2 })
    });
    await assertOk(res, "createWorkspaceGroup");
    const created = await res.json();
    if (typeof created?.id !== "string")
      throw new Error("Create group response did not include an id.");
    return getWorkspaceGroup(created.id);
  }
  async function renameWorkspaceGroup(groupId, name2) {
    const res = await auth.authedFetch(`${groupPath}/${encodeURIComponent(groupId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name2 })
    });
    await assertOk(res, "renameWorkspaceGroup");
  }
  async function deleteWorkspaceGroup(groupId) {
    const res = await auth.authedFetch(`${groupPath}/${encodeURIComponent(groupId)}`, { method: "DELETE" });
    await assertOk(res, "deleteWorkspaceGroup");
  }
  async function removeWorkspaceGroupMember(groupUserId) {
    const res = await auth.authedFetch(`${groupPath}/users/${encodeURIComponent(groupUserId)}`, { method: "DELETE" });
    await assertOk(res, "removeWorkspaceGroupMember");
  }
  async function inviteWorkspaceUser(params) {
    const res = await auth.authedFetch("/api/organization-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: params.email,
        role: params.role,
        ...params.firstName !== void 0 ? { firstName: params.firstName } : {},
        ...params.lastName !== void 0 ? { lastName: params.lastName } : {},
        ...params.groupIds !== void 0 ? { groups: params.groupIds } : {}
      })
    });
    await assertOk(res, "inviteWorkspaceUser");
  }
  async function updateWorkspaceUser(organizationUserId, params) {
    if (params.firstName !== void 0 || params.lastName !== void 0) {
      throw new Error("Name changes require a Super Admin and are not supported by this workspace-scoped tool. No changes were made. Ask a Super Admin to edit the name in ToolJet.");
    }
    if (params.role === void 0 && !params.addGroupIds?.length && params.userMetadata === void 0) {
      throw new Error("update requires a role, non-empty group_ids, or user_metadata change. An empty group_ids list never removes memberships.");
    }
    async function readUser() {
      for (let page = 1; ; page++) {
        const result = await listWorkspaceUsers({ page });
        const user = result.users.find((item) => item.id === organizationUserId);
        if (user)
          return user;
        if (page >= result.meta.total_pages)
          throw new Error("User not found in this workspace. List workspace users again.");
      }
    }
    const before = await readUser();
    if (before.status === "archived")
      throw new Error("This workspace user is archived. Unarchive them explicitly before updating them.");
    if (!before.role)
      throw new Error("Cannot verify the current workspace role from its default group. No changes were made.");
    if (!Array.isArray(before.groups) || before.groups.some((group) => typeof group?.id !== "string")) {
      throw new Error("Cannot verify existing group memberships. No changes were made.");
    }
    const groups = await listWorkspaceGroups();
    if (groups.some((group) => group.type === "custom" && group.disabled)) {
      throw new Error("Custom groups are disabled under the current plan; existing memberships cannot be safely preserved. No changes were made.");
    }
    const groupIds = [.../* @__PURE__ */ new Set([...before.groups.map((group) => group.id), ...params.addGroupIds ?? []])];
    if (groupIds.some((id) => !groups.some((group) => group.id === id && group.type === "custom" && !group.disabled))) {
      throw new Error("Every group must be an existing, enabled custom group in this workspace. No changes were made.");
    }
    let metadata;
    if (params.userMetadata !== void 0) {
      if (!Object.hasOwn(before, "user_metadata") || before.user_metadata != null && (typeof before.user_metadata !== "object" || Array.isArray(before.user_metadata))) {
        throw new Error("Cannot read existing user metadata safely. No changes were made.");
      }
      metadata = { ...before.user_metadata, ...params.userMetadata };
    }
    if (groupIds.length === before.groups.length && (params.role === void 0 || params.role === before.role) && (metadata === void 0 || isDeepStrictEqual(metadata, before.user_metadata)))
      return { user: before, updated: false };
    const res = await auth.authedFetch(`/api/organization-users/${encodeURIComponent(organizationUserId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params.role !== void 0 ? { role: params.role } : {},
        // Despite its name, addGroups REPLACES every custom membership in one transaction.
        // The additive group endpoint is not permitted by existing workspace PAT scopes.
        addGroups: groupIds,
        ...metadata !== void 0 ? { userMetadata: metadata } : {}
      })
    });
    await assertOk(res, "updateWorkspaceUser");
    try {
      const after = await readUser();
      const actualIds = after.groups?.map((group) => group.id);
      if (!actualIds || actualIds.length !== groupIds.length || groupIds.some((id) => !actualIds.includes(id)) || after.role !== (params.role ?? before.role) || after.first_name !== before.first_name || after.last_name !== before.last_name || after.status !== before.status || !isDeepStrictEqual(after.user_metadata, metadata ?? before.user_metadata)) {
        throw new Error("Saved user state does not match the requested changes and preserved fields.");
      }
      return { user: after, updated: true };
    } catch (error) {
      throw new Error(`The update was accepted, but its final state could not be verified. Read the user again before retrying: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async function setWorkspaceUserArchived(organizationUserId, archived) {
    const action = archived ? "archive" : "unarchive";
    const res = await auth.authedFetch(`/api/organization-users/${encodeURIComponent(organizationUserId)}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    await assertOk(res, `${action}WorkspaceUser`);
  }
  async function getApp(appId) {
    const res = await auth.authedFetch(`/api/apps/${appId}`);
    await assertOk(res, "getApp");
    return res.json();
  }
  function projectComponent(id, entry) {
    const c = entry?.component ?? {};
    const def = c.definition ?? {};
    const persistedParent = typeof c.parent === "string" ? c.parent : void 0;
    const decodedParent = persistedParent ? decodeComponentParent(persistedParent) : void 0;
    return {
      id,
      name: c.name,
      type: c.component,
      layouts: entry?.layouts,
      properties: def.properties,
      styles: def.styles,
      ...def.validation !== void 0 ? { validation: def.validation } : {},
      others: def.others,
      ...persistedParent ? { parent: persistedParent } : {},
      ...decodedParent && decodedParent.slotName !== "body" ? { slot_name: decodedParent.slotName } : {}
    };
  }
  async function getAppSummary(appId, versionId) {
    let full;
    if (versionId) {
      const res = await auth.authedFetch(`/api/v2/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}?mode=edit`);
      await assertOk(res, "getAppSummary.version");
      full = await res.json();
      const returnedVersionId = full.editing_version?.id ?? full.editingVersion?.id;
      if (returnedVersionId !== versionId) {
        throw new Error(`ToolJet getAppSummary.version failed: requested version ${versionId}, but the response identified ${String(returnedVersionId)}.`);
      }
    } else {
      full = await getApp(appId);
    }
    const pages = (full.pages ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      handle: p.handle,
      icon: p.icon,
      hidden: isPageHidden(p),
      ...typeof pageOrderIndex(p) === "number" ? { index: pageOrderIndex(p) } : {},
      ...typeof p.isPageGroup === "boolean" ? { is_page_group: p.isPageGroup } : {},
      ...typeof p.pageGroupId === "string" ? { page_group_id: p.pageGroupId } : {},
      components: Object.entries(p.components ?? {}).map(([id, entry]) => projectComponent(id, entry))
    }));
    const queries = (full.data_queries ?? []).map((q) => ({
      id: q.id,
      name: q.name,
      kind: q.kind,
      data_source_id: q.data_source_id,
      options: q.options
    }));
    const events = (full.events ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      sourceId: e.sourceId,
      target: e.target,
      event: e.event,
      ...typeof e.index === "number" ? { index: e.index } : {}
    }));
    return {
      app_id: full.id,
      name: full.name,
      version_id: full.editing_version?.id,
      ...full.should_freeze_editor === true ? { editor_frozen: true } : {},
      ...typeof full.editorEnvironment?.name === "string" ? { environment: full.editorEnvironment.name } : {},
      pages,
      queries,
      events
    };
  }
  function appPermissionPath(appId, resourceType, resourceId) {
    const segment = resourceType === "page" ? "pages" : resourceType === "query" ? "queries" : "components";
    return `/api/app-permissions/${encodeURIComponent(appId)}/${segment}/${encodeURIComponent(resourceId)}`;
  }
  async function listAppPermissionSubjects(appId) {
    const app = encodeURIComponent(appId);
    const [usersResponse, groupsResponse] = await Promise.all([
      auth.authedFetch(`/api/app-permissions/${app}/pages/users`),
      auth.authedFetch(`/api/app-permissions/${app}/pages/user-groups`)
    ]);
    await assertOk(usersResponse, "listAppPermissionSubjects users");
    await assertOk(groupsResponse, "listAppPermissionSubjects groups");
    const users = await usersResponse.json();
    const groups = await groupsResponse.json();
    if (!Array.isArray(users) || !Array.isArray(groups)) {
      throw new Error("ToolJet listAppPermissionSubjects failed: expected array responses.");
    }
    return {
      users: users.map((user) => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || void 0,
        email: user.email
      })),
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        ...typeof group.count === "number" ? { count: group.count } : {}
      }))
    };
  }
  async function getAppPermission(appId, resourceType, resourceId) {
    const res = await auth.authedFetch(appPermissionPath(appId, resourceType, resourceId));
    await assertOk(res, "getAppPermission");
    const body = await res.json();
    if (!Array.isArray(body)) {
      throw new Error("ToolJet getAppPermission failed: expected an array response.");
    }
    return body;
  }
  async function setAppPermission(params) {
    const path = appPermissionPath(params.appId, params.resourceType, params.resourceId);
    const existing = await getAppPermission(params.appId, params.resourceType, params.resourceId);
    const body = params.accessType === "users" ? { type: "SINGLE", users: params.subjectIds } : { type: "GROUP", groups: params.subjectIds };
    const res = await auth.authedFetch(path, {
      method: existing.length ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await assertOk(res, "setAppPermission");
    return getAppPermission(params.appId, params.resourceType, params.resourceId);
  }
  async function clearAppPermission(appId, resourceType, resourceId) {
    const existing = await getAppPermission(appId, resourceType, resourceId);
    if (!existing.length)
      return;
    const res = await auth.authedFetch(appPermissionPath(appId, resourceType, resourceId), {
      method: "DELETE"
    });
    await assertOk(res, "clearAppPermission");
  }
  async function getAppSettings(appId, versionId) {
    const res = await auth.authedFetch(`/api/v2/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}`);
    await assertOk(res, "getAppSettings");
    const app = await res.json();
    const editingVersion = app.editing_version ?? app.editingVersion;
    if (!editingVersion || editingVersion.id !== versionId) {
      throw new Error(`ToolJet getAppSettings failed: version "${versionId}" is not the current editing version for app "${appId}".`);
    }
    return {
      app_id: appId,
      version_id: versionId,
      global_settings: editingVersion.global_settings ?? editingVersion.globalSettings ?? {},
      page_settings: editingVersion.page_settings ?? editingVersion.pageSettings ?? {}
    };
  }
  async function listAppThemes() {
    const res = await auth.authedFetch("/api/themes");
    await assertOk(res, "listAppThemes");
    const body = await res.json();
    if (!Array.isArray(body))
      throw new Error("ToolJet listAppThemes failed: expected an array response.");
    return body;
  }
  async function createAppTheme(params) {
    const res = await auth.authedFetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name,
        organizationId: await auth.getOrganizationId(),
        definition: params.definition,
        isDefault: params.isDefault ?? false
      })
    });
    await assertOk(res, "createAppTheme");
    return await res.json();
  }
  async function updateAppTheme(themeId, field, body, operation) {
    const res = await auth.authedFetch(`/api/themes/${encodeURIComponent(themeId)}/${field}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await assertOk(res, operation);
  }
  async function setDefaultAppTheme(themeId, isDefault) {
    await updateAppTheme(themeId, "default", { isDefault }, "setDefaultAppTheme");
  }
  async function updateAppThemeDefinition(themeId, definition2) {
    await updateAppTheme(themeId, "definition", { definition: definition2 }, "updateAppThemeDefinition");
  }
  async function renameAppTheme(themeId, name2) {
    await updateAppTheme(themeId, "name", { name: name2 }, "renameAppTheme");
  }
  async function deleteAppTheme(themeId) {
    const res = await auth.authedFetch(`/api/themes/${encodeURIComponent(themeId)}`, { method: "DELETE" });
    await assertOk(res, "deleteAppTheme");
  }
  async function updateAppSettings(params) {
    const body = {
      ...params.globalSettings ? { globalSettings: params.globalSettings } : {},
      ...params.pageSettings ? { pageSettings: params.pageSettings } : {},
      ...params.showViewerNavigation !== void 0 ? { showViewerNavigation: params.showViewerNavigation } : {}
    };
    if (!Object.keys(body).length) {
      throw new Error("ToolJet updateAppSettings failed: provide at least one setting.");
    }
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await assertOk(res, "updateAppSettings");
  }
  async function getComponent(appId, componentId) {
    const full = await getApp(appId);
    for (const p of full.pages ?? []) {
      const entry = (p.components ?? {})[componentId];
      if (entry)
        return { ...projectComponent(componentId, entry), page_id: p.id };
    }
    throw new Error(`ToolJet getComponent failed: component ${componentId} not found in app ${appId}`);
  }
  async function listWorkspaces() {
    return auth.listWorkspaces();
  }
  async function useWorkspace(workspaceId) {
    return auth.switchWorkspace(workspaceId);
  }
  async function createApp(name2) {
    let createRes;
    let finalName = name2;
    for (let attempt = 1; attempt <= 6; attempt++) {
      finalName = attempt === 1 ? name2 : `${name2} ${attempt}`;
      createRes = await auth.authedFetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName, type: "front-end" })
      });
      if (createRes.status !== 409)
        break;
    }
    await assertOk(createRes, "createApp");
    const created = await createRes.json();
    const app = await getApp(created.id);
    const versionId = app.editing_version.id;
    const versionName = app.editing_version.name ?? "v1";
    const pages = app.pages ?? [];
    const homePage = pages.find((p) => p.name === "Home") ?? pages[0];
    if (!homePage) {
      throw new Error("ToolJet createApp failed: app has no pages");
    }
    const orgSlug = await auth.getOrganizationSlug();
    const appSlug = created.slug ?? created.id;
    const editorUrl = `${config.appUrl}/${orgSlug}/apps/${appSlug}`;
    const homeHandle = homePage.handle ?? "home";
    const viewerUrl = `${config.appUrl}/applications/${created.id}/${encodeURIComponent(homeHandle)}?env=development&version=${encodeURIComponent(versionName)}`;
    return {
      app_id: created.id,
      version_id: versionId,
      home_page_id: homePage.id,
      app_url: editorUrl,
      editor_url: editorUrl,
      viewer_url: viewerUrl,
      datasources_url: datasourceManagementUrl(orgSlug)
    };
  }
  async function createAppVersion(params) {
    const res = await auth.authedFetch(`/api/apps/${encodeURIComponent(params.appId)}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        versionName: params.versionName,
        versionFromId: params.versionFromId,
        ...params.versionDescription !== void 0 ? { versionDescription: params.versionDescription } : {}
      })
    });
    if (res.status === 409 || res.status === 422 && /already exists/i.test(await res.clone().text())) {
      throw new Error(`ToolJet createAppVersion failed (${res.status}): version name already exists. No existing draft was adopted. Inspect the versions and ask the user whether to use an existing version or create a version with a different name; do not edit or release a matching draft as a recovered clone.`);
    }
    await assertOk(res, "createAppVersion");
    const created = await res.json();
    if (typeof created.id !== "string" || typeof created.name !== "string") {
      throw new Error("ToolJet createAppVersion failed: response did not include the new version id and name.");
    }
    return {
      app_id: params.appId,
      version_id: created.id,
      version_name: created.name,
      source_version_id: params.versionFromId,
      ...typeof created.status === "string" ? { status: created.status } : {},
      ...typeof created.current_environment_id === "string" ? { current_environment_id: created.current_environment_id } : {},
      ...created.description === null || typeof created.description === "string" ? { description: created.description } : {}
    };
  }
  async function switchAppVersion(appId, versionId) {
    const versionsRes = await auth.authedFetch(`/api/apps/${encodeURIComponent(appId)}/versions`);
    await assertOk(versionsRes, "switchAppVersion.listVersions");
    const body = await versionsRes.json();
    const version = body.versions?.find((candidate) => candidate.id === versionId);
    if (!version || typeof version.name !== "string") {
      throw new Error(`ToolJet switchAppVersion failed: version ${versionId} was not found in app ${appId}.`);
    }
    return {
      app_id: appId,
      version_id: versionId,
      version_name: version.name,
      ...typeof version.status === "string" ? { status: version.status } : {},
      ...typeof version.current_environment_id === "string" ? { current_environment_id: version.current_environment_id } : typeof version.currentEnvironmentId === "string" ? { current_environment_id: version.currentEnvironmentId } : {},
      selected: true
    };
  }
  async function releaseApp(appId, versionId) {
    const readVersion = async () => {
      const versionsRes = await auth.authedFetch(`/api/apps/${encodeURIComponent(appId)}/versions`);
      await assertOk(versionsRes, "releaseApp.readVersion");
      const body = await versionsRes.json();
      const version2 = body.versions?.find((candidate) => candidate.id === versionId);
      if (!version2) {
        throw new Error(`ToolJet releaseApp failed: version ${versionId} was not found in app ${appId}.`);
      }
      return {
        id: versionId,
        ...typeof version2.status === "string" ? { status: version2.status } : {},
        ...typeof version2.current_environment_id === "string" ? { currentEnvironmentId: version2.current_environment_id } : typeof version2.currentEnvironmentId === "string" ? { currentEnvironmentId: version2.currentEnvironmentId } : {}
      };
    };
    let version = await readVersion();
    let publishedForRelease = false;
    const promotedToEnvironments = [];
    const restoreDraftAfterDeniedRelease = async (response, operation) => {
      const errorText = await response.clone().text();
      let restored = false;
      if (publishedForRelease && (response.status === 401 || response.status === 403)) {
        const restoreRes = await auth.authedFetch(`/api/v2/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DRAFT" })
        });
        restored = restoreRes.ok;
      }
      const draftState = publishedForRelease ? restored ? " The draft was restored after the permission denial." : " The draft may already be published; ask an app releaser to continue." : "";
      throw new Error(`ToolJet ${operation} failed (${response.status}): ${errorText}${draftState}`);
    };
    if (version.status === "DRAFT") {
      const publishRes = await auth.authedFetch(`/api/v2/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" })
      });
      await assertOk(publishRes, "releaseApp.publishVersion");
      publishedForRelease = true;
      version = { ...version, status: "PUBLISHED" };
    }
    const releaseOnce = () => auth.authedFetch(`/api/apps/${encodeURIComponent(appId)}/release`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionToBeReleased: versionId })
    });
    let releaseRes = await releaseOnce();
    if (!releaseRes.ok) {
      const releaseError = await releaseRes.clone().text();
      const promotionRequired = releaseRes.status === 400 && /only release when the version is promoted to production/i.test(releaseError);
      if (!promotionRequired) {
        if (releaseRes.status === 401 || releaseRes.status === 403) {
          await restoreDraftAfterDeniedRelease(releaseRes, "releaseApp");
        }
        const prepared = publishedForRelease ? " The draft was already published; retry release instead of editing it." : "";
        throw new Error(`ToolJet releaseApp failed (${releaseRes.status}): ${releaseError}${prepared}`);
      }
      const environmentsRes = await auth.authedFetch(`/api/app-environments?app_id=${encodeURIComponent(appId)}`);
      await assertOk(environmentsRes, "releaseApp.listEnvironments");
      const environmentsBody = await environmentsRes.json();
      const environments = (environmentsBody.environments ?? []).flatMap((environment) => {
        if (typeof environment.id !== "string" || typeof environment.name !== "string")
          return [];
        return [{
          id: environment.id,
          name: environment.name,
          isDefault: environment.default === true || environment.is_default === true || environment.isDefault === true,
          ...typeof environment.priority === "number" ? { priority: environment.priority } : {}
        }];
      });
      for (let attempts = 0; attempts <= environments.length; attempts++) {
        const currentEnvironment = environments.find((environment) => environment.id === version.currentEnvironmentId);
        if (!currentEnvironment) {
          throw new Error(`ToolJet releaseApp failed after publishing the version: version ${versionId} references unknown environment ${String(version.currentEnvironmentId)}. Retry release after checking its environment.`);
        }
        if (currentEnvironment.isDefault)
          break;
        if (attempts === environments.length) {
          throw new Error(`ToolJet releaseApp failed after partial preparation: version ${versionId} did not reach production. Retry the same release to continue safely.`);
        }
        const promoteRes = await auth.authedFetch(`/api/v2/apps/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}/promote`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentEnvironmentId: currentEnvironment.id })
        });
        if (!promoteRes.ok) {
          if (promoteRes.status === 401 || promoteRes.status === 403) {
            await restoreDraftAfterDeniedRelease(promoteRes, "releaseApp promotion");
          }
          const promoteError = await promoteRes.clone().text();
          throw new Error(`ToolJet releaseApp promotion from ${currentEnvironment.name} failed (${promoteRes.status}): ${promoteError}. The version may already be published or partly promoted; retry the same release.`);
        }
        version = await readVersion();
        const promotedEnvironment = environments.find((environment) => environment.id === version.currentEnvironmentId);
        if (!promotedEnvironment || promotedEnvironment.id === currentEnvironment.id) {
          throw new Error(`ToolJet releaseApp could not verify promotion from ${currentEnvironment.name} for version ${versionId}. Retry the same release to continue safely.`);
        }
        promotedToEnvironments.push(promotedEnvironment.name);
      }
      releaseRes = await releaseOnce();
    }
    await assertOk(releaseRes, "releaseApp");
    const app = await getApp(appId);
    const releasedId = app?.current_version_id ?? app?.currentVersionId;
    if (releasedId !== versionId) {
      throw new Error(`ToolJet releaseApp could not verify the release: expected current version ${versionId}, received ${String(releasedId)}. Read the app state before retrying.`);
    }
    return {
      app_id: appId,
      version_id: versionId,
      released: true,
      current_version_id: releasedId,
      ...version.currentEnvironmentId ? { current_environment_id: version.currentEnvironmentId } : {},
      published_for_release: publishedForRelease,
      promoted_to_environments: promotedToEnvironments
    };
  }
  async function renameApp(appId, versionId, name2) {
    const res = await auth.authedFetch(`/api/apps/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: { name: name2, editingVersionId: versionId } })
    });
    await assertOk(res, "renameApp");
    const refreshed = await getApp(appId);
    if (refreshed.name !== name2) {
      throw new Error(`ToolJet renameApp failed: expected name "${name2}", received "${String(refreshed.name)}".`);
    }
  }
  async function listTables() {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/tables`);
    await assertOk(res, "listTables");
    const body = await res.json();
    return body.result ?? [];
  }
  async function createPages(params) {
    for (const page of params.pages) {
      if (page.icon !== void 0)
        assertPageIcon(page.icon, `Page "${page.name}"`);
    }
    const app = await getApp(params.appId);
    const existingPages = app.pages ?? [];
    const highestPersistedIndex = existingPages.reduce((highest, page) => {
      const index = pageOrderIndex(page);
      return typeof index === "number" && Number.isFinite(index) ? Math.max(highest, index) : highest;
    }, 0);
    const startIndex = Math.max(highestPersistedIndex, existingPages.length) + 1;
    const handleOf = (name2) => name2.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "page";
    const existingNames = new Set((app.pages ?? []).map((page) => String(page.name).toLowerCase()));
    const existingHandles = new Set((app.pages ?? []).map((page) => String(page.handle).toLowerCase()));
    const seenNames = /* @__PURE__ */ new Set();
    const seenHandles = /* @__PURE__ */ new Set();
    const entries = params.pages.map((page, offset) => {
      const nameKey = page.name.toLowerCase();
      if (existingNames.has(nameKey) || seenNames.has(nameKey)) {
        throw new Error(`ToolJet createPages failed: duplicate page name "${page.name}".`);
      }
      const base2 = handleOf(page.name);
      let handle = base2;
      for (let suffix = 2; existingHandles.has(handle) || seenHandles.has(handle); suffix++) {
        const tail = `-${suffix}`;
        handle = `${base2.slice(0, 50 - tail.length)}${tail}`;
      }
      seenNames.add(nameKey);
      seenHandles.add(handle);
      return { ...page, id: randomUUID(), handle, index: startIndex + offset };
    });
    const createSettled = await Promise.allSettled(entries.map(async (page) => {
      const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: page.id,
          name: page.name,
          handle: page.handle,
          index: page.index,
          ...page.icon ? { icon: page.icon } : {}
        })
      });
      await assertOk(res, `createPages "${page.name}"`);
      return page;
    }));
    const createdEntries = createSettled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failures = createSettled.flatMap((result, index) => result.status === "rejected" ? [`${entries[index].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`] : []);
    const metadataTasks = createdEntries.flatMap((page) => [
      ...page.icon ? [{ page, field: "icon", promise: persistFieldForPage(page.id, "icon", page.icon, `createPages "${page.name}" icon update`) }] : [],
      ...page.hidden ? [{ page, field: "hidden", promise: persistFieldForPage(page.id, "hidden", staticBooleanBinding(true), `createPages "${page.name}" hidden update`) }] : []
    ]);
    const metadataSettled = await Promise.allSettled(metadataTasks.map((task) => task.promise));
    failures.push(...metadataSettled.flatMap((result, index) => result.status === "rejected" ? [`${metadataTasks[index].page.name} ${metadataTasks[index].field}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`] : []));
    let persistedById = /* @__PURE__ */ new Map();
    if (createdEntries.some((page) => page.icon || page.hidden)) {
      try {
        const refreshed = await getApp(params.appId);
        persistedById = new Map((refreshed.pages ?? []).map((page) => [page.id, page]));
        for (const entry of createdEntries) {
          const page = persistedById.get(entry.id);
          if (entry.icon && page?.icon !== entry.icon) {
            failures.push(`page "${entry.name}" exists, but sidebar icon "${entry.icon}" did not persist`);
          }
          if (entry.hidden && !isPageHidden(page)) {
            failures.push(`page "${entry.name}" exists, but hidden-from-sidebar did not persist`);
          }
        }
      } catch (error) {
        failures.push(`page metadata readback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const completed = createdEntries.map((page) => ({
      page_id: page.id,
      name: page.name,
      index: page.index,
      ...persistedById.get(page.id)?.icon ? { icon: persistedById.get(page.id).icon } : {},
      ...isPageHidden(persistedById.get(page.id)) ? { hidden: true } : {}
    }));
    if (failures.length)
      throw new PartialWriteError("createPages", completed, failures);
    return completed;
    async function persistFieldForPage(pageId, field, value, label) {
      const r = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, diff: { [field]: value } })
      });
      await assertOk(r, label);
    }
  }
  async function createPage(params) {
    const [page] = await createPages({
      appId: params.appId,
      versionId: params.versionId,
      pages: [{ name: params.name, icon: params.icon, hidden: params.hidden }]
    });
    return page;
  }
  async function updatePages(params) {
    const updates = params.updates ?? [];
    for (const update of updates) {
      if (update.icon !== void 0)
        assertPageIcon(update.icon, `Page "${update.pageId}"`);
    }
    const order = params.order;
    if (!updates.length && !order) {
      throw new Error("ToolJet updatePages failed: provide at least one page update or a complete page order.");
    }
    const app = await getApp(params.appId);
    const pages = app.pages ?? [];
    const pagesById = new Map(pages.map((page) => [String(page.id), page]));
    const editingVersion = app.editing_version ?? app.editingVersion ?? {};
    const homePageId = String(editingVersion.home_page_id ?? editingVersion.homePageId ?? app.home_page_id ?? app.homePageId ?? "");
    const seenUpdateIds = /* @__PURE__ */ new Set();
    for (const update of updates) {
      if (!pagesById.has(update.pageId)) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" does not exist.`);
      }
      if (seenUpdateIds.has(update.pageId)) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" is updated more than once.`);
      }
      seenUpdateIds.add(update.pageId);
      if (update.name === void 0 && update.icon === void 0 && update.hidden === void 0) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" has no changed fields.`);
      }
      if (update.name !== void 0 && !update.name.trim()) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" has an empty name.`);
      }
      if (update.icon !== void 0 && !update.icon.trim()) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" has an empty icon.`);
      }
      const current = pagesById.get(update.pageId);
      if (update.hidden === true && (update.pageId === homePageId || !homePageId && current?.handle === "home")) {
        throw new Error("ToolJet updatePages failed: the Home page cannot be hidden from navigation.");
      }
    }
    const requestedNames = new Map(updates.map((update) => [update.pageId, update.name]));
    const finalNames = pages.map((page) => {
      const kind = page.isPageGroup === true ? "group" : "page";
      const name2 = String(requestedNames.get(String(page.id)) ?? page.name ?? "").trim().toLowerCase();
      return `${kind}:${name2}`;
    });
    if (new Set(finalNames).size !== finalNames.length) {
      throw new Error("ToolJet updatePages failed: page names must remain unique.");
    }
    if (order) {
      const orderedIds = new Set(order);
      if (order.length !== pages.length || orderedIds.size !== order.length) {
        throw new Error("ToolJet updatePages failed: order must contain every current page id exactly once.");
      }
      const missing = pages.filter((page) => !orderedIds.has(String(page.id))).map((page) => page.id);
      if (missing.length || order.some((pageId) => !pagesById.has(pageId))) {
        throw new Error("ToolJet updatePages failed: order must contain every current page id exactly once.");
      }
    }
    const fieldUpdates = [];
    for (const update of updates) {
      const current = pagesById.get(update.pageId);
      if (update.name !== void 0 && update.name !== current.name) {
        fieldUpdates.push({ pageId: update.pageId, field: "name", value: update.name });
      }
      if (update.icon !== void 0 && update.icon !== current.icon) {
        fieldUpdates.push({ pageId: update.pageId, field: "icon", value: update.icon });
      }
      if (update.hidden !== void 0 && pageHiddenNeedsUpdate(current, update.hidden)) {
        fieldUpdates.push({ pageId: update.pageId, field: "hidden", value: staticBooleanBinding(update.hidden) });
      }
    }
    await Promise.all(fieldUpdates.map(async ({ pageId, field, value }) => {
      const response = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, diff: { [field]: value } })
      });
      await assertOk(response, `updatePages ${pageId}.${field}`);
    }));
    if (order) {
      const diff = Object.fromEntries(order.map((pageId, index) => [pageId, { index }]));
      const response = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff })
      });
      await assertOk(response, "updatePages reorder");
    }
    const refreshed = await getApp(params.appId);
    const refreshedPages = refreshed.pages ?? [];
    const refreshedById = new Map(refreshedPages.map((page) => [String(page.id), page]));
    for (const update of updates) {
      const page = refreshedById.get(update.pageId);
      if (update.name !== void 0 && page?.name !== update.name) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" name did not persist.`);
      }
      if (update.icon !== void 0 && page?.icon !== update.icon) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" icon did not persist.`);
      }
      if (update.hidden !== void 0 && isPageHidden(page) !== update.hidden) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" hidden state did not persist.`);
      }
    }
    if (order) {
      for (const [index, pageId] of order.entries()) {
        if (pageOrderIndex(refreshedById.get(pageId)) !== index) {
          throw new Error(`ToolJet updatePages failed: page order did not persist at index ${index}.`);
        }
      }
    }
    return {
      updated_fields: fieldUpdates.length,
      reordered: order !== void 0,
      pages: refreshedPages.slice().sort((left, right) => (pageOrderIndex(left) ?? 0) - (pageOrderIndex(right) ?? 0)).map((page) => ({
        page_id: page.id,
        name: page.name,
        handle: page.handle,
        icon: page.icon,
        hidden: isPageHidden(page),
        ...typeof pageOrderIndex(page) === "number" ? { index: pageOrderIndex(page) } : {}
      }))
    };
  }
  async function createEvents(params) {
    const indexBySource = {};
    for (const existing of params.existingEvents) {
      if (!existing.sourceId || !existing.target || typeof existing.index !== "number")
        continue;
      const raw = existing.event && typeof existing.event === "object" && !Array.isArray(existing.event) ? existing.event : void 0;
      const ref2 = typeof raw?.ref === "string" ? raw.ref : "";
      const sourceKey = `${existing.target}:${existing.sourceId}:${ref2}`;
      indexBySource[sourceKey] = Math.max(indexBySource[sourceKey] ?? 0, existing.index + 1);
    }
    const events = params.events.map((e) => {
      const sourceKey = `${e.sourceType}:${e.sourceId}:${e.ref ?? ""}`;
      const index = indexBySource[sourceKey] ?? 0;
      indexBySource[sourceKey] = index + 1;
      const action = e.action.actionId === "control-component" && e.action.componentSpecificActionParams === void 0 ? { ...e.action, componentSpecificActionParams: [] } : e.action;
      return {
        // name is NOT NULL server-side (the DTO marks it optional but the column requires it).
        name: e.name ?? `${e.trigger} \u2192 ${e.action.actionId ?? "action"}`,
        event: { eventId: e.trigger, ...e.ref ? { ref: e.ref } : {}, ...action },
        eventType: e.sourceType,
        attachedTo: e.sourceId,
        index
      };
    });
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/events/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events })
    });
    await assertOk(res, "createEvents");
    return { created: events.length };
  }
  let mapsKeyPromise;
  async function hasGoogleMapsKey() {
    mapsKeyPromise ??= (async () => {
      try {
        const res = await auth.authedFetch("/api/config");
        if (!res.ok)
          return void 0;
        const body = await res.json();
        return typeof body.GOOGLE_MAPS_API_KEY === "string" && body.GOOGLE_MAPS_API_KEY.trim() !== "";
      } catch {
        return void 0;
      }
    })();
    return mapsKeyPromise;
  }
  async function getDevelopmentEnvironmentId() {
    if (!developmentEnvironmentIdPromise) {
      developmentEnvironmentIdPromise = (async () => {
        const res = await auth.authedFetch("/api/app-environments");
        await assertOk(res, "getDevelopmentEnvironmentId");
        const body = await res.json();
        const envs = Array.isArray(body) ? body : body.environments;
        const dev = envs.find((e) => e.name === "development");
        if (!dev) {
          throw new Error("ToolJet getDevelopmentEnvironmentId failed: no development environment found");
        }
        return dev.id;
      })().catch((error) => {
        developmentEnvironmentIdPromise = void 0;
        throw error;
      });
    }
    return developmentEnvironmentIdPromise;
  }
  const datasourceIdentities = /* @__PURE__ */ new Map();
  async function assertDatasourceAllowed(dataSourceId, versionId, environmentId) {
    const key = `${await auth.getOrganizationId()}:${dataSourceId}`;
    if (!datasourceIdentities.has(key) && versionId)
      await listDatasources(versionId);
    const known = datasourceIdentities.get(key);
    if (known)
      return assertAiDatasource(known);
    await getDatasourceConnectionDetails(dataSourceId, environmentId);
  }
  async function assertQueryDatasourceAllowed(queryId, versionId, environmentId) {
    const query2 = await getQuery(queryId, versionId);
    if (!query2.data_source_id)
      throw new Error("Cannot verify the saved query datasource; refusing AI access.");
    await assertDatasourceAllowed(query2.data_source_id, versionId, environmentId);
  }
  async function listDatasources(versionId) {
    const [orgId, orgSlug, envId] = await Promise.all([
      auth.getOrganizationId(),
      auth.getOrganizationSlug(),
      getDevelopmentEnvironmentId()
    ]);
    const res = await auth.authedFetch(`/api/data-sources/${orgId}/environments/${envId}/versions/${versionId}`);
    await assertOk(res, "listDatasources");
    const body = await res.json();
    for (const source of body.data_sources) {
      datasourceIdentities.set(`${orgId}:${source.id}`, { name: source.name, kind: source.kind, type: source.type });
    }
    return body.data_sources.filter((source) => !isSampleDatasource(source)).map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      settings_url: datasourceManagementUrl(orgSlug, d.id)
    }));
  }
  async function createTable(params) {
    assertAllowedToolJetDbColumnNames("createTable", params.columns);
    const columnNames = new Set(params.columns.map((column) => column.name));
    for (const foreignKey of params.foreignKeys ?? []) {
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) {
        throw new Error(`ToolJet createTable failed: foreign key columns and referencedColumns must have the same length.`);
      }
      const missing = foreignKey.columns.filter((column) => !columnNames.has(column));
      if (missing.length) {
        throw new Error(`ToolJet createTable failed: foreign key references missing local columns: ${missing.join(", ")}`);
      }
    }
    const orgId = await auth.getOrganizationId();
    let cols = params.columns.map(tableColumnDto);
    if (params.columns.some((column) => column.primaryKey) && !params.columns.some((column) => column.name.toLowerCase() === "id")) {
      cols = [...cols, { column_name: "id", data_type: "serial", constraints_type: { is_not_null: true, is_primary_key: false, is_unique: true } }];
    }
    if (!params.columns.some((column) => column.primaryKey)) {
      cols = [
        {
          column_name: "id",
          data_type: "serial",
          constraints_type: { is_not_null: true, is_primary_key: true, is_unique: true }
        },
        ...cols
      ];
    }
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table_name: params.tableName,
        columns: cols,
        ...params.foreignKeys?.length ? {
          foreign_keys: params.foreignKeys.map(tableForeignKeyDto)
        } : {}
      })
    });
    await assertOk(res, "createTable");
    const body = await res.json();
    return { table_id: body.result.id, table_name: body.result.table_name };
  }
  async function createTables(params) {
    const levels = tableCreationLevels(params.tables);
    const created = [];
    for (const level of levels) {
      for (let start = 0; start < level.length; start += 4) {
        const batch = level.slice(start, start + 4);
        const settled = await Promise.allSettled(batch.map((table) => createTable(table)));
        const failures = [];
        let quota;
        settled.forEach((result, index) => {
          if (result.status === "fulfilled")
            created.push(result.value);
          else {
            quota ??= tableQuotaError(result.reason);
            failures.push(`${batch[index].tableName}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
          }
        });
        if (failures.length)
          throw new PartialWriteError("createTables", created, failures, quota);
      }
    }
    const byName = new Map(created.map((table) => [table.table_name.toLowerCase(), table]));
    return params.tables.map((table) => byName.get(table.tableName.toLowerCase()));
  }
  async function addTableColumn(params) {
    assertAllowedToolJetDbColumnNames("addTableColumn", [params.column]);
    for (const foreignKey of params.foreignKeys ?? []) {
      if (!foreignKey.columns.includes(params.column.name)) {
        throw new Error(`ToolJet addTableColumn failed: foreign key must include the new column "${params.column.name}".`);
      }
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) {
        throw new Error("ToolJet addTableColumn failed: foreign key columns and referencedColumns must have the same length.");
      }
    }
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}/column`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        column: tableColumnDto(params.column),
        foreign_keys: (params.foreignKeys ?? []).map(tableForeignKeyDto)
      })
    });
    await assertOk(res, "addTableColumn");
    return { added: true };
  }
  async function dropTableColumn(params) {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}/column/${encodeURIComponent(params.columnName)}`, { method: "DELETE" });
    await assertOk(res, "dropTableColumn");
    return { dropped: true };
  }
  async function dropTable(params) {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}`, { method: "DELETE" });
    await assertOk(res, "dropTable");
    return { dropped: true };
  }
  async function getTableSchema(tableName) {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(tableName)}`);
    await assertOk(res, "getTableSchema");
    const body = await res.json();
    return body.result.columns.map((c) => {
      const columnUuid = body.result.configurations?.columns?.column_names?.[c.column_name];
      const configurations = c.configurations ?? (columnUuid ? body.result.configurations?.columns?.configurations?.[columnUuid] : void 0);
      return {
        name: c.column_name,
        type: c.data_type,
        isPrimaryKey: !!c.constraints_type?.is_primary_key,
        isNotNull: !!c.constraints_type?.is_not_null,
        isUnique: !!c.constraints_type?.is_unique,
        ...c.column_default !== void 0 ? { defaultValue: c.column_default } : {},
        ...configurations ? { configurations } : {},
        foreignKeys: (body.result.foreign_keys ?? []).filter((foreignKey) => foreignKey.column_names.includes(c.column_name)).map((foreignKey) => ({
          columns: foreignKey.column_names,
          referencedTable: foreignKey.referenced_table_name,
          referencedColumns: foreignKey.referenced_column_names,
          ...foreignKey.on_delete ? { onDelete: foreignKey.on_delete } : {},
          ...foreignKey.on_update ? { onUpdate: foreignKey.on_update } : {}
        }))
      };
    });
  }
  const SCHEMA_CACHE_RETRY_DELAYS_MS = [300, 600, 1200, 2400, 4e3];
  const INSERT_ATTEMPT_TIMEOUT_MS = 45e3;
  const UNKNOWN_INSERT_OUTCOME = "Insert outcome unknown: the row may already have been inserted. Verify persisted rows before retrying; do not replay the whole batch.";
  async function hasRows(tableId) {
    try {
      const res = await auth.authedFetch(`/api/tooljet-db/proxy/${encodeURIComponent(tableId)}?limit=1`, { signal: AbortSignal.timeout(15e3) });
      if (!res.ok)
        return void 0;
      const body = await res.json();
      return Array.isArray(body) ? body.length > 0 : void 0;
    } catch {
      return void 0;
    }
  }
  async function insertRowViaProxy(tableId, row) {
    let schemaWaits = 0;
    for (; ; ) {
      let res;
      try {
        res = await auth.authedFetch(`/api/tooljet-db/proxy/${encodeURIComponent(tableId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(INSERT_ATTEMPT_TIMEOUT_MS)
        });
      } catch (error) {
        throw new Error(`ToolJet insertRows request failed (${error instanceof Error ? error.name : "transport error"}). ${UNKNOWN_INSERT_OUTCOME}`);
      }
      if (res.ok)
        return res;
      if (res.status === 408 || res.status >= 500) {
        const body2 = await res.text().catch(() => "Response body unavailable");
        const error = new ToolJetHttpError(res.status, "insertRows", body2);
        error.message += ` ${UNKNOWN_INSERT_OUTCOME}`;
        throw error;
      }
      if (schemaWaits >= SCHEMA_CACHE_RETRY_DELAYS_MS.length)
        return res;
      const body = await res.clone().text().catch(() => "");
      if (!/PGRST205|schema cache/i.test(body))
        return res;
      await new Promise((resolve) => setTimeout(resolve, SCHEMA_CACHE_RETRY_DELAYS_MS[schemaWaits]));
      schemaWaits += 1;
    }
  }
  async function insertRows(params) {
    if (!params.rows.length)
      return { processed_rows: 0 };
    const schema = await getTableSchema(params.tableName);
    const rows = params.rows.map((r) => ({ ...r }));
    const timestampErrors = invalidSeedTimestamps(schema, rows);
    if (timestampErrors.length)
      throw new Error(`insertRows preflight for "${params.tableName}": ${timestampErrors.join(" ")} No rows in this table batch were inserted.`);
    const generatedPrimaryKey = schema.find((column) => column.isPrimaryKey && (/serial/i.test(column.type) || /^nextval\(/i.test(String(column.defaultValue ?? ""))));
    if (generatedPrimaryKey && rows.some((row) => generatedPrimaryKey.name in row)) {
      throw new Error(`insertRows: omit generated primary key "${generatedPrimaryKey.name}" for table "${params.tableName}". ToolJet will allocate it from the real table sequence; explicit generated ids can collide or desynchronize future inserts.`);
    }
    const table = (await listTables()).find((candidate) => candidate.table_name === params.tableName);
    if (!table)
      throw new Error(`insertRows: ToolJet DB table "${params.tableName}" was not found in the active workspace.`);
    let processedRows = 0;
    for (const [index, row] of rows.entries()) {
      try {
        const res = await insertRowViaProxy(table.id, row);
        await assertOk(res, "insertRows");
        processedRows += 1;
      } catch (error) {
        if (!processedRows)
          throw error;
        throw new PartialWriteError("insertRows", [{ processed_rows: processedRows }], [
          `row ${index + 1}/${rows.length}: ${error instanceof Error ? error.message : String(error)}`
        ]);
      }
    }
    return { processed_rows: processedRows };
  }
  async function insertRowsBatch(params) {
    const results = [];
    for (const table of params.tables) {
      try {
        const result = await insertRows(table);
        results.push({ table_name: table.tableName, processed_rows: result.processed_rows });
      } catch (error) {
        const partialRows = completedPartialWrites(error).reduce((total, result) => total + result.processed_rows, 0);
        if (partialRows)
          results.push({ table_name: table.tableName, processed_rows: partialRows });
        throw new PartialWriteError("insertRowsBatch", results, [
          `${table.tableName}: ${error instanceof Error ? error.message : String(error)}`
        ]);
      }
    }
    return results;
  }
  async function resolveDatasourceKind(versionId, dataSourceId) {
    const ds = (await listDatasources(versionId)).find((d) => d.id === dataSourceId);
    if (!ds)
      throw new Error(`ToolJet createQuery failed: datasource ${dataSourceId} not found for this app version`);
    return ds.kind;
  }
  const queryCreateTails = /* @__PURE__ */ new Map();
  async function createQuery(params, batchCheck) {
    const previous = queryCreateTails.get(params.versionId);
    let release;
    const tail = new Promise((resolve) => {
      release = resolve;
    });
    queryCreateTails.set(params.versionId, tail);
    await previous;
    try {
      const failedPreflight = await batchCheck;
      if (failedPreflight)
        throw failedPreflight.error;
      return await createQueryUnqueued(params);
    } finally {
      release();
      if (queryCreateTails.get(params.versionId) === tail)
        queryCreateTails.delete(params.versionId);
    }
  }
  async function createQueryUnqueued(params) {
    assertPersistableQueryToggles(params.options, `ToolJet createQuery refused query "${params.name}"`);
    const kind = params.kind ?? await resolveDatasourceKind(params.versionId, params.dataSourceId);
    await assertDatasourceAllowed(params.dataSourceId, params.versionId);
    const res = await auth.authedFetch(`/api/data-queries/data-sources/${params.dataSourceId}/versions/${params.versionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name: params.name, options: params.options })
    });
    await assertOk(res, "createQuery");
    const body = await res.json();
    return { query_id: body.id, name: body.name };
  }
  async function createQueries(params) {
    const batchCheck = (async () => {
      await listDatasources(params.versionId);
      await Promise.all(params.queries.map((q) => assertDatasourceAllowed(q.dataSourceId)));
      return void 0;
    })().catch((error) => ({ error }));
    const settled = await Promise.allSettled(params.queries.map((q) => createQuery({
      versionId: params.versionId,
      dataSourceId: q.dataSourceId,
      name: q.name,
      options: q.options,
      kind: q.kind
    }, batchCheck)));
    const completed = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failures = settled.flatMap((result, index) => result.status === "rejected" ? [`${params.queries[index].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`] : []);
    if (failures.length)
      throw new PartialWriteError("createQueries", completed, failures);
    return completed;
  }
  function buildComponentDto(spec) {
    const misplaced = Object.keys(spec.properties ?? {}).filter((k) => STYLE_KEYS_IN_PROPERTIES.has(k));
    if (misplaced.length) {
      throw new Error(`Component "${spec.name}": style keys ${JSON.stringify(misplaced)} were placed under \`properties\`, where ToolJet silently ignores them. Move them to the top-level \`styles\` object instead.`);
    }
    const dto = {
      name: spec.name,
      type: spec.type,
      properties: spec.properties,
      styles: spec.styles ?? {},
      validation: spec.validation ?? {},
      others: spec.others ?? {}
    };
    const desktop = spec.layouts?.desktop ?? spec.layout;
    const mobile = spec.layouts?.mobile ?? spec.layout;
    if (desktop || mobile) {
      dto.layouts = { ...desktop ? { desktop } : {}, ...mobile ? { mobile } : {} };
    }
    return dto;
  }
  async function createComponents(params) {
    const entries = params.components.map((spec) => ({ id: spec.id ?? randomUUID(), spec }));
    const refToId = /* @__PURE__ */ new Map();
    for (const e of entries) {
      if (!e.spec.clientRef)
        continue;
      if (refToId.has(e.spec.clientRef)) {
        throw new Error(`createComponents: duplicate clientRef "${e.spec.clientRef}".`);
      }
      refToId.set(e.spec.clientRef, e.id);
    }
    const diff = {};
    for (const e of entries) {
      if (e.spec.parent && e.spec.parentRef) {
        throw new Error(`createComponents "${e.spec.name}": set EITHER parent or parentRef, not both.`);
      }
      const dto = buildComponentDto(e.spec);
      const resolvedParent = e.spec.parentRef ? refToId.get(e.spec.parentRef) : e.spec.parent;
      if (e.spec.parentRef && !resolvedParent) {
        throw new Error(`createComponents "${e.spec.name}": parentRef "${e.spec.parentRef}" does not match a clientRef in this batch.`);
      }
      if (e.spec.slotName && !resolvedParent) {
        throw new Error(`createComponents "${e.spec.name}": slotName requires parent or parentRef.`);
      }
      if (resolvedParent)
        dto.parent = encodeComponentParent(resolvedParent, e.spec.slotName);
      const submit = e.spec.type === "Form" ? dto.properties?.buttonToSubmit : void 0;
      const submitId = submit && typeof submit.value === "string" ? refToId.get(submit.value) ?? entries.find((other) => !other.spec.clientRef && other.spec.name === submit.value)?.id : void 0;
      if (submit && submitId) {
        dto.properties = { ...dto.properties, buttonToSubmit: { ...submit, value: submitId } };
      }
      diff[e.id] = dto;
    }
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff })
    });
    await assertOk(res, "createComponents");
    return entries.map((e) => ({ component_id: e.id, name: e.spec.name }));
  }
  async function createComponent(params) {
    const [r] = await createComponents({
      appId: params.appId,
      versionId: params.versionId,
      pageId: params.pageId,
      components: [
        {
          name: params.name,
          type: params.type,
          properties: params.properties,
          styles: params.styles,
          validation: params.validation,
          others: params.others,
          layout: params.layout,
          layouts: params.layouts
        }
      ]
    });
    return { component_id: r.component_id };
  }
  async function updateComponents(params) {
    const diff = {};
    for (const u of params.updates) {
      const hasDef = hasNonEmptyDefinition(u.definition);
      const hasRaw = u.name !== void 0 || u.parent !== void 0 || u.slotName !== void 0;
      if (!hasDef && !hasRaw) {
        throw new Error(`updateComponents "${u.componentId}": nothing to update. Provide a non-empty definition (properties/styles/validation/others) or a name/parent change.`);
      }
      if (hasDef && hasRaw) {
        throw new Error(`updateComponents "${u.componentId}": set EITHER definition (properties/styles/\u2026) OR name/parent/slotName in one entry \u2014 ToolJet applies only one path. Split into two update calls.`);
      }
      if (u.slotName !== void 0 && u.parent === void 0) {
        throw new Error(`updateComponents "${u.componentId}": slotName requires parent.`);
      }
      if (hasDef) {
        diff[u.componentId] = { component: { definition: u.definition } };
      } else {
        diff[u.componentId] = {
          component: {
            ...u.name !== void 0 ? { name: u.name } : {},
            ...u.parent !== void 0 ? { parent: encodeComponentParent(u.parent, u.slotName) } : {}
          }
        };
      }
    }
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff })
    });
    await assertOk(res, "updateComponents");
    return { updated: params.updates.length };
  }
  async function deleteComponents(params) {
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_user_switched_version: false,
        pageId: params.pageId,
        diff: params.componentIds
      })
    });
    await assertOk(res, "deleteComponents");
    return { deleted: params.componentIds.length };
  }
  async function updateLayouts(params) {
    const diff = {};
    for (const l of params.layouts) {
      if (!l.desktop && !l.mobile && l.parent === void 0) {
        throw new Error(`updateLayouts "${l.componentId}": nothing to update. Provide desktop and/or mobile rects, or a parent change.`);
      }
      const entry = {
        layouts: {
          ...l.desktop ? { desktop: l.desktop } : {},
          ...l.mobile ? { mobile: l.mobile } : {}
        }
      };
      if (l.slotName !== void 0 && l.parent === void 0) {
        throw new Error(`updateLayouts "${l.componentId}": slotName requires parent.`);
      }
      if (l.parent !== void 0)
        entry.component = { parent: encodeComponentParent(l.parent, l.slotName) };
      diff[l.componentId] = entry;
    }
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components/layout`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff })
    });
    await assertOk(res, "updateLayouts");
    return { updated: params.layouts.length };
  }
  async function updateQuery(params) {
    assertPersistableQueryToggles(params.options, `ToolJet updateQuery refused query "${params.queryId}"`);
    await assertQueryDatasourceAllowed(params.queryId, params.versionId);
    const body = { options: params.options };
    if (params.name !== void 0)
      body.name = params.name;
    const res = await auth.authedFetch(`/api/data-queries/${params.queryId}/versions/${params.versionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await assertOk(res, "updateQuery");
    return { query_id: params.queryId };
  }
  async function updateQueryDatasource(params) {
    await assertDatasourceAllowed(params.dataSourceId, params.versionId);
    const res = await auth.authedFetch(`/api/data-queries/${params.queryId}/versions/${params.versionId}/data-source`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data_source_id: params.dataSourceId })
    });
    await assertOk(res, "updateQueryDatasource");
  }
  async function deleteQuery(params) {
    const res = await auth.authedFetch(`/api/data-queries/${params.queryId}/versions/${params.versionId}`, { method: "DELETE" });
    await assertOk(res, "deleteQuery");
    return { deleted: true };
  }
  async function deletePage(params) {
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: params.pageId,
        deleteAssociatedPages: params.deleteAssociatedPages ?? false
      })
    });
    await assertOk(res, "deletePage");
    return { deleted: true };
  }
  async function getQueries(versionId) {
    const res = await auth.authedFetch(`/api/data-queries/${versionId}`);
    await assertOk(res, "getQueries");
    const body = await res.json();
    const orgSlug = await auth.getOrganizationSlug();
    return (body.data_queries ?? []).map((query2) => ({
      ...query2,
      ...query2.data_source_id ? { datasource_settings_url: datasourceManagementUrl(orgSlug, query2.data_source_id) } : {}
    }));
  }
  async function getQuery(queryId, versionId) {
    const query2 = (await getQueries(versionId)).find((candidate) => candidate.id === queryId);
    if (!query2)
      throw new Error(`ToolJet getQuery failed: query ${queryId} not found in version ${versionId}`);
    return query2;
  }
  async function runQuery(params) {
    await assertQueryDatasourceAllowed(params.queryId, params.versionId, params.environmentId);
    const envId = params.environmentId ?? await getDevelopmentEnvironmentId();
    const res = await auth.authedFetch(`/api/data-queries/${params.queryId}/versions/${params.versionId}/run/${envId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolvedOptions: params.resolvedOptions ?? {}, options: {} })
    });
    await assertOk(res, "runQuery");
    return await res.json();
  }
  async function invokeDatasourceMethod(params) {
    await assertDatasourceAllowed(params.dataSourceId, void 0, params.environmentId);
    const environmentId = params.environmentId ?? await getDevelopmentEnvironmentId();
    const res = await auth.authedFetch(`/api/data-sources/${params.dataSourceId}/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: params.method,
        environmentId,
        ...params.args ? { args: params.args } : {}
      })
    });
    await assertOk(res, "invokeDatasourceMethod");
    return await res.json();
  }
  async function getPluginSpec(pluginKind, specName) {
    const res = await auth.authedFetch(`/api/plugins/specs/${encodeURIComponent(pluginKind)}/${encodeURIComponent(specName)}`);
    await assertOk(res, "getPluginSpec");
    return res.text();
  }
  async function specCacheScope() {
    let workspace;
    try {
      workspace = await auth.getOrganizationId();
    } catch {
      return void 0;
    }
    if (!workspace)
      return void 0;
    let server;
    try {
      const url = new URL(config.apiUrl);
      server = url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, ""));
    } catch {
      return void 0;
    }
    return JSON.stringify([server, workspace]);
  }
  async function getDatasourceConnectionDetails(dataSourceId, environmentId) {
    const envId = environmentId ?? await getDevelopmentEnvironmentId();
    const res = await auth.authedFetch(`/api/data-sources/${encodeURIComponent(dataSourceId)}/environment/${encodeURIComponent(envId)}`);
    await assertOk(res, "getDatasourceConnectionDetails");
    const body = await res.json();
    assertAiDatasource(body);
    if (body.id !== dataSourceId || typeof body.name !== "string" || typeof body.kind !== "string") {
      throw new Error("Cannot verify datasource identity; refusing AI access.");
    }
    datasourceIdentities.set(`${await auth.getOrganizationId()}:${dataSourceId}`, {
      name: body.name,
      kind: body.kind,
      type: body.type
    });
    const pluginId = body.pluginId ?? body.plugin_id ?? void 0;
    return {
      kind: body.kind,
      ...pluginId ? { pluginId } : {},
      options: body.options ?? {}
    };
  }
  async function testDatasourceConnection(params) {
    await assertDatasourceAllowed(params.dataSourceId, void 0, params.environmentId);
    const environmentId = params.environmentId ?? await getDevelopmentEnvironmentId();
    const res = await auth.authedFetch(`/api/data-sources/${encodeURIComponent(params.dataSourceId)}/test-connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: params.kind,
        options: params.options,
        environment_id: environmentId,
        // ToolJet validates plugin_id as a UUID; core datasources have none, so it must be
        // omitted rather than sent as null.
        ...params.pluginId ? { plugin_id: params.pluginId } : {}
      })
    });
    await assertOk(res, "testDatasourceConnection");
    return await res.json();
  }
  async function listEvents(params) {
    const qs = params.sourceId ? `?sourceId=${encodeURIComponent(params.sourceId)}` : "";
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/events${qs}`);
    await assertOk(res, "listEvents");
    const body = await res.json();
    return (Array.isArray(body) ? body : []).map((e) => ({
      id: e.id,
      name: e.name,
      index: e.index,
      event: e.event,
      sourceId: e.sourceId,
      target: e.target
    }));
  }
  async function updateEvents(params) {
    const updateType = params.updateType ?? "update";
    const events = params.events.map((e) => updateType === "reorder" ? { event_id: e.eventId, diff: { index: e.index } } : {
      event_id: e.eventId,
      diff: {
        name: e.name,
        event: e.event,
        ...e.index !== void 0 ? { index: e.index } : {}
      }
    });
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/events`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events, updateType })
    });
    await assertOk(res, "updateEvents");
    return { updated: params.events.length };
  }
  async function deleteEvent(params) {
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/events/${params.eventId}`, { method: "DELETE" });
    await assertOk(res, "deleteEvent");
    return { deleted: true };
  }
  return {
    appVersions: createAppVersionLifecycle(auth, getApp),
    workflows: createWorkflowClient(auth, config, { assertDatasourceAllowed, getQueries, listDatasources, createQuery, updateQuery, deleteQuery, getDevelopmentEnvironmentId }),
    listWorkspaces,
    useWorkspace,
    listWorkspaceApps,
    listWorkspaceUsers,
    listWorkspaceGroups,
    getWorkspaceGroup,
    listWorkspaceGroupMembers,
    createWorkspaceGroup,
    renameWorkspaceGroup,
    deleteWorkspaceGroup,
    removeWorkspaceGroupMember,
    updateWorkspaceGroupPermissions,
    duplicateWorkspaceGroup,
    listWorkspaceGroupAccess,
    listWorkspaceGroupResources,
    writeWorkspaceGroupAccess,
    inviteWorkspaceUser,
    updateWorkspaceUser,
    setWorkspaceUserArchived,
    createApp,
    createAppVersion,
    switchAppVersion,
    releaseApp,
    renameApp,
    getApp,
    getAppSummary,
    listAppPermissionSubjects,
    getAppPermission,
    setAppPermission,
    clearAppPermission,
    getAppSettings,
    listAppThemes,
    createAppTheme,
    setDefaultAppTheme,
    updateAppThemeDefinition,
    renameAppTheme,
    deleteAppTheme,
    updateAppSettings,
    getComponent,
    createPage,
    createPages,
    updatePages,
    deletePage,
    createEvents,
    hasGoogleMapsKey,
    viewerSession: (appId) => auth.viewerSession?.(appId) ?? Promise.resolve(void 0),
    renderAuditGrant: config.isOAuthDelegation ? `${config.apiUrl}\0${config.oauthGrantId}` : void 0,
    browserRenderOrigin: config.isOAuthDelegation ? new URL(config.viewerUrl || config.appUrl).origin : void 0,
    editingVersionName: async (appId) => (await getApp(appId))?.editing_version?.name ?? void 0,
    getDevelopmentEnvironmentId,
    listDatasources,
    listTables,
    createTable,
    createTables,
    addTableColumn,
    dropTableColumn,
    dropTable,
    getTableSchema,
    insertRows,
    insertRowsBatch,
    createQuery,
    createQueries,
    createComponent,
    createComponents,
    updateComponents,
    deleteComponents,
    updateLayouts,
    updateQuery,
    updateQueryDatasource,
    deleteQuery,
    getQueries,
    getQuery,
    hasRows,
    runQuery,
    assertDatasourceAllowed,
    invokeDatasourceMethod,
    getDatasourceConnectionDetails,
    getPluginSpec,
    specCacheScope,
    testDatasourceConnection,
    listEvents,
    updateEvents,
    deleteEvent
  };
}
function pageOrderIndex(page) {
  if (typeof page?.pageGroupIndex === "number" && Number.isFinite(page.pageGroupIndex))
    return page.pageGroupIndex;
  return typeof page?.index === "number" ? page.index : void 0;
}
createRequire(import.meta.url);
function listWorkspaceGroupsTool(client) {
  const schema = external_exports.object({
    group_id: external_exports.string().uuid().optional(),
    include_permissions: external_exports.boolean().optional(),
    resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional()
  }).strict();
  return {
    name: "list_workspace_groups",
    title: "List Workspace Groups",
    annotations: { readOnlyHint: true, openWorldHint: true },
    description: "List groups in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. Supply group_id to list its non-archived members with group_user_id (membership id, distinct from user_id and organization_user_id). Use include_permissions:true with group_id to read permission switches and granular access rules. Use resource_type (app/module/workflow/data_source) to discover selectable resources and their names/IDs. Use exact returned ids for group changes. Requires ToolJet admin permissions.",
    inputSchema: schema.shape,
    async handler(input) {
      try {
        const args = schema.parse(input);
        if (args.include_permissions && !args.group_id)
          throw new Error("group_id is required with include_permissions.");
        const resources = args.resource_type ? { resources: await client.listWorkspaceGroupResources(args.resource_type) } : {};
        if (!args.group_id)
          return ok({ ...args.resource_type ? {} : { groups: await client.listWorkspaceGroups() }, ...resources });
        const group = await client.getWorkspaceGroup(args.group_id);
        return ok({
          group,
          members: await client.listWorkspaceGroupMembers(args.group_id),
          ...resources,
          ...args.include_permissions ? { access_rules: await client.listWorkspaceGroupAccess(args.group_id) } : {}
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function manageWorkspaceGroupsTool(client) {
  const schema = external_exports.object({
    action: external_exports.enum(["create", "rename", "delete", "remove_member", "duplicate", "update_permissions", "create_access", "update_access", "delete_access"]),
    group_id: external_exports.string().uuid().optional(),
    name: external_exports.string().trim().min(1).max(50).optional(),
    group_user_id: external_exports.string().uuid().optional(),
    confirm: external_exports.boolean().optional(),
    permissions: external_exports.object(Object.fromEntries(WORKSPACE_PERMISSION_KEYS.map((key) => [key, external_exports.boolean().optional()]))).strict().optional(),
    copy: external_exports.object({
      permissions: external_exports.boolean().optional(),
      members: external_exports.boolean().optional(),
      apps: external_exports.boolean().optional(),
      modules: external_exports.boolean().optional(),
      workflows: external_exports.boolean().optional(),
      data_sources: external_exports.boolean().optional()
    }).strict().optional(),
    rule_id: external_exports.string().uuid().optional(),
    resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional(),
    access: external_exports.object({
      name: external_exports.string().trim().min(1).max(255).optional(),
      is_all: external_exports.boolean().optional(),
      actions: external_exports.object(Object.fromEntries(WORKSPACE_ACCESS_KEYS.map((key) => [key, external_exports.boolean().optional()]))).strict().optional(),
      resource_ids: external_exports.array(external_exports.string().uuid()).max(1e3).optional(),
      add_resource_ids: external_exports.array(external_exports.string().uuid()).min(1).max(1e3).optional(),
      remove_resource_ids: external_exports.array(external_exports.string().uuid()).min(1).max(1e3).optional()
    }).strict().optional(),
    allow_role_change: external_exports.boolean().optional()
  }).strict();
  return {
    name: "manage_workspace_groups",
    title: "Manage Workspace Groups",
    strictInput: true,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    description: "Create, rename, delete custom groups or remove a member in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. All actions require confirm:true after reviewing the exact change. create needs name; rename needs group_id and name; delete needs group_id; remove_member needs group_id and group_user_id from list_workspace_groups. Removing membership does not delete the workspace user. Deleting a group removes its memberships and permissions. duplicate needs group_id and at least one true copy flag (permissions/members/apps/modules/workflows/data_sources; omitted flags false); ToolJet assigns the copy name. update_permissions needs group_id and permissions (only supplied switches change). create_access needs group_id, resource_type and access {name,is_all,actions,resource_ids}; update_access needs group_id, rule_id and access (only supplied fields change); delete_access needs group_id and rule_id. For update/delete access, optional resource_type must match the existing rule. Read include_permissions:true first to resolve rule IDs; resource_type discovers selectable resource IDs. On update_access, use access.add_resource_ids/remove_resource_ids to change only those resources and preserve the rest. access.resource_ids is only for an explicitly requested replacement of the entire rule selection; do not combine it with add/remove_resource_ids. Resource additions/removals require a selected-resource rule; is_all:true applies to ALL current and future resources of its type. On create_access, omitted action switches are disabled. App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased. Module actions: canEdit/canView/hideFromDashboard. Workflow actions: canEdit/canView. Data source actions: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs: enabling one disables the other, including on partial updates. Disabled groups and read_only rules are not editable under the current license/plan. allow_role_change is only for permission updates and access updates, and only with explicit consent to change affected member roles. Admin permissions cannot be changed; default group names/memberships cannot be changed here. To add members use manage_workspace_users with group_ids. ToolJet admin and license checks apply.",
    inputSchema: schema.shape,
    async handler(input) {
      try {
        const args = schema.parse(input);
        if (args.confirm !== true)
          throw new Error(`${args.action} requires confirm:true after reviewing the exact change.`);
        const needsName = args.action === "create" || args.action === "rename";
        if (needsName !== (args.name !== void 0))
          throw new Error(needsName ? "name is required." : "name must be omitted.");
        if (args.action !== "create" !== (args.group_id !== void 0)) {
          throw new Error(args.action === "create" ? "group_id must be omitted for create." : "group_id is required.");
        }
        if (args.action === "remove_member" !== (args.group_user_id !== void 0)) {
          throw new Error(args.action === "remove_member" ? "group_user_id is required." : "group_user_id must be omitted.");
        }
        const expected = {
          duplicate: ["copy"],
          update_permissions: ["permissions", "allow_role_change"],
          create_access: ["resource_type", "access"],
          update_access: ["rule_id", "access", "allow_role_change", "resource_type"],
          delete_access: ["rule_id", "resource_type"]
        };
        for (const key of ["copy", "permissions", "resource_type", "access", "rule_id", "allow_role_change"]) {
          if (args[key] !== void 0 && !expected[args.action]?.includes(key))
            throw new Error(`${key} must be omitted for ${args.action}.`);
        }
        for (const key of expected[args.action] ?? []) {
          if (key !== "allow_role_change" && !(key === "resource_type" && args.action !== "create_access") && args[key] === void 0)
            throw new Error(`${key} is required.`);
        }
        if (args.permissions && !Object.keys(args.permissions).length)
          throw new Error("permissions must contain at least one switch.");
        if (args.access && !Object.keys(args.access).length)
          throw new Error("access must contain at least one change.");
        if (args.action === "create")
          return ok({ group: await client.createWorkspaceGroup(args.name) });
        const group = await client.getWorkspaceGroup(args.group_id);
        if (group.disabled === true)
          throw new Error(`Group "${group.name}" is read-only under the current license/plan.`);
        const permissionAction = ["update_permissions", "create_access", "update_access", "delete_access"].includes(args.action);
        if (group.type !== "custom" && args.action !== "duplicate" && !(permissionAction && group.name !== "admin")) {
          throw new Error("Only custom groups can be changed with this tool.");
        }
        if (args.action === "duplicate") {
          const copy = args.copy;
          if (!Object.values(copy).some((value) => value === true))
            throw new Error("Select at least one category to duplicate.");
          return ok({ group: await client.duplicateWorkspaceGroup(group.id, {
            addPermission: copy.permissions ?? false,
            addUsers: copy.members ?? false,
            addApps: copy.apps ?? false,
            addModules: copy.modules ?? false,
            addWorkflows: copy.workflows ?? false,
            addDataSource: copy.data_sources ?? false
          }) });
        }
        if (args.action === "update_permissions") {
          await client.updateWorkspaceGroupPermissions(group.id, args.permissions, args.allow_role_change);
          return ok({ group: await client.getWorkspaceGroup(group.id), updated: true });
        }
        if (["create_access", "update_access", "delete_access"].includes(args.action)) {
          const rules = await client.listWorkspaceGroupAccess(group.id);
          const rule = args.rule_id ? rules.find((item) => item.id === args.rule_id) : void 0;
          if (args.rule_id && !rule)
            throw new Error("Access rule not found in this group. Read include_permissions:true again.");
          if (rule?.read_only)
            throw new Error(rule.read_only_reason || "This access rule is read-only under the current license/plan.");
          if (rule && args.resource_type && args.resource_type !== rule.type)
            throw new Error("resource_type does not match this access rule.");
          const type = rule?.type ?? args.resource_type;
          if (args.action === "delete_access") {
            await client.writeWorkspaceGroupAccess("DELETE", group.id, type, rule.id);
            return ok({ group_id: group.id, name: group.name, rule_id: rule.id, rule_name: rule.name, deleted: true });
          }
          const access = args.access;
          const creating = args.action === "create_access";
          const delta = access.add_resource_ids !== void 0 || access.remove_resource_ids !== void 0;
          if (delta && (creating || access.resource_ids !== void 0 || access.is_all !== void 0)) {
            throw new Error("Resource additions/removals only update an existing selected-resource rule; do not combine them with resource_ids or is_all.");
          }
          if (creating && (!access.name || access.is_all === void 0 || !access.actions)) {
            throw new Error("create_access requires access.name, is_all and actions.");
          }
          const actionKeys = workspaceAccessKeys(type);
          if (access.actions && (!Object.keys(access.actions).length || Object.keys(access.actions).some((key) => !actionKeys.includes(key)))) {
            throw new Error(`Invalid actions for ${type}. Use ${actionKeys.join(", ")}.`);
          }
          const all = access.is_all ?? rule.is_all;
          const currentIds = rule?.resources.map((item) => item.id) ?? [];
          if (delta && all)
            throw new Error("An all-resource rule cannot add/remove individual resources. Explicitly choose a replacement selected-resource scope instead.");
          if (delta && (new Set(access.add_resource_ids).size !== (access.add_resource_ids?.length ?? 0) || new Set(access.remove_resource_ids).size !== (access.remove_resource_ids?.length ?? 0) || access.add_resource_ids?.some((id) => access.remove_resource_ids?.includes(id)) || access.remove_resource_ids?.some((id) => !currentIds.includes(id)))) {
            throw new Error("Use unique, non-overlapping resource additions/removals; removed resources must belong to this rule.");
          }
          const selected = delta ? [.../* @__PURE__ */ new Set([...currentIds.filter((id) => !access.remove_resource_ids?.includes(id)), ...access.add_resource_ids ?? []])] : access.resource_ids ?? (all ? [] : currentIds);
          if (new Set(selected).size !== selected.length || all && selected.length || !all && !selected.length) {
            throw new Error("Use unique resource_ids for a selected-resource rule; omit them or use [] for is_all:true.");
          }
          if (access.resource_ids || access.add_resource_ids || creating || rule?.is_all && !all) {
            const available = await client.listWorkspaceGroupResources(type);
            if (selected.some((id) => !available.some((item) => item.id === id)))
              throw new Error("Resource not found in this workspace/resource type.");
          }
          const resourceKey = type === "data_source" ? "dataSourceId" : "appId";
          const actions = { ...creating ? Object.fromEntries(actionKeys.map((key) => [key, false])) : rule.actions, ...access.actions };
          const [primary, secondary] = type === "data_source" ? ["canConfigure", "canUse"] : ["canEdit", "canView"];
          if (access.actions?.[primary] === true && access.actions?.[secondary] === void 0)
            actions[secondary] = false;
          if (access.actions?.[secondary] === true && access.actions?.[primary] === void 0)
            actions[primary] = false;
          if (actions[primary] && actions[secondary])
            throw new Error(`${primary} and ${secondary} cannot both be enabled.`);
          if (creating) {
            await client.writeWorkspaceGroupAccess("POST", group.id, type, void 0, {
              name: access.name,
              type,
              groupId: group.id,
              isAll: all,
              createResourcePermissionObject: {
                ...type === "data_source" ? { action: actions } : actions,
                resourcesToAdd: selected.map((id) => ({ [resourceKey]: id }))
              }
            });
          } else {
            const current = rule.resources;
            await client.writeWorkspaceGroupAccess("PUT", group.id, type, rule.id, {
              ...access.name !== void 0 ? { name: access.name } : {},
              isAll: all,
              actions,
              resourcesToAdd: selected.filter((id) => !current.some((item) => item.id === id)).map((id) => ({ [resourceKey]: id })),
              resourcesToDelete: current.filter((item) => !selected.includes(item.id)).map((item) => ({ id: item.membership_id })),
              allowRoleChange: args.allow_role_change ?? false
            });
          }
          return ok({ group_id: group.id, name: group.name, access_rules: await client.listWorkspaceGroupAccess(group.id) });
        }
        if (args.action === "rename") {
          await client.renameWorkspaceGroup(group.id, args.name);
          return ok({ group_id: group.id, name: args.name, renamed: true });
        }
        if (args.action === "delete") {
          await client.deleteWorkspaceGroup(group.id);
          return ok({ group_id: group.id, name: group.name, deleted: true });
        }
        const members = await client.listWorkspaceGroupMembers(group.id);
        if (!members.some((member) => member.group_user_id === args.group_user_id)) {
          throw new Error("Membership not found in this group. Use list_workspace_groups with group_id for current member ids.");
        }
        await client.removeWorkspaceGroupMember(args.group_user_id);
        return ok({ group_id: group.id, group_user_id: args.group_user_id, removed: true });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
createRequire(import.meta.url);
var requestSchema = external_exports.object({
  method: external_exports.string().min(1),
  schema: external_exports.string().optional(),
  table: external_exports.string().optional(),
  search: external_exports.string().optional(),
  page: external_exports.number().int().positive().optional(),
  limit: external_exports.number().int().positive().max(1e3).optional(),
  args: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
function invokeArgs(request) {
  const customValues = request.args?.values && typeof request.args.values === "object" && !Array.isArray(request.args.values) ? request.args.values : {};
  const values = {
    ...customValues,
    ...request.schema !== void 0 ? { schema: request.schema } : {},
    ...request.table !== void 0 ? { table: request.table } : {}
  };
  return {
    ...request.args ?? {},
    ...Object.keys(values).length ? { values } : {},
    ...request.search !== void 0 ? { search: request.search } : {},
    ...request.page !== void 0 ? { page: request.page } : {},
    ...request.limit !== void 0 ? { limit: request.limit } : {}
  };
}
var specCache = /* @__PURE__ */ new Map();
function specText(entry) {
  const raw = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  return typeof raw === "string" ? raw : void 0;
}
function parseSpecCached(options) {
  const key = specText(options.spec) ?? specText(options.definition);
  if (key === void 0)
    return extractSpec(options);
  const hit = specCache.get(key);
  if (hit)
    return hit;
  const parsed = extractSpec(options);
  if (parsed) {
    if (specCache.size > 8)
      specCache.clear();
    specCache.set(key, parsed);
  }
  return parsed;
}
function openapiIntrospection(spec, request) {
  if (request.method === "listTables") {
    const endpoints = listEndpoints(spec);
    const host2 = specHost(spec);
    const header = { total: endpoints.length, ...host2 ? { host: host2 } : {} };
    if (request.search) {
      const ranked = rankEndpoints(spec, endpoints, request.search);
      const limit2 = request.limit ?? 25;
      return {
        ...header,
        search: request.search,
        matched: ranked.length,
        ...ranked.length > limit2 ? { returned: limit2 } : {},
        // Ordered by relevance, not spec order: the caller should read from the top.
        endpoints: ranked.slice(0, limit2).map(({ score, ...endpoint }) => endpoint),
        ...ranked.length ? {} : { hint: "No endpoint matched. Retry with a broader term, or omit `search` to see the spec's tags." }
      };
    }
    const limit = request.limit ?? 200;
    if (endpoints.length > limit) {
      return {
        ...header,
        tags: endpointTagCounts(spec, endpoints),
        returned: limit,
        truncated: true,
        next_step: `This spec has ${endpoints.length} endpoints. Call listTables again with \`search\` describing what you need (a phrase is fine, it is ranked by relevance), or with a tag name from \`tags\`.`,
        endpoints: endpoints.slice(0, limit)
      };
    }
    return { ...header, endpoints };
  }
  const path = request.table ?? (typeof request.args?.path === "string" ? request.args.path : void 0);
  const method = ["operation", "method", "httpMethod", "http_method", "verb"].map((key) => request.args?.[key]).find((value) => typeof value === "string" && !!value);
  if (!path || !method) {
    throw new Error('getEndpointSchema needs the endpoint path and HTTP method: pass the path as `table` and the method as `args.operation` (for example table:"/pets/{petId}", args:{operation:"get"}); `args.httpMethod` and `args.method` are accepted too.');
  }
  const result = endpointParameters(spec, path, method);
  if (!result.found) {
    throw new Error(`The spec has no ${method.toLowerCase()} operation on path "${path}". Call listTables first.`);
  }
  const buckets = {};
  for (const parameter of result.parameters) {
    const bucket = parameter.in === "header" ? "params.header" : parameter.in === "path" ? "params.path" : parameter.in === "query" ? "params.query" : `unsupported:${parameter.in}`;
    (buckets[bucket] ??= []).push(parameter.name);
  }
  if (result.requestBody)
    buckets["params.request"] = ["<request body>"];
  const operation = method.toLowerCase();
  const host = specHost(spec);
  return {
    path,
    operation,
    /* A runnable skeleton, not just a description: copy it and fill the buckets.
       All four buckets are present even when empty because the plugin destructures every one of
       them and calls Object.entries(params.path) unguarded — omitting a bucket fails the query with
       "Cannot convert undefined or null to object" before the request is ever built. */
    query_options: {
      ...host ? { host } : {},
      path,
      operation,
      params: { request: {}, query: {}, header: {}, path: {} }
    },
    // Which query-option bucket each parameter belongs in, so the caller does not have to infer it.
    buckets,
    parameters: result.parameters,
    ...result.response ? { response: result.response } : {},
    ...result.requestBody ? { requestBody: result.requestBody } : {},
    ...host ? {} : { host_warning: 'This spec declares no server URL. The query needs an explicit `host`, or the request fails with "Invalid URL".' }
  };
}
function inspectDatasourceSchemaTool(client) {
  return {
    name: "inspect_datasource_schema",
    title: "Inspect Datasource Schema",
    // Invokes only plugin-advertised read-only metadata methods.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: 'Invoke one read-only metadata method advertised by a connected datasource plugin (for example listSchemas, listTables, listColumns, or listCollections). This avoids creating/running ad-hoc information_schema queries. HubSpot: call listTables without schema to list spec groups, then pass schema for endpoint discovery. Use get_datasource_query_schema with sections:["introspection"] to discover exact methods. Common schema/table/search/page/limit inputs are converted to ToolJet selector args; `args` adds plugin-specific fields. Only the requested metadata method is called. Use requests (up to 20) to batch independent table/column lookups after the schema/table names are known; every method is validated before any invocation.',
    inputSchema: {
      version_id: external_exports.string(),
      datasource_id: external_exports.string(),
      method: external_exports.string().min(1).optional(),
      schema: external_exports.string().optional(),
      table: external_exports.string().optional(),
      search: external_exports.string().optional(),
      page: external_exports.number().int().positive().optional(),
      limit: external_exports.number().int().positive().max(1e3).optional(),
      args: external_exports.record(external_exports.string(), external_exports.any()).optional(),
      requests: external_exports.array(requestSchema).min(1).max(20).optional()
    },
    async handler(args) {
      try {
        const datasource = (await client.listDatasources(args.version_id)).find((candidate) => candidate.id === args.datasource_id);
        if (!datasource) {
          return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
        }
        const contract = getDatasourceQuerySchema(datasource.kind);
        const kindSpec = singleSpecRef(datasource.kind);
        const methods = [.../* @__PURE__ */ new Set([...contract?.introspectionMethods ?? [], ...kindSpec ? SPEC_DISCOVERY_METHODS : []])];
        const topLevel = args.method ? [{
          method: args.method,
          schema: args.schema,
          table: args.table,
          search: args.search,
          page: args.page,
          limit: args.limit,
          args: args.args
        }] : [];
        const seenRequests = /* @__PURE__ */ new Set();
        const requests = [...args.requests ?? [], ...topLevel].filter((request) => {
          if (!request.method)
            return false;
          const key = JSON.stringify([request.method, request.schema ?? null, request.table ?? null, request.search ?? null]);
          if (seenRequests.has(key))
            return false;
          seenRequests.add(key);
          return true;
        });
        if (!requests.length) {
          return fail(new Error("Provide a `method` or a `requests` batch."));
        }
        const asBatch = !!args.requests?.length || requests.length > 1;
        const unsupported = [...new Set(requests.map((request) => request.method).filter((method) => !methods.includes(method)))];
        if (unsupported.length) {
          return fail(new Error(`Datasource kind "${datasource.kind}" does not advertise introspection method(s) ${unsupported.map((method) => `"${method}"`).join(", ")}. Available methods: ${methods.length ? methods.join(", ") : "none"}.`));
        }
        let openapiSpec;
        if (datasource.kind === "openapi") {
          const details = await client.getDatasourceConnectionDetails(args.datasource_id);
          openapiSpec = parseSpecCached(details.options);
          if (!openapiSpec) {
            return fail(new Error("This OpenAPI datasource has no readable spec stored in its options, so its endpoints cannot be listed. Re-save the datasource with a valid OpenAPI/Swagger (JSON or YAML) document."));
          }
        }
        const hubspotDocuments = /* @__PURE__ */ new Map();
        let kindSpecDocument;
        const results = await Promise.all(requests.map(async (request) => {
          if (datasource.kind === "hubspot") {
            const specs = hubspotSpecs();
            const selector = request.schema ?? request.args?.specType;
            if (!selector && request.method === "listTables") {
              return { method: request.method, result: {
                specs,
                next_step: "Choose a spec using schema (name, label or specType), then call listTables to find paths or getEndpointSchema to get query_options. Properties and Pipelines describe endpoints for discovering account-specific fields and stages."
              } };
            }
            const selected = specs.find((spec) => [spec.name, spec.label, spec.specType].includes(String(selector)));
            if (!selected)
              throw new Error("HubSpot discovery requires a known schema. Call listTables without schema to list installed spec groups.");
            if (!hubspotDocuments.has(selected.name)) {
              hubspotDocuments.set(selected.name, client.getPluginSpec("hubspot", selected.name).then((text) => {
                const spec = extractSpec({ spec: text });
                if (!spec)
                  throw new Error(`HubSpot spec "${selected.name}" is unavailable or invalid. Reinstall/update the plugin; do not invent its endpoints.`);
                return spec;
              }));
            }
            const document = await hubspotDocuments.get(selected.name);
            const result2 = openapiIntrospection(document, request);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params.header;
              delete result2.host_warning;
              result2.query_options.specType = selected.specType;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = "HubSpot fixes the API host and authentication in the plugin. The spec describes API shapes; read Properties/Pipelines endpoints to verify account-specific fields and valid stage IDs. Do not guess them.";
            }
            return { method: request.method, schema: selected.name, specType: selected.specType, result: result2 };
          }
          if (kindSpec && SPEC_DISCOVERY_METHODS.includes(request.method)) {
            kindSpecDocument ??= loadKindSpec(client, datasource.kind, kindSpec);
            const result2 = openapiIntrospection(await kindSpecDocument, request);
            if (result2.query_options) {
              delete result2.query_options.host;
              delete result2.query_options.params?.header;
              delete result2.host_warning;
              if (result2.buckets?.["params.header"])
                result2.unsupported_headers = result2.buckets["params.header"];
              result2.notes = `The ${datasource.kind} plugin fixes the API host and authentication. Copy query_options as they are; put IDs in params.path and filters in params.query, each value flat (created[gte], expand[0]): the plugin cannot send a list or an object.`;
            }
            return { method: request.method, ...request.table ? { table: request.table } : {}, result: result2 };
          }
          if (openapiSpec) {
            const result2 = openapiIntrospection(openapiSpec, request);
            return { method: request.method, ...request.table ? { table: request.table } : {}, result: result2 };
          }
          const converted = invokeArgs(request);
          const result = await client.invokeDatasourceMethod({
            dataSourceId: args.datasource_id,
            method: request.method,
            ...Object.keys(converted).length ? { args: converted } : {}
          });
          return {
            method: request.method,
            ...request.schema ? { schema: request.schema } : {},
            ...request.table ? { table: request.table } : {},
            result
          };
        }));
        const header = { datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind } };
        return asBatch ? ok({ ...header, results }) : ok({ ...header, method: results[0].method, result: results[0].result });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
createRequire(import.meta.url);
var capabilityRequestSchema = external_exports.object({
  version_id: external_exports.string().uuid()
}).strict();
var datasourceCapabilitySchema = external_exports.enum(["query", "ai-model", "email"]);
var workflowCapabilityReportSchema = external_exports.object({
  version_id: external_exports.string().uuid(),
  authorable_node_types: external_exports.array(external_exports.string()),
  datasources: external_exports.array(external_exports.object({
    id: external_exports.string(),
    name: external_exports.string(),
    kind: external_exports.string(),
    capabilities: external_exports.array(datasourceCapabilitySchema)
  }).strict())
}).strict();
var AI_DATASOURCE_KINDS = /* @__PURE__ */ new Set(["openai", "anthropic", "gemini", "mistral_ai"]);
var EMAIL_DATASOURCE_KINDS = /* @__PURE__ */ new Set(["smtp", "sendgrid", "mailgun"]);
function datasourceCapabilities(kind) {
  const capabilities = ["query"];
  if (AI_DATASOURCE_KINDS.has(kind))
    capabilities.push("ai-model");
  if (EMAIL_DATASOURCE_KINDS.has(kind))
    capabilities.push("email");
  return capabilities;
}
async function getWorkflowCapabilities(client, input) {
  const { version_id } = capabilityRequestSchema.parse(input);
  const datasources = await client.workflows.listDatasources(version_id);
  return workflowCapabilityReportSchema.parse({
    version_id,
    authorable_node_types: nodeCatalog.nodes.map((node) => node.type),
    datasources: datasources.map((datasource) => ({
      id: datasource.id,
      name: datasource.name,
      kind: datasource.kind,
      capabilities: datasourceCapabilities(datasource.kind)
    }))
  });
}
function workflowReadiness(graph, structuralErrors) {
  if (structuralErrors.length)
    return { runtime_readiness: "blocked", blockers: structuralErrors };
  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of controlFlowEdges(graph))
    adjacency.get(edge.source)?.push(edge.target);
  const reachable = /* @__PURE__ */ new Set();
  const visit = (id) => {
    if (reachable.has(id))
      return;
    reachable.add(id);
    for (const target of adjacency.get(id) ?? [])
      visit(target);
  };
  for (const start of graph.nodes.filter((node) => node.type === "input" && node.data.nodeType === "start"))
    visit(start.id);
  const blockers = [];
  for (const agent of graph.nodes.filter((node) => node.type === "agent" && reachable.has(node.id))) {
    const attachment = graph.edges.find((edge) => edge.target === agent.id && edge.targetHandle === "ai-model");
    const child = attachment && graph.nodes.find((node) => node.id === attachment.source);
    const definitionId = child?.data.idOnDefinition;
    const mapping = typeof definitionId === "string" && graph.queries.find((query2) => query2.idOnDefinition === definitionId);
    if (!attachment || !child || !mapping)
      blockers.push({
        code: "agent_missing_model",
        path: `nodes.${agent.id}.model`,
        message: "Reachable Agent requires one configured AI model attachment."
      });
  }
  return { runtime_readiness: blockers.length ? "draft_only" : "runnable", blockers };
}
var plans = /* @__PURE__ */ new Map();
var TTL = 30 * 6e4;
function prune() {
  for (const [key, plan] of plans)
    if (plan.expires <= Date.now())
      plans.delete(key);
}
async function prepare(client, workflowId, versionId, spec, ids) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.editable)
    throw new Error("Only editable draft workflow versions can be changed.");
  const [queries, datasources] = await Promise.all([client.getQueries(versionId), client.listDatasources(versionId)]);
  const compiled = compileGraph(snapshot.definition, spec, ids, new Map(datasources.map((datasource) => [datasource.id, datasource.kind])));
  const warnings = [];
  const writes = [];
  const finalDefinitionIds = new Set(compiled.graph.nodes.map((node) => node.data.idOnDefinition).filter((value) => typeof value === "string"));
  const removedDefinitionIds = new Set(snapshot.definition.nodes.map((node) => node.data.idOnDefinition).filter((value) => typeof value === "string" && !finalDefinitionIds.has(value)));
  const deletions = [];
  for (const mapping of snapshot.definition.queries) {
    if (!removedDefinitionIds.has(mapping.idOnDefinition))
      continue;
    if (compiled.graph.queries.some((retained) => retained.id === mapping.id))
      continue;
    if (deletions.some((deletion) => deletion.query_id === mapping.id))
      continue;
    const node = snapshot.definition.nodes.find((candidate) => candidate.data.idOnDefinition === mapping.idOnDefinition);
    if (!node)
      continue;
    if (!queries.some((query2) => query2.id === mapping.id))
      throw new Error(`Query ${mapping.id} is missing from the target version.`);
    deletions.push({ node_id: node.id, definition_id: mapping.idOnDefinition, query_id: mapping.id });
  }
  const claimedNames = /* @__PURE__ */ new Set();
  for (const item of compiled.query_nodes) {
    const existingMapping = snapshot.definition.queries.find((q) => q.idOnDefinition === item.definition_id);
    const oldQuery = queries.find((q) => q.id === existingMapping?.id);
    if (existingMapping && !oldQuery)
      throw new Error(`Query ${existingMapping.id} is missing from the target version.`);
    if (oldQuery && snapshot.definition.nodes.filter((n) => snapshot.definition.queries.some((q) => q.id === oldQuery.id && q.idOnDefinition === n.data.idOnDefinition)).length > 1)
      throw new Error(`Query ${oldQuery.id} is shared by multiple nodes. Shared query editing is unsupported.`);
    const input = item.role === "workflow-node" ? item.spec : void 0;
    const datasource = item.role === "agent-model" ? datasources.find((d) => d.id === item.datasource_id) : input.type === "javascript" || input.type === "loop" ? datasources.find((d) => d.kind === "runjs") : datasources.find((d) => d.id === input.datasource_id);
    const label = item.role === "agent-model" ? "Agent model" : `node ${input.ref}`;
    if (!datasource)
      throw new Error(`Datasource unavailable for ${label}.`);
    if (item.role === "agent-model" && !AI_DATASOURCE_KINDS.has(datasource.kind))
      throw new Error(`Datasource ${datasource.id} is not an AI model datasource.`);
    const kind = datasource.kind;
    const dataSourceId = datasource.id;
    const name2 = item.role === "agent-model" ? item.name : input.name;
    if (oldQuery && (oldQuery.kind !== kind || oldQuery.data_source_id !== dataSourceId))
      throw new Error(item.role === "agent-model" ? "Changing an Agent model datasource is unsupported; remove the model first, then add its replacement in a second phase." : "Changing an existing query datasource is unsupported; add a new node.");
    if (oldQuery?.name !== void 0 && oldQuery.name !== name2)
      throw new Error(item.role === "agent-model" ? "Renaming an Agent model query is unsupported; remove the model first, then add its replacement in a second phase." : "Renaming existing queries is unsupported because code references cannot be rewritten safely.");
    if (claimedNames.has(name2) || queries.some((q) => q.name === name2 && q.id !== oldQuery?.id))
      throw new Error(`Duplicate query name: ${name2}`);
    claimedNames.add(name2);
    const requestedOptions = item.role === "agent-model" ? item.options : input.type === "javascript" || input.type === "loop" ? { ...oldQuery?.options ?? {}, code: input.code } : input.options;
    const options = item.role === "agent-model" ? structuredClone(requestedOptions) : normalizeQueryOptions(kind, requestedOptions);
    if (item.role === "workflow-node" && kind === "runjs")
      assertWorkflowJavaScript(options.code, label);
    if (item.role === "workflow-node") {
      const validation2 = validateQueryOptions(kind, options, "workflow");
      if (validation2.errors.length)
        throw new Error(issueMessages(validation2.errors).join(" "));
      warnings.push(...issueMessages(validation2.warnings));
    }
    writes.push({ node_id: item.node_id, definition_id: item.definition_id, existing_id: oldQuery?.id, name: name2, dataSourceId: dataSourceId ?? "", kind, options });
    if (!existingMapping && !compiled.graph.queries.some((mapping) => mapping.idOnDefinition === item.definition_id))
      compiled.graph.queries.push({ idOnDefinition: item.definition_id, id: `pending:${item.node_id}` });
  }
  const queryIds = /* @__PURE__ */ new Set([...queries.map((q) => q.id), ...writes.filter((q) => !q.existing_id).map((q) => `pending:${q.node_id}`)]);
  const validation = validateGraph(compiled.graph, queryIds);
  const readiness = workflowReadiness(compiled.graph, validation.errors);
  return { snapshot, compiled, writes, deletions, validation, readiness, warnings };
}
async function lint(client, workflowId, versionId, spec, allowDraft = false) {
  const prepared = await prepare(client, workflowId, versionId, spec);
  if (prepared.validation.errors.length || prepared.readiness.runtime_readiness === "draft_only" && !allowDraft)
    return { ...prepared.validation, ...prepared.readiness, query_warnings: prepared.warnings };
  prune();
  while (plans.size >= 200)
    plans.delete(plans.keys().next().value);
  const token = randomUUID();
  plans.set(token, { scope: await client.planScope(), workflowId, versionId, spec: structuredClone(spec), ids: prepared.compiled, allowDraft, expires: Date.now() + TTL });
  return {
    plan_token: token,
    expires_in_seconds: TTL / 1e3,
    node_ids: prepared.compiled.node_ids,
    edge_ids: prepared.compiled.edge_ids,
    ...prepared.validation,
    ...prepared.readiness,
    query_warnings: prepared.warnings,
    changes: { node_upserts: spec.nodes.length, edge_upserts: spec.edges.length, node_removals: spec.remove_node_ids, edge_removals: spec.remove_edge_ids, queries: [...prepared.writes.map((q) => ({ name: q.name, operation: q.existing_id ? "update" : "create" })), ...prepared.deletions.map((q) => ({ query_id: q.query_id, operation: "delete" }))] }
  };
}
async function apply(client, token) {
  prune();
  const scope = await client.planScope();
  const plan = plans.get(token);
  if (!plan || plan.scope !== scope)
    throw new Error("Unknown, expired, consumed, or differently scoped plan. Run lint_workflow_spec again.");
  plans.delete(token);
  const { compiled, snapshot, writes, deletions, validation, readiness } = await prepare(client, plan.workflowId, plan.versionId, plan.spec, plan.ids);
  if (validation.errors.length)
    throw new Error(JSON.stringify(validation.errors));
  if (readiness.runtime_readiness === "draft_only" && !plan.allowDraft)
    throw new Error(JSON.stringify(readiness.blockers));
  const completed = [];
  let phase = "queries";
  let attemptedQuery;
  try {
    for (const write of writes) {
      attemptedQuery = { name: write.name, node_id: write.node_id, existing_id: write.existing_id };
      const result = write.existing_id ? await client.updateQuery({ queryId: write.existing_id, versionId: plan.versionId, name: write.name, options: write.options }) : await client.createWorkflowQuery({ workflowId: plan.workflowId, versionId: plan.versionId, name: write.name, dataSourceId: write.dataSourceId || void 0, kind: write.kind, options: write.options });
      completed.push({ operation: write.existing_id ? "update" : "create", query_id: result.query_id, node_id: write.node_id });
      compiled.graph.queries = compiled.graph.queries.filter((q) => q.idOnDefinition !== write.definition_id);
      compiled.graph.queries.push({ idOnDefinition: write.definition_id, id: result.query_id });
      attemptedQuery = void 0;
    }
    phase = "save";
    await client.save(snapshot, compiled.graph);
    phase = "readback";
    const [saved, queries] = await Promise.all([client.get(plan.workflowId, plan.versionId), client.getQueries(plan.versionId)]);
    const validation2 = validateGraph(saved.definition, new Set(queries.map((q) => q.id)));
    if (!isDeepStrictEqual(saved.definition, compiled.graph))
      throw new Error("Saved definition differs from the intended graph. Inspect get_workflow before retrying.");
    for (const write of writes) {
      const id = completed.find((q) => q.node_id === write.node_id).query_id;
      const persisted = queries.find((q) => q.id === id);
      if (!persisted || persisted.name !== write.name || persisted.kind !== write.kind || persisted.data_source_id !== write.dataSourceId || !isDeepStrictEqual(persisted.options, write.options))
        throw new Error(`Query ${id} readback differs from intended datasource, kind, name, or options.`);
    }
    if (validation2.errors.length)
      throw new Error(JSON.stringify(validation2.errors));
    phase = "query_deletions";
    for (const deletion of deletions) {
      attemptedQuery = { name: deletion.query_id, node_id: deletion.node_id, existing_id: deletion.query_id };
      await client.deleteQuery({ queryId: deletion.query_id, versionId: plan.versionId });
      completed.push({ operation: "delete", query_id: deletion.query_id, node_id: deletion.node_id });
      attemptedQuery = void 0;
    }
    return { workflow_id: plan.workflowId, version_id: plan.versionId, editor_url: saved.editor_url, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids, completed, validation: validation2, ...readiness };
  } catch (error) {
    return {
      failed: true,
      workflow_id: plan.workflowId,
      version_id: plan.versionId,
      phase,
      completed,
      attempted_query: attemptedQuery,
      node_ids: compiled.node_ids,
      edge_ids: compiled.edge_ids,
      graph_persistence: phase === "queries" ? "not_attempted" : phase === "save" ? "unknown" : "saved",
      error: error instanceof Error ? error.message : String(error),
      recovery: "Inspect get_workflow and its queries; reuse persisted IDs when replanning. Do not repeat creation blindly. No resources were automatically deleted."
    };
  }
}
async function deleteNode(client, workflowId, versionId, nodeId) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.definition.nodes.some((node) => node.id === nodeId))
    throw new Error(`Unknown workflow node: ${nodeId}`);
  const spec = specSchema.parse({ remove_node_ids: [nodeId], remove_edge_ids: snapshot.definition.edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).map((edge) => edge.id) });
  const result = await lint(client, workflowId, versionId, spec, true);
  if (!("plan_token" in result))
    throw new Error(JSON.stringify({ errors: result.errors, blockers: result.blockers }));
  return apply(client, result.plan_token);
}
createRequire(import.meta.url);
var name = external_exports.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/).refine((v) => !["__proto__", "prototype", "constructor"].includes(v));
var editContractSchema = external_exports.object({
  source_query: name.describe("Already-loaded bounded raw row-array query; never a display projection."),
  table_component: name,
  id_field: name.default("id"),
  prefix: name.describe("Unique prefix for generated snapshot/draft variables and RunJS query names."),
  fields: external_exports.array(external_exports.object({
    field: name,
    component: name,
    type: external_exports.enum(["text", "number", "date_only", "boolean"]),
    required: external_exports.boolean().default(false),
    nullable: external_exports.boolean().default(false).describe("Opt in to clearing to null; a user change event is also required."),
    trim: external_exports.boolean().default(false),
    choices: external_exports.union([
      external_exports.array(external_exports.object({ label: external_exports.string(), value: external_exports.union([external_exports.string(), external_exports.number().finite()]) }).strict()).min(1).max(100),
      external_exports.object({ query: name, value_field: name, label_field: name }).strict()
    ]).optional().describe("Opt-in DropdownV2 for text/number fields: literal label/value options or an already-loaded bounded raw option query. Values must match the declared field type.")
  })).min(1).max(40)
}).strict();
function canonical(value, field) {
  if (value === void 0)
    throw new Error(`Missing input: ${field.field}`);
  if (value === null || value === "") {
    if (field.required)
      throw new Error(`Required field: ${field.field}`);
    if (value === null && !field.nullable)
      throw new Error(`Null not allowed: ${field.field}`);
    return value;
  }
  if (field.type === "text") {
    if (typeof value !== "string")
      throw new Error(`Expected text: ${field.field}`);
    if (field.required && !value.trim())
      throw new Error(`Required field: ${field.field}`);
    return field.trim ? value.trim() : value;
  }
  if (field.type === "boolean") {
    if (typeof value !== "boolean")
      throw new Error(`Expected boolean: ${field.field}`);
    return value;
  }
  if (field.type === "number") {
    if (typeof value !== "number" && typeof value !== "string" || typeof value === "string" && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value)))
      throw new Error(`Expected finite number: ${field.field}`);
    return Number(value);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    throw new Error(`Expected ISO date: ${field.field}`);
  }
  const day = value.slice(0, 10);
  const parsed = /* @__PURE__ */ new Date(day + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day || !Number.isFinite(Date.parse(value))) {
    throw new Error(`Invalid date: ${field.field}`);
  }
  return day;
}
function generateEditContract(input) {
  const spec = editContractSchema.parse(input);
  for (const key of ["field", "component"]) {
    if (new Set(spec.fields.map((f) => f[key])).size !== spec.fields.length)
      throw new Error(`Duplicate ${key} in edit contract`);
  }
  if (spec.fields.some((f) => f.field === spec.id_field))
    throw new Error("The stable primary key cannot be edited");
  if (spec.fields.some((f) => f.required && f.nullable))
    throw new Error("A required field cannot be nullable");
  for (const f of spec.fields)
    if (f.choices) {
      if (!["text", "number"].includes(f.type))
        throw new Error("Choices require a text or number field");
      if (Array.isArray(f.choices)) {
        if (f.choices.some((o) => typeof o.value !== (f.type === "text" ? "string" : "number")))
          throw new Error("Choice values must match field type");
        if (new Set(f.choices.map((o) => o.value)).size !== f.choices.length)
          throw new Error("Duplicate choice value");
      }
    }
  const snapshot = `${spec.prefix}Snapshot`, draft = `${spec.prefix}Draft`;
  const openName = `${spec.prefix}Open`, prepareName = `${spec.prefix}Prepare`;
  const q = JSON.stringify;
  const helpers = `const canonical = ${canonical.toString()};
const fields = ${q(spec.fields)};
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
`;
  const openCode = helpers + `await actions.setVariable(${q(snapshot)}, null);
await actions.setVariable(${q(draft)}, null);
const selection = components.${spec.table_component}.selectedRow;
const id = selection && selection[${q(spec.id_field)}];
if ((typeof id !== 'string' && typeof id !== 'number') || id === '' || (typeof id === 'number' && !Number.isFinite(id))) throw new Error('Select a record first');
const rows = queries.${spec.source_query}.data;
if (!Array.isArray(rows)) throw new Error('Raw records are not loaded');
const matches = rows.filter(r => r && own(r, ${q(spec.id_field)}) && r[${q(spec.id_field)}] === id);
if (matches.length !== 1) throw new Error('Expected exactly one raw record for the selected ID');
const values = {};
for (const field of fields) {
  if (!own(matches[0], field.field)) throw new Error('Raw record omits: ' + field.field);
  // Existing incomplete records must be openable for correction. Validate required
  // values on Prepare, not before the user can edit them.
  values[field.field] = canonical(matches[0][field.field], { ...field, required: false, nullable: true });
}
await actions.setVariable(${q(snapshot)}, { id, values });
return { id };`;
  const prepareCode = helpers + `const snapshot = variables.${snapshot};
const draft = variables.${draft};
const selection = components.${spec.table_component}.selectedRow;
if (!snapshot || !selection || selection[${q(spec.id_field)}] !== snapshot.id) throw new Error('Reopen the selected record before saving');
if (draft && draft.id !== snapshot.id) throw new Error('Draft belongs to another record');
const changes = draft ? draft.values : {};
if (!changes || typeof changes !== 'object' || Array.isArray(changes)) throw new Error('Invalid draft');
const patch = {};
for (const key of Object.keys(changes)) if (!fields.some(f => f.field === key)) throw new Error('Unknown draft field: ' + key);
for (const field of fields) {
  if (!own(snapshot.values, field.field)) throw new Error('Incomplete edit snapshot');
  if (!own(changes, field.field)) {
    canonical(snapshot.values[field.field], field);
    continue;
  }
  const raw = changes[field.field];
  let value = canonical(raw, field);
  if (value === '' && field.type !== 'text') value = null;
  if (value === '' || value === null) {
    if (!field.nullable) throw new Error('Clearing is not allowed: ' + field.field);
    value = null;
  }
  if (value !== snapshot.values[field.field]) patch[field.field] = value;
}
return { id: snapshot.id, patch, changed: Object.keys(patch).length > 0 };`;
  const inputs = spec.fields.map((f) => {
    const type = f.choices ? "DropdownV2" : { text: "TextInput", number: "NumberInput", date_only: "DatePickerV2", boolean: "Checkbox" }[f.type];
    const initialKey = f.choices ? "schema" : ["date_only", "boolean"].includes(f.type) ? "defaultValue" : "value";
    const exposed = f.type === "date_only" ? "selectedDate" : "value";
    const trigger = f.choices || f.type === "date_only" ? "onSelect" : "onChange";
    const schema = getComponentSchema(type);
    if (!schema?.properties.some((p) => p.key === initialKey) || !schema.events?.some((e) => e.id === trigger))
      throw new Error(`Unsupported edit adapter: ${type}`);
    const initial = `variables.${snapshot} && variables.${snapshot}.values[${q(f.field)}]`;
    let value = `{{${initial} != null ? variables.${snapshot}.values[${q(f.field)}] : ${f.type === "boolean" ? "false" : "''"}}}`;
    if (f.choices) {
      const options = Array.isArray(f.choices) ? q(f.choices) : `(queries.${f.choices.query}.data || []).map(r=>({label:r[${q(f.choices.label_field)}],value:r[${q(f.choices.value_field)}]}))`;
      value = `{{(${options}).map(option=>({label:option.label,value:option.value,visible:true,default:!!variables.${snapshot} && option.value === variables.${snapshot}.values[${q(f.field)}]}))}}`;
    }
    const exposedValue = `components.${f.component}.${exposed}`;
    const changedValue = f.choices && f.nullable ? `(${exposedValue} == null ? null : ${exposedValue})` : exposedValue;
    const draftValue = `{{({id:variables.${snapshot}.id,values:Object.assign({},variables.${draft} && variables.${draft}.id === variables.${snapshot}.id ? variables.${draft}.values : {},{${q(f.field)}:${changedValue}})})}}`;
    return {
      name: f.component,
      type,
      properties: { [initialKey]: value, ...f.choices ? { advanced: "{{true}}", showClearBtn: f.nullable } : {}, ...f.type === "date_only" ? { dateFormat: "YYYY-MM-DD" } : {} },
      validation: { mandatory: f.required },
      events: [{ source_ref: f.component, source_type: "component", trigger, action: {
        actionId: "set-custom-variable",
        key: draft,
        value: draftValue,
        runOnlyIf: `{{!!variables.${snapshot}}}`
      } }]
    };
  });
  return {
    queries: [
      { name: openName, kind: "runjs", options: { code: openCode } },
      { name: prepareName, kind: "runjs", options: { code: prepareCode } }
    ],
    inputs,
    mutation_contract: {
      id: `{{queries.${prepareName}.data.id}}`,
      patch: `{{queries.${prepareName}.data.patch}}`,
      runOnlyIf: `{{queries.${prepareName}.data && queries.${prepareName}.data.changed === true}}`
    },
    wiring: [
      `Run ${openName} on Edit; open the editor only on its success. Merge the returned input properties and change events into your native layout. Never use display selectedRow fields as defaults.`,
      `Run ${prepareName} on Save; run a datasource-specific PATCH/update ONLY on its success and with mutation_contract.runOnlyIf. No change means no write. Bind the ID and patch from mutation_contract; never expand missing patch keys to null or empty strings.`,
      "Gate Save while open/prepare/write are loading. Preserve the editor on failure. Refresh affected queries and close/reset only after the actual mutation succeeds; refresh actions are not assumed to complete in order."
    ],
    limitations: [
      "Requires an already-loaded bounded raw row array and a single stable scalar ID. This generates wiring only; it does not create resources or persist data.",
      "Only text, finite number, ISO date-only and boolean fields are covered; text/number fields can opt into dropdown choices. Required/nullable/trim are explicit opt-ins; domain constraints, authorization and optimistic concurrency must be enforced separately.",
      "Dropdown option queries must already return bounded raw arrays with matching ID types and include the current value, including inactive owners when necessary. Missing options are not permission to clear stored relationships. Validate membership/authorization separately; this helper does not create or execute option queries.",
      "Draft tracks native change events, not every displayed input value. Programmatic field changes must update the draft explicitly. Browser-verify that all change events fire, including both checkbox transitions."
    ]
  };
}
export {
  generateEditContract as A,
  TOOLJET_DB_DATA_TYPES as T,
  normalizeType as a,
  booleanBindingValue as b,
  completedPartialWrites as c,
  specSchema as d,
  createClient as e,
  fail as f,
  inspectDatasourceSchemaTool as g,
  nodeCatalog as h,
  invalidSeedTimestamps as i,
  capabilityRequestSchema as j,
  getWorkflowCapabilities as k,
  listWorkspaceGroupsTool as l,
  manageWorkspaceGroupsTool as m,
  normalizeComponentSpec as n,
  ok as o,
  lint as p,
  apply as q,
  resolveRef as r,
  strictEntry as s,
  tableQuotaError as t,
  updateComponentsTool as u,
  validateTableBatch as v,
  deleteNode as w,
  validateGraph as x,
  ToolJetHttpError as y,
  editContractSchema as z
};
