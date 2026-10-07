import { describe, it, expect, vi } from 'vitest';
import { createWorkflowClient } from '../../src/workflowClient.js';
import type { Auth } from '../../src/auth.js';
const version = 'v';
const app = () => ({ id: 'w', type: 'workflow', organizationId: 'org', slug: 'my-workflow', isMaintenanceOn: true, editing_version: { id: version, status: 'DRAFT', currentEnvironmentId: 'env', definition: { nodes: [], edges: [], queries: [], customField: { snake_key: 42 } } } });
function exported(value = app()) {
  return { app: [{ definition: { appV2: { id: value.id, type: value.type, organizationId: value.organizationId, appVersions: [value.editing_version], dataSourceOptions: [{ secret: 'not-returned' }] } } }] };
}
function setup(fetcher = vi.fn(async (path: string) => new Response(JSON.stringify(path === '/api/v2/resources/export' ? exported() : app())))) {
  const auth = { authedFetch: fetcher, getOrganizationId: async () => 'org', getOrganizationSlug: async () => 'workspace' } as unknown as Auth;
  const queries = { getQueries: vi.fn(), listDatasources: vi.fn(), createQuery: vi.fn(), updateQuery: vi.fn(), deleteQuery: vi.fn(), getDevelopmentEnvironmentId: vi.fn() };
  const client = createWorkflowClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:3000', sessionToken: 'test-session', workspaceId: 'org' }, queries);
  return { client, fetcher };
}
describe('workflow HTTP adapter', () => {
  it('uses version metadata and lossless export definitions without exposing datasource options', async () => {
    const { client, fetcher } = setup(); const result = await client.get('w', 'v');
    expect(fetcher.mock.calls[0][0]).toBe('/api/v2/apps/w/versions/v');
    expect(result.definition.customField).toEqual({ snake_key: 42 });
    expect(JSON.stringify(result)).not.toContain('not-returned');
    expect(fetcher.mock.calls[1][0]).toBe('/api/v2/resources/export');
    expect(result.editor_url).toBe('http://localhost:3000/workspace/apps/my-workflow');
    expect(result.editable).toBe(true);
  });
  it.each(['PUBLISHED', 'RELEASED'])('does not edit %s versions', async status => {
    const value = app(); value.editing_version.status = status;
    const { client } = setup(vi.fn(async path => new Response(JSON.stringify(path === '/api/v2/resources/export' ? exported(value) : value))));
    const snapshot = await client.get('w', 'v'); expect(snapshot.editable).toBe(false);
    await expect(client.save(snapshot, snapshot.definition)).rejects.toThrow('editable draft');
  });
  it('rejects a version from a different workspace', async () => {
    const value = app(); value.organizationId = 'other';
    const { client } = setup(vi.fn(async () => new Response(JSON.stringify(value))));
    await expect(client.get('w', 'v')).rejects.toThrow('active workspace');
  });
  it('posts workflow creation rather than front-end app creation', async () => {
    const { client, fetcher } = setup(); await client.create('Workflow');
    expect(fetcher.mock.calls[0][0]).toBe('/api/workflows');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ name: 'Workflow', type: 'workflow' });
  });
  it('includes a created ID when readback fails', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{"id":"created"}')).mockRejectedValue(new Error('offline'));
    const { client } = setup(fetcher);
    await expect(client.create('Workflow')).rejects.toThrow('created was created'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('runs exactly the requested version and environment', async () => {
    const { client, fetcher } = setup(); await client.run('w', 'v', 'env', { foo: 'bar' });
    const [url, init] = fetcher.mock.calls.at(-1)!;
    expect(url).toBe('/api/workflow_executions');
    expect(JSON.parse(init.body)).toEqual({ executeUsing: 'version', appId: 'w', appVersionId: 'v', environmentId: 'env', params: { foo: 'bar' } });
  });
  it('refuses mismatched environments without execution', async () => {
    const { client, fetcher } = setup(); await expect(client.run('w', 'v', 'production', {})).rejects.toThrow('Environment');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('refuses disabled workflows without enabling them', async () => {
    const value = app(); value.isMaintenanceOn = false;
    const { client, fetcher } = setup(vi.fn(async path => new Response(JSON.stringify(path === '/api/v2/resources/export' ? exported(value) : value))));
    await expect(client.run('w', 'v', 'env', {})).rejects.toThrow('disabled'); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('never retries ambiguous execution requests', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(app()))).mockResolvedValueOnce(new Response(JSON.stringify(exported()))).mockRejectedValueOnce(new Error('timeout'));
    const { client } = setup(fetcher); await expect(client.run('w', 'v', 'env', {})).rejects.toThrow('outcome is unknown');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('scopes plan identity to credential and API origin', async () => {
    const { client } = setup(); expect(await client.planScope()).toHaveLength(64);
    expect(await client.planScope()).not.toContain('test-session');
  });
});

describe('lossless workflow reads', () => {
  it('round-trips mixed-case output keys even when native version reads transform them', async () => {
    const native = app();
    native.editing_version.definition.customField = { snakeKey: 42 } as any;
    const raw = exported();
    raw.app[0].definition.appV2.appVersions[0].definition.customField = { snake_key: 42, snakeKey: 7, nested_value: { HTTP_code: 202 } } as any;
    const fetcher = vi.fn(async (path, init) => {
      if (init?.method === 'PUT') {
        raw.app[0].definition.appV2.appVersions[0].definition = JSON.parse(init.body).definition;
        return new Response('{}');
      }
      return new Response(JSON.stringify(path === '/api/v2/resources/export' ? raw : native));
    });
    const { client } = setup(fetcher);
    const first = await client.get('w', 'v');
    await client.save(first, first.definition);
    expect((await client.get('w', 'v')).definition.customField).toEqual({ snake_key: 42, snakeKey: 7, nested_value: { HTTP_code: 202 } });
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ organization_id: 'org', app: [{ id: 'w', search_params: { version_id: 'v' } }] });
  });
  it.each(['workflow', 'workspace', 'version', 'definition', 'permission'])('refuses unsafe export %s responses without falling back to transformed data', async mismatch => {
    const raw = exported();
    if (mismatch === 'workflow') raw.app[0].definition.appV2.id = 'other';
    if (mismatch === 'workspace') raw.app[0].definition.appV2.organizationId = 'other';
    if (mismatch === 'version') raw.app[0].definition.appV2.appVersions[0].id = 'other';
    if (mismatch === 'definition') delete (raw.app[0].definition.appV2.appVersions[0] as any).definition;
    const { client, fetcher } = setup(vi.fn(async path => path === '/api/v2/resources/export'
      ? new Response(JSON.stringify(raw), { status: mismatch === 'permission' ? 403 : 200 })
      : new Response(JSON.stringify(app()))));
    await expect(client.get('w', 'v')).rejects.toThrow(/export/i);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('omits all-node status payloads so small result pages remain readable', async () => {
    const nodePage = { data: [{ id: 'small-node', result: { parcel_count: 8 } }], total: 2, total_pages: 2, page: 2, per_page: 1 };
    const { client } = setup(vi.fn(async path => new Response(JSON.stringify(path.endsWith('/status')
      ? { status: true, logs: [], nodes: [{ id: 'large-node', result: 'x'.repeat(80_000) }] } : nodePage))));
    const result = await client.execution('execution', 2, 1);
    expect(result.status).toEqual({ status: true, logs: [] });
    expect(result.nodes).toEqual(nodePage);
    expect(JSON.stringify(result).length).toBeLessThan(1000);
  });
});
