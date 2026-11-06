import { createRequire } from "node:module";
import { g as peekAppPlan, h as consumeAppPlan, f as frozenAppRefusal, r as replaceView, b as replaceFingerprint, d as danglingAfterReplace, e as prepareQueryOptionsForWrite, i as matchPlannedPage, l as literalCanvasColor, j as prepareComponentBatch, k as replaceIds, n as expandQueryLifecycles, v as validateEvents, o as navigationReorders, q as persistedEventSpecs } from "./chunk-BWSKYx9s.js";
import { a as autoReadPreflight, N as NOT_CHECKED_AUTOMATICALLY } from "./chunk-e1JAYY9a.js";
import { i as fail, t as tableQuotaError, o as ok, L as LARGE_READ_ROW_THRESHOLD, u as assessQueryRead, y as resolveStaticBindings, x as resolvedReadRefusal, C as sameReadSource, D as extractRowCount, E as emptyViewerOnlyParams, F as emptyParamsNote, H as unresolvedNote, v as validateQueryOptions, m as issueMessages } from "./chunk-Bfjn8-Pb.js";
import { e as componentRef, w as completedPartialWrites, r as resolveRef, m as indexComponentReferences, i as isFlexContainerType, x as batchChildOrders, c as childOrderProperty } from "./chunk-sScV8DxV.js";
import { J as validateAppStructure, N as unpinnedLibraries, d as decodeComponentParent, e as encodeComponentParent } from "./chunk-BFQMxNTN.js";
import { g as getDatasourceQuerySchema } from "./chunk-BozBrMhE.js";
import { ax as external_exports } from "./chunk-Dakrk_ob.js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
createRequire(import.meta.url);
var valueOf = (prop) => prop && typeof prop === "object" && "value" in prop ? prop.value : prop;
function htmlFedTextColumns(table, queries) {
  if (table.type !== "Table")
    return [];
  const columns = valueOf(table.properties?.columns);
  if (!Array.isArray(columns))
    return [];
  const data = String(valueOf(table.properties?.data) ?? "");
  const read = new Set([...data.matchAll(/queries\.(\w+)/g)].map((m) => m[1]));
  const code = queries.filter((q) => q.kind === "runjs" && read.has(String(q.name))).map((q) => String(q.options?.code ?? "")).join("\n");
  if (!code)
    return [];
  return columns.filter((col) => {
    if ((col.columnType ?? "string") !== "string" || typeof col.key !== "string" || !col.key)
      return false;
    const key = col.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${key}\\s*:[^,;{}]*?['"\`]\\s*<[a-zA-Z]`).test(code))
      return true;
    const idents = [...code.matchAll(new RegExp(`\\b${key}\\s*:\\s*([A-Za-z_$][\\w$]*)\\s*[,}]`, "g"))].map((m) => m[1]);
    return idents.some((id) => new RegExp(`\\b${id}\\s*=(?!=)[^;]*?['"\`]\\s*<[a-zA-Z]`).test(code));
  });
}
var SCRATCH_NAME = /^(debug|diag|diagnostic|probe|tmp|temp|scratch|dummy|sample_test|testonly)[_-]|^hidden[A-Z]|[_-](probe|scratch)$/i;
function scratchArtifactWarnings(summary) {
  const warnings = [];
  for (const query of summary.queries ?? []) {
    const name = typeof query.name === "string" ? query.name : "";
    if (name && SCRATCH_NAME.test(name)) {
      warnings.push(`Query "${name}" looks like a leftover diagnostic, not part of the app. Delete it before finishing, or rename it if it is genuinely part of what the user asked for.`);
    }
  }
  for (const page of summary.pages ?? []) {
    for (const component of page.components ?? []) {
      const name = typeof component.name === "string" ? component.name : "";
      if (name && SCRATCH_NAME.test(name)) {
        warnings.push(`Component "${name}" on page "${page.name}" looks like a leftover scratch component. Delete it before finishing, or rename it if it is genuinely part of the app.`);
      }
    }
  }
  return warnings;
}
function libraryPinErrors(summary, pins) {
  const components = (summary.pages ?? []).flatMap((page) => page.components ?? []);
  return unpinnedLibraries(components, pins).map(({ library, components: names }) => `Library "${library}" is not pinned on this version, so ${names.length} of its components show an empty "Slot" placeholder (${names.slice(0, 5).join(", ")}${names.length > 5 ? ", ..." : ""}). Adding one of its components with add_components pins it.`);
}
function validatePersistedAppSummary(summary, options = {}) {
  const structural = validateAppStructure(summary, options);
  const errors = [...structural.errors];
  const warnings = [...structural.warnings];
  warnings.push(...scratchArtifactWarnings(summary));
  const eventValidation = validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false });
  errors.push(...eventValidation.errors);
  warnings.push(...eventValidation.warnings);
  for (const page of summary.pages ?? []) {
    for (const component of page.components ?? []) {
      for (const col of htmlFedTextColumns(component, summary.queries)) {
        warnings.push(`Table "${String(component.name)}" column "${String(col.key)}" is typed as text but its query returns HTML for it, so it renders as raw text (<span ...>). Set that column's columnType "html", or return plain text.`);
      }
    }
  }
  for (const query of summary.queries) {
    const label = `Query "${query.name ?? query.id}"`;
    if (!query.kind || !query.options || typeof query.options !== "object" || Array.isArray(query.options)) {
      warnings.push(`${label}: kind/options are unavailable, so its datasource contract was not validated.`);
      continue;
    }
    const validation = validateQueryOptions(query.kind, query.options);
    errors.push(...issueMessages(validation.errors, label));
    warnings.push(...issueMessages(validation.warnings, label));
  }
  return {
    ok: errors.length === 0,
    scope: "structural_and_contract",
    checked: [
      "persisted references and bindings",
      "component render traps",
      "event source/trigger compatibility",
      "saved datasource option contracts",
      "leftover diagnostic queries and scratch components"
    ],
    not_checked: [
      "query execution or external API success",
      "mutating/billable query behavior",
      "browser event delivery",
      "visual rendering"
    ],
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)]
  };
}
var SECTIONS = ["properties", "styles", "validation", "others"];
var bundled;
function bundledDefinitions() {
  if (!bundled) {
    const path = resolve(dirname(fileURLToPath(import.meta.url)), "../data/component-default-definitions.json");
    try {
      bundled = JSON.parse(readFileSync(path, "utf8")).definitions;
    } catch {
      bundled = {};
    }
  }
  return bundled;
}
var isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
var WHOLE_ARRAY_TYPES = /* @__PURE__ */ new Set([
  "Table",
  "DropdownV2",
  "MultiselectV2",
  "PopoverMenu",
  "Steps",
  "Tabs",
  "RadioButtonV2",
  "Tags",
  "TagsInput",
  "TreeSelect",
  "Cascader",
  "Navigation",
  "ButtonGroupV2"
]);
function mergeLikeServer(target, source, wholeArrays) {
  if (wholeArrays && Array.isArray(target)) {
    if (source === void 0)
      return target;
    if (Array.isArray(source))
      return source;
    return isPlainObject(source) ? Object.values(source) : source;
  }
  if (Array.isArray(source)) {
    const base = Array.isArray(target) ? [...target] : [];
    source.forEach((item, index) => {
      const merged = mergeLikeServer(base[index], item, wholeArrays);
      if (merged !== void 0 || !(index in base))
        base[index] = merged;
    });
    return base;
  }
  if (isPlainObject(source)) {
    const base = isPlainObject(target) ? { ...target } : {};
    for (const [key, value] of Object.entries(source)) {
      const merged = mergeLikeServer(base[key], value, wholeArrays);
      if (merged !== void 0 || !(key in base))
        base[key] = merged;
    }
    return base;
  }
  return source === void 0 ? target : source;
}
var stable = (value) => JSON.stringify(value, (_key, inner) => isPlainObject(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : inner);
function sectionAsRead(type, section, stored, definitions = bundledDefinitions()) {
  const wholeArrays = section === "properties" && WHOLE_ARRAY_TYPES.has(type);
  return mergeLikeServer(definitions[type]?.[section] ?? {}, stored ?? {}, wholeArrays);
}
function differingKey(type, section, planned, stored, definitions) {
  const asRead = sectionAsRead(type, section, planned, definitions);
  const have = stored ?? {};
  for (const key of /* @__PURE__ */ new Set([...Object.keys(asRead), ...Object.keys(have)])) {
    if (stable(asRead[key]) !== stable(have[key]))
      return key;
  }
  return void 0;
}
var RECT_KEYS = ["top", "left", "width", "height"];
var FLEX_LAYOUT_KEYS = ["fillWidth", "widthPx", "grow", "minWidthPx"];
var sameRect = (planned, stored) => {
  if (!planned)
    return true;
  if (!stored || typeof stored !== "object")
    return false;
  const held = stored;
  return RECT_KEYS.every((key) => Number(held[key]) === Number(planned[key])) && FLEX_LAYOUT_KEYS.every((key) => planned[key] === void 0 || held[key] === planned[key]);
};
function diffPageInPlace(stored, planned, definitions = bundledDefinitions(), newId = randomUUID) {
  const references = indexComponentReferences(planned);
  if (references.errors.length)
    throw new Error(references.errors.join(" "));
  const storedByName = new Map(stored.filter((component) => component.name).map((component) => [component.name, component]));
  const ids = /* @__PURE__ */ new Map();
  const idOf = /* @__PURE__ */ new Map();
  for (const spec of planned) {
    const id = storedByName.get(spec.name)?.id ?? newId();
    idOf.set(spec, id);
    ids.set(componentRef(spec), id);
  }
  const plannedParentId = (spec) => {
    const parent = spec.parentRef ? ids.get(spec.parentRef) : spec.parent;
    if (!parent)
      return void 0;
    const slot = spec.slotName ?? decodeComponentParent(parent).slotName;
    return slot === "body" ? decodeComponentParent(parent).parentId : void 0;
  };
  const explicitOrders = new Map(planned.flatMap((spec) => {
    if (!isFlexContainerType(spec.type) || spec.properties?.childOrder === void 0)
      return [];
    const raw = spec.properties.childOrder;
    const value = Array.isArray(raw) ? raw : raw?.value;
    return [[idOf.get(spec), Array.isArray(value) ? value : []]];
  }));
  const childOrders = batchChildOrders(planned.map((spec) => ({ id: idOf.get(spec), type: spec.type, parentId: plannedParentId(spec) })), explicitOrders, (ref) => ids.get(ref));
  const diff = { ids, keep: [], relayout: [], create: [], recreated: [], deleteIds: [], why: {} };
  const plannedNames = new Set(planned.map((spec) => spec.name));
  for (const component of stored)
    if (!component.name || !plannedNames.has(component.name))
      diff.deleteIds.push(component.id);
  for (const spec of planned) {
    const id = idOf.get(spec);
    const parent = spec.parentRef ? ids.get(spec.parentRef) : spec.parent;
    const submit = spec.type === "Form" ? spec.properties?.buttonToSubmit : void 0;
    const submitId = submit && typeof submit.value === "string" ? ids.get(submit.value) : void 0;
    let properties = submit && submitId ? { ...spec.properties, buttonToSubmit: { ...submit, value: submitId } } : spec.properties;
    const childOrder = childOrders.get(id);
    if (childOrder)
      properties = { ...properties, childOrder: childOrderProperty(childOrder) };
    const { clientRef: _clientRef, parentRef: _parentRef, ...rest } = spec;
    const parentType = parent ? planned.find((other) => idOf.get(other) === decodeComponentParent(parent).parentId)?.type : void 0;
    const resolved = { ...rest, properties, id, ...parent ? { parent } : {}, ...parentType ? { parentType } : {} };
    if (!parent)
      delete resolved.parent;
    const existing = storedByName.get(spec.name);
    if (!existing) {
      diff.create.push(resolved);
      continue;
    }
    let why;
    if (existing.type !== spec.type)
      why = `type ${existing.type} -> ${spec.type}`;
    else if ((existing.parent ?? void 0) !== (parent ? encodeComponentParent(parent, spec.slotName, parentType) : void 0))
      why = "parent";
    else if (!definitions[spec.type])
      why = "no default definition for this widget";
    else {
      for (const section of SECTIONS) {
        const key = differingKey(spec.type, section, section === "properties" ? properties : spec[section], existing[section], definitions);
        if (key !== void 0) {
          why = `${section}.${key}`;
          break;
        }
      }
    }
    if (why) {
      diff.deleteIds.push(existing.id);
      diff.create.push(resolved);
      diff.recreated.push(spec.name);
      diff.why[spec.name] = why;
      continue;
    }
    const layouts = existing.layouts ?? {};
    const desktop = spec.layouts?.desktop ?? spec.layout;
    const mobile = spec.layouts?.mobile ?? spec.layout;
    if (sameRect(desktop, layouts.desktop) && sameRect(mobile, layouts.mobile))
      diff.keep.push(spec.name);
    else
      diff.relayout.push({ componentId: existing.id, ...desktop ? { desktop } : {}, ...mobile ? { mobile } : {} });
  }
  return diff;
}
var positive = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
var unattendedTimeoutMs = () => positive("MCP_UNATTENDED_READ_TIMEOUT_MS", 3e4);
var maxRows = () => positive("MCP_UNATTENDED_READ_MAX_ROWS", 200);
var maxBytes = () => positive("MCP_UNATTENDED_READ_MAX_BYTES", 256 * 1024);
async function runUnattended(client, params) {
  const timeout = unattendedTimeoutMs();
  let timer;
  const late = new Promise((resolve2) => {
    timer = setTimeout(() => resolve2({
      status: "failed",
      timed_out: true,
      message: `The automatic check stopped waiting after ${Math.round(timeout / 1e3)} s, so this query was not checked. Make it cheaper (an index, a narrower filter, a smaller LIMIT) or run it once with run_query.`
    }), timeout);
  });
  try {
    return await Promise.race([client.runQuery(params), late]);
  } finally {
    clearTimeout(timer);
  }
}
var rowsOf = (result) => {
  const data = result.data;
  if (Array.isArray(data))
    return { rows: data, nested: false };
  const results = data?.results;
  return Array.isArray(results) ? { rows: results, nested: true } : void 0;
};
function capUnattendedOutput(result) {
  const found = rowsOf(result);
  const size = (value) => {
    try {
      return JSON.stringify(value)?.length ?? 0;
    } catch {
      return Infinity;
    }
  };
  if (!found) {
    if (size(result.data) <= maxBytes())
      return result;
    return { ...result, data: void 0, truncated: { note: `The result was larger than ${maxBytes()} characters and is not shown.` } };
  }
  let shown = found.rows.slice(0, maxRows());
  while (shown.length > 1 && size(shown) > maxBytes())
    shown = shown.slice(0, Math.floor(shown.length / 2));
  if (shown.length === 1 && size(shown) > maxBytes())
    shown = [];
  if (shown.length === found.rows.length)
    return result;
  const data = found.nested ? { ...result.data, results: shown } : shown;
  return { ...result, data, truncated: { row_count: found.rows.length, rows_shown: shown.length } };
}
var REDACTED = "[redacted]";
var SECRET_NAME = /(^|[-_.\s])(auth|authorization|bearer|token|access[-_]?token|refresh[-_]?token|id[-_]?token|secret|client[-_]?secret|password|passwd|pwd|api[-_]?key|apikey|key|private[-_]?key|access[-_]?key|signature|sig|session|cookie|set[-_]?cookie|credential|credentials|connection[-_]?string|dsn)([-_.\s]|$)|^x-api-|token$|secret$|password$|apikey$|api_key$/i;
var RESPONSE_HEADERS = /* @__PURE__ */ new Set([
  "content-type",
  "content-length",
  "content-range",
  "content-encoding",
  "link",
  "etag",
  "last-modified",
  "date",
  "cache-control",
  "retry-after",
  "x-total-count",
  "x-total",
  "x-total-pages",
  "x-page",
  "x-per-page",
  "x-next-page",
  "x-request-id",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "ratelimit-limit",
  "ratelimit-remaining",
  "ratelimit-reset"
]);
var isSecretName = (name) => SECRET_NAME.test(name);
function redactUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return redactQueryText(value);
  }
  if (url.username || url.password) {
    url.username = "";
    url.password = "";
  }
  for (const name of [...url.searchParams.keys()])
    if (isSecretName(name))
      url.searchParams.set(name, REDACTED);
  return url.toString();
}
function redactQueryText(text) {
  return text.replace(/([?&;]([A-Za-z0-9_.\-[\]]+)=)([^&\s"'<>#]+)/g, (match, prefix, name) => isSecretName(name) ? `${prefix}${REDACTED}` : match).replace(/(\b[a-z][a-z0-9+.-]*:\/\/)([^/\s:@"']+):([^/\s@"']+)@/gi, `$1${REDACTED}@`).replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, `$1 ${REDACTED}`);
}
var isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function scrub(value, depth = 0) {
  if (depth > 8)
    return REDACTED;
  if (typeof value === "string")
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? redactUrl(value) : redactQueryText(value);
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === "string" && isSecretName(value[0]))
      return [value[0], REDACTED];
    return value.map((item) => scrub(item, depth + 1));
  }
  if (!isRecord(value))
    return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSecretName(key) && child !== null && child !== void 0 && child !== "")
      out[key] = REDACTED;
    else
      out[key] = scrub(child, depth + 1);
  }
  return out;
}
function responseHeaders(headers) {
  if (!isRecord(headers))
    return void 0;
  return Object.fromEntries(Object.entries(headers).filter(([name]) => RESPONSE_HEADERS.has(name.toLowerCase())));
}
var REQUEST_KEYS = ["method", "url", "requestUrl", "params", "requestParams", "statusCode"];
function request(value) {
  if (!isRecord(value))
    return typeof value === "string" ? redactUrl(value) : void 0;
  const out = {};
  for (const key of REQUEST_KEYS)
    if (value[key] !== void 0)
      out[key] = scrub(value[key]);
  return out;
}
function response(value) {
  if (!isRecord(value))
    return void 0;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (/^(headers|responseHeaders)$/i.test(key))
      out[key] = responseHeaders(child);
    else
      out[key] = scrub(child);
  }
  return out;
}
function metadata(value) {
  if (!isRecord(value))
    return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "request")
      out[key] = request(child);
    else if (key === "response")
      out[key] = response(child);
    else if (key === "queryDefinition")
      out[key] = typeof child === "string" && /^[a-z][a-z0-9+.-]*:\/\//i.test(child) ? redactUrl(child) : void 0;
    else
      out[key] = scrub(child);
  }
  return out;
}
function failureParts(value) {
  const out = { ...value };
  if ("requestObject" in out)
    out.requestObject = request(out.requestObject);
  if ("responseObject" in out)
    out.responseObject = response(out.responseObject);
  if ("responseHeaders" in out)
    out.responseHeaders = responseHeaders(out.responseHeaders);
  for (const key of ["options", "connection", "connectionOptions", "sourceOptions"])
    if (key in out)
      delete out[key];
  return out;
}
function redactRunResult(result) {
  if (!isRecord(result))
    return result;
  const out = failureParts(result);
  if ("metadata" in out)
    out.metadata = metadata(out.metadata);
  for (const key of ["message", "description", "errorMessage"])
    if (typeof out[key] === "string")
      out[key] = redactQueryText(out[key]);
  if (isRecord(out.data))
    out.data = failureParts(out.data);
  return out;
}
var REMOTE_RESULT_MAX_JSON_CHARS = 3e4;
function queryResultBindingHint(query, result) {
  const data = result.data;
  const options = query.options;
  if (result.status !== "ok" || query.kind !== "tooljetdb" || options?.operation !== "sql_execution" || !data || !Array.isArray(data.results))
    return void 0;
  return {
    rows_path: "data.results",
    row_count: data.results.length,
    guidance: "This ToolJet DB SQL read returned an object containing results. Bind row consumers to queries.<name>.data.results (or data?.results ?? []), not data.map/filter or data[0]. Other operations can return different shapes; preserve the actual returned contract."
  };
}
function truncateRemoteResult(result) {
  if (!Object.prototype.hasOwnProperty.call(result, "data"))
    return { result };
  let serialized;
  try {
    serialized = JSON.stringify(result.data);
  } catch {
    return {
      result: { ...result, data: { mcp_truncated: true, preview_json: "<unserializable response>" } },
      warning: "The REST response data could not be serialized for MCP output; inspect it in ToolJet."
    };
  }
  if (typeof serialized !== "string")
    return { result };
  if (serialized.length <= REMOTE_RESULT_MAX_JSON_CHARS)
    return { result };
  return {
    result: {
      ...result,
      data: {
        mcp_truncated: true,
        original_json_characters: serialized.length,
        preview_json: serialized.slice(0, REMOTE_RESULT_MAX_JSON_CHARS)
      }
    },
    warning: `REST response data exceeded ${REMOTE_RESULT_MAX_JSON_CHARS} JSON characters and was truncated in MCP output. The remote request already completed; add API-specific pagination or a smaller limit before another run.`
  };
}
function containsComponentBinding(value) {
  if (typeof value === "string")
    return /\bcomponents\s*\./.test(value);
  if (Array.isArray(value))
    return value.some(containsComponentBinding);
  if (value && typeof value === "object")
    return Object.values(value).some(containsComponentBinding);
  return false;
}
function datasourceRecovery(query) {
  if (!query.datasource_settings_url)
    return void 0;
  return {
    action: "open_datasource_settings",
    url: query.datasource_settings_url,
    instruction: "Ask the user to repair or test the connection in ToolJet. If an in-app browser is available, open this URL; do not enter credentials, authorize OAuth, test, or save settings for the user. Retry only after they confirm the repair."
  };
}
var CONNECTION_SQLSTATE_PREFIXES = ["08", "28", "53", "57P0", "3D000"];
var SCHEMA_NAME_SQLSTATES = /* @__PURE__ */ new Set(["42P01", "42703", "3F000", "42P02", "42704"]);
var LEGACY_CONNECTION_CODES = /* @__PURE__ */ new Set([
  "ELOGIN",
  "ESOCKET",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ER_ACCESS_DENIED_ERROR",
  "ER_DBACCESS_DENIED_ERROR",
  "ER_BAD_DB_ERROR",
  "PROTOCOL_CONNECTION_LOST"
]);
var LEGACY_SCHEMA_CODES = /* @__PURE__ */ new Set(["ER_BAD_FIELD_ERROR", "ER_BAD_TABLE_ERROR", "ER_NO_SUCH_TABLE"]);
function classifyQueryFailure(result) {
  if (!result)
    return "unknown";
  const details = result.data;
  if (details?.name === "SyntaxError" && typeof result.description === "string" && result.description.startsWith("JSON5:"))
    return "query";
  const category = result.category;
  if (category === "authentication" || category === "connection")
    return "connection";
  if (category === "schema_name")
    return "schema_name";
  if (category === "unknown")
    return "unknown";
  if (["timeout", "rate_limit", "transient", "query"].includes(String(category)))
    return "query";
  if (typeof category === "string")
    return "unknown";
  const data = result.data;
  const codes = data && typeof data === "object" ? [data.code, data.sqlState, data.sqlstate].map((value) => String(value ?? "").toUpperCase()).filter(Boolean) : [];
  if (codes.some((code) => CONNECTION_SQLSTATE_PREFIXES.some((prefix) => code.startsWith(prefix))) || codes.some((code) => LEGACY_CONNECTION_CODES.has(code)))
    return "connection";
  if (codes.some((code) => SCHEMA_NAME_SQLSTATES.has(code) || LEGACY_SCHEMA_CODES.has(code)))
    return "schema_name";
  return codes.length ? "query" : "unknown";
}
function failureRecovery(query, result) {
  return classifyQueryFailure(result) === "connection" ? datasourceRecovery(query) : void 0;
}
function failureVerification(query, result) {
  if (!query.data_source_id || classifyQueryFailure(result) !== "unknown")
    return void 0;
  return {
    action: "test_datasource_connection",
    datasource_id: query.data_source_id,
    instruction: "Test this same saved datasource before diagnosing the failure. If testing is unsupported or inconclusive, ask the user before one bounded read. Never substitute another datasource from an unknown failure."
  };
}
function introspectedNames(result) {
  const data = result?.data;
  if (!Array.isArray(data))
    return [];
  return data.map((row) => typeof row === "string" ? row : row?.value ?? row?.label ?? row?.name).filter((value) => typeof value === "string" && value.length > 0);
}
async function availableTableNames(client, query) {
  if (!query.data_source_id || !query.kind)
    return void 0;
  const methods = getDatasourceQuerySchema(query.kind)?.introspectionMethods ?? [];
  const tableMethod = ["listTables", "list_tables", "getTables", "tables"].find((m) => methods.includes(m));
  if (!tableMethod)
    return void 0;
  let methodArgs;
  if (methods.includes("listSchemas")) {
    const schemas = introspectedNames(await client.invokeDatasourceMethod({ dataSourceId: query.data_source_id, method: "listSchemas" }));
    const schema = schemas.includes("public") ? "public" : schemas[0];
    if (schema)
      methodArgs = { schema };
  }
  const tableResult = await client.invokeDatasourceMethod({
    dataSourceId: query.data_source_id,
    method: tableMethod,
    ...methodArgs ? { args: methodArgs } : {}
  });
  const names = introspectedNames(tableResult);
  return names.length ? names : void 0;
}
async function schemaNameHint(client, query, result) {
  if (classifyQueryFailure(result) !== "schema_name")
    return void 0;
  const data = result.data;
  const code = data && typeof data === "object" ? String(data.code ?? "") : "";
  const hint = {
    kind: "schema_name_error",
    detail: String(result.description ?? result.message ?? "a table or column named in the query does not exist"),
    ...code ? { sqlstate: code } : {},
    guidance: "This is a schema/name error, NOT a connection problem \u2014 the datasource is reachable, so do NOT ask the user to repair or test the connection. A table or column named in the SQL does not exist. Call inspect_datasource_schema (listTables, then listColumns for the target table) to get the EXACT names, correct the query, and retry. Never guess table or column names."
  };
  try {
    const tables = await availableTableNames(client, query);
    if (tables?.length)
      hint.available_tables = tables.slice(0, 50);
  } catch {
  }
  return hint;
}
function runQueryTool(client) {
  return {
    name: "run_query",
    title: "Run Query",
    // Executes whatever the query holds against the customer datasource — which may write or delete.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: `Run an already-created query and return its REAL result \u2014 the browser-free way to see actual data. Use it to (a) verify a query works before binding UI to it, and (b) inspect real column values / distinct values (statuses, categories) before writing chart series, dropdown options, or filters. The query must already exist (create it with add_query first). Returns { status: "ok"|"failed", data: <datasource result>, ... }; data may be an array or an object (ToolJet DB SQL uses data.results). Inspect the actual shape before binding components. HTTP is 200 even on failure, so CHECK \`status\` and read \`message\` on failure. Runs the SAVED query as-is; it does not mutate it. SELECT * is always refused. Reads with no static limit at or below ${LARGE_READ_ROW_THRESHOLD} rows require an unfiltered, same-datasource count_query_id first; if the observed count is larger, retry only after explicit user approval with user_confirmed_large_read:true. BigQuery, Snowflake, and Redshift reads also require explicit cost approval with user_confirmed_billable_read:true, even when row-limited. Never set confirmation flags from inferred consent. A static remote read (including REST GET and Supabase rows) requires separate approval with user_confirmed_remote_read:true because it may expose sensitive data or consume quota; remote writes are refused. If saved options reference \`components.*\`, the result includes a warning because browser-free execution cannot prove the component-resolved pagination/filter behavior.`,
    inputSchema: {
      query_id: external_exports.string(),
      version_id: external_exports.string(),
      environment_id: external_exports.string().optional(),
      count_query_id: external_exports.string().optional(),
      user_confirmed_large_read: external_exports.boolean().optional(),
      user_confirmed_billable_read: external_exports.boolean().optional(),
      user_confirmed_remote_read: external_exports.boolean().optional()
    },
    async handler(args) {
      try {
        const warnings = [];
        const query = await client.getQuery(args.query_id, args.version_id).catch(async (error) => {
          const saved = await client.getQueries(args.version_id);
          const resolution = resolveRef(saved, args.query_id, "Query", `on version "${args.version_id}"`);
          if (!resolution.ok)
            throw new Error(resolution.error, { cause: error });
          return resolution.target;
        });
        const assessment = assessQueryRead(query);
        if (!assessment.provenRead || assessment.selectStar) {
          return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? "not a proven read"}`));
        }
        const staticBindings = resolveStaticBindings(query.options);
        const bindingRefusal = resolvedReadRefusal(query, assessment, staticBindings.resolved);
        if (bindingRefusal) {
          return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${bindingRefusal}`));
        }
        if (containsComponentBinding(query.options)) {
          warnings.push('Saved query options reference components.*. Browser-free run_query cannot resolve live component state. A missing/undefined filter parameter here is not proof the saved SQL is wrong. Verify in the viewer before rewriting the query; preserve output aliases and every consumer when a real repair is needed. Even status:"ok" does not prove live filter or pagination behavior.');
        }
        if (assessment.requiresRemoteReadConfirmation && !args.user_confirmed_remote_read) {
          return fail(new Error(`run_query refused remote read "${query.name ?? query.id}" before execution: remote reads can expose sensitive data, consume API quota, and return an unbounded payload. Tell the user which saved query will run and ask explicitly; retry with user_confirmed_remote_read:true only after they approve that request.`));
        }
        if (assessment.requiresRemoteReadConfirmation) {
          warnings.push(assessment.datasourceKind === "restapi" ? "User-confirmed REST GET: the remote API controls response size and quota. Inspect metadata.response (status and paging headers), and add API-specific pagination before another run when needed." : "User-confirmed remote read: the datasource controls response size and quota.");
        }
        if (assessment.requiresBillableReadConfirmation && !args.user_confirmed_billable_read) {
          return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${query.kind} reads can incur warehouse/scan charges even with a row LIMIT. Explain that cost to the user and retry with user_confirmed_billable_read:true only after explicit approval.`));
        }
        let preflight;
        if (assessment.requiresCountPreflight) {
          if (!args.count_query_id) {
            return fail(new Error(`run_query refused query "${query.name ?? query.id}" before execution: ${assessment.reason ?? "result size is not bounded"} Create a same-source COUNT(*)/ToolJet DB count-aggregate query and retry with count_query_id. Use server-side pagination when the count exceeds ${LARGE_READ_ROW_THRESHOLD}.`));
          }
          if (args.count_query_id === args.query_id || args.count_query_id === query.id) {
            return fail(new Error("count_query_id must be a separate count-only query."));
          }
          const countQuery = await client.getQuery(args.count_query_id, args.version_id);
          const countAssessment = assessQueryRead(countQuery);
          const countCanRun = countAssessment.directSafe || countAssessment.requiresBillableReadConfirmation === true && args.user_confirmed_billable_read === true || countAssessment.requiresRemoteReadConfirmation === true && args.user_confirmed_remote_read === true;
          if (!countAssessment.countOnly || !countCanRun || countAssessment.requiresCountPreflight || !sameReadSource(assessment, countAssessment)) {
            return fail(new Error(`run_query refused the count preflight: "${countQuery.name ?? countQuery.id}" must be an unfiltered COUNT(*) (or ToolJet DB count of the generated id) against the same datasource and simple table as the target query.`));
          }
          const countResult = await client.runQuery({
            queryId: countQuery.id,
            versionId: args.version_id,
            environmentId: args.environment_id
          });
          const rowCount2 = extractRowCount(countResult);
          if (rowCount2 === void 0) {
            return fail(new Error(`Count preflight "${countQuery.name ?? countQuery.id}" did not return one row with exactly one numeric count; target query was not run.`));
          }
          preflight = { count_query_id: countQuery.id, row_count: rowCount2, threshold: LARGE_READ_ROW_THRESHOLD };
          if (rowCount2 > LARGE_READ_ROW_THRESHOLD && !args.user_confirmed_large_read) {
            return fail(new Error(`Target query was not run: count preflight found ${rowCount2} rows, above the ${LARGE_READ_ROW_THRESHOLD}-row threshold. Recommend server-side pagination. If a full read is still necessary, tell the user the observed count and ask explicitly; retry with user_confirmed_large_read:true only after they approve.`));
          }
          if (rowCount2 > LARGE_READ_ROW_THRESHOLD) {
            warnings.push(`User-confirmed large read: count preflight found ${rowCount2} rows. Server-side pagination remains recommended.`);
          }
        }
        let result;
        try {
          const bindings = staticBindings;
          const emptied = emptyViewerOnlyParams(query.options, bindings);
          if (emptied.length)
            warnings.push(emptyParamsNote(emptied));
          const liveOnly = bindings.unresolved.filter((b) => !/components\./.test(b));
          if (liveOnly.length)
            warnings.push(unresolvedNote(liveOnly));
          result = await client.runQuery({
            queryId: query.id,
            versionId: args.version_id,
            environmentId: args.environment_id,
            resolvedOptions: bindings.resolved
          });
        } catch (error) {
          return ok({
            status: "failed",
            message: redactQueryText(error instanceof Error ? error.message : String(error)),
            ...preflight ? { preflight } : {},
            ...warnings.length ? { warnings } : {}
          });
        }
        const failed = result.status === "failed";
        const bindingHint = queryResultBindingHint(query, result);
        const recovery = failed ? failureRecovery(query, result) : void 0;
        const verification = failed ? failureVerification(query, result) : void 0;
        const schemaHint = failed ? await schemaNameHint(client, query, result) : void 0;
        const output = assessment.requiresRemoteReadConfirmation ? truncateRemoteResult(result) : { result };
        if (output.warning)
          warnings.push(output.warning);
        return ok({
          // Credentials around the rows (request headers, URL secrets, cookies) never reach the model (resultRedaction.ts).
          ...redactRunResult(output.result),
          // Trusted execution evidence, separate from datasource-supplied data. No credentials,
          // URLs or row contents are needed for the agent's early migration/readiness checkpoint.
          // What let it run, not a claim about its effects: the read classifier is a static check (CM-37).
          execution: { query_id: query.id, datasource_kind: query.kind, preflight: "explicit_read" },
          ...bindingHint ? { binding_hint: bindingHint } : {},
          ...preflight ? { preflight } : {},
          ...warnings.length ? { warnings } : {},
          ...recovery ? { recovery } : {},
          ...verification ? { verification } : {},
          ...schemaHint ? { schema_hint: schemaHint } : {}
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var MAX_READS = 10;
var CLOCK_SKEW = /JWT issued at future/i;
var CLOCK_SKEW_RETRY_MS = 1500;
var REASON_CHARS = 160;
var rowCount = (result) => {
  const data = result.data;
  if (Array.isArray(data))
    return data.length;
  return void 0;
};
async function checkPlanReads(client, params) {
  const wanted = [...new Set(params.queryIds)];
  if (!wanted.length)
    return void 0;
  const saved = await client.getQueries(params.versionId);
  const byId = new Map(saved.map((query) => [query.id, query]));
  const check = { ran: 0, rows: {}, failed: [], inconclusive: [], not_run: [], queries: [] };
  const entries = /* @__PURE__ */ new Map();
  const runnable = [];
  for (const id of wanted) {
    const query = byId.get(id);
    if (!query)
      continue;
    const name = query.name ?? id;
    const verdict = autoReadPreflight(query);
    if (!verdict.run) {
      const reason = verdict.reason.startsWith(NOT_CHECKED_AUTOMATICALLY) ? verdict.reason : verdict.reason.slice(0, REASON_CHARS);
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: "refused", reason });
    } else if (runnable.length >= MAX_READS) {
      const reason = `only the first ${MAX_READS} reads of a phase are checked; run this one with run_queries`;
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: "skipped", reason });
    } else {
      runnable.push(id);
    }
  }
  const ledger = () => {
    check.queries = wanted.flatMap((id) => entries.get(id) ?? []);
    return check;
  };
  if (!runnable.length)
    return ledger();
  const environmentId = params.environmentId ?? await client.getDevelopmentEnvironmentId();
  await Promise.all(runnable.map(async (id) => {
    const query = byId.get(id);
    const name = query.name ?? id;
    const needsViewer = containsComponentBinding(query.options);
    const run = async () => {
      try {
        const bindings = resolveStaticBindings(query.options);
        emptyViewerOnlyParams(query.options, bindings);
        return await runUnattended(client, { queryId: id, versionId: params.versionId, environmentId, resolvedOptions: bindings.resolved });
      } catch (error) {
        return { status: "failed", message: error instanceof Error ? error.message : String(error) };
      }
    };
    let result = await run();
    if (result.status === "failed" && CLOCK_SKEW.test(String(result.message ?? result.description ?? ""))) {
      await new Promise((resolve2) => setTimeout(resolve2, params.retryDelayMs ?? CLOCK_SKEW_RETRY_MS));
      result = await run();
    }
    if (result.timed_out === true) {
      const reason = String(result.message);
      check.not_run.push({ name, reason });
      entries.set(id, { name, status: "skipped", reason });
      return;
    }
    check.ran += 1;
    if (result.status !== "failed") {
      const rows = rowCount(result);
      if (rows !== void 0)
        check.rows[name] = rows;
      entries.set(id, { name, status: "checked", outcome: "passed" });
      return;
    }
    const message = String(result.message ?? result.description ?? "the query failed").slice(0, 600);
    if (needsViewer) {
      check.inconclusive.push({
        name,
        message,
        note: "This query reads components.*, which a browser-free run leaves empty: the failure may be about the missing value. Check that the query also works when that input is empty, or give the input a default."
      });
      entries.set(id, { name, status: "checked", outcome: "inconclusive" });
      return;
    }
    const schemaHint = await schemaNameHint(client, query, result).catch(() => void 0);
    check.failed.push({ name, message, ...schemaHint ? { schema_hint: schemaHint } : {} });
    entries.set(id, { name, status: "checked", outcome: "failed" });
  }));
  return ledger();
}
function logicalRef(value) {
  return value.client_ref ?? value.name;
}
function sourceTarget(sourceType, ref, pages, queries, components) {
  if (sourceType === "page")
    return pages.get(ref);
  if (sourceType === "data_query")
    return queries.get(ref);
  return components.get(ref);
}
function resolveAction(raw, pages, queries, components) {
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === "run-query" ? action.queryId ?? action.queryName : void 0);
  if (targetRef === void 0)
    return action;
  if (typeof targetRef !== "string")
    throw new Error("Event action target_ref must be a string.");
  const actionId = String(action.actionId);
  const target = actionId === "run-query" ? queries.get(targetRef) : actionId === "switch-page" ? pages.get(targetRef) : ["show-modal", "close-modal", "control-component", "set-table-page", "scroll-component-into-view"].includes(actionId) ? components.get(targetRef) : void 0;
  if (!target)
    throw new Error(`Action "${actionId}" has unknown or unsupported target_ref "${targetRef}".`);
  if (actionId === "run-query")
    return { ...action, queryId: target.id, queryName: target.name };
  if (actionId === "switch-page")
    return { ...action, pageId: target.id };
  if (actionId === "show-modal" || actionId === "close-modal")
    return { ...action, modal: target.id };
  if (actionId === "control-component" || actionId === "scroll-component-into-view") {
    return { ...action, componentId: target.id };
  }
  if (actionId === "set-table-page")
    return { ...action, table: target.id };
  return action;
}
function refs(values, targets, label) {
  return values?.map((ref) => {
    const target = targets.get(ref);
    if (!target)
      throw new Error(`${label} ref "${ref}" does not exist.`);
    return target.id;
  });
}
function oneRef(value, targets, label) {
  if (!value)
    return void 0;
  const target = targets.get(value);
  if (!target)
    throw new Error(`${label} ref "${value}" does not exist.`);
  return target.id;
}
function appliedSummary(applied) {
  return Object.entries(applied).map(([key, value]) => `${key}=${value}`).join(", ");
}
var TABLE_READY_DELAYS_MS = [100, 200, 400, 800, 1e3];
async function waitForCreatedTables(client, tableNames) {
  await Promise.all(tableNames.map(async (tableName) => {
    let lastError;
    for (let attempt = 0; attempt <= TABLE_READY_DELAYS_MS.length; attempt += 1) {
      try {
        const [tables, schema] = await Promise.all([client.listTables(), client.getTableSchema(tableName)]);
        if (!tables.some((table) => table.table_name === tableName)) {
          throw new Error(`table is not visible in list_tables yet`);
        }
        if (!schema.length)
          throw new Error("schema has no columns yet");
        return;
      } catch (error) {
        lastError = error;
        const delay = TABLE_READY_DELAYS_MS[attempt];
        if (delay === void 0)
          break;
        await new Promise((resolve2) => setTimeout(resolve2, delay));
      }
    }
    throw new Error(`Created table "${tableName}" did not become readable before seeding: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }));
}
function applyAppPhaseTool(client) {
  return {
    name: "apply_app_phase",
    title: "Apply App Phase",
    // Creates, and amends page metadata or the app name when the approved plan says to. It drops no table and deletes
    // no row; the one delete path is a plan page marked replace, whose old components and events it removes.
    annotations: {
      readOnlyHint: false,
      // A plan page marked replace has its components and their events deleted before the plan's are created.
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Consume one successful lint_app_spec plan_token and apply that exact phase once. The tool resolves logical refs, creates tables/pages/queries in dependency order, seeds rows, creates independent page component batches concurrently, combines ordinary events and mutation lifecycles into one bulk write, then returns persisted structural/contract validation. It then runs the proven read queries the phase created or updated once and reports them in read_check (failed: fix the query; inconclusive: the read takes a component value a browser-free run leaves empty; not_run: writes, remote or paid calls, RunJS and reads the automatic check cannot prove, which are never run here; queries: each one checked, refused or skipped, and only checked with outcome passed is a pass). A failing read does not fail the phase. ToolJet has no cross-resource transaction: a rare upstream partial failure reports the completed stage/counts and never auto-deletes user data, except for a plan page marked replace: that page ends up holding exactly the plan's components. It is written as a difference: a component the plan leaves as it is is not rewritten, one that only moved is moved, one that changed is created again under its own id, and one the plan drops is deleted, with the events on the page's components replaced by the plan's (page events and query events only where the plan declares them again); queries the plan defines again are updated in place keeping their ids. A replace is refused before any write if the page changed since lint (any component, redefined query or related event edited), and every component and event ref is prepared before the first write. A replace is not atomic: a failure midway leaves the page to be repaired (the result says what was removed; there is no rollback), so use replace on draft or otherwise recoverable pages. The one-time token prevents an accidental retry from duplicating objects.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string().optional().describe("Defaults to the version the plan was linted for."),
      plan_token: external_exports.string(),
      check_reads: external_exports.boolean().optional().describe("Default true: after the phase is written, the proven read queries it created or updated are run once and the result carries read_check {ran, rows, failed, inconclusive, not_run, queries}. Writes, remote or paid calls, RunJS and reads the automatic check cannot prove are never run. false skips the check.")
    },
    async handler(input) {
      const peeked = peekAppPlan(input.plan_token);
      if (peeked) {
        const planVersion = peeked.spec.version_id;
        const mismatch = peeked.spec.app_id && peeked.spec.app_id !== input.app_id ? `Plan app_id "${peeked.spec.app_id}" does not match "${input.app_id}".` : input.version_id && planVersion && planVersion !== input.version_id ? `Plan version_id "${planVersion}" does not match "${input.version_id}". Omit version_id to use the plan's.` : void 0;
        if (mismatch)
          return { content: [{ type: "text", text: `Error: ${mismatch} The plan_token is still valid.` }], isError: true };
      }
      const version = input.version_id ?? peeked?.spec.version_id;
      if (!version) {
        return { content: [{ type: "text", text: "Error: apply_app_phase needs version_id: neither the call nor the plan names one." }], isError: true };
      }
      const args = { ...input, version_id: version };
      const applied = {
        app_metadata: 0,
        tables: 0,
        seed_rows: 0,
        pages: 0,
        queries: 0,
        components: 0,
        events: 0,
        queries_updated: 0,
        events_removed: 0,
        components_removed: 0,
        components_kept: 0,
        components_moved: 0
      };
      let stage = "consume plan";
      let createdPageIds = [];
      let replacedPageNames = [];
      let retargetPending = [];
      let notRetargeted;
      try {
        const stored = consumeAppPlan(args.plan_token);
        const spec = stored.spec;
        if (spec.app_id && spec.app_id !== args.app_id) {
          throw new Error(`Plan app_id "${spec.app_id}" does not match "${args.app_id}".`);
        }
        if (spec.version_id && spec.version_id !== args.version_id) {
          throw new Error(`Plan version_id "${spec.version_id}" does not match "${args.version_id}".`);
        }
        stage = "read current app context";
        const [initialSummary, existingTables, datasources] = await Promise.all([
          client.getAppSummary(args.app_id),
          client.listTables(),
          spec.queries?.length ? client.listDatasources(args.version_id) : Promise.resolve([])
        ]);
        const frozen = frozenAppRefusal(initialSummary);
        if (frozen)
          return fail(new Error(frozen));
        if (initialSummary.version_id && initialSummary.version_id !== args.version_id) {
          throw new Error(`App editing version is "${initialSummary.version_id}", not "${args.version_id}".`);
        }
        const replacing = replaceView(initialSummary, spec);
        if (replacing && replaceFingerprint(initialSummary, replacing) !== stored.replaceFingerprint) {
          const pages = replacing.replacedPageNames.length ? `"${replacing.replacedPageNames.join('", "')}"` : "The queries this plan redefines";
          return fail(new Error(`apply_app_phase refused before any write: ${pages} changed since this plan was linted (a component, event or query was edited, or the plan was linted without app_id). Run lint_app_spec with app_id again so the plan sees the current state.`));
        }
        if (replacing) {
          const dangling = danglingAfterReplace(initialSummary, replacing, spec);
          if (dangling.length)
            return fail(new Error(`apply_app_phase refused before any write: ${dangling.join(" ")}`));
        }
        const planSummary = replacing?.summary ?? initialSummary;
        replacedPageNames = replacing?.replacedPageNames ?? [];
        retargetPending = (replacing?.eventsToRetarget ?? []).map((event) => `"${event.name ?? event.id}"`);
        stage = "prepare queries";
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        const preparedQueryOptions = (spec.queries ?? []).map((query) => {
          if (!query.datasource_id)
            throw new Error(`Query "${query.name}" has no pinned datasource_id. Lint the phase again.`);
          const kind = datasourceKinds.get(query.datasource_id);
          if (!kind)
            throw new Error(`Query "${query.name}" datasource "${query.datasource_id}" is unavailable.`);
          const options = structuredClone(query.options);
          if (query.table_ref)
            options.table_id = `planned-table:${query.table_ref}`;
          const prepared = prepareQueryOptionsForWrite(kind, options, `Query "${query.name}"`);
          if (prepared.errors.length)
            throw new Error(`${prepared.errors.join(" ")} Nothing was written; lint the phase again.`);
          return { kind, options: prepared.options };
        });
        for (const query of preparedQueryOptions) {
          if (query.kind === "workflows")
            await client.assertWorkflowQueryTarget(query.options);
        }
        const plannedPageMatches = /* @__PURE__ */ new Map();
        const claimedPageIds = /* @__PURE__ */ new Set();
        const reusableHome = initialSummary.pages.length === 1 && initialSummary.pages[0]?.handle === "home" && initialSummary.pages[0].components.length === 0 ? initialSummary.pages[0] : void 0;
        const plannedPageNames = new Set((spec.pages ?? []).map((page) => page.name));
        for (const page of spec.pages ?? []) {
          let match = matchPlannedPage(planSummary.pages, page.name, plannedPageNames, claimedPageIds);
          if (!match && reusableHome && !claimedPageIds.has(reusableHome.id))
            match = reusableHome;
          if (match)
            plannedPageMatches.set(logicalRef(page), match);
          if (match)
            claimedPageIds.add(match.id);
          const existingNames = new Set((match?.components ?? []).map((component) => component.name).filter(Boolean));
          const collision = (page.components ?? []).find((component) => existingNames.has(component.name));
          if (collision) {
            throw new Error(`Page "${page.name}" already has a component named "${collision.name}".`);
          }
        }
        const existingQueryNames = new Set(planSummary.queries.map((query) => query.name).filter(Boolean));
        const queryCollision = (spec.queries ?? []).find((query) => existingQueryNames.has(query.name));
        if (queryCollision)
          throw new Error(`App already has a query named "${queryCollision.name}".`);
        const existingTableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        const resolvePlannedEvents = (pageTargets2, queryTargets2, targets) => {
          const ordinaryEvents2 = (spec.events ?? []).map((event) => {
            const source = sourceTarget(event.source_type, event.source_ref, pageTargets2, queryTargets2, targets);
            if (!source)
              throw new Error(`Event has unknown ${event.source_type} source_ref "${event.source_ref}".`);
            return {
              sourceId: source.id,
              sourceType: event.source_type,
              ref: event.ref,
              trigger: event.trigger,
              action: resolveAction(event.action, pageTargets2, queryTargets2, targets),
              name: event.name
            };
          });
          const lifecycleSpecs2 = (spec.lifecycles ?? []).map((lifecycle) => ({
            queryId: oneRef(lifecycle.query_ref, queryTargets2, "Lifecycle query"),
            beforeRefreshActions: lifecycle.before_refresh_actions?.map((action) => resolveAction(action, pageTargets2, queryTargets2, targets)),
            refreshQueryIds: refs(lifecycle.refresh_query_refs, queryTargets2, "Lifecycle refresh query"),
            clearComponentIds: refs(lifecycle.clear_component_refs, targets, "Lifecycle clear component"),
            closeModalId: oneRef(lifecycle.close_modal_ref, targets, "Lifecycle modal"),
            successAlert: lifecycle.success_alert ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type } : void 0,
            failureAlert: lifecycle.failure_alert ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type } : void 0,
            successActions: lifecycle.success_actions?.map((action) => resolveAction(action, pageTargets2, queryTargets2, targets)),
            failureActions: lifecycle.failure_actions?.map((action) => resolveAction(action, pageTargets2, queryTargets2, targets))
          }));
          return { ordinaryEvents: ordinaryEvents2, lifecycleSpecs: lifecycleSpecs2 };
        };
        stage = "prepare page components";
        const canvasColor = await literalCanvasColor(client, args.app_id, initialSummary.version_id ?? args.version_id);
        const preparedBatches = /* @__PURE__ */ new Map();
        for (const page of spec.pages ?? []) {
          if (!page.components?.length)
            continue;
          const prepared = prepareComponentBatch(page.components, {
            canvasColor,
            existingComponents: plannedPageMatches.get(logicalRef(page))?.components
          });
          if (prepared.errors.length)
            throw new Error(`Page "${page.name}": ${prepared.errors.join(" ")}`);
          preparedBatches.set(logicalRef(page), prepared);
        }
        stage = "resolve event refs";
        {
          const pages = persistedTargets(initialSummary.pages.map((page) => ({ id: page.id, name: page.name ?? page.id, aliases: [page.handle] })));
          for (const page of spec.pages ?? []) {
            const id = plannedPageMatches.get(logicalRef(page))?.id ?? `planned-page:${logicalRef(page)}`;
            pages.set(logicalRef(page), { id, name: page.name });
          }
          const queries = persistedTargets(planSummary.queries.map((query) => ({ id: query.id, name: query.name ?? query.id })));
          for (const query of spec.queries ?? []) {
            const target = { id: replacing?.queriesToUpdate.get(query.name) ?? `planned-query:${query.name}`, name: query.name };
            queries.set(logicalRef(query), target);
            queries.set(query.name, target);
          }
          const components = persistedTargets(planSummary.pages.flatMap((page) => page.components).map((component) => ({
            id: component.id,
            name: component.name ?? component.id,
            type: component.type
          })));
          for (const prepared of preparedBatches.values()) {
            for (const component of prepared.components) {
              const ref = componentRef(component);
              if (components.has(ref))
                throw new Error(`Duplicate component client_ref/name "${ref}" in planned app.`);
              components.set(ref, { id: `planned:${ref}`, name: component.name, type: component.type });
            }
          }
          resolvePlannedEvents(pages, queries, components);
        }
        let renameWarning;
        if (spec.app_name && spec.app_name !== initialSummary.name) {
          stage = "rename target app";
          try {
            await client.renameApp(args.app_id, args.version_id, spec.app_name);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!/exist|unique|duplicate|taken|conflict|409|422/i.test(message))
              throw error;
            const fallback = `${spec.app_name} ${Math.random().toString(36).slice(2, 5)}`;
            await client.renameApp(args.app_id, args.version_id, fallback);
            renameWarning = `App name "${spec.app_name}" is already used in this workspace; the app was named "${fallback}" instead.`;
          }
          applied.app_metadata = 1;
        }
        stage = "create tables and pages";
        const newPages = (spec.pages ?? []).filter((page) => !plannedPageMatches.has(logicalRef(page)));
        const [tableWrite, pageWrite] = await Promise.allSettled([
          spec.tables?.length ? client.createTables({
            tables: spec.tables.map((table) => ({
              tableName: table.table_name,
              columns: table.columns,
              foreignKeys: table.foreign_keys
            }))
          }) : Promise.resolve([]),
          newPages.length ? client.createPages({
            appId: args.app_id,
            versionId: args.version_id,
            pages: newPages.map((page) => ({ name: page.name, icon: page.icon, hidden: page.hidden }))
          }) : Promise.resolve([])
        ]);
        const createdTables = tableWrite.status === "fulfilled" ? tableWrite.value : completedPartialWrites(tableWrite.reason);
        const createdPages = pageWrite.status === "fulfilled" ? pageWrite.value : completedPartialWrites(pageWrite.reason);
        applied.tables = createdTables.length;
        applied.pages = createdPages.length;
        createdPageIds = createdPages.map((page) => page.page_id);
        const foundationFailures = [
          ...tableWrite.status === "rejected" ? [`tables: ${tableWrite.reason instanceof Error ? tableWrite.reason.message : String(tableWrite.reason)}`] : [],
          ...pageWrite.status === "rejected" ? [`pages: ${pageWrite.reason instanceof Error ? pageWrite.reason.message : String(pageWrite.reason)}`] : []
        ];
        if (foundationFailures.length)
          throw new Error(foundationFailures.join(" | "), {
            cause: tableWrite.status === "rejected" ? tableQuotaError(tableWrite.reason) : void 0
          });
        const tableIds = new Map(existingTableIds);
        for (const table of createdTables)
          tableIds.set(table.table_name.toLowerCase(), table.table_id);
        const newlyCreatedSeedTables = createdTables.map((table) => table.table_name).filter((tableName) => spec.seed_data?.some((seed) => seed.table_name === tableName));
        if (newlyCreatedSeedTables.length) {
          stage = "wait for created table schemas";
          await waitForCreatedTables(client, newlyCreatedSeedTables);
        }
        const pageTargets = persistedTargets(initialSummary.pages.map((page) => ({ id: page.id, name: page.name ?? page.id, aliases: [page.handle] })));
        for (const page of spec.pages ?? []) {
          const ref = logicalRef(page);
          const existing = plannedPageMatches.get(ref);
          const created = createdPages.find((candidate) => candidate.name === page.name);
          const id = existing?.id ?? created?.page_id;
          if (!id)
            throw new Error(`Could not resolve page "${page.name}" after creation.`);
          pageTargets.set(ref, { id, name: page.name });
        }
        const pageUpdates = (spec.pages ?? []).flatMap((page) => {
          const existing = plannedPageMatches.get(logicalRef(page));
          if (!existing)
            return [];
          const update = {
            pageId: existing.id,
            ...existing.name !== page.name ? { name: page.name } : {},
            ...existing.icon !== page.icon ? { icon: page.icon } : {},
            ...page.hidden !== void 0 && Boolean(existing.hidden) !== page.hidden ? { hidden: page.hidden } : {}
          };
          return Object.keys(update).length > 1 ? [update] : [];
        });
        if (pageUpdates.length) {
          await client.updatePages({ appId: args.app_id, versionId: args.version_id, updates: pageUpdates });
        }
        stage = "seed data and create queries";
        const queryInputs = (spec.queries ?? []).map((query, index) => {
          const { kind, options } = preparedQueryOptions[index];
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId)
              throw new Error(`Query "${query.name}" has unknown table_ref "${query.table_ref}".`);
            options.table_id = tableId;
          }
          return { dataSourceId: query.datasource_id, name: query.name, options, kind };
        });
        const updateInputs = queryInputs.filter((query) => replacing?.queriesToUpdate.has(query.name));
        const createInputs = queryInputs.filter((query) => !replacing?.queriesToUpdate.has(query.name));
        const [seedWrite, queryWrite] = await Promise.allSettled([
          spec.seed_data?.length ? client.insertRowsBatch({
            tables: spec.seed_data.map((seed) => ({ tableName: seed.table_name, rows: seed.rows }))
          }) : Promise.resolve([]),
          createInputs.length ? client.createQueries({ versionId: args.version_id, queries: createInputs }) : Promise.resolve([])
        ]);
        const seedResults = seedWrite.status === "fulfilled" ? seedWrite.value : completedPartialWrites(seedWrite.reason);
        const createdQueries = queryWrite.status === "fulfilled" ? queryWrite.value : completedPartialWrites(queryWrite.reason);
        applied.seed_rows = seedResults.reduce((total, result) => total + result.processed_rows, 0);
        applied.queries = createdQueries.length;
        const dataFailures = [
          ...seedWrite.status === "rejected" ? [`seed_data: ${seedWrite.reason instanceof Error ? seedWrite.reason.message : String(seedWrite.reason)}`] : [],
          ...queryWrite.status === "rejected" ? [`queries: ${queryWrite.reason instanceof Error ? queryWrite.reason.message : String(queryWrite.reason)}`] : []
        ];
        if (dataFailures.length)
          throw new Error(dataFailures.join(" | "));
        for (const query of updateInputs) {
          const queryId = replacing.queriesToUpdate.get(query.name);
          const current = initialSummary.queries.find((candidate) => candidate.id === queryId);
          if (current && query.dataSourceId && current.data_source_id !== query.dataSourceId) {
            await client.updateQueryDatasource({ queryId, versionId: args.version_id, dataSourceId: query.dataSourceId });
          }
          try {
            await client.updateQuery({ queryId, versionId: args.version_id, options: query.options });
            applied.queries_updated += 1;
          } catch (error) {
            applied.queries_updated += completedPartialWrites(error).length;
            throw error;
          }
        }
        const queryTargets = persistedTargets(planSummary.queries.map((query) => ({ id: query.id, name: query.name ?? query.id })));
        let createdIndex = 0;
        (spec.queries ?? []).forEach((query) => {
          const updatedId = replacing?.queriesToUpdate.get(query.name);
          const target = updatedId ? { query_id: updatedId, name: query.name } : createdQueries[createdIndex++];
          if (!target)
            throw new Error(`Could not resolve query "${query.name}" after creation.`);
          queryTargets.set(logicalRef(query), { id: target.query_id, name: target.name });
          queryTargets.set(query.name, { id: target.query_id, name: target.name });
        });
        const preparedPages = (spec.pages ?? []).flatMap((page) => {
          const prepared = preparedBatches.get(logicalRef(page));
          if (!prepared)
            return [];
          const target = pageTargets.get(logicalRef(page));
          if (!target)
            throw new Error(`Could not resolve component page "${page.name}".`);
          return [{ page, pageId: target.id, prepared }];
        });
        const inPlace = /* @__PURE__ */ new Map();
        if (replacing) {
          for (const page of preparedPages) {
            if (!replacing.replacedPageIds.includes(page.pageId))
              continue;
            const held = initialSummary.pages.find((existing) => existing.id === page.pageId)?.components ?? [];
            inPlace.set(page.pageId, diffPageInPlace(held, page.prepared.components));
          }
        }
        if (replacing) {
          stage = "remove the replaced page's components and events";
          for (const eventId of replacing.eventsToDelete) {
            await client.deleteEvent({ appId: args.app_id, versionId: args.version_id, eventId });
            applied.events_removed += 1;
          }
          for (const { pageId, componentIds } of replacing.componentsToDelete) {
            const ids = inPlace.get(pageId)?.deleteIds ?? componentIds;
            if (!ids.length)
              continue;
            const removed = await client.deleteComponents({ appId: args.app_id, versionId: args.version_id, pageId, componentIds: ids });
            applied.components_removed += removed.deleted ?? ids.length;
          }
        }
        stage = "create page components";
        const componentWrites = await Promise.allSettled(preparedPages.map(async (page) => {
          const diff = inPlace.get(page.pageId);
          if (!diff) {
            const created2 = await client.createComponents({
              appId: args.app_id,
              versionId: args.version_id,
              pageId: page.pageId,
              components: page.prepared.components
            });
            return { ...page, created: created2, written: created2.length };
          }
          if (diff.create.length) {
            await client.createComponents({ appId: args.app_id, versionId: args.version_id, pageId: page.pageId, components: diff.create });
          }
          if (diff.relayout.length) {
            await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: page.pageId, layouts: diff.relayout });
          }
          applied.components_kept += diff.keep.length;
          applied.components_moved += diff.relayout.length;
          const created = page.prepared.components.map((component) => ({
            component_id: diff.ids.get(componentRef(component)),
            name: component.name
          }));
          return { ...page, created, written: diff.create.length };
        }));
        const componentResults = componentWrites.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
        const componentFailures = componentWrites.flatMap((result, index) => result.status === "rejected" ? [`page ${preparedPages[index].page.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`] : []);
        const componentTargets = persistedTargets(planSummary.pages.flatMap((page) => page.components).map((component) => ({
          id: component.id,
          name: component.name ?? component.id,
          type: component.type
        })));
        const warnings = [];
        if (renameWarning)
          warnings.push(renameWarning);
        for (const page of componentResults) {
          applied.components += page.written;
          warnings.push(...page.prepared.warnings.map((warning) => `Page ${page.page.name}: ${warning}`));
          page.prepared.components.forEach((component, index) => {
            const created = page.created[index];
            if (!created)
              throw new Error(`Could not resolve component "${component.name}" after creation.`);
            componentTargets.set(componentRef(component), {
              id: created.component_id,
              name: created.name,
              type: component.type
            });
          });
        }
        if (replacing?.eventsToRetarget.length) {
          stage = "point other events at the recreated components";
          const newIdByName = new Map(componentResults.flatMap((page) => page.prepared.components.map((component, index) => [component.name, page.created[index]?.component_id])));
          const updates = [];
          const missingTargets = [];
          for (const event of replacing.eventsToRetarget) {
            const newIds = new Map([...replacing.replacedComponentNames].map(([oldId, name]) => [oldId, newIdByName.get(name)]));
            const original = JSON.stringify(event.event ?? {});
            const swapped = replaceIds(original, newIds);
            const text = swapped.text;
            const missing = swapped.missing.map((id) => replacing.replacedComponentNames.get(id) ?? id);
            if (missing.length) {
              missingTargets.push(`"${event.name ?? event.id}" (${missing.join(", ")})`);
              warnings.push(`Event "${event.name ?? event.id}" targets ${missing.map((n) => `"${n}"`).join(", ")}, which the replaced page no longer has; it was left as it was.`);
            } else if (text !== original) {
              updates.push({ eventId: event.id, ...event.name ? { name: event.name } : {}, event: JSON.parse(text) });
            }
          }
          if (updates.length)
            await client.updateEvents({ appId: args.app_id, versionId: args.version_id, events: updates });
          notRetargeted = missingTargets;
        }
        if (componentFailures.length)
          throw new Error(componentFailures.join(" | "));
        stage = "create events and lifecycles";
        const summaryBeforeEvents = await client.getAppSummary(args.app_id);
        const { ordinaryEvents, lifecycleSpecs } = resolvePlannedEvents(pageTargets, queryTargets, componentTargets);
        const expanded = expandQueryLifecycles(summaryBeforeEvents, lifecycleSpecs);
        warnings.push(...expanded.warnings);
        const allEvents = [...ordinaryEvents, ...expanded.events];
        const eventValidation = validateEvents(summaryBeforeEvents, allEvents, { navigationMovedLast: true });
        if (eventValidation.errors.length)
          throw new Error(eventValidation.errors.join(" "));
        warnings.push(...eventValidation.warnings);
        const newEvents = withoutExistingEvents(allEvents, summaryBeforeEvents.events);
        if (newEvents.length) {
          await client.createEvents({
            appId: args.app_id,
            versionId: args.version_id,
            events: newEvents,
            existingEvents: summaryBeforeEvents.events
          });
          applied.events = newEvents.length;
          const reorders = navigationReorders(await client.getAppSummary(args.app_id), newEvents, warnings);
          if (reorders.length) {
            await client.updateEvents({ appId: args.app_id, versionId: args.version_id, events: reorders, updateType: "reorder" });
            warnings.push(`Moved ${reorders.length} page switch${reorders.length > 1 ? "es" : ""} behind the handlers this phase added, so they still run.`);
          }
        }
        stage = "validate persisted phase";
        const persisted = await client.getAppSummary(args.app_id);
        const validation = validatePersistedAppSummary(persisted, { canvasColor: await literalCanvasColor(client, args.app_id, persisted.version_id) });
        warnings.push(...validation.warnings);
        const relevantTableNames = /* @__PURE__ */ new Set([
          ...(spec.tables ?? []).map((table) => table.table_name),
          ...(spec.seed_data ?? []).map((seed) => seed.table_name),
          ...(spec.queries ?? []).flatMap((query) => query.table_ref ? [query.table_ref] : [])
        ]);
        let readCheck;
        if (input.check_reads !== false) {
          stage = "check the phase's reads";
          try {
            const written = (spec.queries ?? []).flatMap((query) => {
              const target = queryTargets.get(logicalRef(query));
              return target ? [target.id] : [];
            });
            readCheck = await checkPlanReads(client, { versionId: args.version_id, queryIds: written });
          } catch (error) {
            readCheck = { error: `The phase applied; its reads could not be checked (${error instanceof Error ? error.message : String(error)}). Run them with run_queries.` };
          }
        }
        return ok({
          applied,
          ...readCheck ? { read_check: readCheck } : {},
          refs: {
            tables: Object.fromEntries([...relevantTableNames].map((name) => [name, tableIds.get(name.toLowerCase())])),
            pages: selectedRefs(pageTargets, (spec.pages ?? []).map(logicalRef)),
            queries: selectedRefs(queryTargets, (spec.queries ?? []).map(logicalRef)),
            components: selectedRefs(componentTargets, (spec.pages ?? []).flatMap((page) => (page.components ?? []).map(logicalRef)))
          },
          warnings: [...new Set(warnings)],
          validation
        });
      } catch (error) {
        let recovery = "";
        const onlyFoundation = applied.components === 0 && applied.queries === 0 && applied.queries_updated === 0 && applied.events === 0;
        if (onlyFoundation && createdPageIds.length) {
          const removed = [];
          for (const pageId of createdPageIds) {
            try {
              await client.deletePage({ appId: args.app_id, versionId: args.version_id, pageId });
              removed.push(pageId);
            } catch {
            }
          }
          if (removed.length) {
            applied.pages -= removed.length;
            recovery += ` Removed the ${removed.length} empty page(s) this phase had created, so the next plan can recreate them under the same names.`;
          }
        }
        if (Object.values(applied).some((count) => count > 0)) {
          try {
            const current = await client.getAppSummary(args.app_id);
            recovery = " Persisted resources for targeted repair (do not recreate): " + JSON.stringify({
              pages: current.pages.map((page) => ({
                id: page.id,
                name: page.name,
                components: page.components.map((c) => ({ id: c.id, name: c.name }))
              })),
              queries: current.queries.map((q) => ({ id: q.id, name: q.name }))
            }).slice(0, 12e3);
          } catch {
          }
        }
        const removedNote = applied.components_removed || applied.events_removed ? `The replace had already removed the old content of ${replacedPageNames.map((name) => `"${name}"`).join(", ")} (${applied.components_removed} component(s), ${applied.events_removed} event(s)); that page now holds only what this phase created (listed below). Repair it by linting the whole page again with replace: true and applying that plan. ` + (notRetargeted === void 0 && retargetPending.length ? `Events on other pages that pointed at its old components were not re-pointed: ${retargetPending.join(", ")}; they still hold the removed ids, so point them at the recreated components with update_events. ` : notRetargeted?.length ? `Events on other pages still point at components that were not recreated: ${notRetargeted.join(", ")}; recreate those or change the events with update_events. ` : "") : "nothing with content on it was auto-deleted. ";
        return fail(new Error(`apply_app_phase failed during ${stage}. Applied before failure: ${appliedSummary(applied)}. The one-time plan token is consumed; ${removedNote}${error instanceof Error ? error.message : String(error)}` + recovery, { cause: error }));
      }
    }
  };
}
function persistedTargets(values) {
  const targets = /* @__PURE__ */ new Map();
  const nameCounts = /* @__PURE__ */ new Map();
  values.forEach((value) => nameCounts.set(value.name, (nameCounts.get(value.name) ?? 0) + 1));
  for (const { aliases, ...value } of values) {
    targets.set(value.id, value);
    if (nameCounts.get(value.name) === 1)
      targets.set(value.name, value);
    for (const alias of aliases ?? [])
      if (alias && !targets.has(alias))
        targets.set(alias, value);
  }
  return targets;
}
function selectedRefs(targets, refs2) {
  return Object.fromEntries(refs2.flatMap((ref) => {
    const target = targets.get(ref);
    return target ? [[ref, target.id]] : [];
  }));
}
function withoutExistingEvents(planned, existing) {
  const key = (sourceType, sourceId, payload) => JSON.stringify([sourceType, sourceId, Object.keys(payload).sort().map((k) => [k, payload[k]])]);
  const have = new Set(existing.flatMap((e) => {
    const raw = e.event && typeof e.event === "object" && !Array.isArray(e.event) ? e.event : void 0;
    if (!raw)
      return [];
    const { index: _index, name: _name, ...payload } = raw;
    return [key(e.target, e.sourceId, payload)];
  }));
  return planned.filter((e) => !have.has(key(e.sourceType, e.sourceId, { eventId: e.trigger, ...e.ref ? { ref: e.ref } : {}, ...e.action })));
}
export {
  applyAppPhaseTool as a,
  runUnattended as b,
  containsComponentBinding as c,
  failureVerification as d,
  redactRunResult as e,
  failureRecovery as f,
  capUnattendedOutput as g,
  redactQueryText as h,
  libraryPinErrors as l,
  queryResultBindingHint as q,
  runQueryTool as r,
  schemaNameHint as s,
  validatePersistedAppSummary as v
};
