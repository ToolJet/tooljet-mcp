---
name: tooljet-app-builder
description: "Build a ToolJet app end-to-end via the tooljet-mcp tools — create an app, add a query against a datasource, and add components (e.g. a Table) bound to that query. Use whenever the user asks to build/scaffold a ToolJet app, dashboard, or internal tool, or to add pages/components/queries to one. Slice 1 covers a single-page app with a Table bound to a ToolJet-DB query."
metadata:
  slice: 1
  source_spec: docs/specs/2026-06-26-tooljet-mcp-slice1-design.md
---

## What this skill does

You build ToolJet apps by calling the `tooljet-mcp` tools. Every tool call goes through ToolJet's own governed API (your session, your permissions) — you never touch the database directly. ToolJet apps are **configuration over a fixed component library**, not code: you create an app, add queries on datasources, and add components whose properties bind to those queries.

## The ToolJet app model (what you're assembling)

- An **app** has a **version** and one or more **pages**. `create_app` gives you one app + a version + a "Home" page.
- A **component** (Table, Text, …) lives on a page and has **properties**. Property values that start with `{{ … }}` are **bindings** evaluated at runtime.
- A **query** runs against a **datasource** and exposes its result as `queries.<queryName>.data`.
- You wire data by binding a component property to a query: e.g. a Table's `data` property = `{{queries.<queryName>.data}}`.

## The tools

- `create_app(name)` → `{ app_id, version_id, home_page_id, app_url }`. Call this first; keep all four values.
- `list_datasources(version_id)` → `[{ id, name, kind }]`. Find the datasource you need. ToolJet DB is `kind: "tooljetdb"`.
- `get_component_catalog()` → the component types you can place and their key properties.
- `add_query({ version_id, datasource_id, name, options })` → `{ query_id, name }`. Creates a query. Use a clear `name` (letters/underscores) — you'll reference it in bindings as `{{queries.<name>.data}}`.
- `add_component({ app_id, version_id, page_id, name, type, properties, layout })` → `{ component_id }`. Places a component. `name` is REQUIRED.
- `get_app(app_id)` → the current app structure (for inspection).

## Recipe: a Table bound to a ToolJet-DB table

Goal: an app whose Home page shows the rows of a ToolJet-DB table (e.g. `tickets`).

1. `create_app("Tickets Dashboard")` → keep `app_id`, `version_id`, `home_page_id`, `app_url`.
2. `list_datasources(version_id)` → find the entry with `kind === "tooljetdb"`; keep its `id` (the datasource id).
3. `add_query`:
   ```json
   {
     "version_id": "<version_id>",
     "datasource_id": "<tooljetdb datasource id>",
     "name": "list_tickets",
     "options": { "operation": "list_rows", "table_name": "tickets", "list_rows": {}, "runOnPageLoad": true }
   }
   ```
   - `operation: "list_rows"` + `table_name` (the plain table name) lists all rows.
   - `runOnPageLoad: true` makes the query run when the app opens, so the Table populates automatically.
4. `add_component` — a Table bound to the query:
   ```json
   {
     "app_id": "<app_id>",
     "version_id": "<version_id>",
     "page_id": "<home_page_id>",
     "name": "ticketsTable",
     "type": "Table",
     "properties": {
       "data": { "value": "{{queries.list_tickets.data}}" },
       "dataSourceSelector": { "value": "rawJson" },
       "autogenerateColumns": { "value": true, "generateNestedColumns": true }
     },
     "layout": { "top": 10, "left": 2, "width": 40, "height": 400 }
   }
   ```
   - `layout` is in ToolJet grid units (width max ~43). `name` is required.

### ⚠️ Table binding rule (authoritative — from the agent's `COMPONENT_BINDING_RULES["Table"]`)
A Table renders data ONLY if you set **all three** together:
- `data.value` = `{{queries.<queryName>.data}}` — the row array binding
- `dataSourceSelector.value` = `"rawJson"` — **REQUIRED**; without it the table renders nothing even with `data` set
- `autogenerateColumns.value` = `true` (never `false`) — so columns render from the query rows automatically

Setting only `data` produces a **blank table**. (This is exactly the kind of hard-won rule that lives in the agent's binding rules — the MCP skill mirrors it.)
5. Tell the user: **open `app_url`** in the browser — the Table should render the table's rows.

## Rules & gotchas

- Always `create_app` first; thread `app_id` / `version_id` / `home_page_id` into later calls.
- A component `name` is required (a missing name is rejected).
- Bind by query **name**: `{{queries.<name>.data}}` (the name you passed to `add_query`).
- Bindings are strings wrapped in `{{ }}`; a Table's `data` must resolve to an array of row objects.
- You can fan out: independent `add_query` / `add_component` calls can be made in parallel once you have the app + version ids.
- Report the `app_url` back to the user so they can see the result.
