# tooljet-mcp

An MCP server that lets a coding agent (Codex, Claude Code, …) build and maintain **ToolJet** apps through ToolJet's governed APIs: workspaces, apps/pages, datasource queries, ToolJet DB tables, components, layouts, and lifecycle events. It includes generated component and datasource catalogs so agents use first-party contracts instead of guessing configuration keys.

## Prerequisites

- A ToolJet instance with personal access token support.
- A personal access token for the target ToolJet workspace.
- Node.js 20 or newer.

## Setup

```bash
git clone https://github.com/ToolJet/tooljet-mcp.git
cd tooljet-mcp
cp .env.example .env        # then edit .env with your creds
npm install
npm run build               # compiles to dist/
```

`.env`:
```
TOOLJET_URL=http://localhost:3000        # your ToolJet deployment
TOOLJET_PAT=tj_pat_...                   # Settings -> Access tokens, in the target workspace
# Only needed if the UI is served from a different origin than TOOLJET_URL (defaults to it otherwise):
# TOOLJET_DEPLOYMENT_URL=http://localhost:8082
```

The default MCP profile keeps tool selection compact by exposing batch create tools only; every batch accepts a single item. Older clients can restore the redundant singular aliases with `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=true`.

## Install as a Codex plugin

This repo is a self-contained **Codex plugin** that registers the bundled MCP server and the
`tooljet-app-builder` skill together. The Codex manifest is `.codex-plugin/plugin.json`, and
`.mcp.json` launches `bundle/index.js` without requiring an install or build on the user's side.

No public listing is needed: `.agents/plugins/marketplace.json` makes the repo its own marketplace.

```bash
codex plugin marketplace add ToolJet/tooljet-mcp --ref main
codex plugin add tooljet-app-builder@tooljet
```

On Codex desktop, run the marketplace command, restart the app, open Plugins, select the ToolJet
source and install **ToolJet App Builder**. In Codex CLI you can also install it from `/plugins`.

Before launching Codex, provide the same credentials used by the standalone MCP server:

```bash
export TOOLJET_DEPLOYMENT_URL="https://your-instance.tooljet.com"
export TOOLJET_PAT="tj_pat_..."
# only needed if the API lives on a different origin than TOOLJET_DEPLOYMENT_URL above:
# export TOOLJET_URL="https://api.your-instance.tooljet.com"
```

The plugin passes these environment variables to the MCP process; it does not store or change the
credential. Node 20 or newer must be available to Codex.

### Manual Codex registration

Codex reads MCP servers from `~/.codex/config.toml`. Add:

```toml
[mcp_servers.tooljet]
command = "node"
args = ["/absolute/path/to/tooljet-mcp/bundle/index.js"]

[mcp_servers.tooljet.env]
TOOLJET_DEPLOYMENT_URL = "https://your-instance.tooljet.com"
TOOLJET_PAT = "tj_pat_..."
# only if the API lives on a different origin than TOOLJET_DEPLOYMENT_URL above:
# TOOLJET_URL = "https://api.your-instance.tooljet.com"
```

Then install the skill so Codex knows how to drive the tools: copy the complete `skill/` directory into your Codex skills directory (or use `npm run sync:skill`). Its compact entry point progressively loads focused references for tables, forms, events, datasources, security, and QA.

Restart Codex; it should expose the ToolJet tools, including `create_app`, `list_datasources`, `get_datasource_query_schema`, `get_component_catalog`, `lint_app_spec`, the batch authoring tools, and `validate_app`.

## Run over Streamable HTTP

Two HTTP shapes, for two different jobs. Both authenticate the same way stdio does; what changes is
where the credential comes from.

**Direct mode** is you running the server and your own agent connecting to it. The shipped bundle
does this, so it needs nothing beyond Node:

```bash
MCP_TRANSPORT=http PORT=8787 TOOLJET_URL=http://localhost:3000 TOOLJET_PAT=tj_pat_... \
  node bundle/index.js
```

It binds `127.0.0.1` (override with `MCP_HTTP_HOST`) and serves `http://127.0.0.1:8787/mcp`. The
credential may come from either side:

- `TOOLJET_PAT` in the server's environment, or
- per request from the client, as `Authorization: Bearer <pat>` or `x-tooljet-pat: <pat>`

A per-request token replaces the process one outright rather than merging with it, so one server can
serve several people without any of them inheriting another's identity.

**Gateway mode** is one shared server fronting an instance, called only by ToolJet's AI shim. Set
`MCP_SHARED_TOKEN`: the server then binds `0.0.0.0`, requires that token as `Authorization: Bearer`,
and takes the acting user from `x-tooljet-session` plus `x-tooljet-workspace-id`. It rejects
`x-tooljet-pat` outright: a PAT names its owner and lives for weeks, so honouring one here would
attribute a build to a token holder rather than to the person who asked for it.

There is also `npm run start:http` (`src/http.ts`, port 3001, loopback, `TOOLJET_MCP_HTTP_HOST` /
`TOOLJET_MCP_HTTP_PORT`, plus a `/health` endpoint) for local development. It accepts the same
per-request credentials and, like direct mode, has no bearer gate of its own.

## Install as a Copilot / VS Code agent plugin

`plugin.json` and `mcp.json` at the repo root follow the [Agent Plugins 1.0](https://agent-plugins.org)
format, which VS Code, Copilot CLI and the Copilot app share. Install with **Chat: Install Plugin
From Source** (or the Plugins tab of the Agent Customizations editor) and give it this repo's URL.

Skills are discovered from `skills/`, so the same `skills/tooljet-app-builder` that Claude Code loads
is picked up here with no second copy. Set `TOOLJET_DEPLOYMENT_URL` and `TOOLJET_PAT` in the
environment the editor launches from (`TOOLJET_URL` too, only if the API is on a different origin
than `TOOLJET_DEPLOYMENT_URL`); unset or blank values fall back to the server's own defaults, and a
missing token is reported at handshake rather than killing the server.

## Install as a Claude Code plugin

This repo is also a **self-contained Claude Code plugin** — installing it registers the MCP server *and* the `tooljet-app-builder` skill together. No `npm install`/build on the user's side: a single-file bundle (`bundle/index.js`) plus the runtime catalogs in `data/` are committed.

**Install (no marketplace needed):**
```
/plugin install github:ToolJet/tooljet-mcp
```
Or via the marketplace, which lets you get updates:
```
/plugin marketplace add ToolJet/tooljet-mcp
/plugin install tooljet-app-builder@tooljet
```
For local development you can also install from a path: `/plugin install path:/absolute/path/to/tooljet-mcp`.

**Provide credentials.** A plugin cannot prompt for secrets, so the MCP server reads them from your environment (`TOOLJET_DEPLOYMENT_URL` defaults to localhost; `TOOLJET_URL` defaults to `TOOLJET_DEPLOYMENT_URL`). Before launching Claude Code:
```bash
export TOOLJET_DEPLOYMENT_URL="https://your-instance.tooljet.com"
export TOOLJET_PAT="tj_pat_..."
# only needed if the API lives on a different origin than TOOLJET_DEPLOYMENT_URL above:
# export TOOLJET_URL="https://api.your-instance.tooljet.com"
```
If `TOOLJET_DEPLOYMENT_URL` and `TOOLJET_PAT` are missing, the server exits during startup with a clear required-variable error. Set them and restart.

**What ships / how it's built.** `bundle/index.js` is an esbuild single-file bundle of the server (all deps inlined, so it runs with no `node_modules`); it reads the component/datasource schemas and component compatibility metadata from `data/` at runtime. `generate:skill` writes both `skill/` and the packaged `skills/tooljet-app-builder/` from the same source, including every focused reference. Rebuild all of that after a source or catalog change with:
```bash
npm run generate:catalogs && npm run generate:skill && npm run build:plugin
```
The plugin manifest is `.claude-plugin/plugin.json` (declares the MCP server via `${CLAUDE_PLUGIN_ROOT}/bundle/index.js`); the marketplace catalog is `.claude-plugin/marketplace.json`.

## Demo

In Codex:

> **Build me a tickets dashboard on my ToolJet DB.**

Codex should: `list_datasources` → `create_app` → `lint_app_spec` → `apply_app_phase`, using `add_queries`/`add_components` for later targeted additions. `create_app` returns an editor link for following the build and a viewer link for testing the completed page.

## Tools

| Tool | Purpose |
|---|---|
| `list_workspaces()` / `use_workspace(workspace_id)` | Inspect or switch the active ToolJet workspace; results include its manual datasource-settings URL |
| `manage_app_permissions(...)` | List eligible users/groups and inspect, restrict, or clear page/query/component access; mutations are confirmed and license-gated |
| `list_workspace_apps(...)` | List apps in the workspace pinned to the current PAT |
| `list_workspace_users(...)` | List/search workspace users with pagination and status filtering through PAT auth |
| `manage_workspace_users(...)` | Invite/update/archive workspace users through PAT auth; mutations require confirmation and remain subject to ToolJet role checks |
| `create_app(name)` | New app + version + Home page → ids, explicit editor/viewer links, and the workspace datasource-settings URL (`app_url` remains an editor alias) |
| `list_datasources(version_id)` | Workspace sources available automatically to new/existing apps, each with a direct settings URL; no per-app linking |
| `get_datasource_query_schema({datasource_id, version_id, operation?, sections?})` | Fetch compact request contracts plus response shape/status when known; also supports kind lookup and batches |
| `inspect_datasource_schema({datasource_id, version_id, method, ...})` | Invoke one plugin-advertised read-only metadata method (schemas/tables/columns/collections) |
| `list_tables()` / `get_table_schema(table_name)` | Inspect ToolJet DB tables, constraints, defaults, and relationships |
| `create_tables(...)` / `add_table_column(...)` | Create one or more ToolJet DB tables or evolve an existing model; the batch preflights dependencies before writes |
| `insert_rows_batch(...)` | Insert-only seed writes for one or several ToolJet DB tables; generated serial keys use the real sequence and conflicts fail loudly |
| `drop_table_column(..., confirm:true)` / `drop_table(..., confirm:true)` | Explicitly confirmed destructive ToolJet DB cleanup |
| `get_component_catalog({type?, types?, sections?, ...})` | Component palette or selective one/batched contracts, including nested `authoringHints` |
| `generate_form_schema({table_name, mode, ...})` | Generate one schema-driven create/edit Form from a ToolJet DB table |
| `lint_app_spec(...)` / `apply_app_phase(...)` / `validate_app(app_id)` | Dry-run a logical phase, apply its one-time plan token, then statically validate persisted state |
| `get_app_summary({app_id, sections?, filters?, *_fields?})` | Selectively inspect actual persisted values |
| `add_pages(...)` / `update_pages(...)` | Add one or more pages, then restyle, hide, rename, or reorder existing sidebar pages (including Home) |
| `delete_page(..., confirm:true)` | Permanently delete one non-Home/non-group page after checking event and component references |
| `add_queries(...)` | Create one or more datasource queries; use the schema tool for `options` |
| `add_components(...)` / `add_component_batches(...)` | Place one page or several independent pages, including atomic parent/child batches and native header/body/footer slots |
| `add_events(...)` / `add_query_lifecycles(...)` | Add arbitrary interactions or expand standard mutation success/failure flows in one batch |
| `update_*` / confirmed `delete_*` / `run_query(...)` | Repair apps in place; require exact-target confirmation for deletion and explicit approval for large/billable reads |

Workspace theme creation and management are exposed through `manage_theme`; applying a theme to an app remains part
of `update_app_settings`. The definition structure and token-backed styling guidance are documented in
[`docs/theme-api-tool.md`](docs/theme-api-tool.md).

## Privacy Policy

This connector is covered by ToolJet's privacy policy: [tooljet.com/privacy](https://tooljet.com/privacy).

## Development

```bash
npm test          # vitest (unit tests, mocked HTTP)
npm run build     # tsc → dist/
npm run dev       # tsx src/index.ts (stdio server)
npm run dev:http  # tsx src/http.ts (Streamable HTTP server)
npm run generate:catalogs  # refresh component + datasource contracts from local ToolJet source
```

Endpoint implementation notes and their evidence level are in `docs/contracts.md`; current mocked contract tests are the regression source of truth.
