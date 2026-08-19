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

  it('recognizes MSSQL TOP and Oracle FETCH FIRST as static bounds', () => {
    expect(assessQueryRead({
      id: 'mssql', kind: 'mssql',
      options: { mode: 'sql', query: 'SELECT TOP (25) [id], [name] FROM [dbo].[users]' },
    })).toMatchObject({ provenRead: true, directSafe: true, maxRows: 25, requiresCountPreflight: false });
    expect(assessQueryRead({
      id: 'oracle', kind: 'oracledb',
      options: { mode: 'sql', query: 'SELECT "ID", "NAME" FROM "USERS" FETCH FIRST 25 ROWS ONLY' },
    })).toMatchObject({ provenRead: true, directSafe: true, maxRows: 25, requiresCountPreflight: false });
    expect(assessQueryRead({
      id: 'mssql-star', kind: 'mssql', options: { mode: 'sql', query: 'SELECT TOP 25 * FROM [dbo].[users]' },
    })).toMatchObject({ provenRead: true, directSafe: false, selectStar: true });
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
      id: 'target', kind: 'postgresql', data_source_id: 'pg-main', options: { query: 'SELECT id FROM orders' },
    });
    const sqlCount = assessQueryRead({
      id: 'count', kind: 'postgresql', data_source_id: 'pg-main', options: { query: 'SELECT COUNT(*) AS total FROM orders' },
    });
    expect(sqlCount).toMatchObject({ directSafe: true, countOnly: true, fullSourceCount: true, maxRows: 1 });
    expect(sameReadSource(sqlTarget, sqlCount)).toBe(true);

    const tjCount = assessQueryRead({
      id: 'tj-count', kind: 'tooljetdb', options: {
        operation: 'list_rows', table_id: 'table-1',
        list_rows: { aggregates: { count: { column: 'id', aggFx: 'count' } } },
      },
    });
    expect(tjCount).toMatchObject({ directSafe: true, countOnly: true, fullSourceCount: true, maxRows: 1 });
  });

  it('does not let filtered, joined, or cross-datasource counts unlock a target read', () => {
    const target = assessQueryRead({
      id: 'target', kind: 'postgresql', data_source_id: 'pg-main',
      options: { query: 'SELECT id FROM orders WHERE status = \'open\'' },
    });
    const filtered = assessQueryRead({
      id: 'filtered', kind: 'postgresql', data_source_id: 'pg-main',
      options: { query: 'SELECT COUNT(*) FROM orders WHERE id = -1' },
    });
    const otherDatasource = assessQueryRead({
      id: 'other', kind: 'postgresql', data_source_id: 'pg-replica',
      options: { query: 'SELECT COUNT(*) FROM orders' },
    });
    const joinedTarget = assessQueryRead({
      id: 'joined', kind: 'postgresql', data_source_id: 'pg-main',
      options: { query: 'SELECT o.id FROM orders o JOIN items i ON i.order_id = o.id' },
    });
    const fullCount = assessQueryRead({
      id: 'count', kind: 'postgresql', data_source_id: 'pg-main',
      options: { query: 'SELECT COUNT(*) FROM orders' },
    });

    expect(filtered.fullSourceCount).toBe(false);
    expect(sameReadSource(target, filtered)).toBe(false);
    expect(sameReadSource(target, otherDatasource)).toBe(false);
    expect(sameReadSource(joinedTarget, fullCount)).toBe(false);
  });

  it('rejects SQL statements with write, lock, or unproven function side effects', () => {
    expect(assessQueryRead({
      id: 'into', kind: 'postgresql',
      options: { query: 'SELECT id INTO archived_orders FROM orders LIMIT 10' },
    })).toMatchObject({ provenRead: false, directSafe: false });
    expect(assessQueryRead({
      id: 'lock', kind: 'postgresql',
      options: { query: 'SELECT id FROM orders LIMIT 10 FOR UPDATE' },
    })).toMatchObject({ provenRead: false, directSafe: false });
    expect(assessQueryRead({
      id: 'function', kind: 'postgresql', options: { query: 'SELECT rotate_secrets()' },
    })).toMatchObject({ provenRead: false, directSafe: false });
  });

  it('requires explicit confirmation for warehouse reads even when row-limited', () => {
    expect(assessQueryRead({
      id: 'bq', kind: 'bigquery', data_source_id: 'warehouse',
      options: { query: 'SELECT id FROM dataset.orders LIMIT 10' },
    })).toMatchObject({
      provenRead: true,
      directSafe: false,
      requiresCountPreflight: false,
      requiresBillableReadConfirmation: true,
    });
  });

  it('extracts only an unambiguous one-row numeric count', () => {
    expect(extractRowCount({ status: 'ok', data: [{ total: '2400' }] })).toBe(2400);
    expect(extractRowCount({ status: 'ok', data: [{ total: 20, other: 2 }] })).toBeUndefined();
    expect(extractRowCount({ status: 'failed', data: [{ total: 20 }] })).toBeUndefined();
  });
});
