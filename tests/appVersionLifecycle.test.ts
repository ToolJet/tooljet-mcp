import { describe, expect, it, vi } from 'vitest';
import { createAppVersionLifecycle } from '../src/appVersionLifecycle.js';
import { appVersionLifecycleTools } from '../src/tools/appVersionLifecycle.js';
import type { Auth } from '../src/auth.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

function fixture() {
  const envs = [
    { id: 'dev', name: 'development', priority: 1, enabled: true },
    { id: 'stage', name: 'staging', priority: 2, enabled: true },
    { id: 'prod', name: 'production', priority: 3, enabled: true },
  ];
  const rows = [
    { id: 'draft', name: 'Training draft', status: 'DRAFT', current_environment_id: 'dev', description: 'Initial sessions' },
    { id: 'stable', name: 'Stable schedule', status: 'PUBLISHED', current_environment_id: 'prod', description: '' },
  ];
  const state = { released: 'stable', deny: '', stalePromotion: false, staleMetadata: false, staleDeletion: false, canViewPromoted: true };
  const fetch = vi.fn(async (path: string, options?: RequestInit) => {
    if (state.deny && path.includes(state.deny) && options?.method) return new Response('Permission denied', { status: 403 });
    if (path === '/api/apps/training/versions') return Response.json({ versions: rows });
    if (path === '/api/app-environments?app_id=training') return Response.json({ environments: envs });
    if (path.startsWith('/api/app-environments/') && path.includes('/versions?app_id=training')) {
      const id = path.split('/')[3]; const selected = envs.find(e => e.id === id)!;
      return Response.json({ appVersions: rows.filter(v => envs.find(e => e.id === v.current_environment_id)!.priority >= selected.priority) });
    }
    const v = rows.find(v => path.includes(`/versions/${v.id}`));
    if (v && path.endsWith('/promote')) {
      const body = JSON.parse(options!.body as string);
      expect(body.currentEnvironmentId).toBe(v.current_environment_id);
      if (!state.stalePromotion) v.current_environment_id = envs[envs.findIndex(e => e.id === v.current_environment_id) + 1].id;
      return Response.json({ hasAccessToPromotedEnvironment: state.canViewPromoted });
    }
    if (v && options?.method === 'PUT') {
      if (!state.staleMetadata) Object.assign(v, JSON.parse(options.body as string));
      return new Response(null, { status: 204 });
    }
    if (v && options?.method === 'DELETE') {
      if (!state.staleDeletion) rows.splice(rows.indexOf(v), 1);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  const auth = { authedFetch: fetch } as unknown as Auth;
  const client = createAppVersionLifecycle(auth, async () => ({ id: 'training', current_version_id: state.released }));
  const writes = () => fetch.mock.calls.filter(([, options]) => options?.method);
  return { client, rows, envs, state, fetch, writes };
}

describe('app version lifecycle', () => {
  it('lists compact verified app versions and ordered environments', async () => {
    const f = fixture(); expect(await f.client.list('training')).toMatchObject({
      app_id: 'training', versions: [{ version_id: 'draft' }, { version_id: 'stable' }], environments: f.envs,
    }); expect(f.writes()).toEqual([]);
  });
  it('saves the draft and stops at staging without releasing', async () => {
    const f = fixture();
    expect(await f.client.promote('training', 'draft', 'staging')).toMatchObject({
      version_id: 'draft', current_environment_id: 'stage', promoted_to_environments: ['staging'], published_for_promotion: true,
    });
    expect(f.writes().map(([path]) => path)).toEqual(['/api/v2/apps/training/versions/draft', '/api/v2/apps/training/versions/draft/promote']);
    expect(f.state.released).toBe('stable');
  });
  it('promotes through staging to production without releasing', async () => {
    const f = fixture(); const result = await f.client.promote('training', 'draft', 'production');
    expect(result).toMatchObject({ current_environment_id: 'prod', promoted_to_environments: ['staging', 'production'] });
    expect(f.fetch.mock.calls.some(([p]) => p.endsWith('/release'))).toBe(false);
  });
  it('retries an already reached target without mutations', async () => {
    const f = fixture(); f.rows[0].current_environment_id = 'stage'; f.rows[0].status = 'PUBLISHED';
    await f.client.promote('training', 'draft', 'staging'); expect(f.writes()).toEqual([]);
  });
  it('does not switch the editor into a promoted environment without viewing access', async () => {
    const f = fixture(); f.state.canViewPromoted = false;
    const result = await f.client.promote('training', 'draft', 'staging');
    expect(result).toMatchObject({ promoted_environment_id: 'stage', has_access_to_promoted_environment: false });
    expect(result).not.toHaveProperty('current_environment_id');
  });
  it.each(['promote', 'switchEnvironment'] as const)('rejects a disabled destination before writes: %s', async action => {
    const f = fixture(); f.envs[1].enabled = false;
    await expect(f.client[action]('training', 'draft', 'staging')).rejects.toThrow('not enabled');
    expect(f.writes()).toEqual([]);
  });
  it.each(['missing', 'development'])('rejects invalid or backwards destinations before writes: %s', async destination => {
    const f = fixture(); f.rows[0].current_environment_id = 'stage';
    await expect(f.client.promote('training', 'draft', destination)).rejects.toThrow(); expect(f.writes()).toEqual([]);
  });
  it('refuses an ambiguous environment order before publishing', async () => {
    const f = fixture(); f.envs[1].priority = 1;
    await expect(f.client.promote('training', 'draft', 'production')).rejects.toThrow('promotion order'); expect(f.writes()).toEqual([]);
  });
  it('does not keep promoting after mismatched readback', async () => {
    const f = fixture(); f.state.stalePromotion = true;
    await expect(f.client.promote('training', 'draft', 'production')).rejects.toThrow('readback');
    expect(f.writes().filter(([p]) => p.endsWith('/promote'))).toHaveLength(1);
  });
  it('reports partial preparation on denied promotion without releasing or retrying', async () => {
    const f = fixture(); f.state.deny = '/promote';
    await expect(f.client.promote('training', 'draft', 'staging')).rejects.toThrow('Draft saved: true');
    expect(f.writes()).toHaveLength(2); expect(f.state.released).toBe('stable');
  });
  it('can select an earlier viewing environment without demotion', async () => {
    const f = fixture();
    expect(await f.client.switchEnvironment('training', 'stable', 'staging')).toMatchObject({ version_id: 'stable', current_environment_id: 'stage' });
    expect(f.rows[1].current_environment_id).toBe('prod'); expect(f.writes()).toEqual([]);
  });
  it('refuses viewing a version in an environment it has not reached', async () => {
    const f = fixture(); await expect(f.client.switchEnvironment('training', 'draft', 'staging')).rejects.toThrow('not available');
    expect(f.writes()).toEqual([]);
  });
  it.each(['promote', 'switchEnvironment', 'update', 'remove'] as const)('rejects a version outside the app: %s', async action => {
    const f = fixture();
    const run = action === 'update' ? f.client.update('training', 'foreign', { name: 'New' })
      : f.client[action]('training', 'foreign', action === 'remove' ? 'stable' : 'staging');
    await expect(run).rejects.toThrow(); expect(f.writes()).toEqual([]);
  });
  it('renames only the requested version and verifies the result', async () => {
    const f = fixture(); expect(await f.client.update('training', 'draft', { name: 'Workshop candidate' })).toMatchObject({ version_name: 'Workshop candidate', updated: true });
    expect(f.rows[0].description).toBe('Initial sessions'); expect(f.rows[1].name).toBe('Stable schedule');
  });
  it('updates or clears the description without changing status', async () => {
    const f = fixture(); await f.client.update('training', 'draft', { description: '' });
    expect(f.rows[0]).toMatchObject({ description: '', status: 'DRAFT', name: 'Training draft' });
  });
  it('does not change the viewing environment when renaming a promoted version', async () => {
    const f = fixture();
    const result = await f.client.update('training', 'stable', { name: 'Workshop release' });
    expect(result).not.toHaveProperty('current_environment_id');
    expect(f.rows[1].current_environment_id).toBe('prod');
  });
  it('detects metadata writes that did not persist', async () => {
    const f = fixture(); f.state.staleMetadata = true;
    await expect(f.client.update('training', 'draft', { name: 'Candidate' })).rejects.toThrow('could not be verified');
  });
  it('rejects empty metadata updates', async () => {
    const f = fixture(); await expect(f.client.update('training', 'draft', {})).rejects.toThrow('Provide'); expect(f.writes()).toEqual([]);
  });
  it('deletes a draft and selects the explicitly provided remaining version', async () => {
    const f = fixture(); expect(await f.client.remove('training', 'draft', 'stable')).toMatchObject({
      deleted: true, deleted_version_id: 'draft', version_id: 'stable', current_environment_id: 'prod',
    }); expect(f.rows).toHaveLength(1);
  });
  it('refuses deleting the released version', async () => {
    const f = fixture(); await expect(f.client.remove('training', 'stable', 'draft')).rejects.toThrow('released'); expect(f.writes()).toEqual([]);
  });
  it.each(['draft', 'missing'])('refuses an invalid fallback: %s', async fallback => {
    const f = fixture(); await expect(f.client.remove('training', 'draft', fallback)).rejects.toThrow(); expect(f.writes()).toEqual([]);
  });
  it('reports unverified deletion without retrying it', async () => {
    const f = fixture(); f.state.staleDeletion = true;
    await expect(f.client.remove('training', 'draft', 'stable')).rejects.toThrow('could not be verified'); expect(f.writes()).toHaveLength(1);
  });
  it('exposes strict confirmation and environment contracts', () => {
    const tools = appVersionLifecycleTools({} as ToolJetClient);
    expect(tools.map(t => t.name)).toEqual(['list_app_versions', 'promote_app_version', 'switch_app_environment', 'update_app_version', 'delete_app_version']);
    for (const name of ['promote_app_version', 'delete_app_version']) {
      expect(tools.find(t => t.name === name)!.inputSchema.confirm.safeParse(false).success).toBe(false);
    }
    expect(tools[1].inputSchema.environment_name.safeParse('development').success).toBe(false);
  });
});
