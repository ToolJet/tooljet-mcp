import { describe, expect, it } from 'vitest';
import { updateRowsCompatibilityWarning } from '../src/tableQueryCompatibility.js';

describe('update_rows schema compatibility', () => {
  it('identifies the known no-id failure without rewriting conditional targeting', () => {
    const options = { operation: 'update_rows', update_rows: { where_filters: { state: 'Pending' } } };
    const before = structuredClone(options);
    const warning = updateRowsCompatibilityWarning('tooljetdb', options, 'returns', ['return_id', 'state']);
    expect(warning).toContain('Table "returns" has no id column');
    expect(warning).toContain('order=id');
    expect(warning).toContain('never drop expected-state');
    expect(options).toEqual(before);
  });

  it.each([undefined, [], ['id'], ['return_id', 'id']])('does not invent missing-id evidence for %j', columns => {
    expect(updateRowsCompatibilityWarning('tooljetdb', { operation: 'update_rows' }, 'returns', columns)).toBeUndefined();
  });

  it.each(['list_rows', 'create_row', 'bulk_update_with_primary_key'])('does not flag %s', operation => {
    expect(updateRowsCompatibilityWarning('tooljetdb', { operation }, 'returns', ['return_id'])).toBeUndefined();
  });

  it('does not apply ToolJet DB assumptions to other datasources', () => {
    expect(updateRowsCompatibilityWarning('postgresql', { operation: 'update_rows' }, 'returns', ['return_id'])).toBeUndefined();
  });
});
