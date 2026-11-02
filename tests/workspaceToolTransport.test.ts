import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { registerTools } from '../src/tools/index.js';

const memberId = '91000000-0000-4000-8000-000000000001';
const groupId = '92000000-0000-4000-8000-000000000002';
const requests = [
  { name: 'manage_workspace_users', arguments: { action: 'update', organization_user_id: memberId,
    role: 'builder', confirm: true }, unsupported: { remove_group_ids: [groupId] } },
  { name: 'manage_workspace_groups', arguments: { action: 'update_permissions', group_id: groupId,
    permissions: { appCreate: true }, confirm: true }, unsupported: { remove_member_ids: [memberId] } },
];

async function withServer(run: (client: Client, backend: ReturnType<typeof mockBackend>) => Promise<void>) {
  const server = new McpServer({ name: 'workspace-safety-test', version: '1.0.0' });
  const backend = mockBackend();
  registerTools(server, backend as unknown as ToolJetClient);
  const client = new Client({ name: 'workspace-safety-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run(client, backend);
  } finally {
    await client.close();
    await server.close();
  }
}

function mockBackend() {
  return {
    updateWorkspaceUser: vi.fn().mockResolvedValue({ user: { id: memberId, role: 'builder' }, updated: true }),
    getWorkspaceGroup: vi.fn().mockResolvedValue({ id: groupId, name: 'Orchard team', type: 'custom' }),
    updateWorkspaceGroupPermissions: vi.fn(),
  };
}

describe('workspace mutation validation through the MCP transport', () => {
  it.each(requests)('rejects unsupported fields before any backend call for $name', async request => {
    await withServer(async (client, backend) => {
      const result = await client.callTool({ name: request.name,
        arguments: { ...request.arguments, ...request.unsupported } });
      expect(result.isError).toBe(true);
      for (const method of Object.values(backend)) expect(method).not.toHaveBeenCalled();
    });
  });

  it.each(requests)('still executes a valid confirmed request for $name', async request => {
    await withServer(async (client, backend) => {
      const result = await client.callTool({ name: request.name, arguments: request.arguments });
      expect(result.isError).not.toBe(true);
      const write = request.name === 'manage_workspace_users'
        ? backend.updateWorkspaceUser : backend.updateWorkspaceGroupPermissions;
      expect(write).toHaveBeenCalledTimes(1);
    });
  });
});

const folderId = '45000000-0000-4000-8000-000000000001';
const appId = '46000000-0000-4000-8000-000000000001';

async function withFolderServer(run: (client: Client, fetch: ReturnType<typeof vi.fn>) => Promise<void>) {
  const authedFetch = vi.fn(async (path: string) => {
    if (path === '/api/folder-apps?type=front-end') return Response.json({ folders: [
      { id: folderId, name: 'Observatory', count: 1, folder_apps: [{ app_id: appId }] },
    ] });
    if (path.startsWith('/api/apps?')) return Response.json({
      apps: [{ id: appId, name: 'Telescope schedule' }],
      meta: { current_page: 1, total_pages: 1, total_count: 4, folder_count: 1 },
    });
    throw new Error(`Unexpected route: ${path}`);
  });
  const backend = createClient({ authedFetch } as unknown as Auth, {} as Config);
  const server = new McpServer({ name: 'folder-discovery-test', version: '1.0.0' });
  registerTools(server, backend);
  const client = new Client({ name: 'folder-discovery-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    await run(client, authedFetch);
  } finally {
    await client.close();
    await server.close();
  }
}

describe('workspace folder discovery through the MCP transport', () => {
  it('advertises both read-only tools and the folder filter', async () => {
    await withFolderServer(async client => {
      const { tools } = await client.listTools();
      const folders = tools.find(tool => tool.name === 'list_workspace_folders');
      const apps = tools.find(tool => tool.name === 'list_workspace_apps');
      expect(folders?.annotations?.readOnlyHint).toBe(true);
      expect(folders?.inputSchema.properties).toHaveProperty('search_text');
      expect(apps?.annotations?.readOnlyHint).toBe(true);
      expect(apps?.inputSchema.properties).toHaveProperty('folder_id');
      expect(apps?.description).toContain('NOT workspace folders');
      expect(apps?.description).toContain('meta.total_count remains the workspace-wide count of matching apps even with folder_id');
    });
  });

  it('discovers a folder by name and uses its returned ID to read apps', async () => {
    await withFolderServer(async (client, fetch) => {
      const result = await client.callTool({ name: 'list_workspace_folders', arguments: { search_text: '  OBSERV  ' } });
      expect(result.isError).not.toBe(true);
      const body = JSON.parse((result.content as Array<{ text: string }>)[0]!.text);
      expect(body).toEqual({ folders: [{ id: folderId, name: 'Observatory', app_count: 1 }], meta: { total_count: 1 } });

      const apps = await client.callTool({ name: 'list_workspace_apps', arguments: {
        folder_id: body.folders[0].id, page: 1, search_text: '  Telescope  ',
      } });
      expect(apps.isError).not.toBe(true);
      expect(JSON.parse((apps.content as Array<{ text: string }>)[0]!.text)).toMatchObject({
        apps: [{ id: appId, name: 'Telescope schedule', folders: [{ id: folderId, name: 'Observatory' }] }],
        folder: { id: folderId, name: 'Observatory', app_count: 1 },
        meta: { workspace_folder_count: 1, folder_app_count: 1 },
      });
      expect(fetch.mock.calls).toEqual([
        ['/api/folder-apps?type=front-end'], ['/api/folder-apps?type=front-end'],
        [`/api/apps?page=1&type=front-end&searchKey=Telescope&folder=${folderId}`],
      ]);
    });
  });

  it.each([
    { name: 'list_workspace_apps', arguments: { folder_id: 'invalid' } },
    { name: 'list_workspace_apps', arguments: { folder_id: null } },
    { name: 'list_workspace_apps', arguments: { page: 0 } },
    { name: 'list_workspace_apps', arguments: { page: 1.5 } },
    { name: 'list_workspace_apps', arguments: { folder_name: 'Observatory' } },
    { name: 'list_workspace_apps', arguments: { search_text: 'a'.repeat(101) } },
    { name: 'list_workspace_folders', arguments: { search_text: 'a'.repeat(101) } },
    { name: 'list_workspace_folders', arguments: { workspace_id: 'another-workspace' } },
  ])('rejects invalid or unsupported inputs before API access: %j', async request => {
    await withFolderServer(async (client, fetch) => {
      expect((await client.callTool(request)).isError).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it('returns folder permission failures as MCP errors', async () => {
    await withFolderServer(async (client, fetch) => {
      fetch.mockResolvedValue(new Response('Forbidden', { status: 403 }));
      const result = await client.callTool({ name: 'list_workspace_folders', arguments: {} });
      expect(result.isError).toBe(true);
      expect((result.content as Array<{ text: string }>)[0]!.text).toContain('listWorkspaceFolders failed (403)');
    });
  });
});
