import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';
import type { Auth } from '../src/auth.js';

const { uuidState } = vi.hoisted(() => ({ uuidState: { n: 0 } }));
vi.mock('node:crypto', () => ({ randomUUID: () => `component-uuid-${++uuidState.n}` }));

const config: Config = {
  apiUrl: 'http://localhost:3000',
  appUrl: 'http://localhost:8082',
  email: 'a@b.com',
  password: 'pw',
};

function mockResponse(opts: { status?: number; json?: unknown; text?: string }) {
  const status = opts.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => opts.json ?? {},
    text: async () => opts.text ?? '',
  } as unknown as Response;
}

function makeAuth(): Auth & { authedFetch: ReturnType<typeof vi.fn>; getOrganizationId: ReturnType<typeof vi.fn> } {
  return {
    authedFetch: vi.fn(),
    getOrganizationId: vi.fn().mockResolvedValue('org1'),
    getOrganizationSlug: vi.fn().mockResolvedValue('myworkspace'),
  };
}

describe('createClient', () => {
  let auth: ReturnType<typeof makeAuth>;

  beforeEach(() => {
    auth = makeAuth();
    uuidState.n = 0;
  });

  describe('createApp', () => {
    it('creates the app then fetches it to resolve version/home page, and builds the app url', async () => {
      auth.authedFetch
        .mockResolvedValueOnce(mockResponse({ status: 201, json: { id: 'app1' } }))
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            json: {
              id: 'app1',
              name: 'My App',
              editing_version: { id: 'ver1' },
              pages: [
                { id: 'page-other', name: 'Other', index: 1 },
                { id: 'page-home', name: 'Home', index: 0 },
              ],
            },
          })
        );

      const client = createClient(auth, config);
      const result = await client.createApp('My App');

      expect(auth.authedFetch).toHaveBeenCalledTimes(2);

      const [createPath, createInit] = auth.authedFetch.mock.calls[0];
      expect(createPath).toBe('/api/apps');
      expect(createInit.method).toBe('POST');
      expect(JSON.parse(createInit.body)).toEqual({ name: 'My App', type: 'front-end' });

      const [getPath] = auth.authedFetch.mock.calls[1];
      expect(getPath).toBe('/api/apps/app1');

      expect(result).toEqual({
        app_id: 'app1',
        version_id: 'ver1',
        home_page_id: 'page-home',
        app_url: 'http://localhost:8082/myworkspace/apps/app1',
      });
    });

    it('falls back to the first page when there is no page named Home', async () => {
      auth.authedFetch
        .mockResolvedValueOnce(mockResponse({ status: 201, json: { id: 'app2' } }))
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            json: {
              id: 'app2',
              editing_version: { id: 'ver2' },
              pages: [{ id: 'page-first', name: 'Not Home', index: 0 }],
            },
          })
        );

      const client = createClient(auth, config);
      const result = await client.createApp('Another App');

      expect(result.home_page_id).toBe('page-first');
    });

    it('throws when the create call is non-2xx', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 500, text: 'boom' }));

      const client = createClient(auth, config);
      await expect(client.createApp('Bad App')).rejects.toThrow(
        /ToolJet createApp failed \(500\): boom/
      );
    });
  });

  describe('getApp', () => {
    it('fetches the app by id', async () => {
      auth.authedFetch.mockResolvedValueOnce(
        mockResponse({ status: 200, json: { id: 'app1', name: 'My App' } })
      );

      const client = createClient(auth, config);
      const app = await client.getApp('app1');

      expect(auth.authedFetch).toHaveBeenCalledWith('/api/apps/app1');
      expect(app).toEqual({ id: 'app1', name: 'My App' });
    });

    it('throws when non-2xx', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 404, text: 'not found' }));
      const client = createClient(auth, config);
      await expect(client.getApp('missing')).rejects.toThrow(
        /ToolJet getApp failed \(404\): not found/
      );
    });
  });

  describe('getDevelopmentEnvironmentId', () => {
    it('finds the development environment from a top-level array response', async () => {
      auth.authedFetch.mockResolvedValueOnce(
        mockResponse({
          status: 200,
          json: [
            { id: 'env-prod', name: 'production' },
            { id: 'env-dev', name: 'development' },
          ],
        })
      );

      const client = createClient(auth, config);
      const envId = await client.getDevelopmentEnvironmentId();

      expect(auth.authedFetch).toHaveBeenCalledWith('/api/app-environments');
      expect(envId).toBe('env-dev');
    });

    it('finds the development environment from a wrapped { environments } response', async () => {
      auth.authedFetch.mockResolvedValueOnce(
        mockResponse({
          status: 200,
          json: { environments: [{ id: 'env-dev', name: 'development' }] },
        })
      );

      const client = createClient(auth, config);
      const envId = await client.getDevelopmentEnvironmentId();

      expect(envId).toBe('env-dev');
    });

    it('throws when non-2xx', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 500, text: 'server error' }));
      const client = createClient(auth, config);
      await expect(client.getDevelopmentEnvironmentId()).rejects.toThrow(
        /ToolJet getDevelopmentEnvironmentId failed \(500\): server error/
      );
    });
  });

  describe('listDatasources', () => {
    it('resolves org id and dev env id, then fetches app-scoped datasources', async () => {
      auth.authedFetch
        .mockResolvedValueOnce(
          mockResponse({ status: 200, json: { environments: [{ id: 'env-dev', name: 'development' }] } })
        )
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            json: {
              data_sources: [
                { id: 'ds1', name: 'tjdb', kind: 'tooljetdb' },
                { id: 'ds2', name: 'restapi1', kind: 'restapi' },
              ],
            },
          })
        );

      const client = createClient(auth, config);
      const datasources = await client.listDatasources('ver1');

      expect(auth.getOrganizationId).toHaveBeenCalledTimes(1);
      expect(auth.authedFetch).toHaveBeenNthCalledWith(1, '/api/app-environments');
      expect(auth.authedFetch).toHaveBeenNthCalledWith(
        2,
        '/api/data-sources/org1/environments/env-dev/versions/ver1'
      );
      expect(datasources).toEqual([
        { id: 'ds1', name: 'tjdb', kind: 'tooljetdb' },
        { id: 'ds2', name: 'restapi1', kind: 'restapi' },
      ]);
    });

    it('throws when non-2xx', async () => {
      auth.authedFetch
        .mockResolvedValueOnce(
          mockResponse({ status: 200, json: { environments: [{ id: 'env-dev', name: 'development' }] } })
        )
        .mockResolvedValueOnce(mockResponse({ status: 403, text: 'forbidden' }));

      const client = createClient(auth, config);
      await expect(client.listDatasources('ver1')).rejects.toThrow(
        /ToolJet listDatasources failed \(403\): forbidden/
      );
    });
  });

  describe('createQuery', () => {
    it('posts to the data-source-scoped query route with kind tooljetdb', async () => {
      auth.authedFetch.mockResolvedValueOnce(
        mockResponse({ status: 201, json: { id: 'query1', name: 'getUsers' } })
      );

      const client = createClient(auth, config);
      const result = await client.createQuery({
        versionId: 'ver1',
        dataSourceId: 'ds1',
        name: 'getUsers',
        options: { operation: 'list_rows', table_name: 'users' },
        kind: 'tooljetdb',
      });

      const [path, init] = auth.authedFetch.mock.calls[0];
      expect(path).toBe('/api/data-queries/data-sources/ds1/versions/ver1');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        kind: 'tooljetdb',
        name: 'getUsers',
        options: { operation: 'list_rows', table_name: 'users' },
      });

      expect(result).toEqual({ query_id: 'query1', name: 'getUsers' });
    });

    it('resolves the kind from the datasource when not given (any datasource works)', async () => {
      auth.authedFetch
        // listDatasources → app-environments, then app-scoped datasources
        .mockResolvedValueOnce(mockResponse({ status: 200, json: { environments: [{ id: 'env-dev', name: 'development' }] } }))
        .mockResolvedValueOnce(mockResponse({ status: 200, json: { data_sources: [{ id: 'ds-snow', name: 'servicenow', kind: 'servicenow' }] } }))
        // the create
        .mockResolvedValueOnce(mockResponse({ status: 201, json: { id: 'q9', name: 'snq' } }));

      const client = createClient(auth, config);
      await client.createQuery({ versionId: 'ver1', dataSourceId: 'ds-snow', name: 'snq', options: { operation: 'list_records' } });

      const createInit = auth.authedFetch.mock.calls[2][1];
      expect(JSON.parse(createInit.body).kind).toBe('servicenow'); // resolved from the datasource, NOT hardcoded tjdb
    });

    it('throws when non-2xx', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 422, text: 'invalid options' }));
      const client = createClient(auth, config);
      await expect(
        client.createQuery({ versionId: 'ver1', dataSourceId: 'ds1', name: 'q', options: {}, kind: 'tooljetdb' })
      ).rejects.toThrow(/ToolJet createQuery failed \(422\): invalid options/);
    });
  });

  describe('createComponent', () => {
    it('posts a v2 diff body keyed by a generated uuid and returns that id', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 201, json: { success: true } }));

      const client = createClient(auth, config);
      const result = await client.createComponent({
        appId: 'app1',
        versionId: 'ver1',
        pageId: 'page-home',
        name: 'usersTable',
        type: 'Table',
        properties: { title: 'Users' },
        layout: { top: 0, left: 0, width: 10, height: 20 },
      });

      expect(result).toEqual({ component_id: 'component-uuid-1' });

      const [path, init] = auth.authedFetch.mock.calls[0];
      expect(path).toBe('/api/v2/apps/app1/versions/ver1/components');
      expect(init.method).toBe('POST');

      const body = JSON.parse(init.body);
      expect(body.is_user_switched_version).toBe(false);
      expect(body.pageId).toBe('page-home');
      expect(Object.keys(body.diff)).toEqual(['component-uuid-1']);
      expect(body.diff['component-uuid-1']).toMatchObject({
        name: 'usersTable',
        type: 'Table',
        properties: { title: 'Users' },
        layouts: {
          desktop: { top: 0, left: 0, width: 10, height: 20 },
          mobile: { top: 0, left: 0, width: 10, height: 20 },
        },
      });
    });

    it('throws when non-2xx', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 400, text: 'bad component' }));

      const client = createClient(auth, config);
      await expect(
        client.createComponent({
          appId: 'app1',
          versionId: 'ver1',
          pageId: 'page-home',
          name: 'x',
          type: 'Table',
          properties: {},
        })
      ).rejects.toThrow(/ToolJet createComponents failed \(400\): bad component/);
    });
  });

  describe('createComponents (batch)', () => {
    it('sends all components in ONE request as a diff keyed by unique ids', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 201, json: { success: true } }));

      const client = createClient(auth, config);
      const result = await client.createComponents({
        appId: 'app1',
        versionId: 'ver1',
        pageId: 'page-home',
        components: [
          { name: 'title', type: 'Text', properties: { text: { value: 'Hi' } }, layout: { top: 0, left: 2, width: 40, height: 40 } },
          { name: 'grid', type: 'Table', properties: { data: { value: '{{queries.q.data}}' } }, layout: { top: 60, left: 2, width: 40, height: 300 } },
        ],
      });

      // exactly one HTTP call for both components
      expect(auth.authedFetch).toHaveBeenCalledTimes(1);
      const [path, init] = auth.authedFetch.mock.calls[0];
      expect(path).toBe('/api/v2/apps/app1/versions/ver1/components');
      const body = JSON.parse(init.body);
      expect(Object.keys(body.diff)).toEqual(['component-uuid-1', 'component-uuid-2']);
      expect(body.diff['component-uuid-1']).toMatchObject({ name: 'title', type: 'Text' });
      expect(body.diff['component-uuid-2']).toMatchObject({ name: 'grid', type: 'Table' });
      expect(result).toEqual([
        { component_id: 'component-uuid-1', name: 'title' },
        { component_id: 'component-uuid-2', name: 'grid' },
      ]);
    });
  });

  describe('createEvents', () => {
    it('bulk-posts events with eventId merged into action, per-component index', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 201, json: {} }));
      const client = createClient(auth, config);
      const result = await client.createEvents({
        appId: 'app1',
        versionId: 'ver1',
        events: [
          { componentId: 'btn1', trigger: 'onClick', action: { actionId: 'run-query', queryName: 'save' } },
          { componentId: 'btn1', trigger: 'onClick', action: { actionId: 'show-alert', message: 'Saved', alertType: 'success' } },
          { componentId: 'tbl1', trigger: 'onRowClicked', action: { actionId: 'switch-page', pageId: 'p2', queryParams: [['id', '{{x}}']] } },
        ],
      });

      const [path, init] = auth.authedFetch.mock.calls[0];
      expect(path).toBe('/api/v2/apps/app1/versions/ver1/events/bulk');
      const body = JSON.parse(init.body);
      expect(body.events[0]).toMatchObject({ eventType: 'component', attachedTo: 'btn1', index: 0, event: { eventId: 'onClick', actionId: 'run-query', queryName: 'save' } });
      expect(body.events[1]).toMatchObject({ attachedTo: 'btn1', index: 1 }); // second event on same component → index 1
      expect(body.events[2]).toMatchObject({ attachedTo: 'tbl1', index: 0, event: { eventId: 'onRowClicked', actionId: 'switch-page', pageId: 'p2' } });
      expect(result).toEqual({ created: 3 });
    });
  });

  describe('createPage', () => {
    it('appends after existing pages, slugifies the handle, uses a client-generated id', async () => {
      auth.authedFetch
        .mockResolvedValueOnce(mockResponse({ status: 200, json: { pages: [{ id: 'home', name: 'Home' }] } })) // getApp
        .mockResolvedValueOnce(mockResponse({ status: 201, json: {} })); // create page

      const client = createClient(auth, config);
      const result = await client.createPage({ appId: 'app1', versionId: 'ver1', name: 'Details View' });

      const [path, init] = auth.authedFetch.mock.calls[1];
      expect(path).toBe('/api/v2/apps/app1/versions/ver1/pages');
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({ id: 'component-uuid-1', name: 'Details View', handle: 'details-view', index: 1 });
      expect(result).toEqual({ page_id: 'component-uuid-1', name: 'Details View' });
    });
  });

  describe('createTable', () => {
    it('normalizes types, sets constraints, and auto-adds a serial id PK when none given', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 201, json: { result: { id: 't1', table_name: 'people' } } }));

      const client = createClient(auth, config);
      const result = await client.createTable({
        tableName: 'people',
        columns: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'integer', notNull: true },
        ],
      });

      const [path, init] = auth.authedFetch.mock.calls[0];
      expect(path).toBe('/api/tooljet-db/organizations/org1/table');
      const body = JSON.parse(init.body);
      expect(body.table_name).toBe('people');
      // auto id PK prepended
      expect(body.columns[0]).toMatchObject({ column_name: 'id', data_type: 'serial', constraints_type: { is_primary_key: true } });
      // alias normalized + constraints set
      expect(body.columns[1]).toMatchObject({ column_name: 'name', data_type: 'character varying' });
      expect(body.columns[2]).toMatchObject({ column_name: 'age', data_type: 'integer', constraints_type: { is_not_null: true } });
      expect(result).toEqual({ table_id: 't1', table_name: 'people' });
    });
  });

  describe('getTableSchema', () => {
    it('maps result.columns to a simplified schema', async () => {
      auth.authedFetch.mockResolvedValueOnce(
        mockResponse({
          status: 200,
          json: { result: { columns: [{ column_name: 'id', data_type: 'integer', constraints_type: { is_primary_key: true, is_not_null: true } }, { column_name: 'name', data_type: 'character varying' }] } },
        })
      );
      const client = createClient(auth, config);
      const schema = await client.getTableSchema('people');
      expect(schema).toEqual([
        { name: 'id', type: 'integer', isPrimaryKey: true, isNotNull: true },
        { name: 'name', type: 'character varying', isPrimaryKey: false, isNotNull: false },
      ]);
    });
  });

  describe('insertRows', () => {
    it('resolves schema, auto-fills the serial PK, then bulk-uploads', async () => {
      auth.authedFetch
        // getTableSchema
        .mockResolvedValueOnce(mockResponse({ status: 200, json: { result: { columns: [{ column_name: 'id', data_type: 'integer', constraints_type: { is_primary_key: true } }, { column_name: 'name', data_type: 'character varying' }] } } }))
        // bulk-upload
        .mockResolvedValueOnce(mockResponse({ status: 201, json: { result: { processed_rows: 2 } } }));

      const client = createClient(auth, config);
      const result = await client.insertRows({ tableName: 'people', rows: [{ name: 'A' }, { name: 'B' }] });

      expect(auth.authedFetch).toHaveBeenCalledTimes(2);
      expect(auth.authedFetch.mock.calls[1][0]).toBe('/api/tooljet-db/organizations/org1/table/people/bulk-upload');
      expect(auth.authedFetch.mock.calls[1][1].method).toBe('POST');
      expect(result).toEqual({ processed_rows: 2 });
    });
  });

  describe('createQueries (batch)', () => {
    it('fans out to one create call per query and returns all results', async () => {
      auth.authedFetch
        .mockResolvedValueOnce(mockResponse({ status: 201, json: { id: 'q1', name: 'a' } }))
        .mockResolvedValueOnce(mockResponse({ status: 201, json: { id: 'q2', name: 'b' } }));

      const client = createClient(auth, config);
      const result = await client.createQueries({
        versionId: 'ver1',
        queries: [
          { dataSourceId: 'ds1', name: 'a', options: { operation: 'list_rows' }, kind: 'tooljetdb' },
          { dataSourceId: 'ds1', name: 'b', options: { operation: 'list_rows' }, kind: 'tooljetdb' },
        ],
      });

      expect(auth.authedFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([
        { query_id: 'q1', name: 'a' },
        { query_id: 'q2', name: 'b' },
      ]);
    });
  });
});
