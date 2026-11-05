import { createRequire } from "node:module";
import { T as TOOLJET_DB_DATA_TYPES, n as normalizeType, f as fail, i as invalidSeedTimestamps, l as literalCanvasColor, o as ok, C as COMPONENT_FX_GUIDANCE, c as componentRef, b as completedPartialWrites, r as resolveRef, v as validateTableBatch, d as normalizeComponentSpec, g as indexComponentReferences } from "./chunk-Cm6A-Ye7.js";
import { p as external_exports, v as tableQuotaError, q as getComponentSchema } from "./chunk-C9d6UC58.js";
import { b as componentNameSchema, c as componentSlotSchema, p as pageIconSchema, v as validateAppStructure, s as suggestedHtmlHeight, q as pageIconError, r as lintComponents, e as encodeComponentParent, t as lintComponentStateBindings, d as decodeComponentParent, u as minimumTextHeight, w as namespaceReads } from "./chunk-Dp2c_mDp.js";
import { g as arithmeticWriteWarning, L as LARGE_READ_ROW_THRESHOLD, f as assessQueryRead, r as resolveStaticBindings, h as resolvedReadRefusal, s as sameReadSource, j as extractRowCount, k as emptyViewerOnlyParams, m as emptyParamsNote, u as unresolvedNote, v as validateQueryOptions, i as issueMessages, o as normalizeQueryToggles, t as toggleRewriteWarning, q as queryToggleIssues, e as normalizeQueryOptions, b as bindingSpans, p as parseExpression } from "./chunk-DFfOcLmL.js";
import { g as getDatasourceQuerySchema } from "./chunk-7Kp3wqfy.js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
createRequire(import.meta.url);
function prepareQueryOptionsForWrite(kind, raw, subject) {
  const prefix = subject ? `${subject}: ` : "";
  const line = (text) => subject ? `${prefix}${text}` : text.charAt(0).toUpperCase() + text.slice(1);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { options: raw, errors: [line("options must be an object.")], warnings: [] };
  }
  const toggled = normalizeQueryToggles(raw);
  const warnings = [];
  const rewrite = toggleRewriteWarning(raw, toggled);
  if (rewrite)
    warnings.push(`${prefix}${rewrite}`);
  if (!kind) {
    return { options: toggled, errors: issueMessages(queryToggleIssues(toggled), subject), warnings };
  }
  const options = normalizeQueryOptions(kind, toggled);
  if (options !== toggled) {
    warnings.push(line(kind === "workflows" ? "normalized legacy workflow selectors to workflowId/workflowVersionId." : kind === "mongodb" ? "serialized MongoDB document fields to the JSON text expected by the plugin." : `rewrote the ${String(options.operation)} column map to ToolJet's {index: {column, value}} shape; the flat {column: value} form sends an empty body and fails at runtime.`));
  }
  const validation = validateQueryOptions(kind, options);
  warnings.push(...issueMessages(validation.warnings, subject));
  return { options, errors: issueMessages(validation.errors, subject), warnings, validation };
}
function frozenAppRefusal(summary) {
  if (!summary?.editor_frozen)
    return void 0;
  const where = summary.environment ? ` is in the ${summary.environment} environment and` : "";
  return `Not executed: this app's version${where} is read-only in ToolJet (the editor is frozen, and ToolJet refuses changes to a promoted version). Nothing was changed. Tell the user to create a new version in development (version menu, Create version) and ask again; do not create tables or try other tools.`;
}
var PLAN_TTL_MS = 30 * 60 * 1e3;
var MAX_PLANS = 20;
var plans = /* @__PURE__ */ new Map();
function prune(now = Date.now()) {
  for (const [token, plan] of plans)
    if (plan.expiresAt <= now)
      plans.delete(token);
  while (plans.size >= MAX_PLANS)
    plans.delete(plans.keys().next().value);
}
function storeAppPlan(spec, lint, replaceFingerprint2) {
  prune();
  const planToken = randomUUID();
  plans.set(planToken, {
    spec: structuredClone(spec),
    lint: structuredClone(lint),
    expiresAt: Date.now() + PLAN_TTL_MS,
    ...replaceFingerprint2 ? { replaceFingerprint: replaceFingerprint2 } : {}
  });
  return { plan_token: planToken, expires_in_seconds: PLAN_TTL_MS / 1e3 };
}
function peekAppPlan(planToken) {
  prune();
  return plans.get(planToken);
}
function consumeAppPlan(planToken) {
  prune();
  const plan = plans.get(planToken);
  if (!plan)
    throw new Error("Unknown or expired plan_token. Run lint_app_spec again.");
  plans.delete(planToken);
  return plan;
}
var dbColumnTypeSchema = external_exports.string().describe("ToolJet DB types: string, integer, bigint, serial, number (double precision), boolean, timestamp, jsonb. Existing aliases text/varchar/int/float/decimal/double/bool/datetime/date/json and canonical API type names are accepted. numeric is unsupported; number/decimal are floating-point, not exact decimal. For money consider integer minor units.").refine((value) => TOOLJET_DB_DATA_TYPES.has(normalizeType(value)), {
  message: "Unsupported ToolJet DB type. Use string, integer, bigint, serial, number (double precision), boolean, timestamp or jsonb. numeric is not supported. For money choose on purpose: integer cents where sums must be exact, or number shown with a currency format for prices; never swap one in silently."
});
var AUTO_MATERIALIZE_DEFAULTS = /* @__PURE__ */ new Set(["Kanban"]);
var TOOLJET_DESKTOP_GRID_COLUMNS = 43;
function wrappedValues(keys, defaults) {
  if (!keys?.length)
    return void 0;
  return Object.fromEntries(keys.map((key2) => [key2, { value: defaults[key2] ?? "" }]));
}
function childLayout(child, parentType, index) {
  const schema = getComponentSchema(child.componentName);
  if (parentType === "Kanban" && child.componentName === "Text") {
    return { top: index === 0 ? 12 : 44, left: 2, width: 39, height: child.layout?.height ?? 30 };
  }
  return {
    top: child.layout?.top ?? 0,
    left: child.layout?.left ?? 0,
    width: child.layout?.width ?? (schema?.defaultSize?.width ?? 1) * 100 / TOOLJET_DESKTOP_GRID_COLUMNS,
    height: child.layout?.height ?? schema?.defaultSize?.height ?? 40
  };
}
function childName(parentName, child, index) {
  const cardField = Object.values(child.defaultValue ?? {}).find((value) => typeof value === "string")?.match(/cardData\.([A-Za-z0-9_]+)/)?.[1];
  const baseRole = cardField ?? child.accessorKey ?? child.componentName;
  const role = baseRole.charAt(0).toUpperCase() + baseRole.slice(1) + (cardField ? "" : index + 1);
  return `${parentName}Card${role}`;
}
function materializeRequiredDefaultChildren(input) {
  const explicitParentRefs = new Set(input.flatMap((component) => component.parentRef && (!component.slotName || component.slotName === "body") ? [component.parentRef] : []));
  const components = [];
  const warnings = [];
  let materializedChildren = 0;
  input.forEach((original) => {
    if (!AUTO_MATERIALIZE_DEFAULTS.has(original.type)) {
      components.push(original);
      return;
    }
    const schema = getComponentSchema(original.type);
    const defaults = schema?.defaultChildren ?? [];
    if (!defaults.length || explicitParentRefs.has(componentRef(original))) {
      components.push(original);
      return;
    }
    const clientRef = componentRef(original);
    components.push(original);
    defaults.forEach((child, childIndex) => {
      const defaultValue = child.defaultValue ?? {};
      components.push({
        name: childName(original.name, child, childIndex),
        type: child.componentName,
        properties: wrappedValues(child.properties, defaultValue) ?? {},
        styles: wrappedValues(child.styles, defaultValue),
        layout: childLayout(child, original.type, childIndex),
        parentRef: clientRef
      });
    });
    materializedChildren += defaults.length;
    warnings.push(`Kanban "${original.name}" had no explicit card children; materialized ${defaults.length} catalog default children so cards render content. For wrapped multi-line card text, use add_components with a Kanban client_ref and an explicit Html child using the matching parent_ref.`);
  });
  return { components, warnings, materializedChildren };
}
function normalizePlannedLayouts(component) {
  const warnings = [];
  const label = `${component.type ?? "component"} "${component.name ?? "?"}"`;
  const targets = [];
  if (component.layout)
    targets.push(["layout", component.layout]);
  if (component.layouts?.desktop)
    targets.push(["desktop", component.layouts.desktop]);
  if (component.layouts?.mobile)
    targets.push(["mobile", component.layouts.mobile]);
  if (!targets.length)
    return { component, warnings };
  const textMinimum = component.type === "Text" ? minimumTextHeight(component) : void 0;
  const schema = component.type ? getComponentSchema(component.type) : void 0;
  const compactHeight = schema?.renderingHints?.compactFormHeight ? schema?.defaultSize?.height : void 0;
  const fixed = /* @__PURE__ */ new Map();
  for (const [name, rect] of targets) {
    if (typeof rect.height !== "number")
      continue;
    if (textMinimum !== void 0 && rect.height < textMinimum) {
      fixed.set(name, { ...rect, height: textMinimum });
      warnings.push(`${label}: raised ${name} height ${rect.height}px to ${textMinimum}px so one line of text renders.`);
    } else if (compactHeight !== void 0 && rect.height > compactHeight) {
      fixed.set(name, { ...rect, height: compactHeight });
      warnings.push(`${label}: lowered ${name} height ${rect.height}px to the standard single-line ${compactHeight}px (oversizing does not enlarge the value text; a top label renders outside the box).`);
    }
  }
  if (!fixed.size)
    return { component, warnings };
  const next = { ...component };
  if (fixed.has("layout"))
    next.layout = fixed.get("layout");
  if (fixed.has("desktop") || fixed.has("mobile")) {
    next.layouts = {
      ...component.layouts,
      ...fixed.has("desktop") ? { desktop: fixed.get("desktop") } : {},
      ...fixed.has("mobile") ? { mobile: fixed.get("mobile") } : {}
    };
  }
  return { component: next, warnings };
}
var layoutSchema = external_exports.object({
  top: external_exports.number(),
  left: external_exports.number().describe("Columns in the immediate parent canvas, which has its own 43-column grid."),
  width: external_exports.number().describe("Columns out of 43 in the immediate parent canvas, independent of the parent outer width. Full width is 43. Container/Form/modal inset full rows use left 2, width 39; grid-mode Listview full rows use left 0, width 43."),
  height: external_exports.number()
});
var componentInputSchema = external_exports.object({
  name: componentNameSchema,
  type: external_exports.string(),
  properties: external_exports.record(external_exports.string(), external_exports.any()),
  styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  validation: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  others: external_exports.record(external_exports.string(), external_exports.any()).optional(),
  layout: layoutSchema.optional(),
  layouts: external_exports.object({ desktop: layoutSchema.optional(), mobile: layoutSchema.optional() }).optional(),
  client_ref: external_exports.string().optional(),
  parent_ref: external_exports.string().optional(),
  parent: external_exports.string().optional(),
  slot_name: componentSlotSchema.optional()
});
function containsListItemBinding(value) {
  if (typeof value === "string")
    return /\blistItem\b/.test(value);
  if (Array.isArray(value))
    return value.some(containsListItemBinding);
  if (value && typeof value === "object") {
    return Object.values(value).some(containsListItemBinding);
  }
  return false;
}
function prepareComponentBatch(inputs, options = {}) {
  const requested = inputs.map(({ client_ref, parent_ref, slot_name, ...component }) => ({
    ...component,
    clientRef: client_ref,
    parentRef: parent_ref,
    slotName: slot_name
  }));
  const normalized = requested.map((component) => {
    const definition = normalizeComponentSpec(component, { stripUnknownKeys: true });
    const geometry = normalizePlannedLayouts(definition.component);
    return { ...definition, component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
  });
  const heightFixes = [];
  for (const result of normalized) {
    const component = result.component;
    const fix = suggestedHtmlHeight(component);
    if (!fix)
      continue;
    for (const rect of [component.layout, component.layouts?.desktop])
      if (rect && typeof rect.height === "number")
        rect.height = fix.to;
    heightFixes.push(`Html "${component.name ?? "?"}" needed about ${fix.needed}px for its markup but was ${fix.from}px; saved at ${fix.to}px. Anything placed within ${fix.to - fix.from}px below it now overlaps; move it down.`);
  }
  const expanded = materializeRequiredDefaultChildren(normalized.map((result) => result.component));
  const references = indexComponentReferences(expanded.components, options.existingComponents);
  const lint = lintComponents(references.components, options);
  const lateListviewChildWarnings = requested.flatMap((component) => component.parent && containsListItemBinding({
    properties: component.properties,
    styles: component.styles,
    validation: component.validation,
    others: component.others
  }) ? [
    `Component "${component.name}" is being added under an existing parent and reads listItem. ToolJet can mount late-added Listview children with empty repeated values. Create the Listview and all listItem-bound children atomically in one component batch using client_ref/parent_ref.`
  ] : []);
  return {
    components: references.components,
    errors: [...references.errors, ...lint.errors],
    warnings: [
      ...normalized.flatMap((item) => item.warnings),
      ...expanded.warnings,
      ...lint.warnings,
      ...heightFixes,
      ...lateListviewChildWarnings
    ]
  };
}
var foreignKeyAction = external_exports.enum(["RESTRICT", "NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT"]);
var foreignKeySchema = external_exports.object({
  columns: external_exports.array(external_exports.string()).min(1),
  referencedTable: external_exports.string(),
  referencedColumns: external_exports.array(external_exports.string()).min(1),
  onDelete: foreignKeyAction.optional(),
  onUpdate: foreignKeyAction.optional()
});
var columnSchema = external_exports.object({
  name: external_exports.string(),
  type: dbColumnTypeSchema,
  primaryKey: external_exports.boolean().optional(),
  notNull: external_exports.boolean().optional(),
  unique: external_exports.boolean().optional(),
  defaultValue: external_exports.any().optional(),
  configurations: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
var plannedTableSchema = external_exports.object({
  table_name: external_exports.string(),
  columns: external_exports.array(columnSchema).min(1),
  foreign_keys: external_exports.array(foreignKeySchema).optional()
});
var plannedSeedSchema = external_exports.object({
  table_name: external_exports.string(),
  rows: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).min(1).max(40)
});
var plannedQuerySchema = external_exports.object({
  client_ref: external_exports.string().optional(),
  datasource_id: external_exports.string().optional().describe("Exact id returned by list_datasources(version_id). Provide this OR datasource_name, not both."),
  datasource_name: external_exports.string().optional().describe("Exact, case-sensitive unique name returned by list_datasources(version_id). Alternative to datasource_id; resolved and pinned to that id at lint time."),
  name: external_exports.string(),
  kind: external_exports.string().optional(),
  /** Resolve this planned/existing ToolJet DB table name into options.table_id during lint/apply. */
  table_ref: external_exports.string().optional().describe("Actual table_name of a planned or existing ToolJet DB table, not a client_ref, alias, or UUID."),
  options: external_exports.record(external_exports.string(), external_exports.any()),
  /** The app's query of this name is updated in place with this definition: see pageReplace.ts. */
  update: external_exports.boolean().optional().describe("true: when the app already has a query of this name, it is updated in place with this definition, keeping its id and the events that run it, for every page that reads it (needs app_id). Without it, defining an existing name again is refused unless the definition is identical (then the existing query is used) or a replaced page owns it.")
});
var plannedPageSchema = external_exports.object({
  client_ref: external_exports.string().optional(),
  name: external_exports.string(),
  icon: pageIconSchema,
  hidden: external_exports.boolean().optional(),
  /** The existing page of this name is replaced whole: see pageReplace.ts. */
  replace: external_exports.boolean().optional().describe("true: the existing page of this name ends up holding exactly this plan's components and the events on them (needs app_id). It is written as a difference: a component the plan leaves as it is is not rewritten, one that only moved is moved, and one that changed keeps its id. Queries of that page the plan defines again are updated in place, keeping their ids. Refused when another page, event or query reads a component the plan drops. Not atomic: use it on draft or otherwise recoverable pages."),
  components: external_exports.array(componentInputSchema).optional()
});
var plannedEventSchema = external_exports.object({
  source_ref: external_exports.string(),
  source_type: external_exports.enum(["component", "data_query", "page", "table_column", "table_action"]),
  ref: external_exports.string().optional(),
  trigger: external_exports.string(),
  action: external_exports.record(external_exports.string(), external_exports.any()),
  name: external_exports.string().optional()
});
var alertSchema = external_exports.object({
  message: external_exports.string().min(1),
  alert_type: external_exports.enum(["success", "info", "warning", "error"]).optional()
});
var plannedLifecycleSchema = external_exports.object({
  query_ref: external_exports.string(),
  before_refresh_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional(),
  refresh_query_refs: external_exports.array(external_exports.string()).optional(),
  clear_component_refs: external_exports.array(external_exports.string()).optional(),
  close_modal_ref: external_exports.string().optional(),
  success_alert: alertSchema.optional(),
  failure_alert: alertSchema.optional(),
  success_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional(),
  failure_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional()
});
var appPlanSchema = external_exports.object({
  /** Existing app context for repair phases. Lets lint/apply resolve persisted refs safely. */
  app_id: external_exports.string().optional(),
  version_id: external_exports.string().optional(),
  /** Rename the target app as part of the same governed phase. */
  app_name: external_exports.string().trim().min(1).max(100).optional(),
  tables: external_exports.array(plannedTableSchema).max(50).optional(),
  seed_data: external_exports.array(plannedSeedSchema).max(50).optional(),
  queries: external_exports.array(plannedQuerySchema).max(200).optional(),
  pages: external_exports.array(plannedPageSchema).max(50).optional(),
  events: external_exports.array(plannedEventSchema).max(1e3).optional(),
  lifecycles: external_exports.array(plannedLifecycleSchema).max(200).optional()
});
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
    const key2 = col.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${key2}\\s*:[^,;{}]*?['"\`]\\s*<[a-zA-Z]`).test(code))
      return true;
    const idents = [...code.matchAll(new RegExp(`\\b${key2}\\s*:\\s*([A-Za-z_$][\\w$]*)\\s*[,}]`, "g"))].map((m) => m[1]);
    return idents.some((id) => new RegExp(`\\b${id}\\s*=(?!=)[^;]*?['"\`]\\s*<[a-zA-Z]`).test(code));
  });
}
var member = (n) => n && ["MemberExpression", "OptionalMemberExpression"].includes(n.type);
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var unwrap = (v) => v && typeof v === "object" && "value" in v ? v.value : v;
function inputRefs(value) {
  const refs2 = /* @__PURE__ */ new Set();
  const scan = (v) => {
    if (Array.isArray(v)) {
      v.forEach(scan);
      return;
    }
    if (v && typeof v === "object") {
      Object.values(v).forEach(scan);
      return;
    }
    if (typeof v !== "string")
      return;
    const binding = v.trim().match(/^\{\{([\s\S]*)\}\}$/);
    if (!binding)
      return;
    let root;
    try {
      root = parseExpression(binding[1]);
    } catch {
      return;
    }
    const found = /* @__PURE__ */ new Set();
    let uncertain = false;
    const visit = (n) => {
      if (!n || typeof n !== "object")
        return;
      if (Array.isArray(n)) {
        n.forEach(visit);
        return;
      }
      if (n.params || n.type === "VariableDeclarator" || n.type === "WithStatement")
        uncertain = true;
      if (member(n) && ["value", "selectedDate", "isValid"].includes(key(n)) && member(n.object)) {
        const owner = n.object;
        if (owner.object?.type === "Identifier" && owner.object.name === "components" && key(owner))
          found.add(key(owner));
      }
      Object.values(n).forEach(visit);
    };
    visit(root);
    if (!uncertain)
      found.forEach((name) => refs2.add(name));
  };
  scan(value);
  return refs2;
}
function truthyOnlyRequiredText(value, disabled) {
  const raw = unwrap(value);
  if (typeof raw !== "string")
    return /* @__PURE__ */ new Set();
  const binding = raw.trim().match(/^\{\{([\s\S]*)\}\}$/);
  if (!binding)
    return /* @__PURE__ */ new Set();
  let root;
  try {
    root = parseExpression(binding[1]);
  } catch {
    return /* @__PURE__ */ new Set();
  }
  const refs2 = /* @__PURE__ */ new Set();
  const rooted = (n, name) => member(n) && n.object?.type === "Identifier" && n.object.name === name && key(n);
  const visit = (n) => {
    if (n.type === "LogicalExpression" && n.operator === (disabled ? "||" : "&&"))
      return visit(n.left) && visit(n.right);
    if (disabled && n.type === "UnaryExpression" && n.operator === "!") {
      const v2 = n.argument;
      if (member(v2) && key(v2) === "value" && rooted(v2.object, "components")) {
        refs2.add(key(v2.object));
        return true;
      }
    }
    if (!disabled && member(n) && key(n) === "value" && rooted(n.object, "components")) {
      refs2.add(key(n.object));
      return true;
    }
    const v = n.type === "UnaryExpression" && n.operator === "!" ? n.argument : n;
    return Boolean(member(v) && key(v) === "isLoading" && rooted(v.object, "queries"));
  };
  return visit(root) ? refs2 : /* @__PURE__ */ new Set();
}
function requiredMutationGuardWarnings(source, query, action, components) {
  const inputs = inputRefs(query.options);
  const guarded = inputRefs([source.properties?.disabledState, action.runOnlyIf]);
  const missing = components.filter((c) => c.name && inputs.has(c.name) && !guarded.has(c.name) && ["TextInput", "TextArea", "NumberInput", "CurrencyInput", "DatePickerV2"].includes(c.type ?? "") && [true, "true", "{{true}}"].includes(unwrap(c.validation?.mandatory)));
  const warnings = missing.length ? [`Button "${source.name ?? source.id}" directly runs mutation "${query.name ?? query.id}" using required inputs ${missing.map((c) => `"${c.name}"`).join(", ")}, but no field validation is visible in disabledState or runOnlyIf. A required marker alone does not stop this query. Validate before writing (including whitespace-only text), or route through a validating Form/RunJS success chain. Preserve zero and false; keep database constraints authoritative. This advisory does not prove arbitrary guards or server validation.`] : [];
  const disabledRefs = inputRefs(source.properties?.disabledState), actionRefs = inputRefs(action.runOnlyIf);
  const disabledTruthy = truthyOnlyRequiredText(source.properties?.disabledState, true);
  const actionTruthy = truthyOnlyRequiredText(action.runOnlyIf, false);
  const weak = components.filter((c) => c.name && inputs.has(c.name) && ["TextInput", "TextArea"].includes(c.type ?? "") && (disabledTruthy.has(c.name) || actionTruthy.has(c.name)) && (!disabledRefs.has(c.name) || disabledTruthy.has(c.name)) && (!actionRefs.has(c.name) || actionTruthy.has(c.name)));
  if (weak.length)
    warnings.push(`Button "${source.name ?? source.id}" checks text ${weak.map((c) => `"${c.name}"`).join(", ")} using only truthiness. Whitespace-only text can pass this guard. If blank text is invalid, trim before checking length (and validate before writing); do not apply truthiness validation to numbers or booleans.`);
  return warnings;
}
function unconditional(action) {
  if (action.disabled)
    return false;
  const guard = action.runOnlyIf;
  return !guard || guard === true || typeof guard === "string" && /^(?:true|\{\{\s*true\s*\}\})$/.test(guard.trim());
}
function queryEventCycleErrors(summary, additions, persisted) {
  const names = new Map(summary.queries.map((q) => [q.id, q.name ?? q.id]));
  const resolve2 = (value) => {
    if (typeof value !== "string")
      return void 0;
    if (names.has(value))
      return value;
    const matches = summary.queries.filter((q) => q.name === value);
    return matches.length === 1 ? matches[0].id : void 0;
  };
  const edge = (event) => {
    if (event.sourceType !== "data_query" || !names.has(event.sourceId) || event.action.actionId !== "run-query" || !unconditional(event.action))
      return void 0;
    const target = resolve2(event.action.queryId);
    return target ? [event.sourceId, target] : void 0;
  };
  const graph = /* @__PURE__ */ new Map();
  for (const event of [...persisted, ...additions]) {
    if (event.trigger !== "onDataQuerySuccess")
      continue;
    const pair = edge(event);
    if (!pair)
      continue;
    const targets = graph.get(pair[0]) ?? /* @__PURE__ */ new Set();
    targets.add(pair[1]);
    graph.set(pair[0], targets);
  }
  const reaches = (start, end) => {
    const queue = [start], visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const current = queue.pop();
      if (current === end)
        return true;
      if (visited.has(current))
        continue;
      visited.add(current);
      for (const next of graph.get(current) ?? [])
        queue.push(next);
    }
    return false;
  };
  const errors = [];
  for (const event of additions) {
    const pair = edge(event);
    if (!pair)
      continue;
    const [source, target] = pair;
    const successCycle = event.trigger === "onDataQuerySuccess" && reaches(target, source);
    const failureSelfRetry = event.trigger === "onDataQueryFailure" && source === target;
    if (successCycle || failureSelfRetry)
      errors.push(`Query "${names.get(source)}" -> "${names.get(target)}" creates an unconditional query ${failureSelfRetry ? "failure retry" : "success cycle"}. This can repeat queries and writes after one click. Refresh a separate read query with no return edge, or use an explicit bounded retry/termination guard.`);
  }
  return [...new Set(errors)];
}
var ACTION_IDS = /* @__PURE__ */ new Set([
  "run-query",
  "switch-page",
  "show-alert",
  "show-modal",
  "close-modal",
  "set-custom-variable",
  "unset-custom-variable",
  "set-page-variable",
  "set-table-page",
  "copy-to-clipboard",
  "generate-file",
  "open-webpage",
  "go-to-app",
  "logout",
  "control-component",
  "set-localstorage-value",
  "scroll-component-into-view"
]);
function propVal(properties, key2) {
  const value = properties?.[key2];
  return value && typeof value === "object" && "value" in value ? value.value : value;
}
function isFalseBinding(value) {
  return value === false || value === "false" || value === "{{false}}";
}
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function navigationItemRef(source, ref) {
  let unknown = false;
  let found = false;
  let group = false;
  const visit = (items) => {
    if (typeof items === "string" && items.includes("{{")) {
      unknown = true;
      return;
    }
    if (!Array.isArray(items)) {
      if (items == null)
        unknown = true;
      return;
    }
    for (const item of items) {
      if (!isRecord(item))
        continue;
      if (item.id === ref) {
        if (item.isGroup)
          group = true;
        else
          found = true;
      }
      if (typeof item.id === "string" && item.id.includes("{{"))
        unknown = true;
      if (item.isGroup)
        visit(item.children ?? []);
    }
  };
  visit(propVal(source.properties, "menuItems"));
  return group ? "invalid" : found ? "valid" : unknown ? "unknown" : "invalid";
}
function effectiveRef(event) {
  return Object.prototype.hasOwnProperty.call(event.action, "ref") ? event.action.ref : event.ref;
}
function validateTableColumnRef(source, ref) {
  if (!ref)
    return 'Table Button-column events require ref "<column key or name>::<button id>".';
  const separator = ref.lastIndexOf("::");
  if (separator <= 0 || separator === ref.length - 2)
    return `Table Button-column ref "${ref}" is malformed.`;
  const columnRef = ref.slice(0, separator);
  const buttonId = ref.slice(separator + 2);
  const columns = propVal(source.properties, "columns");
  if (!Array.isArray(columns))
    return `Table "${source.name ?? source.id}" has no explicit columns array for ref "${ref}".`;
  const column = columns.find((candidate) => {
    const item = candidate;
    return item?.key === columnRef || item?.name === columnRef;
  });
  if (!column || column.columnType !== "button") {
    return `Table "${source.name ?? source.id}" has no Button column keyed/named "${columnRef}".`;
  }
  if (!Array.isArray(column.buttons) || !column.buttons.some((button) => button?.id === buttonId)) {
    return `Table Button column "${columnRef}" has no button id "${buttonId}".`;
  }
  return void 0;
}
var MUTATION_OPERATIONS = /* @__PURE__ */ new Set([
  "create_row",
  "update_row",
  "update_rows",
  "upsert_rows",
  "delete_row",
  "delete_rows",
  "bulk_insert",
  "bulk_update_pkey",
  "bulk_upsert_pkey",
  "bulk_update_with_primary_key",
  "bulk_upsert_with_primary_key"
]);
function isMutationQuery(query) {
  const options = query.options ?? {};
  const operation = typeof options.operation === "string" ? options.operation.toLowerCase() : void 0;
  if (operation && MUTATION_OPERATIONS.has(operation))
    return true;
  const sqlExecution = options.sql_execution;
  const sql = typeof options.query === "string" ? options.query : typeof options.sql === "string" ? options.sql : typeof sqlExecution?.sqlQuery === "string" ? sqlExecution.sqlQuery : void 0;
  return typeof sql === "string" && /^\s*(insert|update|delete|merge|upsert|replace)\b/i.test(sql);
}
function validateEvents(summary, events, options = {}) {
  const errors = [];
  const warnings = [];
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const queries = new Set(summary.queries.map((query) => query.id));
  const queryById = new Map(summary.queries.map((query) => [query.id, query]));
  const pages = new Set(summary.pages.map((page) => page.id));
  const pageOfComponent = new Map(summary.pages.flatMap((page) => page.components.map((c) => [c.id, page.id])));
  const pageName = new Map(summary.pages.map((page) => [page.id, page.name ?? page.handle ?? page.id]));
  const queryTriggerPages = /* @__PURE__ */ new Map();
  const noteTrigger = (queryId, pageId) => {
    if (!queryId)
      return;
    const set = queryTriggerPages.get(queryId) ?? /* @__PURE__ */ new Set();
    set.add(pageId ?? "*");
    queryTriggerPages.set(queryId, set);
  };
  for (const query of summary.queries) {
    const opts = query.options && typeof query.options === "object" ? query.options : {};
    const onLoad = opts.runOnPageLoad;
    const raw = onLoad && typeof onLoad === "object" ? onLoad.value : onLoad;
    if (raw === true || String(raw ?? "").replace(/[{}\s]/g, "").toLowerCase() === "true")
      noteTrigger(query.id, void 0);
  }
  for (const persisted of summary.events ?? []) {
    const payload = persisted.event && typeof persisted.event === "object" ? persisted.event : void 0;
    if (!payload || payload.actionId !== "run-query")
      continue;
    const queryId = String(payload.queryId ?? "");
    if (persisted.target === "page")
      noteTrigger(queryId, persisted.sourceId);
    else if (persisted.target === "component" && persisted.sourceId)
      noteTrigger(queryId, pageOfComponent.get(persisted.sourceId));
  }
  for (const event of events) {
    if (event.action?.actionId !== "run-query")
      continue;
    const queryId = String(event.action.queryId ?? "");
    if (event.sourceType === "page")
      noteTrigger(queryId, event.sourceId);
    else if (event.sourceType === "component" || event.sourceType === "table_column")
      noteTrigger(queryId, pageOfComponent.get(event.sourceId));
  }
  const pageScopedTarget = (action) => {
    const id = action.actionId;
    if (id === "set-table-page")
      return typeof action.table === "string" ? action.table : void 0;
    if (id === "control-component" || id === "scroll-component-into-view")
      return typeof action.componentId === "string" ? action.componentId : void 0;
    if (id === "show-modal" || id === "close-modal")
      return typeof action.modal === "string" ? action.modal : void 0;
    return void 0;
  };
  events.forEach((event, index) => {
    const label = event.name ? `Event "${event.name}"` : `Event[${index}]`;
    errors.push(...lintComponentStateBindings(event.action, [...components.values()], label));
    if (event.sourceType === "component") {
      const source = components.get(event.sourceId);
      for (const ref of new Set([event.ref, event.action.ref].filter((ref2) => ref2 != null && ref2 !== ""))) {
        if (source?.type !== "Navigation" || event.trigger !== "onClick") {
          (options.savedRefs?.has(event) ? warnings : errors).push(`${label}: ordinary component events cannot use ref; use name to label the handler. Only Navigation onClick item refs and Table Button-column refs have component sub-element scopes.`);
        } else if (!nonEmptyString(ref) || ref.includes("{{")) {
          errors.push(`${label}: Navigation onClick ref must be a literal non-empty item id.`);
        } else {
          const membership = navigationItemRef(source, ref);
          if (membership === "invalid")
            errors.push(`${label}: Navigation ref "${ref}" does not identify a non-group menu item.`);
          if (membership === "unknown")
            warnings.push(`${label}: Navigation ref "${ref}" membership cannot be verified because menuItems are unresolved/dynamic. Verify the runtime item id; no item membership was inferred.`);
        }
      }
      if (!source)
        errors.push(`${label}: component source "${event.sourceId}" does not exist.`);
      else if (source.type) {
        const schema = getComponentSchema(source.type);
        const validTriggers = schema?.events?.map((item) => item.id) ?? [];
        if (schema && !validTriggers.includes(event.trigger)) {
          errors.push(`${label}: trigger "${event.trigger}" is not valid for ${source.type}. Valid triggers: ${validTriggers.join(", ") || "none"}.`);
        }
        if (source.type === "Kanban" && event.trigger === "onCardSelected" && isFalseBinding(propVal(source.properties, "openModalOnCardClick"))) {
          errors.push(`${label}: Kanban onCardSelected cannot fire while openModalOnCardClick is false; ToolJet returns before it sets lastSelectedCard or fires the event. Enable the native card modal AND populate it with children parented to the Kanban using slot_name:"modal", or remove this handler and use a separate supported detail flow.`);
        }
      }
    } else if (event.sourceType === "data_query") {
      if (!queries.has(event.sourceId))
        errors.push(`${label}: query source "${event.sourceId}" does not exist.`);
      if (!["onDataQuerySuccess", "onDataQueryFailure"].includes(event.trigger)) {
        errors.push(`${label}: query trigger must be onDataQuerySuccess or onDataQueryFailure, not "${event.trigger}".`);
      }
    } else if (event.sourceType === "page") {
      if (!pages.has(event.sourceId))
        errors.push(`${label}: page source "${event.sourceId}" does not exist.`);
      if (event.trigger !== "onPageLoad")
        errors.push(`${label}: page trigger must be onPageLoad, not "${event.trigger}".`);
    } else if (event.sourceType === "table_column") {
      const source = components.get(event.sourceId);
      if (!source)
        errors.push(`${label}: Table source "${event.sourceId}" does not exist.`);
      else if (source.type !== "Table")
        errors.push(`${label}: table_column source must be a Table, not ${source.type ?? "unknown"}.`);
      else {
        if (event.trigger !== "onClick")
          errors.push(`${label}: Table Button-column trigger must be onClick.`);
        const refError = validateTableColumnRef(source, event.ref);
        if (refError)
          errors.push(`${label}: ${refError}`);
      }
    } else if (event.sourceType === "table_action") {
      errors.push(`${label}: deprecated table_action handlers are not authored reliably. Use a columnType:"button" column with source_type:"table_column".`);
    }
    const actionId = event.action.actionId;
    if (typeof actionId !== "string" || !ACTION_IDS.has(actionId)) {
      errors.push(`${label}: unknown actionId "${String(actionId)}"; ToolJet silently ignores invalid action ids.`);
      return;
    }
    const targetId = pageScopedTarget(event.action);
    const targetPage = targetId ? pageOfComponent.get(targetId) : void 0;
    if (targetId && targetPage) {
      const targetLabel = `${components.get(targetId)?.type ?? "component"} "${components.get(targetId)?.name ?? targetId}" on page "${pageName.get(targetPage)}"`;
      const sourcePage = event.sourceType === "page" ? event.sourceId : event.sourceType === "component" || event.sourceType === "table_column" ? pageOfComponent.get(event.sourceId) : void 0;
      if (sourcePage && sourcePage !== targetPage) {
        errors.push(`${label}: ${actionId} targets ${targetLabel} from page "${pageName.get(sourcePage)}". A page-scoped action only reaches components on the page that is open; on another page the target is not mounted and the action fails at runtime. Put this handler on page "${pageName.get(targetPage)}" (its onPageLoad, or a component there), or drop it: switch-page mounts that page fresh.`);
      } else if (event.sourceType === "data_query") {
        const triggerPages = queryTriggerPages.get(event.sourceId);
        const elsewhere = triggerPages ? [...triggerPages].filter((page) => page !== targetPage) : [];
        if (elsewhere.length) {
          const where = elsewhere.includes("*") ? "on every page load (runOnPageLoad)" : `from page "${elsewhere.map((p) => pageName.get(p) ?? p).join('", "')}"`;
          errors.push(`${label}: ${actionId} targets ${targetLabel}, but query "${queryById.get(event.sourceId)?.name ?? event.sourceId}" runs ${where}, where that component is not mounted, so the success handler fails at runtime. Move the action to page "${pageName.get(targetPage)}" (its onPageLoad, or the filter's own event there), or run the query only from that page.`);
        }
      }
    }
    if (actionId === "run-query") {
      let queryId = event.action.queryId;
      if (typeof queryId === "string" && !queries.has(queryId)) {
        const resolution = resolveRef(summary.queries, queryId, "Query", "in this app");
        if (resolution.ok) {
          if (resolution.warning)
            warnings.push(`${label}: ${resolution.warning}`);
          queryId = resolution.target.id;
          event.action.queryId = queryId;
        }
      }
      if (typeof queryId !== "string" || !queries.has(queryId)) {
        const available = summary.queries.map((q) => `${q.name ?? "(unnamed)"}=${q.id}`).join(", ");
        errors.push(`${label}: no query with id or name "${String(queryId)}" in this app. Do not re-read \u2014 the app currently has: ${available || "(no queries)"}.`);
      } else if (event.sourceType === "component" && event.trigger === "onClick") {
        const source = components.get(event.sourceId);
        const query = queryById.get(queryId);
        if (source?.type === "Button" && query && isMutationQuery(query)) {
          warnings.push(...requiredMutationGuardWarnings(source, query, event.action, [...components.values()]));
          const disabled = propVal(source.properties, "disabledState");
          const guarded = typeof disabled === "string" && disabled.includes("{{") && /isloading/i.test(disabled);
          if (!guarded) {
            warnings.push(`Button "${source.name ?? source.id}" runs the mutation query "${query.name ?? queryId}" on click but its disabledState does not gate on the query's loading state, so it can be double-submitted. Set disabledState to {{queries.${query.name ?? queryId}.isLoading}}.`);
          }
        }
      }
    }
    if (actionId === "switch-page") {
      const pageId = event.action.pageId;
      if (typeof pageId !== "string" || !pages.has(pageId)) {
        errors.push(`${label}: switch-page target "${String(pageId)}" does not exist.`);
      }
    }
    if (["show-modal", "close-modal"].includes(actionId)) {
      const modal = event.action.modal;
      const target = typeof modal === "string" ? components.get(modal) : void 0;
      if (!target) {
        errors.push(`${label}: ${actionId} modal target "${String(modal)}" does not exist.`);
      } else if (!["Modal", "ModalV2"].includes(target.type ?? "")) {
        errors.push(`${label}: ${actionId} target must be a Modal or ModalV2, not ${target.type ?? "unknown"} "${target.name ?? target.id}".`);
      }
    }
    if (actionId === "control-component") {
      const componentId = event.action.componentId;
      const target = typeof componentId === "string" ? components.get(componentId) : void 0;
      if (!target) {
        errors.push(`${label}: control-component target "${String(componentId)}" does not exist.`);
      } else {
        const handle = event.action.componentSpecificActionHandle;
        const schema = target.type ? getComponentSchema(target.type) : null;
        const componentAction = typeof handle === "string" ? schema?.actions?.find((candidate) => candidate.handle === handle) : void 0;
        if (!nonEmptyString(handle)) {
          errors.push(`${label}: control-component requires componentSpecificActionHandle.`);
        } else if (!componentAction) {
          errors.push(`${label}: control-component action "${handle}" is not valid for ${target.type ?? "unknown"} "${target.name ?? target.id}". Valid actions: ${schema?.actions?.map((candidate) => candidate.handle).join(", ") || "none"}.`);
        } else {
          const params = event.action.componentSpecificActionParams;
          if (params !== void 0 && !Array.isArray(params)) {
            errors.push(`${label}: componentSpecificActionParams must be an array.`);
          } else if (Array.isArray(params)) {
            const supplied = new Set(params.flatMap((param) => isRecord(param) && nonEmptyString(param.handle) ? [param.handle] : []));
            if (params.some((param) => !isRecord(param) || !nonEmptyString(param.handle))) {
              errors.push(`${label}: every componentSpecificActionParams entry requires a string handle.`);
            }
            const requiredHandles = (componentAction.params ?? []).flatMap((param) => nonEmptyString(param.handle) ? [param.handle] : []);
            const missing = requiredHandles.filter((required) => !supplied.has(required));
            if (missing.length) {
              errors.push(`${label}: control-component action "${handle}" is missing parameter handles: ${missing.join(", ")}.`);
            }
          } else if ((componentAction.params?.length ?? 0) > 0) {
            errors.push(`${label}: control-component action "${handle}" requires componentSpecificActionParams for ${componentAction.params.map((param) => String(param.handle)).join(", ")}.`);
          }
        }
      }
    }
    if (actionId === "scroll-component-into-view") {
      const componentId = event.action.componentId;
      if (typeof componentId !== "string" || !components.has(componentId)) {
        errors.push(`${label}: scroll-component-into-view target "${String(componentId)}" does not exist.`);
      }
    }
    if (actionId === "show-alert") {
      if (!nonEmptyString(event.action.message))
        errors.push(`${label}: show-alert requires a non-empty message.`);
      if (!["success", "info", "warning", "error"].includes(String(event.action.alertType))) {
        errors.push(`${label}: show-alert alertType must be success, info, warning, or error.`);
      }
    }
    if (["set-custom-variable", "set-page-variable", "set-localstorage-value"].includes(actionId)) {
      if (!nonEmptyString(event.action.key))
        errors.push(`${label}: ${actionId} requires a non-empty key.`);
      if (!Object.prototype.hasOwnProperty.call(event.action, "value"))
        errors.push(`${label}: ${actionId} requires value.`);
    }
    if (actionId === "unset-custom-variable" && !nonEmptyString(event.action.key)) {
      errors.push(`${label}: unset-custom-variable requires a non-empty key.`);
    }
    if (actionId === "open-webpage" && !nonEmptyString(event.action.url)) {
      errors.push(`${label}: open-webpage requires a non-empty url.`);
    }
    if (actionId === "copy-to-clipboard" && !Object.prototype.hasOwnProperty.call(event.action, "contentToCopy")) {
      errors.push(`${label}: copy-to-clipboard requires contentToCopy.`);
    }
    if (actionId === "set-table-page") {
      const tableId = event.action.table;
      const table = typeof tableId === "string" ? components.get(tableId) : void 0;
      if (!table) {
        errors.push(`${label}: set-table-page Table target "${String(tableId)}" does not exist.`);
      } else if (table.type !== "Table") {
        errors.push(`${label}: set-table-page target must be a Table, not ${table.type ?? "unknown"}.`);
      }
      const pageIndex = event.action.pageIndex;
      if (!["string", "number"].includes(typeof pageIndex) || String(pageIndex).trim() === "") {
        errors.push(`${label}: set-table-page requires a numeric value or binding in pageIndex.`);
      }
    }
    if (actionId === "generate-file") {
      const format = ["fileType", "type", "format", "extension"].map((key2) => event.action[key2]).find((value) => typeof value === "string");
      if (format && /\bpdf\b/i.test(format)) {
        warnings.push(`${label}: generate-file PDF is a pass-through and expects pre-formed PDF bytes; it does not convert text/HTML/data into a PDF. Use CSV/plaintext, or supply and browser-verify real PDF bytes.`);
      }
    }
  });
  const chainKey = (event) => [event.sourceType, event.sourceId, event.ref ?? "", event.trigger].join("\0");
  const touchedChains = new Set(events.map(chainKey));
  const chains = /* @__PURE__ */ new Map();
  for (const persisted of options.includePersistedChains === false ? [] : summary.events) {
    const raw = isRecord(persisted.event) ? persisted.event : void 0;
    const sourceType = persisted.target;
    const trigger = raw?.eventId;
    if (!raw || !persisted.sourceId || !sourceType || !nonEmptyString(trigger))
      continue;
    const event = {
      sourceId: persisted.sourceId,
      sourceType,
      ref: nonEmptyString(raw.ref) ? raw.ref : void 0,
      trigger,
      action: raw,
      name: persisted.name
    };
    const key2 = chainKey(event);
    if (!touchedChains.has(key2))
      continue;
    const chain = chains.get(key2) ?? [];
    chain.push({ event, index: persisted.index ?? 0, persisted: true });
    chains.set(key2, chain);
  }
  events.forEach((event, index) => {
    const key2 = chainKey(event);
    const chain = chains.get(key2) ?? [];
    const lastPersistedIndex = chain.reduce((maximum, item) => item.persisted ? Math.max(maximum, item.index) : maximum, -1);
    chain.push({ event, index: lastPersistedIndex + index + 1, persisted: false });
    chains.set(key2, chain);
  });
  for (const chain of chains.values()) {
    chain.sort((left, right) => left.index - right.index || Number(right.persisted) - Number(left.persisted));
    chain.forEach(({ event }, index) => {
      if (event.action.actionId !== "control-component" || !["selectOption", "selectOptions", "setText", "setValue"].includes(String(event.action.componentSpecificActionHandle)))
        return;
      let child = components.get(String(event.action.componentId));
      const visited = /* @__PURE__ */ new Set();
      while (child?.parent && !visited.has(child.id)) {
        visited.add(child.id);
        const parent = components.get(decodeComponentParent(child.parent).parentId);
        if (!parent)
          break;
        if (parent.type === "ModalV2" && chain.slice(index + 1).some(({ event: later2 }) => later2.action.actionId === "show-modal" && later2.action.modal === parent.id)) {
          errors.push(`Event "${event.name ?? index}": prefill targets a child of ModalV2 "${parent.name ?? parent.id}" before show-modal. Closed modal children are not mounted; these values can be lost. Bind input defaults to the selected record, or initialize after the modal opens.`);
          break;
        }
        child = parent;
      }
    });
    const navigationIndex = chain.findIndex(({ event }) => event.action.actionId === "switch-page");
    if (navigationIndex === -1 || navigationIndex === chain.length - 1)
      continue;
    const navigation = chain[navigationIndex];
    const afterNavigation = chain.slice(navigationIndex + 1);
    if (options.navigationMovedLast && navigation.persisted && afterNavigation.every((item) => !item.persisted && item.event.action.actionId !== "switch-page"))
      continue;
    const later = chain.slice(navigationIndex + 1).map(({ event }) => String(event.action.actionId)).join(", ");
    const label = navigation.event.name ? `${navigation.persisted ? "Persisted event" : "Event"} "${navigation.event.name}"` : `${navigation.persisted ? "Persisted event" : "Event"}[${navigation.index}]`;
    errors.push(`${label}: switch-page must be the LAST handler for the same source and trigger; ToolJet does not run later handlers (${later}). Put state updates and run-query actions before navigation.`);
  }
  errors.push(...queryEventCycleErrors(summary, events, options.includePersistedChains === false ? [] : persistedEventSpecs(summary)));
  const persistedMode = options.includePersistedChains === false;
  const isNavigation = (sourceType, sourceId, trigger) => sourceType === "component" && components.get(sourceId)?.type === "Navigation" && trigger === "onClick";
  const runKey = (sourceType, sourceId, trigger, queryId) => JSON.stringify([sourceType, sourceId, trigger, queryId]);
  const runScope = (sourceType, sourceId, trigger, ref) => sourceType === "table_column" || isNavigation(sourceType, sourceId, trigger) ? ref || null : null;
  const overlaps = (left, right, navigation) => left === right || navigation && (left === null || right === null);
  const payloadKey = (payload) => JSON.stringify(Object.keys(payload).filter((k) => k !== "index" && k !== "name").sort().map((k) => [k, payload[k]]));
  const heldRuns = /* @__PURE__ */ new Map();
  if (!persistedMode) {
    for (const held of summary.events ?? []) {
      const payload = held.event && typeof held.event === "object" ? held.event : void 0;
      if (!payload || payload.actionId !== "run-query" || !held.sourceId)
        continue;
      if (held.target !== "component" && held.target !== "table_column")
        continue;
      const key2 = runKey(held.target, held.sourceId, payload.eventId, payload.queryId);
      const scope = runScope(held.target, held.sourceId, payload.eventId, payload.ref);
      heldRuns.set(key2, [...heldRuns.get(key2) ?? [], { id: held.id, payload: payloadKey(payload), scope }]);
    }
  }
  const plannedRuns = /* @__PURE__ */ new Map();
  for (const event of events) {
    if (event.action?.actionId !== "run-query")
      continue;
    if (event.sourceType !== "component" && event.sourceType !== "table_column")
      continue;
    const key2 = runKey(event.sourceType, event.sourceId, event.trigger, event.action.queryId);
    const scope = runScope(event.sourceType, event.sourceId, event.trigger, effectiveRef(event));
    const navigation = isNavigation(event.sourceType, event.sourceId, event.trigger);
    const sourceName = components.get(event.sourceId)?.name ?? event.sourceId;
    const queryName = queryById.get(String(event.action.queryId ?? ""))?.name ?? String(event.action.queryName ?? event.action.queryId);
    const mine = payloadKey({ eventId: event.trigger, ...event.ref ? { ref: event.ref } : {}, ...event.action });
    const held = (heldRuns.get(key2) ?? []).filter((h) => overlaps(h.scope, scope, navigation));
    if (held.length && !held.some((h) => h.payload === mine)) {
      errors.push(`"${sourceName}" ${event.trigger} already runs query "${queryName}" (event ${held[0].id}); a second handler would run it twice on one ${event.trigger}. Change that handler with update_events, or delete it with delete_event before adding this one.`);
    } else if ((plannedRuns.get(key2) ?? []).some((previous) => overlaps(previous, scope, navigation))) {
      (persistedMode ? warnings : errors).push(`"${sourceName}" ${event.trigger} runs query "${queryName}" twice: two handlers on it run the same query, so one ${event.trigger} runs it two times. Keep one.`);
    }
    plannedRuns.set(key2, [...plannedRuns.get(key2) ?? [], scope]);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}
var persistedEventIds = /* @__PURE__ */ new WeakMap();
function persistedEventSpecs(summary) {
  return summary.events.map((event, position) => ({ event, position })).sort((left, right) => (left.event.index ?? left.position) - (right.event.index ?? right.position)).flatMap(({ event }) => {
    if (!event.sourceId || !event.target || !event.event || typeof event.event !== "object")
      return [];
    const payload = event.event;
    if (typeof payload.eventId !== "string")
      return [];
    const { eventId, ref, ...action } = payload;
    if (event.target === "component" && ref != null && typeof ref !== "string")
      action.ref = ref;
    const spec = {
      sourceId: event.sourceId,
      sourceType: event.target,
      ...typeof ref === "string" ? { ref } : {},
      trigger: eventId,
      action,
      name: event.name
    };
    if (event.id)
      persistedEventIds.set(spec, event.id);
    return [spec];
  });
}
function navigationReorders(summary, touched, diagnostics) {
  const touchedKeys = touched ? new Set(touched.map((event) => [event.sourceType, event.sourceId, event.ref ?? "", event.trigger].join("\0"))) : void 0;
  const chains = /* @__PURE__ */ new Map();
  for (const saved of summary.events ?? []) {
    const raw = isRecord(saved.event) ? saved.event : void 0;
    if (!raw || !saved.sourceId || !nonEmptyString(raw.eventId))
      continue;
    const key2 = [saved.target, saved.sourceId, nonEmptyString(raw.ref) ? raw.ref : "", raw.eventId].join("\0");
    const chain = chains.get(key2) ?? [];
    chain.push({ id: saved.id, index: saved.index ?? 0, nav: raw.actionId === "switch-page" });
    chains.set(key2, chain);
  }
  const moves = [];
  for (const [key2, chain] of chains) {
    chain.sort((a, b) => a.index - b.index);
    const navs = chain.filter((item) => item.nav);
    if (!navs.length || chain.slice(-navs.length).every((item) => item.nav))
      continue;
    if (touchedKeys && !touchedKeys.has(key2)) {
      const [, sourceId, ref, trigger] = key2.split("\0");
      diagnostics?.push(`The saved ${trigger} chain of "${sourceId}"${ref ? ` (${ref})` : ""} has a page switch before other handlers, so those never run; this phase did not touch it, so it was left as it is.`);
      continue;
    }
    let next = Math.max(...chain.map((item) => item.index)) + 1;
    for (const nav of navs)
      moves.push({ eventId: nav.id, index: next++ });
  }
  return moves;
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
function expandQueryLifecycles(summary, lifecycles) {
  const queries = new Map(summary.queries.map((query) => [query.id, query]));
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const warnings = [];
  const events = [];
  const seenSources = /* @__PURE__ */ new Set();
  for (const lifecycle of lifecycles) {
    const query = queries.get(lifecycle.queryId);
    if (!query)
      throw new Error(`Query lifecycle source "${lifecycle.queryId}" does not exist.`);
    if (seenSources.has(lifecycle.queryId)) {
      throw new Error(`Query "${query.name ?? lifecycle.queryId}" has more than one lifecycle declaration in this batch.`);
    }
    seenSources.add(lifecycle.queryId);
    const sourceName = query.name ?? lifecycle.queryId;
    const refreshIds = unique(lifecycle.refreshQueryIds ?? [], `refresh query`, sourceName, warnings);
    if (refreshIds.includes(lifecycle.queryId)) {
      throw new Error(`Query "${sourceName}" cannot refresh itself after success: this repeats the query indefinitely, including any writes. Refresh a separate read query instead.`);
    }
    const clearIds = unique(lifecycle.clearComponentIds ?? [], `clear component`, sourceName, warnings);
    (lifecycle.beforeRefreshActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action,
        name: `${sourceName} before refresh action ${index + 1}`
      });
    });
    for (const queryId of refreshIds) {
      const refresh = queries.get(queryId);
      if (!refresh)
        throw new Error(`Query "${sourceName}" lifecycle refresh target "${queryId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: { actionId: "run-query", queryId, queryName: refresh.name ?? queryId },
        name: `Refresh ${refresh.name ?? queryId} after ${sourceName}`
      });
    }
    (lifecycle.successActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action,
        name: `${sourceName} success action ${index + 1}`
      });
    });
    if (lifecycle.closeModalId) {
      const modal = components.get(lifecycle.closeModalId);
      if (!modal)
        throw new Error(`Query "${sourceName}" lifecycle modal "${lifecycle.closeModalId}" does not exist.`);
      if (!["Modal", "ModalV2"].includes(modal.type ?? "")) {
        throw new Error(`Query "${sourceName}" lifecycle close target "${modal.name ?? modal.id}" is ${modal.type ?? "unknown"}, not a Modal.`);
      }
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: { actionId: "close-modal", modal: lifecycle.closeModalId },
        name: `Close ${modal.name ?? modal.id} after ${sourceName}`
      });
    }
    for (const componentId of clearIds) {
      const component = components.get(componentId);
      if (!component)
        throw new Error(`Query "${sourceName}" lifecycle clear target "${componentId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQuerySuccess",
        action: {
          actionId: "control-component",
          componentId,
          componentSpecificActionHandle: "clear",
          componentSpecificActionParams: []
        },
        name: `Clear ${component.name ?? componentId} after ${sourceName}`
      });
    }
    if (lifecycle.successAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, "onDataQuerySuccess", lifecycle.successAlert, "success"));
    }
    (lifecycle.failureActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: "data_query",
        trigger: "onDataQueryFailure",
        action,
        name: `${sourceName} failure action ${index + 1}`
      });
    });
    if (lifecycle.failureAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, "onDataQueryFailure", lifecycle.failureAlert, "error"));
    }
  }
  return { events, warnings };
}
function alertEvent(queryId, queryName, trigger, alert, defaultType) {
  return {
    sourceId: queryId,
    sourceType: "data_query",
    trigger,
    action: { actionId: "show-alert", message: alert.message, alertType: alert.alertType ?? defaultType },
    name: trigger === "onDataQuerySuccess" ? `Confirm ${queryName}` : `${queryName} failed`
  };
}
function unique(values, label, sourceName, warnings) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const value of values) {
    if (seen.has(value)) {
      warnings.push(`Query "${sourceName}" lifecycle listed ${label} "${value}" more than once; duplicate ignored.`);
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
function matchPlannedPage(pages, name, plannedNames, claimed = /* @__PURE__ */ new Set()) {
  const byName = pages.find((page) => page.name === name && !claimed.has(page.id));
  if (byName || name !== "Home" || pages.some((page) => page.name === "Home"))
    return byName;
  return pages.find((page) => page.handle === "home" && !claimed.has(page.id) && !plannedNames.has(page.name ?? ""));
}
var escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var idPattern = (ids) => new RegExp(`(?<![\\w-])(?:${[...ids].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})(?![\\w-])`, "g");
function mentionsId(text, id) {
  return idPattern([id]).test(text);
}
function replaceIds(text, newIds) {
  const ids = [...newIds.keys()];
  if (!ids.length)
    return { text, missing: [] };
  const missing = /* @__PURE__ */ new Set();
  const replaced = text.replace(idPattern(ids), (id) => {
    const next = newIds.get(id);
    if (next)
      return next;
    missing.add(id);
    return id;
  });
  return { text: replaced, missing: [...missing] };
}
var readsQuery = (text, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`queries\\s*(?:\\?\\.|\\.)\\s*${escaped}(?![\\w$])|queries\\s*\\[\\s*['"]${escaped}['"]\\s*\\]`).test(text);
};
function replaceView(summary, plan) {
  const replacedNames = new Set((plan.pages ?? []).filter((page) => page.replace).map((page) => page.name));
  const plannedNames = new Set((plan.pages ?? []).map((page) => page.name));
  const matched = /* @__PURE__ */ new Set();
  const plannedNameById = /* @__PURE__ */ new Map();
  for (const name of replacedNames) {
    const page = matchPlannedPage(summary.pages, name, plannedNames, matched);
    if (page)
      matched.add(page.id);
    if (page)
      plannedNameById.set(page.id, name);
  }
  const replacedPages = summary.pages.filter((page) => matched.has(page.id));
  const replacedPageIds = replacedPages.map((page) => page.id);
  const componentsToDelete = replacedPages.map((page) => ({ pageId: page.id, componentIds: page.components.map((component) => component.id) })).filter((entry) => entry.componentIds.length);
  const replacedComponentIds = componentsToDelete.flatMap((entry) => entry.componentIds);
  const removedSources = /* @__PURE__ */ new Set([...replacedPageIds, ...replacedComponentIds]);
  const planQueryNames = new Set((plan.queries ?? []).map((query) => query.name));
  const replacedComponents = replacedPages.flatMap((page) => page.components);
  const otherComponents = summary.pages.filter((page) => !matched.has(page.id)).flatMap((page) => page.components);
  const componentText = (component) => JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
  const runsQuery = (event, id) => JSON.stringify(event.event ?? {}).includes(`"${id}"`);
  const planQueryIds = new Set(summary.queries.filter((query) => query.name && planQueryNames.has(query.name)).map((query) => query.id));
  const pageOwns = (query) => replacedComponents.some((component) => readsQuery(componentText(component), query.name)) || summary.events.some((event) => event.sourceId && removedSources.has(event.sourceId) && runsQuery(event, query.id));
  const usedElsewhere = (query) => otherComponents.some((component) => readsQuery(componentText(component), query.name)) || summary.events.some((event) => event.sourceId !== query.id && !(event.sourceId && removedSources.has(event.sourceId)) && !(event.sourceId && planQueryIds.has(event.sourceId)) && runsQuery(event, query.id)) || summary.queries.some((other) => other.id !== query.id && !planQueryIds.has(other.id) && readsQuery(JSON.stringify(other.options ?? {}), query.name));
  const readsOf = (text) => summary.queries.filter((q) => q.name && readsQuery(text, q.name)).map((q) => q.id);
  const reachedElsewhere = /* @__PURE__ */ new Set([
    ...otherComponents.flatMap((component) => readsOf(componentText(component))),
    ...summary.events.filter((event) => !(event.sourceId && (removedSources.has(event.sourceId) || summary.queries.some((q) => q.id === event.sourceId)))).flatMap((event) => summary.queries.filter((q) => runsQuery(event, q.id)).map((q) => q.id))
  ]);
  for (let frontier = [...reachedElsewhere]; frontier.length; ) {
    const next = frontier.flatMap((id) => {
      const query = summary.queries.find((q) => q.id === id);
      return readsOf(JSON.stringify(query?.options ?? {}));
    }).filter((id) => !reachedElsewhere.has(id));
    next.forEach((id) => reachedElsewhere.add(id));
    frontier = next;
  }
  const owned = new Set(summary.queries.filter((query) => query.name && !reachedElsewhere.has(query.id) && pageOwns(query)).map((query) => query.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const query of summary.queries) {
      if (!query.name || owned.has(query.id) || reachedElsewhere.has(query.id))
        continue;
      const readByOwned = summary.queries.some((other) => owned.has(other.id) && readsQuery(JSON.stringify(other.options ?? {}), query.name));
      const chainedByOwned = summary.events.some((event) => !!event.sourceId && owned.has(event.sourceId) && runsQuery(event, query.id));
      if (readByOwned || chainedByOwned) {
        owned.add(query.id);
        grew = true;
      }
    }
  }
  const explicitUpdates = new Set((plan.queries ?? []).filter((query) => query.update).map((query) => query.name));
  const implicit = replacedNames.size ? summary.queries.filter((query) => query.name && planQueryNames.has(query.name) && !reachedElsewhere.has(query.id) && (owned.has(query.id) || !usedElsewhere(query))) : [];
  const explicit = summary.queries.filter((query) => query.name && explicitUpdates.has(query.name));
  const queriesToUpdate = new Map([...implicit, ...explicit].map((query) => [query.name, query.id]));
  if (!replacedPages.length && !explicit.length && (!replacedNames.size || !queriesToUpdate.size))
    return void 0;
  const redefinedIds = new Set(queriesToUpdate.values());
  const queryNameById = new Map(summary.queries.map((query) => [query.id, query.name ?? ""]));
  const pageNameById = new Map(summary.pages.map((page) => [page.id, page.name ?? ""]));
  const queryRefName = new Map((plan.queries ?? []).flatMap((query) => [[query.name, query.name], ...query.client_ref ? [[query.client_ref, query.name]] : []]));
  const pageRefName = new Map((plan.pages ?? []).flatMap((page) => [[page.name, page.name], ...page.client_ref ? [[page.client_ref, page.name]] : []]));
  const nameOfQuery = (ref) => typeof ref === "string" ? queryRefName.get(ref) ?? queryNameById.get(ref) ?? ref : "";
  const nameOfPage = (ref) => typeof ref === "string" ? pageRefName.get(ref) ?? pageNameById.get(ref) ?? ref : "";
  const actionKey = (action) => {
    const id = action.actionId;
    if (id === "run-query")
      return `run-query:${nameOfQuery(action.target_ref ?? action.queryName ?? action.queryId)}`;
    if (id === "switch-page")
      return `switch-page:${nameOfPage(action.target_ref ?? action.pageId)}`;
    if (id === "set-custom-variable" || id === "set-page-variable")
      return `${id}:${String(action.key ?? "")}`;
    return void 0;
  };
  const planned = /* @__PURE__ */ new Set();
  const plan_ = (source, trigger, action) => {
    const key2 = action && actionKey(action);
    if (key2)
      planned.add(`${source}|${trigger ?? ""}|${key2}`);
  };
  for (const event of plan.events ?? []) {
    if (event.source_type === "data_query")
      plan_(`q:${nameOfQuery(event.source_ref)}`, event.trigger, event.action);
    if (event.source_type === "page")
      plan_(`p:${nameOfPage(event.source_ref)}`, event.trigger, event.action);
  }
  for (const lc of plan.lifecycles ?? []) {
    const source = `q:${nameOfQuery(lc.query_ref)}`;
    for (const ref of lc.refresh_query_refs ?? [])
      plan_(source, "onDataQuerySuccess", { actionId: "run-query", queryId: ref });
    for (const action of [...lc.before_refresh_actions ?? [], ...lc.success_actions ?? []])
      plan_(source, "onDataQuerySuccess", action);
    for (const action of lc.failure_actions ?? [])
      plan_(source, "onDataQueryFailure", action);
  }
  const replannedFrom = (source, action) => {
    const key2 = actionKey(action);
    return !!key2 && planned.has(`${source}|${String(action.eventId ?? "")}|${key2}`);
  };
  const alertedQueries = /* @__PURE__ */ new Set([
    ...(plan.lifecycles ?? []).filter((lc) => lc.success_alert || lc.failure_alert).map((lc) => nameOfQuery(lc.query_ref)),
    ...(plan.events ?? []).filter((event) => event.source_type === "data_query" && event.action?.actionId === "show-alert").map((event) => nameOfQuery(event.source_ref))
  ]);
  const eventsToDelete = summary.events.filter((event) => {
    const action = event.event ?? {};
    if (event.sourceId && replacedComponentIds.includes(event.sourceId))
      return true;
    if (event.sourceId && replacedPageIds.includes(event.sourceId)) {
      if (replannedFrom(`p:${plannedNameById.get(event.sourceId)}`, action))
        return true;
      return action.actionId === "run-query" && typeof action.queryId === "string" && redefinedIds.has(action.queryId);
    }
    if (!event.sourceId || !redefinedIds.has(event.sourceId))
      return false;
    const text = JSON.stringify(action);
    if (replacedComponentIds.some((id) => mentionsId(text, id)))
      return true;
    if (replannedFrom(`q:${queryNameById.get(event.sourceId)}`, action))
      return true;
    if (action.actionId === "run-query")
      return typeof action.queryId === "string" && redefinedIds.has(action.queryId);
    if (action.actionId === "show-alert")
      return alertedQueries.has(queryNameById.get(event.sourceId) ?? "");
    return false;
  }).map((event) => event.id);
  const deleted = new Set(eventsToDelete);
  const replacedComponentNames = new Map(replacedPages.flatMap((page) => page.components).filter((component) => component.name).map((component) => [component.id, component.name]));
  const eventsToRetarget = summary.events.filter((event) => {
    if (deleted.has(event.id))
      return false;
    const text = JSON.stringify(event.event ?? {});
    return [...replacedComponentNames.keys()].some((id) => mentionsId(text, id));
  });
  const retargeted = new Set(eventsToRetarget.map((event) => event.id));
  return {
    summary: {
      ...summary,
      pages: summary.pages.map((page) => replacedPageIds.includes(page.id) ? { ...page, components: [] } : page),
      // A redefined query stays under a placeholder name: its name is free for the plan's new definition, and
      // events that run it by id (from other pages) still resolve. Dropping it would orphan them.
      queries: summary.queries.map((query) => redefinedIds.has(query.id) ? { ...query, name: `${query.name} (being replaced)` } : query),
      events: summary.events.filter((event) => !deleted.has(event.id) && !retargeted.has(event.id))
    },
    replacedPageIds,
    componentsToDelete,
    eventsToDelete,
    queriesToUpdate,
    eventsToRetarget,
    replacedComponentNames,
    replacedPageNames: replacedPages.map((page) => page.name ?? page.id)
  };
}
function danglingAfterReplace(summary, view, plan) {
  const kept = new Set((plan.pages ?? []).filter((page) => page.replace).flatMap((page) => (page.components ?? []).map((c) => c.name ?? "")));
  const dropped = [...new Set(view.replacedComponentNames.values())].filter((name) => !kept.has(name));
  if (!dropped.length)
    return [];
  const errors = [];
  const reads = (text, name) => new RegExp(`components\\s*(?:\\?\\.|\\.)\\s*${name.replace(/[$]/g, "\\$")}\\b|components\\s*\\[\\s*['"]${name.replace(/[$]/g, "\\$")}['"]\\s*\\]`).test(text);
  for (const page of summary.pages.filter((p) => !view.replacedPageIds.includes(p.id))) {
    for (const component of page.components) {
      const text = JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
      for (const name of dropped) {
        if (reads(text, name))
          errors.push(`Page "${page.name}": "${component.name ?? component.id}" reads components.${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change "${page.name}" first.`);
      }
    }
  }
  const droppedIds = [...view.replacedComponentNames].filter(([, name]) => dropped.includes(name));
  const sourceName = new Map(summary.pages.flatMap((p) => p.components.map((c) => [c.id, `${c.name ?? c.id}" on page "${p.name}`])));
  for (const event of view.eventsToRetarget) {
    const text = JSON.stringify(event.event ?? {});
    for (const [id, name] of droppedIds) {
      if (!mentionsId(text, id))
        continue;
      const source = event.sourceId ? sourceName.get(event.sourceId) ?? event.sourceId : "the app";
      errors.push(`"${source}" has an event that acts on ${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change that event first.`);
    }
  }
  const redefined = new Set(view.queriesToUpdate.values());
  for (const query of summary.queries.filter((q) => !redefined.has(q.id))) {
    const text = JSON.stringify(query.options ?? {});
    for (const name of dropped) {
      if (reads(text, name))
        errors.push(`Query "${query.name}" reads components.${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or redefine "${query.name}" in this same plan without it (in page markup: write the whole <Query name="${query.name}" ...> in the same document as the page).`);
    }
  }
  return errors;
}
function canonical(value) {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map((key2) => [key2, item[key2]])) : item);
}
function replaceFingerprint(summary, view) {
  const pageIds = new Set(view.replacedPageIds);
  const replacedPages = summary.pages.filter((page) => pageIds.has(page.id));
  const pages = replacedPages.map((page) => ({
    id: page.id,
    name: page.name ?? null,
    handle: page.handle ?? null,
    icon: page.icon ?? null,
    hidden: page.hidden ?? false,
    components: [...page.components].sort((a, b) => a.id.localeCompare(b.id)).map((component) => ({
      id: component.id,
      name: component.name ?? null,
      type: component.type ?? null,
      parent: component.parent ?? null,
      slot_name: component.slot_name ?? null,
      properties: component.properties ?? {},
      styles: component.styles ?? {},
      layouts: component.layouts ?? {},
      validation: component.validation ?? {},
      others: component.others ?? {}
    }))
  })).sort((a, b) => a.id.localeCompare(b.id));
  const redefined = new Set(view.queriesToUpdate.values());
  const queries = summary.queries.filter((query) => redefined.has(query.id)).map((query) => ({
    id: query.id,
    name: query.name ?? null,
    kind: query.kind ?? null,
    data_source_id: query.data_source_id ?? null,
    options: query.options ?? {}
  })).sort((a, b) => a.id.localeCompare(b.id));
  const touched = [...pageIds, ...replacedPages.flatMap((page) => page.components.map((component) => component.id)), ...redefined];
  const touchedIds = new Set(touched);
  const names = touched.length ? new RegExp(idPattern(touched).source) : void 0;
  const events = summary.events.filter((event) => event.sourceId && touchedIds.has(event.sourceId) || !!names?.test(JSON.stringify(event.event ?? {}))).map((event) => ({
    id: event.id,
    name: event.name ?? null,
    sourceId: event.sourceId ?? null,
    target: event.target ?? null,
    index: event.index ?? null,
    event: event.event ?? {}
  })).sort((a, b) => a.id.localeCompare(b.id));
  return canonical({ pages, queries, events });
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
    for (const [key2, value] of Object.entries(source)) {
      const merged = mergeLikeServer(base[key2], value, wholeArrays);
      if (merged !== void 0 || !(key2 in base))
        base[key2] = merged;
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
  for (const key2 of /* @__PURE__ */ new Set([...Object.keys(asRead), ...Object.keys(have)])) {
    if (stable(asRead[key2]) !== stable(have[key2]))
      return key2;
  }
  return void 0;
}
var RECT_KEYS = ["top", "left", "width", "height"];
var sameRect = (planned, stored) => {
  if (!planned)
    return true;
  if (!stored || typeof stored !== "object")
    return false;
  return RECT_KEYS.every((key2) => Number(stored[key2]) === Number(planned[key2]));
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
    const properties = submit && submitId ? { ...spec.properties, buttonToSubmit: { ...submit, value: submitId } } : spec.properties;
    const { clientRef: _clientRef, parentRef: _parentRef, ...rest } = spec;
    const resolved = { ...rest, properties, id, ...parent ? { parent } : {} };
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
    else if ((existing.parent ?? void 0) !== (parent ? encodeComponentParent(parent, spec.slotName) : void 0))
      why = "parent";
    else if (!definitions[spec.type])
      why = "no default definition for this widget";
    else {
      for (const section of SECTIONS) {
        const key2 = differingKey(spec.type, section, section === "properties" ? properties : spec[section], existing[section], definitions);
        if (key2 !== void 0) {
          why = `${section}.${key2}`;
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
    // Conservative execution labels; the handler additionally enforces proven-read preflight.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: `Execute only a saved query that passes the server's proven-read checks. Mutations, arbitrary RunJS, unknown datasource kinds, and SELECT * are refused before execution. No operation or query-options payload can be supplied to this tool; it reads the selected saved definition and applies its safety checks. Run an already-created query and return its REAL result \u2014 the browser-free way to see actual data. Use it to (a) verify a query works before binding UI to it, and (b) inspect real column values / distinct values (statuses, categories) before writing chart series, dropdown options, or filters. The query must already exist (create it with add_query first). Returns { status: "ok"|"failed", data: <datasource result>, ... }; data may be an array or an object (ToolJet DB SQL uses data.results). Inspect the actual shape before binding components. HTTP is 200 even on failure, so CHECK \`status\` and read \`message\` on failure. Runs the SAVED query as-is; it does not mutate it. SELECT * is always refused. Reads with no static limit at or below ${LARGE_READ_ROW_THRESHOLD} rows require an unfiltered, same-datasource count_query_id first; if the observed count is larger, retry only after explicit user approval with user_confirmed_large_read:true. BigQuery, Snowflake, and Redshift reads also require explicit cost approval with user_confirmed_billable_read:true, even when row-limited. Never set confirmation flags from inferred consent. A static remote read (including REST GET and Supabase rows) requires separate approval with user_confirmed_remote_read:true because it may expose sensitive data or consume quota; remote writes are refused. If saved options reference \`components.*\`, the result includes a warning because browser-free execution cannot prove the component-resolved pagination/filter behavior.`,
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
          warnings.push(assessment.datasourceKind === "restapi" ? "User-confirmed REST GET: the remote API controls response size and quota. Inspect metadata.request and metadata.response, and add API-specific pagination before another run when needed." : "User-confirmed remote read: the datasource controls response size and quota.");
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
            message: error instanceof Error ? error.message : String(error),
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
          ...output.result,
          // Trusted execution evidence, separate from datasource-supplied data. No credentials,
          // URLs or row contents are needed for the agent's early migration/readiness checkpoint.
          execution: { query_id: query.id, datasource_kind: query.kind, read_only: true },
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
function batchSafeRead(query) {
  const assessment = assessQueryRead(query);
  if (assessment.provenRead && assessment.directSafe && !assessment.selectStar) {
    const refusal = resolvedReadRefusal(query, assessment, resolveStaticBindings(query.options).resolved);
    return refusal ? { safe: false, reason: refusal } : { safe: true };
  }
  if (assessment.provenRead && assessment.requiresRemoteReadConfirmation) {
    return {
      safe: false,
      reason: `${assessment.reason ?? "remote read"} run_queries cannot run remote reads at all. Use singular run_query for this one: tell the user which saved query will run, and once they approve, call run_query with user_confirmed_remote_read:true. Do not retry run_queries with it.`
    };
  }
  return {
    safe: false,
    reason: assessment.reason ?? (assessment.requiresCountPreflight ? "read requires a count-first preflight through singular run_query" : "query is not a proven bounded read")
  };
}
function runQueriesTool(client) {
  return {
    name: "run_queries",
    title: "Run Queries",
    // Conservative execution labels; every saved query is preflighted before the batch runs.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Run 1\u201310 already-created, proven read-only queries concurrently and return ordered per-query results. It currently accepts ToolJet DB list_rows/join_tables and SQL datasource list_rows or one bounded explicit-column SELECT/SHOW/DESCRIBE/EXPLAIN read. Every query is preflighted before any execution; SELECT *, unbounded reads, mutations, RunJS, paid/remote API operations, and unknown kinds are refused \u2014 remote API reads (restapi, openapi, servicenow, influxdb) can never run here; use singular run_query with user_confirmed_remote_read. Metadata and the environment are loaded once. Returns {queries:[{query_id,name,status,data|message,warnings?}]}; one runtime failure does not hide other read results. Pass include_data:false to only confirm each query runs \u2014 the result drops the rows and returns {status,row_count} instead, for lightweight post-build verification. Use singular run_query with count_query_id for a count-first large-read preflight. Component-bound options receive the run_query viewer warning.",
    inputSchema: {
      query_ids: external_exports.array(external_exports.string()).min(1).max(10),
      version_id: external_exports.string(),
      environment_id: external_exports.string().optional(),
      include_data: external_exports.boolean().optional().describe("Default true. Set false to verify execution without returning rows: each result keeps status/message/warnings and adds row_count, but omits data. Use for smoke checks that only need the run status.")
    },
    async handler(args) {
      try {
        if (new Set(args.query_ids).size !== args.query_ids.length) {
          return fail(new Error("run_queries query_ids must be unique."));
        }
        const saved = await client.getQueries(args.version_id);
        const byId = new Map(saved.map((query) => [query.id, query]));
        const resolveWarnings = [];
        const resolveErrors = [];
        args = {
          ...args,
          query_ids: args.query_ids.map((queryId) => {
            if (byId.has(queryId))
              return queryId;
            const resolution = resolveRef(saved, queryId, "Query", `on version "${args.version_id}"`);
            if (!resolution.ok) {
              resolveErrors.push(resolution.error);
              return queryId;
            }
            if (resolution.warning)
              resolveWarnings.push(resolution.warning);
            return resolution.target.id;
          })
        };
        if (resolveErrors.length)
          return fail(new Error(resolveErrors.join(" ")));
        const unsafe = args.query_ids.flatMap((queryId) => {
          const verdict = batchSafeRead(byId.get(queryId));
          return verdict.safe ? [] : [`${queryId}: ${verdict.reason}`];
        });
        if (unsafe.length) {
          return fail(new Error(`run_queries refused ${unsafe.length === 1 ? "a query" : "queries"} before execution: ${unsafe.join("; ")}`));
        }
        const environmentId = args.environment_id ?? await client.getDevelopmentEnvironmentId();
        const queries = await Promise.all(args.query_ids.map(async (queryId) => {
          const query = byId.get(queryId);
          const warnings = containsComponentBinding(query.options) ? ["Saved query options reference components.*. Browser-free run_queries does not resolve live component state; verify pagination/filter values in the viewer."] : [];
          try {
            const bindings = resolveStaticBindings(query.options);
            const emptied = emptyViewerOnlyParams(query.options, bindings);
            if (emptied.length)
              warnings.push(emptyParamsNote(emptied));
            const liveOnly = bindings.unresolved.filter((b) => !/components\./.test(b));
            if (liveOnly.length)
              warnings.push(unresolvedNote(liveOnly));
            const result = await client.runQuery({ queryId, versionId: args.version_id, environmentId, resolvedOptions: bindings.resolved });
            const failed = result.status === "failed";
            const bindingHint = queryResultBindingHint(query, result);
            const recovery = failed ? failureRecovery(query, result) : void 0;
            const verification = failed ? failureVerification(query, result) : void 0;
            const schemaHint = failed ? await schemaNameHint(client, query, result) : void 0;
            const shaped = args.include_data === false ? (() => {
              const { data, ...rest } = result;
              return Array.isArray(data) ? { ...rest, row_count: data.length } : bindingHint ? { ...rest, row_count: bindingHint.row_count } : rest;
            })() : result;
            return {
              query_id: queryId,
              ...query.name ? { name: query.name } : {},
              ...shaped,
              execution: { query_id: queryId, datasource_kind: query.kind, read_only: true },
              ...bindingHint ? { binding_hint: bindingHint } : {},
              ...warnings.length ? { warnings } : {},
              ...recovery ? { recovery } : {},
              ...verification ? { verification } : {},
              ...schemaHint ? { schema_hint: schemaHint } : {}
            };
          } catch (error) {
            const failure = { status: "failed", message: error instanceof Error ? error.message : String(error) };
            return {
              query_id: queryId,
              ...query.name ? { name: query.name } : {},
              ...failure,
              ...warnings.length ? { warnings } : {}
            };
          }
        }));
        return ok({ queries });
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
  const check = { ran: 0, rows: {}, failed: [], inconclusive: [], not_run: [] };
  const runnable = [];
  for (const id of wanted) {
    const query = byId.get(id);
    if (!query)
      continue;
    const name = query.name ?? id;
    const verdict = batchSafeRead(query);
    if (!verdict.safe) {
      check.not_run.push({ name, reason: String(verdict.reason ?? "not a proven bounded read").slice(0, REASON_CHARS) });
    } else if (runnable.length >= MAX_READS) {
      check.not_run.push({ name, reason: `only the first ${MAX_READS} reads of a phase are checked; run this one with run_queries` });
    } else {
      runnable.push(id);
    }
  }
  if (!runnable.length)
    return check;
  const environmentId = params.environmentId ?? await client.getDevelopmentEnvironmentId();
  await Promise.all(runnable.map(async (id) => {
    const query = byId.get(id);
    const name = query.name ?? id;
    const needsViewer = containsComponentBinding(query.options);
    const run = async () => {
      try {
        const bindings = resolveStaticBindings(query.options);
        emptyViewerOnlyParams(query.options, bindings);
        return await client.runQuery({ queryId: id, versionId: params.versionId, environmentId, resolvedOptions: bindings.resolved });
      } catch (error) {
        return { status: "failed", message: error instanceof Error ? error.message : String(error) };
      }
    };
    let result = await run();
    if (result.status === "failed" && CLOCK_SKEW.test(String(result.message ?? result.description ?? ""))) {
      await new Promise((resolve2) => setTimeout(resolve2, params.retryDelayMs ?? CLOCK_SKEW_RETRY_MS));
      result = await run();
    }
    check.ran += 1;
    if (result.status !== "failed") {
      const rows = rowCount(result);
      if (rows !== void 0)
        check.rows[name] = rows;
      return;
    }
    const message = String(result.message ?? result.description ?? "the query failed").slice(0, 600);
    if (needsViewer) {
      check.inconclusive.push({
        name,
        message,
        note: "This query reads components.*, which a browser-free run leaves empty: the failure may be about the missing value. Check that the query also works when that input is empty, or give the input a default."
      });
      return;
    }
    const schemaHint = await schemaNameHint(client, query, result).catch(() => void 0);
    check.failed.push({ name, message, ...schemaHint ? { schema_hint: schemaHint } : {} });
  }));
  return check;
}
function invalidPlannedGeneratedPrimaryKeySeeds(columns, rows) {
  const primaryKeys = columns.some((column) => column.primaryKey) ? columns.filter((column) => column.primaryKey) : [{ name: "id", type: "serial", primaryKey: true }];
  const errors = [];
  for (const column of primaryKeys) {
    if (normalizeType(column.type) !== "serial" && !/^nextval\(/i.test(String(column.defaultValue ?? "").trim()))
      continue;
    const supplied = rows.flatMap((row, index) => column.name in row ? [index + 1] : []);
    if (supplied.length) {
      errors.push(`Omit generated primary key "${column.name}" from seed row(s) ${supplied.slice(0, 12).join(", ")}${supplied.length > 12 ? ` and ${supplied.length - 12} more` : ""}. ToolJet allocates it from the table sequence; explicit keys can collide or desynchronize future inserts. No seed values were removed or rewritten.`);
    }
  }
  return errors;
}
function escapeRegExp2(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function containsExactValue(value, expected) {
  if (value === expected)
    return true;
  if (Array.isArray(value))
    return value.some((entry) => containsExactValue(entry, expected));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsExactValue(entry, expected));
  }
  return false;
}
function containsNamedBinding(value, namespace, name) {
  if (typeof value === "string") {
    return new RegExp(`\\b${namespace}\\s*\\.\\s*${escapeRegExp2(name)}(?:\\b|\\s*\\[)`).test(value);
  }
  if (Array.isArray(value))
    return value.some((entry) => containsNamedBinding(entry, namespace, name));
  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => containsNamedBinding(entry, namespace, name));
  }
  return false;
}
var CHART_QUERY_BINDING = /^\s*\{\{\s*queries\.([A-Za-z_$][\w$]*)\.data\s*\}\}\s*$/;
function lintQueryFedCharts(components, queries) {
  const errors = [];
  for (const component of components) {
    if (component.type !== "Chart")
      continue;
    const raw = component.properties?.jsonDescription;
    const description = typeof raw === "string" ? raw : raw && typeof raw === "object" && "value" in raw ? String(raw.value ?? "") : "";
    const match = CHART_QUERY_BINDING.exec(description);
    if (!match)
      continue;
    const query = queries.find((candidate) => candidate.name === match[1] || candidate.clientRef === match[1]);
    if (!query)
      continue;
    if (query.kind !== "runjs")
      continue;
    const code = String(query.options?.code ?? "");
    const label = component.name ?? "Chart";
    if (!code.trim()) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", which has no JavaScript code to build the chart object.`);
      continue;
    }
    if (/textposition\s*:\s*['"]outside['"]/.test(code) && !/cliponaxis\s*:\s*false/.test(code)) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", whose bar trace places its text outside without cliponaxis:false, so the tallest bar's value label is cut in half by the plot area. Add cliponaxis:false to the trace.`);
    }
    const missing = ["data", "layout"].filter((key2) => !code.includes(key2));
    if (missing.length) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", whose code never mentions ${missing.join(", ")}: a query feeding a chart must return the whole { data: [trace], layout: { font, xaxis, yaxis, ... } } object from references/ui-layout.md. A bare array of points draws empty axes in Plotly's default font.`);
    }
  }
  return errors;
}
var QUERY_DATA_REF = /queries\.([A-Za-z_$][\w$]*)\.data\b/g;
var isStaticTrue = (value) => value === true || value === "true" || value === "{{true}}";
function lintRunjsLoadOrder(spec) {
  const errors = [];
  const warnings = [];
  const queries = spec.queries ?? [];
  const byRef = /* @__PURE__ */ new Map();
  for (const query of queries) {
    byRef.set(query.name, query);
    if (query.clientRef)
      byRef.set(query.clientRef, query);
  }
  const chained = /* @__PURE__ */ new Set();
  for (const lifecycle of spec.lifecycles ?? []) {
    for (const target of lifecycle.refreshQueryRefs ?? [])
      chained.add(`${lifecycle.queryRef}->${target}`);
  }
  for (const event of spec.events ?? []) {
    const action = event.action ?? {};
    if (event.sourceType !== "data_query" || event.trigger !== "onDataQuerySuccess" || action.actionId !== "run-query")
      continue;
    const target = String(action.target_ref ?? action.queryName ?? action.queryId ?? "");
    if (target)
      chained.add(`${event.sourceRef}->${target}`);
  }
  const keysOf = (query) => [query.name, ...query.clientRef ? [query.clientRef] : []];
  for (const query of queries) {
    if (query.kind !== "runjs")
      continue;
    const code = String(query.options?.code ?? "");
    if (!isStaticTrue(query.options?.runOnPageLoad))
      continue;
    const refs2 = new Set([...code.matchAll(QUERY_DATA_REF)].map((match) => match[1]));
    for (const ref of refs2) {
      const source = byRef.get(ref);
      if (!source || source === query)
        continue;
      const isChained = keysOf(source).some((from) => keysOf(query).some((to) => chained.has(`${from}->${to}`)));
      if (isChained) {
        warnings.push(`Query "${query.name}" is already run from "${source.name}"'s success but also has runOnPageLoad on, so it runs twice and the first run reads queries.${ref}.data before it exists. Set runOnPageLoad to false.`);
      } else {
        errors.push(`Query "${query.name}" reads queries.${ref}.data and runs on page load, so it races "${source.name}" and reads undefined on first load (the chart or table it feeds stays empty). Set runOnPageLoad to false and run it from "${source.name}"'s success: a lifecycle { queryRef: "${source.clientRef ?? source.name}", refreshQueryRefs: ["${query.clientRef ?? query.name}"] } or an onDataQuerySuccess run-query event.`);
      }
    }
  }
  return { errors, warnings };
}
function lintChartNumericBindings(pages, queries) {
  const warnings = [];
  const sqlByName = /* @__PURE__ */ new Map();
  for (const query of queries) {
    const sql = query.options?.query;
    if (query.name && typeof sql === "string")
      sqlByName.set(query.name, sql);
  }
  if (!sqlByName.size)
    return warnings;
  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== "Chart")
        continue;
      const properties = component.properties;
      const entry = properties?.data;
      const binding = typeof entry?.value === "string" ? entry.value : typeof entry === "string" ? entry : "";
      if (!binding.includes("{{"))
        continue;
      const yMatch = binding.match(/y\s*:\s*(?:\w+\.)?([A-Za-z_]\w*)/);
      const queryMatch = binding.match(/queries\.([A-Za-z_$][\w$]*)/);
      if (!yMatch || !queryMatch)
        continue;
      const column = yMatch[1];
      const sql = sqlByName.get(queryMatch[1]);
      if (!sql)
        continue;
      const aggregate = new RegExp(`\\b(count|sum|avg|min|max)\\s*\\([^)]*\\)\\s+as\\s+${column}\\b`, "i").test(sql);
      if (!aggregate)
        continue;
      const cast = new RegExp(`(cast\\s*\\(|::\\s*(float|numeric|decimal|int|bigint|double))`, "i").test(sql);
      const coerced = /Number\s*\(|parseFloat\s*\(|parseInt\s*\(|\+\s*r\./.test(binding);
      if (cast || coerced)
        continue;
      warnings.push(`Chart "${component.name ?? component.id}" plots y from "${column}", an uncast SQL aggregate in query "${queryMatch[1]}". Many drivers return numeric aggregates as STRINGS (BigQuery INT64 from COUNT(*) especially), and a Chart given string y values renders blank with no error. Cast in SQL (CAST(... AS FLOAT64) / ::float) or coerce in the binding (y: Number(r.${column})).`);
    }
  }
  return warnings;
}
function lintServerSidePaginationRace(pages, queries) {
  const errors = [];
  const queryByName = /* @__PURE__ */ new Map();
  for (const query of queries)
    if (query.name)
      queryByName.set(query.name, query);
  const propValue = (properties, key2) => {
    const entry = properties?.[key2];
    return entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
  };
  const isTrue = (value) => value === true || typeof value === "string" && value.replace(/\s+/g, "").toLowerCase() === "{{true}}";
  const runsOnPageLoad = (options) => {
    const opts = options;
    return !!opts && (opts.runOnPageLoad === true || opts.runOnPageLoad === "{{true}}");
  };
  const referencedQueryNames = (dataBinding) => {
    if (typeof dataBinding !== "string")
      return [];
    const names = /* @__PURE__ */ new Set();
    for (const match of dataBinding.matchAll(/queries\.([A-Za-z_$][\w$]*)/g))
      names.add(match[1]);
    return [...names];
  };
  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== "Table" || !component.name)
        continue;
      const properties = component.properties;
      if (!isTrue(propValue(properties, "serverSidePagination")))
        continue;
      for (const queryName of referencedQueryNames(propValue(properties, "data"))) {
        const query = queryByName.get(queryName);
        if (!query)
          continue;
        if (runsOnPageLoad(query.options) && containsNamedBinding(query.options, "components", component.name)) {
          errors.push(`Table "${component.name}" uses server-side pagination and its data query "${queryName}" runs on page load while referencing components.${component.name}.* in its SQL. On first load the table is not registered yet, so those bindings resolve to "undefined" and the query fails (e.g. column "undefined" does not exist) \u2014 the table then shows "No data" even though the record count is non-zero. For a bounded result set, prefer client-side pagination: set serverSidePagination:false, bind the table data to the full query, and drop the separate count query. If server-side pagination is genuinely needed, set the data query's runOnPageLoad:false and drive it from the table's onPageChanged/onSearch events so it runs after the table mounts.`);
        }
      }
    }
  }
  return errors;
}
function pagesUsingQuery(summary, name, planPages) {
  if (!summary)
    return [];
  const query = (summary.queries ?? []).find((q) => q.name === name);
  const reads = new RegExp(`queries\\??\\.${name.replace(/[$]/g, "\\$&")}\\b`);
  return (summary.pages ?? []).filter((page) => {
    if (!page.name || planPages.has(page.name))
      return false;
    const ids = new Set(page.components.map((component) => component.id));
    return page.components.some((component) => reads.test(JSON.stringify([component.properties ?? {}, component.styles ?? {}]))) || !!query && (summary.events ?? []).some((event) => !!event.sourceId && (ids.has(event.sourceId) || event.sourceId === page.id) && JSON.stringify(event.event ?? {}).includes(`"${query.id}"`));
  }).map((page) => page.name);
}
function lintPlannedApp(spec, existingSummary, options = {}) {
  const errors = [];
  const warnings = [];
  const checked = [];
  const tables = spec.tables ?? [];
  if (tables.length) {
    checked.push("ToolJet DB table names, columns, foreign keys, reserved names, and dependency order");
    errors.push(...validateTableBatch(tables));
  }
  const seedData = spec.seedData ?? [];
  const seedRows = seedData.reduce((total, seed) => total + seed.rows.length, 0);
  if (seedData.length) {
    checked.push("seed batches have non-empty rows");
    for (const [batchIndex, seed] of seedData.entries()) {
      if (!seed.rows.length)
        errors.push(`Seed data for table "${seed.tableName}" has no rows.`);
      const plannedTable = tables.find((table) => table.tableName.toLowerCase() === seed.tableName.toLowerCase());
      if (plannedTable) {
        errors.push(...invalidPlannedGeneratedPrimaryKeySeeds(plannedTable.columns, seed.rows).map((error) => `Seed data for planned table "${seed.tableName}" (batch ${batchIndex + 1}): ${error}`));
      }
      const columns = plannedTable?.columns ?? [];
      for (const column of columns) {
        if (!/^jsonb?$/i.test(String(column.type ?? "")))
          continue;
        const bad = seed.rows.flatMap((row, index) => {
          const value = row[column.name];
          return value === void 0 || value === null || typeof value === "object" ? [] : [index + 1];
        });
        if (bad.length) {
          errors.push(`Seed data for table "${seed.tableName}": column "${column.name}" is jsonb, so each value must be an object or an array (or null), not ${typeof seed.rows[bad[0] - 1][column.name]}; row(s) ${bad.slice(0, 8).join(", ")}. Store a list as ["a","b"], or make the column string if it holds text.`);
        }
      }
    }
  }
  const queryRefs = /* @__PURE__ */ new Map();
  const queryIds = /* @__PURE__ */ new Map();
  const existingQueries = existingSummary?.queries ?? [];
  const existingQueryNames = /* @__PURE__ */ new Set();
  for (const query of existingQueries) {
    const target = { id: query.id, name: query.name ?? query.id };
    queryRefs.set(query.id, target);
    queryIds.set(query.id, target);
    if (query.name) {
      if (existingQueryNames.has(query.name))
        errors.push(`Existing app has duplicate query name "${query.name}".`);
      existingQueryNames.add(query.name);
      queryRefs.set(query.name, target);
    }
  }
  const plannedQueries = (spec.queries ?? []).map((query, index) => {
    const ref = query.clientRef ?? query.name;
    const id = `planned-query:${index}:${ref}`;
    if (existingQueryNames.has(query.name)) {
      const users = pagesUsingQuery(existingSummary, query.name, new Set((spec.pages ?? []).map((page) => page.name)));
      errors.push(`App already has a query named "${query.name}"` + (users.length ? `, which page${users.length > 1 ? "s" : ""} ${users.map((u) => `"${u}"`).join(", ")} also read${users.length > 1 ? "" : "s"} or run${users.length > 1 ? "" : "s"}. To use it as it is, refer to it by name here without defining it. To change it for every page that reads it, mark this definition update: true.` : ". To use it as it is, refer to it by name without defining it in this plan; to change it, mark this definition update: true."));
    }
    registerRef(queryRefs, ref, { id, name: query.name }, "query", errors);
    if (ref !== query.name)
      registerRef(queryRefs, query.name, { id, name: query.name }, "query", errors);
    queryIds.set(id, { id, name: query.name });
    if (!query.kind) {
      errors.push(`Query "${query.name}" has no resolved datasource kind; pass kind or a resolvable datasource_id + version_id.`);
    }
    const prepared = prepareQueryOptionsForWrite(query.kind, query.options, `Query "${query.name}"`);
    const options2 = prepared.options;
    errors.push(...prepared.errors);
    warnings.push(...prepared.warnings);
    return {
      id,
      name: query.name,
      kind: query.kind,
      data_source_id: query.datasourceId,
      options: options2
    };
  });
  const queries = [...existingQueries, ...plannedQueries];
  if (plannedQueries.length)
    checked.push("datasource query option contracts and duplicate logical query references");
  {
    const loadOrder = lintRunjsLoadOrder(spec);
    errors.push(...loadOrder.errors);
    warnings.push(...loadOrder.warnings);
  }
  const pageRefs = /* @__PURE__ */ new Map();
  const componentRefs = /* @__PURE__ */ new Map();
  const pages = (existingSummary?.pages ?? []).map((page) => ({
    ...page,
    components: page.components.map((component) => ({ ...component }))
  }));
  const componentNameCounts = /* @__PURE__ */ new Map();
  for (const page of pages) {
    bindRef(pageRefs, page.id, { id: page.id, name: page.name ?? page.id });
    if (page.name)
      bindRef(pageRefs, page.name, { id: page.id, name: page.name });
    if (page.handle)
      bindRef(pageRefs, page.handle, { id: page.id, name: page.name ?? page.handle });
    for (const component of page.components) {
      const target = { id: component.id, name: component.name ?? component.id, type: component.type };
      bindRef(componentRefs, component.id, target);
      if (component.name)
        componentNameCounts.set(component.name, (componentNameCounts.get(component.name) ?? 0) + 1);
    }
  }
  for (const page of pages) {
    for (const component of page.components) {
      if (component.name && componentNameCounts.get(component.name) === 1) {
        bindRef(componentRefs, component.name, { id: component.id, name: component.name, type: component.type });
      }
    }
  }
  let componentCount = 0;
  (spec.pages ?? []).forEach((plannedPage, pageIndex) => {
    const pageRef = plannedPage.clientRef ?? plannedPage.name;
    const existingPage = matchPlannedPage(pages, plannedPage.name, new Set((spec.pages ?? []).map((page) => page.name)));
    const pageId = existingPage?.id ?? `planned-page:${pageIndex}:${pageRef}`;
    bindRef(pageRefs, pageRef, { id: pageId, name: plannedPage.name }, "page", errors);
    const iconError = pageIconError(plannedPage.icon);
    if (iconError)
      errors.push(`Page "${plannedPage.name}": ${iconError}`);
    const normalized = (plannedPage.components ?? []).map((component) => {
      const definition = normalizeComponentSpec(component, { stripUnknownKeys: true });
      const geometry = normalizePlannedLayouts(definition.component);
      return { component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
    });
    warnings.push(...normalized.flatMap((item) => item.warnings));
    const expansion = materializeRequiredDefaultChildren(normalized.map((item) => item.component));
    warnings.push(...expansion.warnings);
    const componentLint = lintComponents(expansion.components, options);
    errors.push(...componentLint.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    errors.push(...lintQueryFedCharts(expansion.components, spec.queries ?? []).map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...componentLint.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));
    const references = indexComponentReferences(expansion.components, existingPage?.components);
    errors.push(...references.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    const localRefs = /* @__PURE__ */ new Map();
    const componentEntries = references.components.map((component, componentIndex) => {
      const ref = componentRef(component);
      const id = `planned-component:${pageIndex}:${componentIndex}:${ref}`;
      if ((existingPage?.components ?? []).some((candidate) => candidate.name === component.name)) {
        errors.push(`Page "${plannedPage.name}" already has a component named "${component.name}".`);
      }
      if (localRefs.has(ref))
        errors.push(`Page "${plannedPage.name}" has duplicate component ref "${ref}".`);
      else
        localRefs.set(ref, id);
      registerRef(componentRefs, ref, { id, name: component.name, type: component.type }, "component", errors);
      componentCount += 1;
      return { component, id, originalParentRef: expansion.components[componentIndex].parentRef };
    });
    const plannedComponents = componentEntries.map(({ component, id, originalParentRef }) => {
      let parent;
      if (component.parentRef) {
        parent = localRefs.get(component.parentRef);
        if (!parent) {
          errors.push(`Page "${plannedPage.name}" component "${component.name}" has unknown parent_ref "${component.parentRef}".`);
        }
      } else if (component.parent) {
        if (!originalParentRef)
          warnings.push(`Page "${plannedPage.name}" component "${component.name}" uses persisted parent id "${component.parent}"; its parent relationship cannot be verified in a pre-write plan. Prefer parent_ref.`);
        parent = component.parent;
      }
      if (parent)
        parent = encodeComponentParent(parent, component.slotName);
      return {
        id,
        name: component.name,
        type: component.type,
        properties: component.properties,
        styles: component.styles,
        validation: component.validation,
        others: component.others,
        layouts: component.layouts ?? (component.layout ? { desktop: component.layout, mobile: component.layout } : void 0),
        parent,
        ...component.slotName && component.slotName !== "body" ? { slot_name: component.slotName } : {}
      };
    });
    const pageSummary = existingPage ?? {
      id: pageId,
      name: plannedPage.name,
      handle: plannedPage.name === "Home" ? "home" : slug(plannedPage.name),
      icon: plannedPage.icon,
      components: []
    };
    pageSummary.name = plannedPage.name;
    pageSummary.icon = plannedPage.icon;
    if (plannedPage.hidden !== void 0)
      pageSummary.hidden = plannedPage.hidden;
    pageSummary.components.push(...plannedComponents);
    if (!existingPage)
      pages.push(pageSummary);
  });
  if (pages.length)
    checked.push("page icons, component contracts, bindings, rendered geometry, modal sizing, and nested refs");
  errors.push(...lintServerSidePaginationRace(pages, queries));
  warnings.push(...lintChartNumericBindings(pages, queries));
  const eventSpecs = [];
  const scanners = new Set((spec.pages ?? []).flatMap((p) => (p.components ?? []).filter((c) => c.type === "QrScanner").flatMap((c) => [c.clientRef, c.name].filter(Boolean))));
  (spec.events ?? []).forEach((event, index) => {
    if (event.sourceType === "component" && event.trigger === "onDetect" && scanners.has(String(event.sourceRef)) && !event.action?.debounce) {
      errors.push(`Event[${index}] (QrScanner "${event.sourceRef}" onDetect): add debounce: "300" to the action. The scanner runs onDetect before it sets lastDetectedValue, so an undelayed action reads the previous scan (nothing on the first).`);
    }
    const source = sourceMap(event.sourceType, componentRefs, queryRefs, pageRefs).get(event.sourceRef);
    if (!source)
      errors.push(`Event[${index}] has unknown ${event.sourceType} source_ref "${event.sourceRef}".`);
    eventSpecs.push({
      sourceId: source?.id ?? `missing-source:${event.sourceRef}`,
      sourceType: event.sourceType,
      ref: event.ref,
      trigger: event.trigger,
      action: resolveAction(event.action, queryRefs, pageRefs, componentRefs, errors, `Event[${index}]`),
      name: event.name
    });
  });
  if ((spec.lifecycles ?? []).length) {
    const lifecycleSpecs = (spec.lifecycles ?? []).flatMap((lifecycle, index) => {
      const source = queryRefs.get(lifecycle.queryRef);
      if (!source) {
        errors.push(`Lifecycle[${index}] has unknown query_ref "${lifecycle.queryRef}".`);
        return [];
      }
      return [{
        queryId: source.id,
        refreshQueryIds: resolveRefs(lifecycle.refreshQueryRefs, queryRefs, errors, `Lifecycle[${index}] refresh query`),
        clearComponentIds: resolveRefs(lifecycle.clearComponentRefs, componentRefs, errors, `Lifecycle[${index}] clear component`),
        closeModalId: resolveRef2(lifecycle.closeModalRef, componentRefs, errors, `Lifecycle[${index}] modal`),
        successAlert: lifecycle.successAlert,
        failureAlert: lifecycle.failureAlert,
        beforeRefreshActions: lifecycle.beforeRefreshActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] before refresh action[${actionIndex}]`)),
        successActions: lifecycle.successActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] success action[${actionIndex}]`)),
        failureActions: lifecycle.failureActions?.map((action, actionIndex) => resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] failure action[${actionIndex}]`))
      }];
    });
    try {
      const expanded = expandQueryLifecycles({ app_id: existingSummary?.app_id ?? "planned-app", pages, queries, events: existingSummary?.events ?? [] }, lifecycleSpecs);
      eventSpecs.push(...expanded.events);
      warnings.push(...expanded.warnings);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const summary = {
    app_id: existingSummary?.app_id ?? "planned-app",
    name: existingSummary?.name ?? "Planned app",
    version_id: existingSummary?.version_id ?? "planned-version",
    pages,
    queries,
    events: [
      ...existingSummary?.events ?? [],
      ...eventSpecs.map((event, index) => ({
        id: `planned-event:${index}`,
        name: event.name,
        sourceId: event.sourceId,
        target: event.sourceType,
        event: { eventId: event.trigger, ...event.ref ? { ref: event.ref } : {}, ...event.action }
      }))
    ]
  };
  if (eventSpecs.length) {
    checked.push("event/lifecycle sources, triggers, action ids, and logical targets");
    const eventValidation = validateEvents(
      { ...summary, events: existingSummary?.events ?? [] },
      eventSpecs,
      // apply_app_phase moves a saved page switch behind the handlers a plan adds (navigationReorders).
      { navigationMovedLast: true }
    );
    errors.push(...eventValidation.errors);
    warnings.push(...eventValidation.warnings);
  }
  const structure = validateAppStructure(summary, options);
  const forward = splitForwardComponentRefs(structure.errors, existingQueryNames);
  errors.push(...forward.errors);
  warnings.push(...structure.warnings, ...forward.notes);
  const deduped = dropUnprefixedDuplicates(errors);
  return {
    ok: deduped.length === 0,
    errors: deduped,
    warnings: dropUnprefixedDuplicates(warnings),
    checked,
    not_checked: [
      "server acceptance of writes or external datasource connectivity",
      "query execution results and mutation side effects",
      "browser event delivery, dynamic bindings, and visual rendering"
    ],
    counts: {
      tables: tables.length,
      seed_rows: seedRows,
      pages: spec.pages?.length ?? 0,
      components: componentCount,
      queries: plannedQueries.length,
      events: eventSpecs.length,
      lifecycles: spec.lifecycles?.length ?? 0
    }
  };
}
function splitForwardComponentRefs(structureErrors, existingQueryNames) {
  const errors = [];
  const missing = /* @__PURE__ */ new Map();
  for (const error of structureErrors) {
    const m = error.match(/^Query "([^"]+)" references components\.([^,]+), but no component is named /) ?? error.match(/^RunJS query "([^"]+)" references components\["([^"]+)"\], but no component is named /);
    if (m && existingQueryNames.has(m[1])) {
      const names = missing.get(m[1]) ?? [];
      if (!names.includes(m[2]))
        names.push(m[2]);
      missing.set(m[1], names);
    } else {
      errors.push(error);
    }
  }
  const notes = [...missing].map(([query, names]) => `Query "${query}" reads ${names.map((n) => `components.${n}`).join(", ")}, which no page has yet. Build them on a later page with that exact name, or the query reads undefined.`);
  return { errors, notes };
}
function bindRef(map, ref, value, type, errors) {
  const existing = map.get(ref);
  if (!existing || existing.id === value.id)
    map.set(ref, value);
  else if (type && errors)
    errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
}
function registerRef(map, ref, value, type, errors) {
  if (map.has(ref))
    errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
  else
    map.set(ref, value);
}
function sourceMap(sourceType, components, queries, pages) {
  if (sourceType === "data_query")
    return queries;
  if (sourceType === "page")
    return pages;
  return components;
}
function resolveAction(raw, queries, pages, components, errors, label) {
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === "run-query" ? action.queryId ?? action.queryName : void 0);
  if (Object.values(action).some((value) => typeof value === "string" && /^planned-(query|page|component):/.test(value))) {
    errors.push(`${label}: synthetic planned ids cannot be saved. Use action.target_ref with the logical client_ref or name.`);
    return action;
  }
  if (targetRef === void 0)
    return action;
  if (typeof targetRef !== "string") {
    errors.push(`${label} target_ref must be a string.`);
    return action;
  }
  const actionId = action.actionId;
  const target = actionId === "run-query" ? queries.get(targetRef) : actionId === "switch-page" ? pages.get(targetRef) : ["show-modal", "close-modal", "control-component", "set-table-page", "scroll-component-into-view"].includes(String(actionId)) ? components.get(targetRef) : void 0;
  if (!target) {
    errors.push(`${label} action "${String(actionId)}" has unknown or unsupported target_ref "${targetRef}".`);
    return action;
  }
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
function resolveRefs(refs2, map, errors, label) {
  return refs2?.flatMap((ref) => {
    const value = map.get(ref);
    if (!value) {
      errors.push(`${label} ref "${ref}" does not exist.`);
      return [];
    }
    return [value.id];
  });
}
function resolveRef2(ref, map, errors, label) {
  if (!ref)
    return void 0;
  const value = map.get(ref);
  if (!value) {
    errors.push(`${label} ref "${ref}" does not exist.`);
    return void 0;
  }
  return value.id;
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "page";
}
function unique2(values) {
  return [...new Set(values)];
}
function dropUnprefixedDuplicates(values) {
  const distinct = unique2(values);
  const stripped = new Set(distinct.map((value) => value.replace(/^Page "[^"]*": /, "")).filter((value, i) => value !== distinct[i]));
  return distinct.filter((value) => value.startsWith('Page "') || !stripped.has(value));
}
function missingCreateRowColumns(options, columns) {
  if (options.operation !== "create_row")
    return;
  const map = options.create_row;
  if (!map || typeof map !== "object" || Array.isArray(map))
    return;
  const entries = Object.values(map);
  if (entries.some((entry) => !entry || typeof entry !== "object" || typeof entry.column !== "string" || !entry.column || entry.column.includes("{{")))
    return;
  const supplied = new Set(entries.filter((entry) => entry.value !== void 0 && entry.value !== null).map((entry) => entry.column));
  return columns.filter((column) => (column.primaryKey || column.notNull) && column.defaultValue == null && !/^(smallserial|serial|bigserial|serial2|serial4|serial8)$/i.test(column.type) && !supplied.has(column.name)).map((column) => column.name);
}
function bulkPrimaryKeyWarning(kind, options, tableName, columns) {
  if (kind !== "tooljetdb" || options.operation !== "bulk_upsert_with_primary_key" || !columns?.length)
    return;
  const config = options.bulk_upsert_with_primary_key;
  const keys = config?.primary_key;
  if (!Array.isArray(keys) || !keys.length || keys.some((key2) => typeof key2 !== "string" || key2.includes("{{")))
    return;
  const invalid = keys.filter((key2) => !columns.some((column) => column.name === key2 && column.primaryKey));
  if (!invalid.length)
    return;
  return `bulk_upsert_with_primary_key for "${tableName}" targets non-primary-key column(s) ${invalid.map((key2) => JSON.stringify(key2)).join(", ")}. This operation requires actual PRIMARY KEY columns; a UNIQUE business reference is not sufficient. Use the real primary key, or a supported conditional SQL upsert that preserves the intended matching and concurrency rules. Do not recreate an existing table or change its primary key merely to repair this query.`;
}
function updateRowsCompatibilityWarning(kind, options, tableName, columns) {
  if (kind !== "tooljetdb" || options.operation !== "update_rows" || !columns?.length)
    return;
  if (columns.includes("id"))
    return;
  return `Table "${tableName}" has no id column, but this query uses update_rows. ToolJet deployments that append order=id to the PATCH will fail even when the filter uses the correct custom primary key. For a new schema, prefer the automatically generated serial id and keep the business reference as a separate unique column. For an existing schema, inspect the primary key and the bulk_update_with_primary_key contract. Use that operation only if it preserves the requested targeting: never drop expected-state, ownership, tenant, or other where_filters to convert the query. If extra predicates are required, use a supported conditional-write operation or report the capability gap. Do not recreate existing tables or execute a mutation just to test compatibility.`;
}
async function inspectUpdateCompatibility(client, queries) {
  const targets = queries.filter((query) => query.kind === "tooljetdb" && ["update_rows", "create_row", "bulk_upsert_with_primary_key"].includes(String(query.options.operation)));
  if (!targets.length)
    return [];
  let tables;
  try {
    tables = await client.listTables();
  } catch {
    return ["Structured-write schema compatibility was not checked: table metadata could not be read."];
  }
  const schemas = /* @__PURE__ */ new Map();
  return (await Promise.all(targets.map(async (query) => {
    const tableId = query.options.table_id;
    if (typeof tableId !== "string" || tableId.includes("{{")) {
      return `Query "${query.name}": structured-write schema compatibility was not checked for a dynamic or missing table_id.`;
    }
    const table = tables.find((item) => item.id === tableId);
    if (!table)
      return `Query "${query.name}": structured-write schema compatibility was not checked: table_id was not found in workspace metadata.`;
    if (!schemas.has(tableId))
      schemas.set(tableId, Promise.resolve().then(() => client.getTableSchema(table.table_name)).catch(() => void 0));
    const schema = await schemas.get(tableId);
    if (!schema?.length)
      return `Query "${query.name}": structured-write schema compatibility was not checked because the schema for "${table.table_name}" was unavailable or empty.`;
    const missing = missingCreateRowColumns(query.options, schema.map((column) => ({
      name: column.name,
      type: column.type,
      primaryKey: column.isPrimaryKey,
      notNull: column.isNotNull,
      defaultValue: column.defaultValue
    })));
    const warning = missing?.length ? `create_row for "${table.table_name}" omits required non-generated column(s) ${missing.map((name) => JSON.stringify(name)).join(", ")}. Seed records do not supply values for future inserts. Supply required values or verify an existing database trigger; metadata does not verify triggers. Do not recreate tables to repair this query.` : bulkPrimaryKeyWarning("tooljetdb", query.options, table.table_name, schema.map((column) => ({ name: column.name, primaryKey: column.isPrimaryKey }))) ?? updateRowsCompatibilityWarning("tooljetdb", query.options, table.table_name, schema.map((column) => column.name));
    const arithmetic = arithmeticWriteWarning(query.kind, query.options);
    const combined = [warning, arithmetic].filter(Boolean).join(" ");
    return combined ? `Query "${query.name}": ${combined}` : void 0;
  }))).filter((warning) => !!warning);
}
function normalizePlanBindingAliases(plan, existing, datasourceKinds = /* @__PURE__ */ new Map(), datasourceNames = /* @__PURE__ */ new Map()) {
  const components = (plan.pages ?? []).flatMap((page) => page.components ?? []);
  const aliases = (items, savedNames) => {
    const counts = /* @__PURE__ */ new Map();
    for (const name of [...savedNames, ...items.map((item) => item.name)])
      counts.set(name, (counts.get(name) ?? 0) + 1);
    const candidates = /* @__PURE__ */ new Map();
    for (const item of items)
      if (item.client_ref && item.client_ref !== item.name) {
        candidates.set(item.client_ref, [...candidates.get(item.client_ref) ?? [], item.name]);
      }
    return new Map([...candidates].flatMap(([alias, names]) => names.length === 1 && !counts.has(alias) && counts.get(names[0]) === 1 ? [[alias, names[0]]] : []));
  };
  const maps = {
    components: aliases(components, (existing?.pages ?? []).flatMap((page) => page.components.flatMap((c) => c.name ? [c.name] : []))),
    queries: aliases(plan.queries ?? [], (existing?.queries ?? []).flatMap((q) => q.name ? [q.name] : []))
  };
  const changed = /* @__PURE__ */ new Set();
  const rewrite = (code) => {
    const edits = ["components", "queries"].flatMap((namespace) => namespaceReads(code, namespace).flatMap((read) => {
      const target = maps[namespace].get(read.name);
      if (!target)
        return [];
      changed.add(`${namespace}[${JSON.stringify(read.name)}] \u2192 ${namespace}[${JSON.stringify(target)}]`);
      return [{ ...read, text: `${namespace}${read.optional ? "?." : ""}[${JSON.stringify(target)}]` }];
    }));
    for (const edit of edits.sort((a, b) => b.start - a.start))
      code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
    return code;
  };
  const values = (value) => {
    if (typeof value === "string") {
      let result = value;
      for (const span of bindingSpans(value).reverse()) {
        const source = `(${span.body})`;
        const normalized = rewrite(source);
        if (source !== normalized)
          result = result.slice(0, span.start) + `{{${normalized.slice(1, -1)}}}` + result.slice(span.end);
      }
      return result;
    }
    if (Array.isArray(value))
      return value.map(values);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key2, child]) => [key2, values(child)]));
    return value;
  };
  for (const component of components) {
    for (const section of ["properties", "styles", "validation", "others"]) {
      if (component[section])
        component[section] = values(component[section]);
    }
  }
  for (const query of plan.queries ?? []) {
    const kind = datasourceKinds.get(query.datasource_id ?? "") ?? datasourceNames.get(query.datasource_name ?? "") ?? query.kind;
    const originalCode = query.options.code;
    const hasCode = Object.hasOwn(query.options, "code");
    const { code: _code, ...otherOptions } = query.options;
    query.options = values(kind === "runjs" ? otherOptions : query.options);
    if (kind === "runjs" && hasCode) {
      query.options.code = typeof originalCode === "string" ? rewrite(originalCode) : originalCode;
    }
  }
  for (const event of plan.events ?? [])
    event.action = values(event.action);
  for (const lifecycle of plan.lifecycles ?? []) {
    for (const key2 of ["before_refresh_actions", "success_actions", "failure_actions"]) {
      if (lifecycle[key2])
        lifecycle[key2] = values(lifecycle[key2]);
    }
    for (const key2 of ["success_alert", "failure_alert"]) {
      if (lifecycle[key2])
        lifecycle[key2] = values(lifecycle[key2]);
    }
  }
  return [...changed].map((change) => `Resolved explicit binding alias ${change}; the submitted definitions now use the runtime name. No inferred names were rewritten.`);
}
var stable2 = (value) => JSON.stringify(value, (_key, inner) => inner && typeof inner === "object" && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : inner);
function restatedQueryNames(summary, queries, tables, datasources) {
  const restated = [];
  for (const query of queries) {
    const held = summary.queries.filter((existing2) => existing2.name === query.name);
    if (held.length !== 1)
      continue;
    const existing = held[0];
    const named = query.datasource_name !== void 0 ? datasources.filter((source) => source.name === query.datasource_name) : [];
    const datasource = query.datasource_id !== void 0 ? datasources.find((source) => source.id === query.datasource_id) : named.length === 1 ? named[0] : void 0;
    if (!datasource || datasource.id !== existing.data_source_id)
      continue;
    const options = structuredClone(query.options ?? {});
    if (query.table_ref) {
      const table = tables.find((candidate) => candidate.table_name.toLowerCase() === query.table_ref.toLowerCase());
      if (!table)
        continue;
      options.table_id = table.id;
    }
    const prepared = prepareQueryOptionsForWrite(datasource.kind, options, `Query "${query.name}"`);
    if (prepared.errors.length)
      continue;
    if (stable2(prepared.options) === stable2(existing.options ?? {}))
      restated.push(query.name);
  }
  return restated;
}
async function mapKeyRefusal(client, componentTypes) {
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
  return "This ToolJet instance has no Google Maps API key (GOOGLE_MAPS_API_KEY), so a Map component shows a Google error instead of a map. Show the locations in a Table (a link column to https://www.google.com/maps?q=<lat>,<lng> opens each one), and tell the user in your reply that an in-app map needs the Google Maps API key on the instance.";
}
var TABLE_NAME_MAX = 31;
function unique3(values) {
  return [...new Set(values)];
}
function lintAppSpecTool(client) {
  return {
    name: "lint_app_spec",
    title: "Lint App Spec (Dry Run)",
    // The dry run half of the governed phase: it never mutates ToolJet.
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "Validate a proposed app definition and return diagnostics plus a temporary plan token. Reads existing app/schema metadata only; does not apply the proposal, execute embedded SQL/code, invoke datasource operations, or call the mutations described by the proposal. Dry-run an exact app phase before any writes. It validates optional ToolJet DB tables/seed_data, datasource queries, pages/components, events, and concise query lifecycles together. Give pages, queries, and components stable client_ref values; events use source_ref and targeted actions use target_ref. A query can use table_ref to resolve a planned/existing ToolJet DB table by its actual table_name into options.table_id (not a client_ref or alias). For each query use either the exact datasource_id or the exact unique datasource_name from list_datasources(version_id); names are pinned to IDs during this preflight, never guessed from kind. Set app_name when the target app should be renamed in the same governed phase. For repair/continuation phases, pass app_id so persisted page/component/query refs are included and can be targeted without redeclaring them. To rebuild an existing page whole, mark its plan page replace: true (with app_id): the plan is checked against the app with that page emptied, the page's own queries may be defined again (updated in place on apply), and a component another page, event or query still reads must be kept under its name. A Form submits through a Button inside it: set the Form's properties.buttonToSubmit to that Button's client_ref in the same plan (resolved to its id on apply). On success it returns a one-time 30-minute plan_token for apply_app_phase. Treat this call as an awaited barrier; it never mutates ToolJet. " + COMPONENT_FX_GUIDANCE,
    inputSchema: appPlanSchema.shape,
    async handler(args) {
      try {
        if (!args.app_name && ![args.tables, args.seed_data, args.queries, args.pages, args.events, args.lifecycles].some((items) => items?.length)) {
          return fail(new Error("lint_app_spec needs at least one table, seed_data batch, query, page, event, or lifecycle."));
        }
        const columnless = (args.tables ?? []).filter((table) => !Array.isArray(table.columns));
        if (columnless.length) {
          return fail(new Error(`tables: ${columnless.map((t) => `"${t.table_name ?? "?"}"`).join(", ")} has no columns. List only new tables here, each with its columns; an existing table needs no entry (queries reach it by table_ref).`));
        }
        const preflightErrors = [];
        const preflightWarnings = [];
        const replacePages = (args.pages ?? []).filter((page) => page.replace).map((page) => `"${page.name}"`);
        if (replacePages.length && !args.app_id) {
          preflightErrors.push(`pages ${replacePages.join(", ")}: replace needs app_id, so the plan is checked against the page it replaces.`);
        }
        const mapRefusal = await mapKeyRefusal(client, (args.pages ?? []).flatMap((page) => (page.components ?? []).map((c) => String(c.type))));
        if (mapRefusal)
          preflightErrors.push(mapRefusal);
        const needsTables = Boolean(args.tables?.length || args.seed_data?.length || args.queries?.some((query) => query.table_ref || typeof query.options?.table_id === "string"));
        const [existingTables, fetchedSummary] = await Promise.all([
          needsTables ? client.listTables() : Promise.resolve([]),
          args.app_id ? client.getAppSummary(args.app_id) : Promise.resolve(void 0)
        ]);
        const frozen = frozenAppRefusal(fetchedSummary);
        if (frozen)
          return fail(new Error(frozen));
        const plannedNames = /* @__PURE__ */ new Map();
        for (const table of args.tables ?? []) {
          const key2 = table.table_name.toLowerCase();
          if (plannedNames.has(key2))
            return fail(new Error(`Ambiguous planned table name "${table.table_name}": table names must be unique ignoring case.`));
          plannedNames.set(key2, table.table_name);
        }
        const existingNames = /* @__PURE__ */ new Map();
        const ambiguousNames = /* @__PURE__ */ new Set();
        for (const table of existingTables) {
          const key2 = table.table_name.toLowerCase();
          if (existingNames.has(key2))
            ambiguousNames.add(key2);
          existingNames.set(key2, table.table_name);
        }
        const existingExact = new Set(existingTables.map((table) => table.table_name));
        const canonicalTableName = (name) => {
          const key2 = name.toLowerCase();
          if (ambiguousNames.has(key2) && !existingExact.has(name))
            throw new Error(`Ambiguous existing table name "${name}": multiple workspace tables match ignoring case. No plan token was issued.`);
          return plannedNames.get(key2) ?? (existingExact.has(name) ? name : existingNames.get(key2)) ?? name;
        };
        for (const name of plannedNames.values())
          canonicalTableName(name);
        for (const seed of args.seed_data ?? [])
          seed.table_name = canonicalTableName(seed.table_name);
        for (const query of args.queries ?? [])
          if (query.table_ref)
            query.table_ref = canonicalTableName(query.table_ref);
        for (const table of args.tables ?? []) {
          for (const fk of table.foreign_keys ?? []) {
            const ref = fk;
            for (const field of ["referencedTable", "referenced_table", "references_table"]) {
              if (typeof ref[field] === "string")
                ref[field] = canonicalTableName(ref[field]);
            }
          }
        }
        const hasSql = args.queries?.some((query) => query.options?.operation === "sql_execution" || query.options?.sql_execution !== void 0);
        const datasources = args.queries?.length && args.version_id ? await client.listDatasources(args.version_id) : [];
        if (fetchedSummary && args.queries?.length) {
          const restated = restatedQueryNames(fetchedSummary, args.queries.filter((query) => !query.table_ref || !plannedNames.has(query.table_ref.toLowerCase())), existingTables, datasources);
          if (restated.length) {
            args.queries = args.queries.filter((query) => !restated.includes(query.name));
            preflightWarnings.push(`${restated.map((name) => `"${name}"`).join(", ")}: already in the app exactly as written here, so the plan uses the existing quer` + (restated.length > 1 ? "ies" : "y") + " and defines nothing again.");
          }
          const planPages = new Set((args.pages ?? []).map((page) => page.name));
          for (const query of args.queries.filter((candidate) => candidate.update)) {
            const users = pagesUsingQuery(fetchedSummary, query.name, planPages);
            if (users.length) {
              preflightWarnings.push(`Query "${query.name}" is updated in place, and page${users.length > 1 ? "s" : ""} ${users.map((user) => `"${user}"`).join(", ")} also read${users.length > 1 ? "" : "s"} it: keep the fields they use.`);
            }
          }
        }
        const view = fetchedSummary ? replaceView(fetchedSummary, args) : void 0;
        const existingSummary = view?.summary ?? fetchedSummary;
        if (view && fetchedSummary)
          preflightErrors.push(...danglingAfterReplace(fetchedSummary, view, args));
        if (args.version_id && existingSummary?.version_id && args.version_id !== existingSummary.version_id) {
          preflightErrors.push(`App "${args.app_id}" editing version is "${existingSummary.version_id}", not "${args.version_id}".`);
        }
        const tableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        const reservedTableNames = new Map([...tableIds, ...plannedNames]);
        const plannedNew = new Set((args.tables ?? []).map((table) => table.table_name.toLowerCase()));
        const seededExisting = [...new Set((args.seed_data ?? []).map((seed) => seed.table_name))].filter((name) => tableIds.has(name.toLowerCase()) && !plannedNew.has(name.toLowerCase()));
        const withRows = await Promise.all(seededExisting.map(async (name) => await client.hasRows?.(tableIds.get(name.toLowerCase())).catch(() => void 0) === true ? name : void 0));
        for (const name of withRows.filter(Boolean)) {
          preflightErrors.push(`Seed data targets "${name}", which already has rows (seeded earlier), so they would be inserted again: leave that table out of seed_data. To add more rows to it, call insert_rows_batch with only the new rows.`);
        }
        for (const table of args.tables ?? []) {
          const key2 = table.table_name.toLowerCase();
          if (tableIds.has(key2)) {
            if (hasSql) {
              preflightErrors.push(`Planned table "${table.table_name}" already exists and this plan contains SQL queries. Rename the planned table and update all SQL references, seed data, table_ref and foreign keys together, then lint again. To reuse the existing table, remove it from tables instead.`);
              continue;
            }
            const oldName = table.table_name;
            const newName = nextTableName(oldName, reservedTableNames);
            reservedTableNames.set(newName.toLowerCase(), newName);
            table.table_name = newName;
            for (const seed of args.seed_data ?? [])
              if (seed.table_name === oldName)
                seed.table_name = newName;
            for (const query of args.queries ?? [])
              if (query.table_ref === oldName)
                query.table_ref = newName;
            for (const other of args.tables ?? []) {
              for (const fk of other.foreign_keys ?? []) {
                const ref = fk;
                for (const field of ["referencedTable", "referenced_table", "references_table"]) {
                  if (ref[field] === oldName)
                    ref[field] = newName;
                }
              }
            }
            preflightWarnings.push(`Planned table "${oldName}" already exists in this workspace, so it is created as "${newName}"; seed data, table_ref and foreign keys were updated to match. To reuse the existing table instead, drop it from tables and point queries at it with table_ref.`);
            tableIds.set(newName.toLowerCase(), `planned-table:${newName}`);
          } else
            tableIds.set(key2, `planned-table:${table.table_name}`);
        }
        preflightWarnings.push(...autoFitHtmlHeights(args));
        if (existingSummary) {
          const plannedNames2 = new Set((args.pages ?? []).map((page) => page.name.toLowerCase()));
          const createsPages = (args.pages ?? []).some((page) => !existingSummary.pages.some((existing) => existing.name?.toLowerCase() === page.name.toLowerCase() || page.name === "Home" && existing.handle === "home"));
          const abandoned = existingSummary.pages.filter((page) => page.components.length === 0 && page.handle !== "home" && page.name && !plannedNames2.has(page.name.toLowerCase()));
          if (createsPages && abandoned.length) {
            preflightErrors.push(`App already has ${abandoned.length} empty page(s) this plan does not touch: ${abandoned.map((page) => `"${page.name}"`).join(", ")}. Build on them (use the exact existing name in pages[]) or delete them with delete_page before creating new pages, so the app does not end up with duplicates.`);
          }
        }
        const plannedTables = new Map((args.tables ?? []).map((table) => [table.table_name.toLowerCase(), table]));
        for (const seed of args.seed_data ?? []) {
          if (!tableIds.has(seed.table_name.toLowerCase())) {
            preflightErrors.push(`Seed data targets unknown planned/existing table "${seed.table_name}".`);
          }
          const plannedTable = plannedTables.get(seed.table_name.toLowerCase());
          if (plannedTable) {
            preflightErrors.push(...invalidSeedTimestamps(plannedTable.columns, seed.rows).map((error) => `Seed data for planned table "${seed.table_name}": ${error}`));
            const requiredColumns = plannedTable.columns.filter((column) => (column.primaryKey || column.notNull) && column.defaultValue === void 0 && !/serial/i.test(column.type));
            for (const column of requiredColumns) {
              const missingRows = seed.rows.reduce((indexes, row, index) => {
                if (!(column.name in row) || row[column.name] === null || row[column.name] === void 0) {
                  indexes.push(index + 1);
                }
                return indexes;
              }, []);
              if (!missingRows.length)
                continue;
              if (column.primaryKey && /^(integer|bigint|int|int4|int8)$/i.test(column.type) && (args.seed_data ?? []).filter((batch) => batch.table_name.toLowerCase() === seed.table_name.toLowerCase()).every((batch) => batch.rows.every((row) => !(column.name in row)))) {
                const originalType = column.type;
                column.type = "serial";
                preflightWarnings.push(`Planned table "${seed.table_name}": primary key "${column.name}" was declared ${JSON.stringify(originalType)} with no value in any seed row, so it is created as "serial" (auto-generated). Omit it from inserts.`);
                continue;
              }
              const nullRows = missingRows.filter((n) => column.name in seed.rows[n - 1]);
              const absentRows = missingRows.filter((n) => !nullRows.includes(n));
              if (nullRows.length) {
                preflightErrors.push(`Seed data for planned table "${seed.table_name}": required column "${column.name}" is null in row(s) ${nullRows.join(", ")}. Give each of those rows a real value (seed rows are literal values, not formulas), or add a defaultValue.`);
              }
              if (absentRows.length) {
                preflightErrors.push(`Seed data for planned table "${seed.table_name}" omits required non-generated column "${column.name}" in row(s) ${absentRows.join(", ")}. Use type "serial" for a generated key, add a defaultValue, or provide explicit values.`);
              }
            }
          }
        }
        if (args.queries?.length && !args.version_id) {
          preflightErrors.push("version_id is required when a plan contains queries.");
        }
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        const uniqueDatasourceNames = new Map(datasources.filter((source) => datasources.filter((other) => other.name === source.name).length === 1).map((source) => [source.name, source.kind]));
        preflightWarnings.push(...normalizePlanBindingAliases(args, existingSummary, datasourceKinds, uniqueDatasourceNames));
        const resolvedQueryIds = /* @__PURE__ */ new Map();
        const queries = (args.queries ?? []).map((query, index) => {
          let datasourceId = query.datasource_id;
          const hasId = query.datasource_id !== void 0;
          const hasName = query.datasource_name !== void 0;
          if (hasId === hasName) {
            preflightErrors.push(`Query "${query.name}" must provide exactly one of datasource_id or datasource_name.`);
          } else if (hasName) {
            const matches = datasources.filter((source) => source.name === query.datasource_name);
            if (!query.datasource_name || matches.length !== 1) {
              preflightErrors.push(`Query "${query.name}" datasource_name "${query.datasource_name}" must match exactly one source in this version (found ${matches.length}). Use the exact name or id returned by list_datasources(version_id).`);
            } else
              datasourceId = matches[0].id;
          }
          const datasourceKind = datasourceKinds.get(datasourceId ?? "");
          if (args.version_id && !datasourceKind) {
            preflightErrors.push(`Query "${query.name}" datasource "${datasourceId ?? query.datasource_name ?? ""}" is not available.`);
          }
          if (datasourceId && datasourceKind)
            resolvedQueryIds.set(index, datasourceId);
          if (query.kind && datasourceKind && query.kind !== datasourceKind) {
            preflightErrors.push(`Query "${query.name}" kind "${query.kind}" does not match datasource kind "${datasourceKind}".`);
          }
          const options = structuredClone(query.options);
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId)
              preflightErrors.push(`Query "${query.name}" has unknown table_ref "${query.table_ref}". Use the actual table_name from tables[] or list_tables, not a client_ref, alias, or UUID.`);
            else
              options.table_id = tableId;
          } else if ((datasourceKind ?? query.kind) === "tooljetdb" && typeof options.table_id === "string") {
            const known = new Set(existingTables.map((table) => table.id));
            if (!known.has(options.table_id)) {
              const prefix = options.table_id.slice(0, 8);
              const nearest = existingTables.filter((table) => table.id.startsWith(prefix)).map((table) => `${table.table_name} (${table.id})`);
              preflightErrors.push(`Query "${query.name}": table_id "${options.table_id}" is not a table in this workspace` + (nearest.length ? `; the closest id is ${nearest.join(", ")}` : "") + ". Use table_ref with the table name and let the server resolve the id instead of copying UUIDs.");
            }
          }
          return {
            clientRef: query.client_ref,
            datasourceId: datasourceId ?? "",
            name: query.name,
            kind: datasourceKind ?? query.kind,
            options
          };
        });
        const schemas = /* @__PURE__ */ new Map();
        const insertSchemas = /* @__PURE__ */ new Map();
        for (const table of args.tables ?? []) {
          const columns = table.columns.map((column) => column.name);
          if (!table.columns.some((column) => column.primaryKey))
            columns.push("id");
          schemas.set(`planned-table:${table.table_name}`, columns);
          insertSchemas.set(`planned-table:${table.table_name}`, table.columns.some((column) => column.primaryKey) ? table.columns : [...table.columns, { name: "id", type: "serial", primaryKey: true }]);
        }
        const updateTableIds = new Set(queries.filter((query) => query.kind === "tooljetdb" && ["update_rows", "create_row", "bulk_upsert_with_primary_key"].includes(String(query.options.operation)) && typeof query.options.table_id === "string").map((query) => query.options.table_id));
        await Promise.all([...updateTableIds].map(async (tableId) => {
          if (schemas.has(tableId))
            return;
          const table = existingTables.find((item) => item.id === tableId);
          if (!table)
            return;
          try {
            const schema = await client.getTableSchema(table.table_name);
            schemas.set(tableId, schema.map((column) => column.name));
            insertSchemas.set(tableId, schema.map((column) => ({
              name: column.name,
              type: column.type,
              primaryKey: column.isPrimaryKey,
              notNull: column.isNotNull,
              defaultValue: column.defaultValue
            })));
          } catch {
            preflightWarnings.push(`Could not inspect write target "${table.table_name}"; required insert columns were not checked and update_rows primary-key compatibility was not checked. Inspect its schema before relying on the save workflow.`);
          }
        }));
        for (const query of queries) {
          const tableId = query.options.table_id;
          const tableName = existingTables.find((table) => table.id === tableId)?.table_name ?? (args.tables ?? []).find((table) => `planned-table:${table.table_name}` === tableId)?.table_name ?? tableId;
          const warning = updateRowsCompatibilityWarning(query.kind, query.options, tableName, schemas.get(tableId));
          if (warning)
            preflightWarnings.push(`Query "${query.name}": ${warning}`);
          const arithmetic = arithmeticWriteWarning(query.kind, query.options);
          if (arithmetic)
            preflightWarnings.push(`Query "${query.name}": ${arithmetic}`);
          const bulkWarning = bulkPrimaryKeyWarning(query.kind, query.options, tableName, insertSchemas.get(tableId));
          if (bulkWarning)
            (tableId.startsWith("planned-table:") ? preflightErrors : preflightWarnings).push(`Query "${query.name}": ${bulkWarning}`);
          if (query.kind === "tooljetdb" && insertSchemas.has(tableId)) {
            const missing = missingCreateRowColumns(query.options, insertSchemas.get(tableId));
            if (missing?.length) {
              const message = `Query "${query.name}": create_row for "${tableName}" omits required non-generated column(s) ${missing.map((name) => JSON.stringify(name)).join(", ")}. Seed rows do not supply values for future user-created records. Include the required values in this insert, or use a generated/defaulted key when designing a new table. Never recreate an existing table or change its key merely to fix this query.`;
              if (tableId.startsWith("planned-table:"))
                preflightErrors.push(message);
              else
                preflightWarnings.push(message + " Metadata does not verify database triggers; if an existing trigger supplies these fields, confirm that contract instead.");
            }
          }
        }
        const canvasColor = args.app_id ? await literalCanvasColor(client, args.app_id, existingSummary?.version_id ?? args.version_id) : void 0;
        const lint = lintPlannedApp({
          tables: args.tables?.map((table) => ({
            tableName: table.table_name,
            columns: table.columns,
            foreignKeys: table.foreign_keys
          })),
          seedData: args.seed_data?.map((seed) => ({ tableName: seed.table_name, rows: seed.rows })),
          queries,
          pages: args.pages?.map((page) => ({
            clientRef: page.client_ref,
            name: page.name,
            icon: page.icon,
            hidden: page.hidden,
            components: page.components?.map((component) => ({
              name: component.name,
              type: component.type,
              properties: component.properties,
              styles: component.styles,
              validation: component.validation,
              others: component.others,
              layout: component.layout,
              layouts: component.layouts,
              clientRef: component.client_ref,
              parentRef: component.parent_ref,
              parent: component.parent,
              slotName: component.slot_name
            }))
          })),
          events: args.events?.map((event) => ({
            sourceRef: event.source_ref,
            sourceType: event.source_type,
            ref: event.ref,
            trigger: event.trigger,
            action: event.action,
            name: event.name
          })),
          lifecycles: args.lifecycles?.map((lifecycle) => ({
            queryRef: lifecycle.query_ref,
            beforeRefreshActions: lifecycle.before_refresh_actions,
            refreshQueryRefs: lifecycle.refresh_query_refs,
            clearComponentRefs: lifecycle.clear_component_refs,
            closeModalRef: lifecycle.close_modal_ref,
            successAlert: lifecycle.success_alert ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type } : void 0,
            failureAlert: lifecycle.failure_alert ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type } : void 0,
            successActions: lifecycle.success_actions,
            failureActions: lifecycle.failure_actions
          }))
        }, existingSummary, { canvasColor });
        const result = {
          ...lint,
          ok: lint.ok && preflightErrors.length === 0,
          errors: unique3([...preflightErrors, ...lint.errors]),
          warnings: unique3([...preflightWarnings, ...lint.warnings])
        };
        if (!result.ok)
          return ok(result);
        const resolvedSpec = { ...args, queries: args.queries?.map((query, index) => {
          const { datasource_name: _name, ...rest } = query;
          return { ...rest, datasource_id: resolvedQueryIds.get(index) };
        }) };
        const stored = storeAppPlan(resolvedSpec, result, view && fetchedSummary ? replaceFingerprint(fetchedSummary, view) : void 0);
        return ok({ ...result, ...stored });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function nextTableName(name, taken) {
  for (let n = 2; n < 100; n++) {
    const suffix = `_${n}`;
    const candidate = `${name.slice(0, Math.max(1, TABLE_NAME_MAX - suffix.length))}${suffix}`;
    if (!taken.has(candidate.toLowerCase()))
      return candidate;
  }
  return `${name.slice(0, TABLE_NAME_MAX - 7)}_${Date.now().toString(36).slice(-6)}`;
}
function autoFitHtmlHeights(args) {
  const warnings = [];
  for (const page of args.pages ?? []) {
    const components = page.components ?? [];
    for (const component of components) {
      if (component.type !== "Html")
        continue;
      const rect = component.layouts?.desktop ?? component.layout;
      if (!rect || typeof rect.height !== "number" || typeof rect.top !== "number")
        continue;
      const fix = suggestedHtmlHeight(component);
      if (!fix)
        continue;
      const delta = fix.to - fix.from;
      const oldBottom = rect.top + fix.from;
      const parentOf = (c) => c.parent_ref ?? c.parent ?? "";
      const moved = [];
      for (const sibling of components) {
        if (sibling === component || parentOf(sibling) !== parentOf(component))
          continue;
        for (const r of [sibling.layout, sibling.layouts?.desktop, sibling.layouts?.mobile]) {
          if (r && typeof r.top === "number" && r.top >= oldBottom - 4)
            r.top += delta;
        }
        const r0 = sibling.layouts?.desktop ?? sibling.layout;
        if (r0 && typeof r0.top === "number" && r0.top - delta >= oldBottom - 4)
          moved.push(sibling.name ?? sibling.client_ref ?? "?");
      }
      for (const r of [component.layout, component.layouts?.desktop])
        if (r && typeof r.height === "number")
          r.height = fix.to;
      warnings.push(`Page "${page.name}": Html "${component.name ?? component.client_ref ?? "?"}" needed about ${fix.needed}px for its markup but was ${fix.from}px, so its height is now ${fix.to}px` + (moved.length ? ` and ${moved.length} component(s) below it moved down ${delta}px (${[...new Set(moved)].join(", ")})` : "") + ". The plan was applied with these values.");
    }
  }
  return warnings;
}
var renameAppInput = external_exports.object({ app_id: external_exports.string().min(1), version_id: external_exports.string().min(1), name: appPlanSchema.shape.app_name.unwrap() }).strict();
function renameAppTool(client) {
  const lint = lintAppSpecTool(client).handler;
  const apply = applyAppPhaseTool(client).handler;
  return {
    name: "rename_app",
    title: "Rename App",
    description: "Rename one existing app through its editable version. Uses the same preflight, name-collision handling, scoped one-use plan, and readback as apply_app_phase, with no table, page, query, component, or event edits. Returns the persisted app result; does not execute queries.",
    strictInput: true,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    inputSchema: renameAppInput.shape,
    async handler(input) {
      try {
        const args = renameAppInput.parse(input);
        const result = await lint({ app_id: args.app_id, version_id: args.version_id, app_name: args.name });
        if (result.isError)
          return result;
        const planned = JSON.parse(result.content[0].text);
        if (!planned.plan_token)
          return { ...result, isError: true };
        return await apply({ app_id: args.app_id, version_id: args.version_id, plan_token: planned.plan_token, check_reads: false });
      } catch (error) {
        return fail(error);
      }
    }
  };
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
function resolveAction2(raw, pages, queries, components) {
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
  return Object.entries(applied).map(([key2, value]) => `${key2}=${value}`).join(", ");
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
      openWorldHint: false
    },
    description: "Apply one app-authoring plan, whose operations are also exposed as rename_app, create_tables, insert_rows_batch, add_pages/update_pages/delete_page, add_queries/update_query, add_components/update_components/delete_components, update_layout, add_events/update_events/delete_event, and add_query_lifecycles. Saving a query or event definition does not execute it. The optional read check described below is the only query execution in this tool. Consume one successful lint_app_spec plan_token and apply that exact phase once. The tool resolves logical refs, creates tables/pages/queries in dependency order, seeds rows, creates independent page component batches concurrently, combines ordinary events and mutation lifecycles into one bulk write, then returns persisted structural/contract validation. It then runs the proven read queries the phase created or updated once and reports them in read_check (failed: fix the query; inconclusive: the read takes a component value a browser-free run leaves empty; not_run: writes, remote or paid calls and RunJS, which are never run here). A failing read does not fail the phase. ToolJet has no cross-resource transaction: a rare upstream partial failure reports the completed stage/counts and never auto-deletes user data, except for a plan page marked replace: that page ends up holding exactly the plan's components. It is written as a difference: a component the plan leaves as it is is not rewritten, one that only moved is moved, one that changed is created again under its own id, and one the plan drops is deleted, with the events on the page's components replaced by the plan's (page events and query events only where the plan declares them again); queries the plan defines again are updated in place keeping their ids. A replace is refused before any write if the page changed since lint (any component, redefined query or related event edited), and every component and event ref is prepared before the first write. A replace is not atomic: a failure midway leaves the page to be repaired (the result says what was removed; there is no rollback), so use replace on draft or otherwise recoverable pages. The one-time token prevents an accidental retry from duplicating objects.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string().optional().describe("Defaults to the version the plan was linted for."),
      plan_token: external_exports.string(),
      check_reads: external_exports.boolean().optional().describe("Default true: after the phase is written, the proven read queries it created or updated are run once and the result carries read_check {ran, rows, failed, inconclusive, not_run}. Writes, remote or paid calls and RunJS are never run. false skips the check.")
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
              action: resolveAction2(event.action, pageTargets2, queryTargets2, targets),
              name: event.name
            };
          });
          const lifecycleSpecs2 = (spec.lifecycles ?? []).map((lifecycle) => ({
            queryId: oneRef(lifecycle.query_ref, queryTargets2, "Lifecycle query"),
            beforeRefreshActions: lifecycle.before_refresh_actions?.map((action) => resolveAction2(action, pageTargets2, queryTargets2, targets)),
            refreshQueryIds: refs(lifecycle.refresh_query_refs, queryTargets2, "Lifecycle refresh query"),
            clearComponentIds: refs(lifecycle.clear_component_refs, targets, "Lifecycle clear component"),
            closeModalId: oneRef(lifecycle.close_modal_ref, targets, "Lifecycle modal"),
            successAlert: lifecycle.success_alert ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type } : void 0,
            failureAlert: lifecycle.failure_alert ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type } : void 0,
            successActions: lifecycle.success_actions?.map((action) => resolveAction2(action, pageTargets2, queryTargets2, targets)),
            failureActions: lifecycle.failure_actions?.map((action) => resolveAction2(action, pageTargets2, queryTargets2, targets))
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
  const key2 = (sourceType, sourceId, payload) => JSON.stringify([sourceType, sourceId, Object.keys(payload).sort().map((k) => [k, payload[k]])]);
  const have = new Set(existing.flatMap((e) => {
    const raw = e.event && typeof e.event === "object" && !Array.isArray(e.event) ? e.event : void 0;
    if (!raw)
      return [];
    const { index: _index, name: _name, ...payload } = raw;
    return [key2(e.target, e.sourceId, payload)];
  }));
  return planned.filter((e) => !have.has(key2(e.sourceType, e.sourceId, { eventId: e.trigger, ...e.ref ? { ref: e.ref } : {}, ...e.action })));
}
export {
  applyAppPhaseTool as a,
  runQueriesTool as b,
  componentInputSchema as c,
  dbColumnTypeSchema as d,
  renameAppTool as e,
  containsExactValue as f,
  containsNamedBinding as g,
  normalizePlannedLayouts as h,
  inspectUpdateCompatibility as i,
  mapKeyRefusal as j,
  prepareComponentBatch as k,
  lintAppSpecTool as l,
  materializeRequiredDefaultChildren as m,
  normalizePlanBindingAliases as n,
  validateEvents as o,
  prepareQueryOptionsForWrite as p,
  expandQueryLifecycles as q,
  runQueryTool as r,
  persistedEventSpecs as s,
  persistedEventIds as t,
  validatePersistedAppSummary as v
};
