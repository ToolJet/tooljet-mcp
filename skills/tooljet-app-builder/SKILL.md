---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via tooljet-mcp: plan pages, create or reuse data/query/component resources, wire behavior, and verify the result. Use for ToolJet apps, dashboards, internal tools, or changes to existing ToolJet apps."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - Source-verified component binding rules (22 components)
    - ToolJet WidgetManager catalog (74 built-in components)
    - ToolJet appCanvasConstants (grid mechanics)
---

<!-- GENERATED FILE — do not edit by hand. Run `node scripts/generate-skill.mjs` to regenerate every host package. -->

# ToolJet app builder

Build only what ToolJet's real components, connected datasources, and MCP tools support. Never invent a property, action, integration, or successful result. User requirements override the adaptable quality defaults in the references.

## Existing app or website migrations

For migration/clone/replacement requests, first read `references/migration.md`. Discover expanded states, relationships and read-only journeys—not just screenshots. Map source coverage to ToolJet and report gaps. Skip this workflow for ordinary builds or visual-only inspiration.

## Core workflow

1. Call `list_workspaces`; if several exist, confirm and switch before creating anything. Decide the page architecture before components. A simple single-job app can stay on one page; separate substantial jobs into focused pages; add an overview only when cross-workflow orientation or decisions need it.
2. Treat 3+ substantive pages, 2+ complex workflows, a multi-table model, or multiple integrations as a large build. Before mutations, show the page/phase plan and rough time ranges, then ask for phased checkpoints (recommended) or the whole app in one run. Do not re-ask if the user already chose.
3. State the short design brief with the page plan before create_app (references/ui-layout.md): the user's job, dominant surface, relevant emphasis, and theme. Resolve the theme using `references/themes.md`: honor explicit design requirements and selected/existing themes before deriving a brand or industry palette; use ToolJet Modern only as the fallback. Pass the resolved `theme` to `create_app`, preserve its ids and links, then call `list_datasources`. Report any `theme.warning`. Fetch only the component, event-action, and datasource contracts needed for the current phase, using one selective batch per contract class, and reuse them. Typed component catalog reads are compact by default; request exact `sections` and `property_keys`/`style_keys` instead of broad full contracts. Confirm a new data model before creating it; ToolJet DB table names are at most 31 characters.
4. Implement that brief as a complete useful phase with stable `client_ref` values. Root components omit `parent` and `slot_name`; page ids are not component parents. Await `lint_app_spec` as a standalone barrier, fix its errors and review warnings, then pass its one-time `plan_token` to `apply_app_phase`. Never run the linter alongside a write. Put planned persisted component definition patches in `component_updates`; use targeted update tools for ad-hoc repairs, never duplicate resources or rebuild the app. After an error, inspect it and change the repair—never replay an identical mutation.
5. Verify each completed page/primary flow using `references/qa.md`. Static validation does not prove runtime query behavior, rendering, or event delivery.
6. Share `editor_url` while authoring. After the first meaningful page works, open `viewer_url` in the built-in browser when available and reuse that tab. The final handoff is at most 120 words: both links, what works, one line of limitations.

## Design quality — required outcomes, flexible composition

Build a polished, contemporary 2026 product UI even from a short prompt: legible hierarchy, coherent theme surfaces, intentional density, clear actions and complete states. "Modern" is a quality bar, not a demand for gradients, glass, oversized cards or a fixed template. Do not claim production readiness from appearance.

- **Resolve the design source:** explicit requirements/design system → existing or selected theme → recognizable brand → use case/industry/audience → ToolJet Modern. Preserve chosen themes, even on empty shells. For brand-led designs, map identity to visible component treatments—not just saved tokens (references/themes.md).
- **Design the job, not a generic dashboard.** Identify the user's main decision and next action, then choose the dominant surface: agenda, review split-view, queue, map, board, analytics or form. Infer supporting views from the task and available data; a dashboard can need trends without the user naming charts. Do not invent metrics, records, capabilities or unrelated workflows.
- **Freedom with purpose.** Derive headers, region proportions, typography, accents and density from the work; do not select a palette or composition merely because it appears in an example. ToolJet themes store the resulting design tokens, not a menu of allowed designs. Zero KPIs is valid. No fixed KPI count, root-component budget, mandatory overview, all-white-card rule or universal header position applies. Familiar patterns are welcome when justified; industry identity must affect information hierarchy, not just colour.
- **HTML where it helps.** Use small theme-aware Html blocks for composed read-only summaries, context, timelines and display panels when native components do not express them well. Headers and KPIs need not be HTML. Keep controls, charts, tables and interactions native; preserve visual editability when required. Read references/ui-layout.md for background and escaping safeguards.
- **Finish the workflow.** Format values for the user's locale, give states readable labels, and provide loading, empty, error and disabled states with useful recovery. Size content to fit; use intentional spacing and accessible contrast. Before handoff, check relevance, hierarchy, interaction and actual rendering—not merely whether lint passed.

## Render safety

Detail: `references/qa.md`.

- **One line per binding.** A line break anywhere inside `{{ }}` makes the whole binding render empty. Multi-line logic goes in a JavaScript query; never a literal backslash-n or code outside its braces.
- **Modal and form children are parented to the modal or form**, never placed at root at its coordinates. `add_components` refuses overlaps.
- **Navigation is the page menu** (`navigation_position`), never an `Html` sidebar with buttons on it.
- **Items are authored, never defaulted**: `Tabs` (`tabItems`), `Steps` and `Kanban` without items render placeholders.
- **Text fits its box**: size labels, values, captions and table columns for their rendered content; keep titles readable and let longer detail wrap within a deliberately sized region. Bind only fields the query returns.
- **Toolbar buttons align with the field box**: a top-labelled input renders its label in its first 20px, so the row's button sits at the inputs' top + 20, height 40.
- **Audit every page as rendered before the handoff** with `verify_page_render` (or the `references/qa.md` checks when it is unavailable) and fix everything it names; an unaudited page is not finished.

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
- `references/themes.md` — workspace theme creation and management, the exact theme definition structure, app assignment, and token-backed component styling.

Tool schemas, catalog responses, and returned warnings are authoritative. Do not preload every reference. Keep inspection results bounded: use `get_app_summary`'s structural default or exact field projections, and request `detail:"full"` only after narrowing the target. Reuse earlier catalog, schema, and summary results instead of repeating the same read.

## Non-negotiable safety

- Never author or execute `SELECT *` against an unfamiliar table. Count first when size is unknown; above 1,000 rows prefer server-side pagination. Large and billable reads require separate explicit approvals.
- Never run mutations, AI, email, OAuth, or other side effects merely to validate a build.
- Seed writes are insert-only; omit generated serial keys. A duplicate-key failure is never permission to update existing rows.
- Page/query/component/table/column deletion requires exact-target approval plus `confirm:true`, except for resources this build created itself (a diagnostic query, a scratch page, a probe component): delete those before finishing rather than renaming or hiding them. Visibility is not authorization.
- Keep app chrome controls distinct: `hide_header` hides the app header/banner; `navigation_position` places the separate generated navigation menu on the side or top; `navigation_hidden` hides that whole menu in either position; and `update_pages.hidden` hides only one non-Home page. Home cannot be hidden.
- Batch/phase writes can partially persist. Read reported completed resources and repair in place; never auto-delete or replay the whole batch blindly.
