# Events, mutations, and async states

Read this when wiring component, query, page, or Table-column events, and for mutation success/failure/loading behavior.

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
- **Query load timing:** `runOnPageLoad:true` is app-load initialization—it runs at app boot, not every time a non-home page is revisited. Use it for true app-wide/home initialization. For a focused page that must refresh on each entry, keep the query on-demand and add exactly one page `onPageLoad → run-query` handler. Do not configure both paths for the same home-page query; it double-fires on first load. MCP skips exact duplicate handlers, but design the lifecycle once.
- **Master → detail:** on Table `onRowClicked`, order handlers as: (1) `set-custom-variable` for the selected row/id, (2) optional `run-query` for fresh detail data, (3) `switch-page` **LAST**. ToolJet stops the same-trigger chain after navigation, so later handlers silently never run. Bind directly to `{{variables.selectedTicket.<field>}}` when a snapshot is enough. A detail-page `onPageLoad` query is also valid; do not rely on app-level `runOnPageLoad` re-running on navigation. This variable-only pattern is intentionally navigation-scoped: a hard reload or direct link to the hidden detail page has no selected record. If reloadable/deep-linkable detail is required, design an explicit persisted/parameterized selection flow and browser-test it rather than presenting the variable-only page as deep-link safe.
- **Refresh on an external filter:** an input's `onChange`/`onEnterPressed` → `run-query` on the list query whose filter references the input.
- **Server-side Table search/filter:** keep datasource-specific pagination/filter syntax in the query contract and bind `totalRecords` to a matching count query. Use one mode only: reactive reads with events limited to resetting page 1, or non-reactive reads explicitly run by page/search/sort/filter events after the reset. Never wire both, which duplicates requests and can race stale state. Guard offset pagination with `((components.<table>.pageIndex || 1) - 1) * pageSize`.
- **Prevent double-submit:** bind the submit Button's `Disable` to the mutation query's loading (`{{queries.<mutation>.isLoading}}`) so it can't fire twice, and show its native loading state while the mutation runs. (See "Async & UI states".)

Wire events AFTER the components and queries exist (you need their ids). Prefer one `add_events` call for all ordinary events and one `add_query_lifecycles` call for every standard mutation flow.

## Async & UI states — required, not polish

Any element backed by a query is **not done** until its states are handled. These are part of building the feature, not a later polish pass:
- **Loading:** use the component's **native loading state** (Table/Statistics/Button etc. have a `loadingState`), bound to the query's loading flag `{{queries.<q>.isLoading}}` — never leave a component blank while data loads.
- **Empty:** a query can return zero rows. Show a clear empty state ("No workouts logged yet" via a Text/HTML block, or the Table's own empty message) — not a blank grid or a broken-looking chart. A custom empty state may intentionally share the Table's rectangle when their `visibility` bindings are exact complements; MCP suppresses the overlap warning only when that exclusivity is provable.
- **Error:** a query can fail. Surface it (a `show-alert` on the query's failure event, or a visible error state) — never present blank/stale as if it were fine.
- **Refresh:** after any mutation, re-run list/count queries from the mutation query's `onDataQuerySuccess` lifecycle event.
- **Success:** confirm and close/reset only from `onDataQuerySuccess`; show an error and preserve input from `onDataQueryFailure`.
- **Disabled / no double-fire:** while a mutation runs, **disable the button that triggered it** — bind its `Disable` to the mutation query's `{{queries.<mutation>.isLoading}}` (or `control-component` setDisable/setLoading around the action). A double-click must never fire the mutation twice.
