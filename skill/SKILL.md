---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via the tooljet-mcp tools — create apps, add datasource queries, and add components bound to them. Use whenever asked to build/scaffold a ToolJet app, dashboard, or internal tool, or to add pages/components/queries. This is a KNOWLEDGE reference (component binding rules, canvas mechanics, query schemas); YOU make all layout and design decisions."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - TJ-AI COMPONENT_BINDING_RULES (22 components)
    - ToolJet WidgetManager catalog (81 built-in components)
    - ToolJet appCanvasConstants (grid mechanics)
---

<!-- GENERATED FILE — do not edit by hand. Run `node scripts/generate-skill.mjs` to regenerate. -->

## What this skill is

Facts you need to build ToolJet apps through the `tooljet-mcp` tools — the component binding rules, the canvas coordinate system, and query schemas. It contains **no design opinions**: which components to use, how to lay them out, and how they look are **your** decisions. Aim for a clean, polished, enterprise-grade result.

Every tool call goes through ToolJet's governed API (your session + permissions). ToolJet apps are configuration over a fixed component library, not code.

## Be honest about what's buildable — don't say yes to everything

Build only what these MCP tools and ToolJet's **real** components/features actually support. If a request — or any part of it — can't be done with the standard tools (a component or property that doesn't exist, an interaction ToolJet doesn't support, **a datasource or third-party integration that isn't connected — you cannot connect a new one from here**, anything outside this tool surface), **tell the user plainly**: name what isn't supported and why, and offer the nearest supported alternative or a manual step in the visual builder. (For an unconnected source like Strava/Stripe/a new API: offer to have the user connect it first, or build against a **seeded placeholder table**, clearly labelled — details in the reference. Never handle credentials yourself.) **Never fake it** — don't invent components/properties/actions, don't silently drop a requested feature and present the app as finished, and don't claim something works when you haven't verified it (use `run_query` / `validate_app` / the browser pass to actually check). Delivering the supported parts and clearly listing what you couldn't do — and why — is the honest, useful outcome; a broken or imaginary feature presented as working is not.

## Keep context small — load only the relevant reference

Tool input schemas, catalog responses, and returned warnings are authoritative. Do not preload every reference:

- Read `references/ui-authoring.md` before laying out a new page or using a layout-sensitive Table/Chart/nested view.
- Read `references/forms-and-interactions.md` only for forms, modals, mutations, or event wiring.
- Read `references/tool-workflows.md` only for a non-obvious authoring/update path, an existing-app repair, or a silent runtime/configuration failure.
- Read `references/tooljet-reference.md` selectively for exact per-component binding rules, the built-in palette, and datasource query shapes. Prefer batched, section-filtered catalog tools over loading broad reference material.

For a new phase, use `lint_app_spec` as an awaited barrier, inspect its warnings/errors, then pass its one-time `plan_token` to `apply_app_phase`. Never dispatch the linter and an apply/write as siblings in parallel. Batch tools are the default surface and accept one item for targeted creates; use update tools for persisted objects. Set `TOOLJET_INCLUDE_LEGACY_SINGULAR_TOOLS=true` only for an older client that still calls `create_table`, `insert_rows`, `add_page`, `add_query`, or `add_component`.

For reads, inspect schema first, request explicit columns, and never author or execute `SELECT *` against an unfamiliar table. Count first when size is unknown; above 1,000 rows, propose server-side pagination and require explicit user approval before a full read. General permission to build or inspect an app is not consent for a large read.

Seed writes are insert-only: omit generated serial primary keys so ToolJet uses the real sequence. A duplicate-key failure must never be treated as permission to update an existing row. Page/table/column deletion requires explicit approval for the exact target and `confirm:true`.

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

## Verify your work — browser-free checks first, then a real browser pass

**Do the cheap checks continuously, without a browser** (this replaces the slow open-screenshot-adjust loop, NOT the final visual check):
- Before the first write, run one `lint_app_spec` over the planned tables/seed data, queries, pages/components, events, and lifecycles. This is an **awaited preflight barrier**: call it alone, inspect the result, correct all errors, then consume its `plan_token` with `apply_app_phase`. Never run the linter concurrently with that or any other mutating tool.
- For one bounded, non-mutating, non-billable read query, call `run_query(query_id, version_id)`; for two or more independent bounded ToolJet DB/SQL reads, prefer one preflighted `run_queries(query_ids, version_id)` batch. For an unbounded read, use the count-first flow above—never bypass it with `SELECT *` or inferred user consent. Inspect real values before hardcoding chart series/options. If a result warns about `components.*`, verify those runtime-resolved values in the viewer. Do **not** test mutations, AI, email, or other side effects merely to validate a build.
- Inspect with a **scoped** `get_app_summary` (the current page/component plus exact dotted fields, not the whole app) to confirm bindings/values are what you intended; `update_*` anything wrong.
- Run `validate_app(app_id)` — it statically checks references, query option contracts, event compatibility, and render traps with no browser or query execution. Fix every `error`; review the `warnings`. Its explicit `not_checked` list still needs targeted runtime/browser verification.

**Then run one page-level browser QA loop for each completed page/primary flow.** Open or refresh the same **VIEWER** tab (`.../applications/<appId>/<pageHandle>?env=development&version=v1`, not the editor canvas). Read `scripts/browser-audit.js` from this skill and evaluate its complete IIFE once in that page; it returns bounded component rectangles, real two-axis overlaps, clipped text, blank-widget candidates, nested scroll pairs, dialogs, below-fold buttons, and visible Plotly Charts with zero evaluated traces. Take one screenshot for visual context, exercise the key flow, and **collect every issue before editing** unless a blank/error/blocker prevents further inspection. The audit explicitly does not check console/network failures, hidden conditional states, or mutation correctness—use the browser's relevant facilities for those only when the flow needs them. Group fixes by page/tool, apply the smallest number of batched `update_components` / `update_layout` / `update_events` calls, then do **one confirmation audit + screenshot**. Do an additional browser check only at a genuine new risk point such as a newly added Chart, dense custom layout, or multi-step interaction.

For an **Operate** page, this browser pass must also confirm that its primary action is visible without first scrolling the page and that a bounded Table/Listview does not introduce a second vertical scroll region around the whole page. If both scroll regions are deliberate, report that explicitly; otherwise shorten/reposition the operational surface in one repair batch.

**For every form/modal, measure geometry once—screenshots can hide small overlaps.** ToolJet widget wrappers use `id=<component_id>`, so one browser evaluation can collect each child's `getBoundingClientRect()`. A real collision requires overlap on **both axes** (`xOverlap && yOverlap`), which avoids false positives for side-by-side fields; also compare child bottoms with the modal body/bounds. MCP warnings from `add_components`, `update_components`, `update_layout`, and `validate_app` catch static rendered-height/modal sizing mistakes, while this DOM check confirms runtime/dynamic layout.

**Triage before repairing:**
- **Always fix:** blank/error rendering, incorrect or unbound data, broken navigation, failed primary actions, misleading values, unreadable core charts/tables, and missing loading/error behavior that breaks the workflow.
- **Fix at the default target viewport:** usability/accessibility problems that impede the page's intended job.
- **Report unless requested:** tiny spacing/font differences, cosmetic wrapping seen only at an unusual viewport, and evidence-backed ToolJet/editor limitations. Allow at most one collected cosmetic repair batch; do not enter repeated pixel-polish loops.
- If something appears to be a platform/manual-builder limitation, make one targeted evidence check, then report the exact limitation and manual step instead of probing repeatedly. Get one complete primary loop working before cosmetic work; before declaring the **whole requested app** complete, verify every requested primary flow.

**Verify the default desktop render only** — don't cycle through many viewport sizes; you don't know the customer's target device, and resizing the window doesn't validate ToolJet's real mobile layout anyway. Test other viewports only if the user asks.

**When the browser shows something wrong, do NOT enter a click-by-click repair loop.** Diagnose with `get_app_summary` / `run_query`, then fix in place with `update_components` / `update_query` / `update_events`, and reload the viewer to confirm. The browser is for *verifying* and catching what data checks can't (visual/render/runtime), not for authoring or as the repair mechanism.

### Fast default build sequence

1. Plan the page/data model and stable logical refs locally; do not write a skeleton first.
2. Fetch all needed complex component contracts in one selective `get_component_catalog({types:[...]})` call and all datasource operation contracts in one `get_datasource_query_schema({requests:[...]})` call. Reuse both results for the whole build.
3. Run and await `lint_app_spec` **by itself**. Inspect/fix its result, then consume the returned token with one `apply_app_phase` call; never dispatch the linter and the apply call as siblings in parallel.
4. Run selected safe reads, review the static validation returned by the apply call (use `validate_app` again only after later manual edits), then make one collected browser tour across the completed primary flows, one repair batch, and one confirmation pass. Do not screenshot-poll or reopen catalogs between pages.

## Build guidance

- Always `create_app` first; thread `app_id` / `version_id` / `home_page_id` into later calls.
- Give each component a `name`; bind data by query name: `{{queries.<name>.data}}`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Repeat the clickable `app_url` in the final handoff even when you already opened it in the built-in browser.
- **Close the loop with an efficiency note.** After building (and after each phase), tell the user roughly **how many MCP tool calls it took** — you can count your own calls, and fewer round-trips is the goal (batch with `add_components`/`add_queries`). Include **token usage only if your runtime actually surfaces it** to you; never fabricate a token number you don't have. Keep it to one line.

---

**Technical reference:** exact per-component binding rules and the full built-in palette are in `references/tooljet-reference.md`. Datasource request contracts and known response shapes/statuses are served on demand by `get_datasource_query_schema`.
