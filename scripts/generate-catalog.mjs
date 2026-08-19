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
const tableButtonManager = resolve(
  TOOLJET,
  'frontend/src/AppBuilder/RightSideBar/Inspector/Components/Table/hooks/useButtonManager.js'
);

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

function allowedValues(definition) {
  const options = literal(prop(definition, 'options'));
  if (!Array.isArray(options)) return undefined;
  const values = options.flatMap((option) => {
    if (!option || typeof option !== 'object' || !Object.prototype.hasOwnProperty.call(option, 'value')) return [];
    const value = option.value;
    return ['string', 'number', 'boolean'].includes(typeof value) ? [value] : [];
  });
  return values.length ? [...new Set(values)] : undefined;
}

// These defaults are compact machine-readable contracts, not decorative demo data. Keeping them
// exact lets callers request one property (via property_keys) without loading an entire component
// schema or leaving the catalog for external documentation.
const EXACT_PROPERTY_DEFAULTS = new Set([
  'Calendar:events',
  'Timeline:data',
  'DropdownV2:schema',
]);

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

/** Read a source-exported literal so authoring contracts stay synchronized with ToolJet itself. */
function readNamedLiteral(file, variableName) {
  const ast = parse(readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  let value;
  const visit = (node) => {
    if (!node || typeof node !== 'object' || value !== undefined) return;
    if (
      node.type === 'VariableDeclarator' &&
      node.id?.type === 'Identifier' &&
      node.id.name === variableName
    ) {
      value = literal(node.init);
      return;
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };
  visit(ast.program);
  if (value === undefined) throw new Error(`Could not extract literal ${variableName} from ${file}`);
  return value;
}

function extractProps(config, componentType) {
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
        allowedValues: allowedValues(def),
      };
    }
  }
  // (2) `definition.properties` → the instance default { value } shape (authoritative default)
  const defProps = prop(prop(config, 'definition'), 'properties');
  if (defProps && defProps.type === 'ObjectExpression') {
    for (const pr of defProps.properties) {
      if (pr.type !== 'ObjectProperty' || pr.value.type !== 'ObjectExpression') continue;
      const key = keyName(pr);
      const rawValue = literal(prop(pr.value, 'value'));
      const val = EXACT_PROPERTY_DEFAULTS.has(`${componentType}:${key}`) ? rawValue : trimDefault(rawValue);
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
        allowedValues: allowedValues(pr.value),
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
    properties: extractProps(config, type),
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
  DropdownV2: [{ name: 'value' }, { name: 'selectedOption' }, { name: 'options' }],
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

// Dependencies that ToolJet's flat inspector schema cannot express. Keep them on the individual
// property so a selective property_keys lookup remains both small and sufficient to author safely.
if (schemas.DropdownV2) {
  const dynamicSchema = schemas.DropdownV2.properties.find((property) => property.key === 'schema');
  if (dynamicSchema) {
    dynamicSchema.requires = { advanced: '{{true}}' };
    dynamicSchema.mutuallyExclusiveWith = ['options'];
  }
  const staticOptions = schemas.DropdownV2.properties.find((property) => property.key === 'options');
  if (staticOptions) {
    staticOptions.requires = { advanced: '{{false}}' };
    staticOptions.mutuallyExclusiveWith = ['schema'];
  }
}

// Curated rendering hints (not harvestable from the widget defs) — sizing/readability defaults the
// design guardrails reference, served as DATA via get_component_catalog(type) so the agent reads them
// rather than relying on prose. Defaults, not hard limits.
const RENDERING_HINTS = {
  Text: {
    minimumSingleLineHeight: 'ceil(textSize * lineHeight + 6px) for static height; round up to ToolJet\'s 10px grid',
    headingExamples: { '24px at 1.5 line-height': '50px authored height', '32px at 1.5 line-height': '60px authored height' },
    note: 'The canvas wrapper and Text border consume 6px. A 24px Text at the default 1.5 line-height needs 42px, so the default 40px component clips glyphs/descenders. Use 50px, or dynamicHeight for wrapping content.',
  },
  Chart: {
    recommendedWidthCols: '≈13–15 for a compact few-category pie/donut; ≈20–24 for a categorical bar with longer labels',
    maxPerContentRow: 2,
    note: 'Native title clips at common dashboard sizes — set title.value="" and put a separate Text heading above the chart; enable a native title only after visual verification.',
  },
  Statistics: {
    recommendedMinHeightPx: '≈110–120 for a compact tile with no visible secondary content; ≈130–150 with useful secondary content',
    recommendedMinWidthCols: 'At least 12 for a value-only tile with hideSecondary=true; at least 18 when secondary content is visible. Prefer at most three value-only or two secondary-content tiles per content row.',
    secondaryValueUsage: 'secondaryValue renders in a narrow delta slot: reserve it for a number or percentage. Put prose in secondaryValueLabel and leave secondaryValue empty.',
  },
  Table: {
    visibleRowCapacity: {
      regularRowHeightPx: 46,
      condensedRowHeightPx: 40,
      fixedChromePx: '≈154 with the default 56px toolbar, 40px column header, 56px footer, and borders',
      formula: 'minimum static height ≈ fixed chrome + rowsPerPage × row height',
      rule: 'If authored height is smaller, the page rows remain reachable through an inner scrollbar but appear clipped. Reduce rowsPerPage, use dynamicHeight, or increase the authored height.',
    },
  },
  ModalV2: {
    childCoordinateSpace: 'Modal-local 43-column grid; child (0,0) is the modal body top-left.',
    recommendedFieldAlignment: 'top',
    recommendedSingleLineFieldHeightPx: 40,
    topAlignedRenderedFootprintPx: 60,
    recommendedFieldRowStepPx: '70 (40px authored + 20px label/validation footprint + 10px gap)',
    recommendedTextAreaHeightPx: '90–100',
    recommendedTwoColumnGutterCols: 2,
  },
};
for (const t of ['TextInput', 'NumberInput', 'CurrencyInput', 'EmailInput', 'TextArea', 'DropdownV2', 'MultiselectV2', 'DatePickerV2', 'DatetimePickerV2']) {
  RENDERING_HINTS[t] = {
    ...(RENDERING_HINTS[t] ?? {}),
    formLabelAlignment: 'Use styles.alignment.value="top" in forms, modals, and fields 18 columns or narrower.',
  };
}
for (const t of ['TextInput', 'NumberInput', 'CurrencyInput', 'EmailInput', 'DropdownV2', 'MultiselectV2', 'DatePickerV2', 'DatetimePickerV2']) {
  if (!schemas[t]) continue;
  RENDERING_HINTS[t] = {
    ...(RENDERING_HINTS[t] ?? {}),
    compactFormHeight: 'Use the harvested defaultSize.height (normally 40px) for a standard single-line field. With a top label it occupies about 60px; use a 70px top-to-top row step for a 10px gap.',
    valueTextSizing: 'Authored height does not enlarge the value text. Only labelFontSize is exposed; oversized fields make the unchanged value text look too small.',
  };
}
for (const [t, hints] of Object.entries(RENDERING_HINTS)) {
  if (schemas[t]) schemas[t].renderingHints = hints;
}

// Authoring contracts that are nested inside component properties rather than represented by the
// top-level widget property schema. `actions` above means control-component runtime methods; it is
// not the deprecated Table action-buttons property and not the modern per-row Button-column shape.
const TABLE_BUTTON_DEFAULTS = readNamedLiteral(tableButtonManager, 'DEFAULT_BUTTON');
const FORM_SCHEMA_FIELD_TYPES = [
  'textinput', 'textarea', 'dropdown', 'multiselect', 'number', 'emailinput', 'password',
  'datepicker', 'checkbox', 'radio', 'toggle', 'starrating', 'filepicker',
];
const SAFE_GENERATED_FORM_FIELD_TYPES = [
  'textinput', 'number', 'emailinput', 'password', 'datepicker', 'checkbox',
];
const AUTHORING_HINTS = {
  ModalV2: {
    nativeSlots: {
      mcpField: 'slot_name',
      allowedValues: ['header', 'body', 'footer'],
      defaultValue: 'body',
      rule: 'Put the modal title Text in header, fields/content in body, and native action buttons in footer. Do not leave showHeader enabled with an empty header and add a duplicate title row to the body.',
      parentRule: 'Set parent_ref for a same-batch modal or parent for an existing modal; coordinates are relative to the selected slot canvas.',
    },
  },
  DropdownV2: {
    optionModes: {
      rule: 'ToolJet reads schema only when advanced=true; otherwise it silently renders options.',
      static: {
        modeProperty: 'properties.advanced.value',
        modeValue: '{{false}}',
        dataProperty: 'properties.options.value',
      },
      dynamic: {
        modeProperty: 'properties.advanced.value',
        modeValue: '{{true}}',
        dataProperty: 'properties.schema.value',
      },
      preselectionRule: 'The selected option must have visible=true and default=true.',
    },
  },
  Form: {
    jsonSchemaFields: {
      supportedTypes: FORM_SCHEMA_FIELD_TYPES,
      safeGeneratedTypes: SAFE_GENERATED_FORM_FIELD_TYPES,
      exactTypeRule: 'Use these exact lowercase names; aliases such as email, star, and file are invalid.',
      decisionRule: 'Use generated Form only when every field is one of safeGeneratedTypes. If any field needs dropdown, multiselect, textarea, radio, toggle, starrating, or filepicker, build the entire form from standalone components.',
      selectContract: 'dropdown/multiselect use values plus displayValues, not options.',
      validationContract: 'There is no required flag; use validation.minLength or validation.customRule.',
      unsafeTypes: {
        filepicker: 'Currently crashes the entire Form while reading minSize. Use a standalone FilePicker component.',
      },
      standaloneFilePickerValue: 'components.<picker>.file is an array of {name, content, dataURL, type, parsedValue}.',
      emptyDateValue: '{{null}}',
      standaloneLayout: 'Set styles.alignment.value="top" on every labelled input; use one aligned two-column grid for compact fields and full-width TextArea fields.',
      hardLayoutLimit: 'FormUtils does not pass alignment through to generated fields. Dropdown/Multiselect labels are misaligned and TextArea retains a literal "Label" and can render as a single-line control.',
      standaloneReplacement: {
        batchRule: 'Create the full field set and its modal/container parent in one add_components call using client_ref/parent_ref.',
        alignment: { path: 'styles.alignment.value', value: 'top' },
        requiredValidationPath: 'validation.mandatory',
        valuePath: 'components.<field>.value',
        fileValuePath: 'components.<picker>.file[0]',
        compactFieldLayout: 'Use a consistent two-column grid with one shared gutter.',
        textAreaLayout: 'Use a full-width, multi-line TextArea aligned to the same left/right edges.',
        conditionalVisibility: 'Bind visibility on each standalone component; do not place corrective fields beside a generated Form.',
      },
    },
  },
  KeyValuePair: {
    dataProjection: {
      rule: 'An explicit fields array does not suppress undeclared keys from data; ToolJet appends those keys as visible rows. Bind data to a new object containing only intended field keys.',
      safeExample: '{{({work_order:variables.selectedWorkOrder.wo_ref,client:variables.selectedWorkOrder.client_name,status:variables.selectedWorkOrder.status})}}',
      unsafeExamples: ['{{variables.selectedWorkOrder}}', '{{({...variables.selectedWorkOrder, status:variables.selectedWorkOrder.status})}}'],
      updateRule: 'Keep the complete fields array and the projected data object keyed identically. Object spreads are not safe projections.',
      defaultFieldRule: 'When explicit fields are authored, MCP populates fieldDeletionHistory to suppress ToolJet catalog demo fields that would otherwise be appended or positionally merged into custom field definitions.',
    },
  },
  Kanban: {
    cardContent: {
      renderingRule: 'A card body is rendered by child components bound to cardData.*. Valid columns, cards, and counts can still show blank card bodies when no child is parented to the Kanban.',
      mcpDefaultRule: 'add_component(s) materializes the catalog default card children only when no explicit same-batch child targets the Kanban client_ref.',
      customChildRule: 'For custom card content, give the Kanban a client_ref and create one or more children with the matching parent_ref in the same add_components call.',
      wrappedText: {
        recommendedComponent: 'Html',
        propertyPath: 'properties.rawHtml.value',
        rule: 'Nested Text clips to one line; use one Html child with normal wrapping/overflow-wrap CSS for multi-line title and description content.',
        bindingContext: ['cardData'],
      },
      widthRule: 'Do not infer the rendered Kanban column width from cardWidth. Pin the Html content width/max-width explicitly in CSS and verify it in the viewer; current columns can retain a wider minimum than the card canvas.',
    },
  },
  Table: {
    runtimeCompatibility: {
      autogenerateColumns: true,
      useDynamicColumn: '{{false}}',
      rule: 'For explicit static columns, keep table-level autogenerateColumns=true and useDynamicColumn=false. MCP normalizes these defaults because some ToolJet versions crash while generating column transformations when autogenerateColumns is false.',
    },
    dataProjection: {
      rule: 'With explicit columns and autogenerateColumns=true, bind data to a new object containing only visible and behavior-needed keys. A .map(r => r) identity map or {...r} spread is not a projection and can leak undeclared datasource fields.',
      safeExample: '{{queries.listRows.data.map(r => ({id:r.id,name:r.name,status:r.status}))}}',
      unsafeExamples: ['{{queries.listRows.data.map(r => r)}}', '{{queries.listRows.data.map(r => ({...r,name:r.name}))}}'],
    },
    hiddenDataColumns: {
      rule: 'When a field is needed by row actions or selectedRow but must not display, keep it in Table data and declare it in columns with columnVisibility=false. This preserves the key while preventing autogenerateColumns from leaking it as a visible column.',
      columnExample: {
        id: 'record-id',
        name: 'ID',
        key: 'id',
        columnType: 'string',
        columnVisibility: false,
        autogenerated: false,
      },
    },
    rowActionButtons: {
      recommendedApproach: 'Add a column with columnType="button"; legacy properties.actions.value is deprecated.',
      catalogActionsMeaning: 'Top-level schema.actions are control-component runtime methods, not row-action buttons.',
      propertyPath: 'properties.columns.value[]',
      updateRule: 'Append this column to the complete current columns array; ToolJet replaces arrays wholesale.',
      columnExample: {
        id: 'actions-column',
        name: 'Actions',
        key: 'actions',
        columnType: 'button',
        columnVisibility: true,
        horizontalAlignment: 'left',
        pinPosition: 'right',
        autogenerated: false,
        buttons: [{ id: 'view-action', ...TABLE_BUTTON_DEFAULTS, buttonLabel: 'View' }],
      },
      expressionContext: {
        available: ['rowData', 'cellValue'],
        example: 'Set buttonVisibility to {{rowData.status !== "archived"}} for per-row behavior.',
      },
      cellExpressionContext: {
        rowData: 'The source row object.',
        cellValue: 'The displayed/transformed cell value. For color/visibility rules that need the original field, read rowData.<field> instead.',
      },
      clickBehavior: 'Clicking sets the Table selectedRow and selectedRowId before event handlers run.',
      eventExample: {
        source_id: '<table component id>',
        source_type: 'table_column',
        ref: 'actions::view-action',
        trigger: 'onClick',
        action: { actionId: 'run-query', queryId: '<query id>', queryName: '<query name>' },
      },
      eventRule: 'ref is <column key or name>::<button id>; use components.<table>.selectedRow in the action.',
    },
  },
};
for (const [type, hints] of Object.entries(AUTHORING_HINTS)) {
  if (schemas[type]) schemas[type].authoringHints = hints;
}

mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(resolve(root, 'data/component-schemas.json'), JSON.stringify(schemas, null, 2) + '\n');
const total = Object.keys(schemas).length;
const withProps = Object.values(schemas).filter((s) => s.properties.length).length;
console.log(`Harvested ${total} components (${withProps} with property schemas). Skipped: ${skipped.length ? skipped.join(', ') : 'none'}`);
