---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via the tooljet-mcp tools — create apps, add datasource queries, and add components bound to them. Use whenever asked to build/scaffold a ToolJet app, dashboard, or internal tool, or to add pages/components/queries. This is a KNOWLEDGE reference (component binding rules, canvas mechanics, query schemas); YOU make all layout and design decisions."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - TJ-AI COMPONENT_BINDING_RULES (22 components)
    - ToolJet WidgetManager catalog (74 built-in components)
    - ToolJet appCanvasConstants (grid mechanics)
---

<!-- GENERATED FILE — do not edit by hand. Run `node scripts/generate-skill.mjs` to regenerate. -->

## What this skill is

Facts you need to build ToolJet apps through the `tooljet-mcp` tools — component binding rules, canvas mechanics, query schemas, and adaptable quality defaults. User requirements and the app's real job take precedence over those defaults; you still own the final layout and design decisions.

Every tool call goes through ToolJet's governed API (your session + permissions). ToolJet apps are configuration over a fixed component library, not code.

## Be honest about what's buildable — don't say yes to everything

Build only what these MCP tools and ToolJet's **real** components/features actually support. If a request — or any part of it — can't be done with the standard tools (a component or property that doesn't exist, an interaction ToolJet doesn't support, **a datasource or third-party integration that isn't connected — you cannot connect a new one from here**, anything outside this tool surface), **tell the user plainly**: name what isn't supported and why, and offer the nearest supported alternative or a manual step in the visual builder. (For an unconnected source like Strava/Stripe/a new API: offer to have the user connect it first, or build against a **seeded placeholder table**, clearly labelled — details in the reference. Never handle credentials yourself.) **Never fake it** — don't invent components/properties/actions, don't silently drop a requested feature and present the app as finished, and don't claim something works when you haven't verified it (use `run_query` / `validate_app` / the browser pass to actually check). Delivering the supported parts and clearly listing what you couldn't do — and why — is the honest, useful outcome; a broken or imaginary feature presented as working is not.

## Keep context small — load only the relevant reference

Tool input schemas, catalog responses, and returned warnings are authoritative. Do not preload every reference:

- Read `references/ui-authoring.md` before laying out a new page or using a layout-sensitive Table/Chart/nested view.
- Read `references/forms-and-interactions.md` only for forms, modals, mutations, or event wiring.
- Read `references/tool-workflows.md` only for a non-obvious authoring/update path, an existing-app repair, or a silent runtime/configuration failure.
- Read `references/verification.md` when a page or primary flow is ready for QA.
- Read `references/tooljet-reference.md` selectively for exact per-component binding rules, the built-in palette, and datasource query shapes. Prefer batched, section-filtered catalog tools over loading broad reference material.

For a new phase, use `lint_app_spec` as an awaited barrier, inspect its warnings/errors, then pass its one-time `plan_token` to `apply_app_phase`. Never dispatch the linter and an apply/write as siblings in parallel. Batch tools are the default surface and accept one item for targeted creates; use update tools for persisted objects. Set `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=true` only for an older client that still calls `create_table`, `insert_rows`, `add_page`, `add_query`, or `add_component`.

For reads, inspect schema first, request explicit columns, and never author or execute `SELECT *` against an unfamiliar table. Count first when size is unknown; above 1,000 rows, propose server-side pagination and require explicit user approval before a full read. General permission to build or inspect an app is not consent for a large read.

Seed writes are insert-only: omit generated serial primary keys so ToolJet uses the real sequence. A duplicate-key failure must never be treated as permission to update an existing row. Page/query/component/table/column deletion requires explicit approval for the exact target and `confirm:true`; current page-group deletion is deliberately unsupported.

Fix persisted work in place: use bounded `get_app_summary`/`get_component`, then the relevant `update_*` or `delete_*` tool. Do not rebuild an app to correct one value.

## Workspace — confirm which one first

A ToolJet user can belong to **multiple workspaces**, and every app/table/datasource is scoped to the **active** one. At the start of a session, call `list_workspaces`. If there's **more than one**, ask the user which to use and `use_workspace(id)` **before creating anything** — building in the wrong workspace means redoing it. If there's only one (or a default is already active, `is_current: true`), just proceed. The user can ask to switch at any time (`use_workspace`); a fixed default can also be pinned via the `TOOLJET_WORKSPACE_ID` env at install.

## Before you build — prefer safe defaults; ask only when it changes what you build

Don't reflexively interrogate the user. For a **common read-only dashboard on an existing table** (a single job), safe defaults exist — just build it: use the table as-is, assume read-only (no writes unless asked), use the Table's **built-in search/sort/filter** rather than external filter widgets, surface the signals that actually matter as `Statistics`/`Chart` (only what answers a real question — see the design framework), and neutral ToolJet-native styling. Ship it, then refine. (For a **multi-domain** request, first plan the page architecture — see "Plan the app" — then these defaults apply *per page*.)

**Ask 1–3 focused questions only when the answer genuinely changes what you build** — a NEW data model (what fields/types), destructive or write operations (edit/delete flows), permissions, a genuinely divergent product choice, or the mandatory large-build execution choice below. Don't block a small read-only dashboard on questions with obvious defaults. If the user already gave a detailed spec, build directly only after any required large-build choice is settled.

## Security boundary — UI behavior is not authorization

- Component visibility/disable rules are UX only. Never present a hidden button, page, or modal as an access-control boundary.
- Use server-side datasource permissions and row-level security for sensitive data. In server-executed queries, prefer `globals.server.currentUser` for user-scoped filters; client-side `globals.currentUser` can be inspected or changed by the client.
- Server-side current-user variables are not available inside RunJS/RunPy. Do not move an authorization check into client-executed code.
- Ask about roles/ownership before adding destructive or sensitive writes. If the MCP surface cannot configure the required query/page permission or RLS policy, state the exact manual ToolJet step instead of claiming the app is secured.
- Never place credentials, tokens, or secrets in component properties, RunJS, query parameters, alerts, or seeded placeholder data.

## Plan the app — information architecture BEFORE any component

Decide the **page structure first.** This is the single biggest difference between a focused app and one crowded, slow-to-read page. Do this before creating anything.

1. **List the distinct user jobs the request implies.** "A personal hub with agenda, workouts, finances, and notes" is **four jobs**, not one screen. A CRM is "browse contacts / see a contact / log an activity". Each substantial job — its own data and its own workflow — is a candidate for its **own focused page**.
2. **Words like "homepage", "dashboard", "portal", "hub", "app" name a PRODUCT, not a single page.** Don't take them literally as one page. A multi-domain request almost always means **one overview page + one focused page per major job** — never every feature stacked on one long scroll.
3. **Design the page set:**
   - an **Overview / Home page** — at-a-glance summaries (a few KPI tiles + the single most important item from each domain) and **navigation into** the focused pages. It orients the user; it does NOT contain every domain's full table and form.
   - a **focused page per substantial workflow** — each does ONE job thoroughly (its list, its detail, its create/edit) with one obvious primary action.
   - a **genuinely simple, single-job app → a single page.** Don't fragment something that is truly one job.
4. **Map every capability to exactly ONE page.** If two unrelated capabilities are landing on the same page, that's the signal to split. Nothing unrelated piles onto the overview.
5. Give each page a clear one-line job and a relevant `icon`, then design each page (see Design below).

**State the page plan to the user first** — one line per page (`Home · overview` / `Workouts · log + history` / …). It's cheap, and it prevents the crowded-single-page failure before it happens.

## Build in phases — page architecture and phasing are SEPARATE decisions

Plan the whole page architecture up front (above). A phase is an *order-of-work* decision, not an architecture decision — **"phase 2" is the next capability built on the page where it belongs, NOT more stuff appended to the Home/overview page.**

- Treat scope as **large** when it implies 3+ substantive pages, 2+ independent complex workflows, a new multi-table model with several UI flows, or multiple datasource/integration surfaces.
- **For a large build, get the user's execution choice before any mutating build call.** State the page/phase plan and ask them to choose: **(1) phased checkpoints (recommended)** — deliver the highest-value complete journey first, then pause at each phase boundary for review; or **(2) whole app in one run** — build every requested phase before handoff, which will be slower and leaves a longer period without feedback. Do not silently choose for them.
- Make that choice **customer-facing and time-informed**. Give a rounded range for **first usable result** in phased mode and **estimated total active build time** for both modes (excluding time waiting for customer feedback), plus a simple confidence level. Estimate from substantive pages/workflows and datasource/schema certainty; widen the range for unknown wrappers or integration/runtime risk. Use ranges rounded to about 5–10 minutes, never fake precision or present the estimate as a promise. If sizing is genuinely uncertain, say `likely 30+ minutes · low confidence` instead of inventing a narrow range. Keep the message plain: `This is a larger build: <scope>. Phased (recommended): first usable part ~X–Y min; estimated total ~A–B min, with review checkpoints. Whole app: estimated ~A–B min before the complete handoff. These are rough estimates and may change if datasource or runtime issues appear.` Do not mention MCP calls, tokens, or internal implementation details in this customer choice.
- If the prompt already explicitly chooses phased delivery, "whole app", "one go", "build everything", or "do not stop", that is confirmation; do not ask again. A detailed feature spec alone is not an execution choice.
- **Deliver small, complete, POLISHED phases fast** — aim to give the user a **useful working loop within a few minutes** (view → act → feedback on one real page), not a broad skeleton. Polish is **not** a later phase; apply the design framework + async states to every phase as you go.
- **Complete journeys over skeletons.** Build ONE page's full loop (data + UI + interactivity + async states + polish) before starting the next. Never stub out several empty pages or scatter disconnected placeholders.
- **Phase 1 = the highest-value single job, fully working** on its own focused page (plus a minimal Home if the app is multi-domain). Each later phase = the next job's page, complete end-to-end.
- **Verify each completed page/primary flow with the page-level QA loop below** — not every tiny edit and not only once at the very end.
- **Keep recon separate from delivery.** Log MCP/skill gaps while building, but do not stop an app-generation phase to edit, test, commit, or push the MCP repository unless the user explicitly prioritizes tooling work over delivery. Finish the useful app checkpoint first, then batch the recon fixes.
- In phased-checkpoint mode, after each phase say what now works, name the next phase, and wait for the user to continue. In whole-app mode, report phase checkpoints as progress but continue without waiting. When the planned scope is done, proactively suggest **2–3 concrete, high-value things the app could grow into next**, grounded in its real data/domain. For a genuinely small app, skip this execution-choice prompt and build directly.

## App model & binding syntax

- app → version → page → component. `create_app` gives one app + version + a "Home" page. Add one or more pages with `add_pages`; use `update_pages` to retouch existing pages. ToolJet auto-renders navigation between pages. **Don't fragment a genuinely simple, single-job app** — one well-laid-out page is best there. **But a multi-domain / multi-job request needs the IA — an overview + a focused page per job, not one long crowded page.**
- **In a multi-page app, give EVERY page a relevant sidebar icon** — pass each `add_pages` item a Tabler `icon` name (e.g. `IconLayoutDashboard`, `IconUsers`, `IconChartBar`, `IconListDetails`, `IconSettings`, `IconReportAnalytics`). ToolJet gives the auto-created first/Home page an `IconHome2` fallback; added pages without an icon fall back to generic `IconFile` and make the left sidebar look unfinished.
- **Hide sub-pages that are only reached from another page** — for a page opened ONLY via `switch-page` (e.g. a detail/edit page you navigate to from a table row, not a top-level destination), set `hidden:true` on its `add_pages` item. It stays fully reachable but is removed from the sidebar nav, keeping the menu to real destinations. (An icon is still required — it shows if you later unhide it.)
- A component has **properties**; each property value is `{ "value": <val> }`. Values starting with `{{ … }}` are **bindings** evaluated at runtime.
- A query exposes its result as `queries.<queryName>.data`. Bind a component property to it, e.g. a Table's `data.value = "{{queries.<queryName>.data}}"`.

## Async & UI states — required, not polish

Any element backed by a query is **not done** until its states are handled. These are part of building the feature, not a later polish pass:
- **Loading:** use the component's **native loading state** (Table/Statistics/Button etc. have a `loadingState`), bound to the query's loading flag `{{queries.<q>.isLoading}}` — never leave a component blank while data loads.
- **Empty:** a query can return zero rows. Show a clear empty state ("No workouts logged yet" via a Text/HTML block, or the Table's own empty message) — not a blank grid or a broken-looking chart. A custom empty state may intentionally share the Table's rectangle when their `visibility` bindings are exact complements; MCP suppresses the overlap warning only when that exclusivity is provable.
- **Error:** a query can fail. Surface it (a `show-alert` on the query's failure event, or a visible error state) — never present blank/stale as if it were fine.
- **Refresh:** after any mutation, re-run list/count queries from the mutation query's `onDataQuerySuccess` lifecycle event.
- **Success:** confirm and close/reset only from `onDataQuerySuccess`; show an error and preserve input from `onDataQueryFailure`.
- **Disabled / no double-fire:** while a mutation runs, **disable the button that triggered it** — bind its `Disable` to the mutation query's `{{queries.<mutation>.isLoading}}` (or `control-component` setDisable/setLoading around the action). A double-click must never fire the mutation twice.

## Verify every completed page or primary flow

Read `references/verification.md` at the verification stage. The required loop is: await `lint_app_spec` before writes; run only explicitly selected safe reads (with count/large-read/billable-read approval when applicable); inspect scoped persisted values; run `validate_app`; then use one viewer-tab browser audit + screenshot, exercise the primary flow, collect all issues, repair in one batch, and run one confirmation pass. Validation is static and never proves query execution, event delivery, or rendering. Never test mutations, AI, email, or other side effects merely to validate a build. For forms/modals, include the DOM rectangle overlap and bounds check.

## Build guidance

- Always `create_app` first; thread `app_id` / `version_id` / `home_page_id` into later calls.
- Give each component a `name`; bind data by query name: `{{queries.<name>.data}}`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Repeat the clickable `viewer_url` and `editor_url` in the final handoff even when you already opened the viewer in the built-in browser. `app_url` is only a compatibility alias for the editor.
- **Close the loop with an efficiency note.** After building (and after each phase), tell the user roughly **how many MCP tool calls it took** — you can count your own calls, and fewer round-trips is the goal (batch with `add_components`/`add_queries`). Include **token usage only if your runtime actually surfaces it** to you; never fabricate a token number you don't have. Keep it to one line.

---

**Technical reference:** exact per-component binding rules and the full built-in palette are in `references/tooljet-reference.md`. Datasource request contracts and known response shapes/statuses are served on demand by `get_datasource_query_schema`.
