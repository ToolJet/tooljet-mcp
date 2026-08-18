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

## The tools

- `create_app(name)` → `{ app_id, version_id, home_page_id, app_url }`. Call first; keep all four.
- `list_datasources(version_id)` → `[{ id, name, kind }]`. ToolJet DB is `kind: "tooljetdb"`.
- `list_tables()` → `[{ id, table_name }]`. A ToolJet-DB query needs the table's **id** as `table_id`.
- `get_table_schema(table_name)` → a table's columns `[{ name, type, isPrimaryKey, isNotNull }]`. Read before building queries/columns/forms/filters on an existing table.
- `create_table({ table_name, columns })` → create a ToolJet-DB table (column types: string/integer/number/bigint/boolean/timestamp/json/serial; a serial `id` PK is added if you don't mark one). Returns `{ table_id, table_name }`.
- `insert_rows({ table_name, rows })` → seed sample rows so the app isn't empty (optional; integer/serial PKs auto-fill).
- `get_component_catalog()` → the component palette (every type + purpose). `get_component_catalog(type)` → that component's **full property schema** (props with type + default, defaultSize, styles). **Always call `get_component_catalog(type)` before configuring a component** so you set real properties, not guesses.
- `add_query({ version_id, datasource_id, name, options })` → `{ query_id, name }`. Single query.
- `add_queries({ version_id, queries: [...] })` → `[{ query_id, name }]`. **Create ALL an app's queries in one call.**
- `run_query({ query_id, version_id })` → `{ status, data, ... }`. **Run a saved query and see its REAL rows — no browser.** Use to verify a query works and to read actual values (statuses, categories) before writing chart series / dropdown options / filters. Check `status` ("ok"/"failed") — HTTP is 200 even on failure.
- `add_component({ app_id, version_id, page_id, name, type, properties, styles, layout })` → `{ component_id, warnings }`. Single component; `name` required. Put styling in `styles` (NOT `properties`).
- `add_components({ app_id, version_id, page_id, components: [...] })` → `{ components: [{ component_id, name }], warnings }`. **Place ALL of a page's components in one call.**
- Both return a **`warnings`** array of non-blocking lint hints — a Chart left with its clipping default title, a Table bound without `dataSourceSelector:"rawJson"`, overlapping components, an invalid `headerCasing`, etc. **Read them and fix**; they don't block the write. (Style keys under `properties` are a hard error, not a warning.)
- `add_events({ app_id, version_id, events: [...] })` → wire interactivity (each event = a trigger on a component + an action). This is how the app DOES things. Create all events in one call. See "Interactivity" below.

**Batch for the build, singular for edits.** When first building an app, create everything with `add_queries` + `add_components` (far fewer round-trips). Use the singular `add_query`/`add_component` afterwards for incremental edits (e.g. "add a status filter"). A batch is atomic — if one item is invalid the whole call fails; fix that item and retry.

### Inspect & edit in place — fix mistakes, NEVER rebuild the app
- `get_app_summary(app_id)` → compact `{ pages:[{id,name,components:[{id,name,type,layouts,properties,styles,others}]}], queries, events }` — actual bound values only. **Use this for routine inspection** (`get_app` returns the full 100KB+ raw app; avoid it).
- `get_component(app_id, component_id)` → one component's values + its `page_id`.
- `update_components({ app_id, version_id, page_id, updates:[{ component_id, definition:{properties?,styles?,...} }] })` → edit in place. Send only CHANGED leaves (deep-merged); arrays like Table `columns` / dropdown `options` are REPLACED. Rename/reparent via `name`/`parent` (separate from `definition`).
- `delete_components({ app_id, version_id, page_id, component_ids:[...] })` · `update_layout({ ..., layouts:[{ component_id, desktop?, mobile? }] })` (move/resize).
- `update_query({ query_id, version_id, options })` (options REPLACE wholesale) · `delete_query({ query_id, version_id })`.
- `list_events({ app_id, version_id, source_id? })` · `update_events({ ..., events:[{ event_id, name, event }] })` · `delete_event({ app_id, version_id, event_id })`.
- `validate_app(app_id)` → `{ ok, errors, warnings }`. Structural check with no browser — dangling event/query references, ambiguous duplicate names, bindings to non-existent queries/components, and per-component render traps. Run it before you call the app done.

**A single wrong value is a one-call fix, not a rebuild.** When something is off, `get_app_summary` → `update_*`/`delete_*` the offending item. Do NOT create a new app or pile on duplicate components to "correct" a mistake.
- `get_app(app_id)` → the FULL raw app (large; prefer `get_app_summary`).
- `add_page({ app_id, version_id, name, icon })` → `{ page_id, name }`. Add a page; pass its `page_id` to add_component(s), and a Tabler `icon` (see App model). ToolJet renders cross-page navigation automatically.

## Before you build — prefer safe defaults; ask only when it changes what you build

Don't reflexively interrogate the user. For a **common read-only dashboard on an existing table** (a single job), safe defaults exist — just build it: use the table as-is, assume read-only (no writes unless asked), use the Table's **built-in search/sort/filter** rather than external filter widgets, surface the signals that actually matter as `Statistics`/`Chart` (only what answers a real question — see the design framework), and neutral ToolJet-native styling. Ship it, then refine. (For a **multi-domain** request, first plan the page architecture — see "Plan the app" — then these defaults apply *per page*.)

**Ask 1–3 focused questions only when the answer genuinely changes what you build** — a NEW data model (what fields/types), destructive or write operations (edit/delete flows), permissions, or a genuinely divergent product choice. Don't block a read-only dashboard on questions with obvious defaults. If the user already gave a detailed spec, build directly.

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

Plan the whole page architecture up front (above); **build it in phases.** A phase is an *order-of-work* decision, not an architecture decision — **"phase 2" is the next capability built on the page where it belongs, NOT more stuff appended to the Home/overview page.**

- **If the scope is large, say so** and propose the phase breakdown (one line each) before building.
- **Deliver small, complete, POLISHED phases fast** — aim to give the user a **useful working loop within a few minutes** (view → act → feedback on one real page), not a broad skeleton. Polish is **not** a later phase; apply the design framework + async states to every phase as you go.
- **Complete journeys over skeletons.** Build ONE page's full loop (data + UI + interactivity + async states + polish) before starting the next. Never stub out several empty pages or scatter disconnected placeholders.
- **Phase 1 = the highest-value single job, fully working** on its own focused page (plus a minimal Home if the app is multi-domain). Each later phase = the next job's page, complete end-to-end.
- **Verify each increment in the browser as you finish it** — not once at the very end.
- After each phase, say what now works and **name the next phase**; when the planned phases are done, proactively suggest **2–3 concrete, high-value things the app could grow into next**, grounded in its real data/domain. **But** honor "just wait" (build end-to-end), and for a genuinely small app skip phasing.

## App model & binding syntax

- app → version → page → component. `create_app` gives one app + version + a "Home" page. Add pages with `add_page` per the information architecture (above). ToolJet auto-renders navigation between pages. **Don't fragment a genuinely simple, single-job app** — one well-laid-out page is best there. **But a multi-domain / multi-job request needs the IA — an overview + a focused page per job, not one long crowded page.**
- **In a multi-page app, give EVERY page a relevant icon** — pass `add_page`'s `icon` (a Tabler icon name, e.g. `IconLayoutDashboard`, `IconUsers`, `IconChartBar`, `IconListDetails`, `IconSettings`, `IconReportAnalytics`). The icon shows in the auto-generated nav; a page without one falls back to a generic file icon and the nav looks unfinished.
- A component has **properties**; each property value is `{ "value": <val> }`. Values starting with `{{ … }}` are **bindings** evaluated at runtime.
- A query exposes its result as `queries.<queryName>.data`. Bind a component property to it, e.g. a Table's `data.value = "{{queries.<queryName>.data}}"`.

## Component selection — built-in for interactive/data surfaces, HTML where it makes the UI better

ToolJet's value is **visually-editable, governed low-code config**: a built-in component can be edited in the visual builder by anyone. So anything the user will **interact with, bind data to, or edit** should be a built-in — a KPI tile → `Statistics`, a chart → `Chart`, a data grid → `Table`, inputs → `TextInput`/`NumberInput`/`DropdownV2`, forms → `Form`, progress → `CircularProgressbar`. Don't rebuild those in HTML — you'd throw away the visual editing and governance that are the whole point.

**But HTML is a first-class tool where it genuinely makes the app better — use it deliberately, not only as a last resort:**
- **Presentational / display-only content** — a styled hero or banner, a rich info card, a legend, an empty state, a formatted read-only block — where custom markup gives better aesthetics and more flexible layout than stacking built-ins. If the user won't interact with it or need to edit it, HTML is often the cleaner, better-looking choice.
- **Custom markup inside a component's own properties** — many components take HTML in their content/cell/tooltip properties (a Table column rendered as HTML, a `Text` set to HTML, custom cell formatting). Use it to polish the UI in place.
- **Rule of thumb:** built-in when it's **interactive, data-bound, or meant to be tweaked visually**; HTML when it's **static presentation or fine UI customization** and HTML expresses it more cleanly.

The full built-in palette (every `type` + purpose) is in **`references/tooljet-reference.md`**; pick from built-ins first. Once you've picked one, call `get_component_catalog(type)` for its exact properties (and, for `Chart`/`Statistics`, the `renderingHints` sizing defaults) — configure precisely, don't guess property names.

## Canvas & grid mechanics (FACTS — you must respect these to position components)

ToolJet's canvas is a fixed grid. Components are **absolutely positioned** — they do NOT reflow or auto-stack. If you don't compute positions correctly, components **overlap**.

- The canvas is **43 columns** wide. A component's `left` and `width` are in **columns** (0–43). Full width = `left: 0, width: 43`.
- `top` and `height` are in **pixels**, snapped to a **10px** vertical grid. A typical input is ~40px tall; a data table ~300–500px.
- Every component's `layout` must be given for **both resolutions**: `{ desktop: {top,left,width,height}, mobile: {top,left,width,height} }`.
- **Stacking rule (prevents overlap):** to place component B below component A, set `B.top = A.top + A.height + gap` (gap ~10–20px). Never reuse the same `top` for two components in the same area — the later one draws over the earlier one.
- The full canvas is 43 columns; how you use that space is a design choice (see Design defaults below) — don't reflexively span edge-to-edge.

## Design — decide before you build, then apply the visual defaults

A good ToolJet app comes from a content-aware decision, not a fixed template. Work in layers: frame the page, apply the house visual defaults, respect the rendering guardrails. If the user states any layout, spacing, density, or brand preference, **the user always wins.**

### 1. Frame the page (before creating any component)
Infer, in one quick pass:
- the **primary user** (who opens this), the **primary object** (what it's about), the page's **single main job**, the **primary action** if any, and the **one signal or decision** that matters most.
- the **page mode** — pick one: **Monitor** (is anything wrong?), **Explore** (find/slice records), **Operate** (act on items), **Inspect** (understand one record), **Edit** (change data), or **Configure** (settings). The mode drives the layout.

Then hold to these:
- **One dominant region and at most one dominant action** per page; everything else is clearly secondary.
- **Every component answers a distinct user question.** Remove anything that repeats information already communicated adequately.
- **Size regions by importance, information density, and label length** — not reflexive equal widths. The main region gets the space.
- **One primary accent**, taken from the user's branding or the domain; keep other surfaces neutral and reserve semantic colors (green/amber/red) for actual state, not decoration.
- **Human-readable identity first** in tables — lead with the name/title/human field, not the technical id.
- **Headings name the user's decision or context** ("Needs attention today"), not the component type ("Table").
- **Quick internal design critique before building** — one line each: hierarchy (is the main thing biggest?), redundancy (anything duplicated?), density (too cramped or too empty?), responsive order (what should lead on a narrow screen?), visual signature (one accent, not five?). Fix it before you create components.

### 2. Visual defaults (apply unless the user says otherwise)
- **Polish:** it must read as a **designed app, not components dropped on a canvas** — real hierarchy, grouped sections, consistent spacing, aligned edges, no overlaps.
- **Page header (every page):** a title + one-line subtitle, styled via the Text's *native* styles so it reads as a header (a default-styled Text looks unfinished). Title `Text` ≈ `styles.textSize {{24}}`, `fontWeight bold`, `textColor` a strong dark (e.g. `#111827`); subtitle `Text` ≈ `textSize {{14}}`, muted grey (e.g. `#6b7280`); ~8px under the title, ~24px before content. (Exact keys from `get_component_catalog("Text")`.)
- **Canvas padding:** don't run edge-to-edge across all 43 columns — keep a consistent side gutter (top-level content ≈ columns **2–41**). Full-bleed only if asked.
- **Consistent spacing:** ONE vertical gap between stacked sections (~16–24px) and ONE shared left edge for all top-level components.
- **Peer components** in a row (KPI tiles, filters) share equal widths, equal gaps and a common top — unless importance or label length justifies otherwise (see framing).

### 3. ToolJet rendering guardrails (these prevent real render bugs)
- **Chart titles clip** at common dashboard sizes. **Default: leave `Chart.title` empty and put a separate `Text` heading above the chart**, with its own heading slot + spacing. Enable a native chart title only after you've visually verified it doesn't clip at that size.
- **Chart widths** (defaults, not hard limits): a compact few-category pie/donut ≈ **13–15 columns**; a categorical bar with longer labels ≈ **20–24 columns**; at most **two** normal analytical charts in one ~39-column content row unless labels are short and readability is verified.
- **Statistics height:** a compact tile with no visible secondary content ≈ **110–120px**; with useful secondary content ≈ **130–150px**.
- **Table columns:** when presentation matters, set an **explicit, complete `columns` array** in the order you want. Do **not** rely on the property order of a transformed query object to reorder existing ToolJet columns — it won't reorder them. Natural header casing is fine: **`headerCasing: "none"` is a valid value** (keeps human labels like "Due date" instead of forcing Title/UPPER casing).

### 4. Density — don't overcrowd; split instead
- A page should serve **~one primary job** (plus light supporting context). If you find yourself stacking full tables/forms for multiple **unrelated** domains on one page, STOP and split them into focused pages (see "Plan the app") — crowding is an **architecture** smell, not a layout problem.
- Use **progressive disclosure**: push secondary detail behind a row-click → detail page or modal, and behind tabs/sections — don't lay everything inline at once.
- Keep **one obvious primary action** per page and a clear visual hierarchy; if a user can't tell what this page is *for* in a glance, it's doing too much.
- **But dense is fine when the job genuinely needs it.** A legitimate operational surface (a trading console, an ops monitor, an admin grid) can be information-dense — density is only a problem when it **mixes unrelated jobs** or **buries the primary action**. Judge by "one clear job + one obvious primary action + clean hierarchy", not a hard component count.

### 5. Mobile — skip it by default
Most customers view these on desktop. **Don't build or tune a mobile layout for the initial build unless the user explicitly asks.** When they do, treat mobile as **recomposition** — rethink what leads and what collapses on a narrow screen — not blind vertical stacking of the desktop layout. And note: **resizing a browser window does NOT prove ToolJet's mobile layout rendered** — that is a structural guess, not real mobile visual validation; only claim mobile works if you verified it the way ToolJet actually renders mobile.

## Async & UI states — required, not polish

Any element backed by a query is **not done** until its states are handled. These are part of building the feature, not a later polish pass:
- **Loading:** use the component's **native loading state** (Table/Statistics/Button etc. have a `loadingState`), bound to the query's loading flag `{{queries.<q>.isLoading}}` — never leave a component blank while data loads.
- **Empty:** a query can return zero rows. Show a clear empty state ("No workouts logged yet" via a Text/HTML block, or the Table's own empty message) — not a blank grid or a broken-looking chart.
- **Error:** a query can fail. Surface it (a `show-alert` on the query's failure event, or a visible error state) — never present blank/stale as if it were fine.
- **Refresh:** after any mutation (create/update/delete), **re-run the list query** so the UI reflects the change (see "Form submit → insert + refresh").
- **Success:** confirm a mutation with a `show-alert` success (and `close-modal` if it was in a modal).
- **Disabled / no double-fire:** while a mutation runs, **disable the button that triggered it** — bind its `Disable` to the mutation query's `{{queries.<mutation>.isLoading}}` (or `control-component` setDisable/setLoading around the action). A double-click must never fire the mutation twice.

## Reference — look these up as you build

The full **per-component binding rules**, the **built-in component palette**, and **per-datasource query schemas** are in **`references/tooljet-reference.md`** — open it before configuring a component or writing a query. (Or call `get_component_catalog(type)` for one component's full schema.)

The gotchas that most often break a build, inlined so you don't miss them:
- **Table:** set `data.value = {{queries.<q>.data}}` **and** `dataSourceSelector.value = "rawJson"` (both, or it renders blank); keep table-level `autogenerateColumns` true unless you supply a full explicit `columns` array.
- **DropdownV2:** the selection is `.value` (display text `.selectedOption.label`); `.label` is the field TITLE — never filter data on it. Bound options need `visible:true` + `default:true` to preselect.
- **Styling** goes in the top-level `styles` object, **never** under `properties`.
- **Chart:** empty native title + a separate `Text` heading; build `data` as a simple explicit `[{x,y}]` and do heavy aggregation in a **query**, not in the chart binding.
- **Events:** the id is `set-custom-variable` (not `set-variable`); master→detail passes the row via `set-custom-variable` + `{{variables…}}` (a `runOnPageLoad` query does NOT re-run on an in-app page switch).
- **tjdb queries** reference the table by `table_id` (from `list_tables()`), not by name; writes use indexed-object option shapes (see the reference).
- **New data model:** for "build a CRM / expense tracker" with no table yet — **propose the tables+columns and confirm with the user** (schema is a commitment), then `create_table` → optional `insert_rows` → `add_queries`/`add_components`.

## Interactivity — wire events so the app DOES things (not just displays)

Components and queries alone make a *static* app. Use `add_events` to add behavior. Each event = **a trigger on a component + an action**: `{ component_id, trigger, action }`.

**Triggers** (the `trigger` = the component's event id): Button → `onClick`; Table → `onRowClicked`, `onSearch`, `onPageChanged`, `onBulkUpdate`; text/number inputs → `onChange`, `onEnterPressed`; Form → `onSubmit`. (A component's exact events are in `get_component_catalog(type)` / its widget definition.)

**Actions** (`action = { actionId, ...params }`) — use these exact `actionId` strings (invalid ids silently do nothing):
- **Run a query:** `{ actionId: 'run-query', queryId: '<query id>', queryName: '<name>' }`
- **Switch page:** `{ actionId: 'switch-page', pageId: '<target page id>' }` (see master→detail below for passing data).
- **Show alert:** `{ actionId: 'show-alert', message: 'Saved', alertType: 'success' | 'info' | 'warning' | 'error' }`
- **Show modal:** `{ actionId: 'show-modal', modal: '<modal component id>' }` · **Close modal:** `{ actionId: 'close-modal', modal: '<modal component id>' }`
- **Set a custom variable:** `{ actionId: 'set-custom-variable', key: 'selectedTicket', value: '{{components.<table>.selectedRow}}' }` — the id is **`set-custom-variable`** (NOT `set-variable`, which does not exist); read it back as `{{variables.selectedTicket}}`. Also: `unset-custom-variable`.
- **Control a component:** `{ actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: 'setValue' | 'clear' | 'setVisibility' | 'setDisable' | 'setLoading', ... }` — reset/prefill an input, toggle visibility, etc.
- **Export data:** `{ actionId: 'generate-file', ... }` (CSV/PDF) · **Copy:** `{ actionId: 'copy-to-clipboard', ... }`.

(Other valid ids include `set-table-page`, `set-page-variable`, `open-webpage`, `go-to-app`, `logout`, `set-localstorage-value`, `scroll-component-into-view`.)

**Common recipes:**
- **Form submit → insert + refresh:** on the submit Button's `onClick`, two events: `run-query` (the insert/create query), then `run-query` (the list query, to refresh the table). Add `show-alert` success, and `close-modal` if the form is in a modal.
- **Master → detail (IMPORTANT — the naive way silently fails):** on Table `onRowClicked`, FIRST `set-custom-variable` (key e.g. `selectedTicket`, value `{{components.<table>.selectedRow}}`), THEN `switch-page` to the detail page. Bind the detail page's components to `{{variables.selectedTicket.<field>}}`. **Do NOT** filter a detail query on `{{globals.urlparams.*}}` and rely on `runOnPageLoad` — a `runOnPageLoad` query does NOT re-run on an in-app page switch (only the page's own load event fires), so that detail query never runs. Prefer binding straight to the passed `{{variables…}}` row; if you truly need a fresh query, trigger it from a component action on the detail page.
- **Refresh on filter:** an input's `onChange`/`onEnterPressed` → `run-query` on the list query whose `where_filters` reference the input.
- **Prevent double-submit:** bind the submit Button's `Disable` to the mutation query's loading (`{{queries.<mutation>.isLoading}}`) so it can't fire twice, and show its native loading state while the mutation runs. (See "Async & UI states".)

Wire events AFTER the components and queries exist (you need their ids). Prefer one `add_events` call for all of an app's events.

## Verify your work — browser-free checks first, then a real browser pass

**Do the cheap checks continuously, without a browser** (this replaces the slow open-screenshot-adjust loop, NOT the final visual check):
- After creating a data query, call `run_query(query_id, version_id)` to confirm it returns rows and to READ real values — statuses, categories, ranges — before you hardcode chart series, dropdown options, or filter values. Don't guess a status is "Open/Closed"; run the query and see.
- Inspect with `get_app_summary` (not `get_app`) to confirm bindings/values are what you intended; `update_*` anything wrong.
- Run `validate_app(app_id)` — it catches dangling references, ambiguous duplicate names, bindings to non-existent queries/components, and render traps (unbound Table, Chart clipping title, bad headerCasing) with no browser. Fix every `error`; review the `warnings`.

**Then verify in a browser — at least once, before you call the app done.** Open the **VIEWER** URL (`.../applications/<appId>/<pageHandle>?env=development&version=v1`, not the editor canvas — the editor can render components staircased right after API creation and self-corrects on reload, a non-bug). Confirm: the page renders, queries populated real data, there are no console errors, and the key interactions work (row click, filter, submit). Also do a browser check at **genuine risk points while building** — after adding a `Chart`, a custom/dense layout, or multi-step interactivity — not just at the very end. **Verify the default desktop render only** — don't cycle through many viewport sizes; you don't know the customer's target device, and resizing the window doesn't validate ToolJet's real mobile layout anyway. Test other viewports only if the user asks.

**When the browser shows something wrong, do NOT enter a click-by-click repair loop.** Diagnose with `get_app_summary` / `run_query`, then fix in place with `update_components` / `update_query` / `update_events`, and reload the viewer to confirm. The browser is for *verifying* and catching what data checks can't (visual/render/runtime), not for authoring or as the repair mechanism.

## Avoid these (they silently fail or force rebuilds)

- **Styling under `properties`.** Native styling goes in the top-level `styles` object; ToolJet ignores styles nested in `properties` (and `add_component` will reject them).
- **Filtering on `DropdownV2.label`.** `.label` is the field TITLE. The selection is `.value` (display text is `.selectedOption.label`).
- **`set-variable`.** Not a real action id — use `set-custom-variable`.
- **Master→detail via urlparams + `runOnPageLoad`.** It won't re-run on page switch; pass the row via `set-custom-variable` and bind to `{{variables…}}`.
- **External dropdown filters as the first cut** when the Table's built-in search/sort/filter already covers status/priority/assignee. Add external filters only as a deliberate enhancement once verified.
- **Rebuilding to fix a mistake.** Use `update_components` / `update_query` / `update_events` — never create a second app or duplicate components to "correct" something.
- **A Table showing demo columns (photo/email/…).** That means its `data` binding resolved empty — fix the query binding, not the columns.
- **Dumping every requested capability onto one page.** A multi-domain request = an overview + focused pages (see "Plan the app"), not one long crowded scroll.
- **Skeleton or placeholder pages** with no working loop — build one complete journey before starting the next.
- **Query-backed UI with no loading / empty / error state** — those are required parts of the feature, not polish.
- **A mutation button that can be double-fired** — disable it while the mutation runs.

## Build guidance

- Always `create_app` first; thread `app_id` / `version_id` / `home_page_id` into later calls.
- Give each component a `name`; bind data by query name: `{{queries.<name>.data}}`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Report the `app_url` back to the user.
- **Close the loop with an efficiency note.** After building (and after each phase), tell the user roughly **how many MCP tool calls it took** — you can count your own calls, and fewer round-trips is the goal (batch with `add_components`/`add_queries`). Include **token usage only if your runtime actually surfaces it** to you; never fabricate a token number you don't have. Keep it to one line.

---

**Technical reference:** exact per-component binding rules, the full built-in palette, and per-datasource query schemas are in `references/tooljet-reference.md`. Open it before configuring a component or writing a query.
