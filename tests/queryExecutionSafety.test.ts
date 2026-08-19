import { describe, expect, it } from 'vitest';
import {
  LARGE_READ_ROW_THRESHOLD,
  assessQueryRead,
  extractRowCount,
  sameReadSource,
} from '../src/queryExecutionSafety.js';

describe('query execution safety', () => {
  it('allows bounded explicit-column SQL and refuses SELECT star even with a limit', () => {
    expect(assessQueryRead({
      id: 'bounded', kind: 'postgresql',
      options: { mode: 'sql', query: 'SELECT id, status FROM orders LIMIT 100' },
    })).toMatchObject({ provenRead: true, directSafe: true, selectStar: false, maxRows: 100 });

    const star = assessQueryRead({
      id: 'star', kind: 'postgresql',
      options: { mode: 'sql', query: 'SELECT orders.* FROM orders LIMIT 25' },
    });
    expect(star).toMatchObject({ provenRead: true, directSafe: false, selectStar: true });
    expect(star.reason).toMatch(/SELECT \* is refused.*schema.*required columns/i);
  });

  it('requires a count preflight for unbounded or oversized row reads', () => {
    expect(assessQueryRead({
      id: 'unbounded', kind: 'postgresql',
      options: { mode: 'sql', query: 'SELECT id, status FROM public.orders' },
    })).toMatchObject({
      provenRead: true,
      directSafe: false,
      requiresCountPreflight: true,
      source: { kind: 'sql_table', value: 'public.orders' },
    });
    expect(assessQueryRead({
      id: 'oversized', kind: 'postgresql',
      options: { mode: 'sql', query: `SELECT id FROM orders LIMIT ${LARGE_READ_ROW_THRESHOLD + 1}` },
    })).toMatchObject({ directSafe: false, requiresCountPreflight: true });
  });

  it('recognizes same-source SQL and ToolJet DB count-only queries', () => {
    const sqlTarget = assessQueryRead({
      id: 'target', kind: 'postgresql', options: { query: 'SELECT id FROM orders' },
    });
    const sqlCount = assessQueryRead({
      id: 'count', kind: 'postgresql', options: { query: 'SELECT COUNT(*) AS total FROM orders' },
    });
    expect(sqlCount).toMatchObject({ directSafe: true, countOnly: true, maxRows: 1 });
    expect(sameReadSource(sqlTarget, sqlCount)).toBe(true);

    const tjCount = assessQueryRead({
      id: 'tj-count', kind: 'tooljetdb', options: {
        operation: 'list_rows', table_id: 'table-1',
        list_rows: { aggregates: { count: { column: 'id', aggFx: 'count' } } },
      },
    });
    expect(tjCount).toMatchObject({ directSafe: true, countOnly: true, maxRows: 1 });
  });

  it('extracts only an unambiguous one-row numeric count', () => {
    expect(extractRowCount({ status: 'ok', data: [{ total: '2400' }] })).toBe(2400);
    expect(extractRowCount({ status: 'ok', data: [{ total: 20, other: 2 }] })).toBeUndefined();
    expect(extractRowCount({ status: 'failed', data: [{ total: 20 }] })).toBeUndefined();
  });
});
