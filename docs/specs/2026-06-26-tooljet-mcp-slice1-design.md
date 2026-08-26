# ToolJet MCP — Slice 1 Design Spec

**Date:** 2026-06-26
**Status:** Approved design (brainstorming), pending spec review
**Author:** ToolJet

## 1. Summary

A standalone Node/TypeScript **MCP server** that lets an external coding agent (Codex) build a working ToolJet app end-to-end through ToolJet's *own* governed authoring endpoints — no direct DB writes, no duplicated business logic.

Slice 1 proves the thesis with the thinnest **real** use case: from a single Codex prompt, with zero manual clicks in ToolJet, an app is created whose home page renders real rows from a ToolJet-DB table.

The deliverable is installable locally as a Codex plugin: an MCP server (stdio) + a bundled skill that teaches Codex how to use it.

## 2. Goals

- From a Codex prompt, produce a ToolJet app whose home page has a **Table** bound to a **query** that returns real rows from a seeded ToolJet-DB `tickets` table.
- Every write goes through ToolJet's governed internal endpoints (auth + RBAC + validation inherited for free).
- The tool surface is **granular** so Codex can orchestrate (and parallelize) `add_component` / `add_query` calls itself.
- Ship as a locally-installable Codex plugin (MCP server config + `SKILL.md`), kept in its own repo, separate from the ToolJet monorepo.

## 3. Non-goals (slice 1)

- Browser feedback loop (`preview_app` / `read_runtime_errors` / DOM map) — this is slice 2.
- ServiceNow or any external datasource — slice 2+ (the authoring tools are datasource-agnostic; only the query skill differs).
- Styling, events, multi-page apps, forms, component nesting beyond a single Table.
- Editing/patching existing components beyond what the demo requires.
- Any orchestration logic inside the server (planning/fan-out is Codex's job; the server only exposes primitives).
- Production auth hardening, multi-tenant/remote transport, packaging for distribution.

## 4. Architecture

```
Codex (client)
   │  stdio (MCP)
   ▼
tooljet-mcp server (Node/TS, @modelcontextprotocol/sdk)
   │  authenticated HTTP (session cookie)
   ▼
Local ToolJet backend (:3000)  →  internal `versions` + `data-queries` endpoints
   ▼
Postgres (components / layouts / pages / data_queries tables)
```

- **Language/runtime:** Node 22 + TypeScript. Official `@modelcontextprotocol/sdk`. **stdio** transport (Codex spawns the process locally).
- **Role:** a thin **governed proxy**. Each MCP tool maps to one (or a small fixed sequence of) authenticated ToolJet HTTP call(s). The server holds no app state beyond the session and a small in-memory cache of the component catalog.
- **Repo location:** a standalone `tooljet-mcp` repository, separate from the ToolJet monorepo.
- **Config:** environment variables —
  - `TOOLJET_URL` — backend API origin, default `http://localhost:3000` (all authenticated HTTP calls go here).
  - `TOOLJET_APP_URL` — frontend origin, default `http://localhost:8082` (used **only** to build user-facing `app_url` links).
  - `TOOLJET_EMAIL`, `TOOLJET_PASSWORD`.
  - **URL-derivation rule:** `create_app` builds `app_url` as `${TOOLJET_APP_URL}/apps/<app_id>` — never from `TOOLJET_URL`. The two origins are distinct (API vs frontend) and must not be conflated.

### 4.1 Module boundaries

| Module | Responsibility | Depends on |
|---|---|---|
| `auth.ts` | Log in, hold + refresh the session cookie, expose an authenticated `fetch` wrapper | ToolJet `/api/authenticate` |
| `tooljetClient.ts` | Typed methods for each ToolJet endpoint used (create app, add component, create query, list datasources, get app) | `auth.ts` |
| `tools/*.ts` | One file per MCP tool: input schema (zod), call `tooljetClient`, shape the MCP result/error | `tooljetClient.ts` |
| `server.ts` | Register tools with the MCP SDK, wire stdio transport | `tools/*` |
| `skill/SKILL.md` | The knowledge shipped to Codex | — |

Each tool is independently testable: given a mock `tooljetClient`, assert it forms the right request and maps errors correctly.

## 5. Authentication

- On first tool call (lazy), the server does `POST {TOOLJET_URL}/api/authenticate` with `{ email, password }` and captures the `tj_auth_token` httpOnly session cookie plus the organization/workspace context from the response body.
- The cookie is attached to every subsequent request. On a `401`, the server re-authenticates once and retries the call; a second failure surfaces an error to Codex.
- **CSRF:** ToolJet's CSRF origin check is active only when custom domains are enabled (verified in `server/src/main.ts`); on localhost it is inactive, so cookie-based programmatic calls succeed.
- Governance is inherited: the server can do exactly what the configured user is permitted to do — no more.

## 6. ToolJet endpoints wrapped (slice 1)

All are existing, in-tree endpoints the manual builder already uses. Auth guard on the authoring ones is `JwtAuthGuard, ValidAppGuard, FeatureAbilityGuard`.

| Purpose | Method + path (relative to `/api`) |
|---|---|
| Login | `POST /authenticate` |
| List global datasources | data-sources listing endpoint (to find the ToolJet-DB datasource id) |
| Create app (+ first version + home page) | apps create endpoint |
| Get app (structure/versions/pages) | apps get endpoint |
| Create query | `POST /data-queries` (create) |
| Create component | `POST /:id/versions/:versionId/components` |
| Update component (bind data / layout) | `PUT /:id/versions/:versionId/components` (+ `/layout`) |

Exact paths/DTO shapes are resolved during implementation by reading the controllers; the implementation plan includes a "confirm endpoint contracts" step before wiring each tool.

## 7. MCP tool surface (slice 1)

**Read / affordance**

- `list_datasources()` → `[{ id, name, kind }]`. Lets Codex find the ToolJet-DB datasource.
- `get_component_catalog()` → minimal catalog for the types slice 1 needs (`Table`, `Text`): type name + key properties + the `data` binding property. Sourced from a small static catalog file in the server (not the full ToolJet registry) for slice 1.
- `get_app(app_id)` → current app structure (version id, pages, components) for iteration/verification.

**Authoring**

- `create_app(name)` → `{ app_id, version_id, home_page_id, app_url }`. Wraps app creation; returns everything later tools need. `app_url` is built per the §4 URL-derivation rule (`${TOOLJET_APP_URL}/apps/<app_id>`).
- `add_query({ app_id, version_id, datasource_id, name, options })` → `{ query_id, name }`. Creates a ToolJet-DB "list rows" query with `run_on_page_load: true`. For the ToolJet-DB kind, `options` must at minimum specify the operation (list rows) and the target table (`tickets`); the exact ToolJet-DB `options` field names are confirmed against the datasource/query controller in the "confirm endpoint contracts" plan step.
- `add_component({ app_id, version_id, page_id, type, properties, layout })` → `{ component_id }`. E.g. a `Table` with `properties.data = "{{queries.<name>.data}}"` and a layout (top/left/width/height).

Granularity is deliberate: `add_component` and `add_query` are independent, independently-authenticated calls, so Codex may issue them concurrently. Concurrent component creates are independent rows; query-name uniqueness is already advisory-locked server-side, so parallel creation is safe.

## 8. The bundled skill (`skill/SKILL.md`)

A distilled, MCP-oriented version of the ToolJet agent's layout/query/binding knowledge. Contents:

- **App model:** app → version → page → component; components carry `properties`/`styles`/`layout`; queries live on a datasource; data binding uses `{{queries.<name>.data}}`.
- **Slice-1 recipe:** `list_datasources` → `create_app` → `add_query` (ToolJet-DB list rows, run on page load) → `add_component` (Table with `data` bound to the query) → return the app URL.
- **Table specifics:** the `data` property is the row array; column inference is automatic in slice 1 (no explicit column config).
- **Verification:** tell the user to open the returned app URL.

## 9. One-time setup (not an MCP tool)

A one-time setup step creates a ToolJet-DB `tickets` table with ~10 sample rows (id, subject, priority, status, assignee). It must be created **through ToolJet's ToolJet-DB creation path** (UI or the tjdb API) — not raw SQL against the `tooljet_db` database — so the table is registered in the ToolJet-DB catalog and therefore queryable by `add_query`. Kept out of the MCP surface to keep tools focused on authoring; the plan picks the concrete mechanism (UI vs tjdb API).

## 10. End-to-end demo flow

1. User (in Codex): *"Build me a tickets dashboard on my ToolJet DB."*
2. Codex loads the skill, calls `list_datasources`, finds the ToolJet-DB datasource.
3. `create_app("Tickets Dashboard")` → app + version + home page + URL.
4. `add_query` → ToolJet-DB query listing `tickets` rows, `run_on_page_load: true`.
5. `add_component` → a Table on the home page with `data = {{queries.<name>.data}}`.
6. Codex returns the app URL; user opens `http://localhost:8082/apps/…` and sees the tickets table rendering the seeded rows.

## 11. Success criteria

- From a single Codex prompt, with **zero manual clicks in ToolJet**, an app exists whose home page renders the seeded `tickets` rows in a Table.
- Every write went through the governed API (verifiable: the `components` / `data_queries` rows exist and were created via HTTP endpoints, not direct SQL).
- The plugin installs into Codex via a documented MCP config entry, and the bundled skill is what tells Codex how to drive it.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Internal endpoint DTOs differ from assumptions | Implementation plan has a "confirm endpoint contracts" step per tool (read the controller/DTO before wiring) |
| App-version/page context threading (ids needed by later calls) | `create_app` returns `app_id` + `version_id` + `home_page_id` so Codex never has to discover them |
| Query result shape not what the Table expects | Slice 1 pins one query kind (ToolJet-DB list) and one binding pattern; validated against the seeded table |
| Session/CSRF surprises | Verified CSRF is off on localhost; auth is a single login + cookie reuse with one retry on 401 |
| Component `properties`/`layout` schema for Table | `get_component_catalog` + a pinned static Table example in the skill remove guesswork |

## 13. Definition of done (slice 1)

- `tooljet-mcp` repo with the server, the 6 tools (§7), `SKILL.md`, the seed script, and a README documenting the Codex install steps.
- The demo flow (§10) reproduces from a clean Codex prompt.
- Endpoint contracts for each wrapped call confirmed against the ToolJet source.
