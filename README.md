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
TOOLJET_EMAIL=you@example.com
TOOLJET_PASSWORD=your-password
```

The default MCP profile keeps tool selection compact by exposing batch create tools only; every batch accepts a single item. Older clients can restore the redundant singular aliases with `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=true`.

## Register with Codex

Codex reads MCP servers from `~/.codex/config.toml`. Add:

```toml
[mcp_servers.tooljet]
command = "node"
args = ["/Users/navaneeth/Claude/Projects/tooljet-mcp/dist/index.js"]

[mcp_servers.tooljet.env]
TOOLJET_URL = "http://localhost:3000"
TOOLJET_APP_URL = "http://localhost:8082"
TOOLJET_EMAIL = "you@example.com"
TOOLJET_PASSWORD = "your-password"
```

Then install the skill so Codex knows how to drive the tools: copy `skill/SKILL.md` into your Codex skills directory (or point Codex at it). The skill teaches the app model + the build recipe.

Restart Codex; it should expose the ToolJet tools, including `create_app`, `list_datasources`, `get_datasource_query_schema`, `get_component_catalog`, `lint_app_spec`, the batch authoring tools, and `validate_app`.

## Install as a Claude Code plugin

This repo is also a **self-contained Claude Code plugin** — installing it registers the MCP server *and* the `tooljet-app-builder` skill together. No `npm install`/build on the user's side: a single-file bundle (`bundle/index.js`) plus the runtime catalogs in `data/` are committed.

**Install (no marketplace needed):**
```
/plugin install github:ToolJet/mcp-v2
```
Or via the marketplace, which lets you get updates:
```
/plugin marketplace add ToolJet/mcp-v2
/plugin install tooljet-app-builder@tooljet
```
For local development you can also install from a path: `/plugin install path:/Users/you/Claude/Projects/tooljet-mcp`.

**Provide credentials.** A plugin cannot prompt for secrets, so the MCP server reads them from your environment (the `TOOLJET_URL`/`TOOLJET_APP_URL` default to localhost). Before launching Claude Code:
```bash
export TOOLJET_EMAIL="you@example.com"
export TOOLJET_PASSWORD="your-password"
# optional, if not localhost:
export TOOLJET_URL="https://your-instance.tooljet.com"
export TOOLJET_APP_URL="https://your-instance.tooljet.com"
```
If either credential is missing, the server exits during startup with a clear required-variable error. Set both and restart.

**What ships / how it's built.** `bundle/index.js` is an esbuild single-file bundle of the server (all deps inlined, so it runs with no `node_modules`); it reads the component/datasource schemas and component compatibility metadata from `data/` at runtime; the skill lives at `skills/tooljet-app-builder/`. Rebuild all of that after a source or catalog change with:
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
| `list_workspaces()` / `use_workspace(workspace_id)` | Inspect or switch the active ToolJet workspace |
| `create_app(name)` | New app + version + Home page → ids plus explicit `editor_url` and `viewer_url` (`app_url` remains an editor alias) |
| `list_datasources(version_id)` | Workspace sources available automatically to new/existing apps; no per-app linking |
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

## Development

```bash
npm test          # vitest (unit tests, mocked HTTP)
npm run build     # tsc → dist/
npm run dev       # tsx src/index.ts (stdio server)
npm run generate:catalogs  # refresh component + datasource contracts from local ToolJet source
```

Endpoint implementation notes and their evidence level are in `docs/contracts.md`; current mocked contract tests are the regression source of truth.
