# UI authoring and layout

Read this before laying out a new page or using a Chart, nested view, or other layout-sensitive surface. Table-specific layout and pagination live in tables.md.

## Component selection — built-in for interactive/data surfaces, HTML where it makes the UI better

ToolJet's value is **visually-editable, governed low-code config**: a built-in component can be edited in the visual builder by anyone. So anything the user will **interact with, bind data to, or edit** should be a built-in — a KPI tile → `Statistics`, a chart → `Chart`, a data grid → `Table`, inputs → `TextInput`/`NumberInput`/`DropdownV2`, forms → `Form`, progress → `CircularProgressBar`. Don't rebuild those in HTML — you'd throw away the visual editing and governance that are the whole point.

**But HTML is a first-class tool where it genuinely makes the app better — use it deliberately, not only as a last resort:**
- **Presentational / display-only content** — a styled hero or banner, a rich info card, a legend, an empty state, a formatted read-only block — where custom markup gives better aesthetics and more flexible layout than stacking built-ins. If the user won't interact with it or need to edit it, HTML is often the cleaner, better-looking choice.
- **Custom markup inside a component's own properties** — many components take HTML in their content/cell/tooltip properties (a Table column rendered as HTML, a `Text` set to HTML, custom cell formatting). Use it to polish the UI in place.
- **Rule of thumb:** built-in when it's **interactive, data-bound, or meant to be tweaked visually**; HTML when it's **static presentation or fine UI customization** and HTML expresses it more cleanly.

The full built-in palette (every `type` + purpose) is in **`references/components.md`**; pick from built-ins first. Once you've selected the current page's components, batch the complex/unfamiliar types with `get_component_catalog({ types:[...] })` (or use `type` for one) and request their exact needed sections — including `renderingHints` for `Text`/`Chart`/`Statistics`. Configure precisely; don't guess property names.

## Intent-to-component selection guide

Select by the user's information need, not by the easiest component to bind. The live `get_component_catalog` palette and typed contracts remain authoritative.

- **Headline measure or KPI:** `Statistics`. Bind one scalar aggregate, not a result array.
- **Trend, distribution, share, ranking, or target comparison:** `Chart`. Shape the data explicitly and keep labels readable.
- **Dense comparison, sorting, filtering, row selection, inline/bulk operations:** `Table`.
- **Rich compact browsing of repeated records:** `Listview`; use `mode:"grid"` for a card grid. Do not invent a GridView type.
- **Single-record facts:** `KeyValuePair` when native editing/changeSet behavior matters; projected `Html` for a polished read-only card.
- **Chronology:** `Timeline`. **Ordered process:** `Steps`. **User-controlled ordering:** `ReorderableList`.
- **Workflow board:** `Kanban`. **Calendar/schedule:** `Calendar`. Use them only when those interaction models are actually requested.
- **Status labels:** `Tags`. **Linear completion:** `ProgressBar`. **Compact gauge:** `CircularProgressBar`.
- **Large structured payload:** `JSONExplorer`; use `JSONEditor` only when the user must edit it.
- **Layout/grouping:** `Container`, `FlexContainer`, `Tabs`, `Accordion`, `Form`, and `ModalV2` according to their real semantics—not as decorative wrappers.
- **Text entry:** `TextInput`, `TextArea`, `RichTextEditor`, `NumberInput`, `CurrencyInput`, `PasswordInput`, `EmailInput`, `PhoneInput`, `CodeEditor`, or `JSONEditor` according to the value being collected.
- **Selection:** `DropdownV2` for one compact choice; `MultiselectV2` for several; `RadioButtonV2` for a few visible exclusive choices; `Checkbox` for one independent boolean; `ToggleSwitchV2` for an immediate on/off setting. Use `TreeSelect`/`Cascader` only for real hierarchy.
- **Date/time/range:** `DatePickerV2`, `DatetimePickerV2`, `TimePicker`, or `DaterangePicker`. **Files:** `FilePicker`. **Actions:** `Button`, `Icon`, `Link`, or `ButtonGroupV2`.
- **Trusted external content:** `IFrame`. **CustomComponent:** only for an explicit advanced requirement with maintainable code and no suitable governed built-in.
- **Navigation:** prefer ToolJet pages/sidebar; use `Navigation` only when the request needs a custom navigation surface.

Selection rules: do not default every collection to Table; do not render a single record as a one-row Table; a dashboard normally combines a metric band, only the charts that answer real questions, and an operational detail surface. Deprecated/legacy component types are inspection/repair only, and module-internal types are not normal page components.

## Page body composition signatures

After the shared title/subtitle frame, give every page a task-specific ordered body. Reusing the same generic stack on every page makes a multi-page app look accidental.

- **Monitor:** status/KPI band → exception signal or trend → prioritized operational detail → one primary response action.
- **Explore:** compact filters/search → result count/summary → dominant Table/Listview/Chart → drill-down affordance.
- **Operate:** queue or selected work item → dominant operational surface → one obvious primary action → immediate success/failure feedback.
- **Inspect:** identity/status header → grouped facts → chronology/related records → contextual secondary actions.
- **Edit:** short context header → grouped validated fields → visible primary save action → cancel/reset and mutation feedback.
- **Configure:** section navigation or Tabs → logically grouped settings → scope/permission explanation → save/reset feedback.

Across pages, keep the same visual language but change the body signature to the job. Compare neighboring page plans before building: if two pages have the same sections in the same order, either differentiate their jobs or merge them.

## Theme-aware styling

Themes are optional. Do not create a custom theme, change the workspace default, or force a theme merely to polish an app. For an existing app, read `get_app_settings({app_id,version_id})` before styling. If it reports a selected theme, treat that theme as the app's visual foundation; when the user asks to select another existing theme, resolve it with `list_app_themes()` and apply only its id with `update_app_settings(...,theme_id)`.

### Theme definition contract

`manage_theme` creates or replaces a complete definition with five groups. Theme definitions store **literal light/dark color values** (normally hex), not `var(--cc-...)` references:

```json
{
  "brand": { "colors": {
    "primary": { "light": "#4368E3", "dark": "#4A6DD9" },
    "secondary": { "light": "#6A727C", "dark": "#CFD3D8" },
    "tertiary": { "light": "#1E823B", "dark": "#318344" }
  }},
  "text": {
    "font": "IBM Plex Sans",
    "colors": {
      "primary": { "light": "#1B1F24", "dark": "#CFD3D8" },
      "placeholder": { "light": "#6A727C", "dark": "#858C94" }
    }
  },
  "border": {
    "radius": { "default": 6, "small": 0, "large": 0 },
    "colors": {
      "default": { "light": "#CCD1D5", "dark": "#3C434B" },
      "weak": { "light": "#E4E7EB", "dark": "#2B3036" }
    }
  },
  "systemStatus": { "colors": {
    "success": { "light": "#1E823B", "dark": "#318344" },
    "error": { "light": "#D72D39", "dark": "#D03F43" },
    "warning": { "light": "#BF4F03", "dark": "#BA5722" }
  }},
  "surface": { "colors": {
    "appBackground": { "light": "#F6F6F6", "dark": "#121518" },
    "surface1": { "light": "#FFFFFF", "dark": "#1E2226" },
    "surface2": { "light": "#F6F8FA", "dark": "#2B3036" },
    "surface3": { "light": "#E4E7EB", "dark": "#3C434B" }
  }}
}
```

Creating a theme does not select it for the app. Create it only when requested, then apply its returned id with `update_app_settings`. Updating a definition replaces the definition, so start from the existing complete definition and change only the intended leaves. Do not set a workspace theme as default unless the user explicitly approves that workspace-wide change.

### Component style tokens

ToolJet turns the selected theme's active light/dark colors into semantic CSS variables. Preserve a component's existing token-backed defaults; when an explicit color style is needed and the role matches, use these exact raw style values:

- brand: `var(--cc-primary-brand)`, `var(--cc-secondary-brand)`, `var(--cc-tertiary-brand)`
- text/icon: `var(--cc-primary-text)`, `var(--cc-placeholder-text)`, `var(--cc-default-icon)`
- border: `var(--cc-default-border)`, `var(--cc-weak-border)`
- status: `var(--cc-success-systemStatus)`, `var(--cc-error-systemStatus)`, `var(--cc-warning-systemStatus)`
- surfaces: `var(--cc-appBackground-surface)`, `var(--cc-surface1-surface)`, `var(--cc-surface2-surface)`, `var(--cc-surface3-surface)`

Do not invent a `--cc-` name. In an MCP component spec, put a static token directly in the top-level style wrapper—for example `styles.backgroundColor.value = "var(--cc-surface1-surface)"`—not inside `{{...}}`. Use a binding expression only when the style is genuinely conditional.

Tokens are a preference, not a prohibition on literal colors. A deliberate one-off accent, data-series color, illustration color, or contrast correction may use a hex/RGB value when it produces the better result or no semantic token fits. Repeated foundational roles—brand actions, page/surface backgrounds, primary text, standard borders, and success/error/warning states—should remain token-backed when a theme is selected, because hard-coded component colors will not change with the theme or light/dark mode. Verify contrast in both modes whenever a token is placed on a non-token or custom background.

## Canvas & grid mechanics (FACTS — you must respect these to position components)

ToolJet's canvas is a fixed grid. Components are **absolutely positioned** — they do NOT reflow or auto-stack. If you don't compute positions correctly, components **overlap**.

- The canvas is **43 columns** wide. A component's `left` and `width` are in **columns** (0–43). Full width = `left: 0, width: 43`.
- `top` and `height` are in **pixels**, snapped to a **10px** vertical grid. A data table is commonly ~300–500px tall.
- For one rectangle applied to both resolutions, use flat `layout:{top,left,width,height}`. For distinct resolution-specific placement, use `layouts:{desktop:{top,left,width,height},mobile:{top,left,width,height}}`. Do not put `desktop`/`mobile` inside `layout`; an invalid member rejects the entire atomic `add_components` batch.
- **Stack using rendered height:** `B.top = A.top + A.renderedHeight + gap` (gap ~10–20px). Most widgets—including Text, Button, Html, Chart, Table, and Statistics—render at the authored `height`. ToolJet's top-aligned labelled form-input widgets render at **`height + 20px`**. Standard single-line inputs use their catalog default **40px** authored height, occupy about **60px** with the top label/validation footprint, and need a **70px** top-to-top row step with a 10px gap. Raising the authored height does not absorb the increment or enlarge the value text.
- **Check sibling overlap on both axes.** Two same-parent rectangles collide only when their horizontal ranges and rendered vertical ranges both intersect. Side-by-side controls need distinct `left` ranges; a +20px top offset aligns an unlabeled Button with top-labelled inputs but does not make two controls with the same `left` side-by-side.
- A static-height **Text still needs enough internal room for every wrapped line**: minimum single-line height is `ceil(textSize * lineHeight + 6px)`, then round up to the 10px grid. Preserve h1–h6/p/div/li/br block boundaries and estimate roughly four characters per canvas-width column. Multi-block or wrapped text needs its full line count plus one line of safety; use `dynamicHeight` when content is variable. The outer widget can retain its authored height while text clips or visibly overflows into the next component.
- **Content-fit nested canvases.** For static short/modest content, size to the deepest rendered child: Container base chrome = 20px (a shown header adds `headerHeight + 11`); standalone-child Form = 20px (shown header adds `headerHeight + 10`, footer adds `footerHeight + 14`); Tabs = 82px with its tab strip or 32px when `hideTabs` is true. Compute `max(child.top + child.renderedHeight) + chrome` across every pane/child—not array order. Use intentional fixed scrolling only for genuinely long content, and give side-by-side containers the larger fit height so their bottoms align.
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
- **Page header (every page):** a title + one-line subtitle, styled via the Text's *native* styles so it reads as a header (a default-styled Text looks unfinished). Title `Text` ≈ `styles.textSize {{24}}`, `fontWeight bold`, `textColor` a strong dark (e.g. `#111827`), **height 50px**; subtitle `Text` ≈ `textSize {{14}}`, muted grey (e.g. `#6b7280`), height 40px; ~8px under the title, ~24px before content. (Exact keys and height formula from `get_component_catalog({type:"Text",sections:["styles","renderingHints"]})`.)
- **Canvas padding:** don't run edge-to-edge across all 43 columns — keep a consistent side gutter (top-level content ≈ columns **2–41**). Full-bleed only if asked.
- A dense operational or analytical page with several root surfaces should not accidentally stop around the middle of the desktop canvas. MCP warns when four or more root components including a Table/Chart/Listview/Kanban occupy only about columns 0–27; expand the main composition toward columns 2–41 unless a narrow rail is deliberate and browser-verified.
- **Consistent spacing:** ONE vertical gap between stacked sections (~16–24px) and ONE shared left edge for all top-level components.
- **Peer components** in a row (KPI tiles, filters) share equal widths, equal gaps and a common top — unless importance or label length justifies otherwise (see framing).

### 3. ToolJet rendering guardrails (these prevent real render bugs)
- **Chart titles clip** at common dashboard sizes. **Default: leave `Chart.title` empty and put a separate `Text` heading above the chart**, with its own heading slot + spacing. Enable a native chart title only after you've visually verified it doesn't clip at that size.
- **Chart widths** (defaults, not hard limits): a compact few-category pie/donut ≈ **13–15 columns**; a categorical bar with longer labels ≈ **20–24 columns**; at most **two** normal analytical charts in one ~39-column content row unless labels are short and readability is verified.
- **Statistics sizing:** a value-only tile with `hideSecondary:true` needs at least **12 columns** and ≈ **110–120px** height (at most three per content row), but **12–17 columns is safe only for a short one- or two-word label**; longer labels can wrap vertically and hide the value, so shorten them or use at least 18 columns. A tile with visible secondary content needs at least **18 columns** and ≈ **130–150px** height (normally two per row).
- **Table columns:** when presentation matters, set an **explicit, complete `columns` array** in the order you want and project the Table's `data` expression to new objects containing only visible and behavior-needed keys (for example, `queries.q.data.map(r => ({id:r.id,name:r.name,status:r.status}))`). An identity map (`.map(r => r)`) or object spread (`({...r})`) is **not** a safe projection: undeclared datasource fields can still leak. With `autogenerateColumns` enabled, ToolJet appends undeclared datasource fields after your explicit columns, which commonly exposes technical IDs and internal notes. For a behavior-only key such as `id`, keep it in `data` but declare its column with `columnVisibility:false`; this preserves it for `selectedRow`/actions and prevents autogeneration from showing it. Do not casually disable autogeneration: some ToolJet Table versions crash while generating column transformations when it is false. Do **not** rely on the property order of a transformed query object to reorder existing columns — it won't. Natural header casing is fine: **`headerCasing: "none"` is a valid value**.
- **Table dynamic/conditional columns:** `columnData` is evaluated once before a row exists, so it must not reference `rowData` or `cellValue`. Put per-cell transformation/editability/visibility/color on static `columns`. Any dynamic `textColor`, `cellBackgroundColor`, `isEditable`, `columnVisibility`, `linkTarget`, or `jsonIndentation` also needs the matching name in `fxActiveFields`. Current types include `datepicker`, `select`, `newMultiSelect`, and `tagsV2`; do not author deprecated `dropdown`, `multiselect`, `tags`, `badge(s)`, `radio`, `toggle`, or `default` column types.
- **Table row actions:** use a `columnType: "button"` column in the complete `columns` array; do not use deprecated `properties.actions`. Read `get_component_catalog({type:"Table",sections:["authoringHints"]})` for the exact column/button defaults. Wire each button with `source_type:"table_column"`, `trigger:"onClick"`, and `ref:"<column key or name>::<button id>"`. Button property expressions can use `rowData`/`cellValue`; event actions should read `components.<table>.selectedRow` (ToolJet sets it before the handler runs).
- **Operational viewport:** on an **Operate** page with a bounded Table/Listview, avoid adding a page-level scrollbar on top of the pane's own vertical scrolling. Keep the single primary action inside the initial desktop viewport (as a safe authored-canvas default, its bottom should be around **720px or less**) by shortening the header/pane or moving the action above/beside the pane. Long forms and detail pages may deliberately scroll; browser-verify that choice instead of applying this threshold blindly.

### 4. Density — don't overcrowd; split instead
- A page should serve **~one primary job** (plus light supporting context). If you find yourself stacking full tables/forms for multiple **unrelated** domains on one page, STOP and split them into focused pages (see "Plan the app") — crowding is an **architecture** smell, not a layout problem.
- Use **progressive disclosure**: push secondary detail behind a row-click → detail page or modal, and behind tabs/sections — don't lay everything inline at once.
- Keep **one obvious primary action** per page and a clear visual hierarchy; if a user can't tell what this page is *for* in a glance, it's doing too much.
- **But dense is fine when the job genuinely needs it.** A legitimate operational surface (a trading console, an ops monitor, an admin grid) can be information-dense — density is only a problem when it **mixes unrelated jobs** or **buries the primary action**. Judge by "one clear job + one obvious primary action + clean hierarchy", not a hard component count.

### 5. Mobile — skip it by default
Most customers view these on desktop. **Don't build or tune a mobile layout for the initial build unless the user explicitly asks.** When they do, treat mobile as **recomposition** — rethink what leads and what collapses on a narrow screen — not blind vertical stacking of the desktop layout. And note: **resizing a browser window does NOT prove ToolJet's mobile layout rendered** — that is a structural guess, not real mobile visual validation; only claim mobile works if you verified it the way ToolJet actually renders mobile.
