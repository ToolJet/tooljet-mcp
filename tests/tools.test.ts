import { describe, it, expect, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { createAppTool } from '../src/tools/createApp.js';
import { listDatasourcesTool } from '../src/tools/listDatasources.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { getAppTool } from '../src/tools/getApp.js';
import { getAppSummaryTool } from '../src/tools/getAppSummary.js';
import { addQueryTool } from '../src/tools/addQuery.js';
import { addComponentTool } from '../src/tools/addComponent.js';
import { addEventsTool } from '../src/tools/addEvents.js';
import { addPageTool } from '../src/tools/addPage.js';
import { validateAppTool } from '../src/tools/validateApp.js';
import { runQueryTool } from '../src/tools/runQuery.js';
import { getCatalog } from '../src/catalog.js';

function makeClient(): { [K in keyof ToolJetClient]: ReturnType<typeof vi.fn> } {
  return {
    createApp: vi.fn(),
    getApp: vi.fn(),
    getAppSummary: vi.fn(),
    getDevelopmentEnvironmentId: vi.fn(),
    listDatasources: vi.fn(),
    createQuery: vi.fn(),
    createComponent: vi.fn(),
    createComponents: vi.fn(),
    createEvents: vi.fn(),
    createPage: vi.fn(),
    getQuery: vi.fn(),
    runQuery: vi.fn(),
  };
}

function textOf(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe('create_app tool', () => {
  it('calls client.createApp with the name and returns the result as text', async () => {
    const client = makeClient();
    const created = {
      app_id: 'app1',
      version_id: 'v1',
      home_page_id: 'p1',
      app_url: 'http://localhost:8082/apps/app1',
    };
    client.createApp.mockResolvedValue(created);

    const tool = createAppTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ name: 'My App' });

    expect(client.createApp).toHaveBeenCalledWith('My App');
    expect(textOf(result)).toEqual(created);
    expect(result.isError).toBeUndefined();
  });

  it('returns isError with an Error: message when the client throws', async () => {
    const client = makeClient();
    client.createApp.mockRejectedValue(new Error('boom'));

    const tool = createAppTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ name: 'My App' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Error:');
    expect(result.content[0]!.text).toContain('boom');
  });
});

describe('list_datasources tool', () => {
  it('calls client.listDatasources with version_id and returns the result', async () => {
    const client = makeClient();
    const datasources = [{ id: 'ds1', name: 'ToolJet DB', kind: 'tooljetdb' }];
    client.listDatasources.mockResolvedValue(datasources);

    const tool = listDatasourcesTool(client as unknown as ToolJetClient);
    expect(tool.description).toMatch(/workspace-connected.*newly created apps.*no per-app attach\/link step/is);
    const result = await tool.handler({ version_id: 'v1' });

    expect(client.listDatasources).toHaveBeenCalledWith('v1');
    expect(textOf(result)).toEqual(datasources);
  });

  it('returns isError on client failure', async () => {
    const client = makeClient();
    client.listDatasources.mockRejectedValue(new Error('nope'));

    const tool = listDatasourcesTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ version_id: 'v1' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Error:');
  });
});

describe('run_query tool', () => {
  it('warns when a successful browser-free run cannot resolve component-bound options', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({
      id: 'q1',
      options: {
        operation: 'list_rows',
        list_rows: { limit: '{{components.ordersTable.serverSideRowsPerPage || 10}}' },
      },
    });
    client.runQuery.mockResolvedValue({ status: 'ok', data: [{ id: 1 }] });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'q1',
      version_id: 'v1',
    });

    expect(client.getQuery).toHaveBeenCalledWith('q1', 'v1');
    expect(textOf(result)).toMatchObject({
      status: 'ok',
      warnings: [expect.stringMatching(/components\.\*.*viewer/i)],
    });
  });

  it('does not add warnings to a static query result', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({ id: 'q1', options: { mode: 'sql', query: 'select 1' } });
    client.runQuery.mockResolvedValue({ status: 'ok', data: [{ '?column?': 1 }] });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'q1',
      version_id: 'v1',
    });

    expect(textOf(result)).toEqual({ status: 'ok', data: [{ '?column?': 1 }] });
  });
});

describe('get_component_catalog tool', () => {
  it('returns the real catalog', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = await tool.handler({});

    expect(textOf(result)).toEqual(getCatalog());
    expect(result.isError).toBeUndefined();
  });

  it('batches distinct component types and returns only requested catalog sections', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      types: ['Table', 'Chart', 'Table', 'NotAComponent'],
      sections: ['overview', 'events'],
    });

    const body = textOf(result) as any;
    expect(body.components.map((component: any) => component.type)).toEqual(['Table', 'Chart']);
    expect(body.components[0]).toHaveProperty('events');
    expect(body.components[0]).not.toHaveProperty('properties');
    expect(body.unknown_types).toEqual(['NotAComponent']);
  });

  it('can narrow property/style arrays for one component contract', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      type: 'Table',
      sections: ['properties', 'styles'],
      property_keys: ['data'],
      style_keys: ['borderRadius'],
    });

    const body = textOf(result) as any;
    expect(body.type).toBe('Table');
    expect(body.properties.map((property: any) => property.key)).toEqual(['data']);
    expect(body.styles.every((style: any) => style.key === 'borderRadius')).toBe(true);
    expect(body).not.toHaveProperty('events');
  });

  it('returns only nested Table authoring hints when requested', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ type: 'Table', sections: ['authoringHints'] });

    const body = textOf(result) as any;
    expect(body.authoringHints.rowActionButtons.columnExample.columnType).toBe('button');
    expect(body.authoringHints.rowActionButtons.eventExample.ref).toBe('actions::view-action');
    expect(body).not.toHaveProperty('properties');
    expect(body).not.toHaveProperty('actions');
  });
});

describe('add_events tool', () => {
  it('passes Table Button-column target and compound ref to the client', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [{
        id: 'tbl1',
        name: 'orders',
        type: 'Table',
        properties: { columns: { value: [{ key: 'actions', name: 'Actions', columnType: 'button', buttons: [{ id: 'view-action' }] }] } },
      }] }],
      queries: [{ id: 'q1', name: 'viewOrder' }],
      events: [],
    });
    client.createEvents.mockResolvedValue({ created: 1 });
    const tool = addEventsTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [
        {
          source_id: 'tbl1',
          source_type: 'table_column',
          ref: 'actions::view-action',
          trigger: 'onClick',
          action: { actionId: 'run-query', queryId: 'q1', queryName: 'viewOrder' },
        },
      ],
    });

    expect(client.createEvents).toHaveBeenCalledWith({
      appId: 'app1',
      versionId: 'v1',
      events: [
        {
          sourceId: 'tbl1',
          sourceType: 'table_column',
          ref: 'actions::view-action',
          trigger: 'onClick',
          action: { actionId: 'run-query', queryId: 'q1', queryName: 'viewOrder' },
        },
      ],
    });
    expect(textOf(result)).toEqual({ created: 1, warnings: [] });
  });
});

describe('add_page tool', () => {
  it('requires a sidebar icon and passes it to the client', async () => {
    const client = makeClient();
    client.createPage.mockResolvedValue({ page_id: 'p2', name: 'Customers' });
    const tool = addPageTool(client as unknown as ToolJetClient);

    expect(tool.inputSchema.icon.safeParse(undefined).success).toBe(false);
    expect(tool.inputSchema.icon.safeParse('IconUsers').success).toBe(true);

    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      name: 'Customers',
      icon: 'IconUsers',
    });
    expect(client.createPage).toHaveBeenCalledWith({
      appId: 'app1',
      versionId: 'v1',
      name: 'Customers',
      icon: 'IconUsers',
    });
    expect(textOf(result)).toEqual({ page_id: 'p2', name: 'Customers' });
  });
});

describe('get_app_summary tool', () => {
  const summary = {
    app_id: 'app1',
    name: 'Operations',
    version_id: 'v1',
    pages: [
      {
        id: 'p1',
        name: 'Home',
        handle: 'home',
        icon: 'IconLayoutDashboard',
        components: [
          {
            id: 'c1',
            name: 'ordersTable',
            type: 'Table',
            layouts: { desktop: { top: 10, left: 2, width: 40, height: 300 } },
            properties: {
              data: { value: '{{queries.listOrders.data}}' },
              columns: { value: [{ key: 'id' }, { key: 'status' }] },
            },
            styles: { borderRadius: { value: 8 } },
          },
          {
            id: 'c2',
            name: 'title',
            type: 'Text',
            layouts: { desktop: { top: 0, left: 2, width: 20, height: 4 } },
            properties: { text: { value: 'Orders' } },
          },
        ],
      },
    ],
    queries: [
      {
        id: 'q1',
        name: 'listOrders',
        kind: 'tooljetdb',
        data_source_id: 'ds1',
        options: { operation: 'list_rows', table_id: 'orders' },
      },
    ],
    events: [
      {
        id: 'e1',
        name: 'refresh',
        sourceId: 'c1',
        target: 'component',
        event: { eventId: 'onPageChanged', actionId: 'run-query' },
      },
    ],
  };

  it('defaults to a bounded structural summary', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue(summary);
    const tool = getAppSummaryTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ app_id: 'app1' });

    const body = textOf(result) as any;
    expect(body.pages[0].components[0]).toEqual({
      id: 'c1',
      name: 'ordersTable',
      type: 'Table',
      layouts: { desktop: { top: 10, left: 2, width: 40, height: 300 } },
    });
    expect(body.queries[0]).not.toHaveProperty('options');
    expect(body.events[0]).not.toHaveProperty('event');
  });

  it('filters sections/entities and returns exact dotted value paths', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue(summary);
    const tool = getAppSummaryTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      sections: ['pages'],
      page_names: ['Home'],
      component_types: ['Table'],
      app_fields: ['app_id'],
      page_fields: ['id', 'name'],
      component_fields: ['id', 'name', 'properties.data.value', 'styles.borderRadius.value'],
    });

    expect(textOf(result)).toEqual({
      app_id: 'app1',
      pages: [
        {
          id: 'p1',
          name: 'Home',
          components: [
            {
              id: 'c1',
              name: 'ordersTable',
              properties: { data: { value: '{{queries.listOrders.data}}' } },
              styles: { borderRadius: { value: 8 } },
            },
          ],
        },
      ],
    });
  });

  it('rejects unknown or unsafe field paths', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue(summary);
    const tool = getAppSummaryTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      component_fields: ['properties.__proto__.polluted'],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/invalid path/i);
  });
});

describe('get_app tool', () => {
  it('calls client.getApp with app_id and returns the result', async () => {
    const client = makeClient();
    const app = { id: 'app1', name: 'My App' };
    client.getApp.mockResolvedValue(app);

    const tool = getAppTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ app_id: 'app1' });

    expect(client.getApp).toHaveBeenCalledWith('app1');
    expect(textOf(result)).toEqual(app);
  });

  it('returns isError on client failure', async () => {
    const client = makeClient();
    client.getApp.mockRejectedValue(new Error('not found'));

    const tool = getAppTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ app_id: 'app1' });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Error:');
  });
});

describe('add_query tool', () => {
  it('maps snake_case args to client.createQuery params and returns the result', async () => {
    const client = makeClient();
    const created = { query_id: 'q1', name: 'getUsers' };
    client.listDatasources.mockResolvedValue([{ id: 'ds1', name: 'ToolJet DB', kind: 'tooljetdb' }]);
    client.createQuery.mockResolvedValue(created);

    const tool = addQueryTool(client as unknown as ToolJetClient);
    const options = { operation: 'list_rows', table_id: 'users-id', list_rows: {} };
    const result = await tool.handler({
      version_id: 'v1',
      datasource_id: 'ds1',
      name: 'getUsers',
      options,
    });

    expect(client.createQuery).toHaveBeenCalledWith({
      versionId: 'v1',
      dataSourceId: 'ds1',
      name: 'getUsers',
      options,
      kind: 'tooljetdb',
    });
    expect(textOf(result)).toEqual({
      ...created,
      warnings: [],
      validation: { kind: 'tooljetdb', operation: 'list_rows', schema_found: true },
    });
  });

  it('returns isError on client failure', async () => {
    const client = makeClient();
    client.listDatasources.mockResolvedValue([{ id: 'ds1', name: 'ToolJet DB', kind: 'tooljetdb' }]);
    client.createQuery.mockRejectedValue(new Error('bad query'));

    const tool = addQueryTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      version_id: 'v1',
      datasource_id: 'ds1',
      name: 'getUsers',
      options: { operation: 'list_rows', table_id: 'users-id', list_rows: {} },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Error:');
  });
});

describe('add_component tool', () => {
  it('maps snake_case args to client.createComponent params and returns the result', async () => {
    const client = makeClient();
    const created = { component_id: 'c1' };
    client.createComponent.mockResolvedValue(created);

    const tool = addComponentTool(client as unknown as ToolJetClient);
    // lint-clean Table (rawJson + autogenerateColumns) so no warnings are attached
    const properties = {
      data: { value: '{{queries.getUsers.data}}' },
      dataSourceSelector: { value: 'rawJson' },
      autogenerateColumns: { value: true },
    };
    const layout = { top: 0, left: 0, width: 10, height: 5 };
    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      name: 'usersTable',
      type: 'Table',
      properties,
      layout,
    });

    expect(client.createComponent).toHaveBeenCalledWith({
      appId: 'app1',
      versionId: 'v1',
      pageId: 'p1',
      name: 'usersTable',
      type: 'Table',
      properties,
      styles: undefined,
      validation: undefined,
      others: undefined,
      layout,
      layouts: undefined,
    });
    expect(textOf(result)).toEqual({ ...created, warnings: [] });
  });

  it('surfaces lint warnings (and does not block) for a Table bound without rawJson', async () => {
    const client = makeClient();
    client.createComponent.mockResolvedValue({ component_id: 'c1' });
    const tool = addComponentTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      name: 't',
      type: 'Table',
      properties: { data: { value: '{{queries.q.data}}' } },
      layout: { top: 0, left: 0, width: 10, height: 5 },
    });
    expect(client.createComponent).toHaveBeenCalled(); // not blocked
    const out = textOf(result) as { component_id: string; warnings: string[] };
    expect(out.component_id).toBe('c1');
    expect(out.warnings.join(' ')).toMatch(/dataSourceSelector is not "rawJson"/);
  });

  it('BLOCKS (isError) when style keys are under properties', async () => {
    const client = makeClient();
    const tool = addComponentTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      name: 'title',
      type: 'Text',
      properties: { textColor: { value: '#111' } },
      layout: { top: 0, left: 0, width: 10, height: 4 },
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/style keys .* are under `properties`/);
    expect(client.createComponent).not.toHaveBeenCalled();
  });

  it('returns isError on client failure', async () => {
    const client = makeClient();
    client.createComponent.mockRejectedValue(new Error('layout invalid'));

    const tool = addComponentTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      name: 'usersTable',
      type: 'Table',
      properties: {},
      layout: { top: 0, left: 0, width: 10, height: 5 },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Error:');
  });
});

describe('validate_app tool', () => {
  it('fetches the summary and reports structural errors/warnings', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      name: 'App',
      version_id: 'v1',
      pages: [{ id: 'p1', name: 'Home', components: [{ id: 'c1', name: 'chart1', type: 'Chart', properties: { title: { value: 'Sales' } } }] }],
      queries: [],
      events: [{ id: 'e1', name: 'run', sourceId: 'GONE', target: 'component', event: {} }],
    });
    const tool = validateAppTool(client as unknown as ToolJetClient);
    const out = textOf(await tool.handler({ app_id: 'app1' })) as { ok: boolean; errors: string[]; warnings: string[] };
    expect(client.getAppSummary).toHaveBeenCalledWith('app1');
    expect(out.ok).toBe(false); // dangling event source
    expect(out.errors.join(' ')).toMatch(/no longer exists/);
    expect(out.warnings.join(' ')).toMatch(/can clip at dashboard sizes/); // chart title lint
  });
});
