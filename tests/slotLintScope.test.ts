import { describe, expect, it, vi } from 'vitest';
import * as lint from '../src/lint.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';

// Review, PR #142: update_components checked every container's canvases, on the page before and after, for any
// definition change, a one-property edit of a Text included. Only a placement change, or a change to a component other
// components sit in (a tab or item renamed or removed), can leave a child where nothing draws it.
vi.mock('../src/lint.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lint.js')>();
  return { ...actual, lintComponentSlots: vi.fn(actual.lintComponentSlots) };
});

const TABS = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const page = () => [
  { id: TABS, name: 'box', type: 'Lib_shadcn_TabsContainer', properties: { tabs: { value: [{ id: 'details', label: 'Details' }] } } },
  { id: 'id-note', name: 'note', type: 'Text', parent: `${TABS}-tab_details`, properties: { text: { value: 'Hi' } } },
  { id: 'id-title', name: 'title', type: 'Text', properties: { text: { value: 'Title' } } },
];
const run = async (updates: unknown[]) => {
  vi.mocked(lint.lintComponentSlots).mockClear();
  const client = {
    getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', queries: [], events: [], pages: [{ id: 'home', name: 'Home', components: page() }] }),
    updateComponents: vi.fn().mockResolvedValue({ updated: updates.length }),
    updateLayouts: vi.fn(),
  };
  const out = await updateComponentsTool(client as never).handler({ app_id: 'app1', version_id: 'v1', page_id: 'home', updates } as never);
  return { out, slotLints: vi.mocked(lint.lintComponentSlots).mock.calls.length };
};

describe('update_components checks canvases only when a change can strand a child', () => {
  it('skips the check for an edit of a component nothing sits in', async () => {
    const { out, slotLints } = await run([{ component_id: 'id-title', definition: { properties: { text: 'New title' } } }]);
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    expect(slotLints).toBe(0);
  });

  it('checks an edit of a container with children', async () => {
    const { out, slotLints } = await run([{ component_id: TABS, definition: { properties: { tabs: [{ id: 'info', label: 'Info' }] } } }]);
    expect(out.isError).toBe(true);
    expect(slotLints).toBeGreaterThan(0);
  });

  it('checks a move', async () => {
    const { slotLints } = await run([{ component_id: 'id-title', parent: TABS, slot_name: 'tab_details' }]);
    expect(slotLints).toBeGreaterThan(0);
  });
});
