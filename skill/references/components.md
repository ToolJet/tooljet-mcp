# Component contracts and specialized rendering

Read this selectively for exact component binding rules or the built-in palette. Prefer batched, section-filtered `get_component_catalog` calls for the types actually used.

## Built-in components (pick from these first)

| Component (`type`) | Purpose |
|---|---|
| `Accordion` | Accordion — Group components |
| `AudioRecorder` | AudioRecorder — Records audio |
| `BoundedBox` | BoundedBox — An infinitely customizable image annotation widget |
| `Button` | Button — Trigger actions: queries, alerts, set variables etc. |
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
| `KeyValuePair` | KeyValuePair — Display data in key-value format |
| `Link` | Link — Add link to the text |
| `Listview` | Listview — List multiple items |
| `Map` | Map — Display map locations |
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
| `RadioButtonV2` | RadioButton — Select one from multiple choices |
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
| `ToggleSwitchV2` | ToggleSwitch — User-controlled on-off switch |
| `TreeSelect` | TreeSelect — Hierarchical item selector |
| `VerticalDivider` | VerticalDivider — Vertical line separator |

## Component binding reference

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

### Kanban
Bind cardData from query array shaped as [{id, title, columnId}]; bind columnData from query array shaped as [{id, title}]. lastCardMovement exposes {cardId, sourceColumn, destinationColumn} — use in update queries triggered by onCardMoved event to persist reordering.

### KeyValuePair
Bind data property to a query object for display/edit: `{{queries.queryName.data[0]}}`. changeSet exposes only the modified key-value pairs — use in update queries rather than the full data object. An explicit `fields` array does not suppress undeclared keys from `data`: project the binding to a new object containing only the intended field keys. Object spreads are not a safe projection.

### Listview
Bind data property to a query array: `{{queries.queryName.data}}`. Child components inside the list access the current row via the list's data binding context.

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

### TagsInput
Bind schema to a query for dynamic tag options: schema=`{{queries.queryName.data}}` (array of {label, value}). selectedTags exposes only the checked tags; values exposes all current tags.

### TextArea
Use debounce: 300 on onChange events that trigger queries. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

### TextInput
Use debounce: 300 on onChange events that trigger queries — prevents excessive query calls while typing. Bind value to prefill from a query: `{{queries.queryName.data[0].fieldName}}`.

## File generation formats

`generate-file` genuinely serializes CSV and passes plaintext through. Its PDF handler is also pass-through: it expects already-formed PDF bytes and does not render text, HTML, or tabular data into a PDF. Use CSV/plaintext unless the app already has valid PDF bytes, then verify the download in the viewer before claiming PDF support.

## Kanban card content

Kanban cards are nested canvases: `columnData` and `cardData` can resolve correctly, including card counts, while every card body remains blank if the Kanban has no child components. `add_components` materializes the catalog default title/description children when no explicit child is supplied. For a custom body, give the Kanban a `client_ref` and create its child with the matching `parent_ref` in the same call; any explicit child suppresses the defaults.

Nested `Text` clips to a single line. For multi-line title/description content, prefer one `Html` child bound to `cardData`, use normal wrapping plus `overflow-wrap:anywhere`, and pin its content width/max-width explicitly in CSS. Do not infer the physical Kanban column width from `cardWidth`; verify the card in the viewer because the rendered column can retain a wider minimum than the nested card canvas.

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
