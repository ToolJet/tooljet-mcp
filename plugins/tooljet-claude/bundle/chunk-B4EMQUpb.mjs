import { createRequire } from "node:module";
import { e as assertPersistableQueryToggles, n as normalizeWorkflowQueryOptions, t as tableQuotaError, f as assertWorkflowQueryOptions, T as TableQuotaError, w as workflowMappingMatches, o as ok, h as fail, i as normalizeQueryToggles, j as toggleRewriteWarning, k as issueMessages, q as queryToggleIssues, m as normalizeQueryOptions, v as validateQueryOptions, g as getComponentSchema, p as parseExpression } from "./chunk-B1xVpwDC.mjs";
import { b3 as external_exports, ba as definition } from "./chunk-CSMyw4Vw.mjs";
import { g as getDatasourceQuerySchema, s as singleSpecRef, c as SPEC_DISCOVERY_METHODS, d as hubspotSpecs, e as extractSpec, l as loadKindSpec, f as listEndpoints, i as specHost, j as rankEndpoints, k as endpointTagCounts, m as endpointParameters } from "./chunk-C3n37ePc.mjs";
import { e as encodeComponentParent, a as assertPageIcon, S as STYLE_KEYS_IN_PROPERTIES, d as decodeComponentParent, l as lintComponentStateBindings, m as minimumTextHeight, P as PROPERTY_KEY_ALIASES, n as nearestCatalogKey } from "./chunk-PpmaHFhJ.mjs";
import { randomUUID, createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
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
    for (const ref of new Set([component.id, component.name].filter((key2) => Boolean(key2)))) {
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
    async create(name) {
      const created = record(await request("/api/workflows", { name, type: "workflow" }));
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
    const key2 = normalized(table.tableName);
    dependencies.set(key2, new Set((table.foreignKeys ?? []).map((foreignKey) => normalized(foreignKey.referencedTable)).filter((referenced) => referenced !== key2 && byName.has(referenced))));
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
  return WORKSPACE_ACCESS_KEYS.filter((key2) => !["canConfigure", "canUse"].includes(key2));
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
      const result = Object.fromEntries(fields.filter((key2) => Object.hasOwn(user, key2)).map((key2) => [key2, user[key2]]));
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
    return Object.fromEntries(keys.filter((key2) => typeof value?.[key2] === "boolean").map((key2) => [key2, value[key2]]));
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
    const key2 = `${await auth.getOrganizationId()}:${dataSourceId}`;
    if (!datasourceIdentities.has(key2) && versionId)
      await listDatasources(versionId);
    const known = datasourceIdentities.get(key2);
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
var listWorkspaceGroupsInput = external_exports.object({
  group_id: external_exports.string().uuid().optional(),
  include_permissions: external_exports.boolean().optional(),
  resource_type: external_exports.enum(["app", "module", "workflow", "data_source"]).optional()
}).strict();
function listWorkspaceGroupsTool(client) {
  return {
    name: "list_workspace_groups",
    title: "List Workspace Groups",
    annotations: { readOnlyHint: true, openWorldHint: true },
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
  permissions: external_exports.object(Object.fromEntries(WORKSPACE_PERMISSION_KEYS.map((key2) => [key2, external_exports.boolean().optional()]))).strict().optional(),
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
    actions: external_exports.object(Object.fromEntries(WORKSPACE_ACCESS_KEYS.map((key2) => [key2, external_exports.boolean().optional()]))).strict().optional(),
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
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
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
        for (const key2 of ["copy", "permissions", "resource_type", "access", "rule_id", "allow_role_change"]) {
          if (args[key2] !== void 0 && !expected[args.action]?.includes(key2))
            throw new Error(`${key2} must be omitted for ${args.action}.`);
        }
        for (const key2 of expected[args.action] ?? []) {
          if (key2 !== "allow_role_change" && !(key2 === "resource_type" && args.action !== "create_access") && args[key2] === void 0)
            throw new Error(`${key2} is required.`);
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
          if (access.actions && (!Object.keys(access.actions).length || Object.keys(access.actions).some((key2) => !actionKeys.includes(key2)))) {
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
          const actions = { ...creating ? Object.fromEntries(actionKeys.map((key2) => [key2, false])) : rule.actions, ...access.actions };
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
        if (!members.some((member2) => member2.group_user_id === args.group_user_id)) {
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
  const key2 = specText(options.spec) ?? specText(options.definition);
  if (key2 === void 0)
    return extractSpec(options);
  const hit = specCache.get(key2);
  if (hit)
    return hit;
  const parsed = extractSpec(options);
  if (parsed) {
    if (specCache.size > 8)
      specCache.clear();
    specCache.set(key2, parsed);
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
  const method = ["operation", "method", "httpMethod", "http_method", "verb"].map((key2) => request.args?.[key2]).find((value) => typeof value === "string" && !!value);
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
          const key2 = JSON.stringify([request.method, request.schema ?? null, request.table ?? null, request.search ?? null]);
          if (seenRequests.has(key2))
            return false;
          seenRequests.add(key2);
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
function resolveRef(candidates, ref, kind, scope, describe = (candidate) => `${candidate.name ?? "(unnamed)"}=${candidate.id}`) {
  const byId = candidates.find((candidate) => candidate.id === ref);
  if (byId)
    return { ok: true, target: byId };
  const byName = candidates.filter((candidate) => candidate.name === ref);
  if (byName.length === 1)
    return { ok: true, target: byName[0] };
  if (byName.length > 1) {
    return {
      ok: false,
      error: `${kind} name "${ref}" is ambiguous ${scope} (${byName.length} share it). Pass the id instead: ${byName.map((candidate) => candidate.id).join(", ")}.`
    };
  }
  const available = candidates.map(describe).join(", ");
  return {
    ok: false,
    // The "do not re-read" clause matters: the previous phrasing ("does not exist") invited exactly
    // the re-read that caused the loop.
    error: `No ${kind.toLowerCase()} with id or name "${ref}" ${scope}. Do not re-read \u2014 it currently holds: ${available || "(none)"}.`
  };
}
var member = (n) => n && ["MemberExpression", "OptionalMemberExpression"].includes(n.type);
var key = (n) => n.computed ? n.property?.type === "StringLiteral" ? n.property.value : void 0 : n.property?.name;
var unwrap = (v) => v && typeof v === "object" && "value" in v ? v.value : v;
function inputRefs(value) {
  const refs = /* @__PURE__ */ new Set();
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
      found.forEach((name) => refs.add(name));
  };
  scan(value);
  return refs;
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
  const refs = /* @__PURE__ */ new Set();
  const rooted = (n, name) => member(n) && n.object?.type === "Identifier" && n.object.name === name && key(n);
  const visit = (n) => {
    if (n.type === "LogicalExpression" && n.operator === (disabled ? "||" : "&&"))
      return visit(n.left) && visit(n.right);
    if (disabled && n.type === "UnaryExpression" && n.operator === "!") {
      const v2 = n.argument;
      if (member(v2) && key(v2) === "value" && rooted(v2.object, "components")) {
        refs.add(key(v2.object));
        return true;
      }
    }
    if (!disabled && member(n) && key(n) === "value" && rooted(n.object, "components")) {
      refs.add(key(n.object));
      return true;
    }
    const v = n.type === "UnaryExpression" && n.operator === "!" ? n.argument : n;
    return Boolean(member(v) && key(v) === "isLoading" && rooted(v.object, "queries"));
  };
  return visit(root) ? refs : /* @__PURE__ */ new Set();
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
  const resolve = (value) => {
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
    const target = resolve(event.action.queryId);
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
            const missing = requiredHandles.filter((required2) => !supplied.has(required2));
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
function matchPlannedPage(pages, name, plannedNames, claimed = /* @__PURE__ */ new Set()) {
  const byName = pages.find((page) => page.name === name && !claimed.has(page.id));
  if (byName || name !== "Home" || pages.some((page) => page.name === "Home"))
    return byName;
  return pages.find((page) => page.handle === "home" && !claimed.has(page.id) && !plannedNames.has(page.name ?? ""));
}
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
    for (const [key2, item] of Object.entries(value)) {
      const result = separateAdjacentClosingBracesDeep(item);
      changed ||= result.changed;
      next[key2] = result.value;
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
  for (const [key2, entry] of Object.entries(section)) {
    const canonical = entry !== null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry ? entry : { value: entry };
    value[key2] = canonical;
    if (canonical !== entry)
      patch[key2] = canonical;
  }
  return {
    value,
    patch: Object.keys(patch).length ? patch : void 0
  };
}
function propValue(properties, key2) {
  const entry = properties[key2];
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
function catalogDefault(type, key2, fallback) {
  return getComponentSchema(type)?.properties.find((property) => property.key === key2)?.default ?? fallback;
}
var CLIENT_SERVER_BOOLEAN_KEYS = /* @__PURE__ */ new Set([
  "serverSidePagination",
  "serverSideSearch",
  "serverSideSort",
  "serverSideFilter"
]);
var STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS = 24;
function isStrippableUnknownKey(type, section, key2, knownKeys) {
  if (knownKeys.includes(key2))
    return false;
  if (type === "DropdownV2" && section === "properties" && ["value", "defaultValue"].includes(key2))
    return false;
  if (section === "properties" && STYLE_KEYS_IN_PROPERTIES.has(key2))
    return false;
  const aliasTarget = PROPERTY_KEY_ALIASES[key2.toLowerCase()];
  if (aliasTarget && (knownKeys.includes(aliasTarget) || STYLE_KEYS_IN_PROPERTIES.has(aliasTarget)))
    return false;
  if (nearestCatalogKey(key2, knownKeys))
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
  const setProperty = (key2, value) => {
    const current = properties[key2];
    const wrapped = current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value };
    properties[key2] = wrapped;
    propertyPatch[key2] = wrapped;
  };
  const stylesValue = normalizedSections.styles.value ?? {};
  let stylesChanged = false;
  const setStyle = (key2, value) => {
    const current = stylesValue[key2];
    stylesValue[key2] = current && typeof current === "object" && !Array.isArray(current) ? { ...current, value } : { value };
    stylePatch[key2] = stylesValue[key2];
    normalizedSections.styles.value = stylesValue;
  };
  const schema = getComponentSchema(component.type);
  const knownPropertyKeys = schema ? new Set(schema.properties.map((entry) => entry.key)) : void 0;
  const knownStyleKeys = schema ? new Set(schema.styles.map((entry) => entry.key)) : void 0;
  const aliasTargetFor = (key2) => {
    if (knownPropertyKeys?.has(key2))
      return void 0;
    const target = PROPERTY_KEY_ALIASES[key2.toLowerCase()];
    if (!target)
      return void 0;
    if (!schema)
      return target;
    return knownStyleKeys.has(target) || knownPropertyKeys.has(target) ? target : void 0;
  };
  for (const key2 of Object.keys(properties)) {
    const aliasTarget = aliasTargetFor(key2);
    const canonical = aliasTarget ?? key2;
    const belongsInStyles = canonical !== "styles" && (STYLE_KEYS_IN_PROPERTIES.has(canonical) || !!aliasTarget && !!knownStyleKeys?.has(canonical) && !knownPropertyKeys?.has(canonical));
    if (!aliasTarget && !belongsInStyles)
      continue;
    if (belongsInStyles) {
      if (stylesValue[canonical] === void 0)
        stylesValue[canonical] = properties[key2];
      delete properties[key2];
      stylesChanged = true;
      warnings.push(`${component.type} "${component.name}": moved ${aliasTarget ? `alias "${key2}"` : `style key "${key2}"`} to styles.${canonical} (ToolJet reads it from styles, not properties).`);
    } else if (canonical !== key2) {
      if (properties[canonical] === void 0)
        properties[canonical] = properties[key2];
      delete properties[key2];
      warnings.push(`${component.type} "${component.name}": renamed alias "${key2}" to "${canonical}".`);
    }
  }
  if (stylesChanged)
    normalizedSections.styles.value = stylesValue;
  if (options.stripUnknownKeys && component.type === "NumberInput") {
    for (const key2 of ["minValue", "maxValue"]) {
      const value = propValue(properties, key2);
      if (value == null || typeof value === "string" && !value.trim())
        continue;
      const validation = normalizedSections.validation.value ?? {};
      const current = propValue(validation, key2);
      if (validation[key2] !== void 0 && current !== value)
        continue;
      validation[key2] = properties[key2];
      normalizedSections.validation.value = validation;
      normalizedSections.validation.patch = { ...normalizedSections.validation.patch, [key2]: validation[key2] };
      delete properties[key2];
      warnings.push(`NumberInput "${component.name}": moved properties.${key2} to validation.${key2}, where the renderer reads the bound.`);
    }
  }
  for (const key2 of CLIENT_SERVER_BOOLEAN_KEYS) {
    const current = propValue(properties, key2);
    if (current !== "clientSide" && current !== "serverSide")
      continue;
    setProperty(key2, current === "serverSide");
    warnings.push(`${component.name} "${key2}": normalized ${JSON.stringify(current)} to a boolean ToolJet binding.`);
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
      const deletionHistory = new Set(Array.isArray(currentHistory) ? currentHistory.filter((key2) => typeof key2 === "string" && key2.length > 0) : []);
      const before = deletionHistory.size;
      if (Array.isArray(demoFields)) {
        for (const field of demoFields) {
          if (!field || typeof field !== "object")
            continue;
          const { id, key: key2 } = field;
          if (typeof key2 === "string" && !explicitIds.has(String(id ?? "")))
            deletionHistory.add(key2);
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
        for (const key2 of Object.keys(sectionValue)) {
          if (!isStrippableUnknownKey(component.type, section, key2, knownKeys))
            continue;
          delete sectionValue[key2];
          warnings.push(`${component.type} "${component.name}": removed unknown ${section} key "${key2}" \u2014 ToolJet ignores it, so it is kept out of the saved definition rather than persisted as an unusable key.`);
        }
      }
    }
  }
  const braceFixedKeys = [];
  for (const key2 of Object.keys(properties)) {
    const result = separateAdjacentClosingBracesDeep(propValue(properties, key2));
    if (!result.changed)
      continue;
    setProperty(key2, result.value);
    braceFixedKeys.push(`properties.${key2}`);
  }
  for (const key2 of Object.keys(stylesValue)) {
    const result = separateAdjacentClosingBracesDeep(propValue(stylesValue, key2));
    if (!result.changed)
      continue;
    setStyle(key2, result.value);
    braceFixedKeys.push(`styles.${key2}`);
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
export {
  PartialWriteError as P,
  TOOLJET_DB_DATA_TYPES as T,
  normalizePlannedLayouts as a,
  materializeRequiredDefaultChildren as b,
  componentRef as c,
  validateEvents as d,
  expandQueryLifecycles as e,
  normalizeType as f,
  booleanBindingValue as g,
  invalidSeedTimestamps as h,
  indexComponentReferences as i,
  completedPartialWrites as j,
  navigationReorders as k,
  persistedEventSpecs as l,
  matchPlannedPage as m,
  normalizeComponentSpec as n,
  createClient as o,
  prepareQueryOptionsForWrite as p,
  listWorkspaceGroupsTool as q,
  resolveRef as r,
  strictEntry as s,
  manageWorkspaceGroupsTool as t,
  inspectDatasourceSchemaTool as u,
  validateTableBatch as v,
  ToolJetHttpError as w,
  hasNonEmptyDefinition as x,
  persistedEventIds as y
};
