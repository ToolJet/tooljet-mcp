import { describe, expect, it } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';

// A builder that generates queries (server-side paging: a page read and its count) records them in their options, so
// a later rebuild updates only the queries it made. The record is not a datasource field, and an unknown-key warning
// invited the model to remove it.
describe('compiledPaging option', () => {
  for (const record of [{ role: 'read', table: 'tb', count: 'rows_count' }, { role: 'count', read: 'rows' }]) {
    it(`is accepted on a ToolJet DB query (${record.role})`, () => {
      const result = validateQueryOptions('tooljetdb', { operation: 'list_rows', list_rows: { limit: 25 }, compiledPaging: record });
      expect([...result.errors, ...result.warnings].filter((issue) => issue.path === 'compiledPaging')).toEqual([]);
    });
  }
});
