import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
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
