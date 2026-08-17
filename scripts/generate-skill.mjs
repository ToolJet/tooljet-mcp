// Generates skill/SKILL.md from the TJ-AI agent's authoritative knowledge (component
// binding rules) + ToolJet's canvas grid constants. KNOWLEDGE ONLY — no layout/design
// opinions (Codex owns those). Re-run when the agent's rules change to avoid drift.
//
// Usage: node scripts/generate-skill.mjs
//   env: TJAI_ROOT (default ~/Claude/Projects/TJ-AI)
//        TOOLJET_ROOT (default ~/Claude/Projects/ToolJet/ToolJet)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TJAI = process.env.TJAI_ROOT || resolve(homedir(), 'Claude/Projects/TJ-AI');
const TOOLJET = process.env.TOOLJET_ROOT || resolve(homedir(), 'Claude/Projects/ToolJet/ToolJet');

// --- 1. Extract COMPONENT_BINDING_RULES (dict[str,str]) from the agent via Python ast ---
function extractBindingRules() {
  const py = `
import ast, json, sys
src = open(sys.argv[1]).read()
tree = ast.parse(src)
rules = {}
for node in ast.walk(tree):
    name = None
    if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        name = node.target.id
    elif isinstance(node, ast.Assign):
        for t in node.targets:
            if isinstance(t, ast.Name): name = t.id
    if name == 'COMPONENT_BINDING_RULES' and node.value is not None:
        rules = ast.literal_eval(node.value)
print(json.dumps(rules))
`;
  const file = resolve(TJAI, 'src/tooljet_agent/services/app_builder/v1/bindings/tool_utils.py');
  const out = execFileSync('python3', ['-c', py, file], { encoding: 'utf8' });
  return JSON.parse(out);
}

// --- 2. Read ToolJet canvas grid constants (facts, not opinions) ---
function readGridConstants() {
  const file = resolve(TOOLJET, 'frontend/src/AppBuilder/AppCanvas/appCanvasConstants.js');
  const txt = readFileSync(file, 'utf8');
  const num = (name) => {
    const m = txt.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
    return m ? Number(m[1]) : null;
  };
  return { columns: num('NO_OF_GRIDS') ?? 43, rowSnapPx: num('GRID_HEIGHT') ?? 10 };
}

// --- 2b. Harvest the built-in component catalog (name + purpose) from ToolJet widget defs ---
function readWidgetCatalog() {
  const dir = resolve(TOOLJET, 'frontend/src/AppBuilder/WidgetManager/widgets');
  const files = readdirSync(dir).filter((f) => /\.(js|ts)$/.test(f) && f !== 'index.js');
  const items = [];
  for (const f of files) {
    const txt = readFileSync(resolve(dir, f), 'utf8');
    const name = txt.match(/\bname:\s*'([^']+)'/)?.[1];
    const desc = txt.match(/\bdescription:\s*'([^']+)'/)?.[1];
    if (name && desc) items.push({ name, description: desc });
  }
  // de-dupe by name, sort
  const seen = new Set();
  return items
    .filter((i) => (seen.has(i.name) ? false : seen.add(i.name)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- 3. De-agent: strip references to the agent's internal pipeline from a rule string ---
// Strip references to the agent's internal multi-pass pipeline so each rule reads as a
// standalone component fact for a single tool-calling agent (Codex).
function deAgent(text) {
  let t = text
    .replace(/\bschema_context\b/g, 'the query result')
    .replace(/\b(the )?orchestrator\b/gi, 'you')
    .replace(/\bquery_tooljet_docs\b/g, 'the component catalog')
    .replace(/\b(the )?(layout|binding|query|events?) agent\b/gi, 'you')
    .replace(/\bsub[- ]?agents?\b/gi, 'steps')
    .replace(/\bPromptComposer\b/g, 'the tool')
    .replace(/\bget_event_chains(['’]s)?\b/gi, "the app's")
    .replace(/\bmodals_shown\b/gi, 'the current state');
  // Drop whole sentences that describe the agent's pass-ordering (irrelevant to a single agent).
  t = t
    .split(/(?<=\.)\s+/)
    .filter(
      (s) =>
        !/\b(ran before|before events existed|layout ran|already set|pass|multi-?pass|other steps)\b/i.test(s)
    )
    .join(' ');
  return t.replace(/\s+/g, ' ').trim();
}

// --- 4. Assemble the skill ---
const rules = extractBindingRules();
const grid = readGridConstants();
const catalog = readWidgetCatalog();
const componentList = Object.keys(rules).sort();

const catalogSection = catalog.map((c) => `| \`${c.name}\` | ${c.description} |`).join('\n');

const componentSection = componentList
  .map((name) => `### ${name}\n${deAgent(rules[name])}`)
  .join('\n\n');

const skill = `---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via the tooljet-mcp tools — create apps, add datasource queries, and add components bound to them. Use whenever asked to build/scaffold a ToolJet app, dashboard, or internal tool, or to add pages/components/queries. This is a KNOWLEDGE reference (component binding rules, canvas mechanics, query schemas); YOU make all layout and design decisions."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - TJ-AI COMPONENT_BINDING_RULES (${componentList.length} components)
    - ToolJet WidgetManager catalog (${catalog.length} built-in components)
    - ToolJet appCanvasConstants (grid mechanics)
---

<!-- GENERATED FILE — do not edit by hand. Run \`node scripts/generate-skill.mjs\` to regenerate. -->

## What this skill is

Facts you need to build ToolJet apps through the \`tooljet-mcp\` tools — the component binding rules, the canvas coordinate system, and query schemas. It contains **no design opinions**: which components to use, how to lay them out, and how they look are **your** decisions. Aim for a clean, polished, enterprise-grade result.

Every tool call goes through ToolJet's governed API (your session + permissions). ToolJet apps are configuration over a fixed component library, not code.

## The tools

- \`create_app(name)\` → \`{ app_id, version_id, home_page_id, app_url }\`. Call first; keep all four.
- \`list_datasources(version_id)\` → \`[{ id, name, kind }]\`. ToolJet DB is \`kind: "tooljetdb"\`.
- \`list_tables()\` → \`[{ id, table_name }]\`. A ToolJet-DB query needs the table's **id** as \`table_id\`.
- \`get_table_schema(table_name)\` → a table's columns \`[{ name, type, isPrimaryKey, isNotNull }]\`. Read before building queries/columns/forms/filters on an existing table.
- \`create_table({ table_name, columns })\` → create a ToolJet-DB table (column types: string/integer/number/bigint/boolean/timestamp/json/serial; a serial \`id\` PK is added if you don't mark one). Returns \`{ table_id, table_name }\`.
- \`insert_rows({ table_name, rows })\` → seed sample rows so the app isn't empty (optional; integer/serial PKs auto-fill).
- \`get_component_catalog()\` → the component palette (every type + purpose). \`get_component_catalog(type)\` → that component's **full property schema** (props with type + default, defaultSize, styles). **Always call \`get_component_catalog(type)\` before configuring a component** so you set real properties, not guesses.
- \`add_query({ version_id, datasource_id, name, options })\` → \`{ query_id, name }\`. Single query.
- \`add_queries({ version_id, queries: [...] })\` → \`[{ query_id, name }]\`. **Create ALL an app's queries in one call.**
- \`add_component({ app_id, version_id, page_id, name, type, properties, layout })\` → \`{ component_id }\`. Single component; \`name\` required.
- \`add_components({ app_id, version_id, page_id, components: [...] })\` → \`[{ component_id, name }]\`. **Place ALL of a page's components in one call.**
- \`add_events({ app_id, version_id, events: [...] })\` → wire interactivity (each event = a trigger on a component + an action). This is how the app DOES things. Create all events in one call. See "Interactivity" below.

**Batch for the build, singular for edits.** When first building an app, create everything with \`add_queries\` + \`add_components\` (far fewer round-trips). Use the singular \`add_query\`/\`add_component\` afterwards for incremental edits (e.g. "add a status filter"). A batch is atomic — if one item is invalid the whole call fails; fix that item and retry.
- \`get_app(app_id)\` → current app structure.
- \`add_page({ app_id, version_id, name })\` → \`{ page_id, name }\`. Add a page; pass its \`page_id\` to add_component(s). ToolJet renders cross-page navigation automatically.

## Before you build — clarify a vague request first

If the user's request is short or underspecified (e.g. "build a tickets dashboard"), ask **2–4 focused questions before building**, then proceed. Good things to confirm: which fields/columns matter most, what actions or filters/segments they need, whether they want summary metrics/charts, and any layout, density, or branding preferences. This makes the first result match their intent and saves iteration — and the user feels involved.

If the user already gave a detailed spec, don't interrogate — build directly. Never block on questions the user has effectively already answered.

## App model & binding syntax

- app → version → page → component. \`create_app\` gives one app + version + a "Home" page. Add more pages with \`add_page\` when the app benefits (e.g. list + detail, or separate dashboard/admin views); ToolJet auto-renders navigation between pages. Don't fragment a simple app across many pages — a single well-laid-out page is often best.
- A component has **properties**; each property value is \`{ "value": <val> }\`. Values starting with \`{{ … }}\` are **bindings** evaluated at runtime.
- A query exposes its result as \`queries.<queryName>.data\`. Bind a component property to it, e.g. a Table's \`data.value = "{{queries.<queryName>.data}}"\`.

## Component selection — ALWAYS prefer built-in components over HTML

ToolJet's value is **visually-editable, governed low-code config**. Built-in components can be edited in ToolJet's visual builder by anyone; a raw \`HTML\`/\`Text\` component with hand-written markup **cannot** — it becomes an opaque blob the user can't tweak without code. So:

- **Map every piece of your design to a built-in component first.** A KPI/metric tile → \`Statistics\` (not an HTML card). A chart or bar/graph → \`Chart\` (not HTML/SVG). A data grid → \`Table\`. Labels/headings → \`Text\`. Inputs → \`TextInput\`/\`NumberInput\`/\`DropdownV2\`/etc. Forms → \`Form\`. Progress → \`CircularProgressbar\`.
- Use \`HTML\` (or \`Text\` with HTML) **only as a last resort** — when ToolJet genuinely has no built-in component for what you need. Do not build tiles, charts, tables, or layouts out of HTML when a built-in exists.
- The full built-in palette (with purposes) is below — check it before reaching for HTML.
- Once you've picked a component, call \`get_component_catalog(type)\` to get its exact properties (names, types, defaults) and configure it precisely — don't guess property names.

### Built-in components (use these first)

| Component (\`type\`) | Purpose |
|---|---|
${catalogSection}

## Canvas & grid mechanics (FACTS — you must respect these to position components)

ToolJet's canvas is a fixed grid. Components are **absolutely positioned** — they do NOT reflow or auto-stack. If you don't compute positions correctly, components **overlap**.

- The canvas is **${grid.columns} columns** wide. A component's \`left\` and \`width\` are in **columns** (0–${grid.columns}). Full width = \`left: 0, width: ${grid.columns}\`.
- \`top\` and \`height\` are in **pixels**, snapped to a **${grid.rowSnapPx}px** vertical grid. A typical input is ~40px tall; a data table ~300–500px.
- Every component's \`layout\` must be given for **both resolutions**: \`{ desktop: {top,left,width,height}, mobile: {top,left,width,height} }\`.
- **Stacking rule (prevents overlap):** to place component B below component A, set \`B.top = A.top + A.height + gap\` (gap ~10–20px). Never reuse the same \`top\` for two components in the same area — the later one draws over the earlier one.
- The full canvas is ${grid.columns} columns; how you use that space is a design choice (see Design defaults below) — don't reflexively span edge-to-edge.

## Design defaults — make apps look enterprise-grade by default (the user can override)

Apply these unless the user specifies otherwise. If the user states any layout, spacing, density, or brand preference, **the user always wins** — these are only defaults so that apps look clean and professional even when the user doesn't ask.

- **Polish:** aim for a clean, consistent, enterprise-ready result — clear section headings, aligned components, sensible grouping of related content. No overlaps, no cramped or lopsided layouts.
- **Canvas padding:** don't run content edge-to-edge across all ${grid.columns} columns. Leave a consistent side gutter — put top-level content roughly in columns **2–${grid.columns - 2}** (≈2 columns of breathing room on the left and right). Use full-bleed only if the user asks.
- **Consistent margins:** use ONE consistent vertical gap between stacked sections (~16–24px) and ONE shared left edge for all top-level components. Don't let each component pick its own margins — consistency reads as "enterprise".
- **Peer components:** components in the same row (e.g. KPI tiles, filters) should have **equal widths and equal gaps** between them, and align on the same top.
- **Hierarchy:** lead with a title/header row; put summary metrics (Statistics) and charts (Chart) above detailed tables; keep primary actions visible.

## Component binding reference (${componentList.length} components)

Authoritative rules for binding each component correctly (what must be set, or it renders nothing / wrong). Choose whichever components best fit the app you're building.

${componentSection}

## Datasource query reference

\`add_query\`/\`add_queries\` work on **any** connected datasource — ToolJet DB, PostgreSQL, MySQL, MongoDB, ServiceNow, RunJS, etc. The query **kind is taken from the datasource automatically** (you don't pass it; call \`list_datasources\` to see each datasource's \`kind\`). Only the \`options\` differ per kind:
- **tooljetdb** — \`{ operation: "list_rows", table_id: "<id>", list_rows: {}, runOnPageLoad: true }\` (see below)
- **postgresql / mysql** — \`{ mode: "sql", query: "SELECT …", query_params: [], run_on_page_load: true }\`
- **runjs** — \`{ code: "return queries.q1.data.filter(r => r.status === 'Open').length;" }\` (great for chart aggregation — reference other queries' data, return a shaped value)
- **servicenow** — \`{ operation: "list_records", table: "incident", … }\`
Ask for a specific datasource's full option schema when you need it.

### Building an app that needs a NEW data model (most real requests)
Many requests ("build a CRM", "an expense tracker") come with **no table yet** — you must create the data model first:
1. **Propose the data model** (tables, columns + types, relationships) and **confirm it with the user** before creating anything — schema is a commitment.
2. \`create_table\` for each table.
3. Optionally \`insert_rows\` to seed a handful of realistic sample rows so the app doesn't render empty (only if the user wants sample data).
4. Then \`add_queries\` + \`add_components\` as usual.
For an **existing** table, call \`get_table_schema(table_name)\` first so you use its real column names and types.

### ToolJet DB (\`kind: "tooljetdb"\`)
- Resolve the table id with \`list_tables()\` — the query references the table by **\`table_id\`** (the id), NOT the name.
- List all rows: \`options = { "operation": "list_rows", "table_id": "<table id>", "list_rows": {}, "runOnPageLoad": true }\`.
- \`runOnPageLoad: true\` runs the query when the app opens so bound components populate automatically.
- \`list_rows\` may carry \`limit\`, \`offset\`, \`where_filters\`, \`order_filters\` for filtering/sorting.

(Other datasources — postgresql, mongodb, servicenow, etc. — have their own query schemas; ask for the specific one when needed.)

## Charts — how to make them render reliably (READ THIS before adding a Chart)

The \`Chart\` component fails in a specific, common way: **ToolJet's chart-property evaluator silently returns EMPTY for complex expressions** — inline IIFEs, dynamic field-name detection, big reduces written inside the \`{{ }}\` binding. The chart then draws its axes/containers but receives **no data traces** (looks empty/broken). Avoid it:

1. **Use the simple mode** (the default — keep \`plotFromJson\` false / don't set it). Set two properties:
   - \`type\`: \`"bar"\` | \`"line"\` | \`"pie"\`
   - \`data\`: an array of \`{ x, y }\` objects.
2. **Build \`data\` with a SIMPLE, EXPLICIT binding.** First call \`get_table_schema\` (or \`get_app\`) to learn the **real field names** — never auto-detect them. Then use explicit filters/maps, no IIFE:
   \`\`\`
   data.value = "{{ [
     { x: 'Open',        y: queries.getTickets.data.filter(r => r.status === 'Open').length },
     { x: 'In Progress', y: queries.getTickets.data.filter(r => r.status === 'In Progress').length },
     { x: 'Resolved',    y: queries.getTickets.data.filter(r => r.status === 'Resolved').length }
   ] }}"
   \`\`\`
   For a straight mapping, \`queries.q.data.map(r => ({ x: r.category, y: r.amount }))\` is fine — simple and explicit.
3. **For heavy aggregation, do it in a QUERY, not the chart binding.** Bind \`data\` to a query that already returns \`[{x,y}]\` (a RunJS transform query, or a DB aggregate), and keep the chart's own binding a plain reference: \`{{queries.chartData.data}}\`. Query engines evaluate JS reliably; the chart property evaluator does not.
4. **Only use Plotly-JSON mode** (\`plotFromJson: true\` + \`jsonDescription\`) for advanced multi-trace charts — and even then keep the expression simple, use explicit field names, and wrap the object with \`JSON.stringify(...)\`.

Rule of thumb: **an empty chart means the binding was too complex.** Replace dynamic detection with explicit field names + simple \`.filter().length\` / \`.map()\`.

## Interactivity — wire events so the app DOES things (not just displays)

Components and queries alone make a *static* app. Use \`add_events\` to add behavior. Each event = **a trigger on a component + an action**: \`{ component_id, trigger, action }\`.

**Triggers** (the \`trigger\` = the component's event id): Button → \`onClick\`; Table → \`onRowClicked\`, \`onSearch\`, \`onPageChanged\`, \`onBulkUpdate\`; text/number inputs → \`onChange\`, \`onEnterPressed\`; Form → \`onSubmit\`. (A component's exact events are in \`get_component_catalog(type)\` / its widget definition.)

**Actions** (\`action = { actionId, ...params }\`):
- **Run a query:** \`{ actionId: 'run-query', queryId: '<query id>', queryName: '<name>' }\`
- **Switch page + pass variables:** \`{ actionId: 'switch-page', pageId: '<target page id>', queryParams: [['id', '{{components.table1.selectedRow.id}}']] }\` — \`queryParams\` is an array of \`[key, value]\` pairs; the value can be a binding, and the target page reads them from its page params. **This is how you pass data between pages.**
- **Show alert:** \`{ actionId: 'show-alert', message: 'Saved', alertType: 'success' | 'info' | 'warning' | 'error' }\`
- **Show/close modal:** \`{ actionId: 'show-modal', modal: '<modal component id>' }\`
- **Set variable:** \`{ actionId: 'set-variable', key: '...', value: '...' }\`

**Common recipes:**
- **Form submit → insert + refresh:** on the submit Button's \`onClick\`, two events: \`run-query\` (the insert/create query), then \`run-query\` (the list query, to refresh the table). Add a \`show-alert\` success for good UX.
- **Master → detail:** Table \`onRowClicked\` → \`switch-page\` to a detail page, passing \`queryParams: [['id', '{{components.<table>.selectedRow.<pkField>}}']]\`; the detail page's query filters by that param.
- **Refresh on filter:** an input's \`onChange\`/\`onEnterPressed\` → \`run-query\` on the list query whose \`where_filters\` reference the input.

Wire events AFTER the components and queries exist (you need their ids). Prefer one \`add_events\` call for all of an app's events.

## Build guidance

- Always \`create_app\` first; thread \`app_id\` / \`version_id\` / \`home_page_id\` into later calls.
- Give each component a \`name\`; bind data by query name: \`{{queries.<name>.data}}\`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Report the \`app_url\` back to the user.
`;

writeFileSync(resolve(root, 'skill/SKILL.md'), skill);
console.log(`Generated skill/SKILL.md — ${componentList.length} components, grid ${grid.columns} cols / ${grid.rowSnapPx}px snap.`);
