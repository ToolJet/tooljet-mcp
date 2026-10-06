import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env, hasEnvCredential } from '../src/config.js';
import { loadStore, normalizeUrl, saveStore, urlCandidates, assertProfileName, importCredential, suggestName } from '../src/profiles/store.js';
import { profilesPath } from '../src/profiles/paths.js';
import { NoProfileError, resolveStartup } from '../src/profiles/resolve.js';
import { scopeKey, setActiveScope } from '../src/profiles/scope.js';
import { createSwitchableClient } from '../src/switchableClient.js';
import { clearAppPlansForTests, consumeAppPlan, storeAppPlan } from '../src/appPlanStore.js';
import { createProfileSession } from '../src/profiles/session.js';
import { checkLogin } from '../src/profiles/checkLogin.js';
import { identifyAgent } from '../src/profiles/agentId.js';
import { newerVersion } from '../src/profiles/version.js';
import { TOOLJET_MCP_VERSION as V } from '../src/runtimeFreshness.js';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { uninstall } from '../src/cli/commands.js';
import { shimPath, writeShim } from '../src/setup.js';
import { homeDir } from '../src/profiles/paths.js';
import { existsSync } from 'node:fs';
import type { AgentAdapter, Connection } from '../src/cli/agents/shared.js';

const ENV_KEYS = ['TOOLJET_MCP_HOME', 'TOOLJET_MCP_BIN_DIR', 'TOOLJET_PAT', 'TOOLJET_URL', 'TOOLJET_DEPLOYMENT_URL', 'TOOLJET_APP_URL',
  'TOOLJET_SESSION_TOKEN', 'TOOLJET_WORKSPACE_ID', 'TOOLJET_PROFILE', 'TOOLJET_AGENT', 'TOOLJET_MCP_NO_AUTO_SETUP'];
let dir: string;

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  dir = mkdtempSync(join(tmpdir(), 'tj-profiles-'));
  process.env.TOOLJET_MCP_HOME = join(dir, 'home');
  setActiveScope(undefined);
  clearAppPlansForTests();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  rmSync(dir, { recursive: true, force: true });
  for (const k of ENV_KEYS) delete process.env[k];
});

const two = (agentDefaults: Record<string, string> = {}) => saveStore({
  version: V,
  agentDefaults,
  active: 'alpha',
  profiles: { alpha: { url: 'https://alpha.example.com', pat: 'tj_pat_a' }, beta: { url: 'https://beta.example.com', pat: 'tj_pat_b' } },
});

describe('env()', () => {
  it('treats an unexpanded ${PLACEHOLDER} as unset', () => {
    process.env.TOOLJET_PAT = '${TOOLJET_PAT}';
    expect(env('TOOLJET_PAT')).toBeUndefined();
    expect(hasEnvCredential()).toBe(false);
  });

  it('keeps a real value, and treats blank as unset', () => {
    process.env.TOOLJET_PAT = ' tj_pat_x ';
    expect(env('TOOLJET_PAT')).toBe('tj_pat_x');
    process.env.TOOLJET_PAT = '   ';
    expect(env('TOOLJET_PAT')).toBeUndefined();
  });
});

describe('profile store', () => {
  it('starts empty when nothing is saved', () => {
    expect(loadStore()).toEqual({ version: V, active: '', agentDefaults: {}, profiles: {} });
  });

  it('treats an emptied file as no profiles, and can build it again', () => {
    mkdirSync(process.env.TOOLJET_MCP_HOME!, { recursive: true, mode: 0o700 });
    writeFileSync(profilesPath(), '', { mode: 0o600 });
    expect(loadStore().profiles).toEqual({});
    expect(importCredential({ url: 'https://app.tooljet.ai', pat: 't' })).toEqual({ name: 'cloud', created: true });
    expect(loadStore()).toMatchObject({ active: 'cloud', profiles: { cloud: { pat: 't' } } });
  });

  it('round-trips, privately', () => {
    two();
    expect(loadStore().profiles.beta).toEqual({ url: 'https://beta.example.com', pat: 'tj_pat_b' });
    if (process.platform !== 'win32') {
      expect(statSync(profilesPath()).mode & 0o777).toBe(0o600);
      expect(statSync(process.env.TOOLJET_MCP_HOME!).mode & 0o777).toBe(0o700);
    }
  });

  it.skipIf(process.platform === 'win32')('refuses a store other users can read', () => {
    two();
    chmodSync(profilesPath(), 0o644);
    expect(() => loadStore()).toThrow(/readable by other users/);
  });

  it('drops an active pointer that names nothing, and entries without a token', () => {
    mkdirSync(process.env.TOOLJET_MCP_HOME!, { recursive: true, mode: 0o700 });
    writeFileSync(profilesPath(), JSON.stringify({ active: 'ghost', profiles: { ok: { url: 'https://x.example', pat: 't' }, bad: { url: 'https://y.example' } } }), { mode: 0o600 });
    const store = loadStore();
    expect(store.active).toBe('');
    expect(Object.keys(store.profiles)).toEqual(['ok']);
  });

  it('normalizes URLs and rejects ones that could redirect a token', () => {
    expect(normalizeUrl('tooljet.example.com/')).toBe('https://tooljet.example.com');
    expect(normalizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(() => normalizeUrl('https://user:pw@x.example')).toThrow(/credentials/);
    expect(() => normalizeUrl('https://x.example/?a=1')).toThrow(/query/);
    expect(urlCandidates('https://x.example/my-workspace')).toEqual(['https://x.example/my-workspace', 'https://x.example']);
    expect(() => assertProfileName('has space')).toThrow();
  });
});

describe('forward compatibility', () => {
  it('keeps fields it does not know, so an older version never deletes a newer one\'s data', () => {
    mkdirSync(process.env.TOOLJET_MCP_HOME!, { recursive: true, mode: 0o700 });
    writeFileSync(profilesPath(), JSON.stringify({
      version: '99.0.0', active: 'a', futureTopLevel: { x: 1 },
      profiles: { a: { url: 'https://a.example', pat: 't', futureField: 'keep me' } },
    }), { mode: 0o600 });
    saveStore(loadStore());
    const onDisk = JSON.parse(readFileSync(profilesPath(), 'utf8'));
    // …and an older server never lowers the version a newer one wrote.
    expect(onDisk).toMatchObject({ version: '99.0.0', futureTopLevel: { x: 1 }, profiles: { a: { futureField: 'keep me' } } });
  });

  it('stamps a file from an older version (or none, or the short-lived numeric 1) with this version, on first read', () => {
    mkdirSync(process.env.TOOLJET_MCP_HOME!, { recursive: true, mode: 0o700 });
    for (const old of [undefined, 1, '0.0.1']) {
      writeFileSync(profilesPath(), JSON.stringify({ version: old, active: 'a', profiles: { a: { url: 'https://a.example', pat: 't' } } }), { mode: 0o600 });
      loadStore();
      expect(JSON.parse(readFileSync(profilesPath(), 'utf8')).version).toBe(V);
    }
    expect(newerVersion('0.10.0', '0.9.9')).toBe(true);
    expect(newerVersion('1.2.3', '1.2.3')).toBe(false);
    expect(Object.keys(JSON.parse(readFileSync(profilesPath(), 'utf8')))).toEqual(['version', 'active', 'agentDefaults', 'profiles']);
    expect(JSON.parse(readFileSync(profilesPath(), 'utf8'))).toEqual({
      version: V, active: 'a', agentDefaults: {}, profiles: { a: { url: 'https://a.example', pat: 't' } },
    });
  });

  it('drops an agent default that names a removed profile', () => {
    two({ codex: 'beta', cursor: 'ghost' });
    expect(loadStore().agentDefaults).toEqual({ codex: 'beta' });
  });
});

describe('per-agent defaults', () => {
  it('moves a chat to its agent\'s own default once the client introduces itself', () => {
    two({ codex: 'beta' });
    const session = createProfileSession();
    expect(session.current()?.name).toBe('alpha');
    session.onClient('codex-mcp-client');
    expect(session.current()?.name).toBe('beta');
    expect(session.list().find((p) => p.name === 'beta')).toMatchObject({ active_on_disk: true, used_by_this_chat: true });
  });

  it('leaves other agents on the shared default', () => {
    two({ codex: 'beta' });
    const session = createProfileSession();
    session.onClient('claude-code');
    expect(session.current()?.name).toBe('alpha');
  });

  it('never overrides an environment token or a pin', () => {
    two({ codex: 'beta' });
    process.env.TOOLJET_PROFILE = 'alpha';
    const pinned = createProfileSession();
    pinned.onClient('codex-mcp-client');
    expect(pinned.current()?.name).toBe('alpha');
  });

  it('prefers the label tj wrote over the client name', () => {
    process.env.TOOLJET_AGENT = 'cursor';
    expect(identifyAgent('claude-code')).toBe('cursor');
    delete process.env.TOOLJET_AGENT;
    expect(identifyAgent('claude-code')).toBe('claude-code');
    expect(identifyAgent('claude-ai')).toBe('claude-desktop');
    expect(identifyAgent('Visual Studio Code')).toBe('vscode');
    expect(identifyAgent('something-new')).toBeUndefined();
  });
});

describe('importCredential()', () => {
  const cloud = 'https://app.tooljet.ai';

  it('saves only a server address and a token, named after the server', () => {
    expect(importCredential({ url: `${cloud}/`, pat: 'a', workspaceSlug: 'devrel' })).toEqual({ name: 'cloud', created: true });
    expect(loadStore()).toMatchObject({ active: 'cloud', profiles: { cloud: { url: cloud, pat: 'a' } } });
    expect(Object.keys(loadStore().profiles.cloud)).toEqual(['url', 'pat']);
    expect(suggestName('http://localhost:3000', [])).toBe('local');
    expect(suggestName('https://staging.acme.com', [])).toBe('staging');
  });

  it('reuses an identical credential', () => {
    importCredential({ url: cloud, pat: 'a' });
    expect(importCredential({ url: cloud, pat: 'a' })).toEqual({ name: 'cloud', created: false });
  });

  it('names a second token for the same server after its workspace, never cloud-2', () => {
    importCredential({ url: cloud, pat: 'a' });
    expect(importCredential({ url: cloud, pat: 'b', workspaceSlug: 'templates' }).name).toBe('cloud-templates');
    expect(loadStore().active).toBe('cloud');
  });

  it('falls back to a number only when the workspace is unknown', () => {
    importCredential({ url: cloud, pat: 'a' });
    expect(importCredential({ url: cloud, pat: 'b' }).name).toBe('cloud-2');
  });
});

describe('resolveStartup()', () => {
  it('prefers an environment token, so existing installs are untouched — and writes nothing', () => {
    two();
    const before = readFileSync(profilesPath(), 'utf8');
    process.env.TOOLJET_PAT = 'tj_pat_env';
    process.env.TOOLJET_DEPLOYMENT_URL = 'https://env.example.com';
    const r = resolveStartup();
    expect(r.config.pat).toBe('tj_pat_env');
    expect(r).toMatchObject({ source: 'environment', scope: { name: 'environment', host: 'env.example.com' } });
    expect(readFileSync(profilesPath(), 'utf8')).toBe(before);
  });

  it('then a pinned profile, then the active one', () => {
    two();
    expect(resolveStartup()).toMatchObject({ pinned: false, scope: { name: 'alpha' }, config: { apiUrl: 'https://alpha.example.com', pat: 'tj_pat_a' } });
    process.env.TOOLJET_PROFILE = 'beta';
    expect(resolveStartup()).toMatchObject({ pinned: true, scope: { name: 'beta' } });
  });

  it('says what to run when nothing is saved', () => {
    expect(() => resolveStartup()).toThrow(NoProfileError);
  });
});

describe('switchable client', () => {
  const fake = (tag: string) => ({ listWorkspaces: async () => tag }) as unknown as ToolJetClient;

  it('forwards to whatever it currently points at', async () => {
    const sw = createSwitchableClient(fake('a'), 'unused');
    const held = sw.client; // what every tool closed over at registration
    expect(await held.listWorkspaces()).toBe('a');
    sw.set(fake('b'));
    expect(await held.listWorkspaces()).toBe('b');
  });

  it('rejects every call with the reason while empty', async () => {
    const sw = createSwitchableClient(undefined, 'run tj');
    await expect(sw.client.listWorkspaces()).rejects.toThrow('run tj');
  });
});

describe('profile session (one chat)', () => {
  it('does not follow a change on disk, and switches only when asked', () => {
    two();
    const session = createProfileSession();
    expect(session.current()?.name).toBe('alpha');
    saveStore({ ...loadStore(), active: 'beta' });
    expect(session.current()?.name).toBe('alpha');
    expect(session.list()).toEqual([
      { name: 'alpha', host: 'alpha.example.com', active_on_disk: false, used_by_this_chat: true },
      { name: 'beta', host: 'beta.example.com', active_on_disk: true, used_by_this_chat: false },
    ]);
    expect(session.use('beta')).toEqual({ name: 'beta', host: 'beta.example.com' });
    expect(JSON.parse(readFileSync(profilesPath(), 'utf8')).active).toBe('beta'); // use() never writes the file
  });

  it('never returns a token from list()', () => {
    two();
    expect(JSON.stringify(createProfileSession().list())).not.toContain('tj_pat');
  });

  it('refuses to leave a pinned profile', () => {
    two();
    process.env.TOOLJET_PROFILE = 'alpha';
    expect(() => createProfileSession().use('beta')).toThrow(/pinned/);
  });

  it('starts without any profile and comes alive on use()', async () => {
    const session = createProfileSession();
    await expect(session.client.listWorkspaces()).rejects.toThrow(/No ToolJet server is set up/);
    two();
    expect(session.use('alpha').name).toBe('alpha');
  });
});

describe('an old env-var setup is kept as a profile', () => {
  const cloud = 'https://app.tooljet.ai';
  const answers = (status: number, body: unknown = {}) =>
    vi.fn().mockResolvedValue({ ok: status < 300, status, json: async () => body, text: async () => '' });
  const startWith = (pat: string, fetchImpl: ReturnType<typeof vi.fn>) => {
    process.env.TOOLJET_PAT = pat;
    process.env.TOOLJET_DEPLOYMENT_URL = cloud;
    vi.stubGlobal('fetch', fetchImpl);
    return createProfileSession();
  };
  const loggedIn = () => answers(201, { authToken: 'jwt', organizationId: 'ws-1', organizationSlug: 'devrel' });

  it('only once the token has logged in — start-up itself writes nothing', async () => {
    const session = startWith('tj_pat_1', loggedIn());
    expect(loadStore().profiles).toEqual({});
    await session.client.listWorkspaces();
    expect(loadStore()).toMatchObject({ active: 'cloud', profiles: { cloud: { url: cloud, pat: 'tj_pat_1' } } });
    expect(session.list()).toEqual([{ name: 'cloud', host: 'app.tooljet.ai', active_on_disk: true, used_by_this_chat: true }]);
  });

  it('leaves the profiles alone once that server is saved, so a renewed token never adds cloud-2', async () => {
    await startWith('tj_pat_old', loggedIn()).client.listWorkspaces();
    await startWith('tj_pat_new', loggedIn()).client.listWorkspaces();
    expect(loadStore().profiles).toEqual({ cloud: { url: cloud, pat: 'tj_pat_old' } });
  });

  it('never saves a token the server rejected', async () => {
    const session = startWith('tj_pat_dead', answers(401));
    await expect(session.client.listWorkspaces()).rejects.toThrow();
    expect(loadStore().profiles).toEqual({});
  });

  it('is switched off by the same variable as the rest of the start-up writes', async () => {
    process.env.TOOLJET_MCP_NO_AUTO_SETUP = '1';
    await startWith('tj_pat_1', loggedIn()).client.listWorkspaces();
    expect(loadStore().profiles).toEqual({});
  });
});

describe('plan tokens are bound to the server they were linted for', () => {
  it('refuses a plan after a switch without consuming it', () => {
    setActiveScope({ name: 'alpha', host: 'alpha.example.com' });
    const { plan_token } = storeAppPlan({} as never, {} as never);
    setActiveScope({ name: 'beta', host: 'beta.example.com' });
    expect(() => consumeAppPlan(plan_token)).toThrow(/linted for alpha@alpha\.example\.com/);
    setActiveScope({ name: 'alpha', host: 'alpha.example.com' });
    expect(consumeAppPlan(plan_token)).toBeDefined();
    expect(scopeKey()).toBe('alpha@alpha.example.com');
  });
});

describe('checkLogin()', () => {
  const profile = { url: 'https://x.example.com', pat: 'tj_pat_secret' };
  const res = (status: number, body: unknown = {}) => ({ ok: status < 300, status, json: async () => body }) as Response;

  it('exchanges the token exactly as the server does', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(201, { organizationSlug: 'acme' }));
    expect(await checkLogin(profile, fetchImpl)).toMatchObject({ ok: true, workspaceSlug: 'acme' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://x.example.com/api/personal-access-tokens/session');
    expect(init.headers.Authorization).toBe('Bearer tj_pat_secret');
  });

  it('explains a rejection without ever echoing the token', async () => {
    for (const status of [401, 404, 500]) {
      const out = await checkLogin(profile, vi.fn().mockResolvedValue(res(status)));
      expect(out.ok).toBe(false);
      expect(out.message).not.toContain('tj_pat_secret');
    }
    const down = await checkLogin(profile, vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    expect(down).toMatchObject({ ok: false, message: 'Cannot reach https://x.example.com.' });
  });
});

describe('tj uninstall', () => {
  // Without the bin-dir override, shimPath() is the REAL ~/.local/bin/tj.
  beforeEach(() => { process.env.TOOLJET_MCP_BIN_DIR = join(dir, 'bin'); });

  const fakeInstall = () => {
    mkdirSync(join(homeDir(), 'bundle', 'cli'), { recursive: true });
    writeFileSync(join(homeDir(), 'bundle', 'index.js'), '// server');
    writeFileSync(join(homeDir(), 'bundle', 'cli', 'index.js'), '// cli');
    mkdirSync(join(homeDir(), 'data'), { recursive: true });
    writeFileSync(join(homeDir(), 'data', 'x.json'), '{}');
    writeFileSync(join(homeDir(), 'package.json'), '{ "type": "module" }\n');
    writeShim();
  };
  const quiet = () => vi.spyOn(console, 'log').mockImplementation(() => {});
  const agent = (id: string, connected: Connection, disconnect = vi.fn(async () => '/tmp/fake.json')): AgentAdapter => ({
    id, name: id, reload: 'restart it', detect: () => true,
    status: () => ({ connected, storedToken: false }),
    connect: async () => '', disconnect,
  });

  it('refuses outside a terminal without --yes', async () => {
    await expect(uninstall({}, [])).rejects.toThrow(/--yes/);
  });

  it('removes the command and the copy but keeps the saved servers', async () => {
    two();
    fakeInstall();
    const log = quiet();
    await uninstall({ yes: true }, []);
    expect(existsSync(join(homeDir(), 'bundle'))).toBe(false);
    expect(existsSync(join(homeDir(), 'data'))).toBe(false);
    expect(existsSync(join(homeDir(), 'package.json'))).toBe(false);
    expect(existsSync(shimPath())).toBe(false);
    expect(Object.keys(loadStore().profiles)).toEqual(['alpha', 'beta']);
    expect(log.mock.calls.flat().join('\n')).toContain('kept');
  });

  it('--profiles deletes the whole home folder', async () => {
    two();
    fakeInstall();
    quiet();
    await uninstall({ yes: true, profiles: true }, []);
    expect(existsSync(homeDir())).toBe(false);
    expect(existsSync(shimPath())).toBe(false);
  });

  it('with nothing saved the whole folder goes without --profiles', async () => {
    fakeInstall();
    quiet();
    await uninstall({ yes: true }, []);
    expect(existsSync(homeDir())).toBe(false);
  });

  it('never deletes a different program called tj', async () => {
    two();
    fakeInstall();
    writeFileSync(shimPath(), '#!/bin/sh\necho other tool\n');
    const log = quiet();
    await uninstall({ yes: true }, []);
    expect(readFileSync(shimPath(), 'utf8')).toContain('other tool');
    expect(log.mock.calls.flat().join('\n')).toContain('different program');
  });

  it('disconnects connected agents and warns about plugin-connected ones', async () => {
    two();
    fakeInstall();
    const disconnect = vi.fn(async () => '/tmp/fake.json');
    const log = quiet();
    await uninstall({ yes: true }, [agent('one', 'yes', disconnect), agent('two', 'plugin')]);
    expect(disconnect).toHaveBeenCalledTimes(1);
    const out = log.mock.calls.flat().join('\n');
    expect(out).toContain('entry removed from one');
    expect(out).toContain('plugin is still installed in two');
  });

  it('says so when there is nothing to remove', async () => {
    const log = quiet();
    await uninstall({ yes: true }, []);
    expect(log.mock.calls.flat().join('\n')).toContain('Nothing to remove');
  });
});
