import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAppPlansForTests } from '../src/appPlanStore.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';

// A query two pages read. A plan that restated it, even word for word, was refused ("App already has a query
// named ...", the most frequent plan error of a hundred builds), and a plan could not change it without replacing
// every page that reads it. Restated as it is, the query is simply used; marked update: true, it is updated in place.
type State = { pages: any[]; queries: any[]; events: any[] };
function fakeApp(state: State) {
  let seq = 0;
  return {
    getAppSummary: vi.fn(async () => ({ app_id: 'app1', version_id: 'v1', name: 'App', ...JSON.parse(JSON.stringify(state)),
      pages: state.pages.map((page) => ({ icon: 'IconFile', ...JSON.parse(JSON.stringify(page)) })) })),
    listDatasources: vi.fn(async () => [{ id: 'ds-js', name: 'runjsdefault', kind: 'runjs' }]),
    listTables: vi.fn(async () => []),
    createPages: vi.fn(async ({ pages }: { pages: Array<{ name: string }> }) => pages.map((p, index) => {
      const id = `np${++seq}`; state.pages.push({ id, name: p.name, handle: p.name.toLowerCase(), components: [] }); return { page_id: id, name: p.name, index };
    })),
    updatePages: vi.fn(async () => undefined),
    createQueries: vi.fn(async ({ queries }: { queries: any[] }) => queries.map((q) => {
      const id = `nq${++seq}`; state.queries.push({ id, name: q.name, kind: 'runjs', data_source_id: q.dataSourceId, options: q.options ?? {} }); return { query_id: id, name: q.name };
    })),
    updateQuery: vi.fn(async ({ queryId, options }: { queryId: string; options: unknown }) => {
      const q = state.queries.find((x) => x.id === queryId); if (q) q.options = options; return { query_id: queryId };
    }),
    updateQueryDatasource: vi.fn(async () => undefined),
    getQueries: vi.fn(async () => state.queries.map((q) => ({ ...q }))),
    getDevelopmentEnvironmentId: vi.fn(async () => 'env'),
    runQuery: vi.fn(async () => ({ status: 'ok', data: [] })),
    deleteEvent: vi.fn(async ({ eventId }: { eventId: string }) => { state.events = state.events.filter((e) => e.id !== eventId); return { deleted: true }; }),
    deleteComponents: vi.fn(async ({ pageId, componentIds }: { pageId: string; componentIds: string[] }) => {
      const page = state.pages.find((p) => p.id === pageId)!; page.components = page.components.filter((c: any) => !componentIds.includes(c.id)); return { deleted: componentIds.length };
    }),
    createComponents: vi.fn(async ({ pageId, components }: { pageId: string; components: any[] }) => components.map((c) => {
      const id = c.id ?? `nc${++seq}`;
      state.pages.find((p) => p.id === pageId)!.components.push({ id, name: c.name, type: c.type, properties: c.properties, styles: c.styles ?? {}, layouts: { desktop: c.layout, mobile: c.layout } });
      return { component_id: id, name: c.name };
    })),
    updateLayouts: vi.fn(async ({ layouts }: { layouts: unknown[] }) => ({ updated: layouts.length })),
    createEvents: vi.fn(async ({ events }: { events: any[] }) => {
      for (const e of events) state.events.push({ id: `ne${++seq}`, target: e.sourceType, sourceId: e.sourceId, event: { eventId: e.trigger, ...e.action } });
      return { created: events.length };
    }),
    updateEvents: vi.fn(async () => ({ updated: 0 })),
  };
}
const text = (result: { content: Array<{ text?: string }> }) => String(result.content[0]!.text);
const at = (top: number) => ({ top, left: 1, width: 20, height: 40 });
const lint = async (client: ReturnType<typeof fakeApp>, spec: Record<string, unknown>) =>
  JSON.parse(text(await lintAppSpecTool(client as never).handler({ app_id: 'app1', version_id: 'v1', ...spec } as never))) as { ok: boolean; errors: string[]; warnings: string[]; plan_token?: string };
const apply = async (client: ReturnType<typeof fakeApp>, token: string) => {
  const result = await applyAppPhaseTool(client as never).handler({ app_id: 'app1', version_id: 'v1', plan_token: token } as never);
  expect(result.isError, text(result)).toBeFalsy();
  return JSON.parse(text(result)).applied as Record<string, number>;
};
const ROWS = { name: 'rows', datasource_name: 'runjsdefault', options: { code: 'return [1, 2]', runOnPageLoad: true } };
const productsPage = (title: string, replace = false) => ({ name: 'Products', icon: 'IconBox', ...(replace ? { replace: true } : {}),
  components: [{ name: 'title', type: 'Text', properties: { text: `${title}: {{(queries.rows.data || []).length}}` }, layout: at(10) }] });
const otherPage = { name: 'Other', icon: 'IconBox', components: [{ name: 'count', type: 'Text', properties: { text: '{{(queries.rows.data || []).length}} rows' }, layout: at(10) }] };

async function built() {
  const state: State = { pages: [], queries: [], events: [] };
  const client = fakeApp(state);
  const first = await lint(client, { pages: [productsPage('Products'), otherPage], queries: [ROWS] });
  expect(first.plan_token, JSON.stringify(first.errors)).toEqual(expect.any(String));
  await apply(client, first.plan_token!);
  for (const mock of [client.createQueries, client.updateQuery]) mock.mockClear();
  return { state, client };
}

describe('a query more than one page reads', () => {
  beforeEach(() => clearAppPlansForTests());

  it('restated exactly as the app holds it, is used as it is', async () => {
    const { client } = await built();
    const again = await lint(client, { pages: [productsPage('Catalogue', true)], queries: [ROWS] });
    expect(again.errors).toEqual([]);
    expect(again.plan_token).toEqual(expect.any(String));
    const applied = await apply(client, again.plan_token!);
    expect(client.createQueries).not.toHaveBeenCalled();
    expect(client.updateQuery).not.toHaveBeenCalled();
    expect(applied).toMatchObject({ queries: 0, queries_updated: 0 });
  });

  it('restated differently, is still refused, and the refusal says how to change it for every page', async () => {
    const { client } = await built();
    const changed = await lint(client, { pages: [productsPage('Catalogue', true)], queries: [{ ...ROWS, options: { code: 'return [1, 2, 3]', runOnPageLoad: true } }] });
    expect(changed.ok).toBe(false);
    expect(changed.errors.join(' ')).toMatch(/App already has a query named "rows".*update: true/s);
  });

  it('marked update: true, is updated in place for every page that reads it', async () => {
    const { client, state } = await built();
    const id = state.queries.find((q) => q.name === 'rows')!.id;
    const changed = await lint(client, { pages: [productsPage('Catalogue', true)], queries: [{ ...ROWS, update: true, options: { code: 'return [1, 2, 3]', runOnPageLoad: true } }] });
    expect(changed.errors).toEqual([]);
    expect(changed.warnings.join(' ')).toMatch(/"rows".*"Other"/s);
    const applied = await apply(client, changed.plan_token!);
    expect(client.createQueries).not.toHaveBeenCalled();
    expect(client.updateQuery).toHaveBeenCalledWith(expect.objectContaining({ queryId: id }));
    expect(state.queries.find((q) => q.name === 'rows')!.options.code).toBe('return [1, 2, 3]');
    expect(applied).toMatchObject({ queries: 0, queries_updated: 1 });
  });

  it('update: true on a query the app does not have creates it', async () => {
    const { client } = await built();
    const fresh = await lint(client, { queries: [{ name: 'extra', update: true, datasource_name: 'runjsdefault', options: { code: 'return 1' } }] });
    expect(fresh.errors).toEqual([]);
    const applied = await apply(client, fresh.plan_token!);
    expect(applied).toMatchObject({ queries: 1, queries_updated: 0 });
  });
});
