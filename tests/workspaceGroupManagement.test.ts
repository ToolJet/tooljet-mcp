import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { listWorkspaceGroupsTool, manageWorkspaceGroupsTool } from '../src/tools/workspaceGroupManagement.js';

const groupId = '10000000-0000-4000-8000-000000000001';
const membershipId = '20000000-0000-4000-8000-000000000002';
const group = { id: groupId, name: 'Field Operations', type: 'custom' };
function fixture() {
  const mock = {
    listWorkspaceGroups: vi.fn().mockResolvedValue([group]),
    getWorkspaceGroup: vi.fn().mockResolvedValue(group),
    listWorkspaceGroupMembers: vi.fn().mockResolvedValue([{ group_user_id: membershipId, user_id: 'person-9' }]),
    createWorkspaceGroup: vi.fn().mockResolvedValue(group),
    renameWorkspaceGroup: vi.fn(),
    deleteWorkspaceGroup: vi.fn(),
    removeWorkspaceGroupMember: vi.fn(),
  };
  const client = mock as unknown as ToolJetClient;
  return { mock, read: listWorkspaceGroupsTool(client), write: manageWorkspaceGroupsTool(client) };
}
const operations = [
  { action: 'create', name: 'Field Operations' },
  { action: 'rename', group_id: groupId, name: 'Regional Operations' },
  { action: 'delete', group_id: groupId },
  { action: 'remove_member', group_id: groupId, group_user_id: membershipId },
];

describe('workspace group management', () => {
  it('discovers groups and exact member ids without requiring mutation confirmation', async () => {
    const { read, mock } = fixture();
    expect(JSON.parse((await read.handler({})).content[0]!.text)).toEqual({ groups: [group] });
    const result = await read.handler({ group_id: groupId });
    expect(JSON.parse(result.content[0]!.text).members[0].group_user_id).toBe(membershipId);
    expect(mock.listWorkspaceGroupMembers).toHaveBeenCalledWith(groupId);
  });

  it.each(operations)('requires confirmation for $action', async (operation) => {
    const { write, mock } = fixture();
    const result = await write.handler(operation);
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('confirm:true');
    for (const method of Object.values(mock)) expect(method).not.toHaveBeenCalled();
  });

  it.each(operations)('executes the confirmed $action against the exact target', async (operation) => {
    const { write, mock } = fixture();
    const result = await write.handler({ ...operation, confirm: true });
    expect(result.isError).not.toBe(true);
    if (operation.action === 'create') expect(mock.createWorkspaceGroup).toHaveBeenCalledWith(operation.name);
    if (operation.action === 'rename') expect(mock.renameWorkspaceGroup).toHaveBeenCalledWith(groupId, operation.name);
    if (operation.action === 'delete') expect(mock.deleteWorkspaceGroup).toHaveBeenCalledWith(groupId);
    if (operation.action === 'remove_member') expect(mock.removeWorkspaceGroupMember).toHaveBeenCalledWith(membershipId);
  });

  it.each(operations.slice(1))('protects default role groups from $action', async (operation) => {
    const { write, mock } = fixture();
    mock.getWorkspaceGroup.mockResolvedValue({ ...group, type: 'default' });
    expect((await write.handler({ ...operation, confirm: true })).isError).toBe(true);
    expect(mock.renameWorkspaceGroup).not.toHaveBeenCalled();
    expect(mock.deleteWorkspaceGroup).not.toHaveBeenCalled();
    expect(mock.removeWorkspaceGroupMember).not.toHaveBeenCalled();
  });

  it('does not remove a membership from a different group or a stale membership', async () => {
    const { write, mock } = fixture();
    mock.listWorkspaceGroupMembers.mockResolvedValue([]);
    expect((await write.handler({ ...operations[3], confirm: true })).isError).toBe(true);
    expect(mock.removeWorkspaceGroupMember).not.toHaveBeenCalled();
  });

  it('propagates authorization failures without attempting a mutation', async () => {
    const { write, mock } = fixture();
    mock.getWorkspaceGroup.mockRejectedValue(new Error('Forbidden in this workspace'));
    const result = await write.handler({ ...operations[2], confirm: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Forbidden');
    expect(mock.deleteWorkspaceGroup).not.toHaveBeenCalled();
  });

  it.each(['create', 'rename'])('enforces the database name limit for %s', async (action) => {
    const { write, mock } = fixture();
    const selector = action === 'rename' ? { group_id: groupId } : {};
    expect((await write.handler({ action, ...selector, name: 'G'.repeat(51), confirm: true })).isError).toBe(true);
    for (const method of Object.values(mock)) expect(method).not.toHaveBeenCalled();
    expect((await write.handler({ action, ...selector, name: `  ${'G'.repeat(50)}  `, confirm: true })).isError).not.toBe(true);
    if (action === 'create') expect(mock.createWorkspaceGroup).toHaveBeenCalledWith('G'.repeat(50));
    else expect(mock.renameWorkspaceGroup).toHaveBeenCalledWith(groupId, 'G'.repeat(50));
  });

  it.each([
    { action: 'create', name: '   ' },
    { action: 'rename', group_id: groupId },
    { action: 'delete', group_id: groupId, name: 'Unexpected' },
    { action: 'remove_member', group_id: groupId },
    { action: 'create', name: 'Dispatch', group_id: groupId },
    { action: 'delete', group_id: '../outside' },
    { action: 'create', name: 'Dispatch', organization_id: groupId },
  ])('rejects invalid selectors before accessing ToolJet: %j', async (input) => {
    const { write, mock } = fixture();
    expect((await write.handler({ ...input, confirm: true })).isError).toBe(true);
    for (const method of Object.values(mock)) expect(method).not.toHaveBeenCalled();
  });
});
