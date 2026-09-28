import { describe, expect, it } from 'vitest';
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
