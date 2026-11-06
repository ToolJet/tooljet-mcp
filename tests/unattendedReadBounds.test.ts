import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuerySummary, ToolJetClient } from '../src/tooljetClient.js';
import { autoReadPreflight } from '../src/autoReadPreflight.js';
import { checkPlanReads } from '../src/applyReadCheck.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import { capUnattendedOutput } from '../src/unattendedRun.js';

/*
  Runs nobody asked for (the read check after apply and code_app_data, run_queries) passed a four-way cross join with
  LIMIT 1, which makes the database build and sort the whole product before it returns one row, and had no deadline
  or output bound on this side. Views that call a writing function still pass this lexical check: only a read-only
  transaction or role on the datasource can stop those (the connectors' side).
*/
const pg = (query: string): QuerySummary => ({ id: 'q', name: 'q', kind: 'postgresql', options: { mode: 'sql', query } } as QuerySummary);
const verdict = (sql: string) => autoReadPreflight(pg(sql));

afterEach(() => {
  delete process.env.MCP_UNATTENDED_READ_TIMEOUT_MS;
  delete process.env.MCP_UNATTENDED_READ_MAX_ROWS;
});

describe('cross products are not run automatically', () => {
  it.each([
    ['comma join', 'SELECT a.id FROM t a, t b, t c, t d ORDER BY a.id LIMIT 1'],
    ['comma join of two', 'SELECT a.id FROM orders a, customers b LIMIT 10'],
    ['CROSS JOIN', 'SELECT a.id FROM t a CROSS JOIN t b ORDER BY a.id LIMIT 1'],
    ['NATURAL JOIN', 'SELECT a.id FROM t a NATURAL JOIN u b LIMIT 1'],
    ['ON TRUE', 'SELECT a.id FROM t a JOIN t b ON TRUE ORDER BY a.id LIMIT 1'],
    ['ON 1=1', 'SELECT a.id FROM t a INNER JOIN t b ON 1=1 LIMIT 1'],
    ['comma join in a subquery', 'SELECT x.id FROM (SELECT a.id FROM t a, t b) x ORDER BY x.id LIMIT 1'],
    ['comma join in WHERE', 'SELECT a.id FROM t a WHERE a.id IN (SELECT b.id FROM t b, t c) LIMIT 1'],
  ])('%s', (_label, sql) => {
    const v = verdict(sql);
    expect(v.run).toBe(false);
    expect((v as { reason: string }).reason).toMatch(/CROSS JOIN|NATURAL JOIN|always true|commas in FROM/);
  });

  it.each([
    ['inner join on a key', 'SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.id LIMIT 20'],
    ['left join', 'SELECT o.id FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LIMIT 20'],
    ['IN list', 'SELECT id FROM orders WHERE status IN (\'a\', \'b\') ORDER BY id LIMIT 5'],
    ['EXTRACT ... FROM', 'SELECT id, extract(year from created_at) AS y FROM orders ORDER BY id LIMIT 5'],
    ['ORDER BY two columns', 'SELECT id, name FROM orders ORDER BY name, id LIMIT 5'],
    ['derived table', 'SELECT x.id FROM (SELECT id FROM orders ORDER BY id LIMIT 5) x ORDER BY x.id LIMIT 5'],
    ['string with a comma', 'SELECT id FROM orders WHERE note = \'from a, b\' ORDER BY id LIMIT 5'],
  ])('still runs: %s', (_label, sql) => {
    expect(verdict(sql)).toEqual({ run: true });
  });
});

describe('a deadline and an output cap on unattended runs', () => {
  const sql = { id: 'q2', name: 'list', kind: 'postgresql', data_source_id: 'pg', options: { mode: 'sql', query: 'SELECT id FROM orders ORDER BY id LIMIT 1000' } };

  it('run_queries gives up after the deadline and reports the query as not checked', async () => {
    process.env.MCP_UNATTENDED_READ_TIMEOUT_MS = '40';
    const client = {
      getQueries: vi.fn().mockResolvedValue([sql]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env'),
      runQuery: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const result = JSON.parse((await runQueriesTool(client as unknown as ToolJetClient).handler({ version_id: 'v1', query_ids: ['q2'] } as any)).content[0]!.text);
    expect(result.queries[0]).toMatchObject({ status: 'failed', timed_out: true });
    expect(result.queries[0].message).toMatch(/stopped waiting/);
  });

  it('run_queries shows at most 200 rows, with the full count', async () => {
    const rows = Array.from({ length: 1000 }, (_, id) => ({ id }));
    const client = {
      getQueries: vi.fn().mockResolvedValue([sql]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env'),
      runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: rows }),
    };
    const result = JSON.parse((await runQueriesTool(client as unknown as ToolJetClient).handler({ version_id: 'v1', query_ids: ['q2'] } as any)).content[0]!.text);
    expect(result.queries[0].data).toHaveLength(200);
    expect(result.queries[0].truncated).toEqual({ row_count: 1000, rows_shown: 200 });
  });

  it('the read check after apply gives up after the deadline too', async () => {
    process.env.MCP_UNATTENDED_READ_TIMEOUT_MS = '40';
    const client = {
      getQueries: vi.fn().mockResolvedValue([sql]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env'),
      runQuery: vi.fn().mockReturnValue(new Promise(() => {})),
      getDataSourceSchema: vi.fn().mockResolvedValue(undefined),
    };
    const check = await checkPlanReads(client as unknown as ToolJetClient, { versionId: 'v1', queryIds: ['q2'] } as any);
    expect(check!.failed).toEqual([]);
    expect(check!.not_run).toEqual([{ name: 'list', reason: expect.stringMatching(/stopped waiting/) }]);
  });

  it('caps large rows by size as well as count', () => {
    const big = Array.from({ length: 100 }, (_, id) => ({ id, blob: 'x'.repeat(10_000) }));
    const capped = capUnattendedOutput({ status: 'ok', data: big });
    expect((capped.data as unknown[]).length).toBeLessThan(30);
    expect(capped.truncated).toMatchObject({ row_count: 100 });
    const nested = capUnattendedOutput({ status: 'ok', data: { results: Array.from({ length: 300 }, (_, id) => ({ id })) } });
    expect((nested.data as { results: unknown[] }).results).toHaveLength(200);
  });
});
