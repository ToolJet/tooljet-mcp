import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
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

    expect(mock.listWorkspaceApps).toHaveBeenCalledWith({ page: 2, searchText: 'orders' });
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
    mock.updateWorkspaceUser.mockResolvedValue(undefined);
    const id = '00000000-0000-4000-8000-000000000001';
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
    expect(body(result)).toEqual({ organization_user_id: id, updated: true });
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
