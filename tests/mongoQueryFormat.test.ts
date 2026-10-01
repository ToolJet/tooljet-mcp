import { describe, expect, it } from 'vitest';
import JSON5 from 'json5';
import { normalizeQueryOptions, validateQueryOptions } from '../src/queryValidation.js';
import { assessQueryRead, sameReadSource, extractRowCount } from '../src/queryExecutionSafety.js';
import { classifyQueryFailure } from '../src/tools/runQuery.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

const read = (options: Record<string, unknown>) => assessQueryRead({ id: 'sample', kind: 'mongodb', data_source_id: 'db', options: { collection: 'devices', ...options } });

describe('MongoDB plugin JSON5 contract', () => {
  it('starts new auto-generated preview tables without unrelated widget demo columns', () => {
    const table = { name: 'DevicePreview', type: 'Table', properties: {
      data: '{{queries.devicePreview.data || []}}', autogenerateColumns: true,
    } };
    const created = normalizeComponentSpec(table, { stripUnknownKeys: true });
    expect(created.component.properties).toHaveProperty('columns.value', []);
    expect(normalizeComponentSpec(table).patch.properties).not.toHaveProperty('columns');
    const explicit = normalizeComponentSpec({ ...table, properties: { ...table.properties,
      columns: [{ name: 'Serial', key: 'serial', columnType: 'string' }],
    } }, { stripUnknownKeys: true });
    expect(explicit.component.properties).toHaveProperty('columns.value', [{ name: 'Serial', key: 'serial', columnType: 'string' }]);
  });
  it('serializes structured literals into plugin-parseable JSON without changing EJSON or bindings', () => {
    const options = { operation: 'find_many', collection: 'devices', filter: { _id: { $oid: '123456789012345678901234' } }, options: { limit: 8 } };
    const normalized = normalizeQueryOptions('mongodb', options);
    expect(JSON5.parse(normalized.filter as string)).toEqual(options.filter);
    expect(JSON5.parse(normalized.options as string)).toEqual(options.options);
    expect(options.options).toEqual({ limit: 8 });
    expect(read(normalized)).toMatchObject({ provenRead: true, directSafe: true, maxRows: 8 });
    expect(validateQueryOptions('mongodb', normalized).errors).toEqual([]);
    const dynamic = { operation: 'update_one', filter: '{{JSON.stringify({serial:components.serial.value})}}', update: '{ $set: { active: true } }' };
    expect(normalizeQueryOptions('mongodb', dynamic)).toBe(dynamic);
  });
  it('serializes pipeline arrays and bulk documents using the same plugin contract', () => {
    for (const field of ['pipeline', 'documents', 'operations']) {
      const normalized = normalizeQueryOptions('mongodb', { [field]: [{ label: 'synthetic' }] });
      expect(JSON5.parse(normalized[field] as string)).toEqual([{ label: 'synthetic' }]);
    }
  });
  it('recognizes JSON5 limits the plugin actually accepts', () => {
    expect(read({ operation: 'find_many', options: "{limit: 8, projection: {serial: 1}, /* preview */}" })).toMatchObject({ directSafe: true, maxRows: 8 });
    expect(read({ operation: 'find_many', options: '{{variables.options}}' }).directSafe).toBe(false);
  });
  it('does not use an ignored driver limit or an early pipeline limit as a bound', () => {
    for (const pipeline of ['[{$match:{active:true}}]', '[{$limit:8},{$unwind:"$labels"}]']) {
      expect(read({ operation: 'aggregate', pipeline, options: '{limit:8}' })).toMatchObject({ directSafe: false, requiresCountPreflight: true });
    }
    expect(read({ operation: 'aggregate', pipeline: '[{$match:{active:true}},{$limit:8}]' })).toMatchObject({ directSafe: true, maxRows: 8 });
    expect(read({ operation: 'distinct', field: 'labels', options: '{limit:8}' })).toMatchObject({ directSafe: false, requiresCountPreflight: true });
  });
  it('refuses dynamic pipelines and decoded write stages', () => {
    for (const pipeline of ['{{variables.pipeline}}', '[{"$\\u006fut":"copy"}, {"$limit":8}]', '[{$merge:"copy"},{$limit:8}]']) {
      expect(read({ operation: 'aggregate', pipeline }).provenRead).toBe(false);
    }
  });
  it('keeps case-sensitive collection counts separate', () => {
    expect(sameReadSource(read({ operation: 'find_many', collection: 'Devices' }), read({ operation: 'count_total', collection: 'devices' }))).toBe(false);
  });
  it('accepts the scalar count returned by the MongoDB plugin', () => {
    expect(extractRowCount({ status: 'ok', data: 12 })).toBe(12);
    expect(extractRowCount({ status: 'ok', data: 0 })).toBe(0);
    expect(extractRowCount({ status: 'ok', data: -2 })).toBeUndefined();
    expect(extractRowCount({ status: 'failed', data: 12 })).toBeUndefined();
  });
  it('reports a JSON5 parse error as a query error rather than requesting connection repair', () => {
    expect(classifyQueryFailure({ status: 'failed', description: "JSON5: invalid character 'x' at 1:1", data: { name: 'SyntaxError' } })).toBe('query');
    expect(classifyQueryFailure({ status: 'failed', category: 'connection', data: { name: 'MongoNetworkError' } })).toBe('connection');
  });
});
