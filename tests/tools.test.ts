import { describe, it, expect, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { createAppTool } from '../src/tools/createApp.js';
import { listDatasourcesTool } from '../src/tools/listDatasources.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { getAppTool } from '../src/tools/getApp.js';
import { getAppSummaryTool } from '../src/tools/getAppSummary.js';
import { addQueryTool } from '../src/tools/addQuery.js';
import { addComponentTool } from '../src/tools/addComponent.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { addEventsTool } from '../src/tools/addEvents.js';
import { addPageTool } from '../src/tools/addPage.js';
import { validateAppTool } from '../src/tools/validateApp.js';
import { runQueryTool } from '../src/tools/runQuery.js';
import { batchSafeRead, runQueriesTool } from '../src/tools/runQueries.js';
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
    createPages: vi.fn(),
    updatePages: vi.fn(),
    deletePage: vi.fn(),
    listTables: vi.fn(),
    createTable: vi.fn(),
    createTables: vi.fn(),
    addTableColumn: vi.fn(),
    dropTableColumn: vi.fn(),
    dropTable: vi.fn(),
    getTableSchema: vi.fn(),
    insertRows: vi.fn(),
    insertRowsBatch: vi.fn(),
    getQuery: vi.fn(),
    getQueries: vi.fn(),
    runQuery: vi.fn(),
    invokeDatasourceMethod: vi.fn(),
    getComponent: vi.fn(),
    updateComponents: vi.fn(),
    deleteComponents: vi.fn(),
    updateLayouts: vi.fn(),
    updateQuery: vi.fn(),
    updateQueryDatasource: vi.fn(),
    deleteQuery: vi.fn(),
    listEvents: vi.fn(),
    updateEvents: vi.fn(),
    deleteEvent: vi.fn(),
    createQueries: vi.fn(),
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
      editor_url: 'http://localhost:8082/apps/app1',
      viewer_url: 'http://localhost:8082/applications/app1/home?env=development&version=v1',
      datasources_url: 'http://localhost:8082/tooljets-workspace/data-sources',
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
      kind: 'tooljetdb',
      options: {
        operation: 'list_rows',
        list_rows: {
          limit: 25,
          where_filters: { status: { column: 'status', operator: 'eq', value: '{{components.status.value}}' } },
        },
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
    client.getQuery.mockResolvedValue({ id: 'q1', kind: 'postgresql', options: { mode: 'sql', query: 'select 1' } });
    client.runQuery.mockResolvedValue({ status: 'ok', data: [{ '?column?': 1 }] });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'q1',
      version_id: 'v1',
    });

    expect(textOf(result)).toEqual({ status: 'ok', data: [{ '?column?': 1 }] });
  });

  it('returns a user-operated datasource repair link after a runtime connection failure', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({
      id: 'q1', kind: 'postgresql', data_source_id: 'pg1',
      datasource_settings_url: 'http://localhost:8082/acme/data-sources/pg1',
      options: { mode: 'sql', query: 'select id from orders limit 25' },
    });
    client.runQuery.mockResolvedValue({ status: 'failed', data: { code: '08006' }, message: 'connection refused' });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'q1', version_id: 'v1',
    });

    expect(textOf(result)).toMatchObject({
      status: 'failed',
      recovery: {
        action: 'open_datasource_settings',
        url: 'http://localhost:8082/acme/data-sources/pg1',
        instruction: expect.stringMatching(/Ask the user.*in-app browser.*do not enter credentials.*Retry only after/is),
      },
    });
  });

  it('refuses SELECT star before execution, even when it has a limit', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({
      id: 'q1', name: 'unknownRows', kind: 'postgresql',
      options: { mode: 'sql', query: 'SELECT * FROM unknown_table LIMIT 25' },
    });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'q1', version_id: 'v1',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/refused.*SELECT \*.*Inspect the schema.*required columns/i);
    expect(client.runQuery).not.toHaveBeenCalled();
  });

  it('runs an unbounded read only after a same-source count proves it is small', async () => {
    const client = makeClient();
    client.getQuery
      .mockResolvedValueOnce({
        id: 'rows', name: 'listOrders', kind: 'postgresql', data_source_id: 'pg-main',
        options: { mode: 'sql', query: 'SELECT id, status FROM orders' },
      })
      .mockResolvedValueOnce({
        id: 'count', name: 'countOrders', kind: 'postgresql', data_source_id: 'pg-main',
        options: { mode: 'sql', query: 'SELECT COUNT(*) AS total FROM orders' },
      });
    client.runQuery
      .mockResolvedValueOnce({ status: 'ok', data: [{ total: '48' }] })
      .mockResolvedValueOnce({ status: 'ok', data: [{ id: 1, status: 'open' }] });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'rows', count_query_id: 'count', version_id: 'v1',
    });

    expect(client.runQuery).toHaveBeenCalledTimes(2);
    expect(textOf(result)).toMatchObject({
      status: 'ok',
      preflight: { count_query_id: 'count', row_count: 48, threshold: 1000 },
    });
  });

  it('reports the observed large count and requires explicit user confirmation before the target run', async () => {
    const client = makeClient();
    client.getQuery
      .mockResolvedValueOnce({
        id: 'rows', name: 'listOrders', kind: 'postgresql', data_source_id: 'pg-main',
        options: { mode: 'sql', query: 'SELECT id, status FROM orders' },
      })
      .mockResolvedValueOnce({
        id: 'count', name: 'countOrders', kind: 'postgresql', data_source_id: 'pg-main',
        options: { mode: 'sql', query: 'SELECT COUNT(*) AS total FROM orders' },
      });
    client.runQuery.mockResolvedValueOnce({ status: 'ok', data: [{ total: 2_400_000 }] });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'rows', count_query_id: 'count', version_id: 'v1',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(
      /target query was not run.*2400000 rows.*server-side pagination.*ask explicitly.*user_confirmed_large_read:true/i
    );
    expect(client.runQuery).toHaveBeenCalledTimes(1);
  });

  it('honors explicit confirmation after rechecking the large count', async () => {
    const client = makeClient();
    client.getQuery
      .mockResolvedValueOnce({
        id: 'rows', name: 'listOrders', kind: 'postgresql', data_source_id: 'pg-main',
        options: { mode: 'sql', query: 'SELECT id, status FROM orders' },
      })
      .mockResolvedValueOnce({
        id: 'count', name: 'countOrders', kind: 'postgresql', data_source_id: 'pg-main',
        options: { mode: 'sql', query: 'SELECT COUNT(*) AS total FROM orders' },
      });
    client.runQuery
      .mockResolvedValueOnce({ status: 'ok', data: [{ total: 2400 }] })
      .mockResolvedValueOnce({ status: 'ok', data: [{ id: 1, status: 'open' }] });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'rows', count_query_id: 'count', version_id: 'v1',
      user_confirmed_large_read: true,
    });

    expect(textOf(result)).toMatchObject({
      status: 'ok',
      preflight: { row_count: 2400 },
      warnings: [expect.stringMatching(/User-confirmed large read.*server-side pagination/i)],
    });
  });

  it('does not execute a billable warehouse read without explicit confirmation', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({
      id: 'warehouse-page', name: 'warehousePage', kind: 'bigquery', data_source_id: 'bq-main',
      options: { query: 'SELECT id FROM dataset.orders LIMIT 25' },
    });

    const refused = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'warehouse-page', version_id: 'v1',
    });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/scan charges.*user_confirmed_billable_read:true.*explicit approval/i);
    expect(client.runQuery).not.toHaveBeenCalled();

    client.runQuery.mockResolvedValue({ status: 'ok', data: [{ id: 1 }] });
    const approved = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'warehouse-page', version_id: 'v1', user_confirmed_billable_read: true,
    });
    expect(textOf(approved)).toMatchObject({ status: 'ok', data: [{ id: 1 }] });
    expect(client.runQuery).toHaveBeenCalledOnce();
  });

  it('requires exact approval for a static REST GET and returns its diagnostic metadata', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({
      id: 'latest-release', name: 'getLatestRelease', kind: 'restapi', data_source_id: 'github',
      options: { method: 'get', url: '/repos/facebook/react/releases/latest', url_params: [['per_page', '3']] },
    });

    const refused = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'latest-release', version_id: 'v1',
    });
    expect(refused.isError).toBe(true);
    expect(refused.content[0]!.text).toMatch(/remote reads.*quota.*unbounded.*ask explicitly.*user_confirmed_remote_read:true/i);
    expect(client.runQuery).not.toHaveBeenCalled();

    client.runQuery.mockResolvedValue({
      status: 'ok',
      data: { tag_name: 'v19.2.8' },
      metadata: {
        request: { url: 'https://api.github.com/repos/facebook/react/releases/latest', params: { per_page: '3' } },
        response: { statusCode: 200, headers: { 'x-ratelimit-remaining': '59' } },
      },
    });
    const approved = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'latest-release', version_id: 'v1', user_confirmed_remote_read: true,
    });
    expect(textOf(approved)).toMatchObject({
      status: 'ok',
      data: { tag_name: 'v19.2.8' },
      metadata: {
        request: { params: { per_page: '3' } },
        response: { statusCode: 200 },
      },
      warnings: [expect.stringMatching(/User-confirmed REST GET.*metadata\.request.*pagination/i)],
    });
    expect(client.runQuery).toHaveBeenCalledOnce();
  });

  it('truncates oversized REST data returned to MCP after the approved request completes', async () => {
    const client = makeClient();
    client.getQuery.mockResolvedValue({
      id: 'large-rest', kind: 'restapi', options: { method: 'get', url: '/large' },
    });
    client.runQuery.mockResolvedValue({ status: 'ok', data: { payload: 'x'.repeat(40_000) } });

    const result = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: 'large-rest', version_id: 'v1', user_confirmed_remote_read: true,
    });
    expect(textOf(result)).toMatchObject({
      status: 'ok',
      data: { mcp_truncated: true, original_json_characters: expect.any(Number) },
      warnings: expect.arrayContaining([expect.stringMatching(/truncated.*request already completed.*pagination/i)]),
    });
  });
});

describe('run_queries tool', () => {
  it('loads metadata/environment once and preserves ordered per-query read results', async () => {
    const client = makeClient();
    client.getQueries.mockResolvedValue([
      {
        id: 'q1', name: 'overview', kind: 'tooljetdb',
        options: {
          operation: 'list_rows', table_id: 'orders',
          list_rows: { aggregates: { count: { column: 'id', aggFx: 'count' } } },
        },
      },
      {
        id: 'q2', name: 'page', kind: 'tooljetdb',
        datasource_settings_url: 'http://localhost:8082/acme/data-sources/tjdb',
        options: {
          operation: 'list_rows', table_id: 'orders',
          list_rows: { limit: 25, offset: '{{components.orders.pageIndex}}' },
        },
      },
    ]);
    client.getDevelopmentEnvironmentId.mockResolvedValue('dev');
    client.runQuery
      .mockResolvedValueOnce({ status: 'ok', data: [{ count: 48 }] })
      .mockRejectedValueOnce(new Error('connect ETIMEDOUT'));

    const result = await runQueriesTool(client as unknown as ToolJetClient).handler({
      query_ids: ['q1', 'q2'], version_id: 'v1',
    });

    expect(client.getQueries).toHaveBeenCalledOnce();
    expect(client.getDevelopmentEnvironmentId).toHaveBeenCalledOnce();
    expect(client.runQuery).toHaveBeenCalledTimes(2);
    expect(textOf(result)).toEqual({ queries: [
      { query_id: 'q1', name: 'overview', status: 'ok', data: [{ count: 48 }] },
      {
        query_id: 'q2', name: 'page', status: 'failed', message: 'connect ETIMEDOUT',
        warnings: [expect.stringMatching(/components\.\*.*viewer/i)],
      },
    ] });
  });

  it('refuses an unsafe batch before resolving an environment or running anything', async () => {
    const client = makeClient();
    client.getQueries.mockResolvedValue([
      { id: 'delete', kind: 'tooljetdb', options: { operation: 'delete_rows' } },
    ]);
    const result = await runQueriesTool(client as unknown as ToolJetClient).handler({
      query_ids: ['delete'], version_id: 'v1',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/refused non-proven reads.*delete_rows/i);
    expect(client.getDevelopmentEnvironmentId).not.toHaveBeenCalled();
    expect(client.runQuery).not.toHaveBeenCalled();
  });

  it('only classifies single proven SQL reads as batch safe', () => {
    expect(batchSafeRead({ id: 's', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT 1' } }).safe).toBe(true);
    expect(batchSafeRead({ id: 'b', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT id FROM users LIMIT 25' } }).safe).toBe(true);
    expect(batchSafeRead({ id: 'u', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT id FROM users' } }).safe).toBe(false);
    expect(batchSafeRead({ id: 'star', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT * FROM users LIMIT 25' } }).safe).toBe(false);
    expect(batchSafeRead({ id: 'w', kind: 'postgresql', options: { mode: 'sql', query: 'UPDATE users SET active=true' } }).safe).toBe(false);
    expect(batchSafeRead({ id: 'r', kind: 'restapi', options: { method: 'get', url: '/items' } }).safe).toBe(false);
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

  it('defaults typed reads to compact authoring contracts and preserves exact key lookups', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);

    const compact = textOf(await tool.handler({ type: 'Table' })) as any;
    const compactData = compact.properties.find((property: any) => property.key === 'data');
    expect(compactData).toEqual(expect.objectContaining({ key: 'data' }));
    expect(compactData).not.toHaveProperty('label');
    expect(compactData).not.toHaveProperty('default');
    expect(compact).not.toHaveProperty('styles');

    const exact = textOf(await tool.handler({
      type: 'Table',
      sections: ['properties'],
      property_keys: ['data'],
    })) as any;
    expect(exact.properties[0]).toHaveProperty('default');
  });

  it('batches per-type catalog projections without loading the union of their sections', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const body = textOf(await tool.handler({
      requests: [
        { type: 'Table', sections: ['authoringHints'] },
        { type: 'Text', sections: ['styles'], style_keys: ['textSize'] },
      ],
    })) as any;

    expect(body.components[0]).toHaveProperty('authoringHints');
    expect(body.components[0]).not.toHaveProperty('styles');
    expect(body.components[1].styles.map((style: any) => style.key)).toEqual(['textSize']);
    expect(body.components[1]).not.toHaveProperty('authoringHints');
  });

  it('resolves GridView lookups to the real Listview mode without inventing a component type', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);

    const single = textOf(await tool.handler({ type: 'GridView', sections: ['overview', 'authoringHints'] })) as any;
    expect(single.type).toBe('Listview');
    expect(single.alias).toMatchObject({ requested_type: 'GridView' });
    expect(single.alias.note).toMatch(/mode:"grid".*type:"Listview"/i);

    const batch = textOf(await tool.handler({
      types: ['Listview', 'Gridview', 'NotAComponent'],
      sections: ['overview'],
    })) as any;
    expect(batch.components).toHaveLength(1);
    expect(batch.components[0]).toMatchObject({ type: 'Listview', requested_aliases: ['Gridview'] });
    expect(batch.unknown_types).toEqual(['NotAComponent']);
  });

  it('serves legacy schemas only for repair and names the modern replacement', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = textOf(await tool.handler({ type: 'KanbanBoard', sections: ['overview'] })) as any;

    expect(result).toMatchObject({
      type: 'KanbanBoard',
      deprecated: true,
      replacement: 'Kanban',
    });
    expect(result.deprecation_note).toMatch(/existing apps.*Use "Kanban" for new components/i);
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

  it('returns exact nested defaults through a selective property lookup', async () => {
    const client = makeClient();
    const result = await getComponentCatalogTool(client as unknown as ToolJetClient).handler({
      types: ['Calendar', 'Timeline'],
      sections: ['properties'],
      property_keys: ['events', 'data'],
    });

    const body = textOf(result) as any;
    const calendarDefault = body.components[0].properties[0].default;
    const timelineDefault = body.components[1].properties[0].default;
    expect(calendarDefault).not.toContain('…');
    expect(calendarDefault).toMatch(/title.*start.*end.*allDay/s);
    expect(timelineDefault).not.toContain('…');
    expect(timelineDefault).toMatch(/title.*subTitle.*date.*iconBackgroundColor/s);
  });

  it('returns Text height guidance from the catalog', async () => {
    const client = makeClient();
    const result = await getComponentCatalogTool(client as unknown as ToolJetClient).handler({
      type: 'Text',
      sections: ['renderingHints'],
    });

    const body = textOf(result) as any;
    expect(body.renderingHints.minimumSingleLineHeight).toMatch(/textSize \* lineHeight \+ 6px/);
    expect(body.renderingHints.headingExamples['24px at 1.5 line-height']).toBe('50px authored height');
  });

  it('returns only nested Table authoring hints when requested', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = await tool.handler({ type: 'Table', sections: ['authoringHints'] });

    const body = textOf(result) as any;
    expect(body.authoringHints.rowActionButtons.columnExample.columnType).toBe('button');
    expect(body.authoringHints.rowActionButtons.eventExample.ref).toBe('actions::view-action');
    expect(body.authoringHints.hiddenDataColumns.columnExample).toMatchObject({
      key: 'id',
      columnVisibility: false,
    });
    expect(body).not.toHaveProperty('properties');
    expect(body).not.toHaveProperty('actions');
  });

  it('returns the Kanban card-child and wrapping contract on demand', async () => {
    const client = makeClient();
    const result = await getComponentCatalogTool(client as unknown as ToolJetClient).handler({
      type: 'Kanban',
      sections: ['authoringHints'],
    });

    const body = textOf(result) as any;
    expect(body.authoringHints.cardContent.wrappedText.recommendedComponent).toBe('Html');
    expect(body.authoringHints.cardContent.renderingRule).toMatch(/blank card bodies/i);
    expect(body.authoringHints.cardContent.mcpDefaultRule).toMatch(/materializes.*default card children/i);
  });

  it('returns the ModalV2 native slot authoring contract on demand', async () => {
    const client = makeClient();
    const result = await getComponentCatalogTool(client as unknown as ToolJetClient).handler({
      type: 'ModalV2',
      sections: ['defaultChildren', 'authoringHints'],
    });

    const body = textOf(result) as any;
    expect(body.authoringHints.nativeSlots).toMatchObject({
      mcpField: 'slot_name',
      allowedValues: ['header', 'body', 'footer'],
      defaultValue: 'body',
    });
    expect(body.defaultChildren.some((child: any) => child.slotName === 'header')).toBe(true);
  });
});

describe('add_events tool', () => {
  it('blocks modal actions aimed at non-modal components', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [
        { id: 'btn1', name: 'open', type: 'Button' },
        { id: 'txt1', name: 'notAModal', type: 'Text' },
      ] }],
      queries: [], events: [],
    });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1',
      events: [{
        source_id: 'btn1', source_type: 'component', trigger: 'onClick',
        action: { actionId: 'show-modal', modal: 'txt1' },
      }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/show-modal target must be a Modal or ModalV2, not Text/i);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('validates control-component handles and required parameter arrays from the target catalog', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [
        { id: 'btn1', name: 'setTitle', type: 'Button' },
        { id: 'txt1', name: 'title', type: 'Text' },
      ] }],
      queries: [], events: [],
    });

    const invalidHandle = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1',
      events: [{
        source_id: 'btn1', source_type: 'component', trigger: 'onClick',
        action: {
          actionId: 'control-component', componentId: 'txt1',
          componentSpecificActionHandle: 'definitely-not-real', componentSpecificActionParams: [],
        },
      }],
    });
    expect(invalidHandle.isError).toBe(true);
    expect(invalidHandle.content[0]!.text).toMatch(/not valid for Text.*Valid actions/i);

    const missingParams = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1',
      events: [{
        source_id: 'btn1', source_type: 'component', trigger: 'onClick',
        action: { actionId: 'control-component', componentId: 'txt1', componentSpecificActionHandle: 'setText' },
      }],
    });
    expect(missingParams.isError).toBe(true);
    expect(missingParams.content[0]!.text).toMatch(/setText.*requires componentSpecificActionParams.*text/i);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('blocks alert actions that would silently display nothing', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [{ id: 'btn1', name: 'save', type: 'Button' }] }],
      queries: [], events: [],
    });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1',
      events: [{
        source_id: 'btn1', source_type: 'component', trigger: 'onClick',
        action: { actionId: 'show-alert', message: 'Saved' },
      }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/alertType must be success, info, warning, or error/i);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('blocks a dead Kanban onCardSelected handler when the card modal is disabled', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [{
        id: 'board1', name: 'dispatchBoard', type: 'Kanban',
        properties: { openModalOnCardClick: { value: false } },
      }] }],
      queries: [], events: [],
    });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1',
      events: [{
        source_id: 'board1', source_type: 'component', trigger: 'onCardSelected',
        action: { actionId: 'show-alert', message: 'Selected' },
      }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/onCardSelected cannot fire.*openModalOnCardClick is false/i);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('blocks handlers placed after switch-page in the same trigger chain', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [
        { id: 'p1', components: [{ id: 'btn1', name: 'viewDetails', type: 'Button' }] },
        { id: 'p2', components: [] },
      ],
      queries: [{ id: 'q1', name: 'loadDetails' }],
      events: [],
    });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [
        {
          source_id: 'btn1', source_type: 'component', trigger: 'onClick',
          action: { actionId: 'switch-page', pageId: 'p2' },
        },
        {
          source_id: 'btn1', source_type: 'component', trigger: 'onClick',
          action: { actionId: 'run-query', queryId: 'q1' },
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/switch-page must be the LAST handler.*later handlers \(run-query\)/s);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('blocks an incremental handler that would be appended after a persisted switch-page', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [
        { id: 'p1', components: [{ id: 'btn1', name: 'viewDetails', type: 'Button' }] },
        { id: 'p2', components: [] },
      ],
      queries: [],
      events: [{
        id: 'nav', name: 'Open details', sourceId: 'btn1', target: 'component', index: 0,
        event: { eventId: 'onClick', actionId: 'switch-page', pageId: 'p2' },
      }],
    });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1',
      events: [{
        source_id: 'btn1', source_type: 'component', trigger: 'onClick',
        action: { actionId: 'show-alert', message: 'Opening', alertType: 'info' },
      }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/Persisted event "Open details".*switch-page must be the LAST.*show-alert/s);
    expect(client.createEvents).not.toHaveBeenCalled();
  });

  it('accepts state and query actions before a final switch-page', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [
        { id: 'p1', components: [{ id: 'btn1', name: 'viewDetails', type: 'Button' }] },
        { id: 'p2', components: [] },
      ],
      queries: [{ id: 'q1', name: 'loadDetails' }],
      events: [],
    });
    client.createEvents.mockResolvedValue({ created: 3 });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [
        {
          source_id: 'btn1', source_type: 'component', trigger: 'onClick',
          action: { actionId: 'set-custom-variable', key: 'selectedId', value: '{{1}}' },
        },
        {
          source_id: 'btn1', source_type: 'component', trigger: 'onClick',
          action: { actionId: 'run-query', queryId: 'q1' },
        },
        {
          source_id: 'btn1', source_type: 'component', trigger: 'onClick',
          action: { actionId: 'switch-page', pageId: 'p2' },
        },
      ],
    });

    expect(result.isError).not.toBe(true);
    expect(client.createEvents).toHaveBeenCalled();
  });

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
      existingEvents: [],
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

  it('accepts and validates the exact set-table-page action contract', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [{ id: 'tbl1', name: 'orders', type: 'Table' }] }],
      queries: [],
      events: [],
    });
    client.createEvents.mockResolvedValue({ created: 1 });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [{
        source_id: 'tbl1',
        source_type: 'component',
        trigger: 'onSearch',
        action: { actionId: 'set-table-page', table: 'tbl1', pageIndex: '{{1}}' },
      }],
    });

    expect(textOf(result)).toEqual({ created: 1, warnings: [] });
    expect(client.createEvents).toHaveBeenCalled();
  });

  it('warns that generate-file PDF needs pre-formed bytes', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [{ id: 'btn1', name: 'download', type: 'Button' }] }],
      queries: [],
      events: [],
    });
    client.createEvents.mockResolvedValue({ created: 1 });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [{
        source_id: 'btn1',
        source_type: 'component',
        trigger: 'onClick',
        action: { actionId: 'generate-file', fileType: 'pdf', data: '{{queries.report.data}}' },
      }],
    });

    expect(textOf(result)).toMatchObject({ created: 1 });
    expect((textOf(result) as any).warnings.join(' ')).toMatch(/PDF is a pass-through.*pre-formed PDF bytes/is);
  });

  it('blocks set-table-page when its Table target or pageIndex is missing', async () => {
    const client = makeClient();
    client.getAppSummary.mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components: [{ id: 'tbl1', name: 'orders', type: 'Table' }] }],
      queries: [],
      events: [],
    });

    const result = await addEventsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1',
      version_id: 'v1',
      events: [{
        source_id: 'tbl1',
        source_type: 'component',
        trigger: 'onSearch',
        action: { actionId: 'set-table-page' },
      }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/set-table-page Table target.*pageIndex/i);
    expect(client.createEvents).not.toHaveBeenCalled();
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
        hidden: true,
        index: 1,
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
      page_fields: ['id', 'name', 'hidden', 'index'],
      component_fields: ['id', 'name', 'properties.data.value', 'styles.borderRadius.value'],
    });

    expect(textOf(result)).toEqual({
      app_id: 'app1',
      pages: [
        {
          id: 'p1',
          name: 'Home',
          hidden: true,
          index: 1,
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
    const options = { operation: 'list_rows', table_id: 'users-id', list_rows: { limit: 25 } };
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
  it('canonicalizes concise raw component leaves before persisting them', async () => {
    const client = makeClient();
    client.createComponent.mockResolvedValue({ component_id: 'text1' });
    const result = await addComponentTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1', name: 'pageTitle', type: 'Text',
      properties: { text: 'Payments control tower', visibility: '{{true}}' },
      styles: { textSize: 32, fontWeight: 'bold' },
      others: { showOnDesktop: '{{true}}', showOnMobile: '{{false}}' },
      layout: { top: 0, left: 0, width: 20, height: 60 },
    });

    expect(result.isError).not.toBe(true);

    expect(client.createComponent).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        text: { value: 'Payments control tower' },
        visibility: { value: '{{true}}' },
      }),
      styles: expect.objectContaining({ textSize: { value: 32 }, fontWeight: { value: 'bold' } }),
      others: expect.objectContaining({
        showOnDesktop: { value: '{{true}}' },
        showOnMobile: { value: '{{false}}' },
      }),
    }));
  });

  it('suppresses KeyValuePair catalog demo fields when explicit fields are authored', async () => {
    const client = makeClient();
    client.createComponent.mockResolvedValue({ component_id: 'kv1' });
    const result = await addComponentTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1', name: 'assetDetails', type: 'KeyValuePair',
      properties: {
        data: { value: '{{({asset:variables.selectedAsset.name,status:variables.selectedAsset.status})}}' },
        fields: { value: [
          { id: 'asset-custom', key: 'asset', name: 'Asset', autogenerated: false, fieldType: 'string' },
          { id: 'status-custom', key: 'status', name: 'Status', autogenerated: false, fieldType: 'string' },
        ] },
      },
      layout: { top: 0, left: 0, width: 20, height: 300 },
    });

    expect(client.createComponent).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        fieldDeletionHistory: { value: expect.arrayContaining(['name', 'mobile_number', 'status']) },
      }),
    }));
    expect(textOf(result).warnings.join(' ')).toMatch(/fieldDeletionHistory.*demo fields/i);
  });

  it('normalizes explicit static Table definitions to runtime-compatible defaults', async () => {
    const client = makeClient();
    client.createComponent.mockResolvedValue({ component_id: 'c1' });
    const result = await addComponentTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1', name: 'usersTable', type: 'Table',
      properties: {
        data: { value: '{{queries.users.data.map(r => ({id:r.id,name:r.name}))}}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: false },
        columns: { value: [{ id: 'name', name: 'Name', key: 'name', columnType: 'string' }] },
      },
      layout: { top: 0, left: 0, width: 20, height: 300 },
    });

    expect(client.createComponent).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        autogenerateColumns: { value: true },
        useDynamicColumn: { value: '{{false}}' },
        columnData: { value: expect.any(String) },
      }),
    }));
    expect(textOf(result).warnings.join(' ')).toMatch(/normalized autogenerateColumns.*runtime compatibility/i);
  });

  it('normalizes client/server editor labels to persisted booleans before writing', async () => {
    const client = makeClient();
    client.createComponent.mockResolvedValue({ component_id: 'c1' });
    const result = await addComponentTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1', name: 'usersTable', type: 'Table',
      properties: {
        serverSidePagination: { value: 'serverSide' },
        serverSideSearch: { value: 'clientSide' },
      },
      layout: { top: 0, left: 0, width: 20, height: 300 },
    });

    expect(client.createComponent).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        serverSidePagination: { value: true },
        serverSideSearch: { value: false },
      }),
    }));
    expect(textOf(result).warnings.join(' ')).toMatch(/serverSidePagination.*normalized.*boolean/i);
  });

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
    const layout = { top: 0, left: 0, width: 10, height: 620 };
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
      properties: {
        ...properties,
        useDynamicColumn: { value: '{{false}}' },
        columnData: { value: expect.any(String) },
      },
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
      layout: { top: 0, left: 0, width: 10, height: 300 },
    });
    expect(client.createComponent).toHaveBeenCalled(); // not blocked
    const out = textOf(result) as { component_id: string; warnings: string[] };
    expect(out.component_id).toBe('c1');
    expect(out.warnings.join(' ')).toMatch(/dataSourceSelector is not "rawJson"/);
  });

  it('materializes Kanban default card children and returns their ids', async () => {
    const client = makeClient();
    client.createComponents.mockResolvedValue([
      { component_id: 'board-id', name: 'ticketBoard' },
      { component_id: 'title-id', name: 'ticketBoardCardTitle' },
      { component_id: 'description-id', name: 'ticketBoardCardDescription' },
    ]);

    const result = await addComponentTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      name: 'ticketBoard',
      type: 'Kanban',
      properties: { cardData: { value: '{{queries.tickets.data}}' } },
      layout: { top: 0, left: 0, width: 40, height: 490 },
    });

    expect(client.createComponent).not.toHaveBeenCalled();
    expect(client.createComponents).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'app1',
      versionId: 'v1',
      pageId: 'p1',
      components: expect.arrayContaining([
        expect.objectContaining({ name: 'ticketBoard', type: 'Kanban' }),
        expect.objectContaining({ name: 'ticketBoardCardTitle', parentRef: expect.any(String) }),
        expect.objectContaining({ name: 'ticketBoardCardDescription', parentRef: expect.any(String) }),
      ]),
    }));
    expect(textOf(result)).toMatchObject({
      component_id: 'board-id',
      default_children: [
        { component_id: 'title-id', name: 'ticketBoardCardTitle' },
        { component_id: 'description-id', name: 'ticketBoardCardDescription' },
      ],
      warnings: [expect.stringMatching(/materialized 2 catalog default children/i)],
    });
  });

  it('moves style keys out of properties before creating a component', async () => {
    const client = makeClient();
    client.createComponent.mockResolvedValue({ component_id: 'title-id', name: 'title' });
    const tool = addComponentTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      name: 'title',
      type: 'Text',
      properties: { textColor: { value: '#111' } },
      layout: { top: 0, left: 0, width: 10, height: 30 },
    });
    expect(result.isError).toBeUndefined();
    expect(client.createComponent).toHaveBeenCalledOnce();
    const input = client.createComponent.mock.calls[0]![0];
    expect(input.properties).not.toHaveProperty('textColor');
    expect(input.styles).toMatchObject({ textColor: { value: '#111' } });
    expect((textOf(result) as any).warnings.join(' ')).toMatch(/moved style key "textColor".*styles\.textColor/i);
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

describe('add_components tool', () => {
  it('canonicalizes raw arrays and objects in an atomic batch', async () => {
    const client = makeClient();
    client.createComponents.mockResolvedValue([{ component_id: 'table-id', name: 'ordersTable' }]);
    await addComponentsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      components: [{
        name: 'ordersTable', type: 'Table',
        properties: {
          data: '{{queries.orders.data.map(r => ({id:r.id}))}}',
          dataSourceSelector: 'rawJson',
          columns: [{ id: 'id', name: 'ID', key: 'id', columnType: 'string' }],
        },
        styles: { borderRadius: 10 },
        layout: { top: 0, left: 0, width: 40, height: 400 },
      }],
    });

    expect(client.createComponents).toHaveBeenCalledWith(expect.objectContaining({
      components: [expect.objectContaining({
        properties: expect.objectContaining({
          data: { value: '{{queries.orders.data.map(r => ({id:r.id}))}}' },
          columns: { value: [{ id: 'id', name: 'ID', key: 'id', columnType: 'string' }] },
        }),
        styles: expect.objectContaining({ borderRadius: { value: 10 } }),
      })],
    }));
  });

  it('warns when a listItem-bound child is added under an existing parent', async () => {
    const client = makeClient();
    client.createComponents.mockResolvedValue([{ component_id: 'child-id', name: 'lateCard' }]);
    const result = await addComponentsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      components: [{
        name: 'lateCard', type: 'Html', parent: 'persisted-listview-id',
        properties: { rawHtml: '<div>{{listItem.title}}</div>' },
        layout: { top: 0, left: 0, width: 40, height: 100 },
      }],
    });

    expect(textOf(result).warnings.join(' ')).toMatch(
      /existing parent.*listItem.*mount.*empty repeated values.*atomically.*client_ref\/parent_ref/i
    );
  });

  it('normalizes each static Table before the atomic batch write', async () => {
    const client = makeClient();
    client.createComponents.mockResolvedValue([{ component_id: 'table-id', name: 'ordersTable' }]);
    await addComponentsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      components: [{
        name: 'ordersTable', type: 'Table',
        properties: {
          data: { value: '{{queries.orders.data.map(r => ({id:r.id}))}}' },
          dataSourceSelector: { value: 'rawJson' },
          autogenerateColumns: { value: false },
          columns: { value: [{ id: 'id', name: 'ID', key: 'id', columnType: 'string' }] },
        },
        layout: { top: 0, left: 0, width: 40, height: 400 },
      }],
    });

    expect(client.createComponents).toHaveBeenCalledWith(expect.objectContaining({
      components: [expect.objectContaining({
        properties: expect.objectContaining({
          autogenerateColumns: { value: true },
          useDynamicColumn: { value: '{{false}}' },
          columnData: { value: expect.any(String) },
        }),
      })],
    }));
  });

  it('maps slot_name to the logical same-batch child slot', async () => {
    const client = makeClient();
    client.createComponents.mockResolvedValue([
      { component_id: 'modal-id', name: 'createCase' },
      { component_id: 'title-id', name: 'createCaseTitle' },
    ]);
    const result = await addComponentsTool(client as unknown as ToolJetClient).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      components: [
        {
          client_ref: 'modal', name: 'createCase', type: 'ModalV2',
          properties: { showHeader: { value: true }, showFooter: { value: false }, modalHeight: { value: 300 } },
          layout: { top: 0, left: 0, width: 10, height: 40 },
        },
        {
          name: 'createCaseTitle', type: 'Text', parent_ref: 'modal', slot_name: 'header',
          properties: { text: { value: 'Add a test case' } }, styles: { textSize: { value: 18 }, fontWeight: { value: 'bold' } },
          layout: { top: 10, left: 2, width: 30, height: 40 },
        },
      ],
    });

    expect(client.createComponents).toHaveBeenCalledWith(expect.objectContaining({
      components: expect.arrayContaining([
        expect.objectContaining({ name: 'createCaseTitle', parentRef: 'modal', slotName: 'header' }),
      ]),
    }));
    expect(textOf(result).warnings).toEqual([]);
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
