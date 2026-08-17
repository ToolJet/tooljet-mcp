# tooljet-mcp

An MCP server that lets a coding agent (Codex, Claude Code, …) build **ToolJet** apps end-to-end through ToolJet's own governed API — create an app, add a query on a datasource, add components bound to it. No direct DB writes; every action goes through the same endpoints the ToolJet builder uses, so your permissions and validation apply.

**Slice 1** scope: from one prompt, create a single-page app with a Table bound to a ToolJet-DB query that renders real rows. See `docs/specs/` and `docs/plans/`.

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

Restart Codex; it should list the `tooljet` server's tools: `create_app`, `list_datasources`, `get_component_catalog`, `get_app`, `add_query`, `add_component`.

## Demo

In Codex:

> **Build me a tickets dashboard on my ToolJet DB.**

Codex should: `list_datasources` → `create_app` → `add_query` (ToolJet-DB `list_rows` on `tickets`) → `add_component` (a Table bound to `{{queries.<name>.data}}`), then return an `app_url`. Open it at `http://localhost:8082/apps/…` — the Table renders the seeded tickets.

## Tools

| Tool | Purpose |
|---|---|
| `create_app(name)` | New app + version + Home page → `{ app_id, version_id, home_page_id, app_url }` |
| `list_datasources(version_id)` | Datasources incl. ToolJet DB (`kind: tooljetdb`) |
| `get_component_catalog()` | Placeable component types + key props |
| `get_app(app_id)` | Current app structure |
| `add_query({version_id, datasource_id, name, options})` | Create a query |
| `add_component({app_id, version_id, page_id, name, type, properties, layout})` | Place a component |

## Development

```bash
npm test          # vitest (unit tests, mocked HTTP)
npm run build     # tsc → dist/
npm run dev       # tsx src/index.ts (stdio server)
```

Confirmed ToolJet endpoint contracts are in `docs/contracts.md` (all verified live).

## Not in slice 1

Browser preview/self-correct loop, ServiceNow (and other datasources), styling/events/multi-page, custom components. All additive on top of this.
