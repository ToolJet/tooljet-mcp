import { describe, expect, it } from 'vitest';
import { prepareQueryOptionsForWrite } from '../src/queryPersistence.js';
import { validateQueryOptions } from '../src/queryValidation.js';

// Synthetic workshop scheduling data; no production payloads or component names.
const rows = '[...components.morningSlots.currentData, ...components.eveningSlots.currentData].filter(slot => slot.slot_key)';
const base = { operation: 'update_one', collection: 'workshops', filter: '{ _id: 42 }' };
const errors = (options: Record<string, unknown>) =>
  validateQueryOptions('mongodb', { ...base, ...options }).errors.filter((e) => e.code === 'mongodb_whole_array_set');
const prepare = (update: unknown) => prepareQueryOptionsForWrite('mongodb', { ...base, update }, 'saveWorkshop');

function expectRefused(update: unknown) {
  const prepared = prepare(update);
  expect(prepared.errors.join(' ')).toContain('saveWorkshop: $set replaces the whole "slots" array');
}

describe('MongoDB whole-array $set from component data', () => {
  it.each([
    ['embedded binding', { update: `{ $set: { slots: {{${rows}}} } }` }],
    ['stringified update', { update: `{{JSON.stringify({ $set: { slots: ${rows} } })}}` }],
    ['stringified value', { update: `{ $set: { slots: {{JSON.stringify(${rows})}} } }` }],
    ['quoted binding', { operation: 'update_many', update: `{ "$set": { "slots": "{{JSON.stringify(${rows})}}" } }` }],
    ['Table row collection', { operation: 'find_one_update', update: '{ $set: { slots: {{components.scheduleGrid.currentData}} } }' }],
    ['array literal of fields', { update: '{ $set: { slots: [{ label: {{JSON.stringify(components.slotLabel.value)}} }] } }' }],
    ['nested sub-document', { update: `{ $set: { schedule: { slots: {{JSON.stringify(${rows})}} } } }` }],
    ['pipeline update', { update: `[{ $set: { slots: {{JSON.stringify(${rows})}} } }]` }],
    ['structured object', { update: { $set: { slots: `{{${rows}}}` } } }],
  ])('flags %s', (_, options) => {
    const found = errors(options);
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain('slots" array');
    expect(found[0]!.message).toContain('arrayFilters');
  });

  it('flags each replacing update inside bulk_write', () => {
    const found = errors({
      operation: 'bulk_write',
      operations: `{{JSON.stringify([
        { updateOne: { filter: { _id: 42 }, update: { $set: { status: components.slotStatus.value } } } },
        { updateMany: { filter: {}, update: { $set: { slots: ${rows} } } } },
      ])}}`,
    });
    expect(found.map((e) => e.path)).toEqual(['operations[1].updateMany.update']);
  });

  it.each([
    ['element path with arrayFilters', {
      update: '{ $set: { "slots.$[entry].status": {{JSON.stringify(components.slotStatus.value)}}, "slots.$[entry].capacity": {{components.slotCapacity.value}} } }',
      options: '{ arrayFilters: [{ "entry.slot_key": {{JSON.stringify(components.scheduleGrid.selectedRow.slot_key)}} }] }',
    }],
    ['positional and indexed paths', { update: `{ $set: { "slots.$": {{JSON.stringify(${rows})}}, "slots.0.labels": {{JSON.stringify(${rows})}} } }` }],
    ['scalar fields', { update: '{ $set: { title: {{JSON.stringify(components.workshopTitle.value)}}, updatedAt: { $date: "2026-08-12T10:30:00Z" } } }' }],
    ['a single control value', { update: '{ $set: { labels: {{JSON.stringify(components.workshopLabels.values)}} } }' }],
    ['a literal array', { update: '{ $set: { slots: [] } }' }],
    ['$push of new elements', { update: `{ $push: { slots: { $each: {{JSON.stringify(${rows})}} } } }` }],
    ['a read', { operation: 'find_one', filter: '{ slots: {{JSON.stringify(components.scheduleGrid.currentData)}} }' }],
    ['unparseable text', { update: '{ $set: { slots: ' }],
  ])('allows %s', (_, options) => {
    expect(errors(options)).toEqual([]);
  });

  it('blocks the normalized authoring route', () => {
    expectRefused({ $set: { slots: `{{${rows}}}` } });
  });

  it.each([
    'components.workshopTitle.value.slice(0, 32)',
    'components.workshopTitle.value.concat(" session")',
    'components.workshopTitle.value?.slice(0, 32)',
    'components.workshopTitle.value?.concat(" session")',
    '"Workshop: ".concat(components.workshopTitle.value)',
    'String(components.workshopTitle.value).slice(0, 32)',
    'components.workshopTitle.value.trim().slice(0, 32).concat(" session")',
  ])('allows scalar string expression %s', (expression) => {
    const prepared = prepare(`{ $set: { title: {{JSON.stringify(${expression})}} } }`);
    expect(prepared.errors).toEqual([]);
  });

  it.each([
    'components.scheduleGrid.currentData.slice(0, 3)',
    'components.scheduleGrid.updatedData.concat(components.scheduleGrid.newRows)',
    'components.scheduleGrid.currentData?.slice(0, 3)',
    '[].concat(components.scheduleGrid.currentData)',
    '[components.slotLabel.value].slice(0, 1)',
    'components.scheduleGrid.currentData.map(slot => ({ key: slot.slot_key })).slice(0, 3)',
    'Array.from(components.scheduleGrid.currentData).concat([])',
  ])('still refuses proven array expression %s', (expression) => {
    expectRefused(`{ $set: { slots: {{JSON.stringify(${expression})}} } }`);
  });

  it.each([
    ['expression arrow', `{{(() => JSON.stringify({ $set: { slots: ${rows} } }))()}}`],
    ['block arrow', `{{(() => { return JSON.stringify({ $set: { slots: ${rows} } }); })()}}`],
    ['ordinary function', `{{(function () { return JSON.stringify({ $set: { slots: ${rows} } }); })()}}`],
    ['nested wrappers', `{{(() => (function () { return JSON.stringify({ $set: { slots: ${rows} } }); })())()}}`],
    ['wrapped array value', `{{JSON.stringify({ $set: { slots: (() => ${rows})() } })}}`],
    ['wrapped set object', `{{JSON.stringify({ $set: (() => ({ slots: ${rows} }))() })}}`],
    ['wrapped sub-document', `{{JSON.stringify({ $set: { schedule: (() => ({ slots: ${rows} }))() } })}}`],
    ['wrapped pipeline', `{{(() => JSON.stringify([{ $set: { slots: ${rows} } }]))()}}`],
  ])('refuses whole-array writes through %s', (_, update) => {
    const prepared = prepare(update);
    expect(prepared.errors.join(' ')).toContain('slots" array');
  });

  it('checks inline wrappers around bulk operations and their updates', () => {
    const found = errors({
      operation: 'bulk_write',
      operations: `{{(() => JSON.stringify([
        { updateOne: { filter: { _id: 42 }, update: (() => ({ $set: { slots: ${rows} } }))() } },
      ]))()}}`,
    });
    expect(found.map((e) => e.path)).toEqual(['operations[0].updateOne.update']);
  });

  it('allows inline wrappers that return scalar updates', () => {
    expect(prepare('{{(() => JSON.stringify({ $set: { title: components.workshopTitle.value.slice(0, 32) } }))()}}').errors).toEqual([]);
  });

  it('keeps scalar and literal-array conditional branches separate', () => {
    expect(prepare('{{JSON.stringify({ $set: { labels: components.workshopTitle.value ? [] : "unscheduled" } })}}').errors).toEqual([]);
  });
});
