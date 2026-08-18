// Harvests per-component property schemas from ToolJet's widget definitions into
// data/component-schemas.json, which the get_component_catalog tool serves on demand.
// Gives Codex the real props (name, type, default) + defaultSize + styles for every
// built-in component, so it can configure any of them without guessing.
//
// Usage: node scripts/generate-catalog.mjs   (env: TOOLJET_ROOT)
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLJET = process.env.TOOLJET_ROOT || resolve(homedir(), 'Claude/Projects/ToolJet/ToolJet');
const widgetsDir = resolve(TOOLJET, 'frontend/src/AppBuilder/WidgetManager/widgets');

// --- AST helpers ---
const keyName = (p) => (p.key.type === 'Identifier' ? p.key.name : p.key.value);
function prop(obj, name) {
  if (!obj || obj.type !== 'ObjectExpression') return undefined;
  const p = obj.properties.find((pr) => pr.type === 'ObjectProperty' && keyName(pr) === name);
  return p ? p.value : undefined;
}
// Resolve a node to a plain JS value ONLY if it is a literal (else undefined).
function literal(node) {
  if (!node) return undefined;
  switch (node.type) {
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NumericLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'TemplateLiteral':
      if (node.expressions.length === 0) return node.quasis[0]?.value?.cooked ?? '';
      return undefined;
    case 'UnaryExpression':
      if (node.operator === '-' && node.argument.type === 'NumericLiteral') return -node.argument.value;
      return undefined;
    case 'ArrayExpression': {
      const out = [];
      for (const el of node.elements) {
        const v = literal(el);
        if (v === undefined && el) return undefined; // non-literal element → give up
        out.push(v);
      }
      return out;
    }
    case 'ObjectExpression': {
      const out = {};
      for (const pr of node.properties) {
        if (pr.type !== 'ObjectProperty') return undefined;
        const v = literal(pr.value);
        if (v === undefined && pr.value.type !== 'NullLiteral') return undefined;
        out[keyName(pr)] = v;
      }
      return out;
    }
    default:
      return undefined;
  }
}
const strProp = (obj, name) => {
  const v = literal(prop(obj, name));
  return typeof v === 'string' ? v : undefined;
};
// Long code/sample defaults (e.g. a Table's demo rows) are noise — Codex binds real data. Trim them.
function trimDefault(v) {
  if (typeof v === 'string' && v.length > 160) return v.slice(0, 157).replace(/\s+/g, ' ').trim() + '…';
  return v;
}

// Find the exported config ObjectExpression (has a `name` string prop).
function findConfig(ast) {
  const objs = [];
  const visit = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'ObjectExpression' && strProp(n, 'name') && (prop(n, 'properties') || prop(n, 'defaultSize')))
      objs.push(n);
    for (const k of Object.keys(n)) {
      const c = n[k];
      if (Array.isArray(c)) c.forEach(visit);
      else if (c && typeof c.type === 'string') visit(c);
    }
  };
  visit(ast.program);
  return objs[0];
}

function extractProps(config) {
  // (1) editor `properties` schema → prop type + label (+ a fallback default)
  const meta = {};
  const order = [];
  const propsObj = prop(config, 'properties');
  if (propsObj && propsObj.type === 'ObjectExpression') {
    for (const pr of propsObj.properties) {
      if (pr.type !== 'ObjectProperty' || pr.value.type !== 'ObjectExpression') continue;
      const def = pr.value;
      const editorType = strProp(def, 'type');
      if (editorType === 'sectionHeader' || editorType === 'sectionSubHeader') continue; // UI dividers
      const validation = prop(def, 'validation');
      const schema = validation && validation.type === 'ObjectExpression' ? prop(validation, 'schema') : undefined;
      const key = keyName(pr);
      order.push(key);
      meta[key] = {
        key,
        label: strProp(def, 'displayName'),
        valueType: schema ? strProp(schema, 'type') : undefined,
        default: validation ? trimDefault(literal(prop(validation, 'defaultValue'))) : undefined,
      };
    }
  }
  // (2) `definition.properties` → the instance default { value } shape (authoritative default)
  const defProps = prop(prop(config, 'definition'), 'properties');
  if (defProps && defProps.type === 'ObjectExpression') {
    for (const pr of defProps.properties) {
      if (pr.type !== 'ObjectProperty' || pr.value.type !== 'ObjectExpression') continue;
      const key = keyName(pr);
      const val = trimDefault(literal(prop(pr.value, 'value')));
      if (!meta[key]) {
        order.push(key);
        meta[key] = { key, label: undefined, valueType: undefined, default: val };
      } else if (val !== undefined) {
        meta[key].default = val; // prefer the actual instance default
      }
    }
  }
  return order.map((k) => meta[k]);
}

function extractStyles(config) {
  const stylesObj = prop(config, 'styles');
  if (!stylesObj || stylesObj.type !== 'ObjectExpression') return [];
  return stylesObj.properties
    .filter((pr) => pr.type === 'ObjectProperty' && pr.value.type === 'ObjectExpression')
    .map((pr) => {
      const validation = prop(pr.value, 'validation');
      const schema = validation && validation.type === 'ObjectExpression' ? prop(validation, 'schema') : undefined;
      return {
        key: keyName(pr),
        label: strProp(pr.value, 'displayName'),
        valueType: schema ? strProp(schema, 'type') : undefined,
        default: validation ? trimDefault(literal(prop(validation, 'defaultValue'))) : undefined,
      };
    })
    .filter((s) => s.label); // drop section dividers (no label)
}

function extractEvents(config) {
  const events = prop(config, 'events');
  if (!events || events.type !== 'ObjectExpression') return [];
  return events.properties
    .filter((pr) => pr.type === 'ObjectProperty')
    .map((pr) => ({
      id: keyName(pr),
      label: pr.value.type === 'ObjectExpression' ? strProp(pr.value, 'displayName') : undefined,
    }));
}

function extractActions(config) {
  const actions = literal(prop(config, 'actions'));
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((action) => action && typeof action === 'object' && typeof action.handle === 'string')
    .map(({ handle, displayName, params }) => ({
      handle,
      ...(typeof displayName === 'string' ? { displayName } : {}),
      ...(Array.isArray(params) ? { params } : {}),
    }));
}

function extractExposedVariables(config) {
  const exposed = prop(config, 'exposedVariables');
  if (!exposed || exposed.type !== 'ObjectExpression') return [];
  return exposed.properties
    .filter((pr) => pr.type === 'ObjectProperty')
    .map((pr) => {
      const value = trimDefault(literal(pr.value));
      return { name: keyName(pr), ...(value !== undefined ? { default: value } : {}) };
    });
}

// Legacy components we deliberately hide from agents — a modern replacement exists, so surfacing
// the old one just invites the agent to pick the wrong (deprecated) widget.
//   DropDown    -> use DropdownV2
//   Multiselect -> use MultiselectV2
const LEGACY_EXCLUDED = new Set(['DropDown', 'Multiselect']);

// --- Harvest ---
const files = readdirSync(widgetsDir).filter((f) => /\.(js|ts)$/.test(f) && f !== 'index.js');
const schemas = {};
const skipped = [];
for (const f of files) {
  const src = readFileSync(resolve(widgetsDir, f), 'utf8');
  let ast;
  try {
    ast = parse(src, { sourceType: 'module', plugins: ['jsx', ...(f.endsWith('.ts') ? ['typescript'] : [])] });
  } catch {
    skipped.push(f + ' (parse)');
    continue;
  }
  const config = findConfig(ast);
  if (!config) {
    skipped.push(f + ' (no config)');
    continue;
  }
  const name = strProp(config, 'name');
  const type = strProp(config, 'component') || name;
  if (LEGACY_EXCLUDED.has(type)) {
    skipped.push(f + ' (legacy — replaced by a V2)');
    continue;
  }
  schemas[type] = {
    type,
    name,
    description: strProp(config, 'description'),
    defaultSize: literal(prop(config, 'defaultSize')),
    properties: extractProps(config),
    styles: extractStyles(config),
    events: extractEvents(config),
    actions: extractActions(config),
    exposedVariables: extractExposedVariables(config),
    defaultChildren: literal(prop(config, 'defaultChildren')),
  };
}

// Some runtime variables are created by the widget implementation and are intentionally absent
// from the editor config. Keep these tiny, source-verified additions next to the generator rather
// than teaching the skill stale prose.
const RUNTIME_EXPOSED_VARIABLES = {
  Form: [{ name: 'formData', default: {} }, { name: 'children', default: {} }],
  Table: [
    { name: 'currentData', default: [] },
    { name: 'currentPageData', default: [] },
    { name: 'filteredData', default: [] },
    { name: 'sortApplied', default: [] },
    { name: 'newRows', default: [] },
    { name: 'updatedData', default: [] },
  ],
};
for (const [type, variables] of Object.entries(RUNTIME_EXPOSED_VARIABLES)) {
  if (!schemas[type]) continue;
  const known = new Set((schemas[type].exposedVariables || []).map((variable) => variable.name));
  schemas[type].exposedVariables.push(...variables.filter((variable) => !known.has(variable.name)));
}

// Curated rendering hints (not harvestable from the widget defs) — sizing/readability defaults the
// design guardrails reference, served as DATA via get_component_catalog(type) so the agent reads them
// rather than relying on prose. Defaults, not hard limits.
const RENDERING_HINTS = {
  Chart: {
    recommendedWidthCols: '≈13–15 for a compact few-category pie/donut; ≈20–24 for a categorical bar with longer labels',
    maxPerContentRow: 2,
    note: 'Native title clips at common dashboard sizes — set title.value="" and put a separate Text heading above the chart; enable a native title only after visual verification.',
  },
  Statistics: {
    recommendedMinHeightPx: '≈110–120 for a compact tile with no visible secondary content; ≈130–150 with useful secondary content',
  },
  ModalV2: {
    childCoordinateSpace: 'Modal-local 43-column grid; child (0,0) is the modal body top-left.',
    recommendedFieldAlignment: 'top',
    recommendedFieldHeightPx: '60–70',
    recommendedVerticalGapPx: '20 (the canvas snaps to 10px)',
    recommendedTwoColumnGutterCols: 2,
  },
};
for (const t of ['TextInput', 'NumberInput', 'CurrencyInput', 'EmailInput', 'TextArea', 'DropdownV2', 'MultiselectV2', 'DatePickerV2', 'DatetimePickerV2']) {
  RENDERING_HINTS[t] = {
    ...(RENDERING_HINTS[t] ?? {}),
    formLabelAlignment: 'Use styles.alignment.value="top" in forms, modals, and fields 18 columns or narrower.',
  };
}
for (const [t, hints] of Object.entries(RENDERING_HINTS)) {
  if (schemas[t]) schemas[t].renderingHints = hints;
}

mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(resolve(root, 'data/component-schemas.json'), JSON.stringify(schemas, null, 2) + '\n');
const total = Object.keys(schemas).length;
const withProps = Object.values(schemas).filter((s) => s.properties.length).length;
console.log(`Harvested ${total} components (${withProps} with property schemas). Skipped: ${skipped.length ? skipped.join(', ') : 'none'}`);
