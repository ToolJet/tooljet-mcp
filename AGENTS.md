# tooljet-mcp — AGENTS.md

## 1. Purpose

The tool layer. `npm run build:plugin` produces `bundle/index.js`, a single-file stdio MCP server that
`tooljet-agent` spawns per build; its tools call ToolJet's REST API with the PAT or session token the
agent passes. It also ships `skills/tooljet-app-builder/`, the skill the agent loads. An HTTP mode exists
for other clients; the agent uses stdio.

## 2. Place in the stack

```
tooljet-agent :3004 ──stdio spawn──► tooljet-mcp bundle/index.js ──REST──► ToolJet :3310
```
No port under the agent.

## 3. Run & test

```bash
npm install
npm run build:plugin        # tsc -> dist/, esbuild -> bundle/index.js
npm test                    # check:datasource-catalog && vitest run
npm run dev                 # stdio standalone (needs TOOLJET_URL + TOOLJET_PAT)
```
Rebuild the bundle after every pull — a stale bundle silently runs old tools (`ai-stack up` always rebuilds). Node ≥ 20.

## 4. Env vars (standalone / HTTP only — under the agent the session and workspace arrive per build)

| Var | Notes |
|---|---|
| `TOOLJET_URL` | ToolJet API origin, e.g. `http://localhost:3310` |
| `TOOLJET_DEPLOYMENT_URL` | deployment/frontend URL; `TOOLJET_APP_URL` is the deprecated alias |
| `TOOLJET_PAT` or `TOOLJET_SESSION_TOKEN` | auth |
| `TOOLJET_WORKSPACE_ID` / `TOOLJET_WORKSPACE_SLUG` | target workspace |
| `MCP_TRANSPORT` | `http` switches to HTTP mode |
| `TOOLJET_MCP_HTTP_PORT` (falls back to `PORT`, then 3001) | HTTP mode; 3001 collides with postgrest/gateway defaults |
| `MCP_ALLOWED_API_ORIGINS` | HTTP mode only: allow-list for `x-tooljet-url`; unset = empty |

## 5. Gotchas

- **Stale bundle or branch:** `git pull`, `npm run build:plugin`; check `bundle/index.js` mtime first when a build behaves oddly.
- **Split-origin `tj_url`:** tools hit whatever URL the agent passes; the fix is agent-side (`MCP_AGENT_TOOLJET_URL_OVERRIDE`).
- **HTTP port 3001** clashes with the gateway default and the postgrest container.
- **Skill dir** is `skills/tooljet-app-builder/`; the agent derives it from `TOOLJET_MCP_DIR`.
- Origin verification (`customerVerified`) is off unless `MCP_GATEWAY_URL` is set; when set, the server calls the gateway's `/internal/mcp/verify-origin` with `MCP_GATEWAY_TOKEN` — see `src/config.ts`. Leave both unset locally.

## 6. See also

`../tooljet-agent/ai-stack/SETUP.md`.
