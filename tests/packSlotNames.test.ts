import { describe, expect, it, vi } from 'vitest';
import { componentSlotSchema } from '../src/componentParent.js';
import { lintComponentSlots } from '../src/lint.js';
import { validatePersistedAppSummary } from '../src/appValidation.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';

// DVRL-129 (2026-11-13): nested content could not be put in a Rocket Split Pane (slots first and second were refused
// as slot_name), and a plain parent under a Split Pane, Stepper or Accordion Container was accepted and stored on its
// body canvas, which those containers do not draw: saved, never shown, and validate_app passed.
const SPLIT = 'cccccccc-3333-4333-8333-cccccccccccc';
const STEPPER = 'dddddddd-4444-4444-8444-dddddddddddd';
const CARD = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
const split = { id: SPLIT, name: 'spl', type: 'Lib_shadcn_SplitPane', properties: {} };
const stepper = {
  id: STEPPER,
  name: 'stp',
  type: 'Lib_shadcn_Stepper',
  properties: { steps: { value: [{ id: 'account' }, { id: 'review' }] } },
};
const card = { id: CARD, name: 'crd', type: 'Lib_shadcn_Card', properties: {} };
const text = (name: string, parent: string, slotName?: string) => ({ id: `id-${name}`, name, type: 'Text', parent, ...(slotName ? { slotName } : {}) });

describe('slot_name', () => {
  it.each(['first', 'second', 'row', 'step_account', 'body', 'tab-t1'])('accepts %s', (slot) => {
    expect(componentSlotSchema.safeParse(slot).success).toBe(true);
  });
  it.each(['tab-x', 'first pane', '', '-first'])('rejects %j', (slot) => {
    expect(componentSlotSchema.safeParse(slot).success).toBe(false);
  });
});

describe('a child of a pack container', () => {
  it.each(['first', 'second'])('is accepted on a Split Pane %s canvas', (slot) => {
    expect(lintComponentSlots([split, text('note', `${SPLIT}-${slot}`)] as never)).toEqual([]);
  });

  it('is refused on a canvas the Split Pane does not draw, naming the ones it does', () => {
    const errors = lintComponentSlots([split, text('note', `${SPLIT}-third`)] as never);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/"note".*"spl".*first, second/);
  });

  it.each([
    ['Split Pane', split, 'first, second'],
    ['Stepper', stepper, 'step_account, step_review'],
  ])('is refused with only a parent under a %s, which has no body', (_, container, names) => {
    const errors = lintComponentSlots([container, text('note', `${container.id}-body`)] as never);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(new RegExp(`"note".*slot_name.*${names}`));
  });

  it('is refused with only a parent in the same batch', () => {
    const errors = lintComponentSlots([
      { ...split, clientRef: 's' },
      { name: 'note', type: 'Text', parentRef: 's' },
    ] as never);
    expect(errors.join(' ')).toMatch(/"note".*first, second/);
  });

  it('is accepted with only a parent under a pack Card, which draws its body', () => {
    expect(lintComponentSlots([card, text('note', `${CARD}-body`)] as never)).toEqual([]);
  });
});

describe('a child of a native container', () => {
  it('is refused on a slot name that only packs use', () => {
    const errors = lintComponentSlots([
      { clientRef: 'c', name: 'box', type: 'Container' },
      { name: 'note', type: 'Text', parentRef: 'c', slotName: 'first' },
    ] as never);
    expect(errors.join(' ')).toMatch(/"note".*first/);
  });
});

describe('add_components under a Split Pane already on the page', () => {
  const run = (component: Record<string, unknown>) => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        version_id: 'v1',
        queries: [],
        events: [],
        pages: [{ id: 'home', name: 'Home', components: [{ ...split, layouts: { desktop: { top: 0, left: 0, width: 30, height: 40 } } }] }],
      }),
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

  it('adds a child to its first canvas', async () => {
    const { client, result } = run({ parent: 'spl', slot_name: 'first' });
    const out = await result;
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    expect(client.createComponents).toHaveBeenCalledTimes(1);
  });

  it('refuses a child with only a parent, and writes nothing', async () => {
    const { client, result } = run({ parent: 'spl' });
    const out = await result;
    expect(out.isError).toBe(true);
    expect(String(out.content[0]!.text)).toMatch(/first, second/);
    expect(client.createComponents).not.toHaveBeenCalled();
  });
});

describe('update_components', () => {
  it('moves a child stranded on a Split Pane body to its first canvas', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1',
        queries: [],
        events: [],
        pages: [{ id: 'home', name: 'Home', components: [split, text('note', `${SPLIT}-body`)] }],
      }),
      updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
      updateLayouts: vi.fn(),
    };
    const out = await updateComponentsTool(client as never).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'home',
      updates: [{ component_id: 'note', parent: 'spl', slot_name: 'first' }],
    } as never);
    expect(out.isError, String(out.content[0]!.text)).toBeFalsy();
    expect(client.updateComponents).toHaveBeenCalledTimes(1);
  });
});

describe('validate_app', () => {
  it('reports a child saved on a body canvas the Split Pane does not draw', () => {
    const validation = validatePersistedAppSummary({
      app_id: 'app1',
      queries: [],
      events: [],
      pages: [{ id: 'home', name: 'Home', handle: 'home', components: [split, text('note', `${SPLIT}-body`)] }],
    } as never);
    expect(validation.errors.join(' ')).toMatch(/"note".*first, second/);
  });
});

// Live, the packs come from the ToolJet server at start-up: their canvases have to come with them, or a plain parent under
// a server pack's Split Pane passed (the offline catalog had them, the discovered one did not).
describe('a pack discovered from the server', () => {
  it('keeps the canvases its manifest lists', async () => {
    const { packFromBuiltin } = await import('../src/packCatalog.js');
    const { registerLibraryPacks, packSlotNames } = await import('../src/libraryPack.js');
    const built = packFromBuiltin({ pack: 'demo', displayName: 'Demo', version: '1.0.0' } as never, {
      components: { SplitPane: { props: [], slots: [{ name: 'first', kind: 'slot' }, { name: 'second', kind: 'slot' }] } },
    } as never);
    registerLibraryPacks([built!.pack]);
    try {
      expect(packSlotNames('Lib_demo_SplitPane')).toEqual(['first', 'second']);
    } finally {
      registerLibraryPacks(null as never);
    }
  });
});

// A Stepper added without steps draws its default ones; a plain parent's refusal names them, and a child on one is kept.
describe('a pack container with its items left to the defaults', () => {
  const bare = { id: STEPPER, name: 'stp', type: 'Lib_shadcn_Stepper', properties: {} };
  it('names its default canvases', () => {
    const errors = lintComponentSlots([bare, text('note', `${STEPPER}-body`)] as never);
    expect(errors.join(' ')).toMatch(/step_account, step_profile, step_review/);
  });
  it('accepts a child on a default canvas and refuses one on another', () => {
    expect(lintComponentSlots([bare, text('a', `${STEPPER}-step_profile`)] as never)).toEqual([]);
    expect(lintComponentSlots([bare, text('b', `${STEPPER}-step_other`)] as never)).toHaveLength(1);
  });
});

// ToolJet saves a pack's list as a binding of a literal array ({{[{"id":"account"}]}}): the pack's defaults and the
// editor's own saves look like this, so its canvases are known exactly, as for a plain array.
describe('items saved as a binding of a literal list', () => {
  const saved = (steps: string) => ({ id: STEPPER, name: 'stp', type: 'Lib_shadcn_Stepper', properties: { steps: { value: steps } } });
  it('names their canvases for a plain parent', () => {
    const errors = lintComponentSlots([saved('{{[{"id":"account"},{"id":"review"}]}}'), text('note', `${STEPPER}-body`)] as never);
    expect(errors.join(' ')).toMatch(/step_account, step_review/);
  });
  it('reports a child whose step id is gone', () => {
    const errors = lintComponentSlots([saved('{{[{"id":"account"}]}}'), text('note', `${STEPPER}-step_profile`)] as never);
    expect(errors.join(' ')).toMatch(/"note".*step_profile.*step_account/);
  });
  it('is still not judged when the binding reads app data', () => {
    expect(lintComponentSlots([saved('{{queries.q.data}}'), text('note', `${STEPPER}-step_profile`)] as never)).toEqual([]);
  });
});
