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
- `add_component({ app_id, version_id, page_id, name, type, properties, styles, layout })` → `{ component_id }`. Single component; `name` required. Put styling in `styles` (NOT `properties`).
- `add_components({ app_id, version_id, page_id, components: [...] })` → `[{ component_id, name }]`. **Place ALL of a page's components in one call.**
- `add_events({ app_id, version_id, events: [...] })` → wire interactivity (each event = a trigger on a component + an action). This is how the app DOES things. Create all events in one call. See "Interactivity" below.

**Batch for the build, singular for edits.** When first building an app, create everything with `add_queries` + `add_components` (far fewer round-trips). Use the singular `add_query`/`add_component` afterwards for incremental edits (e.g. "add a status filter"). A batch is atomic — if one item is invalid the whole call fails; fix that item and retry.

### Inspect & edit in place — fix mistakes, NEVER rebuild the app
- `get_app_summary(app_id)` → compact `{ pages:[{id,name,components:[{id,name,type,layouts,properties,styles,others}]}], queries, events }` — actual bound values only. **Use this for routine inspection** (`get_app` returns the full 100KB+ raw app; avoid it).
- `get_component(app_id, component_id)` → one component's values + its `page_id`.
- `update_components({ app_id, version_id, page_id, updates:[{ component_id, definition:{properties?,styles?,...} }] })` → edit in place. Send only CHANGED leaves (deep-merged); arrays like Table `columns` / dropdown `options` are REPLACED. Rename/reparent via `name`/`parent` (separate from `definition`).
- `delete_components({ app_id, version_id, page_id, component_ids:[...] })` · `update_layout({ ..., layouts:[{ component_id, desktop?, mobile? }] })` (move/resize).
- `update_query({ query_id, version_id, options })` (options REPLACE wholesale) · `delete_query({ query_id, version_id })`.
- `list_events({ app_id, version_id, source_id? })` · `update_events({ ..., events:[{ event_id, name, event }] })` · `delete_event({ app_id, version_id, event_id })`.

**A single wrong value is a one-call fix, not a rebuild.** When something is off, `get_app_summary` → `update_*`/`delete_*` the offending item. Do NOT create a new app or pile on duplicate components to "correct" a mistake.
- `get_app(app_id)` → the FULL raw app (large; prefer `get_app_summary`).
- `add_page({ app_id, version_id, name })` → `{ page_id, name }`. Add a page; pass its `page_id` to add_component(s). ToolJet renders cross-page navigation automatically.

## Before you build — prefer safe defaults; ask only when it changes what you build

Don't reflexively interrogate the user. For a **common read-only dashboard on an existing table**, safe defaults exist — just build it: use the table as-is, assume read-only (no writes unless asked), use the Table's **built-in search/sort/filter** rather than external filter widgets, surface the signals that actually matter as `Statistics`/`Chart` (only what answers a real question — see the design framework), and neutral ToolJet-native styling. Ship it, then refine.

**Ask 1–3 focused questions only when the answer genuinely changes what you build** — a NEW data model (what fields/types), destructive or write operations (edit/delete flows), permissions, or a genuinely divergent product choice. Don't block a read-only dashboard on questions with obvious defaults. If the user already gave a detailed spec, build directly.

## Building big apps — ship usable iterations, not layers

**If a request is too big to do well in one pass, say so** — tell the user the scope is large, propose a short phase breakdown (what each phase delivers), and build phase by phase rather than attempting everything at once. Phase it by **usable increments, NOT by layer.** Each phase must be a **complete, working, already-decent-looking slice** the user could actually use — never "skeleton first, features next, polish last." Polish is **not** a phase: apply the design framework + visual defaults to every phase as you go, so the app looks finished at each step.

- **Phase 1 = the small-but-high-impact core, working end-to-end** — not necessarily the *smallest* possible; pick the slice that delivers the **most usefulness for the least build** (the capability the user cares about most). It ships complete: its data (create/seed the table), a styled page, AND its key interactivity, all functioning and presentable. The user gets something genuinely valuable after phase 1.
- **Each later phase = one more usable capability**, again end-to-end. E.g. for a tickets app: (1) browse tickets — list page that works and looks right → (2) open a ticket — row-click → detail page → (3) create/edit a ticket — form + insert/update + refresh → (4) analytics — a dashboard page with charts/metrics. Each phase is independently useful and reasonably polished.

After each phase, briefly say what now works and what's next, and share the app URL early so the user watches real, usable value appear. **But**: if the user would rather wait for the finished app, honor that and build end-to-end. For a **small/simple** app, skip phasing and build in one pass — don't over-ceremony it.

## App model & binding syntax

- app → version → page → component. `create_app` gives one app + version + a "Home" page. Add more pages with `add_page` when the app benefits (e.g. list + detail, or separate dashboard/admin views); ToolJet auto-renders navigation between pages. Don't fragment a simple app across many pages — a single well-laid-out page is often best.
- A component has **properties**; each property value is `{ "value": <val> }`. Values starting with `{{ … }}` are **bindings** evaluated at runtime.
- A query exposes its result as `queries.<queryName>.data`. Bind a component property to it, e.g. a Table's `data.value = "{{queries.<queryName>.data}}"`.

## Component selection — ALWAYS prefer built-in components over HTML

ToolJet's value is **visually-editable, governed low-code config**. Built-in components can be edited in ToolJet's visual builder by anyone; a raw `HTML`/`Text` component with hand-written markup **cannot** — it becomes an opaque blob the user can't tweak without code. So:

- **Map every piece of your design to a built-in component first.** A KPI/metric tile → `Statistics` (not an HTML card). A chart or bar/graph → `Chart` (not HTML/SVG). A data grid → `Table`. Labels/headings → `Text`. Inputs → `TextInput`/`NumberInput`/`DropdownV2`/etc. Forms → `Form`. Progress → `CircularProgressbar`.
- Use `HTML` (or `Text` with HTML) **only as a last resort** — when ToolJet genuinely has no built-in component for what you need. Do not build tiles, charts, tables, or layouts out of HTML when a built-in exists.
- The full built-in palette (with purposes) is below — check it before reaching for HTML.
- Once you've picked a component, call `get_component_catalog(type)` to get its exact properties (names, types, defaults) and configure it precisely — don't guess property names.

### Built-in components (use these first)

| Component (`type`) | Purpose |
|---|---|
| `Accordion` | Accordion — Group components |
| `AudioRecorder` | AudioRecorder — Records audio |
| `BoundedBox` | BoundedBox — An infinitely customizable image annotation widget |
| `Button` | Button — Trigger actions: queries, alerts, set variables etc. |
| `ButtonGroup` | ButtonGroupLegacy — Group of buttons |
| `ButtonGroupV2` | ButtonGroup — Group of buttons |
| `Calendar` | Calendar — Display calendar events |
| `Camera` | Camera — Captures video & photos from camera |
| `Cascader` | Cascader — Hierarchical single item selector |
| `Chart` | Chart — Visualize data |
| `Chat` | Chat — Chat interface with message history |
| `Checkbox` | Checkbox — Single checkbox toggle |
| `CircularProgressBar` | CircularProgressBar — Show circular progress |
| `CodeEditor` | CodeEditor — Edit source code |
| `ColorPicker` | ColorPicker — Choose colors from a palette |
| `Container` | Container — Group components |
| `CurrencyInput` | CurrencyInput — Currency input field |
| `CustomComponent` | CustomComponent — Create React components |
| `Datepicker` | DatePickerLegacy — Choose date and time |
| `DatePickerV2` | DatePicker — Choose date |
| `DaterangePicker` | DateRangePicker — Choose date ranges |
| `DatetimePickerV2` | DatetimePicker — Choose date and time |
| `Divider` | HorizontalDivider — Separator between components |
| `DropdownV2` | Dropdown — Single item selector |
| `EmailInput` | EmailInput — Email input field |
| `FileButton` | FileButton — A button that triggers file selection. Label updates to show selected file count after selection. |
| `FileInput` | FileInput — File input |
| `FilePicker` | FilePicker — File Picker |
| `FlexContainer` | FlexContainer — Auto-layout flex container |
| `Form` | Form — Wrapper for multiple components |
| `Html` | Html — View HTML content |
| `Icon` | Icon — Icon |
| `IFrame` | Iframe — Embed external content |
| `Image` | Image — Show image files |
| `JSONEditor` | JSONEditor — Edit JSON data |
| `JSONExplorer` | JSONExplorer — Explore JSON data |
| `Kanban` | Kanban — Task management board |
| `KanbanBoard` | KanbanBoard — Task management board |
| `KeyValuePair` | KeyValuePair — Display data in key-value format |
| `Link` | Link — Add link to the text |
| `Listview` | Listview — List multiple items |
| `Map` | Map — Display map locations |
| `Modal` | ModalLegacy — Show pop-up windows |
| `ModalV2` | Modal — Show pop-up windows |
| `ModuleContainer` | ModuleContainer — Module Container |
| `ModuleViewer` | ModuleViewer — Module |
| `MultiselectV2` | Multiselect — Multiple item selector |
| `Navigation` | Navigation — Create custom navigation menus |
| `NumberInput` | NumberInput — Numeric input field |
| `Pagination` | Pagination — Navigate pages |
| `PasswordInput` | PasswordInput — Secure text input |
| `PDF` | PDF — Embed PDF documents |
| `PhoneInput` | PhoneInput — Phone input field |
| `PopoverMenu` | PopoverMenu — Popover Menu |
| `ProgressBar` | ProgressBar — Show progress |
| `QrScanner` | QrScanner — Scan QR codes and hold its data |
| `RadioButton` | RadioButtonLegacy — Select one from multiple choices |
| `RadioButtonV2` | RadioButton — Select one from multiple choices |
| `RangeSlider` | RangeSliderLegacy — Adjust value range |
| `RangeSliderV2` | RangeSlider — Adjust value range |
| `ReorderableList` | ReorderableList — Reorderable List |
| `RichTextEditor` | RichTextEditor — Rich text editor |
| `Spinner` | Spinner — Indicate loading state |
| `StarRating` | StarRating — Star rating |
| `Statistics` | Statistics — Show key metrics |
| `Steps` | Steps — Step-by-step navigation aid |
| `SvgImage` | SvgImage — Display SVG graphics |
| `Table` | Table — Display paginated tabular data |
| `Tabs` | Tabs — Organize content in tabs |
| `Tags` | Tags — Display tag labels |
| `TagsInput` | TagsInput — Tag input with create, select, and delete functionality |
| `Text` | Text — Display text or HTML |
| `TextArea` | Textarea — Multi-line text input |
| `TextInput` | TextInput — User text input field |
| `Timeline` | Timeline — Show event timeline |
| `TimePicker` | TimePicker — Choose date and time |
| `Timer` | Timer — Countdown or stopwatch |
| `ToggleSwitch` | ToggleSwitchLegacy — User-controlled on-off switch |
| `ToggleSwitchV2` | ToggleSwitch — User-controlled on-off switch |
| `TreeSelect` | TreeSelect — Hierarchical item selector |
| `VerticalDivider` | VerticalDivider — Vertical line separator |

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

### 4. Mobile — skip it by default
Most customers view these on desktop. **Don't build or tune a mobile layout for the initial build unless the user explicitly asks.** When they do, treat mobile as **recomposition** — rethink what leads and what collapses on a narrow screen — not blind vertical stacking of the desktop layout. And note: **resizing a browser window does NOT prove ToolJet's mobile layout rendered** — that is a structural guess, not real mobile visual validation; only claim mobile works if you verified it the way ToolJet actually renders mobile.

## Component binding reference (22 components)

Authoritative rules for binding each component correctly (what must be set, or it renders nothing / wrong). Choose whichever components best fit the app you're building.

### Button
isDisabled: bind to form validity (`{{components.form1.isValid}}`) or other conditional logic. isVisible: bind to conditional expressions to show/hide contextually. isLoading: bind to `{{queries.queryName.isLoading}}` to reflect query execution state.

### Calendar
`dateFormat` MUST match all event start/end date strings — mismatch causes events to not render. Default: 'MM-DD-YYYY HH:mm:ss A Z'. Always reformat query dates with moment(): `{{queries.q.data.map(e=>({title:e.title,start:moment(e.start).format('MM-DD-YYYY HH:mm:ss A Z'),end:moment(e.end).format('MM-DD-YYYY HH:mm:ss A Z'),allDay:false}))}}`. selectedSlots.start/.end: pre-fill new-event form on slot click. selectedEvent: read clicked event fields for edit/delete queries.

### Chart
jsonDescription takes a Plotly JSON schema string — use JavaScript transformation within {{}} to map query arrays to Plotly series format. clickedDataPoint exposes {xAxisLabel, yAxisLabel, dataLabel, dataValue} for drill-down queries.

### Chat
loadingResponse property fxActive MUST be set to `{{queries.<queryName>.isLoading}}` — this shows the typing indicator while the AI query runs. Feed user message to query: bind prompt to `{{components.chatName.lastMessage.message}}`. appendHistory action (called on query success) expects: {message, messageId, timestamp, name, avatar, type:'response'}. For multi-turn: map history to OpenAI role format — `{{components.chatName.history.map(m => ({role: m.type === 'message' ? 'user' : 'assistant', content: m.message}))}}`.

### DatePickerV2
defaultValue is the ONLY bindable value field — there is no separate `value` property. Prefill from query: defaultValue=`{{queries.queryName.data[0].fieldName}}`. Prefill inside a modal opened from a table row (determine table-connected vs standalone via the app's the current state — never from component naming): defaultValue=`{{components.tableName.selectedRow.fieldName}}` — NOT `queries.name.data[0]`, which is the first row of the table's list query, not the clicked row. Use a static string/date literal only when the modal is confirmed standalone (no prefill needed).

### DatetimePickerV2
defaultValue is the ONLY bindable value field — there is no separate `value` property. Prefill from query: defaultValue=`{{queries.queryName.data[0].fieldName}}`. Prefill inside a modal opened from a table row (determine table-connected vs standalone via the app's the current state — never from component naming): defaultValue=`{{components.tableName.selectedRow.fieldName}}` — NOT `queries.name.data[0]`, which is the first row of the table's list query, not the clicked row. Use a static string/date literal only when the modal is confirmed standalone (no prefill needed).

### DropdownV2
TWO mutually exclusive modes — NEVER set both options and schema: (1) STATIC: advanced=`{{false}}`, options=[{label:'X', value:1, disable:{value:false}, visible:{value:true}}]. Do NOT set schema. (2) QUERY-BOUND: advanced=`{{true}}`, schema=`{{queries.queryName.data}}`. Do NOT set options. Query data must be an array of {label, value, disable, visible} objects — transform at the query level if needed. Exposed variables: the CURRENT SELECTION is `.value` (e.g. `{{components.name.value}}`) — use this for filtering, conditions and reading the choice; the selected option's display text is `.selectedOption.label`. The `label` PROPERTY is the field's TITLE (e.g. 'Status'), NOT the selection — NEVER compare data against `.label` (it silently matches zero rows). PREFILL: there is no `value`/`defaultValue` input property. The initially selected item is whichever entry in the bound `schema`/`options` array has BOTH `visible: true` AND `default: true` (the default-picker requires `visible === true && default === true`, so an option missing `visible` never preselects even with `default: true`). Set it via a transform, e.g. when prefilling from a table row inside a modal: `schema: {{ queries.queryName.data.map(o => ({...o, visible: true, default: o.value === components.tableName.selectedRow.fieldName})) }}`. When the dropdown edits a table column with a fixed set of values, bind `schema` to a dedicated lookup query (same datasource as the table, filtered to the relevant scope) — never hardcode static `options` for a database-backed column.

### Form
Access child fields via: `{{components.formName.data.childName.value}}`. Gate submit queries with runOnlyIf=`{{components.formName.isValid}}` on the run-query event — always implement client-side validation before triggering write operations. onSubmit event pattern by datasource: PostgreSQL → INSERT/UPDATE; MongoDB → insert_one/update_one; BigQuery → insert_record/update_record; OpenAPI → POST/PUT. Prefill from query: bind initialValues to `{{queries.queryName.data[0]}}`.

### KanbanBoard
Bind cardData from query array shaped as [{id, title, columnId}]; bind columnData from query array shaped as [{id, title}]. lastCardMovement exposes {cardId, sourceColumn, destinationColumn} — use in update queries triggered by onCardMoved event to persist reordering.

### KeyValuePair
Bind data property to a query object for display/edit: `{{queries.queryName.data[0]}}`. changeSet exposes only the modified key-value pairs — use in update queries rather than the full data object.

### Listview
Bind data property to a query array: `{{queries.queryName.data}}`. Child components inside the list access the current row via the list's data binding context.

### Modal
show is controlled exclusively via events (control-component with setVisibility) — do NOT bind show directly in properties. Determine TABLE-CONNECTED vs STANDALONE via the app's — call it on every table/button with attached events and check the current state; never infer from component/button naming (e.g. 'Edit row' vs 'Add new' are not reliable signals). STANDALONE (no table's event chain shows this modal) — there is no selectedRow to prefill from; leave children at static defaults/empty and do NOT bind to any table's selectedRow, or the modal will leak stale data from whichever row was last clicked.

### ModalV2
show is controlled exclusively via events (control-component with setVisibility) — do NOT bind show directly in properties. Determine TABLE-CONNECTED vs STANDALONE via the app's — call it on every table/button with attached events and check the current state; never infer from component/button naming (e.g. 'Edit row' vs 'Add new' are not reliable signals). STANDALONE (no table's event chain shows this modal) — there is no selectedRow to prefill from; leave children at static defaults/empty and do NOT bind to any table's selectedRow, or the modal will leak stale data from whichever row was last clicked.

### MultiselectV2
Only `.searchText` is exposed — there is no `.values` or `.selected` variable on MultiselectV2.

### NumberInput
Use debounce: 300 on onChange events that trigger queries. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

### Pagination
currentPageIndex is 1-based (starts at 1, not 0). Wire to Table: add a control-component event that calls setPage with value=`{{components.paginationName.currentPageIndex}}`. Bind numberOfPages to the total record count from a COUNT query.

### RadioButtonV2
Exposed variable is `.label` — there is NO `.value` on RadioButtonV2. Use `{{components.radioName.label}}` to read the selected option.

### Statistics
primaryValue must be a scalar — bind `queries.name.data[0].fieldName` from an aggregate query, never the full array. secondarySignDisplay accepted values: 'positive', 'negative', 'none' — never a boolean. icon is MANDATORY — always set it; never leave empty. primaryPrefixText / primarySuffixText are static strings only — do not bind expressions here. Statistics is display-only — its exposed variables are read-back values, not filter inputs.

### Table
Data binding: set data.value=`{{queries.queryName.data}}` AND dataSourceSelector.value=`"rawJson"` — both MUST be set together or the table renders nothing. NEVER set the table-level `autogenerateColumns.value` to false — it must always be true so columns render from the query rows automatically; false makes the table show ONLY the explicit `columns` array and blanks out on any key mismatch. This is separate from a column's own `autogenerated` field — individual columns may have `autogenerated: false` (that is normal for custom columns); only the table-level `autogenerateColumns` flag must never be false. pageIndex is 0-based: SQL offset = pageIndex * pageSize. selectedRow columns come from actual query result fields — never fabricate column names. Columns support JavaScript transforms on query fields. Dynamic columns: only set `useDynamicColumn`/`columnData` for a FLAT, build-time column list. `columnData` is evaluated once with no row in scope, so it MUST NOT reference `rowData`/`cellValue`, MUST NOT contain nested `{{ }}`, and cannot express per-cell conditions — any conditional `cellBackgroundColor`/`textColor`/`isEditable`/`dynamicOptions`/etc. MUST go on static `columns` (resolved per cell). Otherwise the table renders ZERO columns. Explicit `columns` entries are objects `{name, key, id, columnType, columnSize, autogenerated: false}` — set `autogenerated: false` on custom columns so they PERSIST; an `autogenerated: true` column whose `key` does not match a query field is dropped. MISLEADING FAILURE: if the table shows unrelated demo columns (e.g. photo/email/name) that you never defined, its `data` binding resolved EMPTY — that is a broken DATA binding (wrong query name, or the query returned nothing), NOT a column problem. Fix the data binding; do not touch columns.

### TagsInput
Bind schema to a query for dynamic tag options: schema=`{{queries.queryName.data}}` (array of {label, value}). selectedTags exposes only the checked tags; values exposes all current tags.

### TextArea
Use debounce: 300 on onChange events that trigger queries. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

### TextInput
Use debounce: 300 on onChange events that trigger queries — prevents excessive query calls while typing. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

## Datasource query reference

`add_query`/`add_queries` work on **any** connected datasource — ToolJet DB, PostgreSQL, MySQL, MongoDB, ServiceNow, RunJS, etc. The query **kind is taken from the datasource automatically** (you don't pass it; call `list_datasources` to see each datasource's `kind`). Only the `options` differ per kind:
- **tooljetdb** — `{ operation: "list_rows", table_id: "<id>", list_rows: {}, runOnPageLoad: true }` (see below)
- **postgresql / mysql** — `{ mode: "sql", query: "SELECT …", query_params: [], run_on_page_load: true }`
- **runjs** — `{ code: "return queries.q1.data.filter(r => r.status === 'Open').length;" }` (great for chart aggregation — reference other queries' data, return a shaped value)
- **servicenow** — `{ operation: "list_records", table: "incident", … }`
Ask for a specific datasource's full option schema when you need it.

### Building an app that needs a NEW data model (most real requests)
Many requests ("build a CRM", "an expense tracker") come with **no table yet** — you must create the data model first:
1. **Propose the data model** (tables, columns + types, relationships) and **confirm it with the user** before creating anything — schema is a commitment.
2. `create_table` for each table.
3. Optionally `insert_rows` to seed a handful of realistic sample rows so the app doesn't render empty (only if the user wants sample data).
4. Then `add_queries` + `add_components` as usual.
For an **existing** table, call `get_table_schema(table_name)` first so you use its real column names and types.

### ToolJet DB (`kind: "tooljetdb"`)
- Resolve the table id with `list_tables()` — the query references the table by **`table_id`** (the id), NOT the name.
- List all rows: `options = { "operation": "list_rows", "table_id": "<table id>", "list_rows": {}, "runOnPageLoad": true }`.
- `runOnPageLoad: true` runs the query when the app opens so bound components populate automatically.
- `list_rows` may carry `limit`, `offset`, `where_filters`, `order_filters` for filtering/sorting.
- **Write operations** (for edit/create flows) use indexed-object option shapes:
  - Create: `{ "operation": "create_row", "table_id": "<id>", "create_row": { "0": { "column": "title", "value": "{{...}}" }, "1": { "column": "status", "value": "Open" } } }`
  - Update: `{ "operation": "update_rows", "table_id": "<id>", "update_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } }, "columns": { "0": { "column": "status", "value": "{{...}}" } } } }`
  - Delete: `{ "operation": "delete_rows", "table_id": "<id>", "delete_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } } } }`
- After a write, re-run the list query to refresh the UI (see the "Form submit → insert + refresh" recipe).

(Other datasources — postgresql, mongodb, servicenow, etc. — have their own query schemas; ask for the specific one when needed.)

## Charts — how to make them render reliably (READ THIS before adding a Chart)

The `Chart` component fails in a specific, common way: **ToolJet's chart-property evaluator silently returns EMPTY for complex expressions** — inline IIFEs, dynamic field-name detection, big reduces written inside the `{{ }}` binding. The chart then draws its axes/containers but receives **no data traces** (looks empty/broken). Avoid it:

1. **Use the simple mode** (the default — keep `plotFromJson` false / don't set it). Set two properties:
   - `type`: `"bar"` | `"line"` | `"pie"`
   - `data`: an array of `{ x, y }` objects.
2. **Build `data` with a SIMPLE, EXPLICIT binding.** First call `get_table_schema` (or `get_app`) to learn the **real field names** — never auto-detect them. Then use explicit filters/maps, no IIFE:
   ```
   data.value = "{{ [
     { x: 'Open',        y: queries.getTickets.data.filter(r => r.status === 'Open').length },
     { x: 'In Progress', y: queries.getTickets.data.filter(r => r.status === 'In Progress').length },
     { x: 'Resolved',    y: queries.getTickets.data.filter(r => r.status === 'Resolved').length }
   ] }}"
   ```
   For a straight mapping, `queries.q.data.map(r => ({ x: r.category, y: r.amount }))` is fine — simple and explicit.
3. **For heavy aggregation, do it in a QUERY, not the chart binding.** Bind `data` to a query that already returns `[{x,y}]` (a RunJS transform query, or a DB aggregate), and keep the chart's own binding a plain reference: `{{queries.chartData.data}}`. Query engines evaluate JS reliably; the chart property evaluator does not.
4. **Only use Plotly-JSON mode** (`plotFromJson: true` + `jsonDescription`) for advanced multi-trace charts — and even then keep the expression simple, use explicit field names, and wrap the object with `JSON.stringify(...)`.

Rule of thumb: **an empty chart means the binding was too complex.** Replace dynamic detection with explicit field names + simple `.filter().length` / `.map()`.

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

Wire events AFTER the components and queries exist (you need their ids). Prefer one `add_events` call for all of an app's events.

## Verify your work — browser-free checks first, then a real browser pass

**Do the cheap checks continuously, without a browser** (this replaces the slow open-screenshot-adjust loop, NOT the final visual check):
- After creating a data query, call `run_query(query_id, version_id)` to confirm it returns rows and to READ real values — statuses, categories, ranges — before you hardcode chart series, dropdown options, or filter values. Don't guess a status is "Open/Closed"; run the query and see.
- Inspect with `get_app_summary` (not `get_app`) to confirm bindings/values are what you intended; `update_*` anything wrong.

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

## Build guidance

- Always `create_app` first; thread `app_id` / `version_id` / `home_page_id` into later calls.
- Give each component a `name`; bind data by query name: `{{queries.<name>.data}}`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Report the `app_url` back to the user.
