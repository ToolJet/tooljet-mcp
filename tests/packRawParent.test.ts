import { describe, expect, it, vi } from 'vitest';
import { resolveParentRef } from '../src/componentParent.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';

// DVRL-124 (2026-11-13): a child given its pack container's canvas the way ToolJet stores it, parent
// "<collapse id>-panel_panel1", was refused as "not a component on this page": only ToolJet's own suffixes (-header,
// -footer, -body, -modal, -t0) were known. It is now read as that container plus slot_name panel_panel1.
const COLLAPSE = 'ffffffff-6666-4666-8666-ffffffffffff';
const collapse = {
  id: COLLAPSE,
  name: 'col',
  type: 'Lib_antd_Collapse',
  properties: { items: { value: [{ key: 'panel1' }, { key: 'panel2' }] } },
  layouts: { desktop: { top: 0, left: 0, width: 30, height: 40 } },
};
const box = { id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', name: 'box', type: 'Container' };

describe('resolveParentRef with a pack canvas in the parent', () => {
  it('splits "<id>-<canvas>" into the container and its slot', () => {
    expect(resolveParentRef([collapse], `${COLLAPSE}-panel_panel1`)).toEqual({ ok: true, parent: COLLAPSE, slotName: 'panel_panel1', renamed: false });
  });

  it('splits "<name>-<canvas>" too, resolving the name', () => {
    expect(resolveParentRef([collapse], 'col-panel_panel2')).toEqual({ ok: true, parent: COLLAPSE, slotName: 'panel_panel2', renamed: true });
  });

  it('leaves a ToolJet container suffix as it was', () => {
    expect(resolveParentRef([box], `${box.id}-header`)).toEqual({ ok: true, parent: `${box.id}-header`, renamed: false });
  });

  it('still refuses a pack-style suffix on a ToolJet container', () => {
    expect(resolveParentRef([box], `${box.id}-first`)).toMatchObject({ ok: false });
  });
});

const summary = (components: unknown[]) => ({ app_id: 'app1', version_id: 'v1', queries: [], events: [], pages: [{ id: 'home', name: 'Home', components }] });

describe('add_components with a raw pack canvas parent', () => {
  const run = (component: Record<string, unknown>) => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary([collapse])),
      createComponents: vi.fn().mockResolvedValue([]),
      getVersionGlobalSettings: vi.fn().mockResolvedValue({}),
    };
    const result = addComponentsTool(client as never).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'home',
      components: [{ type: 'Text', name: 'note', properties: { text: 'hi' }, layout: { top: 1, left: 1, width: 10, height: 30 }, ...component }],
    } as never);
    return { client, result };
  };

  it('adds the child to that panel', async () => {
    const { client, result } = run({ parent: `${COLLAPSE}-panel_panel2` });
    const out = await result;
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    const written = client.createComponents.mock.calls[0]![0].components[0];
    expect(written).toMatchObject({ parent: COLLAPSE, slotName: 'panel_panel2' });
  });

  it('refuses a panel the Collapse does not have, naming the ones it does', async () => {
    const { client, result } = run({ parent: `${COLLAPSE}-panel_nope` });
    const out = await result;
    expect(out.isError).toBe(true);
    expect(String(out.content[0]!.text)).toMatch(/panel_panel1, panel_panel2/);
    expect(client.createComponents).not.toHaveBeenCalled();
  });

  it('refuses a slot_name that disagrees with the canvas in the parent', async () => {
    const { client, result } = run({ parent: `${COLLAPSE}-panel_panel2`, slot_name: 'panel_panel1' });
    const out = await result;
    expect(out.isError).toBe(true);
    expect(String(out.content[0]!.text)).toMatch(/panel_panel2.*panel_panel1|panel_panel1.*panel_panel2/);
    expect(client.createComponents).not.toHaveBeenCalled();
  });
});

describe('update_components with a raw pack canvas parent', () => {
  it('moves the child onto that panel', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue(summary([collapse, { id: 'id-note', name: 'note', type: 'Text', parent: `${COLLAPSE}-panel_panel1` }])),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
      updateLayouts: vi.fn(),
    };
    const out = await updateComponentsTool(client as never).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'home',
      updates: [{ component_id: 'note', parent: `${COLLAPSE}-panel_panel2` }],
    } as never);
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    expect(client.updateComponents.mock.calls[0]![0].updates[0]).toMatchObject({ parent: COLLAPSE, slotName: 'panel_panel2' });
  });
});
