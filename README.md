# tooljet-mcp

An MCP server that lets a coding agent (Codex, Claude Code, …) build and maintain **ToolJet** apps through ToolJet's governed APIs: workspaces, apps/pages, datasource queries, ToolJet DB tables, components, layouts, and lifecycle events. It includes generated component and datasource catalogs so agents use first-party contracts instead of guessing configuration keys.

## Prerequisites

- A running local ToolJet (backend on `:3000`, frontend on `:8082`, Postgres, PostgREST).
- ToolJet admin credentials.
- Node 22 (`nvm use default`).
- A seeded `tickets` ToolJet-DB table for the demo — see `scripts/seed-tickets.md` (already seeded on this machine).

## Setup

```bash
cd ~/Claude/Projects/tooljet-mcp
cp .env.example .env        # then edit .env with your creds
npm install
npm run build               # compiles to dist/
```

`.env`:
```
TOOLJET_URL=http://localhost:3000        # backend API origin
TOOLJET_APP_URL=http://localhost:8082    # frontend origin (for app links)
TOOLJET_PAT=tj_pat_...                   # Settings -> Access tokens, in the target workspace
```

The default MCP profile keeps tool selection compact by exposing batch create tools only; every batch accepts a single item. Older clients can restore the redundant singular aliases with `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=true`.

## Register with Codex

Codex reads MCP servers from `~/.codex/config.toml`. Add:

```toml
[mcp_servers.tooljet]
command = "node"
args = ["/absolute/path/to/tooljet-mcp/bundle/index.js"]

[mcp_servers.tooljet.env]
TOOLJET_URL = "http://localhost:3000"
TOOLJET_APP_URL = "http://localhost:8082"
TOOLJET_PAT = "tj_pat_..."
```

Then install the skill so Codex knows how to drive the tools: copy the complete `skill/` directory into your Codex skills directory (or use `npm run sync:skill`). Its compact entry point progressively loads focused references for tables, forms, events, datasources, security, and QA.

Restart Codex; it should expose the ToolJet tools, including `create_app`, `list_datasources`, `get_datasource_query_schema`, `get_component_catalog`, `lint_app_spec`, the batch authoring tools, and `validate_app`.

## Run over Streamable HTTP

The same MCP server can also run as a stateful Streamable HTTP service. It uses the same ToolJet environment variables and authentication flow as stdio; only the MCP transport changes.

```bash
npm run build
npm run start:http
```

The defaults are:

- MCP endpoint: `http://127.0.0.1:3001/mcp`
- Health endpoint: `http://127.0.0.1:3001/health`

Set `TOOLJET_MCP_HTTP_HOST` and `TOOLJET_MCP_HTTP_PORT` (or `PORT`) to change the listener. For a container or remote agent deployment, bind to `0.0.0.0` and put authentication/TLS at the service boundary before exposing the endpoint publicly.

Each Streamable HTTP session gets its own MCP server instance, while all ToolJet API authentication remains exactly the same as the stdio mode.

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

**Provide credentials.** A plugin cannot prompt for secrets, so the MCP server reads them from your environment (the `TOOLJET_URL`/`TOOLJET_APP_URL` default to localhost). Before launching Claude Code:
```bash
export TOOLJET_PAT="tj_pat_..."
# optional, if not localhost:
export TOOLJET_URL="https://your-instance.tooljet.com"
export TOOLJET_APP_URL="https://your-instance.tooljet.com"
```
If either credential is missing, the server exits during startup with a clear required-variable error. Set both and restart.

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

## Development

```bash
npm test          # vitest (unit tests, mocked HTTP)
npm run build     # tsc → dist/
npm run dev       # tsx src/index.ts (stdio server)
npm run dev:http  # tsx src/http.ts (Streamable HTTP server)
npm run generate:catalogs  # refresh component + datasource contracts from local ToolJet source
```

Endpoint implementation notes and their evidence level are in `docs/contracts.md`; current mocked contract tests are the regression source of truth.
