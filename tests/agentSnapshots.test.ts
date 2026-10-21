import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SNAPSHOT_IDLE_MS,
  clearAgentSnapshotsForTests,
  snapshotBeforeWrite,
  withSnapshotNote,
} from '../src/agentSnapshots.js';
import { createSnapshotTool } from '../src/tools/createSnapshot.js';
import type { ToolJetClient, VersionSnapshotResult } from '../src/tooljetClient.js';
import { ok } from '../src/tools/types.js';

const app = '11111111-1111-4111-8111-111111111111';
const version = '22222222-2222-4222-8222-222222222222';
const taken: VersionSnapshotResult = { ok: true, id: 'snap1', reused: false, seeChangesUrl: 'http://tj/final/apps/a?compare=snapshot:snap1' };
const refused: VersionSnapshotResult = { ok: false, status: 451, reason: 'not_in_plan', upgradeUrl: 'http://tj/final/apps/a?compare=upgrade', detail: 'plan' };

function clientWith(...results: Array<VersionSnapshotResult | Error>) {
  const createVersionSnapshot = vi.fn();
  for (const r of results) {
    if (r instanceof Error) createVersionSnapshot.mockRejectedValueOnce(r);
    else createVersionSnapshot.mockResolvedValueOnce(r);
  }
  return { client: { createVersionSnapshot } as unknown as ToolJetClient, createVersionSnapshot };
}

const textOf = (result: { content: Array<{ text: string }> }) => JSON.parse(result.content[0]!.text);

describe('snapshots before agent writes', () => {
  beforeEach(() => clearAgentSnapshotsForTests());

  it('keeps a copy before the first write of a change and gives the agent the compare link once', async () => {
    const { client, createVersionSnapshot } = clientWith(taken);
    let clock = 1_000;
    const first = await snapshotBeforeWrite(client, 'update_components', { app_id: app, version_id: version }, () => clock);
    expect(createVersionSnapshot).toHaveBeenCalledWith(app, version, 'Before agent edits');
    expect(first).toMatchObject({ status: 'taken', id: 'snap1', see_changes_url: taken.ok && taken.seeChangesUrl });

    clock += SNAPSHOT_IDLE_MS - 1;
    expect(await snapshotBeforeWrite(client, 'add_components', { app_id: app, version_id: version }, () => clock)).toBeUndefined();
    expect(createVersionSnapshot).toHaveBeenCalledTimes(1);
  });

  it('starts a new change after a long pause', async () => {
    const { client, createVersionSnapshot } = clientWith(taken, { ...taken, id: 'snap2', seeChangesUrl: 'u2' } as VersionSnapshotResult);
    let clock = 0;
    await snapshotBeforeWrite(client, 'update_layout', { app_id: app, version_id: version }, () => clock);
    clock += SNAPSHOT_IDLE_MS + 1;
    const second = await snapshotBeforeWrite(client, 'update_layout', { app_id: app, version_id: version }, () => clock);
    expect(createVersionSnapshot).toHaveBeenCalledTimes(2);
    expect(second).toMatchObject({ status: 'taken', id: 'snap2' });
  });

  it('reads apply_app_phase\'s version from its plan and skips calls without a version', async () => {
    const { client, createVersionSnapshot } = clientWith(taken);
    expect(await snapshotBeforeWrite(client, 'apply_app_phase', { app_id: app, plan_token: 'unknown' })).toBeUndefined();
    expect(await snapshotBeforeWrite(client, 'add_pages', { app_id: app })).toBeUndefined();
    expect(createVersionSnapshot).not.toHaveBeenCalled();
  });

  it('leaves reads, workspace tools and new apps alone', async () => {
    const { client, createVersionSnapshot } = clientWith(taken);
    for (const name of ['get_app_summary', 'run_query', 'create_app', 'create_tables', 'manage_theme']) {
      expect(await snapshotBeforeWrite(client, name, { app_id: app, version_id: version })).toBeUndefined();
    }
    expect(createVersionSnapshot).not.toHaveBeenCalled();
  });

  it('tells the agent once when the plan has no compare, and never blocks the write', async () => {
    const { client } = clientWith(refused, refused);
    let clock = 0;
    const first = await snapshotBeforeWrite(client, 'update_components', { app_id: app, version_id: version }, () => clock);
    expect(first).toMatchObject({ status: 'not_in_plan', upgrade_url: refused.ok ? '' : refused.upgradeUrl });
    expect(first?.note).toMatch(/final handoff only/);
    clock += SNAPSHOT_IDLE_MS + 1;
    expect(await snapshotBeforeWrite(client, 'update_components', { app_id: app, version_id: version }, () => clock)).toBeUndefined();
  });

  it('says nothing when the user cannot edit, the server has no snapshots, or the call fails', async () => {
    const noAccess: VersionSnapshotResult = { ok: false, status: 403, reason: 'no_access', upgradeUrl: 'x', detail: '' };
    const missing: VersionSnapshotResult = { ok: false, status: 404, reason: 'unavailable', upgradeUrl: 'x', detail: '' };
    for (const result of [noAccess, missing, new Error('network')]) {
      clearAgentSnapshotsForTests();
      const { client } = clientWith(result);
      expect(await snapshotBeforeWrite(client, 'update_components', { app_id: app, version_id: version })).toBeUndefined();
    }
  });

  it('stays quiet when the version is unchanged since the AI chat kept its copy for this turn', async () => {
    const { client } = clientWith({ ok: true, id: 'turn', reused: true, reason: 'ai_turn', seeChangesUrl: 'u' });
    expect(await snapshotBeforeWrite(client, 'update_components', { app_id: app, version_id: version })).toBeUndefined();
  });

  it('works with a client that cannot snapshot', async () => {
    expect(await snapshotBeforeWrite({} as ToolJetClient, 'update_components', { app_id: app, version_id: version })).toBeUndefined();
  });
});

describe('the snapshot note on a tool result', () => {
  const note = { status: 'taken' as const, id: 's', reused: false, see_changes_url: 'u', note: 'n' };

  it('joins a JSON result', () => {
    expect(textOf(withSnapshotNote(ok({ updated: 2 }), note))).toEqual({ updated: 2, snapshot: note });
  });

  it('adds an item beside a plain-text result and leaves errors and empty notes alone', () => {
    const plain = withSnapshotNote({ content: [{ type: 'text', text: 'done' }] }, note);
    expect(plain.content).toHaveLength(2);
    expect(JSON.parse(plain.content[1]!.text)).toEqual({ snapshot: note });
    const error = { content: [{ type: 'text' as const, text: 'Error: x' }], isError: true };
    expect(withSnapshotNote(error, note)).toBe(error);
    const result = ok({ a: 1 });
    expect(withSnapshotNote(result, undefined)).toBe(result);
  });
});

describe('create_snapshot', () => {
  it('returns the compare link, the plan refusal, or an error', async () => {
    const { client } = clientWith(taken, refused, { ok: false, status: 403, reason: 'no_access', upgradeUrl: 'x', detail: '' });
    const tool = createSnapshotTool(client);
    expect(textOf(await tool.handler({ app_id: app, version_id: version, label: 'Before pricing' }))).toMatchObject({
      status: 'taken', id: 'snap1', see_changes_url: taken.ok && taken.seeChangesUrl,
    });
    expect(textOf(await tool.handler({ app_id: app, version_id: version }))).toMatchObject({ status: 'not_in_plan' });
    const denied = await tool.handler({ app_id: app, version_id: version });
    expect(denied.isError).toBe(true);
    expect(denied.content[0]!.text).toMatch(/can edit this app/);
  });
});

describe('who gets snapshots', () => {
  it('coding agents with a PAT do; the in-product chat (a ToolJet session) and an opt-out do not', async () => {
    const { createClient } = await import('../src/tooljetClient.js');
    const auth = {} as any;
    const base = { apiUrl: 'http://tj', appUrl: 'http://tj' } as any;
    expect(createClient(auth, { ...base, pat: 'p' }).createVersionSnapshot).toBeTypeOf('function');
    expect(createClient(auth, { ...base, sessionToken: 's', workspaceId: 'w' }).createVersionSnapshot).toBeUndefined();
    vi.stubEnv('TOOLJET_MCP_AGENT_SNAPSHOTS', 'off');
    try {
      expect(createClient(auth, { ...base, pat: 'p' }).createVersionSnapshot).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
