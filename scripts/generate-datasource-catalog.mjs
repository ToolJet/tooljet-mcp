// Harvests query-option schemas from ToolJet plugins into data/datasource-schemas.json.
// Connection manifests are used only for public name/kind/type metadata; credentials are never copied.
// Static datasources (REST API, RunJS, RunPy, ToolJet DB) are curated from their first-party editors.
//
// Usage: node scripts/generate-datasource-catalog.mjs   (env: TOOLJET_ROOT)
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLJET = process.env.TOOLJET_ROOT || resolve(homedir(), 'Claude/Projects/ToolJet/ToolJet');
const packagesDir = resolve(TOOLJET, 'plugins/packages');

function operationIds(properties) {
  const ids = new Set();
  const visit = (value, key = '') => {
    if (!value || typeof value !== 'object') return;
    if (key === 'operation' && Array.isArray(value.list)) {
      for (const item of value.list) if (typeof item?.value === 'string') ids.add(item.value);
    }
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  };
  visit(properties);
  return [...ids];
}

const schemas = {};
for (const packageName of readdirSync(packagesDir)) {
  const libDir = resolve(packagesDir, packageName, 'lib');
  const manifestPath = resolve(libDir, 'manifest.json');
  const operationsPath = resolve(libDir, 'operations.json');
  if (!existsSync(manifestPath) || !existsSync(operationsPath)) continue;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const querySchema = JSON.parse(readFileSync(operationsPath, 'utf8'));
  const source = manifest['tj:source'] || manifest.source;
  if (!source?.kind || !querySchema || !Object.keys(querySchema).length) continue;

  schemas[source.kind] = {
    kind: source.kind,
    name: source.name || querySchema.title || source.kind,
    type: source.type || querySchema.type,
    description: querySchema.description,
    defaults: querySchema.defaults || {},
    operations: operationIds(querySchema.properties),
    properties: querySchema.properties || {},
  };
}

const staticSchemas = {
  restapi: {
    kind: 'restapi',
    name: 'REST API',
    type: 'api',
    description: 'Built-in HTTP query. Cursor/page/offset pagination is defined by the remote API, not ToolJet.',
    defaults: {
      method: 'get',
      url: '',
      url_params: [],
      headers: [],
      cookies: [],
      body: [],
      json_body: null,
      body_toggle: false,
      retry_network_errors: null,
    },
    operations: ['get', 'post', 'put', 'patch', 'delete'],
    properties: {
      method: { type: 'string', values: ['get', 'post', 'put', 'patch', 'delete'] },
      url: { type: 'string', description: 'Endpoint path; can contain ToolJet bindings.' },
      url_params: { type: 'array', item: { key: 'string', value: 'binding|string' } },
      headers: { type: 'array', item: { key: 'string', value: 'binding|string' } },
      cookies: { type: 'array', item: { key: 'string', value: 'binding|string' } },
      body_toggle: { type: 'boolean', description: 'false uses key/value body; true uses json_body.' },
      body: { type: 'array', item: { key: 'string', value: 'binding|unknown' } },
      json_body: { type: 'object|string|null' },
      retry_network_errors: { type: 'boolean|null' },
    },
    paginationStrategies: ['offset', 'page', 'cursor/token'],
  },
  runjs: {
    kind: 'runjs',
    name: 'Run JavaScript',
    type: 'static',
    defaults: { code: '', parameters: [] },
    operations: [],
    properties: {
      code: { type: 'string', description: 'JavaScript body. Return the query result.' },
      parameters: { type: 'array' },
    },
  },
  runpy: {
    kind: 'runpy',
    name: 'Run Python',
    type: 'static',
    defaults: { code: '' },
    operations: [],
    properties: { code: { type: 'string', description: 'Python body. Return the query result.' } },
  },
  tooljetdb: {
    kind: 'tooljetdb',
    name: 'ToolJet Database',
    type: 'database',
    description: 'Built-in ToolJet Database GUI/SQL query options.',
    defaults: { operation: '' },
    operations: [
      'list_rows',
      'create_row',
      'update_rows',
      'delete_rows',
      'join_tables',
      'bulk_update_with_primary_key',
      'bulk_upsert_with_primary_key',
      'sql_execution',
    ],
    properties: {
      operation: { type: 'string', description: 'One of the listed operations.' },
      table_id: { type: 'string', description: 'ToolJet DB table id returned by list_tables.' },
      list_rows: {
        type: 'object',
        fields: {
          where_filters: { type: 'record', item: { id: 'string', column: 'string', operator: 'string', value: 'binding|unknown' } },
          order_filters: { type: 'record', item: { id: 'string', column: 'string', order: 'asc|desc' } },
          aggregates: { type: 'record', item: { aggFx: 'string', column: 'string' } },
          group_by: { type: 'record' },
          limit: { type: 'number|binding' },
          offset: { type: 'number|binding' },
        },
      },
      create_row: { type: 'record', item: { column: 'string', value: 'binding|unknown' } },
      update_rows: {
        type: 'object',
        fields: {
          columns: { type: 'record', item: { column: 'string', value: 'binding|unknown' } },
          where_filters: { type: 'record', item: { column: 'string', operator: 'string', value: 'binding|unknown' } },
        },
      },
      delete_rows: {
        type: 'object',
        fields: {
          where_filters: { type: 'record', item: { column: 'string', operator: 'string', value: 'binding|unknown' } },
          limit: { type: 'number|binding' },
          order_column: { type: 'string' },
        },
      },
      join_table: {
        type: 'object',
        description: 'Options used when operation is join_tables.',
        fields: {
          from: { type: 'object', shape: { name: 'table_id', type: 'Table' } },
          joins: {
            type: 'array',
            item: {
              joinType: 'INNER|LEFT|RIGHT|FULL OUTER',
              conditions: {
                operator: 'AND|OR',
                conditionsList: [{ operator: 'string', leftField: { table: 'table_id', column: 'string' }, rightField: { table: 'table_id', column: 'string' } }],
              },
            },
          },
          fields: { type: 'array', item: { name: 'column', table: 'table_id', alias: 'string?' } },
          conditions: { type: 'object' },
          order_by: { type: 'array', item: { table: 'table_id', column: 'string', order: 'asc|desc' } },
          aggregates: { type: 'record', item: { aggFx: 'string', column: 'string', table_id: 'table_id' } },
          group_by: { type: 'record' },
          limit: { type: 'number|binding' },
          offset: { type: 'number|binding' },
        },
      },
      bulk_update_with_primary_key: {
        type: 'object',
        fields: { primary_key: { type: 'array<string>' }, rows_update: { type: 'array|binding' } },
      },
      bulk_upsert_with_primary_key: {
        type: 'object',
        fields: { primary_key: { type: 'array<string>' }, rows: { type: 'array|binding' } },
      },
      sql: { type: 'string', description: 'SQL text when operation is sql_execution (self-hosted availability varies).' },
    },
  },
};

Object.assign(schemas, staticSchemas);
const sorted = Object.fromEntries(Object.entries(schemas).sort(([a], [b]) => a.localeCompare(b)));
mkdirSync(resolve(root, 'data'), { recursive: true });
writeFileSync(resolve(root, 'data/datasource-schemas.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log(`Harvested ${Object.keys(sorted).length} datasource query schemas.`);
