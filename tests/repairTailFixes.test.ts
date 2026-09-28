import { describe, expect, it, vi } from 'vitest';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// Fernbrook vet build, 2026-09-23: an edit to a Table's data came back with a note that "}}" had
// been split inside properties.defaultSelectedRow, a key the model never touched (ToolJet's own
// default {{{"id":1}}}). The model then spent three calls clearing defaultSelectedRow on every table.
describe('update_components brace notes', () => {
  const table = (extra: Record<string, unknown> = {}) => ({
    getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', pages: [{ id: 'p1', components: [{
      id: 't1', name: 'tblToday', type: 'Table',
      properties: { data: { value: '{{[]}}' }, defaultSelectedRow: { value: '{{{"id":1}}}' }, ...extra }, styles: {},
    }] }], queries: [], events: [] }),
    updateComponents: vi.fn().mockResolvedValue({ updated: 1, warnings: [] }),
  } as unknown as ToolJetClient);

  it('says nothing about a key the update did not change', async () => {
    const client = table();
    const result = await updateComponentsTool(client).handler({ app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 't1', definition: { properties: { data: '{{queries.q.data}}' } } }] });
    expect(result.isError).not.toBe(true);
    expect(result.content[0]!.text).not.toMatch(/defaultSelectedRow/);
  });

  it('still reports a split inside the key being written', async () => {
    const client = table();
    const result = await updateComponentsTool(client).handler({ app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 't1', definition: { properties: { data: '{{queries.q.data.map(r => ({a: {b: 1}}))}}' } } }] });
    expect(result.content[0]!.text).toMatch(/separated adjacent closing braces inside properties\.data/);
    expect(result.content[0]!.text).not.toMatch(/defaultSelectedRow/);
  });
});

import { addQueryLifecyclesTool } from '../src/tools/addQueryLifecycles.js';

// Same build: close_modal_id "visitDialog" (the name every binding uses) failed with "does not
// exist", costing a retry with the component id.
describe('add_query_lifecycles accepts names', () => {
  it('resolves query, refresh, clear and modal names to ids', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', events: [],
        pages: [{ id: 'p1', components: [
          { id: 'm-uuid', name: 'visitDialog', type: 'ModalV2', properties: {}, styles: {} },
          { id: 'n-uuid', name: 'visitNote', type: 'TextArea', properties: {}, styles: {} },
        ] }],
        queries: [{ id: 'q-add', name: 'q_add_visit', kind: 'tooljetdb', options: {} }, { id: 'q-visits', name: 'q_visits', kind: 'tooljetdb', options: {} }] }),
      createEvents: vi.fn().mockResolvedValue({ created: 3 }),
    } as unknown as ToolJetClient;
    const result = await addQueryLifecyclesTool(client).handler({ app_id: 'app1', version_id: 'v1', lifecycles: [{
      query_id: 'q_add_visit', refresh_query_ids: ['q_visits'], clear_component_ids: ['visitNote'], close_modal_id: 'visitDialog',
    }] } as never);
    expect(result.isError).not.toBe(true);
    const events = (client.createEvents as ReturnType<typeof vi.fn>).mock.calls[0]![0].events;
    expect(events.every((e: { sourceId: string }) => e.sourceId === 'q-add')).toBe(true);
    expect(JSON.stringify(events)).toContain('m-uuid');
    expect(JSON.stringify(events)).toContain('q-visits');
    expect(JSON.stringify(events)).toContain('n-uuid');
  });
});
