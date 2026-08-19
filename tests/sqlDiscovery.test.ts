import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { prepareSqlDiscoveryQueriesTool } from '../src/tools/prepareSqlDiscoveryQueries.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('prepare_sql_discovery_queries', () => {
  it('prepares explicit-column PostgreSQL preview/count and structured metadata reads', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'pg1', name: 'Main DB', kind: 'postgresql' }]),
    } as unknown as ToolJetClient;
    const result = await prepareSqlDiscoveryQueriesTool(client).handler({
      version_id: 'v1', datasource_id: 'pg1', schema: 'public', table: 'orders',
      columns: ['id', 'status', 'created_at'], distinct_columns: ['status'],
      purposes: ['count', 'preview', 'distinct', 'primary_keys', 'foreign_keys', 'indexes', 'views'],
      preview_limit: 25,
    });
    expect(result.isError).not.toBe(true);
    const body = textOf(result);
    expect(body.unsupported).toEqual([]);
    expect(body.queries).toHaveLength(7);
    const preview = body.queries.find((query: any) => query.purpose === 'preview');
    expect(preview.options.query).toBe('SELECT "id", "status", "created_at" FROM "public"."orders" LIMIT 25');
    expect(preview.options.query).not.toMatch(/SELECT\s+\*/i);
    expect(assessQueryRead({ id: 'preview', kind: 'postgresql', options: preview.options }))
      .toMatchObject({ directSafe: true, maxRows: 25, selectStar: false });
    expect(body.queries.find((query: any) => query.purpose === 'primary_keys').options.query)
      .toMatch(/information_schema\.table_constraints.*PRIMARY KEY.*LIMIT 100/i);
    expect(body.queries.find((query: any) => query.purpose === 'indexes').options.query)
      .toMatch(/pg_indexes.*LIMIT 100/i);
    expect(assessQueryRead({
      id: 'metadata', kind: 'postgresql',
      options: body.queries.find((query: any) => query.purpose === 'indexes').options,
    })).toMatchObject({ directSafe: true, maxRows: 100 });
  });

  it('uses TOP for a bounded MSSQL preview and marks it directly safe', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'sql1', name: 'SQL Server', kind: 'mssql' }]),
    } as unknown as ToolJetClient;
    const result = await prepareSqlDiscoveryQueriesTool(client).handler({
      version_id: 'v1', datasource_id: 'sql1', schema: 'dbo', table: 'tickets',
      columns: ['id', 'subject'], purposes: ['preview', 'foreign_keys'], preview_limit: 20,
    });
    const body = textOf(result);
    const preview = body.queries.find((query: any) => query.purpose === 'preview');
    expect(preview.options.query).toBe('SELECT TOP (20) [id], [subject] FROM [dbo].[tickets]');
    expect(assessQueryRead({ id: 'preview', kind: 'mssql', options: preview.options }))
      .toMatchObject({ directSafe: true, maxRows: 20 });
    expect(body.queries.find((query: any) => query.purpose === 'foreign_keys').options.query)
      .toMatch(/^SELECT TOP \(100\).*sys\.foreign_key_columns/i);
  });

  it('reports uncurated Snowflake metadata without inventing a query', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'sf1', name: 'Warehouse', kind: 'snowflake' }]),
    } as unknown as ToolJetClient;
    const result = await prepareSqlDiscoveryQueriesTool(client).handler({
      version_id: 'v1', datasource_id: 'sf1', schema: 'PUBLIC', table: 'ORDERS',
      columns: ['ID'], purposes: ['count', 'preview', 'indexes'],
    });
    const body = textOf(result);
    expect(body.queries.map((query: any) => query.purpose)).toEqual(['count', 'preview']);
    expect(body.unsupported).toEqual([{ purpose: 'indexes', reason: expect.stringMatching(/no curated read-only SQL contract/i) }]);
    expect(body.safety.billable_read_confirmation_required).toBe(true);
  });

  it('refuses preview without explicit columns and rejects unsafe identifiers', async () => {
    const client = {
      listDatasources: vi.fn().mockResolvedValue([{ id: 'pg1', name: 'Main DB', kind: 'postgresql' }]),
    } as unknown as ToolJetClient;
    const noColumns = await prepareSqlDiscoveryQueriesTool(client).handler({
      version_id: 'v1', datasource_id: 'pg1', schema: 'public', table: 'orders', purposes: ['preview'],
    });
    expect(noColumns.isError).toBe(true);
    expect(noColumns.content[0]!.text).toMatch(/explicit columns.*SELECT \*/i);

    const injection = await prepareSqlDiscoveryQueriesTool(client).handler({
      version_id: 'v1', datasource_id: 'pg1', schema: 'public', table: 'orders; DROP TABLE users',
      columns: ['id'], purposes: ['preview'],
    });
    expect(injection.isError).toBe(true);
    expect(injection.content[0]!.text).toMatch(/unsafe identifier/i);
  });
});
