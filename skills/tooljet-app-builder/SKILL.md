---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via tooljet-mcp: plan pages, create or reuse data/query/component resources, wire behavior, and verify the result. Use for ToolJet apps, dashboards, internal tools, or changes to existing ToolJet apps."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - TJ-AI COMPONENT_BINDING_RULES (22 components)
    - ToolJet WidgetManager catalog (74 built-in components)
    - ToolJet appCanvasConstants (grid mechanics)
---

<!-- GENERATED FILE — do not edit by hand. Run `node scripts/generate-skill.mjs` to regenerate every host package. -->

# ToolJet app builder

Build only what ToolJet's real components, connected datasources, and MCP tools support. Never invent a property, action, integration, or successful result. User requirements override the adaptable quality defaults in the references.

## Core workflow

1. Call `get_runtime_info` first to confirm the build service and plugin host are healthy before any work. Then call `list_workspaces`; if several exist, confirm and switch before creating anything. Decide the page architecture before components. **Scope discipline — build ONLY what the user asked for.** Do not add pages, detail views, navigation, extra KPIs, or features they did not request; matching the request beats impressing with extras (and every extra element is more to wire, verify, and get wrong). **Default to the simplest structure that satisfies the request: prefer a SINGLE page, and put add/edit in a modal on that page rather than a separate page — a list-plus-add/edit CRUD tool is ONE page, not several.** Add more pages only when the user explicitly asks for distinct sections, or when genuinely unrelated substantial jobs must coexist — not by default.
2. Treat 3+ substantive pages, 2+ complex workflows, a multi-table model, or multiple integrations as a large build. Before mutations, show the page/phase plan and rough time ranges, then ask for phased checkpoints (recommended) or the whole app in one run. Do not re-ask if the user already chose.
3. Call `create_app`, preserve its ids and links, then call `list_datasources`. Fetch only the component, event-action, and datasource contracts needed for the current phase, using one selective batch per contract class, and reuse them. Typed component catalog reads are compact by default; request exact `sections` and `property_keys`/`style_keys` instead of broad full contracts. Confirm a new data model before creating it; ToolJet DB table names are at most 31 characters.
4. Plan a complete useful phase with stable `client_ref` values. Root components omit `parent` and `slot_name`; page ids are not component parents. Await `lint_app_spec` as a standalone barrier, fix its errors and review warnings, then pass its one-time `plan_token` to `apply_app_phase`. Never run the linter alongside a write. Put planned persisted component definition patches in `component_updates`; use targeted update tools for ad-hoc repairs, never duplicate resources or rebuild the app. After an error, inspect it and change the repair—never replay an identical mutation.
5. Verify each completed page/primary flow using `references/qa.md`. Static validation does not prove runtime query behavior, rendering, or event delivery.
6. Share `editor_url` while authoring. After the first meaningful page works, open `viewer_url` in the built-in browser when available and reuse that tab. Final handoff includes both links, what works, limitations, and a short tool-call-count efficiency note.

## Datasource repair handoff

If an expected source is absent or a query returns a connection failure, explain the problem and use the returned `datasources_url`, `settings_url`, or `recovery.url`. Open it in the built-in browser when available; otherwise send the clickable link. Do not enter credentials, authorize OAuth, test, or save the connection for the user. Wait for them to confirm the repair, refresh datasource discovery, and retry at most one selected safe read. Read `references/datasources.md` for the full contract and large/billable-read safeguards.

## Load only the references the phase needs

- `references/workflows.md` — tool selection, plan/apply behavior, repair, reuse, deletion, and silent-failure guardrails.
- `references/ui-layout.md` — page design, canvas geometry, nested layouts, charts, and visual defaults.
- `references/tables.md` — Table binding, row actions, sizing, and datasource-neutral server-side pagination.
- `references/forms.md` — generated-vs-standalone forms, validation, uploads, and modal geometry.
- `references/events.md` — component/query/page events, mutation lifecycles, loading, empty, error, and success states.
- `references/datasources.md` — connection recovery, exact query shapes, schema introspection, ToolJet DB, SQL, large reads, and billable reads.
- `references/security.md` — authorization boundaries, current-user variables, permissions, and sensitive/destructive operations.
- `references/qa.md` — static checks, safe runtime checks, the browser audit, triage, and confirmation.
- `references/components.md` — selective component palette and exact binding/rendering rules not covered by Table/Form references.

Tool schemas, catalog responses, and returned warnings are authoritative. Do not preload every reference. Keep inspection results bounded: use `get_app_summary`'s structural default or exact field projections, and request `detail:"full"` only after narrowing the target. Reuse earlier catalog, schema, and summary results instead of repeating the same read.

## Non-negotiable safety

- Never author or execute `SELECT *` against an unfamiliar table. Count first when size is unknown; above 1,000 rows prefer server-side pagination. Large and billable reads require separate explicit approvals.
- Never run mutations, AI, email, OAuth, or other side effects merely to validate a build.
- Seed writes are insert-only; omit generated serial keys. A duplicate-key failure is never permission to update existing rows.
- Page/query/component/table/column deletion requires exact-target approval plus `confirm:true`. Visibility is not authorization.
- Batch/phase writes can partially persist. Read reported completed resources and repair in place; never auto-delete or replay the whole batch blindly.
