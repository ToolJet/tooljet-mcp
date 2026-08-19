# Datasources and query contracts

Read this when selecting, connecting, introspecting, or authoring datasource queries. Fetch operation contracts on demand instead of loading unrelated datasource schemas.

## Missing or broken datasource recovery

`list_workspaces` returns `datasources_url`; `list_datasources` returns a direct `settings_url` for each source; failed query runs may return `recovery:{action:"open_datasource_settings",url,instruction}`.

When the expected datasource is absent or a connection-backed query fails, explain the failure and ask the user to repair it. If the host has a built-in browser, open the most specific returned URL there; otherwise send the clickable link. Navigation is the only automated action: never enter credentials, authorize OAuth, test the connection, or save settings for the user. Wait for the user to confirm the repair, then refresh `list_datasources` and retry at most one explicitly selected safe read. If it still fails, report the error instead of looping.

### Large-data read safety

- Inspect the table/schema first and request only the columns the app needs. Never author or execute `SELECT *` against an unfamiliar table; `run_query` refuses it even when a limit is present.
- When row count is unknown, create a cheap same-source `COUNT(*)` (or ToolJet DB count aggregate) query before running an unbounded row query. Pass its id as `count_query_id`; MCP runs the count first and does not execute the target on a failed, ambiguous, or mismatched count.
- Treat more than 1,000 rows—or a remote/growing table likely to cross that size—as server-side-pagination territory. Prefer a bounded preview plus page/count queries instead of loading the full dataset into the app or agent context.
- If a full read above the threshold is genuinely required, tell the user the observed row count and why pagination is not sufficient, then ask explicitly. Set `user_confirmed_large_read:true` only after that answer; general permission to build or inspect an app is not consent for a large read.
- For BigQuery, Snowflake, or Redshift, separately explain that even a bounded verification read can incur cost and ask before setting `user_confirmed_billable_read:true`. Large-read approval does not imply billable-read approval, or vice versa.

## Datasource query reference

`add_queries` works on **any ALREADY-CONNECTED datasource** — ToolJet DB, PostgreSQL, MySQL, MongoDB, ServiceNow, RunJS, etc. The query **kind is taken from the datasource automatically** (you don't pass it; call `list_datasources` to see each datasource's `kind`). Only the `options` differ per kind:

Workspace-connected datasources available to the current user and selected environment are automatically available to both existing and newly created apps. Do **not** look for or invent a per-app datasource linking step: after `create_app`, call `list_datasources(version_id)` and pass the returned `id` to `add_queries`. An expected source missing from that result indicates the wrong workspace, insufficient permission, an unconnected source, or missing environment configuration—not a missing app attachment. Use the returned workspace `datasources_url` or datasource `settings_url` for a user-owned repair handoff; never configure credentials or OAuth yourself.

> **You can only use datasources that are already connected — these tools cannot create or connect a new datasource or third-party integration** (e.g. Strava, Stripe, a new REST API, a Google Sheet). If the user asks to build on a source that isn't in `list_datasources`:
> - **Say so plainly** — ToolJet has no native integration for it (or it simply isn't connected), and you can't connect one from here. Don't fabricate a query against it or present placeholder data as if it were live.
> - **Offer the real paths:** (a) the user connects it in ToolJet first — for a third-party API that usually means a **REST API datasource** pointed at that API; auth/OAuth is a manual setup step and you must **never handle credentials yourself** — then you build queries + UI against it; or (b) build the app's full UI and structure **now** against a **ToolJet DB table seeded with representative sample data**, clearly labelled as placeholder, so it's ready to rewire to the real source later. Confirm which the user prefers.
- **tooljetdb** — `{ operation: "list_rows", table_id: "<id>", list_rows: { limit: 25, offset: 0 }, runOnPageLoad: true }` (bounded preview; see below)
- **postgresql / mysql** — `{ mode: "sql", query: "SELECT …", query_params: [], runOnPageLoad: true }`
- **runjs** — `{ code: "return queries.q1.data.filter(r => r.status === 'Open').length;" }` (great for chart aggregation — reference other queries' data, return a shaped value). Plain `queries.q1` reads inside RunJS code are **not inferred as reactive dependencies**: `runOnDependencyChange:true` alone can leave the result at its first empty/stale value. For derived data, run the RunJS query explicitly from each source query's `onDataQuerySuccess`; for user-driven transforms, invoke it only after the source query has completed.
- **servicenow** — `{ operation: "list_records", table: "incident", … }`
Call `get_datasource_query_schema({ datasource_id, version_id, operation })` for that ToolJet wrapper's exact compact request contract and its response shape/status when known; batch related operations with `requests`. If the response is `runtime-dependent` or `unknown`, inspect a safe successful run or the remote schema before binding nested fields. Do not infer fields from another datasource—or from the upstream vendor API. Use `sections:["introspection"]` plus `inspect_datasource_schema` to fetch only the schemas/tables/columns/collections needed for the current query.

### Building an app that needs a NEW data model (most real requests)
Many requests ("build a CRM", "an expense tracker") come with **no table yet** — you must create the data model first:
1. **Propose the data model** (tables, columns + types, relationships) and **confirm it with the user** before creating anything — schema is a commitment.
2. `create_tables` once for the confirmed model (it accepts one or many tables).
3. Optionally `insert_rows_batch` once to seed a small representative set so the app doesn't render empty. It is insert-only: omit generated serial primary keys, and treat an explicit duplicate-key error as a conflict to resolve—not an update path. Avoid dozens of rows unless density/pagination is under test.
4. Then `add_queries` + `add_components` as usual.
For an **existing** table, call `get_table_schema(table_name)` first so you use its real column names and types.
Use `add_table_column` to evolve a ToolJet DB table in place. Destructive deletes are irreversible: inspect dependencies and obtain explicit approval for the exact target before any `drop_*` or `delete_*` call, then pass `confirm:true`.

### ToolJet DB (`kind: "tooljetdb"`)
- Resolve the table id with `list_tables()` — the query references the table by **`table_id`** (the id), NOT the name.
- Bounded preview: `options = { "operation": "list_rows", "table_id": "<table id>", "list_rows": { "limit": 25, "offset": 0 }, "runOnPageLoad": true }`. Do not author an automatic unbounded `list_rows`; count first and use the server-side Table recipe when size is unknown or growing.
- `runOnPageLoad: true` runs the query when the app opens so bound components populate automatically.
- `list_rows` may carry `limit`, `offset`, `where_filters`, and `order_filters`. In `order_filters`, the outer map key must match the clause's inner `id`; a mismatch can silently disable sorting. Fetch `get_datasource_query_schema(..., operation:"list_rows")` for the exact nested shapes instead of guessing.
- Prefer ToolJet DB aggregation over fetching every row just to count or sum: use `list_rows.aggregates` and optional `list_rows.group_by`. The aggregate configuration key is not the result key; results use `<table_name>_<column>_<aggFx>` (for example `starlink_terminals_id_count`). Multi-table reads use `operation: "join_tables"` with `join_table`.
- Primary-key batches use `bulk_update_with_primary_key` with `rows_update`, or `bulk_upsert_with_primary_key` with `rows`. Read the generated schema before composing these shapes.
- **Write operations** (for edit/create flows) use indexed-object option shapes:
  - Create: `{ "operation": "create_row", "table_id": "<id>", "create_row": { "0": { "column": "title", "value": "{{...}}" }, "1": { "column": "status", "value": "Open" } } }`
  - Update: `{ "operation": "update_rows", "table_id": "<id>", "update_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } }, "columns": { "0": { "column": "status", "value": "{{...}}" } } } }`
  - Delete: `{ "operation": "delete_rows", "table_id": "<id>", "delete_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } } } }`
- After a write succeeds, re-run list/count queries from the mutation's `onDataQuerySuccess` event.

(Other datasources have their own generated query schemas; resolve the contract from the connected `datasource_id` and requested operation.)

### SQL response values and aggregation

SQL driver output is type-dependent: values without a registered parser (commonly some numeric/decimal types) may arrive as strings. Do not assume every value is a string or every numeric-looking value is a number; cast in SQL or convert deliberately before JavaScript arithmetic. When the source is SQL, perform grouping/count/sum in SQL and return the small chart/table shape directly instead of downloading rows for a fragile client-side reduction.

For safe discovery, use plugin selectors first: list schemas/tables, then batch known-table column lookups. Plugin selectors commonly stop at column names and do not expose keys, foreign keys, indexes, or views. When those relationships matter, call `prepare_sql_discovery_queries` for the exact connected datasource and requested purposes; review its `unsupported` list, add the returned specs in one `add_queries` batch, and run only the selected reads. Preview/distinct queries require explicit columns and are capped at 100 rows. Count first, recommend server-side pagination above 1,000 rows, and obtain separate billable-read approval for BigQuery/Snowflake/Redshift before execution.

## REST API queries

For `kind:"restapi"`, fetch the contract for the intended HTTP method, but do not persist an `operation` option: REST queries are selected by `method`. `headers`, `url_params`, `cookies`, and structured `body` are arrays of two-item `[key, value]` tuples. For a raw body use `body_toggle:true` with `raw_body`; `json_body` is a legacy fallback for existing queries.

`queries.<name>.data` is the remote response body directly—parsed JSON object/array, text, or supported binary base64—not a normalized row array. After an explicitly approved safe GET, inspect `metadata.request.url/params/headers` to confirm the resolved request and `metadata.response.statusCode/headers` for status, pagination, and rate-limit information. A deployment that reached one public endpoint does not prove outbound access to every host.

Pagination is defined by the remote API. Put its page/limit/cursor fields in `url_params`, guard first-load Table state, and bind totals or next cursors from the response body or headers. Avoid one REST request per Table/Listview row; prefer a batch endpoint or enrich only the selected/detail record. Authentication and token repair stay user-owned in datasource settings—never copy, inspect, or author credentials in query options.
