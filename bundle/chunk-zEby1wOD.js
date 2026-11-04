import { createRequire } from "node:module";
import { o as external_exports, t as tableQuotaError, T as TableQuotaError, p as definition, q as nodeCatalog, v as validateGraph, s as specSchema, u as compileGraph, w as assertWorkflowJavaScript, x as controlFlowEdges } from "./chunk-8YTh_X7O.js";
import { e as encodeComponentParent, a as assertPageIcon, S as STYLE_KEYS_IN_PROPERTIES, d as decodeComponentParent } from "./chunk-CUSf2Ml4.js";
import { c as assertPersistableQueryToggles, n as normalizeWorkflowQueryOptions, d as assertWorkflowQueryOptions, w as workflowMappingMatches, e as normalizeQueryOptions, v as validateQueryOptions, i as issueMessages } from "./chunk-944gmYue.js";
import { randomUUID, createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { g as getDatasourceQuerySchema, s as singleSpecRef, b as SPEC_DISCOVERY_METHODS, c as hubspotSpecs, e as extractSpec, l as loadKindSpec, d as listEndpoints, f as specHost, r as rankEndpoints, i as endpointTagCounts, j as endpointParameters } from "./chunk-wUGawh4I.js";
createRequire(import.meta.url);
function componentRef(component) {
  return component.clientRef ?? component.name;
}
function indexComponentReferences(components, existing = []) {
  const refs = /* @__PURE__ */ new Map();
  const errors = [];
  const names = /* @__PURE__ */ new Set();
  const persisted = /* @__PURE__ */ new Map();
  for (const component of existing) {
    for (const ref of new Set([component.id, component.name].filter((key) => Boolean(key)))) {
      const ids = persisted.get(ref) ?? /* @__PURE__ */ new Set();
      ids.add(component.id);
      persisted.set(ref, ids);
    }
  }
  for (const component of components) {
    const ref = componentRef(component);
    if (!ref.trim())
      errors.push(`Component "${component.name}": client_ref must not be empty.`);
    if (refs.has(ref) || persisted.has(ref))
      errors.push(`Duplicate component client_ref/name "${ref}".`);
    else
      refs.set(ref, component);
    if (names.has(component.name))
      errors.push(`Duplicate component name "${component.name}" in batch.`);
    names.add(component.name);
  }
  const resolved = components.map((component) => {
    if (component.parentRef && component.parent) {
      errors.push(`Component "${component.name}": set EITHER parent or parent_ref, not both.`);
    }
    if (component.parentRef && !refs.has(component.parentRef)) {
      const ids = persisted.get(component.parentRef);
      if (ids?.size === 1 && !component.parent) {
        return { ...component, parentRef: void 0, parent: [...ids][0] };
      }
      errors.push(`Component "${component.name}": unknown parent_ref "${component.parentRef}". Use a same-batch client_ref (or name when no client_ref is set); for an existing component, use parent with its persisted id.`);
    }
    return component;
  });
  return { refs, components: resolved, errors };
}
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
  function environment(envs, name) {
    const matches = envs.filter((e) => e.name.toLowerCase() === name.trim().toLowerCase());
    if (matches.length !== 1)
      throw new Error(`Unknown or ambiguous environment: ${name}. Inspect list_app_versions.`);
    if (!matches[0].enabled)
      throw new Error(`Environment ${name} is not enabled for this workspace.`);
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
var required$1 = (x, label) => {
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
      versionId = required$1(record(app2.editing_version ?? app2.editingVersion).id, "editing version");
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
    const environmentId = required$1(version.currentEnvironmentId ?? version.current_environment_id, "environment ID");
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
    const savedIds = new Set(saved.map((query) => query.id));
    if (graph.queries.some((mapping) => !savedIds.has(mapping.id))) {
      throw new Error("Workflow definition references a query outside its version; refusing AI execution.");
    }
    if (saved.some((query) => !query.data_source_id))
      throw new Error("Cannot verify a workflow query datasource; refusing AI execution.");
    if (saved.length)
      await queries.listDatasources(versionId);
    await Promise.all([...new Set(saved.map((query) => query.data_source_id))].map((id) => queries.assertDatasourceAllowed(id, versionId, environmentId)));
    for (const query of saved) {
      if (query.kind !== "workflows")
        continue;
      const options = record(query.options);
      const workflowId = required$1(options.workflowId, "nested workflow ID");
      if (!/^[A-Za-z0-9_-]+$/.test(workflowId))
        throw new Error("Cannot verify a dynamic nested workflow target.");
      let childVersion = options.workflowVersionId;
      if (!childVersion) {
        const child2 = record(await request(`/api/apps/${encodeURIComponent(workflowId)}`));
        childVersion = child2.current_version_id ?? child2.currentVersionId;
      }
      const childVersionId = required$1(childVersion, "nested workflow version");
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
    async create(name) {
      const created = record(await request("/api/workflows", { name, type: "workflow" }));
      const id = required$1(created.id, "created workflow ID");
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
      return { query_id: required$1(body.id, "created workflow query ID"), name: required$1(body.name, "created workflow query name") };
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
      const base = `/api/workflow_executions/${encodeURIComponent(id)}`;
      const response = record(await request(`${base}/status`));
      const status = { status: response.status, logs: response.logs };
      const nodes = await request(`${base}/nodes?${new URLSearchParams({ page: String(page), per_page: String(perPage) })}`);
      return { execution_id: id, status, nodes, page, per_page: perPage };
    }
  };
}
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
    const ready = [...remaining].filter((name) => [...dependencies.get(name) ?? []].every((dependency) => completed.has(dependency)));
    if (!ready.length) {
      throw new Error(`Table batch contains a circular foreign-key dependency: ${[...remaining].map((name) => byName.get(name)?.tableName ?? name).join(", ")}. Create one side first, then add the circular foreign key as a column change.`);
    }
    levels.push(ready.map((name) => byName.get(name)));
    ready.forEach((name) => {
      remaining.delete(name);
      completed.add(name);
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
var workspaceFoldersResponse = external_exports.object({
  folders: external_exports.array(external_exports.object({
    id: external_exports.string().min(1),
    name: external_exports.string(),
    folder_apps: external_exports.array(external_exports.object({ app_id: external_exports.string().min(1) }))
  }))
});
var workspaceAppsResponse = external_exports.object({
  apps: external_exports.array(external_exports.object({ id: external_exports.string().min(1) }).loose()),
  meta: external_exports.object({ folder_count: external_exports.number().int().nonnegative() }).loose()
}).loose();
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
  const reserved = columns.map((column) => column.name).filter((name) => TOOLJET_DB_RESERVED_COLUMN_NAMES.has(name.toLowerCase()));
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
  async function getWorkspaceFolders() {
    const res = await auth.authedFetch("/api/folder-apps?type=front-end");
    await assertOk(res, "listWorkspaceFolders");
    const parsed = workspaceFoldersResponse.safeParse(await res.json());
    if (!parsed.success)
      throw new Error("Unexpected workspace folders response.");
    return parsed.data.folders.map((folder) => {
      const appIds = new Set(folder.folder_apps.map((membership) => membership.app_id));
      return { summary: { id: folder.id, name: folder.name, app_count: appIds.size }, appIds };
    });
  }
  async function listWorkspaceFolders(params = {}) {
    const search = params.searchText?.trim().toLowerCase() ?? "";
    const folders = (await getWorkspaceFolders()).map((folder) => folder.summary).filter((folder) => folder.name.toLowerCase().includes(search));
    return { folders, meta: { total_count: folders.length } };
  }
  async function listWorkspaceApps(params = {}) {
    const folders = await getWorkspaceFolders();
    const selectedFolder = folders.find((folder) => folder.summary.id === params.folderId);
    if (params.folderId !== void 0 && !selectedFolder) {
      throw new Error("Folder not found or not accessible in the current workspace. Use list_workspace_folders to find an accessible folder_id.");
    }
    const query = new URLSearchParams({ page: String(params.page ?? 1), type: "front-end" });
    if (params.searchText)
      query.set("searchKey", params.searchText);
    if (params.folderId)
      query.set("folder", params.folderId);
    const res = await auth.authedFetch(`/api/apps?${query}`);
    await assertOk(res, "listWorkspaceApps");
    const parsed = workspaceAppsResponse.safeParse(await res.json());
    if (!parsed.success)
      throw new Error("Unexpected workspace apps response.");
    const data = parsed.data;
    const { folder_count: folderAppCount, ...meta } = data.meta;
    return {
      ...data,
      apps: data.apps.map((app) => ({
        ...app,
        folders: folders.filter((folder) => folder.appIds.has(app.id)).map(({ summary: { id, name } }) => ({ id, name }))
      })),
      folder: selectedFolder?.summary ?? null,
      meta: {
        ...meta,
        folder_app_count: selectedFolder ? folderAppCount : null,
        workspace_folder_count: folders.length
      }
    };
  }
  async function listWorkspaceUsers(params = {}) {
    const query = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.searchText)
      query.set("searchText", params.searchText);
    if (params.status)
      query.set("status", params.status);
    const res = await auth.authedFetch(`/api/organization-users?${query}`);
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
  async function createWorkspaceGroup(name) {
    const res = await auth.authedFetch(groupPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    await assertOk(res, "createWorkspaceGroup");
    const created = await res.json();
    if (typeof created?.id !== "string")
      throw new Error("Create group response did not include an id.");
    return getWorkspaceGroup(created.id);
  }
  async function renameWorkspaceGroup(groupId, name) {
    const res = await auth.authedFetch(`${groupPath}/${encodeURIComponent(groupId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
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
  async function renameAppTheme(themeId, name) {
    await updateAppTheme(themeId, "name", { name }, "renameAppTheme");
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
  async function createApp(name) {
    let createRes;
    let finalName = name;
    for (let attempt = 1; attempt <= 6; attempt++) {
      finalName = attempt === 1 ? name : `${name} ${attempt}`;
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
  async function renameApp(appId, versionId, name) {
    const res = await auth.authedFetch(`/api/apps/${appId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: { name, editingVersionId: versionId } })
    });
    await assertOk(res, "renameApp");
    const refreshed = await getApp(appId);
    if (refreshed.name !== name) {
      throw new Error(`ToolJet renameApp failed: expected name "${name}", received "${String(refreshed.name)}".`);
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
    const handleOf = (name) => name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "page";
    const existingNames = new Set((app.pages ?? []).map((page) => String(page.name).toLowerCase()));
    const existingHandles = new Set((app.pages ?? []).map((page) => String(page.handle).toLowerCase()));
    const seenNames = /* @__PURE__ */ new Set();
    const seenHandles = /* @__PURE__ */ new Set();
    const entries = params.pages.map((page, offset) => {
      const nameKey = page.name.toLowerCase();
      if (existingNames.has(nameKey) || seenNames.has(nameKey)) {
        throw new Error(`ToolJet createPages failed: duplicate page name "${page.name}".`);
      }
      const base = handleOf(page.name);
      let handle = base;
      for (let suffix = 2; existingHandles.has(handle) || seenHandles.has(handle); suffix++) {
        const tail = `-${suffix}`;
        handle = `${base.slice(0, 50 - tail.length)}${tail}`;
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
      const name = String(requestedNames.get(String(page.id)) ?? page.name ?? "").trim().toLowerCase();
      return `${kind}:${name}`;
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
      const ref = typeof raw?.ref === "string" ? raw.ref : "";
      const sourceKey = `${existing.target}:${existing.sourceId}:${ref}`;
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
    const query = await getQuery(queryId, versionId);
    if (!query.data_source_id)
      throw new Error("Cannot verify the saved query datasource; refusing AI access.");
    await assertDatasourceAllowed(query.data_source_id, versionId, environmentId);
    return query;
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
    if (kind === "workflows") {
      params = { ...params, options: normalizeWorkflowQueryOptions(params.options) };
      await assertWorkflowQueryTarget(params.options);
    }
    await assertDatasourceAllowed(params.dataSourceId, params.versionId);
    const res = await auth.authedFetch(`/api/data-queries/data-sources/${params.dataSourceId}/versions/${params.versionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name: params.name, options: params.options })
    });
    await assertOk(res, "createQuery");
    const body = await res.json();
    if (kind === "workflows") {
      try {
        await verifyWorkflowMapping(body.id, params.versionId, params.options);
      } catch (error) {
        throw new PartialWriteError("createQuery", [{ query_id: body.id, name: body.name }], [String(error)]);
      }
    }
    return { query_id: body.id, name: body.name };
  }
  async function createQueries(params) {
    const batchCheck = (async () => {
      const datasources = await listDatasources(params.versionId);
      for (const query of params.queries) {
        if (datasources.find((source) => source.id === query.dataSourceId)?.kind === "workflows")
          await assertWorkflowQueryTarget(query.options);
      }
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
    const completed = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : result.reason instanceof PartialWriteError ? result.reason.completed : []);
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
    const references = indexComponentReferences(params.components);
    if (references.errors.length)
      throw new Error(`createComponents: ${references.errors.join(" ")}`);
    const entries = params.components.map((spec) => ({ id: spec.id ?? randomUUID(), spec }));
    const refToId = new Map(entries.map((entry) => [componentRef(entry.spec), entry.id]));
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
      const submitId = submit && typeof submit.value === "string" ? refToId.get(submit.value) : void 0;
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
    const query = await assertQueryDatasourceAllowed(params.queryId, params.versionId);
    if (query.kind === "workflows") {
      params = { ...params, options: normalizeWorkflowQueryOptions(params.options) };
      await assertWorkflowQueryTarget(params.options);
    }
    const body = { options: params.options };
    if (params.name !== void 0)
      body.name = params.name;
    const res = await auth.authedFetch(`/api/data-queries/${params.queryId}/versions/${params.versionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    await assertOk(res, "updateQuery");
    if (query.kind === "workflows") {
      try {
        await verifyWorkflowMapping(params.queryId, params.versionId, params.options);
      } catch (error) {
        throw new PartialWriteError("updateQuery", [{ query_id: params.queryId, datasource_id: query.data_source_id }], [String(error)]);
      }
    }
    return { query_id: params.queryId };
  }
  async function verifyWorkflowMapping(queryId, versionId, options) {
    try {
      const saved = await getQuery(queryId, versionId);
      if (saved.kind !== "workflows" || !workflowMappingMatches(options, saved.options)) {
        throw new Error("Saved workflow target differs from the requested mapping.");
      }
    } catch (error) {
      throw new Error(`Query ${queryId} was written, but its workflow mapping could not be verified. Inspect this query and repair it in place; do not recreate it. ${String(error)}`);
    }
  }
  async function assertWorkflowQueryTarget(raw) {
    assertWorkflowQueryOptions(raw);
    const options = normalizeWorkflowQueryOptions(raw);
    const workflowId = options.workflowId;
    const versionId = options.workflowVersionId;
    const path = versionId ? `/api/v2/apps/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(versionId)}` : `/api/apps/${encodeURIComponent(workflowId)}`;
    const response = await auth.authedFetch(path);
    await assertOk(response, "verify workflow query target");
    const app = await response.json();
    if (app?.id !== workflowId || app.type !== "workflow" || (app.organizationId ?? app.organization_id) !== await auth.getOrganizationId()) {
      throw new Error("Workflow query target must be an accessible workflow in the active workspace.");
    }
    if (versionId && (app.editing_version ?? app.editingVersion)?.id !== versionId) {
      throw new Error("Workflow query version does not belong to the selected workflow.");
    }
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
    return (body.data_queries ?? []).map((query) => ({
      ...query,
      ...query.data_source_id ? { datasource_settings_url: datasourceManagementUrl(orgSlug, query.data_source_id) } : {}
    }));
  }
  async function getQuery(queryId, versionId) {
    const query = (await getQueries(versionId)).find((candidate) => candidate.id === queryId);
    if (!query)
      throw new Error(`ToolJet getQuery failed: query ${queryId} not found in version ${versionId}`);
    return query;
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
    assertWorkflowQueryTarget,
    workflows: createWorkflowClient(auth, config, { assertDatasourceAllowed, getQueries, listDatasources, createQuery, updateQuery, deleteQuery, getDevelopmentEnvironmentId }),
    listWorkspaces,
    useWorkspace,
    listWorkspaceApps,
    listWorkspaceFolders,
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
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function bindingBoolean(value) {
  return booleanBindingValue(value) ?? value;
}
function compactTheme(theme) {
  if (!theme)
    return null;
  return {
    ...typeof theme.id === "string" ? { id: theme.id } : {},
    ...typeof theme.name === "string" ? { name: theme.name } : {},
    ...typeof theme.isDefault === "boolean" ? { is_default: theme.isDefault } : {},
    ...typeof theme.isBasic === "boolean" ? { is_basic: theme.isBasic } : {},
    ...typeof theme.isDisabled === "boolean" ? { is_disabled: theme.isDisabled } : {}
  };
}
function projectAppSettings(snapshot) {
  const global = snapshot.global_settings ?? {};
  const properties = pageSettingProperties(snapshot);
  const disableMenu = asRecord(properties.disableMenu);
  const theme = asRecord(global.theme);
  return {
    app_id: snapshot.app_id,
    version_id: snapshot.version_id,
    canvas: {
      background_color: global.canvasBackgroundColor,
      max_width: {
        value: global.canvasMaxWidth,
        unit: global.canvasMaxWidthType
      },
      mode: global.appMode
    },
    theme: compactTheme(theme),
    header: {
      hidden: properties.hideHeader,
      logo_hidden: properties.hideLogo,
      title: properties.name
    },
    navigation: {
      hidden: bindingBoolean(disableMenu.value ?? properties.disableMenu),
      position: properties.position,
      style: properties.style,
      collapsible: properties.collapsable
    }
  };
}
function pageSettingProperties(snapshot) {
  return asRecord(asRecord(snapshot.page_settings).properties);
}
function projectJavascriptRuntime(snapshot) {
  const global = snapshot.global_settings ?? {};
  const raw = asRecord(global.libraries).javascript;
  const entries = Array.isArray(raw) ? raw : [];
  const script = asRecord(global.preloadedScript).javascript;
  return {
    configuration_state: raw === void 0 || Array.isArray(raw) && !raw.length ? "not_configured" : Array.isArray(raw) ? "configured" : "unknown",
    total: Array.isArray(raw) ? raw.length : raw === void 0 ? 0 : null,
    truncated: entries.length > 32,
    libraries: entries.slice(0, 32).map((value) => {
      const lib = asRecord(value);
      let sourceUrl = null;
      let redacted = false;
      let https = false;
      try {
        if (typeof lib.url === "string" && lib.url.length <= 4096) {
          const url = new URL(lib.url);
          if (url.protocol === "https:" || url.protocol === "http:") {
            https = url.protocol === "https:";
            redacted = Boolean(url.username || url.password || url.search || url.hash);
            url.username = "";
            url.password = "";
            url.search = "";
            url.hash = "";
            sourceUrl = url.toString();
          }
        }
      } catch {
      }
      return {
        name: typeof lib.name === "string" ? lib.name.slice(0, 128) : null,
        enabled: typeof lib.enabled === "boolean" ? lib.enabled : null,
        source_url: sourceUrl,
        url_valid: sourceUrl !== null,
        url_redacted: redacted,
        https
      };
    }),
    preloaded_script_present: typeof script === "string" ? Boolean(script.trim()) : null,
    runtime_verified: false,
    guidance: "Configuration is not proof of successful loading, export names, worker/CSP compatibility, or deployment support. In ToolJet versions with the native library loader, enabled HTTPS UMD/IIFE library exports are passed to RunJS as lexical parameters by their configured names, not guaranteed globalThis properties. Do not redeclare those parameter names with const/let. Preloaded script exports may add or override names; their code is intentionally omitted here. This MCP does not configure JavaScript libraries through update_app_settings. If required dependencies are missing, report the prerequisite and request supported setup instead of inventing globals or claiming OCR works. PDF.js rasterization, Tesseract worker initialization and actual image/PDF extraction still need runtime testing. Source URLs omit credentials, query strings and fragments; do not reuse redacted URLs as configuration."
  };
}
async function literalCanvasColor(client, appId, versionId) {
  if (!versionId || typeof client.getAppSettings !== "function")
    return void 0;
  try {
    const snapshot = await client.getAppSettings(appId, versionId);
    const colour = asRecord(snapshot.global_settings).canvasBackgroundColor;
    return typeof colour === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\))$/i.test(colour.trim()) ? colour.trim() : void 0;
  } catch {
    return void 0;
  }
}
function paintsDarkCanvasInLightMode(definition2) {
  const light = definition2?.surface?.colors?.appBackground?.light;
  const hex = typeof light === "string" ? /^#([0-9a-f]{6})$/i.exec(light.trim())?.[1] : void 0;
  if (!hex)
    return false;
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18;
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
var schemas = /* @__PURE__ */ new Map();
function exposeActions(source, definitions) {
  source.description += " Individually exposed operations: " + definitions.map((action) => action.name).join(", ") + ".";
  const handler = source.handler;
  return definitions.map(({ action, required: required2, optional = [], ...definition2 }) => {
    let schema = schemas.get(definition2.name);
    if (!schema) {
      const fields = {};
      for (const key of [...required2, ...optional]) {
        if (key === "action" || !source.inputSchema[key])
          throw new Error(`Invalid action field: ${definition2.name}.${key}`);
        fields[key] = source.inputSchema[key];
      }
      schema = external_exports.object(fields).required(Object.fromEntries(required2.map((key) => [key, true]))).strict();
      if (required2.includes("confirm"))
        schema = schema.extend({ confirm: external_exports.literal(true) });
      schemas.set(definition2.name, schema);
    }
    const input = schema;
    return {
      ...definition2,
      strictInput: true,
      inputSchema: input.shape,
      async handler(args) {
        try {
          return await handler({ ...input.parse(args), action });
        } catch (error) {
          return fail(error);
        }
      }
    };
  });
}
createRequire(import.meta.url);
var THEME_LICENCE_USER_MESSAGE = "Custom themes are not included in your current ToolJet plan, so this app uses the workspace default theme. Upgrading your plan enables branded themes; the app can be re-themed in one request afterwards.";
var colorPair = external_exports.object({
  light: external_exports.string().trim().min(1).max(100).describe("Color used in light mode; hex is recommended."),
  dark: external_exports.string().trim().min(1).max(100).describe("Color used in dark mode; hex is recommended.")
}).strict();
var themeDefinition = external_exports.object({
  brand: external_exports.object({
    colors: external_exports.object({
      primary: colorPair,
      secondary: colorPair.optional(),
      tertiary: colorPair.optional()
    }).strict()
  }).strict(),
  text: external_exports.object({
    font: external_exports.string().trim().min(1).max(200),
    colors: external_exports.object({
      primary: colorPair,
      placeholder: colorPair.optional(),
      disabled: colorPair.optional()
    }).strict()
  }).strict(),
  border: external_exports.object({
    radius: external_exports.object({
      default: external_exports.number().nonnegative(),
      small: external_exports.number().nonnegative(),
      large: external_exports.number().nonnegative()
    }).strict(),
    colors: external_exports.object({
      default: colorPair,
      weak: colorPair.optional(),
      disabled: colorPair.optional()
    }).strict()
  }).strict(),
  systemStatus: external_exports.object({
    colors: external_exports.object({
      success: colorPair,
      error: colorPair.optional(),
      warning: colorPair.optional()
    }).strict()
  }).strict(),
  surface: external_exports.object({
    colors: external_exports.object({
      appBackground: colorPair,
      surface1: colorPair,
      surface2: colorPair,
      surface3: colorPair
    }).strict()
  }).strict()
}).strict();
async function applyToApp(client, theme, args, definition2) {
  if (!args.app_id || !args.version_id)
    return void 0;
  const dark = paintsDarkCanvasInLightMode(definition2);
  await client.updateAppSettings({
    appId: args.app_id,
    versionId: args.version_id,
    globalSettings: { theme, ...dark ? { appMode: "dark" } : {} }
  });
  return { app_id: args.app_id, version_id: args.version_id, ...dark ? { app_mode: "dark" } : {} };
}
function requireValue(value, label) {
  if (value === void 0)
    throw new Error(`manage_theme requires ${label} for this action.`);
  return value;
}
async function readTheme(client, themeId) {
  const theme = (await client.listAppThemes()).find((candidate) => candidate.id === themeId);
  if (!theme)
    throw new Error(`Theme "${themeId}" is not available in the active workspace.`);
  return theme;
}
function manageThemeTool(client) {
  return {
    name: "manage_theme",
    title: "Manage Workspace Theme",
    // list/create/rename are safe, but the same tool also deletes a theme, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false
    },
    description: "Manage workspace theme objects through ToolJet's typed theme API. Actions: list, create, set_default, update_definition, rename, delete. Definitions contain brand, text, border, systemStatus, and surface tokens with light/dark values. create with app_id and version_id also applies the theme to that app (in dark mode when its light-mode canvas is dark), so a new app needs no update_app_settings call; create reuses a theme of the same name, so there is no need to list themes first. Delete requires confirm:true after exact-target approval. list returns id, name and flags only; pass include_definitions:true (or theme_id) to get a definition.",
    inputSchema: {
      action: external_exports.enum(["list", "create", "set_default", "update_definition", "rename", "delete"]),
      theme_id: external_exports.string().uuid().optional(),
      name: external_exports.string().trim().min(1).max(100).optional(),
      definition: themeDefinition.optional(),
      is_default: external_exports.boolean().optional(),
      confirm: external_exports.boolean().optional(),
      include_definitions: external_exports.boolean().optional(),
      app_id: external_exports.string().uuid().optional().describe("create only: apply the theme to this app as well"),
      version_id: external_exports.string().uuid().optional().describe("create only, with app_id: the app version to apply it to")
    },
    async handler(args) {
      try {
        if (args.action === "list") {
          const themes2 = await client.listAppThemes();
          if (args.include_definitions)
            return ok({ themes: themes2 });
          if (args.theme_id) {
            const one = themes2.find((theme) => theme.id === args.theme_id);
            return one ? ok({ themes: [one] }) : fail(new Error(`Theme "${args.theme_id}" not found.`));
          }
          return ok({
            themes: themes2.map(({ id, name, isDefault, isBasic, isDisabled }) => ({ id, name, isDefault, isBasic, isDisabled })),
            note: "Definitions omitted; pass include_definitions:true or theme_id to read one."
          });
        }
        if (args.action === "create") {
          const name = requireValue(args.name, "name");
          if (name.length < 5)
            throw new Error("Theme name must contain at least 5 characters.");
          if (name === "ToolJet")
            throw new Error('The reserved theme name "ToolJet" cannot be used.');
          const existing = (await client.listAppThemes()).find((theme) => theme.name === name && !theme.isDisabled);
          if (existing) {
            const applied = await applyToApp(client, existing, args, existing.definition ?? args.definition);
            return ok({
              theme: existing,
              reused: true,
              ...applied ? { applied } : {},
              warnings: [
                `Theme "${name}" already exists in this workspace; returned it instead of creating a duplicate. ` + (applied ? "It is applied to the app." : "Apply it with update_app_settings, or use update_definition to change it.")
              ]
            });
          }
          try {
            const created = await client.createAppTheme({
              name,
              definition: requireValue(args.definition, "definition"),
              isDefault: args.is_default ?? false
            });
            const applied = await applyToApp(client, created, args, args.definition);
            return ok({ theme: created, ...applied ? { applied } : {} });
          } catch (error) {
            if (error instanceof ToolJetHttpError && error.status === 451) {
              return ok({
                theme: null,
                licensed: false,
                user_message: THEME_LICENCE_USER_MESSAGE,
                warnings: [
                  "Custom themes are not included in this ToolJet plan (HTTP 451). The app keeps the workspace default theme. Do not retry theme creation or guess a theme id; build the app on the default theme and repeat `user_message` to the user in the closing handoff."
                ]
              });
            }
            throw error;
          }
        }
        const themeId = requireValue(args.theme_id, "theme_id");
        await readTheme(client, themeId);
        if (args.action === "set_default") {
          await client.setDefaultAppTheme(themeId, args.is_default ?? true);
          return ok({ theme: await readTheme(client, themeId) });
        }
        if (args.action === "update_definition") {
          await client.updateAppThemeDefinition(themeId, requireValue(args.definition, "definition"));
          return ok({ theme: await readTheme(client, themeId) });
        }
        if (args.action === "rename") {
          await client.renameAppTheme(themeId, requireValue(args.name, "name"));
          return ok({ theme: await readTheme(client, themeId) });
        }
        if (args.confirm !== true) {
          throw new Error(`Deleting theme "${themeId}" requires confirm:true after exact-target user approval.`);
        }
        await client.deleteAppTheme(themeId);
        return ok({ deleted: true, theme_id: themeId });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var themes = [
  {
    action: "list",
    name: "list_workspace_themes",
    title: "List Workspace Theme Definitions",
    description: "Read workspace themes with id, name, and flags. Unlike list_app_themes, this also supports include_definitions:true for all definitions or theme_id for one full definition. Does not change themes.",
    required: [],
    optional: ["theme_id", "include_definitions"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "create",
    name: "create_workspace_theme",
    title: "Create Workspace Theme",
    description: "Create a custom workspace theme, or reuse an existing active theme of the same name. Supply a name of at least five characters and a full definition for a new theme. is_default can replace the workspace default. With both app_id and version_id, applies it to that app and selects dark mode for a dark light-mode canvas. License gates apply.",
    required: ["name"],
    optional: ["definition", "is_default", "app_id", "version_id"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "set_default",
    name: "set_default_workspace_theme",
    title: "Set Default Workspace Theme",
    description: "Change whether an existing workspace theme is the default. is_default defaults to true; false removes its default status. Changes the workspace default used by apps.",
    required: ["theme_id"],
    optional: ["is_default"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "update_definition",
    name: "update_workspace_theme_definition",
    title: "Update Workspace Theme Definition",
    description: "Replace the full token definition of an existing workspace theme, affecting apps using it. Definitions require brand, text, border, systemStatus, and surface tokens with light/dark colors. License gates apply.",
    required: ["theme_id", "definition"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "rename",
    name: "rename_workspace_theme",
    title: "Rename Workspace Theme",
    description: "Replace the name of an existing workspace theme. Requires a theme_id from the active workspace; ToolJet permissions and license gates apply.",
    required: ["theme_id", "name"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete",
    name: "delete_workspace_theme",
    title: "Delete Workspace Theme",
    description: "Delete an existing workspace theme only after explicit approval of that exact theme. Requires confirm:true. ToolJet permissions and license gates apply.",
    required: ["theme_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function themeActionTools(source) {
  return exposeActions(source, themes);
}
createRequire(import.meta.url);
var userRole = external_exports.enum(["admin", "builder", "end-user"]);
var userStatus = external_exports.enum(["active", "archived", "invited"]);
var listWorkspaceAppsInput = external_exports.object({
  page: external_exports.number().int().positive().optional(),
  search_text: external_exports.string().trim().max(100).describe("Filter by app name.").optional(),
  folder_id: external_exports.string().uuid().describe("Folder ID returned by list_workspace_folders.").optional()
}).strict();
var listWorkspaceFoldersInput = external_exports.object({
  search_text: external_exports.string().trim().max(100).describe("Case-insensitive folder-name search.").optional()
}).strict();
function listWorkspaceAppsTool(client) {
  return {
    name: "list_workspace_apps",
    title: "List Workspace Apps",
    strictInput: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "List front-end apps in the workspace pinned to the current ToolJet connection, with pagination, app-name search, and optional folder_id filtering. Discover folder IDs with list_workspace_folders. Each app includes folders: [{id,name}] (empty when unfiled). The top-level folder describes the selected folder, or is null. meta.workspace_folder_count counts visible app folders; meta.folder_app_count counts matching apps in the selected folder (null without a folder filter). meta.total_count remains the workspace-wide count of matching apps even with folder_id; use meta.folder_app_count for the folder. This cannot inspect or switch to another workspace.",
    inputSchema: listWorkspaceAppsInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceAppsInput.parse(input);
        return ok(await client.listWorkspaceApps({ page: args.page, searchText: args.search_text, folderId: args.folder_id }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function listWorkspaceFoldersTool(client) {
  return {
    name: "list_workspace_folders",
    title: "List Workspace Folders",
    strictInput: true,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "List visible front-end app folders in the workspace pinned to the current ToolJet connection. Returns folders: [{id,name,app_count}] and meta.total_count (matching folders). app_count counts apps visible to you. search_text filters folder names, not app names. Includes empty folders when ToolJet permits you to see them. Pass a returned id as folder_id to list_workspace_apps to read that folder\u2019s apps with pagination and app-name search. OAuth connections require the apps scope; existing ToolJet permissions still apply.",
    inputSchema: listWorkspaceFoldersInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceFoldersInput.parse(input);
        return ok(await client.listWorkspaceFolders({ searchText: args.search_text }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function listWorkspaceUsersTool(client) {
  return {
    name: "list_workspace_users",
    title: "List Workspace Users",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false
    },
    description: "List users in the workspace pinned to the current ToolJet connection. Supports pagination, search, and status filtering. OAuth connections require the workspace_users scope.",
    inputSchema: {
      page: external_exports.number().int().positive().optional(),
      search_text: external_exports.string().trim().max(100).optional(),
      filter_status: userStatus.optional()
    },
    async handler(args) {
      try {
        return ok(await client.listWorkspaceUsers({
          page: args.page,
          searchText: args.search_text,
          status: args.filter_status
        }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function required(value, label) {
  if (!value)
    throw new Error(`${label} is required for this action.`);
  return value;
}
var manageWorkspaceUsersInput = external_exports.object({
  action: external_exports.enum(["invite", "update", "archive", "unarchive"]),
  organization_user_id: external_exports.string().uuid().optional(),
  email: external_exports.string().email().optional(),
  first_name: external_exports.string().trim().max(99).optional(),
  last_name: external_exports.string().trim().max(99).optional(),
  role: userRole.optional(),
  group_ids: external_exports.array(external_exports.string().uuid()).max(100).optional(),
  user_metadata: external_exports.record(external_exports.string(), external_exports.unknown()).optional(),
  confirm: external_exports.boolean().optional()
}).strict();
function manageWorkspaceUsersTool(client) {
  return {
    name: "manage_workspace_users",
    title: "Manage Workspace Users",
    strictInput: true,
    // invite is additive, but update overwrites a member's role and archive revokes their access to
    // the workspace, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Manage users only in the workspace pinned to the current ToolJet connection. OAuth connections require the workspace_users scope. Invite, update, archive, and unarchive require confirm:true. Updates can change role, add existing custom group_ids while preserving all other memberships, and merge supplied user_metadata keys while preserving other keys. Empty group_ids never removes groups. first_name/last_name are only supported for invitations: editing an existing name requires a Super Admin in ToolJet and is refused by this workspace-scoped tool before any mutation. Updates are read back before success is reported. Use manage_workspace_groups remove_member for explicit membership removal. Updates cannot change email or passwords. Changing a role to end-user also transfers any apps owned by that user to the acting admin under ToolJet's existing behavior; disclose this before confirmation. Invite accepts email, optional names/role/group_ids; archive/unarchive accepts only organization_user_id. Never substitute role or membership changes for a rejected name edit, or bypass the connection owner's ToolJet permissions.",
    inputSchema: manageWorkspaceUsersInput.shape,
    async handler(input) {
      try {
        const args = manageWorkspaceUsersInput.parse(input);
        const allowed = args.action === "invite" ? ["email", "first_name", "last_name", "role", "group_ids"] : args.action === "update" ? ["organization_user_id", "first_name", "last_name", "role", "group_ids", "user_metadata"] : ["organization_user_id"];
        for (const key of Object.keys(args)) {
          if (!["action", "confirm", ...allowed].includes(key))
            throw new Error(`${key} is not supported for ${args.action}; no changes were made.`);
        }
        if (args.action === "update" && (args.first_name !== void 0 || args.last_name !== void 0)) {
          throw new Error("Name changes require a Super Admin and are not supported by this workspace-scoped tool. No changes were made. Ask a Super Admin to edit the name in ToolJet.");
        }
        if (args.confirm !== true) {
          throw new Error(`${args.action} requires confirm:true after checking the exact workspace user.`);
        }
        if (args.action === "invite") {
          await client.inviteWorkspaceUser({
            email: required(args.email, "email"),
            role: args.role ?? "end-user",
            firstName: args.first_name,
            lastName: args.last_name,
            groupIds: args.group_ids
          });
          return ok({ invited: true, email: args.email });
        }
        const organizationUserId = required(args.organization_user_id, "organization_user_id");
        if (args.action === "archive" || args.action === "unarchive") {
          await client.setWorkspaceUserArchived(organizationUserId, args.action === "archive");
          return ok({ organization_user_id: organizationUserId, status: args.action === "archive" ? "archived" : "active" });
        }
        if (args.first_name === void 0 && args.last_name === void 0 && args.role === void 0 && !args.group_ids?.length && args.user_metadata === void 0) {
          throw new Error("update requires at least one changed field.");
        }
        const result = await client.updateWorkspaceUser(organizationUserId, {
          firstName: args.first_name,
          lastName: args.last_name,
          role: args.role,
          addGroupIds: args.group_ids,
          userMetadata: args.user_metadata
        });
        return ok({
          organization_user_id: organizationUserId,
          ...result,
          ...!result.updated ? { already_satisfied: true } : {}
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var workspaceUsers = [
  {
    action: "invite",
    name: "invite_workspace_user",
    title: "Invite Workspace User",
    description: "Send an email invitation to the pinned workspace. Requires confirm:true for the exact recipient and access. Role defaults to end-user; optional group_ids add existing custom groups. Requires workspace_users OAuth scope and ToolJet permissions. Do not automatically retry an uncertain send.",
    required: ["email", "confirm"],
    optional: ["first_name", "last_name", "role", "group_ids"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true }
  },
  {
    action: "update",
    name: "update_workspace_user",
    title: "Update Workspace User",
    description: "Change a workspace member role, add custom group memberships, or merge supplied metadata keys. Preserves other memberships and metadata; empty group_ids removes nothing. Changing role to end-user transfers owned apps to the acting admin: disclose before confirm:true. Cannot change names, email, or passwords. Requires workspace_users scope and ToolJet permissions; reads back updates.",
    required: ["organization_user_id", "confirm"],
    optional: ["role", "group_ids", "user_metadata"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "archive",
    name: "archive_workspace_user",
    title: "Archive Workspace User",
    description: "Archive the exact member of the pinned workspace and revoke their workspace access. Requires confirm:true, workspace_users OAuth scope, and ToolJet permissions.",
    required: ["organization_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "unarchive",
    name: "unarchive_workspace_user",
    title: "Unarchive Workspace User",
    description: "Restore an archived member to active status in the pinned workspace. Requires confirm:true, workspace_users OAuth scope, and ToolJet permissions.",
    required: ["organization_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function workspaceUserActionTools(source) {
  return exposeActions(source, workspaceUsers);
}
createRequire(import.meta.url);
var listWorkspaceGroupsInput = external_exports.object({
  group_id: external_exports.string().uuid().optional(),
  include_permissions: external_exports.boolean().optional(),
  resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional()
}).strict();
function listWorkspaceGroupsTool(client) {
  return {
    name: "list_workspace_groups",
    title: "List Workspace Groups",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: "List groups in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. Supply group_id to list its non-archived members with group_user_id (membership id, distinct from user_id and organization_user_id). Use include_permissions:true with group_id to read permission switches and granular access rules. Use resource_type (app/module/workflow/data_source) to discover selectable resources and their names/IDs. Use exact returned ids for group changes. Requires ToolJet admin permissions.",
    inputSchema: listWorkspaceGroupsInput.shape,
    async handler(input) {
      try {
        const args = listWorkspaceGroupsInput.parse(input);
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
var manageWorkspaceGroupsInput = external_exports.object({
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
function manageWorkspaceGroupsTool(client) {
  return {
    name: "manage_workspace_groups",
    title: "Manage Workspace Groups",
    strictInput: true,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    description: "Create, rename, delete custom groups or remove a member in the workspace pinned to the current connection. OAuth connections require the workspace_users scope. All actions require confirm:true after reviewing the exact change. create needs name; rename needs group_id and name; delete needs group_id; remove_member needs group_id and group_user_id from list_workspace_groups. Removing membership does not delete the workspace user. Deleting a group removes its memberships and permissions. duplicate needs group_id and at least one true copy flag (permissions/members/apps/modules/workflows/data_sources; omitted flags false); ToolJet assigns the copy name. update_permissions needs group_id and permissions (only supplied switches change). create_access needs group_id, resource_type and access {name,is_all,actions,resource_ids}; update_access needs group_id, rule_id and access (only supplied fields change); delete_access needs group_id and rule_id. For update/delete access, optional resource_type must match the existing rule. Read include_permissions:true first to resolve rule IDs; resource_type discovers selectable resource IDs. On update_access, use access.add_resource_ids/remove_resource_ids to change only those resources and preserve the rest. access.resource_ids is only for an explicitly requested replacement of the entire rule selection; do not combine it with add/remove_resource_ids. Resource additions/removals require a selected-resource rule; is_all:true applies to ALL current and future resources of its type. On create_access, omitted action switches are disabled. App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased. Module actions: canEdit/canView/hideFromDashboard. Workflow actions: canEdit/canView. Data source actions: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs: enabling one disables the other, including on partial updates. Disabled groups and read_only rules are not editable under the current license/plan. allow_role_change is only for permission updates and access updates, and only with explicit consent to change affected member roles. Admin permissions cannot be changed; default group names/memberships cannot be changed here. To add members use manage_workspace_users with group_ids. ToolJet admin and license checks apply.",
    inputSchema: manageWorkspaceGroupsInput.shape,
    async handler(input) {
      try {
        const args = manageWorkspaceGroupsInput.parse(input);
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
var groupBoundary = " Requires confirm:true for the exact change, workspace_users OAuth scope, and ToolJet admin permissions. License restrictions apply.";
var accessBehavior = " App actions: canEdit/canView/hideFromDashboard/canAccessDevelopment/canAccessStaging/canAccessProduction/canAccessReleased; module: canEdit/canView/hideFromDashboard; workflow: canEdit/canView; data_source: canConfigure/canUse. canEdit/canView and canConfigure/canUse are exclusive pairs; enabling one disables the other. is_all:true includes current and future resources.";
var workspaceGroups = [
  {
    action: "create",
    name: "create_workspace_group",
    title: "Create Workspace Group",
    description: "Create an empty custom group in the pinned workspace." + groupBoundary,
    required: ["name", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "rename",
    name: "rename_workspace_group",
    title: "Rename Workspace Group",
    description: "Rename an existing custom group. Default group names cannot be changed." + groupBoundary,
    required: ["group_id", "name", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete",
    name: "delete_workspace_group",
    title: "Delete Workspace Group",
    description: "Delete an existing custom group, including its memberships and permissions. Cannot delete default groups." + groupBoundary,
    required: ["group_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "remove_member",
    name: "remove_workspace_group_member",
    title: "Remove Workspace Group Member",
    description: "Remove one membership from a custom group without deleting the workspace user. group_user_id is the membership ID returned by list_workspace_groups, not a user ID; membership must belong to this group." + groupBoundary,
    required: ["group_id", "group_user_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "duplicate",
    name: "duplicate_workspace_group",
    title: "Duplicate Workspace Group",
    description: "Duplicate a group with selected categories: permissions, members, apps, modules, workflows, or data_sources. At least one copy flag must be true; omitted flags are false. ToolJet assigns the copy name. Copying members and permissions can grant access through the new group." + groupBoundary,
    required: ["group_id", "copy", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "update_permissions",
    name: "update_workspace_group_permissions",
    title: "Update Workspace Group Permissions",
    description: "Update only supplied permission switches on a group. Admin permissions cannot be changed. allow_role_change requires explicit consent to change affected member roles." + groupBoundary,
    required: ["group_id", "permissions", "confirm"],
    optional: ["allow_role_change"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "create_access",
    name: "create_workspace_group_access",
    title: "Create Workspace Group Access Rule",
    description: "Create a granular group access rule for the selected resource type. access requires name, is_all, and actions; selected-resource rules also need resource_ids from list_workspace_groups. Omitted action switches are disabled." + accessBehavior + groupBoundary,
    required: ["group_id", "resource_type", "access", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "update_access",
    name: "update_workspace_group_access",
    title: "Update Workspace Group Access Rule",
    description: "Update an existing rule belonging to this group; read IDs with list_workspace_groups include_permissions:true. Only supplied fields change. add_resource_ids/remove_resource_ids preserve other selections and require a selected-resource rule; do not combine with resource_ids or is_all. resource_ids replaces the entire selection. Optional resource_type must match the rule. allow_role_change needs explicit role-change consent." + accessBehavior + groupBoundary,
    required: ["group_id", "rule_id", "access", "confirm"],
    optional: ["resource_type", "allow_role_change"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "delete_access",
    name: "delete_workspace_group_access",
    title: "Delete Workspace Group Access Rule",
    description: "Delete a granular access rule belonging to this group. Read rule IDs with list_workspace_groups include_permissions:true. Optional resource_type must match. Read-only rules cannot be deleted." + groupBoundary,
    required: ["group_id", "rule_id", "confirm"],
    optional: ["resource_type"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function workspaceGroupActionTools(source) {
  return exposeActions(source, workspaceGroups);
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
      destructiveHint: false,
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
    const mapping = typeof definitionId === "string" && graph.queries.find((query) => query.idOnDefinition === definitionId);
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
    if (!queries.some((query) => query.id === mapping.id))
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
    const name = item.role === "agent-model" ? item.name : input.name;
    if (oldQuery && (oldQuery.kind !== kind || oldQuery.data_source_id !== dataSourceId))
      throw new Error(item.role === "agent-model" ? "Changing an Agent model datasource is unsupported; remove the model first, then add its replacement in a second phase." : "Changing an existing query datasource is unsupported; add a new node.");
    if (oldQuery?.name !== void 0 && oldQuery.name !== name)
      throw new Error(item.role === "agent-model" ? "Renaming an Agent model query is unsupported; remove the model first, then add its replacement in a second phase." : "Renaming existing queries is unsupported because code references cannot be rewritten safely.");
    if (claimedNames.has(name) || queries.some((q) => q.name === name && q.id !== oldQuery?.id))
      throw new Error(`Duplicate query name: ${name}`);
    claimedNames.add(name);
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
    writes.push({ node_id: item.node_id, definition_id: item.definition_id, existing_id: oldQuery?.id, name, dataSourceId: dataSourceId ?? "", kind, options });
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
export {
  projectJavascriptRuntime as A,
  projectAppSettings as B,
  compactTheme as C,
  pageSettingProperties as D,
  ToolJetHttpError as E,
  hasNonEmptyDefinition as F,
  themeActionTools as G,
  workspaceGroupActionTools as H,
  workspaceUserActionTools as I,
  exposeActions as J,
  PartialWriteError as P,
  TOOLJET_DB_DATA_TYPES as T,
  invalidSeedTimestamps as a,
  completedPartialWrites as b,
  componentRef as c,
  createClient as d,
  listWorkspaceAppsTool as e,
  fail as f,
  listWorkspaceFoldersTool as g,
  listWorkspaceUsersTool as h,
  indexComponentReferences as i,
  listWorkspaceGroupsTool as j,
  manageWorkspaceGroupsTool as k,
  literalCanvasColor as l,
  manageWorkspaceUsersTool as m,
  normalizeType as n,
  ok as o,
  inspectDatasourceSchemaTool as p,
  manageThemeTool as q,
  capabilityRequestSchema as r,
  strictEntry as s,
  themeDefinition as t,
  getWorkflowCapabilities as u,
  validateTableBatch as v,
  lint as w,
  apply as x,
  deleteNode as y,
  paintsDarkCanvasInLightMode as z
};
