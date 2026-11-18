import { createRequire } from "node:module";
import { a as assessQueryRead, L as LARGE_READ_ROW_THRESHOLD } from "./chunk-JkmarBOr.js";
import { p as parseExpression, a as parse } from "./chunk-DyR1HbdA.js";
import { h as hubspotQueryIssues, a as apiEndpointQueryIssues, g as getDatasourceQuerySchema, s as singleSpecRef, C as COMMON_QUERY_OPTION_FIELDS, S as SPEC_DISCOVERY_NOTE } from "./chunk-DFfPGgwi.js";
createRequire(import.meta.url);
var QUERY_TOGGLES = ["runOnPageLoad", "runOnDependencyChange", "requestConfirmation", "showSuccessNotification"];
var STATIC_TOGGLE = /^\s*(?:\{\{\s*(true|false)\s*\}\}|(true|false))\s*$/;
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function staticToggle(value) {
  if (typeof value !== "string")
    return void 0;
  const match = STATIC_TOGGLE.exec(value);
  return match ? (match[1] ?? match[2]) === "true" : void 0;
}
function normalizeQueryToggles(options) {
  if (!isPlainObject(options))
    return options;
  let out = options;
  for (const key of QUERY_TOGGLES) {
    const value = staticToggle(options[key]);
    if (value === void 0)
      continue;
    if (out === options)
      out = { ...options };
    out[key] = value;
  }
  return out;
}
function describe(value) {
  if (value === null)
    return "null";
  if (Array.isArray(value))
    return "an array";
  if (typeof value === "object")
    return "an object";
  if (typeof value === "string")
    return JSON.stringify(value);
  return `${typeof value} ${String(value)}`;
}
function queryToggleIssues(options) {
  if (!isPlainObject(options))
    return [];
  const issues = [];
  for (const key of QUERY_TOGGLES) {
    if (!(key in options))
      continue;
    const value = options[key];
    if (value === void 0 || typeof value === "boolean" || staticToggle(value) !== void 0)
      continue;
    const dynamic = typeof value === "string" ? " ToolJet does not evaluate it and treats any text as on. Run the query from an event instead when it depends on state." : "";
    issues.push({
      code: "query_toggle_not_boolean",
      path: key,
      message: `${key} must be true or false (or left out), not ${describe(value)}.${dynamic}`
    });
  }
  return issues;
}
function toggleRewriteWarning(before, after) {
  const changed = QUERY_TOGGLES.filter((key) => before?.[key] !== after?.[key]);
  if (!changed.length)
    return void 0;
  return `${changed.map((key) => `${key} ${JSON.stringify(before[key])} saved as ${String(after[key])}`).join(", ")}; ToolJet reads these as true/false and runs any text on load.`;
}
function assertPersistableQueryToggles(options, subject) {
  const issues = queryToggleIssues(options);
  const strings = isPlainObject(options) ? QUERY_TOGGLES.filter((key) => typeof options[key] === "string") : [];
  const messages = [
    ...issues.map((issue2) => issue2.message),
    ...strings.filter((key) => !issues.some((issue2) => issue2.path === key)).map((key) => `${key} must be sent as a boolean, not ${JSON.stringify(options[key])}.`)
  ];
  if (messages.length)
    throw new Error(`${subject}: ${messages.join(" ")}`);
}
function bindingSpans(value) {
  const spans = [];
  let from = 0;
  while (from < value.length) {
    const start = value.indexOf("{{", from);
    if (start < 0)
      break;
    let close = value.indexOf("}}", start + 2);
    let matched = false;
    while (close >= 0) {
      const body = value.slice(start + 2, close);
      try {
        parseExpression(`(${body})`);
        spans.push({ start, end: close + 2, body });
        from = close + 2;
        matched = true;
        break;
      } catch {
        close = value.indexOf("}}", close + 1);
      }
    }
    if (!matched)
      from = start + 2;
  }
  return spans;
}
function primitiveWriteBindingEntries(value) {
  if (typeof value !== "string")
    return [];
  const source = value.trim();
  const spans = bindingSpans(source);
  if (spans.length !== 1 || spans[0].start !== 0 || spans[0].end !== source.length)
    return [];
  try {
    const node = parseExpression(spans[0].body);
    if (node.type !== "ObjectExpression")
      return [];
    return node.properties.flatMap((p) => {
      if (p.type !== "ObjectProperty" || p.computed)
        return [];
      const key = p.key.type === "Identifier" ? p.key.name : p.key.type === "StringLiteral" || p.key.type === "NumericLiteral" ? String(p.key.value) : void 0;
      if (!key)
        return [];
      return ["StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "TemplateLiteral", "UnaryExpression"].includes(p.value.type) ? [key] : [];
    });
  } catch {
    return [];
  }
}
var object = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : void 0;
function conditionalWriteWarning(kind, options) {
  if (kind !== "tooljetdb" || options.operation !== "update_rows")
    return;
  const update = object(options.update_rows);
  const written = new Set(Object.values(object(update?.columns) ?? {}).map(object).flatMap((c) => typeof c?.column === "string" ? [c.column] : []));
  const guarded = Object.values(object(update?.where_filters) ?? {}).map(object).filter((f) => typeof f?.column === "string" && written.has(f.column) && f.operator === "eq").map((f) => String(f.column));
  if (!guarded.length)
    return;
  return `update_rows both checks and changes ${[...new Set(guarded)].map((x) => JSON.stringify(x)).join(", ")}. This can legitimately succeed with zero matching rows (stale value/state). An untransformed ToolJet DB update_rows returns the changed rows in queries.<name>.data (an empty array means no match); account for any query transformation. Before a dependent write, audit entry, status transition or success message, verify the result contains the intended row and expected count; do not treat onDataQuerySuccess alone as that proof. On no match, stop the dependent chain and show a conflict/reload message. Do not remove the predicate to make the write pass. This is advisory; callers may already handle the result.`;
}
function walk(v, visit) {
  if (Array.isArray(v)) {
    for (const x of v)
      walk(x, visit);
    return;
  }
  const n = object(v);
  if (!n)
    return;
  visit(n);
  for (const [key, child] of Object.entries(n))
    if (!["loc", "extra", "comments"].includes(key))
      walk(child, visit);
}
function property(n) {
  const p = object(n?.property);
  if (!n?.computed && p?.type === "Identifier")
    return String(p.name);
  if (p?.type === "StringLiteral")
    return String(p.value);
}
function arithmeticWriteWarning(kind, options) {
  if (kind !== "tooljetdb" || options.operation !== "update_rows")
    return;
  const update = object(options.update_rows), columns = object(update?.columns);
  if (!columns)
    return;
  const filters = Object.values(object(update?.where_filters) ?? {}).map(object);
  const risky = [];
  for (const entry of Object.values(columns)) {
    const c = object(entry);
    if (typeof c?.column !== "string" || typeof c.value !== "string")
      continue;
    if (filters.some((f) => f?.column === c.column && f?.operator === "eq"))
      continue;
    const match = c.value.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!match)
      continue;
    let ast;
    try {
      ast = parseExpression(match[1]);
    } catch {
      continue;
    }
    let shadowed = false, found = false;
    walk(ast, (n) => {
      if (Array.isArray(n.params) && /"components"/.test(JSON.stringify(n.params)))
        shadowed = true;
      if (n.type === "VariableDeclarator" && /"components"/.test(JSON.stringify(n.id)))
        shadowed = true;
    });
    if (shadowed)
      continue;
    walk(ast, (n) => {
      if (n.type !== "BinaryExpression" || !["+", "-"].includes(String(n.operator)))
        return;
      walk(n, (member) => {
        if (!["MemberExpression", "OptionalMemberExpression"].includes(String(member.type)))
          return;
        const selected = object(member.object), table = object(selected?.object), namespace = object(table?.object);
        if (property(selected) === "selectedRow" && namespace?.type === "Identifier" && namespace.name === "components")
          found = true;
      });
    });
    if (found)
      risky.push(c.column);
  }
  if (!risky.length)
    return;
  return `update_rows calculates ${[...new Set(risky)].map((x) => JSON.stringify(x)).join(", ")} from selectedRow arithmetic without an expected-value predicate for that column. Verify the source query actually returns every operand; an absent value defaulted to zero can overwrite a real balance. For accumulated stock, balances or counters, prefer a supported atomic database increment/decrement with bounds and idempotency, or an explicit optimistic-concurrency predicate. Do not silently replace the intended calculation; ordinary derived-field formulas may be intentional. This is advisory, not proof that the operation is incorrect.`;
}
var UPDATE_OPERATIONS = /* @__PURE__ */ new Set(["update_one", "update_many", "find_one_update"]);
var BULK_UPDATES = ["updateOne", "updateMany"];
var ARRAY_METHODS = /* @__PURE__ */ new Set(["map", "filter", "concat", "flat", "flatMap", "slice", "sort", "reverse", "toSorted", "toReversed"]);
var STRING_OR_ARRAY_METHODS = /* @__PURE__ */ new Set(["slice", "concat"]);
var ROW_COLLECTIONS = /* @__PURE__ */ new Set(["currentData", "updatedData", "filteredData", "currentPageData", "selectedRows", "newRows"]);
var ELEMENT_PATH = /\$|\.\d+(\.|$)/;
var isMember = (n) => n?.type === "MemberExpression" || n?.type === "OptionalMemberExpression";
var propertyName = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var keyName = (p) => p.computed ? void 0 : p.key?.type === "Identifier" ? p.key.name : p.key?.type === "StringLiteral" ? p.key.value : void 0;
var property2 = (n, key) => n?.type === "ObjectExpression" ? n.properties.find((p) => p.type === "ObjectProperty" && keyName(p) === key)?.value : void 0;
function unwrap(n) {
  while (n?.type === "CallExpression") {
    if (isMember(n.callee) && n.callee.object?.name === "JSON" && propertyName(n.callee) === "stringify" && n.arguments.length >= 1) {
      n = n.arguments[0];
      continue;
    }
    const fn = n.callee;
    if (!["ArrowFunctionExpression", "FunctionExpression"].includes(fn?.type) || fn.async || fn.generator || fn.params.length || n.arguments.length)
      break;
    if (fn.body.type !== "BlockStatement") {
      n = fn.body;
    } else if (fn.body.body.length === 1 && fn.body.body[0].type === "ReturnStatement") {
      n = fn.body.body[0].argument;
    } else
      break;
  }
  return n;
}
function parseField(value) {
  if (value !== null && typeof value === "object")
    value = JSON.stringify(value);
  if (typeof value !== "string" || !value.trim())
    return void 0;
  let source = "";
  let from = 0;
  for (const span of bindingSpans(value)) {
    const quote = value[span.start - 1];
    const quoted = (quote === '"' || quote === "'") && value[span.end] === quote && span.start - 1 >= from;
    source += value.slice(from, quoted ? span.start - 1 : span.start) + `(${span.body})`;
    from = quoted ? span.end + 1 : span.end;
  }
  source += value.slice(from);
  try {
    return unwrap(parseExpression(source));
  } catch {
    return void 0;
  }
}
function referencesComponents(n) {
  if (!n || typeof n !== "object")
    return false;
  if (Array.isArray(n))
    return n.some(referencesComponents);
  const node = n;
  if (isMember(node) && node.object?.type === "Identifier" && node.object.name === "components")
    return true;
  return Object.entries(node).some(([key, child]) => !["loc", "extra", "comments"].includes(key) && referencesComponents(child));
}
function isArrayValue(raw) {
  const n = unwrap(raw);
  if (!n)
    return false;
  if (n.type === "LogicalExpression")
    return isArrayValue(n.left) || isArrayValue(n.right);
  if (n.type === "ConditionalExpression")
    return isArrayValue(n.consequent) || isArrayValue(n.alternate);
  if (n.type === "ArrayExpression")
    return true;
  if (n.type === "CallExpression" || n.type === "OptionalCallExpression") {
    const callee = n.callee;
    const method = isMember(callee) ? propertyName(callee) ?? "" : "";
    if (ARRAY_METHODS.has(method)) {
      return !STRING_OR_ARRAY_METHODS.has(method) || isArrayValue(callee.object);
    }
    if (isMember(callee) && ["Array", "Object"].includes(callee.object?.name) && ["from", "values"].includes(propertyName(callee) ?? ""))
      return true;
    return false;
  }
  return isMember(n) && ROW_COLLECTIONS.has(propertyName(n) ?? "");
}
function isComponentArray(raw) {
  const n = unwrap(raw);
  if (n?.type === "LogicalExpression")
    return isComponentArray(n.left) || isComponentArray(n.right);
  if (n?.type === "ConditionalExpression")
    return isComponentArray(n.consequent) || isComponentArray(n.alternate);
  return referencesComponents(n) && isArrayValue(n);
}
function replacedArrayPaths(set, prefix = "") {
  if (set?.type !== "ObjectExpression")
    return [];
  return set.properties.flatMap((p) => {
    if (p.type !== "ObjectProperty")
      return [];
    const key = keyName(p);
    if (!key)
      return [];
    const path = prefix ? `${prefix}.${key}` : key;
    if (ELEMENT_PATH.test(path))
      return [];
    if (isComponentArray(p.value))
      return [path];
    return replacedArrayPaths(unwrap(p.value), path);
  });
}
function setStages(update) {
  update = unwrap(update);
  if (update?.type === "ObjectExpression")
    return [property2(update, "$set")].filter(Boolean);
  if (update?.type === "ArrayExpression") {
    return update.elements.flatMap((stage) => [property2(stage, "$set"), property2(stage, "$addFields")].filter(Boolean));
  }
  return [];
}
function issue(path, field) {
  return {
    code: "mongodb_whole_array_set",
    path,
    message: `$set replaces the whole "${field}" array with a value built from component data, so every save drops the elements and fields the components do not hold. Update the edited elements by path instead: { $set: { "${field}.$[el].<field>": ... } } with options { arrayFilters: [{ "el.<key>": ... }] }, matching a stable key field, and abort the save unless the element count is unchanged apart from explicit adds and deletes.`
  };
}
function mongoArrayReplacementIssues(options) {
  const operation = typeof options.operation === "string" ? options.operation : "";
  const updates = [];
  if (UPDATE_OPERATIONS.has(operation))
    updates.push({ path: "update", update: parseField(options.update) });
  if (operation === "bulk_write") {
    const operations = parseField(options.operations);
    if (operations?.type === "ArrayExpression") {
      operations.elements.forEach((op, index) => {
        for (const kind of BULK_UPDATES) {
          const update = unwrap(property2(unwrap(property2(op, kind)), "update"));
          if (update)
            updates.push({ path: `operations[${index}].${kind}.update`, update });
        }
      });
    }
  }
  return updates.flatMap(({ path, update }) => setStages(update).flatMap((set) => replacedArrayPaths(unwrap(set)).map((field) => issue(path, field))));
}
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var ALIASES = { workflow_id: "workflowId", workflow_version_id: "workflowVersionId" };
function normalizeWorkflowQueryOptions(options) {
  let normalized = options;
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (!(alias in options))
      continue;
    if (options[field] !== void 0 && options[field] !== options[alias])
      continue;
    if (normalized === options)
      normalized = { ...options };
    if (normalized[field] === void 0)
      normalized[field] = normalized[alias];
    delete normalized[alias];
  }
  return normalized;
}
function workflowQueryIssues(options) {
  const errors = [];
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (alias in options && options[field] !== void 0 && options[field] !== options[alias])
      errors.push({
        code: "conflicting_workflow_target",
        path: alias,
        message: `Conflicting workflow selectors ${field} and ${alias}; specify one target.`
      });
  }
  if ("sync_execution" in options)
    errors.push({ code: "invalid_workflow_option", path: "sync_execution", message: "Use the native syncExecution boolean, not sync_execution." });
  options = normalizeWorkflowQueryOptions(options);
  for (const field of ["workflowId", "workflowVersionId"]) {
    const value = options[field];
    if (field === "workflowVersionId" && (value === void 0 || value === null))
      continue;
    if (typeof value !== "string" || (field === "workflowId" ? !UUID.test(value) : !value.trim() || value.length > 255))
      errors.push({
        code: "invalid_workflow_target",
        path: field,
        message: `Workflow query options.${field} must be a literal workflow ${field === "workflowId" ? "ID from list_workflows/get_workflow" : "version name, __current_branch__, __default_branch_draft__, or legacy version UUID"}. A query and its success/failure handlers do not establish the workflow mapping.`
      });
  }
  if (options.syncExecution !== void 0 && typeof options.syncExecution !== "boolean") {
    errors.push({ code: "invalid_workflow_option", path: "syncExecution", message: "Workflow query syncExecution must be a boolean." });
  }
  if (options.params !== void 0 && (!Array.isArray(options.params) || options.params.some((param) => !param || typeof param !== "object" || Array.isArray(param) || typeof param.key !== "string" || !Object.hasOwn(param, "value")))) {
    errors.push({ code: "invalid_workflow_option", path: "params", message: "Workflow query params must be an array of {key, value} entries; values may contain app bindings." });
  }
  return errors;
}
function assertWorkflowQueryOptions(options) {
  const errors = workflowQueryIssues(options);
  if (errors.length)
    throw new Error(errors.map((error) => error.message).join(" "));
}
function workflowMappingMatches(expected, actual) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual))
    return false;
  const saved = normalizeWorkflowQueryOptions(actual);
  return saved.workflowId === expected.workflowId && (saved.workflowVersionId ?? null) === (expected.workflowVersionId ?? null);
}
var KNOWN_IGNORED_KEYS = {
  run_on_page_load: "runOnPageLoad"
};
function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isTruthyStatic(value) {
  return value === true || staticToggle(value) === true;
}
function isDynamicBinding(value) {
  return typeof value === "string" && value.includes("{{");
}
function valueAtPath(source, path) {
  let cursor = source;
  for (const segment of path.split(".")) {
    if (!isObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, segment))
      return void 0;
    cursor = cursor[segment];
  }
  return cursor;
}
function describeOperationSelection(schema) {
  if (schema.kind === "hubspot")
    return "Use inspect_datasource_schema getEndpointSchema and copy query_options (operation, path, specType and params).";
  if (singleSpecRef(schema.kind))
    return SPEC_DISCOVERY_NOTE;
  const selection = schema.operationSelection;
  if (schema.operations.length) {
    const fields = selection?.fields?.length ? selection.fields.join(" + ") : "operation";
    return `Set ${fields}. Valid operations: ${schema.operations.join(", ")}.`;
  }
  if (selection?.mode === "remote-spec") {
    return `This kind takes its operation from the remote API spec${selection.specUrl ? ` (${selection.specUrl})` : ""}, not from a fixed list; set ${selection.field ?? "the operation field"} to an operation id from that spec.`;
  }
  return "This kind has a single unnamed query form; author it against the default contract.";
}
function operationFromOptions(options, contracts, defaults) {
  const operation = options.operation ?? defaults.operation;
  if (typeof operation === "string" && operation) {
    if (Object.prototype.hasOwnProperty.call(contracts, operation))
      return operation;
    if (Object.prototype.hasOwnProperty.call(contracts, "default"))
      return "default";
    return operation;
  }
  const mode = options.mode ?? defaults.mode;
  if (typeof mode === "string" && mode && Object.prototype.hasOwnProperty.call(contracts, mode))
    return mode;
  if (Object.prototype.hasOwnProperty.call(contracts, "default"))
    return "default";
  const selectorMatches = Object.entries(contracts).filter(([, contract]) => contract.variants.some((variant) => {
    const selectors = Object.entries(variant.when);
    return selectors.length > 0 && selectors.every(([selector, accepted]) => {
      const actual = options[selector] ?? defaults[selector];
      return typeof actual === "string" && !isDynamicBinding(actual) && accepted.includes(actual);
    });
  }));
  if (selectorMatches.length === 1)
    return selectorMatches[0][0];
  return void 0;
}
function variantMatches(variant, options) {
  return Object.entries(variant.when).every(([selector, accepted]) => {
    const actual = options[selector];
    return actual === void 0 || isDynamicBinding(actual) || typeof actual === "string" && accepted.includes(actual);
  });
}
function intersection(values) {
  if (!values.length)
    return [];
  return values[0].filter((value) => values.every((items) => items.includes(value)));
}
function fieldMap(variants) {
  const fields = { ...COMMON_QUERY_OPTION_FIELDS };
  for (const variant of variants)
    Object.assign(fields, variant.fields);
  return fields;
}
function topLevelKeys(fields) {
  return new Set(Object.keys(fields).map((path) => path.split(".")[0]));
}
function nestedChildren(fields, root) {
  return new Set(Object.keys(fields).filter((path) => path.startsWith(`${root}.`)).map((path) => path.slice(root.length + 1).split(".")[0]));
}
function suffixSuggestion(key, fields) {
  const matches = Object.keys(fields).filter((path) => path.endsWith(`.${key}`));
  return matches.length === 1 ? matches[0] : void 0;
}
function tupleArity(field) {
  const tuple = field.shape?.["<index>"];
  return Array.isArray(tuple) && tuple.length > 0 ? tuple.length : void 0;
}
function bindingStrings(value, path = "") {
  if (typeof value === "string")
    return [{ path: path || void 0, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => bindingStrings(item, `${path}[${index}]`));
  }
  if (!isObject(value))
    return [];
  return Object.entries(value).flatMap(([key, item]) => bindingStrings(item, path ? `${path}.${key}` : key));
}
function tableStateWarnings(options) {
  const warnings = [];
  for (const binding of bindingStrings(options)) {
    const match = binding.value.match(/components\.([A-Za-z_$][\w$]*)\.pageIndex\s*-\s*1/);
    if (!match)
      continue;
    warnings.push({
      code: "unguarded_table_page_index",
      path: binding.path,
      message: `Table pageIndex may be undefined when the first page-load query evaluates; "${match[0]}" can produce NaN and an empty table. Use ((components.${match[1]}.pageIndex || 1) - 1) * pageSize (or an equivalent nullish guard).`
    });
  }
  return warnings;
}
function unquotedSqlBindingIssues(sql) {
  const issues = [];
  const risky = /(=|<>|!=|>|<|>=|<=|\bLIKE\b|\bILIKE\b|,|\()\s*(?!')\{\{/gi;
  const seen = /* @__PURE__ */ new Set();
  let match;
  while ((match = risky.exec(sql)) !== null) {
    const raw = match[1].toUpperCase();
    const operator = raw === "," || raw === "(" ? "a function argument" : raw;
    if (seen.has(operator))
      continue;
    seen.add(operator);
    issues.push({
      code: "unquoted_sql_binding",
      path: "query",
      message: `SQL uses an unquoted binding (as ${operator}). ToolJet splices bindings in as raw text, so when that component is empty \u2014 its state on page load \u2014 the statement becomes nothing at that position and fails with a SQL syntax error; the table then shows "No data" and the page looks broken on first open. Pass it as a parameter instead: put \`:name\` in the statement and the binding in query_params, e.g. \`WHERE priority = :priority\` with query_params [["priority", "{{components.priorityFilter.value}}"]]. That fixes the empty case and the escaping together. Quoting it ('{{...}}') only fixes the empty case and leaves the value spliced into the statement as text.`
    });
  }
  return issues;
}
function interpolatedSqlBindingIssues(sql) {
  const quoted = /'\s*\{\{[^}]*\}\}\s*'/g;
  if (!quoted.test(sql))
    return [];
  return [
    {
      code: "interpolated_sql_binding",
      path: "query",
      message: 'SQL pastes a binding into the statement as quoted text (\'{{...}}\'). The quotes are the only escaping, so a value containing a quote rewrites the statement. Pass it as a parameter instead: `:name` in the query and the binding in query_params, e.g. `WHERE priority = :priority` with query_params [["priority", "{{components.priorityFilter.value}}"]]. Safe today if the value comes from a fixed dropdown, but the query does not change when someone later binds it to a text input.'
    }
  ];
}
var RUNJS_PARAMETERS = ["moment", "_", "components", "queries", "globals", "page", "axios", "variables", "actions", "constants"];
function runjsSyntaxError(code) {
  try {
    new Function(`return (async (${RUNJS_PARAMETERS.join(", ")}) => {
${code}
});`);
    return void 0;
  } catch (error) {
    if (!(error instanceof SyntaxError))
      return void 0;
    const clash = error.message.match(/Identifier '([\w$]+)' has already been declared/)?.[1];
    if (clash && RUNJS_PARAMETERS.includes(clash)) {
      return `the code declares \`${clash}\`, a name ToolJet already gives every RunJS query (${RUNJS_PARAMETERS.join(", ")}), so the query fails with "Identifier '${clash}' has already been declared" when it runs. Rename it (${clash}List, say).`;
    }
    try {
      parse(`async function f(){
${code}
}`, { sourceType: "script" });
    } catch (located) {
      const loc = located.loc;
      const line = loc ? code.split("\n")[loc.line - 2] : void 0;
      if (loc && line !== void 0) {
        const from = Math.max(0, loc.column - 60);
        const excerpt = line.slice(from, loc.column + 20).trim();
        return `${error.message}, at line ${loc.line - 1} column ${loc.column + 1}: ${from > 0 ? "\u2026" : ""}${excerpt}${bracketBalance(code)}`;
      }
    }
    return `${error.message}${bracketBalance(code)}`;
  }
}
function bracketBalance(code) {
  const stack = [];
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const lines = code.split("\n");
  const lineOf = (i) => code.slice(0, i).split("\n").length;
  const snippet = (i) => {
    const l = lineOf(i);
    const start = code.lastIndexOf("\n", i - 1) + 1;
    const col = i - start;
    return (lines[l - 1] ?? "").slice(Math.max(0, col - 30), col + 30).trim();
  };
  let quote = null;
  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (quote === "`" && ch === "$" && code[i + 1] === "{") {
        stack.push({ ch: "${", line: lineOf(i), at: i });
        quote = null;
        i += 1;
        continue;
      }
      if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === "/" && code[i + 1] === "/") {
      const end = code.indexOf("\n", i);
      i = end === -1 ? code.length : end;
      continue;
    }
    if (ch === "/" && code[i + 1] === "*") {
      const end = code.indexOf("*/", i + 2);
      i = end === -1 ? code.length : end + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{")
      stack.push({ ch, line: lineOf(i), at: i });
    else if (ch === ")" || ch === "]" || ch === "}") {
      const top = stack.pop();
      if (top?.ch === "${" && ch === "}") {
        quote = "`";
        continue;
      }
      if (!top || top.ch !== pairs[ch]) {
        return top ? ` A \`${ch}\` at line ${lineOf(i)} closes the \`${top.ch}\` opened at line ${top.line} (${snippet(top.at)}).` : ` A \`${ch}\` at line ${lineOf(i)} closes nothing.`;
      }
    }
  }
  const open = stack.filter((s) => s.ch !== "${");
  if (!open.length)
    return "";
  const last = open[open.length - 1];
  return ` ${open.length} bracket${open.length > 1 ? "s are" : " is"} never closed; the last, \`${last.ch}\` opened at line ${last.line} (${snippet(last.at)}), needs its \`${{ "(": ")", "[": "]", "{": "}" }[last.ch]}\`.`;
}
var RUNJS_KNOWN_NAMES = /* @__PURE__ */ new Set([
  ...RUNJS_PARAMETERS,
  "parameters",
  "input",
  "arguments",
  "undefined",
  "NaN",
  "Infinity",
  "globalThis",
  "eval",
  "isFinite",
  "isNaN",
  "parseFloat",
  "parseInt",
  "decodeURI",
  "decodeURIComponent",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "unescape",
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  "Error",
  "AggregateError",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Number",
  "BigInt",
  "Math",
  "Date",
  "String",
  "RegExp",
  "Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "WeakRef",
  "FinalizationRegistry",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Atomics",
  "JSON",
  "Promise",
  "Proxy",
  "Reflect",
  "Intl",
  "window",
  "self",
  "document",
  "navigator",
  "location",
  "history",
  "screen",
  "localStorage",
  "sessionStorage",
  "console",
  "alert",
  "confirm",
  "prompt",
  "fetch",
  "Blob",
  "File",
  "FileReader",
  "FormData",
  "Headers",
  "Request",
  "Response",
  "URL",
  "URLSearchParams",
  "AbortController",
  "atob",
  "btoa",
  "crypto",
  "performance",
  "structuredClone",
  "queueMicrotask",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "TextEncoder",
  "TextDecoder",
  "DOMParser",
  "XMLHttpRequest",
  "WebSocket",
  "Image",
  "getComputedStyle",
  "Event",
  "CustomEvent"
]);
var isNode = (value) => !!value && typeof value === "object" && typeof value.type === "string";
function patternNames(node, out) {
  if (!isNode(node))
    return;
  if (node.type === "Identifier")
    out.add(String(node.name));
  else if (node.type === "ObjectPattern")
    for (const p of node.properties)
      patternNames(p.type === "RestElement" ? p.argument : p.value, out);
  else if (node.type === "ArrayPattern")
    for (const e of node.elements)
      patternNames(e, out);
  else if (node.type === "RestElement")
    patternNames(node.argument, out);
  else if (node.type === "AssignmentPattern")
    patternNames(node.left, out);
}
function runjsUndeclaredNames(code) {
  return undeclaredNames(`async function __runjs__(){
${code}
}`, RUNJS_KNOWN_NAMES);
}
function bindingUndeclaredNames(expression) {
  if (/\b(components|queries)\.[0-9a-f]{8}-[0-9a-f]{4}-/i.test(expression))
    return [];
  return undeclaredNames(`(function __binding__(){ return (
${expression}
); })`, BINDING_KNOWN_NAMES);
}
function lintBindingNames(value, label, path = "") {
  if (Array.isArray(value))
    return value.flatMap((child, i) => lintBindingNames(child, label, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => lintBindingNames(child, label, path ? `${path}.${key}` : key));
  }
  if (typeof value !== "string" || !value.includes("{{"))
    return [];
  const names = [...new Set([...value.matchAll(/\{\{([\s\S]*?)\}\}/g)].flatMap((m) => bindingUndeclaredNames(m[1])))];
  if (!names.length)
    return [];
  const hints = names.map((n) => /^[a-z_$][\w$]*$/i.test(n) && n.length > 2 && !["row", "item", "r", "x", "d", "e"].includes(n) ? `\`${n}\` (a query is read as queries.${n})` : `\`${n}\``);
  return [`${label}${path ? ` ${path}` : ""}: the binding reads ${hints.join(", ")}, which nothing declares there, so it throws and the component shows nothing. Declare it (a callback needs its parameter: \`rows.filter(r => r.status === "Open")\`), or use ToolJet's names: components, queries, variables, globals, page, constants, and in a table column rowData/cellValue, in a list view listItem, on a Kanban card cardData.`];
}
var BINDING_KNOWN_NAMES = /* @__PURE__ */ new Set([
  ...RUNJS_KNOWN_NAMES,
  "rowData",
  "cellValue",
  "currentRow",
  "listItem",
  "cardData",
  "theme"
]);
var FUNCTION_TYPES = /* @__PURE__ */ new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression", "ObjectMethod", "ClassMethod", "ClassPrivateMethod"]);
function undeclaredNames(source, known) {
  let ast;
  try {
    ast = parse(source, { sourceType: "script", errorRecovery: false });
  } catch {
    return [];
  }
  const declaredIn = (body, into) => {
    const visit = (node) => {
      if (Array.isArray(node)) {
        node.forEach(visit);
        return;
      }
      if (!isNode(node))
        return;
      if (node.type === "VariableDeclarator")
        patternNames(node.id, into);
      if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && isNode(node.id))
        into.add(String(node.id.name));
      if (node.type === "CatchClause")
        patternNames(node.param, into);
      if (FUNCTION_TYPES.has(node.type))
        return;
      for (const [k, v] of Object.entries(node))
        if (k !== "loc" && k !== "extra" && !k.endsWith("Comments"))
          visit(v);
    };
    visit(body);
  };
  const used = [];
  const scopes = [];
  const isDeclared = (name) => scopes.some((scope) => scope.has(name));
  const walk2 = (node, parent, key) => {
    if (Array.isArray(node)) {
      for (const child of node)
        walk2(child, parent, key);
      return;
    }
    if (!isNode(node))
      return;
    if (node.type === "Identifier") {
      const p = parent?.type;
      const notARead = (p === "MemberExpression" || p === "OptionalMemberExpression") && key === "property" && !parent.computed || (p === "ObjectProperty" || p === "ObjectMethod" || p === "ClassMethod" || p === "ClassProperty" || p === "ClassPrivateProperty") && key === "key" && !parent.computed || (p === "LabeledStatement" || p === "BreakStatement" || p === "ContinueStatement") && key === "label" || p === "UnaryExpression" && parent.operator === "typeof" || p === "MetaProperty" || // a declaration's own name, a parameter or a pattern binding is not a read
      p === "VariableDeclarator" && key === "id" || p !== void 0 && FUNCTION_TYPES.has(p) && (key === "id" || key === "params") || (p === "ClassDeclaration" || p === "ClassExpression") && key === "id" || p === "CatchClause" && key === "param";
      const name = String(node.name);
      if (!notARead && !isDeclared(name))
        used.push(name);
      return;
    }
    if (node.type === "Program" || FUNCTION_TYPES.has(node.type)) {
      const scope = /* @__PURE__ */ new Set();
      if (FUNCTION_TYPES.has(node.type)) {
        if (node.type === "FunctionExpression" && isNode(node.id))
          scope.add(String(node.id.name));
        for (const param of node.params ?? [])
          patternNames(param, scope);
        declaredIn(node.body, scope);
      } else {
        declaredIn(node.body, scope);
      }
      scopes.push(scope);
      for (const [k, v] of Object.entries(node)) {
        if (k === "loc" || k === "extra" || k.endsWith("Comments"))
          continue;
        if (k === "params") {
          for (const param of v)
            walkPatternDefaults(param);
          continue;
        }
        walk2(v, node, k);
      }
      scopes.pop();
      return;
    }
    if (node.type === "VariableDeclarator") {
      walkPatternDefaults(node.id);
      walk2(node.init, node, "init");
      return;
    }
    if (node.type === "CatchClause") {
      walk2(node.body, node, "body");
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === "loc" || k === "start" || k === "end" || k === "extra" || k.endsWith("Comments"))
        continue;
      walk2(v, node, k);
    }
  };
  const walkPatternDefaults = (pattern) => {
    if (!isNode(pattern))
      return;
    if (pattern.type === "AssignmentPattern") {
      walkPatternDefaults(pattern.left);
      walk2(pattern.right, pattern, "right");
    } else if (pattern.type === "ObjectPattern")
      for (const p of pattern.properties) {
        if (p.type === "RestElement")
          walkPatternDefaults(p.argument);
        else {
          if (p.computed)
            walk2(p.key, p, "computedKey");
          walkPatternDefaults(p.value);
        }
      }
    else if (pattern.type === "ArrayPattern")
      for (const e of pattern.elements)
        walkPatternDefaults(e);
    else if (pattern.type === "RestElement")
      walkPatternDefaults(pattern.argument);
  };
  walk2(ast);
  return [...new Set(used.filter((name) => !known.has(name) && name !== "__runjs__" && name !== "__binding__"))];
}
function transformationWarnings(options) {
  const warnings = [];
  const bag = isObject(options.transformations) ? options.transformations : void 0;
  const languages = bag ? Object.keys(bag).filter((key) => key === "javascript" || key === "python") : [];
  const hasCode = languages.length > 0 || typeof options.transformation === "string" && options.transformation.trim() !== "";
  if (!hasCode)
    return warnings;
  const enabled = isTruthyStatic(options.enableTransformation);
  const language = typeof options.transformationLanguage === "string" ? options.transformationLanguage : void 0;
  if (!enabled) {
    warnings.push({
      code: "transformation_not_enabled",
      path: "enableTransformation",
      message: "A transformation is supplied but enableTransformation is not true, so ToolJet saves the code and never runs it. Set enableTransformation: true and transformationLanguage to the language the code is written in."
    });
  }
  if (!language) {
    warnings.push({
      code: "transformation_language_missing",
      path: "transformationLanguage",
      message: `A transformation is supplied without transformationLanguage, so ToolJet cannot tell how to run it. Set it to ${languages.length === 1 ? `"${languages[0]}"` : '"javascript" or "python"'}.`
    });
  } else if (languages.length > 0 && !languages.includes(language)) {
    warnings.push({
      code: "transformation_language_mismatch",
      path: "transformationLanguage",
      message: `transformationLanguage is "${language}" but the code is under transformations.${languages.join("/")}. ToolJet runs the entry matching transformationLanguage, so the supplied code is ignored.`
    });
  }
  return warnings;
}
function influxTransformWarnings(kind, options) {
  if (kind !== "influxdb")
    return [];
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (operation !== "query_data")
    return [];
  if (isTruthyStatic(options.enableTransformation))
    return [];
  return [{
    code: "influx_raw_csv_response",
    path: "enableTransformation",
    message: 'InfluxDB query_data returns annotated CSV as a single raw string, not rows. Bound directly, a Table renders nothing. Add a transformation that parses the CSV into an array of row objects (skip the #datatype/#group/#default annotation lines and the empty leading columns), with enableTransformation: true and transformationLanguage: "javascript".'
  }];
}
var TARGET_FIELD = /(^|_)(table|table_name|table_id|collection|collection_name|spreadsheet_id|base_id|bucket|bucket_name|index|index_name|container|url|endpoint|list_id|database_id|page_id|object_type|resource_name)$/i;
function validateQueryOptions(kind, options, executionContext = "app") {
  const errors = [];
  errors.push(...queryToggleIssues(options));
  if (kind === "workflows")
    errors.push(...workflowQueryIssues(options));
  if (kind === "hubspot")
    errors.push(...hubspotQueryIssues(options).map((issue2) => ({ code: "invalid_hubspot_query", ...issue2 })));
  errors.push(...apiEndpointQueryIssues(kind, options).map((issue2) => ({ code: "invalid_api_endpoint_query", ...issue2 })));
  if (kind === "hubspot" && options.operation !== "get" && (isTruthyStatic(options.runOnPageLoad) || isTruthyStatic(options.runOnDependencyChange))) {
    errors.push({ code: "automatic_hubspot_write", message: "HubSpot writes must run from an explicit user action, not on page load or dependency changes." });
  }
  const warnings = tableStateWarnings(options);
  if (kind === "workflows") {
    const normalized = normalizeWorkflowQueryOptions(options);
    if (normalized !== options)
      warnings.push({ code: "legacy_workflow_selector", message: "Legacy workflow selector keys are equivalent to workflowId/workflowVersionId; writes use the native camelCase keys." });
    options = normalized;
  }
  const conditionalWrite = conditionalWriteWarning(kind, options);
  if (conditionalWrite)
    warnings.push({ code: "conditional_write_result", path: "update_rows", message: conditionalWrite });
  if (kind === "mongodb")
    errors.push(...mongoArrayReplacementIssues(options));
  if (executionContext === "app" && kind === "runjs" && typeof options.code === "string" && options.code.trim()) {
    const syntax = runjsSyntaxError(options.code);
    if (syntax) {
      errors.push({
        code: "runjs_syntax_error",
        path: "code",
        message: `the JavaScript does not parse (${syntax}). ToolJet marks the query failed and every component bound to its data stays empty; fix the code before writing it.`
      });
    } else {
      const undeclared = runjsUndeclaredNames(options.code);
      if (undeclared.length) {
        errors.push({
          code: "runjs_undeclared_name",
          path: "code",
          message: `the JavaScript uses ${undeclared.map((n) => `\`${n}\``).join(", ")} but never declares ${undeclared.length > 1 ? "them" : "it"}. The query throws a ReferenceError when that line runs, ToolJet marks it failed, and every component bound to its data stays empty. Declare the value, or use the name you meant.`
        });
      }
    }
  }
  warnings.push(...transformationWarnings(options));
  warnings.push(...influxTransformWarnings(kind, options));
  if (typeof options.query === "string") {
    errors.push(...unquotedSqlBindingIssues(options.query));
    warnings.push(...interpolatedSqlBindingIssues(options.query));
  }
  const readAssessment = assessQueryRead({ kind, options });
  if (readAssessment.selectStar) {
    warnings.push({
      code: "select_star_read",
      path: typeof options.query === "string" ? "query" : void 0,
      message: "SELECT * will be refused by run_query. Inspect the table schema and select only the fields the app needs; this avoids unknown/wide columns and accidental sensitive-data reads."
    });
  }
  if (readAssessment.provenRead && readAssessment.requiresCountPreflight) {
    warnings.push({
      code: "unbounded_read",
      path: typeof options.query === "string" ? "query" : void 0,
      message: `${readAssessment.reason ?? "This read is not statically bounded"} Count the same table before running it. Prefer a bounded preview and server-side pagination for large or growing datasets.`
    });
  }
  const automaticRead = isTruthyStatic(options.runOnPageLoad) || isTruthyStatic(options.runOnDependencyChange);
  if (automaticRead && readAssessment.provenRead && readAssessment.requiresCountPreflight) {
    errors.push({
      code: "unsafe_automatic_unbounded_read",
      path: isTruthyStatic(options.runOnPageLoad) ? "runOnPageLoad" : "runOnDependencyChange",
      message: "An unbounded read cannot run automatically on page load or dependency change. " + (readAssessment.reason ? `${readAssessment.reason} ` : `Add a static row limit at or below ${LARGE_READ_ROW_THRESHOLD}. `) + "Use server-side pagination for more, or run it only after an explicit user decision."
    });
  }
  if (automaticRead && readAssessment.requiresBillableReadConfirmation) {
    errors.push({
      code: "unsafe_automatic_billable_read",
      path: isTruthyStatic(options.runOnPageLoad) ? "runOnPageLoad" : "runOnDependencyChange",
      message: "A potentially billable warehouse read cannot run automatically. Trigger it through an explicit user action, and use run_query user_confirmed_billable_read:true only after the user approves any MCP-side verification run."
    });
  }
  const schema = getDatasourceQuerySchema(kind);
  if (!schema) {
    warnings.push({
      code: "schema_unavailable",
      message: `No generated query contract is available for datasource kind "${kind}"; options were not validated.`
    });
    return { kind, schemaFound: false, errors, warnings };
  }
  const operationHint = describeOperationSelection(schema);
  const operation = operationFromOptions(options, schema.contracts, schema.defaults);
  if (!operation) {
    errors.push({
      code: "missing_operation",
      path: schema.contracts.sql ? "mode" : "operation",
      message: `Datasource "${kind}" needs an operation/mode. ${operationHint}`
    });
    return { kind, schemaFound: true, errors, warnings };
  }
  const contract = schema.contracts[operation];
  if (!contract) {
    errors.push({
      code: "invalid_operation",
      path: typeof options.operation === "string" ? "operation" : "mode",
      message: `Unknown operation/mode "${operation}" for datasource "${kind}". ${operationHint}`
    });
    return { kind, operation, schemaFound: true, errors, warnings };
  }
  const matching = contract.variants.filter((variant) => variantMatches(variant, options));
  if (!matching.length) {
    const selectors = /* @__PURE__ */ new Map();
    for (const variant of contract.variants) {
      for (const [selector, accepted] of Object.entries(variant.when)) {
        const values = selectors.get(selector) ?? /* @__PURE__ */ new Set();
        accepted.forEach((value) => values.add(value));
        selectors.set(selector, values);
      }
    }
    for (const [selector, accepted] of selectors) {
      const actual = options[selector];
      if (typeof actual === "string" && !accepted.has(actual)) {
        errors.push({
          code: "invalid_selector_value",
          path: selector,
          message: `Invalid ${selector} "${actual}" for ${kind}/${operation}. Allowed values: ${[...accepted].sort().join(", ")}.`
        });
      }
    }
    return { kind, operation, schemaFound: true, errors, warnings };
  }
  const dynamicSelectors = [...new Set(contract.variants.flatMap((variant) => Object.keys(variant.when)).filter((selector) => isDynamicBinding(options[selector])))];
  for (const selector of dynamicSelectors) {
    warnings.push({
      code: "runtime_selector_binding",
      path: selector,
      message: `Selector "${selector}" is a dynamic binding, so MCP validated the fields shared by every possible ${kind}/${operation} variant. Browser-verify any fields required only by the runtime-selected value.`
    });
  }
  const fields = fieldMap(matching);
  const allowedTopLevel = topLevelKeys(fields);
  if (singleSpecRef(kind))
    for (const key of ["operation", "path", "params", "selectedOperation"])
      allowedTopLevel.add(key);
  const own = [...allowedTopLevel].filter((k) => !(k in COMMON_QUERY_OPTION_FIELDS));
  for (const key of Object.keys(options)) {
    if (allowedTopLevel.has(key))
      continue;
    const exactReplacement = KNOWN_IGNORED_KEYS[key];
    const nestedReplacement = suffixSuggestion(key, fields);
    const replacement = exactReplacement ?? nestedReplacement;
    const meant = key.length >= 4 ? own.filter((f) => f !== key && options[f] === void 0 && (f.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(f.toLowerCase()))) : [];
    if (!replacement && meant.length === 1) {
      errors.push({
        code: "unknown_option_key",
        path: key,
        message: `Option key "${key}" does not exist for ${kind}/${operation}; the field is "${meant[0]}". ToolJet drops "${key}" and the query runs without it.`
      });
      continue;
    }
    warnings.push({
      code: replacement ? "ignored_or_misplaced_option_key" : "unknown_option_key",
      path: key,
      message: replacement ? `Option key "${key}" is not read at this location for ${kind}/${operation}; use "${replacement}".` : `Unknown option key "${key}" for ${kind}/${operation}; ToolJet plugins may silently drop it.`
    });
  }
  for (const root of allowedTopLevel) {
    const children = nestedChildren(fields, root);
    const actual = options[root];
    if (!children.size || !isObject(actual))
      continue;
    for (const child of Object.keys(actual)) {
      if (!children.has(child)) {
        warnings.push({
          code: "unknown_nested_option_key",
          path: `${root}.${child}`,
          message: `Unknown nested option key "${root}.${child}" for ${kind}/${operation}; ToolJet may silently drop it.`
        });
      }
    }
  }
  if (options.mode !== "sql") {
    const targets = Object.keys(fields).filter((path) => !path.includes(".") && TARGET_FIELD.test(path) && !(path in COMMON_QUERY_OPTION_FIELDS));
    const set = targets.filter((path) => {
      const v = options[path];
      return v !== void 0 && v !== null && v !== "";
    });
    if (targets.length && !set.length) {
      errors.push({ code: "missing_target", path: targets[0], message: `${kind}/${operation} names nothing to act on: set ${targets.join(" or ")}.` });
    }
  }
  const required = intersection(matching.map((variant) => variant.required));
  for (const path of required) {
    const value = valueAtPath(options, path);
    if (value === void 0 || value === null || value === "") {
      errors.push({
        code: "missing_required_option",
        path,
        message: `Missing required option "${path}" for ${kind}/${operation}.`
      });
    }
  }
  for (const [path, field] of Object.entries(fields)) {
    const value = valueAtPath(options, path);
    const arity = tupleArity(field);
    if (arity !== void 0 && value !== void 0 && !isDynamicBinding(value)) {
      if (!Array.isArray(value)) {
        errors.push({
          code: "invalid_option_shape",
          path,
          message: `Option "${path}" for ${kind}/${operation} must be an array of ${arity}-item tuples.`
        });
      } else {
        const invalidIndex = value.findIndex((item) => !Array.isArray(item) || item.length !== arity);
        if (invalidIndex >= 0) {
          errors.push({
            code: "invalid_option_shape",
            path: `${path}[${invalidIndex}]`,
            message: `Option "${path}" for ${kind}/${operation} must contain ${arity}-item tuples such as [["key", "value"]].`
          });
        }
      }
    }
    if (!field.allowedValues?.length)
      continue;
    if (typeof value === "string" && !value.includes("{{") && !field.allowedValues.includes(value)) {
      errors.push({
        code: "invalid_option_value",
        path,
        message: `Invalid value "${value}" for ${kind}/${operation} option "${path}". Allowed values: ${field.allowedValues.join(", ")}.`
      });
    }
  }
  if (kind === "tooljetdb" && (operation === "create_row" || operation === "update_rows")) {
    const columnsPath = operation === "create_row" ? "create_row" : "update_rows.columns";
    const columns = valueAtPath(options, columnsPath);
    const primitiveEntries = primitiveWriteBindingEntries(columns);
    if (primitiveEntries.length)
      errors.push({
        code: "malformed_write_columns",
        path: columnsPath,
        message: `ToolJet DB ${operation} "${columnsPath}" binds a flat object with primitive entry values at ${primitiveEntries.map((k) => JSON.stringify(k)).join(", ")}. ToolJet reads {column, value} records, so these fields are omitted or the write fails. Use a literal column map with bound values, e.g. {"0":{"column":"status","value":"{{components.status.value}}"}}, or make the binding return that same record-map shape. Do not change the intended field values.`
      });
    if (isObject(columns) && Object.keys(columns).length > 0) {
      const flat = Object.entries(columns).filter(([, clause]) => !isObject(clause) || typeof clause.column !== "string" || clause.column === "");
      const nested = Object.entries(columns).find(([, clause]) => isObject(clause) && (isColumnRecordMap(clause) || isColumnRecordMap(clause.value)));
      if (nested) {
        errors.push({
          code: "malformed_write_columns",
          path: `${columnsPath}.${nested[0]}`,
          message: `ToolJet DB ${operation} "${columnsPath}" holds a whole column map inside "${nested[0]}". ToolJet writes each entry as one column, so this inserts a column named "${nested[1].column ?? nested[0]}" and fails with "Could not find the column ... in the schema cache". Put the {column, value} entries directly under "${columnsPath}" (ToolJet DB has no "columns" level; that is the SQL plugins' shape).`
        });
      } else if (flat.length > 0) {
        const example = flat[0][0];
        errors.push({
          code: "malformed_write_columns",
          path: `${columnsPath}.${example}`,
          message: `ToolJet DB ${operation} "${columnsPath}" must map each entry to a {column, value} record, not a flat {"${example}": <value>} pair. ToolJet reads .column off each entry, so as authored this write sends an empty body and fails at runtime with PGRST102 ("Empty or invalid json") even though the app validates. Use {"0": {"column": "${example}", "value": <value>}, \u2026}.`
        });
      }
    }
  }
  if (kind !== "tooljetdb" && operation === "create_row" && isObject(valueAtPath(options, "create_row"))) {
    const createRow = valueAtPath(options, "create_row");
    const columns = createRow.columns;
    const usable = isObject(columns) && Object.values(columns).some((clause) => isObject(clause) && typeof clause.column === "string" && clause.column !== "");
    if (!usable) {
      const misplaced = !isObject(columns) && Object.values(createRow).some((clause) => isObject(clause) && typeof clause.column === "string" && clause.column !== "");
      errors.push({
        code: "malformed_write_columns",
        path: "create_row.columns",
        message: misplaced ? `${kind} create_row expects the column map under "create_row.columns", not directly on "create_row" (that is the ToolJet DB shape). As authored no column is read, and the driver falls back to INSERT ... DEFAULT VALUES \u2014 inserting a BLANK ROW that reports success.` : `${kind} create_row requires "create_row.columns" as {"0": {"column": "<name>", "value": <v>}, \u2026}. With no usable column entry the driver emits INSERT ... DEFAULT VALUES, inserting a BLANK ROW and reporting success.`
      });
    }
  }
  if (kind === "tooljetdb" && operation === "delete_rows") {
    const limit = valueAtPath(options, "delete_rows.limit");
    const hasOrder = ["order_column", "order_column_id"].some((key) => {
      const value = valueAtPath(options, `delete_rows.${key}`);
      return typeof value === "string" && value.trim() !== "";
    });
    if ((limit === void 0 || Boolean(limit)) && !hasOrder) {
      errors.push({
        code: "missing_delete_order",
        path: "delete_rows.order_column",
        message: "ToolJet DB delete_rows defaults to limit 1 and bounded deletes require an explicit order. Set delete_rows.order_column or order_column_id to the actual primary key from get_table_schema. Preserve the intended filters and limit; do not assume the primary key is named id."
      });
    }
  }
  if (kind === "tooljetdb" && (operation === "update_rows" || operation === "delete_rows")) {
    const filtersPath = `${operation}.where_filters`;
    const filters = valueAtPath(options, filtersPath);
    if (isObject(filters) || Array.isArray(filters)) {
      const usable = Object.entries(filters).filter(([, clause]) => isObject(clause) && typeof clause.column === "string" && clause.column !== "" && typeof clause.operator === "string" && clause.operator !== "");
      if (usable.length === 0) {
        const example = Object.keys(filters)[0];
        errors.push({
          code: "malformed_where_filters",
          path: filtersPath,
          message: `ToolJet DB ${operation} "${filtersPath}" has no usable clause: every entry must be a {column, operator, value} record (for example {"0": {"column": "id", "operator": "eq", "value": "{{components.table1.selectedRow.id}}"}}). ToolJet silently drops any clause missing column or operator` + (operation === "update_rows" ? ", and an update with no surviving clause updates EVERY ROW in the table." : ".") + (example ? ` Entry "${example}" is not in that shape.` : "")
        });
      }
    } else if (filters === void 0 && operation === "update_rows") {
      errors.push({
        code: "malformed_where_filters",
        path: filtersPath,
        message: `ToolJet DB update_rows requires "${filtersPath}"; without it the write is unfiltered and updates EVERY ROW in the table. Add {"0": {"column", "operator", "value"}}.`
      });
    }
  }
  if (kind === "tooljetdb" && ["list_rows", "update_rows", "delete_rows"].includes(operation)) {
    const filters = valueAtPath(options, `${operation}.where_filters`);
    if (isObject(filters) || Array.isArray(filters)) {
      for (const [mapKey, rawClause] of Object.entries(filters)) {
        const aliases = {
          equals: "eq",
          equal: "eq",
          "==": "eq",
          "===": "eq",
          "=": "eq",
          not_equals: "neq",
          notEquals: "neq",
          "!=": "neq",
          "!==": "neq",
          "<>": "neq",
          greater_than: "gt",
          greaterThan: "gt",
          ">": "gt",
          greater_than_or_equal: "gte",
          ">=": "gte",
          less_than: "lt",
          lessThan: "lt",
          "<": "lt",
          less_than_or_equal: "lte",
          "<=": "lte"
        };
        if (isObject(rawClause) && typeof rawClause.operator === "string" && Object.hasOwn(aliases, rawClause.operator)) {
          errors.push({
            code: "invalid_tooljetdb_filter_operator",
            path: `${operation}.where_filters.${mapKey}.operator`,
            message: `ToolJet DB filter operator "${rawClause.operator}" is not a PostgREST builder operator. Use "${aliases[rawClause.operator]}" for this comparison; keep the same column and value. The query was not automatically rewritten. Fetch the datasource operation contract if unsure.`
          });
        }
        if (!isObject(rawClause) || rawClause.operator !== "eq")
          continue;
        const column = typeof rawClause.column === "string" ? rawClause.column : "";
        const value = typeof rawClause.value === "string" ? rawClause.value : "";
        const dateLikeColumn = /(^|_)(date|day|time|at|on)$|_date_|timestamp/i.test(column);
        const dayValue = /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) || /format\(\s*['"]YYYY-MM-DD['"]\s*\)/.test(value);
        if (!dayValue && !dateLikeColumn)
          continue;
        if (!dayValue && !/moment\(|new Date|Date\.now/.test(value))
          continue;
        warnings.push({
          code: "date_equality_filter",
          path: `${operation}.where_filters.${mapKey}`,
          message: `ToolJet DB ${operation} filter "${column}" uses "eq" against a calendar day. Date and timestamp columns come back as full ISO timestamps ("2026-09-04T00:00:00+00:00"), so equality with "YYYY-MM-DD" matches no rows and the table shows "No data" with no error. Filter a day as a range instead: one clause "gte" the day at 00:00 and one "lt" the next day, or store the day in a text column seeded as YYYY-MM-DD when this build creates the table.`
        });
      }
    }
  }
  if (kind === "tooljetdb" && operation === "list_rows") {
    const orderFilters = valueAtPath(options, "list_rows.order_filters");
    if (isObject(orderFilters)) {
      for (const [mapKey, rawClause] of Object.entries(orderFilters)) {
        if (!isObject(rawClause) || typeof rawClause.id !== "string" || rawClause.id === mapKey)
          continue;
        warnings.push({
          code: "mismatched_record_id",
          path: `list_rows.order_filters.${mapKey}.id`,
          message: `ToolJet DB order_filters key "${mapKey}" does not match its inner id "${rawClause.id}"; ToolJet can silently ignore the sort. Use the same stable value for the outer key and inner id.`
        });
      }
    }
  }
  return { kind, operation, schemaFound: true, errors, warnings };
}
function issueMessages(issues, prefix) {
  return issues.map((issue2) => `${prefix ? `${prefix}: ` : ""}${issue2.message}`);
}
function isColumnRecordMap(value) {
  return isObject(value) && Object.keys(value).length > 0 && Object.values(value).every((clause) => isObject(clause) && typeof clause.column === "string" && clause.column !== "");
}
function normalizeWriteColumnMap(columns) {
  if (!isObject(columns) || Object.keys(columns).length === 0)
    return null;
  const entries = Object.entries(columns);
  if (entries.every(([, clause]) => isObject(clause) && typeof clause.column === "string" && clause.column !== "")) {
    return null;
  }
  if (entries.some(([, clause]) => isColumnRecordMap(clause)))
    return null;
  const normalized = {};
  entries.forEach(([key, clause], index) => {
    if (isObject(clause) && typeof clause.column === "string" && clause.column !== "") {
      normalized[String(index)] = clause;
      return;
    }
    normalized[String(index)] = { column: key, value: clause };
  });
  return normalized;
}
function normalizeQueryOptions(kind, rawOptions) {
  const options = normalizeQueryToggles(rawOptions);
  if (kind === "workflows")
    return normalizeWorkflowQueryOptions(options);
  if (kind === "mongodb" && isObject(options)) {
    let result = options;
    for (const field of ["filter", "options", "pipeline", "document", "documents", "update", "replacement", "operations"]) {
      const value = options[field];
      if (value !== null && typeof value === "object") {
        if (result === options)
          result = { ...options };
        result[field] = JSON.stringify(value);
      }
    }
    return result;
  }
  if (kind !== "tooljetdb" || !isObject(options))
    return options;
  const operation = typeof options.operation === "string" ? options.operation : "";
  if (operation === "create_row") {
    const createRow = options.create_row;
    const only = isObject(createRow) && Object.keys(createRow).length === 1 ? Object.values(createRow)[0] : void 0;
    const unwrapped = isColumnRecordMap(createRow?.columns) ? createRow.columns : isObject(only) && only.column === "columns" && isColumnRecordMap(only.value) ? only.value : createRow;
    const normalized = normalizeWriteColumnMap(unwrapped);
    if (normalized)
      return { ...options, create_row: normalized };
    return unwrapped === createRow ? options : { ...options, create_row: unwrapped };
  }
  if (operation === "update_rows") {
    const updateRows = options.update_rows;
    if (!isObject(updateRows))
      return options;
    const normalized = normalizeWriteColumnMap(updateRows.columns);
    return normalized ? { ...options, update_rows: { ...updateRows, columns: normalized } } : options;
  }
  return options;
}
export {
  assertPersistableQueryToggles as a,
  bindingSpans as b,
  normalizeWorkflowQueryOptions as c,
  assertWorkflowQueryOptions as d,
  normalizeQueryToggles as e,
  arithmeticWriteWarning as f,
  issueMessages as i,
  lintBindingNames as l,
  normalizeQueryOptions as n,
  queryToggleIssues as q,
  toggleRewriteWarning as t,
  validateQueryOptions as v,
  workflowMappingMatches as w
};
