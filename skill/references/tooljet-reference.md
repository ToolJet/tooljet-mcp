# ToolJet reference — component bindings, palette & query schemas

<!-- GENERATED FILE — do not edit by hand. Run `node scripts/generate-skill.mjs` to regenerate. -->

Companion to the **tooljet-app-builder** skill. The skill covers the workflow (information architecture, phasing, design, async states, verification); this file is the technical lookup you consult **while** building. You can also call selective `get_component_catalog({ type | types })` for one or several live component contracts.

## Built-in components (pick from these first)

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

## Component binding reference (22 components)

Authoritative rules for binding each component correctly (what must be set, or it renders nothing / wrong).

### Button
isDisabled: bind to form validity (`{{components.form1.isValid}}`) or other conditional logic. isVisible: bind to conditional expressions to show/hide contextually. isLoading: bind to `{{queries.queryName.isLoading}}` to reflect query execution state.

### Calendar
`dateFormat` MUST match all event start/end date strings — mismatch causes events to not render. Default: 'MM-DD-YYYY HH:mm:ss A Z'. Always reformat query dates with moment(): `{{queries.q.data.map(e=>({title:e.title,start:moment(e.start).format('MM-DD-YYYY HH:mm:ss A Z'),end:moment(e.end).format('MM-DD-YYYY HH:mm:ss A Z'),allDay:false}))}}`. selectedSlots.start/.end: pre-fill new-event form on slot click. selectedEvent: read clicked event fields for edit/delete queries.

### Chart
jsonDescription takes a Plotly JSON schema string — use JavaScript transformation within {{}} to map query arrays to Plotly series format. clickedDataPoint exposes {xAxisLabel, yAxisLabel, dataLabel, dataValue} for drill-down queries.

### Chat
loadingResponse property fxActive MUST be set to `{{queries.<queryName>.isLoading}}` — this shows the typing indicator while the AI query runs. Feed user message to query: bind prompt to `{{components.chatName.lastMessage.message}}`. appendHistory action (called on query success) expects: {message, messageId, timestamp, name, avatar, type:'response'}. For multi-turn: map history to OpenAI role format — `{{components.chatName.history.map(m => ({role: m.type === 'message' ? 'user' : 'assistant', content: m.message}))}}`.

### DatePickerV2
defaultValue is the ONLY bindable value field — there is no separate `value` property. Prefill from query: defaultValue=`{{queries.queryName.data[0].fieldName}}`. Prefill inside a modal opened from a table row (determine table-connected vs standalone via the app's the current state — never from component naming): defaultValue=`{{components.tableName.selectedRow.fieldName}}` — NOT `queries.name.data[0]`, which is the first row of the table's list query, not the clicked row. Use a static string/date literal only when the modal is confirmed standalone (no prefill needed). For an empty/create field, set `defaultValue="{{null}}"`; leaving it untouched renders ToolJet's 01/01/2022 demo date.

### DatetimePickerV2
defaultValue is the ONLY bindable value field — there is no separate `value` property. Prefill from query: defaultValue=`{{queries.queryName.data[0].fieldName}}`. Prefill inside a modal opened from a table row (determine table-connected vs standalone via the app's the current state — never from component naming): defaultValue=`{{components.tableName.selectedRow.fieldName}}` — NOT `queries.name.data[0]`, which is the first row of the table's list query, not the clicked row. Use a static string/date literal only when the modal is confirmed standalone (no prefill needed).

### DropdownV2
TWO mutually exclusive modes — NEVER set both options and schema: (1) STATIC: advanced=`{{false}}`, options=[{label:'X', value:1, disable:{value:false}, visible:{value:true}}]. Do NOT set schema. (2) QUERY-BOUND: advanced=`{{true}}`, schema=`{{queries.queryName.data}}`. Do NOT set options. Query data must be an array of {label, value, disable, visible} objects — transform at the query level if needed. Exposed variables: the CURRENT SELECTION is `.value` (e.g. `{{components.name.value}}`) — use this for filtering, conditions and reading the choice; the selected option's display text is `.selectedOption.label`. The `label` PROPERTY is the field's TITLE (e.g. 'Status'), NOT the selection — NEVER compare data against `.label` (it silently matches zero rows). PREFILL: there is no `value`/`defaultValue` input property. The initially selected item is whichever entry in the bound `schema`/`options` array has BOTH `visible: true` AND `default: true` (the default-picker requires `visible === true && default === true`, so an option missing `visible` never preselects even with `default: true`). Set it via a transform, e.g. when prefilling from a table row inside a modal: `schema: {{ queries.queryName.data.map(o => ({...o, visible: true, default: o.value === components.tableName.selectedRow.fieldName})) }}`. When the dropdown edits a table column with a fixed set of values, bind `schema` to a dedicated lookup query (same datasource as the table, filtered to the relevant scope) — never hardcode static `options` for a database-backed column.

### Form
Access child fields via: `{{components.formName.data.childName.value}}`. Gate submit queries with runOnlyIf=`{{components.formName.isValid}}` on the run-query event — always implement client-side validation before triggering write operations. onSubmit event pattern by datasource: PostgreSQL → INSERT/UPDATE; MongoDB → insert_one/update_one; BigQuery → insert_record/update_record; OpenAPI → POST/PUT. Prefill from query: bind initialValues to `{{queries.queryName.data[0]}}`. For generated forms, read direct submitted values from `{{components.formName.formData}}`; `.data` remains the detailed child-state object. Supported schema field types are textinput, textarea, dropdown, multiselect, number, emailinput, password, datepicker, checkbox, radio, toggle, starrating, and filepicker—but only textinput/number/emailinput/password/datepicker/checkbox are layout-safe in generated Form. If any other type is needed, build the whole form from standalone components. Filepicker also crashes the Form. Dropdown/multiselect fields use values + displayValues, not options. There is no required flag; use validation.minLength or validation.customRule.

### KanbanBoard
Bind cardData from query array shaped as [{id, title, columnId}]; bind columnData from query array shaped as [{id, title}]. lastCardMovement exposes {cardId, sourceColumn, destinationColumn} — use in update queries triggered by onCardMoved event to persist reordering.

### KeyValuePair
Bind data property to a query object for display/edit: `{{queries.queryName.data[0]}}`. changeSet exposes only the modified key-value pairs — use in update queries rather than the full data object. An explicit `fields` array does not suppress undeclared keys from `data`: project the binding to a new object containing only the intended field keys. Object spreads are not a safe projection.

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
Data binding: set data.value=`{{queries.queryName.data}}` AND dataSourceSelector.value=`"rawJson"` — both MUST be set together or the table renders nothing. NEVER set the table-level `autogenerateColumns.value` to false — it must always be true so columns render from the query rows automatically; false makes the table show ONLY the explicit `columns` array and blanks out on any key mismatch. This is separate from a column's own `autogenerated` field — individual columns may have `autogenerated: false` (that is normal for custom columns); only the table-level `autogenerateColumns` flag must never be false. pageIndex is 1-based: offset pagination uses (pageIndex - 1) * pageSize. selectedRow columns come from actual query result fields — never fabricate column names. Columns support JavaScript transforms on query fields. Dynamic columns: only set `useDynamicColumn`/`columnData` for a FLAT, build-time column list. `columnData` is evaluated once with no row in scope, so it MUST NOT reference `rowData`/`cellValue`, MUST NOT contain nested `{{ }}`, and cannot express per-cell conditions — any conditional `cellBackgroundColor`/`textColor`/`isEditable`/`dynamicOptions`/etc. MUST go on static `columns` (resolved per cell). Otherwise the table renders ZERO columns. Explicit `columns` entries are objects `{name, key, id, columnType, columnSize, autogenerated: false}` — set `autogenerated: false` on custom columns so they PERSIST; an `autogenerated: true` column whose `key` does not match a query field is dropped. MISLEADING FAILURE: if the table shows unrelated demo columns (e.g. photo/email/name) that you never defined, its `data` binding resolved EMPTY — that is a broken DATA binding (wrong query name, or the query returned nothing), NOT a column problem. Fix the data binding; do not touch columns.

### TagsInput
Bind schema to a query for dynamic tag options: schema=`{{queries.queryName.data}}` (array of {label, value}). selectedTags exposes only the checked tags; values exposes all current tags.

### TextArea
Use debounce: 300 on onChange events that trigger queries. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

### TextInput
Use debounce: 300 on onChange events that trigger queries — prevents excessive query calls while typing. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

## Form schema field contracts and upload workaround

The authoritative Form JSON-schema field types are: `textinput`, `textarea`, `dropdown`, `multiselect`, `number`, `emailinput`, `password`, `datepicker`, `checkbox`, `radio`, `toggle`, `starrating`, and `filepicker`. Do not abbreviate these to `email`, `star`, or `file`.

- Dropdown and multiselect fields use `values` plus `displayValues`, not `options`.
- There is no working `required` flag. Use `validation.minLength` or `validation.customRule` and keep database constraints authoritative.
- Do not use Form's `filepicker` type even though it is listed: the current renderer throws while reading `minSize` and replaces the entire Form with "Something went wrong". Place a standalone `FilePicker` component outside the Form. Its `.file` variable is an array of `{name, content, dataURL, type, parsedValue}`; read values such as `{{components.evidencePicker.file[0].name}}`.
- Generated Form is layout-safe only when every field is `textinput`, `number`, `emailinput`, `password`, `datepicker`, or `checkbox`. FormUtils passes no schema alignment through: Dropdown/Multiselect labels are offset or duplicated, while TextArea retains a literal "Label" and may be single-line. If any field needs Dropdown, Multiselect, TextArea, Radio, Toggle, StarRating, or FilePicker, build the whole form from standalone components with `styles.alignment.value="top"`; use a two-column grid for compact fields and full-width TextArea controls.
- A create-mode datepicker must use `value:"{{null}}"`; a literal/omitted null renders ToolJet's 01/01/2022 demo date.

## File generation formats

`generate-file` genuinely serializes CSV and passes plaintext through. Its PDF handler is also pass-through: it expects already-formed PDF bytes and does not render text, HTML, or tabular data into a PDF. Use CSV/plaintext unless the app already has valid PDF bytes, then verify the download in the viewer before claiming PDF support.

## Table row-action Button columns

Modern per-row actions are **Button columns**, not the deprecated `properties.actions.value` configuration. The top-level `actions` returned by `get_component_catalog("Table")` are `control-component` runtime methods such as `setPage`/`selectRow`; they are unrelated to row buttons. For the machine-readable version, request `get_component_catalog({type:"Table",sections:["authoringHints"]})`.

Append a column like this to the Table's **complete** `properties.columns.value` array (updates replace arrays wholesale):

```json
{
  "id": "actions-column",
  "name": "Actions",
  "key": "actions",
  "columnType": "button",
  "columnVisibility": true,
  "horizontalAlignment": "left",
  "pinPosition": "right",
  "autogenerated": false,
  "buttons": [{
    "id": "view-action",
    "buttonLabel": "View",
    "buttonTooltip": "",
    "disableButton": false,
    "loadingState": false,
    "buttonVisibility": true,
    "buttonType": "solid",
    "buttonBackgroundColor": "var(--cc-primary-brand)",
    "buttonLabelColor": "#FFFFFF",
    "buttonBorderColor": "var(--cc-primary-brand)",
    "buttonBorderRadius": "6",
    "buttonLoaderColor": "var(--cc-surface1-surface)",
    "buttonIconName": "IconHome2",
    "buttonIconVisibility": false,
    "buttonIconColor": "var(--cc-default-icon)",
    "buttonIconAlignment": "left"
  }]
}
```

`buttonLabel`, `buttonTooltip`, `disableButton`, `loadingState`, `buttonVisibility`, and style fields can be expressions using the per-cell context `rowData` and `cellValue`. Give every button a stable, unique string `id`.

The event is attached to the **Table component id** with target `table_column`. Its `ref` joins the column `key` (falling back to `name`) and button `id` with `::`:

```json
{
  "source_id": "<table component id>",
  "source_type": "table_column",
  "ref": "actions::view-action",
  "trigger": "onClick",
  "action": {
    "actionId": "run-query",
    "queryId": "<query id>",
    "queryName": "<query name>"
  }
}
```

ToolJet updates the Table's `selectedRow` and `selectedRowId` before running this handler. Bind the query/action to `{{components.<table>.selectedRow.<field>}}`. Use `rowData` inside button configuration only; do not assume it is the event action context. `source_type:"table_action"` exists only for already-present legacy action buttons and should not be authored in new apps.

If an action needs a key such as `id` that should not be visible, keep it in the Table's data projection and declare it in the complete columns array with `columnVisibility:false`:

```json
{
  "id": "record-id",
  "name": "ID",
  "key": "id",
  "columnType": "string",
  "columnVisibility": false,
  "autogenerated": false
}
```

This keeps the field available in `selectedRow` and suppresses `autogenerateColumns` from leaking it as a visible column.

## Kanban card content

Kanban cards are nested canvases: `columnData` and `cardData` can resolve correctly, including card counts, while every card body remains blank if the Kanban has no child components. `add_components` materializes the catalog default title/description children when no explicit child is supplied. For a custom body, give the Kanban a `client_ref` and create its child with the matching `parent_ref` in the same call; any explicit child suppresses the defaults.

Nested `Text` clips to a single line. For multi-line title/description content, prefer one `Html` child bound to `cardData`, use normal wrapping plus `overflow-wrap:anywhere`, and pin its content width/max-width explicitly in CSS. Do not infer the physical Kanban column width from `cardWidth`; verify the card in the viewer because the rendered column can retain a wider minimum than the nested card canvas.

## Datasource query reference

`add_queries` works on **any ALREADY-CONNECTED datasource** — ToolJet DB, PostgreSQL, MySQL, MongoDB, ServiceNow, RunJS, etc. The query **kind is taken from the datasource automatically** (you don't pass it; call `list_datasources` to see each datasource's `kind`). Only the `options` differ per kind:

Workspace-connected datasources available to the current user and selected environment are automatically available to both existing and newly created apps. Do **not** look for or invent a per-app datasource linking step: after `create_app`, call `list_datasources(version_id)` and pass the returned `id` to `add_queries`. An expected source missing from that result indicates the wrong workspace, insufficient permission, an unconnected source, or missing environment configuration—not a missing app attachment.

> **You can only use datasources that are already connected — these tools cannot create or connect a new datasource or third-party integration** (e.g. Strava, Stripe, a new REST API, a Google Sheet). If the user asks to build on a source that isn't in `list_datasources`:
> - **Say so plainly** — ToolJet has no native integration for it (or it simply isn't connected), and you can't connect one from here. Don't fabricate a query against it or present placeholder data as if it were live.
> - **Offer the real paths:** (a) the user connects it in ToolJet first — for a third-party API that usually means a **REST API datasource** pointed at that API; auth/OAuth is a manual setup step and you must **never handle credentials yourself** — then you build queries + UI against it; or (b) build the app's full UI and structure **now** against a **ToolJet DB table seeded with representative sample data**, clearly labelled as placeholder, so it's ready to rewire to the real source later. Confirm which the user prefers.
- **tooljetdb** — `{ operation: "list_rows", table_id: "<id>", list_rows: {}, runOnPageLoad: true }` (see below)
- **postgresql / mysql** — `{ mode: "sql", query: "SELECT …", query_params: [], runOnPageLoad: true }`
- **runjs** — `{ code: "return queries.q1.data.filter(r => r.status === 'Open').length;" }` (great for chart aggregation — reference other queries' data, return a shaped value). Plain `queries.q1` reads inside RunJS code are **not inferred as reactive dependencies**: `runOnDependencyChange:true` alone can leave the result at its first empty/stale value. For derived data, run the RunJS query explicitly from each source query's `onDataQuerySuccess`; for user-driven transforms, invoke it only after the source query has completed.
- **servicenow** — `{ operation: "list_records", table: "incident", … }`
Call `get_datasource_query_schema({ datasource_id, version_id, operation })` for that ToolJet wrapper's exact compact request contract and its response shape/status when known; batch related operations with `requests`. If the response is `runtime-dependent` or `unknown`, inspect a safe successful run or the remote schema before binding nested fields. Do not infer fields from another datasource—or from the upstream vendor API. Use `sections:["introspection"]` plus `inspect_datasource_schema` to fetch only the schemas/tables/columns/collections needed for the current query.

### Building an app that needs a NEW data model (most real requests)
Many requests ("build a CRM", "an expense tracker") come with **no table yet** — you must create the data model first:
1. **Propose the data model** (tables, columns + types, relationships) and **confirm it with the user** before creating anything — schema is a commitment.
2. `create_tables` once for the confirmed model (it accepts one or many tables).
3. Optionally `insert_rows_batch` once to seed a small representative set so the app doesn't render empty. It is insert-only: omit generated serial primary keys, and treat an explicit duplicate-key error as a conflict to resolve—not an update path. Avoid dozens of rows unless density/pagination is under test.
4. Then `add_queries` + `add_components` as usual.
For an **existing** table, call `get_table_schema(table_name)` first so you use its real column names and types.
Use `add_table_column` to evolve a ToolJet DB table in place. Dropping a column/table/page is irreversible: inspect dependencies and obtain explicit approval for the exact target before `drop_table_column(..., confirm:true)`, `drop_table(..., confirm:true)`, or `delete_page(..., confirm:true)`.

### ToolJet DB (`kind: "tooljetdb"`)
- Resolve the table id with `list_tables()` — the query references the table by **`table_id`** (the id), NOT the name.
- List all rows: `options = { "operation": "list_rows", "table_id": "<table id>", "list_rows": {}, "runOnPageLoad": true }`.
- `runOnPageLoad: true` runs the query when the app opens so bound components populate automatically.
- `list_rows` may carry `limit`, `offset`, `where_filters`, and `order_filters`. In `order_filters`, the outer map key must match the clause's inner `id`; a mismatch can silently disable sorting. Fetch `get_datasource_query_schema(..., operation:"list_rows")` for the exact nested shapes instead of guessing.
- Prefer ToolJet DB aggregation over fetching every row just to count or sum: use `list_rows.aggregates` and optional `list_rows.group_by`. The aggregate configuration key is not the result key; results use `<table_name>_<column>_<aggFx>` (for example `starlink_terminals_id_count`). Multi-table reads use `operation: "join_tables"` with `join_table`.
- Primary-key batches use `bulk_update_with_primary_key` with `rows_update`, or `bulk_upsert_with_primary_key` with `rows`. Read the generated schema before composing these shapes.
- **Write operations** (for edit/create flows) use indexed-object option shapes:
  - Create: `{ "operation": "create_row", "table_id": "<id>", "create_row": { "0": { "column": "title", "value": "{{...}}" }, "1": { "column": "status", "value": "Open" } } }`
  - Update: `{ "operation": "update_rows", "table_id": "<id>", "update_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } }, "columns": { "0": { "column": "status", "value": "{{...}}" } } } }`
  - Delete: `{ "operation": "delete_rows", "table_id": "<id>", "delete_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } } } }`
- After a write succeeds, re-run list/count queries from the mutation's `onDataQuerySuccess` event.

(Other datasources have their own generated query schemas; resolve the contract from the connected `datasource_id` and requested operation.)

### SQL response values and aggregation

SQL driver output is type-dependent: values without a registered parser (commonly some numeric/decimal types) may arrive as strings. Do not assume every value is a string or every numeric-looking value is a number; cast in SQL or convert deliberately before JavaScript arithmetic. When the source is SQL, perform grouping/count/sum in SQL and return the small chart/table shape directly instead of downloading rows for a fragile client-side reduction.

## Charts — how to make them render reliably (READ THIS before adding a Chart)

The `Chart` component fails in a specific, common way: **ToolJet's chart-property evaluator silently returns EMPTY for complex expressions** — inline IIFEs, dynamic field-name detection, big reduces written inside the `{{ }}` binding. The chart then draws its axes/containers but receives **no data traces** (looks empty/broken). Avoid it:

1. **Use the simple mode** (the default — keep `plotFromJson` false / don't set it). Set two properties:
   - `type`: `"bar"` | `"line"` | `"pie"`
   - `data`: an array of `{ x, y }` objects.
2. **Build `data` with a SIMPLE, EXPLICIT binding.** First call `get_table_schema` (or `run_query`) to learn the **real field names** — never auto-detect them. Then use explicit filters/maps, no IIFE:
   ```
   data.value = "{{ [
     { x: 'Open',        y: queries.getTickets.data.filter(r => r.status === 'Open').length },
     { x: 'In Progress', y: queries.getTickets.data.filter(r => r.status === 'In Progress').length },
     { x: 'Resolved',    y: queries.getTickets.data.filter(r => r.status === 'Resolved').length }
   ] }}"
   ```
   For a straight mapping, `queries.q.data.map(r => ({ x: r.category, y: r.amount }))` is fine — simple and explicit.
3. **For heavy aggregation, do it in a QUERY, not the chart binding.** Bind `data` to a query that already returns `[{x,y}]` (a RunJS transform query, or a DB aggregate), and keep the chart's own binding a plain reference: `{{queries.chartData.data}}`. Query engines evaluate JS reliably; the chart property evaluator does not.
4. **Only use Plotly-JSON mode** (`plotFromJson: true` + `jsonDescription`) for advanced multi-trace charts. Static descriptions must be valid JSON with a non-empty `data` array. For a dynamic description, keep the expression simple, use explicit field names, wrap the object with `JSON.stringify(...)`, and confirm the browser audit does not report a visible Chart with zero evaluated traces.

Rule of thumb: **an empty Html can mean rawHtml was too complex.** In particular, a `.map()` nested inside another `.map()` can throw before an `||` fallback runs. Flatten that Html expression or pre-shape the nested data in a query. This is not a blanket ban on nested array lookups in Table data bindings.
