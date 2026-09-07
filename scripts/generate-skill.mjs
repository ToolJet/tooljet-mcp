// Generates skill/SKILL.md from the TJ-AI agent's authoritative knowledge (component
// binding rules) + ToolJet's canvas grid constants. It also carries adaptable quality
// defaults; explicit user requirements always win. Re-run when source rules change to avoid drift.
//
// Usage: node scripts/generate-skill.mjs
//   env: TJAI_ROOT (default ~/Claude/Projects/TJ-AI)
//        TOOLJET_ROOT (default ~/Claude/Projects/ToolJet/ToolJet)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* Both checkouts are read at generate time, and their directory names vary by machine (the agent repo
   is cloned as tooljet-agent or TJ-AI; ToolJet is sometimes nested one level down). Probe the known
   layouts and fail with the env var to set, rather than a raw ENOENT stack a hundred lines deep: an
   unrunnable generator means the packaged skill silently drifts from its source, which is exactly how
   the browser-audit script went stale. */
function locate(envVar, label, candidates, marker) {
  const fromEnv = process.env[envVar];
  if (fromEnv) return resolve(fromEnv);
  const found = candidates.map((c) => resolve(root, ...c)).find((dir) => existsSync(resolve(dir, marker)));
  if (found) return found;
  throw new Error(
    `generate-skill: could not find the ${label} checkout (looked for ${marker} in ` +
      `${candidates.map((c) => resolve(root, ...c)).join(', ')}). Set ${envVar} to its path.`
  );
}

const TJAI = locate('TJAI_ROOT', 'agent', [['..', 'tooljet-agent'], ['..', 'TJ-AI']], 'src/tooljet_agent');
const TOOLJET = locate(
  'TOOLJET_ROOT',
  'ToolJet',
  [['..', 'ToolJet', 'ToolJet'], ['..', 'ToolJet']],
  'frontend/src/AppBuilder'
);
const { legacyReplacements: LEGACY_REPLACEMENTS } = JSON.parse(
  readFileSync(resolve(root, 'data/component-compatibility.json'), 'utf8')
);

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
  return {
    columns: num('NO_OF_GRIDS') ?? 43,
    rowSnapPx: num('GRID_HEIGHT') ?? 10,
    topAlignmentHeightIncrement: num('TOP_ALIGNMENT_HEIGHT_INCREMENT') ?? 20,
  };
}

// --- 2b. Harvest the built-in component catalog from ToolJet widget defs ---
// Capture the callable `component` TYPE (what add_component wants) alongside the display name +
// purpose — the palette must show the type, not the display name (they differ: name 'Dropdown'
// -> type 'DropdownV2'), or the agent calls add_component with an identifier ToolJet rejects.
function readWidgetCatalog() {
  const dir = resolve(TOOLJET, 'frontend/src/AppBuilder/WidgetManager/widgets');
  const files = readdirSync(dir).filter((f) => /\.(js|ts)$/.test(f) && f !== 'index.js');
  const items = [];
  for (const f of files) {
    const txt = readFileSync(resolve(dir, f), 'utf8');
    const name = txt.match(/\bname:\s*'([^']+)'/)?.[1];
    const desc = txt.match(/\bdescription:\s*'([^']+)'/)?.[1];
    const type = txt.match(/\bcomponent:\s*'([^']+)'/)?.[1] || name;
    if (name && desc && !LEGACY_REPLACEMENTS[type]) items.push({ type, name, description: desc });
  }
  // de-dupe by type, sort by type
  const seen = new Set();
  return items
    .filter((i) => (seen.has(i.type) ? false : seen.add(i.type)))
    .sort((a, b) => a.type.localeCompare(b.type));
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
const referenceComponentList = componentList.filter((name) => {
  const replacement = LEGACY_REPLACEMENTS[name];
  return !replacement || !rules[replacement];
});

const catalogSection = catalog
  .map((c) => `| \`${c.type}\` | ${c.name} — ${c.description} |`)
  .join('\n');

const componentRuleSections = referenceComponentList
  .map((name) => {
    let rule = deAgent(rules[name]);
    const publishedName = LEGACY_REPLACEMENTS[name] ?? name;
    if (name === 'Table') {
      // Verified in TableContainer/TableExposedVariables: the exposed pageIndex is 1-based and
      // setPage converts it to the internal zero-based index.
      rule = rule.replace(
        'pageIndex is 0-based: SQL offset = pageIndex * pageSize.',
        'pageIndex is 1-based and can be undefined on the first evaluation: offset pagination uses ((pageIndex || 1) - 1) * pageSize.'
      );
    }
    if (name === 'Form') {
      rule += ' For generated forms, read direct submitted values from `{{components.formName.formData}}`; `.data` remains the detailed child-state object. Supported schema field types are textinput, textarea, dropdown, multiselect, number, emailinput, password, datepicker, checkbox, radio, toggle, starrating, and filepicker—but only textinput/number/emailinput/password/datepicker/checkbox are layout-safe in generated Form. If any other type is needed, build the whole form from standalone components. Filepicker also crashes the Form. Dropdown/multiselect fields use values + displayValues, not options. There is no required flag; use validation.minLength or validation.customRule.';
    }
    if (name === 'DatePickerV2') {
      rule += ' For an empty/create field, set `defaultValue="{{null}}"`; leaving it untouched renders ToolJet\'s 01/01/2022 demo date.';
    }
    if (name === 'KeyValuePair') {
      rule += ' An explicit `fields` array does not suppress undeclared keys from `data`: project the binding to a new object containing only the intended field keys. Object spreads are not a safe projection. For date/timestamp values, use `fieldType:"datepicker"` with explicit Moment-style `dateFormat` and `parseDateFormat` matching the source instead of displaying a raw ISO string.';
    }
    return { sourceName: name, publishedName, markdown: `### ${publishedName}\n${rule}` };
  });

const componentSection = componentRuleSections.map((section) => section.markdown).join('\n\n');

const fullSkill = `---
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

Facts you need to build ToolJet apps through the \`tooljet-mcp\` tools — component binding rules, canvas mechanics, query schemas, and adaptable quality defaults. User requirements and the app's real job take precedence over those defaults; you still own the final layout and design decisions.

Every tool call goes through ToolJet's governed API (your session + permissions). ToolJet apps are configuration over a fixed component library, not code.

## Be honest about what's buildable — don't say yes to everything

Build only what these MCP tools and ToolJet's **real** components/features actually support. If a request — or any part of it — can't be done with the standard tools (a component or property that doesn't exist, an interaction ToolJet doesn't support, **a datasource or third-party integration that isn't connected — you cannot connect a new one from here**, anything outside this tool surface), **tell the user plainly**: name what isn't supported and why, and offer the nearest supported alternative or a manual step in the visual builder. (For an unconnected source like Strava/Stripe/a new API: offer to have the user connect it first, or build against a **seeded placeholder table**, clearly labelled — details in the reference. Never handle credentials yourself.) **Never fake it** — don't invent components/properties/actions, don't silently drop a requested feature and present the app as finished, and don't claim something works when you haven't verified it (use \`run_query\` / \`validate_app\` / the browser pass to actually check). Delivering the supported parts and clearly listing what you couldn't do — and why — is the honest, useful outcome; a broken or imaginary feature presented as working is not.

## The tools

- \`get_datasource_query_schema({ datasource_id, version_id, operation?, sections? })\` → exact compact request contract plus a response shape and \`status\` when known. A response marked \`runtime-dependent\` or \`unknown\` still requires a safe successful run or the remote schema before binding nested fields. Prefer datasource id so the kind is resolved for you; use \`requests:[...]\` to fetch up to 10 needed contracts in one batch. With no selector it returns the palette. **Never infer a ToolJet wrapper from the upstream vendor API.**
- \`inspect_datasource_schema({ version_id, datasource_id, method?, ..., requests? })\` → invoke advertised read-only plugin metadata methods (for example listSchemas/listTables/listColumns). Once table names are known, batch up to 20 independent column lookups with \`requests\`; every method is validated before any invocation. Discover methods with schema \`sections:["introspection"]\`.
- \`prepare_sql_discovery_queries(...)\` → produce, without creating or running anything, \`add_queries\`-compatible read-only count, explicit-column bounded preview/distinct, and curated primary-key/foreign-key/index/view query specs. It never emits \`SELECT *\`; add the returned specs once, then run only selected reads through \`run_query\` and its billable/large-read gates. An \`unsupported\` entry is a real plugin/dialect boundary—do not replace it with guessed SQL.
- \`get_component_catalog({ type?, types?, sections?, property_keys?, style_keys? })\` returns exact component contracts. Fetch the distinct **complex, interactive, or unfamiliar** types needed for the current page/phase in one \`types\` batch, request only the relevant sections/keys, and reuse that result for the build. Request \`authoringHints\` for nested contracts such as Table columns/actions, Kanban card children, and Form JSON-schema field types. Always fetch the contract before wiring events/actions or when an exact property is uncertain; skip redundant lookups for familiar simple components rather than guessing.
- ToolJet DB schema tools preserve constraints, defaults, configurations, and foreign keys: \`get_table_schema(table_name)\`; \`create_tables({ tables:[...] })\` (one or more tables); \`add_table_column(...)\`. \`drop_table_column\`, \`drop_table\`, and \`delete_page\` are destructive and require explicit user approval plus \`confirm:true\`.
- \`generate_form_schema({ table_name, mode, initial_values_binding?, include?, field_overrides? })\` → a ready-to-place Form \`properties\` block only for the layout-safe generated types: \`textinput\`, \`number\`, \`emailinput\`, \`password\`, \`datepicker\`, and \`checkbox\`. It rejects schemas needing Dropdown/Multiselect/TextArea/Radio/Toggle/StarRating/FilePicker and tells you to build the entire form from standalone components.

- \`list_workspaces()\` → \`[{ id, name, slug, is_default, is_current, datasources_url }]\`. The workspaces (organizations) this user belongs to; \`datasources_url\` is the manual connection-repair page.
- \`use_workspace(workspace_id)\` → switch the ACTIVE workspace for all later calls (apps/tables/datasources are scoped to it). Returns the now-active \`{ id, name, slug, datasources_url }\`.
- \`create_app(name)\` → \`{ app_id, version_id, home_page_id, editor_url, viewer_url, app_url, datasources_url }\`. \`app_url\` is a backward-compatible alias for \`editor_url\`. Call first and keep the ids. Share \`editor_url\` so the user can follow authoring live. If a built-in browser is available, wait until the first meaningful page works, then open \`viewer_url\` and reuse that tab at page-level checkpoints. When no browser is available, share both links rather than calling the editor URL a viewer.
- \`get_app_settings({app_id,version_id})\` reads the compact canvas/theme/header/navigation settings for the current editing version. Use \`list_app_themes()\` before selecting a theme, then \`update_app_settings(...)\` to patch only requested fields. The update uses one version write and reads back every requested field; it returns an error if anything did not persist.
- **Keep the app-chrome controls separate:** \`update_app_settings.hide_header\` controls the app header/banner. The generated page-navigation menu is a different element that \`navigation_position\` can place on the side or top; \`update_app_settings.navigation_hidden\` hides that entire menu in either position. \`update_pages.hidden\` controls one non-Home page inside the menu. Home can be renamed, restyled, or reordered, but never hidden. Verify the named setting itself—one neighbouring element disappearing is not proof that the requested element changed.
- \`list_datasources(version_id)\` → \`[{ id, name, kind, settings_url }]\`. Workspace-connected sources available to the current user/environment appear automatically in existing and brand-new apps—there is **no per-app datasource attach/link step**. Use a returned \`id\` directly; if an expected source is absent, use the workspace \`datasources_url\`; if a known source fails, use its direct \`settings_url\`. ToolJet DB is \`kind: "tooljetdb"\`.
- \`list_tables()\` → \`[{ id, table_name }]\`. A ToolJet-DB query needs the table's **id** as \`table_id\`.
- \`get_table_schema(table_name)\` → columns with types, primary/not-null/unique constraints, defaults, configurations, and foreign-key relationships.
- \`create_tables({ tables:[...] })\` → create a complete ToolJet-DB model in one call. It preflights the whole batch and creates foreign-key dependencies in order; ToolJet has no atomic multi-table endpoint, so an upstream partial failure is reported and never auto-deleted.
- \`insert_rows_batch({ tables:[{table_name,rows}] })\` → insert-only seed writes in listed parent-before-child order. Omit generated serial primary keys so ToolJet uses the real sequence; explicit duplicate keys fail instead of updating existing rows. Keep the first build representative rather than exhaustive: usually 5–8 primary records and 2–3 examples per important state are enough unless density/pagination is itself under test.
- \`get_component_catalog()\` → the lightweight component palette. Typed/batched selective calls are described above.
- \`add_queries({ version_id, queries: [...] })\` → \`[{ query_id, name }]\`. **Create ALL an app's queries in one call.**
- \`run_query({ query_id, version_id, count_query_id?, user_confirmed_large_read?, user_confirmed_billable_read? })\` → \`{ status, data, preflight?, warnings?, ... }\`. Run only an explicitly selected safe, non-mutating read to inspect real rows. It refuses \`SELECT *\`; a row read without a static limit of at most 1,000 requires a same-table count query first. If that count exceeds 1,000, the target stays blocked until the user explicitly approves and you retry with \`user_confirmed_large_read:true\`. BigQuery, Snowflake, and Redshift reads also require separate explicit approval via \`user_confirmed_billable_read:true\`, even when bounded. Never infer either approval. Check \`status\` ("ok"/"failed") — HTTP is 200 even on failure. A \`components.*\` warning means the static datasource path passed but live pagination/filter values still require the viewer.
- \`run_queries({ query_ids, version_id })\` executes up to ten **proven bounded read-only** ToolJet DB/SQL reads concurrently after preflighting the whole batch. Use it when two or more independent safe reads need real response shapes; it refuses \`SELECT *\`, unbounded reads, mutations, RunJS, paid/remote APIs, and unknown kinds before executing anything. Use singular \`run_query\` for the count-first flow.
- \`add_components({ app_id, version_id, page_id, components: [...] })\` → \`{ components: [{ component_id, name }], warnings }\`. **Place ALL of a page's components in one call.** For a modal/container plus children, assign the parent a unique \`client_ref\` and each child the matching \`parent_ref\`; MCP resolves real IDs atomically and lints overlaps within the correct parent. Use child \`slot_name:"header" | "body" | "footer"\` for ModalV2/Form/Container native regions (body is the default). A Kanban with no explicit child gets its catalog card children automatically; an explicit child targeting its \`client_ref\` suppresses those defaults.
- \`add_component_batches({ app_id, version_id, pages:[{page_id,components}] })\` → preflight and create complete batches for **2–20 independent pages concurrently**. Prefer it over serial \`add_components\` calls once all target page ids and bindings exist. Each page is atomic; ToolJet has no cross-page transaction, so an upstream partial failure reports completed/failed pages for in-place repair.
- Both return a **\`warnings\`** array of non-blocking lint hints — an undersized Text heading, a Chart left with its clipping default title, a Table bound without \`dataSourceSelector:"rawJson"\`, overlapping components, an invalid \`headerCasing\`, etc. **Read them and fix**; they don't block the write. Known style keys accidentally placed under \`properties\` are moved to \`styles\` automatically and reported as a warning.
- \`add_events({ app_id, version_id, events: [...] })\` → wire component behavior plus query/page lifecycle events. Each event uses \`source_id\`, \`source_type: "component" | "data_query" | "page" | "table_column"\`, \`trigger\`, and \`action\` (\`component_id\` remains shorthand for components). Table Button-column events also require \`ref: "<column key or name>::<button id>"\`.
- \`add_query_lifecycles({ app_id, version_id, lifecycles:[...] })\` → expand many mutation success/failure flows into ordinary validated events in one write: refresh queries, clear standalone inputs, close a modal, show alerts, and optional extra actions. It is datasource-neutral; use \`add_events\` when custom action ordering is required.
- \`lint_app_spec({ app_id?, version_id?, app_name?, tables?, seed_data?, queries?, pages?, events?, lifecycles? })\` → dry-run one exact phase before writes. Put the requested product title in \`app_name\`; the apply step renames the created app and reuses/renames its sole empty Home page for the first planned page instead of adding a duplicate. Pass \`app_id\` for every repair or continuation phase so persisted page/component/query refs are validated and can be targeted without redeclaring or recreating them. Give new planned objects stable \`client_ref\` values; events use \`source_ref\`, targeted actions use \`target_ref\`, and ToolJet DB queries may use \`table_ref\` instead of a not-yet-created table id. Treat this as an **awaited preflight barrier**: call it by itself, inspect its result, fix every error and review warnings. A clean result includes a one-time 30-minute \`plan_token\`; never run this linter in parallel with a mutating call.
- \`apply_app_phase({ app_id, version_id, plan_token })\` → consume that exact plan once. MCP creates dependency stages internally, waits briefly for newly created ToolJet DB table schemas before seed inserts, batches independent pages concurrently, resolves all logical refs, combines ordinary events + lifecycles into one write, and returns final static validation. It never runs queries. ToolJet has no cross-resource transaction, so a rare partial failure reports exactly what persisted and never auto-deletes it; lint again before an in-place repair.

**Plan/apply for a new phase; update tools for persisted objects.** Plan first, await \`lint_app_spec\` as a standalone barrier, inspect the result, then pass its token to one \`apply_app_phase\` call. Do not retransmit or manually replay a clean plan through separate authoring tools. Batch create tools accept one item for a targeted addition; use \`add_component_batches\` for several pages and \`update_*\` for incremental repairs. A page's component diff and the combined event diff each use one upstream write. Page, query, table, and seed batches use multiple upstream requests and can partially persist; their errors report exactly what completed. Cross-resource phase application is likewise non-atomic and never auto-deletes persisted work.

### Large-data read safety

- Inspect the table/schema first and request only the columns the app needs. Never author or execute \`SELECT *\` against an unfamiliar table; \`run_query\` refuses it even when a limit is present.
- When row count is unknown, create a cheap same-source \`COUNT(*)\` (or ToolJet DB count aggregate) query before running an unbounded row query. Pass its id as \`count_query_id\`; MCP runs the count first and does not execute the target on a failed, ambiguous, or mismatched count.
- Treat more than 1,000 rows—or a remote/growing table likely to cross that size—as server-side-pagination territory. Prefer a bounded preview plus page/count queries instead of loading the full dataset into the app or agent context.
- If a full read above the threshold is genuinely required, tell the user the observed row count and why pagination is not sufficient, then ask explicitly. Set \`user_confirmed_large_read:true\` only after that answer; general permission to build or inspect an app is not consent for a large read.
- For BigQuery, Snowflake, or Redshift, separately explain that even a bounded verification read can incur cost and ask before setting \`user_confirmed_billable_read:true\`. Large-read approval does not imply billable-read approval, or vice versa.

### Reuse existing components deliberately

- If an existing component on the page already serves the requested job, **update it in place**; do not add a duplicate.
- For a repeated visual pattern, use \`get_component\` when you need a known source component's complete config, or a filtered \`get_app_summary\` when you need only selected \`type\` / \`properties\` / \`styles\` / \`layouts\`. Treat it as a **template** for a new \`add_components\` entry. Give the new component a unique name and explicitly set its target page, layout, data/action bindings, parent, and events.
- Clone the full configuration only when meaning and behavior are intentionally identical. Never copy a component id, event row, parent/page-local reference, or stale query/component binding blindly. Validate and browser-check the copy; consistency is useful, hidden coupling is not.

### Inspect & edit in place — fix mistakes, NEVER rebuild the app
- \`get_app_summary({ app_id, ...filters })\` → selective actual app values. It defaults to bounded \`detail:"structure"\`; filter by page/component/query/event and request exact dotted fields such as \`properties.data.value\`. Use \`detail:"full"\` only after narrowing the target. **Do not pull every value from a multi-page app for routine inspection** (\`get_app\` is much larger; avoid it).
- \`get_component(app_id, component_id)\` → one component's values + its \`page_id\`.
- \`update_components({ app_id, version_id, page_id, updates:[{ component_id, definition:{properties?,styles?,...} }] })\` → edit in place. Send only CHANGED leaves (deep-merged); arrays like Table \`columns\` / dropdown \`options\` are REPLACED. Rename/reparent via \`name\`/\`parent\`/\`slot_name\` (separate from \`definition\`); \`slot_name\` alone keeps the current parent.
- \`delete_components({ app_id, version_id, page_id, component_ids:[...], confirm:true })\` permanently removes only dependency-free components after exact-target approval; otherwise update in place. \`update_layout({ ..., layouts:[{ component_id, desktop?, mobile?, parent?, slot_name? }] })\` moves/resizes/reparents.
- \`update_query({ query_id, version_id, app_id?, datasource_id?, options })\` (options REPLACE wholesale; optional datasource repoint is contract-validated and rollback-aware) · \`delete_query({ app_id, query_id, version_id, confirm:true })\` permanently removes only a query with no component/event references after exact-target approval.
- \`update_pages({ app_id, version_id, updates?, order? })\` → rename, restyle, or reorder any existing page, and toggle \`hidden\` only for a non-Home page. Home itself cannot be hidden. \`hidden\` affects that one page, not the entire menu; use \`update_app_settings.navigation_hidden\` for the whole menu. \`order\` must be the complete ordered list of current page ids; use \`get_app_summary\` to fetch ids/indexes first. The write is read back and verified.
- \`delete_page({ app_id, version_id, page_id, confirm:true })\` → permanently delete one non-Home, non-group page after exact-target approval. It refuses pages with external event targets or components referenced from elsewhere. Page-group deletion is intentionally disabled until the complete child deletion set can be preflighted and verified.
- \`list_events({ app_id, version_id, source_id? })\` · \`update_events({ ..., events:[{ event_id, name, event }] })\` · \`delete_event({ app_id, version_id, event_id })\`.
- \`validate_app(app_id)\` → static \`{ ok, checked, not_checked, errors, warnings }\`. It validates persisted references, component/event compatibility, and query option contracts **without executing queries**. A clean result does not prove external APIs, mutations, browser event delivery, or rendering work.

**A single wrong value is a one-call fix, not a rebuild.** When something is off, \`get_app_summary\` → \`update_*\`/\`delete_*\` the offending item. Do NOT create a new app or pile on duplicate components to "correct" a mistake.
- \`get_app(app_id)\` → the FULL raw app (large; prefer \`get_app_summary\`).
- \`add_pages({ app_id, version_id, pages:[{name,icon,hidden?}] })\` → add the initial page set in one call, preserving order and verifying sidebar icon/hidden metadata. Pass returned page ids to \`add_components\`.
- \`update_pages({ app_id, version_id, updates?, order? })\` → retouch or reorder existing pages without rebuilding them. This is how to give Home a relevant icon/name and place it correctly after the initial page set exists; Home cannot be hidden.

## Workspace — confirm which one first

A ToolJet user can belong to **multiple workspaces**, and every app/table/datasource is scoped to the **active** one. At the start of a session, call \`list_workspaces\`. If there's **more than one**, ask the user which to use and \`use_workspace(id)\` **before creating anything** — building in the wrong workspace means redoing it. If there's only one (or a default is already active, \`is_current: true\`), just proceed. The user can ask to switch at any time (\`use_workspace\`); a fixed default can also be pinned via the \`TOOLJET_WORKSPACE_ID\` env at install.

## Before you build — prefer safe defaults; ask only when it changes what you build

Don't reflexively interrogate the user. For a **common read-only dashboard on an existing table** (a single job), safe defaults exist — just build it: use the table as-is, assume read-only (no writes unless asked), use the Table's **built-in search/sort/filter** rather than external filter widgets, surface the signals that actually matter as \`Statistics\`/\`Chart\` (only what answers a real question — see the design framework), and neutral ToolJet-native styling. Ship it, then refine. (For a **multi-domain** request, first plan the page architecture — see "Plan the app" — then these defaults apply *per page*.)

**Ask 1–3 focused questions only when the answer genuinely changes what you build** — a NEW data model (what fields/types), destructive or write operations (edit/delete flows), permissions, a genuinely divergent product choice, or the mandatory large-build execution choice below. Don't block a small read-only dashboard on questions with obvious defaults. If the user already gave a detailed spec, build directly only after any required large-build choice is settled.

## Security boundary — UI behavior is not authorization

- Component visibility/disable rules are UX only. Never present a hidden button, page, or modal as an access-control boundary.
- Use server-side datasource permissions and row-level security for sensitive data. In server-executed queries, prefer \`globals.server.currentUser\` for user-scoped filters; client-side \`globals.currentUser\` can be inspected or changed by the client.
- Server-side current-user variables are not available inside RunJS/RunPy. Do not move an authorization check into client-executed code.
- Ask about roles/ownership before adding destructive or sensitive writes. When the user requests page, query, or component access control, use \`manage_app_permissions\`: call \`list_subjects\`, resolve exact resource ids with \`get_app_summary\`, then use confirmed \`set\` or \`clear\`. Only users/groups that already have app access are eligible, and ToolJet license gates still apply.
- Page permissions restrict page access, query permissions restrict execution, and component permissions restrict access to that component. These persisted permissions are different from visibility/disable expressions. Query permissions do not replace datasource permissions or row-level security; if the required authorization cannot be configured through the available surface, state the exact remaining ToolJet/RLS step instead of claiming the app is secured.
- Never place credentials, tokens, or secrets in component properties, RunJS, query parameters, alerts, or seeded placeholder data.

## SQL parameters — never splice a component value into the statement

A SQL query built from a component value must pass it as a **parameter**, not paste it into the statement text. ToolJet hands \`query_params\` to the driver, which escapes them.

\`\`\`
query:        SELECT ... FROM tickets WHERE priority = :priority
query_params: [["priority", "{{components.priorityFilter.value}}"]]
\`\`\`

Not \`WHERE priority = '{{components.priorityFilter.value}}'\` — that is escaped only by the two quotes you typed. Measured against a real table: with the value \`P1' OR '1'='1\`, the spliced query returned all 15,000 rows with the filter bypassed, while the parameterised query returned 0. A dropdown with fixed options happens to be safe today; the same query becomes exploitable the moment someone points it at a text input, and that edit will not look dangerous to whoever makes it.

- Every value from a component, a URL parameter, or anything a user can influence goes in \`query_params\` with a \`:name\` placeholder.
- Parameters bind **values**, not identifiers. A table or column name cannot be a parameter, so choose those from a fixed allowlist in the query text rather than from user input.
- An empty component still needs a valid statement. Handle the empty case in SQL (\`WHERE (:priority = '' OR priority = :priority)\`) rather than by removing the placeholder.
- Constants you wrote yourself are not the concern. This is about values you do not control.

## Plan the app — information architecture BEFORE any component

Decide the **page structure first.** This is the single biggest difference between a focused app and one crowded, slow-to-read page. Do this before creating anything.

1. **List the distinct user jobs the request implies.** "A personal hub with agenda, workouts, finances, and notes" is **four jobs**, not one screen. A CRM is "browse contacts / see a contact / log an activity". Each substantial job — its own data and its own workflow — is a candidate for its **own focused page**.
2. **Words like "homepage", "dashboard", "portal", "hub", "app" name a PRODUCT, not a single page.** Don't take them literally as one page. A multi-domain request almost always means **one overview page + one focused page per major job** — never every feature stacked on one long scroll.
3. **Design the page set:**
   - an **Overview / Home page** — at-a-glance summaries (a few KPI tiles + the single most important item from each domain) and **navigation into** the focused pages. It orients the user; it does NOT contain every domain's full table and form.
   - a **focused page per substantial workflow** — each does ONE job thoroughly (its list, its detail, its create/edit) with one obvious primary action.
   - a **genuinely simple, single-job app → a single page.** Don't fragment something that is truly one job.
4. **Map every capability to exactly ONE page.** If two unrelated capabilities are landing on the same page, that's the signal to split. Nothing unrelated piles onto the overview.
5. Give each page a clear one-line job and a relevant \`icon\`, then design each page (see Design below).

**State the page plan to the user first** — one line per page (\`Home · overview\` / \`Workouts · log + history\` / …). It's cheap, and it prevents the crowded-single-page failure before it happens.

## Build in phases — page architecture and phasing are SEPARATE decisions

Plan the whole page architecture up front (above). A phase is an *order-of-work* decision, not an architecture decision — **"phase 2" is the next capability built on the page where it belongs, NOT more stuff appended to the Home/overview page.**

- Treat scope as **large** when it implies 3+ substantive pages, 2+ independent complex workflows, a new multi-table model with several UI flows, or multiple datasource/integration surfaces.
- **For a large build, get the user's execution choice before any mutating build call.** State the page/phase plan and ask them to choose: **(1) phased checkpoints (recommended)** — deliver the highest-value complete journey first, then pause at each phase boundary for review; or **(2) whole app in one run** — build every requested phase before handoff, which will be slower and leaves a longer period without feedback. Do not silently choose for them.
- Make that choice **customer-facing and time-informed**. Give a rounded range for **first usable result** in phased mode and **estimated total active build time** for both modes (excluding time waiting for customer feedback), plus a simple confidence level. Estimate from substantive pages/workflows and datasource/schema certainty; widen the range for unknown wrappers or integration/runtime risk. Use ranges rounded to about 5–10 minutes, never fake precision or present the estimate as a promise. If sizing is genuinely uncertain, say \`likely 30+ minutes · low confidence\` instead of inventing a narrow range. Keep the message plain: \`This is a larger build: <scope>. Phased (recommended): first usable part ~X–Y min; estimated total ~A–B min, with review checkpoints. Whole app: estimated ~A–B min before the complete handoff. These are rough estimates and may change if datasource or runtime issues appear.\` Do not mention MCP calls, tokens, or internal implementation details in this customer choice.
- If the prompt already explicitly chooses phased delivery, "whole app", "one go", "build everything", or "do not stop", that is confirmation; do not ask again. A detailed feature spec alone is not an execution choice.
- **Deliver small, complete, POLISHED phases fast** — aim to give the user a **useful working loop within a few minutes** (view → act → feedback on one real page), not a broad skeleton. Polish is **not** a later phase; apply the design framework + async states to every phase as you go.
- **Complete journeys over skeletons.** Build ONE page's full loop (data + UI + interactivity + async states + polish) before starting the next. Never stub out several empty pages or scatter disconnected placeholders.
- **Phase 1 = the highest-value single job, fully working** on its own focused page (plus a minimal Home if the app is multi-domain). Each later phase = the next job's page, complete end-to-end.
- **Verify each completed page/primary flow with the page-level QA loop below** — not every tiny edit and not only once at the very end.
- **Keep recon separate from delivery.** Log MCP/skill gaps while building, but do not stop an app-generation phase to edit, test, commit, or push the MCP repository unless the user explicitly prioritizes tooling work over delivery. Finish the useful app checkpoint first, then batch the recon fixes.
- In phased-checkpoint mode, after each phase say what now works, name the next phase, and wait for the user to continue. In whole-app mode, report phase checkpoints as progress but continue without waiting. When the planned scope is done, proactively suggest **2–3 concrete, high-value things the app could grow into next**, grounded in its real data/domain. For a genuinely small app, skip this execution-choice prompt and build directly.

## App model & binding syntax

- app → version → page → component. \`create_app\` gives one app + version + a "Home" page. Add one or more pages with \`add_pages\`; use \`update_pages\` to retouch existing pages. ToolJet auto-renders navigation between pages. **Don't fragment a genuinely simple, single-job app** — one well-laid-out page is best there. **But a multi-domain / multi-job request needs the IA — an overview + a focused page per job, not one long crowded page.**
- **In a multi-page app, give EVERY page a relevant sidebar icon** — pass each \`add_pages\` item a Tabler \`icon\` name (e.g. \`IconLayoutDashboard\`, \`IconUsers\`, \`IconChartBar\`, \`IconListDetails\`, \`IconSettings\`, \`IconReportAnalytics\`). ToolJet gives the auto-created first/Home page an \`IconHome2\` fallback; added pages without an icon fall back to generic \`IconFile\` and make the left sidebar look unfinished.
- **Hide sub-pages that are only reached from another page** — for a page opened ONLY via \`switch-page\` (e.g. a detail/edit page you navigate to from a table row, not a top-level destination), set \`hidden:true\` on its \`add_pages\` item. It stays fully reachable but is removed from the sidebar nav, keeping the menu to real destinations. (An icon is still required — it shows if you later unhide it.)
- A component has **properties**; each property value is \`{ "value": <val> }\`. Values starting with \`{{ … }}\` are **bindings** evaluated at runtime.
- A query exposes its result as \`queries.<queryName>.data\`. Bind a component property to it, e.g. a Table's \`data.value = "{{queries.<queryName>.data}}"\`.

## Component selection — built-in for interactive/data surfaces, HTML where it makes the UI better

ToolJet's value is **visually-editable, governed low-code config**: a built-in component can be edited in the visual builder by anyone. So anything the user will **interact with, bind data to, or edit** should be a built-in — a chart → \`Chart\`, a data grid → \`Table\`, inputs → \`TextInput\`/\`NumberInput\`/\`DropdownV2\`, forms → \`Form\`, progress → \`CircularProgressBar\`. Don't rebuild those in HTML — you'd throw away the visual editing and governance that are the whole point. KPI tiles and read-only detail groups are the exception: they only display data, so they follow the \`Html\` patterns in Visual defaults below; \`Statistics\` and \`KeyValuePair\` remain the choice when a value must be exposed to other components or edited visually.

**But HTML is a first-class tool where it genuinely makes the app better — use it deliberately, not only as a last resort:**
- **Presentational / display-only content** — a styled hero or banner, a rich info card, a legend, an empty state, a formatted read-only block — where custom markup gives better aesthetics and more flexible layout than stacking built-ins. If the user won't interact with it or need to edit it, HTML is often the cleaner, better-looking choice.
- **Custom markup inside a component's own properties** — many components take HTML in their content/cell/tooltip properties (a Table column rendered as HTML, a \`Text\` set to HTML, custom cell formatting). Use it to polish the UI in place.
- **Rule of thumb:** built-in when it's **interactive, data-bound, or meant to be tweaked visually**; HTML when it's **static presentation or fine UI customization** and HTML expresses it more cleanly.

The full built-in palette (every \`type\` + purpose) is in **\`references/components.md\`**; pick from built-ins first. Once you've selected the current page's components, batch the complex/unfamiliar types with \`get_component_catalog({ types:[...] })\` (or use \`type\` for one) and request their exact needed sections — including \`renderingHints\` for \`Text\`/\`Chart\`/\`Statistics\`. Configure precisely; don't guess property names.

## Canvas & grid mechanics (FACTS — you must respect these to position components)

ToolJet's canvas is a fixed grid. Components are **absolutely positioned** — they do NOT reflow or auto-stack. If you don't compute positions correctly, components **overlap**.

- The canvas is **${grid.columns} columns** wide. A component's \`left\` and \`width\` are in **columns** (0–${grid.columns}). Full width = \`left: 0, width: ${grid.columns}\`.
- \`top\` and \`height\` are in **pixels**, snapped to a **${grid.rowSnapPx}px** vertical grid. A data table is commonly ~300–500px tall.
- For one rectangle applied to both resolutions, use flat \`layout:{top,left,width,height}\`. For distinct resolution-specific placement, use \`layouts:{desktop:{top,left,width,height},mobile:{top,left,width,height}}\`. Do not put \`desktop\`/\`mobile\` inside \`layout\`; an invalid member rejects the entire atomic \`add_components\` batch.
- **Stack using rendered height:** \`B.top = A.top + A.renderedHeight + gap\` (gap ~10–20px). Most widgets—including Text, Button, Html, Chart, Table, and Statistics—render at the authored \`height\`. ToolJet's top-aligned labelled form-input widgets render at **\`height + ${grid.topAlignmentHeightIncrement}px\`**. Standard single-line inputs use their catalog default **40px** authored height, occupy about **60px** with the top label/validation footprint, and need a **70px** top-to-top row step with a 10px gap. Raising the authored height does not absorb the increment or enlarge the value text.
- A static-height **Text still needs enough internal room for its line box**: minimum single-line height is \`ceil(textSize * lineHeight + 6px)\`, then round up to the 10px grid. The default line-height is 1.5, so 24px text needs 50px authored height and 32px text needs 60px. The outer widget can be the authored height while its glyphs are clipped inside.
- The full canvas is ${grid.columns} columns; how you use that space is a design choice (see Design defaults below) — don't reflexively span edge-to-edge.

## Design — decide before you build, then apply the visual defaults

A good ToolJet app comes from a content-aware decision, not a fixed template. Work in layers: frame the page, apply the house visual defaults, respect the rendering guardrails. If the user states any layout, spacing, density, or brand preference, **the user always wins.**

### 1. Frame the page (before creating any component)
Infer, in one quick pass:
- the **primary user** (who opens this), the **primary object** (what it's about), the page's **single main job**, the **primary action** if any, and the **one signal or decision** that matters most.
- the **page mode** — pick one: **Monitor** (is anything wrong?), **Explore** (find/slice records), **Operate** (act on items), **Inspect** (understand one record), **Edit** (change data), or **Configure** (settings). The mode drives the layout.

Then hold to these:
- **One dominant region and at most one dominant action** per page; everything else is clearly secondary.
- **KPI row before the table, above the fold, on Monitor and Operate pages.** That is the only fixed order. Compose the rest for the job: a snapshot band, charts, a watchlist, a detail or alert panel, wherever it answers a question the table does not. Tiles plus a table is the floor of a page, not its target.
- **Every component answers a distinct user question.** Remove anything that repeats information already communicated adequately.
- **Size regions by importance, information density, and label length** — not reflexive equal widths. The main region gets the space.
- **One primary accent**, taken from the user's branding or the domain; keep other surfaces neutral and reserve semantic colors (green/amber/red) for actual state, not decoration.
- **Human-readable identity first** in tables — lead with the name/title/human field, not the technical id.
- **Headings name the user's decision or context** ("Needs attention today"), not the component type ("Table").
- **Quick internal design critique before building** — one line each: hierarchy (is the main thing biggest?), redundancy (anything duplicated?), density (too cramped or too empty?), responsive order (what should lead on a narrow screen?), visual signature (one accent, not five?). Fix it before you create components.

### 2. Visual defaults (apply unless the user says otherwise)
- **Polish:** it must read as a **designed app, not components dropped on a canvas** — real hierarchy, grouped sections, consistent spacing, aligned edges, no overlaps.
#### Theme and type
- **Theme first:** \`create_app\` already applied the standard "ToolJet Modern" theme (see \`references/themes.md\`), so buttons, inputs, tables, modals, borders and radii are handled. Do not restyle those per component; spend effort on the things the theme cannot see — type scale, cards, charts and status colours below.
- **Type scale (Text component):** page title \`textSize 22\`, \`fontWeight bold\`, height **40**; section heading \`textSize 15–16\` bold, height **30**; body \`textSize 14\`, height **30**; muted labels and subtitles \`textSize 12–13\`, \`textColor "var(--cc-placeholder-text)"\`, height **30**; KPI values \`textSize 28\` bold, height **50**. Leave \`textColor\` unset for primary text so the theme supplies it. Use exactly one muted colour, the theme's \`--cc-placeholder-text\`, for every secondary line; never default black for secondary text and never a literal grey, so a derived theme's warm or cool neutrals reach every label. (Exact keys and the height formula from \`get_component_catalog({type:"Text",sections:["styles","renderingHints"]})\`.)
- **Page header (every page):** title Text (top ≈ 20) + one-line subtitle Text directly under it (top ≈ 60), then ~20px before content. A default-styled Text looks unfinished.
#### Display-only content and KPI tiles
- **Display-only content goes in \`Html\`:** when something only *shows* data and no built-in component fits it well (KPI tiles, a read-only detail group such as a record's fields in a modal or side panel, a header band with a summary, a status legend, a mini timeline, a labelled stat strip, an empty state), use one \`Html\` component with \`properties.rawHtml\` and inline CSS rather than stacking Text components inside a Container. Rules that keep it on-theme: the root element uses \`font-family:inherit\`, \`box-sizing:border-box\`, \`height:100%\` and \`margin:0\`; its background is **the surface it sits on** (\`var(--cc-appBackground-surface)\` on the canvas, \`var(--cc-surface1-surface)\` inside a card or modal) so it never shows as a mismatched rectangle; borders use \`var(--cc-default-border)\` (hairlines and dividers \`var(--cc-weak-border)\`), cards \`background:var(--cc-surface1-surface); border:1px solid var(--cc-default-border); border-radius:12px\`, a tinted panel or side rail \`background:var(--cc-surface2-surface)\`; text \`var(--cc-primary-text)\`, muted \`var(--cc-placeholder-text)\`, good/bad figures \`var(--cc-success-systemStatus)\` / \`var(--cc-error-systemStatus)\`; never literal greys inside Html, so a derived theme's neutrals flow through every block; accent = the theme accent (\`#2563EB\` on the standard theme; a derived theme names its own in \`references/themes.md\`); no scripts, no external assets, no fixed pixel widths (use flex/grid so it fills the authored width); enable \`dynamicHeight\` only for wrapping prose. Anything the user must **interact with, bind to, or edit in the builder** (inputs, tables, buttons, charts, modals) stays a built-in component.
- **KPI tiles:** one \`Html\` strip across the content width (about 120–140px tall) holding a CSS grid of cards, each with a muted label, a 28px bold value bound from \`{{queries.<q>.data ...}}\`, and a one-line context. The strip is a rule, not a fixed template: the number of cards (three to six) and the column proportions follow the figures that matter for this user, not a default of four equal columns. The figure the page exists for may lead: a wider column, or an inverted card filled with \`var(--cc-primary-brand)\` and light text, when the request signals a customer-facing or premium product; equal, quiet cards when it is a plain staff tool. Use the theme's error colour on a value only when the number itself is a problem (overdue, failed). Fall back to a \`Container\` with Text children (\`showHeader:"{{false}}"\`, surface1 background, default border, radius 12) only when a tile must expose a value to other components, and use \`Statistics\` only when a tile can be 18+ columns wide.
#### Charts
- **Charts:** \`properties.title ""\` with a section-heading Text above; \`markerColor\` = the theme accent (\`#2563EB\` on the standard theme; a derived theme's accent comes from its archetype row in \`references/themes.md\`, never the standard blue on a charcoal, rose or brown theme); \`styles.backgroundColor "var(--cc-surface1-surface)"\`, \`borderColor "var(--cc-default-border)"\`, \`borderRadius 12\`; two charts per row at 19 columns each (lefts 2 and 22), height ≈ 290. Native \`type: "line"\` and \`"bar"\` with \`data: [{x, y}]\` and \`showGridLines true\` are good as-is. Every other common chart needs \`plotFromJson: "{{true}}"\` with a \`jsonDescription\` expression returning \`{ data, layout }\`, because the native pie uses Plotly's rainbow palette with no legend. Shared layout for all of them: \`margin {l:36, r:12, t:8, b:40}\`, \`paper_bgcolor\` and \`plot_bgcolor\` \`'rgba(0,0,0,0)'\`, \`font {size:12, color:<muted>}\`, axes \`gridcolor <weak border>\`, \`zeroline false\` (Plotly cannot read CSS variables, so these two are the theme's literal muted-text and weak-border hex: \`#6B7280\` and \`#F3F4F6\` on the standard theme, the derived neutral set otherwise), and \`showlegend: true\` whenever a legend is wanted (the wrapper hides it otherwise). Series palette, in order: the accent, the accent at 65% and 40% opacity (\`rgba(r,g,b,0.65)\`, \`rgba(r,g,b,0.4)\`), a darker shade of the accent for a fourth series, then the theme's muted text colour for done/neutral and its default border colour for rejected/empty. On the standard theme that is \`#2563EB, rgba(37,99,235,0.65), rgba(37,99,235,0.4), #1D4ED8, #9CA3AF, #E5E7EB\`; on the hospitality row it starts from bronze \`#B45309\`.
  - **Donut:** one \`type:'pie'\` trace, \`hole 0.55\`, \`marker.colors\` from the palette, \`textinfo 'percent'\`, \`textposition 'inside'\`, \`insidetextorientation 'horizontal'\`, white 12px inside text, \`sort false\`; \`layout.showlegend true\` with \`legend {orientation:'v', x:1, y:0.5}\`, margins 8.
  - **Stacked bar:** one \`type:'bar'\` trace per series with \`marker.color\`; set the **component property** \`barmode: "stack"\` (it overrides \`layout.barmode\`); legend on top so it never falls below the margin: \`layout.margin.t 32\`, \`legend {orientation:'h', x:1, xanchor:'right', y:1.14, yanchor:'bottom'}\`.
  - **Horizontal bar (rankings):** \`type:'bar'\`, \`orientation:'h'\`, top N sorted descending, \`layout.margin.l\` ≈ 130 for names, \`yaxis {autorange:'reversed'}\`, \`xaxis.dtick 1\` for small counts.
  - **Area / cumulative:** \`type:'scatter'\`, \`mode:'lines'\`, \`fill:'tozeroy'\`, \`line {color:<accent>, width:2, shape:'hv'}\` for step counts, \`fillcolor\` the accent at 10% opacity (\`rgba(37,99,235,0.10)\` on the standard theme), \`xaxis.tickformat '%d %b'\`, \`yaxis.rangemode 'tozero'\`.
  - **Categorical axes:** at most **8 groups**; bucket the long tail into an \"Other\" bar (top 7 + Other) and plot codes or short labels, never free-text reasons. Bar and line fills use the theme **accent**, not the primary (the primary is for buttons and links); reserve red for a series that is itself a problem (cancelled, failed).
  - Keep the JS that shapes the series flat and guarded (\`queries.q.data || []\`); the linter cannot evaluate \`jsonDescription\`, so browser-verify each Plotly chart once.
#### Tables, buttons and filters
- **Status colour in tables:** put conditional \`textColor\` on priority/status/state columns using the theme tokens — success \`"var(--cc-success-systemStatus)"\`, error \`"var(--cc-error-systemStatus)"\`, warning = the theme's warning colour as literal hex (\`#D97706\` on the standard theme; it has no token), informational = the theme accent (\`#2563EB\` on the standard theme), quiet \`"var(--cc-placeholder-text)"\` — and nowhere else. Backgrounds stay white; do not tint rows or cells.
- **Secondary buttons** (Cancel, Clear, Reset): \`styles.backgroundColor "var(--cc-surface1-surface)"\`, \`textColor "var(--cc-primary-text)"\`, \`borderColor "var(--cc-default-border)"\`. One filled primary button per view; everything else is this outline style.
- **Filters row:** \`DropdownV2\` filters with a real \`label\`, \`styles.alignment "top"\`, \`showClearBtn true\`, 8 columns each, plus a 3-column outline Clear button at the right edge; the Table starts 60px below the filters' top. In the Table's \`data\` expression, reference every filter as \`components.<filter>?.value\` (optional chaining), never \`components.<filter>.value\`: when the user reaches the page through in-app navigation the queries already hold data, so the Table evaluates the instant it mounts, before the filter components exist. An unguarded reference throws, the Table shows "No data", and nothing re-evaluates it until a filter changes or the page is reloaded. The same rule applies to any component reference inside a Listview, Chart or Html binding.
#### Modals and nested views
- **Modals (\`ModalV2\`):** \`useDefaultButton false\`; a bold 16px Text in the \`header\` slot; \`body\` inputs with top-aligned labels at height 62 (they render 82) and a \`TextArea\` at height 100 (renders 120); \`footer\` holds an outline Cancel at left 26 and the filled primary at left 35, width 8, top 4; \`modalHeight\` = last body child's rendered bottom + 180.
- **Kanban cards:** the catalog default title/description children are only 14 columns wide and truncate after a few words. After the phase, widen both to \`left 2, width 39\` (title top 12, description top 44, description \`textSize 12\` in the muted grey) or supply an explicit Html child. Keep \`openModalOnCardClick false\` unless the card modal has been browser-verified.
- **Listview grid cards:** \`mode "grid"\`, \`columns 3\`, \`rowHeight\` = lowest child bottom + 10, \`showBorder false\`, surface1 background with the default border and radius 12; children use the item's own 43-column canvas (name 16 bold at top 14, muted role line at 44, three 28-bold figures at top 80 with muted 12px labels at 130, a \`Tags\` row at 164).
#### Spacing and gutters
- **Canvas padding:** don't run edge-to-edge across all ${grid.columns} columns — keep a consistent side gutter (top-level content ≈ columns **2–${grid.columns - 2}**). Full-bleed only if asked.
- A dense operational or analytical page with several root surfaces should not accidentally stop around the middle of the desktop canvas. MCP warns when four or more root components including a Table/Chart/Listview/Kanban occupy only about columns 0–27; expand the main composition toward columns 2–41 unless a narrow rail is deliberate and browser-verified.
- **Consistent spacing:** ONE vertical gap between stacked sections (~16–24px) and ONE shared left edge for all top-level components.
- **Peer components** in a row (KPI tiles, filters) share equal widths, equal gaps and a common top — unless importance or label length justifies otherwise (see framing).

### 3. ToolJet rendering guardrails (these prevent real render bugs)
- **Two adjacent \`}\` inside a \`{{ }}\` binding end it early** (ToolJet matches the first \`}}\`): the component renders blank with no error. Inside a binding, write nested closes as \`} }\` and end an IIFE as \`}; })()}}\`, never \`}})()}}\` or \`}}}\`. This applies to every bound property: Table \`data\`, Chart JSON, Html, visibility, query parameters.
- **Chart titles clip** at common dashboard sizes. **Default: leave \`Chart.title\` empty and put a separate \`Text\` heading above the chart**, with its own heading slot + spacing. Enable a native chart title only after you've visually verified it doesn't clip at that size.
- **Chart widths** (defaults, not hard limits): a compact few-category pie/donut ≈ **13–15 columns**; a categorical bar with longer labels ≈ **20–24 columns**; at most **two** normal analytical charts in one ~39-column content row unless labels are short and readability is verified.
- **Statistics sizing:** a value-only tile with \`hideSecondary:true\` needs at least **12 columns** and ≈ **110–120px** height (at most three per content row), but **12–17 columns is safe only for a short one- or two-word label**; longer labels can wrap vertically and hide the value, so shorten them or use at least 18 columns. A tile with visible secondary content needs at least **18 columns** and ≈ **130–150px** height (normally two per row).
- **Table width:** a Table with more than six visible columns takes the full content width (\`left 2, width 39\`); a narrower table clips columns behind a horizontal scrollbar. Put a side panel below or in a modal instead of beside a wide table.
- **Html panel height:** an \`Html\` block does not grow; size its \`height\` to its content (rows × line height + padding, e.g. a 7-row detail panel needs about 300px) so nothing is clipped behind an inner scrollbar.
- **Table columns:** when presentation matters, set an **explicit, complete \`columns\` array** in the order you want and project the Table's \`data\` expression to new objects containing only visible and behavior-needed keys (for example, \`queries.q.data.map(r => ({id:r.id,name:r.name,status:r.status}))\`). An identity map (\`.map(r => r)\`) or object spread (\`({...r})\`) is **not** a safe projection: undeclared datasource fields can still leak. With \`autogenerateColumns\` enabled, ToolJet appends undeclared datasource fields after your explicit columns, which commonly exposes technical IDs and internal notes. For a behavior-only key such as \`id\`, keep it in \`data\` but declare its column with \`columnVisibility:false\`; this preserves it for \`selectedRow\`/actions and prevents autogeneration from showing it. Do not casually disable autogeneration: some ToolJet Table versions crash while generating column transformations when it is false. Do **not** rely on the property order of a transformed query object to reorder existing columns — it won't. Natural header casing is fine: **\`headerCasing: "none"\` is a valid value**.
- **Table row actions:** use a \`columnType: "button"\` column in the complete \`columns\` array; do not use deprecated \`properties.actions\`. Read \`get_component_catalog({type:"Table",sections:["authoringHints"]})\` for the exact column/button defaults. Wire each button with \`source_type:"table_column"\`, \`trigger:"onClick"\`, and \`ref:"<column key or name>::<button id>"\`. Button property expressions can use \`rowData\`/\`cellValue\`; event actions should read \`components.<table>.selectedRow\` (ToolJet sets it before the handler runs).
- **Operational viewport:** on an **Operate** page with a bounded Table/Listview, avoid adding a page-level scrollbar on top of the pane's own vertical scrolling. Keep the single primary action inside the initial desktop viewport (as a safe authored-canvas default, its bottom should be around **720px or less**) by shortening the header/pane or moving the action above/beside the pane. Long forms and detail pages may deliberately scroll; browser-verify that choice instead of applying this threshold blindly.

### 4. Density — don't overcrowd; split instead
- A page should serve **~one primary job** (plus light supporting context). If you find yourself stacking full tables/forms for multiple **unrelated** domains on one page, STOP and split them into focused pages (see "Plan the app") — crowding is an **architecture** smell, not a layout problem.
- Use **progressive disclosure**: push secondary detail behind a row-click → detail page or modal, and behind tabs/sections — don't lay everything inline at once.
- Keep **one obvious primary action** per page and a clear visual hierarchy; if a user can't tell what this page is *for* in a glance, it's doing too much.
- **The opposite failure is a page that stops halfway.** A grid or list page made of small cards (a room grid, a team roster, a catalogue) can be correct and still read as empty: a filter, a legend and a block of thin cards over a blank lower canvas. Give such a page a summary strip above the grid (an \`Html\` KPI row of the states the cards can be in), put two or three facts on each card rather than one, and size the grid so its last row lands near the bottom of the desktop viewport. If the data is genuinely small, use fewer grid columns and taller cards instead of leaving the canvas empty.
- **But dense is fine when the job genuinely needs it.** A legitimate operational surface (a trading console, an ops monitor, an admin grid) can be information-dense — density is only a problem when it **mixes unrelated jobs** or **buries the primary action**. Judge by "one clear job + one obvious primary action + clean hierarchy", not a hard component count.

### 5. Mobile — skip it by default
Most customers view these on desktop. **Don't build or tune a mobile layout for the initial build unless the user explicitly asks.** When they do, treat mobile as **recomposition** — rethink what leads and what collapses on a narrow screen — not blind vertical stacking of the desktop layout. And note: **resizing a browser window does NOT prove ToolJet's mobile layout rendered** — that is a structural guess, not real mobile visual validation; only claim mobile works if you verified it the way ToolJet actually renders mobile.

## Server-side Tables — datasource-neutral recipe

Use server-side behavior for large/remote datasets; keep client-side behavior for small fully loaded arrays. When cardinality is unknown, run a count-only query first; more than 1,000 rows is the default handoff to server-side pagination (use a lower threshold for wide, sensitive, remote, or fast-growing rows). Do not hardcode one datasource's pagination syntax into the component layer.

1. Batch-fetch only the page/count operation contracts with \`get_datasource_query_schema({requests:[...]})\`. Create a **page query** and a **total-count/metadata query** using that datasource's real options.
2. Configure Table with \`dataSourceSelector="rawJson"\`, \`data\` bound to the page query, \`serverSidePagination=true\`, \`serverSideRowsPerPage\`, and \`totalRecords\` bound to the count query. ToolJet's exposed \`pageIndex\` is **1-based**, but it can be undefined when the first page-load query evaluates. Guard the offset as \`((components.<table>.pageIndex || 1) - 1) * pageSize\`; the unguarded subtraction produces \`NaN\` and an empty Table.
3. Choose exactly one query-wiring mode and never mix them. **Preferred reactive mode:** set \`runOnDependencyChange:true\` on reads whose options reference Table/filter state, keep an initial page-load run, and let search/sort/filter events only reset the Table to page 1. **Explicit-event fallback:** disable dependency-change runs, then wire page/search/sort/filter events to run the necessary page/count queries after resetting page 1. Use the fallback only when a dependency cannot be represented reliably. Immediate ButtonGroupV2 \`onClick\` reads can observe the previous \`selected\` value, so reactive mode is safer for that control.
4. Exact Table shapes are \`searchText: string\`, \`sortApplied: [{column,columnKey,direction}]\`, and \`filters: [{column,condition,value}]\`; request Table \`exposedVariables\` + \`authoringHints\` for the machine-readable contract. An empty \`DaterangePicker\` can become the literal strings \`"undefined"\` or \`"Invalid date"\` in datasource options, so read its authoring hint instead of relying only on \`value || fallback\`.
5. Keep translation at the query boundary: SQL/TJDB use limit+offset and a count query; page-number APIs send page+size; cursor/token APIs store the returned cursor and drive \`enableNextButton\`/\`enablePrevButton\`. Do not pretend a cursor API supports random page offsets.
6. Mutations from inline/bulk edit run only the write query. Its \`onDataQuerySuccess\` re-runs page+count queries; failure preserves edits and shows an error.

Verify page 1, a middle page, the last/partial page, zero results, a changed search/sort/filter, and a mutation that changes the total count.

## Form construction — choose generated or standalone before creating components

- Use \`generate_form_schema\` only when **every selected field** maps to \`textinput\`, \`number\`, \`emailinput\`, \`password\`, \`datepicker\`, or \`checkbox\`. It maps real defaults, keeps create dates empty, omits serial keys, locks edit-mode primary keys, preserves \`include\` order, and supports safe label/placeholder/validation overrides. Read submitted values from \`components.<form>.formData\` and apply its returned layout guidance.
- If **any field** needs \`dropdown\`, \`multiselect\`, \`textarea\`, \`radio\`, \`toggle\`, \`starrating\`, or \`filepicker\`, build the **entire form** from standalone components in one \`add_components\` call. Do not mix a generated Form with corrective standalone fields: one standalone layout gives every field the same controllable edge and rhythm.
- For standalone forms, set \`styles.alignment.value="top"\` on every labelled input; use one two-column grid for compact fields, make TextArea fields full-width and genuinely multi-line, and use each component's top-level \`validation.mandatory\` for required state/asterisks. Read values from \`components.<name>.value\` (FilePicker: \`components.<picker>.file[0]\`). Bind conditional visibility directly on the standalone components.
- Generated Form cannot be repaired with schema \`alignment\`: FormUtils passes no alignment through. Dropdown/Multiselect labels stay offset and TextArea keeps a literal \`Label\` and may render as a single-line box. \`filepicker\` additionally crashes the whole Form. Treat these as hard selection rules, not browser-polish warnings.
- Put submit loading/disable state on a standalone Button and run only the mutation from its click. Put refresh, reset/clear, close, and success behavior on the mutation query's \`onDataQuerySuccess\`; preserve values and show an error on \`onDataQueryFailure\`.

## Forms & modals — field layout (avoid cramped, misaligned fields)

Form inputs default to a **side-aligned label** (\`styles.alignment = "side"\`) — the label sits to the LEFT of the input and eats its width. In a modal or a narrow column, a long label ("Requested amount (USD)") leaves a uselessly narrow input. Lay forms out deliberately:

- **Top-align labels in forms and modals.** Set \`styles.alignment.value = "top"\` on every input (\`TextInput\`/\`NumberInput\`/\`CurrencyInput\`/\`DropdownV2\`/\`MultiselectV2\`/\`DatePickerV2\`/\`DatetimePickerV2\`/\`TextArea\`/…) — the label goes ABOVE the control so it gets the **full field width**. (\`alignment\` is a **style**, not a property.)
- **Field sizing:** use the catalog default **40px authored height** for TextInput, EmailInput, NumberInput, DropdownV2, DatePickerV2, and other standard single-line fields. Row step is always **authored height + 20px label/validation footprint + 10px gap**; that is 70px only for a 40px-authored field. Reserve **90–100px authored height** for a genuinely multi-line TextArea. Do not inflate a single-line field to make its value text look larger: height changes whitespace, while these component contracts expose \`labelFontSize\` but no value-font-size style.
- **Two-column forms:** reserve ~**2 grid columns** of gutter between the two columns, and give both columns' fields consistent widths.
- **Full-width fields** (Description, notes) must share the **same left AND right edge** as the columns above them — with top-aligned labels they line up naturally; side-aligned ones begin at different x positions.
- **Use ModalV2's native regions.** Put the modal title Text in \`slot_name:"header"\`, form fields in \`body\` (the default), and native action buttons in \`footer\` when that footer is enabled. Do not leave \`showHeader:true\` with an empty header while adding a second title row to the body; MCP warns on both patterns. Header, body, and footer are separate child canvases, so their coordinates do not collide.
- **Modal-local coordinates:** a component parented to a modal is positioned **relative to the modal body** (0,0 = modal body top-left), NOT the 43-column canvas. Size its children to the modal body width, not the full canvas.
- **Modal sizing:** set \`modalHeight >= lowest child top + renderedHeight + visible headerHeight + visible footerHeight + ~20px bottom slack\`. ModalV2's default header/footer are 80px each; with only the header visible, that is the child's rendered bottom + ~100px. Undersized content can be clipped or forced into unintended scrolling.
- **Prefer flat composition.** Page-level components are faster to generate, inspect, and repair. Use generated Form only for its safe homogeneous field set; otherwise batch standalone fields with one-level modal/container parenting where required.
- **Use nesting only when the component semantics require it** (Kanban card content, custom Modal/Form children, Container/FlexContainer, Tabs, Listview, expandable rows). When it is required, create the hierarchy atomically in one \`add_components\` call with \`client_ref\`/\`parent_ref\`; keep it one level deep where practical.

**Browser QA for any form/modal:** confirm no label is truncating its input, every control has a usable width, field left/right edges line up, TextAreas are visibly multi-line, conditional fields behave correctly, and the final field plus footer/action buttons are visible at maximum modal scroll. Generated mixed-type Forms are blocked before authoring; if one already exists, replace it in place with standalone fields rather than attempting schema alignment. An element can exist in the DOM yet still be occluded by an undersized boundary, so use a screenshot in addition to the DOM snapshot.

## Async & UI states — required, not polish

Any element backed by a query is **not done** until its states are handled. These are part of building the feature, not a later polish pass:
- **Loading:** use the component's **native loading state** (Table/Statistics/Button etc. have a \`loadingState\`), bound to the query's loading flag \`{{queries.<q>.isLoading}}\` — never leave a component blank while data loads.
- **Empty:** a query can return zero rows. Show a clear empty state ("No workouts logged yet" via a Text/HTML block, or the Table's own empty message) — not a blank grid or a broken-looking chart. A custom empty state may intentionally share the Table's rectangle when their \`visibility\` bindings are exact complements; MCP suppresses the overlap warning only when that exclusivity is provable.
- **Error:** a query can fail. Surface it (a \`show-alert\` on the query's failure event, or a visible error state) — never present blank/stale as if it were fine.
- **Refresh:** after any mutation, re-run list/count queries from the mutation query's \`onDataQuerySuccess\` lifecycle event.
- **Success:** confirm and close/reset only from \`onDataQuerySuccess\`; show an error and preserve input from \`onDataQueryFailure\`.
- **Disabled / no double-fire:** while a mutation runs, **disable the button that triggered it** — bind its \`Disable\` to the mutation query's \`{{queries.<mutation>.isLoading}}\` (or \`control-component\` setDisable/setLoading around the action). A double-click must never fire the mutation twice.

## Reference — look these up as you build

The full **per-component binding rules** and **built-in component palette** are in **\`references/components.md\`**. For live contracts, call selective \`get_component_catalog({ type | types })\` and operation-scoped \`get_datasource_query_schema({ datasource_id, version_id, operation })\`.

The gotchas that most often break a build, inlined so you don't miss them:
- **Table:** set \`data.value = {{queries.<q>.data}}\` **and** \`dataSourceSelector.value = "rawJson"\` (both, or it renders blank). For a curated grid, keep \`autogenerateColumns\` true for runtime compatibility and project \`data\` to intended visible + behavior keys; declare behavior-only keys with \`columnVisibility:false\`. Modern row actions are \`columnType:"button"\` columns plus \`table_column\` events; never new legacy \`properties.actions\`. A Button-column click sets \`selectedRow\` before its handler. Exposed \`pageIndex\` is 1-based.
- **KeyValuePair:** an explicit \`fields\` array does not suppress undeclared keys from \`data\`; bind a freshly projected object containing only the intended field keys. Do not pass a full selected row or use an object spread. MCP automatically adds \`fieldDeletionHistory\` for catalog demo fields so they are not appended or positionally merged into custom fields.
- **Kanban:** card columns/counts can look correct while every card is blank because the body is nested children bound to \`cardData\`. MCP creates catalog defaults when no explicit child is supplied. For multi-line card content, use one explicit \`Html\` child with wrapping CSS and an explicit CSS width/max-width; nested \`Text\` clips to one line, and \`cardWidth\` does not reliably predict the physical column width. \`onCardSelected\` fires only when \`openModalOnCardClick\` is true; with a custom Html child that native modal can open blank, so prefer a read-only board or a separately browser-verified detail flow.
- **Listview / grid view:** there is no separate \`GridView\` type; use \`Listview\` with \`mode:"grid"\`. Create the Listview and every \`listItem\`-bound child atomically with \`client_ref\`/\`parent_ref\`; late children can mount empty. Every repeated item—including a grid cell—has its own fresh 43-column local canvas: a full-row child is \`left:0,width:43\`, not a fraction based on the parent grid's column count. Use smaller widths only for children intentionally arranged side by side inside one item. For a repeated \`Html\` child, use \`height:100%;box-sizing:border-box\` on its root instead of copying the authored pixel height. If a native Button follows the Html card, make it visually contiguous with the card and set \`rowHeight\` to at least the lowest child's bottom + ~10px; arbitrary gaps make the action look attached to the next record. \`selectedRecord\`/\`selectedRow\` are maps keyed by repeated child name (for example \`selectedRecord.cardHtml.rawHTML\`), not the original source row; request Listview \`authoringHints\` for the exact contract.
- **DropdownV2:** the selection is \`.value\` (display text \`.selectedOption.label\`); \`.label\` is the field TITLE — never filter data on it. \`options\` accepts a literal static array only; putting a dynamic \`{{ }}\` string there can be shredded into character objects and is blocked by MCP. Dynamic \`schema\` requires \`advanced="{{true}}"\` or ToolJet silently uses static \`options\`; never author both modes. Bound schema entries need \`visible:true\` + \`default:true\` to preselect.
- **Styling** goes in the top-level \`styles\` object, **never** under \`properties\`.
- **Html rawHtml expressions:** a \`.map()\` inside another \`.map()\` can throw and render Html completely blank before even an \`||\` fallback runs. Flatten that Html expression or pre-shape it in a datasource/RunJS query. Do not generalize this to Table data: lookup joins such as \`.filter(...)[0]\` inside \`.map()\` work there.
- **First-row bindings:** \`(queries.<q>.data || [{}])[0].field\` is not guarded for zero rows because \`[]\` is truthy; it can throw and blank the component. Use \`(queries.<q>.data || [])[0]?.field\` or \`queries.<q>.data?.[0]?.field\`.
- **Cross-component bindings on page switch:** a binding that reads another component (\`components.filterA.value\`) evaluates before that component mounts when the page is entered via in-app navigation with query data already loaded. It throws, the host component renders empty ("No data" on a Table), and stays empty until something re-evaluates it. Always write \`components.filterA?.value\`. A page reload hides the bug because the query then finishes after mount.
- **Chart:** empty native title + a separate \`Text\` heading; default to simple \`type\` + explicit \`data:[{x,y}]\`, and do heavy aggregation in a **query**. Use \`plotFromJson\` only for genuinely advanced Plotly traces: static JSON must contain non-empty \`data\`; dynamic JSON always needs the browser trace check.
- **Events:** the id is \`set-custom-variable\` (not \`set-variable\`); lifecycle sources are component/data_query/page. Mutation refresh/success belongs on \`onDataQuerySuccess\` and errors on \`onDataQueryFailure\`.
- **Security:** visibility is UX, not authorization; use server-side permissions/RLS and \`globals.server.currentUser\` in server queries.
- **tjdb queries** reference the table by \`table_id\` (from \`list_tables()\`), not by name; writes use indexed-object option shapes (see the reference).
- **New data model:** for "build a CRM / expense tracker" with no table yet — **propose the tables+columns and confirm with the user** (schema is a commitment), then \`create_tables\` → optional \`insert_rows_batch\` → \`add_queries\`/\`add_components\`.

## Interactivity — wire events so the app DOES things (not just displays)

Components and queries alone make a *static* app. Use \`add_events\` for component, query, page, and Table Button-column behavior: \`{ source_id, source_type, trigger, ref?, action }\`. \`component_id\` is a backward-compatible shorthand for \`source_type: "component"\`.

**Triggers:** component triggers come from \`get_component_catalog(type).events\` (Button \`onClick\`; Table \`onPageChanged\`/\`onSearch\`/\`onSort\`/\`onFilterChanged\`/\`onBulkUpdate\`; Form \`onSubmit\`/\`onInvalid\`). A Table Button-column click uses \`source_type:"table_column"\`, \`trigger:"onClick"\`, and \`ref:"<column key or name>::<button id>"\`. Query lifecycle triggers are \`onDataQuerySuccess\` and \`onDataQueryFailure\` with \`source_type: "data_query"\`. Page load is \`onPageLoad\` with \`source_type: "page"\`.

**Actions** (\`action = { actionId, ...params }\`) — use these exact \`actionId\` strings (invalid ids silently do nothing):
- **Run a query:** \`{ actionId: 'run-query', queryId: '<query id>', queryName: '<name>' }\`
- **Switch page:** \`{ actionId: 'switch-page', pageId: '<target page id>' }\` (see master→detail below for passing data).
- **Show alert:** \`{ actionId: 'show-alert', message: 'Saved', alertType: 'success' | 'info' | 'warning' | 'error' }\`
- **Show modal:** \`{ actionId: 'show-modal', modal: '<modal component id>' }\` · **Close modal:** \`{ actionId: 'close-modal', modal: '<modal component id>' }\`
- **Set a custom variable:** \`{ actionId: 'set-custom-variable', key: 'selectedTicket', value: '{{components.<table>.selectedRow}}' }\` — the id is **\`set-custom-variable\`** (NOT \`set-variable\`, which does not exist); read it back as \`{{variables.selectedTicket}}\`. Also: \`unset-custom-variable\`.
- **Control a component:** \`{ actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: 'setValue' | 'clear' | 'setVisibility' | 'setDisable' | 'setLoading', ... }\` — reset/prefill an input, toggle visibility, etc.
- **Set a Table page:** \`{ actionId: 'set-table-page', table: '<Table component id>', pageIndex: '{{1}}' }\`.
- **Export data:** \`{ actionId: 'generate-file', ... }\` — CSV/plaintext works. The PDF branch is pass-through only: it requires pre-formed PDF bytes and does not convert text, HTML, or query data. Use CSV unless real PDF bytes are already available and browser-verified. · **Copy:** \`{ actionId: 'copy-to-clipboard', ... }\`.

(Other valid ids include \`set-page-variable\`, \`open-webpage\`, \`go-to-app\`, \`logout\`, \`set-localstorage-value\`, \`scroll-component-into-view\`.)

**Common recipes:**
- **Mutation lifecycle (required):** the Button/Form event runs **only** the mutation. On that query's \`onDataQuerySuccess\`, run the list/count refresh queries, show success, reset the Form if appropriate, and close the modal. On \`onDataQueryFailure\`, show an error and keep the user's input. Never refresh or show success immediately after starting the mutation—the write may fail.
- **Page initialization:** attach \`onPageLoad\` to the page when a query must run each time that page is entered. Use a page event instead of assuming app-level \`runOnPageLoad\` will re-run on in-app navigation.
- **Master → detail:** on Table \`onRowClicked\`, order handlers as: (1) \`set-custom-variable\` for the selected row/id, (2) optional \`run-query\` for fresh detail data, (3) \`switch-page\` **LAST**. ToolJet stops the same-trigger chain after navigation, so later handlers silently never run. Bind directly to \`{{variables.selectedTicket.<field>}}\` when a snapshot is enough. A detail-page \`onPageLoad\` query is also valid; do not rely on app-level \`runOnPageLoad\` re-running on navigation. This variable-only pattern is intentionally navigation-scoped: a hard reload or direct link to the hidden detail page has no selected record. If reloadable/deep-linkable detail is required, design an explicit persisted/parameterized selection flow and browser-test it rather than presenting the variable-only page as deep-link safe.
- **Refresh on an external filter:** an input's \`onChange\`/\`onEnterPressed\` → \`run-query\` on the list query whose filter references the input.
- **Server-side Table search/filter:** keep datasource-specific pagination/filter syntax in the query contract and bind \`totalRecords\` to a matching count query. Use one mode only: reactive reads with events limited to resetting page 1, or non-reactive reads explicitly run by page/search/sort/filter events after the reset. Never wire both, which duplicates requests and can race stale state. Guard offset pagination with \`((components.<table>.pageIndex || 1) - 1) * pageSize\`.
- **Prevent double-submit:** bind the submit Button's \`Disable\` to the mutation query's loading (\`{{queries.<mutation>.isLoading}}\`) so it can't fire twice, and show its native loading state while the mutation runs. (See "Async & UI states".)

Wire events AFTER the components and queries exist (you need their ids). Prefer one \`add_events\` call for all ordinary events and one \`add_query_lifecycles\` call for every standard mutation flow.

## Verify your work — browser-free checks first, then a real browser pass

**Do the cheap checks continuously, without a browser** (this replaces the slow open-screenshot-adjust loop, NOT the final visual check):
- Before the first write, run one \`lint_app_spec\` over the planned tables/seed data, queries, pages/components, events, and lifecycles. This is an **awaited preflight barrier**: call it alone, inspect the result, correct all errors, then consume its \`plan_token\` with \`apply_app_phase\`. Never run the linter concurrently with that or any other mutating tool.
- For one bounded, non-mutating, non-billable read query, call \`run_query(query_id, version_id)\`; for two or more independent bounded ToolJet DB/SQL reads, prefer one preflighted \`run_queries(query_ids, version_id)\` batch. For an unbounded read, use the count-first flow above—never bypass it with \`SELECT *\` or inferred user consent. Inspect real values before hardcoding chart series/options. If a result warns about \`components.*\`, verify those runtime-resolved values in the viewer. Do **not** test mutations, AI, email, or other side effects merely to validate a build.
- Inspect with a **scoped** \`get_app_summary\` (the current page/component plus exact dotted fields, not the whole app) to confirm bindings/values are what you intended; \`update_*\` anything wrong.
- Run \`validate_app(app_id)\` — it statically checks references, query option contracts, event compatibility, and render traps with no browser or query execution. Fix every \`error\`; review the \`warnings\`. Its explicit \`not_checked\` list still needs targeted runtime/browser verification.

**Then run one page-level browser QA loop for each completed page/primary flow.** Open or refresh the same **VIEWER** tab (\`.../applications/<appId>/<pageHandle>?env=development&version=v1\`, not the editor canvas). Read \`scripts/browser-audit.js\` from this skill and evaluate its complete IIFE once in that page; it returns bounded component rectangles, real two-axis overlaps, clipped text, component overflow candidates on either axis, blank-widget candidates, nested scroll pairs, dialogs, below-fold buttons, and visible Plotly Charts with zero evaluated or rendered traces. Take one screenshot for visual context, exercise the key flow, and **collect every issue before editing** unless a blank/error/blocker prevents further inspection. The audit explicitly does not check console/network failures, hidden conditional states, or mutation correctness—use the browser's relevant facilities for those only when the flow needs them. Group fixes by page/tool, apply the smallest number of batched \`update_components\` / \`update_layout\` / \`update_events\` calls, then do **one confirmation audit + screenshot**. Do an additional browser check only at a genuine new risk point such as a newly added Chart, dense custom layout, or multi-step interaction.

For an **Operate** page, this browser pass must also confirm that its primary action is visible without first scrolling the page and that a bounded Table/Listview does not introduce a second vertical scroll region around the whole page. If both scroll regions are deliberate, report that explicitly; otherwise shorten/reposition the operational surface in one repair batch.

**For every form/modal, measure geometry once—screenshots can hide small overlaps.** ToolJet widget wrappers use \`id=<component_id>\`, so one browser evaluation can collect each child's \`getBoundingClientRect()\`. A real collision requires overlap on **both axes** (\`xOverlap && yOverlap\`), which avoids false positives for side-by-side fields; also compare child bottoms with the modal body/bounds. MCP warnings from \`add_components\`, \`update_components\`, \`update_layout\`, and \`validate_app\` catch static rendered-height/modal sizing mistakes, while this DOM check confirms runtime/dynamic layout.

**Triage before repairing:**
- **Always fix:** blank/error rendering, incorrect or unbound data, broken navigation, failed primary actions, misleading values, unreadable core charts/tables, and missing loading/error behavior that breaks the workflow.
- **Fix at the default target viewport:** usability/accessibility problems that impede the page's intended job.
- **Report unless requested:** tiny spacing/font differences, cosmetic wrapping seen only at an unusual viewport, and evidence-backed ToolJet/editor limitations. Allow at most one collected cosmetic repair batch; do not enter repeated pixel-polish loops.
- If something appears to be a platform/manual-builder limitation, make one targeted evidence check, then report the exact limitation and manual step instead of probing repeatedly. Get one complete primary loop working before cosmetic work; before declaring the **whole requested app** complete, verify every requested primary flow.

**Verify the default desktop render only** — don't cycle through many viewport sizes; you don't know the customer's target device, and resizing the window doesn't validate ToolJet's real mobile layout anyway. Test other viewports only if the user asks.

**When the browser shows something wrong, do NOT enter a click-by-click repair loop.** Diagnose with \`get_app_summary\` / \`run_query\`, then fix in place with \`update_components\` / \`update_query\` / \`update_events\`, and reload the viewer to confirm. The browser is for *verifying* and catching what data checks can't (visual/render/runtime), not for authoring or as the repair mechanism.

### Fast default build sequence

1. Plan the page/data model and stable logical refs locally; do not write a skeleton first.
2. Fetch all needed complex component contracts in one selective \`get_component_catalog({types:[...]})\` call and all datasource operation contracts in one \`get_datasource_query_schema({requests:[...]})\` call. Reuse both results for the whole build.
3. Run and await \`lint_app_spec\` **by itself**. Inspect/fix its result, then consume the returned token with one \`apply_app_phase\` call; never dispatch the linter and the apply call as siblings in parallel.
4. Run selected safe reads, review the static validation returned by the apply call (use \`validate_app\` again only after later manual edits), then make one collected browser tour across the completed primary flows, one repair batch, and one confirmation pass. Do not screenshot-poll or reopen catalogs between pages.

## Avoid these (they silently fail or force rebuilds)

- **Styling under \`properties\`.** Native styling goes in the top-level \`styles\` object; ToolJet ignores styles nested in \`properties\` (and \`add_components\` will reject them).
- **Filtering on \`DropdownV2.label\`.** \`.label\` is the field TITLE. The selection is \`.value\` (display text is \`.selectedOption.label\`). Also never put a dynamic binding string in static \`options\`; use \`schema\` + \`advanced:true\`.
- **\`set-variable\`.** Not a real action id — use \`set-custom-variable\`.
- **Master→detail via urlparams + \`runOnPageLoad\`.** It won't re-run on page switch; pass the row via \`set-custom-variable\` and bind to \`{{variables…}}\`.
- **External dropdown filters as the first cut** when the Table's built-in search/sort/filter already covers status/priority/assignee. Add external filters only as a deliberate enhancement once verified.
- **Rebuilding to fix a mistake.** Use \`update_components\` / \`update_query\` / \`update_events\` — never create a second app or duplicate components to "correct" something.
- **A Table showing demo columns (photo/email/…).** That means its \`data\` binding resolved empty — fix the query binding, not the columns.
- **Dumping every requested capability onto one page.** A multi-domain request = an overview + focused pages (see "Plan the app"), not one long crowded scroll.
- **Skeleton or placeholder pages** with no working loop — build one complete journey before starting the next.
- **Query-backed UI with no loading / empty / error state** — those are required parts of the feature, not polish.
- **A mutation button that can be double-fired** — disable it while the mutation runs.
- **A FilePicker inside Form JSON schema** — it crashes the whole Form; use standalone \`FilePicker\`.
- **A generated Form containing Dropdown, Multiselect, or TextArea** — FormUtils cannot align or label them cleanly; build the whole form from standalone, top-aligned fields.
- **Claiming generate-file converts content to PDF** — it only passes through already-formed PDF bytes; use CSV/plaintext otherwise.

### Datasource contract failures — one compact rule

ToolJet plugins are wrappers, so upstream API knowledge can be actively misleading (for example, a plugin may accept \`prompt\` even when the vendor API accepts \`messages\`). Fetch the exact operation contract by datasource id; heed MCP's missing/unknown/misplaced-key warnings; and treat only a successful result as runtime confirmation. A vendor 4xx/429 proves the request reached an upstream layer, **not** that every option was accepted. If a generated contract is genuinely incomplete, inspect its \`raw\` section and make at most one minimal, user-approved safe probe—never a billable or mutating probe. Report the gap instead of cycling through guesses.

## Build guidance

- Always \`create_app\` first; thread \`app_id\` / \`version_id\` / \`home_page_id\` into later calls.
- Give each component a \`name\`; bind data by query name: \`{{queries.<name>.data}}\`.
- Use the grid mechanics above to lay components out without overlap. Design the layout yourself — make it clean and enterprise-grade.
- Repeat the clickable \`viewer_url\` and \`editor_url\` in the final handoff even when you already opened the viewer in the built-in browser. \`app_url\` is only a compatibility alias for the editor.
- **Close the loop with an efficiency note.** After building (and after each phase), tell the user roughly **how many MCP tool calls it took** — you can count your own calls, and fewer round-trips is the goal (batch with \`add_components\`/\`add_queries\`). Include **token usage only if your runtime actually surfaces it** to you; never fabricate a token number you don't have. Keep it to one line.

---

**Technical reference:** exact per-component binding rules and the full built-in palette are in \`references/components.md\`. Datasource request contracts and known response shapes/statuses are served on demand by \`get_datasource_query_schema\`.
`;

// --- Technical reference (the lookup material — kept out of the workflow core so it stays prominent) ---
const reference = `# ToolJet reference — component bindings, palette & query schemas

<!-- GENERATED FILE — do not edit by hand. Run \`node scripts/generate-skill.mjs\` to regenerate. -->

Companion to the **tooljet-app-builder** skill. The skill covers the workflow (information architecture, phasing, design, async states, verification); this file is the technical lookup you consult **while** building. You can also call selective \`get_component_catalog({ type | types })\` for one or several live component contracts.

## Built-in components (pick from these first)

| Component (\`type\`) | Purpose |
|---|---|
${catalogSection}

## Component binding reference (${componentList.length} components)

Authoritative rules for binding each component correctly (what must be set, or it renders nothing / wrong).

${componentSection}

## Form schema field contracts and upload workaround

The authoritative Form JSON-schema field types are: \`textinput\`, \`textarea\`, \`dropdown\`, \`multiselect\`, \`number\`, \`emailinput\`, \`password\`, \`datepicker\`, \`checkbox\`, \`radio\`, \`toggle\`, \`starrating\`, and \`filepicker\`. Do not abbreviate these to \`email\`, \`star\`, or \`file\`.

- Dropdown and multiselect fields use \`values\` plus \`displayValues\`, not \`options\`.
- There is no working \`required\` flag. Use \`validation.minLength\` or \`validation.customRule\` and keep database constraints authoritative.
- Do not use Form's \`filepicker\` type even though it is listed: the current renderer throws while reading \`minSize\` and replaces the entire Form with "Something went wrong". Place a standalone \`FilePicker\` component outside the Form. Its \`.file\` variable is an array of \`{name, content, dataURL, type, parsedValue}\`; read values such as \`{{components.evidencePicker.file[0].name}}\`.
- Generated Form is layout-safe only when every field is \`textinput\`, \`number\`, \`emailinput\`, \`password\`, \`datepicker\`, or \`checkbox\`. FormUtils passes no schema alignment through: Dropdown/Multiselect labels are offset or duplicated, while TextArea retains a literal "Label" and may be single-line. If any field needs Dropdown, Multiselect, TextArea, Radio, Toggle, StarRating, or FilePicker, build the whole form from standalone components with \`styles.alignment.value="top"\`; use a two-column grid for compact fields and full-width TextArea controls.
- A create-mode datepicker must use \`value:"{{null}}"\`; a literal/omitted null renders ToolJet's 01/01/2022 demo date.

## File generation formats

\`generate-file\` genuinely serializes CSV and passes plaintext through. Its PDF handler is also pass-through: it expects already-formed PDF bytes and does not render text, HTML, or tabular data into a PDF. Use CSV/plaintext unless the app already has valid PDF bytes, then verify the download in the viewer before claiming PDF support.

## Table row-action Button columns

Modern per-row actions are **Button columns**, not the deprecated \`properties.actions.value\` configuration. The top-level \`actions\` returned by \`get_component_catalog("Table")\` are \`control-component\` runtime methods such as \`setPage\`/\`selectRow\`; they are unrelated to row buttons. For the machine-readable version, request \`get_component_catalog({type:"Table",sections:["authoringHints"]})\`.

Append a column like this to the Table's **complete** \`properties.columns.value\` array (updates replace arrays wholesale):

\`\`\`json
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
\`\`\`

\`buttonLabel\`, \`buttonTooltip\`, \`disableButton\`, \`loadingState\`, \`buttonVisibility\`, and style fields can be expressions using the per-cell context \`rowData\` and \`cellValue\`. Give every button a stable, unique string \`id\`.

The event is attached to the **Table component id** with target \`table_column\`. Its \`ref\` joins the column \`key\` (falling back to \`name\`) and button \`id\` with \`::\`:

\`\`\`json
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
\`\`\`

ToolJet updates the Table's \`selectedRow\` and \`selectedRowId\` before running this handler. Bind the query/action to \`{{components.<table>.selectedRow.<field>}}\`. Use \`rowData\` inside button configuration only; do not assume it is the event action context. \`source_type:"table_action"\` exists only for already-present legacy action buttons and should not be authored in new apps.

If an action needs a key such as \`id\` that should not be visible, keep it in the Table's data projection and declare it in the complete columns array with \`columnVisibility:false\`:

\`\`\`json
{
  "id": "record-id",
  "name": "ID",
  "key": "id",
  "columnType": "string",
  "columnVisibility": false,
  "autogenerated": false
}
\`\`\`

This keeps the field available in \`selectedRow\` and suppresses \`autogenerateColumns\` from leaking it as a visible column.

## Kanban card content

Kanban cards are nested canvases: \`columnData\` and \`cardData\` can resolve correctly, including card counts, while every card body remains blank if the Kanban has no child components. \`add_components\` materializes the catalog default title/description children when no explicit child is supplied. For a custom body, give the Kanban a \`client_ref\` and create its child with the matching \`parent_ref\` in the same call; any explicit child suppresses the defaults.

Nested \`Text\` clips to a single line. For multi-line title/description content, prefer one \`Html\` child bound to \`cardData\`, use normal wrapping plus \`overflow-wrap:anywhere\`, and pin its content width/max-width explicitly in CSS. Do not infer the physical Kanban column width from \`cardWidth\`; verify the card in the viewer because the rendered column can retain a wider minimum than the nested card canvas.

## Datasource query reference

\`add_queries\` works on **any ALREADY-CONNECTED datasource** — ToolJet DB, PostgreSQL, MySQL, MongoDB, ServiceNow, RunJS, etc. The query **kind is taken from the datasource automatically** (you don't pass it; call \`list_datasources\` to see each datasource's \`kind\`). Only the \`options\` differ per kind:

Workspace-connected datasources available to the current user and selected environment are automatically available to both existing and newly created apps. Do **not** look for or invent a per-app datasource linking step: after \`create_app\`, call \`list_datasources(version_id)\` and pass the returned \`id\` to \`add_queries\`. An expected source missing from that result indicates the wrong workspace, insufficient permission, an unconnected source, or missing environment configuration—not a missing app attachment. Use the returned workspace \`datasources_url\` or datasource \`settings_url\` for a user-owned repair handoff; never configure credentials or OAuth yourself.

> **You can only use datasources that are already connected — these tools cannot create or connect a new datasource or third-party integration** (e.g. Strava, Stripe, a new REST API, a Google Sheet). If the user asks to build on a source that isn't in \`list_datasources\`:
> - **Say so plainly** — ToolJet has no native integration for it (or it simply isn't connected), and you can't connect one from here. Don't fabricate a query against it or present placeholder data as if it were live.
> - **Offer the real paths:** (a) the user connects it in ToolJet first — for a third-party API that usually means a **REST API datasource** pointed at that API; auth/OAuth is a manual setup step and you must **never handle credentials yourself** — then you build queries + UI against it; or (b) build the app's full UI and structure **now** against a **ToolJet DB table seeded with representative sample data**, clearly labelled as placeholder, so it's ready to rewire to the real source later. Confirm which the user prefers.
- **tooljetdb** — \`{ operation: "list_rows", table_id: "<id>", list_rows: { limit: 25, offset: 0 }, runOnPageLoad: true }\` (bounded preview; see below)
- **postgresql / mysql** — \`{ mode: "sql", query: "SELECT …", query_params: [], runOnPageLoad: true }\`. Any value that comes from a component goes in \`query_params\` as a named binding, never pasted into the statement: \`query: "… WHERE priority = :priority"\` with \`query_params: [["priority", "{{components.priorityFilter.value}}"]]\`. Writing \`priority = '{{components.priorityFilter.value}}'\` splices the value in as text, so a value containing a quote rewrites the statement (measured: it returned every row instead of the filtered set). Keep the empty case in SQL — \`WHERE (:priority = '' OR priority = :priority)\` — rather than dropping the placeholder. See \`references/security.md\` for the full rule.
- **runjs** — \`{ code: "return queries.q1.data.filter(r => r.status === 'Open').length;" }\` (great for chart aggregation — reference other queries' data, return a shaped value). Plain \`queries.q1\` reads inside RunJS code are **not inferred as reactive dependencies**: \`runOnDependencyChange:true\` alone can leave the result at its first empty/stale value. For derived data, run the RunJS query explicitly from each source query's \`onDataQuerySuccess\`; for user-driven transforms, invoke it only after the source query has completed.
- **servicenow** — \`{ operation: "list_records", table: "incident", … }\`
Call \`get_datasource_query_schema({ datasource_id, version_id, operation })\` for that ToolJet wrapper's exact compact request contract and its response shape/status when known; batch related operations with \`requests\`. If the response is \`runtime-dependent\` or \`unknown\`, inspect a safe successful run or the remote schema before binding nested fields. Do not infer fields from another datasource—or from the upstream vendor API. Use \`sections:["introspection"]\` plus \`inspect_datasource_schema\` to fetch only the schemas/tables/columns/collections needed for the current query.

### Building an app that needs a NEW data model (most real requests)
Many requests ("build a CRM", "an expense tracker") come with **no table yet** — you must create the data model first:
1. **Propose the data model** (tables, columns + types, relationships) and **confirm it with the user** before creating anything — schema is a commitment.
2. \`create_tables\` once for the confirmed model (it accepts one or many tables).
3. Optionally \`insert_rows_batch\` once to seed a small representative set so the app doesn't render empty. It is insert-only: omit generated serial primary keys, and treat an explicit duplicate-key error as a conflict to resolve—not an update path. Avoid dozens of rows unless density/pagination is under test.
4. Then \`add_queries\` + \`add_components\` as usual.
For an **existing** table, call \`get_table_schema(table_name)\` first so you use its real column names and types.
Use \`add_table_column\` to evolve a ToolJet DB table in place. Destructive deletes are irreversible: inspect dependencies and obtain explicit approval for the exact target before any \`drop_*\` or \`delete_*\` call, then pass \`confirm:true\`.

### ToolJet DB (\`kind: "tooljetdb"\`)
- Resolve the table id with \`list_tables()\` — the query references the table by **\`table_id\`** (the id), NOT the name.
- Bounded preview: \`options = { "operation": "list_rows", "table_id": "<table id>", "list_rows": { "limit": 25, "offset": 0 }, "runOnPageLoad": true }\`. Do not author an automatic unbounded \`list_rows\`; count first and use the server-side Table recipe when size is unknown or growing.
- \`runOnPageLoad: true\` runs the query when the app opens so bound components populate automatically.
- \`list_rows\` may carry \`limit\`, \`offset\`, \`where_filters\`, and \`order_filters\`. In \`order_filters\`, the outer map key must match the clause's inner \`id\`; a mismatch can silently disable sorting. Fetch \`get_datasource_query_schema(..., operation:"list_rows")\` for the exact nested shapes instead of guessing.
- Prefer ToolJet DB aggregation over fetching every row just to count or sum: use \`list_rows.aggregates\` and optional \`list_rows.group_by\`. The aggregate configuration key is not the result key; results use \`<table_name>_<column>_<aggFx>\` (for example \`starlink_terminals_id_count\`). Multi-table reads use \`operation: "join_tables"\` with \`join_table\`.
- Primary-key batches use \`bulk_update_with_primary_key\` with \`rows_update\`, or \`bulk_upsert_with_primary_key\` with \`rows\`. Read the generated schema before composing these shapes.
- **Write operations** (for edit/create flows) use indexed-object option shapes:
  - Create: \`{ "operation": "create_row", "table_id": "<id>", "create_row": { "0": { "column": "title", "value": "{{...}}" }, "1": { "column": "status", "value": "Open" } } }\`
  - Update: \`{ "operation": "update_rows", "table_id": "<id>", "update_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } }, "columns": { "0": { "column": "status", "value": "{{...}}" } } } }\`
  - Delete: \`{ "operation": "delete_rows", "table_id": "<id>", "delete_rows": { "where_filters": { "0": { "column": "id", "operator": "eq", "value": "{{...}}" } } } }\`
- After a write succeeds, re-run list/count queries from the mutation's \`onDataQuerySuccess\` event.

(Other datasources have their own generated query schemas; resolve the contract from the connected \`datasource_id\` and requested operation.)

### SQL response values and aggregation

SQL driver output is type-dependent: values without a registered parser (commonly some numeric/decimal types) may arrive as strings. Do not assume every value is a string or every numeric-looking value is a number; cast in SQL or convert deliberately before JavaScript arithmetic. When the source is SQL, perform grouping/count/sum in SQL and return the small chart/table shape directly instead of downloading rows for a fragile client-side reduction.

For safe discovery, use plugin selectors first: list schemas/tables, then batch known-table column lookups. Plugin selectors commonly stop at column names and do not expose keys, foreign keys, indexes, or views. When those relationships matter, call \`prepare_sql_discovery_queries\` for the exact connected datasource and requested purposes; review its \`unsupported\` list, add the returned specs in one \`add_queries\` batch, and run only the selected reads. Preview/distinct queries require explicit columns and are capped at 100 rows. Count first, recommend server-side pagination above 1,000 rows, and obtain separate billable-read approval for BigQuery/Snowflake/Redshift before execution.

### Billable warehouses (BigQuery, Snowflake, Redshift)

Every read is metered against the customer's cloud bill, so treat query COUNT as a budget, not just latency.

- Discover with metadata, not data. \`inspect_datasource_schema\` and \`get_datasource_query_schema\` scan no bytes; a \`run_query\` does. Get the columns from the schema and write the SQL from it.
- Do NOT verify every query by running it. Verifying a dashboard query-by-query is the single largest source of spend on these sources — one build issued 11 billable reads purely to check its own work. Run at most one representative read; rely on the schema and the linter for the rest, and say in the handoff that the others were not executed.
- Never self-approve \`user_confirmed_billable_read\`. It exists so a human accepts the cost. Ask, and if you cannot ask, leave the query unrun and say so.
- Cast numeric aggregates in SQL. BigQuery \`COUNT(*)\` is INT64 and arrives as a STRING; a Chart given string y values renders BLANK with no error, while a Statistics tile fed the same column looks fine — so the bug hides in plain sight. Write \`CAST(COUNT(*) AS FLOAT64) AS cnt\`, or coerce in the binding with \`y: Number(r.cnt)\`.
- BigQuery dialect: backtick-qualify tables (\`\\\`dataset.table\\\`\`), and prefer \`COUNTIF()\`, \`FORMAT_DATE()\`, \`SAFE_CAST()\`, \`SAFE_DIVIDE()\`. There is no \`::\` cast.
- Bound every query: explicit columns, a \`LIMIT\`, and aggregation pushed into SQL. A partition/cluster column in the WHERE clause cuts scanned bytes far more than a LIMIT does.

## Charts — how to make them render reliably (READ THIS before adding a Chart)

The \`Chart\` component fails in a specific, common way, and the cause is not complexity: **ToolJet ends a \`{{ }}\` binding at the first \`}}\` it finds**, so any expression that contains two adjacent closing braces before its end (a nested object literal such as \`marker:{color:'#0E7490'}}\`, a Plotly \`layout\` block, an IIFE whose last statement closes an object) is cut off, evaluates to nothing, and the chart draws axes with **no data traces**. The same trap blanks a Table whose \`data\` projection ends in \`}})\`, and any other bound property. Rule: **inside a binding, never let two \`}\` touch; write \`} }\`** (a space between them is valid JavaScript). The MCP inserts that space for you in component properties, but write it correctly anyway. Then:

1. **Use the simple mode** (the default — keep \`plotFromJson\` false / don't set it). Set two properties:
   - \`type\`: \`"bar"\` | \`"line"\` | \`"pie"\`
   - \`data\`: an array of \`{ x, y }\` objects.
2. **Build \`data\` with a SIMPLE, EXPLICIT binding.** First call \`get_table_schema\` (or \`run_query\`) to learn the **real field names** — never auto-detect them. Then use explicit filters/maps, no IIFE:
   \`\`\`
   data.value = "{{ [
     { x: 'Open',        y: queries.getTickets.data.filter(r => r.status === 'Open').length },
     { x: 'In Progress', y: queries.getTickets.data.filter(r => r.status === 'In Progress').length },
     { x: 'Resolved',    y: queries.getTickets.data.filter(r => r.status === 'Resolved').length }
   ] }}"
   \`\`\`
   For a straight mapping, \`queries.q.data.map(r => ({ x: r.category, y: r.amount }))\` is fine — simple and explicit.
3. **For heavy aggregation, do it in a QUERY, not the chart binding.** Bind \`data\` to a query that already returns \`[{x,y}]\` (a RunJS transform query, or a DB aggregate), and keep the chart's own binding a plain reference: \`{{queries.chartData.data}}\`. Query engines evaluate JS reliably; the chart property evaluator does not.
4. **Only use Plotly-JSON mode** (\`plotFromJson: true\` + \`jsonDescription\`) for advanced multi-trace charts. Static descriptions must be valid JSON with a non-empty \`data\` array. For a dynamic description, keep the expression simple, use explicit field names, wrap the object with \`JSON.stringify(...)\`, and confirm the browser audit does not report a visible Chart with zero evaluated or rendered traces.

Rule of thumb: **an empty Html can mean rawHtml was too complex.** In particular, a \`.map()\` nested inside another \`.map()\` can throw before an \`||\` fallback runs. Flatten that Html expression or pre-shape the nested data in a query. This is not a blanket ban on nested array lookups in Table data bindings.
`;

function extractSection(document, heading) {
  const start = document.indexOf(heading);
  if (start < 0) throw new Error(`Missing generated skill section: ${heading}`);
  const level = heading.match(/^#+/)?.[0].length;
  if (!level) throw new Error(`Generated skill heading has no Markdown level: ${heading}`);
  const tail = document.slice(start + heading.length);
  const next = new RegExp(`\\n#{1,${level}} `).exec(tail);
  const end = next ? start + heading.length + next.index : document.length;
  return document.slice(start, end).trim();
}

const routedSections = {
  workflows: [
    '## What this skill is',
    '## Be honest about what\'s buildable — don\'t say yes to everything',
    '## The tools',
    '## Workspace — confirm which one first',
    '## Before you build — prefer safe defaults; ask only when it changes what you build',
    '## Plan the app — information architecture BEFORE any component',
    '## Build in phases — page architecture and phasing are SEPARATE decisions',
    '## App model & binding syntax',
    '## Reference — look these up as you build',
    '## Avoid these (they silently fail or force rebuilds)',
    '## Build guidance',
  ],
  uiLayout: [
    '## Component selection — built-in for interactive/data surfaces, HTML where it makes the UI better',
    '## Canvas & grid mechanics (FACTS — you must respect these to position components)',
    '## Design — decide before you build, then apply the visual defaults',
  ],
  tables: ['## Server-side Tables — datasource-neutral recipe'],
  forms: [
    '## Form construction — choose generated or standalone before creating components',
    '## Forms & modals — field layout (avoid cramped, misaligned fields)',
  ],
  events: [
    '## Interactivity — wire events so the app DOES things (not just displays)',
    '## Async & UI states — required, not polish',
  ],
  security: [
    '## Security boundary — UI behavior is not authorization',
    '## SQL parameters — never splice a component value into the statement',
  ],
  qa: ['## Verify your work — browser-free checks first, then a real browser pass'],
};

const makeReference = (title, purpose, headings, document = fullSkill) => `# ${title}\n\n${purpose}\n\n${headings
  .map((heading) => extractSection(document, heading))
  .join('\n\n')}\n`;

const workflows = makeReference(
  'Tool workflows and runtime guardrails',
  'Read this only when choosing an authoring/update path, repairing an existing app, or diagnosing a silent ToolJet configuration failure. MCP input schemas and returned warnings remain authoritative.',
  routedSections.workflows
);
const uiLayout = makeReference(
  'UI authoring and layout',
  'Read this before laying out a new page or using a Chart, nested view, or other layout-sensitive surface. Table-specific layout and pagination live in tables.md.',
  routedSections.uiLayout
);
const tableRule = componentRuleSections.find((section) => section.publishedName === 'Table')?.markdown ?? '';
const tables = `# Tables\n\nRead this whenever a phase contains a Table: binding, row actions, sizing, or server-side pagination.\n\n${routedSections.tables
  .map((heading) => extractSection(fullSkill, heading))
  .join('\n\n')}\n\n## Exact Table binding rule\n\n${tableRule}\n\nToolJet Table data bindings can silently become \`No data\` when a \`.map()\` callback uses a statement body such as \`map(row => { const value = ...; return {...}; })\`. Use the expression-body form \`map(row => ({...}))\`, or pre-shape multi-statement logic in the datasource/RunJS query. This is narrower than the Html nested-map limitation: supported Table lookup joins inside an expression-body map remain valid.\n\nValid \`columnType\` values are exactly: \`string\`, \`number\`, \`text\`, \`datepicker\`, \`select\`, \`newMultiSelect\`, \`tagsV2\`, \`boolean\`, \`image\`, \`link\`, \`json\`, \`markdown\`, \`html\`, \`rating\`, \`button\`. ToolJet still accepts eight older values but flags them as deprecated in the inspector, and some render an EMPTY cell so the table looks broken: use \`string\` not \`default\`, \`newMultiSelect\` not \`badge\`/\`badges\`/\`multiselect\`, \`tagsV2\` not \`tags\`, and \`select\` not \`dropdown\`/\`radio\`/\`toggle\`. \`lint_app_spec\` fails on the deprecated values.\n\nWhen a schema or bounded sample identifies a date/timestamp, do not leave its explicit column as \`columnType:"string"\` unless the user asked for the raw timestamp. Use \`columnType:"datepicker"\` with explicit Moment-style \`dateFormat\` and \`parseDateFormat\` matching the source; enable time only when it carries useful information.\n\n${extractSection(reference, '## Table row-action Button columns')}\n`;

const formRule = componentRuleSections.find((section) => section.publishedName === 'Form')?.markdown ?? '';
const forms = `# Forms and modals\n\nRead this only when the phase contains generated or standalone forms, validation, uploads, or modal layout.\n\n${routedSections.forms
  .map((heading) => extractSection(fullSkill, heading))
  .join('\n\n')}\n\n## Exact Form binding rule\n\n${formRule}\n\n${extractSection(reference, '## Form schema field contracts and upload workaround')}\n`;

const events = makeReference(
  'Events, mutations, and async states',
  'Read this when wiring component, query, page, or Table-column events, and for mutation success/failure/loading behavior.',
  routedSections.events
);
const datasourceRepair = `## Missing or broken datasource recovery

\`list_workspaces\` returns \`datasources_url\`; \`list_datasources\` returns a direct \`settings_url\` for each source. Failed query runs carry a structured \`category\`: connection/authentication failures may return \`recovery:{action:"open_datasource_settings",url,instruction}\`; an \`unknown\` failure returns \`verification:{action:"test_datasource_connection",datasource_id,instruction}\`. Follow those fields instead of inferring from error text, and never substitute another datasource.

When the expected datasource is absent or a connection-backed query fails, explain the failure and ask the user to repair it. If the host has a built-in browser, open the most specific returned URL there; otherwise send the clickable link. Navigation is the only automated action: never enter credentials, authorize OAuth, or save settings for the user. Wait for the user to confirm the repair, then refresh \`list_datasources\` and retry at most one explicitly selected safe read. If it still fails, report the error instead of looping.

\`test_datasource_connection({version_id, datasource_id})\` runs ToolJet's own connection check against the source's STORED credentials — you neither supply nor see them, and it is the one connection action you may take yourself. Use it to tell a broken connection apart from a wrong query before rewriting SQL, and read the \`status\` precisely:

- \`ok\` — the connection works; a failing query is the query's fault.
- \`failed\` — genuinely broken. Say WHY in your own words, quoting the datasource's own message (expired trial, suspended warehouse, refused connection, bad credentials), hand over the returned \`recovery.url\`, and stop building on it. Never restate an external outage as a limitation of yours — "I cannot run queries here" hides a problem the user can fix in two minutes. If you build anyway because they asked you to, repeat the cause and the link in your final handoff.
- \`unsupported\` — this datasource kind publishes no connection test (REST API, GraphQL, and most OAuth/HTTP integrations). It says NOTHING about the connection: never report it as a fault. Verify with one bounded read instead. Which kinds these are is known ahead of the call: \`get_datasource_query_schema\` reports \`supports_test_connection\`, so you can skip the test rather than spend it.
- \`not_permitted\` — this ToolJet user may not test connections. Also not a fault; say so and move on.
- \`inconclusive\` — ToolJet could not prove health or failure. Ask before running the returned bounded-read verification; do not substitute another datasource.`;
const restApiGuidance = `## REST API queries

For \`kind:"restapi"\`, fetch the contract for the intended HTTP method, but do not persist an \`operation\` option: REST queries are selected by \`method\`. \`headers\`, \`url_params\`, \`cookies\`, and structured \`body\` are arrays of two-item \`[key, value]\` tuples. For a raw body use \`body_toggle:true\` with \`raw_body\`; \`json_body\` is a legacy fallback for existing queries.

\`queries.<name>.data\` is the remote response body directly—parsed JSON object/array, text, or supported binary base64—not a normalized row array. For an MCP-side preview, name the exact saved query and obtain separate approval before calling \`run_query\` with \`user_confirmed_remote_read:true\`; only static GET requests are eligible. Inspect \`metadata.request.url/params/headers\` to confirm the resolved request and \`metadata.response.statusCode/headers\` for status, pagination, and rate-limit information. A deployment that reached one public endpoint does not prove outbound access to every host.

Pagination is defined by the remote API. Put its page/limit/cursor fields in \`url_params\`, guard first-load Table state, and bind totals or next cursors from the response body or headers. Avoid one REST request per Table/Listview row; prefer a batch endpoint or enrich only the selected/detail record. Authentication and token repair stay user-owned in datasource settings—never copy, inspect, or author credentials in query options.`;
const datasources = `# Datasources and query contracts

Read this when selecting, connecting, introspecting, or authoring datasource queries. Fetch operation contracts on demand instead of loading unrelated datasource schemas.\n\n${datasourceRepair}\n\n${extractSection(fullSkill, '### Large-data read safety')}\n\n${extractSection(reference, '## Datasource query reference')}\n\n${restApiGuidance}\n`;
const security = makeReference(
  'Security and authorization boundaries',
  'Read this before adding sensitive data access, user-scoped behavior, permissions, or destructive writes.',
  routedSections.security
);
const qa = makeReference(
  'Verification and browser QA',
  'Read this when a page or primary flow is ready to verify. It defines the bounded static, runtime, and visual checks required before claiming the work is complete.',
  routedSections.qa
);
const themeApi = readFileSync(resolve(root, 'docs/theme-api-tool.md'), 'utf8');
const generalComponentRules = componentRuleSections
  .filter((section) => !['Table', 'Form'].includes(section.publishedName))
  .map((section) => section.markdown)
  .join('\n\n');
const components = `# Component contracts and specialized rendering\n\nRead this selectively for exact component binding rules or the built-in palette. Prefer batched, section-filtered \`get_component_catalog\` calls for the types actually used.\n\n${extractSection(reference, '## Built-in components (pick from these first)')}\n\n## Component binding reference\n\n${generalComponentRules}\n\n${extractSection(reference, '## File generation formats')}\n\n${extractSection(reference, '## Kanban card content')}\n\n${extractSection(reference, '## Charts — how to make them render reliably (READ THIS before adding a Chart)')}\n`;

const skill = `---
name: tooljet-app-builder
description: "Build ToolJet apps end-to-end via tooljet-mcp: plan pages, create or reuse data/query/component resources, wire behavior, and verify the result. Use for ToolJet apps, dashboards, internal tools, or changes to existing ToolJet apps."
metadata:
  generated_by: scripts/generate-skill.mjs
  sources:
    - TJ-AI COMPONENT_BINDING_RULES (${componentList.length} components)
    - ToolJet WidgetManager catalog (${catalog.length} built-in components)
    - ToolJet appCanvasConstants (grid mechanics)
---

<!-- GENERATED FILE — do not edit by hand. Run \`node scripts/generate-skill.mjs\` to regenerate every host package. -->

# ToolJet app builder

Build only what ToolJet's real components, connected datasources, and MCP tools support. Never invent a property, action, integration, or successful result. User requirements override the adaptable quality defaults in the references.

## Core workflow

1. Call \`list_workspaces\`; if several exist, confirm and switch before creating anything. Decide the page architecture before components. A simple single-job app can stay on one page; separate substantial jobs into an overview plus focused pages.
2. Treat 3+ substantive pages, 2+ complex workflows, a multi-table model, or multiple integrations as a large build. Before mutations, show the page/phase plan and rough time ranges, then ask for phased checkpoints (recommended) or the whole app in one run. Do not re-ask if the user already chose.
3. Call \`create_app\`, preserve its ids and links, then call \`list_datasources\`. Before calling it, decide the theme (\`references/themes.md\`): if the request names a brand, an industry, or a customer type, derive a theme from it and pass \`theme: { name, definition }\`; otherwise \`create_app\` applies the standard "ToolJet Modern" theme. Report its \`theme.warning\` if one comes back. Fetch only the component, event-action, and datasource contracts needed for the current phase, using one selective batch per contract class, and reuse them. Typed component catalog reads are compact by default; request exact \`sections\` and \`property_keys\`/\`style_keys\` instead of broad full contracts. Confirm a new data model before creating it; ToolJet DB table names are at most 31 characters.
4. Plan a complete useful phase with stable \`client_ref\` values. Root components omit \`parent\` and \`slot_name\`; page ids are not component parents. Await \`lint_app_spec\` as a standalone barrier, fix its errors and review warnings, then pass its one-time \`plan_token\` to \`apply_app_phase\`. Never run the linter alongside a write. Put planned persisted component definition patches in \`component_updates\`; use targeted update tools for ad-hoc repairs, never duplicate resources or rebuild the app. After an error, inspect it and change the repair—never replay an identical mutation.
5. Verify each completed page/primary flow using \`references/qa.md\`. Static validation does not prove runtime query behavior, rendering, or event delivery.
6. Share \`editor_url\` while authoring. After the first meaningful page works, open \`viewer_url\` in the built-in browser when available and reuse that tab. Final handoff includes both links, what works, limitations, and a short tool-call-count efficiency note.

## Datasource repair handoff

If an expected source is absent or a query returns a connection failure, explain the problem and use the returned \`datasources_url\`, \`settings_url\`, or \`recovery.url\`. Open it in the built-in browser when available; otherwise send the clickable link. Do not enter credentials, authorize OAuth, test, or save the connection for the user. Wait for them to confirm the repair, refresh datasource discovery, and retry at most one selected safe read. Read \`references/datasources.md\` for the full contract and large/billable-read safeguards.

## Load only the references the phase needs

- \`references/workflows.md\` — tool selection, plan/apply behavior, repair, reuse, deletion, and silent-failure guardrails.
- \`references/ui-layout.md\` — page design, canvas geometry, nested layouts, charts, and visual defaults.
- \`references/tables.md\` — Table binding, row actions, sizing, and datasource-neutral server-side pagination.
- \`references/forms.md\` — generated-vs-standalone forms, validation, uploads, and modal geometry.
- \`references/events.md\` — component/query/page events, mutation lifecycles, loading, empty, error, and success states.
- \`references/datasources.md\` — connection recovery, exact query shapes, schema introspection, ToolJet DB, SQL, large reads, and billable reads.
- \`references/security.md\` — authorization boundaries, current-user variables, permissions, and sensitive/destructive operations.
- \`references/qa.md\` — static checks, safe runtime checks, the browser audit, triage, and confirmation.
- \`references/components.md\` — selective component palette and exact binding/rendering rules not covered by Table/Form references.
- \`references/themes.md\` — workspace theme creation and management, the exact theme definition structure, app assignment, and token-backed component styling.

Tool schemas, catalog responses, and returned warnings are authoritative. Do not preload every reference. Keep inspection results bounded: use \`get_app_summary\`'s structural default or exact field projections, and request \`detail:"full"\` only after narrowing the target. Reuse earlier catalog, schema, and summary results instead of repeating the same read.

## Non-negotiable safety

- Never author or execute \`SELECT *\` against an unfamiliar table. Count first when size is unknown; above 1,000 rows prefer server-side pagination. Large and billable reads require separate explicit approvals.
- Never run mutations, AI, email, OAuth, or other side effects merely to validate a build.
- Seed writes are insert-only; omit generated serial keys. A duplicate-key failure is never permission to update existing rows.
- Page/query/component/table/column deletion requires exact-target approval plus \`confirm:true\`. Visibility is not authorization.
- Keep app chrome controls distinct: \`hide_header\` hides the app header/banner; \`navigation_position\` places the separate generated navigation menu on the side or top; \`navigation_hidden\` hides that whole menu in either position; and \`update_pages.hidden\` hides only one non-Home page. Home cannot be hidden.
- Batch/phase writes can partially persist. Read reported completed resources and repair in place; never auto-delete or replay the whole batch blindly.
`;

const references = {
  'workflows.md': workflows,
  'ui-layout.md': uiLayout,
  'tables.md': tables,
  'forms.md': forms,
  'events.md': events,
  'datasources.md': datasources,
  'security.md': security,
  'qa.md': qa,
  'components.md': components,
  'themes.md': themeApi,
};

const hostSkillRoots = [
  resolve(root, 'skill'),
  resolve(root, 'skills/tooljet-app-builder'),
];
const canonicalAudit = resolve(root, 'skill/scripts/browser-audit.js');
for (const outputRoot of hostSkillRoots) {
  const referencesDir = resolve(outputRoot, 'references');
  rmSync(referencesDir, { recursive: true, force: true });
  mkdirSync(referencesDir, { recursive: true });
  writeFileSync(resolve(outputRoot, 'SKILL.md'), skill.trimEnd() + '\n');
  for (const [name, content] of Object.entries(references)) {
    writeFileSync(resolve(referencesDir, name), content.trimEnd() + '\n');
  }
  if (outputRoot !== hostSkillRoots[0]) {
    const scriptsDir = resolve(outputRoot, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });
    copyFileSync(canonicalAudit, resolve(scriptsDir, 'browser-audit.js'));
  }
}

console.log(
  `Generated 2 host packages from one source: SKILL.md (${skill.trim().split(/\s+/).length} words) + ` +
    `${Object.keys(references).length} focused references — ${componentList.length} components, grid ${grid.columns} cols / ${grid.rowSnapPx}px snap.`
);
