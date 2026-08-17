---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via the tooljet-mcp tools — create apps, add datasource queries, and add components bound to them. Use whenever asked to build/scaffold a ToolJet app, dashboard, or internal tool, or to add pages/components/queries. This is a KNOWLEDGE reference (component binding rules, canvas mechanics, query schemas); YOU make all layout and design decisions."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - TJ-AI COMPONENT_BINDING_RULES (22 components)
    - ToolJet WidgetManager catalog (83 built-in components)
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
- `add_component({ app_id, version_id, page_id, name, type, properties, layout })` → `{ component_id }`. Single component; `name` required.
- `add_components({ app_id, version_id, page_id, components: [...] })` → `[{ component_id, name }]`. **Place ALL of a page's components in one call.**

**Batch for the build, singular for edits.** When first building an app, create everything with `add_queries` + `add_components` (far fewer round-trips). Use the singular `add_query`/`add_component` afterwards for incremental edits (e.g. "add a status filter"). A batch is atomic — if one item is invalid the whole call fails; fix that item and retry.
- `get_app(app_id)` → current app structure.

## Before you build — clarify a vague request first

If the user's request is short or underspecified (e.g. "build a tickets dashboard"), ask **2–4 focused questions before building**, then proceed. Good things to confirm: which fields/columns matter most, what actions or filters/segments they need, whether they want summary metrics/charts, and any layout, density, or branding preferences. This makes the first result match their intent and saves iteration — and the user feels involved.

If the user already gave a detailed spec, don't interrogate — build directly. Never block on questions the user has effectively already answered.

## App model & binding syntax

- app → version → page → component. `create_app` gives one app + version + a "Home" page.
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
| `Accordion` | Group components |
| `AudioRecorder` | Records audio |
| `BoundedBox` | An infinitely customizable image annotation widget |
| `Button` | Trigger actions: queries, alerts, set variables etc. |
| `ButtonGroup` | Group of buttons |
| `ButtonGroupLegacy` | Group of buttons |
| `Calendar` | Display calendar events |
| `Camera` | Captures video & photos from camera |
| `Cascader` | Hierarchical single item selector |
| `Chart` | Visualize data |
| `Chat` | Chat interface with message history |
| `Checkbox` | Single checkbox toggle |
| `CircularProgressBar` | Show circular progress |
| `CodeEditor` | Edit source code |
| `ColorPicker` | Choose colors from a palette |
| `Container` | Group components |
| `CurrencyInput` | Currency input field |
| `CustomComponent` | Create React components |
| `DatePicker` | Choose date |
| `DatePickerLegacy` | Choose date and time |
| `DateRangePicker` | Choose date ranges |
| `DatetimePicker` | Choose date and time |
| `Dropdown` | Single item selector |
| `DropdownLegacy` | Single item selector |
| `EmailInput` | Email input field |
| `FileButton` | A button that triggers file selection. Label updates to show selected file count after selection. |
| `FileInput` | File input |
| `FilePicker` | File Picker |
| `FlexContainer` | Auto-layout flex container |
| `Form` | Wrapper for multiple components |
| `HorizontalDivider` | Separator between components |
| `Html` | View HTML content |
| `Icon` | Icon |
| `Iframe` | Embed external content |
| `Image` | Show image files |
| `JSONEditor` | Edit JSON data |
| `JSONExplorer` | Explore JSON data |
| `Kanban` | Task management board |
| `KanbanBoard` | Task management board |
| `KeyValuePair` | Display data in key-value format |
| `Link` | Add link to the text |
| `Listview` | List multiple items |
| `Map` | Display map locations |
| `Modal` | Show pop-up windows |
| `ModalLegacy` | Show pop-up windows |
| `ModuleContainer` | Module Container |
| `ModuleViewer` | Module |
| `Multiselect` | Multiple item selector |
| `MultiselectLegacy` | Multiple item selector |
| `Navigation` | Create custom navigation menus |
| `NumberInput` | Numeric input field |
| `Pagination` | Navigate pages |
| `PasswordInput` | Secure text input |
| `PDF` | Embed PDF documents |
| `PhoneInput` | Phone input field |
| `PopoverMenu` | Popover Menu |
| `ProgressBar` | Show progress |
| `QrScanner` | Scan QR codes and hold its data |
| `RadioButton` | Select one from multiple choices |
| `RadioButtonLegacy` | Select one from multiple choices |
| `RangeSlider` | Adjust value range |
| `RangeSliderLegacy` | Adjust value range |
| `ReorderableList` | Reorderable List |
| `RichTextEditor` | Rich text editor |
| `Spinner` | Indicate loading state |
| `StarRating` | Star rating |
| `Statistics` | Show key metrics |
| `Steps` | Step-by-step navigation aid |
| `SvgImage` | Display SVG graphics |
| `Table` | Display paginated tabular data |
| `Tabs` | Organize content in tabs |
| `Tags` | Display tag labels |
| `TagsInput` | Tag input with create, select, and delete functionality |
| `Text` | Display text or HTML |
| `Textarea` | Multi-line text input |
| `TextInput` | User text input field |
| `Timeline` | Show event timeline |
| `TimePicker` | Choose date and time |
| `Timer` | Countdown or stopwatch |
| `ToggleSwitch` | User-controlled on-off switch |
| `ToggleSwitchLegacy` | User-controlled on-off switch |
| `TreeSelect` | Hierarchical item selector |
| `VerticalDivider` | Vertical line separator |

## Canvas & grid mechanics (FACTS — you must respect these to position components)

ToolJet's canvas is a fixed grid. Components are **absolutely positioned** — they do NOT reflow or auto-stack. If you don't compute positions correctly, components **overlap**.

- The canvas is **43 columns** wide. A component's `left` and `width` are in **columns** (0–43). Full width = `left: 0, width: 43`.
- `top` and `height` are in **pixels**, snapped to a **10px** vertical grid. A typical input is ~40px tall; a data table ~300–500px.
- Every component's `layout` must be given for **both resolutions**: `{ desktop: {top,left,width,height}, mobile: {top,left,width,height} }`.
- **Stacking rule (prevents overlap):** to place component B below component A, set `B.top = A.top + A.height + gap` (gap ~10–20px). Never reuse the same `top` for two components in the same area — the later one draws over the earlier one.
- The full canvas is 43 columns; how you use that space is a design choice (see Design defaults below) — don't reflexively span edge-to-edge.

## Design defaults — make apps look enterprise-grade by default (the user can override)

Apply these unless the user specifies otherwise. If the user states any layout, spacing, density, or brand preference, **the user always wins** — these are only defaults so that apps look clean and professional even when the user doesn't ask.

- **Polish:** aim for a clean, consistent, enterprise-ready result — clear section headings, aligned components, sensible grouping of related content. No overlaps, no cramped or lopsided layouts.
- **Canvas padding:** don't run content edge-to-edge across all 43 columns. Leave a consistent side gutter — put top-level content roughly in columns **2–41** (≈2 columns of breathing room on the left and right). Use full-bleed only if the user asks.
- **Consistent margins:** use ONE consistent vertical gap between stacked sections (~16–24px) and ONE shared left edge for all top-level components. Don't let each component pick its own margins — consistency reads as "enterprise".
- **Peer components:** components in the same row (e.g. KPI tiles, filters) should have **equal widths and equal gaps** between them, and align on the same top.
- **Hierarchy:** lead with a title/header row; put summary metrics (Statistics) and charts (Chart) above detailed tables; keep primary actions visible.

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
TWO mutually exclusive modes — NEVER set both options and schema: (1) STATIC: advanced=`{{false}}`, options=[{label:'X', value:1, disable:{value:false}, visible:{value:true}}]. Do NOT set schema. (2) QUERY-BOUND: advanced=`{{true}}`, schema=`{{queries.queryName.data}}`. Do NOT set options. Query data must be an array of {label, value, disable, visible} objects — transform at the query level if needed. Exposed variable is `.label` (the selected option label) — DropdownV2 has NO `.value` exposed variable. PREFILL: there is no `value`/`defaultValue` input property. The initially selected item is whichever entry in the bound `schema`/`options` array has `default: true` — set it via a transform, e.g. when prefilling from a table row inside a modal: `schema: {{ queries.queryName.data.map(o => ({...o, default: o.value === components.tableName.selectedRow.fieldName})) }}`. When the dropdown edits a table column with a fixed set of values, bind `schema` to a dedicated lookup query (same datasource as the table, filtered to the relevant scope) — never hardcode static `options` for a database-backed column.

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
Data binding: set data.value=`{{queries.queryName.data}}` AND dataSourceSelector.value=`"rawJson"` — both MUST be set together or the table renders nothing. NEVER set the table-level `autogenerateColumns.value` to false — it must always be true so columns render from the query rows automatically; false makes the table show ONLY the explicit `columns` array and blanks out on any key mismatch. This is separate from a column's own `autogenerated` field — individual columns may have `autogenerated: false` (that is normal for custom columns); only the table-level `autogenerateColumns` flag must never be false. pageIndex is 0-based: SQL offset = pageIndex * pageSize. selectedRow columns come from actual query result fields — never fabricate column names. Columns support JavaScript transforms on query fields. Dynamic columns: only set `useDynamicColumn`/`columnData` for a FLAT, build-time column list. `columnData` is evaluated once with no row in scope, so it MUST NOT reference `rowData`/`cellValue`, MUST NOT contain nested `{{ }}`, and cannot express per-cell conditions — any conditional `cellBackgroundColor`/`textColor`/`isEditable`/`dynamicOptions`/etc. MUST go on static `columns` (resolved per cell). Otherwise the table renders ZERO columns.

### TagsInput
Bind schema to a query for dynamic tag options: schema=`{{queries.queryName.data}}` (array of {label, value}). selectedTags exposes only the checked tags; values exposes all current tags.

### TextArea
Use debounce: 300 on onChange events that trigger queries. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

### TextInput
Use debounce: 300 on onChange events that trigger queries — prevents excessive query calls while typing. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

## Datasource query reference

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

(Other datasources — postgresql, mongodb, servicenow, etc. — have their own query schemas; ask for the specific one when needed.)

## Build guidance

- Always `create_app` first; thread `app_id` / `version_id` / `home_page_id` into later calls.
- Give each component a `name`; bind data by query name: `{{queries.<name>.data}}`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Report the `app_url` back to the user.
