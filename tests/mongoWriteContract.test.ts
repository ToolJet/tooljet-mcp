import { describe, expect, it } from 'vitest';
import { prepareQueryOptionsForWrite } from '../src/queryPersistence.js';
import { validateQueryOptions } from '../src/queryValidation.js';

const rows = '[...components.licensedTable.updatedData, ...components.pendingTable.updatedData].filter(r => r.asset_id)';
const errors = (options: Record<string, unknown>) =>
  validateQueryOptions('mongodb', { collection: 'licenses', filter: '{ _id: { $oid: "65f0c0ffee0000000000abcd" } }', ...options })
    .errors.filter((e) => e.code === 'mongodb_whole_array_set');

describe('MongoDB whole-array $set from component data', () => {
  it.each([
    ['embedded binding', { operation: 'update_one', update: `{ $set: { Assets: {{${rows}}} } }` }],
    ['stringified update', { operation: 'update_one', update: `{{JSON.stringify({ $set: { Assets: ${rows} } })}}` }],
    ['stringified value', { operation: 'update_one', update: `{ $set: { Assets: {{JSON.stringify(${rows})}} } }` }],
    ['quoted binding', { operation: 'update_many', update: `{ "$set": { "Assets": "{{JSON.stringify(${rows})}}" } }` }],
    ['Table row collection', { operation: 'find_one_update', update: '{ $set: { Assets: {{components.assetsTable.currentData}} } }' }],
    ['array literal of fields', { operation: 'update_one', update: '{ $set: { Assets: [{ name: {{JSON.stringify(components.name.value)}} }] } }' }],
    ['nested sub-document', { operation: 'update_one', update: `{ $set: { license: { Assets: {{JSON.stringify(${rows})}} } } }` }],
    ['pipeline update', { operation: 'update_one', update: `[{ $set: { Assets: {{JSON.stringify(${rows})}} } }]` }],
    ['structured object', { operation: 'update_one', update: { $set: { Assets: `{{${rows}}}` } } }],
  ])('flags %s', (_, options) => {
    const found = errors(options);
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain('Assets" array');
    expect(found[0]!.message).toContain('arrayFilters');
  });

  it('flags each replacing update inside bulk_write', () => {
    const found = errors({
      operation: 'bulk_write',
      operations: `{{JSON.stringify([
        { updateOne: { filter: { _id: 1 }, update: { $set: { status: components.status.value } } } },
        { updateMany: { filter: {}, update: { $set: { Assets: ${rows} } } } },
      ])}}`,
    });
    expect(found.map((e) => e.path)).toEqual(['operations[1].updateMany.update']);
  });

  it.each([
    ['element path with arrayFilters', {
      operation: 'update_one',
      update: '{ $set: { "Assets.$[el].status": {{JSON.stringify(components.status.value)}}, "Assets.$[el].fee": {{components.fee.value}} } }',
      options: '{ arrayFilters: [{ "el.asset_id": {{JSON.stringify(components.assetsTable.selectedRow.asset_id)}} }] }',
    }],
    ['positional and indexed paths', { operation: 'update_one', update: `{ $set: { "Assets.$": {{JSON.stringify(${rows})}}, "Assets.0.tags": {{JSON.stringify(${rows})}} } }` }],
    ['scalar fields', { operation: 'update_one', update: '{ $set: { title: {{JSON.stringify(components.title.value)}}, updatedAt: { $date: "2026-10-05T00:00:00Z" } } }' }],
    ['a single control value', { operation: 'update_one', update: '{ $set: { tags: {{JSON.stringify(components.tags.values)}} } }' }],
    ['a literal array', { operation: 'update_one', update: '{ $set: { Assets: [] } }' }],
    ['$push of new elements', { operation: 'update_one', update: `{ $push: { Assets: { $each: {{JSON.stringify(${rows})}} } } }` }],
    ['a read', { operation: 'find_one', filter: '{ Assets: {{JSON.stringify(components.assetsTable.currentData)}} }' }],
    ['unparseable text', { operation: 'update_one', update: '{ $set: { Assets: ' }],
  ])('allows %s', (_, options) => {
    expect(errors(options)).toEqual([]);
  });

  it('blocks the write on every authoring route', () => {
    const prepared = prepareQueryOptionsForWrite('mongodb', {
      operation: 'update_one', collection: 'licenses', filter: '{ _id: 1 }', update: { $set: { Assets: `{{${rows}}}` } },
    }, 'saveLicense');
    expect(prepared.errors.join(' ')).toContain('saveLicense: $set replaces the whole "Assets" array');
  });
});
