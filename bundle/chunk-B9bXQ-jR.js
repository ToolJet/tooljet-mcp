import { createRequire } from "node:module";
import { T as TOOLJET_DB_DATA_TYPES, q as normalizeType, t as invalidSeedTimestamps, u as COMPONENT_FX_GUIDANCE } from "./chunk-Ck6So1HR.js";
import { c as componentInputSchema, f as frozenAppRefusal, m as mapKeyRefusal, p as pagesUsingQuery, r as replaceView, d as danglingAfterReplace, l as literalCanvasColor, a as lintPlannedApp, s as storeAppPlan, b as replaceFingerprint, e as prepareQueryOptionsForWrite } from "./chunk-DCKe4daE.js";
import { i as fail, s as arithmeticWriteWarning, o as ok, e as bindingSpans } from "./chunk-sf3XXkm1.js";
import { K as pageIconSchema, r as resolveComponentLibrary, L as componentLibraryWarnings, M as namespaceReads } from "./chunk-OByZPyCO.js";
import { m as suggestedHtmlHeight } from "./chunk-DzndRVyJ.js";
import { ax as external_exports } from "./chunk-Dakrk_ob.js";
import { j as union, A as string, V as number, a7 as looseObject, U as object, a8 as literal, i as unknown, ax as _enum, aU as array, ai as intersection, K as record, aQ as boolean, N as preprocess, T as optional, ae as iso_exports, aD as discriminatedUnion, aI as custom, Y as _null2 } from "./chunk-CAiG5_Js.js";
import { e7 as __toESM, e5 as __commonJS } from "./chunk-BJ6ur0AF.js";
createRequire(import.meta.url);
var BUILT_IN_DB = /^tool\s*jet\s*(db|data\s*base)$/i;
function matchDatasourceByName(sources, name) {
  if (!name)
    return null;
  const exact = sources.filter((s) => s.name === name);
  if (exact.length === 1)
    return { id: exact[0].id, note: null };
  if (BUILT_IN_DB.test(name.trim())) {
    const db = sources.filter((s) => s.kind === "tooljetdb");
    if (db.length === 1)
      return { id: db[0].id, note: `datasource_name "${name}" is ToolJet's built-in database, "${db[0].name}" in this version.` };
  }
  return null;
}
var dbColumnTypeSchema = external_exports.string().describe("ToolJet DB types: string, integer, bigint, serial, number (double precision), boolean, timestamp, jsonb. Existing aliases text/varchar/int/float/decimal/double/bool/datetime/date/json and canonical API type names are accepted. numeric is unsupported; number/decimal are floating-point, not exact decimal. For money consider integer minor units.").refine((value) => TOOLJET_DB_DATA_TYPES.has(normalizeType(value)), {
  message: "Unsupported ToolJet DB type. Use string, integer, bigint, serial, number (double precision), boolean, timestamp or jsonb. numeric is not supported. For money choose on purpose: integer cents where sums must be exact, or number shown with a currency format for prices; never swap one in silently."
});
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
  archetype: external_exports.string().optional().describe("The page's archetype: catalog (records with a face: photo cards, search, detail sheet), personal-overview (one person's period at a glance: hero, figures, progress, recent), register (a filtered table of records with a detail sheet), queue-board (work to act on: counts, needs-attention list, queue) or other. Lint checks the page against it."),
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
  /** The user's words asking for the other component library than the app's: see componentLibrary.ts. */
  component_library_request: external_exports.string().trim().min(1).max(300).optional().describe('Only when the user asked in this request for the other component library than the app is built in (for example "use UI 2.0" or "use the new components" in a UI 1.0 app): their words. Without it, lint warns when the plan adds widgets from the other library.'),
  tables: external_exports.array(plannedTableSchema).max(50).optional(),
  seed_data: external_exports.array(plannedSeedSchema).max(50).optional(),
  queries: external_exports.array(plannedQuerySchema).max(200).optional(),
  pages: external_exports.array(plannedPageSchema).max(50).optional(),
  events: external_exports.array(plannedEventSchema).max(1e3).optional(),
  lifecycles: external_exports.array(plannedLifecycleSchema).max(200).optional()
});
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
  if (!Array.isArray(keys) || !keys.length || keys.some((key) => typeof key !== "string" || key.includes("{{")))
    return;
  const invalid = keys.filter((key) => !columns.some((column) => column.name === key && column.primaryKey));
  if (!invalid.length)
    return;
  return `bulk_upsert_with_primary_key for "${tableName}" targets non-primary-key column(s) ${invalid.map((key) => JSON.stringify(key)).join(", ")}. This operation requires actual PRIMARY KEY columns; a UNIQUE business reference is not sufficient. Use the real primary key, or a supported conditional SQL upsert that preserves the intended matching and concurrency rules. Do not recreate an existing table or change its primary key merely to repair this query.`;
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
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, values(child)]));
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
    for (const key of ["before_refresh_actions", "success_actions", "failure_actions"]) {
      if (lifecycle[key])
        lifecycle[key] = values(lifecycle[key]);
    }
    for (const key of ["success_alert", "failure_alert"]) {
      if (lifecycle[key])
        lifecycle[key] = values(lifecycle[key]);
    }
  }
  return [...changed].map((change) => `Resolved explicit binding alias ${change}; the submitted definitions now use the runtime name. No inferred names were rewritten.`);
}
var stable = (value) => JSON.stringify(value, (_key, inner) => inner && typeof inner === "object" && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : inner);
function restatedQueryNames(summary, queries, tables, datasources) {
  const restated = [];
  for (const query of queries) {
    const held = summary.queries.filter((existing2) => existing2.name === query.name);
    if (held.length !== 1)
      continue;
    const existing = held[0];
    const matched = query.datasource_id === void 0 ? matchDatasourceByName(datasources, query.datasource_name) : null;
    const datasource = query.datasource_id !== void 0 ? datasources.find((source) => source.id === query.datasource_id) : matched ? datasources.find((source) => source.id === matched.id) : void 0;
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
    if (stable(prepared.options) === stable(existing.options ?? {}))
      restated.push(query.name);
  }
  return restated;
}
var TABLE_NAME_MAX = 31;
function unique(values) {
  return [...new Set(values)];
}
function lintAppSpecTool(client) {
  return {
    name: "lint_app_spec",
    title: "Lint App Spec (Dry Run)",
    // The dry run half of the governed phase: it never mutates ToolJet.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Dry-run an exact app phase before any writes. It validates optional ToolJet DB tables/seed_data, datasource queries, pages/components, events, and concise query lifecycles together. Give pages, queries, and components stable client_ref values; events use source_ref and targeted actions use target_ref. A query can use table_ref to resolve a planned/existing ToolJet DB table by its actual table_name into options.table_id (not a client_ref or alias). For each query use either the exact datasource_id or the exact unique datasource_name from list_datasources(version_id); names are pinned to IDs during this preflight, never guessed from kind. Set app_name when the target app should be renamed in the same governed phase. For repair/continuation phases, pass app_id so persisted page/component/query refs are included and can be targeted without redeclaring them. To rebuild an existing page whole, mark its plan page replace: true (with app_id): the plan is checked against the app with that page emptied, the page's own queries may be defined again (updated in place on apply), and a component another page, event or query still reads must be kept under its name. A Form submits through a Button inside it: set the Form's properties.buttonToSubmit to that Button's client_ref in the same plan (resolved to its id on apply). On success it returns a one-time 30-minute plan_token for apply_app_phase. Treat this call as an awaited barrier; it never mutates ToolJet. " + COMPONENT_FX_GUIDANCE,
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
        const needsTables = Boolean(args.tables?.length || args.seed_data?.length || args.queries?.some((query) => query.table_ref || typeof query.options?.table_id === "string"));
        const [existingTables, fetchedSummary] = await Promise.all([
          needsTables ? client.listTables() : Promise.resolve([]),
          args.app_id ? client.getAppSummary(args.app_id) : Promise.resolve(void 0)
        ]);
        const frozen = frozenAppRefusal(fetchedSummary);
        if (frozen)
          return fail(new Error(frozen));
        const appLibrary = fetchedSummary ? fetchedSummary.component_library ?? resolveComponentLibrary(void 0, fetchedSummary.pages.flatMap((page) => page.components.map((c) => c.type))) : { library: "ui2", source: "new" };
        preflightWarnings.push(...componentLibraryWarnings(appLibrary, args.pages, args.component_library_request));
        const mapRefusal = await mapKeyRefusal(client, (args.pages ?? []).flatMap((page) => (page.components ?? []).map((c) => String(c.type))), appLibrary.library);
        if (mapRefusal)
          preflightErrors.push(mapRefusal);
        const plannedNames = /* @__PURE__ */ new Map();
        for (const table of args.tables ?? []) {
          const key = table.table_name.toLowerCase();
          if (plannedNames.has(key))
            return fail(new Error(`Ambiguous planned table name "${table.table_name}": table names must be unique ignoring case.`));
          plannedNames.set(key, table.table_name);
        }
        const existingNames = /* @__PURE__ */ new Map();
        const ambiguousNames = /* @__PURE__ */ new Set();
        for (const table of existingTables) {
          const key = table.table_name.toLowerCase();
          if (existingNames.has(key))
            ambiguousNames.add(key);
          existingNames.set(key, table.table_name);
        }
        const existingExact = new Set(existingTables.map((table) => table.table_name));
        const canonicalTableName = (name) => {
          const key = name.toLowerCase();
          if (ambiguousNames.has(key) && !existingExact.has(name))
            throw new Error(`Ambiguous existing table name "${name}": multiple workspace tables match ignoring case. No plan token was issued.`);
          return plannedNames.get(key) ?? (existingExact.has(name) ? name : existingNames.get(key)) ?? name;
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
          const key = table.table_name.toLowerCase();
          if (tableIds.has(key)) {
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
            tableIds.set(key, `planned-table:${table.table_name}`);
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
            const matched = matchDatasourceByName(datasources, query.datasource_name);
            if (!matched) {
              preflightErrors.push(`Query "${query.name}" datasource_name "${query.datasource_name}" must match exactly one source in this version (found ${matches.length}). Use the exact name or id returned by list_datasources(version_id).`);
            } else {
              datasourceId = matched.id;
              if (matched.note)
                preflightWarnings.push(`Query "${query.name}": ${matched.note}`);
            }
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
            archetype: page.archetype,
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
          errors: unique([...preflightErrors, ...lint.errors]),
          warnings: unique([...preflightWarnings, ...lint.warnings])
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
createRequire(import.meta.url);
var LATEST_PROTOCOL_VERSION = "2025-11-25";
var DEFAULT_NEGOTIATED_PROTOCOL_VERSION = "2025-03-26";
var SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05", "2024-10-07"];
var RELATED_TASK_META_KEY = "io.modelcontextprotocol/related-task";
var JSONRPC_VERSION = "2.0";
var AssertObjectSchema = custom((v) => v !== null && (typeof v === "object" || typeof v === "function"));
var ProgressTokenSchema = union([string(), number().int()]);
var CursorSchema = string();
looseObject({
  /**
   * Requested duration in milliseconds to retain task from creation.
   */
  ttl: number().optional(),
  /**
   * Time in milliseconds to wait between task status requests.
   */
  pollInterval: number().optional()
});
var TaskMetadataSchema = object({
  ttl: number().optional()
});
var RelatedTaskMetadataSchema = object({
  taskId: string()
});
var RequestMetaSchema = looseObject({
  /**
   * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
   */
  progressToken: ProgressTokenSchema.optional(),
  /**
   * If specified, this request is related to the provided task.
   */
  [RELATED_TASK_META_KEY]: RelatedTaskMetadataSchema.optional()
});
var BaseRequestParamsSchema = object({
  /**
   * See [General fields: `_meta`](/specification/draft/basic/index#meta) for notes on `_meta` usage.
   */
  _meta: RequestMetaSchema.optional()
});
var TaskAugmentedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * If specified, the caller is requesting task-augmented execution for this request.
   * The request will return a CreateTaskResult immediately, and the actual result can be
   * retrieved later via tasks/result.
   *
   * Task augmentation is subject to capability negotiation - receivers MUST declare support
   * for task augmentation of specific request types in their capabilities.
   */
  task: TaskMetadataSchema.optional()
});
var isTaskAugmentedRequestParams = (value) => TaskAugmentedRequestParamsSchema.safeParse(value).success;
var RequestSchema = object({
  method: string(),
  params: BaseRequestParamsSchema.loose().optional()
});
var NotificationsParamsSchema = object({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var NotificationSchema = object({
  method: string(),
  params: NotificationsParamsSchema.loose().optional()
});
var ResultSchema = looseObject({
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: RequestMetaSchema.optional()
});
var RequestIdSchema = union([string(), number().int()]);
var JSONRPCRequestSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  ...RequestSchema.shape
}).strict();
var isJSONRPCRequest = (value) => JSONRPCRequestSchema.safeParse(value).success;
var JSONRPCNotificationSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  ...NotificationSchema.shape
}).strict();
var isJSONRPCNotification = (value) => JSONRPCNotificationSchema.safeParse(value).success;
var JSONRPCResultResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
}).strict();
var isJSONRPCResultResponse = (value) => JSONRPCResultResponseSchema.safeParse(value).success;
var ErrorCode;
(function(ErrorCode2) {
  ErrorCode2[ErrorCode2["ConnectionClosed"] = -32e3] = "ConnectionClosed";
  ErrorCode2[ErrorCode2["RequestTimeout"] = -32001] = "RequestTimeout";
  ErrorCode2[ErrorCode2["ParseError"] = -32700] = "ParseError";
  ErrorCode2[ErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  ErrorCode2[ErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  ErrorCode2[ErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  ErrorCode2[ErrorCode2["InternalError"] = -32603] = "InternalError";
  ErrorCode2[ErrorCode2["UrlElicitationRequired"] = -32042] = "UrlElicitationRequired";
})(ErrorCode || (ErrorCode = {}));
var JSONRPCErrorResponseSchema = object({
  jsonrpc: literal(JSONRPC_VERSION),
  id: RequestIdSchema.optional(),
  error: object({
    /**
     * The error type that occurred.
     */
    code: number().int(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: unknown().optional()
  })
}).strict();
var isJSONRPCErrorResponse = (value) => JSONRPCErrorResponseSchema.safeParse(value).success;
var JSONRPCMessageSchema = union([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResultResponseSchema,
  JSONRPCErrorResponseSchema
]);
union([JSONRPCResultResponseSchema, JSONRPCErrorResponseSchema]);
var EmptyResultSchema = ResultSchema.strict();
var CancelledNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the request to cancel.
   *
   * This MUST correspond to the ID of a request previously issued in the same direction.
   */
  requestId: RequestIdSchema.optional(),
  /**
   * An optional string describing the reason for the cancellation. This MAY be logged or presented to the user.
   */
  reason: string().optional()
});
var CancelledNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/cancelled"),
  params: CancelledNotificationParamsSchema
});
var IconSchema = object({
  /**
   * URL or data URI for the icon.
   */
  src: string(),
  /**
   * Optional MIME type for the icon.
   */
  mimeType: string().optional(),
  /**
   * Optional array of strings that specify sizes at which the icon can be used.
   * Each string should be in WxH format (e.g., `"48x48"`, `"96x96"`) or `"any"` for scalable formats like SVG.
   *
   * If not provided, the client should assume that the icon can be used at any size.
   */
  sizes: array(string()).optional(),
  /**
   * Optional specifier for the theme this icon is designed for. `light` indicates
   * the icon is designed to be used with a light background, and `dark` indicates
   * the icon is designed to be used with a dark background.
   *
   * If not provided, the client should assume the icon can be used with any theme.
   */
  theme: _enum(["light", "dark"]).optional()
});
var IconsSchema = object({
  /**
   * Optional set of sized icons that the client can display in a user interface.
   *
   * Clients that support rendering icons MUST support at least the following MIME types:
   * - `image/png` - PNG images (safe, universal compatibility)
   * - `image/jpeg` (and `image/jpg`) - JPEG images (safe, universal compatibility)
   *
   * Clients that support rendering icons SHOULD also support:
   * - `image/svg+xml` - SVG images (scalable but requires security precautions)
   * - `image/webp` - WebP images (modern, efficient format)
   */
  icons: array(IconSchema).optional()
});
var BaseMetadataSchema = object({
  /** Intended for programmatic or logical use, but used as a display name in past specs or fallback */
  name: string(),
  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily understood,
   * even by those unfamiliar with domain-specific terminology.
   *
   * If not provided, the name should be used for display (except for Tool,
   * where `annotations.title` should be given precedence over using `name`,
   * if present).
   */
  title: string().optional()
});
var ImplementationSchema = BaseMetadataSchema.extend({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  version: string(),
  /**
   * An optional URL of the website for this implementation.
   */
  websiteUrl: string().optional(),
  /**
   * An optional human-readable description of what this implementation does.
   *
   * This can be used by clients or servers to provide context about their purpose
   * and capabilities. For example, a server might describe the types of resources
   * or tools it provides, while a client might describe its intended use case.
   */
  description: string().optional()
});
var FormElicitationCapabilitySchema = intersection(object({
  applyDefaults: boolean().optional()
}), record(string(), unknown()));
var ElicitationCapabilitySchema = preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) {
      return { form: {} };
    }
  }
  return value;
}, intersection(object({
  form: FormElicitationCapabilitySchema.optional(),
  url: AssertObjectSchema.optional()
}), record(string(), unknown()).optional()));
var ClientTasksCapabilitySchema = looseObject({
  /**
   * Present if the client supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the client supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for sampling requests.
     */
    sampling: looseObject({
      createMessage: AssertObjectSchema.optional()
    }).optional(),
    /**
     * Task support for elicitation requests.
     */
    elicitation: looseObject({
      create: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ServerTasksCapabilitySchema = looseObject({
  /**
   * Present if the server supports listing tasks.
   */
  list: AssertObjectSchema.optional(),
  /**
   * Present if the server supports cancelling tasks.
   */
  cancel: AssertObjectSchema.optional(),
  /**
   * Capabilities for task creation on specific request types.
   */
  requests: looseObject({
    /**
     * Task support for tool requests.
     */
    tools: looseObject({
      call: AssertObjectSchema.optional()
    }).optional()
  }).optional()
});
var ClientCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: object({
    /**
     * Present if the client supports context inclusion via includeContext parameter.
     * If not declared, servers SHOULD only use `includeContext: "none"` (or omit it).
     */
    context: AssertObjectSchema.optional(),
    /**
     * Present if the client supports tool use via tools and toolChoice parameters.
     */
    tools: AssertObjectSchema.optional()
  }).optional(),
  /**
   * Present if the client supports eliciting user input.
   */
  elicitation: ElicitationCapabilitySchema.optional(),
  /**
   * Present if the client supports listing roots.
   */
  roots: object({
    /**
     * Whether the client supports issuing notifications for changes to the roots list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the client supports task creation.
   */
  tasks: ClientTasksCapabilitySchema.optional(),
  /**
   * Extensions that the client supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
   */
  protocolVersion: string(),
  capabilities: ClientCapabilitiesSchema,
  clientInfo: ImplementationSchema
});
var InitializeRequestSchema = RequestSchema.extend({
  method: literal("initialize"),
  params: InitializeRequestParamsSchema
});
var isInitializeRequest = (value) => InitializeRequestSchema.safeParse(value).success;
var ServerCapabilitiesSchema = object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: record(string(), AssertObjectSchema).optional(),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: AssertObjectSchema.optional(),
  /**
   * Present if the server supports sending completions to the client.
   */
  completions: AssertObjectSchema.optional(),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: object({
    /**
     * Whether this server supports issuing notifications for changes to the prompt list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any resources to read.
   */
  resources: object({
    /**
     * Whether this server supports clients subscribing to resource updates.
     */
    subscribe: boolean().optional(),
    /**
     * Whether this server supports issuing notifications for changes to the resource list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server offers any tools to call.
   */
  tools: object({
    /**
     * Whether this server supports issuing notifications for changes to the tool list.
     */
    listChanged: boolean().optional()
  }).optional(),
  /**
   * Present if the server supports task creation.
   */
  tasks: ServerTasksCapabilitySchema.optional(),
  /**
   * Extensions that the server supports. Keys are extension identifiers (vendor-prefix/extension-name).
   */
  extensions: record(string(), AssertObjectSchema).optional()
});
var InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: string(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ImplementationSchema,
  /**
   * Instructions describing how to use the server and its features.
   *
   * This can be used by clients to improve the LLM's understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.
   */
  instructions: string().optional()
});
var InitializedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/initialized"),
  params: NotificationsParamsSchema.optional()
});
var PingRequestSchema = RequestSchema.extend({
  method: literal("ping"),
  params: BaseRequestParamsSchema.optional()
});
var ProgressSchema = object({
  /**
   * The progress thus far. This should increase every time progress is made, even if the total is unknown.
   */
  progress: number(),
  /**
   * Total number of items to process (or total progress required), if known.
   */
  total: optional(number()),
  /**
   * An optional message describing the current progress.
   */
  message: optional(string())
});
var ProgressNotificationParamsSchema = object({
  ...NotificationsParamsSchema.shape,
  ...ProgressSchema.shape,
  /**
   * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
   */
  progressToken: ProgressTokenSchema
});
var ProgressNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/progress"),
  params: ProgressNotificationParamsSchema
});
var PaginatedRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * An opaque token representing the current pagination position.
   * If provided, the server should return results starting after this cursor.
   */
  cursor: CursorSchema.optional()
});
var PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional()
});
var PaginatedResultSchema = ResultSchema.extend({
  /**
   * An opaque token representing the pagination position after the last returned result.
   * If present, there may be more results available.
   */
  nextCursor: CursorSchema.optional()
});
var TaskStatusSchema = _enum(["working", "input_required", "completed", "failed", "cancelled"]);
var TaskSchema = object({
  taskId: string(),
  status: TaskStatusSchema,
  /**
   * Time in milliseconds to keep task results available after completion.
   * If null, the task has unlimited lifetime until manually cleaned up.
   */
  ttl: union([number(), _null2()]),
  /**
   * ISO 8601 timestamp when the task was created.
   */
  createdAt: string(),
  /**
   * ISO 8601 timestamp when the task was last updated.
   */
  lastUpdatedAt: string(),
  pollInterval: optional(number()),
  /**
   * Optional diagnostic message for failed tasks or other status information.
   */
  statusMessage: optional(string())
});
var CreateTaskResultSchema = ResultSchema.extend({
  task: TaskSchema
});
var TaskStatusNotificationParamsSchema = NotificationsParamsSchema.merge(TaskSchema);
var TaskStatusNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tasks/status"),
  params: TaskStatusNotificationParamsSchema
});
var GetTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/get"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var GetTaskResultSchema = ResultSchema.merge(TaskSchema);
var GetTaskPayloadRequestSchema = RequestSchema.extend({
  method: literal("tasks/result"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
ResultSchema.loose();
var ListTasksRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tasks/list")
});
var ListTasksResultSchema = PaginatedResultSchema.extend({
  tasks: array(TaskSchema)
});
var CancelTaskRequestSchema = RequestSchema.extend({
  method: literal("tasks/cancel"),
  params: BaseRequestParamsSchema.extend({
    taskId: string()
  })
});
var CancelTaskResultSchema = ResultSchema.merge(TaskSchema);
var ResourceContentsSchema = object({
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: string()
});
var Base64Schema = string().refine((val) => {
  try {
    atob(val);
    return true;
  } catch {
    return false;
  }
}, { message: "Invalid Base64 string" });
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   */
  blob: Base64Schema
});
var RoleSchema = _enum(["user", "assistant"]);
var AnnotationsSchema = object({
  /**
   * Intended audience(s) for the resource.
   */
  audience: array(RoleSchema).optional(),
  /**
   * Importance hint for the resource, from 0 (least) to 1 (most).
   */
  priority: number().min(0).max(1).optional(),
  /**
   * ISO 8601 timestamp for the most recent modification.
   */
  lastModified: iso_exports.datetime({ offset: true }).optional()
});
var ResourceSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * The URI of this resource.
   */
  uri: string(),
  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optional(string()),
  /**
   * The size of the raw resource content, in bytes (i.e., before base64 encoding or any tokenization), if known.
   *
   * This can be used by Hosts to display file sizes and estimate context window usage.
   */
  size: optional(number()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ResourceTemplateSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   */
  uriTemplate: string(),
  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: optional(string()),
  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: optional(string()),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListResourcesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/list")
});
var ListResourcesResultSchema = PaginatedResultSchema.extend({
  resources: array(ResourceSchema)
});
var ListResourceTemplatesRequestSchema = PaginatedRequestSchema.extend({
  method: literal("resources/templates/list")
});
var ListResourceTemplatesResultSchema = PaginatedResultSchema.extend({
  resourceTemplates: array(ResourceTemplateSchema)
});
var ResourceRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
   *
   * @format uri
   */
  uri: string()
});
var ReadResourceRequestParamsSchema = ResourceRequestParamsSchema;
var ReadResourceRequestSchema = RequestSchema.extend({
  method: literal("resources/read"),
  params: ReadResourceRequestParamsSchema
});
var ReadResourceResultSchema = ResultSchema.extend({
  contents: array(union([TextResourceContentsSchema, BlobResourceContentsSchema]))
});
var ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var SubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var SubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/subscribe"),
  params: SubscribeRequestParamsSchema
});
var UnsubscribeRequestParamsSchema = ResourceRequestParamsSchema;
var UnsubscribeRequestSchema = RequestSchema.extend({
  method: literal("resources/unsubscribe"),
  params: UnsubscribeRequestParamsSchema
});
var ResourceUpdatedNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
   */
  uri: string()
});
var ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/resources/updated"),
  params: ResourceUpdatedNotificationParamsSchema
});
var PromptArgumentSchema = object({
  /**
   * The name of the argument.
   */
  name: string(),
  /**
   * A human-readable description of the argument.
   */
  description: optional(string()),
  /**
   * Whether this argument must be provided.
   */
  required: optional(boolean())
});
var PromptSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * An optional description of what this prompt provides
   */
  description: optional(string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: optional(array(PromptArgumentSchema)),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: optional(looseObject({}))
});
var ListPromptsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("prompts/list")
});
var ListPromptsResultSchema = PaginatedResultSchema.extend({
  prompts: array(PromptSchema)
});
var GetPromptRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The name of the prompt or prompt template.
   */
  name: string(),
  /**
   * Arguments to use for templating the prompt.
   */
  arguments: record(string(), string()).optional()
});
var GetPromptRequestSchema = RequestSchema.extend({
  method: literal("prompts/get"),
  params: GetPromptRequestParamsSchema
});
var TextContentSchema = object({
  type: literal("text"),
  /**
   * The text content of the message.
   */
  text: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ImageContentSchema = object({
  type: literal("image"),
  /**
   * The base64-encoded image data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var AudioContentSchema = object({
  type: literal("audio"),
  /**
   * The base64-encoded audio data.
   */
  data: Base64Schema,
  /**
   * The MIME type of the audio. Different providers may support different audio types.
   */
  mimeType: string(),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ToolUseContentSchema = object({
  type: literal("tool_use"),
  /**
   * The name of the tool to invoke.
   * Must match a tool name from the request's tools array.
   */
  name: string(),
  /**
   * Unique identifier for this tool call.
   * Used to correlate with ToolResultContent in subsequent messages.
   */
  id: string(),
  /**
   * Arguments to pass to the tool.
   * Must conform to the tool's inputSchema.
   */
  input: record(string(), unknown()),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var EmbeddedResourceSchema = object({
  type: literal("resource"),
  resource: union([TextResourceContentsSchema, BlobResourceContentsSchema]),
  /**
   * Optional annotations for the client.
   */
  annotations: AnnotationsSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ResourceLinkSchema = ResourceSchema.extend({
  type: literal("resource_link")
});
var ContentBlockSchema = union([
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ResourceLinkSchema,
  EmbeddedResourceSchema
]);
var PromptMessageSchema = object({
  role: RoleSchema,
  content: ContentBlockSchema
});
var GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: string().optional(),
  messages: array(PromptMessageSchema)
});
var PromptListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/prompts/list_changed"),
  params: NotificationsParamsSchema.optional()
});
var ToolAnnotationsSchema = object({
  /**
   * A human-readable title for the tool.
   */
  title: string().optional(),
  /**
   * If true, the tool does not modify its environment.
   *
   * Default: false
   */
  readOnlyHint: boolean().optional(),
  /**
   * If true, the tool may perform destructive updates to its environment.
   * If false, the tool performs only additive updates.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: true
   */
  destructiveHint: boolean().optional(),
  /**
   * If true, calling the tool repeatedly with the same arguments
   * will have no additional effect on the its environment.
   *
   * (This property is meaningful only when `readOnlyHint == false`)
   *
   * Default: false
   */
  idempotentHint: boolean().optional(),
  /**
   * If true, this tool may interact with an "open world" of external
   * entities. If false, the tool's domain of interaction is closed.
   * For example, the world of a web search tool is open, whereas that
   * of a memory tool is not.
   *
   * Default: true
   */
  openWorldHint: boolean().optional()
});
var ToolExecutionSchema = object({
  /**
   * Indicates the tool's preference for task-augmented execution.
   * - "required": Clients MUST invoke the tool as a task
   * - "optional": Clients MAY invoke the tool as a task or normal request
   * - "forbidden": Clients MUST NOT attempt to invoke the tool as a task
   *
   * If not present, defaults to "forbidden".
   */
  taskSupport: _enum(["required", "optional", "forbidden"]).optional()
});
var ToolSchema = object({
  ...BaseMetadataSchema.shape,
  ...IconsSchema.shape,
  /**
   * A human-readable description of the tool.
   */
  description: string().optional(),
  /**
   * A JSON Schema 2020-12 object defining the expected parameters for the tool.
   * Must have type: 'object' at the root level per MCP spec.
   */
  inputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()),
  /**
   * An optional JSON Schema 2020-12 object defining the structure of the tool's output
   * returned in the structuredContent field of a CallToolResult.
   * Must have type: 'object' at the root level per MCP spec.
   */
  outputSchema: object({
    type: literal("object"),
    properties: record(string(), AssertObjectSchema).optional(),
    required: array(string()).optional()
  }).catchall(unknown()).optional(),
  /**
   * Optional additional tool information.
   */
  annotations: ToolAnnotationsSchema.optional(),
  /**
   * Execution-related properties for this tool.
   */
  execution: ToolExecutionSchema.optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListToolsRequestSchema = PaginatedRequestSchema.extend({
  method: literal("tools/list")
});
var ListToolsResultSchema = PaginatedResultSchema.extend({
  tools: array(ToolSchema)
});
var CallToolResultSchema = ResultSchema.extend({
  /**
   * A list of content objects that represent the result of the tool call.
   *
   * If the Tool does not define an outputSchema, this field MUST be present in the result.
   * For backwards compatibility, this field is always present, but it may be empty.
   */
  content: array(ContentBlockSchema).default([]),
  /**
   * An object containing structured tool output.
   *
   * If the Tool defines an outputSchema, this field MUST be present in the result, and contain a JSON object that matches the schema.
   */
  structuredContent: record(string(), unknown()).optional(),
  /**
   * Whether the tool call ended in an error.
   *
   * If not set, this is assumed to be false (the call was successful).
   *
   * Any errors that originate from the tool SHOULD be reported inside the result
   * object, with `isError` set to true, _not_ as an MCP protocol-level error
   * response. Otherwise, the LLM would not be able to see that an error occurred
   * and self-correct.
   *
   * However, any errors in _finding_ the tool, an error indicating that the
   * server does not support tool calls, or any other exceptional conditions,
   * should be reported as an MCP error response.
   */
  isError: boolean().optional()
});
CallToolResultSchema.or(ResultSchema.extend({
  toolResult: unknown()
}));
var CallToolRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The name of the tool to call.
   */
  name: string(),
  /**
   * Arguments to pass to the tool.
   */
  arguments: record(string(), unknown()).optional()
});
var CallToolRequestSchema = RequestSchema.extend({
  method: literal("tools/call"),
  params: CallToolRequestParamsSchema
});
var ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/tools/list_changed"),
  params: NotificationsParamsSchema.optional()
});
object({
  /**
   * If true, the list will be refreshed automatically when a list changed notification is received.
   * The callback will be called with the updated list.
   *
   * If false, the callback will be called with null items, allowing manual refresh.
   *
   * @default true
   */
  autoRefresh: boolean().default(true),
  /**
   * Debounce time in milliseconds for list changed notification processing.
   *
   * Multiple notifications received within this timeframe will only trigger one refresh.
   * Set to 0 to disable debouncing.
   *
   * @default 300
   */
  debounceMs: number().int().nonnegative().default(300)
});
var LoggingLevelSchema = _enum(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]);
var SetLevelRequestParamsSchema = BaseRequestParamsSchema.extend({
  /**
   * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
   */
  level: LoggingLevelSchema
});
var SetLevelRequestSchema = RequestSchema.extend({
  method: literal("logging/setLevel"),
  params: SetLevelRequestParamsSchema
});
var LoggingMessageNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The severity of this log message.
   */
  level: LoggingLevelSchema,
  /**
   * An optional name of the logger issuing this message.
   */
  logger: string().optional(),
  /**
   * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
   */
  data: unknown()
});
var LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/message"),
  params: LoggingMessageNotificationParamsSchema
});
var ModelHintSchema = object({
  /**
   * A hint for a model name.
   */
  name: string().optional()
});
var ModelPreferencesSchema = object({
  /**
   * Optional hints to use for model selection.
   */
  hints: array(ModelHintSchema).optional(),
  /**
   * How much to prioritize cost when selecting a model.
   */
  costPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize sampling speed (latency) when selecting a model.
   */
  speedPriority: number().min(0).max(1).optional(),
  /**
   * How much to prioritize intelligence and capabilities when selecting a model.
   */
  intelligencePriority: number().min(0).max(1).optional()
});
var ToolChoiceSchema = object({
  /**
   * Controls when tools are used:
   * - "auto": Model decides whether to use tools (default)
   * - "required": Model MUST use at least one tool before completing
   * - "none": Model MUST NOT use any tools
   */
  mode: _enum(["auto", "required", "none"]).optional()
});
var ToolResultContentSchema = object({
  type: literal("tool_result"),
  toolUseId: string().describe("The unique identifier for the corresponding tool call."),
  content: array(ContentBlockSchema).default([]),
  structuredContent: object({}).loose().optional(),
  isError: boolean().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var SamplingContentSchema = discriminatedUnion("type", [TextContentSchema, ImageContentSchema, AudioContentSchema]);
var SamplingMessageContentBlockSchema = discriminatedUnion("type", [
  TextContentSchema,
  ImageContentSchema,
  AudioContentSchema,
  ToolUseContentSchema,
  ToolResultContentSchema
]);
var SamplingMessageSchema = object({
  role: RoleSchema,
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)]),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var CreateMessageRequestParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  messages: array(SamplingMessageSchema),
  /**
   * The server's preferences for which model to select. The client MAY modify or omit this request.
   */
  modelPreferences: ModelPreferencesSchema.optional(),
  /**
   * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
   */
  systemPrompt: string().optional(),
  /**
   * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt.
   * The client MAY ignore this request.
   *
   * Default is "none". Values "thisServer" and "allServers" are soft-deprecated. Servers SHOULD only use these values if the client
   * declares ClientCapabilities.sampling.context. These values may be removed in future spec releases.
   */
  includeContext: _enum(["none", "thisServer", "allServers"]).optional(),
  temperature: number().optional(),
  /**
   * The requested maximum number of tokens to sample (to prevent runaway completions).
   *
   * The client MAY choose to sample fewer tokens than the requested maximum.
   */
  maxTokens: number().int(),
  stopSequences: array(string()).optional(),
  /**
   * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
   */
  metadata: AssertObjectSchema.optional(),
  /**
   * Tools that the model may use during generation.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   */
  tools: array(ToolSchema).optional(),
  /**
   * Controls how the model uses tools.
   * The client MUST return an error if this field is provided but ClientCapabilities.sampling.tools is not declared.
   * Default is `{ mode: "auto" }`.
   */
  toolChoice: ToolChoiceSchema.optional()
});
var CreateMessageRequestSchema = RequestSchema.extend({
  method: literal("sampling/createMessage"),
  params: CreateMessageRequestParamsSchema
});
var CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. Single content block (text, image, or audio).
   */
  content: SamplingContentSchema
});
var CreateMessageResultWithToolsSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: string(),
  /**
   * The reason why sampling stopped, if known.
   *
   * Standard values:
   * - "endTurn": Natural end of the assistant's turn
   * - "stopSequence": A stop sequence was encountered
   * - "maxTokens": Maximum token limit was reached
   * - "toolUse": The model wants to use one or more tools
   *
   * This field is an open string to allow for provider-specific stop reasons.
   */
  stopReason: optional(_enum(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(string())),
  role: RoleSchema,
  /**
   * Response content. May be a single block or array. May include ToolUseContent if stopReason is "toolUse".
   */
  content: union([SamplingMessageContentBlockSchema, array(SamplingMessageContentBlockSchema)])
});
var BooleanSchemaSchema = object({
  type: literal("boolean"),
  title: string().optional(),
  description: string().optional(),
  default: boolean().optional()
});
var StringSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  minLength: number().optional(),
  maxLength: number().optional(),
  format: _enum(["email", "uri", "date", "date-time"]).optional(),
  default: string().optional()
});
var NumberSchemaSchema = object({
  type: _enum(["number", "integer"]),
  title: string().optional(),
  description: string().optional(),
  minimum: number().optional(),
  maximum: number().optional(),
  default: number().optional()
});
var UntitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  default: string().optional()
});
var TitledSingleSelectEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  oneOf: array(object({
    const: string(),
    title: string()
  })),
  default: string().optional()
});
var LegacyTitledEnumSchemaSchema = object({
  type: literal("string"),
  title: string().optional(),
  description: string().optional(),
  enum: array(string()),
  enumNames: array(string()).optional(),
  default: string().optional()
});
var SingleSelectEnumSchemaSchema = union([UntitledSingleSelectEnumSchemaSchema, TitledSingleSelectEnumSchemaSchema]);
var UntitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    type: literal("string"),
    enum: array(string())
  }),
  default: array(string()).optional()
});
var TitledMultiSelectEnumSchemaSchema = object({
  type: literal("array"),
  title: string().optional(),
  description: string().optional(),
  minItems: number().optional(),
  maxItems: number().optional(),
  items: object({
    anyOf: array(object({
      const: string(),
      title: string()
    }))
  }),
  default: array(string()).optional()
});
var MultiSelectEnumSchemaSchema = union([UntitledMultiSelectEnumSchemaSchema, TitledMultiSelectEnumSchemaSchema]);
var EnumSchemaSchema = union([LegacyTitledEnumSchemaSchema, SingleSelectEnumSchemaSchema, MultiSelectEnumSchemaSchema]);
var PrimitiveSchemaDefinitionSchema = union([EnumSchemaSchema, BooleanSchemaSchema, StringSchemaSchema, NumberSchemaSchema]);
var ElicitRequestFormParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   *
   * Optional for backward compatibility. Clients MUST treat missing mode as "form".
   */
  mode: literal("form").optional(),
  /**
   * The message to present to the user describing what information is being requested.
   */
  message: string(),
  /**
   * A restricted subset of JSON Schema.
   * Only top-level properties are allowed, without nesting.
   */
  requestedSchema: object({
    type: literal("object"),
    properties: record(string(), PrimitiveSchemaDefinitionSchema),
    required: array(string()).optional()
  })
});
var ElicitRequestURLParamsSchema = TaskAugmentedRequestParamsSchema.extend({
  /**
   * The elicitation mode.
   */
  mode: literal("url"),
  /**
   * The message to present to the user explaining why the interaction is needed.
   */
  message: string(),
  /**
   * The ID of the elicitation, which must be unique within the context of the server.
   * The client MUST treat this ID as an opaque value.
   */
  elicitationId: string(),
  /**
   * The URL that the user should navigate to.
   */
  url: string().url()
});
var ElicitRequestParamsSchema = union([ElicitRequestFormParamsSchema, ElicitRequestURLParamsSchema]);
var ElicitRequestSchema = RequestSchema.extend({
  method: literal("elicitation/create"),
  params: ElicitRequestParamsSchema
});
var ElicitationCompleteNotificationParamsSchema = NotificationsParamsSchema.extend({
  /**
   * The ID of the elicitation that completed.
   */
  elicitationId: string()
});
var ElicitationCompleteNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/elicitation/complete"),
  params: ElicitationCompleteNotificationParamsSchema
});
var ElicitResultSchema = ResultSchema.extend({
  /**
   * The user action in response to the elicitation.
   * - "accept": User submitted the form/confirmed the action
   * - "decline": User explicitly decline the action
   * - "cancel": User dismissed without making an explicit choice
   */
  action: _enum(["accept", "decline", "cancel"]),
  /**
   * The submitted form data, only present when action is "accept".
   * Contains values matching the requested schema.
   * Per MCP spec, content is "typically omitted" for decline/cancel actions.
   * We normalize null to undefined for leniency while maintaining type compatibility.
   */
  content: preprocess((val) => val === null ? void 0 : val, record(string(), union([string(), number(), boolean(), array(string())])).optional())
});
var ResourceTemplateReferenceSchema = object({
  type: literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   */
  uri: string()
});
var PromptReferenceSchema = object({
  type: literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: string()
});
var CompleteRequestParamsSchema = BaseRequestParamsSchema.extend({
  ref: union([PromptReferenceSchema, ResourceTemplateReferenceSchema]),
  /**
   * The argument's information
   */
  argument: object({
    /**
     * The name of the argument
     */
    name: string(),
    /**
     * The value of the argument to use for completion matching.
     */
    value: string()
  }),
  context: object({
    /**
     * Previously-resolved variables in a URI template or prompt.
     */
    arguments: record(string(), string()).optional()
  }).optional()
});
var CompleteRequestSchema = RequestSchema.extend({
  method: literal("completion/complete"),
  params: CompleteRequestParamsSchema
});
function assertCompleteRequestPrompt(request) {
  if (request.params.ref.type !== "ref/prompt") {
    throw new TypeError(`Expected CompleteRequestPrompt, but got ${request.params.ref.type}`);
  }
}
function assertCompleteRequestResourceTemplate(request) {
  if (request.params.ref.type !== "ref/resource") {
    throw new TypeError(`Expected CompleteRequestResourceTemplate, but got ${request.params.ref.type}`);
  }
}
var CompleteResultSchema = ResultSchema.extend({
  completion: looseObject({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: array(string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: optional(number().int()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: optional(boolean())
  })
});
var RootSchema = object({
  /**
   * The URI identifying the root. This *must* start with file:// for now.
   */
  uri: string().startsWith("file://"),
  /**
   * An optional name for the root.
   */
  name: string().optional(),
  /**
   * See [MCP specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/47339c03c143bb4ec01a26e721a1b8fe66634ebe/docs/specification/draft/basic/index.mdx#general-fields)
   * for notes on _meta usage.
   */
  _meta: record(string(), unknown()).optional()
});
var ListRootsRequestSchema = RequestSchema.extend({
  method: literal("roots/list"),
  params: BaseRequestParamsSchema.optional()
});
var ListRootsResultSchema = ResultSchema.extend({
  roots: array(RootSchema)
});
var RootsListChangedNotificationSchema = NotificationSchema.extend({
  method: literal("notifications/roots/list_changed"),
  params: NotificationsParamsSchema.optional()
});
union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  TaskStatusNotificationSchema
]);
union([
  EmptyResultSchema,
  CreateMessageResultSchema,
  CreateMessageResultWithToolsSchema,
  ElicitResultSchema,
  ListRootsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
union([
  PingRequestSchema,
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  GetTaskRequestSchema,
  GetTaskPayloadRequestSchema,
  ListTasksRequestSchema,
  CancelTaskRequestSchema
]);
union([
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  PromptListChangedNotificationSchema,
  TaskStatusNotificationSchema,
  ElicitationCompleteNotificationSchema
]);
union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema,
  GetTaskResultSchema,
  ListTasksResultSchema,
  CreateTaskResultSchema
]);
var McpError = class _McpError extends Error {
  constructor(code, message, data) {
    super(`MCP error ${code}: ${message}`);
    this.code = code;
    this.data = data;
    this.name = "McpError";
  }
  /**
   * Factory method to create the appropriate error type based on the error code and data
   */
  static fromError(code, message, data) {
    if (code === ErrorCode.UrlElicitationRequired && data) {
      const errorData = data;
      if (errorData.elicitations) {
        return new UrlElicitationRequiredError(errorData.elicitations, message);
      }
    }
    return new _McpError(code, message, data);
  }
};
var UrlElicitationRequiredError = class extends McpError {
  constructor(elicitations, message = `URL elicitation${elicitations.length > 1 ? "s" : ""} required`) {
    super(ErrorCode.UrlElicitationRequired, message, {
      elicitations
    });
  }
  get elicitations() {
    return this.data?.elicitations ?? [];
  }
};
createRequire(import.meta.url);
var require_content_type = __commonJS({
  "node_modules/content-type/index.js"(exports) {
    var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
    var TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/;
    var TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
    var QUOTE_REGEXP = /([\\"])/g;
    var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    exports.format = format;
    exports.parse = parse;
    function format(obj) {
      if (!obj || typeof obj !== "object") {
        throw new TypeError("argument obj is required");
      }
      var parameters = obj.parameters;
      var type = obj.type;
      if (!type || !TYPE_REGEXP.test(type)) {
        throw new TypeError("invalid type");
      }
      var string2 = type;
      if (parameters && typeof parameters === "object") {
        var param;
        var params = Object.keys(parameters).sort();
        for (var i = 0; i < params.length; i++) {
          param = params[i];
          if (!TOKEN_REGEXP.test(param)) {
            throw new TypeError("invalid parameter name");
          }
          string2 += "; " + param + "=" + qstring(parameters[param]);
        }
      }
      return string2;
    }
    function parse(string2) {
      if (!string2) {
        throw new TypeError("argument string is required");
      }
      var header = typeof string2 === "object" ? getcontenttype(string2) : string2;
      if (typeof header !== "string") {
        throw new TypeError("argument string is required to be a string");
      }
      var index = header.indexOf(";");
      var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (!TYPE_REGEXP.test(type)) {
        throw new TypeError("invalid media type");
      }
      var obj = new ContentType(type.toLowerCase());
      if (index !== -1) {
        var key;
        var match;
        var value;
        PARAM_REGEXP.lastIndex = index;
        while (match = PARAM_REGEXP.exec(header)) {
          if (match.index !== index) {
            throw new TypeError("invalid parameter format");
          }
          index += match[0].length;
          key = match[1].toLowerCase();
          value = match[2];
          if (value.charCodeAt(0) === 34) {
            value = value.slice(1, -1);
            if (value.indexOf("\\") !== -1) {
              value = value.replace(QESC_REGEXP, "$1");
            }
          }
          obj.parameters[key] = value;
        }
        if (index !== header.length) {
          throw new TypeError("invalid parameter format");
        }
      }
      return obj;
    }
    function getcontenttype(obj) {
      var header;
      if (typeof obj.getHeader === "function") {
        header = obj.getHeader("content-type");
      } else if (typeof obj.headers === "object") {
        header = obj.headers && obj.headers["content-type"];
      }
      if (typeof header !== "string") {
        throw new TypeError("content-type header is missing from object");
      }
      return header;
    }
    function qstring(val) {
      var str = String(val);
      if (TOKEN_REGEXP.test(str)) {
        return str;
      }
      if (str.length > 0 && !TEXT_REGEXP.test(str)) {
        throw new TypeError("invalid parameter value");
      }
      return '"' + str.replace(QUOTE_REGEXP, "\\$1") + '"';
    }
    function ContentType(type) {
      this.parameters = /* @__PURE__ */ Object.create(null);
      this.type = type;
    }
  }
});
var import_content_type = __toESM(require_content_type(), 1);
function mediaTypeEssence(header) {
  if (!header) {
    return void 0;
  }
  try {
    return import_content_type.default.parse(header).type;
  } catch {
    const essence = (header.split(";", 1)[0] ?? "").trim().toLowerCase();
    if (essence === "" || header.slice(essence.length).includes(",")) {
      return void 0;
    }
    return essence;
  }
}
function isJsonContentType(header) {
  if (header === "application/json") {
    return true;
  }
  return mediaTypeEssence(header) === "application/json";
}
var DEFAULT_SSE_KEEP_ALIVE_MS = 15e3;
var MAX_TIMER_DELAY_MS = 2 ** 31 - 1;
function armSseKeepAlive(intervalMs, onTick) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1) {
    return void 0;
  }
  const timer = setInterval(onTick, Math.min(intervalMs, MAX_TIMER_DELAY_MS));
  timer.unref?.();
  return timer;
}
var WebStandardStreamableHTTPServerTransport = class {
  constructor(options = {}) {
    this._started = false;
    this._hasHandledRequest = false;
    this._streamMapping = /* @__PURE__ */ new Map();
    this._requestToStreamMapping = /* @__PURE__ */ new Map();
    this._resumableStreams = /* @__PURE__ */ new Set();
    this._requestResponseMap = /* @__PURE__ */ new Map();
    this._initialized = false;
    this._enableJsonResponse = false;
    this._standaloneSseStreamId = "_GET_stream";
    this._closed = false;
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._enableJsonResponse = options.enableJsonResponse ?? false;
    this._eventStore = options.eventStore;
    this._onsessioninitialized = options.onsessioninitialized;
    this._onsessionclosed = options.onsessionclosed;
    this._allowedHosts = options.allowedHosts;
    this._allowedOrigins = options.allowedOrigins;
    this._enableDnsRebindingProtection = options.enableDnsRebindingProtection ?? false;
    this._retryInterval = options.retryInterval;
    this._keepAliveMs = options.keepAliveMs ?? DEFAULT_SSE_KEEP_ALIVE_MS;
  }
  /**
   * Arms a keep-alive interval for an SSE stream that periodically writes an SSE
   * comment frame so intermediaries and idle timeouts don't kill the connection.
   * The returned timer is owned by the stream it was armed for: the stream's
   * cancel/cleanup callbacks must clear it. The interval clears itself if a
   * write fails (stream already closed/cancelled).
   */
  startKeepAlive(controller, encoder) {
    if (this._closed)
      return void 0;
    const timer = armSseKeepAlive(this._keepAliveMs, () => {
      try {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      } catch {
        if (timer !== void 0)
          clearInterval(timer);
      }
    });
    return timer;
  }
  /**
   * Starts the transport. This is required by the Transport interface but is a no-op
   * for the Streamable HTTP transport as connections are managed per-request.
   */
  async start() {
    if (this._started) {
      throw new Error("Transport already started");
    }
    this._started = true;
  }
  /**
   * Helper to create a JSON error response
   */
  createJsonErrorResponse(status, code, message, options) {
    const error = { code, message };
    if (options?.data !== void 0) {
      error.data = options.data;
    }
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error,
      id: null
    }), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
  }
  /**
   * Validates request headers for DNS rebinding protection.
   * @returns Error response if validation fails, undefined if validation passes.
   */
  validateRequestHeaders(req) {
    if (!this._enableDnsRebindingProtection) {
      return void 0;
    }
    if (this._allowedHosts && this._allowedHosts.length > 0) {
      const hostHeader = req.headers.get("host");
      if (!hostHeader || !this._allowedHosts.includes(hostHeader)) {
        const error = `Invalid Host header: ${hostHeader}`;
        this.onerror?.(new Error(error));
        return this.createJsonErrorResponse(403, -32e3, error);
      }
    }
    if (this._allowedOrigins && this._allowedOrigins.length > 0) {
      const originHeader = req.headers.get("origin");
      if (originHeader && !this._allowedOrigins.includes(originHeader)) {
        const error = `Invalid Origin header: ${originHeader}`;
        this.onerror?.(new Error(error));
        return this.createJsonErrorResponse(403, -32e3, error);
      }
    }
    return void 0;
  }
  /**
   * Handles an incoming HTTP request, whether GET, POST, or DELETE
   * Returns a Response object (Web Standard)
   */
  async handleRequest(req, options) {
    if (this._closed) {
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    if (!this.sessionIdGenerator && this._hasHandledRequest) {
      throw new Error("Stateless transport cannot be reused across requests. Create a new transport per request.");
    }
    this._hasHandledRequest = true;
    const validationError = this.validateRequestHeaders(req);
    if (validationError) {
      return validationError;
    }
    switch (req.method) {
      case "POST":
        return this.handlePostRequest(req, options);
      case "GET":
        return this.handleGetRequest(req);
      case "DELETE":
        return this.handleDeleteRequest(req);
      default:
        return this.handleUnsupportedRequest();
    }
  }
  /**
   * Writes a priming event to establish resumption capability.
   * Only sends if eventStore is configured (opt-in for resumability) and
   * the client's protocol version supports empty SSE data (>= 2025-11-25).
   */
  async writePrimingEvent(controller, encoder, streamId, protocolVersion) {
    if (!this._eventStore) {
      return;
    }
    if (protocolVersion < "2025-11-25") {
      return;
    }
    const primingEventId = await this._eventStore.storeEvent(streamId, {});
    let primingEvent = `id: ${primingEventId}
data: 

`;
    if (this._retryInterval !== void 0) {
      primingEvent = `id: ${primingEventId}
retry: ${this._retryInterval}
data: 

`;
    }
    controller.enqueue(encoder.encode(primingEvent));
    this._resumableStreams.add(streamId);
  }
  /**
   * Handles GET requests for SSE stream
   */
  async handleGetRequest(req) {
    const acceptHeader = req.headers.get("accept");
    if (!acceptHeader?.includes("text/event-stream")) {
      this.onerror?.(new Error("Not Acceptable: Client must accept text/event-stream"));
      return this.createJsonErrorResponse(406, -32e3, "Not Acceptable: Client must accept text/event-stream");
    }
    const sessionError = this.validateSession(req);
    if (sessionError) {
      return sessionError;
    }
    const protocolError = this.validateProtocolVersion(req);
    if (protocolError) {
      return protocolError;
    }
    if (this._eventStore) {
      const lastEventId = req.headers.get("last-event-id");
      if (lastEventId) {
        return this.replayEvents(lastEventId);
      }
    }
    if (this._streamMapping.get(this._standaloneSseStreamId) !== void 0) {
      this.onerror?.(new Error("Conflict: Only one SSE stream is allowed per session"));
      return this.createJsonErrorResponse(409, -32e3, "Conflict: Only one SSE stream is allowed per session");
    }
    const encoder = new TextEncoder();
    let streamController;
    let keepAliveTimer = void 0;
    const readable = new ReadableStream({
      start: (controller) => {
        streamController = controller;
      },
      cancel: () => {
        if (keepAliveTimer !== void 0) {
          clearInterval(keepAliveTimer);
        }
        if (this._streamMapping.get(this._standaloneSseStreamId)?.controller === streamController) {
          this._streamMapping.delete(this._standaloneSseStreamId);
        }
      }
    });
    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    };
    if (this.sessionId !== void 0) {
      headers["mcp-session-id"] = this.sessionId;
    }
    this._streamMapping.set(this._standaloneSseStreamId, {
      controller: streamController,
      encoder,
      cleanup: () => {
        if (keepAliveTimer !== void 0) {
          clearInterval(keepAliveTimer);
        }
        this._streamMapping.delete(this._standaloneSseStreamId);
        try {
          streamController.close();
        } catch {
        }
      }
    });
    keepAliveTimer = this.startKeepAlive(streamController, encoder);
    return new Response(readable, { headers });
  }
  /**
   * Replays events that would have been sent after the specified event ID
   * Only used when resumability is enabled
   */
  async replayEvents(lastEventId) {
    if (!this._eventStore) {
      this.onerror?.(new Error("Event store not configured"));
      return this.createJsonErrorResponse(400, -32e3, "Event store not configured");
    }
    try {
      let streamId;
      if (this._eventStore.getStreamIdForEventId) {
        streamId = await this._eventStore.getStreamIdForEventId(lastEventId);
        if (!streamId) {
          this.onerror?.(new Error("Invalid event ID format"));
          return this.createJsonErrorResponse(400, -32e3, "Invalid event ID format");
        }
        if (this._streamMapping.get(streamId) !== void 0) {
          this.onerror?.(new Error("Conflict: Stream already has an active connection"));
          return this.createJsonErrorResponse(409, -32e3, "Conflict: Stream already has an active connection");
        }
      }
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      };
      if (this.sessionId !== void 0) {
        headers["mcp-session-id"] = this.sessionId;
      }
      const encoder = new TextEncoder();
      let streamController;
      let keepAliveTimer = void 0;
      let replayedStreamId = void 0;
      let cancelled = false;
      const readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          cancelled = true;
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          if (replayedStreamId !== void 0 && this._streamMapping.get(replayedStreamId)?.controller === streamController) {
            this._streamMapping.delete(replayedStreamId);
          }
        }
      });
      const replayedEventIds = /* @__PURE__ */ new Set();
      replayedStreamId = await this._eventStore.replayEventsAfter(lastEventId, {
        send: async (eventId, message) => {
          const success = this.writeSSEEvent(streamController, encoder, message, eventId);
          if (!success) {
            this.onerror?.(new Error("Failed replay events"));
            try {
              streamController.close();
            } catch {
            }
          } else {
            replayedEventIds.add(eventId);
          }
        }
      });
      if (this._closed || cancelled) {
        try {
          streamController.close();
        } catch {
        }
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      this._streamMapping.get(replayedStreamId)?.cleanup();
      this._streamMapping.set(replayedStreamId, {
        controller: streamController,
        encoder,
        replayedEventIds,
        cleanup: () => {
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          this._streamMapping.delete(replayedStreamId);
          try {
            streamController.close();
          } catch {
          }
        }
      });
      this._resumableStreams.add(replayedStreamId);
      keepAliveTimer = this.startKeepAlive(streamController, encoder);
      return new Response(readable, { headers });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(500, -32e3, "Error replaying events");
    }
  }
  /**
   * Writes an event to an SSE stream via controller with proper formatting
   */
  writeSSEEvent(controller, encoder, message, eventId) {
    try {
      let eventData = `event: message
`;
      if (eventId) {
        eventData += `id: ${eventId}
`;
      }
      eventData += `data: ${JSON.stringify(message)}

`;
      controller.enqueue(encoder.encode(eventData));
      return true;
    } catch (error) {
      this.onerror?.(error);
      return false;
    }
  }
  /**
   * Handles unsupported requests (PUT, PATCH, etc.)
   */
  handleUnsupportedRequest() {
    this.onerror?.(new Error("Method not allowed."));
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32e3,
        message: "Method not allowed."
      },
      id: null
    }), {
      status: 405,
      headers: {
        Allow: "GET, POST, DELETE",
        "Content-Type": "application/json"
      }
    });
  }
  /**
   * Handles POST requests containing JSON-RPC messages
   */
  async handlePostRequest(req, options) {
    try {
      const acceptHeader = req.headers.get("accept");
      if (!acceptHeader?.includes("application/json") || !acceptHeader.includes("text/event-stream")) {
        this.onerror?.(new Error("Not Acceptable: Client must accept both application/json and text/event-stream"));
        return this.createJsonErrorResponse(406, -32e3, "Not Acceptable: Client must accept both application/json and text/event-stream");
      }
      const ct = req.headers.get("content-type");
      if (!isJsonContentType(ct)) {
        this.onerror?.(new Error("Unsupported Media Type: Content-Type must be application/json"));
        return this.createJsonErrorResponse(415, -32e3, "Unsupported Media Type: Content-Type must be application/json");
      }
      const requestInfo = {
        headers: Object.fromEntries(req.headers.entries()),
        url: new URL(req.url)
      };
      let rawMessage;
      if (options?.parsedBody !== void 0) {
        rawMessage = options.parsedBody;
      } else {
        try {
          rawMessage = await req.json();
        } catch {
          this.onerror?.(new Error("Parse error: Invalid JSON"));
          return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON");
        }
      }
      let messages;
      try {
        if (Array.isArray(rawMessage)) {
          messages = rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg));
        } else {
          messages = [JSONRPCMessageSchema.parse(rawMessage)];
        }
      } catch {
        this.onerror?.(new Error("Parse error: Invalid JSON-RPC message"));
        return this.createJsonErrorResponse(400, -32700, "Parse error: Invalid JSON-RPC message");
      }
      if (this._closed) {
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      const isInitializationRequest = messages.some(isInitializeRequest);
      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== void 0) {
          this.onerror?.(new Error("Invalid Request: Server already initialized"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Server already initialized");
        }
        if (messages.length > 1) {
          this.onerror?.(new Error("Invalid Request: Only one initialization request is allowed"));
          return this.createJsonErrorResponse(400, -32600, "Invalid Request: Only one initialization request is allowed");
        }
        this.sessionId = this.sessionIdGenerator?.();
        this._initialized = true;
        if (this.sessionId && this._onsessioninitialized) {
          await Promise.resolve(this._onsessioninitialized(this.sessionId));
        }
      }
      if (!isInitializationRequest) {
        const sessionError = this.validateSession(req);
        if (sessionError) {
          return sessionError;
        }
        const protocolError = this.validateProtocolVersion(req);
        if (protocolError) {
          return protocolError;
        }
      }
      if (this._closed) {
        return this.createJsonErrorResponse(404, -32001, "Session not found");
      }
      const hasRequests = messages.some(isJSONRPCRequest);
      if (!hasRequests) {
        for (const message of messages) {
          this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
        }
        return new Response(null, { status: 202 });
      }
      const streamId = crypto.randomUUID();
      const initRequest = messages.find((m) => isInitializeRequest(m));
      const clientProtocolVersion = initRequest ? initRequest.params.protocolVersion : req.headers.get("mcp-protocol-version") ?? DEFAULT_NEGOTIATED_PROTOCOL_VERSION;
      if (this._enableJsonResponse) {
        return new Promise((resolve) => {
          this._streamMapping.set(streamId, {
            resolveJson: resolve,
            cleanup: () => {
              this._streamMapping.delete(streamId);
            }
          });
          for (const message of messages) {
            if (isJSONRPCRequest(message)) {
              this._requestToStreamMapping.set(message.id, streamId);
            }
          }
          for (const message of messages) {
            this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo });
          }
        });
      }
      const encoder = new TextEncoder();
      let streamController;
      let keepAliveTimer = void 0;
      const readable = new ReadableStream({
        start: (controller) => {
          streamController = controller;
        },
        cancel: () => {
          if (keepAliveTimer !== void 0) {
            clearInterval(keepAliveTimer);
          }
          if (this._streamMapping.get(streamId)?.controller === streamController) {
            this._streamMapping.delete(streamId);
          }
        }
      });
      const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      };
      if (this.sessionId !== void 0) {
        headers["mcp-session-id"] = this.sessionId;
      }
      for (const message of messages) {
        if (isJSONRPCRequest(message)) {
          this._streamMapping.set(streamId, {
            controller: streamController,
            encoder,
            cleanup: () => {
              if (keepAliveTimer !== void 0) {
                clearInterval(keepAliveTimer);
              }
              this._streamMapping.delete(streamId);
              try {
                streamController.close();
              } catch {
              }
            }
          });
          this._requestToStreamMapping.set(message.id, streamId);
        }
      }
      try {
        await this.writePrimingEvent(streamController, encoder, streamId, clientProtocolVersion);
        for (const message of messages) {
          let closeSSEStream;
          let closeStandaloneSSEStream;
          if (isJSONRPCRequest(message) && this._eventStore && clientProtocolVersion >= "2025-11-25") {
            closeSSEStream = () => {
              this.closeSSEStream(message.id);
            };
            closeStandaloneSSEStream = () => {
              this.closeStandaloneSSEStream();
            };
          }
          this.onmessage?.(message, { authInfo: options?.authInfo, requestInfo, closeSSEStream, closeStandaloneSSEStream });
        }
      } catch (error) {
        this._streamMapping.get(streamId)?.cleanup();
        this._resumableStreams.delete(streamId);
        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this._requestToStreamMapping.delete(message.id);
          }
        }
        throw error;
      }
      if (this._streamMapping.get(streamId)?.controller === streamController) {
        keepAliveTimer = this.startKeepAlive(streamController, encoder);
      }
      return new Response(readable, { status: 200, headers });
    } catch (error) {
      this.onerror?.(error);
      return this.createJsonErrorResponse(400, -32700, "Parse error", { data: String(error) });
    }
  }
  /**
   * Handles DELETE requests to terminate sessions
   */
  async handleDeleteRequest(req) {
    const sessionError = this.validateSession(req);
    if (sessionError) {
      return sessionError;
    }
    const protocolError = this.validateProtocolVersion(req);
    if (protocolError) {
      return protocolError;
    }
    try {
      await Promise.resolve(this._onsessionclosed?.(this.sessionId));
      return new Response(null, { status: 200 });
    } finally {
      await this.close();
    }
  }
  /**
   * Validates session ID for non-initialization requests.
   * Returns Response error if invalid, undefined otherwise
   */
  validateSession(req) {
    if (this.sessionIdGenerator === void 0) {
      return void 0;
    }
    if (!this._initialized) {
      this.onerror?.(new Error("Bad Request: Server not initialized"));
      return this.createJsonErrorResponse(400, -32e3, "Bad Request: Server not initialized");
    }
    const sessionId = req.headers.get("mcp-session-id");
    if (!sessionId) {
      this.onerror?.(new Error("Bad Request: Mcp-Session-Id header is required"));
      return this.createJsonErrorResponse(400, -32e3, "Bad Request: Mcp-Session-Id header is required");
    }
    if (sessionId !== this.sessionId) {
      this.onerror?.(new Error("Session not found"));
      return this.createJsonErrorResponse(404, -32001, "Session not found");
    }
    return void 0;
  }
  /**
   * Validates the MCP-Protocol-Version header on incoming requests.
   *
   * For initialization: Version negotiation handles unknown versions gracefully
   * (server responds with its supported version).
   *
   * For subsequent requests with MCP-Protocol-Version header:
   * - Accept if in supported list
   * - 400 if unsupported
   *
   * For HTTP requests without the MCP-Protocol-Version header:
   * - Accept and default to the version negotiated at initialization
   */
  validateProtocolVersion(req) {
    const protocolVersion = req.headers.get("mcp-protocol-version");
    if (protocolVersion !== null && !SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)) {
      this.onerror?.(new Error(`Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`));
      return this.createJsonErrorResponse(400, -32e3, `Bad Request: Unsupported protocol version: ${protocolVersion} (supported versions: ${SUPPORTED_PROTOCOL_VERSIONS.join(", ")})`);
    }
    return void 0;
  }
  async close() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    this._streamMapping.forEach(({ cleanup }) => {
      cleanup();
    });
    this._streamMapping.clear();
    this._requestResponseMap.clear();
    this._resumableStreams.clear();
    this.onclose?.();
  }
  /**
   * Close an SSE stream for a specific request, triggering client reconnection.
   * Use this to implement polling behavior during long-running operations -
   * client will reconnect after the retry interval specified in the priming event.
   */
  closeSSEStream(requestId) {
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId)
      return;
    const stream = this._streamMapping.get(streamId);
    if (stream) {
      stream.cleanup();
    }
  }
  /**
   * Close the standalone GET SSE stream, triggering client reconnection.
   * Use this to implement polling behavior for server-initiated notifications.
   */
  closeStandaloneSSEStream() {
    const stream = this._streamMapping.get(this._standaloneSseStreamId);
    if (stream) {
      stream.cleanup();
    }
  }
  async send(message, options) {
    let requestId = options?.relatedRequestId;
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      requestId = message.id;
    }
    if (requestId === void 0) {
      if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
        throw new Error("Cannot send a response on a standalone SSE stream unless resuming a previous client request");
      }
      let eventId;
      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(this._standaloneSseStreamId, message);
      }
      const standaloneSse = this._streamMapping.get(this._standaloneSseStreamId);
      if (standaloneSse === void 0) {
        return;
      }
      if (standaloneSse.controller && standaloneSse.encoder && (eventId === void 0 || !standaloneSse.replayedEventIds?.has(eventId))) {
        this.writeSSEEvent(standaloneSse.controller, standaloneSse.encoder, message, eventId);
      }
      return;
    }
    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) {
      throw new Error(`No connection established for request ID: ${String(requestId)}`);
    }
    let stream = this._streamMapping.get(streamId);
    if (!this._enableJsonResponse) {
      let eventId;
      if (this._eventStore) {
        eventId = await this._eventStore.storeEvent(streamId, message);
        stream = this._streamMapping.get(streamId);
      }
      if (stream?.controller && stream?.encoder && (eventId === void 0 || !stream.replayedEventIds?.has(eventId))) {
        const written = this.writeSSEEvent(stream.controller, stream.encoder, message, eventId);
        if (written && eventId !== void 0) {
          this._resumableStreams.add(streamId);
        }
      }
    }
    if (isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)) {
      this._requestResponseMap.set(requestId, message);
      const relatedIds = Array.from(this._requestToStreamMapping.entries()).filter(([_, sid]) => sid === streamId).map(([id]) => id);
      const allResponsesReady = relatedIds.every((id) => this._requestResponseMap.has(id));
      if (allResponsesReady) {
        if (!stream) {
          if (this._closed) {
            for (const id of relatedIds) {
              this._requestResponseMap.delete(id);
              this._requestToStreamMapping.delete(id);
            }
            return;
          }
          if (!this._enableJsonResponse && this._eventStore && this._resumableStreams.has(streamId)) {
            for (const id of relatedIds) {
              this._requestResponseMap.delete(id);
              this._requestToStreamMapping.delete(id);
            }
            this._resumableStreams.delete(streamId);
            return;
          }
          for (const id of relatedIds) {
            this._requestResponseMap.delete(id);
            this._requestToStreamMapping.delete(id);
          }
          throw new Error(`No connection established for request ID: ${String(requestId)}`);
        }
        if (this._enableJsonResponse && stream.resolveJson) {
          const headers = {
            "Content-Type": "application/json"
          };
          if (this.sessionId !== void 0) {
            headers["mcp-session-id"] = this.sessionId;
          }
          const responses = relatedIds.map((id) => this._requestResponseMap.get(id));
          if (responses.length === 1) {
            stream.resolveJson(new Response(JSON.stringify(responses[0]), { status: 200, headers }));
          } else {
            stream.resolveJson(new Response(JSON.stringify(responses), { status: 200, headers }));
          }
        } else {
          stream.cleanup();
        }
        for (const id of relatedIds) {
          this._requestResponseMap.delete(id);
          this._requestToStreamMapping.delete(id);
        }
        this._resumableStreams.delete(streamId);
      }
    }
  }
};
createRequire(import.meta.url);
var CODE_PAGE_TRUE = /* @__PURE__ */ new Set([true, "true", "{{true}}"]);
function codeScreens(summary) {
  const pageIds = new Set(summary.pages.map((page) => page.id));
  const screens = [];
  for (const page of summary.pages) {
    for (const component of page.components) {
      const props = component.properties ?? {};
      if (component.parent || !CODE_PAGE_TRUE.has(props.codePage?.value))
        continue;
      let routes = props.routes?.value;
      if (typeof routes === "string") {
        try {
          routes = JSON.parse(routes);
        } catch {
          routes = [];
        }
      }
      if (!Array.isArray(routes))
        continue;
      for (const route of routes) {
        if (typeof route?.id !== "string" || typeof route?.path !== "string")
          continue;
        if (typeof route.pageId !== "string" || !pageIds.has(route.pageId))
          continue;
        screens.push({
          route_id: route.id,
          path: route.path,
          ...typeof route.title === "string" ? { title: route.title } : {},
          page_id: route.pageId,
          code_page_id: page.id
        });
      }
    }
  }
  return screens;
}
function findScreen(summary, route) {
  const screens = codeScreens(summary);
  const screen = screens.find((s) => s.route_id === route) ?? screens.find((s) => s.path === route);
  if (screen)
    return screen;
  throw new Error(`No Code mode screen "${route}" in app "${summary.app_id}". ` + (screens.length ? `Its screens: ${screens.map((s) => `${s.route_id} (${s.path})`).join(", ")}.` : "The app has no Code mode screens."));
}
function findQuery(summary, ref) {
  const lower = ref.toLowerCase();
  return summary.queries.find((q) => q.id === ref) ?? summary.queries.find((q) => q.name === ref) ?? summary.queries.find((q) => q.name?.toLowerCase() === lower);
}
function isCodeApp(summary) {
  return summary.pages.some((page) => page.components.some((component) => {
    const props = component.properties ?? {};
    return !component.parent && CODE_PAGE_TRUE.has(props.codePage?.value);
  }));
}
function findResource(summary, resourceType, resourceId) {
  if (resourceType === "page") {
    const page = summary.pages.find((candidate) => candidate.id === resourceId) ?? summary.pages.find((candidate) => candidate.name === resourceId);
    if (page)
      return { type: resourceType, id: page.id, name: page.name };
  } else if (resourceType === "query") {
    const query = findQuery(summary, resourceId);
    if (query)
      return { type: resourceType, id: query.id, name: query.name };
  } else {
    for (const page of summary.pages) {
      const component = page.components.find((candidate) => candidate.id === resourceId);
      if (component) {
        return {
          type: resourceType,
          id: component.id,
          name: component.name,
          component_type: component.type,
          page_id: page.id,
          page_name: page.name
        };
      }
    }
  }
  throw new Error(`${resourceType} "${resourceId}" does not belong to app "${summary.app_id}". Use get_app_summary and do not guess resource ids.`);
}
function normalizePermission(permissions) {
  const permission = permissions[0];
  if (!permission)
    return { access: "all", permission_id: null };
  if (permission.type === "SINGLE") {
    return {
      access: "users",
      permission_id: permission.id,
      users: (Array.isArray(permission.users) ? permission.users : []).map((entry) => entry?.user).filter(Boolean).map((user) => ({
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || void 0,
        email: user.email
      }))
    };
  }
  if (permission.type === "GROUP") {
    return {
      access: "groups",
      permission_id: permission.id,
      groups: (Array.isArray(permission.groups) ? permission.groups : []).map((entry) => entry?.permissionGroup).filter(Boolean).map((group) => ({ id: group.id, name: group.name }))
    };
  }
  return { access: String(permission.type ?? "unknown").toLowerCase(), permission_id: permission.id };
}
function planLimits(features) {
  if (!features)
    return void 0;
  const known = Object.entries({
    query_limits: features.appPermissionQuery,
    screen_limits: features.appPermissionPages,
    server_side_current_user: features.serverSideGlobalResolve
  }).filter(([, value]) => typeof value === "boolean");
  return known.length ? Object.fromEntries(known) : void 0;
}
async function subjectGroups(client, open) {
  const openIds = new Map(open.map((group) => [group.id, group]));
  let workspace;
  try {
    workspace = await client.listWorkspaceGroups();
  } catch {
    workspace = void 0;
  }
  if (!workspace) {
    return {
      groups: open.map((group) => ({ ...group, can_open_app: true })),
      complete: false
    };
  }
  const groups = workspace.map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    ...typeof openIds.get(group.id)?.count === "number" ? { count: openIds.get(group.id).count } : {},
    can_open_app: openIds.has(group.id),
    ...group.disabled ? { disabled: true } : {}
  }));
  for (const group of open)
    if (!groups.some((known) => known.id === group.id))
      groups.push({ ...group, can_open_app: true });
  return { groups, complete: true };
}
function viewRule(appId, appName, groupId) {
  return {
    name: `${(appName || "App").slice(0, 40)} (view)`,
    type: "app",
    groupId,
    isAll: false,
    createResourcePermissionObject: {
      canEdit: false,
      canView: true,
      hideFromDashboard: false,
      canAccessDevelopment: false,
      canAccessStaging: false,
      canAccessProduction: false,
      canAccessReleased: true,
      resourcesToAdd: [{ appId }]
    }
  };
}
async function groupDirectory(client, appId) {
  const subjects = await client.listAppPermissionSubjects(appId);
  const { groups, complete } = await subjectGroups(client, subjects.groups);
  return { groups, complete, openIds: new Set(subjects.groups.map((group) => group.id)) };
}
function resolveGroups(directory, refs) {
  const ids = [];
  const unknown2 = [];
  for (const ref of refs) {
    const lower = ref.toLowerCase();
    const group = directory.groups.find((g) => g.id === ref) ?? directory.groups.find((g) => g.name === ref) ?? directory.groups.find((g) => g.name?.toLowerCase() === lower);
    if (group)
      ids.push(group.id);
    else if (!directory.complete && UUID.test(ref))
      ids.push(ref);
    else
      unknown2.push(ref);
  }
  return { ids: [...new Set(ids)], unknown: unknown2 };
}
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function groupsToGrant(directory, groupIds, grant) {
  const missing = groupIds.filter((id) => !directory.openIds.has(id));
  if (!missing.length)
    return [];
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const names = missing.map((id) => byId.get(id)?.name ?? id);
  if (!grant) {
    throw new Error(`${names.join(", ")} cannot open this app yet, so a limit to ${missing.length > 1 ? "them" : "it"} would leave ${missing.length > 1 ? "their" : "its"} members without the screen or query. Pass grant_app_access: true to give each of them view access to this app only (the released app), or give them access in Workspace settings > Groups. Nothing was changed.`);
  }
  const disabled = missing.filter((id) => byId.get(id)?.disabled);
  if (disabled.length) {
    throw new Error(`${disabled.map((id) => byId.get(id)?.name ?? id).join(", ")} cannot be changed under the current plan, so it cannot be given access to this app. Nothing was changed.`);
  }
  return missing;
}
async function removeGrants(client, appId, granted) {
  const left = [];
  for (const grant of granted) {
    try {
      const rules = await client.listWorkspaceGroupAccess(grant.group_id);
      const added = rules.filter((rule) => rule.id && rule.name === grant.rule_name && rule.resources.some((r) => r.id === appId));
      for (const rule of added)
        await client.writeWorkspaceGroupAccess("DELETE", grant.group_id, "app", rule.id);
    } catch {
      left.push(grant.name ?? grant.group_id);
    }
  }
  return left;
}
async function grantGroups(client, appId, appName, directory, missing) {
  const byId = new Map(directory.groups.map((group) => [group.id, group]));
  const granted = [];
  const undo = async (reason) => {
    const left = await removeGrants(client, appId, granted);
    throw new Error(`${reason} The access rules added here were removed${left.length ? `, except for ${left.join(", ")} (remove it in Workspace settings > Groups)` : ""}.`);
  };
  for (const id of missing) {
    const rule = viewRule(appId, appName, id);
    try {
      await client.writeWorkspaceGroupAccess("POST", id, "app", void 0, rule);
    } catch (error) {
      await undo(`${byId.get(id)?.name ?? id} could not be given access to this app: ${error.message}.`);
    }
    granted.push({ group_id: id, ...byId.get(id)?.name ? { name: byId.get(id).name } : {}, rule_name: rule.name });
  }
  const after = new Set((await client.listAppPermissionSubjects(appId)).groups.map((group) => group.id));
  const still = missing.filter((id) => !after.has(id));
  if (still.length) {
    await undo(`ToolJet did not confirm that ${still.map((id) => byId.get(id)?.name ?? id).join(", ")} can open this app after the access rule was added.`);
  }
  return granted;
}
function resolveTargets(args, summary, problems) {
  const targets = [];
  const routes = [...args.route !== void 0 ? [args.route] : [], ...args.routes ?? []];
  const queries = [...args.query !== void 0 ? [args.query] : [], ...args.queries ?? []];
  const type = args.resource_type === "screen" ? "page" : args.resource_type;
  if (routes.length && type && type !== "page") {
    problems.push(`route names a Code mode screen (a page permission), so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  if (queries.length && type && type !== "query") {
    problems.push(`query names a query, so resource_type "${args.resource_type}" does not fit: leave resource_type out.`);
  }
  for (const route of [...new Set(routes)]) {
    try {
      const screen = findScreen(summary, route);
      targets.push({
        resourceType: "page",
        resourceId: screen.page_id,
        resource: {
          ...findResource(summary, "page", screen.page_id),
          screen: { route_id: screen.route_id, path: screen.path, title: screen.title }
        }
      });
    } catch (error) {
      problems.push(error.message);
    }
  }
  const unknownQueries = [];
  for (const ref of [...new Set(queries)]) {
    const query = findQuery(summary, ref);
    if (!query)
      unknownQueries.push(ref);
    else
      targets.push({ resourceType: "query", resourceId: query.id, resource: { type: "query", id: query.id, name: query.name } });
  }
  if (unknownQueries.length) {
    const names = summary.queries.map((q) => q.name ?? q.id);
    problems.push(`No query ${unknownQueries.map((q) => `"${q}"`).join(", ")} in this app. ` + (names.length ? `Its queries: ${names.join(", ")}.` : "The app has no queries."));
  }
  if (args.resource_id !== void 0) {
    const kinds = type ? [type] : ["query", "page", "component"];
    let found;
    for (const kind of kinds) {
      try {
        found = { resourceType: kind, resourceId: "", resource: findResource(summary, kind, args.resource_id) };
        found.resourceId = String(found.resource.id);
        break;
      } catch {
      }
    }
    if (found)
      targets.push(found);
    else
      problems.push(`resource_id "${args.resource_id}" is no ${type ?? "page, query or component"} of this app. Pass a query by its name with query, or a screen with route.`);
  }
  if (!routes.length && !queries.length && args.resource_id === void 0) {
    const screens = codeScreens(summary);
    problems.push("Name what to limit: route (or routes) for screens, query (or queries) for queries, by name or id." + (screens.length ? ` Screens: ${screens.map((s) => s.path).join(", ")}.` : "") + (summary.queries.length ? ` Queries: ${summary.queries.map((q) => q.name ?? q.id).join(", ")}.` : ""));
  }
  const seen = /* @__PURE__ */ new Set();
  return targets.filter((target) => {
    const key = `${target.resourceType}:${target.resourceId}`;
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}
function exampleCall(args, summary, codeApp) {
  const example = { action: args.action === "get" ? "get" : args.action, app_id: args.app_id };
  const screens = summary ? codeScreens(summary) : [];
  if (args.routes?.length)
    example.routes = args.routes;
  else if (args.route)
    example.route = args.route;
  else if (args.queries?.length)
    example.queries = args.queries;
  else if (args.query)
    example.query = args.query;
  else if (screens.length)
    example.route = screens[screens.length - 1].path;
  else if (summary?.queries.length)
    example.query = summary.queries[0].name ?? summary.queries[0].id;
  else
    example.route = "/finance";
  if (args.action === "set") {
    if (args.users?.length || args.user_ids?.length)
      example.users = args.users ?? args.user_ids;
    else
      example.groups = args.groups ?? args.group_ids ?? ["Finance"];
    if (!codeApp)
      example.confirm = true;
  }
  if (args.action === "clear")
    example.confirm = true;
  return JSON.stringify(example);
}
function manageAppPermissionsTool(client) {
  return {
    name: "manage_app_permissions",
    title: "Manage App Permissions",
    // get/list_subjects only read, but set overwrites an access rule and clear broadens access to
    // every user who can reach the app, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: `Server-enforced access to an app's screens and queries: who can open a Code mode screen (route) or run a query. Example: {"action":"set","app_id":"<id>","route":"/finance","groups":["Finance"]}; for queries "query":"finance_queue" (name or id), and "routes" or "queries" take several at once with the same groups. groups take names or ids, users take emails or ids; access_type and resource_type are inferred. In a Code mode app, set needs no confirm, and a named group that cannot open the app first gets view access to this app only (grant_app_access defaults to true; false refuses instead). In other apps set needs confirm:true after the user approves the exact rule. clear (back to everyone who can open the app) always needs confirm:true. list_subjects: every workspace group with can_open_app, and plan (whether this plan enforces query and screen limits and resolves {{globals.server.currentUser}} on the server). list_screens: each route with its access. list_queries: each query of the app with its access. A screen limit hides the screen; the data it shows is protected only by limiting the queries that return it. Visual pages and components: resource_id (resource_type is optional). License gates apply.`,
    inputSchema: {
      action: external_exports.enum(["list_subjects", "list_screens", "list_queries", "get", "set", "clear"]),
      app_id: external_exports.string().uuid(),
      route: external_exports.string().min(1).max(200).optional().describe("A Code mode screen by route path or id (app.json routes)."),
      routes: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(50).optional().describe("Several screens at once."),
      query: external_exports.string().min(1).max(200).optional().describe("A query by name or id."),
      queries: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(100).optional().describe("Several queries at once."),
      groups: external_exports.array(external_exports.string().min(1).max(200)).min(1).max(100).optional().describe("Group names or ids."),
      users: external_exports.array(external_exports.string().min(1).max(320)).min(1).max(100).optional().describe("User emails or ids."),
      resource_type: external_exports.enum(["page", "query", "component", "screen"]).optional().describe("Inferred; only needed with resource_id."),
      resource_id: external_exports.string().min(1).max(200).optional(),
      access_type: external_exports.enum(["users", "groups"]).optional().describe("Inferred from groups or users."),
      user_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100).optional(),
      group_ids: external_exports.array(external_exports.string().min(1)).min(1).max(100).optional(),
      confirm: external_exports.boolean().optional(),
      grant_app_access: external_exports.boolean().optional().describe("set with groups: give a group that cannot open the app view access to this app only first (default true in a Code mode app)")
    },
    async handler(args) {
      try {
        if (args.action === "list_subjects") {
          const [subjects, features] = await Promise.all([
            client.listAppPermissionSubjects(args.app_id),
            client.getLicenseFeatureAccess().catch(() => void 0)
          ]);
          const { groups, complete } = await subjectGroups(client, subjects.groups);
          const plan = planLimits(features);
          return ok({
            app_id: args.app_id,
            users: subjects.users,
            groups,
            ...plan ? { plan } : {},
            note: complete ? "A group with can_open_app false cannot open the app: a set naming it gives it view access to this app only first (in a Code mode app by default, elsewhere with grant_app_access:true)." : "Only the groups that can open the app are listed: the workspace group list could not be read."
          });
        }
        if (args.action === "list_screens") {
          const summary2 = await client.getAppSummary(args.app_id);
          const screens = await Promise.all(codeScreens(summary2).map(async (screen) => ({
            ...screen,
            ...normalizePermission(await client.getAppPermission(args.app_id, "page", screen.page_id))
          })));
          return ok({ app_id: args.app_id, screens });
        }
        if (args.action === "list_queries") {
          const summary2 = await client.getAppSummary(args.app_id);
          const queries = await Promise.all(summary2.queries.map(async (q) => ({
            query_id: q.id,
            name: q.name,
            ...normalizePermission(await client.getAppPermission(args.app_id, "query", q.id))
          })));
          return ok({ app_id: args.app_id, queries, limited: queries.filter((q) => q.access !== "all").length });
        }
        const summary = await client.getAppSummary(args.app_id);
        const codeApp = isCodeApp(summary);
        const problems = [];
        const targets = resolveTargets(args, summary, problems);
        let accessType;
        let subjectIds = [];
        let directory;
        if (args.action === "set") {
          const groupRefs = [...args.groups ?? [], ...args.group_ids ?? []];
          const userRefs = [...args.users ?? [], ...args.user_ids ?? []];
          if (groupRefs.length && userRefs.length) {
            problems.push("Pass groups or users, not both: one limit is to groups or to named users.");
          } else if (!groupRefs.length && !userRefs.length) {
            problems.push("Name who keeps access: groups (names or ids) or users (emails or ids).");
          } else {
            accessType = groupRefs.length ? "groups" : "users";
            if (args.access_type && args.access_type !== accessType) {
              problems.push(`access_type "${args.access_type}" does not match the ${accessType} passed: leave access_type out.`);
            }
          }
          if (accessType === "groups") {
            directory = await groupDirectory(client, args.app_id);
            const { ids, unknown: unknown2 } = resolveGroups(directory, groupRefs);
            if (unknown2.length) {
              problems.push(`${unknown2.map((g) => `"${g}"`).join(", ")} ${unknown2.length > 1 ? "are not groups" : "is not a group"} of this workspace. Its groups: ${directory.groups.map((g) => g.name ?? g.id).join(", ")}.`);
            }
            subjectIds = ids;
          } else if (accessType === "users") {
            const users = (await client.listAppPermissionSubjects(args.app_id)).users;
            const unknown2 = [];
            for (const ref of userRefs) {
              const lower = ref.toLowerCase();
              const user = users.find((u) => u.id === ref) ?? users.find((u) => u.email?.toLowerCase() === lower);
              if (user)
                subjectIds.push(user.id);
              else
                unknown2.push(ref);
            }
            if (unknown2.length) {
              problems.push(`${unknown2.map((u) => `"${u}"`).join(", ")} cannot open this app or is not a user of this workspace (users must already have access to the app; list_subjects lists them).`);
            }
            subjectIds = [...new Set(subjectIds)];
            if (args.grant_app_access === true) {
              problems.push("grant_app_access applies only to a limit to groups: leave it out with users.");
            }
          }
          if (!codeApp && args.confirm !== true) {
            problems.push("set on this app needs confirm:true after the user explicitly approves the exact access rule.");
          }
        }
        if (args.action === "clear" && args.confirm !== true) {
          problems.push("clear opens the resource to everyone who can open the app, so it needs confirm:true after the user approves it.");
        }
        if (problems.length) {
          throw new Error(`manage_app_permissions ${args.action} was refused and nothing was changed:
` + problems.map((problem) => `- ${problem}`).join("\n") + `
A call that works: ${exampleCall(args, summary, codeApp)}`);
        }
        const one = targets.length === 1;
        if (args.action === "get") {
          const results2 = await Promise.all(targets.map(async (t) => ({ resource: t.resource, ...normalizePermission(await client.getAppPermission(args.app_id, t.resourceType, t.resourceId)) })));
          return ok(one ? { app_id: args.app_id, ...results2[0] } : { app_id: args.app_id, results: results2 });
        }
        if (args.action === "clear") {
          for (const t of targets)
            await client.clearAppPermission(args.app_id, t.resourceType, t.resourceId);
          const results2 = targets.map((t) => ({ resource: t.resource, access: "all", permission_id: null }));
          return ok(one ? { app_id: args.app_id, ...results2[0] } : { app_id: args.app_id, results: results2 });
        }
        const grant = args.grant_app_access ?? codeApp;
        const toGrant = accessType === "groups" ? groupsToGrant(directory, subjectIds, grant) : [];
        const results = [];
        for (const t of targets) {
          try {
            const permissions = await client.setAppPermission({
              appId: args.app_id,
              resourceType: t.resourceType,
              resourceId: t.resourceId,
              accessType,
              subjectIds
            });
            results.push({ resource: t.resource, ...normalizePermission(permissions) });
          } catch (error) {
            results.push({ resource: t.resource, error: error.message });
          }
        }
        const failed = results.filter((r) => r.error);
        if (failed.length === results.length) {
          throw new Error(failed.map((r) => `${r.resource.name ?? r.resource.id}: ${r.error}`).join("; ") + (toGrant.length ? " No access to the app was given." : ""));
        }
        let granted = [];
        if (toGrant.length) {
          try {
            granted = await grantGroups(client, args.app_id, summary.name, directory, toGrant);
          } catch (error) {
            throw new Error(`The limits were set, but their groups cannot open this app, so their members cannot use those screens or queries yet: ${error.message} Give the groups access in Workspace settings > Groups, or run this again.`);
          }
        }
        const grantNote = granted.length ? `${granted.map((g) => g.name ?? g.group_id).join(", ")} could not open this app, so ${granted.length > 1 ? "each now has" : "it now has"} view access to this app only (released app, rule "${granted[0].rule_name}").` : void 0;
        const body = {
          app_id: args.app_id,
          ...one ? results[0] : { results },
          ...granted.length ? { granted_app_access: granted, note: grantNote } : {}
        };
        return ok(failed.length ? { ...body, warning: `${failed.length} of ${results.length} limits were not set; see each error.` } : body);
      } catch (error) {
        return fail(error);
      }
    }
  };
}
export {
  CreateMessageResultWithToolsSchema as A,
  CreateMessageResultSchema as B,
  CancelledNotificationSchema as C,
  ElicitResultSchema as D,
  ErrorCode as E,
  ListRootsResultSchema as F,
  GetTaskRequestSchema as G,
  SUPPORTED_PROTOCOL_VERSIONS as H,
  InitializeRequestSchema as I,
  CallToolResultSchema as J,
  dbColumnTypeSchema as K,
  ListTasksRequestSchema as L,
  McpError as M,
  manageAppPermissionsTool as N,
  lintAppSpecTool as O,
  ProgressNotificationSchema as P,
  plannedTableSchema as Q,
  RELATED_TASK_META_KEY as R,
  SetLevelRequestSchema as S,
  TaskStatusNotificationSchema as T,
  inspectUpdateCompatibility as U,
  normalizePlanBindingAliases as V,
  WebStandardStreamableHTTPServerTransport as W,
  JSONRPCMessageSchema as X,
  PingRequestSchema as a,
  GetTaskPayloadRequestSchema as b,
  CancelTaskRequestSchema as c,
  isJSONRPCErrorResponse as d,
  isJSONRPCRequest as e,
  isJSONRPCNotification as f,
  isTaskAugmentedRequestParams as g,
  CreateTaskResultSchema as h,
  isJSONRPCResultResponse as i,
  GetTaskResultSchema as j,
  ListTasksResultSchema as k,
  CancelTaskResultSchema as l,
  ListToolsRequestSchema as m,
  CallToolRequestSchema as n,
  CompleteRequestSchema as o,
  assertCompleteRequestResourceTemplate as p,
  assertCompleteRequestPrompt as q,
  ListResourcesRequestSchema as r,
  ListResourceTemplatesRequestSchema as s,
  ReadResourceRequestSchema as t,
  ListPromptsRequestSchema as u,
  GetPromptRequestSchema as v,
  LoggingLevelSchema as w,
  InitializedNotificationSchema as x,
  LATEST_PROTOCOL_VERSION as y,
  EmptyResultSchema as z
};
