import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAppPlansForTests } from '../src/appPlanStore.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';
import { sectionAsRead } from '../src/pageReplaceInPlace.js';

// apply_app_phase replacing a page writes the difference: a component the plan leaves as it is is not written, one
// that moved gets a layout update, one that changed is created again under its own id. The fake stores what is sent
// and reads it back merged over the widget defaults, as ToolJet does.
type Stored = { id: string; name: string; type: string; properties?: any; styles?: any; validation?: any; others?: any; parent?: string; layouts: any };
type State = { pages: Array<{ id: string; name: string; handle: string; components: Stored[] }>; queries: any[]; events: any[]; failing?: string[] };
const SECTIONS = ['properties', 'styles', 'validation', 'others'] as const;

function fakeApp(state: State) {
  let seq = 0;
  return {
    getAppSummary: vi.fn(async () => {
      const copy = JSON.parse(JSON.stringify(state)) as State;
      return { app_id: 'app1', version_id: 'v1', name: 'App', queries: copy.queries, events: copy.events,
        pages: copy.pages.map((page) => ({ icon: 'IconFile', ...page, components: page.components.map((c) => ({ ...c,
          ...Object.fromEntries(SECTIONS.map((section) => [section, sectionAsRead(c.type, section, c[section])])) })) })) };
    }),
    listDatasources: vi.fn(async () => [{ id: 'ds-tjdb', name: 'tooljetdbdefault', kind: 'tooljetdb' }, { id: 'ds-js', name: 'runjsdefault', kind: 'runjs' }]),
    listTables: vi.fn(async () => [{ id: 'tbl-1', table_name: 'orders' }]),
    getTableSchema: vi.fn(async () => [{ name: 'id', type: 'integer' }, { name: 'status', type: 'character varying' }]),
    getQueries: vi.fn(async () => state.queries.map((q) => ({ ...q }))),
    getDevelopmentEnvironmentId: vi.fn(async () => 'env-dev'),
    runQuery: vi.fn(async ({ queryId }: { queryId: string }) => (state.failing?.includes(queryId)
      ? { status: 'failed', message: 'relation does not exist' } : { status: 'ok', data: [{ id: 1 }] })),
    createPages: vi.fn(async ({ pages }: { pages: Array<{ name: string }> }) => pages.map((p, index) => {
      const id = `np${++seq}`; state.pages.push({ id, name: p.name, handle: p.name.toLowerCase(), components: [] }); return { page_id: id, name: p.name, index };
    })),
    updatePages: vi.fn(async () => undefined),
    createQueries: vi.fn(async ({ queries }: { queries: Array<{ name: string; dataSourceId?: string; options?: any; kind?: string }> }) => queries.map((q) => {
      const id = `nq${++seq}`;
      state.queries.push({ id, name: q.name, kind: q.dataSourceId === 'ds-js' ? 'runjs' : 'tooljetdb', data_source_id: q.dataSourceId, options: q.options ?? {} });
      return { query_id: id, name: q.name };
    })),
    deleteEvent: vi.fn(async ({ eventId }: { eventId: string }) => { state.events = state.events.filter((e) => e.id !== eventId); return { deleted: true }; }),
    deleteComponents: vi.fn(async ({ pageId, componentIds }: { pageId: string; componentIds: string[] }) => {
      const page = state.pages.find((p) => p.id === pageId)!;
      page.components = page.components.filter((c) => !componentIds.includes(c.id)); return { deleted: componentIds.length };
    }),
    createComponents: vi.fn(async ({ pageId, components }: { pageId: string; components: any[] }) => components.map((c) => {
      const id = c.id ?? `nc${++seq}`;
      const rect = (res: 'desktop' | 'mobile') => c.layouts?.[res] ?? c.layout;
      state.pages.find((p) => p.id === pageId)!.components.push({ id, name: c.name, type: c.type, properties: c.properties, styles: c.styles ?? {},
        validation: c.validation ?? {}, others: c.others ?? {}, ...(c.parent ? { parent: c.parent } : {}), layouts: { desktop: rect('desktop'), mobile: rect('mobile') } });
      return { component_id: id, name: c.name };
    })),
    updateLayouts: vi.fn(async ({ layouts }: { layouts: Array<{ componentId: string; desktop?: unknown; mobile?: unknown }> }) => {
      for (const l of layouts) {
        const c = state.pages.flatMap((p) => p.components).find((x) => x.id === l.componentId)!;
        c.layouts = { desktop: l.desktop ?? c.layouts.desktop, mobile: l.mobile ?? c.layouts.mobile };
      }
      return { updated: layouts.length };
    }),
    createEvents: vi.fn(async ({ events }: { events: any[] }) => {
      for (const e of events) state.events.push({ id: `ne${++seq}`, target: e.sourceType, sourceId: e.sourceId, event: { eventId: e.trigger, ...e.action } });
      return { created: events.length };
    }),
    updateEvents: vi.fn(async () => ({ updated: 0 })),
  };
}

const text = (result: { content: Array<{ text?: string }> }) => String(result.content[0]!.text);
const at = (top: number, height = 40, width = 20) => ({ top, left: 1, width, height });
async function applyWhole(client: ReturnType<typeof fakeApp>, spec: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const linted = JSON.parse(text(await lintAppSpecTool(client as never).handler({ app_id: 'app1', version_id: 'v1', ...spec } as never)));
  expect(linted.plan_token, JSON.stringify(linted.errors)).toEqual(expect.any(String));
  const applied = await applyAppPhaseTool(client as never).handler({ app_id: 'app1', version_id: 'v1', plan_token: linted.plan_token, ...extra } as never);
  expect(applied.isError, text(applied)).toBeFalsy();
  return JSON.parse(text(applied)) as { applied: Record<string, number>; read_check?: any };
}
const applyPlan = async (client: ReturnType<typeof fakeApp>, spec: Record<string, unknown>) => (await applyWhole(client, spec)).applied;
const page = (components: unknown[], replace = false) => ({ pages: [{ name: 'Orders', icon: 'IconBox', ...(replace ? { replace: true } : {}), components }] });
const V1 = [
  { name: 'title', type: 'Text', properties: { text: 'Orders' }, layout: at(10) },
  { name: 'refresh', type: 'Button', properties: { text: 'Refresh' }, layout: at(60, 40, 8) },
  { name: 'old', type: 'Text', properties: { text: 'Going away' }, layout: at(110) },
];

describe('apply_app_phase replacing a page in place', () => {
  beforeEach(() => clearAppPlansForTests());

  it('writes only what the plan changes, and keeps every surviving component’s id', async () => {
    const state: State = { pages: [], queries: [], events: [] };
    const client = fakeApp(state);
    await applyPlan(client, page(V1));
    const idOf = (name: string) => state.pages[0]!.components.find((c) => c.name === name)!.id;
    const before = { title: idOf('title'), refresh: idOf('refresh'), old: idOf('old') };
    // Another page's event that holds the title's id.
    state.events.push({ id: 'e9', target: 'component', sourceId: 'elsewhere', event: { eventId: 'onClick', actionId: 'control-component', componentId: before.title } });
    for (const mock of [client.createComponents, client.deleteComponents, client.updateLayouts, client.updateEvents]) mock.mockClear();

    const applied = await applyPlan(client, page([
      { name: 'title', type: 'Text', properties: { text: 'Orders today' }, layout: at(10) },          // changed
      { name: 'count', type: 'Text', properties: { text: '12 open' }, layout: at(60) },                // new
      { name: 'refresh', type: 'Button', properties: { text: 'Refresh' }, layout: at(110, 40, 8) },    // moved
    ], true));

    expect(client.deleteComponents).toHaveBeenCalledTimes(1);
    expect(client.deleteComponents.mock.calls[0]![0].componentIds.sort()).toEqual([before.old, before.title].sort());
    expect(client.createComponents).toHaveBeenCalledTimes(1);
    expect(client.createComponents.mock.calls[0]![0].components.map((c: any) => c.name).sort()).toEqual(['count', 'title']);
    expect(client.updateLayouts).toHaveBeenCalledTimes(1);
    expect(client.updateLayouts.mock.calls[0]![0].layouts.map((l: any) => l.componentId)).toEqual([before.refresh]);
    expect(idOf('title')).toBe(before.title);
    expect(idOf('refresh')).toBe(before.refresh);
    expect(state.pages[0]!.components.map((c) => c.name).sort()).toEqual(['count', 'refresh', 'title']);
    expect(state.pages[0]!.components.find((c) => c.name === 'title')!.properties.text.value).toBe('Orders today');
    expect(applied).toMatchObject({ components: 2, components_removed: 2, components_moved: 1, components_kept: 0 });
    // The title kept its id, so the other page's event needed no re-pointing.
    expect(client.updateEvents).not.toHaveBeenCalled();
    expect(state.events.find((e) => e.id === 'e9')!.event.componentId).toBe(before.title);
  });

  it('writes no component when the plan matches the page', async () => {
    const state: State = { pages: [], queries: [], events: [] };
    const client = fakeApp(state);
    await applyPlan(client, page(V1));
    for (const mock of [client.createComponents, client.deleteComponents, client.updateLayouts]) mock.mockClear();
    const applied = await applyPlan(client, page(V1, true));
    expect(client.deleteComponents).not.toHaveBeenCalled();
    expect(client.createComponents).not.toHaveBeenCalled();
    expect(client.updateLayouts).not.toHaveBeenCalled();
    expect(applied).toMatchObject({ components: 0, components_removed: 0, components_kept: 3 });
  });
});

describe('apply_app_phase checks the reads it wrote', () => {
  beforeEach(() => clearAppPlansForTests());
  const withQueries = {
    ...page([{ name: 'count', type: 'Text', properties: { text: '{{queries.summary.data ?? 0}} orders' }, layout: at(10) }]),
    queries: [
      { name: 'orders', datasource_name: 'tooljetdbdefault', table_ref: 'orders', options: { operation: 'list_rows', list_rows: { limit: 50 }, runOnPageLoad: true } },
      { name: 'summary', datasource_name: 'runjsdefault', options: { code: 'return (queries.orders.data || []).length' } },
    ],
    lifecycles: [{ query_ref: 'orders', refresh_query_refs: ['summary'] }],
  };

  it('runs the proven reads, names the ones that fail, and never runs RunJS', async () => {
    const state: State = { pages: [], queries: [], events: [] };
    const client = fakeApp(state);
    const result = await applyWhole(client, withQueries);
    expect(client.runQuery).toHaveBeenCalledTimes(1);
    expect(result.read_check).toMatchObject({ ran: 1, rows: { orders: 1 }, failed: [] });
    expect(result.read_check.not_run.map((q: any) => q.name)).toEqual(['summary']);
  });

  it('reports a failing read without failing the phase', async () => {
    const state: State = { pages: [], queries: [], events: [], failing: ['nq2'] };
    const client = fakeApp(state);
    const result = await applyWhole(client, withQueries);
    expect(state.queries.find((q) => q.name === 'orders')!.id).toBe('nq2');
    expect(result.read_check.failed).toEqual([expect.objectContaining({ name: 'orders', message: 'relation does not exist' })]);
    expect(result.applied.components).toBe(1);
  });

  it('skips the check when asked', async () => {
    const state: State = { pages: [], queries: [], events: [] };
    const client = fakeApp(state);
    const result = await applyWhole(client, withQueries, { check_reads: false });
    expect(client.runQuery).not.toHaveBeenCalled();
    expect(result.read_check).toBeUndefined();
  });
});
