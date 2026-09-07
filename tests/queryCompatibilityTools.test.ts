import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { inspectUpdateCompatibility } from '../src/tableQueryCompatibility.js';
import { addQueryTool } from '../src/tools/addQuery.js';
import { addQueriesTool } from '../src/tools/addQueries.js';
import { updateQueryTool } from '../src/tools/updateQuery.js';

function fixture() {
  return {
    listTables: vi.fn().mockResolvedValue([{ id: 't1', table_name: 'synthetic_requests' }]),
    getTableSchema: vi.fn().mockResolvedValue([{ name: 'request_id' }, { name: 'state' }]),
    listDatasources: vi.fn().mockResolvedValue([{ id: 'ds1', kind: 'tooljetdb' }]),
    createQuery: vi.fn().mockResolvedValue({ id: 'q1' }),
    createQueries: vi.fn().mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]),
    updateQuery: vi.fn().mockResolvedValue({ id: 'q1' }),
  };
}
const options = {
  operation: 'update_rows', table_id: 't1', update_rows: {
    columns: { 0: { column: 'state', value: 'Approved' } },
    where_filters: {
      0: { column: 'request_id', operator: 'eq', value: 'R1' },
      1: { column: 'state', operator: 'eq', value: 'Pending' },
    },
  },
};

describe('direct query compatibility diagnostics', () => {
  it.each(['add', 'batch', 'update'])('returns a schema-aware warning on %s without changing query targeting', async mode => {
    const mock = fixture();
    const client = mock as unknown as ToolJetClient;
    const before = structuredClone(options);
    const query = { datasource_id: 'ds1', name: 'save', options };
    const result = mode === 'add' ? await addQueryTool(client).handler({ version_id: 'v1', ...query }) :
      mode === 'batch' ? await addQueriesTool(client).handler({ version_id: 'v1', queries: [query, { ...query, name: 'save2' }] }) :
        await updateQueryTool(client).handler({ version_id: 'v1', query_id: 'q1', kind: 'tooljetdb', options });
    const body = JSON.parse(result.content[0]!.text);
    expect(body.warnings.join(' ')).toContain('has no id column');
    expect(body.warnings.join(' ')).toContain('never drop expected-state');
    expect(mock.getTableSchema).toHaveBeenCalledExactlyOnceWith('synthetic_requests');
    expect(mock.listTables).toHaveBeenCalledOnce();
    expect(options).toEqual(before);
    if (mode === 'add') expect(mock.createQuery.mock.calls[0]![0].options).toEqual(before);
    if (mode === 'update') expect(mock.updateQuery.mock.calls[0]![0].options).toEqual(before);
    if (mode === 'batch') for (const query of mock.createQueries.mock.calls[0]![0].queries) expect(query.options).toEqual(before);
  });

  it('does no schema reads for non-update operations or other datasource kinds', async () => {
    const mock = fixture();
    expect(await inspectUpdateCompatibility(mock as unknown as ToolJetClient, [
      { name: 'read', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't1' } },
      { name: 'sql', kind: 'postgresql', options },
    ])).toEqual([]);
    expect(mock.listTables).not.toHaveBeenCalled();
  });

  it('does not warn for an existing id column', async () => {
    const mock = fixture();
    mock.getTableSchema.mockResolvedValue([{ name: 'id' }]);
    expect(await inspectUpdateCompatibility(mock as unknown as ToolJetClient, [{ name: 'save', kind: 'tooljetdb', options }])).toEqual([]);
  });

  it.each(['lookup-failed', 'schema-failed', 'empty', 'unknown-id', 'dynamic'])('reports %s as unverified, not a missing-id fact', async scenario => {
    const mock = fixture();
    if (scenario === 'lookup-failed') mock.listTables.mockRejectedValue(new Error('offline'));
    if (scenario === 'schema-failed') mock.getTableSchema.mockRejectedValue(new Error('offline'));
    if (scenario === 'empty') mock.getTableSchema.mockResolvedValue([]);
    const table_id = scenario === 'unknown-id' ? 'missing' : scenario === 'dynamic' ? '{{variables.table}}' : 't1';
    const warnings = await inspectUpdateCompatibility(mock as unknown as ToolJetClient, [
      { name: 'save', kind: 'tooljetdb', options: { ...options, table_id } },
    ]);
    expect(warnings.join(' ')).toContain('was not checked');
    expect(warnings.join(' ')).not.toContain('has no id column');
    if (scenario === 'dynamic' || scenario === 'unknown-id') expect(mock.getTableSchema).not.toHaveBeenCalled();
  });
});
