import { createRequire } from "node:module";
import { g as getComponentSchema, C as COMPONENT_FX_UPDATE_GUIDANCE, b as getCatalog, c as getLegacyComponentReplacement } from "./chunk-CmizjRXJ.js";
import { i as isMisplacedStyleKey, P as PROPERTY_KEY_ALIASES, r as retiredUi2Name, S as STYLE_KEYS_IN_PROPERTIES, n as nearestCatalogKey, d as decodeComponentParent, c as componentSlotSchema, a as componentNameSchema, b as componentNameError, e as resolveParentRef, f as encodeComponentParent, g as introducedLintFindings, l as lintComponentSpec, h as lintComponentSlots, j as lintUnusableTextGeometry, k as lintStandardSingleLineInputHeight, m as lintTextGeometry, o as lintRenderedGeometry, p as lintKanbanInteractions, q as lintShadKanbanCards, s as lintShadScheduleScale } from "./chunk-CzEla2h4.js";
import { b0 as external_exports, b7 as fail, b8 as ok } from "./chunk-Csl8mO51.js";
import { n as suggestedHtmlHeight } from "./chunk-CH7Qaiw9.js";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, statSync, readdirSync, renameSync, lstatSync, realpathSync, utimesSync, openSync, closeSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, relative, sep, dirname, resolve, basename, isAbsolute } from "node:path";
createRequire(import.meta.url);
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
    const canonical = entry !== null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry : { value: entry };
    value[key] = canonical;
    if (canonical !== entry)
      patch[key] = canonical;
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
var MONEY_WORDS = /\b(price|amount|cost|total|revenue|balance|fee|fees|spend|spent|salary|budget|paid|payment|invoice|subtotal|tax|refund|value|mrr|arr)\b/i;
var PERSON_WORDS = /\b(customer|client|requester|requestor|owner|assignee|assigned to|contact|lead|member|patient|guest|organi[sz]er|employee|technician|tech|agent|rep|student|author|reporter|host|driver|candidate|applicant|tenant|buyer|seller|manager|person|attendee|trainer|coach|instructor|doctor|vet|veterinarian|nurse|resident|full name|customer name|contact name)\b/i;
var UNIT_WORDS = /\b(min|mins|minutes?|hours?|hrs?|days?|weeks?|time|count|qty|quantity|servings?|units?|items?|points?|score|percent|pct|kg|lbs?|reps?|sets?|seats?|guests?|nights?|orders?|tickets?|visits?)\b/i;
var COUNT_WORDS = /\b(min|mins|minutes?|hours?|hrs?|count|qty|quantity|servings?|units?|items?|points?|score|percent|pct|kg|lbs?|reps?|sets?|seats?|guests?|nights?|orders?|tickets?|visits?|jobs?|rate)\b/i;
var STATE_WORDS = /\b(status|stage|state|priority|severity|availability|health|risk|condition)\b/i;
var AMBIGUOUS_MONEY_WORDS = /\b(total|totals|value)\b/gi;
var COUNTED_NOUNS = /\b(clients?|clientes?|customers?|users?|usu[aá]rios?|members?|membros?|miembros?|patients?|pacientes?|leads?|accounts?|contas?|cuentas?|vendors?|suppliers?|fornecedor(es)?|proveedor(es)?|employees?|funcion[aá]rios?|empleados?|staff|people|pessoas|personas|students?|alunos?|estudiantes?|contacts?|contatos?|contactos?|compan(y|ies)|empresas?|projects?|projetos?|proyectos?|tasks?|tarefas?|tareas?|bugs?|issues?|requests?|pedidos?|solicita[cç](ão|ões|ión|iones)|records?|registros?|rooms?|salas?|bookings?|reservations?|reservas?|appointments?|agendamentos?|consultas?|citas?|recipes?|receitas?|recetas?|ingredients?|ingredientes?|products?|produtos?|productos?|assets?|ativos?|devices?|dispositivos?|vehicles?|ve[ií]culos?|audits?|auditorias?|findings?|cases?|casos?|deals?|negócios?|events?|eventos?)\b/i;
var countLabel = (label) => {
  if (COUNT_WORDS.test(label))
    return true;
  return !MONEY_WORDS.test(label.replace(AMBIGUOUS_MONEY_WORDS, " ")) && COUNTED_NOUNS.test(label);
};
function plannedCurrency(components) {
  for (const component of components) {
    if (component.type !== "ShadStat")
      continue;
    const currency = propValue(component.properties ?? {}, "currency");
    if (typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim()))
      return currency.trim().toUpperCase();
  }
  return void 0;
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
  if (section === "properties" && retiredUi2Name(type, "properties", key))
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
function packValueAsDefault(type, name, properties) {
  if (!properties || properties.value === void 0)
    return { properties };
  const schema = type ? getComponentSchema(type) : void 0;
  const keys = new Set((schema?.properties ?? []).map((entry) => entry.key));
  if (!schema?.pack || !keys.has("defaultValue") || keys.has("value"))
    return { properties };
  const { value, ...rest } = properties;
  if (rest.defaultValue !== void 0) {
    return { properties: rest, warning: `${type} "${name}": dropped properties.value, the input's runtime value; it starts from defaultValue.` };
  }
  return {
    properties: { ...rest, defaultValue: value },
    warning: `${type} "${name}": moved properties.value to defaultValue, where the input takes its starting value from.`
  };
}
function normalizeComponentSpec(component, options = {}) {
  const normalizedSections = Object.fromEntries(["properties", "styles", "validation", "others"].map((section) => [
    section,
    normalizeSection(component[section])
  ]));
  const warnings = [];
  const packValue = packValueAsDefault(component.type, component.name, normalizedSections.properties.value);
  if (packValue.warning)
    warnings.push(packValue.warning);
  const properties = { ...packValue.properties ?? {} };
  const propertyPatch = {};
  const stylePatch = {};
  const setProperty = (key, value) => {
    const current2 = properties[key];
    const wrapped = current2 && typeof current2 === "object" && !Array.isArray(current2) ? { ...current2, value } : { value };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
  };
  const stylesValue = normalizedSections.styles.value ?? {};
  let stylesChanged = false;
  const setStyle = (key, value) => {
    const current2 = stylesValue[key];
    stylesValue[key] = current2 && typeof current2 === "object" && !Array.isArray(current2) ? { ...current2, value } : { value };
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
    const canonical = aliasTarget ?? key;
    const belongsInStyles = canonical !== "styles" && (isMisplacedStyleKey(component.type, canonical) || !!aliasTarget && !!knownStyleKeys?.has(canonical) && !knownPropertyKeys?.has(canonical));
    if (!aliasTarget && !belongsInStyles)
      continue;
    if (belongsInStyles) {
      if (stylesValue[canonical] === void 0)
        stylesValue[canonical] = properties[key];
      delete properties[key];
      stylesChanged = true;
      warnings.push(`${component.type} "${component.name}": moved ${aliasTarget ? `alias "${key}"` : `style key "${key}"`} to styles.${canonical} (ToolJet reads it from styles, not properties).`);
    } else if (canonical !== key) {
      if (properties[canonical] === void 0)
        properties[canonical] = properties[key];
      delete properties[key];
      warnings.push(`${component.type} "${component.name}": renamed alias "${key}" to "${canonical}".`);
    }
  }
  if (schema && options.stripUnknownKeys) {
    for (const key of Object.keys(stylesValue)) {
      if (knownStyleKeys.has(key) || !knownPropertyKeys.has(key))
        continue;
      if (properties[key] === void 0) {
        properties[key] = stylesValue[key];
        propertyPatch[key] = stylesValue[key];
      }
      delete stylesValue[key];
      stylesChanged = true;
      warnings.push(`${component.type} "${component.name}": moved styles.${key} to properties.${key} (ToolJet reads it from properties for ${component.type}).`);
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
      const current2 = propValue(validation, key);
      if (validation[key] !== void 0 && current2 !== value)
        continue;
      validation[key] = properties[key];
      normalizedSections.validation.value = validation;
      normalizedSections.validation.patch = { ...normalizedSections.validation.patch, [key]: validation[key] };
      delete properties[key];
      warnings.push(`NumberInput "${component.name}": moved properties.${key} to validation.${key}, where the renderer reads the bound.`);
    }
  }
  for (const key of CLIENT_SERVER_BOOLEAN_KEYS) {
    const current2 = propValue(properties, key);
    if (current2 !== "clientSide" && current2 !== "serverSide")
      continue;
    setProperty(key, current2 === "serverSide");
    warnings.push(`${component.name} "${key}": normalized ${JSON.stringify(current2)} to a boolean ToolJet binding.`);
  }
  if (component.type === "FlexContainer") {
    const card = propValue(properties, "cardStyle");
    if (card === "shadcnCard" && !isTruthy(propValue(properties, "dynamicHeight"))) {
      setProperty("dynamicHeight", "{{true}}");
    }
  }
  if (component.type === "Table") {
    const lookEntry0 = stylesValue.tableLook;
    const look0 = lookEntry0 && typeof lookEntry0 === "object" ? lookEntry0.value : lookEntry0;
    const height = (component.layouts?.desktop ?? component.layout)?.height;
    const staticNumber = (v) => {
      const m = typeof v === "number" ? String(v) : typeof v === "string" ? /^\s*(?:\{\{\s*)?(\d+)\s*(?:\}\})?\s*$/.exec(v)?.[1] : void 0;
      return m !== void 0 ? Number(m) : void 0;
    };
    const isFalse = (v) => v === false || typeof v === "string" && /^\s*(\{\{\s*)?false(\s*\}\})?\s*$/.test(v);
    if (look0 === "shadcn" && properties.dynamicHeight === void 0) {
      setProperty("dynamicHeight", "{{true}}");
    }
    if (look0 === "shadcn" && typeof height === "number" && !isTruthy(propValue(properties, "dynamicHeight")) && !isTruthy(propValue(properties, "serverSidePagination")) && !isFalse(propValue(properties, "enablePagination"))) {
      const rowsPerPage = staticNumber(propValue(properties, "rowsPerPage")) ?? 10;
      const toolbar = isFalse(propValue(properties, "displaySearchBox")) ? 0 : 64;
      const cellEntry = stylesValue.cellSize;
      const cellSize = cellEntry && typeof cellEntry === "object" ? cellEntry.value : cellEntry;
      const rowPx = cellSize === "condensed" ? 40 : 46;
      const fit = Math.floor((height - toolbar - 41 - 47) / rowPx);
      if (fit < rowsPerPage) {
        if (fit >= 3) {
          setProperty("rowsPerPage", `{{${fit}}}`);
          warnings.push(`Table "${component.name}": height ${height}px fits ${fit} rows; rowsPerPage is now ${fit} so no row is cut off.`);
        } else {
          setProperty("dynamicHeight", "{{true}}");
          warnings.push(`Table "${component.name}": height ${height}px fits fewer than 3 rows; dynamicHeight is on so the table fits its rows.`);
        }
      }
    }
    if (look0 === "shadcn" && properties.highlightSelectedRow === void 0 && !isTruthy(propValue(properties, "showBulkSelector")) && !isFalse(propValue(properties, "allowSelection"))) {
      setProperty("highlightSelectedRow", "{{true}}");
    }
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
      const lookEntry = stylesValue.tableLook;
      const shadcnLook = (lookEntry && typeof lookEntry === "object" ? lookEntry.value : lookEntry) === "shadcn";
      const wrapNow = stylesValue.contentWrap?.value ?? stylesValue.contentWrap;
      const multiLine = columns.some((c) => c && typeof c === "object" && !Array.isArray(c) && c.columnVisibility !== false && ["html", "text", "json", "image", "markdown"].includes(String(c.columnType)));
      if (shadcnLook && multiLine && wrapNow === false)
        setStyle("contentWrap", true);
      else if (shadcnLook && !multiLine && wrapNow !== false)
        setStyle("contentWrap", false);
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
        if (shadcnLook && column && typeof column === "object" && !Array.isArray(column) && column.columnType === "datepicker" && !isTruthy(column.isEditable) && /^Y{4}[-/]MM[-/]DD$/.test(String(column.dateFormat ?? "").trim())) {
          changedColumns = true;
          const entry = column;
          column = { ...entry, parseDateFormat: entry.parseDateFormat ?? entry.dateFormat, dateFormat: "MMM D, YYYY" };
        }
        if (column && typeof column === "object" && !Array.isArray(column) && column.columnType === "newMultiSelect" && !isTruthy(column.isEditable) && /^(status|severity|priority|stage|state|level|risk)$/i.test(String(column.key ?? column.name ?? "").replace(/[_\s-]+/g, ""))) {
          changedColumns = true;
          const entry = column;
          warnings.push(`Table "${component.name}" column "${entry.name ?? entry.key}": a single state per row; columnType is now "select" (a multi-select shows "Select.." for a single value).`);
          column = { ...entry, columnType: "select" };
        }
        if (shadcnLook && column && typeof column === "object" && !Array.isArray(column) && column.columnType === "number" && (column.horizontalAlignment === void 0 || column.thousandSeparator === void 0)) {
          changedColumns = true;
          const entry = column;
          column = {
            ...entry,
            horizontalAlignment: entry.horizontalAlignment ?? "right",
            thousandSeparator: entry.thousandSeparator ?? true
          };
        }
        if (shadcnLook && column && typeof column === "object" && !Array.isArray(column)) {
          const entry = column;
          const words = `${String(entry.key ?? "")} ${String(entry.name ?? "")}`.replace(/[_-]+/g, " ");
          const next = { ...entry };
          if (entry.columnType === "number" && entry.decimalPlaces === void 0 && MONEY_WORDS.test(words) && !UNIT_WORDS.test(words)) {
            next.decimalPlaces = 2;
          }
          if (["string", void 0].includes(entry.columnType) && entry.displayAsChip === void 0 && !isTruthy(entry.isEditable) && STATE_WORDS.test(words)) {
            next.displayAsChip = true;
          }
          const size = Number(entry.columnSize);
          const label = String(entry.name ?? entry.key ?? "");
          if (Number.isFinite(size) && size > 0 && label) {
            const email = /\be ?mail\b/i.test(words) ? 240 : 0;
            const chip = next.displayAsChip === true || entry.displayAsChip === true ? 140 : 0;
            const needed = Math.max(email, chip, Math.ceil(label.length * 7.5) + 32 + (isTruthy(entry.isEditable) ? 18 : 0));
            if (size < needed)
              next.columnSize = needed;
          }
          if (entry.columnType === "button" && Array.isArray(entry.buttons)) {
            const buttons = entry.buttons.map((button) => {
              if (!button || typeof button !== "object" || Array.isArray(button))
                return button;
              const b = button;
              const bg = b.buttonBackgroundColor;
              const defaultBg = bg === void 0 || ["#4368E3", "#4368e3", "var(--cc-primary-brand)"].includes(String(bg));
              return (b.buttonType === void 0 || b.buttonType === "solid") && defaultBg ? { ...b, buttonType: "outline" } : button;
            });
            if (buttons.some((b, i) => b !== entry.buttons[i]))
              next.buttons = buttons;
          }
          if (Object.keys(next).some((k) => next[k] !== entry[k])) {
            changedColumns = true;
            column = next;
          }
        }
        return column;
      });
      if (shadcnLook) {
        const visible = repairedColumns.filter((c) => !!c && typeof c === "object" && !Array.isArray(c) && c.columnVisibility !== false);
        const width = (c) => Number(c.columnSize) > 0 ? Number(c.columnSize) : 120;
        const total = visible.reduce((sum, c) => sum + width(c), 0);
        if (visible.length > 1 && total > 1240) {
          const factor = 1240 / total;
          const floor = (c) => c.columnType === "button" ? 110 : Math.max(/\be ?mail\b/i.test(`${String(c.key ?? "")} ${String(c.name ?? "")}`.replace(/[_-]+/g, " ")) ? 240 : 64, Math.ceil(String(c.name ?? c.key ?? "").length * 7.5) + 32);
          for (let i = 0; i < repairedColumns.length; i++) {
            const c = repairedColumns[i];
            if (!visible.includes(c))
              continue;
            repairedColumns[i] = { ...c, columnSize: Math.max(floor(c), Math.floor(width(c) * factor)) };
          }
          changedColumns = true;
          warnings.push(`Table "${component.name}": its visible columns (${total}px) were wider than a page; they now scale to fit about 1240px.`);
        }
      }
      if (shadcnLook) {
        const index = repairedColumns.findIndex((c) => {
          if (!c || typeof c !== "object" || Array.isArray(c))
            return false;
          const entry2 = c;
          const words = `${String(entry2.key ?? "")} ${String(entry2.name ?? "")}`.replace(/[_-]+/g, " ");
          return entry2.columnVisibility !== false && ["string", void 0].includes(entry2.columnType) && PERSON_WORDS.test(words) && !/\b(e ?mail|id|phone|count|type|notes?)\b/i.test(words);
        });
        const entry = index >= 0 ? repairedColumns[index] : void 0;
        if (entry && entry.displayAvatar === void 0 && entry.displayAsChip === void 0 && !isTruthy(entry.isEditable)) {
          repairedColumns[index] = { ...entry, displayAvatar: true };
          changedColumns = true;
        }
      }
      if (changedColumns)
        setProperty("columns", repairedColumns);
    }
  }
  const statFormat = propValue(properties, "valueFormat");
  if (component.type === "ShadStat" && (statFormat === void 0 || statFormat === "auto")) {
    const label = String(propValue(properties, "label") ?? "");
    let value = propValue(properties, "value");
    const moneyLabel = MONEY_WORDS.test(label.replace(/[_-]+/g, " ")) && !countLabel(label.replace(/[_-]+/g, " "));
    const trailingFormat = /\.(?:toLocaleString\((?:[^()]|\([^()]*\))*\)|toFixed\(\s*\d*\s*\))\s*\}\}\s*$/;
    if (moneyLabel && typeof value === "string" && trailingFormat.test(value) && !/[$€£₹¥]|Intl\.|currency/i.test(value)) {
      value = value.replace(trailingFormat, "}}");
      setProperty("value", value);
    }
    if (typeof value === "string" && /^\s*\{\{[\s\S]*\}\}\s*$/.test(value) && !/[$€£₹¥]|toLocaleString|toFixed|Intl\.|currency/i.test(value) && moneyLabel) {
      setProperty("valueFormat", "currency");
      if (options.currency && propValue(properties, "currency") === void 0)
        setProperty("currency", options.currency);
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
  const booleanKeys = /* @__PURE__ */ new Set(["loadingState", "visibility", "disabledState"]);
  for (const entry of schema?.properties ?? [])
    if (entry.valueType === "boolean")
      booleanKeys.add(entry.key);
  const BARE_EXPRESSION = /^\s*!?\s*\(?\s*(queries|components|variables|globals|page|constants|parameters)\.[\w$]/;
  const wrappedKeys = [];
  for (const key of booleanKeys) {
    const current2 = propValue(properties, key);
    if (typeof current2 !== "string" || current2.includes("{{") || !BARE_EXPRESSION.test(current2))
      continue;
    const entry = properties[key];
    const wrapped = { ...entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {}, value: `{{${current2.trim()}}}`, fxActive: true };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
    wrappedKeys.push(key);
  }
  if (wrappedKeys.length) {
    warnings.push(`${component.type} "${component.name}": wrapped the bare expression in ${wrappedKeys.map((k) => `properties.${k}`).join(", ")} in {{ }}; without the braces ToolJet reads it as text, which counts as true (a table stays on its loading spinner).`);
  }
  const CODE_START = /^\s*(?:String|Number|Math|moment|Intl|JSON|Object|Array)\s*[.(]|^\s*[([!]|^\s*(?:queries|components|variables|globals|page|constants|parameters)\.[\w$]/;
  const CODE_ROOT = /\b(?:queries|components|variables|globals|constants|parameters)\.[\w$]/;
  const CODE_OPERATOR = /=>|\|\||&&|===|!==|\.length\b|\.(?:filter|map|reduce|toFixed|toLocaleString|find|some)\s*\(/;
  const codeKeys = [];
  const showsCode = /CodeEditor|Html|Markdown|RichText|Json/i.test(component.type ?? "");
  for (const [key, entry] of Object.entries(showsCode ? {} : properties)) {
    if (booleanKeys.has(key))
      continue;
    const current2 = propValue(properties, key);
    if (typeof current2 !== "string" || current2.includes("{{") || current2.length > 2e3)
      continue;
    if (!CODE_START.test(current2) || !CODE_ROOT.test(current2) || !CODE_OPERATOR.test(current2))
      continue;
    const wrapped = { ...entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {}, value: `{{${current2.trim()}}}` };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
    codeKeys.push(key);
  }
  if (codeKeys.length) {
    warnings.push(`${component.type} "${component.name}": ${codeKeys.map((k) => `properties.${k}`).join(", ")} held a JavaScript expression without {{ }}, which shows the code on screen; it is now wrapped in {{ }}.`);
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
function resolveRef(candidates, ref, kind, scope2, describe = (candidate) => `${candidate.name ?? "(unnamed)"}=${candidate.id}`) {
  const byId = candidates.find((candidate) => candidate.id === ref);
  if (byId)
    return { ok: true, target: byId };
  const byName = candidates.filter((candidate) => candidate.name === ref);
  if (byName.length === 1)
    return { ok: true, target: byName[0] };
  if (byName.length > 1) {
    return {
      ok: false,
      error: `${kind} name "${ref}" is ambiguous ${scope2} (${byName.length} share it). Pass the id instead: ${byName.map((candidate) => candidate.id).join(", ")}.`
    };
  }
  const available = candidates.map(describe).join(", ");
  return {
    ok: false,
    // The "do not re-read" clause matters: the previous phrasing ("does not exist") invited exactly
    // the re-read that caused the loop.
    error: `No ${kind.toLowerCase()} with id or name "${ref}" ${scope2}. Do not re-read \u2014 it currently holds: ${available || "(none)"}.`
  };
}
createRequire(import.meta.url);
function strictEntry(shape, describeUnknown) {
  return external_exports.strictObject(shape, {
    error: (issue) => issue.code === "unrecognized_keys" ? issue.keys.map(describeUnknown).join(" ") : void 0
  });
}
function hasNonEmptyDefinition(definition) {
  if (!definition)
    return false;
  return Object.values(definition).some((section) => section !== null && typeof section === "object" && Object.keys(section).length > 0);
}
var FLEX_CONTAINER_TYPE = "FlexContainer";
var FLEX_FILL_WIDTH_DESCRIPTION = "FlexContainer child only: true (the default) fills the free main-axis width; false uses widthPx. Ignored elsewhere.";
var FLEX_WIDTH_PX_DESCRIPTION = "FlexContainer child only: fixed width in pixels, applied when fillWidth is false. Ignored elsewhere.";
var FLEX_GROW_DESCRIPTION = "FlexContainer row child only: share of the free width among fill children (default 1; 2 beside 1 takes two thirds). Ignored elsewhere.";
var FLEX_MIN_WIDTH_PX_DESCRIPTION = "FlexContainer row child only: narrowest a fill child may get, in pixels; in a wrapping row a narrower child moves to the next line. Ignored elsewhere.";
function isFlexContainerType(type) {
  return type === FLEX_CONTAINER_TYPE;
}
function storedChildOrder(properties) {
  const entry = properties?.childOrder;
  const value = Array.isArray(entry) ? entry : entry?.value;
  return Array.isArray(value) ? value.filter((id) => typeof id === "string" && id.length > 0) : [];
}
function normalizeChildOrder(childOrder, actualChildIds) {
  const actual = new Set(actualChildIds);
  const seen = /* @__PURE__ */ new Set();
  const normalized = [];
  for (const id of [...childOrder.filter((id2) => actual.has(id2)), ...actualChildIds]) {
    if (seen.has(id))
      continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}
function desktopRect(component) {
  const desktop = component.layouts?.desktop;
  return {
    top: typeof desktop?.top === "number" ? desktop.top : 0,
    left: typeof desktop?.left === "number" ? desktop.left : 0
  };
}
function bodyParentId(parent) {
  if (!parent)
    return void 0;
  const decoded = decodeComponentParent(parent);
  return decoded.slotName === "body" ? decoded.parentId : void 0;
}
function currentChildOrder(container, page) {
  const children = page.filter((component) => bodyParentId(component.parent) === container.id);
  const stored = storedChildOrder(container.properties);
  const storedSet = new Set(stored);
  const unordered = children.filter((child) => !storedSet.has(child.id)).sort((a, b) => {
    const ra = desktopRect(a), rb = desktopRect(b);
    return ra.top - rb.top || ra.left - rb.left;
  }).map((child) => child.id);
  return normalizeChildOrder(stored, [...children.map((child) => child.id).filter((id) => storedSet.has(id)), ...unordered]);
}
function appendedChildOrders(page, additions) {
  const byId = new Map(page.map((component) => [component.id, component]));
  const added = /* @__PURE__ */ new Map();
  for (const { parentId, childId } of additions) {
    const container = byId.get(parentId);
    if (!container || !isFlexContainerType(container.type))
      continue;
    const ids = added.get(parentId) ?? [];
    if (!ids.includes(childId))
      ids.push(childId);
    added.set(parentId, ids);
  }
  const orders = /* @__PURE__ */ new Map();
  for (const [parentId, newIds] of added) {
    const container = byId.get(parentId);
    const newSet = new Set(newIds);
    const existing = currentChildOrder(container, page.filter((component) => !newSet.has(component.id)));
    const stored = storedChildOrder(container.properties);
    const next = normalizeChildOrder(stored, [...existing, ...newIds]);
    if (next.length !== stored.length || next.some((id, index) => stored[index] !== id))
      orders.set(parentId, next);
  }
  return orders;
}
function batchChildOrders(entries, explicit = /* @__PURE__ */ new Map(), resolveRef2 = () => void 0) {
  const orders = /* @__PURE__ */ new Map();
  for (const container of entries) {
    if (!isFlexContainerType(container.type))
      continue;
    const children = entries.filter((entry) => entry.parentId === container.id).map((entry) => entry.id);
    const authored = (explicit.get(container.id) ?? []).flatMap((ref) => typeof ref === "string" ? [resolveRef2(ref) ?? ref] : []);
    orders.set(container.id, [.../* @__PURE__ */ new Set([...authored, ...children])]);
  }
  return orders;
}
function childOrderProperty(order) {
  return { value: order };
}
function reparentAdditions(page, moves) {
  const byId = new Map(page.map((component) => [component.id, component]));
  return moves.flatMap(({ componentId, parent }) => {
    if (parent === void 0)
      return [];
    const nextParent = bodyParentId(parent);
    if (!nextParent || nextParent === bodyParentId(byId.get(componentId)?.parent))
      return [];
    return [{ parentId: nextParent, childId: componentId }];
  });
}
function resolveAuthoredChildOrder(container, page, authored) {
  const children = page.filter((component) => bodyParentId(component.parent) === container.id);
  const unknown = [];
  const ids = authored.flatMap((item) => {
    const ref = typeof item === "string" ? item : String(item);
    const child = children.find((candidate) => candidate.id === ref) ?? children.find((candidate) => candidate.name === ref);
    if (!child) {
      unknown.push(ref);
      return [];
    }
    return [child.id];
  });
  return { order: normalizeChildOrder(ids, [...ids, ...currentChildOrder(container, page)]), unknown };
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
      openWorldHint: false
    },
    description: "Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves under `definition` (properties/styles/validation/others) \u2014 ToolJet deep-merges, so untouched values are preserved. Leaves may be raw values or `{ value: ... }` envelopes; MCP canonicalizes them. " + COMPONENT_FX_UPDATE_GUIDANCE + "NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent/slot_name per entry, not both. `slot_name` accepts header/body/footer and can move a child between native ModalV2/Form/Container regions, or modal for Kanban card-click content; omit parent to keep the current parent. Unknown entry keys are rejected (a top-level properties/styles patch is an error, not a silent no-op), and an entry that changes nothing fails. Get component ids + current values from get_app_summary / get_component. To reorder a FlexContainer, set its properties.childOrder to the child names or ids in the wanted order; unlisted children follow in their current order.",
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
          const current2 = resolution.target;
          const componentId = current2.id;
          if (update.definition && (update.name !== void 0 || update.parent !== void 0 || update.slot_name !== void 0)) {
            errors.push(`Component "${update.component_id}": set EITHER definition OR name/parent/slot_name in one entry.`);
            continue;
          }
          if (!hasNonEmptyDefinition(update.definition) && update.name === void 0 && update.parent === void 0 && update.slot_name === void 0) {
            errors.push(`Component "${update.component_id}": nothing to update. Send the changed leaves under definition (properties/styles/validation/others) or a name/parent/slot_name change.`);
            continue;
          }
          let parent = update.parent;
          if (typeof parent === "string" && parent) {
            const resolvedParent = resolveParentRef(page.components, parent);
            if (!resolvedParent.ok) {
              errors.push(`Component "${update.component_id}": ${resolvedParent.error}`);
              continue;
            }
            parent = resolvedParent.parent;
          }
          let slotName = update.slot_name;
          if (slotName !== void 0) {
            parent ??= current2.parent ? decodeComponentParent(current2.parent).parentId : void 0;
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
          const authoredOrder = update.definition?.properties?.childOrder;
          if (authoredOrder !== void 0 && isFlexContainerType(current2.type)) {
            const raw = authoredOrder;
            const value = Array.isArray(raw) ? raw : raw?.value;
            if (!Array.isArray(value)) {
              errors.push(`FlexContainer "${current2.name ?? current2.id}": properties.childOrder must be an array of child component ids or names.`);
              continue;
            }
            const resolved = resolveAuthoredChildOrder(current2, page.components, value);
            if (resolved.unknown.length) {
              errors.push(`FlexContainer "${current2.name ?? current2.id}": childOrder names ${resolved.unknown.map((ref) => `"${ref}"`).join(", ")}, which are not children of this container. List its child component ids or names.`);
              continue;
            }
            update.definition = {
              ...update.definition,
              properties: { ...update.definition.properties, childOrder: childOrderProperty(resolved.order) }
            };
          }
          const packValue = packValueAsDefault(current2.type, current2.name ?? current2.id, update.definition?.properties);
          if (packValue.warning) {
            warnings.push(packValue.warning);
            update.definition = { ...update.definition, properties: packValue.properties };
          }
          const definition = update.definition;
          const next = {
            id: current2.id,
            name: update.name ?? current2.name ?? current2.id,
            type: current2.type,
            properties: { ...current2.properties ?? {}, ...definition?.properties ?? {} },
            styles: { ...current2.styles ?? {}, ...definition?.styles ?? {} },
            layouts: current2.layouts,
            parent: parent !== void 0 ? encodeComponentParent(parent, slotName) : current2.parent,
            slotName
          };
          const normalized = normalizeComponentSpec({
            name: next.name ?? current2.id,
            type: next.type ?? current2.type ?? "",
            properties: next.properties ?? {},
            styles: next.styles,
            validation: definition?.validation,
            others: { ...current2.others ?? {}, ...definition?.others ?? {} },
            layouts: next.layouts,
            parent: next.parent
          });
          const normalizedNext = { ...normalized.component, id: current2.id };
          const heightFix = update.definition ? suggestedHtmlHeight(normalizedNext) : null;
          const desktopRect2 = current2.layouts?.desktop;
          if (heightFix && desktopRect2 && typeof desktopRect2.top === "number") {
            normalizedNext.layouts = { ...normalizedNext.layouts ?? {}, desktop: { ...desktopRect2, height: heightFix.to } };
            layoutFixes.push({ componentId: current2.id, desktop: { ...desktopRect2, height: heightFix.to } });
            warnings.push(`Html "${normalizedNext.name ?? current2.id}" needed about ${heightFix.needed}px for its new markup but was ${heightFix.from}px; its height is now ${heightFix.to}px. Anything within ${heightFix.to - heightFix.from}px below it now overlaps; move it down.`);
          }
          projected.set(current2.id, normalizedNext);
          if (update.definition)
            changedComponents.push({ before: current2, after: normalizedNext });
          placementChanged ||= update.parent !== void 0 || update.slot_name !== void 0;
          warnings.push(...onlyTouchedBraceNotes(normalized.warnings, definition));
          let normalizedDefinition = update.definition;
          if (update.definition && Object.keys(normalized.patch).length) {
            normalizedDefinition = { ...update.definition };
            for (const section of ["properties", "styles", "validation", "others"]) {
              const sectionPatch = normalized.patch[section];
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
          errors.push(...introducedLintFindings(lintComponentSpec(current2).errors, lintComponentSpec(normalizedNext).errors));
          warnings.push(...introducedLintFindings(lintComponentSpec(current2).warnings, lintComponentSpec(normalizedNext).warnings));
        }
        const allComponents = [...projected.values()];
        const introducedForChanged = (lint) => changedComponents.flatMap(({ before, after }) => introducedLintFindings(lint([before]), lint([after])));
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
        warnings.push(...lintShadKanbanCards(allComponents));
        warnings.push(...lintShadScheduleScale(allComponents));
        const result = await client.updateComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          updates: resolvedUpdates
        });
        if (layoutFixes.length) {
          await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: args.page_id, layouts: layoutFixes });
        }
        const appended = appendedChildOrders(page.components, reparentAdditions(page.components, resolvedUpdates.map((update) => ({
          componentId: update.componentId,
          parent: update.parent !== void 0 ? encodeComponentParent(update.parent, update.slotName) : void 0
        }))));
        if (appended.size) {
          await client.updateComponents({
            appId: args.app_id,
            versionId: args.version_id,
            pageId: args.page_id,
            updates: [...appended].map(([componentId, order]) => ({
              componentId,
              definition: { properties: { childOrder: childOrderProperty(order) } }
            }))
          });
        }
        return ok({ ...result, warnings: [...new Set(warnings)] });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function onlyTouchedBraceNotes(warnings, definition) {
  const touched = /* @__PURE__ */ new Set([
    ...Object.keys(definition?.properties ?? {}).map((key) => `properties.${key}`),
    ...Object.keys(definition?.styles ?? {}).map((key) => `styles.${key}`)
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
async function mapKeyRefusal(client, componentTypes, library) {
  if (![...componentTypes].includes("Map") || typeof client?.hasGoogleMapsKey !== "function")
    return void 0;
  let hasKey;
  try {
    hasKey = await client.hasGoogleMapsKey();
  } catch {
    return void 0;
  }
  if (hasKey !== false)
    return void 0;
  const noKey = "This ToolJet instance has no Google Maps API key (GOOGLE_MAPS_API_KEY), so a Map component shows a Google error instead of a map.";
  const ui2Map = "Use ShadMap, the ToolJet UI 2.0 Map: OpenStreetMap tiles, no key, one marker per data row read through latField, lngField and idField, with onMarkerClick and selectedMarker.";
  if (library === "ui2")
    return `${noKey} ${ui2Map}`;
  return `${noKey} In a ToolJet UI 2.0 app: ${ui2Map} In a UI 1.0 app, show the locations in a Table (a link column to https://www.google.com/maps?q=<lat>,<lng> opens each one), and tell the user in your reply that an in-app map needs the Google Maps API key on the instance.`;
}
createRequire(import.meta.url);
var CATALOG_SECTIONS = [
  "overview",
  "properties",
  "styles",
  "events",
  "actions",
  "exposedVariables",
  "defaultChildren",
  "renderingHints",
  "authoringHints"
];
var DEFAULT_TYPED_SECTIONS = [
  "overview",
  "properties",
  "events",
  "actions"
];
var CATALOG_TYPE_ALIASES = /* @__PURE__ */ new Map([
  ["gridview", {
    type: "Listview",
    note: 'ToolJet grid view is Listview with mode:"grid" (properties.mode.value); use type:"Listview" when creating it.'
  }]
]);
function resolveCatalogType(requestedType) {
  const alias = CATALOG_TYPE_ALIASES.get(requestedType.replace(/[\s_-]+/g, "").toLowerCase());
  if (alias)
    return { type: alias.type, alias: { requested_type: requestedType, note: alias.note } };
  if (getComponentSchema(requestedType))
    return { type: requestedType };
  const wanted = requestedType.replace(/[\s_-]+/g, "").toLowerCase();
  const types = getCatalog().map((entry) => entry.type);
  const near = types.find((type) => type.toLowerCase() === wanted) ?? types.find((type) => type.toLowerCase().replace(/v\d+$/, "") === wanted);
  return near ? { type: near, alias: { requested_type: requestedType, note: `There is no "${requestedType}"; this is ${near}. Use type "${near}".` } } : { type: requestedType };
}
var PACK_CONCEPTS = [
  [/table|grid|datatable/i, ["ShadTable"]],
  [/metric|stat|kpi/i, ["ShadStat", "ShadSparkline", "ShadSummaryStrip"]],
  [/summary|figures|totals|strip|headline/i, ["ShadSummaryStrip"]],
  [/recent|activity|feed|records?|orders|people|contacts|inbox/i, ["ShadRecordList"]],
  [/card|panel|surface/i, ['FlexContainer (cardStyle "shadcnCard")', "ShadCardGrid"]],
  [/gallery|tiles?|catalog|products?|cards|grid/i, ["ShadCardGrid"]],
  [/hero|header|masthead|jumbotron|cover|welcome/i, ["ShadHero"]],
  [/modal|dialog|sheet|drawer/i, ["ShadDialog"]],
  [/dropdown|menu/i, ["ShadDropdownMenu", "ShadSelect", "ShadCombobox"]],
  [/list/i, ["ShadListView", "ShadRecordList", "ShadKeyValue"]],
  [/chat|message|assistant|conversation|copilot|bot|thread/i, ["ShadChat"]],
  [/question|survey|quiz|onboarding|intake|wizard|poll|triage|form/i, ["ShadQuestionnaire"]],
  [/chart|graph/i, ["ShadBarChart", "ShadLineChart", "ShadAreaChart", "ShadPieChart", "ShadComboChart", "ShadScatterChart", "ShadFunnelChart", "ShadHeatmapChart"]],
  [/funnel|conversion/i, ["ShadFunnelChart"]],
  [/scatter|bubble|correlation/i, ["ShadScatterChart"]],
  [/heat|matrix|grid|calendar/i, ["ShadHeatmapChart"]],
  [/board|kanban|pipeline|stage|trello|dispatch|grouped by/i, ["ShadKanban"]],
  [/combo|composed|mixed|dual/i, ["ShadComboChart"]],
  [/label|title|typography/i, ["ShadHeading", "ShadText"]],
  [/date/i, ["ShadDatePicker", "ShadDateTimePicker", "ShadCalendar"]],
  [/toast|notification|banner/i, ["ShadAlert"]],
  [/divider/i, ["ShadSeparator"]],
  [/schedule|scheduler|booking|reservation|roster|rota|shift|on.?call|resource|timeline.?view|gantt|availability|rooms?/i, ["ShadSchedule"]],
  [/progress|goal|budget|quota|target|onboarding|checklist|capacity|completion/i, ["ShadProgressList", "ShadProgress"]],
  [/map|geo|location|pins?$|markers?|route|locator|spatial|leaflet|places|zones?$|territor|geofence|dispatch|fleet/i, ["ShadMap"]]
];
function packSuggestions(requestedType) {
  if (!/^Shad[A-Z]/.test(requestedType))
    return [];
  const rest = requestedType.slice(4);
  return [...new Set(PACK_CONCEPTS.filter(([pattern]) => pattern.test(rest)).flatMap(([, types]) => types))];
}
function nearbyTypes(requestedType) {
  const words = requestedType.split(/(?=[A-Z])|[\s_-]+/).map((word) => word.toLowerCase()).filter((word) => word.length >= 4);
  return getCatalog().map((entry) => entry.type).filter((type) => words.some((word) => type.toLowerCase().includes(word))).slice(0, 6);
}
function selectEntries(entries, keys, detail) {
  const selected = keys?.length ? entries.filter((entry) => keys.includes(entry.key)) : entries;
  if (detail === "full" || keys?.length)
    return selected;
  return selected.map(({ key, valueType, valueTypes, allowedValues, requires, mutuallyExclusiveWith }) => ({
    key,
    ...valueType !== void 0 ? { valueType } : {},
    ...valueTypes !== void 0 ? { valueTypes } : {},
    ...allowedValues !== void 0 ? { allowedValues } : {},
    ...requires !== void 0 ? { requires } : {},
    ...mutuallyExclusiveWith !== void 0 ? { mutuallyExclusiveWith } : {}
  }));
}
function selectSchema(schema, args) {
  const detail = args.detail ?? "compact";
  const sections = new Set(args.sections ?? DEFAULT_TYPED_SECTIONS);
  const result = { type: schema.type };
  if (sections.has("overview")) {
    if (schema.name !== void 0)
      result.name = schema.name;
    if (schema.description !== void 0)
      result.description = schema.description;
    if (schema.defaultSize !== void 0)
      result.defaultSize = schema.defaultSize;
  }
  if (sections.has("properties")) {
    result.properties = selectEntries(schema.properties, args.property_keys, detail);
  }
  if (sections.has("styles")) {
    result.styles = selectEntries(schema.styles, args.style_keys, detail);
  }
  if (sections.has("events") && schema.events !== void 0)
    result.events = schema.events;
  if (sections.has("actions") && schema.actions !== void 0)
    result.actions = schema.actions;
  if (sections.has("exposedVariables") && schema.exposedVariables !== void 0) {
    result.exposedVariables = schema.exposedVariables;
  }
  if (sections.has("defaultChildren") && schema.defaultChildren !== void 0) {
    result.defaultChildren = schema.defaultChildren;
  }
  if (sections.has("renderingHints") && schema.renderingHints !== void 0) {
    result.renderingHints = schema.renderingHints;
  }
  if (sections.has("authoringHints") && schema.authoringHints !== void 0) {
    result.authoringHints = schema.authoringHints;
  }
  return result;
}
function legacyNotice(type) {
  const replacement = getLegacyComponentReplacement(type);
  return replacement ? {
    deprecated: true,
    replacement,
    deprecation_note: `"${type}" remains available only for inspecting or repairing existing apps. Use "${replacement}" for new components.`
  } : {};
}
async function instanceNote(client, type) {
  const refusal = type === "Map" ? await mapKeyRefusal(client, ["Map"]) : void 0;
  return refusal ? { instance_note: refusal } : {};
}
function getComponentCatalogTool(client) {
  return {
    name: "get_component_catalog",
    title: "Get Component Catalog",
    // Served from the bundled catalog in data/; never reaches the ToolJet instance.
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: 'Discover ToolJet components. With no type(s), returns the lightweight palette. Use type for one component or types for a batch needed in the current page/phase. Typed reads default to detail:"compact" and the overview/properties/events/actions sections; compact property/style lists omit labels and defaults. Use detail:"full" or exact property_keys/style_keys only when those values are needed. Request renderingHints/authoringHints for layout-sensitive or nested components. Use requests when different types need different sections/keys in one call; top-level detail/sections/keys apply as defaults to every requested type, and the type/types/requests selectors may be combined. sections selects only overview, properties, styles, events, actions, exposedVariables, defaultChildren, renderingHints, and/or authoringHints; property_keys/style_keys narrow those arrays further. A batch returns {components,unknown_types}. GridView is a lookup alias for Listview mode:"grid"; component writes must still use type:"Listview". authoringHints covers nested contracts such as ModalV2 native slots, Table row-action Button columns, and Form JSON-schema field types. Fetch complex/unfamiliar contracts once and reuse them; never guess property/event/action ids.',
    inputSchema: {
      type: external_exports.string().optional(),
      types: external_exports.array(external_exports.string()).min(1).max(25).optional(),
      requests: external_exports.array(external_exports.object({
        type: external_exports.string(),
        detail: external_exports.enum(["compact", "full"]).optional(),
        sections: external_exports.array(external_exports.enum(CATALOG_SECTIONS)).min(1).optional(),
        property_keys: external_exports.array(external_exports.string()).min(1).optional(),
        style_keys: external_exports.array(external_exports.string()).min(1).optional()
      })).min(1).max(25).optional(),
      detail: external_exports.enum(["compact", "full"]).optional(),
      sections: external_exports.array(external_exports.enum(CATALOG_SECTIONS)).min(1).optional(),
      property_keys: external_exports.array(external_exports.string()).min(1).optional(),
      style_keys: external_exports.array(external_exports.string()).min(1).optional()
    },
    async handler(args) {
      try {
        const singleType = args?.type;
        const typesList = args?.types ?? [];
        const batch = args?.requests ?? [];
        const hasSelector = !!singleType || typesList.length > 0 || batch.length > 0;
        if (!hasSelector) {
          if (args.detail || args.sections || args.property_keys || args.style_keys) {
            return fail(new Error("Catalog detail/sections/key filters require `type`, `types`, or `requests`."));
          }
          return ok(getCatalog());
        }
        if (singleType && typesList.length === 0 && batch.length === 0) {
          const resolved = resolveCatalogType(singleType);
          const schema = getComponentSchema(resolved.type);
          if (!schema) {
            const near = nearbyTypes(singleType);
            const suggested = [.../* @__PURE__ */ new Set([...packSuggestions(singleType), ...near])].slice(0, 6);
            const packTypes = /^Shad[A-Z]/.test(singleType) ? getCatalog().map((entry) => entry.type).filter((type) => /^Shad[A-Z]/.test(type)) : [];
            return ok({
              error: `Unknown component type "${singleType}". Call with no argument to list valid types.`,
              ...suggested.length ? { did_you_mean: suggested } : {},
              ...packTypes.length ? { pack_types: packTypes } : {}
            });
          }
          return ok({
            ...selectSchema(schema, args),
            ...legacyNotice(schema.type),
            ...resolved.alias ? { alias: resolved.alias } : {},
            ...await instanceNote(client, schema.type)
          });
        }
        const withDefaults = (type, over) => ({
          type,
          detail: over?.detail ?? args.detail,
          sections: over?.sections ?? args.sections,
          property_keys: over?.property_keys ?? args.property_keys,
          style_keys: over?.style_keys ?? args.style_keys
        });
        const ordered = [
          ...batch.map((r) => withDefaults(r.type, r)),
          ...typesList.map((t) => withDefaults(t)),
          ...singleType ? [withDefaults(singleType)] : []
        ];
        const components = [];
        const unknownTypes = [];
        const componentByResolvedType = /* @__PURE__ */ new Map();
        const seenUnknown = /* @__PURE__ */ new Set();
        for (const request of ordered) {
          if (!request.type)
            continue;
          const resolved = resolveCatalogType(request.type);
          const schema = getComponentSchema(resolved.type);
          if (!schema) {
            if (!seenUnknown.has(request.type)) {
              seenUnknown.add(request.type);
              unknownTypes.push(request.type);
            }
            continue;
          }
          const existing = componentByResolvedType.get(resolved.type);
          if (existing) {
            if (resolved.alias) {
              const requestedAliases = Array.isArray(existing.requested_aliases) ? existing.requested_aliases : [];
              if (!requestedAliases.includes(request.type)) {
                existing.requested_aliases = [...requestedAliases, request.type];
              }
            }
            continue;
          }
          const component = {
            ...selectSchema(schema, request),
            ...legacyNotice(schema.type),
            ...resolved.alias ? { alias: resolved.alias } : {},
            ...resolved.alias ? { requested_aliases: [request.type] } : {},
            ...await instanceNote(client, schema.type)
          };
          components.push(component);
          componentByResolvedType.set(resolved.type, component);
        }
        const suggestions = Object.fromEntries(unknownTypes.map((type) => [type, [.../* @__PURE__ */ new Set([...packSuggestions(type), ...nearbyTypes(type)])].slice(0, 6)]).filter(([, near]) => near.length));
        const guessedPack = unknownTypes.some((type) => /^Shad[A-Z]/.test(type));
        return ok({
          components,
          unknown_types: unknownTypes,
          ...Object.keys(suggestions).length ? { suggestions } : {},
          ...guessedPack ? { pack_types: getCatalog().map((entry) => entry.type).filter((type) => /^Shad[A-Z]/.test(type)) } : {}
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
createRequire(import.meta.url);
var positive = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};
var MAX_SLOT_AGE_MS = 10 * 6e4;
var POLL_MS = 250;
var alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
};
var stale = (file) => {
  try {
    if (Date.now() - statSync(file).mtimeMs > MAX_SLOT_AGE_MS)
      return true;
    return !alive(Number(readFileSync(file, "utf8")));
  } catch {
    return false;
  }
};
var take = (dir, prefix, limit) => {
  for (let i = 0; i < limit; i++) {
    const file = join(dir, `${prefix}-${i}`);
    if (existsSync(file) && stale(file))
      rmSync(file, { force: true });
    try {
      const fd = openSync(file, "wx");
      writeFileSync(fd, String(process.pid));
      closeSync(fd);
      return file;
    } catch {
    }
  }
  return void 0;
};
var BuildCapacityError = class extends Error {
};
async function withBuildSlot(root2, workspaceId, work) {
  const dir = join(root2, ".slots");
  mkdirSync(dir, { recursive: true });
  const globalLimit = positive("MCP_CODE_BUILD_MAX_GLOBAL", 6);
  const workspaceLimit = positive("MCP_CODE_BUILD_MAX_WORKSPACE", 3);
  const deadline = Date.now() + positive("MCP_CODE_BUILD_WAIT_MS", 18e4);
  const release = [];
  try {
    for (; ; ) {
      const mine = take(dir, `ws-${workspaceId}`, workspaceLimit);
      const shared = mine && take(dir, "global", globalLimit);
      if (mine && shared) {
        release.push(mine, shared);
        break;
      }
      if (mine)
        rmSync(mine, { force: true });
      if (Date.now() >= deadline)
        throw new BuildCapacityError("Too many builds are running on this server right now. Try again in a minute.");
      await new Promise((resolve3) => setTimeout(resolve3, POLL_MS));
    }
    return await work();
  } finally {
    for (const file of release)
      rmSync(file, { force: true });
  }
}
var LAST_USED = ".tooljet-last-used";
var CLEAN_MARKER = ".last-cleanup";
var HOME_PREFIX = "tj-code-home-";
function touchProject(dir) {
  const file = join(dir, LAST_USED);
  const now = /* @__PURE__ */ new Date();
  try {
    utimesSync(file, now, now);
  } catch {
    try {
      writeFileSync(file, "");
    } catch {
    }
  }
}
var lastUsed = (dir) => {
  for (const name of [LAST_USED, "app.json"]) {
    try {
      return statSync(join(dir, name)).mtimeMs;
    } catch {
    }
  }
  return statSync(dir).mtimeMs;
};
function cleanOldProjects(root2) {
  const days = Number(process.env.MCP_CODE_PROJECT_TTL_DAYS ?? 14);
  if (!(days > 0) || !existsSync(root2))
    return;
  const marker = join(root2, CLEAN_MARKER);
  try {
    if (Date.now() - statSync(marker).mtimeMs < 36e5)
      return;
  } catch {
  }
  writeFileSync(marker, "");
  const oldest = Date.now() - days * 864e5;
  const isProject = (dir) => existsSync(join(dir, "app.json"));
  const projects = (dir, depth) => {
    if (isProject(dir))
      return [dir];
    if (depth === 0)
      return [];
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".")).flatMap((e) => projects(join(dir, e.name), depth - 1));
  };
  for (const entry of readdirSync(root2, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("."))
      continue;
    const dir = join(root2, entry.name);
    for (const project of projects(dir, entry.name.startsWith("d_") ? 2 : 1)) {
      if (lastUsed(project) < oldest)
        rmSync(project, { recursive: true, force: true });
    }
  }
  for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(HOME_PREFIX))
      continue;
    const dir = join(tmpdir(), entry.name);
    if (Date.now() - statSync(dir).mtimeMs > 864e5)
      rmSync(dir, { recursive: true, force: true });
  }
}
var CLI_HOME_PREFIX = HOME_PREFIX;
var BROWSER_USER = /\{\{[^}]*?\bglobals\s*\.\s*currentUser\b/;
function browserUserBindings(options, path = []) {
  if (typeof options === "string")
    return BROWSER_USER.test(options) ? [path.join(".") || "options"] : [];
  if (Array.isArray(options))
    return options.flatMap((value, index) => browserUserBindings(value, [...path, String(index)]));
  if (options && typeof options === "object") {
    return Object.entries(options).flatMap(([key, value]) => browserUserBindings(value, [...path, key]));
  }
  return [];
}
function browserUserMessage(queryName, paths) {
  return `Query "${queryName}": ${paths.join(", ")} ${paths.length > 1 ? "read" : "reads"} {{globals.currentUser.*}}, which the viewer's browser resolves and sends with the run, so anyone can send another user's email. In a Code mode app use {{globals.server.currentUser.*}} (email, id, firstName, groups), which ToolJet resolves on the server, for own-row filters and every "who" column (requester, approver, actor).`;
}
var CODE_PAGE_TRUE = /* @__PURE__ */ new Set([true, "true", "{{true}}"]);
function isCodeModeApp(app) {
  if (app?.build_mode === "code" || app?.buildMode === "code")
    return true;
  for (const page of Array.isArray(app?.pages) ? app.pages : []) {
    for (const entry of Object.values(page?.components ?? {})) {
      if (CODE_PAGE_TRUE.has(entry?.component?.definition?.properties?.codePage?.value))
        return true;
    }
  }
  return false;
}
function browserUserQueryProblems(app) {
  const queries = Array.isArray(app?.data_queries) ? app.data_queries : [];
  return queries.flatMap((query) => {
    const paths = browserUserBindings(query?.options ?? {});
    return paths.length ? [browserUserMessage(String(query?.name ?? query?.id ?? "query"), paths)] : [];
  });
}
var TS_LINE = /^(\S+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
var ESBUILD_LINE = /^(\S+?):(\d+):(\d+): ERROR: (.*)$/;
var CSS_IN_PLUGIN = /^\[plugin: [\w-]+\] (?:.*\/frontend\/)?(\S+?\.css):(\d+):(\d+): (.*)$/;
var MAX_MESSAGE = 300;
var clipText = (text, max) => text.length > max ? `${text.slice(0, max)}...` : text;
var inFrontend = (file) => file.startsWith("frontend/") ? file : `frontend/${file}`;
function fixFor(code, message) {
  if (/custom-component-sdk/.test(message) && /Cannot find module|Could not resolve/.test(message))
    return "the SDK's types are missing on this server, not in the code: never declare the module yourself; build again";
  if (/Cannot find module '\.{1,2}\/|Could not resolve "\.{1,2}\//.test(message))
    return "no such file: write it (files: [{ path, content }]) or correct the path";
  if (/Could not resolve "@tooljet\//.test(message))
    return "no such package: the SDK is @tooljet/custom-component-sdk, and data comes from ../tooljet.gen (useAppQuery)";
  if (/has no exported member|No matching export/.test(message))
    return "export that name from the file it is imported from, or import a name the file exports";
  if (code === "TS7006")
    return "give the parameter a type, or type the list it comes from (a Row type from tooljet.gen)";
  if (/'QueryError' is not assignable to type 'ReactNode'/.test(message))
    return "render error.message, not the error";
  if (/LucideIcon/.test(message))
    return "type the icon prop as LucideIcon: import type { LucideIcon } from 'lucide-react'";
  if (/\.data' is possibly 'undefined'/.test(message))
    return "data is undefined until the first run: const rows = q.data ?? []";
  if (code === "TS18047" || /'null' is not assignable/.test(message))
    return "a nullable column is T | null in its Row type: check for null, or use ?? ''";
  if (code === "TS2339" && /on type '\{|Row(\[\])?'/.test(message))
    return "not a field of this row: use only the fields its Row type in tooljet.gen lists";
  if (/has already been declared|Duplicate identifier|Cannot redeclare/.test(message))
    return "remove one of the two declarations";
  if (code === "CSS" && /Unknown word/.test(message))
    return "a stray */ or an unclosed comment or rule";
  return void 0;
}
var routeFix = (p) => !p.fix && p.code === "TS2345" && /routePath\(/.test(p.source ?? "") ? { ...p, fix: "add the route to app.json's routes (the build refreshes ROUTES), or use an id it has" } : p;
function parseBuildProblems(output) {
  const lines = output.split("\n");
  const problems = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const ts = TS_LINE.exec(line);
    if (ts) {
      const message = [ts[5]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && !TS_LINE.test(lines[j].trim()) && !/^\d+ /.test(lines[j].trim())) {
        message.push(lines[j].trim());
        j++;
      }
      while (j < lines.length && !lines[j].trim())
        j++;
      const code = new RegExp(`^${ts[2]} (.*)$`).exec(lines[j]?.trim() ?? "");
      problems.push({
        at: `${inFrontend(ts[1])}:${ts[2]}:${ts[3]}`,
        code: ts[4],
        message: clipText(message.slice(0, 3).join(" / "), MAX_MESSAGE),
        ...code ? { source: clipText(code[1].trim(), 160) } : {}
      });
      continue;
    }
    const es = ESBUILD_LINE.exec(line);
    if (es) {
      const css = CSS_IN_PLUGIN.exec(es[4]);
      problems.push(css ? { at: `${inFrontend(css[1])}:${css[2]}:${css[3]}`, code: "CSS", message: clipText(css[4], MAX_MESSAGE) } : { at: `${inFrontend(es[1])}:${es[2]}:${es[3]}`, code: "ESBUILD", message: clipText(es[4], MAX_MESSAGE) });
    }
  }
  return problems.map((p) => routeFix({ ...p, ...fixFor(p.code, p.message) ? { fix: fixFor(p.code, p.message) } : {} }));
}
var fromChecked = (p) => routeFix({
  at: `${inFrontend(p.file)}:${p.line}:${p.column}`,
  code: p.code,
  message: clipText(p.message.split("\n").slice(0, 3).map((l) => l.trim()).join(" / "), MAX_MESSAGE),
  ...p.source ? { source: p.source } : {},
  ...fixFor(p.code, p.message) ? { fix: fixFor(p.code, p.message) } : {}
});
function formatProblems(problems, max = 40) {
  const groups = /* @__PURE__ */ new Map();
  for (const p of problems) {
    const file = p.at.replace(/:\d+:\d+$/, "");
    const key = `${file}\0${p.code}\0${p.message}`;
    const group = groups.get(key);
    if (group)
      group.at.push(p.at.slice(file.length));
    else
      groups.set(key, { first: p, at: [p.at] });
  }
  const lines = [...groups.values()].map(({ first, at }) => [`${at.join(", ")} ${first.code} ${first.message}`, first.source && `code: ${first.source}`, first.fix && `fix: ${first.fix}`].filter(Boolean).join(" | "));
  return lines.length > max ? [...lines.slice(0, max), `... and ${lines.length - max} more`] : lines;
}
function buildSummary(output) {
  const lines = output.split("\n").map((l) => l.trimEnd());
  const keep = lines.filter((l) => /^\s*(✗|✓|⚠)/.test(l) || /Build completed in/.test(l));
  return keep.join("\n");
}
var run = promisify(execFile);
var buildServiceUrl = () => process.env.MCP_CODE_BUILD_WORKER_URL?.trim().replace(/\/+$/, "") || void 0;
var POLL_MS2 = Number(process.env.MCP_CODE_BUILD_WORKER_POLL_MS ?? 1500);
var deadlineMs = () => Number(process.env.MCP_CODE_BUILD_WORKER_TIMEOUT_MS ?? 10 * 6e4);
var strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
async function packProject(dir) {
  const { stdout } = await run("tar", ["-czf", "-", "--exclude=node_modules", "--exclude=frontend/dist", "-C", dir, "app.json", "frontend"], { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, env: { PATH: process.env.PATH ?? "/usr/bin:/bin", COPYFILE_DISABLE: "1" } });
  return stdout;
}
async function buildInService(dir, env, fetchImpl = fetch) {
  const base = buildServiceUrl();
  if (!base)
    throw new Error("MCP_CODE_BUILD_WORKER_URL is not set");
  const token = process.env.MCP_CODE_BUILD_WORKER_TOKEN ?? "";
  const headers = { authorization: `Bearer ${token}` };
  const started = Date.now();
  const deadline = started + deadlineMs();
  const bounded = (init = {}) => ({ ...init, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
  const late = () => `the build did not finish in ${Math.max(1, Math.round(deadlineMs() / 6e4))} minutes`;
  const reason = (error) => error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError") ? late() : error instanceof Error ? error.message : String(error);
  const unreachable = (detail) => ({
    code: 1,
    ms: Date.now() - started,
    output: `The build service could not build this app (${detail}). Nothing was built here: try the build again in a minute.`
  });
  let id;
  try {
    const body = await packProject(dir);
    const res = await fetchImpl(`${base}/jobs?env=${env}`, bounded({ method: "POST", headers: { ...headers, "content-type": "application/gzip" }, body: new Uint8Array(body) }));
    if (res.status !== 202)
      return unreachable(`HTTP ${res.status} ${(await res.text()).trim().slice(0, 200)}`);
    id = (await res.json()).id;
  } catch (error) {
    return unreachable(reason(error));
  }
  let job;
  try {
    for (; ; ) {
      const res = await fetchImpl(`${base}/jobs/${id}`, bounded({ headers }));
      if (!res.ok)
        return unreachable(`HTTP ${res.status} reading build ${id}`);
      job = await res.json();
      if (job.status === "done" || job.status === "failed")
        break;
      if (Date.now() + POLL_MS2 > deadline)
        return unreachable(`build ${id}: ${late()}`);
      await new Promise((resolve3) => setTimeout(resolve3, POLL_MS2));
    }
  } catch (error) {
    return unreachable(reason(error));
  } finally {
    void fetchImpl(`${base}/jobs/${id}`, { method: "DELETE", headers }).catch(() => void 0);
  }
  const output = strip([job.output ?? "", job.error ? `
${job.error}` : ""].join("")).trim();
  const location = [job.location?.CLOUDFLARE_REGION, job.location?.CLOUDFLARE_LOCATION].filter(Boolean).join(" ") || void 0;
  const failedCode = job.exitCode && job.exitCode > 0 ? job.exitCode : 1;
  if (job.status !== "done" || (job.exitCode ?? 0) !== 0)
    return { code: failedCode, output, location, ms: Date.now() - started };
  const refused = job.bundleTgzBase64 ? writeDist(join(dir, "frontend"), Buffer.from(job.bundleTgzBase64, "base64")) : "the build service sent no bundle";
  if (refused) {
    return { code: failedCode, output: `${output}
${refused}. The previous build was kept; try the build again.`.trim(), location, ms: Date.now() - started };
  }
  return { code: 0, output, location, ms: Date.now() - started };
}
var ENTRY = /^[-d]/;
function irregularEntries(root2, at = root2) {
  return readdirSync(at, { withFileTypes: true }).flatMap((entry) => {
    const full = join(at, entry.name);
    const stat = lstatSync(full);
    if (stat.isDirectory())
      return irregularEntries(root2, full);
    return stat.isFile() ? [] : [full.slice(root2.length + 1)];
  });
}
function writeDist(frontend, tgz) {
  const scratch = mkdtempSync(join(tmpdir(), "tj-dist-"));
  const incoming = mkdtempSync(join(frontend, ".dist-incoming-"));
  try {
    const file = join(scratch, "bundle.tgz");
    writeFileSync(file, tgz);
    let listing;
    try {
      listing = execFileSync("tar", ["-tvzf", file], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 }).toString();
    } catch {
      return "the bundle from the build service could not be read";
    }
    const lines = listing.split("\n").filter(Boolean);
    const bad = lines.filter((line) => !ENTRY.test(line) || / link to | -> /.test(line));
    if (bad.length)
      return `the bundle from the build service holds ${bad.length} link(s) or special file(s), which are refused (${bad[0].trim().slice(0, 160)})`;
    if (!lines.some((line) => line.startsWith("-")))
      return "the bundle from the build service is empty";
    execFileSync("tar", ["-xzf", file, "-C", incoming, "--no-same-owner"], { stdio: "pipe" });
    const irregular = irregularEntries(incoming);
    if (irregular.length)
      return `the bundle from the build service holds links or special files (${irregular.slice(0, 3).join(", ")}), which are refused`;
    const dist = join(frontend, "dist");
    rmSync(dist, { recursive: true, force: true });
    renameSync(incoming, dist);
    return void 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    rmSync(incoming, { recursive: true, force: true });
  }
}
var DEFAULT_REGISTRY = "https://registry.npmjs.org/";
function realOrNearest(target) {
  let at = target;
  const rest = [];
  for (; ; ) {
    try {
      return join(realpathSync(at), ...rest.reverse());
    } catch {
      const parent = dirname(at);
      if (parent === at)
        return target;
      rest.push(at.slice(parent.length).replace(/^[\\/]+/, ""));
      at = parent;
    }
  }
}
var isInside = (base, target) => {
  const rel = relative(base, target);
  return rel === "" || !rel.startsWith("..") && !isAbsolute(rel);
};
function insideProject(dir, path, label = path) {
  const full = resolve(dir, path);
  if (!isInside(resolve(dir), full))
    throw new Error(`"${label}" is outside the project`);
  const parts = relative(resolve(dir), full).split(sep).filter(Boolean);
  let at = resolve(dir);
  for (const part of parts) {
    at = join(at, part);
    let linked = false;
    try {
      linked = lstatSync(at).isSymbolicLink();
    } catch {
      break;
    }
    if (linked)
      throw new Error(`"${label}" goes through a link (${relative(dir, at).split(sep).join("/")}), which these tools never follow`);
  }
  if (!isInside(realOrNearest(resolve(dir)), realOrNearest(full)))
    throw new Error(`"${label}" is outside the project`);
  return full;
}
function unstoredSegment(rel) {
  return rel.split("/").find((part) => part === "node_modules" || part.startsWith("."));
}
function unstoredSourceEntries(dir) {
  const found = [];
  const walk = (at) => {
    if (!existsSync(at))
      return;
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name);
      if (entry.name === "node_modules" || entry.name.startsWith("."))
        found.push(relative(dir, full).split(sep).join("/"));
      else if (entry.isDirectory())
        walk(full);
    }
  };
  walk(join(dir, "frontend", "src"));
  walk(join(dir, "frontend", "styles"));
  return found.sort();
}
function removeUnstoredSource(dir) {
  const found = unstoredSourceEntries(dir);
  for (const rel of found)
    rmSync(join(dir, rel), { recursive: true, force: true });
  return found;
}
var PATH_SPEC = /^(?:\.|~[\\/]|[\\/]|[a-zA-Z]:)/;
var TARBALL = /\.(?:tgz|tar\.gz|tar)$/i;
var REGISTRY_SPEC = /^[A-Za-z0-9.^~<>=*|+ -]*$/;
function nonRegistrySpec(spec) {
  if (typeof spec !== "string")
    return "it is not a version";
  const value = spec.trim();
  if (PATH_SPEC.test(value))
    return "it is a local path";
  if (TARBALL.test(value))
    return "it is a tarball file";
  if (/[:/\\#@]/.test(value))
    return "it is not a registry version (file:, link:, git, URL, GitHub, alias or workspace specs are refused)";
  if (!REGISTRY_SPEC.test(value))
    return "it is not a registry version or range";
  return void 0;
}
var DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
function configuredRegistry(env = process.env) {
  const raw = env.npm_config_registry || env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY;
  return raw.endsWith("/") ? raw : `${raw}/`;
}
function foreignResolved(resolved, registry2 = configuredRegistry()) {
  if (typeof resolved !== "string")
    return "it has no download URL";
  let url;
  let reg;
  try {
    url = new URL(resolved);
    reg = new URL(registry2);
  } catch {
    return `it downloads from "${resolved.slice(0, 120)}", which is not a URL`;
  }
  if (url.username || url.password)
    return "its download URL carries credentials";
  const sameRegistry = url.origin === reg.origin && url.pathname.startsWith(reg.pathname);
  const publicRegistry = url.protocol === "https:" && url.host === "registry.npmjs.org";
  if (!sameRegistry && !publicRegistry)
    return `it downloads from ${url.origin}, not the configured registry (${reg.origin})`;
  if (publicRegistry)
    return void 0;
  if (url.protocol !== "https:" && reg.protocol !== url.protocol)
    return "it downloads over plain http";
  return void 0;
}
function dependencyProblems(dir, registry2 = configuredRegistry()) {
  return [...manifestProblems(dir), ...lockfileProblems(dir, registry2)];
}
function manifestProblems(dir) {
  const problems = [];
  const manifest = insideProject(dir, "frontend/package.json");
  if (!existsSync(manifest))
    return problems;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(manifest, "utf8"));
  } catch {
    return ["frontend/package.json is not valid JSON"];
  }
  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object")
      continue;
    for (const [name, spec] of Object.entries(deps)) {
      const why = nonRegistrySpec(spec);
      if (why)
        problems.push(`frontend/package.json ${field} "${name}": "${String(spec).slice(0, 120)}": ${why}`);
    }
  }
  if (pkg.workspaces !== void 0)
    problems.push("frontend/package.json declares workspaces, which install other folders");
  for (const field of ["overrides", "resolutions"]) {
    const walk = (value, at) => {
      if (typeof value === "string") {
        const why = value.startsWith("$") ? void 0 : nonRegistrySpec(value);
        if (why)
          problems.push(`frontend/package.json ${field} ${at}: "${value.slice(0, 120)}": ${why}`);
      } else if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value))
          walk(child, at ? `${at} > ${key}` : key);
      }
    };
    walk(pkg[field], "");
  }
  return problems;
}
function lockfileProblems(dir, registry2 = configuredRegistry()) {
  const problems = [];
  for (const name of ["package-lock.json", "npm-shrinkwrap.json"]) {
    const file = insideProject(dir, `frontend/${name}`);
    if (!existsSync(file))
      continue;
    let lock;
    try {
      lock = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      problems.push(`frontend/${name} is not valid JSON`);
      continue;
    }
    for (const [key, entry] of Object.entries(lock.packages ?? {})) {
      if (key === "")
        continue;
      if (!/^node_modules\/(?:@[^/]+\/)?[^/]+(?:\/node_modules\/(?:@[^/]+\/)?[^/]+)*$/.test(key)) {
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}" is not an installed package (a linked folder)`);
        continue;
      }
      if (entry?.link) {
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}" is a link to a folder`);
        continue;
      }
      const why = entry?.resolved === void 0 ? void 0 : foreignResolved(entry.resolved, registry2);
      if (why)
        problems.push(`frontend/${name} entry "${key.slice(0, 120)}": ${why}`);
    }
    const walkV1 = (deps, at) => {
      for (const [dep, entry] of Object.entries(deps ?? {})) {
        const where = at ? `${at} > ${dep}` : dep;
        const version = typeof entry?.version === "string" ? entry.version : "";
        if (/^(file|link|git|github|http|https):|^\.|\//.test(version))
          problems.push(`frontend/${name} dependency "${where}" is "${version.slice(0, 120)}", not a registry package`);
        else if (entry?.resolved !== void 0) {
          const why = foreignResolved(entry.resolved, registry2);
          if (why)
            problems.push(`frontend/${name} dependency "${where}": ${why}`);
        }
        walkV1(entry?.dependencies, where);
      }
    };
    if (!lock.packages)
      walkV1(lock.dependencies, "");
  }
  return [...new Set(problems)];
}
function dependencyRefusal(dir, what) {
  const problems = dependencyProblems(dir);
  if (!problems.length)
    return void 0;
  return new Error(`${what} was refused: the app's dependencies must all be registry packages from the configured registry.
` + problems.slice(0, 20).map((p) => `- ${p}`).join("\n") + (problems.length > 20 ? `
- and ${problems.length - 20} more` : "") + "\nRemove these packages with code_app_add_dependency (remove), or pin each to a registry version.");
}
function escapingLinks(dir) {
  const modules = join(dir, "frontend", "node_modules");
  if (!existsSync(modules))
    return [];
  let base;
  try {
    base = realpathSync(dir);
  } catch {
    return [];
  }
  const sdk = (process.env.TOOLJET_SDK_SPEC ?? "").replace(/^file:/, "");
  let sdkReal;
  try {
    sdkReal = sdk ? realpathSync(sdk) : void 0;
  } catch {
    sdkReal = void 0;
  }
  const out = [];
  const check = (full) => {
    let link = false;
    try {
      link = lstatSync(full).isSymbolicLink();
    } catch {
      return;
    }
    if (!link)
      return;
    let target;
    try {
      target = realpathSync(full);
    } catch {
      return;
    }
    if (isInside(base, target) || sdkReal && target === sdkReal)
      return;
    out.push(relative(dir, full).split(sep).join("/"));
  };
  for (const entry of readdirSync(modules, { withFileTypes: true })) {
    const full = join(modules, entry.name);
    if (entry.name.startsWith("@") && entry.isDirectory()) {
      for (const child of readdirSync(full))
        check(join(full, child));
    } else {
      check(full);
    }
  }
  return out.sort();
}
function removeEscapingLinks(dir) {
  const links = escapingLinks(dir);
  if (!links.length)
    return void 0;
  for (const rel of links)
    rmSync(join(dir, rel), { force: true });
  return new Error(`The install linked ${links.join(", ")} to a folder outside the project; ${links.length > 1 ? "those links were" : "that link was"} removed. Only registry packages may be installed.`);
}
var WRITES_MARKER = join(".tooljet", "agent-writes.json");
function markAgentWrites(dir) {
  try {
    mkdirSync(join(dir, ".tooljet"), { recursive: true });
    writeFileSync(join(dir, WRITES_MARKER), JSON.stringify({ at: (/* @__PURE__ */ new Date()).toISOString(), pid: process.pid }) + "\n");
  } catch {
  }
}
var hasAgentWrites = (dir) => {
  const ttl = Number(process.env.MCP_CODE_WRITES_MARKER_TTL_MS ?? 6 * 36e5);
  const at = statSync(join(dir, WRITES_MARKER), { throwIfNoEntry: false })?.mtimeMs;
  return at !== void 0 && (!(ttl > 0) || Date.now() - at < ttl);
};
function clearAgentWrites(dir) {
  rmSync(join(dir, WRITES_MARKER), { force: true });
}
function beforePullCopies(dir) {
  const folder = join(dir, ".tooljet", "before-pull");
  if (!existsSync(folder))
    return [];
  return readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => ({ name: entry.name, at: statSync(join(folder, entry.name)).mtimeMs })).sort((a, b) => b.at - a.at || (a.name < b.name ? 1 : -1)).map((entry) => `.tooljet/before-pull/${entry.name}`);
}
function pruneBeforePull(dir, keep = 3) {
  const copies = beforePullCopies(dir);
  for (const old of copies.slice(keep))
    rmSync(join(dir, old), { recursive: true, force: true });
  return copies.slice(0, keep);
}
var alive2 = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
};
var ProjectBusyError = class extends Error {
};
async function withProjectLock(lock, work, { waitMs, pollMs = 100 } = {}) {
  const wait = waitMs ?? Number(process.env.MCP_CODE_PROJECT_LOCK_WAIT_MS ?? 6e5);
  const stale2 = Number(process.env.MCP_CODE_PROJECT_LOCK_STALE_MS ?? 18e5);
  const deadline = Date.now() + wait;
  mkdirSync(dirname(lock), { recursive: true });
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  for (; ; ) {
    try {
      mkdirSync(lock);
      writeFileSync(join(lock, "owner"), JSON.stringify({ pid: process.pid, at: Date.now(), token }));
      break;
    } catch (error) {
      if (error.code !== "EEXIST")
        throw error;
      let owner = {};
      try {
        owner = JSON.parse(readFileSync(join(lock, "owner"), "utf8"));
      } catch {
        owner = { at: statSync(lock, { throwIfNoEntry: false })?.mtimeMs };
      }
      const gone = owner.pid !== void 0 && owner.pid !== process.pid && !alive2(owner.pid) || owner.at !== void 0 && Date.now() - owner.at > stale2;
      if (gone) {
        rmSync(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new ProjectBusyError("Another build is working on this app's code right now, so nothing was done. Try again in a minute.");
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  }
  try {
    return await work();
  } finally {
    try {
      const owner = JSON.parse(readFileSync(join(lock, "owner"), "utf8"));
      if (owner.token === token)
        rmSync(lock, { recursive: true, force: true });
    } catch {
    }
  }
}
var run2 = promisify(execFile);
var USER_WORDS = ` Talk to the user about "the app's code" and its versions (v1, v2): one version line, as for any app. Never say code version, revision, publishing code, bundle, library, manifest, root component, dev track or pin, and never show internal names, ids or paths.`;
var noCodeIdentity = (client) => ({
  client,
  workspaceId: async () => "",
  apiUrl: "",
  appUrl: ""
});
var scope = new AsyncLocalStorage();
var current = () => {
  const active = scope.getStore();
  if (!active)
    throw new Error("Code tools need a request identity");
  return active;
};
var SAFE_WORKSPACE = /^[A-Za-z0-9-]{1,64}$/;
var deploymentKey = (apiUrl) => {
  let url;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error("This request names no valid ToolJet backend.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("This request names no valid ToolJet backend.");
  const canonical = `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, "")}`;
  return `d_${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
};
var inScope = (context, handler) => async (args) => {
  try {
    if (!context.credential?.sessionToken && !context.credential?.pat)
      throw new Error("Code tools act for a signed-in user, and this request names none.");
    const deployment = deploymentKey(context.apiUrl);
    const workspace = await context.workspaceId();
    if (!SAFE_WORKSPACE.test(workspace))
      throw new Error("This request has no valid workspace.");
    return await scope.run({ ...context, workspace, deployment, authorized: authorizedFor(context) }, () => handler(args));
  } catch (err) {
    return fail(err);
  }
};
var grantTtlMs = () => {
  const ttl = Number(process.env.MCP_CODE_APP_AUTH_TTL_MS ?? 3e4);
  return Number.isFinite(ttl) && ttl >= 0 ? ttl : 3e4;
};
var authorizations = /* @__PURE__ */ new WeakMap();
var authorizedFor = (context) => {
  const known = authorizations.get(context) ?? /* @__PURE__ */ new Map();
  authorizations.set(context, known);
  return known;
};
var authorizeApp = async (appId, need) => {
  const active = current();
  const key = `${active.deployment}\0${active.workspace}\0${appId}`;
  const known = active.authorized.get(key);
  if (known && Date.now() - known.at < grantTtlMs() && known[need])
    return;
  active.authorized.delete(key);
  let app;
  try {
    app = await active.client.getApp(appId);
  } catch {
    throw new Error(`App ${appId} was not found in this workspace.`);
  }
  const owner = app?.organizationId ?? app?.organization_id;
  if (!owner || owner !== active.workspace)
    throw new Error(`App ${appId} was not found in this workspace.`);
  const versionId = app?.editing_version?.id ?? app?.editingVersion?.id;
  let access;
  try {
    if (!versionId)
      throw new Error("no version");
    access = await active.client.codeSourceAccess(appId, versionId);
  } catch {
    throw new Error(need === "edit" ? `ToolJet could not confirm that you can edit app ${appId}, so nothing was changed.` : `ToolJet could not confirm that you can read app ${appId}'s code, so nothing was read.`);
  }
  const grant = { read: access.read, edit: access.read && access.write, at: Date.now() };
  active.authorized.set(key, grant);
  if (need === "edit" && !grant.edit) {
    throw new Error(grant.read ? `You can view app ${appId} but not edit it, so its code cannot be changed, built or installed here.` : `You can view app ${appId} but not edit it or read its code, so its code cannot be changed, built or installed here.`);
  }
  if (need === "read" && !grant.read)
    throw new Error(`You can use app ${appId} but ToolJet does not let you read its code.`);
};
var baseRoot = () => resolve(process.env.TOOLJET_CODE_APP_ROOT || join(homedir(), "tooljet-code-apps"));
var root = () => join(baseRoot(), current().deployment, current().workspace);
var legacyFolders = () => {
  const owner = process.env.MCP_CODE_LEGACY_DEPLOYMENT_URL || process.env.TOOLJET_URL || process.env.TOOLJET_DEPLOYMENT_URL || process.env.TOOLJET_APP_URL || "http://localhost:3000";
  try {
    if (deploymentKey(owner) !== current().deployment)
      return [];
  } catch {
    return [];
  }
  return [join(baseRoot(), current().workspace), baseRoot()];
};
var NAME = /^[a-z][a-z0-9-]{1,40}$/;
var projectDir = (name) => {
  if (!NAME.test(name))
    throw new Error(`name must match ${NAME} (lowercase letters, digits, hyphens)`);
  return join(root(), name);
};
var appIdOf = (dir) => {
  try {
    return JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).appId;
  } catch {
    return void 0;
  }
};
var projectsIn = (folder, appId) => {
  if (!existsSync(folder))
    return [];
  return readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory() && NAME.test(entry.name) && appIdOf(join(folder, entry.name)) === appId).map((entry) => entry.name).sort((a, b) => statSync(join(folder, b, "app.json")).mtimeMs - statSync(join(folder, a, "app.json")).mtimeMs);
};
var projectsForApp = (appId) => {
  for (const folder of legacyFolders()) {
    for (const name of projectsIn(folder, appId)) {
      mkdirSync(root(), { recursive: true });
      if (!existsSync(join(root(), name)))
        renameSync(join(folder, name), join(root(), name));
    }
  }
  return projectsIn(root(), appId);
};
var APP_ID = external_exports.string().uuid().optional().describe("The app's id: finds its project, so you never have to know the folder name");
var PROJECT_NAME = external_exports.string().regex(NAME).optional().describe("The project folder, when you know it; app_id is enough");
var locateProject = async (args, need) => {
  let dir;
  if (args.app_id) {
    await authorizeApp(args.app_id, need);
    const [found] = projectsForApp(args.app_id);
    if (!found)
      throw new Error(`no Code mode project for app ${args.app_id}; call code_app_scaffold with this app_id`);
    dir = join(root(), found);
  } else {
    if (!args.name)
      throw new Error("give app_id (or the project name)");
    dir = projectDir(args.name);
    const legacy = existsSync(join(dir, "app.json")) ? void 0 : legacyFolders().map((folder) => join(folder, args.name)).find((candidate) => existsSync(join(candidate, "app.json")));
    const owner = appIdOf(legacy ?? dir);
    if (!owner)
      throw new Error(`no app project "${args.name}"; call code_app_scaffold first`);
    await authorizeApp(owner, need);
    if (legacy) {
      mkdirSync(root(), { recursive: true });
      renameSync(legacy, dir);
    }
  }
  touchProject(dir);
  return dir;
};
var projectLockPath = (dir) => join(baseRoot(), ".locks", `${current().deployment}.${current().workspace}.${basename(dir)}`);
var onProject = (dir, work) => withProjectLock(projectLockPath(dir), work);
var STYLE_FILES = /* @__PURE__ */ new Set(["frontend/styles/theme.css", "frontend/styles/global.css"]);
var editable = (dir, path) => {
  const full = resolve(dir, path);
  const rel = relative(dir, full).split(sep).join("/");
  if (!(rel === "app.json" || STYLE_FILES.has(rel) || rel.startsWith("frontend/src/") && !rel.endsWith("tooljet.gen.ts"))) {
    throw new Error(`"${path}" is not editable: write app.json, frontend/styles/theme.css, frontend/styles/global.css or files under frontend/src/ (tooljet.gen.ts is generated)`);
  }
  const unstored = unstoredSegment(rel.slice("frontend/".length));
  if (rel.startsWith("frontend/") && unstored) {
    throw new Error(unstored === "node_modules" ? `"${path}" is not editable: nothing may be written under a node_modules folder (add packages with code_app_add_dependency)` : `"${path}" is not editable: files and folders whose names start with a dot are never stored with the app`);
  }
  return insideProject(dir, rel, path);
};
var TEXT = /\.(tsx?|jsx?|json|css|md)$/i;
var listFiles = (dir, base = dir, out = []) => {
  if (!existsSync(dir))
    return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist"].includes(entry.name) || entry.name.startsWith("."))
      continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      listFiles(full, base, out);
    else if (entry.isFile() && TEXT.test(entry.name) && entry.name !== "package-lock.json")
      out.push(relative(base, full).split(sep).join("/"));
  }
  return out.sort();
};
var strip2 = (s) => s.replace(/\x1b\[[0-9;]*m/g, "");
var HOST_ENV = [
  "PATH",
  "TMPDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
  "TOOLJET_SDK_SPEC",
  "TOOLJET_APP_SCANNER_BIN"
];
var SECRET_NAME = /TOKEN|SECRET|PASSWORD|PASSWD|KEY|PAT$|CREDENTIAL|COOKIE/i;
var operatorEnv = () => (process.env.MCP_CODE_CLI_ENV_PASS ?? "").split(",").map((name) => name.trim()).filter((name) => name && !SECRET_NAME.test(name));
var cliHome;
var buildHome = () => cliHome ??= mkdtempSync(join(tmpdir(), CLI_HOME_PREFIX));
process.once("exit", () => {
  if (cliHome)
    rmSync(cliHome, { recursive: true, force: true });
});
var cliEnv = () => {
  const active = current();
  const env = {};
  for (const name of [...HOST_ENV, ...operatorEnv()])
    if (process.env[name] !== void 0)
      env[name] = process.env[name];
  const { sessionToken, pat } = active.credential ?? {};
  return {
    ...env,
    HOME: buildHome(),
    USERPROFILE: buildHome(),
    FORCE_COLOR: "0",
    // The CLI is oclif: under NODE_ENV=development it loads its TypeScript sources instead of the build and fails
    // ("Unexpected token ':'"). A ToolJet server running in development passes that on to this MCP server.
    NODE_ENV: "production",
    TOOLJET_CLI_SERVER_MODE: "1",
    TOOLJET_URL: active.apiUrl,
    TOOLJET_APP_URL: process.env.TOOLJET_DEPLOYMENT_URL ?? active.appUrl,
    ...sessionToken ? { TOOLJET_SESSION_TOKEN: sessionToken, TOOLJET_WORKSPACE_ID: active.workspace } : { TOOLJET_PAT: pat },
    // npm's cache is by content hash, so projects can share it; a home per process alone would download everything each build.
    npm_config_cache: process.env.MCP_CODE_NPM_CACHE ?? join(baseRoot(), ".npm-cache"),
    ...registry() ? { npm_config_registry: registry() } : {}
  };
};
var registry = () => process.env.npm_config_registry ?? process.env.NPM_CONFIG_REGISTRY;
var COUNTED_COMMANDS = /* @__PURE__ */ new Set(["library build", "app dev", "app install", "app check"]);
var runCli = async (cwd, args, timeoutMs) => {
  const [cmd, pre] = process.env.TOOLJET_CLI ? ["node", [process.env.TOOLJET_CLI]] : ["tooljet", []];
  try {
    const { stdout, stderr } = await run2(cmd, [...pre, ...args], { cwd, timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024, env: cliEnv() });
    return { code: 0, output: strip2(stdout + stderr) };
  } catch (err) {
    const e = err;
    return { code: typeof e.code === "number" ? e.code : 1, output: strip2((e.stdout ?? "") + (e.stderr ?? e.message ?? "")) };
  }
};
var serverModeChecked;
var requireServerModeCli = () => {
  if (process.env.MCP_CODE_CLI_HANDSHAKE === "0")
    return Promise.resolve();
  serverModeChecked ??= runCli(baseRoot(), ["app", "server-mode"], 6e4).then((answer) => {
    if (!answer.output.includes("tooljet-server-mode:1")) {
      serverModeChecked = void 0;
      throw new Error("This server's ToolJet CLI does not support server mode, so Code builds are off here. Update the CLI.");
    }
  });
  return serverModeChecked;
};
var cliReady;
var codeCliProblem = () => {
  if (process.env.MCP_CODE_CLI_HANDSHAKE === "0")
    return Promise.resolve(void 0);
  cliReady ??= (async () => {
    const [cmd, pre] = process.env.TOOLJET_CLI ? ["node", [process.env.TOOLJET_CLI]] : ["tooljet", []];
    const env = { HOME: buildHome(), USERPROFILE: buildHome(), FORCE_COLOR: "0", NODE_ENV: "production", TOOLJET_CLI_SERVER_MODE: "1" };
    for (const name of HOST_ENV)
      if (process.env[name] !== void 0)
        env[name] = process.env[name];
    try {
      const { stdout, stderr } = await run2(cmd, [...pre, "app", "server-mode"], { timeout: 6e4, env });
      if (strip2(stdout + stderr).includes("tooljet-server-mode:1"))
        return void 0;
      return CLI_TOO_OLD;
    } catch (err) {
      const e = err;
      if (e.code === "ENOENT" || /MODULE_NOT_FOUND|Cannot find module/.test(e.stderr ?? ""))
        return CLI_MISSING;
      return /Unknown command|not a tooljet command|command .*not found/i.test(strip2((e.stdout ?? "") + (e.stderr ?? ""))) ? CLI_TOO_OLD : CLI_MISSING;
    }
  })().then((problem) => {
    if (problem)
      cliReady = void 0;
    return problem;
  });
  return cliReady;
};
var CLI_FIX = "install it with `npm install -g @tooljet/cli@beta` (or set TOOLJET_CLI to its entry point), then try again";
var CLI_MISSING = `Code mode apps are built with the ToolJet CLI on the machine running this MCP server, and it is not installed: ${CLI_FIX}. No app was created. Or build a visual app (create_app without build_mode).`;
var CLI_TOO_OLD = `The ToolJet CLI on the machine running this MCP server is too old for Code mode: ${CLI_FIX}. No app was created. Or build a visual app (create_app without build_mode).`;
async function cli(cwd, args, timeoutMs = 3e5) {
  mkdirSync(baseRoot(), { recursive: true });
  await requireServerModeCli();
  const command = args.filter((a) => !a.startsWith("-")).slice(0, 2).join(" ");
  if (!COUNTED_COMMANDS.has(command))
    return runCli(cwd, args, timeoutMs);
  return withBuildSlot(baseRoot(), `${current().deployment}.${current().workspace}`, () => runCli(cwd, args, timeoutMs));
}
var PLACEHOLDER_NAME = /^Untitled App\b/;
async function nameApp(client, dir, name, replaceName) {
  let snapshot;
  try {
    snapshot = JSON.parse(readFileSync(join(dir, ".tooljet", "snapshot.json"), "utf8"));
  } catch {
    return {};
  }
  const standIn = PLACEHOLDER_NAME.test(snapshot.appName ?? "") || !!replaceName && snapshot.appName === replaceName;
  if (!client || !snapshot.appId || !snapshot.versionId || !standIn || snapshot.appName === name)
    return {};
  try {
    await client.renameApp(snapshot.appId, snapshot.versionId, name);
    return { renamed_to: name };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/exist|unique|duplicate|taken|conflict|409|422/i.test(message))
      return { rename_warning: `Could not name the app: ${message}` };
    const fallback = `${name} ${Math.random().toString(36).slice(2, 5)}`;
    await client.renameApp(snapshot.appId, snapshot.versionId, fallback);
    return { renamed_to: fallback, rename_warning: `App name "${name}" is already used in this workspace; the app was named "${fallback}" instead.` };
  }
}
function parseReport(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start)
    return null;
  try {
    return JSON.parse(output.slice(start, end + 1));
  } catch {
    return null;
  }
}
var mustFix = (security) => (security?.findings ?? []).filter((f) => f.severity === "critical" || f.severity === "high");
var securitySummary = (security) => !security ? { error: "no security report (the CLI predates tooljet app check --json)" } : security.error ? { error: security.error } : {
  gate: security.gate,
  counts: security.counts,
  not_run: (security.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ""}`),
  findings: (security.findings ?? []).slice(0, 40),
  ...(security.findings?.length ?? 0) > 40 ? { more_findings: security.findings.length - 40 } : {}
};
function withDependencies(pkg, packages) {
  const dependencies = { ...pkg.dependencies ?? {} };
  for (const p of packages)
    dependencies[p.name] = p.version;
  return { ...pkg, dependencies: Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
}
function withoutDependencies(pkg, names) {
  const drop = (deps) => deps && Object.fromEntries(Object.entries(deps).filter(([name]) => !names.includes(name)));
  return { ...pkg, ...pkg.dependencies ? { dependencies: drop(pkg.dependencies) } : {}, ...pkg.devDependencies ? { devDependencies: drop(pkg.devDependencies) } : {} };
}
var PACKAGE_NAME = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
var PACKAGE_SPEC = /^(@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*(@[A-Za-z0-9.^~<>=*| -]+)?$/;
function codeAppScaffoldTool(context) {
  return {
    name: "code_app_scaffold",
    title: "Scaffold Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Create the Code mode project for an app you created with create_app: app.json (the app and its routes, its screens) and frontend/ (React + TypeScript on shadcn + Tailwind, react-router through AppRouter). Create the app's queries (code_app_data) BEFORE this, so the typed hooks it writes (frontend/src/tooljet.gen.ts: useAppQuery, row types, ROUTES, routePath, PAGES) list them. Returns the files and the generated hooks." + USER_WORDS,
    inputSchema: {
      name: external_exports.string().regex(NAME).describe("Project folder: lowercase letters, digits and hyphens, e.g. inventory-console"),
      display_name: external_exports.string().min(1).max(100).describe(`The app's name; an app still called "Untitled App" is renamed to it`),
      app_id: external_exports.string().uuid().describe("The app from create_app"),
      rename_from: external_exports.string().max(100).optional().describe("Set by ToolJet; leave it out")
    },
    handler: inScope(context, async (args) => {
      try {
        await authorizeApp(args.app_id, "edit");
        cleanOldProjects(baseRoot());
        const [existing] = projectsForApp(args.app_id);
        let name = args.name;
        const taken = !existing && appIdOf(projectDir(name));
        if (taken && taken !== args.app_id && process.env.MCP_CODE_SCAFFOLD_FREE_NAME !== "0")
          name = `${args.name.slice(0, 32).replace(/-+$/, "")}-${args.app_id.slice(0, 8)}`;
        const dir = existing ? join(root(), existing) : projectDir(name);
        return await onProject(dir, async () => {
          const owner = appIdOf(dir);
          if (!existing && owner && owner !== args.app_id)
            throw new Error(`project "${name}" belongs to app ${owner}; choose another name`);
          const created = !existsSync(join(dir, "app.json"));
          if (created) {
            mkdirSync(root(), { recursive: true });
            const init = await cli(root(), ["app", "init", name, "--name", args.display_name, "--no-install"]);
            if (init.code !== 0)
              throw new Error(`tooljet app init failed: ${init.output}`);
            const appFile = join(dir, "app.json");
            writeFileSync(appFile, JSON.stringify({ ...JSON.parse(readFileSync(appFile, "utf8")), appId: args.app_id }, null, 2) + "\n");
            const install = await installDependencies(dir, "Installing the template");
            if (install.code !== 0)
              throw new Error(`tooljet app install failed: ${install.output}`);
          }
          const pull = await cli(dir, ["app", "pull"]);
          if (pull.code !== 0)
            throw new Error(`tooljet app pull failed: ${pull.output}`);
          const restored = created ? await restoreStoredCode(dir) : {};
          const naming = await nameApp(context.client, dir, args.display_name, args.rename_from);
          if (!existing && !restored.stored_code)
            rememberScaffold(dir);
          const visual = created ? await visualAppWarning(context.client, args.app_id) : void 0;
          return ok({
            project_dir: dir,
            ...visual ? { warning: visual } : {},
            ...naming,
            ...restored,
            ...existing ? { existing_project: existing, note: `This app already has a project, "${existing}"; it is used as is.` } : {},
            files: listFiles(dir),
            app_json: JSON.parse(readFileSync(join(dir, "app.json"), "utf8")),
            generated_hooks: readFileSync(join(dir, "frontend", "src", "tooljet.gen.ts"), "utf8"),
            next: "Set the routes in app.json, write the screens under frontend/src/App/, then code_app_install with verify: true."
          });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function visualAppWarning(client, appId) {
  const app = await client.getApp(appId).catch(() => null);
  if (!app || isCodeModeApp(app))
    return void 0;
  return 'This app was created as a visual app, not a Code mode app (create_app without build_mode "code"). Its code will run, but ToolJet will treat it as visual. If this is a new build, create the app again with create_app build_mode "code" and scaffold that one instead; tell the user which app you used.';
}
async function restoreStoredCode(dir) {
  const manifest = join(dir, "frontend", "package.json");
  const before = existsSync(manifest) ? readFileSync(manifest, "utf8") : "";
  const pull = await cli(dir, ["app", "source-pull", "--force"], 6e4);
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output))
    throw new Error("ToolJet refused access to this app's stored code.");
  if (pull.code !== 0)
    return { sync_warning: `Could not bring the app's stored code into the new project: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output)) {
    nothingStored.add(dir);
    freshProjects.add(dir);
    lastSynced.set(dir, Date.now());
    return {};
  }
  if (!/Pulled revision|Already at revision/.test(pull.output))
    return {};
  if ((existsSync(manifest) ? readFileSync(manifest, "utf8") : "") !== before) {
    const install = await installDependencies(dir, "Installing the app's stored dependencies");
    if (install.code !== 0)
      throw new Error(`tooljet app install failed after bringing the app's code down: ${install.output}`);
  }
  freshProjects.add(dir);
  lastSynced.set(dir, Date.now());
  return {
    stored_code: "This app already has code on ToolJet: the project now holds it, not the template. Read the files you change before writing them, and keep the app's existing screens."
  };
}
async function installDependencies(dir, what, timeoutMs) {
  const refusal = dependencyRefusal(dir, what);
  if (refusal)
    throw refusal;
  const install = await cli(dir, ["app", "install"], timeoutMs);
  const escaped = removeEscapingLinks(dir);
  if (escaped)
    throw escaped;
  return install;
}
async function syncEditorEdits(dir, { force = false } = {}) {
  if (!force && nothingStored.has(dir))
    return {};
  if (force)
    forgetSourceRevision(dir);
  let pull = await cli(dir, ["app", "source-pull"], 6e4);
  let copy;
  if (force && pull.code !== 0 && /Not pulled\. These files differ/i.test(pull.output)) {
    const copies = new Set(beforePullCopies(dir));
    pull = await cli(dir, ["app", "source-pull", "--force"], 6e4);
    copy = pruneBeforePull(dir).find((kept) => !copies.has(kept));
  }
  if (pull.code !== 0 && /\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(pull.output))
    throw new Error("ToolJet refused access to this app's stored code.");
  if (pull.code !== 0)
    return { sync_warning: `Could not check the ToolJet editor for edits: ${pull.output.trim().slice(0, 300)}` };
  if (/No source is stored/i.test(pull.output))
    nothingStored.add(dir);
  else
    nothingStored.delete(dir);
  lastSynced.set(dir, Date.now());
  return {
    .../Pulled revision/.test(pull.output) ? { editor_edits: pull.output.trim() } : {},
    ...copy ? { before_pull_copy: `The files this pull replaced are kept in ${copy} (the last 3 copies are kept).` } : {}
  };
}
var freshProjects = /* @__PURE__ */ new Set();
var nothingStored = /* @__PURE__ */ new Set();
var scaffoldHashes = /* @__PURE__ */ new Map();
var readHashes = /* @__PURE__ */ new Map();
var ownWrites = /* @__PURE__ */ new Map();
var lastSynced = /* @__PURE__ */ new Map();
var readSyncWindowMs = () => Number(process.env.MCP_CODE_APP_READ_SYNC_MS ?? 2e4);
var syncedRecently = (dir) => Date.now() - (lastSynced.get(dir) ?? -Infinity) < readSyncWindowMs();
var sha = (text) => createHash("sha256").update(text).digest("hex");
var readKey = (dir, rel) => `${dir}\0${rel}`;
function forgetSourceRevision(dir) {
  const file = join(dir, ".tooljet", "source.json");
  if (!existsSync(file))
    return;
  try {
    const state = JSON.parse(readFileSync(file, "utf8"));
    writeFileSync(file, JSON.stringify({ ...state, revision: -1 }, null, 2) + "\n");
  } catch {
  }
}
function rememberScaffold(dir) {
  for (const rel of listFiles(dir)) {
    const full = join(dir, rel);
    if (existsSync(full))
      scaffoldHashes.set(readKey(dir, rel), sha(readFileSync(full, "utf8")));
  }
}
var wroteHere = /* @__PURE__ */ new Set();
var unstoredWrites = (dir) => wroteHere.has(dir) || hasAgentWrites(dir);
function noteWrite(dir) {
  wroteHere.add(dir);
  markAgentWrites(dir);
}
async function ensureFresh(dir) {
  if (freshProjects.has(dir))
    return {};
  const sync = await syncEditorEdits(dir, { force: !unstoredWrites(dir) });
  if (!sync.sync_warning)
    freshProjects.add(dir);
  return sync;
}
var prefetchedScans = /* @__PURE__ */ new Map();
var scanReuseMs = () => Number(process.env.MCP_CODE_APP_SCAN_REUSE_MS ?? 6e5);
var installReuse = () => process.env.MCP_CODE_INSTALL_REUSE !== "0" && !buildServiceUrl();
var devBuilt = /* @__PURE__ */ new Map();
function projectHash(dir) {
  const hash = createHash("sha256");
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (entry.isDirectory() && ["node_modules", "dist", ".tooljet"].includes(entry.name))
        continue;
      const full = join(at, entry.name);
      if (entry.isDirectory())
        walk(full);
      else if (entry.isFile())
        hash.update(relative(dir, full)).update("\0").update(readFileSync(full)).update("\0");
    }
  };
  walk(dir);
  return hash.digest("hex");
}
function prefetchFullScan(dir) {
  if (process.env.MCP_CODE_APP_SCAN_PREFETCH === "0")
    return;
  const hash = projectHash(dir);
  const result = cli(dir, ["app", "check", "--json"]).then((check) => {
    try {
      return projectHash(dir) === hash ? check : null;
    } catch {
      return null;
    }
  });
  prefetchedScans.set(dir, { hash, at: Date.now(), result });
}
async function fullScan(dir) {
  const prefetched = prefetchedScans.get(dir);
  prefetchedScans.delete(dir);
  if (prefetched && Date.now() - prefetched.at < scanReuseMs() && projectHash(dir) === prefetched.hash) {
    const check = await prefetched.result;
    const security = check && parseReport(check.output)?.security;
    if (check && security && !security.error && projectHash(dir) === prefetched.hash)
      return { ...check, reused: true };
  }
  return { ...await cli(dir, ["app", "check", "--json"]), reused: false };
}
var sdkCopied = /* @__PURE__ */ new Set();
async function copySdkIn(dir) {
  let linked = false;
  try {
    linked = lstatSync(join(dir, "frontend", "node_modules", "@tooljet", "custom-component-sdk")).isSymbolicLink();
  } catch {
    return;
  }
  if (!linked || sdkCopied.has(dir))
    return;
  sdkCopied.add(dir);
  await installDependencies(dir, "Copying the SDK into the project", 18e4);
}
var TYPE_CHECKED = /^frontend\/(src\/.*\.tsx?|.*\.css)$/;
async function typeCheckAfterWrite(dir, written) {
  if (process.env.MCP_CODE_WRITE_TYPECHECK !== "1" || !written.some((rel) => TYPE_CHECKED.test(rel)))
    return void 0;
  await copySdkIn(dir);
  const result = await cli(join(dir, "frontend"), ["library", "typecheck", "--json"], 3e4);
  const report = parseReport(result.output);
  if (!Array.isArray(report?.problems))
    return void 0;
  if (!report.problems.length)
    return { errors: 0 };
  const problems = report.problems.map(fromChecked);
  const unwritten = problems.filter((p) => p.code === "TS2307" && /Cannot find module '\.{1,2}\//.test(p.message));
  const rest = problems.filter((p) => !unwritten.includes(p));
  return {
    errors: problems.length,
    ...rest.length ? { fix: formatProblems(rest, 25) } : {},
    ...unwritten.length ? { not_written_yet: [...new Set(unwritten.map((p) => `${/'([^']+)'/.exec(p.message)?.[1]} (imported at ${p.at})`))] } : {},
    note: "Fix these in this round of writes, before code_app_build. An import of a file you have not written yet clears once you write it."
  };
}
function changedLines(before, after) {
  const count = (text) => text.split("\n").reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), /* @__PURE__ */ new Map());
  const a = count(before);
  const b = count(after);
  let changed = 0;
  for (const [line, n] of a)
    changed += Math.max(0, n - (b.get(line) ?? 0));
  for (const [line, n] of b)
    changed += Math.max(0, n - (a.get(line) ?? 0));
  return changed;
}
var clip = (line) => line.trim().length > 100 ? `${line.trim().slice(0, 100)}...` : line.trim();
var lineAt = (text, index) => text.slice(0, index).split("\n").length;
function findHint(content, find) {
  const lines = content.split("\n");
  const at = [];
  for (let i = content.indexOf(find); i >= 0 && at.length < 6; i = content.indexOf(find, i + 1))
    at.push(lineAt(content, i));
  if (at.length > 1) {
    const shown = at.slice(0, 5).map((n) => `line ${n}${n > 1 ? ` (after "${clip(lines[n - 2])}")` : ""}`);
    return ` It is at ${shown.join("; ")}${at.length > 5 ? "; and more" : ""}. Add a neighbouring line to the find so it matches one place.`;
  }
  if (at.length === 1)
    return "";
  const wanted = find.split("\n").map((l) => l.trim());
  const trimmed = lines.map((l) => l.trim());
  const starts = trimmed.flatMap((l, i) => wanted.every((w, k) => trimmed[i + k] === w) ? [i + 1] : []);
  if (starts.length === 1)
    return ` The same lines are at line ${starts[0]} with different indentation or spacing; copy them exactly as the file has them.`;
  const words = (l) => new Set(l.match(/[A-Za-z_$][\w$]*|\d+/g) ?? []);
  const key = wanted.reduce((a, b) => b.length > a.length ? b : a, "");
  const target = words(key);
  if (!target.size)
    return "";
  const scored = lines.map((l, i) => {
    const w = words(l);
    const shared = [...target].filter((t) => w.has(t)).length;
    return { n: i + 1, l, score: shared / Math.max(target.size, w.size) };
  }).filter((x) => x.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, 2);
  return scored.length ? ` Closest: ${scored.map((x) => `line ${x.n}: "${clip(x.l)}"`).join("; ")}.` : "";
}
var isRewrite = (before, after) => {
  const changed = changedLines(before, after);
  const size = Math.max(before.split("\n").length, after.split("\n").length);
  return changed > 20 && changed > 0.4 * size;
};
function codeAppReadFilesTool(context) {
  return {
    name: "code_app_read_files",
    title: "Read Code Mode Files",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    description: "Read a Code mode project. Without paths, lists its files; with paths, returns their contents (app.json, frontend/...). Edits saved in the ToolJet Code panel since the last install are brought into the project first." + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME, paths: external_exports.array(external_exports.string()).optional() },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "read");
        return await onProject(dir, async () => {
          if (!freshProjects.has(dir))
            await followDraft(dir);
          const sync = !freshProjects.has(dir) ? await ensureFresh(dir) : syncedRecently(dir) ? {} : await syncEditorEdits(dir);
          if (!args.paths?.length)
            return ok({ project_dir: dir, ...sync, files: listFiles(dir) });
          const files = Object.fromEntries(args.paths.map((p) => {
            const full = insideProject(dir, p);
            const rel = relative(dir, full).split(sep).join("/");
            const content = readFileSync(full, "utf8");
            readHashes.set(readKey(dir, rel), sha(content));
            return [p, content];
          }));
          return ok({ project_dir: dir, ...sync, files });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
function codeAppWriteFilesTool(context) {
  return {
    name: "code_app_write_files",
    title: "Write Code Mode Files",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description: "Write into a Code mode project: app.json (name and routes [{id, path, title}]; its codePage stays as the scaffold set it), frontend/styles/theme.css (tokens), frontend/styles/global.css (page-wide rules and library overrides) and anything under frontend/src/. To change an existing file, read it first (code_app_read_files) and pass edits: [{ path, find, replace }] with the exact text to change; a file you wrote in this build needs no read first, and before the first install may be sent whole again. files: [{ path, content }] is for new files and for replacing a file still as the template left it, or for a rewrite the request needs (then rewrite: true, as well as the files). A write to a file that changed in the ToolJet editor since you read it is refused: read it again and apply your change to what is there. Read data with useAppQuery from ../tooljet.gen; write by awaiting a query's run({ ...parameters }); route with AppRouter, react-router <Routes>/<Route> whose paths are exactly app.json's, and routePath(id, params). A type_check in the result lists the project's type errors after this write: fix them before code_app_build. Then code_app_build." + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      files: external_exports.array(external_exports.object({ path: external_exports.string(), content: external_exports.string() })).max(40).optional(),
      edits: external_exports.array(external_exports.object({ path: external_exports.string(), find: external_exports.string().min(1), replace: external_exports.string() })).max(60).optional().describe("Targeted changes to existing files: each find must appear exactly once in the file as it is now"),
      rewrite: external_exports.boolean().optional().describe("Allow files to replace most of an existing file (only when the request needs it)")
    },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => {
          if (!args.files?.length && !args.edits?.length)
            throw new Error(`Nothing was written: this call had no files and no edits, so it sent no code${args.rewrite ? " (rewrite: true only allows a rewrite, it carries none)" : ""}. Send the code in this call: files: [{ path, content }] with the whole file, or edits: [{ path, find, replace }].`);
          if (!freshProjects.has(dir))
            await followDraft(dir);
          const first = await ensureFresh(dir);
          const sync = first.editor_edits || first.sync_warning ? first : await syncEditorEdits(dir);
          const next = /* @__PURE__ */ new Map();
          const current2 = (rel, full) => next.get(rel)?.content ?? (existsSync(full) ? readFileSync(full, "utf8") : void 0);
          const stale2 = (rel, full) => {
            if (next.has(rel) || !existsSync(full))
              return void 0;
            const known = readHashes.get(readKey(dir, rel));
            if (!known)
              return `${rel} has not been read in this build: read it with code_app_read_files first`;
            if (known !== sha(readFileSync(full, "utf8")))
              return `${rel} changed on ToolJet (an edit in the editor) since you read it: read it again and apply your change to what is there now`;
            return void 0;
          };
          const refusals = [];
          for (const file of args.files ?? []) {
            const full = editable(dir, file.path);
            const rel = relative(dir, full).split(sep).join("/");
            const why = stale2(rel, full);
            if (why)
              refusals.push(why);
            const before = current2(rel, full);
            const stillTemplate = before !== void 0 && scaffoldHashes.get(readKey(dir, rel)) === sha(before);
            const ownFile = before !== void 0 && nothingStored.has(dir) && ownWrites.get(readKey(dir, rel)) === sha(before);
            if (!why && before !== void 0 && !args.rewrite && !stillTemplate && !ownFile && isRewrite(before, file.content))
              refusals.push(`${rel}: this replaces most of the file; change only what the request needs with edits (find/replace), or, if the request really is a rewrite, send these files again with rewrite: true in the same call`);
            next.set(rel, { full, content: file.content });
          }
          for (const edit of args.edits ?? []) {
            const full = editable(dir, edit.path);
            const rel = relative(dir, full).split(sep).join("/");
            const why = stale2(rel, full);
            if (why) {
              refusals.push(why);
              continue;
            }
            const before = current2(rel, full);
            if (before === void 0) {
              refusals.push(`${rel} does not exist: create it with files`);
              continue;
            }
            const found = before.split(edit.find).length - 1;
            if (found !== 1) {
              refusals.push(`${rel}: the find text appears ${found} times; it must match exactly once (copy it from the file as it is now).${findHint(before, edit.find)}`);
              continue;
            }
            next.set(rel, { full, content: before.replace(edit.find, () => edit.replace) });
          }
          if (refusals.length)
            return fail(new Error("Not written:\n" + refusals.map((r) => `- ${r}`).join("\n")));
          noteWrite(dir);
          const written = [];
          const notes = [];
          for (const [rel, entry] of next) {
            const { full } = entry;
            let { content } = entry;
            if (rel === "app.json") {
              const keptPage = keepCodePage(full, content);
              content = keptPage.content;
              if (keptPage.note)
                notes.push(keptPage.note);
            }
            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, content);
            readHashes.set(readKey(dir, rel), sha(content));
            ownWrites.set(readKey(dir, rel), sha(content));
            written.push(rel);
          }
          const types = await typeCheckAfterWrite(dir, written).catch(() => void 0);
          return ok({ project_dir: dir, ...sync, written, ...notes.length ? { notes } : {}, ...types ? { type_check: types } : {} });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function followDraft(dir) {
  let pinned;
  try {
    pinned = JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).version;
  } catch {
    return void 0;
  }
  if (!pinned?.id)
    return void 0;
  const list = await cli(dir, ["app", "checkout", "--list"], 6e4);
  const line = list.output.split("\n").find((l) => l.trimStart().startsWith("*") && l.includes(pinned.id));
  if (list.code !== 0 || !line || /\bdraft\b/i.test(line))
    return void 0;
  const moved = await cli(dir, ["app", "checkout", "--editing"], 6e4);
  if (moved.code !== 0)
    throw new Error(`The app's draft could not be opened: ${moved.output.trim().slice(0, 500)}`);
  return `${pinned.name ?? "The pinned version"} is saved, so the code now goes into the app's draft.`;
}
var STYLESHEET = "frontend/src/styles/globals.css";
var IMPORT_RE = /(?:^|[\s;])import\s+(?:[^'"]*?from\s+)?['"]([^'"]+\.css)['"]/gm;
function nativeSelects(dir) {
  const src = join(dir, "frontend", "src");
  if (!existsSync(join(src, "components", "ui", "select.tsx")))
    return [];
  return listFiles(src).filter((rel) => rel.endsWith(".tsx") && !rel.startsWith("components/")).flatMap((rel) => readFileSync(join(src, rel), "utf8").split("\n").flatMap((line, i) => /<select[\s>]/.test(line) ? [`frontend/src/${rel}:${i + 1}`] : []));
}
function keepCodePage(full, content) {
  if (!existsSync(full))
    return { content };
  let before;
  let after;
  try {
    before = JSON.parse(readFileSync(full, "utf8"));
    after = JSON.parse(content);
  } catch {
    return { content };
  }
  const kept = before.codePage;
  if (!kept || typeof kept.handle !== "string")
    return { content };
  const sent = after.codePage;
  if (sent && sent.handle === kept.handle && sent.name === kept.name)
    return { content };
  const note = sent ? `app.json: codePage kept as "${kept.handle}" (the app's home page, which people open); the code cannot move to "${String(sent.handle)}". Change the name and routes only.` : void 0;
  return { content: JSON.stringify({ ...after, codePage: kept }, null, 2) + "\n", note };
}
function badRouteHandles(dir) {
  const file = join(dir, "app.json");
  if (!existsSync(file))
    return [];
  const routes = JSON.parse(readFileSync(file, "utf8")).routes ?? [];
  return routes.map((route) => String(route.id)).filter((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id)).map((id) => `app.json: route id "${id}" is not a valid handle: use lowercase letters, numbers and hyphens, such as "${id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "") || "page"}"`);
}
var SDK_DECLARED = /declare\s+module\s+['"]@tooljet\/custom-component-sdk['"]/;
function sdkRedeclared(dir) {
  const src = join(dir, "frontend", "src");
  if (!existsSync(src))
    return [];
  return listFiles(src).filter((rel) => /\.tsx?$/.test(rel) && rel !== "tooljet.gen.ts" && SDK_DECLARED.test(readFileSync(join(src, rel), "utf8"))).map((rel) => `frontend/src/${rel}: declares @tooljet/custom-component-sdk itself, which hides the SDK's real types; write the file without that declaration (the SDK has its own types), then fix what the build reports`);
}
function missingStylesheet(dir) {
  const sheet = join(dir, STYLESHEET);
  if (!existsSync(sheet))
    return void 0;
  const src = join(dir, "frontend", "src");
  for (const rel of listFiles(src)) {
    if (!/\.(tsx?|jsx?)$/.test(rel) || rel.startsWith("components/"))
      continue;
    const file = join(src, rel);
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const m of code.matchAll(IMPORT_RE)) {
      if (resolve(dirname(file), m[1]) === sheet)
        return void 0;
    }
  }
  return "frontend/src/App/index.tsx: the app's stylesheet is not imported, so every screen renders unstyled (no Tailwind, no theme colours). Add `import '../styles/globals.css';` back with the other imports at the top of App/index.tsx.";
}
async function browserUserQueries(appId) {
  if (!appId)
    return [];
  try {
    const summary = await current().client.getAppSummary?.(appId);
    return summary ? browserUserQueryProblems({ data_queries: summary.queries }).map((line) => `query check: ${line}`) : [];
  } catch {
    return [];
  }
}
function codeAppBuildTool(context) {
  return {
    name: "code_app_build",
    title: "Build Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Refresh the typed hooks from the app's current queries (tooljet app pull), build the app's code (TypeScript, Tailwind, manifest), and check it against the app (tooljet app check: every useAppQuery name, route, link and page must exist) and the security scan (code rules such as external fetch, eval and token storage; secrets; vendored code). Returns ok and every error (errors: one line each, with the code and often the fix), native control and security finding to fix; fix every one in one round of writes. Repeat write and build until ok, then code_app_install." + USER_WORDS,
    inputSchema: { app_id: APP_ID, name: PROJECT_NAME },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => ok(await buildProject(dir, args.app_id)));
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function buildProject(dir, appId) {
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  const unstored = removeUnstoredSource(dir);
  await copySdkIn(dir);
  const escaped = removeEscapingLinks(dir);
  const started = Date.now();
  const pull = await cli(dir, ["app", "pull"]);
  devBuilt.delete(dir);
  const build = buildServiceUrl() ? await buildInService(dir, "production") : await cli(join(dir, "frontend"), ["library", "build", ...installReuse() ? ["--env", "development"] : []]);
  const tsErrors = Number(/TypeScript compiled \((\d+) errors\)/.exec(build.output)?.[1] ?? (build.code === 0 ? 0 : 1));
  const problems = build.code === 0 && tsErrors === 0 ? [] : parseBuildProblems(build.output);
  const check = await cli(dir, ["app", "check", "--offline", "--json"]);
  const report = parseReport(check.output);
  const unstyled = missingStylesheet(dir);
  const selects = nativeSelects(dir);
  const handles = badRouteHandles(dir);
  const serverUser = await browserUserQueries(appId ?? appIdOf(dir));
  const extra = [...handles, ...unstyled ? [unstyled] : [], ...sdkRedeclared(dir), ...serverUser, ...escaped ? [escaped.message] : []];
  const okBuild = pull.code === 0 && build.code === 0 && tsErrors === 0 && check.code === 0 && !extra.length;
  if (okBuild)
    prefetchFullScan(dir);
  if (okBuild && installReuse())
    devBuilt.set(dir, projectHash(dir));
  return {
    ...followed ? { draft: followed } : {},
    ...sync.before_pull_copy ? { before_pull_copy: sync.before_pull_copy } : {},
    ...unstored.length ? { removed_unstored: { files: unstored, note: "Removed: never stored with the app or scanned. Put code under frontend/src without node_modules or dot names, and add packages with code_app_add_dependency." } } : {},
    ok: okBuild,
    build_ms: Date.now() - started,
    pull: pull.code === 0 ? "typed hooks refreshed" : pull.output.trim(),
    typescript_errors: tsErrors,
    // Every error on one line, with the code it is on and, for the mistakes that recur, the fix (codeTypeErrors.ts);
    // the raw output only when it holds no error this can read.
    ...problems.length ? { errors: formatProblems(problems) } : {},
    build_output: build.code === 0 && tsErrors === 0 ? build.output.trim().split("\n").slice(-6).join("\n") : problems.length ? buildSummary(build.output) : build.output.trim().slice(0, 12e3),
    check: report?.problems ? [...extra, ...report.problems.map((p) => `${p.file}:${p.line}  ${p.message}`)] : extra.length ? [...extra, check.output.trim().slice(0, 6e3)] : check.output.trim().slice(0, 6e3),
    ...selects.length ? { native_controls: { fix: "Use Select from components/ui/select instead of a native <select>.", at: selects } } : {},
    // jsx-a11y recommended rules, warnings only (tooljet app check); fix them when they are cheap to fix.
    a11y_warnings: report?.accessibility?.length ?? Number(/(\d+) accessibility warnings?/.exec(check.output)?.[1] ?? 0),
    // The offline scan (no dependency network checks): fix critical and high before code_app_install.
    security: securitySummary(report?.security)
  };
}
var concreteRoute = (path) => path.replace(/:[A-Za-z_][\w]*/g, "1");
function routesToCheck(dir) {
  let routes = [];
  try {
    routes = JSON.parse(readFileSync(join(dir, "app.json"), "utf8")).routes ?? [];
  } catch {
    routes = [];
  }
  const paths = routes.map((route) => typeof route.path === "string" && route.path.startsWith("/") ? concreteRoute(route.path) : void 0).filter((path) => Boolean(path));
  return [...new Set(paths.length ? paths : ["/"])].sort((a, b) => a === "/" ? -1 : b === "/" ? 1 : 0);
}
async function renderRoutes(render, appId, routes, widths, concurrency) {
  const jobs = routes.flatMap((route) => widths.map((width) => ({ route, width })));
  const out = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < jobs.length; index = next++) {
      const { route, width } = jobs[index];
      const result = await render({ app_id: appId, route, ...width !== 1280 ? { viewport_width: width } : {} });
      const text = result.content?.[0]?.text ?? "";
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = void 0;
      }
      out[index] = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { route, width, ...parsed } : { route, width, ok: false, error: text.replace(/^Error:\s*/, "").slice(0, 500) };
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker));
  return out;
}
function codeAppInstallTool(context, options = {}) {
  return {
    name: "code_app_install",
    title: "Install Code Mode App",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Upload the app's code (tooljet app dev --once --source platform): it creates or updates the app's Code mode page, one hidden page per route (set each route's page permissions on it) and the component that runs the code, points the app version at this code as a Live preview, and stores the source on ToolJet so the Code panel can edit it. Build first. Runs the full security scan first and refuses while it has critical or high findings, listing them. Returns the editor URL. If it says the source was edited in the ToolJet editor, call code_app_read_files to bring those edits down, reapply your change, and install again. verify: true makes it one check round: the build (as code_app_build; on any error it stops there, not installed, listing every error), the install, then the render check of every route in app.json (each once, at 1280 px unless widths says otherwise), in one report: build, install, render [{ route, width, ok, pages: [{ findings, accessibility }] }]. This is the last step of a build or edit: saving the app version (release_app saves a draft first) freezes the code." + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      verify: external_exports.boolean().optional().describe("Build, install and render-check every route, in this one call"),
      widths: external_exports.array(external_exports.number().int().min(320).max(2560)).min(1).max(3).optional().describe("verify: the widths to check, default [1280]; add 375 and 768 only when phones or tablets were asked for"),
      routes: external_exports.array(external_exports.string().regex(/^\/[A-Za-z0-9_\-\/.]*$/)).min(1).max(12).optional().describe("verify: the paths to open, default every route in app.json with each :param as 1 (e.g. only the routes that failed)")
    },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => {
          if (!args.verify) {
            const installed2 = await installProject(dir);
            return installed2 instanceof Error ? fail(installed2) : ok(installed2);
          }
          const built = await buildProject(dir, args.app_id);
          if (!built.ok) {
            return ok({
              ...built,
              installed: false,
              next: "Not installed: the build has errors. Fix every one in one round of writes, then code_app_install with verify: true again."
            });
          }
          const installed = await installProject(dir);
          if (installed instanceof Error)
            return fail(installed);
          const appId = args.app_id ?? appIdOf(dir);
          const build = {
            ok: true,
            build_ms: built.build_ms,
            typescript_errors: 0,
            a11y_warnings: built.a11y_warnings,
            ...built.native_controls ? { native_controls: built.native_controls } : {}
          };
          if (!options.render || !appId)
            return ok({ ...installed, installed: true, build, render: "not available here: rendering is unverified" });
          const routes = args.routes?.length ? [...new Set(args.routes)] : routesToCheck(dir);
          const widths = args.widths?.length ? [...new Set(args.widths)] : [1280];
          const render = await renderRoutes(options.render, appId, routes, widths, options.renderConcurrency ?? 2);
          const failing = render.filter((entry) => entry.ok !== true).map((entry) => `${entry.route} at ${entry.width} px`);
          return ok({
            ...installed,
            installed: true,
            build,
            render_ok: failing.length === 0,
            render,
            next: failing.length ? `Fix what the render check found on ${failing.join(", ")} in one round of writes, then code_app_install with verify: true and routes set to those paths.` : "Built, installed, and every route renders cleanly."
          });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
async function installProject(dir) {
  const t0 = Date.now();
  const lap = {};
  const followed = await followDraft(dir);
  const sync = await ensureFresh(dir);
  lap.sync_ms = Date.now() - t0;
  nothingStored.delete(dir);
  const dependencies = dependencyRefusal(dir, "The install");
  if (dependencies)
    return new Error(`Not installed: ${dependencies.message}`);
  const unstored = removeUnstoredSource(dir);
  const unstyled = missingStylesheet(dir);
  if (unstyled)
    return new Error(`Not installed: ${unstyled} Then code_app_build and install again.`);
  const check = await fullScan(dir);
  lap.scan_ms = Date.now() - t0 - lap.sync_ms;
  lap.scan_reused = check.reused ? 1 : 0;
  const security = parseReport(check.output)?.security;
  if (!security || security.error)
    throw new Error(`The security scan did not run, so nothing was installed: ${security?.error ?? check.output.trim().slice(0, 2e3)}`);
  const blocking = mustFix(security);
  if (blocking.length)
    return new Error(`Not installed: the security scan has ${blocking.length} critical or high finding${blocking.length > 1 ? "s" : ""}. Fix them in the code (or remove the package), code_app_build, then install again:
` + blocking.map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join("\n"));
  let prebuilt = [];
  if (buildServiceUrl()) {
    const built = await buildInService(dir, "development");
    if (built.code !== 0)
      throw new Error(built.output.trim());
    prebuilt = ["--prebuilt", join(dir, "frontend", "dist")];
  } else if (installReuse() && devBuilt.get(dir) === projectHash(dir) && existsSync(join(dir, "frontend", "dist", "manifest.json"))) {
    prebuilt = ["--prebuilt", join(dir, "frontend", "dist"), "--no-scan"];
  }
  devBuilt.delete(dir);
  const devStarted = Date.now();
  const result = await cli(dir, ["app", "dev", "--once", "--source", "platform", ...prebuilt]);
  lap.dev_ms = Date.now() - devStarted;
  lap.prebuilt = prebuilt.length ? 1 : 0;
  if (result.code !== 0)
    throw new Error(result.output.trim());
  clearAgentWrites(dir);
  const copies = beforePullCopies(dir);
  return {
    ...followed ? { draft: followed } : {},
    ...sync.editor_edits ? { editor_edits: sync.editor_edits } : {},
    ...sync.sync_warning ? { sync_warning: sync.sync_warning } : {},
    ...unstored.length ? { removed_unstored: unstored } : {},
    ...copies.length ? { before_pull_copies: { kept: copies, note: "Copies of local files a pull of ToolJet's code replaced (newest first, the last 3 kept); read one with code_app_read_files to recover a change." } } : {},
    linked: true,
    ...process.env.MCP_CODE_INSTALL_TIMINGS === "1" ? { timings: { ...lap, total_ms: Date.now() - t0 } } : {},
    editor_url: /Open: (\S+)/.exec(result.output)?.[1] ?? null,
    output: result.output.trim(),
    security: securitySummary(security)
  };
}
function codeAppAddDependencyTool(context) {
  return {
    name: "code_app_add_dependency",
    title: "Add Code Mode Dependency",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Add npm packages to a Code mode app (frontend/package.json is not writable otherwise). Each package is vetted first (tooljet app vet: malware, known vulnerabilities, versions published in the last 7 days, licence, workspace blocklist); when any fails, nothing is written and the findings say why: pick another version or package. Passing packages are pinned to the exact version vetted and installed without install scripts. Prefer what the template already has (shadcn, Tailwind, lucide-react). To fix a vulnerable package, pass it again at a fixed version (upgrade), or pass its replacement and the old name in remove; the lockfile is refreshed through the same install." + USER_WORDS,
    inputSchema: {
      app_id: APP_ID,
      name: PROJECT_NAME,
      packages: external_exports.array(external_exports.string().regex(PACKAGE_SPEC)).max(10).describe("name, name@version or name@range, e.g. date-fns@4"),
      remove: external_exports.array(external_exports.string().regex(PACKAGE_NAME)).max(10).optional().describe("package names to take out of frontend/package.json (a replaced package)")
    },
    handler: inScope(context, async (args) => {
      try {
        const dir = await locateProject(args, "edit");
        return await onProject(dir, async () => {
          if (!args.packages.length && !args.remove?.length)
            throw new Error("Pass packages to add, or names to remove.");
          const local = args.packages.flatMap((spec) => {
            const at = spec.indexOf("@", 1);
            const why = at > 0 ? nonRegistrySpec(spec.slice(at + 1)) : void 0;
            return why ? [`${spec}: ${why}`] : [];
          });
          if (local.length)
            throw new Error(`Not added: ${local.join("; ")}. Pass a registry version or range, such as date-fns@4.`);
          const vet = args.packages.length ? await cli(dir, ["app", "vet", ...args.packages, "--json"]) : { code: 0, output: '{"ok":true,"packages":[]}' };
          const report = parseReport(vet.output);
          if (!report?.packages)
            throw new Error(`The package check did not run, so nothing was added: ${vet.output.trim().slice(0, 2e3)}`);
          if (!report.ok)
            return fail(new Error(`Not added: ${report.packages.map((p) => `${p.name}@${p.version}`).join(", ")} fail${report.packages.length > 1 ? "" : "s"} the package check:
` + (report.findings ?? []).map((f) => `${f.severity.toUpperCase()} ${f.ruleId} ${f.package ?? f.location}: ${f.message}`).join("\n")));
          const vetted = report.packages.flatMap((p) => nonRegistrySpec(p.version) ? [`${p.name}@${p.version}`] : []);
          if (vetted.length)
            throw new Error(`Not added: the package check named ${vetted.join(", ")}, which is not a registry version.`);
          const pkgFile = insideProject(dir, "frontend/package.json");
          const lockFile = insideProject(dir, "frontend/package-lock.json");
          const before = readFileSync(pkgFile, "utf8");
          const lockBefore = existsSync(lockFile) ? readFileSync(lockFile, "utf8") : null;
          const restore = () => {
            writeFileSync(pkgFile, before);
            if (lockBefore !== null)
              writeFileSync(lockFile, lockBefore);
          };
          noteWrite(dir);
          writeFileSync(pkgFile, JSON.stringify(withDependencies(withoutDependencies(JSON.parse(before), args.remove ?? []), report.packages), null, 2) + "\n");
          const regenerated = !manifestProblems(dir).length && lockfileProblems(dir).length > 0;
          if (regenerated)
            rmSync(lockFile, { force: true });
          let install;
          try {
            install = await installDependencies(dir, "Adding the packages");
          } catch (error) {
            restore();
            throw new Error(`${error instanceof Error ? error.message : String(error)}
Nothing was added; package.json restored.`);
          }
          if (install.code !== 0) {
            restore();
            throw new Error(`tooljet app install failed, package.json restored: ${install.output.trim().slice(0, 4e3)}`);
          }
          return ok({
            added: report.packages.map((p) => `${p.name}@${p.version}`),
            ...regenerated ? { lockfile: "The lockfile named packages from outside the registry, so it was written again from the registry." } : {},
            ...args.remove?.length ? { removed: args.remove } : {},
            not_run: (report.notRun ?? []).map((n) => `${n.id}${n.reason ? `: ${n.reason}` : ""}`),
            // Transitive packages come with the install; code_app_build and code_app_install scan the whole lockfile.
            next: "Import the package in frontend/src, then code_app_build."
          });
        });
      } catch (err) {
        return fail(err);
      }
    })
  };
}
export {
  isCodeModeApp as A,
  browserUserMessage as B,
  FLEX_MIN_WIDTH_PX_DESCRIPTION as F,
  batchChildOrders as a,
  bodyParentId as b,
  childOrderProperty as c,
  appendedChildOrders as d,
  codeCliProblem as e,
  FLEX_GROW_DESCRIPTION as f,
  FLEX_WIDTH_PX_DESCRIPTION as g,
  hasNonEmptyDefinition as h,
  isFlexContainerType as i,
  FLEX_FILL_WIDTH_DESCRIPTION as j,
  codeAppScaffoldTool as k,
  codeAppReadFilesTool as l,
  mapKeyRefusal as m,
  normalizeComponentSpec as n,
  codeAppWriteFilesTool as o,
  plannedCurrency as p,
  codeAppBuildTool as q,
  resolveRef as r,
  strictEntry as s,
  codeAppInstallTool as t,
  codeAppAddDependencyTool as u,
  getComponentCatalogTool as v,
  updateComponentsTool as w,
  noCodeIdentity as x,
  reparentAdditions as y,
  browserUserBindings as z
};
