import { describe, expect, it, vi } from 'vitest';
import { createClient, type WorkspaceUser } from '../src/tooljetClient.js';
import { manageWorkspaceUsersTool } from '../src/tools/workspaceUserManagement.js';

const memberId = '71000000-0000-4000-8000-000000000001';
const groupIds = [1, 2, 3].map(n => `72000000-0000-4000-8000-00000000000${n}`);

// Models the existing API's replacement semantics, including its silent name refusal.
// All identities and metadata here are independently written synthetic fixtures.
function fixture() {
  let user: WorkspaceUser = { id: memberId, user_id: 'person-27', name: 'Robin Dale', first_name: 'Robin',
    last_name: 'Dale', email: 'robin@example.test', role: 'builder', status: 'active',
    groups: groupIds.slice(0, 2).map((id, i) => ({ id, name: ['Harbor Readers', 'Harbor Auditors'][i]! })),
    user_metadata: { region: 'West', shift: 'Morning' } };
  const groups = groupIds.map((id, i) => ({ id, name: ['Harbor Readers', 'Harbor Auditors', 'Harbor Dispatch'][i]!, type: 'custom', disabled: false }));
  let ignoreUpdate = false;
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    if (path.startsWith('/api/organization-users?')) {
      const page = Number(new URLSearchParams(path.split('?')[1]).get('page'));
      return Response.json({ users: page === 1 ? [] : [{ ...user, invitation_token: 'private-invitation', account_setup_token: 'private-setup' }],
        meta: { total_pages: 2, total_count: 11, current_page: page } });
    }
    if (path === '/api/v2/group-permissions') return Response.json({ groupPermissions: groups });
    if (path === `/api/organization-users/${memberId}` && init?.method === 'PUT') {
      const body = JSON.parse(String(init.body));
      if (!ignoreUpdate) user = { ...user, role: body.role ?? user.role,
        groups: body.addGroups.map((id: string) => ({ id, name: groups.find(group => group.id === id)!.name })),
        user_metadata: body.userMetadata ?? user.user_metadata };
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request ${path}`);
  });
  const client = createClient({ authedFetch: fetch } as any, {} as any);
  return { client, tool: manageWorkspaceUsersTool(client), fetch, groups,
    user: () => user, setUser: (value: Partial<WorkspaceUser>) => { user = { ...user, ...value }; },
    ignoreUpdate: () => { ignoreUpdate = true; },
    writes: () => fetch.mock.calls.filter(([, init]) => init?.method === 'PUT') };
}

describe('workspace user updates preserve unrelated state through the existing API', () => {
  it('adds a membership without removing either existing membership, changing names, role, or metadata', async () => {
    const f = fixture();
    const before = structuredClone(f.user());
    await f.client.updateWorkspaceUser(memberId, { addGroupIds: [groupIds[2]!, groupIds[2]!] });
    expect(f.user()).toEqual({ ...before, groups: [...before.groups!, { id: groupIds[2], name: 'Harbor Dispatch' }] });
    expect(f.writes()).toHaveLength(1);
    expect(JSON.parse(String(f.writes()[0]![1]!.body))).toEqual({ addGroups: groupIds });
    expect(f.fetch.mock.calls.filter(([path]) => path.includes('page=2'))).toHaveLength(2);
  });

  it('preserves memberships on role-only updates and merges only supplied metadata keys', async () => {
    const f = fixture();
    const before = structuredClone(f.user());
    await f.client.updateWorkspaceUser(memberId, { role: 'admin' });
    expect(f.user()).toEqual({ ...before, role: 'admin' });
    await f.client.updateWorkspaceUser(memberId, { userMetadata: { shift: 'Evening' } });
    expect(f.user()).toEqual({ ...before, role: 'admin', user_metadata: { region: 'West', shift: 'Evening' } });
  });

  it('does not rewrite memberships for an already-satisfied request', async () => {
    const f = fixture();
    const before = structuredClone(f.user());
    expect(await f.client.updateWorkspaceUser(memberId, { addGroupIds: [groupIds[0]!], role: 'builder',
      userMetadata: { shift: 'Morning' } })).toEqual(before);
    expect(f.writes()).toHaveLength(0);
  });

  it.each([{ firstName: 'Taylor' }, { lastName: 'Vega' }, { firstName: 'Taylor', role: 'admin', addGroupIds: [groupIds[2]] }])(
    'rejects the entire name request before reading or writing: %j', async params => {
      const f = fixture();
      await expect(f.client.updateWorkspaceUser(memberId, params as any)).rejects.toThrow(/Super Admin/);
      expect(f.fetch).not.toHaveBeenCalled();
    });

  it.each([{ first_name: 'Taylor' }, { last_name: 'Vega', group_ids: [groupIds[2]] }])(
    'refuses unsupported names without asking for confirmation: %j', async fields => {
      const f = fixture();
      const result = await f.tool.handler({ action: 'update', organization_user_id: memberId, ...fields });
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain('Super Admin');
      expect(f.fetch).not.toHaveBeenCalled();
    });

  it.each([
    { action: 'update', email: 'someone@example.test', role: 'builder' },
    { action: 'archive', group_ids: [groupIds[2]] },
    { action: 'unarchive', role: 'admin' },
    { action: 'invite', email: 'person@example.test', user_metadata: { tier: 'A' } },
    { action: 'update', remove_group_ids: [groupIds[0]], role: 'builder' },
  ])('rejects ignored or unknown fields instead of applying a partial request: %j', async input => {
    const f = fixture();
    expect((await f.tool.handler({ organization_user_id: memberId, confirm: true, ...input } as any)).isError).toBe(true);
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it('does not interpret empty additions as removing all groups', async () => {
    const f = fixture();
    await expect(f.client.updateWorkspaceUser(memberId, { addGroupIds: [] })).rejects.toThrow(/never removes/);
    expect(f.fetch).not.toHaveBeenCalled();
    await f.client.updateWorkspaceUser(memberId, { role: 'builder', addGroupIds: [] });
    expect(f.user().groups!.map(group => group.id)).toEqual(groupIds.slice(0, 2));
  });

  it.each(['disabled', 'default', 'missing', 'hidden-memberships', 'archived', 'missing-metadata'])('refuses unsafe %s state before any write', async kind => {
    const f = fixture();
    if (kind === 'disabled' || kind === 'hidden-memberships') f.groups[0]!.disabled = true;
    if (kind === 'default') f.groups[2]!.type = 'default';
    if (kind === 'missing') f.groups.pop();
    if (kind === 'hidden-memberships') f.setUser({ groups: [] });
    if (kind === 'archived') f.setUser({ status: 'archived' });
    if (kind === 'missing-metadata') { const user = f.user(); delete user.user_metadata; }
    await expect(f.client.updateWorkspaceUser(memberId, kind === 'missing-metadata' ? { userMetadata: { shift: 'Night' } } : { addGroupIds: [groupIds[2]!] })).rejects.toThrow();
    expect(f.writes()).toHaveLength(0);
  });

  it('never reports a successful HTTP response as a verified update when the change did not persist', async () => {
    const f = fixture();
    f.ignoreUpdate();
    const result = await f.tool.handler({ action: 'update', organization_user_id: memberId, role: 'admin', confirm: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/accepted.*could not be verified/);
    expect(f.writes()).toHaveLength(1);
  });

  it('does not expose account setup or invitation credentials to the model', async () => {
    const f = fixture();
    const result = await f.client.listWorkspaceUsers({ page: 2 });
    expect(result.users[0]).toEqual(f.user());
    expect(JSON.stringify(result)).not.toContain('private-');
  });
});
