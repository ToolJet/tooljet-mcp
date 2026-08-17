import { describe, it, expect, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { createAppTool } from '../src/tools/createApp.js';
import { listDatasourcesTool } from '../src/tools/listDatasources.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { getAppTool } from '../src/tools/getApp.js';
import { addQueryTool } from '../src/tools/addQuery.js';
import { addComponentTool } from '../src/tools/addComponent.js';
import { getCatalog } from '../src/catalog.js';

function makeClient(): { [K in keyof ToolJetClient]: ReturnType<typeof vi.fn> } {
  return {
    createApp: vi.fn(),
    getApp: vi.fn(),
    getDevelopmentEnvironmentId: vi.fn(),
    listDatasources: vi.fn(),
    createQuery: vi.fn(),
    createComponent: vi.fn(),
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

describe('get_component_catalog tool', () => {
  it('returns the real catalog', async () => {
    const client = makeClient();
    const tool = getComponentCatalogTool(client as unknown as ToolJetClient);
    const result = await tool.handler({});

    expect(textOf(result)).toEqual(getCatalog());
    expect(result.isError).toBeUndefined();
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
    client.createQuery.mockResolvedValue(created);

    const tool = addQueryTool(client as unknown as ToolJetClient);
    const options = { operation: 'list_rows', table_name: 'users', list_rows: {} };
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
    });
    expect(textOf(result)).toEqual(created);
  });

  it('returns isError on client failure', async () => {
    const client = makeClient();
    client.createQuery.mockRejectedValue(new Error('bad query'));

    const tool = addQueryTool(client as unknown as ToolJetClient);
    const result = await tool.handler({
      version_id: 'v1',
      datasource_id: 'ds1',
      name: 'getUsers',
      options: {},
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
    const properties = { data: { value: '{{queries.getUsers.data}}' } };
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
      layout,
    });
    expect(textOf(result)).toEqual(created);
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
