// Compile compact, operation-specific query contracts from ToolJet's core and marketplace plugins.
// Connection manifests contribute public name/kind/type metadata only; credentials are never copied.
// Raw operation metadata remains available for explicit diagnostic requests, while normal MCP calls use
// the much smaller normalized contracts. Static datasources are curated from first-party editors/runtime.
//
// Usage: node scripts/generate-datasource-catalog.mjs   (env: TOOLJET_ROOT)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLJET = process.env.TOOLJET_ROOT || resolve(homedir(), 'Claude/Projects/ToolJet/ToolJet');
const pluginCollections = [
  { name: 'core', dir: resolve(TOOLJET, 'plugins/packages') },
  { name: 'marketplace', dir: resolve(TOOLJET, 'marketplace/plugins') },
];
const overridesPath = resolve(root, 'data/datasource-contract-overrides.json');
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
const sortedObject = (value) =>
  Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));

function inferValueType(field) {
  const type = String(field.type || '').toLowerCase();
  if (type.includes('toggle') || type.includes('checkbox')) return 'boolean|binding';
  if (type.includes('dropdown') || type === 'dynamic-selector') return 'string|binding';
  if (type.includes('headers') || type.includes('key-value')) return 'array|record|binding';
  if (type.includes('code')) return 'unknown|binding';
  return type || 'unknown';
}

function normalizeField(field) {
  const path = typeof field.parse_key === 'string' ? field.parse_key : field.key;
  const normalized = {
    path,
    type: inferValueType(field),
    ...(field.label ? { label: field.label } : {}),
    ...(field.description ? { description: field.description } : {}),
    ...(field.mandatory === true ? { required: true } : {}),
  };
  if (Array.isArray(field.list)) {
    const allowedValues = field.list.map((item) => item?.value).filter((value) => typeof value === 'string');
    if (allowedValues.length) normalized.allowedValues = allowedValues;
  }
  return normalized;
}

function directFields(container) {
  const fields = {};
  for (const value of Object.values(container || {})) {
    if (!isObject(value) || typeof value.key !== 'string') continue;
    const field = normalizeField(value);
    fields[field.path] = field;
    // SQL mode selectors embed dynamic host/database fields inside commonFields.
    if (isObject(value.commonFields)) Object.assign(fields, directFields(value.commonFields));
  }
  return fields;
}

function branchSelector(container) {
  const candidates = [];
  for (const value of Object.values(container || {})) {
    if (!isObject(value) || typeof value.key !== 'string' || !Array.isArray(value.list)) continue;
    const matchingValues = value.list
      .map((item) => item?.value)
      .filter((item) => typeof item === 'string' && isObject(container[item]));
    if (matchingValues.length) candidates.push({ field: value, matchingValues });
  }
  const priority = { operation: 0, mode: 1, model: 2 };
  candidates.sort((left, right) => {
    const lp = priority[left.field.key] ?? 10;
    const rp = priority[right.field.key] ?? 10;
    return lp - rp || right.matchingValues.length - left.matchingValues.length;
  });
  return candidates[0] || null;
}

function compileLeaves(container, selections = {}, inheritedFields = {}) {
  const fields = { ...inheritedFields, ...directFields(container) };
  const selector = branchSelector(container);
  if (!selector) return [{ when: selections, fields }];

  const leaves = [];
  for (const value of selector.matchingValues) {
    leaves.push(
      ...compileLeaves(container[value], { ...selections, [selector.field.key]: value }, fields)
    );
  }
  return leaves;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function compactVariants(leaves) {
  const groups = new Map();
  for (const leaf of leaves) {
    const fields = sortedObject(leaf.fields);
    const required = [...new Set([
      ...Object.keys(leaf.when),
      ...Object.values(fields).filter((field) => field.required).map((field) => field.path),
    ])].sort();
    const signature = JSON.stringify(stable({ fields, required }));
    const existing = groups.get(signature) || { whens: [], fields, required };
    existing.whens.push(leaf.when);
    groups.set(signature, existing);
  }

  return [...groups.values()].map((group) => {
    const when = {};
    for (const selection of group.whens) {
      for (const [key, value] of Object.entries(selection)) {
        const values = new Set(when[key] || []);
        values.add(value);
        when[key] = [...values].sort();
      }
    }
    return { when: sortedObject(when), fields: group.fields, required: group.required };
  });
}

function operationForLeaf(leaf) {
  return leaf.when.operation || leaf.when.mode || 'default';
}

function compileContracts(properties) {
  const grouped = new Map();
  for (const leaf of compileLeaves(properties)) {
    const operation = operationForLeaf(leaf);
    const leaves = grouped.get(operation) || [];
    leaves.push(leaf);
    grouped.set(operation, leaves);
  }
  return Object.fromEntries(
    [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([operation, leaves]) => [operation, { operation, variants: compactVariants(leaves) }])
  );
}

function introspectionMethods(properties) {
  const methods = new Set();
  const visit = (value) => {
    if (!isObject(value) && !Array.isArray(value)) return;
    if (isObject(value)) {
      for (const [key, child] of Object.entries(value)) {
        if ((key === 'invokeMethod' || key === 'invoke_method') && typeof child === 'string') methods.add(child);
        visit(child);
      }
    } else {
      value.forEach(visit);
    }
  };
  visit(properties);
  return [...methods].sort();
}

function applyOverrides(kind, contracts) {
  const kindOverrides = overrides[kind]?.operations || {};
  for (const [operation, operationOverride] of Object.entries(kindOverrides)) {
    const contract = contracts[operation] || { operation, variants: [] };
    if (operationOverride.response) contract.response = operationOverride.response;
    if (operationOverride.notes) contract.notes = operationOverride.notes;
    for (const variant of contract.variants) {
      if (Array.isArray(operationOverride.required)) {
        variant.required = [...new Set([...variant.required, ...operationOverride.required])].sort();
      }
      for (const [path, fieldOverride] of Object.entries(operationOverride.fields || {})) {
        if (variant.fields[path]) variant.fields[path] = { ...variant.fields[path], ...fieldOverride, path };
      }
    }
    contracts[operation] = contract;
  }
  return contracts;
}

function field(path, type, extra = {}) {
  return { path, type, ...extra };
}

function oneVariant(operation, fields, required = [], when = {}) {
  return {
    operation,
    variants: [{
      when: Object.fromEntries(Object.entries(when).map(([key, value]) => [key, [value]])),
      fields: sortedObject(Object.fromEntries(fields.map((item) => [item.path, item]))),
      required: [...new Set(required)].sort(),
    }],
  };
}

const schemas = {};
let pluginDefinitions = 0;
for (const collection of pluginCollections) {
  if (!existsSync(collection.dir)) continue;
  for (const packageName of readdirSync(collection.dir)) {
    const libDir = resolve(collection.dir, packageName, 'lib');
    const manifestPath = resolve(libDir, 'manifest.json');
    const operationsPath = resolve(libDir, 'operations.json');
    if (!existsSync(manifestPath) || !existsSync(operationsPath)) continue;
    pluginDefinitions += 1;

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const querySchema = JSON.parse(readFileSync(operationsPath, 'utf8'));
    const source = manifest['tj:source'] || manifest.source;
    if (!source?.kind) {
      throw new Error(`${collection.name}/${packageName} has manifest.json + operations.json but no datasource kind.`);
    }

    const properties = querySchema.properties || {};
    const contracts = applyOverrides(source.kind, compileContracts(properties));
    const existing = schemas[source.kind];
    const sourceEntry = { collection: collection.name, package: packageName };
    // Core wins the only current duplicate (s3); still record every discovered source for coverage.
    if (existing) {
      existing.sources.push(sourceEntry);
      continue;
    }
    const operations = Object.keys(contracts).filter((operation) => operation !== 'default');
    schemas[source.kind] = {
      kind: source.kind,
      name: source.name || querySchema.title || source.kind,
      type: source.type || querySchema.type,
      description: querySchema.description,
      defaults: querySchema.defaults || {},
      operations,
      contracts,
      properties,
      introspectionMethods: introspectionMethods(properties),
      sources: [sourceEntry],
    };
  }
}

const commonRestFields = [
  field('method', 'string', { allowedValues: ['get', 'post', 'put', 'patch', 'delete'] }),
  field('url', 'string|binding'),
  field('url_params', 'array'),
  field('headers', 'array'),
  field('cookies', 'array'),
  field('body_toggle', 'boolean'),
  field('body', 'array'),
  field('json_body', 'object|string|null'),
  field('retry_network_errors', 'boolean|null'),
];
const restContracts = Object.fromEntries(
  ['get', 'post', 'put', 'patch', 'delete'].map((method) => [
    method,
    oneVariant(method, commonRestFields, ['method', 'url'], { method }),
  ])
);

const tooljetCommon = [
  field('operation', 'string'),
  field('table_id', 'string'),
];
const tooljetWhereFilters = {
  type: 'record',
  description: 'Map of stable ids to filter clauses. `id` is optional metadata; `jsonpath` is optional for JSONB columns.',
  shape: {
    '<filter-id>': {
      column: 'string',
      operator: 'eq|gt|gte|lt|lte|neq|like|ilike|match|imatch|in|is',
      value: 'unknown|binding (use null or not_null with operator is)',
      'id?': 'string',
      'jsonpath?': 'string',
    },
  },
  example: {
    'filter-status': { id: 'filter-status', column: 'status', operator: 'eq', value: 'Open' },
  },
};
const tooljetOrderFilters = {
  type: 'record',
  description: 'Map of stable ids to sort clauses.',
  shape: {
    '<sort-id>': { column: 'string', order: 'asc|desc', 'id?': 'string', 'jsonpath?': 'string' },
  },
  example: {
    'sort-created': { id: 'sort-created', column: 'created_at', order: 'desc' },
  },
};
const tooljetAggregates = {
  type: 'record',
  description: 'Map of stable ids to ToolJet DB aggregate clauses. ToolJet DB list_rows supports sum and count.',
  shape: { '<aggregate-id>': { column: 'string', aggFx: 'sum|count' } },
  example: { 'count-id': { column: 'id', aggFx: 'count' } },
};
const tooljetGroupBy = {
  type: 'record',
  description: 'Map of stable ids to arrays of column names included in the grouped result.',
  shape: { '<group-id>': ['string'] },
  example: { 'group-status': ['status'] },
};
const tooljetContracts = {
  list_rows: oneVariant('list_rows', [
    ...tooljetCommon,
    field('list_rows.where_filters', tooljetWhereFilters.type, tooljetWhereFilters),
    field('list_rows.order_filters', tooljetOrderFilters.type, tooljetOrderFilters),
    field('list_rows.aggregates', tooljetAggregates.type, tooljetAggregates),
    field('list_rows.group_by', tooljetGroupBy.type, tooljetGroupBy),
    field('list_rows.limit', 'number|binding'),
    field('list_rows.offset', 'number|binding'),
  ], ['operation', 'table_id'], { operation: 'list_rows' }),
  create_row: oneVariant('create_row', [...tooljetCommon, field('create_row', 'record')], ['operation', 'table_id', 'create_row'], { operation: 'create_row' }),
  update_rows: oneVariant('update_rows', [
    ...tooljetCommon,
    field('update_rows.columns', 'record'),
    field('update_rows.where_filters', 'record'),
  ], ['operation', 'table_id', 'update_rows.columns', 'update_rows.where_filters'], { operation: 'update_rows' }),
  delete_rows: oneVariant('delete_rows', [
    ...tooljetCommon,
    field('delete_rows.where_filters', 'record'),
    field('delete_rows.limit', 'number|binding'),
    field('delete_rows.order_column', 'string'),
  ], ['operation', 'table_id'], { operation: 'delete_rows' }),
  join_tables: oneVariant('join_tables', [...tooljetCommon, field('join_table', 'object')], ['operation', 'join_table'], { operation: 'join_tables' }),
  bulk_update_with_primary_key: oneVariant('bulk_update_with_primary_key', [
    ...tooljetCommon,
    field('bulk_update_with_primary_key.primary_key', 'array<string>'),
    field('bulk_update_with_primary_key.rows_update', 'array|binding'),
  ], ['operation', 'table_id', 'bulk_update_with_primary_key.primary_key', 'bulk_update_with_primary_key.rows_update'], { operation: 'bulk_update_with_primary_key' }),
  bulk_upsert_with_primary_key: oneVariant('bulk_upsert_with_primary_key', [
    ...tooljetCommon,
    field('bulk_upsert_with_primary_key.primary_key', 'array<string>'),
    field('bulk_upsert_with_primary_key.rows', 'array|binding'),
  ], ['operation', 'table_id', 'bulk_upsert_with_primary_key.primary_key', 'bulk_upsert_with_primary_key.rows'], { operation: 'bulk_upsert_with_primary_key' }),
  sql_execution: oneVariant('sql_execution', [field('operation', 'string'), field('sql_execution.sqlQuery', 'string')], ['operation', 'sql_execution.sqlQuery'], { operation: 'sql_execution' }),
};

const staticSchemas = {
  restapi: {
    kind: 'restapi', name: 'REST API', type: 'api',
    description: 'Built-in HTTP query. Pagination is defined by the remote API, not ToolJet.',
    defaults: { method: 'get', url: '', url_params: [], headers: [], cookies: [], body: [], json_body: null, body_toggle: false, retry_network_errors: null },
    operations: Object.keys(restContracts), contracts: restContracts,
    properties: Object.fromEntries(commonRestFields.map((item) => [item.path, item])),
    paginationStrategies: ['offset', 'page', 'cursor/token'], introspectionMethods: [], sources: [{ collection: 'static', package: 'restapi' }],
  },
  runjs: {
    kind: 'runjs', name: 'Run JavaScript', type: 'static', defaults: { code: '', parameters: [] }, operations: [],
    contracts: { default: oneVariant('default', [field('code', 'string'), field('parameters', 'array')], ['code']) },
    properties: { code: { type: 'string', description: 'JavaScript body. Return the query result.' }, parameters: { type: 'array' } },
    introspectionMethods: [], sources: [{ collection: 'static', package: 'runjs' }],
  },
  runpy: {
    kind: 'runpy', name: 'Run Python', type: 'static', defaults: { code: '' }, operations: [],
    contracts: { default: oneVariant('default', [field('code', 'string')], ['code']) },
    properties: { code: { type: 'string', description: 'Python body. Return the query result.' } },
    introspectionMethods: [], sources: [{ collection: 'static', package: 'runpy' }],
  },
  tooljetdb: {
    kind: 'tooljetdb', name: 'ToolJet Database', type: 'database',
    description: 'Built-in ToolJet Database GUI/SQL query options.', defaults: { operation: '' },
    operations: Object.keys(tooljetContracts), contracts: tooljetContracts,
    properties: {
      operation: { type: 'string' }, table_id: { type: 'string' },
      list_rows: { type: 'object', fields: { where_filters: tooljetWhereFilters, order_filters: tooljetOrderFilters, aggregates: tooljetAggregates, group_by: tooljetGroupBy, limit: { type: 'number|binding' }, offset: { type: 'number|binding' } } },
      create_row: { type: 'record' },
      update_rows: { type: 'object', fields: { columns: { type: 'record' }, where_filters: { type: 'record' } } },
      delete_rows: { type: 'object', fields: { where_filters: { type: 'record' }, limit: { type: 'number|binding' }, order_column: { type: 'string' } } },
      join_table: { type: 'object' }, bulk_update_with_primary_key: { type: 'object' }, bulk_upsert_with_primary_key: { type: 'object' }, sql_execution: { type: 'object' },
    },
    introspectionMethods: [], sources: [{ collection: 'static', package: 'tooljetdb' }],
  },
};

for (const [kind, schema] of Object.entries(staticSchemas)) {
  schema.contracts = applyOverrides(kind, schema.contracts);
  schemas[kind] = schema;
}

const sorted = sortedObject(schemas);
mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(resolve(root, 'data/datasource-schemas.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log(
  `Harvested ${Object.keys(sorted).length} datasource kinds from ${pluginDefinitions} plugin definitions ` +
  `(${Object.keys(sorted).filter((kind) => sorted[kind].sources.some((source) => source.collection === 'marketplace')).length} marketplace kinds).`
);
