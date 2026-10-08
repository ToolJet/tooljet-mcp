import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { clearAppPlansForTests, consumeAppPlan } from '../src/appPlanStore.js';
import { invalidPlannedGeneratedPrimaryKeySeeds } from '../src/seedGeneratedPrimaryKeyValidation.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import type { AppPlanInput } from '../src/appPlanSchema.js';
import type { TableColumn, ToolJetClient } from '../src/tooljetClient.js';

const serial = [{ name: 'id', type: 'serial', primaryKey: true }];
const check = (columns: TableColumn[], rows: Record<string, unknown>[]) =>
  invalidPlannedGeneratedPrimaryKeySeeds(columns, rows);

describe('generated primary keys in planned seed data', () => {
  it.each([1, 0, false, null, undefined, ''])('rejects key presence, not truthiness: %j', value => {
    const rows = [{}, { id: value }];
    const before = structuredClone(rows);
    expect(check(serial, rows).join(' ')).toMatch(/Omit generated primary key "id".*row\(s\) 2/);
    expect(rows).toEqual(before);
    expect(Object.hasOwn(rows[1]!, 'id')).toBe(true);
  });

  it('covers the implicit id and an explicitly named/case-normalized serial PK', () => {
    expect(check([{ name: 'title', type: 'string' }], [{ id: 1 }])).toHaveLength(1);
    expect(check([{ name: 'record_key', type: ' SERIAL ', primaryKey: true }], [{ record_key: 7 }]))
      .toHaveLength(1);
    expect(check(serial, [{ title: 'A' }, { title: 'B' }])).toEqual([]);
  });

  it.each(['int', 'integer', 'bigint'])('recognizes a sequence default on %s, not the type alone', type => {
    const column = { name: 'record_key', type, primaryKey: true };
    expect(check([column], [{ record_key: 0 }])).toEqual([]);
    expect(check([{ ...column, defaultValue: "nextval('records_seq'::regclass)" }], [{ record_key: 0 }]))
      .toHaveLength(1);
  });

  it.each(['string', 'varchar', 'text', 'int', 'integer', 'bigint'])('preserves a legitimate %s primary key', type => {
    expect(check([{ name: 'id', type, primaryKey: true }], [{ id: ['string', 'varchar', 'text'].includes(type) ? 'SKU-1' : 0 }]))
      .toEqual([]);
  });

  it('does not ban non-primary serial columns, foreign keys or arbitrary defaulted primary keys', () => {
    expect(check([
      { name: 'sku', type: 'string', primaryKey: true },
      { name: 'ordinal', type: 'serial' },
      { name: 'parent_id', type: 'integer' },
    ], [{ sku: 'A', id: 1, ordinal: 2, parent_id: 3 }])).toEqual([]);
    expect(check([{ name: 'id', type: 'integer', primaryKey: true, defaultValue: 0 }], [{ id: 9 }]))
      .toEqual([]);
  });

  it('checks every seed batch and matches table names case-insensitively without rewriting rows', () => {
    const spec = {
      tables: [{ tableName: 'jobs', columns: serial }],
      seedData: [{ tableName: 'jobs', rows: [{}] }, { tableName: 'JOBS', rows: [{ id: 4 }] }],
    };
    const before = structuredClone(spec);
    const result = lintPlannedApp(spec);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/"JOBS" \(batch 2\).*"id".*row\(s\) 1/);
    expect(spec).toEqual(before);
  });

  it('does not invent an implicit id for an existing/unknown schema', () => {
    expect(lintPlannedApp({ seedData: [{ tableName: 'existing', rows: [{ id: 8 }] }] }).errors).toEqual([]);
  });
});

describe('lint_app_spec seed rejection before the phase token', () => {
  beforeEach(() => clearAppPlansForTests());
  function clientMock() {
    return {
      listTables: vi.fn().mockResolvedValue([]),
      listDatasources: vi.fn().mockResolvedValue([{ id: 'db', kind: 'tooljetdb' }]),
      hasRows: vi.fn().mockResolvedValue(false),
      getTableSchema: vi.fn(),
      createTables: vi.fn(), createPages: vi.fn(), createQueries: vi.fn(), insertRowsBatch: vi.fn(),
      createComponents: vi.fn(), createEvents: vi.fn(), updateApp: vi.fn(),
    };
  }
  async function lint(args: AppPlanInput, client = clientMock()) {
    const result = await lintAppSpecTool(client as unknown as ToolJetClient).handler(args);
    return { body: JSON.parse(String(result.content[0]!.text)), client };
  }

  it('rejects the configuration draft id:1 before any table, page, query, seed or event writes', async () => {
    const table = 'cxc287848bf9_drafts';
    const args: AppPlanInput = {
      version_id: 'v1', app_name: 'Configuration',
      tables: [{ table_name: table, columns: [...serial, { name: 'config', type: 'jsonb', notNull: true }] }],
      seed_data: [{ table_name: table, rows: [{ id: 1, config: {
        routing: { allowedRegions: ['NA', 'EMEA', 'APAC'], defaultRegion: 'NA', handoffEnabled: true, maxHandoffRetries: 2 },
        thresholds: { confidence: 0.82, responseMinutes: 20 },
      } }] }],
      queries: [{ name: 'draft', datasource_id: 'db', table_ref: table,
        options: { operation: 'list_rows', list_rows: { limit: 1 } } }],
      pages: [{ name: 'Sandbox', icon: 'IconHome2', components: [] }],
    };
    const seedsBefore = structuredClone(args.seed_data);
    const { body, client } = await lint(args);
    expect(body.ok).toBe(false);
    expect(body.plan_token).toBeUndefined();
    expect(body.errors.join(' ')).toMatch(/cxc287848bf9_drafts.*Omit generated primary key "id"/);
    expect(args.seed_data).toEqual(seedsBefore);
    for (const name of ['createTables', 'createPages', 'createQueries', 'insertRowsBatch', 'createComponents', 'createEvents', 'updateApp'] as const) {
      expect(client[name]).not.toHaveBeenCalled();
    }
    expect(client.getTableSchema).not.toHaveBeenCalled(); // New table schema comes from the plan.
  });

  it('rejects a supplied implicit id but stores valid explicit nonserial keys unchanged', async () => {
    const bad = await lint({ tables: [{ table_name: 'jobs', columns: [{ name: 'title', type: 'text' }] }],
      seed_data: [{ table_name: 'jobs', rows: [{ id: 1, title: 'A' }] }] });
    expect(bad.body.ok).toBe(false);
    expect(bad.body.plan_token).toBeUndefined();
    const args = { tables: [{ table_name: 'jobs', columns: [{ name: 'id', type: 'int', primaryKey: true }] }],
      seed_data: [{ table_name: 'jobs', rows: [{ id: 0 }, { id: 9 }] }] };
    const { body } = await lint(args);
    expect(body.ok).toBe(true);
    expect(consumeAppPlan(body.plan_token).spec.seed_data).toEqual(args.seed_data);
    expect(args.tables[0]!.columns[0]!.type).toBe('int');
  });

  it('retains integer-to-serial inference only when every batch actually omits the key', async () => {
    const { body } = await lint({ tables: [{ table_name: 'jobs', columns: [{ name: 'id', type: 'integer', primaryKey: true }] }],
      seed_data: [{ table_name: 'jobs', rows: [{}] }, { table_name: 'jobs', rows: [{}] }] });
    expect(body.ok).toBe(true);
    const plan = consumeAppPlan(body.plan_token);
    expect(plan.spec.tables![0]!.columns[0]!.type).toBe('serial');
    expect(plan.spec.seed_data!.flatMap(batch => batch.rows)).toEqual([{}, {}]);
  });

  it.each([false, true])('does not convert a real key when split-batch omissions come first=%s', async omittedFirst => {
    const batches = [{ table_name: 'jobs', rows: [{ id: 0 }] }, { table_name: 'jobs', rows: [{}] }];
    if (omittedFirst) batches.reverse();
    const args = { tables: [{ table_name: 'jobs', columns: [{ name: 'id', type: 'integer', primaryKey: true }] }], seed_data: batches };
    const { body } = await lint(args);
    expect(body.ok).toBe(false);
    expect(body.plan_token).toBeUndefined();
    expect(body.errors.join(' ')).toMatch(/omits required non-generated column "id"/);
    expect(body.errors.join(' ')).not.toMatch(/Omit generated primary key/);
    expect(args.tables[0]!.columns[0]!.type).toBe('integer');
  });

  it('does not infer generated keys from null-valued integer primary keys', async () => {
    const args = { tables: [{ table_name: 'jobs', columns: [{ name: 'id', type: 'integer', primaryKey: true }] }],
      seed_data: [{ table_name: 'jobs', rows: [{ id: null }] }] };
    const { body } = await lint(args);
    expect(body.ok).toBe(false);
    expect(body.errors.join(' ')).toMatch(/required column "id" is null/);
    expect(args.tables[0]!.columns[0]!.type).toBe('integer');
  });

  it('preserves existing-table and unknown-table preflight contracts, without guessing from id', async () => {
    const client = clientMock();
    client.listTables.mockResolvedValue([{ id: 't1', table_name: 'existing' }]);
    const existing = await lint({ seed_data: [{ table_name: 'existing', rows: [{ id: 1 }] }] }, client);
    expect(existing.body.ok).toBe(true);
    expect(client.getTableSchema).not.toHaveBeenCalled(); // Unknown schema remains the insert-time guard's responsibility.
    const unknown = await lint({ seed_data: [{ table_name: 'alias_not_a_table', rows: [{ id: 1 }] }] }, client);
    expect(unknown.body.ok).toBe(false);
    expect(unknown.body.plan_token).toBeUndefined();
    expect(unknown.body.errors.join(' ')).toMatch(/unknown planned\/existing table/);
    expect(unknown.body.errors.join(' ')).not.toMatch(/generated primary key/);
    client.hasRows.mockResolvedValue(true);
    const populated = await lint({ seed_data: [{ table_name: 'existing', rows: [{ id: 1 }] }] }, client);
    expect(populated.body.ok).toBe(false);
    expect(populated.body.errors.join(' ')).toMatch(/already has rows/);
  });
});
