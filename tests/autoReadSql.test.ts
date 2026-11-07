import { describe, expect, it, vi } from 'vitest';
import { autoReadSqlRefusal, rawSqlOf } from '../src/autoReadSql.js';
import { checkPlanReads } from '../src/applyReadCheck.js';

// CM-36 (security retest 3, 2026-11-05): the automatic read check after apply_app_phase and code_app_data took the
// first LIMIT anywhere in the SQL as the bound, so a LIMIT inside a subquery let an unbounded outer SELECT run with
// nobody asking for it, and a SELECT calling an arbitrary function passed as a proven read.
const NESTED = 'SELECT t.id FROM tickets t WHERE t.assignee_id IN (SELECT a.id FROM agents a LIMIT 1)';

describe('which raw SQL an automatic read check may run', () => {
  it('does not run a SELECT whose only LIMIT is in a subquery', () => {
    expect(autoReadSqlRefusal(NESTED)).toMatch(/not the final clause/);
  });

  it('does not run a UNION, even with a LIMIT in one branch or at the end', () => {
    expect(autoReadSqlRefusal('SELECT id FROM a LIMIT 5 UNION SELECT id FROM b')).toMatch(/UNION/);
    expect(autoReadSqlRefusal('SELECT id FROM a UNION ALL SELECT id FROM b LIMIT 5')).toMatch(/UNION/);
    expect(autoReadSqlRefusal('SELECT id FROM a INTERSECT SELECT id FROM b LIMIT 5')).toMatch(/UNION/);
  });

  it('does not run a CTE, with an inner LIMIT or a data-modifying one', () => {
    expect(autoReadSqlRefusal('WITH x AS (SELECT id FROM a LIMIT 1) SELECT t.id FROM t JOIN x ON x.id = t.a_id')).toMatch(/WITH/);
    expect(autoReadSqlRefusal('WITH d AS (DELETE FROM a RETURNING id) SELECT id FROM d LIMIT 5')).toMatch(/WITH/);
  });

  it('does not run a call to a function that is not a well-known pure one', () => {
    expect(autoReadSqlRefusal('SELECT id, archive_ticket(id) FROM tickets LIMIT 5')).toMatch(/archive_ticket/);
    expect(autoReadSqlRefusal('SELECT id FROM tickets WHERE notify(id) LIMIT 5')).toMatch(/notify/);
    expect(autoReadSqlRefusal('SELECT id FROM tickets WHERE public.lower(name) = \'x\' LIMIT 5')).toMatch(/public\.lower/);
    expect(autoReadSqlRefusal('SELECT pg_sleep(10)')).toMatch(/pg_sleep/);
  });

  it('runs a plain bounded SELECT and an aggregate', () => {
    expect(autoReadSqlRefusal('SELECT id, lower(name) AS name FROM tickets WHERE status = \'open\' ORDER BY id LIMIT 50')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT id FROM tickets ORDER BY id LIMIT 20 OFFSET 40')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT count(*) AS n FROM tickets WHERE status = \'open\'')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT count(*), max(created_at) FROM tickets')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT id FROM tickets WHERE id IN (SELECT ticket_id FROM tags LIMIT 3) LIMIT 10')).toBeUndefined();
  });

  it('does not run an unbounded or grouped read, or a bound above the automatic limit', () => {
    expect(autoReadSqlRefusal('SELECT id FROM tickets')).toMatch(/no row limit/);
    expect(autoReadSqlRefusal('SELECT status, count(*) FROM tickets GROUP BY status')).toMatch(/no row limit/);
    expect(autoReadSqlRefusal('SELECT id FROM tickets LIMIT 5000')).toMatch(/above/);
    expect(autoReadSqlRefusal('SELECT id FROM tickets LIMIT {{components.n.value}}')).toBeDefined();
  });

  it('a LIMIT or a function name inside a string literal proves nothing and refuses nothing', () => {
    expect(autoReadSqlRefusal("SELECT id FROM t WHERE note = 'limit 1' ")).toMatch(/no row limit/);
    expect(autoReadSqlRefusal("SELECT id FROM t WHERE note = 'drop(x)' LIMIT 5")).toBeUndefined();
  });

  it('judges raw SQL only: structured ToolJet Database queries are not raw SQL', () => {
    expect(rawSqlOf({ kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't1', list_rows: { limit: 10 } } })).toBeUndefined();
    expect(rawSqlOf({ kind: 'postgresql', options: { mode: 'gui', operation: 'list_rows' } })).toBeUndefined();
    expect(rawSqlOf({ kind: 'tooljetdb', options: { operation: 'sql_execution', sql_execution: { sqlQuery: NESTED } } })).toBe(NESTED);
    expect(rawSqlOf({ kind: 'postgresql', options: { mode: 'sql', query: NESTED } })).toBe(NESTED);
  });
});

describe('the read check after a phase reports such SQL as not checked', () => {
  const saved = [
    { id: 'q-nested', name: 'assigned', kind: 'postgresql', options: { mode: 'sql', query: NESTED } },
    { id: 'q-fn', name: 'withFn', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT id, archive_ticket(id) FROM tickets LIMIT 5' } },
    { id: 'q-ok', name: 'recent', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT id FROM tickets ORDER BY id DESC LIMIT 10' } },
    { id: 'q-count', name: 'open', kind: 'postgresql', options: { mode: 'sql', query: "SELECT count(*) FROM tickets WHERE status = 'open'" } },
    { id: 'q-tjdb', name: 'rows', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't1', list_rows: { limit: 100 } } },
  ];
  const client = () => ({
    getQueries: vi.fn(async () => saved),
    getDevelopmentEnvironmentId: vi.fn(async () => 'env-dev'),
    runQuery: vi.fn(async () => ({ status: 'ok', data: [{ id: 1 }] })),
  });

  it('never runs them, and counts them as neither passed nor failed', async () => {
    const c = client();
    const check = (await checkPlanReads(c as never, { versionId: 'v1', queryIds: saved.map((q) => q.id) }))!;
    expect(c.runQuery.mock.calls.map((call) => (call[0] as { queryId: string }).queryId).sort()).toEqual(['q-count', 'q-ok', 'q-tjdb']);
    expect(check.ran).toBe(3);
    expect(check.failed).toEqual([]);
    expect(check.inconclusive).toEqual([]);
    expect(Object.keys(check.rows).sort()).toEqual(['open', 'recent', 'rows']);
    expect(check.not_run.map((entry) => entry.name).sort()).toEqual(['assigned', 'withFn']);
    for (const entry of check.not_run) expect(entry.reason).toMatch(/^not checked automatically, run it explicitly/);
  });
});
