import { describe, expect, it, vi } from 'vitest';
import { encodeComponentParent } from '../src/componentParent.js';
import { lintComponentSlots, lintPackItemSlots } from '../src/lint.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';

// Review of PR #142: a pack's repeating rows (a slot of kind "rows": a ListView's row, a Kanban card) are drawn by
// ToolJet's List view row on the component's own id (usePackHost PackRow, ListviewSubcontainer id={id}), not on
// "<id>-row". A saved ListView child on the bare id was reported as never shown, and slot_name "row" was written as
// "<id>-row", which nothing draws.
const LIST = 'cdcdcdcd-8888-4888-8888-cdcdcdcdcdcd';
const list = { id: LIST, name: 'lst', type: 'Lib_shadcn_ListView', properties: {} };
const text = (name: string, parent: string, slotName?: string) => ({ id: `id-${name}`, name, type: 'Text', parent, ...(slotName ? { slotName } : {}) });

describe('a saved child of a pack list row', () => {
  it('is on the bare id, which the row draws', () => {
    expect(lintPackItemSlots([list, text('title', LIST)] as never, { persisted: true })).toEqual([]);
  });

  it('is reported on "<id>-row", which nothing draws', () => {
    const errors = lintPackItemSlots([list, text('title', `${LIST}-row`)] as never, { persisted: true });
    expect(errors.join(' ')).toMatch(/"title".*row/);
  });
});

describe('slot_name "row" under a pack list', () => {
  it('is accepted when authored', () => {
    expect(lintComponentSlots([list, text('title', LIST, 'row')] as never)).toEqual([]);
  });

  it("is written as the list's own id", () => {
    expect(encodeComponentParent(LIST, 'row', 'Lib_shadcn_ListView')).toBe(LIST);
  });

  it("writes a plain parent as the list's own id, its only canvas being the row", () => {
    expect(encodeComponentParent(LIST, undefined, 'Lib_shadcn_ListView')).toBe(LIST);
    expect(lintComponentSlots([list, text('title', LIST)] as never)).toEqual([]);
  });

  it('keeps a Card body as "<id>-body"', () => {
    expect(encodeComponentParent(LIST, undefined, 'Lib_shadcn_Card')).toBe(`${LIST}-body`);
  });

  it('keeps "<id>-<slot>" for a canvas that is not rows', () => {
    expect(encodeComponentParent(LIST, 'first', 'Lib_shadcn_SplitPane')).toBe(`${LIST}-first`);
  });

  it('moves a child onto the row with update_components, written as the bare id', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1', version_id: 'v1', queries: [], events: [],
        pages: [{ id: 'home', name: 'Home', components: [list, { id: 'id-title', name: 'title', type: 'Text' }] }],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
      updateLayouts: vi.fn(),
    };
    const out = await updateComponentsTool(client as never).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'home',
      updates: [{ component_id: 'title', parent: LIST, slot_name: 'row' }],
    } as never);
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    expect(client.updateComponents.mock.calls[0]![0].updates[0].parent).toBe(LIST);
  });
});
