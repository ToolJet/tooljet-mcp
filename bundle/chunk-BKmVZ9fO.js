import { createRequire } from "node:module";
import { o as external_exports, q as editContractSchema, s as generateEditContract, p as COMPONENT_FX_GUIDANCE } from "./chunk-8iUq0slz.js";
import { s as strictEntry, g as specSchema, h as createClient, l as listWorkspaceGroupsTool, m as manageWorkspaceGroupsTool, j as inspectDatasourceSchemaTool, u as updateComponentsTool, o as ok, k as nodeCatalog, f as fail, p as capabilityRequestSchema, q as getWorkflowCapabilities, w as lint, x as apply, y as deleteNode, z as validateGraph, v as validateTableBatch, A as ToolJetHttpError, r as resolveRef, P as PartialWriteError, n as normalizeComponentSpec } from "./chunk-DbFNT0Gf.js";
import { a6 as dbColumnTypeSchema, a7 as componentInputSchema, a8 as lintAppSpecTool, a9 as projectJavascriptRuntime, aa as projectAppSettings, ab as compactTheme, ac as pageSettingProperties, l as literalCanvasColor, ad as containsExactValue, h as prepareQueryOptionsForWrite, ae as inspectUpdateCompatibility, af as normalizePlanBindingAliases, ag as containsNamedBinding, ah as normalizePlannedLayouts, ai as materializeRequiredDefaultChildren, aj as mapKeyRefusal, j as prepareComponentBatch, v as validateEvents, n as expandQueryLifecycles, q as persistedEventSpecs, ak as persistedEventIds } from "./chunk-pMEylbpx.js";
import { v as verifyPageRenderTool, a as applyAppPhaseTool, r as runQueryTool, b as runQueriesTool, W as WebStandardStreamableHTTPServerTransport, g as getRequestListener, c as validatePersistedAppSummary } from "./chunk-JCMmiPv2.js";
import { M as McpServer } from "./chunk-DiCiME0d.js";
import { u as pageIconSchema, c as componentSlotSchema, a as componentNameSchema, t as lintComponents, i as introducedLintFindings, x as lintRenderedGeometryBlocking, y as lintRenderedGeometryAdvisory, d as decodeComponentParent, e as encodeComponentParent, f as lintComponentSlots, l as lintComponentSpec, g as lintUnusableTextGeometry, z as lintNestedContainerWidths, h as lintStandardSingleLineInputHeight, j as lintTextGeometry, k as lintRenderedGeometry, F as FORM_SCHEMA_FIELD_TYPE_SET, A as SAFE_GENERATED_FORM_FIELD_TYPE_SET } from "./chunk-gznY6rD8.js";
import { ea as getCatalog, e5 as getComponentSchema, eb as getLegacyComponentReplacement, ee as readCatalogBytes } from "./chunk-BEuHHGL1.js";
import { k as connectableDatasourceNames, m as getDatasourceCatalog, n as selectDatasourceQuerySchema, g as getDatasourceQuerySchema } from "./chunk-CsHFzbSc.js";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { createServer } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, appendFile } from "node:fs/promises";
import { dirname, resolve, basename, join } from "node:path";
import { statSync, accessSync, constants, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
createRequire(import.meta.url);
function createExchangeLimiter(limit = 300, trustedProxyHops = 0) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1e4 || !Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 10) {
    throw new Error("Invalid MCP OAuth exchange rate limit or trusted proxy hop count");
  }
  const buckets = /* @__PURE__ */ new Map();
  let nextSweep = 0;
  const address = (req) => {
    let ip = req.socket.remoteAddress || "unknown";
    const forwarded = req.headers["x-forwarded-for"];
    if (trustedProxyHops && typeof forwarded === "string") {
      const chain = [...forwarded.split(",").map((value) => value.trim()), ip];
      const candidate = chain[chain.length - 1 - trustedProxyHops];
      if (candidate && isIP(candidate))
        ip = candidate;
    }
    return ip;
  };
  return {
    retryAfter(req, now = Date.now()) {
      const bucket = buckets.get(address(req));
      return bucket && bucket.reset > now && bucket.count >= limit ? Math.max(1, Math.ceil((bucket.reset - now) / 1e3)) : 0;
    },
    failed(req, now = Date.now()) {
      if (now >= nextSweep) {
        for (const [key, bucket2] of buckets)
          if (bucket2.reset <= now)
            buckets.delete(key);
        nextSweep = now + 6e4;
      }
      const ip = address(req);
      let bucket = buckets.get(ip);
      if (!bucket || bucket.reset <= now) {
        if (buckets.size >= 1e4)
          buckets.delete(buckets.keys().next().value);
        bucket = { count: 0, reset: now + 6e4 };
        buckets.set(ip, bucket);
      }
      bucket.count++;
    }
  };
}
function createVerifiedExchangeCache(ttlMs = 6e4, capacity = 1e4) {
  const verified = /* @__PURE__ */ new Map();
  const key = (token, resource) => createHash("sha256").update(resource).update("\0").update(token).digest("hex");
  return {
    has(token, resource, now = Date.now()) {
      const id = key(token, resource);
      const expires = verified.get(id);
      if (expires !== void 0 && expires > now)
        return true;
      verified.delete(id);
      return false;
    },
    remember(token, resource, now = Date.now()) {
      const id = key(token, resource);
      verified.delete(id);
      if (verified.size >= capacity)
        verified.delete(verified.keys().next().value);
      verified.set(id, now + ttlMs);
    },
    forget(token, resource) {
      verified.delete(key(token, resource));
    }
  };
}
var StreamableHTTPServerTransport = class {
  constructor(options2 = {}) {
    this._requestContext = /* @__PURE__ */ new WeakMap();
    this._webStandardTransport = new WebStandardStreamableHTTPServerTransport(options2);
    this._requestListener = getRequestListener(async (webRequest) => {
      const context = this._requestContext.get(webRequest);
      return this._webStandardTransport.handleRequest(webRequest, {
        authInfo: context?.authInfo,
        parsedBody: context?.parsedBody
      });
    }, { overrideGlobalObjects: false });
  }
  /**
   * Gets the session ID for this transport instance.
   */
  get sessionId() {
    return this._webStandardTransport.sessionId;
  }
  /**
   * Sets callback for when the transport is closed.
   */
  set onclose(handler) {
    this._webStandardTransport.onclose = handler;
  }
  get onclose() {
    return this._webStandardTransport.onclose;
  }
  /**
   * Sets callback for transport errors.
   */
  set onerror(handler) {
    this._webStandardTransport.onerror = handler;
  }
  get onerror() {
    return this._webStandardTransport.onerror;
  }
  /**
   * Sets callback for incoming messages.
   */
  set onmessage(handler) {
    this._webStandardTransport.onmessage = handler;
  }
  get onmessage() {
    return this._webStandardTransport.onmessage;
  }
  /**
   * Starts the transport. This is required by the Transport interface but is a no-op
   * for the Streamable HTTP transport as connections are managed per-request.
   */
  async start() {
    return this._webStandardTransport.start();
  }
  /**
   * Closes the transport and all active connections.
   */
  async close() {
    return this._webStandardTransport.close();
  }
  /**
   * Sends a JSON-RPC message through the transport.
   */
  async send(message, options2) {
    return this._webStandardTransport.send(message, options2);
  }
  /**
   * Handles an incoming HTTP request, whether GET or POST.
   *
   * This method converts Node.js HTTP objects to Web Standard Request/Response
   * and delegates to the underlying WebStandardStreamableHTTPServerTransport.
   *
   * @param req - Node.js IncomingMessage, optionally with auth property from middleware
   * @param res - Node.js ServerResponse
   * @param parsedBody - Optional pre-parsed body from body-parser middleware
   */
  async handleRequest(req, res, parsedBody) {
    const authInfo = req.auth;
    const handler = getRequestListener(async (webRequest) => {
      return this._webStandardTransport.handleRequest(webRequest, {
        authInfo,
        parsedBody
      });
    }, { overrideGlobalObjects: false });
    await handler(req, res);
  }
  /**
   * Close an SSE stream for a specific request, triggering client reconnection.
   * Use this to implement polling behavior during long-running operations -
   * client will reconnect after the retry interval specified in the priming event.
   */
  closeSSEStream(requestId) {
    this._webStandardTransport.closeSSEStream(requestId);
  }
  /**
   * Close the standalone GET SSE stream, triggering client reconnection.
   * Use this to implement polling behavior for server-initiated notifications.
   */
  closeStandaloneSSEStream() {
    this._webStandardTransport.closeStandaloneSSEStream();
  }
};
var SESSION_TOKEN_HEADER = "x-tooljet-session";
var WORKSPACE_ID_HEADER = "x-tooljet-workspace-id";
var WORKSPACE_SLUG_HEADER = "x-tooljet-workspace-slug";
var PAT_HEADER = "x-tooljet-pat";
var BASE_URL_HEADER = "x-tooljet-url";
var CUSTOMER_ID_HEADER = "x-tooljet-customer-id";
var ALLOWED_API_ORIGINS_VAR = "MCP_ALLOWED_API_ORIGINS";
var GATEWAY_URL_VAR = "MCP_GATEWAY_URL";
var GATEWAY_TOKEN_VAR = "MCP_GATEWAY_TOKEN";
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
  const cached = gatewayOriginCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now())
    return cached.allowed;
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
  const cached = gatewayResolveCache.get(customerId);
  if (cached && cached.expiresAt > Date.now())
    return cached.result;
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
    return { pat, apiUrl, customerVerified };
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
      return { apiUrl: apiUrl2, appUrl: appUrl2, viewerUrl, pat: identity.pat };
    return {
      apiUrl: apiUrl2,
      appUrl: appUrl2,
      viewerUrl,
      sessionToken: identity.sessionToken,
      isOAuthDelegation: identity.isOAuthDelegation,
      oauthGrantId: identity.oauthGrantId,
      workspaceId: identity.workspaceId,
      workspaceSlug: identity.workspaceSlug
    };
  }
  const apiUrl = staticApiUrl;
  const appUrl = explicitAppUrl ?? explicitApiUrl ?? "http://localhost:8082";
  const pat = env("TOOLJET_PAT");
  const sessionToken = env("TOOLJET_SESSION_TOKEN");
  const workspaceId = env("TOOLJET_WORKSPACE_ID");
  if (!pat && !sessionToken) {
    throw new Error(`TOOLJET_SESSION_TOKEN or TOOLJET_PAT is required. For a standalone server, create a personal access token in ToolJet under Settings \u2192 Access tokens, in the workspace you want this server to act on, and set TOOLJET_PAT. A shared HTTP server instead receives the acting user per request via the ${SESSION_TOKEN_HEADER} header.`);
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
    workspaceSlug: env("TOOLJET_WORKSPACE_SLUG")
  };
}
var storage = new AsyncLocalStorage();
function recordHttpResponse(response) {
  const context = storage.getStore();
  if (!context)
    return;
  context.httpRequests += 1;
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 0) {
    context.upstreamResponseBytes += contentLength;
  }
}
function countWarnings(result) {
  try {
    const value = JSON.parse(result.content.map((item) => item.text).join(""));
    return Array.isArray(value.warnings) ? value.warnings.length : 0;
  } catch {
    return 0;
  }
}
async function optionallyLog(metrics) {
  const path = process.env.TOOLJET_TELEMETRY_PATH;
  if (!path)
    return;
  try {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify({ ts: (/* @__PURE__ */ new Date()).toISOString(), ...metrics })}
`, "utf8");
  } catch {
  }
}
async function withToolTelemetry(tool, handler) {
  const context = { httpRequests: 0, upstreamResponseBytes: 0 };
  const started = performance.now();
  const result = await storage.run(context, handler);
  const metrics = {
    tool,
    duration_ms: Math.round((performance.now() - started) * 10) / 10,
    http_requests: context.httpRequests,
    upstream_response_bytes: context.upstreamResponseBytes,
    result_bytes: Buffer.byteLength(result.content.map((item) => item.text).join(""), "utf8"),
    warnings: countWarnings(result),
    error: result.isError === true
  };
  await optionallyLog(metrics);
  return { ...result, _meta: { ...result._meta ?? {}, tooljet_metrics: metrics } };
}
function createAuth(config, fetchImpl = fetch) {
  let token;
  let suppliedSessionUsed = false;
  let workspaceId;
  let workspaceSlug;
  let workspaceName;
  const datasourceManagementUrl = (slug, datasourceId) => `${config.appUrl}/${encodeURIComponent(slug)}/data-sources`;
  async function login() {
    if (config.sessionToken) {
      if (suppliedSessionUsed) {
        if (config.isOAuthDelegation) {
          throw new Error("The OAuth connection expired or lost access. Reconnect the MCP client to ToolJet.");
        }
        throw new Error("The ToolJet session for this build is no longer valid (expired, or its token was revoked). It is minted per build and cannot be renewed from here \u2014 start a new build.");
      }
      suppliedSessionUsed = true;
      token = config.sessionToken;
      workspaceId = config.workspaceId;
      workspaceSlug = config.workspaceSlug ?? config.workspaceId;
      return;
    }
    const res = await fetchImpl(`${config.apiUrl}/api/personal-access-tokens/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.pat}` }
    });
    recordHttpResponse(res);
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 500);
      const hint = res.status === 401 ? " \u2014 TOOLJET_PAT was rejected: check it is not expired or revoked, and that it was copied whole." : res.status === 404 ? " \u2014 this instance has no personal-access-token endpoint: it predates PAT support, or TOOLJET_URL is not the API origin. Upgrade the instance, or point TOOLJET_URL at one that has tokens." : "";
      throw new Error(`ToolJet PAT session exchange failed (HTTP ${res.status})${hint}${detail ? ` Response: ${detail}` : ""}`);
    }
    const body = await res.json();
    if (!body.authToken) {
      throw new Error("ToolJet PAT session exchange succeeded but returned no authToken.");
    }
    token = body.authToken;
    workspaceId = body.organizationId;
    workspaceSlug = body.organizationSlug ?? void 0;
    workspaceName = body.organizationName ?? void 0;
  }
  async function rawFetch(path, init) {
    const headers = new Headers(init?.headers);
    if (config.isOAuthDelegation) {
      headers.delete("Cookie");
      headers.delete("Authorization");
      headers.delete("tj_auth_token");
      headers.set("x-tooljet-delegation", token);
    } else {
      headers.set("Cookie", `tj_auth_token=${token}`);
    }
    if (workspaceId)
      headers.set("tj-workspace-id", workspaceId);
    const response = await fetchImpl(`${config.apiUrl}${path}`, {
      ...init,
      headers,
      ...config.isOAuthDelegation ? { redirect: "error" } : {}
    });
    recordHttpResponse(response);
    return response;
  }
  async function fetchWorkspaceList() {
    if (config.pat || config.sessionToken) {
      if (!workspaceId)
        throw new Error("This session did not resolve a workspace.");
      return [
        {
          id: workspaceId,
          name: workspaceName ?? workspaceSlug ?? workspaceId,
          slug: workspaceSlug ?? workspaceId,
          datasources_url: datasourceManagementUrl(workspaceSlug ?? workspaceId),
          is_current: true,
          is_default: true
        }
      ];
    }
    const res = await rawFetch("/api/organizations?status=active");
    if (!res.ok) {
      throw new Error(`ToolJet listWorkspaces failed (${res.status}): ${await res.text()}`);
    }
    const body = await res.json();
    return (body.organizations ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      datasources_url: datasourceManagementUrl(o.slug),
      is_default: !!o.is_default,
      is_current: o.id === workspaceId
    }));
  }
  async function doFetch(path, init) {
    return rawFetch(path, init);
  }
  async function authedFetch(path, init) {
    if (!token)
      await login();
    let res = await doFetch(path, init);
    if (res.status === 401) {
      token = void 0;
      await login();
      res = await doFetch(path, init);
      if (res.status === 401)
        throw new Error("ToolJet auth failed: " + await res.text());
    }
    return res;
  }
  async function getOrganizationId() {
    if (!workspaceId)
      await login();
    if (!workspaceId)
      throw new Error("ToolJet getOrganizationId failed: no organization id available after login");
    return workspaceId;
  }
  async function getOrganizationSlug() {
    if (!workspaceSlug)
      await login();
    if (!workspaceSlug)
      throw new Error("ToolJet getOrganizationSlug failed: no organization slug available after login");
    return workspaceSlug;
  }
  async function listWorkspaces() {
    if (!token)
      await login();
    return fetchWorkspaceList();
  }
  async function switchWorkspace(id) {
    if (!token)
      await login();
    const current = (await fetchWorkspaceList())[0];
    if (id !== current.id) {
      throw new Error(`This server is scoped to workspace "${current.slug}" (${current.id}) and cannot switch to ${id}. ` + (config.isOAuthDelegation ? "Connect your MCP client to the target workspace URL and authorize that workspace." : config.sessionToken ? "Its session was minted for that workspace; start a build from the workspace you want to act on." : "Issue a personal access token in the target workspace and set TOOLJET_PAT to it."));
    }
    return current;
  }
  async function viewerSession(appId) {
    if (config.isOAuthDelegation) {
      if (!appId || !/^[A-Za-z0-9_-]+$/.test(appId))
        throw new Error("An app is required for OAuth render verification");
      const response = await authedFetch("/api/mcp-oauth/viewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId })
      });
      if (!response.ok)
        throw new Error(`OAuth viewer authorization failed (HTTP ${response.status}); rendering remains unverified`);
      const body = await response.json();
      if (typeof body.access_token !== "string" || !body.access_token || body.access_token === token || body.token_type !== "Bearer" || body.app_id !== appId || body.organization_id !== workspaceId || typeof body.expires_in !== "number" || !Number.isInteger(body.expires_in) || body.expires_in <= 0 || body.expires_in > 120) {
        throw new Error("Invalid scoped OAuth viewer credential");
      }
      return {
        cookieName: "tj_oauth_viewer",
        token: body.access_token,
        origin: new URL(config.viewerUrl || config.appUrl).origin,
        expiresAt: Math.floor(Date.now() / 1e3) + body.expires_in
      };
    }
    if (!token)
      await login();
    return token;
  }
  return { authedFetch, getOrganizationId, getOrganizationSlug, listWorkspaces, switchWorkspace, viewerSession };
}
function renderAuditAvailable() {
  if (process.env.MCP_RENDER_AUDIT_ENABLED === "false")
    return false;
  try {
    const require2 = createRequire(import.meta.url);
    try {
      require2.resolve(process.env.MCP_RENDER_AUDIT_PLAYWRIGHT || "playwright-core");
    } catch {
      require2.resolve("playwright-core");
    }
    const channel = process.env.MCP_RENDER_AUDIT_CHANNEL || "chrome";
    if (!process.env.MCP_RENDER_AUDIT_CHROME && channel !== "chrome")
      return true;
    const candidates = process.env.MCP_RENDER_AUDIT_CHROME ? [process.env.MCP_RENDER_AUDIT_CHROME] : channel === "chrome" ? process.platform === "darwin" ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] : process.platform === "win32" ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter((path) => !!path).map((path) => join(path, "Google/Chrome/Application/chrome.exe")) : ["/opt/google/chrome/chrome", "/usr/bin/google-chrome"] : [];
    return candidates.some((path) => {
      try {
        accessSync(path, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
var target = { app_id: external_exports.string().uuid(), version_id: external_exports.string().uuid() };
var environment = external_exports.enum(["development", "staging", "production"]);
function appVersionLifecycleTools(client) {
  const execute = (action) => async (args) => {
    try {
      return ok(await action(args));
    } catch (err) {
      return fail(err);
    }
  };
  return [
    {
      name: "list_app_versions",
      title: "List App Versions",
      description: "List exact versions and environments for one app. Use returned IDs to resolve named lifecycle targets; never infer IDs.",
      annotations: { readOnlyHint: true },
      strictInput: true,
      inputSchema: { app_id: target.app_id },
      handler: execute((a) => client.appVersions.list(a.app_id))
    },
    {
      name: "promote_app_version",
      title: "Promote App Version",
      description: "Save a draft if necessary and promote the selected version only as far as the explicitly requested environment. Never releases the app. Pass confirm:true only for an explicit promotion request. Returns verified editor selection metadata.",
      annotations: { readOnlyHint: false, destructiveHint: true },
      strictInput: true,
      inputSchema: { ...target, environment_name: external_exports.enum(["staging", "production"]), confirm: external_exports.literal(true) },
      handler: execute((a) => client.appVersions.promote(a.app_id, a.version_id, a.environment_name))
    },
    {
      name: "switch_app_environment",
      title: "Switch App Environment",
      description: "Open the same app version in a requested environment without publishing, promoting, or releasing it. Fails if that version is not available there. Use only for an explicit environment-switch request.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      strictInput: true,
      inputSchema: { ...target, environment_name: environment },
      handler: execute((a) => client.appVersions.switchEnvironment(a.app_id, a.version_id, a.environment_name))
    },
    {
      name: "update_app_version",
      title: "Update App Version",
      description: "Rename the selected version or edit its description, only when explicitly requested. Does not publish, promote, or release. Backend version permissions and edit restrictions apply.",
      annotations: { readOnlyHint: false, destructiveHint: false },
      strictInput: true,
      inputSchema: { ...target, version_name: external_exports.string().trim().min(1).max(50).optional(), version_description: external_exports.string().max(500).optional() },
      handler: execute((a) => client.appVersions.update(a.app_id, a.version_id, { name: a.version_name, description: a.version_description }))
    },
    {
      name: "delete_app_version",
      title: "Delete App Version",
      description: "Delete the explicitly selected, unreleased version only on an explicit user deletion request. List versions first and provide a different fallback_version_id in the same app for the editor to open afterward. Never delete the released or only version. Do not retry an uncertain deletion automatically.",
      annotations: { readOnlyHint: false, destructiveHint: true },
      strictInput: true,
      inputSchema: { ...target, fallback_version_id: external_exports.string().uuid(), confirm: external_exports.literal(true) },
      handler: execute((a) => client.appVersions.remove(a.app_id, a.version_id, a.fallback_version_id))
    }
  ];
}
function listWorkspacesTool(client) {
  return {
    name: "list_workspaces",
    title: "List Workspaces",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "List the ToolJet workspaces (organizations) this user belongs to: [{ id, name, slug, datasources_url, is_default, is_current }]. datasources_url opens ToolJet connection management for user-assisted setup/repair. A user can be in multiple workspaces, and apps/tables/datasources are scoped to the ACTIVE one. This server is token-scoped to a single workspace, so exactly one is returned and there anything. `is_current` marks the active workspace.",
    inputSchema: {},
    async handler() {
      try {
        return ok(await client.listWorkspaces());
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function useWorkspaceTool(client) {
  return {
    name: "use_workspace",
    title: "Confirm Active Workspace",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Confirm the ACTIVE workspace (organization). This server is scoped to a single workspace by its connection credentials and cannot switch: passing that workspace id returns it, and any other id errors naming the one in use. Everything is created in that workspace, so there is nothing to select at setup \u2014 call list_workspaces if you need its id, name, slug or datasources_url.",
    inputSchema: {
      workspace_id: external_exports.string()
    },
    async handler(args) {
      try {
        return ok(await client.useWorkspace(args.workspace_id));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
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
async function applyToApp(client, theme, args, definition) {
  if (!args.app_id || !args.version_id)
    return void 0;
  const dark = paintsDarkCanvasInLightMode(definition);
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
      openWorldHint: true
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
          const themes = await client.listAppThemes();
          if (args.include_definitions)
            return ok({ themes });
          if (args.theme_id) {
            const one = themes.find((theme) => theme.id === args.theme_id);
            return one ? ok({ themes: [one] }) : fail(new Error(`Theme "${args.theme_id}" not found.`));
          }
          return ok({
            themes: themes.map(({ id, name, isDefault, isBasic, isDisabled }) => ({ id, name, isDefault, isBasic, isDisabled })),
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
  const themes = await client.listAppThemes();
  const wanted = choice === "standard" ? loadStandardTheme() : typeof choice === "object" ? choice : void 0;
  if (wanted) {
    const existing = themes.find((theme) => theme.name === wanted.name && !theme.isDisabled);
    if (existing)
      return existing;
    return client.createAppTheme({ name: wanted.name, definition: wanted.definition, isDefault: false });
  }
  const named = themes.find((theme) => theme.name === choice || theme.id === choice);
  if (!named)
    throw new Error(`Theme "${String(choice)}" is not available in the active workspace.`);
  if (named.isDisabled)
    throw new Error(`Theme "${named.name}" is disabled and cannot be selected.`);
  return named;
}
function paintsDarkCanvasInLightMode(definition) {
  const light = definition?.surface?.colors?.appBackground?.light;
  const hex = typeof light === "string" ? /^#([0-9a-f]{6})$/i.exec(light.trim())?.[1] : void 0;
  if (!hex)
    return false;
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18;
}
function createAppTool(client) {
  return {
    name: "create_app",
    title: "Create App",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: 'Create a new ToolJet app with a first version and home page. Returns app_id, version_id, home_page_id, editor_url, viewer_url, datasources_url, app_url (a backward-compatible alias for editor_url), and the theme that was applied. Honor explicit or selected themes first. Otherwise derive a theme from a brand, industry or customer type (see references/themes.md) and pass theme:{name, definition}; include complete brand, text, border, systemStatus and surface tokens with light/dark values, not a font-only or partial definition. It is created once per workspace by name and applied. Otherwise the app gets the standard theme ("ToolJet Modern": neutral greys, hairline borders, 8/6/12 radii, blue primary). Pass theme:"workspace_default" to leave the app on the workspace default, or an existing theme name/id to reuse one. No theme is ever set as the workspace default. If a theme cannot be created (for example a licence gate) the app is still created and the result carries a theme warning.',
    inputSchema: {
      name: external_exports.string().min(1),
      theme: external_exports.union([external_exports.string().min(1), derivedThemeSchema]).optional()
    },
    async handler(args) {
      try {
        if (typeof args.theme === "object")
          derivedThemeSchema.parse(args.theme);
        const created = await client.createApp(args.name);
        const choice = args.theme ?? "standard";
        const result = { ...created, theme: { mode: "workspace_default" } };
        if (choice === "workspace_default")
          return ok(result);
        const label = typeof choice === "object" ? choice.name : choice;
        try {
          const theme = await resolveTheme(client, choice);
          const dark = typeof choice === "object" && paintsDarkCanvasInLightMode(choice.definition);
          await client.updateAppSettings({
            appId: created.app_id,
            versionId: created.version_id,
            globalSettings: { theme, ...dark ? { appMode: "dark" } : {} }
          });
          const mode = choice === "standard" ? "standard" : typeof choice === "object" ? "derived" : "named";
          result.theme = { mode, id: theme.id, name: theme.name, ...dark ? { app_mode: "dark" } : {} };
        } catch (themeErr) {
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
function createAppVersionTool(client) {
  return {
    name: "create_app_version",
    title: "Create App Version",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Create a new draft version of an existing ToolJet app by cloning a specified source version. Returns the app_id, new version_id, version_name, source_version_id, and available version metadata; Conflicts fail without adopting an existing draft, including after a timeout. Before editing, inspect the returned version_id for its cloned resource IDs. The agent and ToolJet editor automatically switch to the newly created version after success. Version names must be unique within the app.",
    inputSchema: {
      app_id: external_exports.string().uuid(),
      version_name: external_exports.string().trim().min(1).max(25),
      version_from_id: external_exports.string().uuid(),
      version_description: external_exports.string().max(500).optional()
    },
    strictInput: true,
    async handler(args) {
      try {
        return ok(await client.createAppVersion({
          appId: args.app_id,
          versionName: args.version_name,
          versionFromId: args.version_from_id,
          ...args.version_description !== void 0 ? { versionDescription: args.version_description } : {}
        }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function switchAppVersionTool(client) {
  return {
    name: "switch_app_version",
    title: "Switch App Version",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    description: "Select an existing ToolJet app version as the version the current editor should open and subsequent agent edits should target. Use only when the user explicitly asks to switch, select, open, or work on that version. This does not publish or release the version. Returns verified version and environment metadata that the ToolJet client uses to switch the editor.",
    inputSchema: { app_id: external_exports.string().uuid(), version_id: external_exports.string().uuid() },
    strictInput: true,
    async handler(args) {
      try {
        return ok(await client.switchAppVersion(args.app_id, args.version_id));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function releaseAppTool(client) {
  return {
    name: "release_app",
    title: "Release App",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Release a specific ToolJet app version so it becomes the app's live released version. Use only when the user explicitly asked to release or publish the app, and pass confirm:true. The operation publishes a draft when necessary and promotes it one environment at a time until it reaches production when the workspace requires it, then releases only that exact version. It is safe to retry after a transient preparation failure. Returns a verified current_version_id after reading the app back.",
    inputSchema: {
      app_id: external_exports.string().uuid(),
      version_id: external_exports.string().uuid(),
      confirm: external_exports.literal(true)
    },
    strictInput: true,
    async handler(args) {
      try {
        return ok(await client.releaseApp(args.app_id, args.version_id));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function getAppSettingsTool(client) {
  return {
    name: "get_app_settings",
    title: "Get App Settings",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Read the current editing version's compact app-wide visual settings: canvas background/width/mode, selected theme, header/logo/title, and navigation visibility/layout. Use before update_app_settings; this omits theme definitions and other large raw app data. Set include_libraries for bounded, read-only JavaScript library configuration and RunJS scope guidance before authoring library-dependent queries; this never loads or executes code.",
    inputSchema: {
      app_id: external_exports.string().min(1),
      version_id: external_exports.string().min(1).optional().describe("Defaults to the app's editing version."),
      include_libraries: external_exports.boolean().optional().describe("Inspect stored JavaScript dependencies, not runtime readiness. Omitted by default.")
    },
    async handler(args) {
      try {
        const versionId = args.version_id ?? (await client.getAppSummary(args.app_id)).version_id;
        if (!versionId)
          throw new Error("get_app_settings needs version_id: the app has no editing version.");
        const snapshot2 = await client.getAppSettings(args.app_id, versionId);
        return ok({
          ...projectAppSettings(snapshot2),
          ...args.include_libraries ? { javascript_runtime: projectJavascriptRuntime(snapshot2) } : {}
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function listAppThemesTool(client) {
  return {
    name: "list_app_themes",
    title: "List App Themes",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "List compact workspace themes available for app settings. Disabled themes are returned but cannot be selected by update_app_settings. Theme definitions are intentionally omitted to keep discovery small.",
    inputSchema: {},
    async handler() {
      try {
        return ok({ themes: (await client.listAppThemes()).map((theme) => compactTheme(theme)) });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var SETTING_KEYS = [
  "canvas_background_color",
  "canvas_max_width",
  "app_mode",
  "theme_id",
  "hide_header",
  "hide_logo",
  "header_title",
  "navigation_hidden",
  "navigation_position",
  "navigation_style",
  "navigation_collapsible"
];
function persistenceMismatches(args, snapshot2) {
  const global = snapshot2.global_settings;
  const page = pageSettingProperties(snapshot2);
  const mismatches = [];
  const expectEqual = (label, actual, expected) => {
    if (actual !== expected)
      mismatches.push(`${label} did not persist (expected ${JSON.stringify(expected)}, read back ${JSON.stringify(actual)})`);
  };
  if (args.canvas_background_color !== void 0)
    expectEqual("canvas_background_color", global.canvasBackgroundColor, args.canvas_background_color);
  if (args.canvas_max_width !== void 0) {
    expectEqual("canvas_max_width.value", global.canvasMaxWidth, args.canvas_max_width.value);
    expectEqual("canvas_max_width.unit", global.canvasMaxWidthType, args.canvas_max_width.unit);
  }
  if (args.app_mode !== void 0)
    expectEqual("app_mode", global.appMode, args.app_mode);
  if (args.theme_id !== void 0) {
    const theme = global.theme;
    expectEqual("theme_id", theme?.id, args.theme_id);
  }
  if (args.hide_header !== void 0)
    expectEqual("hide_header", page.hideHeader, args.hide_header);
  if (args.hide_logo !== void 0)
    expectEqual("hide_logo", page.hideLogo, args.hide_logo);
  if (args.header_title !== void 0)
    expectEqual("header_title", page.name, args.header_title);
  if (args.navigation_hidden !== void 0) {
    const disableMenu = page.disableMenu;
    expectEqual("navigation_hidden", disableMenu?.value, `{{${args.navigation_hidden}}}`);
  }
  if (args.navigation_position !== void 0)
    expectEqual("navigation_position", page.position, args.navigation_position);
  if (args.navigation_style !== void 0)
    expectEqual("navigation_style", page.style, args.navigation_style);
  if (args.navigation_collapsible !== void 0)
    expectEqual("navigation_collapsible", page.collapsable, args.navigation_collapsible);
  return mismatches;
}
function updateAppSettingsTool(client) {
  return {
    name: "update_app_settings",
    title: "Update App Settings",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Patch app-wide visual settings on the current editing version in one version update, then read them back. Supports canvas background/width/mode, a theme selected from list_app_themes, header/logo/title, and navigation visibility/layout. hide_header controls the app header/banner. The separate generated page-navigation menu can be positioned on the side or top; navigation_hidden hides that entire menu in either position. To hide only one non-Home page from that menu, use update_pages.hidden. Omitted fields are preserved. Every requested field is read back; the tool returns an error instead of success if any field did not persist.",
    inputSchema: {
      app_id: external_exports.string().min(1),
      version_id: external_exports.string().min(1),
      canvas_background_color: external_exports.string().max(200).optional(),
      canvas_max_width: external_exports.object({
        value: external_exports.number().positive().max(1e5),
        unit: external_exports.enum(["%", "px"])
      }).optional(),
      app_mode: external_exports.enum(["auto", "light", "dark"]).optional(),
      theme_id: external_exports.string().uuid().optional(),
      hide_header: external_exports.boolean().optional().describe("Hide or show the app header/banner. This is separate from the generated page-navigation menu."),
      hide_logo: external_exports.boolean().optional(),
      header_title: external_exports.string().trim().min(1).max(32).optional(),
      navigation_hidden: external_exports.boolean().optional().describe("Hide or show the entire generated page-navigation menu, whether it is positioned on the side or top. To hide only one non-Home page from the menu, use update_pages.hidden."),
      navigation_position: external_exports.enum(["side", "top"]).optional(),
      navigation_style: external_exports.enum(["texticon", "text", "icon"]).optional(),
      navigation_collapsible: external_exports.boolean().optional()
    },
    async handler(args) {
      try {
        const changed = SETTING_KEYS.filter((key) => args[key] !== void 0);
        if (!changed.length)
          throw new Error("update_app_settings requires at least one setting field.");
        if (args.canvas_max_width?.unit === "%" && args.canvas_max_width.value > 100) {
          throw new Error('canvas_max_width.value cannot exceed 100 when unit is "%".');
        }
        const current = await client.getAppSettings(args.app_id, args.version_id);
        const currentPage = pageSettingProperties(current);
        const finalPosition = args.navigation_position ?? currentPage.position;
        const finalStyle = args.navigation_style ?? currentPage.style;
        if (finalPosition === "top" && finalStyle === "icon") {
          throw new Error('navigation_style "icon" is not supported when navigation_position is "top"; use "text" or "texticon".');
        }
        let theme;
        if (args.theme_id) {
          const themes = await client.listAppThemes();
          const selected = themes.find((candidate) => candidate.id === args.theme_id);
          if (!selected)
            throw new Error(`Theme "${args.theme_id}" is not available in the active workspace.`);
          if (selected.isDisabled)
            throw new Error(`Theme "${selected.name}" is disabled and cannot be selected.`);
          theme = selected;
        }
        const globalSettings = {
          ...args.canvas_background_color !== void 0 ? { canvasBackgroundColor: args.canvas_background_color } : {},
          ...args.canvas_max_width !== void 0 ? { canvasMaxWidth: args.canvas_max_width.value, canvasMaxWidthType: args.canvas_max_width.unit } : {},
          ...args.app_mode !== void 0 ? { appMode: args.app_mode } : {},
          ...theme ? { theme } : {}
        };
        const properties = {
          ...args.hide_header !== void 0 ? { hideHeader: args.hide_header } : {},
          ...args.hide_logo !== void 0 ? { hideLogo: args.hide_logo } : {},
          ...args.header_title !== void 0 ? { name: args.header_title } : {},
          ...args.navigation_hidden !== void 0 ? { disableMenu: { value: `{{${args.navigation_hidden}}}`, fxActive: false } } : {},
          ...args.navigation_position !== void 0 ? { position: args.navigation_position } : {},
          ...args.navigation_style !== void 0 ? { style: args.navigation_style } : {},
          ...args.navigation_collapsible !== void 0 ? { collapsable: args.navigation_collapsible } : {}
        };
        await client.updateAppSettings({
          appId: args.app_id,
          versionId: args.version_id,
          ...Object.keys(globalSettings).length ? { globalSettings } : {},
          ...Object.keys(properties).length ? { pageSettings: { properties } } : {}
        });
        const persisted = await client.getAppSettings(args.app_id, args.version_id);
        const mismatches = persistenceMismatches(args, persisted);
        if (mismatches.length) {
          throw new Error(`update_app_settings partially failed readback: ${mismatches.join("; ")}. Other requested fields may already have persisted; inspect get_app_settings before retrying.`);
        }
        return ok({
          updated_fields: changed.length,
          settings: projectAppSettings(persisted),
          warnings: []
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function listDatasourcesTool(client) {
  return {
    name: "list_datasources",
    title: "List Datasources",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "List AI-eligible workspace-connected datasources. The shared Sample data source is excluded and must never be used by AI. Includes the built-in ToolJet-DB datasource (kind 'tooljetdb') to use as the datasource_id for add_query. These sources appear automatically in both existing and newly created apps; there is no per-app attach/link step. If an expected source is absent, check workspace, permissions, connection, and environment configuration. Each returned source includes settings_url for user-assisted connection repair; never enter credentials or save changes for the user. Returns {datasources, connectable}: `datasources` are the connected ones (use their id for add_queries), `connectable` names every source ToolJet CAN connect. A source the user named that is in `connectable` but not in `datasources` needs connecting; one in neither has no ToolJet connector and has to go through a REST API datasource pointed at its HTTP API. Pass the actual app version_id: for a new app, create_app must return it before this call.",
    inputSchema: {
      version_id: external_exports.string().trim().min(1, "version_id is required: call create_app first and use its version_id, or use the target app's.")
    },
    async handler(args) {
      try {
        if (typeof args.version_id !== "string" || !args.version_id.trim()) {
          throw new Error("version_id is required. For a new app, call create_app first and use its returned version_id.");
        }
        const datasources = await client.listDatasources(args.version_id);
        return ok({ datasources, connectable: connectableDatasourceNames() });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var DEFAULT_LIMIT = 100;
var MAX_LIMIT = 500;
function listTablesTool(client) {
  return {
    name: "list_tables",
    title: "List ToolJet DB Tables",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "List the ToolJet-DB tables in the workspace as { tables: [{ id, table_name }], total, shown }. A ToolJet-DB (tooljetdb) query's options require the table's `id` as `table_id` (NOT the table name) \u2014 call this to resolve a table name to its id before add_query. Pass `search` (a case-insensitive substring, usually the app's table prefix) so a busy workspace does not return hundreds of unrelated tables; at most `limit` rows come back (default 100).",
    inputSchema: {
      search: external_exports.string().optional(),
      limit: external_exports.number().int().min(1).max(MAX_LIMIT).optional()
    },
    async handler(args) {
      try {
        const all = await client.listTables();
        const needle = (args.search ?? "").trim().toLowerCase();
        const matched = needle ? all.filter((t) => String(t.table_name ?? "").toLowerCase().includes(needle)) : all;
        const limit = args.limit ?? DEFAULT_LIMIT;
        const tables = matched.slice(0, limit);
        const result = { tables, total: matched.length, shown: tables.length };
        if (matched.length > tables.length) {
          result.hint = `${matched.length - tables.length} more tables match; pass search with the app's table prefix or a larger limit.`;
        }
        if (!needle && all.length > limit) {
          result.hint = `${all.length} tables in the workspace, ${tables.length} shown; pass search (the app's table prefix) to find yours.`;
        }
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var columnSchema = external_exports.object({
  name: external_exports.string(),
  type: dbColumnTypeSchema,
  primaryKey: external_exports.boolean().optional(),
  notNull: external_exports.boolean().optional(),
  unique: external_exports.boolean().optional(),
  defaultValue: external_exports.any().optional(),
  configurations: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
var foreignKeyAction = external_exports.enum(["RESTRICT", "NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT"]);
var foreignKeySchema = external_exports.object({
  columns: external_exports.array(external_exports.string()).min(1),
  referencedTable: external_exports.string(),
  referencedColumns: external_exports.array(external_exports.string()).min(1),
  onDelete: foreignKeyAction.optional(),
  onUpdate: foreignKeyAction.optional()
});
function createTableTool(client) {
  return {
    name: "create_table",
    title: "Create Table",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Create a ToolJet-DB table. Give table_name and columns (name, type, optional primaryKey/notNull/unique/defaultValue/configurations). Optional foreign_keys supports single or composite relationships with columns, referencedTable, referencedColumns, onDelete, and onUpdate. Types accept tjdb values or friendly aliases: string, integer, number, bigint, boolean, timestamp, json, serial. Known ToolJet DB reserved column names are rejected locally with a rename suggestion before any API request. If no column is marked primaryKey, a serial `id` primary key is added automatically. Returns { table_id, table_name }. For a NEW app, confirm the data model with the user before creating tables.",
    inputSchema: {
      table_name: external_exports.string(),
      columns: external_exports.array(columnSchema).min(1),
      foreign_keys: external_exports.array(foreignKeySchema).optional()
    },
    async handler(args) {
      try {
        const errors = validateTableBatch([{ tableName: args.table_name, columns: args.columns, foreignKeys: args.foreign_keys }]);
        if (errors.length)
          return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
        return ok(await client.createTable({ tableName: args.table_name, columns: args.columns, foreignKeys: args.foreign_keys }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var columnSchema2 = external_exports.object({
  name: external_exports.string(),
  type: dbColumnTypeSchema,
  primaryKey: external_exports.boolean().optional(),
  notNull: external_exports.boolean().optional(),
  unique: external_exports.boolean().optional(),
  defaultValue: external_exports.any().optional(),
  configurations: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
var foreignKeyAction2 = external_exports.enum(["RESTRICT", "NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT"]);
var foreignKeySchema2 = external_exports.object({
  columns: external_exports.array(external_exports.string()).min(1),
  referencedTable: external_exports.string(),
  referencedColumns: external_exports.array(external_exports.string()).min(1),
  onDelete: foreignKeyAction2.optional(),
  onUpdate: foreignKeyAction2.optional()
});
var tableSchema = external_exports.object({
  table_name: external_exports.string(),
  columns: external_exports.array(columnSchema2).min(1),
  foreign_keys: external_exports.array(foreignKeySchema2).optional()
});
function createTablesTool(client) {
  return {
    name: "create_tables",
    title: "Create Tables",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Create multiple ToolJet-DB tables in one call. The complete batch is preflighted before writes for duplicate/reserved names, foreign-key column mistakes, and circular dependencies. Tables are then created in dependency order, with independent tables created in batches of at most four; a failed batch stops further creation. Returns {tables}. ToolJet has no atomic multi-table endpoint: if an upstream request fails, the error names any tables already created; MCP never deletes them automatically.",
    inputSchema: { tables: external_exports.array(tableSchema).min(1).max(50) },
    async handler(args) {
      try {
        const tables = args.tables.map((table) => ({
          tableName: table.table_name,
          columns: table.columns,
          foreignKeys: table.foreign_keys
        }));
        const errors = validateTableBatch(tables);
        if (errors.length)
          return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
        const warnings = [];
        const taken = new Set((await client.listTables()).map((table) => table.table_name.toLowerCase()));
        for (const table of tables) {
          if (!taken.has(table.tableName.toLowerCase())) {
            taken.add(table.tableName.toLowerCase());
            continue;
          }
          const oldName = table.tableName;
          let candidate = oldName;
          for (let n = 2; taken.has(candidate.toLowerCase()); n++)
            candidate = `${oldName.slice(0, 31 - `_${n}`.length)}_${n}`;
          table.tableName = candidate;
          taken.add(candidate.toLowerCase());
          for (const other of tables)
            for (const fk of other.foreignKeys ?? [])
              if (fk.referencedTable === oldName)
                fk.referencedTable = candidate;
          warnings.push(`Table "${oldName}" already exists in this workspace; created "${candidate}" instead (foreign keys updated). Use the returned name.`);
        }
        return ok({ tables: await client.createTables({ tables }), ...warnings.length ? { warnings } : {} });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var columnSchema3 = external_exports.object({
  name: external_exports.string(),
  type: dbColumnTypeSchema,
  primaryKey: external_exports.boolean().optional(),
  notNull: external_exports.boolean().optional(),
  unique: external_exports.boolean().optional(),
  defaultValue: external_exports.any().optional(),
  configurations: external_exports.record(external_exports.string(), external_exports.any()).optional()
});
var foreignKeyAction3 = external_exports.enum(["RESTRICT", "NO ACTION", "CASCADE", "SET NULL", "SET DEFAULT"]);
var foreignKeySchema3 = external_exports.object({
  columns: external_exports.array(external_exports.string()).min(1),
  referencedTable: external_exports.string(),
  referencedColumns: external_exports.array(external_exports.string()).min(1),
  onDelete: foreignKeyAction3.optional(),
  onUpdate: foreignKeyAction3.optional()
});
function addTableColumnTool(client) {
  return {
    name: "add_table_column",
    title: "Add Table Column",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Add one column to an existing ToolJet DB table without recreating it. Supports the same type aliases, constraints, default/configuration metadata, and optional foreign-key shape as create_table. Read the current schema with get_table_schema first. Existing rows must be compatible with non-null/default constraints.",
    inputSchema: {
      table_name: external_exports.string(),
      column: columnSchema3,
      foreign_keys: external_exports.array(foreignKeySchema3).optional()
    },
    async handler(args) {
      try {
        return ok(await client.addTableColumn({
          tableName: args.table_name,
          column: args.column,
          foreignKeys: args.foreign_keys
        }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function dropTableColumnTool(client) {
  return {
    name: "drop_table_column",
    title: "Drop Table Column",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Permanently drop a ToolJet DB column and its stored values. This is destructive. Inspect the schema and query/component bindings first, obtain explicit user approval, then pass confirm:true in that same approved operation.",
    inputSchema: {
      table_name: external_exports.string(),
      column_name: external_exports.string(),
      confirm: external_exports.literal(true)
    },
    async handler(args) {
      try {
        return ok(await client.dropTableColumn({ tableName: args.table_name, columnName: args.column_name }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function dropTableTool(client) {
  return {
    name: "drop_table",
    title: "Drop Table",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Permanently drop a ToolJet DB table and all its rows. This is destructive. Inspect dependent queries/components, obtain explicit user approval for the named table, then pass confirm:true in that same approved operation.",
    inputSchema: {
      table_name: external_exports.string(),
      confirm: external_exports.literal(true)
    },
    async handler(args) {
      try {
        return ok(await client.dropTable({ tableName: args.table_name }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function getTableSchemaTool(client) {
  return {
    name: "get_table_schema",
    title: "Get Table Schema",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Get a ToolJet-DB table's columns, including primary/not-null/unique constraints, defaults, configurations, and foreign-key relationships. Use before building queries, columns, forms, or filters on an existing table, or to verify a table you just created.",
    inputSchema: { table_name: external_exports.string() },
    async handler(args) {
      try {
        return ok(await client.getTableSchema(args.table_name));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function insertRowsTool(client) {
  return {
    name: "insert_rows",
    title: "Insert Rows",
    // Insert-only: a conflict fails loudly rather than overwriting a row.
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Seed rows into a ToolJet-DB table (so a generated app is not empty). rows is an array of objects keyed by column name. Omit generated serial primary keys so ToolJet uses the table sequence. This is insert-only: explicit duplicate keys fail instead of updating existing rows. Returns { processed_rows }. Optional: only seed when the user wants sample data.",
    inputSchema: {
      table_name: external_exports.string(),
      rows: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).min(1)
    },
    async handler(args) {
      try {
        return ok(await client.insertRows({ tableName: args.table_name, rows: args.rows }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var seedSchema = external_exports.object({
  table_name: external_exports.string(),
  rows: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).min(1).max(40)
});
function insertRowsBatchTool(client) {
  return {
    name: "insert_rows_batch",
    title: "Insert Rows (Batch)",
    // Insert-only: a conflict fails loudly rather than overwriting a row.
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Seed multiple ToolJet-DB tables in one call. Entries are processed in the listed order so parent rows can be inserted before foreign-key children. Writes are insert-only: omit generated serial keys; explicit duplicate keys fail rather than updating rows. Returns {tables:[{table_name,processed_rows}],processed_rows}. A partial failure reports completed table/row counts; do not retry completed seeds. Keep initial demo data representative and small; each table payload is capped at 40 rows so large fixtures must be split across compact calls.",
    inputSchema: { tables: external_exports.array(seedSchema).min(1).max(50) },
    async handler(args) {
      try {
        const results = await client.insertRowsBatch({
          tables: args.tables.map((table) => ({ tableName: table.table_name, rows: table.rows }))
        });
        return ok({
          tables: results,
          processed_rows: results.reduce((total, result) => total + result.processed_rows, 0)
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
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
function nearbyTypes(requestedType) {
  const words = requestedType.split(/(?=[A-Z])|[\s_-]+/).map((word) => word.toLowerCase()).filter((word) => word.length >= 4);
  return getCatalog().map((entry) => entry.type).filter((type) => words.some((word) => type.toLowerCase().includes(word))).slice(0, 6);
}
function selectEntries(entries, keys, detail) {
  const selected = keys?.length ? entries.filter((entry) => keys.includes(entry.key)) : entries;
  if (detail === "full" || keys?.length)
    return selected;
  return selected.map(({ key, valueType, allowedValues, requires, mutuallyExclusiveWith }) => ({
    key,
    ...valueType !== void 0 ? { valueType } : {},
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
            return ok({ error: `Unknown component type "${singleType}". Call with no argument to list valid types.`, ...near.length ? { did_you_mean: near } : {} });
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
        return ok({ components, unknown_types: unknownTypes });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var SECTIONS = ["summary", "request", "response", "raw", "introspection"];
var requestSchema = external_exports.object({
  kind: external_exports.string().optional(),
  datasource_id: external_exports.string().optional(),
  version_id: external_exports.string().optional(),
  operation: external_exports.string().optional(),
  sections: external_exports.array(external_exports.enum(SECTIONS)).min(1).optional()
});
async function resolveKind(client, request, fallbackVersionId, datasourceCache = /* @__PURE__ */ new Map()) {
  const versionId = request.version_id ?? fallbackVersionId;
  const datasourcesFor = async (vid) => {
    let pending = datasourceCache.get(vid);
    if (!pending) {
      pending = client.listDatasources(vid);
      datasourceCache.set(vid, pending);
    }
    return pending;
  };
  if (request.kind && request.datasource_id) {
    request = { ...request, kind: void 0 };
  }
  if (!request.kind && !request.datasource_id) {
    let hint = "";
    if (versionId) {
      try {
        const list = await datasourcesFor(versionId);
        if (list.length) {
          hint = " Available on this version: " + list.map((item) => `${item.kind} (datasource_id "${item.id}"${item.name ? `, "${item.name}"` : ""})`).join("; ") + ".";
        }
      } catch {
      }
    }
    throw new Error(`Each schema request needs a \`kind\` or a \`datasource_id\`.${hint}`);
  }
  if (request.kind)
    return request.kind;
  if (!versionId)
    throw new Error("Resolving `datasource_id` requires `version_id`.");
  const datasource = (await datasourcesFor(versionId)).find((item) => item.id === request.datasource_id);
  if (!datasource)
    throw new Error(`Datasource "${request.datasource_id}" is not available on version "${versionId}".`);
  return datasource.kind;
}
function getDatasourceQuerySchemaTool(client) {
  return {
    name: "get_datasource_query_schema",
    title: "Get Datasource Query Schema",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Get compact, operation-specific request contracts plus response shape/status when known. Unknown and runtime-dependent responses are labelled explicitly so callers know when a safe run or remote schema is still required. Call with no selector for the datasource palette; select by `kind`, or by `datasource_id` + `version_id` to resolve the kind automatically. Pass `operation` to avoid loading unrelated branches. `sections` defaults to summary/request/response for one operation; request raw plugin UI metadata only for diagnostics. `requests` batches up to 10 contracts; any top-level fields (kind/datasource_id/version_id/operation/sections) act as defaults for every entry, so mixing top-level and `requests` is fine.",
    inputSchema: {
      kind: external_exports.string().optional(),
      datasource_id: external_exports.string().optional(),
      version_id: external_exports.string().optional(),
      operation: external_exports.string().optional(),
      sections: external_exports.array(external_exports.enum(SECTIONS)).min(1).optional(),
      requests: external_exports.array(requestSchema).min(1).max(10).optional()
    },
    async handler(args) {
      try {
        const hasTopLevelSelector = !!args?.kind || !!args?.datasource_id;
        const hasBatch = !!args?.requests?.length;
        if (!hasBatch && !hasTopLevelSelector) {
          if (args?.operation || args?.sections) {
            return fail(new Error("operation/sections require kind, datasource_id, or requests."));
          }
          return ok(getDatasourceCatalog());
        }
        const base = hasBatch ? args.requests : [args];
        const requests = base.map((request) => {
          const hasOwnSelector = !!request.kind || !!request.datasource_id;
          return {
            kind: request.kind ?? (hasOwnSelector ? void 0 : args.kind),
            datasource_id: request.datasource_id ?? (hasOwnSelector ? void 0 : args.datasource_id),
            version_id: request.version_id ?? args.version_id,
            operation: request.operation ?? args.operation,
            sections: request.sections ?? args.sections
          };
        });
        const datasourceCache = /* @__PURE__ */ new Map();
        const schemas = [];
        for (const request of requests) {
          const kind = await resolveKind(client, request, args.version_id, datasourceCache);
          const selected = selectDatasourceQuerySchema(kind, {
            operation: request.operation,
            sections: request.sections
          });
          schemas.push(selected ?? { error: `Unknown datasource kind "${kind}". Call with no selector to list known schemas.` });
        }
        return ok(hasBatch ? { schemas } : schemas[0]);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function unsupportedMessage(kind) {
  return `Datasource kind "${kind}" does not implement a connection test. This is not a failure and carries no information about the connection: verify it with a bounded read instead.`;
}
function inconclusive(header, detail) {
  return ok({
    ...header,
    supported: true,
    status: "inconclusive",
    message: `The connection test did not prove this datasource is broken${detail ? ` (${detail.trim()})` : ""}.`,
    verification: { action: "ask_then_run_bounded_read", requires_user_approval: true }
  });
}
function testDatasourceConnectionTool(client) {
  return {
    name: "test_datasource_connection",
    title: "Test Datasource Connection",
    // Probes reachability; changes nothing on either side.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Run ToolJet's own connection test for one ALREADY-CONNECTED datasource \u2014 the same check the datasource settings page performs. Uses the datasource's stored credentials; you never supply, see, or need them. Use it to distinguish a broken connection from a wrong query when a run fails, or to confirm a source before building on it. Returns supported:false for datasource kinds whose plugin does not implement a connection test (REST API, GraphQL, and most OAuth/HTTP integrations) \u2014 that is not a fault and says nothing about the connection. On a real failure, hand the returned settings_url to the user for repair; never enter credentials or save settings for them.",
    inputSchema: {
      version_id: external_exports.string().min(1),
      datasource_id: external_exports.string().min(1)
    },
    async handler(args) {
      let header;
      try {
        const datasource = (await client.listDatasources(args.version_id)).find((candidate) => candidate.id === args.datasource_id);
        if (!datasource) {
          return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
        }
        header = {
          datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind },
          settings_url: datasource.settings_url
        };
        const supportsTestConnection = getDatasourceQuerySchema(datasource.kind)?.supportsTestConnection;
        if (supportsTestConnection === false) {
          return ok({
            ...header,
            supported: false,
            status: "unsupported",
            message: unsupportedMessage(datasource.kind)
          });
        }
        const details = await client.getDatasourceConnectionDetails(args.datasource_id);
        const result = await client.testDatasourceConnection({
          dataSourceId: datasource.id,
          kind: details.kind || datasource.kind,
          ...details.pluginId ? { pluginId: details.pluginId } : {},
          options: details.options
        });
        const message = typeof result.message === "string" ? result.message : void 0;
        if (result.category === "unsupported") {
          return ok({
            ...header,
            supported: false,
            status: "unsupported",
            message: unsupportedMessage(datasource.kind)
          });
        }
        if (result.status === "ok") {
          return ok({ ...header, supported: true, status: "ok" });
        }
        if (supportsTestConnection !== true)
          return inconclusive(header, message);
        return ok({
          ...header,
          supported: true,
          status: "failed",
          ...message ? { message: message.trim() } : {},
          recovery: {
            action: "open_datasource_settings",
            url: datasource.settings_url,
            instruction: "Ask the user to repair this connection in ToolJet. Never enter credentials, authorize OAuth, or save settings on their behalf."
          }
        });
      } catch (err) {
        if (!header)
          return fail(err);
        if (err instanceof ToolJetHttpError && err.method === "testDatasourceConnection" && err.status === 403) {
          return ok({
            ...header,
            supported: true,
            status: "not_permitted",
            message: "This ToolJet user is not permitted to test datasource connections (the ability is granted to admins, datasource create/delete holders, and users with editable/viewable datasource access). The connection itself was not tested."
          });
        }
        if (err instanceof ToolJetHttpError && err.method === "testDatasourceConnection" && err.status === 404) {
          return ok({
            ...header,
            supported: false,
            status: "unsupported",
            message: "ToolJet has no datasource-level test endpoint. This says nothing about connection health."
          });
        }
        if (err instanceof ToolJetHttpError && err.method === "testDatasourceConnection" && err.status === 501) {
          return ok({
            ...header,
            supported: false,
            status: "unsupported",
            message: "This ToolJet datasource plugin does not implement a connection test."
          });
        }
        return fail(err);
      }
    }
  };
}
var DIALECTS = {
  postgresql: { quote: "double", limit: "limit", metadata: "postgresql" },
  mysql: { quote: "backtick", limit: "limit", metadata: "mysql" },
  mssql: { quote: "bracket", limit: "top", metadata: "mssql" },
  snowflake: { quote: "double", limit: "limit" },
  bigquery: { quote: "backtick", limit: "limit" },
  oracledb: { quote: "double", limit: "fetch" }
};
function assertIdentifier(identifier, label) {
  if (!identifier.trim() || identifier.length > 256 || /[\0-\x1f\x7f;`"\[\]\\]/.test(identifier)) {
    throw new Error(`${label} contains unsupported or unsafe identifier characters.`);
  }
}
function quote(kind, identifier) {
  assertIdentifier(identifier, "SQL identifier");
  const style = DIALECTS[kind].quote;
  if (style === "backtick")
    return `\`${identifier}\``;
  if (style === "bracket")
    return `[${identifier}]`;
  return `"${identifier}"`;
}
function literal(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
function source(kind, schema, table) {
  return schema ? `${quote(kind, schema)}.${quote(kind, table)}` : quote(kind, table);
}
function boundedSelect(kind, projection, from, limit, distinct = false) {
  const prefix = `SELECT ${distinct ? "DISTINCT " : ""}`;
  if (DIALECTS[kind].limit === "top")
    return `${prefix}TOP (${limit}) ${projection} FROM ${from}`;
  if (DIALECTS[kind].limit === "fetch")
    return `${prefix}${projection} FROM ${from} FETCH FIRST ${limit} ROWS ONLY`;
  return `${prefix}${projection} FROM ${from} LIMIT ${limit}`;
}
function options(kind, query) {
  return {
    mode: "sql",
    query,
    ...!["snowflake"].includes(kind) ? { query_params: [] } : {},
    runOnPageLoad: false
  };
}
function metadataSql(kind, purpose, schema, table) {
  const metadata = "metadata" in DIALECTS[kind] ? DIALECTS[kind].metadata : void 0;
  if (!metadata)
    return void 0;
  if (purpose !== "views" && !table)
    throw new Error(`${purpose} discovery requires table.`);
  if (metadata !== "mysql" && !schema)
    throw new Error(`${purpose} discovery for ${kind} requires schema.`);
  const schemaFilter = metadata === "mysql" && !schema ? "DATABASE()" : literal(schema);
  const tableFilter = table ? literal(table) : void 0;
  if (metadata === "postgresql") {
    if (purpose === "primary_keys")
      return `SELECT kcu.column_name, kcu.ordinal_position, tc.constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_catalog = kcu.constraint_catalog AND tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = ${schemaFilter} AND tc.table_name = ${tableFilter} ORDER BY kcu.ordinal_position`;
    if (purpose === "foreign_keys")
      return `SELECT kcu.constraint_name, kcu.column_name, ccu.table_schema AS referenced_schema, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_catalog = kcu.constraint_catalog AND tc.constraint_schema = kcu.constraint_schema AND tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_catalog = tc.constraint_catalog AND ccu.constraint_schema = tc.constraint_schema AND ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = ${schemaFilter} AND tc.table_name = ${tableFilter} ORDER BY kcu.constraint_name, kcu.ordinal_position`;
    if (purpose === "indexes")
      return `SELECT indexname AS index_name, indexdef AS definition FROM pg_indexes WHERE schemaname = ${schemaFilter} AND tablename = ${tableFilter} ORDER BY indexname`;
    return `SELECT table_schema, table_name AS view_name FROM information_schema.views WHERE table_schema = ${schemaFilter} ORDER BY table_name`;
  }
  if (metadata === "mysql") {
    if (purpose === "primary_keys")
      return `SELECT column_name, ordinal_position, constraint_name FROM information_schema.key_column_usage WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} AND constraint_name = 'PRIMARY' ORDER BY ordinal_position`;
    if (purpose === "foreign_keys")
      return `SELECT constraint_name, column_name, referenced_table_schema AS referenced_schema, referenced_table_name AS referenced_table, referenced_column_name AS referenced_column FROM information_schema.key_column_usage WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} AND referenced_table_name IS NOT NULL ORDER BY constraint_name, ordinal_position`;
    if (purpose === "indexes")
      return `SELECT index_name, column_name, non_unique, seq_in_index FROM information_schema.statistics WHERE table_schema = ${schemaFilter} AND table_name = ${tableFilter} ORDER BY index_name, seq_in_index`;
    return `SELECT table_schema, table_name AS view_name FROM information_schema.views WHERE table_schema = ${schemaFilter} ORDER BY table_name`;
  }
  if (purpose === "primary_keys")
    return `SELECT kcu.COLUMN_NAME AS column_name, kcu.ORDINAL_POSITION AS ordinal_position, tc.CONSTRAINT_NAME AS constraint_name FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA AND tc.TABLE_NAME = kcu.TABLE_NAME WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' AND tc.TABLE_SCHEMA = ${schemaFilter} AND tc.TABLE_NAME = ${tableFilter} ORDER BY kcu.ORDINAL_POSITION`;
  if (purpose === "foreign_keys")
    return `SELECT fk.name AS constraint_name, pc.name AS column_name, rs.name AS referenced_schema, rt.name AS referenced_table, rc.name AS referenced_column FROM sys.foreign_key_columns fkc JOIN sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id JOIN sys.tables pt ON pt.object_id = fkc.parent_object_id JOIN sys.schemas ps ON ps.schema_id = pt.schema_id JOIN sys.columns pc ON pc.object_id = pt.object_id AND pc.column_id = fkc.parent_column_id JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id JOIN sys.schemas rs ON rs.schema_id = rt.schema_id JOIN sys.columns rc ON rc.object_id = rt.object_id AND rc.column_id = fkc.referenced_column_id WHERE ps.name = ${schemaFilter} AND pt.name = ${tableFilter} ORDER BY fk.name, fkc.constraint_column_id`;
  if (purpose === "indexes")
    return `SELECT i.name AS index_name, c.name AS column_name, i.is_unique, ic.key_ordinal FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id WHERE s.name = ${schemaFilter} AND t.name = ${tableFilter} AND i.is_hypothetical = 0 ORDER BY i.name, ic.key_ordinal`;
  return `SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS view_name FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ${schemaFilter} ORDER BY TABLE_NAME`;
}
function boundMetadata(kind, sql) {
  if (DIALECTS[kind].limit === "top")
    return sql.replace(/^SELECT\s+/i, "SELECT TOP (100) ");
  if (DIALECTS[kind].limit === "fetch")
    return `${sql} FETCH FIRST 100 ROWS ONLY`;
  return `${sql} LIMIT 100`;
}
function safeName(value) {
  return value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "table";
}
function prepareSqlDiscoveryQueries(args) {
  if (!(args.kind in DIALECTS))
    throw new Error(`Datasource kind "${args.kind}" is not supported by SQL discovery.`);
  const kind = args.kind;
  if (args.schema)
    assertIdentifier(args.schema, "schema");
  if (args.table)
    assertIdentifier(args.table, "table");
  for (const column of [...args.columns ?? [], ...args.distinctColumns ?? []])
    assertIdentifier(column, "column");
  const tablePurposes = args.purposes.filter((purpose) => purpose !== "views");
  if (tablePurposes.length && !args.table)
    throw new Error("Table-scoped SQL discovery requires table.");
  if (args.purposes.includes("preview") && !args.columns?.length) {
    throw new Error("Preview discovery requires one or more explicit columns; SELECT * is never generated.");
  }
  if (args.purposes.includes("distinct") && !args.distinctColumns?.length) {
    throw new Error("Distinct discovery requires one or more explicit distinct_columns.");
  }
  const from = args.table ? source(kind, args.schema, args.table) : void 0;
  const prefix = safeName(args.namePrefix ?? args.table ?? args.schema ?? "schema");
  const queries = [];
  const unsupported = [];
  for (const purpose of [...new Set(args.purposes)]) {
    let sql;
    if (purpose === "count")
      sql = `SELECT COUNT(*) AS row_count FROM ${from}`;
    else if (purpose === "preview") {
      sql = boundedSelect(kind, args.columns.map((column) => quote(kind, column)).join(", "), from, args.limit);
    } else if (purpose === "distinct") {
      sql = boundedSelect(kind, args.distinctColumns.map((column) => quote(kind, column)).join(", "), from, args.limit, true);
    } else {
      sql = metadataSql(kind, purpose, args.schema, args.table);
      if (!sql) {
        unsupported.push({
          purpose,
          reason: `${args.kind} does not expose a verified ${purpose} selector and MCP has no curated read-only SQL contract for it yet.`
        });
        continue;
      }
      sql = boundMetadata(kind, sql);
    }
    queries.push({
      purpose,
      name: `${prefix}_${purpose}`,
      datasource_id: args.datasourceId,
      options: options(kind, sql)
    });
  }
  return { queries, unsupported };
}
var purposes = ["count", "preview", "distinct", "primary_keys", "foreign_keys", "indexes", "views"];
function prepareSqlDiscoveryQueriesTool(client) {
  return {
    name: "prepare_sql_discovery_queries",
    title: "Prepare SQL Discovery Queries",
    // Returns query specs; deliberately neither creates nor runs them.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Prepare\u2014but do not create or run\u2014read-only SQL query specs for a connected SQL datasource. Produces add_queries-compatible count, explicit-column bounded preview/distinct, and verified metadata queries for primary keys, foreign keys, indexes, and views where the dialect is curated. It never emits SELECT *; preview/distinct limits are hard-capped at 100. Add the returned specs in one add_queries call, then use run_query under its count/large/billable-read safeguards.",
    inputSchema: {
      version_id: external_exports.string().min(1),
      datasource_id: external_exports.string().min(1),
      schema: external_exports.string().min(1).max(256).optional(),
      table: external_exports.string().min(1).max(256).optional(),
      columns: external_exports.array(external_exports.string().min(1).max(256)).min(1).max(50).optional(),
      distinct_columns: external_exports.array(external_exports.string().min(1).max(256)).min(1).max(10).optional(),
      purposes: external_exports.array(external_exports.enum(purposes)).min(1).max(purposes.length).optional(),
      preview_limit: external_exports.number().int().positive().max(100).optional(),
      name_prefix: external_exports.string().min(1).max(40).optional()
    },
    async handler(args) {
      try {
        const datasource = (await client.listDatasources(args.version_id)).find((candidate) => candidate.id === args.datasource_id);
        if (!datasource)
          throw new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`);
        if (!getDatasourceQuerySchema(datasource.kind)?.contracts.sql) {
          throw new Error(`Datasource kind "${datasource.kind}" does not publish a SQL-mode query contract.`);
        }
        const prepared = prepareSqlDiscoveryQueries({
          kind: datasource.kind,
          datasourceId: datasource.id,
          schema: args.schema,
          table: args.table,
          columns: args.columns,
          distinctColumns: args.distinct_columns,
          purposes: args.purposes ?? ["count", "preview"],
          limit: args.preview_limit ?? 25,
          namePrefix: args.name_prefix
        });
        return ok({
          datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind },
          ...prepared,
          safety: {
            created_or_executed: false,
            select_star_generated: false,
            next_step: "Pass queries to add_queries in one batch. Run only selected saved reads with run_query.",
            server_side_pagination_threshold: 1e3,
            billable_read_confirmation_required: ["bigquery", "snowflake", "redshift"].includes(datasource.kind)
          }
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var humanize = (name) => name.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
function configuredChoices(column) {
  for (const key of ["allowedValues", "enumValues", "values"]) {
    const value = column.configurations?.[key];
    if (Array.isArray(value) && value.length > 0)
      return value;
  }
  return void 0;
}
function formType(column) {
  const type = column.type.toLowerCase();
  const name = column.name.toLowerCase();
  if (configuredChoices(column))
    return "dropdown";
  if (type.includes("bool"))
    return "checkbox";
  if (type.includes("timestamp") || type.includes("date"))
    return "datepicker";
  if (type.includes("int") || type.includes("numeric") || type.includes("decimal") || type.includes("double")) {
    return "number";
  }
  if (name.includes("email"))
    return "emailinput";
  if (name.includes("password"))
    return "password";
  if (type.includes("json") || type === "text" || /(description|notes?|comments?|justification|details?|summary|message)/.test(name)) {
    return "textarea";
  }
  return "textinput";
}
function booleanDefault(value) {
  if (typeof value === "boolean")
    return value;
  if (typeof value !== "string")
    return void 0;
  const match = value.trim().match(/^['"]?(true|false)['"]?(?:::[a-z\s]+)?$/i);
  return match ? match[1].toLowerCase() === "true" : void 0;
}
function mergeField(base, override) {
  if (!override)
    return base;
  const merged = { ...base, ...override };
  for (const key of ["validation", "styles"]) {
    if (base[key] && override[key] && typeof base[key] === "object" && typeof override[key] === "object") {
      merged[key] = { ...base[key], ...override[key] };
    }
  }
  return merged;
}
function bindingValue(prefix, column) {
  const access = `${prefix}[${JSON.stringify(column.name)}]`;
  return column.type.toLowerCase().includes("json") ? `{{JSON.stringify(${access})}}` : `{{${access}}}`;
}
function generateFormSchema(columns, options2) {
  const exclude = new Set(options2.exclude ?? []);
  const omitted = [];
  const byName = new Map(columns.map((column) => [column.name, column]));
  const seen = /* @__PURE__ */ new Set();
  const ordered = options2.include ? options2.include.flatMap((name) => {
    if (seen.has(name))
      return [];
    seen.add(name);
    const column = byName.get(name);
    if (!column)
      omitted.push({ name, reason: "requested include field not found in table schema" });
    return column ? [column] : [];
  }) : columns;
  const selected = ordered.filter((column) => {
    if (exclude.has(column.name))
      return false;
    if (options2.mode === "create" && column.type.toLowerCase() === "serial") {
      omitted.push({ name: column.name, reason: "generated serial column omitted from create form" });
      return false;
    }
    return true;
  });
  const fields = Object.fromEntries(selected.map((column) => {
    const type = formType(column);
    let field = { type, label: humanize(column.name) };
    const choices = configuredChoices(column);
    if (choices)
      Object.assign(field, { values: choices, displayValues: choices.map(String) });
    if (type === "datepicker")
      Object.assign(field, { enableDate: true, enableTime: true });
    if (options2.mode === "edit" && column.isPrimaryKey)
      field.styles = { disabled: true };
    if (options2.initialValuesBinding) {
      field.value = bindingValue(options2.initialValuesBinding, column);
    } else if (options2.mode === "create" && column.defaultValue !== void 0) {
      if (column.type.toLowerCase().includes("json"))
        field.value = JSON.stringify(column.defaultValue);
      else if (type === "checkbox" && booleanDefault(column.defaultValue) !== void 0) {
        field.value = `{{${String(booleanDefault(column.defaultValue))}}}`;
      } else if (column.defaultValue === 0)
        field.value = "{{0}}";
      else
        field.value = column.defaultValue;
    } else if (options2.mode === "create" && type === "datepicker") {
      field.value = "{{null}}";
    }
    field = mergeField(field, options2.fieldOverrides?.[column.name]);
    const finalType = field.type;
    if (typeof finalType !== "string" || !FORM_SCHEMA_FIELD_TYPE_SET.has(finalType)) {
      throw new Error(`Form field "${column.name}" has unsupported type "${String(finalType)}".`);
    }
    if (finalType === "filepicker") {
      throw new Error(`Form field "${column.name}" cannot use type "filepicker": ToolJet crashes the entire Form. Use a standalone FilePicker component and read components.<picker>.file instead.`);
    }
    if (["dropdown", "multiselect"].includes(finalType) && "options" in field) {
      throw new Error(`Form field "${column.name}" uses "options", but Form dropdowns use "values" and "displayValues".`);
    }
    return [column.name, field];
  }));
  const standaloneFields = Object.entries(fields).filter(([, field]) => !SAFE_GENERATED_FORM_FIELD_TYPE_SET.has(String(field.type))).map(([name, field]) => `${name} (${String(field.type)})`);
  if (standaloneFields.length > 0) {
    throw new Error(`Generated ToolJet Form is not layout-safe for ${standaloneFields.join(", ")}. FormUtils does not pass label alignment through to generated fields; Dropdown/Multiselect labels do not align with inputs, and TextArea retains a literal "Label" and can render as a single-line control. Build the entire form from standalone components in one add_components call, set styles.alignment.value="top" on every labelled input, use a consistent two-column grid for compact fields, and make TextArea fields full-width. Generated Form is approved only for textinput, number, emailinput, password, datepicker, and checkbox fields.`);
  }
  const schema = {
    title: options2.title ?? `${options2.mode === "create" ? "Create" : "Edit"} ${humanize(options2.tableName)}`,
    properties: fields,
    submitButton: { value: options2.submitLabel ?? (options2.mode === "create" ? "Create" : "Save changes") }
  };
  const recommendedCanvasHeight = Math.max(300, selected.length * 70);
  const recommendedFormHeight = recommendedCanvasHeight + 130;
  return {
    properties: {
      generateFormFrom: { value: "jsonSchema" },
      newJsonSchema: { value: schema },
      validateOnSubmit: { value: "{{true}}" },
      // Reset only from the mutation query's onDataQuerySuccess event, so failed writes preserve input.
      resetOnSubmit: { value: "{{false}}" },
      showHeader: { value: "{{true}}" },
      showFooter: { value: "{{true}}" }
    },
    schema,
    field_metadata: selected.map((column) => ({
      name: column.name,
      database_type: column.type,
      required: column.isNotNull,
      unique: column.isUnique,
      primary_key: column.isPrimaryKey,
      default_value: column.defaultValue,
      foreign_keys: column.foreignKeys,
      generated_type: fields[column.name].type,
      overridden: !!options2.fieldOverrides?.[column.name]
    })),
    omitted_fields: omitted,
    layout_guidance: {
      field_count: selected.length,
      recommended_canvas_height_px: recommendedCanvasHeight,
      recommended_form_height_px: recommendedFormHeight,
      recommended_modal_height_px: recommendedFormHeight + 80,
      assumptions: "Stacked fields at roughly 70px per row, 60px Form header/footer, 10px border slack, and modal padding/error slack."
    },
    notes: [
      "Pass `properties` directly to add_component(s) for a Form.",
      "ToolJet generated-form schemas do not automatically enforce database NOT NULL/UNIQUE constraints; add supported client validation and keep database constraints authoritative.",
      "Use this generated Form only when every selected field maps to textinput, number, emailinput, password, datepicker, or checkbox.",
      "If any field needs Dropdown, Multiselect, TextArea, Radio, Toggle, StarRating, or FilePicker, build the entire form from standalone components with top-aligned labels.",
      "The include array controls output field order. Use field_overrides only for labels, placeholders, supported validators, and other safe-field tuning.",
      "Never place type:filepicker inside a generated Form; use a standalone FilePicker and read components.<picker>.file.",
      "When nesting this Form in ModalV2, use layout_guidance instead of guessing the Form/modal height; browser-check that the final field and submit button remain visible at maximum scroll."
    ]
  };
}
function generateFormSchemaTool(client) {
  return {
    name: "generate_form_schema",
    title: "Generate Form Schema",
    // Reads a table’s schema and returns a property block; places nothing.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Generate a ready-to-place ToolJet Form property block from an existing ToolJet DB table only when every selected field maps to textinput, number, emailinput, password, datepicker, or checkbox. Mixed schemas needing dropdown, multiselect, textarea, radio, toggle, starrating, or filepicker are rejected with the standalone-component workaround because FormUtils cannot render them with clean, controllable alignment.",
    inputSchema: {
      table_name: external_exports.string(),
      mode: external_exports.enum(["create", "edit"]).default("create"),
      title: external_exports.string().optional(),
      submit_label: external_exports.string().optional(),
      include: external_exports.array(external_exports.string()).optional(),
      exclude: external_exports.array(external_exports.string()).optional(),
      initial_values_binding: external_exports.string().optional(),
      field_overrides: external_exports.record(external_exports.string(), external_exports.record(external_exports.string(), external_exports.unknown())).optional()
    },
    async handler(args) {
      try {
        const columns = await client.getTableSchema(args.table_name);
        return ok(generateFormSchema(columns, {
          tableName: args.table_name,
          mode: args.mode ?? "create",
          title: args.title,
          submitLabel: args.submit_label,
          include: args.include,
          exclude: args.exclude,
          initialValuesBinding: args.initial_values_binding,
          fieldOverrides: args.field_overrides
        }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function generateEditContractTool() {
  return {
    name: "generate_edit_contract",
    title: "Generate Safe Edit Contract",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: "Generate opt-in raw-record snapshot, native field defaults/change events, and changed-field-only RunJS payload preparation for an edit workflow. Preserves untouched fields; explicitly nullable fields can be cleared. No API calls, writes, layout choices or inferred business rules. Supply existing query/component names and merge returned artifacts into a linted phase; wire the datasource mutation separately using the returned guarded ID/patch contract.",
    inputSchema: editContractSchema.shape,
    async handler(args) {
      try {
        return ok(generateEditContract(args));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function getAppTool(client) {
  return {
    name: "get_app",
    title: "Get App",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Fetch the FULL raw ToolJet app by id (pages, versions, every component with its complete widget schema). This is large (100KB+ for a real app) \u2014 for routine inspection prefer get_app_summary, which returns the same structure with actual values only. Use get_app only when you need raw fields the summary omits.",
    inputSchema: {
      app_id: external_exports.string()
    },
    async handler(args) {
      try {
        const result = await client.getApp(args.app_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var APP_FIELDS = ["app_id", "name", "version_id", "editor_frozen", "environment"];
var PAGE_FIELDS = ["id", "name", "handle", "icon", "hidden", "index", "is_page_group", "page_group_id"];
var COMPONENT_FIELDS = [
  "id",
  "name",
  "type",
  "layouts",
  "properties",
  "styles",
  "validation",
  "others",
  "parent"
];
var QUERY_FIELDS = ["id", "name", "kind", "data_source_id", "options"];
var EVENT_FIELDS = ["id", "name", "sourceId", "target", "event"];
var STRUCTURE_COMPONENT_FIELDS = ["id", "name", "type", "layouts.desktop", "parent"];
var STRUCTURE_QUERY_FIELDS = ["id", "name", "kind", "data_source_id"];
var STRUCTURE_EVENT_FIELDS = ["id", "name", "sourceId", "target"];
var UNSAFE_PATH_SEGMENTS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function validatePaths(paths, roots, label) {
  const allowedRoots = new Set(roots);
  for (const path of paths) {
    const segments = path.split(".");
    if (!path || segments.some((segment) => !segment || UNSAFE_PATH_SEGMENTS.has(segment))) {
      throw new Error(`${label} contains an invalid path: "${path}".`);
    }
    if (!allowedRoots.has(segments[0])) {
      throw new Error(`${label} path "${path}" must start with one of: ${roots.join(", ")}.`);
    }
  }
}
function readPath(source2, segments) {
  let cursor = source2;
  for (const segment of segments) {
    if (cursor === null || typeof cursor !== "object" || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      return { found: false };
    }
    cursor = cursor[segment];
  }
  return { found: true, value: cursor };
}
function writePath(target2, segments, value) {
  let cursor = target2;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const child = cursor[segment];
    if (child === null || typeof child !== "object" || Array.isArray(child)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments.at(-1)] = value;
}
function pickPaths(source2, paths) {
  const result = {};
  for (const path of paths) {
    const segments = path.split(".");
    const selected = readPath(source2, segments);
    if (selected.found)
      writePath(result, segments, selected.value);
  }
  return result;
}
function stripLayoutTimestamps(component) {
  const layouts = component.layouts;
  if (!layouts || typeof layouts !== "object")
    return;
  for (const rect2 of Object.values(layouts)) {
    if (rect2 && typeof rect2 === "object")
      delete rect2.updatedAt;
  }
}
function matches(value, accepted) {
  return !accepted?.length || typeof value === "string" && accepted.includes(value);
}
function selectAppSummary(summary, selection = {}) {
  const detail = selection.detail ?? "structure";
  const sections = new Set(selection.sections ?? ["pages", "queries", "events"]);
  const appFields = selection.appFields ?? [...APP_FIELDS];
  const pageFields = selection.pageFields ?? [...PAGE_FIELDS];
  const componentFields = selection.componentFields?.map((path) => path.replace(/^layout(?=\.|$)/, "layouts")) ?? (detail === "full" ? [...COMPONENT_FIELDS] : STRUCTURE_COMPONENT_FIELDS);
  const queryFields = selection.queryFields ?? (detail === "full" ? [...QUERY_FIELDS] : STRUCTURE_QUERY_FIELDS);
  const EVENT_ALIASES = {
    trigger: "name",
    eventName: "name",
    event_name: "name",
    sourceType: "target",
    source_type: "target",
    source_id: "sourceId",
    action: "event",
    actionId: "event.actionId",
    action_id: "event.actionId"
  };
  const eventFields = (selection.eventFields ? [...new Set(selection.eventFields.map((path) => {
    const [root, ...rest] = path.split(".");
    const mapped = EVENT_ALIASES[root];
    return mapped ? [mapped, ...rest].join(".") : path;
  }))] : void 0) ?? (detail === "full" ? [...EVENT_FIELDS] : STRUCTURE_EVENT_FIELDS);
  validatePaths(appFields, APP_FIELDS, "app_fields");
  validatePaths(pageFields, PAGE_FIELDS, "page_fields");
  validatePaths(componentFields, COMPONENT_FIELDS, "component_fields");
  validatePaths(queryFields, QUERY_FIELDS, "query_fields");
  validatePaths(eventFields, EVENT_FIELDS, "event_fields");
  const result = pickPaths(summary, appFields);
  if (sections.has("pages")) {
    result.pages = summary.pages.filter((page) => matches(page.id, selection.pageIds) && matches(page.name, selection.pageNames) && matches(page.handle, selection.pageHandles)).map((page) => {
      const selectedPage = pickPaths(page, pageFields);
      if (selection.includeComponents !== false) {
        selectedPage.components = page.components.filter((component) => matches(component.id, selection.componentIds) && matches(component.name, selection.componentNames) && matches(component.type, selection.componentTypes)).map((component) => {
          const picked = pickPaths(component, componentFields);
          if (detail === "structure" && !selection.componentFields)
            stripLayoutTimestamps(picked);
          return picked;
        });
      }
      return selectedPage;
    });
  }
  if (sections.has("queries")) {
    result.queries = summary.queries.filter((query) => matches(query.id, selection.queryIds) && matches(query.name, selection.queryNames) && matches(query.kind, selection.queryKinds)).map((query) => pickPaths(query, queryFields));
  }
  if (sections.has("events")) {
    result.events = summary.events.filter((event) => matches(event.id, selection.eventIds) && matches(event.sourceId, selection.eventSourceIds)).map((event) => pickPaths(event, eventFields));
  }
  return result;
}
var stringList = external_exports.array(external_exports.string()).min(1).optional();
var fieldList = external_exports.array(external_exports.string()).min(1).optional();
function getAppSummaryTool(client) {
  return {
    name: "get_app_summary",
    title: "Get App Summary",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: `Selective, bounded inspection of an app \u2014 use this instead of get_app. Pass version_id after create_app_version to inspect that exact version instead of the server's default editing version. By default detail="structure" returns page/component/query/event identity and layout but omits bulky component values, query options, and event payloads. Filter by page/component/query/event ids or names and select exact top-level or dotted fields, e.g. component_fields:["id","properties.data.value","styles.textSize.value"]. Use detail="full" only after narrowing the target. Each component value is the ACTUAL bound value, never the full widget schema. Field roots: app(app_id/name/version_id), page(id/name/handle/icon/hidden/index/is_page_group/page_group_id), component(id/name/type/layouts/properties/styles/validation/others/parent), query(id/name/kind/data_source_id/options), and event(id/name/sourceId/target/event). sections can omit pages/queries/events; include_components:false returns page metadata only.`,
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string().min(1).optional(),
      // Components live in pages: "components" is read as pages (a build lost a call to it, 2026-10-05).
      sections: external_exports.preprocess((value) => Array.isArray(value) ? [...new Set(value.map((s) => s === "components" ? "pages" : s))] : value, external_exports.array(external_exports.enum(["pages", "queries", "events"]))).optional(),
      detail: external_exports.enum(["structure", "full"]).optional(),
      include_components: external_exports.boolean().optional(),
      page_ids: stringList,
      page_names: stringList,
      page_handles: stringList,
      component_ids: stringList,
      component_names: stringList,
      component_types: stringList,
      query_ids: stringList,
      query_names: stringList,
      query_kinds: stringList,
      event_ids: stringList,
      event_source_ids: stringList,
      app_fields: fieldList,
      page_fields: fieldList,
      component_fields: fieldList,
      query_fields: fieldList,
      event_fields: fieldList
    },
    async handler(args) {
      try {
        for (const key of [
          "page_ids",
          "page_names",
          "page_handles",
          "component_ids",
          "component_names",
          "component_types",
          "query_ids",
          "query_names",
          "query_kinds",
          "event_ids",
          "event_source_ids"
        ]) {
          if (args[key]?.some((value) => !value.trim() || value === "*" || value === "00000000-0000-0000-0000-000000000000")) {
            throw new Error(`${key} contains a placeholder, not an exact selector. Omit unused filters entirely; wildcards and dummy ids do not mean all resources. This is a filter error, not an empty app.`);
          }
        }
        const summary = args.version_id ? await client.getAppSummary(args.app_id, args.version_id) : await client.getAppSummary(args.app_id);
        const selected = selectAppSummary(summary, {
          sections: args.sections,
          detail: args.detail,
          includeComponents: args.include_components,
          pageIds: args.page_ids,
          pageNames: args.page_names,
          pageHandles: args.page_handles,
          componentIds: args.component_ids,
          componentNames: args.component_names,
          componentTypes: args.component_types,
          queryIds: args.query_ids,
          queryNames: args.query_names,
          queryKinds: args.query_kinds,
          eventIds: args.event_ids,
          eventSourceIds: args.event_source_ids,
          appFields: args.app_fields,
          pageFields: args.page_fields,
          componentFields: args.component_fields,
          queryFields: args.query_fields,
          eventFields: args.event_fields
        });
        return ok(await withQueryTables(client, summary, selected, args));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
async function withQueryTables(client, summary, selected, args) {
  const narrowed = args.sections && !args.sections.includes("queries");
  const filtered = Object.entries(args).some(([key, value]) => key !== "app_id" && key !== "sections" && key !== "detail" && value !== void 0);
  if (narrowed || filtered || !selected || typeof selected !== "object")
    return selected;
  const ids = [...new Set((summary.queries ?? []).flatMap((query) => {
    const q = query;
    return q.kind === "tooljetdb" && typeof q.options?.table_id === "string" ? [q.options.table_id] : [];
  }))];
  if (!ids.length)
    return selected;
  try {
    const all = await client.listTables();
    const byId = new Map(all.map((table) => [table.id, table.table_name]));
    return { ...selected, tables: ids.filter((id) => byId.has(id)).map((id) => ({ id, table_name: byId.get(id) })) };
  } catch {
    return selected;
  }
}
function getComponentTool(client) {
  return {
    name: "get_component",
    title: "Get Component",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Fetch ONE placed component by id \u2014 its actual bound values only: { id, name, type, page_id, layouts, properties, styles, validation, others }. Includes actual native input validation. Cheaper than get_app_summary when you only need to inspect or diff a single component before update_component.",
    inputSchema: {
      app_id: external_exports.string(),
      component_id: external_exports.string()
    },
    async handler(args) {
      try {
        const result = await client.getComponent(args.app_id, args.component_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function validateAppTool(client) {
  return {
    name: "validate_app",
    title: "Validate App",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "Validate persisted app structure and saved query contracts WITHOUT executing queries or opening a browser. Pass version_id after create_app_version to validate that exact version. Returns an explicit checked/not_checked scope plus { ok, errors, warnings }. Catches: dangling event references (event on a deleted component/query, run-query pointing at a missing query), ambiguous duplicate component/query names, bindings to non-existent queries/components ({{queries.X}} / {{components.X}} with no such X), and per-component render traps (Table bound without rawJson, malformed DropdownV2 options, invalid static Chart JSON, Chart left with its clipping default title, bad headerCasing). Run it before you call the app done (then still do the one browser pass). `errors` are broken references or invalid persisted contracts you should fix; `warnings` are likely render problems worth checking. A clean result does NOT prove external APIs, mutations, event delivery, or visual rendering work; run explicitly selected safe reads and browser-test primary flows.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string().min(1).optional()
    },
    async handler(args) {
      try {
        const summary = args.version_id ? await client.getAppSummary(args.app_id, args.version_id) : await client.getAppSummary(args.app_id);
        const validation = validatePersistedAppSummary(summary, { canvasColor: await literalCanvasColor(client, args.app_id, summary.version_id) });
        for (const query of summary.queries.filter((query2) => query2.kind === "workflows")) {
          try {
            await client.assertWorkflowQueryTarget(query.options);
          } catch (error) {
            validation.errors.push(`Query "${query.name ?? query.id}": workflow target could not be verified. ${String(error)}`);
          }
        }
        validation.checked.push("workflow target identity, workspace and explicit version ownership");
        validation.ok = validation.errors.length === 0;
        return ok(validation);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function addPageTool(client) {
  return {
    name: "add_page",
    title: "Add Page",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: 'Add a page to an app. Returns { page_id, name }; pass that page_id to add_component(s) to place components on it. ToolJet auto-renders a left-sidebar navigation menu across pages, so you get page switching for free. Use multiple pages when it genuinely helps (e.g. list + detail, or separate dashboard/admin views) \u2014 don\'t fragment a simple app across many pages. A relevant `icon` is required (a Tabler icon name, e.g. "IconLayoutDashboard", "IconUsers", "IconChartBar", "IconSettings") so every added page reads clearly in the sidebar. The auto-created Home page already falls back to IconHome2; missing or invalid names render a generic fallback rather than the intended icon. Set `hidden: true` for a page that is opened ONLY from another page (e.g. a detail page reached by row-click \u2192 switch-page) \u2014 it stays fully reachable but is removed from the sidebar nav so the menu stays clean.',
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      name: external_exports.string(),
      icon: pageIconSchema,
      hidden: external_exports.boolean().optional()
    },
    async handler(args) {
      try {
        return ok(await client.createPage({
          appId: args.app_id,
          versionId: args.version_id,
          name: args.name,
          icon: args.icon,
          hidden: args.hidden
        }));
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var pageSchema = external_exports.object({
  name: external_exports.string(),
  icon: pageIconSchema,
  hidden: external_exports.boolean().optional()
});
function addPagesTool(client) {
  return {
    name: "add_pages",
    title: "Add Pages",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Add multiple pages to an app in one call. Names/handles are preflighted together, page order follows the input order, and sidebar icon/hidden metadata is persisted and verified with one final readback. Every page requires a relevant Tabler icon; set hidden:true for detail pages reached only through navigation. Returns {pages}. ToolJet has no page bulk transaction: a rare partial failure names every persisted page; do not retry the whole batch or auto-delete those pages.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      pages: external_exports.array(pageSchema).min(1).max(50)
    },
    async handler(args) {
      try {
        return ok({
          pages: await client.createPages({
            appId: args.app_id,
            versionId: args.version_id,
            pages: args.pages
          })
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var updateSchema = strictEntry({
  page_id: external_exports.string().min(1),
  name: external_exports.string().min(1).optional(),
  icon: pageIconSchema.optional(),
  hidden: external_exports.boolean().optional().describe("Hide or show only this non-Home page in the generated navigation menu. This does not hide the whole menu; use update_app_settings.navigation_hidden for that.")
}, (key) => `Page update key "${key}" is not accepted; update_pages entries take page_id plus name, icon, hidden. App-level settings belong to update_app_settings.`);
function updatePagesTool(client) {
  return {
    name: "update_pages",
    title: "Update Pages",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Update existing page sidebar metadata and/or reorder pages, with one final readback verification. Use updates to rename pages, set a relevant Tabler icon, or toggle one non-Home page in the menu. The Home page can be renamed, restyled, and reordered, but cannot be hidden. To hide or show the entire generated navigation menu, use update_app_settings.navigation_hidden instead. Use order only with the complete ordered list of every current page id (available from create_app/get_app_summary); partial orders are rejected to prevent duplicate indexes.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      updates: external_exports.array(updateSchema).min(1).max(50).optional(),
      order: external_exports.array(external_exports.string().min(1)).min(1).max(50).optional()
    },
    async handler(args) {
      try {
        return ok(await client.updatePages({
          appId: args.app_id,
          versionId: args.version_id,
          updates: args.updates?.map((update) => ({
            pageId: update.page_id,
            name: update.name,
            icon: update.icon,
            hidden: update.hidden
          })),
          order: args.order
        }));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function deletePageTool(client) {
  return {
    name: "delete_page",
    title: "Delete Page",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Permanently delete one non-Home page and its components. This is destructive: inspect the target, obtain explicit user approval for the named page, then pass confirm:true. The tool refuses pages still targeted by events outside that page, because ToolJet does not safely retarget those references. Group-wide deletion is disabled because ToolJet does not return a verifiable child-page deletion set; delete each inspected and approved page separately.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      delete_associated_pages: external_exports.boolean().optional(),
      confirm: external_exports.literal(true)
    },
    async handler(args) {
      try {
        const before = await client.getAppSummary(args.app_id);
        const page = before.pages.find((candidate) => candidate.id === args.page_id);
        if (!page)
          throw new Error(`delete_page: page ${args.page_id} was not found in app ${args.app_id}.`);
        if (args.delete_associated_pages) {
          throw new Error("delete_page: delete_associated_pages is disabled because the compact ToolJet delete response cannot prove which child pages were removed. Inspect and delete each named page separately with explicit approval.");
        }
        if (page.handle === "home" || page.name === "Home") {
          throw new Error("delete_page: the native Home page cannot be deleted; rename, restyle, or reorder it with update_pages.");
        }
        const ownedSourceIds = /* @__PURE__ */ new Set([page.id, ...page.components.map((component) => component.id)]);
        const incomingEvents = before.events.filter((event) => !ownedSourceIds.has(event.sourceId ?? "") && [...ownedSourceIds].some((targetId) => containsExactValue(event.event, targetId)));
        if (incomingEvents.length) {
          throw new Error(`delete_page: page "${page.name ?? page.id}" is still targeted by external event(s): ` + incomingEvents.map((event) => event.name ?? event.id).join(", ") + ". Update or delete those events first so the app does not retain dangling navigation.");
        }
        await client.deletePage({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          deleteAssociatedPages: args.delete_associated_pages
        });
        const after = await client.getAppSummary(args.app_id);
        if (after.pages.some((candidate) => candidate.id === args.page_id)) {
          throw new Error(`delete_page: ToolJet returned success but page ${args.page_id} still exists.`);
        }
        const danglingSourceEvents = after.events.filter((event) => ownedSourceIds.has(event.sourceId ?? ""));
        if (danglingSourceEvents.length) {
          throw new Error(`delete_page: page was removed but source events remain: ` + danglingSourceEvents.map((event) => event.name ?? event.id).join(", ") + ". Delete those events before further authoring.");
        }
        const deletedEventCount = before.events.filter((event) => ownedSourceIds.has(event.sourceId ?? "")).length;
        return ok({
          deleted: true,
          page_id: page.id,
          page_name: page.name,
          components_deleted: page.components.length,
          source_events_deleted: deletedEventCount,
          delete_associated_pages: args.delete_associated_pages ?? false
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function addQueryTool(client) {
  return {
    name: "add_query",
    title: "Add Query",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Create a query on an app version's datasource (ANY datasource \u2014 ToolJet DB, Postgres, RunJS, ServiceNow, \u2026). The query kind is resolved from datasource_id. Options are contract-validated before the write; known-invalid operations/missing required fields block, while unknown keys are returned in `warnings` because ToolJet may silently drop them. Call get_datasource_query_schema with datasource_id + version_id + operation first.",
    inputSchema: {
      version_id: external_exports.string(),
      datasource_id: external_exports.string(),
      name: external_exports.string(),
      options: external_exports.record(external_exports.string(), external_exports.any()),
      kind: external_exports.string().optional()
    },
    async handler(args) {
      try {
        const datasource = (await client.listDatasources(args.version_id)).find((item) => item.id === args.datasource_id);
        if (!datasource) {
          return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
        }
        const prepared = prepareQueryOptionsForWrite(datasource.kind, args.options);
        if (prepared.errors.length)
          return fail(new Error(prepared.errors.join(" ")));
        const { options: options2, warnings } = prepared;
        const validation = prepared.validation;
        if (args.kind && args.kind !== datasource.kind) {
          warnings.push(`Caller kind "${args.kind}" was ignored; datasource "${args.datasource_id}" is kind "${datasource.kind}".`);
        }
        warnings.push(...await inspectUpdateCompatibility(client, [{ name: args.name, kind: datasource.kind, options: options2 }]));
        const result = await client.createQuery({
          versionId: args.version_id,
          dataSourceId: args.datasource_id,
          name: args.name,
          options: options2,
          kind: datasource.kind
        });
        return ok({
          ...result,
          warnings,
          validation: { kind: datasource.kind, operation: validation.operation, schema_found: validation.schemaFound }
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var querySchema = external_exports.object({
  client_ref: external_exports.string().optional(),
  datasource_id: external_exports.string(),
  name: external_exports.string(),
  options: external_exports.record(external_exports.string(), external_exports.any()),
  kind: external_exports.string().optional()
});
function addQueriesTool(client) {
  return {
    name: "add_queries",
    title: "Add Queries",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Create MANY queries in a single call (all share version_id). Prefer this over repeated add_query when building an app. Each query names its own datasource_id and options. Call get_datasource_query_schema for the operations you use before constructing those options. The batch resolves datasource kinds once, contract-validates every query before any writes, and returns {queries,warnings,validation}. ToolJet has no query bulk transaction: a rare partial failure names every persisted query; do not retry the whole batch. Creates are serialized per version within this MCP client. Optional client_ref aliases declared in this batch are resolved in its query bindings/RunJS when unambiguous; existing runtime names take precedence.",
    inputSchema: {
      version_id: external_exports.string(),
      queries: external_exports.array(querySchema).min(1)
    },
    async handler(args) {
      try {
        const datasources = await client.listDatasources(args.version_id);
        const datasourceById = new Map(datasources.map((datasource) => [datasource.id, datasource]));
        const warnings = [];
        const queries = structuredClone(args.queries);
        if (queries.some((query) => query.client_ref && query.client_ref !== query.name)) {
          try {
            const existing = await client.getQueries(args.version_id);
            warnings.push(...normalizePlanBindingAliases({ queries }, { pages: [], queries: existing }, new Map(datasources.map((ds) => [ds.id, ds.kind]))));
          } catch {
            warnings.push("Batch query aliases were not normalized because existing query names could not be read. Use exact runtime names.");
          }
        }
        const validations = [];
        const resolved = queries.map((query) => {
          const datasource = datasourceById.get(query.datasource_id);
          if (!datasource) {
            throw new Error(`Query "${query.name}": datasource "${query.datasource_id}" is not available on version "${args.version_id}".`);
          }
          const prepared = prepareQueryOptionsForWrite(datasource.kind, query.options, `Query "${query.name}"`);
          if (prepared.errors.length)
            throw new Error(prepared.errors.join(" "));
          warnings.push(...prepared.warnings);
          const { options: options2 } = prepared;
          const validation = prepared.validation;
          if (query.kind && query.kind !== datasource.kind) {
            warnings.push(`Query "${query.name}": caller kind "${query.kind}" was ignored; datasource kind is "${datasource.kind}".`);
          }
          validations.push({
            name: query.name,
            kind: datasource.kind,
            operation: validation.operation,
            schema_found: validation.schemaFound
          });
          return { query: { ...query, options: options2 }, kind: datasource.kind };
        });
        warnings.push(...await inspectUpdateCompatibility(client, resolved.map(({ query, kind }) => ({
          name: query.name,
          kind,
          options: query.options
        }))));
        const result = await client.createQueries({
          versionId: args.version_id,
          queries: resolved.map(({ query, kind }) => ({
            dataSourceId: query.datasource_id,
            name: query.name,
            options: query.options,
            kind
          }))
        });
        return ok({ queries: result, warnings, validation: validations });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var layoutSchema = external_exports.object({
  top: external_exports.number(),
  left: external_exports.number(),
  width: external_exports.number(),
  height: external_exports.number()
});
var layoutsSchema = external_exports.object({
  desktop: layoutSchema.optional(),
  mobile: layoutSchema.optional()
});
function addComponentTool(client) {
  return {
    name: "add_component",
    title: "Add Component",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: 'Place a component on an app page. `name` is required. A Table binds data via properties.data.value = "{{queries.<queryName>.data}}". Property/style/validation/other leaves may be supplied as concise raw values or canonical `{ value: ... }` envelopes; MCP persists the canonical ToolJet shape. ' + COMPONENT_FX_GUIDANCE + "IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, \u2026) in the top-level `styles` object, NOT under `properties` \u2014 ToolJet silently ignores styles nested in properties (and this tool will reject them). Provide either `layout` (one rectangle applied to both resolutions) or `layouts:{desktop,mobile}` for per-resolution placement. Kanban automatically gets its catalog card children; use add_components with client_ref/parent_ref when you need a custom card body such as wrapped Html.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      name: componentNameSchema,
      type: external_exports.string(),
      properties: external_exports.record(external_exports.string(), external_exports.any()),
      styles: external_exports.record(external_exports.string(), external_exports.any()).optional(),
      validation: external_exports.record(external_exports.string(), external_exports.any()).optional(),
      others: external_exports.record(external_exports.string(), external_exports.any()).optional(),
      layout: layoutSchema.optional(),
      layouts: layoutsSchema.optional()
    },
    async handler(args) {
      const requested = {
        name: args.name,
        type: args.type,
        properties: args.properties,
        styles: args.styles,
        validation: args.validation,
        others: args.others,
        layout: args.layout,
        layouts: args.layouts
      };
      const normalized = normalizeComponentSpec(requested);
      const geometry = normalizePlannedLayouts(normalized.component);
      const expanded = materializeRequiredDefaultChildren([geometry.component]);
      const lintResult = lintComponents(expanded.components);
      const errors = lintResult.errors;
      const mapRefusal = await mapKeyRefusal(client, expanded.components.map((c) => String(c.type)));
      if (mapRefusal)
        errors.push(mapRefusal);
      const warnings = [...geometry.warnings, ...lintResult.warnings];
      if (errors.length)
        return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
      try {
        if (expanded.materializedChildren) {
          const [parent, ...defaultChildren] = await client.createComponents({
            appId: args.app_id,
            versionId: args.version_id,
            pageId: args.page_id,
            components: expanded.components
          });
          return ok({
            ...parent,
            default_children: defaultChildren,
            warnings: [...normalized.warnings, ...expanded.warnings, ...warnings]
          });
        }
        const component = expanded.components[0];
        const result = await client.createComponent({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          name: component.name,
          type: component.type,
          properties: component.properties,
          styles: component.styles,
          validation: component.validation,
          others: component.others,
          layout: component.layout,
          layouts: component.layouts
        });
        return ok({ ...result, warnings: [...normalized.warnings, ...expanded.warnings, ...warnings] });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function addComponentsTool(client) {
  return {
    name: "add_components",
    title: "Add Components",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Place MANY components on one page in a single call (all share app_id/version_id/page_id). Prefer this over repeated add_component when building an app \u2014 it is one request. Returns [{ component_id, name }]. Note: the batch is atomic \u2014 if one component is invalid (e.g. missing name), the whole call fails; fix that component and retry. Property/style/validation/other leaves may be supplied as concise raw values or canonical `{ value: ... }` envelopes; MCP persists the canonical ToolJet shape. " + COMPONENT_FX_GUIDANCE + 'IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, \u2026) in each component\u2019s top-level `styles` object, NOT under `properties` \u2014 ToolJet silently ignores styles nested in properties (and this tool will reject them). Provide either `layout` (one rectangle for both resolutions) or `layouts:{desktop,mobile}`. To create a modal/container and its children atomically, give the parent a unique `client_ref` and each child the matching `parent_ref`; child bindings may also use unique client_ref aliases declared in this batch; MCP resolves them to runtime names when existing names can be checked, without overriding an existing runtime name. coordinates are relative to that parent, with a fresh 43-column grid in each nested canvas. A full-row child uses width 43 even in a narrow parent. Container/Form/modal slots may use left 2, width 39 for insets; grid-mode Listview full rows use left 0, width 43. For ModalV2/Form/Container native regions, set child `slot_name` to `header`, `body`, or `footer`; body is the default. A Kanban with no explicit child automatically gets its catalog card children so cards are not blank; supplying a child with its `parent_ref` suppresses those defaults (use Html for wrapped multi-line card content). For the Kanban card-click modal, parent its detail controls to the Kanban with slot_name:"modal"; these do not replace card children.',
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      components: external_exports.array(componentInputSchema).min(1)
    },
    async handler(args) {
      const inputs = structuredClone(args.components);
      const pageWarnings = [];
      let summary;
      try {
        summary = await client.getAppSummary(args.app_id);
      } catch {
        pageWarnings.push("Existing-page geometry and binding aliases were not checked because the app summary was unavailable; use exact runtime names and verify the target page.");
      }
      if (summary?.version_id && summary.version_id !== args.version_id) {
        return fail(new Error("Cannot validate this write: the app summary is for a different editing version. Refresh the app version before adding components."));
      }
      if (summary)
        pageWarnings.push(...normalizePlanBindingAliases({ pages: [{ components: inputs }] }, summary));
      const prepared = prepareComponentBatch(inputs, { canvasColor: await literalCanvasColor(client, args.app_id, summary?.version_id ?? args.version_id) });
      if (prepared.errors.length)
        return fail(new Error(prepared.errors.join(" ")));
      try {
        const page = summary?.pages.find((candidate) => candidate.id === args.page_id);
        if (page) {
          const existing = page.components;
          const combined = [...existing, ...prepared.components];
          const introducedErrors = introducedLintFindings(lintRenderedGeometryBlocking(existing), lintRenderedGeometryBlocking(combined));
          if (introducedErrors.length) {
            return fail(new Error("The batch would land on components already on the page: " + introducedErrors.join(" ")));
          }
          pageWarnings.push(...introducedLintFindings(lintRenderedGeometryAdvisory(existing), lintRenderedGeometryAdvisory(combined)));
        }
      } catch {
        pageWarnings.push("Existing-page geometry was not checked because the app summary was unavailable; verify the target page after this write.");
      }
      try {
        const result = await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          components: prepared.components
        });
        return ok({
          components: result,
          warnings: [.../* @__PURE__ */ new Set([...prepared.warnings, ...pageWarnings])]
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var pageBatchSchema = external_exports.object({
  page_id: external_exports.string(),
  components: external_exports.array(componentInputSchema).min(1)
});
function addComponentBatchesTool(client) {
  return {
    name: "add_component_batches",
    title: "Add Component Batches",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Place complete component batches on 2\u201320 pages concurrently. MCP normalizes and lints every page before any write, then sends one atomic ToolJet component request per page in parallel. Use add_components for one page. Cross-page bindings may use unique client_ref aliases declared in this batch; existing runtime names take precedence. Cross-page creation is not transactional because ToolJet has no multi-page component endpoint; an upstream partial failure names the completed and failed pages so it can be repaired in place. " + COMPONENT_FX_GUIDANCE,
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      pages: external_exports.array(pageBatchSchema).min(2).max(20)
    },
    async handler(args) {
      const pageIds = args.pages.map((page) => page.page_id);
      if (new Set(pageIds).size !== pageIds.length) {
        return fail(new Error("add_component_batches page_id values must be unique."));
      }
      const pages = structuredClone(args.pages);
      const aliasWarnings = [];
      if (pages.some((page) => page.components.some((c) => c.client_ref && c.client_ref !== c.name))) {
        try {
          const summary = await client.getAppSummary(args.app_id);
          if (summary.version_id && summary.version_id !== args.version_id) {
            return fail(new Error("Cannot normalize this write against a different editing version. Refresh the app version."));
          }
          aliasWarnings.push(...normalizePlanBindingAliases({ pages }, summary));
        } catch {
          aliasWarnings.push("Batch component aliases were not normalized because existing names could not be read. Use exact runtime names.");
        }
      }
      const canvasColor = await literalCanvasColor(client, args.app_id, args.version_id);
      const prepared = pages.map((page) => ({ ...page, prepared: prepareComponentBatch(page.components, { canvasColor }) }));
      const errors = prepared.flatMap((page) => page.prepared.errors.map((error) => `Page ${page.page_id}: ${error}`));
      const mapRefusal = await mapKeyRefusal(client, pages.flatMap((page) => page.components.map((c) => String(c.type))));
      if (mapRefusal)
        errors.push(mapRefusal);
      if (errors.length)
        return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
      const settled = await Promise.allSettled(prepared.map(async (page) => ({
        page_id: page.page_id,
        components: await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: page.page_id,
          components: page.prepared.components
        }),
        warnings: page.prepared.warnings
      })));
      const completed = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      const failures = settled.flatMap((result, index) => result.status === "rejected" ? [`${prepared[index].page_id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`] : []);
      if (failures.length) {
        return fail(new Error(`add_component_batches partially failed. Completed pages: ${completed.map((page) => page.page_id).join(", ") || "none"}. Failed: ${failures.join(" | ")}. Existing components were not deleted automatically.`));
      }
      return ok({
        pages: completed,
        components_created: completed.reduce((total, page) => total + page.components.length, 0),
        warnings: [...aliasWarnings, ...completed.flatMap((page) => page.warnings.map((warning) => `Page ${page.page_id}: ${warning}`))]
      });
    }
  };
}
function deleteComponentsTool(client) {
  return {
    name: "delete_components",
    title: "Delete Components",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Permanently remove named components from one page. Inspect the targets and obtain explicit approval, then pass confirm:true. The tool refuses surviving child components, component/query bindings, and external events that still reference a target. It verifies every requested id disappeared and never deletes dependencies automatically.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      component_ids: external_exports.array(external_exports.string()).min(1),
      confirm: external_exports.literal(true)
    },
    async handler(args) {
      try {
        const before = await client.getAppSummary(args.app_id);
        const page = before.pages.find((candidate) => candidate.id === args.page_id);
        if (!page)
          throw new Error(`delete_components: page ${args.page_id} was not found.`);
        const requested = new Set(args.component_ids);
        if (requested.size !== args.component_ids.length) {
          throw new Error("delete_components: component_ids must be unique.");
        }
        const targets = page.components.filter((component) => requested.has(component.id));
        const missing = args.component_ids.filter((id) => !targets.some((component) => component.id === id));
        if (missing.length) {
          throw new Error(`delete_components: component ids are not on page ${args.page_id}: ${missing.join(", ")}.`);
        }
        const descendants = page.components.filter((component) => component.parent && // Header, footer and tab children sit on "<id>-header", "<id>-t1" ...: an exact match missed them, and deleting
        // a Tabs, Modal or Container orphaned them (review 2026-09-25).
        [...requested].some((targetId) => component.parent === targetId || component.parent?.startsWith(`${targetId}::`) || decodeComponentParent(component.parent).parentId === targetId) && !requested.has(component.id));
        if (descendants.length) {
          throw new Error(`delete_components: surviving child components still belong to a target: ` + descendants.map((component) => component.name ?? component.id).join(", ") + ". Include them in the explicitly approved deletion or reparent them first.");
        }
        const survivingComponents = before.pages.flatMap((candidate) => candidate.components).filter((component) => !requested.has(component.id));
        const references = [];
        for (const target2 of targets) {
          if (target2.name) {
            for (const component of survivingComponents) {
              if (containsNamedBinding([component.properties, component.styles, component.others], "components", target2.name)) {
                references.push(`component ${component.name ?? component.id} binds components.${target2.name}`);
              }
            }
            for (const query of before.queries) {
              if (containsNamedBinding(query.options, "components", target2.name)) {
                references.push(`query ${query.name ?? query.id} binds components.${target2.name}`);
              }
            }
          }
          for (const event of before.events) {
            if (requested.has(event.sourceId ?? ""))
              continue;
            if (containsExactValue(event.event, target2.id) || (target2.name ? containsNamedBinding(event.event, "components", target2.name) : false)) {
              references.push(`event ${event.name ?? event.id} targets ${target2.name ?? target2.id}`);
            }
          }
        }
        if (references.length) {
          throw new Error(`delete_components: refusing dangling references: ${[...new Set(references)].join("; ")}. Update or delete those references first.`);
        }
        const result = await client.deleteComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          componentIds: args.component_ids
        });
        const after = await client.getAppSummary(args.app_id);
        const remaining = after.pages.flatMap((candidate) => candidate.components).filter((component) => requested.has(component.id));
        if (remaining.length) {
          throw new Error(`delete_components: ToolJet returned success but these components still exist: ` + remaining.map((component) => component.id).join(", "));
        }
        const danglingSourceEvents = after.events.filter((event) => requested.has(event.sourceId ?? ""));
        if (danglingSourceEvents.length) {
          throw new Error(`delete_components: components were removed but source events remain: ` + danglingSourceEvents.map((event) => event.name ?? event.id).join(", ") + ". Delete those events before further authoring.");
        }
        const sourceEventsDeleted = before.events.filter((event) => requested.has(event.sourceId ?? "")).length;
        return ok({
          ...result,
          component_ids: args.component_ids,
          component_names: targets.map((component) => component.name).filter(Boolean),
          source_events_deleted: sourceEventsDeleted
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var rect = external_exports.object({ top: external_exports.number(), left: external_exports.number(), width: external_exports.number(), height: external_exports.number() });
var RECT_KEYS = /* @__PURE__ */ new Set(["top", "left", "width", "height"]);
var layoutEntrySchema = strictEntry({
  component_id: external_exports.string(),
  desktop: rect.optional(),
  mobile: rect.optional(),
  parent: external_exports.string().optional(),
  slot_name: componentSlotSchema.optional()
}, (key) => {
  if (RECT_KEYS.has(key)) {
    return `Layout entry key "${key}" must be nested under desktop and/or mobile (e.g. { component_id, desktop: { top, left, width, height } }).`;
  }
  if (key === "layout" || key === "layouts") {
    return `Layout entry key "${key}" is not accepted; put the rect directly under desktop and/or mobile on the entry.`;
  }
  if (key === "definition" || key === "properties" || key === "styles") {
    return `Layout entry key "${key}" is not accepted by update_layout; edit component values with update_components.`;
  }
  return `Unknown layout entry key "${key}"; accepted keys are component_id, desktop, mobile, parent, slot_name.`;
});
function updateLayoutTool(client) {
  return {
    name: "update_layout",
    title: "Update Layout",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Move / resize existing components (batch) without touching their properties. `left`/`width` are in the immediate parent canvas's own 43-column grid, including nested containers; `top`/`height` are pixels. Full rows use width 43, independent of the parent outer width. Container/Form/modal insets may use left 2, width 39; grid-mode Listview full rows use left 0, width 43. Provide desktop and/or mobile per component. Use this to fix overlaps or reflow a page. Set `parent` to reparent; use `slot_name` (header/body/footer) for native ModalV2/Form/Container regions or modal for Kanban card-click content. `slot_name` alone keeps the current parent.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      page_id: external_exports.string(),
      layouts: external_exports.array(layoutEntrySchema).min(1)
    },
    async handler(args) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page)
          return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const components = new Map(page.components.map((component) => [component.id, component]));
        const layoutWarnings = [];
        const resolveErrors = [];
        const resolvedIds = /* @__PURE__ */ new Map();
        for (const layout of args.layouts) {
          if (!layout.desktop && !layout.mobile && layout.parent === void 0 && layout.slot_name === void 0) {
            resolveErrors.push(`Component "${layout.component_id}": nothing to update. Provide desktop and/or mobile rects, or a parent/slot_name change.`);
            continue;
          }
          if (resolvedIds.has(layout.component_id))
            continue;
          const resolution = resolveRef(page.components, layout.component_id, "Component", `on page "${args.page_id}"`);
          if (!resolution.ok) {
            resolveErrors.push(resolution.error);
            continue;
          }
          resolvedIds.set(layout.component_id, resolution.target.id);
          if (resolution.warning)
            layoutWarnings.push(resolution.warning);
        }
        if (resolveErrors.length)
          return fail(new Error(resolveErrors.join(" ")));
        args = {
          ...args,
          layouts: args.layouts.map((layout) => ({
            ...layout,
            component_id: resolvedIds.get(layout.component_id) ?? layout.component_id
          }))
        };
        const rootSlotWarnings = [];
        const resolvedLayouts = args.layouts.map((layout) => {
          const current = components.get(layout.component_id);
          let parent = layout.parent;
          let slot_name = layout.slot_name;
          if (slot_name !== void 0) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : void 0;
            if (!parent) {
              if (slot_name === "body") {
                rootSlotWarnings.push(`Component "${layout.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`);
                slot_name = void 0;
              } else {
                throw new Error(`Component "${layout.component_id}": slot_name:"${slot_name}" requires an existing or explicit parent.`);
              }
            }
          }
          return { ...layout, parent, slot_name };
        });
        const changes = new Map(resolvedLayouts.map((layout) => [layout.component_id, layout]));
        const projected = page.components.map((component) => {
          const change = changes.get(component.id);
          if (!change)
            return component;
          const currentLayouts = component.layouts ?? {};
          return {
            ...component,
            layouts: {
              ...currentLayouts,
              desktop: change.desktop ?? currentLayouts?.desktop,
              mobile: change.mobile ?? currentLayouts?.mobile
            },
            parent: change.parent !== void 0 ? encodeComponentParent(change.parent, change.slot_name) : component.parent,
            slotName: change.slot_name
          };
        });
        const changedIds = new Set(resolvedLayouts.map((layout) => layout.component_id));
        const changed = projected.filter((component) => component.id && changedIds.has(component.id));
        const introducedForChanged = (lint2) => changed.flatMap((component) => introducedLintFindings(lint2([components.get(component.id)]), lint2([component])));
        const errors = [
          ...introducedLintFindings(lintComponentSlots(page.components), lintComponentSlots(projected)),
          ...introducedForChanged((items) => items.flatMap((component) => lintComponentSpec(component).errors)),
          ...introducedForChanged(lintUnusableTextGeometry)
        ];
        if (errors.length)
          return fail(new Error(`${errors.join(" ")} (Nothing was saved: refused before any write.)`));
        const nestedWidths = new Set(lintNestedContainerWidths(projected));
        const warnings = [.../* @__PURE__ */ new Set([
          ...layoutWarnings,
          ...rootSlotWarnings,
          ...introducedForChanged((items) => items.flatMap((component) => lintComponentSpec(component).warnings)),
          ...introducedForChanged((items) => items.flatMap(lintStandardSingleLineInputHeight)),
          ...introducedForChanged(lintTextGeometry),
          ...lintRenderedGeometry(projected).filter((warning) => !nestedWidths.has(warning)),
          ...introducedLintFindings(lintNestedContainerWidths(page.components), [...nestedWidths])
        ])];
        const result = await client.updateLayouts({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          layouts: resolvedLayouts.map((l) => ({
            componentId: l.component_id,
            desktop: l.desktop,
            mobile: l.mobile,
            parent: l.parent,
            slotName: l.slot_name
          }))
        });
        return ok({ ...result, warnings });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var eventSchema = external_exports.object({
  source_id: external_exports.string().optional(),
  source_type: external_exports.enum(["component", "data_query", "page", "table_column", "table_action"]).optional(),
  /** Backward-compatible shorthand for source_type=component. */
  component_id: external_exports.string().optional(),
  ref: external_exports.string().min(1).optional(),
  trigger: external_exports.string(),
  action: external_exports.record(external_exports.string(), external_exports.any()),
  name: external_exports.string().optional()
}).refine((event) => !!event.source_id || !!event.component_id, {
  message: "Each event needs source_id or the backward-compatible component_id."
}).refine((event) => !(event.source_id && event.component_id), {
  message: "Use source_id or component_id, not both."
}).refine((event) => !event.component_id || !event.source_type || event.source_type === "component", {
  message: "component_id can only be used with source_type=component; use source_id for query/page events."
}).refine((event) => !["table_column", "table_action"].includes(event.source_type ?? "") || !!event.ref, {
  message: "table_column/table_action events require ref; Button columns use `<column key or name>::<button id>`."
}).refine((event) => !event.ref || ["component", "table_column", "table_action"].includes(event.source_type ?? "component"), {
  message: "ref is only valid for Navigation component items, table_column or the deprecated table_action; component refs are checked against the saved component."
});
function addEventsTool(client) {
  return {
    name: "add_events",
    title: "Add Events",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Wire interactivity and lifecycle behavior to components, data queries, pages, or Table sub-elements. Each event uses { source_id, source_type: 'component'|'data_query'|'page'|'table_column', trigger, action }; component_id remains a shorthand for component sources. trigger is the component's event id (Button: 'onClick'; Table: 'onRowClicked'/'onSearch'/'onPageChanged'). For a modern Table Button column use source_id='<table id>', source_type='table_column', ref='<column key or name>::<button id>', trigger='onClick'. For a Navigation item use source_type='component', trigger='onClick', ref='<non-group menu item id>'; other ordinary components cannot use ref. Dynamic menu membership is reported as unverified. The legacy source_type='table_action' is accepted for existing deprecated properties.actions buttons only; do not use it for new apps. Query lifecycle triggers are 'onDataQuerySuccess' and 'onDataQueryFailure'; page load is 'onPageLoad'. action is { actionId, ...params } \u2014 use these EXACT ids (an invalid actionId silently does nothing):\n  \u2022 run a query:   { actionId: 'run-query', queryId: '<id>', queryName: '<name>' }\n  \u2022 switch page:   { actionId: 'switch-page', pageId: '<target page id>' }\n  \u2022 show alert:    { actionId: 'show-alert', message: '...', alertType: 'success'|'info'|'warning'|'error' }\n  \u2022 show/close modal: { actionId: 'show-modal', modal: '<id>' } / { actionId: 'close-modal', modal: '<id>' }\n  \u2022 set a custom variable: { actionId: 'set-custom-variable', key: 'selectedRow', value: '{{components.<table>.selectedRow}}' }  (id is set-custom-variable, NOT set-variable; read back as {{variables.selectedRow}})\n  \u2022 control a component:   { actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: '<get_component_catalog actions.handle>', componentSpecificActionParams: [{handle:'<required param>',value:'...'}] } (use [] for parameterless actions)\n  \u2022 reset/change a Table page: { actionId: 'set-table-page', table: '<Table component id>', pageIndex: '{{1}}' }\n  \u2022 other valid ids: unset-custom-variable, set-page-variable, copy-to-clipboard, generate-file, open-webpage, go-to-app, logout. generate-file CSV/plaintext works; PDF expects pre-formed PDF bytes and does not perform conversion.\nFor reliable mutations, let the submit/click event run only the mutation; attach refresh, success alert, reset/close actions to the mutation's onDataQuerySuccess and an error alert to onDataQueryFailure. For master\u2192detail, order handlers as set-custom-variable \u2192 optional run-query \u2192 switch-page. Navigation MUST be last because later same-trigger handlers do not run; a runOnPageLoad detail query does NOT re-run on page switch. Create all of an app's events in one call. MCP validates source existence, component-specific triggers, Table Button-column refs, action ids, and action targets before writing.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      events: external_exports.array(eventSchema).min(1)
    },
    async handler(args) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const events = args.events.map((event) => ({
          sourceId: event.source_id ?? event.component_id,
          sourceType: event.source_type ?? "component",
          ref: event.ref,
          trigger: event.trigger,
          action: event.action,
          name: event.name
        }));
        const validation = validateEvents(summary, events);
        if (validation.errors.length)
          return fail(new Error(validation.errors.join(" ")));
        const result = await client.createEvents({
          appId: args.app_id,
          versionId: args.version_id,
          events,
          existingEvents: summary.events
        });
        return ok({ ...result, warnings: validation.warnings });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var alertSchema = external_exports.object({
  message: external_exports.string().min(1),
  alert_type: external_exports.enum(["success", "info", "warning", "error"]).optional()
});
var lifecycleSchema = external_exports.object({
  query_id: external_exports.string(),
  refresh_query_ids: external_exports.array(external_exports.string()).optional(),
  clear_component_ids: external_exports.array(external_exports.string()).optional(),
  close_modal_id: external_exports.string().optional(),
  success_alert: alertSchema.optional(),
  failure_alert: alertSchema.optional(),
  before_refresh_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional(),
  success_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional(),
  failure_actions: external_exports.array(external_exports.record(external_exports.string(), external_exports.any())).optional()
}).refine((value) => Boolean(value.before_refresh_actions?.length || value.refresh_query_ids?.length || value.clear_component_ids?.length || value.close_modal_id || value.success_alert || value.failure_alert || value.success_actions?.length || value.failure_actions?.length), { message: "Each lifecycle must declare at least one success or failure action." });
function addQueryLifecyclesTool(client) {
  return {
    name: "add_query_lifecycles",
    title: "Add Query Lifecycles",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true
    },
    description: "Create standard mutation success/failure behavior for many queries in one call. For each query, declare refresh_query_ids, clear_component_ids, close_modal_id, success_alert, and/or failure_alert; MCP expands them into normal ordered ToolJet events, validates every source/target/action, then performs one bulk event write. Optional success_actions/failure_actions accept ordinary event action objects for uncommon extras. before_refresh_actions are dispatched before refresh_query_ids; success_actions remain after them. This is ordering, not a transaction or async completion guarantee: chain dependent writes via success events and refresh only after the final write. Use add_events for other ordering. This helper is datasource-neutral.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      lifecycles: external_exports.array(lifecycleSchema).min(1).max(100)
    },
    async handler(args) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const queryId = idByName(summary.queries);
        const componentId = idByName(summary.pages.flatMap((page) => page.components));
        const expanded = expandQueryLifecycles(summary, args.lifecycles.map((lifecycle) => ({
          queryId: queryId(lifecycle.query_id),
          beforeRefreshActions: lifecycle.before_refresh_actions,
          refreshQueryIds: lifecycle.refresh_query_ids?.map(queryId),
          clearComponentIds: lifecycle.clear_component_ids?.map(componentId),
          closeModalId: lifecycle.close_modal_id === void 0 ? void 0 : componentId(lifecycle.close_modal_id),
          successAlert: lifecycle.success_alert ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type } : void 0,
          failureAlert: lifecycle.failure_alert ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type } : void 0,
          successActions: lifecycle.success_actions,
          failureActions: lifecycle.failure_actions
        })));
        const validation = validateEvents(summary, expanded.events);
        if (validation.errors.length)
          return fail(new Error(validation.errors.join(" ")));
        const result = await client.createEvents({
          appId: args.app_id,
          versionId: args.version_id,
          events: expanded.events,
          existingEvents: summary.events
        });
        return ok({
          ...result,
          lifecycles: args.lifecycles.length,
          warnings: [.../* @__PURE__ */ new Set([...expanded.warnings, ...validation.warnings])]
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function idByName(items) {
  const ids = new Set(items.map((item) => item.id));
  const byName = /* @__PURE__ */ new Map();
  for (const item of items)
    if (item.name)
      byName.set(item.name, [...byName.get(item.name) ?? [], item.id]);
  return (ref) => ids.has(ref) ? ref : byName.get(ref)?.length === 1 ? byName.get(ref)[0] : ref;
}
function updateQueryTool(client) {
  return {
    name: "update_query",
    title: "Update Query",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Change an existing query in place. `options` REPLACES the stored options wholesale \u2014 send the FULL options object, not a partial. Pass app_id so the existing query kind is resolved and options are validated. To repoint a query, also pass datasource_id; validation happens before the datasource changes, and MCP attempts to roll back the source if the subsequent option update fails. The query toggles (runOnPageLoad, runOnDependencyChange, requestConfirmation, showSuccessNotification) must be true or false on every call.",
    inputSchema: {
      query_id: external_exports.string().optional().describe("the query id, or its name; with only name given, name picks the query"),
      version_id: external_exports.string(),
      app_id: external_exports.string().optional(),
      datasource_id: external_exports.string().optional(),
      kind: external_exports.string().optional(),
      options: external_exports.record(external_exports.string(), external_exports.any()),
      name: external_exports.string().optional()
    },
    async handler(input) {
      try {
        if (!input.query_id && !input.name)
          return fail(new Error("update_query needs query_id (the query id or name)."));
        let args = { ...input, query_id: input.query_id ?? input.name, name: input.query_id ? input.name : void 0 };
        if (args.datasource_id && !args.app_id) {
          return fail(new Error("Changing datasource_id requires app_id so MCP can validate and roll back safely."));
        }
        const resolutionWarnings = [];
        let currentDatasourceId;
        let originalDatasourceAvailable = false;
        let kind = args.kind;
        if (args.app_id || !input.query_id) {
          const queries = args.app_id ? (await client.getAppSummary(args.app_id)).queries : await client.getQueries(args.version_id);
          const scope = args.app_id ? `in app "${args.app_id}"` : `in version "${args.version_id}"`;
          const resolution = resolveRef(queries, args.query_id, "Query", scope);
          if (!resolution.ok)
            return fail(new Error(resolution.error));
          if (resolution.warning)
            resolutionWarnings.push(resolution.warning);
          const query = resolution.target;
          args = { ...args, query_id: query.id };
          currentDatasourceId = query.data_source_id;
          kind = query.kind ?? kind;
        }
        if (args.datasource_id) {
          if (!currentDatasourceId) {
            return fail(new Error(`Query "${args.query_id}" has no current datasource id in the app summary; refusing an unrollbackable repoint.`));
          }
          const inventory = await client.listDatasources(args.version_id);
          originalDatasourceAvailable = inventory.some((item) => item.id === currentDatasourceId);
          const datasource = inventory.find((item) => item.id === args.datasource_id);
          if (!datasource) {
            return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
          }
          kind = datasource.kind;
        }
        const prepared = prepareQueryOptionsForWrite(kind, args.options);
        if (prepared.errors.length)
          return fail(new Error(prepared.errors.join(" ")));
        const warnings = [...resolutionWarnings, ...prepared.warnings];
        const { options: options2, validation } = prepared;
        if (!kind)
          warnings.push("Query options were not contract-validated; pass app_id or kind on update_query.");
        warnings.push(...await inspectUpdateCompatibility(client, [{ name: args.name ?? args.query_id, kind, options: options2 }]));
        if (args.datasource_id && args.datasource_id !== currentDatasourceId) {
          await client.updateQueryDatasource({
            queryId: args.query_id,
            versionId: args.version_id,
            dataSourceId: args.datasource_id
          });
        }
        let result;
        try {
          result = await client.updateQuery({
            queryId: args.query_id,
            versionId: args.version_id,
            options: options2,
            name: args.name
          });
        } catch (error) {
          if (error instanceof PartialWriteError)
            throw error;
          if (args.datasource_id && currentDatasourceId && args.datasource_id !== currentDatasourceId) {
            if (!originalDatasourceAvailable) {
              try {
                await client.assertDatasourceAllowed(currentDatasourceId, args.version_id);
                originalDatasourceAvailable = true;
              } catch {
              }
            }
            if (!originalDatasourceAvailable) {
              throw new Error(`Query options update failed after moving query ${args.query_id} to datasource ${args.datasource_id}. The original datasource is unavailable to AI, so it was not restored. The query remains on the new datasource with its previous options; repair those options before running it. ${String(error)}`);
            }
            try {
              await client.updateQueryDatasource({
                queryId: args.query_id,
                versionId: args.version_id,
                dataSourceId: currentDatasourceId
              });
            } catch {
              throw new Error(`Query update failed after changing datasource, and rollback to ${currentDatasourceId} also failed: ${String(error)}`);
            }
          }
          throw error;
        }
        return ok({
          ...result,
          ...args.datasource_id ? { datasource_id: args.datasource_id } : {},
          warnings,
          validation: validation ? { kind, operation: validation.operation, schema_found: validation.schemaFound } : { schema_found: false }
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function deleteQueryTool(client) {
  return {
    name: "delete_query",
    title: "Delete Query",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Permanently delete one query. Inspect the target and obtain explicit approval, then pass app_id and confirm:true. The tool refuses component bindings, dependent query bindings, and external events that still reference it, verifies the query disappeared, and never deletes dependencies automatically.",
    inputSchema: {
      app_id: external_exports.string(),
      query_id: external_exports.string(),
      version_id: external_exports.string(),
      confirm: external_exports.literal(true)
    },
    async handler(args) {
      try {
        const before = await client.getAppSummary(args.app_id);
        const queryResolution = resolveRef(before.queries, args.query_id, "Query", `in app "${args.app_id}"`);
        if (!queryResolution.ok)
          throw new Error(`delete_query: ${queryResolution.error}`);
        const query = queryResolution.target;
        args = { ...args, query_id: query.id };
        const references = [];
        if (query.name) {
          for (const component of before.pages.flatMap((page) => page.components)) {
            if (containsNamedBinding([component.properties, component.styles, component.others], "queries", query.name)) {
              references.push(`component ${component.name ?? component.id} binds queries.${query.name}`);
            }
          }
          for (const dependent of before.queries) {
            if (dependent.id !== query.id && containsNamedBinding(dependent.options, "queries", query.name)) {
              references.push(`query ${dependent.name ?? dependent.id} binds queries.${query.name}`);
            }
          }
        }
        for (const event of before.events) {
          if (event.sourceId === query.id)
            continue;
          if (containsExactValue(event.event, query.id) || (query.name ? containsNamedBinding(event.event, "queries", query.name) : false)) {
            references.push(`event ${event.name ?? event.id} targets ${query.name ?? query.id}`);
          }
        }
        if (references.length) {
          throw new Error(`delete_query: refusing dangling references: ${[...new Set(references)].join("; ")}. Update or delete those references first.`);
        }
        const result = await client.deleteQuery({ queryId: args.query_id, versionId: args.version_id });
        const after = await client.getAppSummary(args.app_id);
        if (after.queries.some((candidate) => candidate.id === query.id)) {
          throw new Error(`delete_query: ToolJet returned success but query ${query.id} still exists.`);
        }
        const danglingSourceEvents = after.events.filter((event) => event.sourceId === query.id);
        if (danglingSourceEvents.length) {
          throw new Error(`delete_query: query was removed but lifecycle events remain: ` + danglingSourceEvents.map((event) => event.name ?? event.id).join(", ") + ". Delete those events before further authoring.");
        }
        const sourceEventsDeleted = before.events.filter((event) => event.sourceId === query.id).length;
        return ok({
          ...result,
          query_id: query.id,
          query_name: query.name,
          source_events_deleted: sourceEventsDeleted
        });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function listEventsTool(client) {
  return {
    name: "list_events",
    title: "List Events",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "List event handlers for a version, optionally filtered to one source (component/query id). Returns [{ id, name, index, event, sourceId, target }] where `event` is the { eventId(trigger), ref?, actionId, ...params } blob. target may be component, data_query, page, table_column, or legacy table_action. Table Button columns use ref=`<column key or name>::<button id>`. Use the ids with update_events / delete_event to fix or remove wiring without rebuilding.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      source_id: external_exports.string().optional()
    },
    async handler(args) {
      try {
        const result = await client.listEvents({
          appId: args.app_id,
          versionId: args.version_id,
          sourceId: args.source_id
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function updateEventsTool(client) {
  return {
    name: "update_events",
    title: "Update Events",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: 'Edit existing event handlers (batch) \u2014 e.g. change an action or its params \u2014 instead of deleting and re-adding. For updateType "update" you MUST include `name` and the full `event` blob ({ eventId, actionId, ...params }) per entry (name becomes null if omitted). For "reorder" only `index` is used. Get event ids from list_events. Outer event_id identifies the saved handler; inner event.eventId is its trigger name (for example "onClick"), NOT the saved handler id.',
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      events: external_exports.array(strictEntry({
        event_id: external_exports.string(),
        name: external_exports.string().optional(),
        event: external_exports.record(external_exports.string(), external_exports.any()).optional(),
        index: external_exports.number().optional()
      }, (key) => `Event entry key "${key}" must be nested under \`event\` (the full { eventId, actionId, ...params } blob). Accepted entry keys are event_id, name, event, index.`)).min(1),
      update_type: external_exports.enum(["update", "reorder"]).optional()
    },
    async handler(args) {
      try {
        const updateType = args.update_type ?? "update";
        const summary = await client.getAppSummary(args.app_id);
        const updatesById = new Map(args.events.map((event) => [event.event_id, event]));
        const missingIds = args.events.filter((event) => !summary.events.some((persisted) => persisted.id === event.event_id)).map((event) => event.event_id);
        if (missingIds.length)
          return fail(new Error(`Event ids do not exist in this app: ${missingIds.join(", ")}.`));
        if (updateType === "update") {
          const missing = args.events.filter((event) => !event.name || !event.event);
          if (missing.length) {
            return fail(new Error('update_events with update_type="update" requires name and the full event blob for every entry.'));
          }
          const confused = args.events.find((entry) => entry.event?.eventId === entry.event_id);
          if (confused) {
            const persisted = summary.events.find((entry) => entry.id === confused.event_id);
            const trigger = persisted?.event?.eventId;
            return fail(new Error(`Event "${confused.name}": event.eventId must be the trigger name, not the saved event id. Keep event_id="${confused.event_id}" at the outer level; the current inner trigger is ${JSON.stringify(trigger)}. Use that trigger unless intentionally changing it to another supported trigger. Do not put onClick in event.event.`));
          }
        } else if (args.events.some((event) => event.index === void 0)) {
          return fail(new Error('update_events with update_type="reorder" requires index for every entry.'));
        }
        const changedSummary = {
          ...summary,
          events: summary.events.map((event) => {
            const update = updatesById.get(event.id);
            if (!update)
              return event;
            return updateType === "update" ? { ...event, name: update.name, event: update.event } : { ...event, index: update.index };
          })
        };
        const specs = persistedEventSpecs(changedSummary);
        const savedRefs = new Set(specs.filter((spec) => updateType === "reorder" || !updatesById.has(persistedEventIds.get(spec) ?? "")));
        const validation = validateEvents(changedSummary, specs, { includePersistedChains: false, savedRefs });
        if (validation.errors.length)
          return fail(new Error(validation.errors.join(" ")));
        const result = await client.updateEvents({
          appId: args.app_id,
          versionId: args.version_id,
          updateType,
          events: args.events.map((e) => ({
            eventId: e.event_id,
            name: e.name,
            event: e.event,
            index: e.index
          }))
        });
        return ok({ ...result, warnings: validation.warnings });
      } catch (err) {
        return fail(err);
      }
    }
  };
}
function deleteEventTool(client) {
  return {
    name: "delete_event",
    title: "Delete Event",
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true
    },
    description: "Delete one event handler by id (from list_events). Use this to remove wiring that points at a deleted component/query, or to drop an action you added by mistake.",
    inputSchema: {
      app_id: external_exports.string(),
      version_id: external_exports.string(),
      event_id: external_exports.string()
    },
    async handler(args) {
      try {
        const result = await client.deleteEvent({
          appId: args.app_id,
          versionId: args.version_id,
          eventId: args.event_id
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    }
  };
}
var TOOLJET_MCP_VERSION = "0.10.1";
function snapshot(path) {
  try {
    const stat = statSync(path);
    const source2 = `${Math.round(stat.mtimeMs * 1e3)}:${stat.size}`;
    return {
      buildId: createHash("sha256").update(source2).digest("hex").slice(0, 12),
      modifiedMs: stat.mtimeMs,
      size: stat.size
    };
  } catch {
    return { buildId: "missing", modifiedMs: -1, size: -1 };
  }
}
function runtimeArtifactPath(moduleUrl) {
  const file = fileURLToPath(moduleUrl);
  return basename(dirname(file)) === "bundle" ? resolve(dirname(file), "index.js") : file;
}
var RuntimeFreshnessMonitor = class {
  artifactPath;
  loaded;
  startedAt = (/* @__PURE__ */ new Date()).toISOString();
  constructor(artifactPath = runtimeArtifactPath(import.meta.url)) {
    this.artifactPath = artifactPath;
    this.loaded = snapshot(artifactPath);
  }
  status() {
    const current = snapshot(this.artifactPath);
    const stale = current.modifiedMs !== this.loaded.modifiedMs || current.size !== this.loaded.size;
    return {
      version: TOOLJET_MCP_VERSION,
      state: stale ? "stale" : "fresh",
      build_id: this.loaded.buildId,
      disk_build_id: current.buildId,
      process_started_at: this.startedAt,
      restart_required: stale
    };
  }
};
var runtimeFreshness = new RuntimeFreshnessMonitor();
function staleRuntimeResult(status) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: `Error: MCP_RUNTIME_STALE: the ToolJet MCP files changed after this process started (loaded ${status.build_id}, disk ${status.disk_build_id}). Restart or reload the MCP/plugin host, then retry. No ToolJet request was attempted.`
    }],
    _meta: { tooljet_runtime: status }
  };
}
function withRuntimeStatus(result, status) {
  return { ...result, _meta: { ...result._meta ?? {}, tooljet_runtime: status } };
}
function getRuntimeInfoTool(runtime) {
  return {
    name: "get_runtime_info",
    title: "Get Runtime Info",
    // Reports this process’s own build identity; touches nothing outside it.
    annotations: {
      readOnlyHint: true,
      openWorldHint: false
    },
    description: "Return the loaded ToolJet MCP version/build identity and whether its on-disk runtime changed after process start. If restart_required is true, restart or reload the MCP/plugin host before using any other tool.",
    inputSchema: { refresh: external_exports.boolean().optional().describe("Accepted for discoverability; runtime status is always fresh.") },
    async handler() {
      return ok(runtime.status());
    }
  };
}
function requireValue2(value, label) {
  if (value === void 0)
    throw new Error(`${label} is required for this action.`);
  return value;
}
function findResource(summary, resourceType, resourceId) {
  if (resourceType === "page") {
    const page = summary.pages.find((candidate) => candidate.id === resourceId);
    if (page)
      return { type: resourceType, id: page.id, name: page.name };
  } else if (resourceType === "query") {
    const query = summary.queries.find((candidate) => candidate.id === resourceId);
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
    description: "List eligible subjects, inspect, set, or clear server-enforced access for one app page, query, or component. Use list_subjects first and exact ids from get_app_summary; users/groups must already have access to the app. set restricts access to the selected users or groups. clear broadens access to every user who can access the app. Mutations require confirm:true after the user explicitly requests the exact access rule. ToolJet license gates still apply.",
    inputSchema: {
      action: external_exports.enum(["list_subjects", "get", "set", "clear"]),
      app_id: external_exports.string().uuid(),
      resource_type: external_exports.enum(["page", "query", "component"]).optional(),
      resource_id: external_exports.string().uuid().optional(),
      access_type: external_exports.enum(["users", "groups"]).optional(),
      user_ids: external_exports.array(external_exports.string().uuid()).min(1).max(100).optional(),
      group_ids: external_exports.array(external_exports.string().uuid()).min(1).max(100).optional(),
      confirm: external_exports.boolean().optional()
    },
    async handler(args) {
      try {
        if (args.action === "list_subjects") {
          return ok({ app_id: args.app_id, ...await client.listAppPermissionSubjects(args.app_id) });
        }
        const resourceType = requireValue2(args.resource_type, "resource_type");
        const resourceId = requireValue2(args.resource_id, "resource_id");
        const summary = await client.getAppSummary(args.app_id);
        const resource = findResource(summary, resourceType, resourceId);
        if (args.action === "get") {
          const permissions2 = await client.getAppPermission(args.app_id, resourceType, resourceId);
          return ok({ app_id: args.app_id, resource, ...normalizePermission(permissions2) });
        }
        if (args.confirm !== true) {
          throw new Error(`${args.action} permission for ${resourceType} "${resource.name ?? resource.id}" requires confirm:true after explicit approval of the exact access rule.`);
        }
        if (args.action === "clear") {
          await client.clearAppPermission(args.app_id, resourceType, resourceId);
          return ok({ app_id: args.app_id, resource, access: "all", permission_id: null });
        }
        const accessType = requireValue2(args.access_type, "access_type");
        const subjectIds = accessType === "users" ? args.user_ids : args.group_ids;
        requireValue2(subjectIds, accessType === "users" ? "user_ids" : "group_ids");
        if (accessType === "users" && args.group_ids !== void 0) {
          throw new Error("group_ids must be omitted when access_type is users.");
        }
        if (accessType === "groups" && args.user_ids !== void 0) {
          throw new Error("user_ids must be omitted when access_type is groups.");
        }
        const permissions = await client.setAppPermission({
          appId: args.app_id,
          resourceType,
          resourceId,
          accessType,
          subjectIds: [...new Set(subjectIds)]
        });
        return ok({ app_id: args.app_id, resource, ...normalizePermission(permissions) });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var userRole = external_exports.enum(["admin", "builder", "end-user"]);
var userStatus = external_exports.enum(["active", "archived", "invited"]);
function listWorkspaceAppsTool(client) {
  return {
    name: "list_workspace_apps",
    title: "List Workspace Apps",
    annotations: {
      readOnlyHint: true,
      openWorldHint: true
    },
    description: "List apps in the workspace pinned to the current ToolJet connection. This cannot inspect or switch to another workspace.",
    inputSchema: {
      page: external_exports.number().int().positive().optional(),
      search_text: external_exports.string().trim().max(100).optional()
    },
    async handler(args) {
      try {
        return ok(await client.listWorkspaceApps({ page: args.page, searchText: args.search_text }));
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
      openWorldHint: true
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
function getWorkflowNodeCatalogTool(_client) {
  return {
    name: "get_workflow_node_catalog",
    title: "Get Workflow Node Catalog",
    description: "Supported workflow node types, ports and exact authoring schema. Unsupported native nodes are preserved, not authored.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {},
    async handler() {
      try {
        return ok({ ...nodeCatalog, spec_schema: external_exports.toJSONSchema(specSchema) });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function getWorkflowCapabilitiesTool(client) {
  return {
    name: "get_workflow_capabilities",
    title: "Get Workflow Capabilities",
    description: "List authorable workflow node types and classify configured datasource instances for one workflow version: ordinary query, AI-model attachment, or email. This is not a datasource option contract. After choosing a datasource, call get_datasource_query_schema with datasource_id + version_id + operation for its exact query fields, allowed operations, response shape, and introspection methods. Does not inspect credentials, create resources, or execute queries.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: capabilityRequestSchema.shape,
    async handler(args) {
      try {
        return ok(await getWorkflowCapabilities(client, capabilityRequestSchema.parse(args)));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var workflowIdSchema = external_exports.string().uuid();
var workflowTargetShape = {
  workflow_id: workflowIdSchema,
  version_id: workflowIdSchema
};
var listWorkflowsInputSchema = external_exports.object({
  page: external_exports.number().int().min(1).default(1),
  search: external_exports.string().default("")
}).strict();
var createWorkflowInputSchema = external_exports.object({
  name: external_exports.string().trim().min(1).max(100).regex(/^[^/]+$/)
}).strict();
var getWorkflowInputSchema = external_exports.object({
  workflow_id: workflowIdSchema,
  version_id: workflowIdSchema.optional()
}).strict();
var lintWorkflowSpecInputSchema = external_exports.object({
  ...workflowTargetShape,
  spec: specSchema,
  allow_draft: external_exports.boolean().default(false)
}).strict();
var applyWorkflowSpecInputSchema = external_exports.object({
  plan_token: workflowIdSchema
}).strict();
var deleteWorkflowNodeInputSchema = external_exports.object({
  ...workflowTargetShape,
  node_id: workflowIdSchema
}).strict();
var validateWorkflowInputSchema = external_exports.object(workflowTargetShape).strict();
var runWorkflowInputSchema = external_exports.object({
  ...workflowTargetShape,
  environment_id: workflowIdSchema,
  params: external_exports.record(external_exports.string(), external_exports.unknown()).default({})
}).strict();
var getWorkflowExecutionInputSchema = external_exports.object({
  execution_id: workflowIdSchema,
  page: external_exports.number().int().min(1).default(1),
  per_page: external_exports.number().int().min(1).max(50).default(20)
}).strict();
function listWorkflowsTool(client) {
  return {
    name: "list_workflows",
    title: "List Workflows",
    description: "List workflows in the active workspace.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: listWorkflowsInputSchema.shape,
    async handler(args) {
      try {
        const input = listWorkflowsInputSchema.parse(args);
        return ok(await client.workflows.list(input.page, input.search));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function createWorkflowTool(client) {
  return {
    name: "create_workflow",
    title: "Create Workflow",
    description: "Create an editable ToolJet workflow draft. Does not execute, publish, or configure triggers. Inspect get_workflow before adding its start node.",
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: createWorkflowInputSchema.shape,
    async handler(args) {
      try {
        const input = createWorkflowInputSchema.parse(args);
        return ok(await client.workflows.create(input.name));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function getWorkflowTool(client) {
  return {
    name: "get_workflow",
    title: "Get Workflow",
    description: "Read a workflow graph and query options. Use returned node IDs as existing_id when editing. Omitted version selects the current editing version, which may be read-only.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: getWorkflowInputSchema.shape,
    async handler(args) {
      try {
        const input = getWorkflowInputSchema.parse(args);
        const snapshot2 = await client.workflows.get(input.workflow_id, input.version_id);
        return ok({ ...snapshot2, queries: await client.workflows.getQueries(snapshot2.version_id) });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function lintWorkflowSpecTool(client) {
  return {
    name: "lint_workflow_spec",
    title: "Lint Workflow Spec",
    description: "Validate graph edits, query options, and runtime prerequisites without executing or saving. Returns a scoped one-use plan token when runnable, or for an editable draft only when allow_draft is true. Omitted nodes/edges are preserved; removals require explicit IDs.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: lintWorkflowSpecInputSchema.shape,
    async handler(args) {
      try {
        const input = lintWorkflowSpecInputSchema.parse(args);
        return ok(await lint(client.workflows, input.workflow_id, input.version_id, input.spec, input.allow_draft));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function applyWorkflowSpecTool(client) {
  return {
    name: "apply_workflow_spec",
    title: "Apply Workflow Spec",
    description: "Apply a validated plan to an editable draft and verify readback. May edit/remove graph objects. Partial writes return IDs for recovery; never blindly retry creation. Does not execute or publish.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: applyWorkflowSpecInputSchema.shape,
    async handler(args) {
      try {
        const input = applyWorkflowSpecInputSchema.parse(args);
        const result = await apply(client.workflows, input.plan_token);
        return result && typeof result === "object" && "failed" in result && result.failed ? { ...ok(result), isError: true } : ok(result);
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function deleteWorkflowNodeTool(client) {
  return {
    name: "delete_workflow_node",
    title: "Delete Workflow Node",
    description: "Delete one workflow node and all incident edges. Saves the graph before deleting a query only when no remaining mapping references it. Incomplete drafts can be cleaned up; remaining runtime blockers are returned. Does not execute or publish. A failed query deletion leaves only an orphaned query; inspect the returned recovery details before retrying.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: deleteWorkflowNodeInputSchema.shape,
    async handler(args) {
      try {
        const input = deleteWorkflowNodeInputSchema.parse(args);
        const result = await deleteNode(client.workflows, input.workflow_id, input.version_id, input.node_id);
        return result && typeof result === "object" && "failed" in result && result.failed ? { ...ok(result), isError: true } : ok(result);
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function validateWorkflowTool(client) {
  return {
    name: "validate_workflow",
    title: "Validate Workflow",
    description: "Check persisted graph structure and query ownership without execution. Does not prove runtime correctness.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: validateWorkflowInputSchema.shape,
    async handler(args) {
      try {
        const input = validateWorkflowInputSchema.parse(args);
        const snapshot2 = await client.workflows.get(input.workflow_id, input.version_id);
        const queries = await client.workflows.getQueries(input.version_id);
        return ok({
          workflow_id: input.workflow_id,
          version_id: input.version_id,
          ...validateGraph(snapshot2.definition, new Set(queries.map((query) => query.id)))
        });
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var MAX_BYTES = 6e4;
var size = (value) => Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");
var record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
function bounded(value, budget) {
  const bytes = size(value);
  return bytes <= budget ? value : { truncated: true, bytes, message: "Payload omitted. Open the workflow in ToolJet to inspect this value." };
}
function boundWorkflowExecutionResult(value) {
  if (size(value) <= MAX_BYTES)
    return value;
  const data = record(value);
  if (data.execution_id !== void 0 && data.nodes !== void 0) {
    const status = record(data.status);
    const page = record(data.nodes);
    const rows = Array.isArray(page.data) ? page.data : [];
    const budget = Math.floor(4e4 / Math.max(rows.length, 1));
    const nodes = rows.map((row) => {
      if (size(row) <= budget)
        return row;
      const node = record(row);
      return {
        id: node.id,
        idOnWorkflowDefinition: node.idOnWorkflowDefinition,
        executed: node.executed,
        status: node.status,
        truncated: true,
        result: bounded(node.result, Math.floor(budget / 2)),
        message: "Large node details omitted. Open the workflow in ToolJet for the full payload."
      };
    });
    const result = {
      execution_id: data.execution_id,
      truncated: true,
      status: { status: status.status, logs: bounded(status.logs, 8e3) },
      page: data.page,
      per_page: data.per_page,
      nodes: { data: nodes, page: page.page, per_page: page.per_page, total: page.total, total_pages: page.total_pages }
    };
    if (size(result) <= MAX_BYTES)
      return result;
    return { ...result, nodes: { ...result.nodes, data: bounded(nodes, 4e4) } };
  }
  const execution = record(data.workflowExecution);
  return {
    truncated: true,
    execution_id: data.execution_id ?? execution.id,
    status: execution.status,
    executed: execution.executed,
    message: "Result exceeds 60 KB. Use get_workflow_execution for status and paginated node results, or open the workflow in ToolJet."
  };
}
function runWorkflowTool(client) {
  return {
    name: "run_workflow",
    title: "Run Workflow",
    description: "Execute the explicitly selected workflow version/environment with real effects, including datasource writes and arbitrary code. Use only when execution is authorized. Never automatically retry a timeout: execution may have completed. Does not enable disabled workflows.",
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: runWorkflowInputSchema.shape,
    async handler(args) {
      try {
        const input = runWorkflowInputSchema.parse(args);
        const result = await client.workflows.run(input.workflow_id, input.version_id, input.environment_id, input.params);
        return ok(boundWorkflowExecutionResult(result));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
function getWorkflowExecutionTool(client) {
  return {
    name: "get_workflow_execution",
    title: "Get Workflow Execution",
    description: "Inspect execution status and a bounded page of node results. Does not start or retry executions.",
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: getWorkflowExecutionInputSchema.shape,
    async handler(args) {
      try {
        const input = getWorkflowExecutionInputSchema.parse(args);
        const result = await client.workflows.execution(input.execution_id, input.page, input.per_page);
        return ok(boundWorkflowExecutionResult(result));
      } catch (error) {
        return fail(error);
      }
    }
  };
}
var LEGACY_SINGULAR_CREATE_TOOL_NAMES = /* @__PURE__ */ new Set([
  "create_table",
  "insert_rows",
  "add_page",
  "add_query",
  "add_component"
]);
var inputSchemas = /* @__PURE__ */ new Map();
function sharedInputSchema(tool) {
  let schema = inputSchemas.get(tool.name);
  if (!schema) {
    schema = tool.strictInput ? external_exports.object(tool.inputSchema).strict() : external_exports.object(tool.inputSchema);
    inputSchemas.set(tool.name, schema);
  }
  return schema;
}
function includeLegacySingularCreateTools() {
  return /^(1|true|yes)$/i.test(process.env.TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS ?? "");
}
function registerTools(server, client, runtime = runtimeFreshness) {
  const tools = [
    getWorkflowNodeCatalogTool(),
    getWorkflowCapabilitiesTool(client),
    listWorkflowsTool(client),
    createWorkflowTool(client),
    getWorkflowTool(client),
    lintWorkflowSpecTool(client),
    applyWorkflowSpecTool(client),
    deleteWorkflowNodeTool(client),
    validateWorkflowTool(client),
    runWorkflowTool(client),
    getWorkflowExecutionTool(client),
    getRuntimeInfoTool(runtime),
    listWorkspacesTool(client),
    useWorkspaceTool(client),
    manageAppPermissionsTool(client),
    listWorkspaceAppsTool(client),
    listWorkspaceUsersTool(client),
    manageWorkspaceUsersTool(client),
    listWorkspaceGroupsTool(client),
    manageWorkspaceGroupsTool(client),
    createAppTool(client),
    createAppVersionTool(client),
    ...appVersionLifecycleTools(client),
    switchAppVersionTool(client),
    releaseAppTool(client),
    getAppSettingsTool(client),
    listAppThemesTool(client),
    updateAppSettingsTool(client),
    listDatasourcesTool(client),
    listTablesTool(client),
    createTableTool(client),
    createTablesTool(client),
    addTableColumnTool(client),
    dropTableColumnTool(client),
    dropTableTool(client),
    getTableSchemaTool(client),
    insertRowsTool(client),
    insertRowsBatchTool(client),
    getDatasourceQuerySchemaTool(client),
    inspectDatasourceSchemaTool(client),
    testDatasourceConnectionTool(client),
    prepareSqlDiscoveryQueriesTool(client),
    generateFormSchemaTool(client),
    generateEditContractTool(),
    getComponentCatalogTool(client),
    getAppTool(client),
    getAppSummaryTool(client),
    getComponentTool(client),
    validateAppTool(client),
    verifyPageRenderTool(client, () => process.env.TOOLJET_APP_URL || process.env.TOOLJET_DEPLOYMENT_URL || "http://localhost:8082"),
    lintAppSpecTool(client),
    applyAppPhaseTool(client),
    addPageTool(client),
    addPagesTool(client),
    updatePagesTool(client),
    deletePageTool(client),
    addQueryTool(client),
    addQueriesTool(client),
    updateQueryTool(client),
    deleteQueryTool(client),
    runQueryTool(client),
    runQueriesTool(client),
    addComponentTool(client),
    addComponentsTool(client),
    addComponentBatchesTool(client),
    updateComponentsTool(client),
    deleteComponentsTool(client),
    updateLayoutTool(client),
    addEventsTool(client),
    addQueryLifecyclesTool(client),
    listEventsTool(client),
    updateEventsTool(client),
    deleteEventTool(client),
    manageThemeTool(client)
  ];
  const exposedTools = includeLegacySingularCreateTools() ? tools : tools.filter((tool) => !LEGACY_SINGULAR_CREATE_TOOL_NAMES.has(tool.name));
  const canRender = renderAuditAvailable();
  for (const tool of exposedTools) {
    if (tool.name === "verify_page_render" && !canRender)
      continue;
    const { name, handler } = tool;
    server.registerTool(name, {
      title: tool.title,
      description: tool.description,
      inputSchema: sharedInputSchema(tool),
      annotations: tool.annotations
    }, (args) => withToolTelemetry(name, async () => {
      const status = runtime.status();
      if (status.restart_required && name !== "get_runtime_info") {
        return staleRuntimeResult(status);
      }
      return withRuntimeStatus(await handler(args), status);
    }));
  }
}
var PREFACE = "Read-only catalog data, for clients that validate or build plans locally. ";
var CATALOG_RESOURCES = [
  {
    name: "catalog-components",
    uri: "tooljet://catalog/components",
    file: "component-schemas.json",
    title: "Component catalog",
    description: `${PREFACE}Every component type by name: properties, styles, events, actions, default size and authoring hints.`
  },
  {
    name: "catalog-component-compatibility",
    uri: "tooljet://catalog/component-compatibility",
    file: "component-compatibility.json",
    title: "Component compatibility",
    description: `${PREFACE}Legacy component types and the modern type that replaces each.`
  },
  {
    name: "catalog-datasources",
    uri: "tooljet://catalog/datasources",
    file: "datasource-schemas.json",
    title: "Datasource query catalog",
    description: `${PREFACE}The query contract of every datasource kind: operations, options and their shapes.`
  },
  {
    name: "catalog-page-icons",
    uri: "tooljet://catalog/page-icons",
    file: "page-icons.json",
    title: "Page icons",
    description: `${PREFACE}The icon package, its version and every icon name a page may use.`
  }
];
var dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../data");
var versions = /* @__PURE__ */ new Map();
var payloads = /* @__PURE__ */ new Map();
function readData(resource) {
  const bytes = readCatalogBytes(resolve(dataDir, resource.file));
  const dataVersion = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  versions.set(resource.file, dataVersion);
  return { bytes, dataVersion };
}
function catalogVersionOf(parts) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(`${part.file}
${part.bytes.length}
`);
    hash.update(part.bytes);
  }
  return hash.digest("hex").slice(0, 12);
}
var catalogVersionCache;
function catalogVersion() {
  catalogVersionCache ??= catalogVersionOf(CATALOG_RESOURCES.map((resource) => ({
    file: resource.file,
    bytes: readCatalogBytes(resolve(dataDir, resource.file))
  })));
  return catalogVersionCache;
}
function listedCatalogVersion() {
  try {
    return catalogVersion();
  } catch {
    return void 0;
  }
}
function listedVersion(resource) {
  try {
    return versions.get(resource.file) ?? readData(resource).dataVersion;
  } catch {
    return void 0;
  }
}
function payload(resource) {
  let text = payloads.get(resource.file);
  if (text === void 0) {
    const { bytes, dataVersion } = readData(resource);
    const data = JSON.parse(bytes.toString("utf8"));
    text = JSON.stringify({ mcp_version: TOOLJET_MCP_VERSION, catalog_version: catalogVersion(), data_version: dataVersion, data });
    payloads.set(resource.file, text);
  }
  return text;
}
function registerCatalogResources(server) {
  const catalog = listedCatalogVersion();
  for (const resource of CATALOG_RESOURCES) {
    const dataVersion = listedVersion(resource);
    server.registerResource(resource.name, resource.uri, {
      title: resource.title,
      description: resource.description,
      mimeType: "application/json",
      ...dataVersion ? { _meta: { data_version: dataVersion, ...catalog ? { catalog_version: catalog } : {} } } : {}
    }, async () => ({
      contents: [{ uri: resource.uri, mimeType: "application/json", text: payload(resource) }]
    }));
  }
}
function buildServer(identity) {
  const config = loadConfig(identity);
  const auth = createAuth(config);
  const client = createClient(auth, config);
  const server = new McpServer({ name: "tooljet-mcp", version: TOOLJET_MCP_VERSION });
  registerTools(server, client);
  registerCatalogResources(server);
  return server;
}
function buildUnconfiguredServer(reason) {
  const message = `tooljet-mcp cannot reach ToolJet: ${reason}`;
  const server = new McpServer({ name: "tooljet-mcp", version: TOOLJET_MCP_VERSION }, { instructions: `${message}

Fix the configuration and restart this server; no tools will work until then.` });
  server.registerTool("tooljet_status", {
    title: "ToolJet Connection Status",
    description: "Why this ToolJet MCP server is not configured, and how to fix it.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, async () => ({ content: [{ type: "text", text: message }], isError: true }));
  return server;
}
var INITIAL_SCOPES = ["apps", "data", "workflows", "workspace_users"];
var OAUTH_MAX_BODY_BYTES = 15 * 1024 * 1024;
function checkedUrl(value, name) {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname);
  if (url.username || url.password || url.hash || url.search || url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error(`${name} must be HTTPS (HTTP is allowed only on loopback), without credentials, query or fragment`);
  }
  return url.href.replace(/\/$/, "");
}
function oauthHttpOptionsFromEnv() {
  if (process.env.MCP_OAUTH_ENABLED !== "true")
    return void 0;
  if (process.env.MCP_SHARED_TOKEN)
    throw new Error("Run public OAuth and internal MCP gateway modes in separate processes");
  const required2 = (name) => {
    const value = process.env[name]?.trim();
    if (!value)
      throw new Error(`${name} is required for MCP OAuth`);
    return value;
  };
  return {
    issuer: required2("MCP_OAUTH_ISSUER"),
    resourceUrl: required2("MCP_OAUTH_RESOURCE_URL"),
    exchangeSecret: required2("MCP_OAUTH_EXCHANGE_SECRET"),
    apiUrl: process.env.TOOLJET_URL?.trim() || required2("TOOLJET_DEPLOYMENT_URL"),
    appUrl: required2("TOOLJET_DEPLOYMENT_URL"),
    allowedOrigins: (process.env.MCP_OAUTH_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean)
  };
}
function sendOAuthJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}
var BodyTooLarge = class extends Error {
};
async function readOAuthBody(req, maxBytes) {
  const chunks = [];
  let bytes = 0;
  if (Number(req.headers["content-length"]) > maxBytes) {
    req.resume();
    throw new BodyTooLarge();
  }
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const part = Buffer.from(chunk);
    bytes += part.length;
    if (bytes > maxBytes) {
      req.resume();
      throw new BodyTooLarge();
    }
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function createOAuthHttpServer(options2) {
  const issuer = checkedUrl(options2.issuer, "issuer");
  const resourceBase = checkedUrl(options2.resourceUrl, "resourceUrl");
  const apiUrl = checkedUrl(options2.apiUrl, "apiUrl");
  const appUrl = checkedUrl(options2.appUrl, "appUrl");
  if (options2.exchangeSecret.length < 32)
    throw new Error("OAuth exchange secret must contain at least 32 characters");
  const resource = new URL(resourceBase);
  const factory = options2.serverFactory ?? buildServer;
  const fetchImpl = options2.fetchImpl ?? fetch;
  const maxBodyBytes = options2.maxBodyBytes ?? OAUTH_MAX_BODY_BYTES;
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0)
    throw new Error("Invalid OAuth request body limit");
  const allowedOrigins = new Set((options2.allowedOrigins || []).map((origin) => {
    const checked = checkedUrl(origin, "allowedOrigin");
    if (new URL(checked).origin !== checked)
      throw new Error("OAuth allowed origins must not include a path");
    return checked;
  }));
  const resourcePath = resource.pathname.replace(/\/$/, "");
  const metadataPrefix = `/.well-known/oauth-protected-resource${resourcePath}/`;
  const pathPrefix = `${resourcePath}/`;
  const exchangeLimit = createExchangeLimiter(Number(process.env.MCP_OAUTH_EXCHANGE_RATE_LIMIT ?? 300), Number(process.env.MCP_OAUTH_TRUST_PROXY_HOPS ?? 0));
  const verifiedExchanges = createVerifiedExchangeCache();
  let exchangesInFlight = 0;
  const httpServer = createServer((req, res) => {
    let exchangeFailure;
    void (async () => {
      const url = new URL(req.url || "/", "http://localhost");
      if (url.pathname === "/health" && req.method === "GET") {
        sendOAuthJson(res, 200, { status: "ok", transport: "streamable-http", authorization: "oauth" });
        return;
      }
      const metadata = url.pathname.startsWith(metadataPrefix);
      const prefix = metadata ? metadataPrefix : pathPrefix;
      const workspace = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : "";
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(workspace)) {
        sendOAuthJson(res, 404, { error: "not_found" });
        return;
      }
      const canonicalResource = `${resourceBase}/${workspace}`;
      const metadataUrl = `${resource.origin}${metadataPrefix}${workspace}`;
      if (metadata && req.method === "GET") {
        res.setHeader("access-control-allow-origin", "*");
        sendOAuthJson(res, 200, {
          resource: canonicalResource,
          authorization_servers: [issuer],
          scopes_supported: INITIAL_SCOPES,
          bearer_methods_supported: ["header"],
          resource_name: "ToolJet workspace"
        });
        return;
      }
      if (metadata) {
        sendOAuthJson(res, 405, { error: "method_not_allowed" });
        return;
      }
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.has(origin)) {
        sendOAuthJson(res, 403, { error: "origin_not_allowed" });
        return;
      }
      if (origin) {
        res.setHeader("access-control-allow-origin", origin);
        res.setHeader("vary", "Origin");
        res.setHeader("access-control-expose-headers", "WWW-Authenticate, MCP-Session-Id, MCP-Protocol-Version");
      }
      if (req.method === "OPTIONS") {
        res.setHeader("access-control-allow-methods", "POST, OPTIONS");
        res.setHeader("access-control-allow-headers", "Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID");
        res.writeHead(204).end();
        return;
      }
      if (req.method !== "POST") {
        res.setHeader("allow", "POST, OPTIONS");
        sendOAuthJson(res, 405, { error: "method_not_allowed" });
        return;
      }
      const token = /^Bearer (tj_oauth_at_[A-Za-z0-9_-]+)$/i.exec(req.headers.authorization || "")?.[1];
      const challenge = (error) => res.setHeader("www-authenticate", `Bearer resource_metadata="${metadataUrl}", scope="${INITIAL_SCOPES.join(" ")}"` + (error ? `, error="${error}"` : ""));
      if (!token || token.length > 4096 || url.searchParams.has("access_token")) {
        challenge(token ? "invalid_token" : void 0);
        sendOAuthJson(res, 401, { error: "invalid_token" });
        return;
      }
      const retryAfter = verifiedExchanges.has(token, canonicalResource) ? 0 : exchangeLimit.retryAfter(req);
      if (retryAfter) {
        res.setHeader("retry-after", String(retryAfter));
        sendOAuthJson(res, 429, { error: "temporarily_unavailable" });
        return;
      }
      if (exchangesInFlight >= 64) {
        res.setHeader("retry-after", "1");
        sendOAuthJson(res, 503, { error: "temporarily_unavailable" });
        return;
      }
      exchangeFailure = "exchange_request_failed";
      exchangesInFlight++;
      let exchange;
      let exchangeBody;
      try {
        exchange = await fetchImpl(`${issuer}/exchange`, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(1e4),
          headers: { authorization: `Bearer ${options2.exchangeSecret}`, "content-type": "application/json" },
          body: JSON.stringify({
            grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
            subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
            subject_token: token,
            resource: canonicalResource
          })
        });
        exchangeFailure = "invalid_delegation_response";
        exchangeBody = await exchange.json().catch(() => void 0);
      } finally {
        exchangesInFlight--;
      }
      if (!exchange.ok) {
        const errorCode = exchangeBody?.error;
        const invalidToken = [400, 401, 403].includes(exchange.status) && typeof errorCode === "string" && ["invalid_token", "invalid_grant", "invalid_target"].includes(errorCode);
        const unavailable = !invalidToken;
        if (unavailable) {
          const safeCode = ["invalid_client", "invalid_request", "server_error", "temporarily_unavailable"].find((code) => code === errorCode) ?? "unexpected_response";
          console.error("[mcp-oauth] Credential exchange unavailable", { status: exchange.status, error: safeCode });
        }
        if (invalidToken) {
          verifiedExchanges.forget(token, canonicalResource);
          exchangeLimit.failed(req);
          challenge("invalid_token");
        }
        sendOAuthJson(res, unavailable ? 503 : 401, { error: unavailable ? "temporarily_unavailable" : "invalid_token" });
        return;
      }
      const credentials = exchangeBody;
      if (!credentials || typeof credentials.access_token !== "string" || typeof credentials.organization_id !== "string" || typeof credentials.grant_id !== "string" || !credentials.grant_id) {
        throw new Error("Invalid delegation response");
      }
      const browserUrl = typeof credentials.browser_url === "string" ? checkedUrl(credentials.browser_url, "browser_url") : appUrl;
      verifiedExchanges.remember(token, canonicalResource);
      exchangeFailure = void 0;
      let requestBody;
      if (req.method === "POST") {
        try {
          requestBody = await readOAuthBody(req, maxBodyBytes);
        } catch (error) {
          sendOAuthJson(res, error instanceof BodyTooLarge ? 413 : 400, {
            error: error instanceof BodyTooLarge ? "request_too_large" : "invalid_request"
          });
          return;
        }
      }
      const server = factory({
        sessionToken: credentials.access_token,
        isOAuthDelegation: true,
        oauthGrantId: credentials.grant_id,
        workspaceId: credentials.organization_id,
        workspaceSlug: typeof credentials.organization_slug === "string" ? credentials.organization_slug : void 0,
        apiUrl,
        appUrl: browserUrl,
        viewerUrl: appUrl
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: void 0,
        enableJsonResponse: true
      });
      res.once("close", () => {
        void transport.close().catch(() => {
        });
        void server.close().catch(() => {
        });
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, requestBody);
    })().catch(() => {
      if (exchangeFailure)
        console.error("[mcp-oauth] Credential exchange unavailable", { error: exchangeFailure });
      if (!res.headersSent)
        sendOAuthJson(res, 503, { error: "temporarily_unavailable" });
      else
        res.end();
    });
  });
  httpServer.requestTimeout = 6e4;
  httpServer.headersTimeout = 15e3;
  return httpServer;
}
export {
  ALLOWED_API_ORIGINS_VAR as A,
  BASE_URL_HEADER as B,
  PAT_HEADER as P,
  SESSION_TOKEN_HEADER as S,
  buildUnconfiguredServer as a,
  buildServer as b,
  allowedApiOrigins as c,
  createOAuthHttpServer as d,
  StreamableHTTPServerTransport as e,
  identityFromHeaders as i,
  oauthHttpOptionsFromEnv as o
};
