import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/tooljetClient.js';

function fixture(body: unknown) {
  const authedFetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify(body)));
  const client = createClient({ authedFetch } as any, {} as any);
  return { client, authedFetch };
}

describe('group permission API client', () => {
  it('projects only permission switches from group details', async () => {
    const { client } = fixture({ group: { id: 'g', name: 'Logistics', type: 'custom', appCreate: false,
      appDelete: true, organizationId: 'private', unknown: 'private' } });
    expect(await client.getWorkspaceGroup('g')).toEqual({ id: 'g', name: 'Logistics', type: 'custom',
      permissions: { appCreate: false, appDelete: true } });
  });
  it.each(['app', 'workflow', 'module', 'data_source'] as const)('projects %s rules without nested secrets', async type => {
    const ds = type === 'data_source';
    const detail = { canView: true, canUse: true, private: 'secret',
      [ds ? 'groupDataSources' : 'groupApps']: [{ id: 'membership', private: 'secret',
        [ds ? 'dataSource' : 'app']: { id: 'resource', name: 'Logistics', options: { password: 'secret' } } }] };
    const { client } = fixture([{ id: 'rule', name: 'Readers', type, isAll: false,
      group: { private: 'secret' }, [ds ? 'dataSourcesGroupPermission' : 'appsGroupPermissions']: detail }]);
    expect(await client.listWorkspaceGroupAccess('g')).toEqual([{ id: 'rule', name: 'Readers', type,
      is_all: false, actions: ds ? { canUse: true } : { canView: true },
      resources: [{ id: 'resource', name: 'Logistics', membership_id: 'membership' }] }]);
  });
  it.each(['app', 'workflow', 'module', 'data_source'] as const)('uses existing %s API routes for every mutation', async type => {
    const { client, authedFetch } = fixture({});
    const route = type === 'app' ? 'app' : 'data-source';
    await client.writeWorkspaceGroupAccess('POST', 'g', type, undefined, { name: 'Readers' });
    await client.writeWorkspaceGroupAccess('PUT', 'g', type, 'r', { isAll: false });
    await client.writeWorkspaceGroupAccess('DELETE', 'g', type, 'r');
    expect(authedFetch.mock.calls).toEqual([
      [`/api/v2/group-permissions/g/granular-permissions/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Readers"}' }],
      [`/api/v2/group-permissions/granular-permissions/${route}/r`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"isAll":false}' }],
      [`/api/v2/group-permissions/granular-permissions/${route}/r`, { method: 'DELETE' }],
    ]);
  });
  it('filters apps/modules/workflows using the persisted app type', async () => {
    const { client } = fixture([{ id: 'a', name: 'App', type: 'front-end' }, { id: 'w', name: 'Workflow', type: 'workflow' },
      { id: 'm', name: 'Module', type: 'module' }]);
    expect(await client.listWorkspaceGroupResources('app')).toEqual([{ id: 'a', name: 'App' }]);
    expect(await client.listWorkspaceGroupResources('workflow')).toEqual([{ id: 'w', name: 'Workflow' }]);
    expect(await client.listWorkspaceGroupResources('module')).toEqual([{ id: 'm', name: 'Module' }]);
  });
  it('posts duplication options and re-reads the persisted copy', async () => {
    const { client, authedFetch } = fixture({});
    authedFetch.mockResolvedValueOnce(new Response('{"id":"copy"}'))
      .mockResolvedValueOnce(new Response('{"group":{"id":"copy","name":"Logistics copy","type":"custom"}}'));
    expect(await client.duplicateWorkspaceGroup('g', { addUsers: true })).toEqual({ id: 'copy', name: 'Logistics copy', type: 'custom' });
    expect(authedFetch.mock.calls[0]).toEqual(['/api/v2/group-permissions/g/duplicate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"addUsers":true}' }]);
    expect(authedFetch.mock.calls[1]).toEqual(['/api/v2/group-permissions/copy']);
  });
  it('propagates backend denials rather than returning empty permissions', async () => {
    const { client, authedFetch } = fixture({});
    authedFetch.mockResolvedValue(new Response('Denied', { status: 403 }));
    await expect(client.listWorkspaceGroupAccess('g')).rejects.toThrow();
    await expect(client.updateWorkspaceGroupPermissions('g', { appCreate: true })).rejects.toThrow();
    await expect(client.writeWorkspaceGroupAccess('DELETE', 'g', 'app', 'r')).rejects.toThrow();
  });
});
