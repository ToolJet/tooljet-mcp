import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { decodeComponentParent, encodeComponentParent } from '../src/componentParent.js';
import { loadInstalledPacks } from '../src/packCatalog.js';
import { createClient } from '../src/tooljetClient.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { deleteComponentsTool } from '../src/tools/deleteComponents.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import { updateLayoutTool } from '../src/tools/updateLayout.js';

// QA on component packs (feat/cc-packs, 2026-11-12): a pack widget draws each of its slots on a canvas "<id>-<slot>",
// and a child on any other canvas is saved but never shown.
// - DVRL-7: update_layout stored parent "aCard" (a name) as written.
// - DVRL-8: moving a child between tab slots appended the slot to the old one: <id>-tab_tab1-tab_tab2.
// - DVRL-9: a child added with no slot_name under a widget with no body slot (Collapse, Stepper, SplitPane ...) went on
//   a canvas the widget does not draw.
// - DVRL-59: delete_components removed a pack Tabs or Collapse whose slots still held children.
// - DVRL-60: slot_name was not checked against the parent's slots (tab_<anything> was taken anywhere).

const card = 'cccccccc-1111-4111-8111-cccccccccccc';
const tabs = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa';
const collapse = 'bbbbbbbb-3333-4333-8333-bbbbbbbbbbbb';
const split = 'dddddddd-4444-4444-8444-dddddddddddd';
const child = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
const button = 'ffffffff-6666-4666-8666-ffffffffffff';
const legacyBox = '99999999-7777-4777-8777-999999999999';

// Two shipped packs, as GET /api/builtin-packs and their manifests give them (the slots each component drew when built).
beforeAll(async () => {
  await loadInstalledPacks(
    async () => [],
    async () => [
      {
        info: { pack: 'antd', displayName: 'Ant Design', version: '1.0.0', hash: 'h1' },
        manifest: {
          components: {
            Card: { slots: [{ name: 'body', kind: 'slot' }], props: [{ name: 'title', type: 'string', default: 'Card' }] },
            Modal: { slots: [{ name: 'body', kind: 'popup' }], props: [{ name: 'open', type: 'boolean', default: false }] },
            // Built with its first tab open, so only tab_tab1 was drawn; its items name both tabs.
            Tabs: {
              slots: [{ name: 'tab_tab1', kind: 'slot' }],
              props: [{ name: 'items', type: 'array', default: [{ key: 'tab1', label: 'Tab 1' }, { key: 'tab2', label: 'Tab 2' }] }],
            },
            // A widget that draws no child canvas: the shipped manifests leave its slots out.
            Button: { props: [{ name: 'label', type: 'string', default: 'Button' }] },
            Divider: { slots: [], props: [] },
            Collapse: {
              slots: [{ name: 'panel_panel1', kind: 'slot' }, { name: 'panel_panel2', kind: 'slot' }],
              props: [{ name: 'items', type: 'array', default: [{ key: 'panel1', label: 'Panel 1' }, { key: 'panel2', label: 'Panel 2' }] }],
            },
          },
        },
      },
      {
        info: { pack: 'shadcn', displayName: 'Rocket 2.0', version: '1.0.0', hash: 'h2' },
        manifest: {
          components: {
            SplitPane: { slots: [{ name: 'first', kind: 'slot' }, { name: 'second', kind: 'slot' }], props: [] },
            Stepper: {
              slots: [{ name: 'step_account', kind: 'slot' }, { name: 'step_review', kind: 'slot' }],
              props: [{ name: 'steps', type: 'array', default: [{ id: 'account', label: 'Account' }, { id: 'review', label: 'Review' }] }],
            },
          },
        },
      },
      // A pack whose manifest predates slots: none of its components says where children go, so nothing is checked.
      {
        info: { pack: 'legacy', displayName: 'Legacy', version: '1.0.0', hash: 'h3' },
        manifest: { components: { Box: { props: [] } } },
      },
    ]
  );
});

type Write = { method: string; url: string; diff: unknown };

/** A real client whose writes are recorded, reading this page. */
const harness = (components: Array<Record<string, unknown>>) => {
  const writes: Write[] = [];
  const authedFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method !== 'GET') writes.push({ method, url, diff: JSON.parse(String(init?.body ?? '{}')).diff });
    return new Response('{}', { status: 200 });
  });
  const real = createClient({ authedFetch } as unknown as Auth, {} as Config);
  const summary = { app_id: 'app1', pages: [{ id: 'p1', name: 'Home', components }], queries: [], events: [] };
  const client = { ...real, getAppSummary: vi.fn().mockResolvedValue(summary), getAppSettings: vi.fn().mockResolvedValue({}) };
  const parentWritten = (method: string) => {
    const write = writes.find((w) => w.method === method);
    const entry = write ? (write.diff as Record<string, { component?: { parent?: string }; parent?: string }>)[child] : undefined;
    return entry?.component?.parent ?? entry?.parent;
  };
  return { client: client as never, writes, parentWritten };
};

const text = (result: { content: Array<{ text?: string }> }) => String(result.content[0]?.text ?? '');
const ids = { app_id: 'app1', version_id: 'v1', page_id: 'p1' };
const pack = (id: string, name: string, type: string, properties: Record<string, unknown> = {}) => ({
  id, name, type, properties, styles: {}, layouts: { desktop: { top: 0, left: 0, width: 30, height: 400 } },
});
const note = (parent?: string) => ({
  id: child, name: 'note', type: 'Text', properties: { text: { value: 'Hi' } }, styles: {},
  layouts: { desktop: { top: 0, left: 0, width: 10, height: 40 } },
  ...(parent ? { parent } : {}),
});

describe('a pack slot canvas decodes to its widget and slot', () => {
  it('reads <id>-<slot> for any slot a pack draws', () => {
    expect(decodeComponentParent(`${tabs}-tab_tab1`)).toEqual({ parentId: tabs, slotName: 'tab_tab1' });
    expect(decodeComponentParent(`${split}-first`)).toEqual({ parentId: split, slotName: 'first' });
  });
  it('moving to another slot replaces the slot (DVRL-8)', () => {
    expect(encodeComponentParent(`${tabs}-tab_tab1`, 'tab_tab2', 'Lib_antd_Tabs')).toBe(`${tabs}-tab_tab2`);
  });
});

describe('update_layout and update_components under a pack widget', () => {
  it('DVRL-7: a parent named by its component name is stored as its id, in the body slot of a Card', async () => {
    const h = harness([pack(card, 'aCard', 'Lib_antd_Card'), note()]);
    const result = await updateLayoutTool(h.client).handler({ ...ids, layouts: [{ component_id: 'note', parent: 'aCard' }] } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('PUT')).toBe(`${card}-body`);
  });

  it('DVRL-7: a parent that names nothing on the page is refused before any write', async () => {
    const h = harness([pack(card, 'aCard', 'Lib_antd_Card'), note()]);
    const result = await updateLayoutTool(h.client).handler({ ...ids, layouts: [{ component_id: 'note', parent: 'noSuchCard' }] } as never);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/noSuchCard/);
    expect(h.writes).toEqual([]);
  });

  it.each([
    ['tab_tab2', `${tabs}-tab_tab2`],
    ['tab_tab1', `${tabs}-tab_tab1`],
  ])('DVRL-8: update_layout slot_name %s on a child of tab_tab1 stores %s', async (slot, stored) => {
    const h = harness([pack(tabs, 'tabs1', 'Lib_antd_Tabs'), note(`${tabs}-tab_tab1`)]);
    const result = await updateLayoutTool(h.client).handler({ ...ids, layouts: [{ component_id: 'note', slot_name: slot }] } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('PUT')).toBe(stored);
  });

  it('DVRL-8: update_components moves a child between tab slots the same way', async () => {
    const h = harness([pack(tabs, 'tabs1', 'Lib_antd_Tabs'), note(`${tabs}-tab_tab1`)]);
    const result = await updateComponentsTool(h.client).handler({ ...ids, updates: [{ component_id: 'note', slot_name: 'tab_tab2' }] } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('PUT')).toBe(`${tabs}-tab_tab2`);
  });

  // Review on tooljet-mcp#143: the parent's slots are read after the batch's own edits to it, in either order.
  it.each([
    ['after', (move: object, grow: object) => [grow, move]],
    ['before', (move: object, grow: object) => [move, grow]],
  ])('a move into a tab added %s it in the same update_components batch is saved', async (_, order) => {
    const h = harness([pack(tabs, 'tabs1', 'Lib_antd_Tabs'), note()]);
    const items = [{ key: 'tab1', label: 'Tab 1' }, { key: 'tab2', label: 'Tab 2' }, { key: 'returns', label: 'Returns' }];
    const result = await updateComponentsTool(h.client).handler({
      ...ids,
      updates: order(
        { component_id: 'note', parent: 'tabs1', slot_name: 'tab_returns' },
        { component_id: 'tabs1', definition: { properties: { items: { value: items } } } }
      ),
    } as never);
    expect(result.isError, text(result)).not.toBe(true);
    expect(h.parentWritten('PUT')).toBe(`${tabs}-tab_returns`);
  });

  it('a move into a tab the same batch removes is refused', async () => {
    const h = harness([pack(tabs, 'tabs1', 'Lib_antd_Tabs'), note()]);
    const result = await updateComponentsTool(h.client).handler({
      ...ids,
      updates: [
        { component_id: 'note', parent: 'tabs1', slot_name: 'tab_tab2' },
        { component_id: 'tabs1', definition: { properties: { items: { value: [{ key: 'tab1', label: 'Tab 1' }] } } } },
      ],
    } as never);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/"tab_tab2"/);
    expect(h.writes).toEqual([]);
  });

  it('DVRL-60: a slot the parent does not draw is refused before any write', async () => {
    const h = harness([pack(tabs, 'tabs1', 'Lib_antd_Tabs'), note(`${tabs}-tab_tab1`)]);
    const result = await updateLayoutTool(h.client).handler({ ...ids, layouts: [{ component_id: 'note', slot_name: 'tab_tab9' }] } as never);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/tab_tab1, tab_tab2/);
    expect(h.writes).toEqual([]);
  });
});

describe('add_components under a pack widget already on the page', () => {
  const add = async (components: Array<Record<string, unknown>>, input: Record<string, unknown>) => {
    const h = harness(components);
    const result = await addComponentsTool(h.client).handler({
      ...ids,
      components: [{ name: 'note2', type: 'Text', properties: { text: 'Hi' }, layout: { top: 0, left: 0, width: 10, height: 40 }, ...input }],
    } as never);
    const posted = h.writes.find((w) => w.method === 'POST');
    const parent = posted ? Object.values(posted.diff as Record<string, { parent?: string }>)[0]?.parent : undefined;
    return { result, parent, writes: h.writes };
  };

  // Characterization: a widget with a body slot takes children there by default (review 2026-11-11).
  it.each([
    ['Card', card, 'Lib_antd_Card'],
    ['Modal', collapse, 'Lib_antd_Modal'],
  ])('a %s takes a child with no slot_name in its body', async (_, id, type) => {
    const { result, parent } = await add([pack(id, 'box', type)], { parent: id });
    expect(result.isError, text(result)).not.toBe(true);
    expect(parent).toBe(`${id}-body`);
  });

  it.each([
    ['Collapse', collapse, 'Lib_antd_Collapse', /panel_panel1, panel_panel2/],
    ['SplitPane', split, 'Lib_shadcn_SplitPane', /first, second/],
  ])('DVRL-9: a %s, with no body slot, needs a slot_name: refused, naming its slots', async (_, id, type, slots) => {
    const { result, writes } = await add([pack(id, 'box', type)], { parent: id });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(slots);
    expect(writes.filter((w) => w.method === 'POST')).toEqual([]);
  });

  it.each([
    ['panel_panel2', collapse, 'Lib_antd_Collapse'],
    ['second', split, 'Lib_shadcn_SplitPane'],
    ['tab_tab2', tabs, 'Lib_antd_Tabs'],
  ])('DVRL-9: slot_name %s goes on that slot', async (slot, id, type) => {
    const { result, parent } = await add([pack(id, 'box', type)], { parent: id, slot_name: slot });
    expect(result.isError, text(result)).not.toBe(true);
    expect(parent).toBe(`${id}-${slot}`);
  });

  it.each([
    ['a Card', card, 'Lib_antd_Card', 'tab_x', {}],
    ['a Tabs without that tab', tabs, 'Lib_antd_Tabs', 'tab_tab9', {}],
    ['a Tabs with its own tabs', tabs, 'Lib_antd_Tabs', 'tab_tab1', { items: { value: '{{[{"key":"overview"},{"key":"details"}]}}' } }],
  ])('DVRL-60: slot_name on %s that it does not draw is refused before any write', async (_, id, type, slot, properties) => {
    const { result, writes } = await add([pack(id, 'box', type, properties)], { parent: id, slot_name: slot });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(new RegExp(`"${slot}"`));
    expect(writes.filter((w) => w.method === 'POST')).toEqual([]);
  });

  it("DVRL-60: a Tabs' own tab key is its slot", async () => {
    const { result, parent } = await add(
      [pack(tabs, 'box', 'Lib_antd_Tabs', { items: { value: '{{[{"key":"overview"},{"key":"details"}]}}' } })],
      { parent: tabs, slot_name: 'tab_details' }
    );
    expect(result.isError, text(result)).not.toBe(true);
    expect(parent).toBe(`${tabs}-tab_details`);
  });

  // Characterization: items bound to data are only known in the app, so any tab_<key> is taken there.
  it('a Tabs whose items are bound to data takes any tab_<key>', async () => {
    const { result, parent } = await add(
      [pack(tabs, 'box', 'Lib_antd_Tabs', { items: { value: '{{queries.sections.data}}' } })],
      { parent: tabs, slot_name: 'tab_anything' }
    );
    expect(result.isError, text(result)).not.toBe(true);
    expect(parent).toBe(`${tabs}-tab_anything`);
  });
});

// Review on tooljet-mcp#143: a pack widget its manifest gives no slots draws no child canvas, so a child under it is
// refused, with or without slot_name; one from a manifest that says nothing of slots is left unchecked.
describe('a pack widget that draws no child canvas', () => {
  const add = async (components: Array<Record<string, unknown>>, input: Record<string, unknown>) => {
    const h = harness(components);
    const result = await addComponentsTool(h.client).handler({
      ...ids,
      components: [{ name: 'note2', type: 'Text', properties: { text: 'Hi' }, layout: { top: 0, left: 0, width: 10, height: 40 }, ...input }],
    } as never);
    return { result, posts: h.writes.filter((w) => w.method === 'POST') };
  };

  it.each([
    ['Button (slots left out)', 'Lib_antd_Button', { slot_name: 'first' }],
    ['Button (slots left out)', 'Lib_antd_Button', {}],
    ['Divider (slots: [])', 'Lib_antd_Divider', { slot_name: 'body' }],
  ])('a child under a %s is refused before any write', async (_, type, input) => {
    const { result, posts } = await add([pack(button, 'btn', type)], { parent: button, ...input });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/draws no child components/);
    expect(posts).toEqual([]);
  });

  it('update_components refuses a move under it', async () => {
    const h = harness([pack(button, 'btn', 'Lib_antd_Button'), note()]);
    const result = await updateComponentsTool(h.client).handler({ ...ids, updates: [{ component_id: 'note', parent: 'btn' }] } as never);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/draws no child components/);
    expect(h.writes).toEqual([]);
  });

  it('a pack whose manifest names no slots at all is not checked', async () => {
    const { result, posts } = await add([pack(legacyBox, 'box', 'Lib_legacy_Box')], { parent: legacyBox, slot_name: 'first' });
    expect(result.isError, text(result)).not.toBe(true);
    expect(posts).toHaveLength(1);
  });
});

describe('delete_components and pack slot children', () => {
  it.each([
    ['Tabs', tabs, 'Lib_antd_Tabs', 'tab_tab1'],
    ['Collapse', collapse, 'Lib_antd_Collapse', 'panel_panel2'],
    ['SplitPane', split, 'Lib_shadcn_SplitPane', 'first'],
  ])('DVRL-59: a %s whose slot still holds a child is refused', async (_, id, type, slot) => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({
        app_id: 'app1', queries: [], events: [],
        pages: [{ id: 'p1', name: 'Home', components: [pack(id, 'box', type), note(`${id}-${slot}`)] }],
      }),
      deleteComponents: vi.fn(),
    };
    const result = await deleteComponentsTool(client as never).handler({ ...ids, component_ids: [id], confirm: true });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/note/);
    expect(client.deleteComponents).not.toHaveBeenCalled();
  });
});
