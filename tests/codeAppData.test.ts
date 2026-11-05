import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { clearAppPlansForTests } from '../src/appPlanStore.js';
import { chunkSeeds, codeAppDataTool, undeclaredParameters } from '../src/tools/codeAppData.js';

const APP = '11111111-1111-4111-8111-111111111111';
const text = (result: { content: Array<{ text: string }> }): any => JSON.parse(result.content[0]!.text);

/** A workspace with ToolJet DB and no tables, and a Code mode app with no queries yet. */
function fakeClient(overrides: Record<string, unknown> = {}) {
  let tables: { id: string; table_name: string }[] = [];
  let queries: AppSummary['queries'] = [];
  const summary = (): AppSummary => ({ app_id: APP, name: 'Orders', version_id: 'v1', pages: [{ id: 'p', name: 'Home', handle: 'home', components: [] }], queries, events: [] });
  const client = {
    getApp: vi.fn().mockResolvedValue({ build_mode: 'code' }),
    getAppSummary: vi.fn().mockImplementation(async () => summary()),
    listDatasources: vi.fn().mockResolvedValue([{ id: 'tjdb', name: 'ToolJet DB', kind: 'tooljetdb' }]),
    listTables: vi.fn().mockImplementation(async () => tables),
    getTableSchema: vi.fn().mockResolvedValue([{ name: 'id', type: 'serial', isPrimaryKey: true }, { name: 'title', type: 'character varying' }]),
    createTables: vi.fn().mockImplementation(async ({ tables: made }: { tables: { tableName: string }[] }) => {
      tables = made.map((t, i) => ({ id: `t${i}`, table_name: t.tableName }));
      return tables.map((t) => ({ table_id: t.id, table_name: t.table_name }));
    }),
    insertRowsBatch: vi.fn().mockImplementation(async ({ tables: seeded }: { tables: { tableName: string; rows: unknown[] }[] }) =>
      seeded.map((t) => ({ table_name: t.tableName, processed_rows: t.rows.length }))),
    createQueries: vi.fn().mockImplementation(async ({ queries: made }: { queries: { name: string; options: Record<string, unknown>; dataSourceId: string; kind: string }[] }) => {
      queries = made.map((q, i) => ({ id: `q${i}`, name: q.name, kind: q.kind, data_source_id: q.dataSourceId, options: q.options }));
      return queries.map((q) => ({ query_id: q.id, name: q.name }));
    }),
    getQueries: vi.fn().mockImplementation(async () => queries),
    getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env'),
    runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: [{ id: 1, title: 'A' }] }),
    hasRows: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
  return client as unknown as ToolJetClient & typeof client;
}

const orders = {
  table_name: 'orders',
  columns: [{ name: 'id', type: 'serial', primaryKey: true }, { name: 'title', type: 'string' }, { name: 'status', type: 'string' }],
};
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Order ${i + 1}`, status: 'open' }));

describe('code_app_data', () => {
  beforeEach(() => clearAppPlansForTests());

  it('creates the tables, seeds them, creates the queries and checks the reads, in one call', async () => {
    const client = fakeClient();
    const result = await codeAppDataTool(client).handler({
      app_id: APP,
      tables: [orders],
      seed_data: [{ table_name: 'orders', rows: rows(60) }],
      queries: [
        { name: 'orders_page', table_ref: 'orders', options: { operation: 'list_rows', runOnPageLoad: true, list_rows: { limit: 25 } } },
        { name: 'set_status', table_ref: 'orders', options: { operation: 'update_rows', parameters: [{ name: 'id', defaultValue: '' }],
          update_rows: { where_filters: { 0: { column: 'id', operator: 'eq', value: '{{parameters.id}}' } }, columns: { 0: { column: 'status', value: 'done' } } } } },
      ],
    });
    expect(result.isError).toBeFalsy();
    const out = text(result);
    expect(out.applied).toEqual({ tables: 1, seed_rows: 60, queries: 2 });
    expect(out.tables).toEqual({ orders: 't0' });
    expect(out.queries).toEqual({ orders_page: 'q0', set_status: 'q1' });
    expect(out.read_check.ran).toBe(1);
    // 60 rows go in as entries of at most 40, the version is the app's, and the queries are on ToolJet DB.
    expect(client.insertRowsBatch.mock.calls[0][0].tables.map((t: { rows: unknown[] }) => t.rows.length)).toEqual([40, 20]);
    expect(client.createQueries.mock.calls[0][0]).toMatchObject({ versionId: 'v1', queries: [{ dataSourceId: 'tjdb' }, { dataSourceId: 'tjdb' }] });
  });

  it('writes nothing and lists every error when the spec does not check', async () => {
    const client = fakeClient();
    const result = await codeAppDataTool(client).handler({
      app_id: APP,
      tables: [{ table_name: 'orders', columns: [{ name: 'id', type: 'serial', primaryKey: true }, { name: 'title', type: 'string', notNull: true }] }],
      seed_data: [{ table_name: 'orders', rows: [{ status: 'open' }] }],
      queries: [{ name: 'add_order', table_ref: 'orders', options: { operation: 'create_row', create_row: { 0: { column: 'status', value: '{{parameters.status}}' } } } }],
    });
    const out = text(result);
    expect(out.ok).toBe(false);
    expect(out.written).toBe('nothing');
    expect(out.errors.join(' ')).toMatch(/omits required non-generated column "title"/);
    expect(out.errors.join(' ')).toMatch(/create_row for "orders" omits required non-generated column\(s\) "title"/);
    expect(client.createTables).not.toHaveBeenCalled();
    expect(client.createQueries).not.toHaveBeenCalled();
  });

  it('refuses a query that reads the signed-in user in the browser, before anything is written', async () => {
    const client = fakeClient();
    const result = await codeAppDataTool(client).handler({
      app_id: APP,
      queries: [{ name: 'mine', table_ref: 'orders', options: { operation: 'list_rows', list_rows: { limit: 10, where_filters: { 0: { column: 'owner', operator: 'eq', value: '{{globals.currentUser.email}}' } } } } }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/globals\.server\.currentUser/);
    expect(client.createQueries).not.toHaveBeenCalled();
  });

  it('refuses a query that reads a parameter it does not declare, and writes nothing', async () => {
    const client = fakeClient();
    const result = await codeAppDataTool(client).handler({
      app_id: APP,
      tables: [orders],
      queries: [{ name: 'orders_page', table_ref: 'orders', options: { operation: 'list_rows', list_rows: { limit: 25, offset: '{{parameters.offset}}' } } }],
    });
    const out = text(result);
    expect(out.ok).toBe(false);
    expect(out.errors[0]).toMatch(/Query "orders_page" reads parameters\.offset but does not declare it: add \{ "name": "offset", "defaultValue": "" \}/);
    expect(client.createTables).not.toHaveBeenCalled();
  });

  it('asks for at least one thing to write', async () => {
    const result = await codeAppDataTool(fakeClient()).handler({ app_id: APP });
    expect(result.isError).toBe(true);
  });
});

describe('chunkSeeds', () => {
  it('splits long entries into entries of 40 rows, in order', () => {
    expect(chunkSeeds([{ table_name: 'a', rows: rows(85) }, { table_name: 'b', rows: rows(3) }]).map((s) => [s.table_name, s.rows.length]))
      .toEqual([['a', 40], ['a', 40], ['a', 5], ['b', 3]]);
  });
});

describe('undeclaredParameters', () => {
  it('passes declared parameters and queries without any', () => {
    expect(undeclaredParameters([
      { name: 'a', options: { parameters: [{ name: 'id', defaultValue: '' }], update_rows: { columns: { 0: { column: 's', value: '{{parameters.id}}' } } } } },
      { name: 'b', options: { list_rows: { limit: 5 } } },
    ])).toEqual([]);
  });
});
