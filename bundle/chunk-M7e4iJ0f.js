import { createRequire } from "node:module";
import { h as hasNonEmptyDefinition, b as bodyParentId, i as isFlexContainerType, a as batchChildOrders, c as childOrderProperty, d as appendedChildOrders, e as codeCliProblem } from "./chunk-BmwE9MbG.js";
import { b0 as external_exports, b9 as definition, b7 as fail, b8 as ok, ba as exposeActions } from "./chunk-Csl8mO51.js";
import { e5 as tableQuotaError, e9 as TableQuotaError } from "./chunk-C1Uan0hB.js";
import { f as encodeComponentParent, t as downgradeFlexForLibrary, d as decodeComponentParent, u as assertPageIcon, v as resolveComponentLibrary, i as isMisplacedStyleKey, w as toLibraryComponent, x as missingLibraryPins, y as libraryTypeOf, z as libraryPins, A as defaultPack, B as savedComponentLibrary, C as COMPONENT_PACK_DESCRIPTION } from "./chunk-CzEla2h4.js";
import { e as assertPersistableQueryToggles, n as normalizeWorkflowQueryOptions, f as assertWorkflowQueryOptions, w as workflowMappingMatches, a as activePackSet } from "./chunk-CmizjRXJ.js";
import { randomUUID, createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
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
    const versionType = raw.version_type ?? raw.versionType;
    const branchId = raw.branch_id ?? raw.branchId;
    const displayName = raw.display_name ?? raw.displayName;
    return {
      id: raw.id,
      name: raw.name,
      ...typeof raw.description === "string" || raw.description === null ? { description: raw.description } : {},
      ...typeof raw.status === "string" ? { status: raw.status } : {},
      ...typeof versionType === "string" ? { versionType } : {},
      ...typeof branchId === "string" ? { branchId } : {},
      ...typeof displayName === "string" ? { displayName } : {},
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
      ...v.versionType ? { version_type: v.versionType } : {},
      ...v.branchId ? { branch_id: v.branchId } : {},
      ...v.displayName ? { display_name: v.displayName } : {},
      ...v.status ? { status: v.status } : {},
      ...environmentId ? { current_environment_id: environmentId } : {}
    };
  }
  async function available(appId, v, env2) {
    const data = await (await request(`/api/app-environments/${enc(env2.id)}/versions?app_id=${enc(appId)}`)).json();
    const rows = data.appVersions ?? data.app_versions;
    if (!Array.isArray(rows) || !rows.some((row) => row.id === v.id)) {
      throw new Error(`Version ${v.name} is not available in ${env2.name}. No promotion or release was performed.`);
    }
  }
  async function list(appId) {
    const vs = await versions(appId);
    const envs = await environments(appId);
    return { app_id: appId, versions: vs.map((v) => ({ ...selection(appId, v), selected: void 0, description: v.description })), environments: envs };
  }
  async function switchEnvironment(appId, versionId, environmentName) {
    const v = await version(appId, versionId);
    const env2 = environment(await environments(appId), environmentName);
    await available(appId, v, env2);
    return { ...selection(appId, v, env2.id), environment_name: env2.name };
  }
  async function promote(appId, versionId, environmentName) {
    let v = await version(appId, versionId);
    if (v.versionType?.toLowerCase() === "branch") {
      throw new Error("Cannot promote a branch head. Save a named version in ToolJet, then select that exact version for promotion.");
    }
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
var branchContext = new AsyncLocalStorage();
var withBranchContext = (branchId, fn) => branchContext.run(branchId, fn);
var currentBranchId = () => branchContext.getStore();
function branchIdFor(config) {
  const requested = branchContext.getStore();
  if (config.branchId && requested && config.branchId !== requested) {
    throw new Error("This build is pinned to another branch. Start a build from the intended branch.");
  }
  return config.branchId ?? requested;
}
var SESSION_TOKEN_HEADER = "x-tooljet-session";
var WORKSPACE_ID_HEADER = "x-tooljet-workspace-id";
var WORKSPACE_SLUG_HEADER = "x-tooljet-workspace-slug";
var BRANCH_ID_HEADER = "x-tooljet-branch-id";
var PAT_HEADER = "x-tooljet-pat";
var BASE_URL_HEADER = "x-tooljet-url";
var CUSTOMER_ID_HEADER = "x-tooljet-customer-id";
var ALLOWED_API_ORIGINS_VAR = "MCP_ALLOWED_API_ORIGINS";
var GATEWAY_URL_VAR = "MCP_GATEWAY_URL";
var GATEWAY_TOKEN_VAR = "MCP_GATEWAY_TOKEN";
function storedCliLogin(explicitApiUrl) {
  const file = env("TOOLJET_CREDENTIALS_FILE") ?? join(homedir(), ".tooljet", "credentials.json");
  let store;
  try {
    store = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return void 0;
  }
  const entry = store?.default ? store.workspaces?.[store.default] : void 0;
  if (!entry?.url || !entry.apiToken)
    return void 0;
  let origin;
  try {
    origin = new URL(entry.url).origin;
  } catch {
    return void 0;
  }
  if (explicitApiUrl) {
    try {
      if (new URL(explicitApiUrl).origin !== origin)
        return void 0;
    } catch {
      return void 0;
    }
  }
  return { apiUrl: origin, pat: entry.apiToken };
}
function env(name) {
  const value = process.env[name]?.trim();
  return value ? value : void 0;
}
function allowedApiOrigins() {
  const raw = env(ALLOWED_API_ORIGINS_VAR);
  if (!raw)
    return [];
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    let parsed;
    try {
      parsed = new URL(entry);
    } catch {
      throw new Error(`${ALLOWED_API_ORIGINS_VAR} contains an entry that is not a valid URL: "${entry}".`);
    }
    if (parsed.protocol !== "https:") {
      throw new Error(`${ALLOWED_API_ORIGINS_VAR} entry "${entry}" must use https \u2014 it could never match a request.`);
    }
    return parsed.origin;
  });
}
function readHeader(headers, name) {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : void 0;
}
var gatewayOriginCache = /* @__PURE__ */ new Map();
var GATEWAY_CACHE_TTL_MS = 6e4;
async function checkOriginWithGateway(customerId, origin) {
  const cacheKey = `${customerId} ${origin}`;
  const cached2 = gatewayOriginCache.get(cacheKey);
  if (cached2 && cached2.expiresAt > Date.now())
    return cached2.allowed;
  const gatewayUrl = env(GATEWAY_URL_VAR);
  const gatewayToken = env(GATEWAY_TOKEN_VAR);
  if (!gatewayUrl || !gatewayToken)
    return false;
  let allowed = false;
  try {
    const res = await fetch(new URL("/internal/mcp/verify-origin", gatewayUrl), {
      method: "POST",
      headers: { authorization: gatewayToken, "content-type": "application/json" },
      body: JSON.stringify({ customer_id: customerId, origin }),
      signal: AbortSignal.timeout(5e3)
    });
    if (res.ok) {
      const body = await res.json();
      allowed = body.allowed === true;
    }
  } catch {
    allowed = false;
  }
  gatewayOriginCache.set(cacheKey, { allowed, expiresAt: Date.now() + GATEWAY_CACHE_TTL_MS });
  return allowed;
}
var gatewayResolveCache = /* @__PURE__ */ new Map();
async function resolveApiUrlFromGateway(customerId) {
  const cached2 = gatewayResolveCache.get(customerId);
  if (cached2 && cached2.expiresAt > Date.now())
    return cached2.result;
  const gatewayUrl = env(GATEWAY_URL_VAR);
  const gatewayToken = env(GATEWAY_TOKEN_VAR);
  let result = { url: void 0, verified: false };
  if (gatewayUrl && gatewayToken) {
    try {
      const res = await fetch(new URL("/internal/mcp/verify-origin", gatewayUrl), {
        method: "POST",
        headers: { authorization: gatewayToken, "content-type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
        signal: AbortSignal.timeout(5e3)
      });
      if (res.ok) {
        const body = await res.json();
        if ("host_name" in body) {
          const path = body.subpath ? `/${body.subpath.replace(/^\/+|\/+$/g, "")}` : "";
          result = { url: body.host_name ? `https://${body.host_name}${path}` : void 0, verified: true };
        }
      }
    } catch {
      result = { url: void 0, verified: false };
    }
  }
  gatewayResolveCache.set(customerId, { result, expiresAt: Date.now() + GATEWAY_CACHE_TTL_MS });
  return result;
}
async function validateApiUrl(raw, customerId) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${BASE_URL_HEADER} must be a valid absolute URL.`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${BASE_URL_HEADER} must use https.`);
  }
  if (parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`${BASE_URL_HEADER} must carry no query, hash, or credentials.`);
  }
  const inStaticList = allowedApiOrigins().includes(parsed.origin);
  const verifiedViaGateway = !inStaticList && customerId ? await checkOriginWithGateway(customerId, parsed.origin) : false;
  if (!inStaticList && !verifiedViaGateway) {
    throw new Error(`${BASE_URL_HEADER} origin "${parsed.origin}" is not in ${ALLOWED_API_ORIGINS_VAR} and did not verify against the Gateway. Add it to that comma-separated list, or confirm ${CUSTOMER_ID_HEADER} is being sent.`);
  }
  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return { apiUrl: parsed.origin + path, customerVerified: verifiedViaGateway ? true : void 0 };
}
async function identityFromHeaders(headers, { allowPat = true } = {}) {
  const sessionToken = readHeader(headers, SESSION_TOKEN_HEADER);
  const workspaceId = readHeader(headers, WORKSPACE_ID_HEADER);
  const branchId = readHeader(headers, BRANCH_ID_HEADER);
  const pat = readHeader(headers, PAT_HEADER);
  const rawApiUrl = readHeader(headers, BASE_URL_HEADER);
  const customerId = readHeader(headers, CUSTOMER_ID_HEADER);
  let apiUrl;
  let customerVerified;
  if (rawApiUrl) {
    const validated = await validateApiUrl(rawApiUrl, customerId);
    apiUrl = validated.apiUrl;
    customerVerified = validated.customerVerified;
  } else if (customerId) {
    const resolved = await resolveApiUrlFromGateway(customerId);
    apiUrl = resolved.url;
    customerVerified = resolved.verified ? true : void 0;
  }
  if (pat) {
    if (!allowPat) {
      throw new Error(`${PAT_HEADER} is not accepted by this server. It acts only on behalf of a signed-in user: send ${SESSION_TOKEN_HEADER} with ${WORKSPACE_ID_HEADER}.`);
    }
    if (sessionToken)
      throw new Error(`Send either ${PAT_HEADER} or ${SESSION_TOKEN_HEADER}, not both.`);
    return { pat, apiUrl, customerVerified, ...branchId ? { branchId } : {} };
  }
  if (!sessionToken && !workspaceId) {
    return apiUrl || customerVerified ? { apiUrl, customerVerified } : void 0;
  }
  if (!sessionToken) {
    throw new Error(`${WORKSPACE_ID_HEADER} was sent without ${SESSION_TOKEN_HEADER}.`);
  }
  if (!workspaceId) {
    throw new Error(`${SESSION_TOKEN_HEADER} was sent without ${WORKSPACE_ID_HEADER}.`);
  }
  return {
    sessionToken,
    workspaceId,
    ...branchId ? { branchId } : {},
    workspaceSlug: readHeader(headers, WORKSPACE_SLUG_HEADER),
    apiUrl,
    customerVerified
  };
}
function loadConfig(identity) {
  const explicitApiUrl = env("TOOLJET_URL");
  const explicitAppUrl = env("TOOLJET_DEPLOYMENT_URL") ?? env("TOOLJET_APP_URL");
  const staticApiUrl = explicitApiUrl ?? explicitAppUrl ?? "http://localhost:3000";
  if (identity) {
    const apiUrl2 = identity.apiUrl ?? staticApiUrl;
    const appUrl2 = identity.appUrl ?? explicitAppUrl ?? identity.apiUrl ?? explicitApiUrl ?? "http://localhost:8082";
    const viewerUrl = identity.viewerUrl ?? appUrl2;
    if (identity.pat)
      return { apiUrl: apiUrl2, appUrl: appUrl2, viewerUrl, pat: identity.pat, ...identity.branchId ? { branchId: identity.branchId } : {} };
    return {
      apiUrl: apiUrl2,
      appUrl: appUrl2,
      viewerUrl,
      sessionToken: identity.sessionToken,
      isOAuthDelegation: identity.isOAuthDelegation,
      oauthGrantId: identity.oauthGrantId,
      workspaceId: identity.workspaceId,
      workspaceSlug: identity.workspaceSlug,
      ...identity.branchId ? { branchId: identity.branchId } : {}
    };
  }
  const apiUrl = staticApiUrl;
  const appUrl = explicitAppUrl ?? explicitApiUrl ?? "http://localhost:8082";
  const sessionToken = env("TOOLJET_SESSION_TOKEN");
  const stored = !env("TOOLJET_PAT") && !sessionToken ? storedCliLogin(explicitApiUrl ?? explicitAppUrl) : void 0;
  const pat = env("TOOLJET_PAT") ?? stored?.pat;
  const workspaceId = env("TOOLJET_WORKSPACE_ID");
  if (stored) {
    return {
      apiUrl: stored.apiUrl,
      appUrl: explicitAppUrl ?? stored.apiUrl,
      pat: stored.pat,
      ...env("TOOLJET_BRANCH_ID") ? { branchId: env("TOOLJET_BRANCH_ID") } : {}
    };
  }
  if (!pat && !sessionToken) {
    throw new Error(`TOOLJET_SESSION_TOKEN or TOOLJET_PAT is required. For a standalone server, create a personal access token in ToolJet under Settings \u2192 Access tokens, in the workspace you want this server to act on, and set TOOLJET_PAT. A shared HTTP server instead receives the acting user per request via the ${SESSION_TOKEN_HEADER} header. Or sign in once with \`tooljet auth login\`.`);
  }
  if (sessionToken && !workspaceId) {
    throw new Error("TOOLJET_WORKSPACE_ID is required alongside TOOLJET_SESSION_TOKEN.");
  }
  return {
    apiUrl,
    appUrl,
    viewerUrl: appUrl,
    pat,
    sessionToken,
    workspaceId,
    workspaceSlug: env("TOOLJET_WORKSPACE_SLUG"),
    ...env("TOOLJET_BRANCH_ID") ? { branchId: env("TOOLJET_BRANCH_ID") } : {}
  };
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
    const branchName = record(version.branch).name;
    const branchQuery = typeof branchName === "string" && branchName ? `?branch=${encodeURIComponent(branchName)}` : "";
    return {
      workflow_id: workflowId,
      version_id: versionId,
      workspace_id: workspace,
      environment_id: environmentId,
      editable: status === "DRAFT" && !released && !frozen,
      enabled: (app.isMaintenanceOn ?? app.is_maintenance_on) === true,
      editor_url: `${config.appUrl}/${encodeURIComponent(await auth.getOrganizationSlug())}/apps/${encodeURIComponent(typeof app.slug === "string" && app.slug ? app.slug : workflowId)}${branchQuery}`,
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
      return createHash("sha256").update(JSON.stringify([config.apiUrl, identity, await auth.getOrganizationId(), branchIdFor(config)])).digest("hex");
    },
    async list(page = 1, search = "") {
      return request(`/api/apps?${new URLSearchParams({ type: "workflow", page: String(page), searchKey: search })}`);
    },
    get,
    async create(name) {
      const branchId = branchIdFor(config);
      const created = record(await request("/api/workflows", { name, type: "workflow", ...branchId ? { branchId } : {} }));
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
var cached;
var SAMPLE_BLANKS = {
  ShadHero: { eyebrow: "", subtitle: "", meta: "{{[]}}", actionLabel: "" },
  ShadCardGrid: { badgeField: "", descriptionField: "", metaFields: "" },
  ShadRecordList: { metaFields: "", valueField: "", valueFormat: "auto" },
  // The sample's budget fields (spent, budget, note, status) are not a build's data: the config's own names stand.
  ShadProgressList: {
    labelField: "label",
    valueField: "value",
    targetField: "target",
    captionField: "",
    statusField: "",
    valueFormat: "auto"
  },
  ShadSchedule: { resourceField: "resource", resourceTitle: "" },
  // The sample's delivery stops (customer, address, eta, driver) are not a build's data: no rows, generic fields.
  ShadMap: { data: "{{[]}}", titleField: "name", subtitleField: "", popupFields: "" },
  // 'auto' reads money from a figure's label; the 'currency' default showed counts of rooms as dollars.
  ShadSummaryStrip: { valueFormat: "auto" },
  ShadTags: { tags: "{{[]}}", tagColors: "{{{}}}" },
  ShadAvatar: { names: "" },
  ShadLink: { linkTarget: "" },
  ShadCombobox: { searchPlaceholder: "Search..." },
  ShadMultiselect: { searchPlaceholder: "Search..." },
  ShadTagsInput: { suggestions: "{{[]}}" },
  // The sample greeting talks about orders, invoices and deliveries; a build's chat starts from its own history.
  ShadChat: { initialChat: "{{[]}}" },
  // The sample's 'set up your workspace' line is not a build's; completeTitle alone reads fine.
  ShadQuestionnaire: { completeText: "" }
};
var PACK_SAMPLE_TEXT = ["label", "title", "resourceTitle", "subTitle", "message"];
function registerPackDefinitions(extra) {
  packDefaultDefinition("");
  const defs = extra;
  for (const def of Object.values(defs)) {
    for (const key of PACK_SAMPLE_TEXT) {
      const entry = def?.properties?.[key];
      if (entry && typeof entry.value === "string" && entry.value && !entry.value.trim().startsWith("{{"))
        def.properties[key] = { ...entry, value: "" };
    }
  }
  Object.assign(activePackSet().definitions, defs);
}
function packDefaultDefinition(type) {
  if (!cached) {
    try {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), "../data/pack-default-definitions.json");
      cached = JSON.parse(readFileSync(path, "utf8")).definitions ?? {};
      for (const [type2, blanks] of Object.entries(SAMPLE_BLANKS)) {
        const def = cached[type2];
        if (!def?.properties)
          continue;
        for (const [key, value] of Object.entries(blanks)) {
          if (key in def.properties)
            def.properties[key] = { ...def.properties[key], value };
        }
      }
    } catch {
      cached = {};
    }
  }
  return activePackSet().definitions[type] ?? cached[type];
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
function alignSeedRowKeys(schema, rows) {
  const noDefault = new Set(schema.filter((column) => column.defaultValue === void 0 || column.defaultValue === null).map((column) => column.name));
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  for (const key of keys) {
    if (!noDefault.has(key))
      continue;
    for (const row of rows)
      if (!(key in row))
        row[key] = null;
  }
}
function sameKeysRun(rows, start, limit) {
  const keysOf = (row) => Object.keys(row).sort().join("\0");
  const keys = keysOf(rows[start]);
  let end = start + 1;
  while (end < rows.length && end - start < limit && keysOf(rows[end]) === keys)
    end++;
  return rows.slice(start, end);
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
  async function codeSourceAccess(appId, versionId) {
    const res = await auth.authedFetch(`/api/code-mode-source/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}`);
    if (res.status === 403 || res.status === 404)
      return { read: false, write: false };
    await assertOk(res, "codeSourceAccess");
    const body = await res.json().catch(() => null);
    if (!body || typeof body !== "object")
      throw new Error("codeSourceAccess: ToolJet sent no answer");
    return { read: true, write: body.canWrite === true };
  }
  async function codeSourceFiles(appId, versionId) {
    const res = await auth.authedFetch(`/api/code-mode-source/${encodeURIComponent(appId)}/versions/${encodeURIComponent(versionId)}?content=1`);
    if (res.status === 404)
      return null;
    await assertOk(res, "codeSourceFiles");
    const body = await res.json().catch(() => null);
    if (!body || body.exists === false || !Array.isArray(body.files))
      return null;
    return body.files.flatMap((file) => typeof file.path === "string" && typeof file.content === "string" ? [{ path: file.path, content: file.content }] : []);
  }
  function projectComponent(id, entry) {
    const c = entry?.component ?? {};
    const def = c.definition ?? {};
    const persistedParent = typeof c.parent === "string" ? c.parent : void 0;
    const decodedParent = persistedParent ? decodeComponentParent(persistedParent) : void 0;
    return {
      id,
      name: c.name,
      // A component of the published library reads back as its Lib_* type, so the catalogue checks its events,
      // actions and properties (libraryPack.ts).
      type: libraryTypeOf({ type: c.component, properties: def.properties }) ?? c.component,
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
    const globalSettings = full.editing_version?.global_settings ?? full.editing_version?.globalSettings ?? full.editingVersion?.globalSettings ?? full.global_settings ?? full.globalSettings;
    const componentLibrary = resolveComponentLibrary(globalSettings, pages.flatMap((page) => page.components.map((component) => component.type)));
    return {
      app_id: full.id,
      name: full.name,
      version_id: full.editing_version?.id,
      component_library: componentLibrary,
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
  async function getLicenseFeatureAccess() {
    const res = await auth.authedFetch("/api/license/access");
    await assertOk(res, "getLicenseFeatureAccess");
    const body = await res.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("ToolJet getLicenseFeatureAccess failed: expected an object response.");
    }
    return body;
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
  async function createApp(name, options = {}) {
    const wantsCode = options.buildMode === "code";
    const branchId = branchIdFor(config);
    let createRes;
    let finalName = name;
    for (let attempt = 1; attempt <= 6; attempt++) {
      finalName = attempt === 1 ? name : `${name} ${attempt}`;
      createRes = await auth.authedFetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          type: "front-end",
          ...branchId ? { branchId } : {},
          // The build mode is set when the app is created, as the dashboard does: ToolJet has no call that changes it later.
          ...wantsCode ? { buildMode: "code" } : {}
        })
      });
      if (createRes.status !== 409)
        break;
    }
    await assertOk(createRes, "createApp");
    const created = await createRes.json();
    const app = await getApp(created.id);
    const buildMode = app?.build_mode ?? app?.buildMode;
    if (wantsCode && buildMode !== "code") {
      const removed = await auth.authedFetch(`/api/apps/${created.id}`, { method: "DELETE" }).then((res) => res.ok).catch(() => false);
      throw new Error("This ToolJet server does not support Code mode apps: it created a visual app instead. " + (removed ? "That app was deleted. " : `Delete app ${created.id} ("${finalName}"); it could not be removed here. `) + "Build a visual app (create_app without build_mode), or connect to a ToolJet version with Code mode.");
    }
    const versionId = app.editing_version.id;
    const versionName = app.editing_version.name ?? "v1";
    const pages = app.pages ?? [];
    const homePage = pages.find((p) => p.name === "Home") ?? pages[0];
    if (!homePage) {
      throw new Error("ToolJet createApp failed: app has no pages");
    }
    const orgSlug = await auth.getOrganizationSlug();
    const appSlug = created.slug ?? created.id;
    const branchName = app.editing_version.branch?.name;
    const branchQuery = typeof branchName === "string" ? `branch=${encodeURIComponent(branchName)}` : "";
    const editorUrl = `${config.appUrl}/${orgSlug}/apps/${appSlug}${branchQuery ? `?${branchQuery}` : ""}`;
    const homeHandle = homePage.handle ?? "home";
    const viewerUrl = `${config.appUrl}/applications/${created.id}/${encodeURIComponent(homeHandle)}?env=development&version=${encodeURIComponent(versionName)}${branchQuery ? `&${branchQuery}` : ""}`;
    return {
      app_id: created.id,
      ...branchId ? { branch_id: branchId } : {},
      build_mode: buildMode === "code" ? "code" : "visual",
      version_id: versionId,
      home_page_id: homePage.id,
      app_url: editorUrl,
      editor_url: editorUrl,
      viewer_url: viewerUrl,
      datasources_url: datasourceManagementUrl(orgSlug)
    };
  }
  async function createAppVersion(params) {
    const inventory = await auth.authedFetch(`/api/apps/${encodeURIComponent(params.appId)}/versions`);
    await assertOk(inventory, "createAppVersion.readSource");
    const body = await inventory.json();
    const source = body.versions?.find((version) => version.id === params.versionFromId);
    if (!source) {
      throw new Error(`ToolJet createAppVersion failed: version ${params.versionFromId} was not found in app ${params.appId}.`);
    }
    if (String(source.version_type ?? source.versionType).toLowerCase() === "branch") {
      throw new Error("Cannot clone a branch head into a named draft. Save a named version in ToolJet, then use its version_id as the clone source. No version was created or published.");
    }
    const sourceBranchId = source.branch_id ?? source.branchId;
    const selectedBranchId = branchIdFor(config);
    if (selectedBranchId && typeof sourceBranchId === "string" && sourceBranchId !== selectedBranchId) {
      throw new Error("Cannot create a named draft on a different branch from its source. Select the source version's branch before cloning. No version was created.");
    }
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
      if (String(version2.version_type ?? version2.versionType).toLowerCase() === "branch") {
        throw new Error("Cannot release a branch head. Save a named version in ToolJet, then select that exact version for release.");
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
  const BULK_INSERT_ROWS = 500;
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
      if (Array.isArray(row) && /['"]0['"] column|column ['"]0['"]/i.test(body))
        return res;
      await new Promise((resolve2) => setTimeout(resolve2, SCHEMA_CACHE_RETRY_DELAYS_MS[schemaWaits]));
      schemaWaits += 1;
    }
  }
  let bulkInsertAccepted = true;
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
    alignSeedRowKeys(schema, rows);
    let processedRows = 0;
    while (bulkInsertAccepted && rows.length - processedRows >= 2) {
      const chunk = sameKeysRun(rows, processedRows, BULK_INSERT_ROWS);
      let res;
      try {
        res = await insertRowViaProxy(table.id, chunk);
      } catch (error) {
        if (!processedRows)
          throw error;
        throw new PartialWriteError("insertRows", [{ processed_rows: processedRows }], [
          `rows ${processedRows + 1}-${processedRows + chunk.length}/${rows.length}: ${error instanceof Error ? error.message : String(error)}`
        ]);
      }
      if (res.ok) {
        processedRows += chunk.length;
        continue;
      }
      if (/['"]0['"] column|column ['"]0['"]/i.test(await res.clone().text().catch(() => "")))
        bulkInsertAccepted = false;
      break;
    }
    for (const [index, row] of rows.entries()) {
      if (index < processedRows)
        continue;
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
    const tail = new Promise((resolve2) => {
      release = resolve2;
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
    const misplaced = Object.keys(spec.properties ?? {}).filter((k) => isMisplacedStyleKey(spec.type, k));
    if (misplaced.length) {
      throw new Error(`Component "${spec.name}": style keys ${JSON.stringify(misplaced)} were placed under \`properties\`, where ToolJet silently ignores them. Move them to the top-level \`styles\` object instead.`);
    }
    const pack = packDefaultDefinition(spec.type);
    if (pack) {
      const ownData = spec.properties?.data !== void 0;
      const sample = (entry) => {
        const value = entry?.value;
        return typeof value === "string" && /^\{\{\s*[[{]/.test(value);
      };
      const sampleField = (key) => /Chart$|^ShadSparkline$/.test(spec.type) && [
        "xField",
        "yFields",
        "categoryField",
        "valueField",
        "nameField",
        "barFields",
        "lineFields",
        "rightAxisFields",
        "yField",
        "sizeField",
        "groupField",
        "stageField",
        "xLabel",
        "yLabel",
        "seriesLabels"
      ].includes(key);
      const packProperties = Object.fromEntries(Object.entries(pack.properties ?? {}).filter(([key, entry]) => !(ownData && (sample(entry) || sampleField(key)))));
      spec = {
        ...spec,
        properties: { ...packProperties, ...spec.properties ?? {} },
        styles: { ...pack.styles ?? {}, ...spec.styles ?? {} },
        others: { ...pack.others ?? {}, ...spec.others ?? {} }
      };
    }
    spec = downgradeFlexForLibrary(toLibraryComponent(spec));
    const dto = {
      name: spec.name,
      type: spec.type,
      // A FlexContainer grows with its children unless the author fixes its height: with dynamic height off, a row or
      // card whose children grew scrolled inside or clipped them (Air India fleet build, 2026-10-09).
      // ToolJet gives a FlexContainer the UI 2.0 layout only when it carries layoutVersion '2', and the server adds no
      // defaults on create, so the MCP writes it, with Equal heights on, as the widget's default definition does.
      properties: spec.type === "FlexContainer" ? {
        dynamicHeight: { value: "{{true}}" },
        layoutVersion: { value: "2" },
        equalHeights: { value: "{{true}}" },
        ...spec.properties ?? {}
      } : spec.properties,
      // A FlexContainer is layout: invisible unless the author gives it a surface (cardStyle 'shadcnCard', or a
      // background or border). ToolJet's own default draws every row and column as a bordered box.
      styles: spec.type === "FlexContainer" ? { backgroundColor: { value: "transparent" }, borderColor: { value: "transparent" }, ...spec.styles ?? {} } : spec.styles ?? {},
      validation: spec.validation ?? {},
      // Device visibility defaults, as a drag and drop sets them. The server fills these for its own widget types but
      // not for types it has no defaults for, which then count as hidden on desktop.
      others: { showOnDesktop: { value: "{{true}}" }, showOnMobile: { value: "{{false}}" }, ...spec.others ?? {} },
      // The editor always sends these two sections. For a widget type the server has no defaults for (for example
      // the UI 2.0 widgets) an omitted section is stored as null, and one null section stops the page loading.
      general: {},
      generalStyles: { boxShadow: { value: "0px 0px 0px 0px #00000040" } }
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
    const typeById = new Map((params.pageComponents ?? []).map((component) => [component.id, component.type]));
    for (const e of entries)
      typeById.set(e.id, e.spec.type);
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
      if (resolvedParent) {
        const parentType = typeById.get(decodeComponentParent(resolvedParent).parentId) ?? e.spec.parentType;
        dto.parent = encodeComponentParent(resolvedParent, e.spec.slotName, parentType);
      }
      const submit = e.spec.type === "Form" ? dto.properties?.buttonToSubmit : void 0;
      const submitId = submit && typeof submit.value === "string" ? refToId.get(submit.value) : void 0;
      if (submit && submitId) {
        dto.properties = { ...dto.properties, buttonToSubmit: { ...submit, value: submitId } };
      }
      diff[e.id] = dto;
    }
    const batchIds = new Set(entries.map((e) => e.id));
    const flexEntries = entries.map((e) => ({
      id: e.id,
      type: e.spec.type,
      parentId: bodyParentId(diff[e.id].parent)
    }));
    const explicitOrders = new Map(entries.filter((e) => isFlexContainerType(e.spec.type) && e.spec.properties?.childOrder !== void 0).map((e) => {
      const raw = e.spec.properties.childOrder;
      const value = Array.isArray(raw) ? raw : raw?.value;
      return [e.id, Array.isArray(value) ? value : []];
    }));
    const nameToId = new Map(entries.map((e) => [e.spec.name, e.id]));
    const orders = batchChildOrders(flexEntries, explicitOrders, (ref) => refToId.get(ref) ?? nameToId.get(ref));
    for (const [id, order] of orders) {
      const dto = diff[id];
      dto.properties = { ...dto.properties ?? {}, childOrder: childOrderProperty(order) };
    }
    const additions = flexEntries.flatMap((e) => e.parentId && !batchIds.has(e.parentId) ? [{ parentId: e.parentId, childId: e.id }] : []);
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff })
    });
    await assertOk(res, "createComponents");
    const created = entries.map((e) => ({ component_id: e.id, name: e.spec.name }));
    await pinWrittenLibraries(params.appId, params.versionId, Object.values(diff));
    let pageComponents = params.pageComponents;
    if (additions.length && !pageComponents) {
      const summary = await getAppSummary(params.appId, params.versionId).catch(() => void 0);
      pageComponents = summary?.pages.find((page) => page.id === params.pageId)?.components ?? [];
    }
    const appended = additions.length ? appendedChildOrders(pageComponents ?? [], additions) : /* @__PURE__ */ new Map();
    if (appended.size) {
      try {
        await writeFlexChildOrders(params.appId, params.versionId, params.pageId, appended);
      } catch (err) {
        throw new PartialWriteError("createComponents", created, [
          `FlexContainer child order (${[...appended.keys()].join(", ")}): ${err instanceof Error ? err.message : String(err)}. The components exist; set the container's childOrder with update_components.`
        ], err);
      }
    }
    return created;
  }
  const pinChecks = /* @__PURE__ */ new Map();
  function pinWrittenLibraries(appId, versionId, components) {
    const wanted = missingLibraryPins(components, {});
    if (!wanted)
      return Promise.resolve();
    const fresh = Object.keys(wanted).filter((id) => !pinChecks.has(`${versionId}:${id}`));
    const check = fresh.length ? (async () => {
      const settings = await getAppSettings(appId, versionId);
      const stored = settings.global_settings.customComponentLibraries;
      const pins = stored && typeof stored === "object" ? stored : {};
      const missing = missingLibraryPins(components, pins);
      if (missing) {
        await updateAppSettings({ appId, versionId, globalSettings: { customComponentLibraries: { ...pins, ...missing } } });
      }
    })().catch(() => {
      for (const id of fresh)
        pinChecks.delete(`${versionId}:${id}`);
    }) : Promise.resolve();
    for (const id of fresh)
      pinChecks.set(`${versionId}:${id}`, check);
    return Promise.all(Object.keys(wanted).map((id) => pinChecks.get(`${versionId}:${id}`)));
  }
  async function writeFlexChildOrders(appId, versionId, pageId, orders) {
    const diff = Object.fromEntries([...orders].map(([id, order]) => [
      id,
      { component: { definition: { properties: { childOrder: childOrderProperty(order) } } } }
    ]));
    const res = await auth.authedFetch(`/api/v2/apps/${appId}/versions/${versionId}/components`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_user_switched_version: false, pageId, diff })
    });
    await assertOk(res, "writeFlexChildOrders");
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
        const definition2 = u.definition;
        const properties = definition2?.properties ? downgradeFlexForLibrary({ type: "FlexContainer", properties: definition2.properties }).properties : void 0;
        diff[u.componentId] = { component: { definition: properties ? { ...definition2, properties } : u.definition } };
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
  async function listComponentLibraries() {
    const res = await auth.authedFetch("/api/custom-component-libraries");
    await assertOk(res, "listComponentLibraries");
    const body = await res.json();
    return Array.isArray(body) ? body : body?.libraries ?? [];
  }
  async function listBuiltinPacks() {
    const res = await auth.authedFetch("/api/builtin-packs");
    if (!res.ok)
      return null;
    const body = await res.json();
    if (!Array.isArray(body))
      return null;
    const packs = body;
    return Promise.all(packs.map(async (info) => {
      const file = await auth.authedFetch(`/api/builtin-packs/${encodeURIComponent(info.pack)}/${encodeURIComponent(info.hash)}/manifest.json`);
      const manifest = file.ok ? await file.json() : null;
      return { info, manifest };
    }));
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
  async function datasourceKind(dataSourceId) {
    const known = datasourceIdentities.get(`${await auth.getOrganizationId()}:${dataSourceId}`);
    return known?.kind ?? (await getDatasourceConnectionDetails(dataSourceId)).kind;
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
    branchId: config.branchId,
    createApp,
    async listWorkspaceBranches() {
      const res = await auth.authedFetch("/api/workspace-branches");
      if (res.status === 404)
        return { branches: [], is_multi_branching_enabled: false };
      await assertOk(res, "listWorkspaceBranches");
      const body = await res.json();
      return {
        branches: body.branches.map((branch) => ({ id: branch.id, name: branch.name, is_default: branch.isDefault })),
        active_branch_id: branchIdFor(config) ?? body.activeBranchId,
        is_multi_branching_enabled: body.isMultiBranchingEnabled
      };
    },
    createAppVersion,
    switchAppVersion,
    releaseApp,
    renameApp,
    getApp,
    codeSourceAccess,
    codeSourceFiles,
    getAppSummary,
    listAppPermissionSubjects,
    getLicenseFeatureAccess,
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
    listComponentLibraries,
    listBuiltinPacks,
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
    datasourceKind,
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
    // The saved component library (ToolJet UI 1.0 or 2.0); absent on apps from before the setting.
    component_library: global.componentLibrary,
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
  const hex2 = typeof light === "string" ? /^#([0-9a-f]{6})$/i.exec(light.trim())?.[1] : void 0;
  if (!hex2)
    return false;
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(hex2.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18;
}
createRequire(import.meta.url);
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
var ACCENT_MENU = [
  { name: "Indigo", hex: "#4F46E5", fits: "software, analytics, internal tools" },
  { name: "Violet", hex: "#7C3AED", fits: "creative, education, product teams" },
  { name: "Fuchsia", hex: "#C026D3", fits: "consumer, beauty, events" },
  { name: "Rose", hex: "#E11D48", fits: "hospitality, retail, food" },
  { name: "Coral", hex: "#EA580C", fits: "logistics, field service, sports" },
  { name: "Amber", hex: "#B45309", fits: "manufacturing, construction, real estate" },
  { name: "Emerald", hex: "#059669", fits: "finance, sustainability, health" },
  { name: "Teal", hex: "#0D9488", fits: "healthcare, travel, operations" },
  { name: "Sky", hex: "#0284C7", fits: "support, IT, aviation, marine" }
];
var MENU_TEXT = ACCENT_MENU.map((a) => `${a.name} ${a.hex} (${a.fits})`).join(", ");
var hsl = (hex2) => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex2.trim());
  if (!m)
    return null;
  const full = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0)
    return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};
var accentWarning = (definition2) => {
  const light = definition2?.brand?.colors?.primary?.light;
  if (typeof light !== "string")
    return null;
  const c = hsl(light);
  if (!c)
    return null;
  const kind = c.l < 0.22 ? "near-black" : c.s < 0.2 ? "grey" : c.h >= 212 && c.h <= 226 && c.s > 0.75 && c.l >= 0.45 && c.l <= 0.66 ? "the stock blue" : null;
  if (!kind)
    return null;
  return `The theme's primary ${light} is ${kind}, which reads plain. Unless the request names this colour or the brand uses it, pick an accent from the menu by the request's brand, industry or mood: ${MENU_TEXT}. Keep the canvas and neutrals light and lightly tinted toward it.`;
};
var STANDARD_PRIMARY = { brand: { colors: { primary: { light: "#2563EB" } } } };
var here = dirname(fileURLToPath(import.meta.url));
var standardThemeCandidates = [
  resolve(here, "../../data/default-theme.json"),
  resolve(here, "../data/default-theme.json")
];
var standardThemeCache;
function loadStandardTheme() {
  if (!standardThemeCache) {
    const path = standardThemeCandidates.find((candidate) => existsSync(candidate));
    if (!path) {
      throw new Error(`standard theme file not found (looked in ${standardThemeCandidates.join(", ")})`);
    }
    standardThemeCache = JSON.parse(readFileSync(path, "utf8"));
  }
  return standardThemeCache;
}
var derivedThemeSchema = external_exports.object({
  name: external_exports.string().trim().min(5).max(100),
  definition: themeDefinition
}).strict();
async function resolveTheme(client, choice) {
  const themes2 = await client.listAppThemes();
  if (process.env.MCP_AGENT_PACK_LOOK === "own" && (choice === "standard" || choice === "workspace_default")) {
    const basic = themes2.find((theme) => theme.isBasic && !theme.isDisabled);
    if (basic)
      return basic;
  }
  const wanted = choice === "standard" ? loadStandardTheme() : typeof choice === "object" ? choice : void 0;
  if (wanted) {
    const existing = themes2.find((theme) => theme.name === wanted.name && !theme.isDisabled);
    if (existing)
      return existing;
    return client.createAppTheme({ name: wanted.name, definition: wanted.definition, isDefault: false });
  }
  const named = themes2.find((theme) => theme.name === choice || theme.id === choice);
  if (!named)
    throw new Error(`Theme "${String(choice)}" is not available in the active workspace.`);
  if (named.isDisabled)
    throw new Error(`Theme "${named.name}" is disabled and cannot be selected.`);
  return named;
}
function createAppTool(client) {
  return {
    name: "create_app",
    title: "Create App",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: false
    },
    description: 'Create a new ToolJet app with a first version and home page. Returns app_id, version_id, home_page_id, editor_url, viewer_url, datasources_url, app_url (a backward-compatible alias for editor_url), and the theme that was applied. Honor explicit or selected themes first. Otherwise derive a theme from a brand, industry or customer type (see references/themes.md) and pass theme:{name, definition}; include complete brand, text, border, systemStatus and surface tokens with light/dark values, not a font-only or partial definition. It is created once per workspace by name and applied. Otherwise the app gets the standard theme ("ToolJet Modern": neutral greys, hairline borders, 8/6/12 radii, blue primary). Pass theme:"workspace_default" to leave the app on the workspace default, or an existing theme name/id to reuse one. No theme is ever set as the workspace default. If a theme cannot be created (for example a licence gate) the app is still created and the result carries a theme warning. New apps are built in ToolJet UI 2.0 (component_library "ui2": types starting with Shad, laid out in FlexContainers); pass component_library "ui1" only when the user asks for the classic ToolJet widgets. For a Code mode app (React code, built with the code_app_* tools) pass build_mode "code": the build mode is fixed when the app is created, so an app created without it stays visual. A Code mode app takes no theme, component_library or component_pack (its look lives in its code); call code_app_scaffold with its app_id next.',
    inputSchema: {
      name: external_exports.string().min(1),
      theme: external_exports.union([external_exports.string().min(1), derivedThemeSchema]).optional(),
      app_mode: external_exports.enum(["light", "dark"]).optional().describe("Open the app in this mode. Pass 'dark' when the request asks for a dark app, so the theme's dark values paint every surface; never paint dark backgrounds by hand on a light-mode app."),
      component_library: external_exports.enum(["ui1", "ui2"]).optional().describe('The component library the app is built in, saved on the app (the components panel lists it). Default "ui2", ToolJet UI 2.0; "ui1" (ToolJet UI 1.0, the native widgets) only when the user asks for it.'),
      component_pack: external_exports.string().regex(/^[a-z0-9]+$/i).optional().describe(COMPONENT_PACK_DESCRIPTION),
      build_mode: external_exports.enum(["visual", "code"]).optional().describe('How the app is built, fixed at creation. Default "visual" (ToolJet components on the canvas). "code" makes a Code mode app: React code written with the code_app_* tools. Ask the user which they want when the request does not say.')
    },
    async handler(args) {
      try {
        if (args.build_mode === "code") {
          const cliProblem = await codeCliProblem();
          if (cliProblem)
            return fail(new Error(cliProblem));
          const created2 = await client.createApp(args.name, { buildMode: "code" });
          const ignored = ["theme", "app_mode", "component_library", "component_pack"].filter((k) => args[k] !== void 0);
          return ok({
            ...created2,
            ...ignored.length ? { note: `Not applied to a Code mode app: ${ignored.join(", ")}. Its look is set in its code (frontend/styles/theme.css).` } : {},
            next: "code_app_scaffold with this app_id."
          });
        }
        if (typeof args.theme === "object")
          derivedThemeSchema.parse(args.theme);
        const created = await client.createApp(args.name);
        const componentLibrary = args.component_library ?? "ui2";
        const choice = args.theme ?? "standard";
        const pins = libraryPins();
        const pinned = pins ? { customComponentLibraries: pins } : {};
        const result = {
          ...created,
          component_library: componentLibrary,
          ...componentLibrary === "ui2" && (args.component_pack || defaultPack()) ? { component_pack: (args.component_pack || defaultPack()).toLowerCase() } : {},
          theme: { mode: "workspace_default" }
        };
        const savedLibrary = savedComponentLibrary(componentLibrary, args.component_pack);
        const saveLibrary = () => Promise.resolve().then(() => client.updateAppSettings({
          appId: created.app_id,
          versionId: created.version_id,
          globalSettings: { componentLibrary: savedLibrary, ...pinned }
        })).catch((libraryErr) => {
          result.component_library_warning = `Could not save component_library "${componentLibrary}": ${libraryErr instanceof Error ? libraryErr.message : String(libraryErr)}. Build in it anyway.`;
        });
        if (choice === "workspace_default") {
          await saveLibrary();
          return ok(result);
        }
        const label = typeof choice === "object" ? choice.name : choice;
        try {
          const theme = await resolveTheme(client, choice);
          const appMode = args.app_mode ?? (typeof choice === "object" && paintsDarkCanvasInLightMode(choice.definition) ? "dark" : void 0);
          await client.updateAppSettings({
            appId: created.app_id,
            versionId: created.version_id,
            globalSettings: { theme, componentLibrary: savedLibrary, ...pinned, ...appMode ? { appMode } : {} }
          });
          const mode = choice === "standard" ? "standard" : typeof choice === "object" ? "derived" : "named";
          const accentNote = mode === "standard" ? accentWarning(STANDARD_PRIMARY) : mode === "derived" ? accentWarning(choice.definition) : null;
          result.theme = { mode, id: theme.id, name: theme.name, ...appMode ? { app_mode: appMode } : {}, ...accentNote ? { accent_note: accentNote } : {} };
        } catch (themeErr) {
          await saveLibrary();
          result.theme = {
            mode: "workspace_default",
            warning: `Could not apply theme "${label}": ${themeErr instanceof Error ? themeErr.message : String(themeErr)}. The app was created on the workspace default theme.`
          };
        }
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var THEME_LICENCE_USER_MESSAGE = "Custom themes are not included in your current ToolJet plan, so this app uses the workspace default theme. Upgrading your plan enables branded themes; the app can be re-themed in one request afterwards.";
async function applyToApp(client, theme, args, definition2) {
  if (!args.app_id || !args.version_id)
    return void 0;
  const mode = args.app_mode ?? (paintsDarkCanvasInLightMode(definition2) ? "dark" : void 0);
  await client.updateAppSettings({
    appId: args.app_id,
    versionId: args.version_id,
    globalSettings: { theme, ...mode ? { appMode: mode } : {} }
  });
  return { app_id: args.app_id, version_id: args.version_id, ...mode ? { app_mode: mode } : {} };
}
var hex = (h, s, l) => {
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};
function definitionFromChoices(args) {
  const accent = args.primary ? hsl(args.primary) : null;
  if (!args.primary || !accent)
    return void 0;
  const { h, s: sat, l } = accent;
  const pair = (light, dark, hue = h) => ({ light: hex(hue, light[0], light[1]), dark: hex(hue, dark[0], dark[1]) });
  const base = loadStandardTheme().definition;
  const radius = args.radius ?? base.border.radius.default;
  return {
    brand: {
      colors: {
        primary: { light: args.primary, dark: hex(h, sat, Math.max(l, 0.62)) },
        secondary: pair([0.45, 0.22], [0.4, 0.78]),
        tertiary: pair([0.65, 0.42], [0.65, 0.68], (h + 35) % 360)
      }
    },
    text: {
      font: args.font ?? base.text.font,
      colors: { primary: pair([0.28, 0.13], [0.18, 0.94]), placeholder: pair([0.12, 0.45], [0.1, 0.65]), disabled: pair([0.1, 0.68], [0.08, 0.45]) }
    },
    border: {
      radius: { default: radius, small: Math.max(radius - 2, 0), large: radius + 4 },
      colors: { default: pair([0.22, 0.86], [0.12, 0.24]), weak: pair([0.24, 0.91], [0.12, 0.19]), disabled: pair([0.16, 0.82], [0.1, 0.28]) }
    },
    systemStatus: base.systemStatus,
    surface: {
      colors: {
        appBackground: pair([0.3, 0.965], [0.16, 0.075]),
        surface1: { light: "#ffffff", dark: hex(h, 0.14, 0.11) },
        surface2: pair([0.28, 0.94], [0.13, 0.145]),
        surface3: pair([0.24, 0.9], [0.12, 0.19])
      }
    }
  };
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
    description: "Manage workspace theme objects through ToolJet's typed theme API. Actions: list, create, set_default, update_definition, rename, delete. Definitions contain brand, text, border, systemStatus, and surface tokens with light/dark values. create with app_id and version_id also applies the theme to that app (in app_mode, else in dark mode when its light-mode canvas is dark), so a new app needs no update_app_settings call; create reuses a theme of the same name, so there is no need to list themes first. Delete requires confirm:true after exact-target approval. list returns id, name and flags only; pass include_definitions:true (or theme_id) to get a definition.",
    inputSchema: {
      action: external_exports.enum(["list", "create", "set_default", "update_definition", "rename", "delete"]),
      theme_id: external_exports.string().uuid().optional(),
      name: external_exports.string().trim().min(1).max(100).optional(),
      primary: external_exports.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("create: the accent colour as a hex. With font and radius, this is all a theme needs; the rest is derived from its hue"),
      font: external_exports.string().trim().min(1).max(100).optional().describe("create, with primary: one font family name"),
      radius: external_exports.number().min(0).max(32).optional().describe("create, with primary: corner radius in px"),
      definition: themeDefinition.optional(),
      is_default: external_exports.boolean().optional(),
      confirm: external_exports.boolean().optional(),
      include_definitions: external_exports.boolean().optional(),
      app_id: external_exports.string().uuid().optional().describe("create only: apply the theme to this app as well"),
      version_id: external_exports.string().uuid().optional().describe("create only, with app_id: the app version to apply it to"),
      app_mode: external_exports.enum(["light", "dark"]).optional().describe("create only, with app_id: open the app in this mode. Pass 'dark' when the request asks for a dark app: the theme's dark values then paint every surface, and ToolJet's own parts (tables, inputs) draw for them. Never paint dark backgrounds by hand on a light-mode app.")
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
          const missing = [
            ...args.name === void 0 ? ['name (at least 5 characters, the brand or app, e.g. "Harbor Ledger")'] : [],
            ...args.definition === void 0 && !definitionFromChoices(args) ? ['primary (the accent as a hex colour, e.g. "#0f766e"; font and radius are optional)'] : []
          ];
          if (missing.length)
            throw new Error(`manage_theme create needs ${missing.join(" and ")}. Send them together in one call.`);
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
            const definition2 = requireValue(args.definition ?? definitionFromChoices(args), "primary (a hex colour; font and radius are optional)");
            const created = await client.createAppTheme({
              name,
              definition: definition2,
              isDefault: args.is_default ?? false
            });
            const applied = await applyToApp(client, created, args, definition2);
            const accent = accentWarning(definition2);
            return ok({ theme: created, ...applied ? { applied } : {}, ...accent ? { warnings: [accent] } : {} });
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
          const accent = accentWarning(args.definition);
          return ok({ theme: await readTheme(client, themeId), ...accent ? { warnings: [accent] } : {} });
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
    description: "Create a custom workspace theme, or reuse an existing active theme of the same name. Supply a name of at least five characters and either a full definition or primary (a hex accent), with optional font and radius, for a new theme. is_default can replace the workspace default. With both app_id and version_id, applies it to that app and selects dark mode for a dark light-mode canvas. License gates apply.",
    required: ["name"],
    optional: ["definition", "primary", "font", "radius", "is_default", "app_id", "version_id", "app_mode"],
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
  const unknown = [];
  for (const ref of refs) {
    const lower = ref.toLowerCase();
    const group = directory.groups.find((g) => g.id === ref) ?? directory.groups.find((g) => g.name === ref) ?? directory.groups.find((g) => g.name?.toLowerCase() === lower);
    if (group)
      ids.push(group.id);
    else if (!directory.complete && UUID.test(ref))
      ids.push(ref);
    else
      unknown.push(ref);
  }
  return { ids: [...new Set(ids)], unknown };
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
    problems.push("Name what to limit: route (or routes) for screens, query (or queries) for queries, by name or id." + (screens.length ? ` Screens: ${screens.map((s) => s.path).join(", ")}.` : "") + (summary.queries.length ? ` Queries: ${summary.queries.map((q) => q.name ?? q.id).join(", ")}.` : "") + // A build sent set with groups and grant_app_access but nothing to limit, four times over (2026-11-09).
    (args.grant_app_access || args.groups?.length || args.group_ids?.length ? " There is no app-wide grant: a group gets into this app with the first screen or query limited to it (grant_app_access does that part). Everyone who can open the app already sees what is not limited, so when no screen or query should be limited, there is nothing to set." + (isCodeApp(summary) && !screens.length ? " Screens are listed here after code_app_install has saved the routes." : "") : ""));
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
      openWorldHint: false
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
            const { ids, unknown } = resolveGroups(directory, groupRefs);
            if (unknown.length) {
              problems.push(`${unknown.map((g) => `"${g}"`).join(", ")} ${unknown.length > 1 ? "are not groups" : "is not a group"} of this workspace. Its groups: ${directory.groups.map((g) => g.name ?? g.id).join(", ")}.`);
            }
            subjectIds = ids;
          } else if (accessType === "users") {
            const users = (await client.listAppPermissionSubjects(args.app_id)).users;
            const unknown = [];
            for (const ref of userRefs) {
              const lower = ref.toLowerCase();
              const user = users.find((u) => u.id === ref) ?? users.find((u) => u.email?.toLowerCase() === lower);
              if (user)
                subjectIds.push(user.id);
              else
                unknown.push(ref);
            }
            if (unknown.length) {
              problems.push(`${unknown.map((u) => `"${u}"`).join(", ")} cannot open this app or is not a user of this workspace (users must already have access to the app; list_subjects lists them).`);
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
        const failures = failed.map((r) => `${r.resource.name ?? r.resource.id}: ${r.error}`).join("; ");
        if (failed.length === results.length) {
          throw new Error(failures + (toGrant.length ? " No access to the app was given." : ""));
        }
        if (failed.length) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: `${failed.length} of ${results.length} limits were not set: ${failures}.` + (toGrant.length ? " No access to the app was given." : "") + " Set the failed ones again; the others are in place.",
                app_id: args.app_id,
                applied: results.filter((r) => !r.error),
                failed
              })
            }],
            isError: true
          };
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
        return ok(body);
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var appPermissions = [
  {
    action: "list_screens",
    name: "list_app_permission_screens",
    title: "List App Screen Permissions",
    description: "Read the Code mode screens and their access restrictions for one app. Does not change access.",
    required: ["app_id"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "list_queries",
    name: "list_app_permission_queries",
    title: "List App Query Permissions",
    description: "Read the queries and their access restrictions for one app. Does not change access.",
    required: ["app_id"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "list_subjects",
    name: "list_app_permission_subjects",
    title: "List App Permission Subjects",
    description: "List users and groups eligible for resource access rules in one app. Subjects must already have app access. ToolJet permissions and license gates apply.",
    required: ["app_id"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "get",
    name: "get_app_resource_permission",
    title: "Get App Resource Permission",
    description: "Read server-enforced access for one page, query, or component belonging to the selected app. Use exact resource IDs from get_app_summary.",
    required: ["app_id", "resource_type", "resource_id"],
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  },
  {
    action: "set",
    name: "set_app_resource_permission",
    title: "Set App Resource Permission",
    description: "Replace access to one app page, query, or component with selected users or groups. Supply user_ids for access_type users or group_ids for groups, never both. Requires confirm:true after explicit approval of the exact rule; existing app access and license gates still apply.",
    required: ["app_id", "resource_type", "resource_id", "access_type", "confirm"],
    optional: ["user_ids", "group_ids"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  },
  {
    action: "clear",
    name: "clear_app_resource_permission",
    title: "Clear App Resource Permission",
    description: "Remove a resource access restriction, broadening access to every user who can access the app. Requires confirm:true after explicit approval of this exact page, query, or component.",
    required: ["app_id", "resource_type", "resource_id", "confirm"],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }
  }
];
function appPermissionActionTools(source) {
  return exposeActions(source, appPermissions);
}
export {
  allowedApiOrigins as A,
  ALLOWED_API_ORIGINS_VAR as B,
  identityFromHeaders as C,
  BASE_URL_HEADER as D,
  PAT_HEADER as E,
  PartialWriteError as P,
  SESSION_TOKEN_HEADER as S,
  TOOLJET_DB_DATA_TYPES as T,
  WORKSPACE_ACCESS_KEYS as W,
  WORKSPACE_PERMISSION_KEYS as a,
  invalidSeedTimestamps as b,
  componentRef as c,
  completedPartialWrites as d,
  currentBranchId as e,
  loadConfig as f,
  createClient as g,
  createAppTool as h,
  indexComponentReferences as i,
  manageThemeTool as j,
  projectJavascriptRuntime as k,
  literalCanvasColor as l,
  manageAppPermissionsTool as m,
  normalizeType as n,
  projectAppSettings as o,
  packDefaultDefinition as p,
  compactTheme as q,
  registerPackDefinitions as r,
  pageSettingProperties as s,
  ToolJetHttpError as t,
  themeActionTools as u,
  validateTableBatch as v,
  workspaceAccessKeys as w,
  appPermissionActionTools as x,
  branchIdFor as y,
  withBranchContext as z
};
