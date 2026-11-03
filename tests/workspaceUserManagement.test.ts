import { describe, expect, it, vi } from 'vitest';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import {
  listWorkspaceAppsTool,
  listWorkspaceUsersTool,
  manageWorkspaceUsersTool,
} from '../src/tools/workspaceUserManagement.js';

function client() {
  return {
    listWorkspaceApps: vi.fn(),
    listWorkspaceUsers: vi.fn(),
    inviteWorkspaceUser: vi.fn(),
    updateWorkspaceUser: vi.fn(),
    setWorkspaceUserArchived: vi.fn(),
  };
}

function body(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]!.text);
}

describe('workspace management tools', () => {
  it('forwards bounded app and user listing filters', async () => {
    const mock = client();
    mock.listWorkspaceApps.mockResolvedValue({ apps: [] });
    mock.listWorkspaceUsers.mockResolvedValue({ users: [], meta: { total_pages: 1, total_count: 0, current_page: 2 } });

    await listWorkspaceAppsTool(mock as unknown as ToolJetClient).handler({ page: 2, search_text: 'orders' });
    const result = await listWorkspaceUsersTool(mock as unknown as ToolJetClient).handler({
      page: 2,
      search_text: 'sam',
      filter_status: 'active',
    });

    expect(mock.listWorkspaceApps).toHaveBeenCalledWith({ page: 2, searchText: 'orders', folderId: undefined });
    expect(mock.listWorkspaceUsers).toHaveBeenCalledWith({ page: 2, searchText: 'sam', status: 'active' });
    expect(body(result)).toMatchObject({ users: [] });
  });

  it('refuses every workspace-user mutation without explicit confirmation', async () => {
    const mock = client();
    const result = await manageWorkspaceUsersTool(mock as unknown as ToolJetClient).handler({
      action: 'update',
      organization_user_id: '00000000-0000-4000-8000-000000000001',
      role: 'admin',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/confirm:true/);
    expect(mock.updateWorkspaceUser).not.toHaveBeenCalled();
  });

  it('applies an approved role update to the exact organization user', async () => {
    const mock = client();
    const id = '00000000-0000-4000-8000-000000000001';
    mock.updateWorkspaceUser.mockResolvedValue({ user: { id, role: 'builder' }, updated: true });
    const result = await manageWorkspaceUsersTool(mock as unknown as ToolJetClient).handler({
      action: 'update',
      organization_user_id: id,
      role: 'builder',
      group_ids: [],
      confirm: true,
    });

    expect(mock.updateWorkspaceUser).toHaveBeenCalledWith(id, {
      firstName: undefined,
      lastName: undefined,
      role: 'builder',
      addGroupIds: [],
      userMetadata: undefined,
    });
    expect(body(result)).toEqual({ organization_user_id: id, updated: true, user: { id, role: 'builder' } });
  });

  it('archives only the requested organization user after confirmation', async () => {
    const mock = client();
    mock.setWorkspaceUserArchived.mockResolvedValue(undefined);
    const id = '00000000-0000-4000-8000-000000000001';

    await manageWorkspaceUsersTool(mock as unknown as ToolJetClient).handler({
      action: 'archive',
      organization_user_id: id,
      confirm: true,
    });

    expect(mock.setWorkspaceUserArchived).toHaveBeenCalledWith(id, true);
  });
});

const nurseryId = '43000000-0000-4000-8000-000000000001';
const sharedId = '43000000-0000-4000-8000-000000000002';
const emptyId = '43000000-0000-4000-8000-000000000003';
const appId = '44000000-0000-4000-8000-000000000001';
const unfiledId = '44000000-0000-4000-8000-000000000002';
const folderPath = '/api/folder-apps?type=front-end';

function folderResponse() {
  return { folders: [
    { id: nurseryId, name: 'Nursery & Stock', organization_id: 'private-workspace', count: 2,
      folder_apps: [{ app_id: appId, id: 'private-membership' }, { app_id: 'other-visible-app' }] },
    { id: sharedId, name: 'Shared', count: 1, folder_apps: [{ app_id: appId }] },
    { id: emptyId, name: 'Seasonal', count: 0, folder_apps: [] },
  ] };
}

function appResponse() {
  return {
    apps: [{ id: appId, name: 'Seed inventory', slug: 'seed-inventory' }, { id: unfiledId, name: 'Delivery board' }],
    meta: { current_page: 1, total_pages: 3, total_count: 21, folder_count: 0 },
  };
}

function fixture(folders: unknown = folderResponse(), apps: unknown = appResponse()) {
  const authedFetch = vi.fn(async (path: string) => {
    if (path === folderPath) return Response.json(folders);
    if (path.startsWith('/api/apps?')) return Response.json(apps);
    throw new Error(`Unexpected route: ${path}`);
  });
  const client = createClient({ authedFetch } as unknown as Auth, {} as Config);
  return { client, authedFetch };
}

describe('workspace folder discovery API client', () => {
  it('lists visible folders, including empty folders, without leaking raw entity metadata', async () => {
    const { client, authedFetch } = fixture();
    expect(await client.listWorkspaceFolders()).toEqual({
      folders: [
        { id: nurseryId, name: 'Nursery & Stock', app_count: 2 },
        { id: sharedId, name: 'Shared', app_count: 1 },
        { id: emptyId, name: 'Seasonal', app_count: 0 },
      ],
      meta: { total_count: 3 },
    });
    expect(authedFetch.mock.calls).toEqual([[folderPath]]);
  });

  it('searches folder names case-insensitively without using the API app-name search', async () => {
    const { client, authedFetch } = fixture();
    expect(await client.listWorkspaceFolders({ searchText: '  NURSERY &  ' })).toEqual({
      folders: [{ id: nurseryId, name: 'Nursery & Stock', app_count: 2 }], meta: { total_count: 1 },
    });
    expect(await client.listWorkspaceFolders({ searchText: 'Seed inventory' })).toEqual({
      folders: [], meta: { total_count: 0 },
    });
    expect(authedFetch.mock.calls).toEqual([[folderPath], [folderPath]]);
  });

  it('counts unique accessible memberships rather than trusting an unrelated raw count', async () => {
    const { client } = fixture({ folders: [{ id: nurseryId, name: 'Nursery', count: 100,
      folder_apps: [{ app_id: appId }, { app_id: appId }] }] });
    expect(await client.listWorkspaceFolders()).toEqual({
      folders: [{ id: nurseryId, name: 'Nursery', app_count: 1 }], meta: { total_count: 1 },
    });
  });

  it('returns an empty list for a workspace with no visible folders', async () => {
    const { client } = fixture({ folders: [] });
    expect(await client.listWorkspaceFolders()).toEqual({ folders: [], meta: { total_count: 0 } });
  });

  it('adds all folder memberships and unfiled apps while preserving existing app fields and pagination', async () => {
    const { client, authedFetch } = fixture();
    expect(await client.listWorkspaceApps()).toEqual({
      apps: [
        { id: appId, name: 'Seed inventory', slug: 'seed-inventory', folders: [
          { id: nurseryId, name: 'Nursery & Stock' }, { id: sharedId, name: 'Shared' },
        ] },
        { id: unfiledId, name: 'Delivery board', folders: [] },
      ],
      folder: null,
      meta: { current_page: 1, total_pages: 3, total_count: 21, folder_app_count: null, workspace_folder_count: 3 },
    });
    expect(authedFetch.mock.calls).toEqual([[folderPath], ['/api/apps?page=1&type=front-end']]);
  });

  it('sends folder, pagination, and encoded app search together and distinguishes counts', async () => {
    const folders = folderResponse();
    folders.folders[0]!.folder_apps = Array.from({ length: 12 }, (_, index) => ({
      app_id: index === 0 ? appId : `visible-app-${index}`,
    }));
    const { client, authedFetch } = fixture(folders, {
      apps: [{ id: appId, name: 'Seed inventory' }],
      meta: { current_page: 2, total_pages: 2, total_count: 21, folder_count: 10 },
    });
    const result = await client.listWorkspaceApps({ folderId: nurseryId, page: 2, searchText: 'seed & soil/葉' });
    expect(result).toMatchObject({
      folder: { id: nurseryId, name: 'Nursery & Stock', app_count: 12 },
      meta: { current_page: 2, total_pages: 2, total_count: 21,
        folder_app_count: 10, workspace_folder_count: 3 },
    });
    expect(result.meta).not.toHaveProperty('folder_count');
    const url = new URL(authedFetch.mock.calls[1]![0], 'https://example.test');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2', type: 'front-end', searchKey: 'seed & soil/葉', folder: nurseryId,
    });
    // Membership enrichment requires one folder request, never one request per app.
    expect(authedFetch).toHaveBeenCalledTimes(2);
  });

  it('distinguishes a selected empty folder from a workspace without a folder filter', async () => {
    const { client } = fixture(folderResponse(), {
      apps: [], meta: { current_page: 1, total_pages: 0, total_count: 21, folder_count: 0 },
    });
    expect(await client.listWorkspaceApps({ folderId: emptyId })).toMatchObject({
      apps: [], folder: { id: emptyId, name: 'Seasonal', app_count: 0 },
      meta: { folder_app_count: 0, workspace_folder_count: 3, total_pages: 0 },
    });
  });

  it('still lists unfiled apps when there are no folders', async () => {
    const { client } = fixture({ folders: [] });
    expect(await client.listWorkspaceApps()).toMatchObject({
      apps: [{ id: appId, folders: [] }, { id: unfiledId, folders: [] }],
      meta: { workspace_folder_count: 0, folder_app_count: null },
    });
  });

  it('rejects missing, inaccessible, or foreign workspace folders before querying their apps', async () => {
    const { client, authedFetch } = fixture();
    await expect(client.listWorkspaceApps({ folderId: '43000000-0000-4000-8000-000000000099' }))
      .rejects.toThrow('Folder not found or not accessible in the current workspace');
    expect(authedFetch.mock.calls).toEqual([[folderPath]]);
  });

  it('does not cache folder visibility across permission or workspace changes', async () => {
    const { client, authedFetch } = fixture();
    await client.listWorkspaceFolders();
    authedFetch.mockResolvedValueOnce(Response.json({ folders: [] }));
    await expect(client.listWorkspaceApps({ folderId: nurseryId })).rejects.toThrow('Folder not found');
    expect(authedFetch.mock.calls).toEqual([[folderPath], [folderPath]]);
  });

  it.each([401, 403, 500])('propagates folder API HTTP %s rather than inventing zero folders', async status => {
    const { client, authedFetch } = fixture();
    authedFetch.mockImplementation(async () => new Response('Unavailable', { status }));
    await expect(client.listWorkspaceFolders()).rejects.toThrow(`listWorkspaceFolders failed (${status})`);
    await expect(client.listWorkspaceApps()).rejects.toThrow(`listWorkspaceFolders failed (${status})`);
    expect(authedFetch.mock.calls.every(([path]) => path === folderPath)).toBe(true);
  });

  it('propagates an app API denial after successful folder discovery', async () => {
    const { client, authedFetch } = fixture();
    authedFetch.mockResolvedValueOnce(Response.json(folderResponse()))
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }));
    await expect(client.listWorkspaceApps({ folderId: nurseryId })).rejects.toThrow('listWorkspaceApps failed (403)');
  });

  it.each([{}, { folders: null }, { folders: [{ id: nurseryId, name: 'Nursery' }] },
    { folders: [{ id: nurseryId, name: 'Nursery', folder_apps: [{}] }] },
  ])('rejects malformed folder responses instead of reporting empty memberships: %j', async folders => {
    const { client, authedFetch } = fixture(folders);
    await expect(client.listWorkspaceFolders()).rejects.toThrow('Unexpected workspace folders response');
    await expect(client.listWorkspaceApps()).rejects.toThrow('Unexpected workspace folders response');
    expect(authedFetch.mock.calls.every(([path]) => path === folderPath)).toBe(true);
  });

  it.each([{}, { apps: [], meta: {} }, { apps: [{}], meta: { folder_count: 0 } }])(
    'rejects malformed app responses: %j', async apps => {
      const { client } = fixture(folderResponse(), apps);
      await expect(client.listWorkspaceApps()).rejects.toThrow('Unexpected workspace apps response');
    }
  );
});
