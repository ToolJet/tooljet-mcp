import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { listWorkspaceGroupsTool, manageWorkspaceGroupsTool } from '../src/tools/workspaceGroupManagement.js';

const groupId = '10000000-0000-4000-8000-000000000001';
const membershipId = '20000000-0000-4000-8000-000000000002';
const resourceId = '30000000-0000-4000-8000-000000000003';
const ruleId = '40000000-0000-4000-8000-000000000004';
const rule = { id: ruleId, name: 'Inventory readers', type: 'app', is_all: false,
  actions: { canView: true, canEdit: false, canAccessReleased: true },
  resources: [{ id: resourceId, name: 'Inventory', membership_id: membershipId }] };
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
    updateWorkspaceGroupPermissions: vi.fn(),
    duplicateWorkspaceGroup: vi.fn().mockResolvedValue({ ...group, name: 'Field Operations copy' }),
    listWorkspaceGroupAccess: vi.fn().mockResolvedValue([rule]),
    listWorkspaceGroupResources: vi.fn().mockResolvedValue([{ id: resourceId, name: 'Inventory' }]),
    writeWorkspaceGroupAccess: vi.fn(),
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

const accessOperations = [
  { action: 'duplicate', group_id: groupId, copy: { permissions: true, apps: true } },
  { action: 'update_permissions', group_id: groupId, permissions: { appCreate: true, appDelete: false } },
  { action: 'create_access', group_id: groupId, resource_type: 'app',
    access: { name: 'Inventory readers', is_all: false, actions: { canView: true }, resource_ids: [resourceId] } },
  { action: 'update_access', group_id: groupId, rule_id: ruleId, access: { actions: { canEdit: true } } },
  { action: 'delete_access', group_id: groupId, rule_id: ruleId },
];

describe('workspace group permissions and duplication', () => {
  it('adds a resource without removing existing access or changing unrelated permissions', async () => {
    const { write, mock } = fixture();
    const added = '30000000-0000-4000-8000-000000000009';
    mock.listWorkspaceGroupResources.mockResolvedValue([{ id: resourceId, name: 'Inventory' }, { id: added, name: 'Harbor schedule' }]);
    const result = await write.handler({ action: 'update_access', group_id: groupId, rule_id: ruleId,
      access: { add_resource_ids: [added] }, confirm: true });
    expect(result.isError).not.toBe(true);
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledWith('PUT', groupId, 'app', ruleId, {
      isAll: false, actions: rule.actions, resourcesToAdd: [{ appId: added }], resourcesToDelete: [], allowRoleChange: false,
    });
  });
  it('removes only the selected resource relation and preserves another resource', async () => {
    const { write, mock } = fixture();
    const kept = '30000000-0000-4000-8000-000000000009';
    mock.listWorkspaceGroupAccess.mockResolvedValue([{ ...rule, resources: [...rule.resources,
      { id: kept, name: 'Harbor schedule', membership_id: 'kept-membership' }] }]);
    expect((await write.handler({ action: 'update_access', group_id: groupId, rule_id: ruleId,
      access: { remove_resource_ids: [resourceId] }, confirm: true })).isError).not.toBe(true);
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledWith('PUT', groupId, 'app', ruleId,
      expect.objectContaining({ resourcesToAdd: [], resourcesToDelete: [{ id: membershipId }], actions: rule.actions }));
  });
  it.each([
    { add_resource_ids: [resourceId], resource_ids: [resourceId] },
    { add_resource_ids: [resourceId], is_all: true },
    { add_resource_ids: [resourceId], remove_resource_ids: [resourceId] },
    { add_resource_ids: [resourceId, resourceId] },
    { remove_resource_ids: ['30000000-0000-4000-8000-000000000009'] },
    { remove_resource_ids: [resourceId] },
  ])('refuses conflicting or empty access scope before writing: %j', async access => {
    const { write, mock } = fixture();
    expect((await write.handler({ action: 'update_access', group_id: groupId, rule_id: ruleId, access, confirm: true })).isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });
  it('does not silently narrow an all-resources rule for an individual-resource change', async () => {
    const { write, mock } = fixture();
    mock.listWorkspaceGroupAccess.mockResolvedValue([{ ...rule, is_all: true, resources: [] }]);
    expect((await write.handler({ action: 'update_access', group_id: groupId, rule_id: ruleId,
      access: { add_resource_ids: [resourceId] }, confirm: true })).isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });
  it.each(accessOperations)('requires explicit confirmation for $action', async operation => {
    const { write, mock } = fixture();
    expect((await write.handler(operation)).isError).toBe(true);
    for (const method of Object.values(mock)) expect(method).not.toHaveBeenCalled();
  });
  it.each(accessOperations)('executes $action', async operation => {
    const { write } = fixture();
    expect((await write.handler({ ...operation, confirm: true })).isError).not.toBe(true);
  });
  it('reads rules and selectable resources without exposing mutations', async () => {
    const { read, mock } = fixture();
    const result = JSON.parse((await read.handler({ group_id: groupId, include_permissions: true, resource_type: 'app' })).content[0]!.text);
    expect(result.access_rules).toEqual([rule]);
    expect(result.resources).toEqual([{ id: resourceId, name: 'Inventory' }]);
    expect(mock.listWorkspaceGroupAccess).toHaveBeenCalledWith(groupId);
    expect((await read.handler({ include_permissions: true })).isError).toBe(true);
  });
  it('copies only the selected categories', async () => {
    const { write, mock } = fixture();
    await write.handler({ ...accessOperations[0], confirm: true });
    expect(mock.duplicateWorkspaceGroup).toHaveBeenCalledWith(groupId, {
      addPermission: true, addApps: true, addUsers: false, addModules: false, addWorkflows: false, addDataSource: false,
    });
  });
  it('updates only supplied switches and does not authorize role changes implicitly', async () => {
    const { write, mock } = fixture();
    await write.handler({ ...accessOperations[1], confirm: true });
    expect(mock.updateWorkspaceGroupPermissions).toHaveBeenCalledWith(groupId, { appCreate: true, appDelete: false }, undefined);
  });
  it('preserves unrelated actions and memberships while switching the exclusive permission', async () => {
    const { write, mock } = fixture();
    await write.handler({ ...accessOperations[3], confirm: true });
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledWith('PUT', groupId, 'app', ruleId, {
      isAll: false, actions: { canView: false, canEdit: true, canAccessReleased: true },
      resourcesToAdd: [], resourcesToDelete: [], allowRoleChange: false,
    });
  });
  it('uses exact relation IDs when replacing the resource selection', async () => {
    const { write, mock } = fixture();
    await write.handler({ ...accessOperations[3], access: { is_all: true }, confirm: true });
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledWith('PUT', groupId, 'app', ruleId, expect.objectContaining({
      isAll: true, resourcesToAdd: [], resourcesToDelete: [{ id: membershipId }],
    }));
  });
  it.each(['app', 'module', 'workflow', 'data_source'])('creates %s access using the API shape', async type => {
    const { write, mock } = fixture();
    const actions = type === 'data_source' ? { canUse: true } : { canView: true };
    const expectedActions = type === 'data_source' ? { canUse: true, canConfigure: false } : type === 'app'
      ? { canEdit: false, canView: true, hideFromDashboard: false, canAccessDevelopment: false,
          canAccessStaging: false, canAccessProduction: false, canAccessReleased: false } : { canEdit: false, canView: true, ...(type === 'module' ? { hideFromDashboard: false } : {}) };
    const result = await write.handler({ ...accessOperations[2], resource_type: type,
      access: { name: 'Resource viewers', is_all: false, actions, resource_ids: [resourceId] }, confirm: true });
    expect(result.isError).not.toBe(true);
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledWith('POST', groupId, type, undefined, {
      name: 'Resource viewers', type, groupId, isAll: false,
      createResourcePermissionObject: { ...(type === 'data_source' ? { action: expectedActions } : expectedActions),
        resourcesToAdd: [{ [type === 'data_source' ? 'dataSourceId' : 'appId']: resourceId }] },
    });
  });
  it.each(['update_access', 'delete_access'])('rejects a rule from a different group for %s', async action => {
    const { write, mock } = fixture();
    mock.listWorkspaceGroupAccess.mockResolvedValue([]);
    const result = await write.handler({ action, group_id: groupId, rule_id: ruleId,
      ...(action === 'update_access' ? { access: { name: 'Other' } } : {}), confirm: true });
    expect(result.isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });
  it('rejects resources not in the current workspace and resource type', async () => {
    const { write, mock } = fixture();
    mock.listWorkspaceGroupResources.mockResolvedValue([]);
    expect((await write.handler({ ...accessOperations[2], confirm: true })).isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });
  it.each(accessOperations.slice(1))('protects default Admin permissions for $action', async operation => {
    const { write, mock } = fixture();
    mock.getWorkspaceGroup.mockResolvedValue({ ...group, name: 'admin', type: 'default' });
    expect((await write.handler({ ...operation, confirm: true })).isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
    expect(mock.updateWorkspaceGroupPermissions).not.toHaveBeenCalled();
  });
  it('allows default Builder permission updates subject to backend authorization', async () => {
    const { write, mock } = fixture();
    mock.getWorkspaceGroup.mockResolvedValue({ ...group, name: 'builder', type: 'default' });
    expect((await write.handler({ ...accessOperations[1], confirm: true })).isError).not.toBe(true);
    mock.updateWorkspaceGroupPermissions.mockRejectedValueOnce(new Error('License does not permit this change'));
    expect((await write.handler({ ...accessOperations[1], confirm: true })).content[0]!.text).toContain('License');
  });
  it.each([
    { ...accessOperations[1], permissions: {} },
    { ...accessOperations[1], permissions: { guessedPermission: true } },
    { ...accessOperations[0], copy: { unknown: true } },
    { ...accessOperations[2], access: { name: 'Invalid', is_all: false, actions: { canView: true }, resource_ids: [] } },
    { ...accessOperations[2], access: { name: 'Invalid', is_all: true, actions: { canView: true }, resource_ids: [resourceId] } },
    { ...accessOperations[2], access: { name: 'Invalid', is_all: false, actions: { canView: true }, resource_ids: [resourceId, resourceId] } },
    { ...accessOperations[2], access: { name: 'Invalid', is_all: true, actions: { canUse: true } } },
    { ...accessOperations[2], allow_role_change: true },
    { ...accessOperations[3], access: {} },
    { ...accessOperations[4], access: { name: 'Ignored' } },
  ])('rejects invalid permission payloads: %j', async operation => {
    const { write, mock } = fixture();
    expect((await write.handler({ ...operation, confirm: true })).isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
    expect(mock.updateWorkspaceGroupPermissions).not.toHaveBeenCalled();
    expect(mock.duplicateWorkspaceGroup).not.toHaveBeenCalled();
  });
});

describe('review regressions', () => {
  it.each(['app', 'module', 'workflow', 'data_source'])('round-trips partial %s permission downgrades and upgrades', async type => {
    const { write, read, mock } = fixture();
    const [higher, lower] = type === 'data_source' ? ['canConfigure', 'canUse'] : ['canEdit', 'canView'];
    let saved = { ...rule, type, actions: { [higher]: true, [lower]: false } };
    mock.listWorkspaceGroupAccess.mockImplementation(async () => [saved]);
    mock.writeWorkspaceGroupAccess.mockImplementation(async (_method, _group, _type, _id, body) => {
      const actions = { ...body.actions };
      // The app backend gives edit priority if both flags are supplied; data sources save verbatim.
      if (type !== 'data_source' && actions.canEdit) actions.canView = false;
      saved = { ...saved, actions };
    });
    for (const enabled of [lower, higher]) {
      const result = await write.handler({ action: 'update_access', group_id: groupId, rule_id: ruleId,
        access: { actions: { [enabled]: true } }, confirm: true });
      expect(result.isError).not.toBe(true);
      const snapshot = JSON.parse((await read.handler({ group_id: groupId, include_permissions: true })).content[0]!.text);
      expect(snapshot.access_rules[0].actions).toEqual({ [higher]: enabled === higher, [lower]: enabled === lower });
    }
  });
  it.each(['app', 'module', 'workflow', 'data_source'])('rejects conflicting %s actions on create and update', async type => {
    const { write, mock } = fixture();
    mock.listWorkspaceGroupAccess.mockResolvedValue([{ ...rule, type }]);
    const actions = type === 'data_source' ? { canConfigure: true, canUse: true } : { canEdit: true, canView: true };
    for (const action of ['create_access', 'update_access']) {
      const result = await write.handler({ action, group_id: groupId, resource_type: type,
        ...(action === 'update_access' ? { rule_id: ruleId } : {}),
        access: { name: 'Conflicting rule', is_all: true, actions }, confirm: true });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('cannot both be enabled');
    }
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });
  it.each([...operations.slice(1), ...accessOperations])('blocks disabled groups for $action', async operation => {
    const { write, mock } = fixture();
    mock.getWorkspaceGroup.mockResolvedValue({ ...group, disabled: true });
    const result = await write.handler({ ...operation, confirm: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('license/plan');
    for (const [name, method] of Object.entries(mock)) if (name !== 'getWorkspaceGroup') expect(method).not.toHaveBeenCalled();
  });
  it.each([{}, { permissions: false, members: false }])('rejects duplication with no selected category: %j', async copy => {
    const { write, mock } = fixture();
    const result = await write.handler({ action: 'duplicate', group_id: groupId, copy, confirm: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('at least one category');
    expect(mock.duplicateWorkspaceGroup).not.toHaveBeenCalled();
  });
});


describe('access resource-type selectors', () => {
  it('accepts a redundant matching type without requiring a second action', async () => {
    const { write, mock } = fixture();
    expect((await write.handler({ ...accessOperations[3], resource_type: 'app', confirm: true })).isError).not.toBe(true);
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledTimes(1);
  });
  it('rejects a conflicting type without writing', async () => {
    const { write, mock } = fixture();
    expect((await write.handler({ ...accessOperations[3], resource_type: 'data_source', confirm: true })).isError).toBe(true);
    expect(mock.writeWorkspaceGroupAccess).not.toHaveBeenCalled();
  });
  it('supports the module dashboard visibility switch', async () => {
    const { write, mock } = fixture();
    mock.listWorkspaceGroupAccess.mockResolvedValue([{ ...rule, type: 'module' }]);
    expect((await write.handler({ ...accessOperations[3], access: { actions: { hideFromDashboard: true } }, confirm: true })).isError).not.toBe(true);
    expect(mock.writeWorkspaceGroupAccess).toHaveBeenCalledWith('PUT', groupId, 'module', ruleId,
      expect.objectContaining({ actions: expect.objectContaining({ hideFromDashboard: true }) }));
  });
});
