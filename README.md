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
If those aren't set, the server starts but every ToolJet call fails auth — set them and restart.

**What ships / how it's built.** `bundle/index.js` is an esbuild single-file bundle of the server (all deps inlined, so it runs with no `node_modules`); it reads `data/component-schemas.json` and `data/datasource-schemas.json` at runtime; the skill lives at `skills/tooljet-app-builder/`. Rebuild all of that after a source or catalog change with:
```bash
npm run generate:catalogs && npm run generate:skill && npm run build:plugin
```
The plugin manifest is `.claude-plugin/plugin.json` (declares the MCP server via `${CLAUDE_PLUGIN_ROOT}/bundle/index.js`); the marketplace catalog is `.claude-plugin/marketplace.json`.

## Demo

In Codex:

> **Build me a tickets dashboard on my ToolJet DB.**

Codex should: `list_datasources` → `create_app` → `add_query` (ToolJet-DB `list_rows` on `tickets`) → `add_component` (a Table bound to `{{queries.<name>.data}}`), then return an `app_url`. Open it at `http://localhost:8082/apps/…` — the Table renders the seeded tickets.

## Tools

| Tool | Purpose |
|---|---|
| `list_workspaces()` / `use_workspace(workspace_id)` | Inspect or switch the active ToolJet workspace |
| `create_app(name)` | New app + version + Home page → `{ app_id, version_id, home_page_id, app_url }` |
| `list_datasources(version_id)` | Workspace sources available automatically to new/existing apps; no per-app linking |
| `get_datasource_query_schema({datasource_id, version_id, operation?, sections?})` | Fetch compact request contracts plus response shape/status when known; also supports kind lookup and batches |
| `inspect_datasource_schema({datasource_id, version_id, method, ...})` | Invoke one plugin-advertised read-only metadata method (schemas/tables/columns/collections) |
| `list_tables()` / `get_table_schema(table_name)` | Inspect ToolJet DB tables, constraints, defaults, and relationships |
| `create_table(...)` / `create_tables(...)` / `add_table_column(...)` | Create or evolve ToolJet DB data models; the batch preflights dependencies before writes |
| `insert_rows(...)` / `insert_rows_batch(...)` | Seed one or several ToolJet DB tables in parent-before-child order |
| `drop_table_column(..., confirm:true)` / `drop_table(..., confirm:true)` | Explicitly confirmed destructive ToolJet DB cleanup |
| `get_component_catalog({type?, types?, sections?, ...})` | Component palette or selective one/batched contracts, including nested `authoringHints` |
| `generate_form_schema({table_name, mode, ...})` | Generate one schema-driven create/edit Form from a ToolJet DB table |
| `lint_app_spec(...)` / `validate_app(app_id)` | Dry-run a logical plan before writes; statically validate the persisted app afterwards |
| `get_app_summary({app_id, sections?, filters?, *_fields?})` | Selectively inspect actual persisted values |
| `add_page(..., icon)` / `add_pages(...)` | Add one page during edits or batch the initial sidebar/page structure |
| `add_query(...)` / `add_queries(...)` | Create datasource queries; use the schema tool for `options` |
| `add_component(...)` / `add_components(...)` | Place components, including atomic parent/child batches and native header/body/footer slots |
| `add_events(...)` / `add_query_lifecycles(...)` | Add arbitrary interactions or expand standard mutation success/failure flows in one batch |
| `update_*` / `delete_*` / `run_query(...)` | Repair apps in place; execute only explicitly selected safe reads for verification |

## Development

```bash
npm test          # vitest (unit tests, mocked HTTP)
npm run build     # tsc → dist/
npm run dev       # tsx src/index.ts (stdio server)
npm run generate:catalogs  # refresh component + datasource contracts from local ToolJet source
```

Confirmed ToolJet endpoint contracts are in `docs/contracts.md` (all verified live).
