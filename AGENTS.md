# tooljet-mcp — AGENTS.md

Boundaries and traps only. Values and mechanics live in the code; when this file and the code disagree, trust the code.
Local whole-stack setup: ToolJet/tooljet-agent, `ai-stack/SETUP.md`.

## 1. Purpose

The tool layer. `npm run build:plugin` produces `bundle/index.js`, a single-file stdio MCP server that
`tooljet-agent` spawns per build; its tools call ToolJet's REST API with the PAT or session token the
agent passes, so an agent changes a ToolJet app directly instead of emitting a spec. It also ships
`skills/tooljet-app-builder/`, the skill (system prompt) the agent loads. The repo is also its own
Claude Code / Codex plugin marketplace (`.claude-plugin/`, `.codex-plugin/`, `mcp.json` runs the prebuilt bundle).

## 2. Place in the stack

```
tooljet-agent ──stdio spawn──► tooljet-mcp bundle/index.js ──REST──► ToolJet
Claude Code / Codex ──stdio (plugin)──► tooljet-mcp bundle/index.js ──REST──► ToolJet
ToolJet AI shim ──HTTP, gateway mode──► tooljet-mcp ──REST──► ToolJet
tooljet-mcp ──POST /internal/mcp/verify-origin──► ai-api-gateway   (only if MCP_GATEWAY_URL set)
```

## 3. How it works

- **Writes land as a person.** A PAT is exchanged for a ToolJet session (pinned to the workspace it was
  issued in); an in-product `sessionToken` needs a `workspaceId` and is short-lived, so a 401 mid-build
  means the build outlived it. Never add a system identity (`src/auth.ts`, `src/config.ts` `RequestIdentity`).
- **Transports** (`src/index.ts`): stdio (what the agent uses); `MCP_TRANSPORT=http` without
  `MCP_SHARED_TOKEN` = direct mode, PAT per request, loopback; with it = gateway mode, bearer gate, binds
  `0.0.0.0`, user named by `x-tooljet-session` + `x-tooljet-workspace-id`. `npm run dev:http`
  (`src/http.ts`) is a separate standalone server with no bearer gate.
- `identityFromHeaders` (`src/config.ts`) throws on session-without-workspace, workspace-without-session
  and PAT+session together: failing beats mis-attributing a build.
- **Origin verification:** `x-tooljet-url` must pass `validateApiUrl` and be in `MCP_ALLOWED_API_ORIGINS`
  or be verified by the gateway for `x-tooljet-customer-id` (`checkOriginWithGateway`). The gateway check
  fails closed and caches verdicts, so a revoked customer stays allowed until the cache TTL expires
  (`GATEWAY_CACHE_TTL_MS`).
- **Tools:** `src/tools/index.ts` `registerTools`. Singular create tools are hidden unless
  `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=1`; agents get the batch versions.

## 4. Run & test

```bash
npm install
npm run build:plugin        # tsc -> dist/, esbuild -> bundle/index.js
npm test
npm run dev                 # stdio standalone (needs TOOLJET_URL + TOOLJET_PAT)
```
Rebuild the bundle after every pull: a stale bundle silently runs old tools.

## 5. Env vars (standalone / HTTP only — under the agent the session and workspace arrive per build)

| Var | Notes |
|---|---|
| `TOOLJET_URL` | ToolJet API origin, not the frontend origin |
| `TOOLJET_DEPLOYMENT_URL` | deployment/frontend URL; `TOOLJET_APP_URL` is the deprecated alias |
| `MCP_ALLOWED_API_ORIGINS` | HTTP mode allow-list for `x-tooljet-url`; unset = empty |
| `MCP_SHARED_TOKEN` | turns HTTP into gateway mode (bearer gate, binds `0.0.0.0`) |
| `MCP_REQUIRE_USER_SESSION` / `MCP_REQUIRE_REQUEST_URL` | gateway-mode gates: reject requests with no user credential / no `x-tooljet-url` (instead of writing into the static `TOOLJET_URL`) |
| `MCP_GATEWAY_URL` / `MCP_GATEWAY_TOKEN` | gateway origin check; off unless both set; token must equal the gateway's `MCP_GATEWAY_TOKEN` |

## 6. Gotchas

- **Stale bundle or branch:** `git pull`, `npm run build:plugin`; check `bundle/index.js` mtime first when a build behaves oddly.
- **Split-origin `tj_url`:** tools hit whatever URL the agent passes; the fix is agent-side (`MCP_AGENT_TOOLJET_URL_OVERRIDE`).
- **Skill dir** is `skills/tooljet-app-builder/`; the agent derives it from `TOOLJET_MCP_DIR`.
- **PAT endpoint 404:** the instance predates PATs or `TOOLJET_URL` points at the frontend origin, not the API (`src/auth.ts`).
- **Gateway mode refuses `x-tooljet-pat`** with a 400: a PAT names its owner for weeks, a session names the requester (`identityFromHeaders`).
- **`x-tooljet-url` must be https**, so plain-http targets only work through the static `TOOLJET_URL` (`validateApiUrl`).
- **`src/http.ts` has no bearer gate:** keep it on loopback; use `MCP_TRANSPORT=http` + `MCP_SHARED_TOKEN` for anything off-box.
- **HTTP port default** (`TOOLJET_MCP_HTTP_PORT`, falls back to `PORT`) can clash with other local services; set it explicitly.

## 7. See also

ToolJet/tooljet-agent, `ai-stack/SETUP.md` (whole-stack overview and local setup).
