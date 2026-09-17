import { describe, it, expect, vi } from 'vitest';
import { createWorkflowClient } from '../../src/workflowClient.js';
import type { Auth } from '../../src/auth.js';
const version = 'v';
const app = () => ({ id: 'w', type: 'workflow', organizationId: 'org', slug: 'my-workflow', isMaintenanceOn: true, editing_version: { id: version, status: 'DRAFT', currentEnvironmentId: 'env', definition: { nodes: [], edges: [], queries: [], customField: { snake_key: 42 } } } });
function setup(fetcher = vi.fn(async () => new Response(JSON.stringify(app())))) {
  const auth = { authedFetch: fetcher, getOrganizationId: async () => 'org', getOrganizationSlug: async () => 'workspace' } as unknown as Auth;
  const queries = { getQueries: vi.fn(), listDatasources: vi.fn(), createQuery: vi.fn(), updateQuery: vi.fn(), getDevelopmentEnvironmentId: vi.fn() };
  const client = createWorkflowClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:3000', sessionToken: 'test-session', workspaceId: 'org' }, queries);
  return { client, fetcher };
}
describe('workflow HTTP adapter', () => {
  it('uses native version reads and preserves arbitrary definition keys', async () => {
    const { client, fetcher } = setup(); const result = await client.get('w', 'v');
    expect(fetcher.mock.calls[0][0]).toBe('/api/v2/apps/w/versions/v');
    expect(result.definition.customField).toEqual({ snake_key: 42 });
    expect(result.editor_url).toBe('http://localhost:3000/workspace/apps/my-workflow');
    expect(result.editable).toBe(true);
  });
  it.each(['PUBLISHED', 'RELEASED'])('does not edit %s versions', async status => {
    const value = app(); value.editing_version.status = status;
    const { client } = setup(vi.fn(async () => new Response(JSON.stringify(value))));
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
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('refuses disabled workflows without enabling them', async () => {
    const value = app(); value.isMaintenanceOn = false;
    const { client, fetcher } = setup(vi.fn(async () => new Response(JSON.stringify(value))));
    await expect(client.run('w', 'v', 'env', {})).rejects.toThrow('disabled'); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('never retries ambiguous execution requests', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(app()))).mockRejectedValueOnce(new Error('timeout'));
    const { client } = setup(fetcher); await expect(client.run('w', 'v', 'env', {})).rejects.toThrow('outcome is unknown');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('scopes plan identity to credential and API origin', async () => {
    const { client } = setup(); expect(await client.planScope()).toHaveLength(64);
    expect(await client.planScope()).not.toContain('test-session');
  });
});
