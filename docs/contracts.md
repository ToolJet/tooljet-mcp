# ToolJet Endpoint Contracts (confirmed against live instance + source)

**Confirmed:** 2026-06-26 against local ToolJet 3.21.50-beta (backend :3000).
All values below were verified live (curl) or from source unless marked **(CONFIRM)**.

Base API: `http://localhost:3000/api`. Frontend (for user-facing app URLs): `http://localhost:8082`.

---

## 0. Auth model (verified live) — IMPORTANT: more than a cookie

Two things are required on **every authenticated request**:
1. The **`tj_auth_token`** session cookie (HttpOnly, SameSite=Strict), obtained from login.
2. The **`tj-workspace-id: <organization_id>`** header.

Confirmed: cookie alone → `401`; cookie + `tj-workspace-id` → request proceeds (create app returned `201`).
Optional header: `x-branch-id` (git-sync branch) — omit for slice 1.

### Login
```
POST /api/authenticate
Body: { "email": "...", "password": "..." }
→ 201; Set-Cookie: tj_auth_token=<jwt>; HttpOnly; SameSite=Strict; Path=/
Response body (relevant fields):
{
  "id": "<user-uuid>",
  "email": "...",
  "organization_id": "6bb2a05c-132c-41d3-b87f-74d49abd1ed8",
  "current_organization_id": "6bb2a05c-132c-41d3-b87f-74d49abd1ed8",
  "current_organization_slug": "tooljets-workspace",
  "admin": true, "super_admin": true,
  ...
}
```
**auth.ts recipe:** POST authenticate → capture `tj_auth_token` from Set-Cookie (**use `headers.getSetCookie()` in Node/undici**, not `headers.get`), store `current_organization_id`. On every call attach `Cookie: tj_auth_token=<t>` **and** `tj-workspace-id: <current_organization_id>`. On 401, re-login once and retry.

---

## 1. List datasources

The ToolJet-DB datasource is global and already exists:
```
id:   2d78b02a-ced0-4f23-8ce3-09972d66035a
name: tooljetdbdefault
kind: tooljetdb
scope: global
```
**(CONFIRM)** exact GET path for listing org datasources (a data-sources controller GET; scoped by `tj-workspace-id`). For slice 1 the tooljetdb id above can be used directly, but `list_datasources` should still hit the real endpoint. Confirm path during Task 4 by reading `server/src/modules/data-sources/*controller*.ts` and testing with the cookie+header.

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
**`create_app` flow:** POST /apps → get `app_id`; GET /apps/:app_id → `version_id = editing_version.id`, `home_page_id = pages.find(name=='Home').id`; `app_url = ${TOOLJET_APP_URL}/apps/${app_id}`.

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

### tjdb "list rows" options (shape from `frontend/.../TooljetDatabase/util.js` + operations.json)
```json
{ "operation": "list_rows", "table_name": "tickets", "list_rows": { } }
```
- Top-level `operation: "list_rows"`; the target table is `table_name`; per-operation params nest under a key named after the operation (`list_rows: { where_filters?, order_filters?, limit? }`).
- **(CONFIRM live in Task 8/11):** exact top-level key for the table (`table_name` vs `table_id`) and whether `list_rows` may be empty. No tjdb table exists yet, so create one tjdb list query in the UI after seeding `tickets` and copy its stored `options` verbatim into the skill.
- **run-on-page-load (CONFIRM):** determine whether it's `options.runOnPageLoad: true` or a separate field, by inspecting a UI-created query's stored row. The Table should render on load either way if the query is set to run on load.

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
- `ComponentDto` carries: `type`, `properties`, `styles`, `general`, `layouts`, `parent?`. **(CONFIRM)** the exact ComponentDto field list + whether layout is inline (`layouts: { desktop: {top,left,width,height}, mobile: {...} }`) or via the separate `PUT …/components/layout` — read `server/src/modules/apps/dto/component.ts` (`ComponentDto`) during Task 6.
- Property value shape (verified from a stored Text component): each property is `{ "value": <val>, "fxActive"?: ... }`.
  - Example Text: `"properties": { "text": { "value": "<h2>…</h2>" }, "textFormat": { "value": "html" }, "dynamicHeight": { "value": "{{true}}" } }`
- Layout units are grid units (verified: a Text row = `top:20 left:2 width:15 height:40`, resolution `desktop`).

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
- `columns` is an array of `{ id(uuid), name, key, columnType }`. **(CONFIRM)** whether omitting `columns` lets ToolJet auto-generate from the data (preferred for slice 1). If not, the skill/tool must build a `columns` array from the seeded `tickets` schema (id, subject, priority, status, assignee).

---

## Open items to confirm during implementation (low risk, all have a fallback)
1. §1 exact `list_datasources` GET path (tooljetdb id already known).
2. §3 tjdb `options` exact keys + run-on-page-load placement → copy from a UI-created query after seeding.
3. §4 `ComponentDto` exact field list + inline-layout vs separate `/layout` PUT.
4. §5 whether `columns` can be omitted for auto-generation.

Everything auth/app/route-level is verified live; the open items are shape details resolved by creating one example in the UI and copying its stored JSON.
