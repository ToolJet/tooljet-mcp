# tooljet-mcp — AGENTS.md

Cross-repo overview (plans, hops, who owns what): `../tooljet-agent/ai-stack/SETUP.md` and
https://github.com/ToolJet/tooljet-agent/pull/199. This file covers this repo only.

## 1. Purpose

The tool layer. `npm run build:plugin` produces `bundle/index.js`, a single-file stdio MCP server that
`tooljet-agent` spawns per build; its tools call ToolJet's REST API with the PAT or session token the
agent passes. It also ships `skills/tooljet-app-builder/`, the skill the agent loads. An HTTP mode exists
for other clients; the agent uses stdio.

TypeScript; lets an agent change a ToolJet app directly (create apps, pages, components, queries,
events, ToolJet DB tables) instead of emitting a spec for ToolJet to apply.

## 2. Place in the stack

```
tooljet-agent :3004 ──stdio spawn──► tooljet-mcp bundle/index.js ──REST──► ToolJet :3310
Claude Code / Codex ──stdio (plugin)──► tooljet-mcp bundle/index.js ──REST──► ToolJet
ToolJet AI shim ──HTTP, gateway mode──► tooljet-mcp ──REST──► ToolJet
tooljet-mcp ──POST /internal/mcp/verify-origin──► ai-api-gateway   (only if MCP_GATEWAY_URL set)
```
No port under the agent.

## 3. How it works

### Who uses it

- **Coding-agent plugins.** The repo is its own marketplace: `.claude-plugin/marketplace.json` +
  `.claude-plugin/plugin.json` (Claude Code), `.codex-plugin/plugin.json` and
  `.agents/plugins/marketplace.json` (Codex). `mcp.json` launches the prebuilt
  `${PLUGIN_ROOT}/bundle/index.js` with `TOOLJET_URL`, `TOOLJET_DEPLOYMENT_URL`, `TOOLJET_PAT` — no
  npm install on the user's side.
- **PAT from ToolJet Settings.** Users mint a personal access token in ToolJet (Settings → Access
  tokens, `frontend/src/SettingsPage/AccessTokensCard.jsx`; API `server/ee/personal-access-tokens/controller.ts`).
- **tooljet-agent** spawns the bundle over stdio per build (see §2).

### Identity: writes land as a person

- A PAT is exchanged for a normal ToolJet session via `POST /api/personal-access-tokens/session`;
  a PAT is pinned to the workspace it was issued in (`src/auth.ts`, `src/config.ts` `Config.pat`).
- A pre-minted `sessionToken` (in-product path) needs a `workspaceId` alongside it and is
  short-lived; a 401 mid-build means the build outlived it (`src/config.ts` `Config.sessionToken`).
- Every write goes through ToolJet's REST API as that session, so audit logs attribute it to the
  PAT owner or signed-in user, never a system identity (`src/config.ts` `RequestIdentity` comment).

### Transports

| Entry | Start | Auth | Bind |
|---|---|---|---|
| stdio | `npm run dev` / `node bundle/index.js` | env `TOOLJET_PAT` or `TOOLJET_SESSION_TOKEN` | — (`src/index.ts` `StdioServerTransport`) |
| HTTP, direct mode | `MCP_TRANSPORT=http`, no `MCP_SHARED_TOKEN` | caller's PAT per request: `x-tooljet-pat` or `Authorization: Bearer` | `127.0.0.1` (`src/index.ts` `createGatewayHttpServer`) |
| HTTP, gateway mode | `MCP_TRANSPORT=http` + `MCP_SHARED_TOKEN` | bearer = shared token authenticates the caller; `x-tooljet-session` + `x-tooljet-workspace-id` name the user; PAT header refused | `0.0.0.0` (`src/index.ts`) |
| HTTP, standalone | `npm run dev:http` | PAT per request, no bearer gate | `TOOLJET_MCP_HTTP_HOST` ?? `127.0.0.1` (`src/http.ts`, `src/httpServer.ts`) |

Per-request headers (`src/config.ts`): `x-tooljet-session`, `x-tooljet-workspace-id`,
`x-tooljet-workspace-slug`, `x-tooljet-pat`, `x-tooljet-url`, `x-tooljet-customer-id`.
`identityFromHeaders` throws on session-without-workspace, workspace-without-session, and
PAT+session together — failing beats mis-attributing a build.

Gateway-mode gates (`src/index.ts` `createGatewayHttpServer`):
- `MCP_REQUIRE_USER_SESSION` (implied when no PAT/session in env) — reject requests with no user
  credential, unless the customer was verified via the gateway (old ToolJet versions send none).
- `MCP_REQUIRE_REQUEST_URL` — reject requests without `x-tooljet-url` rather than write into the
  static `TOOLJET_URL`.

### Origin verification

`x-tooljet-url` must be https with no query/hash/credentials; a path prefix is allowed for
`SUB_PATH` hosts (`src/config.ts` `validateApiUrl`). The origin must be in `MCP_ALLOWED_API_ORIGINS`
or pass the gateway's `/internal/mcp/verify-origin` for `x-tooljet-customer-id`
(`checkOriginWithGateway`). With only a customer id and no URL, the server resolves the host from the
gateway (`resolveApiUrlFromGateway`). The gateway check returns `false` when `MCP_GATEWAY_URL` or
`MCP_GATEWAY_TOKEN` is unset, fails closed on error/timeout, and caches verdicts per customer+origin —
a revoked customer can stay allowed up to 60 s (`gatewayOriginCache`, `GATEWAY_CACHE_TTL_MS`).

### Tools

56 tool definitions in `src/tools/index.ts` `registerTools`. The singular create tools
(`create_table`, `insert_rows`, `add_page`, `add_query`, `add_component`) are hidden unless
`TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=1` — agents get the batch versions
(`LEGACY_SINGULAR_CREATE_TOOL_NAMES`).

## 4. Run & test

```bash
npm install
npm run build:plugin        # tsc -> dist/, esbuild -> bundle/index.js
npm test                    # check:datasource-catalog && vitest run
npm run dev                 # stdio standalone (needs TOOLJET_URL + TOOLJET_PAT)
```
Rebuild the bundle after every pull — a stale bundle silently runs old tools (`ai-stack up` always rebuilds). Node ≥ 20.

## 5. Env vars (standalone / HTTP only — under the agent the session and workspace arrive per build)

| Var | Notes |
|---|---|
| `TOOLJET_URL` | ToolJet API origin, e.g. `http://localhost:3310` |
| `TOOLJET_DEPLOYMENT_URL` | deployment/frontend URL; `TOOLJET_APP_URL` is the deprecated alias |
| `TOOLJET_PAT` or `TOOLJET_SESSION_TOKEN` | auth |
| `TOOLJET_WORKSPACE_ID` / `TOOLJET_WORKSPACE_SLUG` | target workspace |
| `MCP_TRANSPORT` | `http` switches to HTTP mode |
| `TOOLJET_MCP_HTTP_PORT` (falls back to `PORT`, then 3001) | HTTP mode; 3001 collides with postgrest/gateway defaults |
| `MCP_ALLOWED_API_ORIGINS` | HTTP mode only: allow-list for `x-tooljet-url`; unset = empty |
| `MCP_SHARED_TOKEN` | turns HTTP into gateway mode (bearer gate, binds `0.0.0.0`) |
| `MCP_REQUIRE_USER_SESSION` / `MCP_REQUIRE_REQUEST_URL` | gateway-mode gates, see §3 |
| `MCP_HTTP_HOST` / `TOOLJET_MCP_HTTP_HOST` | bind host for `src/index.ts` / `src/http.ts` |
| `MCP_GATEWAY_URL` / `MCP_GATEWAY_TOKEN` | gateway origin check; token must equal the gateway's `MCP_GATEWAY_TOKEN` |
| `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS` | `1` exposes the singular create tools |

## 6. Gotchas

- **Stale bundle or branch:** `git pull`, `npm run build:plugin`; check `bundle/index.js` mtime first when a build behaves oddly.
- **Split-origin `tj_url`:** tools hit whatever URL the agent passes; the fix is agent-side (`MCP_AGENT_TOOLJET_URL_OVERRIDE`).
- **HTTP port 3001** clashes with the gateway default and the postgrest container.
- **Skill dir** is `skills/tooljet-app-builder/`; the agent derives it from `TOOLJET_MCP_DIR`.
- Origin verification (`customerVerified`) is off unless `MCP_GATEWAY_URL` is set; when set, the server calls the gateway's `/internal/mcp/verify-origin` with `MCP_GATEWAY_TOKEN` — see `src/config.ts`. Leave both unset locally.
- **PAT endpoint 404:** the instance predates PATs or `TOOLJET_URL` points at the frontend origin, not the API (`src/auth.ts` error text).
- **Gateway mode refuses `x-tooljet-pat`** with a 400 — a PAT names its owner for weeks, a session names the requester; send session + workspace headers (`src/config.ts` `identityFromHeaders`).
- **`x-tooljet-url` must be https**, so local `http://localhost` targets only work through the static `TOOLJET_URL`, not the header (`src/config.ts` `validateApiUrl`).
- **`src/http.ts` has no bearer gate** — keep it on loopback; use `MCP_TRANSPORT=http` + `MCP_SHARED_TOKEN` for anything off-box (`src/httpServer.ts` comment).

## 7. See also

`../tooljet-agent/ai-stack/SETUP.md`, https://github.com/ToolJet/tooljet-agent/pull/199.
