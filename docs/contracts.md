# ToolJet Endpoint Contract Notes

Evidence comes from the current ToolJet source, mocked MCP contract tests, and dated local live checks where explicitly stated. Treat dated observations as historical evidence, not a guarantee for another ToolJet version or workspace.

Base API: `http://localhost:3000/api`. Frontend (for user-facing app URLs): `http://localhost:8082`.

---

## 0. Auth model (verified live) — IMPORTANT: more than a cookie

Two things are required on **every authenticated request**:
1. The **`tj_auth_token`** session cookie (HttpOnly, SameSite=Strict).
2. The **`tj-workspace-id: <organization_id>`** header.

Confirmed: cookie alone → `401`; cookie + `tj-workspace-id` → request proceeds (create app returned `201`).
Optional header: `x-branch-id` (git-sync branch) — omit for slice 1.

Cookie comes from one of two paths — no raw email/password login anymore:
```
POST /api/personal-access-tokens/session   Headers: Authorization: Bearer <pat>
→ 200 { "authToken", "organizationId", "organizationSlug", "organizationName" }   (body, not Set-Cookie)
```
Or: a session minted by ToolJet's own backend and handed over directly (in-product path) — nothing to exchange.

**auth.ts recipe:** resolve `tj_auth_token` via either path, store `organizationId`. Attach `Cookie: tj_auth_token=<t>` + `tj-workspace-id: <organizationId>` on every call. On 401: PAT path re-exchanges once and retries; minted session just fails (nothing to renew it into).

---

## 1. List datasources (verified live) — TWO endpoints; tjdb only in the app-scoped one

**Gotcha:** the plain global-list endpoint EXCLUDES static datasources (tjdb/restapi/runjs/runpy). The ToolJet-DB datasource (`kind: tooljetdb`, id `2d78b02a-ced0-4f23-8ce3-09972d66035a`) appears ONLY in the app-scoped list. Slice 1 uses tjdb, so use the app-scoped endpoint.

### a) Global configured datasources (excludes tjdb)
```
GET /api/data-sources/:organizationId          Headers: Cookie + tj-workspace-id
→ 200 { "data_sources": [ { id, name, kind, scope }, ... ] }   // snowflake, servicenow, postgresql — NO tjdb
```

### b) App-scoped datasources (INCLUDES tjdb + static) — use this for slice 1
```
GET /api/data-sources/:organizationId/environments/:environmentId/versions/:versionId
Headers: Cookie + tj-workspace-id
→ 200 { "data_sources": [
     { "kind":"tooljetdb", "name":"tooljetdbdefault", "id":"2d78b02a-ced0-4f23-8ce3-09972d66035a" },
     { "kind":"restapi", ... }, { "kind":"runjs", ... }, { "kind":"servicenow", ... }, { "kind":"postgresql", ... } ] }
```

### Resolving the environment id (needed for the app-scoped list)
```
GET /api/app-environments        Headers: Cookie + tj-workspace-id
→ 200; find env with name === 'development' → id (this org: 2138e019-dbcd-45d1-8b84-7d5afeb77d08)
(Also: GET /api/app-environments/default.)
```

**`list_datasources` design:** takes a `version_id` (from `create_app`); internally resolves the development env id via `/api/app-environments`, then calls the app-scoped endpoint (1b) → returns the datasource list including the tjdb id. `add_query` passes the chosen datasource id into the create-query route (§3), which needs NO env id. Resolve the tjdb id at runtime; don't hardcode.

---

## 2. Create app + get app (verified live)

### Create
```
POST /api/apps
Headers: Cookie: tj_auth_token=...; tj-workspace-id: <org_id>; Content-Type: application/json
Body: { "name": "Tickets Dashboard", "type": "front-end" }   // type enum APP_TYPES; 'front-end' is valid
→ 201, returns the app WITHOUT version/page:
{ "id": "391456ff-...", "name": "...", "slug": "391456ff-...", "type": "front-end",
  "current_version_id": null, "organization_id": "...", ... }
```
DTO `AppCreateDto`: `name` (required), `type` (required, enum), `icon?`, `prompt?`.

### Get (to obtain version_id + home_page_id — create does NOT return them)
```
GET /api/apps/:id
Headers: Cookie + tj-workspace-id
→ 200:
{ "id": "...", "name": "...", "slug": "...", "current_version_id": "...",
  "editing_version": { "id": "9656402d-..." },        // ← version_id to author on
  "pages": [ { "id": "6478536b-...", "name": "Home", "index": 1 } ] }  // ← home_page_id = the 'Home' page
```
**`create_app` flow:** POST /apps → get `app_id`; GET /apps/:app_id → `version_id = editing_version.id`, `home_page_id = pages.find(name=='Home').id`. It returns `editor_url = ${appUrl}/${workspaceSlug}/apps/${appSlug}`, `viewer_url = ${appUrl}/applications/${appId}/${homeHandle}?env=development&version=${editingVersionName}`, and the backward-compatible `app_url` editor alias.

---

## 3. Create query (route + DTO confirmed from source; tjdb options shape from code)

```
POST /api/data-queries/data-sources/:dataSourceId/versions/:versionId
Headers: Cookie + tj-workspace-id
Body (CreateDataQueryDto):
{ "kind": "tooljetdb", "name": "list_tickets", "options": { ...see below... } }
```
- `:dataSourceId` = the tooljetdb datasource id (§1). `:versionId` = the app's `editing_version.id` (§2).
- DTO fields: `kind` (req), `name` (req), `options` (req, object), `type?`, `query?`, `app_version_id?`, `folder_id?`.

### tjdb bounded "list rows" options
```json
{ "operation": "list_rows", "table_id": "<ToolJet DB table id>", "list_rows": { "limit": 25, "offset": 0 }, "runOnPageLoad": true }
```
- `operation: "list_rows"`; target table is `table_id` from `list_tables`; per-operation params nest under `list_rows`.
- Never create an automatic unbounded read merely to inspect an unfamiliar table. Count first and use server-side pagination for large or growing data.
- **`runOnPageLoad: true`** lives in `options` (confirmed key from `frontend/.../QueryManager/constants.js`) — set it so the query runs when the app opens and the Table populates without user action.
- `POST /api/data-queries/:id/versions/:versionId/run/:envId` executes a saved query. MCP uses it only when the caller explicitly selects a safe read; static `validate_app` never executes queries.
- `runOnPageLoad` is the shared camelCase option. `run_on_page_load` is ignored and MCP now warns about it.

---

## 4. Create component (route + body shape confirmed from source + live storage)

```
POST /api/v2/apps/:id/versions/:versionId/components     ← NOTE: /v2/ URI version
Headers: Cookie + tj-workspace-id
Body (CreateComponentDto):
{
  "is_user_switched_version": false,
  "pageId": "<home_page_id>",
  "diff": {
    "<client-generated-uuid>": { ...ComponentDto... }   // diff keyed by the new component's id
  }
}
```
- The body is a **diff keyed by component id** (client generates the UUID). One entry per component.
- **CONFIRMED LIVE (201):** the ComponentDto that works:
  ```json
  { "name": "table1", "type": "Table",
    "properties": { "data": { "value": "{{queries.<name>.data}}" } },
    "styles": {}, "validation": {}, "others": {},
    "layouts": { "desktop": {"top":10,"left":2,"width":30,"height":300},
                 "mobile":  {"top":10,"left":2,"width":30,"height":300} } }
  ```
  - **`name` is REQUIRED** — omitting it → `422 "name is required"` (NOT NULL, code 23502).
  - **`layouts` is keyed by resolution type** (`desktop`/`mobile`) — a flat `{top,left,...}` → `422 "invalid input value for enum layout_type: 'top'"`. Apply the same rect to both.
  - `styles: {}`, `validation: {}`, `others: {}` are accepted as empty objects.
  - Verified: creates rows in `components` + `layouts` (desktop & mobile) tables. Table binds via `properties.data.value = "{{queries.<name>.data}}"`.
- Property value shape (verified from a stored Text component): each property is `{ "value": <val>, "fxActive"?: ... }`.
- Layout units are grid units (verified).

---

## 5. Table component shape (verified from a stored Table)

Key properties (each `{ value }`):
```json
{
  "data":       { "value": "{{queries.<queryName-or-id>.data}}" },   ← the row-data binding
  "columnData": { "value": "{{[{name:'email',key:'email'}, ...]}}" },
  "columns":    { "value": [ { "id":"<uuid>", "name":"# id", "key":"id", "columnType":"number" }, ... ] },
  "rowsPerPage":{ "value": "{{20}}" },
  "loadingState":{ "value": "{{queries.<q>.isLoading}}" }
}
```
- The data binding is `properties.data.value = "{{queries.<name>.data}}"` (binding by query **name** works; the stored example bound by id).
- `columns` is an array of `{ id(uuid), name, key, columnType }`. Keep table-level `autogenerateColumns` enabled for runtime compatibility; explicit curated columns persist when marked `autogenerated:false`, and behavior-only keys can remain hidden with `columnVisibility:false`.

---

## 6. Reliability/edit routes (confirmed from current ToolJet source)

- Page icons: `POST /api/v2/apps/:appId/versions/:versionId/pages` currently ignores `icon`; persist it with `PUT` to the same route using `{ pageId, diff: { icon } }`, then read the app back and verify it.
- Query datasource repoint: `PUT /api/data-queries/:queryId/versions/:versionId/data-source` with `{ data_source_id }`.
- Datasource metadata invocation: `POST /api/data-sources/:dataSourceId/invoke` with `{ method, environmentId, args? }`. Only invoke methods advertised in the plugin's operation metadata.
- Add ToolJet DB column: `POST /api/tooljet-db/organizations/:organizationId/table/:tableName/column` with `{ column, foreign_keys }`.
- Drop ToolJet DB column: `DELETE /api/tooljet-db/organizations/:organizationId/table/:tableName/column/:columnName`.
- Drop ToolJet DB table: `DELETE /api/tooljet-db/organizations/:organizationId/table/:tableName`.

MCP contract validation is static: it validates generated option fields, component/event compatibility, and references. It does not execute queries or prove browser delivery/rendering.

---

## Historical E2E result (2026-06-26)
Ran `scripts/e2e-drive.mjs` against that day's local ToolJet build. The authoring flow and DB verification succeeded for a seeded 10-row tickets table. This is historical smoke-test evidence; run the current mocked suite (and a fresh local E2E when needed) before treating it as current-version proof.

The historical visual check used a logged-in browser viewer. Current builds return separate editor and viewer URLs so those surfaces are not conflated.
