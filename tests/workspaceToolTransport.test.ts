import { manageAppPermissionsTool } from '../src/tools/manageAppPermissions.js';
import { manageWorkspaceUsersTool } from '../src/tools/workspaceUserManagement.js';
import { manageWorkspaceGroupsTool } from '../src/tools/workspaceGroupManagement.js';
import { manageThemeTool } from '../src/tools/manageTheme.js';
import { z } from 'zod';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { managementActionTools, registerTools } from '../src/tools/index.js';

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
      expect(apps?.description).not.toContain('meta.folder_count');
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
      expect(JSON.parse((apps.content as Array<{ text: string }>)[0]!.text)).toEqual({
        apps: [{ id: appId, name: 'Telescope schedule', folders: [{ id: folderId, name: 'Observatory' }] }],
        folder: { id: folderId, name: 'Observatory', app_count: 1 },
        meta: { current_page: 1, total_pages: 1, total_count: 4, workspace_folder_count: 1, folder_app_count: 1 },
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

describe('management action contracts', () => {
  const app = 'a1000000-0000-4000-8000-000000000001';
  const page = 'a2000000-0000-4000-8000-000000000002';
  const member = 'a3000000-0000-4000-8000-000000000003';
  const group = 'a4000000-0000-4000-8000-000000000004';
  const rule = 'a5000000-0000-4000-8000-000000000005';
  const theme = 'a6000000-0000-4000-8000-000000000006';
  const colors = { light: '#2468ac', dark: '#98badc' };
  const definition = {
    brand: { colors: { primary: colors } }, text: { font: 'Arial', colors: { primary: colors } },
    border: { radius: { default: 4, small: 2, large: 8 }, colors: { default: colors } },
    systemStatus: { colors: { success: colors } },
    surface: { colors: { appBackground: colors, surface1: colors, surface2: colors, surface3: colors } },
  };
  const resource = { app_id: app, resource_type: 'page', resource_id: page };
  const confirmed = { confirm: true };
  function backend() {
    return {
      listAppPermissionSubjects: vi.fn().mockResolvedValue({ users: [{ id: member, email: 'observer@example.test' }], groups: [] }),
      getLicenseFeatureAccess: vi.fn().mockResolvedValue({}),
      getAppSummary: vi.fn().mockResolvedValue({ app_id: app, pages: [{ id: page, name: 'Observations', components: [] }], queries: [] }),
      getAppPermission: vi.fn().mockResolvedValue([]), setAppPermission: vi.fn().mockResolvedValue([]), clearAppPermission: vi.fn(),
      inviteWorkspaceUser: vi.fn(), updateWorkspaceUser: vi.fn().mockResolvedValue({ updated: true }), setWorkspaceUserArchived: vi.fn(),
      getWorkspaceGroup: vi.fn().mockResolvedValue({ id: group, name: 'Astronomy club', type: 'custom' }),
      createWorkspaceGroup: vi.fn().mockResolvedValue({ id: group }), renameWorkspaceGroup: vi.fn(), deleteWorkspaceGroup: vi.fn(),
      listWorkspaceGroupMembers: vi.fn().mockResolvedValue([{ group_user_id: member }]), removeWorkspaceGroupMember: vi.fn(),
      duplicateWorkspaceGroup: vi.fn().mockResolvedValue({ id: group }), updateWorkspaceGroupPermissions: vi.fn(),
      listWorkspaceGroupAccess: vi.fn().mockResolvedValue([{ id: rule, name: 'Reading', type: 'app', is_all: true, resources: [], actions: { canView: true } }]),
      writeWorkspaceGroupAccess: vi.fn(), listWorkspaceGroupResources: vi.fn().mockResolvedValue([{ id: app }]),
      listAppThemes: vi.fn().mockResolvedValue([{ id: theme, name: 'Existing theme', definition }]),
      createAppTheme: vi.fn().mockResolvedValue({ id: theme }), updateAppSettings: vi.fn(), setDefaultAppTheme: vi.fn(),
      updateAppThemeDefinition: vi.fn(), renameAppTheme: vi.fn(), deleteAppTheme: vi.fn(),
    };
  }
  function sources(client: ToolJetClient) {
    return [manageAppPermissionsTool(client), manageWorkspaceUsersTool(client), manageWorkspaceGroupsTool(client), manageThemeTool(client)];
  }
  const cases = [
    ['list_app_permission_subjects', { app_id: app }, 'listAppPermissionSubjects'],
    ['list_app_permission_screens', { app_id: app }, 'getAppSummary'],
    ['list_app_permission_queries', { app_id: app }, 'getAppSummary'],
    ['get_app_resource_permission', resource, 'getAppPermission'],
    ['set_app_resource_permission', { ...resource, ...confirmed, access_type: 'users', user_ids: [member] }, 'setAppPermission'],
    ['clear_app_resource_permission', { ...resource, ...confirmed }, 'clearAppPermission'],
    ['invite_workspace_user', { email: 'observer@example.test', ...confirmed }, 'inviteWorkspaceUser'],
    ['update_workspace_user', { organization_user_id: member, role: 'builder', ...confirmed }, 'updateWorkspaceUser'],
    ['archive_workspace_user', { organization_user_id: member, ...confirmed }, 'setWorkspaceUserArchived'],
    ['unarchive_workspace_user', { organization_user_id: member, ...confirmed }, 'setWorkspaceUserArchived'],
    ['create_workspace_group', { name: 'Star watchers', ...confirmed }, 'createWorkspaceGroup'],
    ['rename_workspace_group', { group_id: group, name: 'Night watchers', ...confirmed }, 'renameWorkspaceGroup'],
    ['delete_workspace_group', { group_id: group, ...confirmed }, 'deleteWorkspaceGroup'],
    ['remove_workspace_group_member', { group_id: group, group_user_id: member, ...confirmed }, 'removeWorkspaceGroupMember'],
    ['duplicate_workspace_group', { group_id: group, copy: { members: true }, ...confirmed }, 'duplicateWorkspaceGroup'],
    ['update_workspace_group_permissions', { group_id: group, permissions: { appCreate: true }, ...confirmed }, 'updateWorkspaceGroupPermissions'],
    ['create_workspace_group_access', { group_id: group, resource_type: 'app', access: { name: 'Read apps', is_all: true, actions: { canView: true } }, ...confirmed }, 'writeWorkspaceGroupAccess'],
    ['update_workspace_group_access', { group_id: group, rule_id: rule, access: { name: 'Read observatory' }, ...confirmed }, 'writeWorkspaceGroupAccess'],
    ['delete_workspace_group_access', { group_id: group, rule_id: rule, ...confirmed }, 'writeWorkspaceGroupAccess'],
    ['list_workspace_themes', { theme_id: theme }, 'listAppThemes'],
    ['create_workspace_theme', { name: 'Nebula', definition }, 'createAppTheme'],
    ['create_workspace_theme', { name: 'Aurora Field', primary: '#7c3aed', font: 'Inter', radius: 8 }, 'createAppTheme'],
    ['set_default_workspace_theme', { theme_id: theme }, 'setDefaultAppTheme'],
    ['update_workspace_theme_definition', { theme_id: theme, definition }, 'updateAppThemeDefinition'],
    ['rename_workspace_theme', { theme_id: theme, name: 'Aurora' }, 'renameAppTheme'],
    ['delete_workspace_theme', { theme_id: theme, ...confirmed }, 'deleteAppTheme'],
  ] as const;

  async function withServer(run: (client: Client, mock: ReturnType<typeof backend>) => Promise<void>) {
    const mock = backend();
    const server = new McpServer({ name: 'management-contracts', version: '1' });
    registerTools(server, mock as unknown as ToolJetClient);
    const client = new Client({ name: 'contract-client', version: '1' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    try {
      await server.connect(serverTransport); await client.connect(clientTransport);
      await run(client, mock);
    } finally { await client.close(); await server.close(); }
  }

  describe('individually exposed management operations', () => {
    it('covers every grouped action without requiring a discovery call', () => {
      const grouped = sources({} as ToolJetClient);
      for (const source of grouped) {
        const tools = managementActionTools([source]);
        expect(tools).toHaveLength((source.inputSchema.action as z.ZodEnum).options.length);
        for (const tool of tools) expect(tool.inputSchema).not.toHaveProperty('action');
      }
    });

    it.each(cases)('executes %s through the real registry and MCP transport', async (name, args, method) => {
      await withServer(async (client, mock) => {
        const result = await client.callTool({ name, arguments: args });
        expect(result.isError, JSON.stringify(result)).not.toBe(true);
        expect(mock[method]).toHaveBeenCalled();
        if (name === 'archive_workspace_user') expect(mock.setWorkspaceUserArchived).toHaveBeenCalledWith(member, true);
        if (name === 'unarchive_workspace_user') expect(mock.setWorkspaceUserArchived).toHaveBeenCalledWith(member, false);
        if (name.endsWith('_group_access')) expect(mock.writeWorkspaceGroupAccess.mock.calls[0][0]).toBe(
          name.startsWith('create') ? 'POST' : name.startsWith('update') ? 'PUT' : 'DELETE');
      });
    });

    it.each(cases)('rejects an injected action on %s before reaching the backend', async (name, args) => {
      await withServer(async (client, mock) => {
        const result = await client.callTool({ name, arguments: { ...args, action: 'delete' } });
        expect(result.isError).toBe(true);
        for (const method of Object.values(mock)) expect(method).not.toHaveBeenCalled();
      });
    });

    it.each(cases.filter(([, args]) => 'confirm' in args))('requires explicit confirmation on %s', async (name, args) => {
      await withServer(async (client, mock) => {
        const { confirm, ...unconfirmed } = args as Record<string, unknown>;
        for (const arguments_ of [unconfirmed, { ...unconfirmed, confirm: false }]) {
          expect((await client.callTool({ name, arguments: arguments_ })).isError).toBe(true);
        }
        for (const method of Object.values(mock)) expect(method).not.toHaveBeenCalled();
      });
    });

    it('retains membership ownership, license, and unsupported-name protections', async () => {
      await withServer(async (client, mock) => {
        mock.listWorkspaceGroupMembers.mockResolvedValueOnce([]);
        expect((await client.callTool({ name: 'remove_workspace_group_member', arguments: { group_id: group, group_user_id: member, confirm: true } })).isError).toBe(true);
        expect(mock.removeWorkspaceGroupMember).not.toHaveBeenCalled();
        mock.getWorkspaceGroup.mockResolvedValueOnce({ id: group, name: 'Licensed group', type: 'custom', disabled: true } as any);
        expect((await client.callTool({ name: 'delete_workspace_group', arguments: { group_id: group, confirm: true } })).isError).toBe(true);
        expect(mock.deleteWorkspaceGroup).not.toHaveBeenCalled();
        expect((await client.callTool({ name: 'update_workspace_user', arguments: { organization_user_id: member, first_name: 'Invalid edit', confirm: true } })).isError).toBe(true);
        expect(mock.updateWorkspaceUser).not.toHaveBeenCalled();
      });
    });

    it('retains backend authorization failures and also validates direct calls', async () => {
      const mock = backend();
      mock.inviteWorkspaceUser.mockRejectedValueOnce(new Error('Forbidden'));
      const tools = managementActionTools(sources(mock as unknown as ToolJetClient));
      const invite = tools.find(t => t.name === 'invite_workspace_user')!;
      expect((await invite.handler({ email: 'observer@example.test', confirm: true })).isError).toBe(true);
      mock.inviteWorkspaceUser.mockClear();
      expect((await invite.handler({ email: 'observer@example.test', confirm: true, action: 'archive' })).isError).toBe(true);
      expect(mock.inviteWorkspaceUser).not.toHaveBeenCalled();
    });
  });

});
