import { describe, expect, it } from 'vitest';
import { prepareQueryOptionsForWrite } from '../src/queryPersistence.js';

const filters = { selected: { column: 'sample_code', operator: 'eq', value: '{{components.samples.selectedRow.sample_code}}' } };
const prepare = (extra: Record<string, unknown> = {}) => prepareQueryOptionsForWrite('tooljetdb', {
  operation: 'delete_rows',
  table_id: 'ceramic-samples',
  delete_rows: { where_filters: filters, ...extra },
});

describe('ToolJet DB bounded delete order', () => {
  it.each([{}, { limit: 4 }, { order_column: ' ', order_column_id: '' }])('refuses missing order before persisting %j', (extra) => {
    const result = prepare(extra);
    expect(result.validation?.errors).toContainEqual(expect.objectContaining({
      code: 'missing_delete_order', path: 'delete_rows.order_column',
    }));
    expect(result.errors.join(' ')).toMatch(/primary key.*get_table_schema/i);
    expect(result.options.delete_rows).toEqual({ where_filters: filters, ...extra });
  });

  it.each([
    { order_column: 'sample_code' },
    { order_column_id: 'b6687043-07e2-4c34-b3bf-fc1989d81f93' },
  ])('preserves an explicit table-derived order %j', (extra) => {
    const result = prepare(extra);
    expect(result.errors).toEqual([]);
    expect(result.options.delete_rows).toEqual({ where_filters: filters, ...extra });
  });

  it.each([0, null, ''])('keeps explicitly unbounded filtered deletes unchanged (limit %j)', (limit) => {
    expect(prepare({ limit }).validation?.errors.filter(error => error.code === 'missing_delete_order')).toEqual([]);
  });
});
