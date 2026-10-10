import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';
import type { Auth } from '../src/auth.js';
import { componentInputSchema, prepareComponentBatch, type ComponentInput } from '../src/componentBatch.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';
import { appendedChildOrders, normalizeChildOrder } from '../src/flexContainer.js';
import { detectOverlaps, lintComponentSpec, lintComponents, lintFlexContainerFit } from '../src/lint.js';
import { diffPageInPlace } from '../src/pageReplaceInPlace.js';
import { appPlanSchema } from '../src/appPlanSchema.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import { updateLayoutTool } from '../src/tools/updateLayout.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { getCatalog, getComponentSchema } from '../src/catalog.js';
import type { ToolDef } from '../src/tools/types.js';

const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', pat: 'fixture-pat' };

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function makeAuth(pageComponents: Record<string, unknown> = {}): Auth & { authedFetch: ReturnType<typeof vi.fn> } {
  return {
    authedFetch: vi.fn(async (path: string, init?: RequestInit) => {
      if (!init?.method || init.method === 'GET') {
        return jsonResponse({ id: 'app1', editing_version: { id: 'v1' }, pages: [{ id: 'p1', components: pageComponents }] });
      }
      return jsonResponse({});
    }),
    getOrganizationId: vi.fn().mockResolvedValue('org1'),
    getOrganizationSlug: vi.fn().mockResolvedValue('ws'),
  };
}

function bodies(auth: { authedFetch: ReturnType<typeof vi.fn> }, method: string): Array<{ diff: Record<string, any> }> {
  return auth.authedFetch.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === method)
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)));
}

const rect = (top = 0, height = 40) => ({ top, left: 0, width: 43, height });

function flexBatch(): ComponentInput[] {
  return [
    { name: 'panel', type: 'FlexContainer', client_ref: 'panel', properties: { direction: 'column', padding: 16 }, layout: { top: 80, left: 2, width: 39, height: 400 } },
    { name: 'third', type: 'Text', parent_ref: 'panel', properties: { text: 'C' }, layout: rect() },
    { name: 'first', type: 'Text', parent_ref: 'panel', properties: { text: 'A' }, layout: rect() },
    { name: 'second', type: 'Button', parent_ref: 'panel', properties: { text: 'B' }, layout: rect() },
  ];
}

describe('FlexContainer childOrder on create (bug 1)', () => {
  it('writes the container childOrder as its children in request order', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    const prepared = prepareComponentBatch(flexBatch());
    expect(prepared.errors).toEqual([]);
    const created = await client.createComponents({ appId: 'app1', versionId: 'v1', pageId: 'p1', components: prepared.components });
    const [post] = bodies(auth, 'POST');
    const ids = Object.fromEntries(created.map((c) => [c.name, c.component_id]));
    expect(post!.diff[ids.panel!].properties.childOrder).toEqual({ value: [ids.third, ids.first, ids.second] });
    // No second write and no page read when every parent is in the batch.
    expect(bodies(auth, 'PUT')).toEqual([]);
    expect(auth.authedFetch).toHaveBeenCalledTimes(1);
  });

  it('resolves an authored childOrder that names batch children, then appends the rest', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    const batch = flexBatch();
    batch[0]!.properties.childOrder = ['second', 'first'];
    const prepared = prepareComponentBatch(batch);
    expect(prepared.errors).toEqual([]);
    const created = await client.createComponents({ appId: 'app1', versionId: 'v1', pageId: 'p1', components: prepared.components });
    const ids = Object.fromEntries(created.map((c) => [c.name, c.component_id]));
    expect(bodies(auth, 'POST')[0]!.diff[ids.panel!].properties.childOrder.value).toEqual([ids.second, ids.first, ids.third]);
  });

  it('appends a child added later to the stored childOrder of an existing FlexContainer', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    const page = [
      { id: 'flex1', type: 'FlexContainer', properties: { childOrder: { value: ['c2', 'c1'] } } },
      { id: 'c1', type: 'Text', parent: 'flex1', layouts: { desktop: rect() } },
      { id: 'c2', type: 'Text', parent: 'flex1', layouts: { desktop: rect() } },
    ];
    const created = await client.createComponents({
      appId: 'app1', versionId: 'v1', pageId: 'p1', pageComponents: page,
      components: [
        { name: 'late1', type: 'Text', properties: {}, parent: 'flex1', layout: rect() },
        { name: 'late2', type: 'Text', properties: {}, parent: 'flex1', layout: rect() },
      ],
    });
    const [put] = bodies(auth, 'PUT');
    expect(put!.diff.flex1).toEqual({
      component: { definition: { properties: { childOrder: { value: ['c2', 'c1', created[0]!.component_id, created[1]!.component_id] } } } },
    });
  });

  it('reads the page when the caller has not, and leaves non-flex parents alone', async () => {
    const auth = makeAuth({
      flex1: { component: { component: 'FlexContainer', name: 'panel', definition: { properties: {} } }, layouts: {} },
      box: { component: { component: 'Container', name: 'box', definition: { properties: {} } }, layouts: {} },
      old: { component: { component: 'Text', name: 'old', parent: 'flex1', definition: { properties: {} } }, layouts: { desktop: rect() } },
    });
    const client = createClient(auth, config);
    const created = await client.createComponents({
      appId: 'app1', versionId: 'v1', pageId: 'p1',
      components: [
        { name: 'inBox', type: 'Text', properties: {}, parent: 'box', layout: rect() },
        { name: 'inFlex', type: 'Text', properties: {}, parent: 'flex1', layout: rect() },
      ],
    });
    const [put] = bodies(auth, 'PUT');
    expect(Object.keys(put!.diff)).toEqual(['flex1']);
    expect(put!.diff.flex1.component.definition.properties.childOrder.value).toEqual(['old', created[1]!.component_id]);
  });

  it('keeps the position of a child recreated under an id the stored order already holds', () => {
    const page = [
      { id: 'flex1', type: 'FlexContainer', properties: { childOrder: { value: ['a', 'b', 'c'] } } },
      { id: 'a', parent: 'flex1' },
      { id: 'c', parent: 'flex1' },
    ];
    expect(appendedChildOrders(page, [{ parentId: 'flex1', childId: 'b' }]).size).toBe(0);
    expect(appendedChildOrders(page, [{ parentId: 'flex1', childId: 'd' }]).get('flex1')).toEqual(['a', 'c', 'd']);
  });

  it('mirrors ToolJet normalizeChildOrder', () => {
    expect(normalizeChildOrder(['x', 'b', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('keeps an unchanged FlexContainer on a page replace and recreates it with the new order when a child is added', () => {
    const stored = [
      { id: 'flex1', name: 'panel', type: 'FlexContainer', properties: { childOrder: { value: ['t1', 't2'] } }, styles: {}, layouts: { desktop: { top: 0, left: 0, width: 43, height: 200 } } },
      { id: 't1', name: 'first', type: 'Text', parent: 'flex1', properties: {}, styles: {}, layouts: { desktop: rect() } },
      { id: 't2', name: 'second', type: 'Text', parent: 'flex1', properties: {}, styles: {}, layouts: { desktop: rect() } },
    ];
    const planned = [
      { name: 'panel', type: 'FlexContainer', clientRef: 'panel', properties: {}, styles: {}, layouts: { desktop: { top: 0, left: 0, width: 43, height: 200 } } },
      { name: 'first', type: 'Text', parentRef: 'panel', properties: {}, styles: {}, layouts: { desktop: rect() } },
      { name: 'second', type: 'Text', parentRef: 'panel', properties: {}, styles: {}, layouts: { desktop: rect() } },
    ];
    const none = { FlexContainer: {}, Text: {} };
    const same = diffPageInPlace(stored, planned, none);
    expect(same.recreated).toEqual([]);
    expect(same.keep).toContain('panel');

    const grown = diffPageInPlace(stored, [...planned, { name: 'third', type: 'Text', parentRef: 'panel', properties: {}, styles: {}, layouts: { desktop: rect() } }], none, () => 't3');
    expect(grown.recreated).toEqual(['panel']);
    const panel = grown.create.find((component) => component.name === 'panel')!;
    expect(panel.properties.childOrder).toEqual({ value: ['t1', 't2', 't3'] });
  });
});

function summaryClient(components: Array<Record<string, unknown>>): ToolJetClient {
  return {
    getAppSummary: vi.fn().mockResolvedValue({ app_id: 'app1', pages: [{ id: 'p1', components }], queries: [], events: [] }),
    updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    updateLayouts: vi.fn().mockResolvedValue({ updated: 1 }),
  } as unknown as ToolJetClient;
}

const flexPage = () => [
  { id: 'flex1', name: 'panel', type: 'FlexContainer', properties: { padding: { value: 12 }, childOrder: { value: ['a', 'b'] } }, styles: {}, layouts: { desktop: { top: 0, left: 2, width: 39, height: 300 } } },
  { id: 'a', name: 'alpha', type: 'Text', parent: 'flex1', properties: { text: { value: 'A' } }, styles: {}, layouts: { desktop: rect() } },
  { id: 'b', name: 'beta', type: 'Text', parent: 'flex1', properties: { text: { value: 'B' } }, styles: {}, layouts: { desktop: rect() } },
  { id: 'c', name: 'gamma', type: 'Text', properties: { text: { value: 'C' } }, styles: {}, layouts: { desktop: rect(400) } },
];

describe('FlexContainer childOrder on update (bug 1)', () => {
  it('update_components resolves a childOrder of child names to the complete id order', async () => {
    const client = summaryClient(flexPage());
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'panel', definition: { properties: { childOrder: ['beta'] } } }],
    });
    expect(result.isError).toBeFalsy();
    const sent = (client.updateComponents as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sent.updates[0].definition.properties.childOrder).toEqual({ value: ['b', 'a'] });
  });

  it('update_components refuses a childOrder naming a component outside the container', async () => {
    const client = summaryClient(flexPage());
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'panel', definition: { properties: { childOrder: ['gamma'] } } }],
    });
    expect(result.isError).toBe(true);
    expect(client.updateComponents).not.toHaveBeenCalled();
  });

  it('update_components leaves the stored childOrder alone on an unrelated edit', async () => {
    const client = summaryClient(flexPage());
    await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'panel', definition: { properties: { gap: 20 } } }],
    });
    const calls = (client.updateComponents as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0]![0].updates[0].definition).toEqual({ properties: { gap: { value: 20 } } });
  });

  it('a childOrder authored on create is a known FlexContainer key, never stripped', () => {
    const result = normalizeComponentSpec(
      { name: 'panel', type: 'FlexContainer', properties: { childOrder: { value: ['x'] } } },
      { stripUnknownKeys: true }
    );
    expect(result.component.properties.childOrder).toEqual({ value: ['x'] });
  });

  it('update_components appends a child reparented into a FlexContainer', async () => {
    const client = summaryClient(flexPage());
    await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'gamma', parent: 'flex1' }],
    });
    const calls = (client.updateComponents as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[1]![0].updates).toEqual([{ componentId: 'flex1', definition: { properties: { childOrder: { value: ['a', 'b', 'c'] } } } }]);
  });

  it('update_layout appends a child reparented into a FlexContainer', async () => {
    const client = summaryClient(flexPage());
    const result = await updateLayoutTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'gamma', parent: 'flex1', desktop: rect() }],
    });
    expect(result.isError).toBeFalsy();
    const calls = (client.updateComponents as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0].updates[0].definition.properties.childOrder).toEqual({ value: ['a', 'b', 'c'] });
  });
});

describe('FlexContainer padding is a property (bug 2)', () => {
  it('keeps properties.padding on create, without a move or strip warning', () => {
    const result = normalizeComponentSpec(
      { name: 'panel', type: 'FlexContainer', properties: { padding: 16 } },
      { stripUnknownKeys: true }
    );
    expect(result.component.properties.padding).toEqual({ value: 16 });
    expect(result.component.styles?.padding).toBeUndefined();
    expect(result.warnings.join(' ')).not.toMatch(/padding/);
    expect(lintComponentSpec({ ...result.component, layout: { top: 0, left: 0, width: 43, height: 200 } }).errors.join(' ')).not.toMatch(/padding/);
  });

  it('moves a FlexContainer styles.padding to properties instead of dropping it', () => {
    const result = normalizeComponentSpec(
      { name: 'panel', type: 'FlexContainer', properties: {}, styles: { padding: 24 } },
      { stripUnknownKeys: true }
    );
    expect(result.component.properties.padding).toEqual({ value: 24 });
    expect(result.component.styles?.padding).toBeUndefined();
  });

  it('keeps padding as a property on update', async () => {
    const client = summaryClient(flexPage());
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'panel', definition: { properties: { padding: 20 } } }],
    });
    expect(result.isError).toBeFalsy();
    const sent = (client.updateComponents as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(sent.updates[0].definition).toEqual({ properties: { padding: { value: 20 } } });
    expect(JSON.parse((result.content[0] as { text: string }).text).warnings.join(' ')).not.toMatch(/padding/);
  });

  it('the client writes FlexContainer padding instead of refusing it', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    await client.createComponents({
      appId: 'app1', versionId: 'v1', pageId: 'p1',
      components: [{ name: 'panel', type: 'FlexContainer', properties: { padding: { value: 16 } }, layout: rect(0, 200) }],
    });
    const diff = bodies(auth, 'POST')[0]!.diff;
    expect(Object.values(diff)[0].properties.padding).toEqual({ value: 16 });
  });

  it('still moves padding out of properties for a component that reads it from styles', () => {
    const result = normalizeComponentSpec(
      { name: 'box', type: 'Container', properties: { padding: 'default' } },
      { stripUnknownKeys: true }
    );
    expect(result.component.properties.padding).toBeUndefined();
    expect(result.warnings.join(' ')).toMatch(/moved style key "padding"/);
  });
});

describe('FlexContainer children in geometry lint (bug 3)', () => {
  it('does not report stacked flex children as overlapping', () => {
    const prepared = prepareComponentBatch([
      ...flexBatch(),
      { name: 'after', type: 'Text', properties: { text: 'After' }, layout: { top: 500, left: 2, width: 39, height: 40 } },
    ]);
    expect(prepared.errors.join(' ')).not.toMatch(/overlap/);
  });

  it('still reports overlapping children of an ordinary Container', () => {
    const batch = flexBatch().map((component) => component.type === 'FlexContainer' ? { ...component, type: 'Container' } : component);
    const prepared = prepareComponentBatch(batch);
    expect(prepared.errors.join(' ')).toMatch(/overlap at rendered desktop size/);
  });

  it('skips children added to an existing FlexContainer by id', () => {
    const children: ComponentInput[] = [
      { name: 'x', type: 'Text', parent: 'flex1', properties: { text: 'X' }, layout: rect() },
      { name: 'y', type: 'Text', parent: 'flex1', properties: { text: 'Y' }, layout: rect() },
    ];
    expect(prepareComponentBatch(children).errors.join(' ')).toMatch(/overlap/);
    expect(prepareComponentBatch(children, { flexContainerIds: ['flex1'] }).errors.join(' ')).not.toMatch(/overlap/);
    expect(detectOverlaps(flexPage() as never)).toEqual([]);
  });

  it('keeps per-component minimum height checks for flex children', () => {
    const batch = flexBatch();
    batch[3] = { ...batch[3]!, layout: undefined, layouts: { desktop: rect(0, 10) } };
    expect(prepareComponentBatch(batch).errors.join(' ')).toMatch(/Button "second": desktop height 10px cannot render/);
  });

  it('warns when stacked children need more height than a fixed-height FlexContainer has', () => {
    const components = [
      { name: 'panel', type: 'FlexContainer', clientRef: 'panel', properties: { direction: { value: 'column' }, gap: { value: 10 }, padding: { value: 10 }, dynamicHeight: { value: '{{false}}' } }, layout: { top: 0, left: 0, width: 43, height: 100 } },
      { name: 'a', type: 'Text', parentRef: 'panel', properties: {}, layout: rect() },
      { name: 'b', type: 'Text', parentRef: 'panel', properties: {}, layout: rect() },
    ];
    expect(lintFlexContainerFit(components).join(' ')).toMatch(/need about 112px.*100px tall/);
    const grows = [{ ...components[0]!, properties: { ...components[0]!.properties, dynamicHeight: { value: '{{true}}' } } }, ...components.slice(1)];
    expect(lintFlexContainerFit(grows)).toEqual([]);
    expect(lintComponents(components).warnings.join(' ')).toMatch(/FlexContainer "panel"/);
    // Created without the property, a FlexContainer grows (dynamic height is its create default since 2026-10-09);
    // a card or a row always fits its content in the viewer, whatever the property says.
    const unset = { ...components[0]!.properties };
    delete (unset as Record<string, unknown>).dynamicHeight;
    expect(lintFlexContainerFit([{ ...components[0]!, properties: unset }, ...components.slice(1)])).toEqual([]);
    const card = { ...components[0]!.properties, cardStyle: { value: 'shadcnCard' } };
    expect(lintFlexContainerFit([{ ...components[0]!, properties: card }, ...components.slice(1)])).toEqual([]);
    const row = { ...components[0]!.properties, direction: { value: 'row' } };
    expect(lintFlexContainerFit([{ ...components[0]!, properties: row }, ...components.slice(1)])).toEqual([]);
  });
});

describe('FlexContainer child widths (bug 4)', () => {
  const sized = { top: 0, left: 0, width: 10, height: 40, fillWidth: false, widthPx: 240 };

  it('accepts fillWidth and widthPx in component layouts and persists them', async () => {
    expect(componentInputSchema.safeParse({ name: 'x', type: 'Text', properties: {}, layouts: { desktop: sized } }).success).toBe(true);
    expect(componentInputSchema.safeParse({ name: 'x', type: 'Text', properties: {}, layout: { ...sized, widthPx: -5 } }).success).toBe(false);
    const batch = flexBatch();
    batch[1] = { ...batch[1]!, layout: undefined, layouts: { desktop: sized } };
    const prepared = prepareComponentBatch(batch);
    const auth = makeAuth();
    const created = await createClient(auth, config).createComponents({ appId: 'app1', versionId: 'v1', pageId: 'p1', components: prepared.components });
    const third = created.find((c) => c.name === 'third')!.component_id;
    expect(bodies(auth, 'POST')[0]!.diff[third].layouts.desktop).toEqual(sized);
  });

  it('accepts them in lint_app_spec plans', () => {
    const parsed = appPlanSchema.safeParse({ pages: [{ name: 'Home', icon: 'IconHome2', components: [{ name: 'x', type: 'Text', properties: {}, layout: sized }] }] });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.pages![0]!.components![0]!.layout).toEqual(sized);
  });

  it('update_layout accepts and sends them', async () => {
    const tool: ToolDef = updateLayoutTool(summaryClient(flexPage()));
    expect(z.object(tool.inputSchema).safeParse({ app_id: 'a', version_id: 'v', page_id: 'p', layouts: [{ component_id: 'a', desktop: sized }] }).success).toBe(true);
    const client = summaryClient(flexPage());
    await updateLayoutTool(client).handler({ app_id: 'app1', version_id: 'v1', page_id: 'p1', layouts: [{ component_id: 'alpha', desktop: sized }] });
    expect((client.updateLayouts as ReturnType<typeof vi.fn>).mock.calls[0]![0].layouts[0].desktop).toEqual(sized);
  });

  it('a page replace relayouts a child whose flex width changed', () => {
    const stored = [{ id: 't1', name: 'first', type: 'Text', properties: {}, styles: {}, layouts: { desktop: { ...rect(), fillWidth: true } } }];
    const diff = diffPageInPlace(stored, [{ name: 'first', type: 'Text', properties: {}, styles: {}, layouts: { desktop: { ...rect(), fillWidth: false, widthPx: 200 } } }], { Text: {} });
    expect(diff.relayout).toEqual([{ componentId: 't1', desktop: { ...rect(), fillWidth: false, widthPx: 200 } }]);
  });
});

describe('Ant Design pack and FlexContainer catalog', () => {
  const antTypes = ['AntButton', 'AntInput', 'AntSelect', 'AntDatePicker', 'AntRangePicker', 'AntTable', 'AntList', 'AntCard', 'AntTag',
    'AntStatistic', 'AntTitle', 'AntText', 'AntDescriptions', 'AntBadge', 'AntAvatar', 'AntProgress', 'AntTimeline', 'AntEmpty',
    'AntTextArea', 'AntInputNumber', 'AntCheckbox', 'AntSwitch', 'AntSegmented', 'AntAlert', 'AntSteps', 'AntBreadcrumb', 'AntDivider'];

  it('lists every Ant Design type in the palette and add_components accepts them', () => {
    const palette = new Set(getCatalog().map((entry) => entry.type));
    for (const type of antTypes) expect(palette.has(type), type).toBe(true);
    const prepared = prepareComponentBatch([
      { name: 'save', type: 'AntButton', properties: { text: 'Save', type: 'primary' }, layout: { top: 20, left: 2, width: 8, height: 40 } },
    ]);
    expect(prepared.errors).toEqual([]);
    expect(prepared.warnings.join(' ')).not.toMatch(/unknown/);
  });

  it('serves FlexContainer card properties and authoring hints', async () => {
    const schema = getComponentSchema('FlexContainer')!;
    expect(schema.properties.find((p) => p.key === 'cardStyle')?.allowedValues).toEqual(['none', 'antCard', 'shadcnCard']);
    expect(schema.properties.map((p) => p.key)).toEqual(expect.arrayContaining(['cardTitle', 'cardExtra', 'padding', 'childOrder']));
    const result = await getComponentCatalogTool(undefined as never).handler({ type: 'FlexContainer', sections: ['renderingHints', 'authoringHints'] });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/childOrder/);
    expect(text).toMatch(/widthPx/);
    expect(text).toMatch(/dynamicHeight/);
    expect(text).toMatch(/antCard/);
  });
});

// Air India fleet build (2026-10-09): rows and cards made without dynamic height scrolled inside or clipped their
// content once their children grew; and a slot_name "body" on FlexContainer children was refused, costing a repair.
describe('FlexContainer create defaults and slots', () => {
  it('creates a FlexContainer with dynamic height on unless the author sets it', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    await client.createComponents({
      appId: 'app1', versionId: 'v1', pageId: 'p1',
      components: [
        { name: 'row', type: 'FlexContainer', properties: { direction: { value: 'row' } }, layout: rect(0, 200) },
        { name: 'fixed', type: 'FlexContainer', properties: { dynamicHeight: { value: '{{false}}' } }, layout: rect(220, 200) },
      ],
    });
    const created = Object.values(bodies(auth, 'POST')[0]!.diff) as Array<{ name: string; properties: Record<string, unknown> }>;
    const byName = Object.fromEntries(created.map((c) => [c.name, c]));
    expect(byName.row!.properties.dynamicHeight).toEqual({ value: '{{true}}' });
    expect(byName.fixed!.properties.dynamicHeight).toEqual({ value: '{{false}}' });
  });

  it('accepts slot_name "body" for a FlexContainer child and still refuses a header slot there', async () => {
    const { lintComponentSlots } = await import('../src/lint.js');
    const child = (slotName: string) => lintComponentSlots([
      { clientRef: 'p', name: 'p', type: 'FlexContainer' },
      { clientRef: 'c', name: 'c', type: 'Text', parentRef: 'p', slotName },
    ] as never);
    expect(child('body')).toEqual([]);
    expect(child('header').join(' ')).toMatch(/header/);
  });
});
