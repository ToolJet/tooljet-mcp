import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';
import type { Auth } from '../src/auth.js';

vi.mock('node:crypto', () => ({ randomUUID: () => 'component-uuid-1' }));

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
  };
}

describe('createClient', () => {
  let auth: ReturnType<typeof makeAuth>;

  beforeEach(() => {
    auth = makeAuth();
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
        app_url: 'http://localhost:8082/apps/app1',
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

    it('throws when non-2xx', async () => {
      auth.authedFetch.mockResolvedValueOnce(mockResponse({ status: 422, text: 'invalid options' }));
      const client = createClient(auth, config);
      await expect(
        client.createQuery({ versionId: 'ver1', dataSourceId: 'ds1', name: 'q', options: {} })
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
        type: 'Table',
        properties: { title: 'Users' },
        layouts: { top: 0, left: 0, width: 10, height: 20 },
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
          type: 'Table',
          properties: {},
        })
      ).rejects.toThrow(/ToolJet createComponent failed \(400\): bad component/);
    });
  });
});
