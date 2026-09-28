import { describe, expect, it, vi } from 'vitest';
import { decodeComponentParent, encodeComponentParent, componentSlotSchema } from '../src/componentParent.js';
import { lintComponentSlots, lintComponentSpec } from '../src/lint.js';

// bridge-kb n3 (2026-09-25): the request asked for tabs on the project and bridge pages; no route could put a
// component inside a tab, so the build spread the tabs over twelve pages. ToolJet keeps a tab's children
// on the canvas "<tabs id>-<tab item id>" (frontend Tabs.jsx: SubContainer id={`${id}-${tab.id}`}).
describe('tab slots', () => {
  const tabs = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
  it('encode and decode the tab canvas', () => {
    expect(encodeComponentParent(tabs, 'tab-t1')).toBe(`${tabs}-t1`);
    expect(decodeComponentParent(`${tabs}-t1`)).toEqual({ parentId: tabs, slotName: 'tab-t1' });
    expect(decodeComponentParent(tabs)).toEqual({ parentId: tabs, slotName: 'body' });
    expect(componentSlotSchema.safeParse('tab-t0').success).toBe(true);
    expect(componentSlotSchema.safeParse('tab-x').success).toBe(false);
  });
  it('are valid only under a Tabs parent', () => {
    const child = (parentType: string) => lintComponentSlots([
      { clientRef: 'p', name: 'p', type: parentType },
      { clientRef: 'c', name: 'c', type: 'Text', parentRef: 'p', slotName: 'tab-t0' },
    ] as never);
    expect(child('Tabs')).toEqual([]);
    expect(child('Container').join(' ')).toMatch(/tab-t0/);
    expect(lintComponentSpec({ name: 'c', type: 'Text', parentRef: 'p', slotName: 'tab-t0' } as never).errors.join(' ')).not.toMatch(/unsupported slot_name/);
  });
});

// Review 2026-09-25: a child in a tab the Tabs does not have is saved but never shown, and delete_components missed
// header, footer and tab children (they sit on "<id>-header", "<id>-t1" ...), so deleting the parent orphaned them.
describe('tab and slot children', () => {
  it('lint reports a child in a tab the parent Tabs does not have', async () => {
    const { lintComponentSlots } = await import('../src/lint.js');
    const tabs = { name: 'tb', clientRef: 'tb', type: 'Tabs', properties: { tabItems: { value: [{ id: 't0', title: 'A' }, { id: 't1', title: 'B' }] } } };
    const errors = lintComponentSlots([tabs, { name: 'a', type: 'Text', parentRef: 'tb', slotName: 'tab-t1' }, { name: 'b', type: 'Text', parentRef: 'tb', slotName: 'tab-t4' }] as never);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/"b".*tab-t4.*"tb".*t0, t1/);
  });

  it('delete_components finds header, footer and tab children of a target', async () => {
    const { deleteComponentsTool } = await import('../src/tools/deleteComponents.js');
    for (const parent of ['box-header', 'box-footer', 'box-t1', 'box::0']) {
      const client = {
        getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', queries: [], events: [], pages: [{ id: 'home', name: 'Home', components: [
          { id: 'box', name: 'box', type: 'Tabs' }, { id: 'kid', name: 'kid', type: 'Text', parent },
        ] }] }),
        deleteComponents: vi.fn(),
      };
      const result = await deleteComponentsTool(client as never).handler({ app_id: 'app1', version_id: 'v1', page_id: 'home', component_ids: ['box'], confirm: true });
      expect(result.isError, parent).toBe(true);
      expect(String(result.content[0]!.text)).toMatch(/kid/);
      expect(client.deleteComponents).not.toHaveBeenCalled();
    }
  });
});
