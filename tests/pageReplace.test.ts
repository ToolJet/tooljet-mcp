import { beforeEach, describe, expect, it, vi } from 'vitest';
import { danglingAfterReplace, mentionsId, replaceFingerprint, replaceIds, replaceView } from '../src/pageReplace.js';
import { clearAppPlansForTests, storeAppPlan } from '../src/appPlanStore.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';

// A plan page marked replace: the app as the new plan should see it. The page's components and their events go
// (the plan recreates them); queries the plan defines again are updated in place, so their ids, which other pages'
// events hold, stay.
const summary = {
  app_id: 'a', version_id: 'v',
  pages: [
    { id: 'p1', name: 'Products', handle: 'products', components: [{ id: 'c1', name: 'table1', type: 'Table' }, { id: 'c2', name: 'save', type: 'Button' }] },
    { id: 'p2', name: 'Alerts', handle: 'alerts', components: [{ id: 'c3', name: 'risk', type: 'Table' }] },
  ],
  queries: [
    { id: 'q1', name: 'products', kind: 'tooljetdb', options: {} },
    { id: 'q2', name: 'savePrice', kind: 'tooljetdb', options: {} },
    { id: 'q3', name: 'alerts', kind: 'runjs', options: {} },
  ],
  events: [
    { id: 'e1', target: 'component', sourceId: 'c2', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q2' } },
    { id: 'e2', target: 'page', sourceId: 'p1', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q1' } },
    { id: 'e3', target: 'data_query', sourceId: 'q2', event: { eventId: 'onDataQuerySuccess', actionId: 'show-alert', message: 'Saved' } },
    { id: 'e4', target: 'data_query', sourceId: 'q2', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q1' } },
    { id: 'e5', target: 'data_query', sourceId: 'q1', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q3' } },
    { id: 'e6', target: 'component', sourceId: 'c3', event: { eventId: 'onRowClicked', actionId: 'run-query', queryId: 'q3' } },
    { id: 'e7', target: 'component', sourceId: 'c3', event: { eventId: 'onRowClicked', actionId: 'control-component', componentId: 'c1', componentSpecificActionHandle: 'setText' } },
  ],
};
const plan = { pages: [{ name: 'Products', replace: true }], queries: [{ name: 'products' }, { name: 'savePrice' }, { name: 'newOne' }] };

describe('replaceView', () => {
  const view = replaceView(summary as never, plan as never)!;
  it('empties the replaced page and drops its components’ and its own events', () => {
    expect(view.summary.pages.find((p) => p.id === 'p1')!.components).toEqual([]);
    expect(view.summary.pages.find((p) => p.id === 'p2')!.components).toHaveLength(1);
    expect(view.componentsToDelete).toEqual([{ pageId: 'p1', componentIds: ['c1', 'c2'] }]);
    expect(view.eventsToDelete).toEqual(expect.arrayContaining(['e1', 'e2']));
    expect(view.eventsToDelete).not.toContain('e6');
  });
  it('updates redefined queries in place and drops the events the plan will recreate for them', () => {
    expect([...view.queriesToUpdate]).toEqual([['products', 'q1'], ['savePrice', 'q2']]);
    // Redefined queries stay in the view under a placeholder name: their names are free for the plan, and every
    // event that runs them by id from another page still resolves.
    expect(view.summary.queries.map((q) => q.name)).toEqual(['products (being replaced)', 'savePrice (being replaced)', 'alerts']);
    expect(view.summary.queries.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    // A run of a plan query is the plan's to recreate; a chain into another page's query stays, and so does an
    // alert the plan does not give that query (another page's plan may have attached it).
    expect(view.eventsToDelete).toContain('e4');
    expect(view.eventsToDelete).not.toContain('e5');
    expect(view.eventsToDelete).not.toContain('e3');
    const withAlert = replaceView(summary as never, { ...plan, lifecycles: [{ query_ref: 'savePrice', success_alert: { message: 'Saved' } }] } as never)!;
    expect(withAlert.eventsToDelete).toContain('e3');
    expect(view.summary.events.map((e) => e.id)).toEqual(['e3', 'e5', 'e6']);
  });
  it('re-points, rather than deletes, an event elsewhere that targets a replaced component', () => {
    expect(view.eventsToDelete).not.toContain('e7');
    expect(view.eventsToRetarget.map((e) => e.id)).toEqual(['e7']);
    expect(view.replacedComponentNames.get('c1')).toBe('table1');
  });
  it('is nothing without a replace page that exists', () => {
    expect(replaceView(summary as never, { pages: [{ name: 'Products' }], queries: [] } as never)).toBeUndefined();
    expect(replaceView(summary as never, { pages: [{ name: 'Missing', replace: true }], queries: [] } as never)).toBeUndefined();
  });
});

// An apply failed after creating its queries but before the page existed. Replacing the page has to reuse those
// queries (update them in place) and create the page, not collide on "App already has a query named".
describe('replace for a page a failed apply never created', () => {
  it('updates the queries that exist and leaves the page to be created', () => {
    const partial = { app_id: 'a', version_id: 'v', events: [],
      pages: [{ id: 'home', name: 'Home', handle: 'home', components: [] }],
      queries: [{ id: 'q1', name: 'products', kind: 'tooljetdb', options: {} }] };
    const view = replaceView(partial as never, { pages: [{ name: 'Products', replace: true }], queries: [{ name: 'products' }, { name: 'fresh' }] } as never)!;
    expect(view).toBeDefined();
    expect([...view.queriesToUpdate]).toEqual([['products', 'q1']]);
    expect(view.componentsToDelete).toEqual([]);
    expect(view.summary.queries.map((q) => q.name)).toEqual(['products (being replaced)']);
  });
});

describe('replace matches the page by name', () => {
  const byName = {
    app_id: 'a', version_id: 'v', queries: [], events: [],
    pages: [
      { id: 'p1', name: 'Dashboard', handle: 'home', components: [{ id: 'c1', name: 'kpi', type: 'Text' }] },
      { id: 'p2', name: 'Home', handle: 'home-2', components: [{ id: 'c2', name: 'hello', type: 'Text' }] },
    ],
  };
  it('replaces only the page named Home when one exists', () => {
    const view = replaceView(byName as never, { pages: [{ name: 'Home', replace: true }] })!;
    expect(view.replacedPageIds).toEqual(['p2']);
    expect(view.componentsToDelete).toEqual([{ pageId: 'p2', componentIds: ['c2'] }]);
  });
  it('falls back to handle home only when no page is named Home', () => {
    const view = replaceView({ ...byName, pages: [byName.pages[0]] } as never, { pages: [{ name: 'Home', replace: true }] })!;
    expect(view.replacedPageIds).toEqual(['p1']);
  });
  it('never takes the handle-home page when the plan names it too', () => {
    const view = replaceView({ ...byName, pages: [byName.pages[0]] } as never,
      { pages: [{ name: 'Home', replace: true }, { name: 'Dashboard' }] });
    expect(view?.replacedPageIds ?? []).toEqual([]);
  });
  it('matches the plan’s page events against the page it stands for', () => {
    const home = { app_id: 'a', version_id: 'v', queries: [{ id: 'q9', name: 'audit' }],
      pages: [{ id: 'p1', name: 'Dashboard', handle: 'home', components: [] }],
      events: [{ id: 'e1', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q9' } }] };
    const view = replaceView(home as never, { pages: [{ name: 'Home', replace: true }],
      events: [{ source_ref: 'Home', source_type: 'page', trigger: 'onPageLoad', action: { actionId: 'run-query', queryId: 'audit' } }] })!;
    expect(view.eventsToDelete).toEqual(['e1']);
  });
});

// A redefined query's chain into a query the page does not define (or a navigate, or a setVar) kept and created
// again would run N+1 times after N replaces.
describe('replace drops the query events the plan recreates', () => {
  const chains = {
    app_id: 'a', version_id: 'v',
    pages: [
      { id: 'p1', name: 'Orders', handle: 'orders', components: [{ id: 'c1', name: 'btn', type: 'Button' }] },
      { id: 'p9', name: 'Other', handle: 'other', components: [] },
    ],
    queries: [{ id: 'q-save', name: 'save' }, { id: 'q-audit', name: 'logAudit' }, { id: 'q-rows', name: 'rows' }],
    events: [
      { id: 'e0', sourceId: 'c1', target: 'component', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q-save' } },
      { id: 'e1', sourceId: 'q-save', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q-audit' } },
      { id: 'e2', sourceId: 'q-save', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'switch-page', pageId: 'p9' } },
      { id: 'e3', sourceId: 'q-save', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'set-custom-variable', key: 'saved', value: '{{true}}' } },
      { id: 'e4', sourceId: 'q-save', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q-rows' } },
      { id: 'e5', sourceId: 'q-save', target: 'data_query', event: { eventId: 'onDataQueryFailure', actionId: 'run-query', queryId: 'q-audit' } },
    ],
  };
  it('deletes a chain, navigate and setVar the plan declares again, and keeps the rest', () => {
    const view = replaceView(chains as never, {
      pages: [{ name: 'Orders', replace: true }], queries: [{ name: 'save' }],
      events: [
        { source_ref: 'save', source_type: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'run-query', queryId: 'logAudit' } },
        { source_ref: 'save', source_type: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'switch-page', target_ref: 'Other' } },
        { source_ref: 'save', source_type: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'set-custom-variable', key: 'saved', value: '{{ true }}' } },
      ],
      lifecycles: [{ query_ref: 'save', refresh_query_refs: ['rows'] }],
    })!;
    expect(view.eventsToDelete.sort()).toEqual(['e0', 'e1', 'e2', 'e3', 'e4']);
    expect(view.summary.events.map((e) => e.id)).toEqual(['e5']);
  });
});

describe('replace keeps page events the plan does not declare again', () => {
  it('drops the page-load run of a redefined query and keeps a redirect guard', () => {
    const guarded = {
      app_id: 'a', version_id: 'v',
      pages: [{ id: 'p1', name: 'Orders', handle: 'orders', components: [{ id: 'c1', name: 't', type: 'Text' }] }, { id: 'p2', name: 'Login', handle: 'login', components: [] }],
      queries: [{ id: 'q1', name: 'rows' }, { id: 'q9', name: 'audit' }],
      events: [
        { id: 'e1', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q1' } },
        { id: 'e2', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad', actionId: 'switch-page', pageId: 'p2', runOnlyIf: '{{!globals.currentUser}}' } },
        { id: 'e3', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q9' } },
      ],
    };
    const view = replaceView(guarded as never, { pages: [{ name: 'Orders', replace: true }], queries: [{ name: 'rows' }],
      events: [{ source_ref: 'Orders', source_type: 'page', trigger: 'onPageLoad', action: { actionId: 'run-query', queryId: 'rows' } }] })!;
    expect(view.eventsToDelete).toEqual(['e1']);
    expect(view.summary.events.map((e) => e.id)).toEqual(['e2', 'e3']);
  });
});

describe('replace redefines only the page’s own queries', () => {
  const twoPages = {
    app_id: 'a', version_id: 'v', events: [],
    pages: [
      { id: 'p1', name: 'Orders', handle: 'orders', components: [{ id: 'c1', name: 'tbl', type: 'Table', properties: { data: { value: '{{queries.rows.data}}' } } }] },
      { id: 'p2', name: 'Reports', handle: 'reports', components: [{ id: 'c2', name: 'chart', type: 'Chart', properties: { data: { value: '{{queries.stats.data}}' } } }] },
    ],
    queries: [{ id: 'q1', name: 'rows' }, { id: 'q2', name: 'stats' }, { id: 'q3', name: 'orphan' }],
  };
  it('keeps another page’s query out of the redefinition, so the name still collides', () => {
    const view = replaceView(twoPages as never, { pages: [{ name: 'Reports', replace: true }], queries: [{ name: 'rows' }, { name: 'stats' }, { name: 'orphan' }] })!;
    expect([...view.queriesToUpdate.keys()].sort()).toEqual(['orphan', 'stats']);
    expect(view.summary.queries.map((q) => q.name)).toContain('rows');
  });
  it('does not claim another page’s query for a page that does not exist yet', () => {
    expect(replaceView(twoPages as never, { pages: [{ name: 'Fresh', replace: true }], queries: [{ name: 'rows' }] })).toBeUndefined();
  });
  it('lint reports the collision, and how to use or change the query instead', async () => {
    const client = { getAppSummary: async () => twoPages, listTables: async () => [], listDatasources: async () => [{ id: 'ds', name: 'runjsdefault', kind: 'runjs' }] };
    const res = await lintAppSpecTool(client as never).handler({ app_id: 'a', version_id: 'v',
      pages: [{ name: 'Reports', replace: true }], queries: [{ name: 'rows', datasource_id: 'ds', options: { code: 'return 1' } }] } as never);
    const errors = JSON.parse(String(res.content[0]!.text)).errors.join(' ');
    expect(errors).toMatch(/already has a query named "rows"/);
    expect(errors).toMatch(/update_query/);
  });
});

// A table reads a RunJS view that reads a list query: redefining the list query with the page must not collide with
// itself. A query read through the page's own queries is its own too, unless another page reaches it.
describe('queries a page reads through its own queries', () => {
  const chained = {
    app_id: 'a', version_id: 'v',
    pages: [
      { id: 'p1', name: 'Panel', handle: 'panel', components: [{ id: 'c1', name: 'budget', type: 'Table', properties: { data: { value: '{{queries.p_summary.data.budgets}}' } } }] },
      { id: 'p2', name: 'Other', handle: 'other', components: [{ id: 'c2', name: 'shared', type: 'Table', properties: { data: { value: '{{queries.shared.data}}' } } }] },
    ],
    queries: [
      { id: 'q1', name: 'p_summary', kind: 'runjs', options: { code: 'return { budgets: queries.p_apps.data, other: queries.shared.data }' } },
      { id: 'q2', name: 'p_apps', kind: 'tooljetdb', options: {} },
      { id: 'q3', name: 'shared', kind: 'tooljetdb', options: {} },
    ],
    events: [],
  };
  it('are updated in place by a replace that redefines them', () => {
    const view = replaceView(chained as never, { pages: [{ name: 'Panel', replace: true }], queries: [{ name: 'p_apps' }, { name: 'shared' }] } as never)!;
    expect([...view.queriesToUpdate]).toEqual([['p_apps', 'q2']]);
  });
});

describe('a query two pages reach through their views', () => {
  const shared = {
    app_id: 'a', version_id: 'v',
    pages: [
      { id: 'p1', name: 'Panel', handle: 'panel', components: [{ id: 'c1', name: 'a', type: 'Table', properties: { data: { value: '{{queries.viewA.data}}' } } }] },
      { id: 'p2', name: 'Other', handle: 'other', components: [{ id: 'c2', name: 'b', type: 'Table', properties: { data: { value: '{{queries.viewB.data}}' } } }] },
    ],
    queries: [
      { id: 'q1', name: 'viewA', kind: 'runjs', options: { code: 'return queries.base.data' } },
      { id: 'q2', name: 'viewB', kind: 'runjs', options: { code: 'return queries.base.data.filter(x => x.open)' } },
      { id: 'q3', name: 'base', kind: 'tooljetdb', options: {} },
    ],
    events: [],
  };
  it('is not updated in place by a replace of one of them', () => {
    const view = replaceView(shared as never, { pages: [{ name: 'Panel', replace: true }], queries: [{ name: 'base' }] } as never)!;
    expect([...view.queriesToUpdate]).toEqual([]);
  });
});

describe('a query the replaced page reads directly and another page reaches', () => {
  const shared = {
    app_id: 'a', version_id: 'v',
    pages: [
      { id: 'p1', name: 'Panel', handle: 'panel', components: [{ id: 'c1', name: 'a', type: 'Table', properties: { data: { value: '{{queries.base.data}}' } } }] },
      { id: 'p2', name: 'Other', handle: 'other', components: [{ id: 'c2', name: 'b', type: 'Table', properties: { data: { value: '{{queries.viewB.data}}' } } }] },
    ],
    queries: [
      { id: 'q2', name: 'viewB', kind: 'runjs', options: { code: 'return queries.base.data.filter(x => x.open)' } },
      { id: 'q3', name: 'base', kind: 'tooljetdb', options: {} },
      { id: 'q4', name: 'mine', kind: 'tooljetdb', options: {} },
    ],
    events: [
      { id: 'e1', target: 'page', sourceId: 'p1', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q4' } },
    ],
  };
  it('is not updated in place, while the page’s own query still is', () => {
    const view = replaceView(shared as never, { pages: [{ name: 'Panel', replace: true }], queries: [{ name: 'base' }, { name: 'mine' }] } as never)!;
    expect([...view.queriesToUpdate]).toEqual([['mine', 'q4']]);
  });
  it('is not updated when the other page reads it directly either', () => {
    const direct = { ...shared, pages: [shared.pages[0], { ...shared.pages[1], components: [{ id: 'c2', name: 'b', type: 'Table', properties: { data: { value: '{{queries.base.data}}' } } }] }] };
    const view = replaceView(direct as never, { pages: [{ name: 'Panel', replace: true }], queries: [{ name: 'base' }, { name: 'mine' }] } as never)!;
    expect([...view.queriesToUpdate]).toEqual([['mine', 'q4']]);
  });
});

describe('a replace that drops a component another page acts on', () => {
  const modal = {
    app_id: 'a', version_id: 'v',
    pages: [
      { id: 'p1', name: 'Orders', handle: 'orders', components: [{ id: 'c-modal', name: 'editModal', type: 'ModalV2' }, { id: 'c-t', name: 'tbl', type: 'Table' }] },
      { id: 'p2', name: 'Home', handle: 'home', components: [{ id: 'c-btn', name: 'openEdit', type: 'Button' }] },
    ],
    queries: [],
    events: [{ id: 'e1', name: 'onClick', sourceId: 'c-btn', target: 'component', event: { eventId: 'onClick', actionId: 'show-modal', modal: 'c-modal' } }],
  };
  it('is a preflight error when the component is dropped', () => {
    const dropped = { pages: [{ name: 'Orders', replace: true, components: [{ name: 'tbl' }] }] };
    const view = replaceView(modal as never, dropped as never)!;
    expect(danglingAfterReplace(modal as never, view, dropped as never).join(' ')).toMatch(/openEdit.*editModal/);
  });
  it('is fine when the component is kept under its name', () => {
    const kept = { pages: [{ name: 'Orders', replace: true, components: [{ name: 'tbl' }, { name: 'editModal' }] }] };
    const view = replaceView(modal as never, kept as never)!;
    expect(danglingAfterReplace(modal as never, view, kept as never)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Through lint_app_spec and apply_app_phase, with a fake ToolJet whose state the write calls change.

const at = (top: number, height = 40, width = 40) => ({ top, left: 1, width, height });

type State = { pages: Array<Record<string, any>>; queries: Array<Record<string, any>>; events: Array<Record<string, any>> };

function fakeApp(state: State) {
  let seq = 0;
  return {
    getAppSummary: vi.fn(async () => {
      const copy = JSON.parse(JSON.stringify(state)) as State;
      return { app_id: 'app1', version_id: 'v1', name: 'App', ...copy, pages: copy.pages.map((page) => ({ icon: 'IconFile', ...page })) };
    }),
    listDatasources: vi.fn(async () => [{ id: 'ds-tjdb', name: 'tooljetdbdefault', kind: 'tooljetdb' }, { id: 'ds-js', name: 'runjsdefault', kind: 'runjs' }]),
    listTables: vi.fn(async () => [{ id: 'tbl-1', table_name: 't' }]),
    getTableSchema: vi.fn(async () => [{ name: 'id', type: 'integer' }, { name: 'site', type: 'character varying' }]),
    createPages: vi.fn(async ({ pages }: { pages: Array<{ name: string }> }) => pages.map((p, index) => {
      const id = `np${++seq}`; state.pages.push({ id, name: p.name, handle: p.name.toLowerCase(), components: [] }); return { page_id: id, name: p.name, index };
    })),
    updatePages: vi.fn(async () => undefined),
    insertRowsBatch: vi.fn(async () => []),
    createTables: vi.fn(async () => []),
    createQueries: vi.fn(async ({ queries }: { queries: Array<{ name: string; dataSourceId?: string; options?: unknown }> }) => queries.map((q) => {
      const id = `nq${++seq}`; state.queries.push({ id, name: q.name, kind: 'runjs', data_source_id: q.dataSourceId, options: q.options ?? {} }); return { query_id: id, name: q.name };
    })),
    updateQuery: vi.fn(async ({ queryId, options }: { queryId: string; options: unknown }) => {
      const q = state.queries.find((x) => x.id === queryId); if (q) q.options = options; return { query_id: queryId };
    }),
    updateQueryDatasource: vi.fn(async ({ queryId, dataSourceId }: { queryId: string; dataSourceId: string }) => {
      const q = state.queries.find((x) => x.id === queryId); if (q) q.data_source_id = dataSourceId;
    }),
    deleteEvent: vi.fn(async ({ eventId }: { eventId: string }) => { state.events = state.events.filter((e) => e.id !== eventId); return { deleted: true }; }),
    deleteComponents: vi.fn(async ({ pageId, componentIds }: { pageId: string; componentIds: string[] }) => {
      const page = state.pages.find((p) => p.id === pageId)!;
      page.components = page.components.filter((c: { id: string }) => !componentIds.includes(c.id)); return { deleted: componentIds.length };
    }),
    createComponents: vi.fn(async ({ pageId, components }: { pageId: string; components: Array<{ name: string; type: string; layout?: unknown }> }) => components.map((c) => {
      const id = `nc${++seq}`; state.pages.find((p) => p.id === pageId)!.components.push({ id, name: c.name, type: c.type, layouts: { desktop: c.layout } });
      return { component_id: id, name: c.name };
    })),
    createEvents: vi.fn(async ({ events }: { events: Array<{ sourceId: string; sourceType: string; trigger: string; action: Record<string, unknown> }> }) => {
      for (const e of events) state.events.push({ id: `ne${++seq}`, target: e.sourceType, sourceId: e.sourceId, event: { eventId: e.trigger, ...e.action } });
      return { created: events.length };
    }),
    updateEvents: vi.fn(async ({ events }: { events: Array<{ eventId: string; event: Record<string, unknown> }> }) => {
      for (const u of events) { const e = state.events.find((x) => x.id === u.eventId); if (e) e.event = u.event; } return { updated: events.length };
    }),
  };
}

const text = (result: { content: Array<{ text?: string }> }) => String(result.content[0]!.text);

async function lint(client: ReturnType<typeof fakeApp>, spec: Record<string, unknown>) {
  const result = await lintAppSpecTool(client as never).handler({ app_id: 'app1', version_id: 'v1', ...spec } as never);
  return JSON.parse(text(result)) as { ok: boolean; errors: string[]; warnings: string[]; plan_token?: string };
}

const apply = (client: ReturnType<typeof fakeApp>, planToken: string) =>
  applyAppPhaseTool(client as never).handler({ app_id: 'app1', version_id: 'v1', plan_token: planToken });

describe('apply_app_phase replacing a page', () => {
  beforeEach(() => clearAppPlansForTests());

  it('deletes the page’s old components and events, updates the redefined query in place, creates the rest, and re-points other pages’ events', async () => {
    const state: State = {
      pages: [
        { id: 'p1', name: 'Products', handle: 'products', components: [
          { id: 'c1', name: 'title', type: 'Text', properties: { text: { value: 'Products' } }, layouts: { desktop: at(10) } },
          { id: 'c2', name: 'refresh', type: 'Button', properties: { text: { value: 'Refresh' } }, layouts: { desktop: at(60, 40, 8) } },
        ] },
        { id: 'p2', name: 'Other', handle: 'other', components: [
          { id: 'c9', name: 'rename', type: 'Button', properties: { text: { value: 'Rename' } }, layouts: { desktop: at(10, 40, 8) } },
        ] },
      ],
      queries: [{ id: 'q1', name: 'rows', kind: 'runjs', data_source_id: 'ds-js', options: { code: 'return [1]' } }],
      events: [
        { id: 'e1', target: 'component', sourceId: 'c2', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q1' } },
        { id: 'e2', target: 'data_query', sourceId: 'q1', event: { eventId: 'onDataQuerySuccess', actionId: 'show-alert', message: 'Loaded' } },
        { id: 'e9', name: 'Rename title', target: 'component', sourceId: 'c9', event: { eventId: 'onClick', actionId: 'control-component', componentId: 'c1', componentSpecificActionHandle: 'setText' } },
      ],
    };
    const client = fakeApp(state);
    const linted = await lint(client, {
      pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [
        { client_ref: 'title', name: 'title', type: 'Text', properties: { text: 'Products v2' }, layout: at(10) },
        { client_ref: 'count', name: 'count', type: 'Text', properties: { text: '{{queries.rows.data.length}} rows' }, layout: at(60) },
        { client_ref: 'refresh', name: 'refresh', type: 'Button', properties: { text: 'Refresh' }, layout: at(110, 40, 8) },
      ] }],
      queries: [
        { client_ref: 'rows', name: 'rows', datasource_name: 'runjsdefault', options: { code: 'return [1, 2]', runOnPageLoad: true } },
        { client_ref: 'more', name: 'more', datasource_name: 'runjsdefault', options: { code: 'return []' } },
      ],
      events: [{ source_ref: 'refresh', source_type: 'component', trigger: 'onClick', action: { actionId: 'run-query', target_ref: 'more' } }],
      lifecycles: [{ query_ref: 'rows', success_alert: { message: 'Loaded' } }],
    });
    expect(linted.plan_token, JSON.stringify(linted.errors)).toEqual(expect.any(String));
    const applied = await apply(client, linted.plan_token!);
    expect(applied.isError, text(applied)).toBeFalsy();
    expect(JSON.parse(text(applied)).applied).toMatchObject({ queries: 1, queries_updated: 1, components: 3, components_removed: 2, events_removed: 2 });
    expect(client.deleteComponents).toHaveBeenCalledWith(expect.objectContaining({ pageId: 'p1', componentIds: ['c1', 'c2'] }));
    expect(client.deleteEvent.mock.calls.map((c) => c[0].eventId).sort()).toEqual(['e1', 'e2']);
    expect(client.updateQuery).toHaveBeenCalledWith(expect.objectContaining({ queryId: 'q1' }));
    expect(client.updateQueryDatasource).not.toHaveBeenCalled();
    expect(client.createQueries.mock.calls.flatMap((c) => c[0].queries.map((q: { name: string }) => q.name))).toEqual(['more']);
    expect(state.pages[0]!.components.map((c) => c.name).sort()).toEqual(['count', 'refresh', 'title']);
    // The other page's button still controls the title: re-pointed to the recreated one, not left dangling.
    const newTitle = state.pages[0]!.components.find((c) => c.name === 'title')!.id;
    expect(state.events.find((e) => e.id === 'e9')!.event).toMatchObject({ componentId: newTitle, componentSpecificActionHandle: 'setText' });
  });

  it('moves a redefined query to its new datasource as well as updating its options', async () => {
    const state: State = {
      pages: [{ id: 'p1', name: 'Products', handle: 'products', components: [{ id: 'c1', name: 'title', type: 'Text', layouts: { desktop: at(10) } }] }],
      queries: [{ id: 'q1', name: 'rows', kind: 'tooljetdb', data_source_id: 'ds-tjdb', options: { operation: 'list_rows', table_id: 'tbl-1', list_rows: {} } }],
      events: [],
    };
    const client = fakeApp(state);
    const linted = await lint(client, {
      pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', properties: { text: '{{queries.rows.data.length}}' }, layout: at(10) }] }],
      queries: [{ name: 'rows', datasource_name: 'runjsdefault', options: { code: 'return [{ a: 1 }]', runOnPageLoad: true } }],
    });
    expect(linted.plan_token, JSON.stringify(linted.errors)).toEqual(expect.any(String));
    const applied = await apply(client, linted.plan_token!);
    expect(applied.isError, text(applied)).toBeFalsy();
    expect(client.updateQueryDatasource).toHaveBeenCalledWith(expect.objectContaining({ queryId: 'q1', dataSourceId: 'ds-js' }));
    expect(client.updateQuery).toHaveBeenCalledWith(expect.objectContaining({ queryId: 'q1' }));
    expect(client.createQueries).not.toHaveBeenCalled();
  });

  it('is refused at lint when it drops a component another page reads, naming both sides', async () => {
    const client = fakeApp({
      queries: [], events: [],
      pages: [
        { id: 'p1', name: 'Products', handle: 'products', components: [{ id: 'c1', name: 'title', type: 'Text' }, { id: 'c2', name: 'tb', type: 'Table' }] },
        { id: 'p2', name: 'Detail', handle: 'detail', components: [{ id: 'c3', name: 'info', type: 'Text', properties: { text: { value: '{{components.tb.selectedRow?.a ?? ""}}' } } }] },
      ],
    });
    const linted = await lint(client, { pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', properties: { text: 'Products' }, layout: at(10) }] }] });
    expect(linted.plan_token).toBeUndefined();
    expect(linted.errors.join(' ')).toMatch(/Detail.*info.*components\.tb.*Products/);
  });

  it('needs app_id', async () => {
    const client = fakeApp({ pages: [], queries: [], events: [] });
    const result = await lintAppSpecTool(client as never).handler({ version_id: 'v1',
      pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', properties: { text: 'x' }, layout: at(10) }] }] } as never);
    expect(text(result)).toMatch(/replace needs app_id/);
  });

  it('is refused before any write when the page changed after lint, and applies once linted again', async () => {
    const state: State = {
      pages: [{ id: 'p1', name: 'Products', handle: 'products', components: [{ id: 'c1', name: 'title', type: 'Text', layouts: { desktop: at(10) } }] }],
      queries: [], events: [],
    };
    const client = fakeApp(state);
    const spec = { pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', properties: { text: 'Products v2' }, layout: at(10) }] }] };
    const first = await lint(client, spec);
    expect(first.plan_token, JSON.stringify(first.errors)).toEqual(expect.any(String));
    // Someone adds a component in the editor between lint and apply: the replace never saw it, so it must not delete it.
    state.pages[0]!.components.push({ id: 'human', name: 'note', type: 'Text', layouts: { desktop: at(60, 40, 10) } });
    const refused = await apply(client, first.plan_token!);
    expect(refused.isError).toBe(true);
    expect(text(refused)).toMatch(/changed since this plan was linted/);
    expect(client.deleteComponents).not.toHaveBeenCalled();
    const second = await lint(client, { pages: [{ ...spec.pages[0], components: [...spec.pages[0]!.components,
      { name: 'note', type: 'Text', properties: { text: 'kept' }, layout: at(60, 40, 10) }] }] });
    const applied = await apply(client, second.plan_token!);
    expect(applied.isError, text(applied)).toBeFalsy();
  });

  it('is refused before any write when the plan was not linted against the page it would empty', async () => {
    const state: State = {
      pages: [{ id: 'p1', name: 'Products', handle: 'products', components: [{ id: 'c1', name: 'title', type: 'Text', layouts: { desktop: at(10) } }] }],
      queries: [], events: [],
    };
    const client = fakeApp(state);
    const { plan_token } = storeAppPlan({ pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', layout: at(10) }] }] } as never,
      { ok: true, errors: [], warnings: [] } as never);
    const refused = await apply(client, plan_token);
    expect(refused.isError).toBe(true);
    expect(text(refused)).toMatch(/refused before any write/);
    expect(client.deleteComponents).not.toHaveBeenCalled();
  });
});

// A replace removes the page's old events and components: every new component is prepared and every event ref
// resolved first, so a plan that cannot apply fails while the page is still whole; a failure after the removal
// says what was removed and how to repair it.
describe('apply of a replace fails safe', () => {
  beforeEach(() => clearAppPlansForTests());
  const replaceState = (): State => ({
    queries: [],
    events: [{ id: 'e9', target: 'component', sourceId: 'c9', event: { eventId: 'onClick', actionId: 'control-component', componentId: 'c1', componentSpecificActionHandle: 'setText' } }],
    pages: [
      { id: 'p1', name: 'Products', handle: 'products', components: [{ id: 'c1', name: 'title', type: 'Text', layouts: { desktop: at(10) } }] },
      { id: 'p2', name: 'Other', handle: 'other', components: [{ id: 'c9', name: 'btn', type: 'Button', layouts: { desktop: at(10) } }] },
    ],
  });
  /** A stored plan bound to the current state, as lint_app_spec stores it, without lint's checks. */
  const applyStored = async (client: ReturnType<typeof fakeApp>, spec: Record<string, unknown>) => {
    const current = await client.getAppSummary();
    const view = replaceView(current as never, spec as never)!;
    const { plan_token } = storeAppPlan(spec as never, { ok: true, errors: [], warnings: [] } as never, replaceFingerprint(current as never, view));
    return apply(client, plan_token);
  };

  it('removes nothing when the new components do not prepare', async () => {
    const state = replaceState();
    const client = fakeApp(state);
    const result = await applyStored(client, { pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Nope', layout: at(10) }] }] });
    expect(result.isError).toBe(true);
    expect(client.deleteComponents).not.toHaveBeenCalled();
    expect(client.deleteEvent).not.toHaveBeenCalled();
    expect(state.pages[0]!.components).toHaveLength(1);
  });

  it('removes nothing when an event names a target the plan does not have', async () => {
    const state = replaceState();
    const client = fakeApp(state);
    const result = await applyStored(client, {
      pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', layout: at(10) }] }],
      events: [{ source_ref: 'title', source_type: 'component', trigger: 'onClick', action: { actionId: 'show-modal', target_ref: 'noSuchModal' } }],
    });
    expect(result.isError).toBe(true);
    expect(client.deleteComponents).not.toHaveBeenCalled();
  });

  it('says what it removed when creating the new components fails, and still re-points to what was created', async () => {
    const state = replaceState();
    const client = fakeApp(state);
    const create = client.createComponents.getMockImplementation()!;
    client.createComponents.mockImplementation(async (args: { pageId: string; components: Array<{ name: string; type: string }> }) => {
      if (args.components.some((c) => c.name === 'boom')) throw new Error('upstream 500');
      return create(args as never);
    });
    const result = await applyStored(client, {
      pages: [
        { name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', layout: at(10) }] },
        { name: 'Other', icon: 'IconBox', components: [{ name: 'boom', type: 'Text', layout: at(100, 40, 10) }] },
      ],
    });
    const message = text(result);
    expect(result.isError).toBe(true);
    expect(message).not.toMatch(/nothing with content on it was auto-deleted/);
    expect(message).toMatch(/already removed the old content of "Products"/);
    expect(message).toMatch(/replace: true/);
    const newTitle = state.pages[0]!.components.find((c) => c.name === 'title')!.id;
    expect(state.events.find((e) => e.id === 'e9')!.event.componentId).toBe(newTitle);
  });
});

// Re-pointing swapped ids one after another, so a new id that contained an old one ("nc2" holds "c2") was rewritten a
// second time and the event pointed at nothing.
describe('re-pointing ids', () => {
  it('swaps whole ids in one pass and reports the ones with no new id', () => {
    const text = JSON.stringify({ componentId: 'c1', runOnlyIf: '{{components["c2"].value}}', other: 'c10' });
    const out = replaceIds(text, new Map([['c1', 'nc2'], ['c2', 'nc4'], ['c9', undefined]]));
    expect(JSON.parse(out.text)).toEqual({ componentId: 'nc2', runOnlyIf: '{{components["nc4"].value}}', other: 'c10' });
    expect(out.missing).toEqual([]);
    expect(replaceIds('{"modal":"c9"}', new Map([['c9', undefined]])).missing).toEqual(['c9']);
  });
  it('matches an id only as a whole token', () => {
    expect(mentionsId('{"componentId":"c10"}', 'c1')).toBe(false);
    expect(mentionsId('{"componentId":"c1"}', 'c1')).toBe(true);
  });
});

describe('apply_app_phase annotations', () => {
  it('are destructive, and the description says what a replace deletes', () => {
    const tool = applyAppPhaseTool({} as never);
    expect(tool.annotations?.destructiveHint).toBe(true);
    expect(tool.description).toMatch(/marked replace/);
  });
});

// The replace precondition: lint records the state the plan was checked against and apply refuses when it differs.
// It recorded only component ids, names and parents, so an ordinary edit (a label, a width, a style) between lint and
// apply left the fingerprint identical and the replace deleted it while calling the page unchanged.
describe('the replace fingerprint covers everything the replace depends on', () => {
  const base = () => ({
    app_id: 'a', version_id: 'v',
    pages: [
      { id: 'p1', name: 'Orders', handle: 'orders', components: [
        { id: 'c1', name: 'title', type: 'Text', properties: { text: { value: 'Original' } }, styles: { textColor: { value: '#111' } },
          layouts: { desktop: { top: 0, left: 0, width: 10, height: 40 } }, others: { showOnMobile: { value: false } } },
        { id: 'c3', name: 'box', type: 'Container', properties: {}, layouts: { desktop: { top: 60, left: 0, width: 20, height: 200 } } },
        { id: 'c2', name: 'qty', type: 'NumberInput', parent: 'c3', properties: { label: { value: 'Qty' } },
          validation: { mandatory: { value: false } }, layouts: { desktop: { top: 10, left: 1, width: 8, height: 40 } } },
      ] },
      { id: 'p2', name: 'Other', handle: 'other', components: [
        { id: 'c9', name: 'rename', type: 'Button', properties: { text: { value: 'Rename' } } },
        { id: 'c8', name: 'elsewhere', type: 'Text', properties: { text: { value: '{{queries.other.data.length}}' } } },
      ] },
    ],
    queries: [
      { id: 'q1', name: 'rows', kind: 'runjs', data_source_id: 'ds-js', options: { code: 'return [1]' } },
      { id: 'q2', name: 'other', kind: 'runjs', data_source_id: 'ds-js', options: { code: 'return [2]' } },
    ],
    events: [
      { id: 'e1', name: 'load', target: 'page', sourceId: 'p1', index: 0, event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q1' } },
      { id: 'e2', target: 'component', sourceId: 'c2', index: 1, event: { eventId: 'onChange', actionId: 'run-query', queryId: 'q1' } },
      { id: 'e3', target: 'data_query', sourceId: 'q1', index: 2, event: { eventId: 'onDataQuerySuccess', actionId: 'show-alert', message: 'Loaded' } },
      { id: 'e9', target: 'component', sourceId: 'c9', index: 3, event: { eventId: 'onClick', actionId: 'control-component', componentId: 'c1', componentSpecificActionHandle: 'setText' } },
      { id: 'e10', target: 'component', sourceId: 'c8', index: 4, event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q2' } },
    ],
  });
  const plan = { pages: [{ name: 'Orders', replace: true, components: [{ name: 'title' }, { name: 'box' }, { name: 'qty' }] }], queries: [{ name: 'rows' }] };
  const fingerprint = (summary: ReturnType<typeof base>) => replaceFingerprint(summary as never, replaceView(summary as never, plan as never)!);
  const before = fingerprint(base());
  type S = ReturnType<typeof base>;
  const comp = (s: S, id: string) => s.pages.flatMap((p) => p.components).find((c) => c.id === id)! as Record<string, any>;
  const query = (s: S, id: string) => s.queries.find((q) => q.id === id)! as Record<string, any>;
  const event = (s: S, id: string) => s.events.find((e) => e.id === id)! as Record<string, any>;

  const detected: Array<[string, (s: S) => void]> = [
    ['component text', (s) => { comp(s, 'c1').properties.text.value = 'Human edit'; }],
    ['component width', (s) => { comp(s, 'c1').layouts.desktop.width = 20; }],
    ['component mobile layout added', (s) => { comp(s, 'c1').layouts.mobile = { top: 0, left: 0, width: 5, height: 40 }; }],
    ['component style', (s) => { comp(s, 'c1').styles.textColor.value = '#f00'; }],
    ['component type', (s) => { comp(s, 'c1').type = 'Html'; }],
    ['component name', (s) => { comp(s, 'c1').name = 'heading'; }],
    ['component others', (s) => { comp(s, 'c1').others.showOnMobile.value = true; }],
    ['component validation', (s) => { comp(s, 'c2').validation.mandatory.value = true; }],
    ['component parent', (s) => { delete comp(s, 'c2').parent; }],
    ['component slot', (s) => { comp(s, 'c2').slot_name = 'header'; }],
    ['component added', (s) => { s.pages[0]!.components.push({ id: 'c4', name: 'note', type: 'Text' } as never); }],
    ['component removed', (s) => { s.pages[0]!.components.splice(0, 1); }],
    ['redefined query options', (s) => { query(s, 'q1').options.code = 'return [1, 2]'; }],
    ['redefined query toggle', (s) => { query(s, 'q1').options.runOnPageLoad = true; }],
    ['redefined query kind', (s) => { query(s, 'q1').kind = 'restapi'; }],
    ['redefined query datasource', (s) => { query(s, 'q1').data_source_id = 'ds-other'; }],
    ['page event', (s) => { event(s, 'e1').event.runOnlyIf = '{{variables.ready}}'; }],
    ['page event name', (s) => { event(s, 'e1').name = 'renamed'; }],
    ['component event', (s) => { event(s, 'e2').event.debounce = 300; }],
    ['redefined query event', (s) => { event(s, 'e3').event.message = 'Done'; }],
    ['another page event acting on a replaced component', (s) => { event(s, 'e9').event.componentSpecificActionHandle = 'clear'; }],
    ['event order', (s) => { event(s, 'e2').index = 7; }],
    ['event added on the page', (s) => { s.events.push({ id: 'e11', target: 'page', sourceId: 'p1', index: 5, event: { eventId: 'onPageLoad', actionId: 'show-alert', message: 'hi' } } as never); }],
    ['event removed from the page', (s) => { s.events.splice(0, 1); }],
  ];
  it.each(detected)('detects a change to the %s', (_label, mutate) => {
    const summary = base();
    mutate(summary);
    expect(fingerprint(summary)).not.toBe(before);
  });

  const ignored: Array<[string, (s: S) => void]> = [
    ['another page\'s component', (s) => { comp(s, 'c8').properties.text.value = 'Edited elsewhere'; }],
    ['a query the plan does not redefine', (s) => { query(s, 'q2').options.code = 'return [3]'; }],
    ['an unrelated event', (s) => { event(s, 'e10').event.debounce = 100; }],
    ['property key order', (s) => { const c = comp(s, 'c1'); c.properties = { ...c.properties }; c.styles = { textColor: c.styles.textColor }; const { styles, ...rest } = c; Object.keys(rest).forEach((k) => delete c[k]); Object.assign(c, { styles }, rest); }],
  ];
  it.each(ignored)('does not change for %s', (_label, mutate) => {
    const summary = base();
    mutate(summary);
    expect(fingerprint(summary)).toBe(before);
  });
});

describe('apply refuses a replace after any edit to what it depends on', () => {
  beforeEach(() => clearAppPlansForTests());
  const initial = (): State => ({
    pages: [
      { id: 'p1', name: 'Products', handle: 'products', components: [
        { id: 'c1', name: 'title', type: 'Text', properties: { text: { value: '{{queries.rows.data.length}}' } }, styles: { textColor: { value: '#111' } }, layouts: { desktop: at(10) } },
        { id: 'c2', name: 'qty', type: 'NumberInput', properties: { label: { value: 'Qty' } }, validation: { mandatory: { value: false } }, layouts: { desktop: at(60) } },
      ] },
    ],
    queries: [{ id: 'q1', name: 'rows', kind: 'runjs', data_source_id: 'ds-js', options: { code: 'return [1]' } }],
    events: [
      { id: 'e1', target: 'page', sourceId: 'p1', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q1' } },
      { id: 'e2', target: 'component', sourceId: 'c2', event: { eventId: 'onChange', actionId: 'run-query', queryId: 'q1' } },
      { id: 'e3', target: 'data_query', sourceId: 'q1', event: { eventId: 'onDataQuerySuccess', actionId: 'show-alert', message: 'Loaded' } },
    ],
  });
  const spec = {
    pages: [{ name: 'Products', icon: 'IconBox', replace: true, components: [
      { name: 'title', type: 'Text', properties: { text: '{{queries.rows.data.length}} rows' }, layout: at(10) },
      { name: 'qty', type: 'NumberInput', properties: { label: 'Qty' }, layout: at(60) },
    ] }],
    queries: [{ name: 'rows', datasource_name: 'runjsdefault', options: { code: 'return [1, 2]' } }],
  };
  const edits: Array<[string, (s: State) => void]> = [
    ['text', (s) => { s.pages[0]!.components[0].properties.text.value = 'Human edit'; }],
    ['width', (s) => { s.pages[0]!.components[0].layouts.desktop.width = 20; }],
    ['style', (s) => { s.pages[0]!.components[0].styles.textColor.value = '#f00'; }],
    ['type', (s) => { s.pages[0]!.components[0].type = 'Html'; }],
    ['validation', (s) => { s.pages[0]!.components[1].validation.mandatory.value = true; }],
    ['query options', (s) => { s.queries[0]!.options.code = 'return [9]'; }],
    ['query datasource', (s) => { s.queries[0]!.data_source_id = 'ds-tjdb'; }],
    ['query kind', (s) => { s.queries[0]!.kind = 'tooljetdb'; }],
    ['page event', (s) => { s.events[0]!.event.runOnlyIf = '{{variables.ready}}'; }],
    ['component event', (s) => { s.events[1]!.event.debounce = 300; }],
    ['query event', (s) => { s.events[2]!.event.message = 'Done'; }],
  ];
  it.each(edits)('refuses before any write after a %s edit', async (_label, edit) => {
    const state = initial();
    const client = fakeApp(state);
    const linted = await lint(client, spec);
    expect(linted.plan_token, JSON.stringify(linted.errors)).toEqual(expect.any(String));
    edit(state);
    const refused = await apply(client, linted.plan_token!);
    expect(refused.isError).toBe(true);
    expect(text(refused)).toMatch(/changed since this plan was linted/);
    for (const write of ['deleteComponents', 'deleteEvent', 'updateQuery', 'updateQueryDatasource', 'createQueries', 'createComponents', 'createEvents'] as const) {
      expect(client[write], write).not.toHaveBeenCalled();
    }
  });
  it('applies when nothing changed', async () => {
    const client = fakeApp(initial());
    const linted = await lint(client, spec);
    const applied = await apply(client, linted.plan_token!);
    expect(applied.isError, text(applied)).toBeFalsy();
  });
});

// Queries were updated (and tables, pages and seed rows written) before the page's components were prepared and its
// event refs resolved, so a plan whose components could not be built still rewrote the page's queries.
describe('apply prepares the whole phase before its first write', () => {
  beforeEach(() => clearAppPlansForTests());
  const state = (): State => ({
    pages: [{ id: 'p1', name: 'Products', handle: 'products', components: [
      { id: 'c1', name: 'title', type: 'Text', properties: { text: { value: '{{queries.rows.data.length}}' } }, layouts: { desktop: at(10) } },
    ] }],
    queries: [{ id: 'q1', name: 'rows', kind: 'runjs', data_source_id: 'ds-js', options: { code: 'return [1]' } }],
    events: [],
  });
  const applyStored = async (client: ReturnType<typeof fakeApp>, spec: Record<string, unknown>) => {
    const current = await client.getAppSummary();
    const view = replaceView(current as never, spec as never)!;
    const { plan_token } = storeAppPlan(spec as never, { ok: true, errors: [], warnings: [] } as never, replaceFingerprint(current as never, view));
    return apply(client, plan_token);
  };
  const phase = (extra: Record<string, unknown>) => ({
    app_name: 'Renamed',
    tables: [{ table_name: 'extra', columns: [{ name: 'label', type: 'varchar' }] }],
    queries: [
      { name: 'rows', datasource_id: 'ds-js', options: { code: 'return [1, 2]' } },
      { name: 'fresh', datasource_id: 'ds-js', options: { code: 'return []' } },
    ],
    pages: [
      { name: 'Products', icon: 'IconBox', replace: true, components: [{ name: 'title', type: 'Text', layout: at(10) }] },
      { name: 'Added', icon: 'IconBox', components: [{ name: 'hello', type: 'Text', layout: at(10) }] },
    ],
    ...extra,
  });
  const expectNoWrites = (client: ReturnType<typeof fakeApp> & { renameApp?: unknown }) => {
    for (const write of ['createTables', 'createPages', 'updatePages', 'insertRowsBatch', 'updateQuery', 'updateQueryDatasource',
      'createQueries', 'deleteEvent', 'deleteComponents', 'createComponents', 'createEvents'] as const) {
      expect(client[write], write).not.toHaveBeenCalled();
    }
  };
  const withRename = (client: ReturnType<typeof fakeApp>) => Object.assign(client, { renameApp: vi.fn(async () => undefined) });

  it('writes nothing when a component does not prepare', async () => {
    const client = withRename(fakeApp(state()));
    const spec = phase({});
    (spec.pages as Array<Record<string, any>>)[1]!.components = [{ name: 'hello', type: 'Nope', layout: at(10) }];
    const result = await applyStored(client, spec);
    expect(result.isError).toBe(true);
    expect(client.renameApp).not.toHaveBeenCalled();
    expectNoWrites(client);
  });

  it('writes nothing when an event names a target the plan does not have', async () => {
    const client = withRename(fakeApp(state()));
    const result = await applyStored(client, phase({
      events: [{ source_ref: 'hello', source_type: 'component', trigger: 'onClick', action: { actionId: 'show-modal', target_ref: 'noSuchModal' } }],
    }));
    expect(result.isError).toBe(true);
    expect(client.renameApp).not.toHaveBeenCalled();
    expectNoWrites(client);
  });

  it('writes nothing when a lifecycle names a query the plan does not have', async () => {
    const client = withRename(fakeApp(state()));
    const result = await applyStored(client, phase({ lifecycles: [{ query_ref: 'rows', refresh_query_refs: ['missing'] }] }));
    expect(result.isError).toBe(true);
    expectNoWrites(client);
  });

  it('still resolves events on pages, queries and components the phase creates', async () => {
    const client = withRename(fakeApp(state()));
    const result = await applyStored(client, phase({
      events: [
        { source_ref: 'hello', source_type: 'component', trigger: 'onClick', action: { actionId: 'run-query', target_ref: 'fresh' } },
        { source_ref: 'Added', source_type: 'page', trigger: 'onPageLoad', action: { actionId: 'run-query', target_ref: 'rows' } },
        { source_ref: 'fresh', source_type: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'switch-page', target_ref: 'Added' } },
      ],
    }));
    expect(result.isError, text(result)).toBeFalsy();
    expect(client.createEvents).toHaveBeenCalledOnce();
  });
});

describe('apply_app_phase says a replace is not atomic', () => {
  it('and that it belongs on a draft or recoverable page', () => {
    const description = applyAppPhaseTool({} as never).description;
    expect(description).toMatch(/not atomic/i);
    expect(description).toMatch(/draft|recoverable/i);
  });
});
