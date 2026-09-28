import { describe, expect, it, vi } from 'vitest';
import { runQueryTool } from '../src/tools/runQuery.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// Review 2026-09-25 (P0-1): the read check judged the saved SQL with its {{ }} bindings still in it, then the static
// resolver filled them in and ToolJet's SQL plugins ran the result as text. A binding that resolves to
// "; DELETE FROM orders" turned a proven read into a write.
describe('static bindings cannot turn a proven read into a write', () => {
  const pg = (sql: string) => ({ id: 'q1', name: 'orders_top', kind: 'postgresql', data_source_id: 'd1', options: { mode: 'sql', query: sql } });
  const clientFor = (query: Record<string, unknown>) => ({
    getQuery: vi.fn().mockResolvedValue(query),
    getQueries: vi.fn().mockResolvedValue([query]),
    getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env1'),
    runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: [{ id: 1 }] }),
  }) as unknown as ToolJetClient & { runQuery: ReturnType<typeof vi.fn> };
  const injected = [
    // The separator is hidden from the text check: an escape, or two strings joined.
    'SELECT id FROM orders LIMIT 5 {{"\\u003b DELETE FROM orders"}}',
    'SELECT id FROM orders WHERE id > {{1}} LIMIT 5 {{"\\x3b DELETE FROM orders"}}',
    "SELECT id FROM orders WHERE note = '{{\"x' \\u003b DROP TABLE orders \\u003b \" + \"-\" + \"-\"}}' LIMIT 5",
  ];

  for (const sql of injected) {
    it(`run_query refuses ${sql}`, async () => {
      const client = clientFor(pg(sql));
      const result = await runQueryTool(client).handler({ query_id: 'q1', version_id: 'v1' });
      expect(result.isError).toBe(true);
      expect((result.content[0] as { text: string }).text).toMatch(/after its \{\{ \}\} bindings/);
      expect(client.runQuery).not.toHaveBeenCalled();
    });
    it(`run_queries refuses ${sql}`, async () => {
      const client = clientFor(pg(sql));
      const result = await runQueriesTool(client).handler({ query_ids: ['q1'], version_id: 'v1' });
      expect(result.isError).toBe(true);
      expect(client.runQuery).not.toHaveBeenCalled();
    });
  }

  it('refuses a ToolJet DB SQL query whose binding adds a statement', async () => {
    const query = { id: 'q1', name: 'x', kind: 'tooljetdb', data_source_id: 'd1', options: { operation: 'sql_execution',
      sql_execution: { sqlQuery: 'SELECT id FROM orders LIMIT 5 {{"\\u003b DELETE FROM orders"}}' } } };
    const client = clientFor(query);
    const result = await runQueryTool(client).handler({ query_id: 'q1', version_id: 'v1' });
    expect(result.isError).toBe(true);
    expect(client.runQuery).not.toHaveBeenCalled();
  });

  it('still runs a date-bound read', async () => {
    const client = clientFor(pg("SELECT id FROM orders WHERE created_at >= '{{moment().format(\"YYYY-MM-DD\")}}' LIMIT 5"));
    const result = await runQueryTool(client).handler({ query_id: 'q1', version_id: 'v1' });
    expect(result.isError).not.toBe(true);
    expect(client.runQuery).toHaveBeenCalledTimes(1);
    const batch = clientFor(pg("SELECT id FROM orders WHERE created_at >= '{{moment().format(\"YYYY-MM-DD\")}}' LIMIT 5"));
    const batchResult = await runQueriesTool(batch).handler({ query_ids: ['q1'], version_id: 'v1' });
    expect(batchResult.isError).not.toBe(true);
    expect(batch.runQuery).toHaveBeenCalledTimes(1);
  });

  it('refuses a binding that lifts the row limit past the direct-read bound', async () => {
    const client = clientFor(pg('SELECT id FROM orders WHERE id > 0 {{"-" + "-"}} LIMIT 5'));
    const result = await runQueryTool(client).handler({ query_id: 'q1', version_id: 'v1' });
    expect(result.isError).toBe(true);
    expect(client.runQuery).not.toHaveBeenCalled();
  });
});
