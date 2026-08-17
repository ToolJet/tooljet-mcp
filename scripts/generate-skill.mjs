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
- \`get_component_catalog()\` → placeable component types + key props.
- \`add_query({ version_id, datasource_id, name, options })\` → \`{ query_id, name }\`.
- \`add_component({ app_id, version_id, page_id, name, type, properties, layout })\` → \`{ component_id }\`. \`name\` is required.
- \`get_app(app_id)\` → current app structure.

## App model & binding syntax

- app → version → page → component. \`create_app\` gives one app + version + a "Home" page.
- A component has **properties**; each property value is \`{ "value": <val> }\`. Values starting with \`{{ … }}\` are **bindings** evaluated at runtime.
- A query exposes its result as \`queries.<queryName>.data\`. Bind a component property to it, e.g. a Table's \`data.value = "{{queries.<queryName>.data}}"\`.

## Component selection — ALWAYS prefer built-in components over HTML

ToolJet's value is **visually-editable, governed low-code config**. Built-in components can be edited in ToolJet's visual builder by anyone; a raw \`HTML\`/\`Text\` component with hand-written markup **cannot** — it becomes an opaque blob the user can't tweak without code. So:

- **Map every piece of your design to a built-in component first.** A KPI/metric tile → \`Statistics\` (not an HTML card). A chart or bar/graph → \`Chart\` (not HTML/SVG). A data grid → \`Table\`. Labels/headings → \`Text\`. Inputs → \`TextInput\`/\`NumberInput\`/\`DropdownV2\`/etc. Forms → \`Form\`. Progress → \`CircularProgressbar\`.
- Use \`HTML\` (or \`Text\` with HTML) **only as a last resort** — when ToolJet genuinely has no built-in component for what you need. Do not build tiles, charts, tables, or layouts out of HTML when a built-in exists.
- The full built-in palette (with purposes) is below — check it before reaching for HTML.

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
- Left-align a column of components at the same \`left\`; span the full width with \`width: ${grid.columns}\` when appropriate.

## Component binding reference (${componentList.length} components)

Authoritative rules for binding each component correctly (what must be set, or it renders nothing / wrong). Choose whichever components best fit the app you're building.

${componentSection}

## Datasource query reference

### ToolJet DB (\`kind: "tooljetdb"\`)
- Resolve the table id with \`list_tables()\` — the query references the table by **\`table_id\`** (the id), NOT the name.
- List all rows: \`options = { "operation": "list_rows", "table_id": "<table id>", "list_rows": {}, "runOnPageLoad": true }\`.
- \`runOnPageLoad: true\` runs the query when the app opens so bound components populate automatically.
- \`list_rows\` may carry \`limit\`, \`offset\`, \`where_filters\`, \`order_filters\` for filtering/sorting.

(Other datasources — postgresql, mongodb, servicenow, etc. — have their own query schemas; ask for the specific one when needed.)

## Build guidance

- Always \`create_app\` first; thread \`app_id\` / \`version_id\` / \`home_page_id\` into later calls.
- Give each component a \`name\`; bind data by query name: \`{{queries.<name>.data}}\`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Report the \`app_url\` back to the user.
`;

writeFileSync(resolve(root, 'skill/SKILL.md'), skill);
console.log(`Generated skill/SKILL.md — ${componentList.length} components, grid ${grid.columns} cols / ${grid.rowSnapPx}px snap.`);
