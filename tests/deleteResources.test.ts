import { describe, expect, it, vi } from 'vitest';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';
import { deleteComponentsTool } from '../src/tools/deleteComponents.js';
import { deleteQueryTool } from '../src/tools/deleteQuery.js';

function summary(overrides: Partial<AppSummary> = {}): AppSummary {
  return {
    app_id: 'app1',
    pages: [{
      id: 'home', name: 'Home', handle: 'home',
      components: [
        { id: 'field', name: 'statusField', type: 'TextInput' },
        {
          id: 'label', name: 'statusLabel', type: 'Text',
          properties: { text: { value: '{{components.statusField.value}}' } },
        },
      ],
    }],
    queries: [{ id: 'orders', name: 'getOrders', kind: 'tooljetdb', options: {} }],
    events: [],
    ...overrides,
  };
}

describe('guarded component/query deletion', () => {
  it('refuses component deletion while a surviving component binding depends on it', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary()),
      deleteComponents: vi.fn(),
    } as unknown as ToolJetClient;

    const result = await deleteComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'home', component_ids: ['field'], confirm: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/refusing dangling references.*statusLabel.*components\.statusField/i);
    expect(client.deleteComponents).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced component and verifies the requested id disappeared', async () => {
    const before = summary({
      pages: [{ id: 'home', components: [{ id: 'unused', name: 'unusedText', type: 'Text' }] }],
      events: [{ id: 'source-event', sourceId: 'unused', target: 'component', event: { eventId: 'onClick' } }],
    });
    const after = summary({ pages: [{ id: 'home', components: [] }], events: [] });
    const client = {
      getAppSummary: vi.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after),
      deleteComponents: vi.fn().mockResolvedValue({ deleted: 1 }),
    } as unknown as ToolJetClient;

    const result = await deleteComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'home', component_ids: ['unused'], confirm: true,
    });

    expect(result.isError).not.toBe(true);
    expect(client.deleteComponents).toHaveBeenCalledOnce();
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({
      deleted: 1, component_ids: ['unused'], source_events_deleted: 1,
    });
  });

  it('refuses query deletion while a component binding depends on it', async () => {
    const current = summary({
      pages: [{
        id: 'home',
        components: [{
          id: 'table', name: 'ordersTable', type: 'Table',
          properties: { data: { value: '{{queries.getOrders.data}}' } },
        }],
      }],
    });
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(current),
      deleteQuery: vi.fn(),
    } as unknown as ToolJetClient;

    const result = await deleteQueryTool(client).handler({
      app_id: 'app1', version_id: 'v1', query_id: 'orders', confirm: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/refusing dangling references.*ordersTable.*queries\.getOrders/i);
    expect(client.deleteQuery).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced query and verifies it disappeared', async () => {
    const before = summary({
      pages: [{ id: 'home', components: [] }],
      events: [{ id: 'lifecycle', sourceId: 'orders', target: 'data_query', event: { eventId: 'onDataQuerySuccess' } }],
    });
    const after = summary({ pages: [{ id: 'home', components: [] }], queries: [], events: [] });
    const client = {
      getAppSummary: vi.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after),
      deleteQuery: vi.fn().mockResolvedValue({ deleted: true }),
    } as unknown as ToolJetClient;

    const result = await deleteQueryTool(client).handler({
      app_id: 'app1', version_id: 'v1', query_id: 'orders', confirm: true,
    });

    expect(result.isError).not.toBe(true);
    expect(client.deleteQuery).toHaveBeenCalledWith({ queryId: 'orders', versionId: 'v1' });
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({
      deleted: true, query_id: 'orders', query_name: 'getOrders', source_events_deleted: 1,
    });
  });
});
