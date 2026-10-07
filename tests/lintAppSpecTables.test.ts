import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { clearAppPlansForTests, consumeAppPlan } from '../src/appPlanStore.js';
import type { AppPlanInput } from '../src/appPlanSchema.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// A build passed a table it had already created as tables=[{table_name, table_id}]; every lint crashed with
// "Cannot read properties of undefined (reading 'map')" and the model retried seven times.
describe('lint_app_spec with a table that has no columns', () => {
  it('reports it instead of crashing', async () => {
    const client = { listTables: async () => [], getAppSummary: async () => ({ app_id: 'app1', version_id: 'v1', pages: [], queries: [], events: [] }) };
    const out = await lintAppSpecTool(client as never).handler({ app_id: 'app1', version_id: 'v1', tables: [{ table_name: 'x_new' }] } as never);
    const text = String((out.content[0] as { text?: string }).text);
    expect(out.isError).toBe(true);
    expect(text).not.toMatch(/reading 'map'/);
    expect(text).toMatch(/"x_new" has no columns.*List only new tables/);
  });
});

describe('case-insensitive table references across collision renames', () => {
  beforeEach(() => clearAppPlansForTests());
  const columns = [{ name: 'sku', type: 'string', primaryKey: true }];
  function clientMock(existing = [{ id: 'existing-jobs', table_name: 'JOBS' }]) {
    return {
      listTables: vi.fn().mockResolvedValue(existing),
      listDatasources: vi.fn().mockResolvedValue([{ id: 'db', name: 'ToolJet DB', kind: 'tooljetdb' }]),
      hasRows: vi.fn().mockResolvedValue(true),
      getAppSummary: vi.fn(),
      createTables: vi.fn(), insertRowsBatch: vi.fn(), createQueries: vi.fn(),
      createPages: vi.fn(), createComponents: vi.fn(), createEvents: vi.fn(), updateApp: vi.fn(),
    };
  }
  async function lint(args: AppPlanInput, client = clientMock()) {
    const out = await lintAppSpecTool(client as unknown as ToolJetClient).handler(args);
    for (const method of ['createTables', 'insertRowsBatch', 'createQueries', 'createPages', 'createComponents', 'createEvents', 'updateApp'] as const) {
      expect(client[method]).not.toHaveBeenCalled();
    }
    const text = String(out.content[0]!.text);
    return { out, body: out.isError ? { error: text } : JSON.parse(text), client };
  }

  it('rejects explicit generated IDs after a mixed-case collision instead of seeding the existing table', async () => {
    const { body, client } = await lint({
      tables: [{ table_name: 'jobs', columns: [{ name: 'id', type: 'serial', primaryKey: true }] }],
      seed_data: [{ table_name: 'JOBS', rows: [{ id: 1 }] }],
    });
    expect(body.ok).toBe(false);
    expect(body.plan_token).toBeUndefined();
    expect(body.errors.join(' ')).toMatch(/jobs_2.*Omit generated primary key "id"/);
    expect(client.hasRows).not.toHaveBeenCalled(); // The seed now consistently belongs to the new table.
  });

  it.each([false, true])('pins every seed batch, query and foreign key to the planned table, collision=%s', async collision => {
    const client = clientMock(collision ? [{ id: 'existing-jobs', table_name: 'JOBS' }] : []);
    const args: AppPlanInput = {
      version_id: 'v1',
      tables: [
        { table_name: 'jobs', columns },
        { table_name: 'tasks', columns: [{ name: 'job_sku', type: 'string' }],
          foreign_keys: [{ columns: ['job_sku'], referencedTable: 'JoBs', referencedColumns: ['sku'] }] },
      ],
      seed_data: [{ table_name: 'JOBS', rows: [{ sku: 'A' }] }, { table_name: 'jObS', rows: [{ sku: 'B' }] }],
      queries: [{ name: 'allJobs', datasource_id: 'db', table_ref: 'JoBs', options: { operation: 'list_rows' } }],
    };
    const rowsBefore = structuredClone(args.seed_data!.map(seed => seed.rows));
    const { body } = await lint(args, client);
    expect(body.ok).toBe(true);
    const saved = consumeAppPlan(body.plan_token).spec;
    const target = collision ? 'jobs_2' : 'jobs';
    expect(saved.tables![0]!.table_name).toBe(target);
    expect(saved.seed_data!.map(seed => seed.table_name)).toEqual([target, target]);
    expect(saved.seed_data!.map(seed => seed.rows)).toEqual(rowsBefore);
    expect(saved.queries![0]!.table_ref).toBe(target);
    expect(saved.tables![1]!.foreign_keys![0]!.referencedTable).toBe(target);
  });

  it('does not let an automatic suffix capture another planned table or its references', async () => {
    const { body } = await lint({ tables: [{ table_name: 'jobs', columns }, { table_name: 'jobs_2', columns }],
      seed_data: [{ table_name: 'JOBS', rows: [{ sku: 'A' }] }, { table_name: 'JOBS_2', rows: [{ sku: 'B' }] }] });
    expect(body.ok).toBe(true);
    const saved = consumeAppPlan(body.plan_token).spec;
    expect(saved.tables!.map(table => table.table_name)).toEqual(['jobs_3', 'jobs_2']);
    expect(saved.seed_data!.map(seed => seed.table_name)).toEqual(['jobs_3', 'jobs_2']);
  });

  it.each([false, true])('preserves existing-table canonical names and no-overwrite checks, populated=%s', async populated => {
    const client = clientMock();
    client.hasRows.mockResolvedValue(populated);
    const { body } = await lint({ seed_data: [{ table_name: 'jobs', rows: [{ sku: 'A' }] },
      { table_name: 'JoBs', rows: [{ sku: 'B' }] }] }, client);
    expect(client.hasRows).toHaveBeenCalledExactlyOnceWith('existing-jobs');
    expect(body.ok).toBe(!populated);
    if (populated) {
      expect(body.plan_token).toBeUndefined();
      expect(body.errors.join(' ')).toContain('already has rows');
    } else {
      expect(consumeAppPlan(body.plan_token).spec.seed_data!.map(seed => seed.table_name)).toEqual(['JOBS', 'JOBS']);
    }
  });

  it('rejects ambiguous planned names before rename or token creation', async () => {
    const args = { tables: [{ table_name: 'jobs', columns }, { table_name: 'JOBS', columns }],
      seed_data: [{ table_name: 'Jobs', rows: [{ sku: 'A' }] }] };
    const before = structuredClone(args);
    const { out, body } = await lint(args);
    expect(out.isError).toBe(true);
    expect(JSON.stringify(body)).toContain('Ambiguous planned table name');
    expect(body.plan_token).toBeUndefined();
    expect(args).toEqual(before);
  });

  it('resolves an exact workspace name even when another table differs only in case', async () => {
    const client = clientMock([{ id: 'one', table_name: 'jobs' }, { id: 'two', table_name: 'JOBS' }]);
    const { body } = await lint({ seed_data: [{ table_name: 'jobs', rows: [{ sku: 'A' }] }] }, client);
    expect(JSON.stringify(body)).not.toContain('Ambiguous existing table name');
  });

  it('rejects referenced case-ambiguous workspace tables instead of choosing the last ID', async () => {
    const client = clientMock([{ id: 'one', table_name: 'jobs' }, { id: 'two', table_name: 'JOBS' }]);
    const { out, body } = await lint({ seed_data: [{ table_name: 'Jobs', rows: [{ sku: 'A' }] }] }, client);
    expect(out.isError).toBe(true);
    expect(JSON.stringify(body)).toContain('Ambiguous existing table name');
    expect(body.plan_token).toBeUndefined();
    expect(client.hasRows).not.toHaveBeenCalled();
  });

  it('still rejects SQL collisions instead of attempting SQL identifier rewriting', async () => {
    const { body } = await lint({ version_id: 'v1', tables: [{ table_name: 'jobs', columns }],
      queries: [{ name: 'allJobs', datasource_id: 'db', table_ref: 'JOBS',
        options: { operation: 'sql_execution', sql_execution: { sqlQuery: 'select * from jobs' } } }] });
    expect(body.ok).toBe(false);
    expect(body.plan_token).toBeUndefined();
    expect(body.errors.join(' ')).toContain('already exists and this plan contains SQL queries');
  });

  it('does not discard a planned-table query as a restatement of an existing-table query', async () => {
    const client = clientMock();
    client.getAppSummary.mockResolvedValue({ app_id: 'app', version_id: 'v1', pages: [], events: [],
      queries: [{ id: 'held', name: 'allJobs', kind: 'tooljetdb', data_source_id: 'db',
        options: { operation: 'list_rows', table_id: 'existing-jobs' } }] });
    const args: AppPlanInput = { app_id: 'app', version_id: 'v1', tables: [{ table_name: 'jobs', columns }],
      queries: [{ name: 'allJobs', datasource_id: 'db', table_ref: 'JoBs', options: { operation: 'list_rows' } }] };
    const { body } = await lint(args, client);
    expect(args.queries).toHaveLength(1);
    expect(args.queries![0]!.table_ref).toBe('jobs_2');
    expect(body.ok).toBe(false); // The genuine query-name conflict must be resolved, not silently dropped.
    expect(body.plan_token).toBeUndefined();
  });
});
