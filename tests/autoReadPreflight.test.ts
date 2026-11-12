import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { AppSummary, QuerySummary, ToolJetClient } from '../src/tooljetClient.js';
import { autoReadPreflight } from '../src/autoReadPreflight.js';
import { autoReadSqlRefusal } from '../src/autoReadSql.js';
import { checkPlanReads } from '../src/applyReadCheck.js';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { renderAuditRequest } from '../src/renderAuditPolicy.js';
import { clearAppPlansForTests } from '../src/appPlanStore.js';
import { codeAppDataTool } from '../src/tools/codeAppData.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import { runQueryTool } from '../src/tools/runQuery.js';

// Security retest 4 (2026-11-05). CM-37: a PostgreSQL GUI delete_rows with limit 1 passed as a bounded list_rows, so the
// automatic read check after code_app_data deleted a row, and run_queries ran it labelled read_only. CM-36 residuals:
// bracket contents were erased as identifiers in every dialect (ARRAY[nextval(...)] ran), `--` was a comment in MySQL
// without a space after it, SQL Server TOP PERCENT / WITH TIES / NEXT VALUE FOR passed, and run_queries ran SQL the apply
// check had refused. Every input the reviewer tried is here, with the decision it must get from the apply check and
// from run_queries alike.

// Retest-4 fixture-results.json, `sql`: [id, kind, sql or null (ToolJet DB list_rows), expected].
const SQL_CASES: Array<[string, string, string | null, 'run' | 'skip']> = [
  ['nested-only', 'postgresql', 'SELECT id FROM tickets WHERE assignee IN (SELECT id FROM agents LIMIT 1)', 'skip'],
  ['correlated', 'postgresql', 'SELECT a.id FROM accounts a WHERE EXISTS (SELECT 1 FROM tickets t WHERE t.owner = a.id LIMIT 1)', 'skip'],
  ['correlated-bounded', 'postgresql', 'SELECT a.id FROM accounts a WHERE EXISTS (SELECT 1 FROM tickets t WHERE t.owner = a.id) ORDER BY a.id LIMIT 4', 'run'],
  ['window', 'postgresql', 'SELECT sum(id) OVER (ORDER BY id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) FROM t', 'skip'],
  ['string-only', 'postgresql', "SELECT id FROM t WHERE name = 'LIMIT 1'", 'skip'],
  ['comment-only', 'postgresql', 'SELECT id FROM t /* LIMIT 1 */', 'skip'],
  ['cte', 'postgresql', 'WITH x AS (SELECT id FROM t LIMIT 1) SELECT id FROM x', 'skip'],
  ['write-cte', 'postgresql', 'WITH d AS (DELETE FROM t RETURNING id) SELECT id FROM d LIMIT 1', 'skip'],
  ['union', 'postgresql', '(SELECT id FROM t LIMIT 1) UNION ALL SELECT id FROM t', 'skip'],
  ['intersect', 'postgresql', 'SELECT id FROM t INTERSECT SELECT id FROM u LIMIT 1', 'skip'],
  ['except', 'postgresql', 'SELECT id FROM t EXCEPT SELECT id FROM u LIMIT 1', 'skip'],
  ['select-into', 'postgresql', 'SELECT id INTO tmp FROM t LIMIT 1', 'skip'],
  ['for-update', 'postgresql', 'SELECT id FROM t LIMIT 1 FOR UPDATE', 'skip'],
  ['offset-only', 'postgresql', 'SELECT id FROM t OFFSET 1', 'skip'],
  ['fetch-first', 'postgresql', 'SELECT id FROM t ORDER BY id FETCH FIRST 7 ROWS ONLY', 'run'],
  ['schema-qualified-pure', 'postgresql', 'SELECT public.lower(name) FROM t LIMIT 1', 'skip'],
  ['bare-homonym', 'postgresql', 'SELECT lower(name) FROM t LIMIT 1', 'run'],
  ['overload-borrowed-name', 'postgresql', 'SELECT lower(id::integer) FROM t LIMIT 1', 'skip'],
  ['pgsql-arr-sequence', 'postgresql', "SELECT ARRAY[nextval('sample_seq')] FROM t LIMIT 1", 'skip'],
  ['pgsql-subscript', 'postgresql', "SELECT ids[nextval('sample_seq')::int] FROM t LIMIT 1", 'skip'],
  ['qualified-hidden', 'postgresql', 'SELECT ARRAY[public.my_func(id)] FROM t LIMIT 1', 'skip'],
  ['pgsql-nested-sleep', 'postgresql', 'SELECT ARRAY[(SELECT 1 FROM pg_sleep(10))] FROM t LIMIT 1', 'skip'],
  ['valid-quoted', 'postgresql', 'SELECT lower("Case Sensitive") FROM t ORDER BY id LIMIT 3 OFFSET 2', 'run'],
  ['valid-aggregate', 'postgresql', 'SELECT count(*) AS total FROM t', 'run'],
  ['named-pg_sleep', 'postgresql', 'SELECT pg_sleep(1) FROM t LIMIT 1', 'skip'],
  ['named-nextval', 'postgresql', "SELECT nextval('s') FROM t LIMIT 1", 'skip'],
  ['named-setval', 'postgresql', "SELECT setval('s',3) FROM t LIMIT 1", 'skip'],
  ['named-lo_import', 'postgresql', "SELECT lo_import('x') FROM t LIMIT 1", 'skip'],
  ['named-dblink', 'postgresql', "SELECT dblink('x','select 1') FROM t LIMIT 1", 'skip'],
  ['named-set_config', 'postgresql', "SELECT set_config('x','y',true) FROM t LIMIT 1", 'skip'],
  ['mysql-minus', 'mysql', 'SELECT id--(SELECT SLEEP(2))\nFROM t LIMIT 1', 'skip'],
  ['mysql-comma-limit', 'mysql', 'SELECT id FROM t LIMIT 1, 4', 'run'],
  ['mssql-top', 'mssql', 'SELECT TOP 3 id FROM t', 'run'],
  ['mssql-pct', 'mssql', 'SELECT TOP 100 PERCENT id FROM t', 'skip'],
  ['mssql-ties', 'mssql', 'SELECT TOP 1 WITH TIES id FROM t ORDER BY status', 'skip'],
  ['mssql-sub-parentop', 'mssql', 'SELECT TOP (4) [First Name] FROM t', 'run'],
  ['mssql-sequence', 'mssql', 'SELECT NEXT VALUE FOR dbo.sample_seq', 'skip'],
  ['mssql-lock', 'mssql', 'SELECT TOP 1 id FROM t WITH (UPDLOCK, HOLDLOCK)', 'skip'],
  ['tjdb-array', 'tooljetdb', "SELECT ARRAY[nextval('sample_seq')] FROM t LIMIT 1", 'skip'],
  ['tjdb-bounded', 'tooljetdb', 'SELECT id FROM t LIMIT 1', 'run'],
  ['tjdb-structured', 'tooljetdb', null, 'run'],
];

const optionsFor = (kind: string, sql: string | null): Record<string, unknown> => kind === 'tooljetdb'
  ? sql ? { operation: 'sql_execution', sql_execution: { sqlQuery: sql } } : { operation: 'list_rows', table_id: 'demo', list_rows: { limit: 5 } }
  : { mode: 'sql', query: sql };

/** A client holding the saved queries, recording every run. */
function savedClient(queries: QuerySummary[]) {
  return {
    getQueries: vi.fn(async () => structuredClone(queries)),
    getDevelopmentEnvironmentId: vi.fn(async () => 'env-dev'),
    runQuery: vi.fn(async () => ({ status: 'ok', data: [{ id: 1 }] })),
  };
}

// The agent's finish step counts a run_queries error as "refused, nothing ran" only by this envelope
// (TJ-AI mcp_agent/langgraph_agent.py _safe_runtime_refusal); any other shape becomes a failure or a pass.
const AGENT_REFUSAL = /^(?:Error:\s*)?run_quer(?:y|ies) refused\b[^\n]*\bbefore execution:/i;

describe('every retest-4 SQL input gets the same decision from the apply check and from run_queries', () => {
  it.each(SQL_CASES)('%s (%s) is %s', async (id, kind, sql, expected) => {
    const query = { id, name: id, kind, options: optionsFor(kind, sql) } as QuerySummary;
    expect(autoReadPreflight(query).run).toBe(expected === 'run');

    const apply = savedClient([query]);
    const check = (await checkPlanReads(apply as never, { versionId: 'v1', queryIds: [id] }))!;
    expect(apply.runQuery).toHaveBeenCalledTimes(expected === 'run' ? 1 : 0);
    if (expected === 'run') {
      expect(check).toMatchObject({ ran: 1, not_run: [], queries: [{ name: id, status: 'checked', outcome: 'passed' }] });
    } else {
      expect(check.ran).toBe(0);
      expect(check.rows).toEqual({});
      expect(check.not_run).toEqual([{ name: id, reason: expect.any(String) }]);
      expect(check.queries).toEqual([{ name: id, status: 'refused', reason: check.not_run[0]!.reason }]);
    }

    const batch = savedClient([query]);
    const result = await runQueriesTool(batch as unknown as ToolJetClient).handler({ query_ids: [id], version_id: 'v1', include_data: false });
    expect(batch.runQuery).toHaveBeenCalledTimes(expected === 'run' ? 1 : 0);
    if (expected === 'run') {
      expect(result.isError).toBeFalsy();
      const body = JSON.parse(result.content[0]!.text);
      expect(body.queries[0]).toMatchObject({ status: 'ok', execution: { preflight: 'automatic_read' } });
      expect(body.queries[0].execution).not.toHaveProperty('read_only');
    } else {
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toMatch(AGENT_REFUSAL);
    }
  });
});

describe('the SQL dialect decides what is code (CM-36 residuals)', () => {
  it('reads brackets as SQL in PostgreSQL and ToolJet DB, and as identifiers only in SQL Server', () => {
    expect(autoReadSqlRefusal("SELECT ARRAY[nextval('s')] FROM t LIMIT 1", 'postgresql')).toMatch(/nextval/);
    expect(autoReadSqlRefusal("SELECT ARRAY[nextval('s')] FROM t LIMIT 1")).toMatch(/nextval/);
    expect(autoReadSqlRefusal('SELECT ids[1] FROM t LIMIT 1', 'postgresql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT [nextval(x)] FROM t ORDER BY 1 OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY', 'mssql')).toBeUndefined();
  });

  it('refuses -- without a space and # under MySQL rules, and keeps them as comments where MySQL is ruled out', () => {
    expect(autoReadSqlRefusal('SELECT id--(SELECT SLEEP(2))\nFROM t LIMIT 1', 'mysql')).toMatch(/--/);
    expect(autoReadSqlRefusal('SELECT id--(SELECT SLEEP(2))\nFROM t LIMIT 1')).toMatch(/--/);
    expect(autoReadSqlRefusal('SELECT id -- note\nFROM t LIMIT 1', 'mysql')).toBeUndefined();
    // MySQL reads `# '` as a comment and runs SLEEP; a scanner that treats # as code sees one string and no call.
    expect(autoReadSqlRefusal("SELECT id # '\n, SLEEP(5) AS x FROM t LIMIT 1 -- '", 'mysql')).toMatch(/#/);
    expect(autoReadSqlRefusal("SELECT id # '\n, SLEEP(5) AS x FROM t LIMIT 1 -- '")).toMatch(/#/);
    expect(autoReadSqlRefusal('SELECT id FROM t ORDER BY id LIMIT 1 --x', 'postgresql')).toBeUndefined();
  });

  it('refuses executable comments and optimizer hints in any dialect', () => {
    expect(autoReadSqlRefusal('SELECT id /*!50000 , SLEEP(1) */ FROM t LIMIT 1', 'mysql')).toMatch(/executable comment/);
    expect(autoReadSqlRefusal('SELECT id /*M!100000 , SLEEP(1) */ FROM t LIMIT 1', 'mysql')).toMatch(/executable comment/);
    expect(autoReadSqlRefusal('SELECT /*+ SET_VAR(sort_buffer_size = 16M) */ id FROM t LIMIT 1', 'mysql')).toMatch(/hint/);
  });

  it('refuses string literals that read differently with and without backslash escapes', () => {
    // Standard strings close at the second quote and run pg_sleep; escape strings read one long string.
    expect(autoReadSqlRefusal("SELECT 'a\\', pg_sleep(10) -- '\nFROM t LIMIT 1", 'postgresql')).toMatch(/backslash/);
  });

  it('accepts only a fixed SQL Server TOP, with or without parentheses', () => {
    expect(autoReadSqlRefusal('SELECT TOP (4) [First Name] FROM t', 'mssql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT DISTINCT TOP 5 id FROM t', 'mssql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT TOP 2000 id FROM t', 'mssql')).toMatch(/above/);
    expect(autoReadSqlRefusal('SELECT TOP (@n) id FROM t', 'mssql')).toMatch(/TOP/);
    expect(autoReadSqlRefusal('SELECT TOP (50) PERCENT id FROM t', 'mssql')).toMatch(/PERCENT/);
    expect(autoReadSqlRefusal('SELECT id FROM t ORDER BY id FETCH FIRST 5 ROWS WITH TIES', 'postgresql')).toMatch(/TIES/);
    // TOP is not a keyword in PostgreSQL: top(...) there is a routine call.
    expect(autoReadSqlRefusal('SELECT top(5) FROM t LIMIT 1', 'postgresql')).toMatch(/top\(\)/);
  });

  it('accepts NOLOCK and refuses other table hints, sequences, assignments and query hints', () => {
    expect(autoReadSqlRefusal('SELECT TOP 5 id FROM t WITH (NOLOCK)', 'mssql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT TOP 5 id FROM t WITH (XLOCK)', 'mssql')).toMatch(/hint/);
    expect(autoReadSqlRefusal('SELECT TOP 5 id FROM t WITH (INDEX(ix_t))', 'mssql')).toBeDefined();
    expect(autoReadSqlRefusal('SELECT NEXT VALUE FOR dbo.s', 'mssql')).toMatch(/sequence/);
    expect(autoReadSqlRefusal('SELECT @n := id FROM t LIMIT 1', 'mysql')).toMatch(/assigns/);
    expect(autoReadSqlRefusal('SELECT TOP 5 id FROM t OPTION (MAXDOP 1)', 'mssql')).toMatch(/query hint/);
  });

  it('accepts an unreserved keyword only where its keyword use belongs', () => {
    expect(autoReadSqlRefusal("SELECT count(*) FILTER (WHERE status = 'open') AS open FROM t LIMIT 1", 'postgresql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT id, row_number() OVER (PARTITION BY a ORDER BY b) FROM t LIMIT 5', 'postgresql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT t.id FROM t JOIN (SELECT id FROM u) x ON x.id = t.id LIMIT 5', 'postgresql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT filter(id) FROM t LIMIT 1', 'postgresql')).toMatch(/filter\(\)/);
    expect(autoReadSqlRefusal('SELECT id FROM t WHERE over(id) LIMIT 1', 'postgresql')).toMatch(/over\(\)/);
    expect(autoReadSqlRefusal('SELECT within(id) FROM t LIMIT 1', 'postgresql')).toMatch(/within\(\)/);
  });

  it('refuses a cast that picks an overload the built-in function does not have, and keeps the ordinary casts', () => {
    expect(autoReadSqlRefusal('SELECT lower(id::integer) FROM t LIMIT 1', 'postgresql')).toMatch(/lower\(\) with an argument cast to integer/);
    expect(autoReadSqlRefusal('SELECT upper(CAST(id AS bigint)) FROM t LIMIT 1', 'postgresql')).toMatch(/upper\(\)/);
    expect(autoReadSqlRefusal('SELECT round(price::text) FROM t LIMIT 1', 'postgresql')).toMatch(/round\(\)/);
    expect(autoReadSqlRefusal('SELECT round(avg(price)::numeric, 2) AS p FROM t LIMIT 1', 'postgresql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT lower(code::text) FROM t LIMIT 5', 'postgresql')).toBeUndefined();
    expect(autoReadSqlRefusal('SELECT coalesce(x::int, 0) FROM t LIMIT 5', 'postgresql')).toBeUndefined();
  });
});

describe('the connector decides which branch runs, and where its bound is (CM-37)', () => {
  const q = (kind: string, options: Record<string, unknown>) => ({ id: 'q', name: 'q', kind, options }) as QuerySummary;
  const refused = (kind: string, options: Record<string, unknown>) => {
    const verdict = autoReadPreflight(q(kind, options));
    expect(verdict.run).toBe(false);
    return verdict.run ? '' : verdict.reason;
  };

  it('never runs a GUI write, whatever limit it carries, and the general classifier no longer calls it a read', () => {
    for (const operation of ['delete_rows', 'update_rows', 'create_row', 'upsert_rows', 'bulk_insert', 'bulk_update_pkey', 'bulk_upsert_pkey']) {
      for (const kind of ['postgresql', 'mysql', 'mariadb', 'mssql', 'oracledb', 'snowflake', 'databricks']) {
        const options = { mode: 'gui', operation, table: 'demo', limit: 1, [operation]: { where_filters: { 0: { column: 'id', operator: 'eq', value: 1 } } } };
        expect(assessQueryRead(q(kind, options)).provenRead, `${kind} ${operation}`).toBe(false);
        expect(refused(kind, options), `${kind} ${operation}`).toMatch(new RegExp(`${operation}.*not a read`));
      }
    }
    expect(refused('postgresql', { mode: 'gui', table: 'demo', limit: 1 })).toMatch(/no operation/);
  });

  it('runs a GUI list_rows only when its bound is the top-level limit', () => {
    expect(autoReadPreflight(q('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5 })).run).toBe(true);
    expect(autoReadPreflight(q('mssql', { mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5, offset: 10 })).run).toBe(true);
    // The connector ignores list_rows.limit: SELECT * FROM "demo", no limit.
    expect(assessQueryRead(q('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo', list_rows: { limit: 1 } })))
      .toMatchObject({ directSafe: false, requiresCountPreflight: true, reason: expect.stringMatching(/top-level limit and ignores list_rows\.limit/) });
    expect(refused('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo', list_rows: { limit: 1 } })).toMatch(/ignores list_rows\.limit/);
    expect(refused('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5, list_rows: { limit: 1 } })).toMatch(/ignores/);
    expect(refused('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5000 })).toMatch(/above/);
    expect(refused('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo' })).toMatch(/no statically provable row limit/);
  });

  it('refuses a contradictory or unknown discriminator', () => {
    // SQL mode runs the SQL text, whatever operation sits beside it; the general classifier now judges that text.
    const confused = { mode: 'sql', operation: 'list_rows', list_rows: { limit: 1 }, limit: 1, query: 'UPDATE demo SET status = 2 WHERE id = 1' };
    expect(assessQueryRead(q('postgresql', confused)).provenRead).toBe(false);
    expect(refused('postgresql', { mode: 'sql', operation: 'list_rows', query: 'SELECT id FROM demo LIMIT 1' })).toMatch(/also names the GUI operation/);
    expect(refused('postgresql', { mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5, query: 'SELECT id FROM demo LIMIT 1' })).toMatch(/also carries SQL text/);
    expect(refused('postgresql', { query: 'SELECT id FROM demo LIMIT 1' })).toMatch(/mode is missing/);
    expect(refused('mysql', { mode: 'nosql', query: 'SELECT id FROM demo LIMIT 1' })).toMatch(/mode is "nosql"/);
    expect(refused('postgresql', { mode: 'gui', operation: 'LIST_ROWS', table: 'demo', limit: 5 })).toMatch(/not a read/);
    // MariaDB and Oracle run their SQL text when no mode is set.
    expect(autoReadPreflight(q('mariadb', { query: 'SELECT id FROM demo LIMIT 1' })).run).toBe(true);
    expect(autoReadPreflight(q('oracledb', { mode: 'sql', query: 'SELECT id FROM demo FETCH FIRST 5 ROWS ONLY' })).run).toBe(true);
  });

  it('reads ToolJet Database bounds from list_rows only', () => {
    expect(autoReadPreflight(q('tooljetdb', { operation: 'list_rows', table_id: 't', list_rows: { limit: 10 } })).run).toBe(true);
    expect(assessQueryRead(q('tooljetdb', { operation: 'list_rows', table_id: 't', limit: 1, list_rows: {} })))
      .toMatchObject({ directSafe: false, reason: expect.stringMatching(/ignores a top-level limit/) });
    expect(refused('tooljetdb', { operation: 'list_rows', table_id: 't', limit: 1, list_rows: { limit: 10 } })).toMatch(/top-level limit/);
    expect(refused('tooljetdb', { operation: 'delete_rows', table_id: 't', delete_rows: { limit: 1 } })).toMatch(/delete_rows/);
  });

  it('runs only connectors whose branches are known, and says so', () => {
    expect(refused('clickhouse', { operation: 'sql', query: 'SELECT id FROM t LIMIT 1' })).toMatch(/automatic checks run only/);
    expect(refused('saphana', { query: 'SELECT id FROM t LIMIT 1' })).toMatch(/automatic checks run only/);
    expect(refused('mongodb', { operation: 'find', collection: 'c', options: '{"limit": 5}' })).toBeTruthy();
  });

  it('no longer reads stray SQL text as the read when the connector runs another operation', () => {
    expect(assessQueryRead(q('bigquery', { mode: 'gui', operation: 'delete_table', query: 'SELECT id FROM t LIMIT 1' })).provenRead).toBe(false);
    expect(assessQueryRead(q('bigquery', { mode: 'sql', query: 'SELECT id FROM t LIMIT 1' })).provenRead).toBe(true);
    expect(assessQueryRead(q('harperdb', { mode: 'nosql', operation: 'delete', sql_query: 'SELECT id FROM t LIMIT 1' })).provenRead).toBe(false);
    expect(assessQueryRead(q('cosmosdb', { operation: 'delete_item', query: 'SELECT c.id FROM c LIMIT 1' })).provenRead).toBe(false);
    expect(assessQueryRead(q('clickhouse', { operation: 'insert', query: 'SELECT id FROM t LIMIT 1' })).provenRead).toBe(false);
    expect(assessQueryRead(q('salesforce', { operation: 'crud', soql_query: 'SELECT Id FROM Account LIMIT 1' })).provenRead).toBe(false);
  });

  it('judges the SQL its static bindings resolve to, which the server splices in as text', () => {
    const injected = { mode: 'sql', query: 'SELECT id FROM t WHERE id = {{"1 OR nextval(\'s\') > 0"}} LIMIT 1' };
    expect(refused('postgresql', injected)).toMatch(/once its \{\{ \}\} bindings resolve.*nextval/);
    expect(autoReadPreflight(q('postgresql', { mode: 'sql', query: 'SELECT id FROM t WHERE id = {{1 + 1}} LIMIT 1' })).run).toBe(true);
  });
});

describe('an explicit run_query refuses a GUI write it used to run as a read', () => {
  it('refuses PostgreSQL GUI delete_rows before execution', async () => {
    const client = { getQuery: vi.fn(async () => ({ id: 'del', name: 'del', kind: 'postgresql',
      options: { mode: 'gui', operation: 'delete_rows', table: 'demo', limit: 1 } })), runQuery: vi.fn() };
    const result = await runQueryTool(client as unknown as ToolJetClient).handler({ query_id: 'del', version_id: 'v1' });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/refused .*delete_rows/);
    expect(client.runQuery).not.toHaveBeenCalled();
  });
});

describe('a render audit lets the page run only what the automatic preflight allows', () => {
  const run = 'http://viewer.test/api/data-queries/q1/versions/v1/run/env?mode=view';
  const saved = (options: Record<string, unknown>) => ({ version_id: 'v1', queries: [{ id: 'q1', kind: 'postgresql', options }] }) as never;
  it('blocks a GUI delete_rows and an unbounded GUI list_rows, and allows a bounded one', () => {
    expect(renderAuditRequest(run, 'POST', saved({ mode: 'gui', operation: 'delete_rows', table: 'demo', limit: 1 })).allowed).toBe(false);
    expect(renderAuditRequest(run, 'POST', saved({ mode: 'gui', operation: 'list_rows', table: 'demo', list_rows: { limit: 1 } })).allowed).toBe(false);
    expect(renderAuditRequest(run, 'POST', saved({ mode: 'sql', query: "SELECT ARRAY[nextval('s')] FROM t LIMIT 1" })).allowed).toBe(false);
    expect(renderAuditRequest(run, 'POST', saved({ mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5 })).allowed).toBe(true);
  });
});

// Retest-4 fixture-results.json, `plan`: the code_app_data path the reviewer drove (schema, lint, apply, saved query,
// automatic read check), then run_queries on the saved query, as the agent's finish step does.
describe('code_app_data, then run_queries, on the reviewer\'s plan inputs', () => {
  const APP = '11111111-1111-4111-8111-111111111111';
  const VERSION = '22222222-2222-4222-8222-222222222222';
  const DS = '33333333-3333-4333-8333-333333333333';
  const QID = '44444444-4444-4444-8444-444444444444';

  function planClient() {
    let saved: AppSummary['queries'] = [];
    const calls: unknown[] = [];
    const client = {
      getApp: vi.fn(async () => ({ build_mode: 'code' })),
      getAppSummary: vi.fn(async () => ({ app_id: APP, name: 'Demo', version_id: VERSION, pages: [{ id: 'p', name: 'Home', handle: 'home', components: [] }], queries: saved, events: [] })),
      listDatasources: vi.fn(async () => [{ id: DS, name: 'db_demo', kind: 'postgresql' }]),
      listTables: vi.fn(async () => []),
      createQueries: vi.fn(async ({ queries }: { queries: Array<{ name: string; kind: string; dataSourceId: string; options: Record<string, unknown> }> }) => {
        saved = queries.map((query) => ({ id: QID, name: query.name, kind: query.kind, data_source_id: query.dataSourceId, options: structuredClone(query.options) }));
        return saved.map((query) => ({ query_id: query.id, name: query.name }));
      }),
      getQueries: vi.fn(async () => structuredClone(saved)),
      getDevelopmentEnvironmentId: vi.fn(async () => 'demo'),
      runQuery: vi.fn(async (args: unknown) => { calls.push(args); return { status: 'ok', data: [{ id: 1 }] }; }),
    };
    return { client, calls, saved: () => saved };
  }

  async function drive(options: Record<string, unknown>) {
    const { client, calls, saved } = planClient();
    const tool = codeAppDataTool(client as unknown as ToolJetClient);
    const input = z.object(tool.inputSchema as z.ZodRawShape).parse({ app_id: APP, queries: [{ name: 'demo_action', datasource_name: 'db_demo', options }] });
    const applied = JSON.parse((await tool.handler(input as never)).content[0]!.text);
    const applyCalls = calls.length;
    let batch: { isError?: boolean; text: string } | undefined;
    if (saved().length) {
      const result = await runQueriesTool(client as unknown as ToolJetClient).handler({ version_id: VERSION, query_ids: [QID], include_data: false });
      batch = { isError: result.isError, text: result.content[0]!.text };
    }
    return { applied, applyCalls, batch, batchCalls: calls.length - applyCalls };
  }

  beforeEach(() => clearAppPlansForTests());

  it('ordinary-control: a bounded SELECT runs at apply and in the batch', async () => {
    const out = await drive({ mode: 'sql', query: 'SELECT id FROM demo LIMIT 1' });
    expect(out.applied.read_check).toMatchObject({ ran: 1, not_run: [], queries: [{ name: 'demo_action', status: 'checked', outcome: 'passed' }] });
    expect([out.applyCalls, out.batchCalls]).toEqual([1, 1]);
    expect(JSON.parse(out.batch!.text).queries[0].execution).toEqual({ query_id: QID, datasource_kind: 'postgresql', preflight: 'automatic_read' });
  });

  it.each([
    ['unknown-control', { mode: 'sql', query: 'SELECT untrusted_fn(id) FROM demo LIMIT 1' }, /untrusted_fn/],
    ['query-control', { mode: 'sql', query: 'UPDATE demo SET status = 2 WHERE id = 1' }, /not a single proven read/],
    ['confused-gui', { mode: 'gui', operation: 'delete_rows', table: 'demo', limit: 1, delete_rows: { where_filters: { 0: { column: 'id', operator: 'eq', value: 1 } } } }, /delete_rows.*not a read/],
    ['listrow-limit-mismatch', { mode: 'gui', operation: 'list_rows', table: 'demo', list_rows: { limit: 1 } }, /ignores list_rows\.limit/],
    ['nested-bounds-only', { mode: 'sql', query: 'SELECT id FROM demo WHERE id IN (SELECT id FROM demo LIMIT 1)' }, /not the final clause/],
  ] as Array<[string, Record<string, unknown>, RegExp]>)('%s: saved, refused at apply, refused again by run_queries, never run', async (_label, options, why) => {
    const out = await drive(options);
    expect(out.applied.applied).toEqual({ queries: 1 });
    expect(out.applied.read_check).toMatchObject({ ran: 0, rows: {}, failed: [], inconclusive: [] });
    expect(out.applied.read_check.not_run).toEqual([{ name: 'demo_action', reason: expect.stringMatching(why) }]);
    expect(out.applied.read_check.queries).toEqual([{ name: 'demo_action', status: 'refused', reason: expect.stringMatching(why) }]);
    expect(out.batch!.isError).toBe(true);
    expect(out.batch!.text).toMatch(AGENT_REFUSAL);
    expect(out.batch!.text).toMatch(why);
    expect([out.applyCalls, out.batchCalls]).toEqual([0, 0]);
  });

  it('confused-sql: SQL mode beside a list_rows operation is refused by the writer lint, nothing is saved', async () => {
    const out = await drive({ mode: 'sql', operation: 'list_rows', list_rows: { limit: 1 }, query: 'UPDATE demo SET status = 2 WHERE id = 1' });
    expect(out.applied).toMatchObject({ ok: false, written: 'nothing' });
    expect(out.batch).toBeUndefined();
    expect(out.applyCalls).toBe(0);
  });

  it('a GUI list_rows bounded at the top-level limit is checked', async () => {
    const out = await drive({ mode: 'gui', operation: 'list_rows', table: 'demo', limit: 5 });
    expect(out.applied.read_check).toMatchObject({ ran: 1, queries: [{ status: 'checked', outcome: 'passed' }] });
    expect([out.applyCalls, out.batchCalls]).toEqual([1, 1]);
  });
});
