# Forms, modals, and interactions

Read this only when the requested phase contains forms, modals, mutations, or component/query event wiring.

## Form construction — choose generated or standalone before creating components

- Use `generate_form_schema` only when **every selected field** maps to `textinput`, `number`, `emailinput`, `password`, `datepicker`, or `checkbox`. It maps real defaults, keeps create dates empty, omits serial keys, locks edit-mode primary keys, preserves `include` order, and supports safe label/placeholder/validation overrides. Read submitted values from `components.<form>.formData` and apply its returned layout guidance.
- If **any field** needs `dropdown`, `multiselect`, `textarea`, `radio`, `toggle`, `starrating`, or `filepicker`, build the **entire form** from standalone components in one `add_components` call. Do not mix a generated Form with corrective standalone fields: one standalone layout gives every field the same controllable edge and rhythm.
- For standalone forms, set `styles.alignment.value="top"` on every labelled input; use one two-column grid for compact fields, make TextArea fields full-width and genuinely multi-line, and use each component's top-level `validation.mandatory` for required state/asterisks. Read values from `components.<name>.value` (FilePicker: `components.<picker>.file[0]`). Bind conditional visibility directly on the standalone components.
- Generated Form cannot be repaired with schema `alignment`: FormUtils passes no alignment through. Dropdown/Multiselect labels stay offset and TextArea keeps a literal `Label` and may render as a single-line box. `filepicker` additionally crashes the whole Form. Treat these as hard selection rules, not browser-polish warnings.
- Put submit loading/disable state on a standalone Button and run only the mutation from its click. Put refresh, reset/clear, close, and success behavior on the mutation query's `onDataQuerySuccess`; preserve values and show an error on `onDataQueryFailure`.

## Forms & modals — field layout (avoid cramped, misaligned fields)

Form inputs default to a **side-aligned label** (`styles.alignment = "side"`) — the label sits to the LEFT of the input and eats its width. In a modal or a narrow column, a long label ("Requested amount (USD)") leaves a uselessly narrow input. Lay forms out deliberately:

- **Top-align labels in forms and modals.** Set `styles.alignment.value = "top"` on every input (`TextInput`/`NumberInput`/`CurrencyInput`/`DropdownV2`/`MultiselectV2`/`DatePickerV2`/`DatetimePickerV2`/`TextArea`/…) — the label goes ABOVE the control so it gets the **full field width**. (`alignment` is a **style**, not a property.)
- **Field sizing:** use the catalog default **40px authored height** for TextInput, EmailInput, NumberInput, DropdownV2, DatePickerV2, and other standard single-line fields. Row step is always **authored height + 20px label/validation footprint + 10px gap**; that is 70px only for a 40px-authored field. Reserve **90–100px authored height** for a genuinely multi-line TextArea. Do not inflate a single-line field to make its value text look larger: height changes whitespace, while these component contracts expose `labelFontSize` but no value-font-size style.
- **Two-column forms:** reserve ~**2 grid columns** of gutter between the two columns, and give both columns' fields consistent widths.
- **Full-width fields** (Description, notes) must share the **same left AND right edge** as the columns above them — with top-aligned labels they line up naturally; side-aligned ones begin at different x positions.
- **Use ModalV2's native regions.** Put the modal title Text in `slot_name:"header"`, form fields in `body` (the default), and native action buttons in `footer` when that footer is enabled. Do not leave `showHeader:true` with an empty header while adding a second title row to the body; MCP warns on both patterns. Header, body, and footer are separate child canvases, so their coordinates do not collide.
- **Modal-local coordinates:** a component parented to a modal is positioned **relative to the modal body** (0,0 = modal body top-left), NOT the 43-column canvas. Size its children to the modal body width, not the full canvas.
- **Modal sizing:** set `modalHeight >= lowest child top + renderedHeight + visible headerHeight + visible footerHeight + ~20px bottom slack`. ModalV2's default header/footer are 80px each; with only the header visible, that is the child's rendered bottom + ~100px. Undersized content can be clipped or forced into unintended scrolling.
- **Prefer flat composition.** Page-level components are faster to generate, inspect, and repair. Use generated Form only for its safe homogeneous field set; otherwise batch standalone fields with one-level modal/container parenting where required.
- **Use nesting only when the component semantics require it** (Kanban card content, custom Modal/Form children, Container/FlexContainer, Tabs, Listview, expandable rows). When it is required, create the hierarchy atomically in one `add_components` call with `client_ref`/`parent_ref`; keep it one level deep where practical.

**Browser QA for any form/modal:** confirm no label is truncating its input, every control has a usable width, field left/right edges line up, TextAreas are visibly multi-line, conditional fields behave correctly, and the final field plus footer/action buttons are visible at maximum modal scroll. Generated mixed-type Forms are blocked before authoring; if one already exists, replace it in place with standalone fields rather than attempting schema alignment. An element can exist in the DOM yet still be occluded by an undersized boundary, so use a screenshot in addition to the DOM snapshot.

## Interactivity — wire events so the app DOES things (not just displays)

Components and queries alone make a *static* app. Use `add_events` for component, query, page, and Table Button-column behavior: `{ source_id, source_type, trigger, ref?, action }`. `component_id` is a backward-compatible shorthand for `source_type: "component"`.

**Triggers:** component triggers come from `get_component_catalog(type).events` (Button `onClick`; Table `onPageChanged`/`onSearch`/`onSort`/`onFilterChanged`/`onBulkUpdate`; Form `onSubmit`/`onInvalid`). A Table Button-column click uses `source_type:"table_column"`, `trigger:"onClick"`, and `ref:"<column key or name>::<button id>"`. Query lifecycle triggers are `onDataQuerySuccess` and `onDataQueryFailure` with `source_type: "data_query"`. Page load is `onPageLoad` with `source_type: "page"`.

**Actions** (`action = { actionId, ...params }`) — use these exact `actionId` strings (invalid ids silently do nothing):
- **Run a query:** `{ actionId: 'run-query', queryId: '<query id>', queryName: '<name>' }`
- **Switch page:** `{ actionId: 'switch-page', pageId: '<target page id>' }` (see master→detail below for passing data).
- **Show alert:** `{ actionId: 'show-alert', message: 'Saved', alertType: 'success' | 'info' | 'warning' | 'error' }`
- **Show modal:** `{ actionId: 'show-modal', modal: '<modal component id>' }` · **Close modal:** `{ actionId: 'close-modal', modal: '<modal component id>' }`
- **Set a custom variable:** `{ actionId: 'set-custom-variable', key: 'selectedTicket', value: '{{components.<table>.selectedRow}}' }` — the id is **`set-custom-variable`** (NOT `set-variable`, which does not exist); read it back as `{{variables.selectedTicket}}`. Also: `unset-custom-variable`.
- **Control a component:** `{ actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: 'setValue' | 'clear' | 'setVisibility' | 'setDisable' | 'setLoading', ... }` — reset/prefill an input, toggle visibility, etc.
- **Set a Table page:** `{ actionId: 'set-table-page', table: '<Table component id>', pageIndex: '{{1}}' }`.
- **Export data:** `{ actionId: 'generate-file', ... }` — CSV/plaintext works. The PDF branch is pass-through only: it requires pre-formed PDF bytes and does not convert text, HTML, or query data. Use CSV unless real PDF bytes are already available and browser-verified. · **Copy:** `{ actionId: 'copy-to-clipboard', ... }`.

(Other valid ids include `set-page-variable`, `open-webpage`, `go-to-app`, `logout`, `set-localstorage-value`, `scroll-component-into-view`.)

**Common recipes:**
- **Mutation lifecycle (required):** the Button/Form event runs **only** the mutation. On that query's `onDataQuerySuccess`, run the list/count refresh queries, show success, reset the Form if appropriate, and close the modal. On `onDataQueryFailure`, show an error and keep the user's input. Never refresh or show success immediately after starting the mutation—the write may fail.
- **Page initialization:** attach `onPageLoad` to the page when a query must run each time that page is entered. Use a page event instead of assuming app-level `runOnPageLoad` will re-run on in-app navigation.
- **Master → detail:** on Table `onRowClicked`, order handlers as: (1) `set-custom-variable` for the selected row/id, (2) optional `run-query` for fresh detail data, (3) `switch-page` **LAST**. ToolJet stops the same-trigger chain after navigation, so later handlers silently never run. Bind directly to `{{variables.selectedTicket.<field>}}` when a snapshot is enough. A detail-page `onPageLoad` query is also valid; do not rely on app-level `runOnPageLoad` re-running on navigation.
- **Refresh on an external filter:** an input's `onChange`/`onEnterPressed` → `run-query` on the list query whose filter references the input.
- **Server-side Table search/filter:** keep datasource-specific pagination/filter syntax in the query contract and bind `totalRecords` to a matching count query. Use one mode only: reactive reads with events limited to resetting page 1, or non-reactive reads explicitly run by page/search/sort/filter events after the reset. Never wire both, which duplicates requests and can race stale state. Guard offset pagination with `((components.<table>.pageIndex || 1) - 1) * pageSize`.
- **Prevent double-submit:** bind the submit Button's `Disable` to the mutation query's loading (`{{queries.<mutation>.isLoading}}`) so it can't fire twice, and show its native loading state while the mutation runs. (See "Async & UI states".)

Wire events AFTER the components and queries exist (you need their ids). Prefer one `add_events` call for all ordinary events and one `add_query_lifecycles` call for every standard mutation flow.
