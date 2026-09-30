import { describe, expect, it, vi } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { runQueryTool } from '../src/tools/runQuery.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const query = (sql: string) => ({ id: 'q-catalogue', name: 'catalogue', kind: 'mysql',
  data_source_id: 'ds-library', options: { query: sql } });

describe('SQL statement boundaries across quoting modes', () => {
  const unsafe = [
    String.raw`SELECT 'can\'t'; DELETE FROM audit_log; SELECT 'end' AS label LIMIT 1`,
    String.raw`SELECT "can\"t"; DELETE FROM audit_log; SELECT "end" AS label LIMIT 1`,
    `SELECT '"'; DELETE FROM audit_log; SELECT '"' AS label LIMIT 1`,
    `SELECT 'still open; DELETE FROM audit_log`,
    `SELECT 'a;b'; DELETE FROM audit_log`,
  ];
  it.each(unsafe)('refuses unsafe or ambiguous SQL: %s', async sql => {
    expect(assessQueryRead(query(sql)).provenRead).toBe(false);
    const mock = {
      getQuery: vi.fn().mockResolvedValue(query(sql)),
      getQueries: vi.fn().mockResolvedValue([query(sql)]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env-library'),
      runQuery: vi.fn(),
    };
    const client = mock as unknown as ToolJetClient;
    expect((await runQueryTool(client).handler({ query_id: 'q-catalogue', version_id: 'v-library' })).isError).toBe(true);
    expect((await runQueriesTool(client).handler({ query_ids: ['q-catalogue'], version_id: 'v-library' })).isError).toBe(true);
    expect(mock.runQuery).not.toHaveBeenCalled();
  });
  it.each([
    `SELECT 'left;right' AS label LIMIT 1`,
    `SELECT 'isn''t;empty' AS label LIMIT 1;`,
    `SELECT '";"' AS label LIMIT 1`,
    `SELECT '--;/*' AS label LIMIT 1; -- end`,
    `SELECT 'label' AS label /* comment ' ; */ LIMIT 1`,
  ])('preserves unambiguous literals and comments: %s', sql => {
    expect(assessQueryRead(query(sql)).directSafe).toBe(true);
  });
});
