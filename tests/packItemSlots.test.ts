import { describe, expect, it, vi } from 'vitest';
import { lintComponentSlots } from '../src/lint.js';
import { validatePersistedAppSummary } from '../src/appValidation.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';

// DVRL, 2026-11-13: a pack container draws one canvas per item ("<id>-tab_<item id>", step_, section_, panel_). Renaming
// an item's id or removing the item left its children on a canvas nothing draws: they vanished from the editor with no
// way to reach them, and update_components reported { updated: 1, warnings: [] } and validate_app ok:true.
const TABS = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const container = (type: string, prop: string, items: unknown) => ({
  id: TABS,
  name: 'box',
  type,
  properties: { [prop]: { value: items } },
});
const child = (name: string, slot: string) => ({ id: `id-${name}`, name, type: 'Text', parent: `${TABS}-${slot}` });
const stranded = (components: unknown[]) => lintComponentSlots(components as never);

describe('a child in a pack container item that is no longer there', () => {
  it('is reported for a shadcn TabsContainer tab whose id changed', () => {
    const errors = stranded([
      container('Lib_shadcn_TabsContainer', 'tabs', [{ id: 'info', label: 'Info' }]),
      child('note', 'tab_details'),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/"note".*"box".*tab_details/);
  });

  it('is not reported while the item is there', () => {
    expect(
      stranded([container('Lib_shadcn_TabsContainer', 'tabs', [{ id: 'details', label: 'Details' }]), child('note', 'tab_details')])
    ).toEqual([]);
  });

  it.each([
    ['Lib_shadcn_Stepper', 'steps', [{ id: 'account' }], 'step_profile', 'step_account'],
    ['Lib_shadcn_AccordionContainer', 'sections', [{ id: 'one' }], 'section_two', 'section_one'],
    ['Lib_antd_Tabs', 'items', [{ key: 'a', label: 'A' }], 'tab_b', 'tab_a'],
    ['Lib_antd_Collapse', 'items', [{ key: 'a', label: 'A' }], 'panel_b', 'panel_a'],
    ['Lib_mui_Tabs', 'tabs', [{ key: 'a', label: 'A' }], 'tab_b', 'tab_a'],
  ])('is reported for %s', (type, prop, items, gone, kept) => {
    expect(stranded([container(type, prop, items), child('lost', gone)])).toHaveLength(1);
    expect(stranded([container(type, prop, items), child('kept', kept)])).toEqual([]);
  });

  // Each pack names an item's canvas the way it reads the item: these are drawn, so nothing is reported.
  it.each([
    ['shadcn tab without an id: its position', 'Lib_shadcn_TabsContainer', 'tabs', [{ label: 'A' }, { label: 'B' }], 'tab_2'],
    ['shadcn tab as a plain string', 'Lib_shadcn_TabsContainer', 'tabs', ['Details'], 'tab_Details'],
    ['shadcn tab by value', 'Lib_shadcn_TabsContainer', 'tabs', [{ value: 'v1' }], 'tab_v1'],
    ['shadcn step without an id: its position', 'Lib_shadcn_Stepper', 'steps', [{ label: 'A' }], 'step_1'],
    ['Ant tab by id, value or label', 'Lib_antd_Tabs', 'items', [{ id: 'i' }, { value: 'v' }, { label: 'L' }], 'tab_L'],
    ['an id outside slot characters', 'Lib_shadcn_TabsContainer', 'tabs', [{ id: 'a-b' }], 'tab_a_b'],
  ])('is not reported for a %s', (_, type, prop, items, slot) => {
    expect(stranded([container(type, prop, items), child('kept', slot)])).toEqual([]);
  });

  it('is not judged when the items come from a binding', () => {
    expect(stranded([container('Lib_shadcn_TabsContainer', 'tabs', '{{queries.q.data}}'), child('note', 'tab_details')])).toEqual([]);
  });
});

describe('update_components changing a pack container items', () => {
  const page = () => [
    container('Lib_shadcn_TabsContainer', 'tabs', [{ id: 'details', label: 'Details' }, { id: 'activity', label: 'Activity' }]),
    child('noteInDetails', 'tab_details'),
  ];
  const run = (updates: unknown[]) => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', queries: [], events: [], pages: [{ id: 'home', name: 'Home', components: page() }] }),
      updateComponents: vi.fn().mockResolvedValue({ updated: updates.length }),
      updateLayouts: vi.fn(),
    };
    const result = updateComponentsTool(client as never).handler({ app_id: 'app1', version_id: 'v1', page_id: 'home', updates } as never);
    return { client, result };
  };

  it('refuses a rename that leaves a child on a tab nothing draws, and saves nothing', async () => {
    const { client, result } = run([{ component_id: TABS, definition: { properties: { tabs: [{ id: 'info', label: 'Info' }] } } }]);
    const out = await result;
    expect(out.isError).toBe(true);
    expect(String(out.content[0]!.text)).toMatch(/"noteInDetails".*tab_details/);
    expect(client.updateComponents).not.toHaveBeenCalled();
  });

  it('allows the rename when the same call moves the child to the new tab', async () => {
    const { client, result } = run([
      { component_id: TABS, definition: { properties: { tabs: [{ id: 'info', label: 'Info' }] } } },
      { component_id: 'noteInDetails', parent: TABS, slot_name: 'tab_info' },
    ]);
    const out = await result;
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    expect(client.updateComponents).toHaveBeenCalledTimes(1);
  });

  it('allows a label change that keeps the ids', async () => {
    const { result } = run([
      { component_id: TABS, definition: { properties: { tabs: [{ id: 'details', label: 'Info' }, { id: 'activity', label: 'Activity' }] } } },
    ]);
    expect((await result).isError).toBeFalsy();
  });
});

describe('validate_app', () => {
  it('reports a child stranded in a pack container item', () => {
    const validation = validatePersistedAppSummary({
      app_id: 'app1',
      queries: [],
      events: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          handle: 'home',
          components: [container('Lib_shadcn_TabsContainer', 'tabs', [{ id: 'info', label: 'Info' }]), child('note', 'tab_details')],
        },
      ],
    } as never);
    expect(validation.errors.join(' ')).toMatch(/"note".*tab_details/);
  });
});

// The way out the error names: a child moved onto another item canvas of a Stepper, Accordion or Collapse.
describe('slot_name for a pack container item canvas', () => {
  it.each(['tab_info', 'step_review', 'section_two', 'panel_b'])('accepts %s', async (slot) => {
    const { componentSlotSchema } = await import('../src/componentParent.js');
    expect(componentSlotSchema.safeParse(slot).success).toBe(true);
  });
});
