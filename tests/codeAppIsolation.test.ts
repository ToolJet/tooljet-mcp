import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanOldProjects, withBuildSlot, BuildCapacityError, touchProject } from '../src/codeBuildLimits.js';
import { codeAppBuildTool, codeAppInstallTool, codeAppReadFilesTool, codeAppScaffoldTool, codeAppWriteFilesTool, noCodeIdentity, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { API_URL, codeContext, DEPLOYMENT, VERSION, WORKSPACE } from './codeContext.js';

/* The fake CLI records its arguments and whole environment. */
const APP = '11111111-1111-4111-8111-111111111111';
const THEIRS = '22222222-2222-4222-8222-222222222222';
const FAKE_CLI = `
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify({ args, cwd: process.cwd(), env: process.env }) + '\\n');
if (args[1] === 'init') {
  fs.mkdirSync(args[2] + '/frontend/src', { recursive: true });
  fs.writeFileSync(args[2] + '/app.json', '{}');
  fs.writeFileSync(args[2] + '/frontend/src/tooljet.gen.ts', '// hooks');
}
if (args[1] === 'server-mode') console.log(process.env.FAKE_OLD_CLI ? 'unknown command' : 'tooljet-server-mode:' + process.env.TOOLJET_CLI_SERVER_MODE);
if (args[1] === 'source-pull') console.log(process.env.FAKE_PULL_REFUSED ? '' : 'No source is stored on ToolJet for this version yet');
if (args[1] === 'source-pull' && process.env.FAKE_PULL_REFUSED) { console.error('HTTP 403 Forbidden'); process.exit(1); }
if (args[1] === 'check') console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } }));
`;

let root: string;
let log: string;
const env = { ...process.env };
const calls = () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const text = (r: any) => r.content[0].text as string;
/** A project where this backend keeps it, or (workspace undefined) in the oldest shared folder. */
const project = (workspace: string | undefined, name: string, appId: string) =>
  makeProject(workspace ? join(root, 'apps', DEPLOYMENT, workspace, name) : join(root, 'apps', name), appId);
/** A project in a per-workspace folder from before deployment folders. */
const legacyProject = (workspace: string, name: string, appId: string) => makeProject(join(root, 'apps', workspace, name), appId);
const makeProject = (dir: string, appId: string) => {
  mkdirSync(join(dir, 'frontend', 'src'), { recursive: true });
  writeFileSync(join(dir, 'app.json'), JSON.stringify({ appId }));
  writeFileSync(join(dir, 'frontend', 'src', 'App.tsx'), 'export default 1;');
  return dir;
};

beforeEach(() => {
  resetCodeSessionForTests();
  root = mkdtempSync(join(tmpdir(), 'code-isolation-'));
  log = join(root, 'calls.log');
  writeFileSync(log, '');
  writeFileSync(join(root, 'cli.js'), FAKE_CLI);
  mkdirSync(join(root, 'apps'));
  Object.assign(process.env, {
    TOOLJET_CLI: join(root, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(root, 'apps'), FAKE_CLI_LOG: log,
    MCP_CODE_CLI_ENV_PASS: 'FAKE_CLI_LOG,FAKE_OLD_CLI,FAKE_PULL_REFUSED,MY_API_KEY',
    // The folders from before deployment folders belong to this test's backend.
    MCP_CODE_LEGACY_DEPLOYMENT_URL: API_URL,
  });
});
afterEach(() => {
  process.env = { ...env };
  rmSync(root, { recursive: true, force: true });
});

describe('the environment the CLI runs in', () => {
  it('is an allowlist: server secrets stay out, server mode and the request credential go in', async () => {
    Object.assign(process.env, { OPENAI_API_KEY: 'server-secret', DATABASE_URL: 'pg://x', TOOLJET_PAT: 'global-pat', MY_API_KEY: 'operator-typed-it', NODE_OPTIONS: '--require /x' });
    project(WORKSPACE, 'demo', APP);
    await codeAppBuildTool(codeContext({ credential: { pat: 'request-pat' } })).handler({ app_id: APP } as any);
    const seen = calls()[0].env;
    expect(seen.TOOLJET_CLI_SERVER_MODE).toBe('1');
    expect(seen.TOOLJET_PAT).toBe('request-pat');
    for (const name of ['OPENAI_API_KEY', 'DATABASE_URL', 'NODE_OPTIONS', 'MY_API_KEY']) expect(seen[name]).toBeUndefined();
    expect(JSON.stringify(seen)).not.toContain('server-secret');
    expect(seen.HOME).not.toBe(process.env.HOME);
  });

  it('carries a session and its workspace for a session caller, and no PAT', async () => {
    process.env.TOOLJET_PAT = 'global-pat';
    project(WORKSPACE, 'demo', APP);
    await codeAppBuildTool(codeContext({ credential: { sessionToken: 'the-session' } })).handler({ app_id: APP } as any);
    const seen = calls()[0].env;
    expect(seen.TOOLJET_SESSION_TOKEN).toBe('the-session');
    expect(seen.TOOLJET_WORKSPACE_ID).toBe(WORKSPACE);
    expect(seen.TOOLJET_PAT).toBeUndefined();
  });

  it('keeps two concurrent callers apart', async () => {
    project(WORKSPACE, 'one', APP);
    project('ws-2', 'two', THEIRS);
    await Promise.all([
      codeAppBuildTool(codeContext({ credential: { pat: 'first' } })).handler({ app_id: APP } as any),
      codeAppBuildTool(codeContext({ credential: { pat: 'second' }, workspaceId: async () => 'ws-2', client: { getApp: async () => ({ organizationId: 'ws-2', editing_version: { id: VERSION } }) } as any })).handler({ app_id: THEIRS } as any),
    ]);
    for (const call of calls()) {
      expect(call.env.TOOLJET_PAT).toBe(call.cwd.includes('ws-2') ? 'second' : 'first');
    }
  });

  it('takes the registry from the server, never from the project', async () => {
    process.env.npm_config_registry = 'https://registry.internal/';
    project(WORKSPACE, 'demo', APP);
    await codeAppBuildTool(codeContext()).handler({ app_id: APP } as any);
    expect(calls()[0].env.npm_config_registry).toBe('https://registry.internal/');
  });

  it('runs nothing on a CLI that does not know server mode', async () => {
    vi.stubEnv('MCP_CODE_CLI_HANDSHAKE', '1');
    process.env.FAKE_OLD_CLI = '1';
    project(WORKSPACE, 'demo', APP);
    expect(text(await codeAppBuildTool(codeContext()).handler({ app_id: APP } as any))).toMatch(/does not support server mode/);
    expect(calls().map((c) => c.args.join(' '))).toEqual(['app server-mode']);
    vi.unstubAllEnvs();
  });
});

describe('who may use the Code tools', () => {
  it('refuses a request with no credential, before any lookup', async () => {
    const getApp = vi.fn();
    project(WORKSPACE, 'demo', APP);
    const out = text(await codeAppReadFilesTool(codeContext({ credential: {}, client: { getApp } as any })).handler({ app_id: APP } as any));
    expect(out).toMatch(/signed-in user/);
    expect(getApp).not.toHaveBeenCalled();
    expect(calls()).toEqual([]);
  });

  it('refuses when nothing named an identity at all', async () => {
    const out = text(await codeAppReadFilesTool(noCodeIdentity({} as any)).handler({ app_id: APP } as any));
    expect(out).toMatch(/signed-in user/);
  });

  it('never takes a global token for a request with none', async () => {
    process.env.TOOLJET_PAT = 'global-pat';
    const out = text(await codeAppBuildTool(codeContext({ credential: undefined })).handler({ app_id: APP } as any));
    expect(out).toMatch(/signed-in user/);
    expect(calls()).toEqual([]);
  });
});

describe('a project belongs to a workspace', () => {
  const other = (getApp: any) => codeContext({ client: { getApp } as any });

  it('by app id: refused when ToolJet refuses the caller', async () => {
    project(WORKSPACE, 'demo', APP);
    const out = text(await codeAppReadFilesTool(other(async () => { throw new Error('403'); })).handler({ app_id: APP, paths: ['app.json'] } as any));
    expect(out).toMatch(/not found in this workspace/);
    expect(calls()).toEqual([]);
  });

  it('by app id: refused when the app is in another workspace', async () => {
    project(WORKSPACE, 'demo', APP);
    const out = text(await codeAppWriteFilesTool(other(async () => ({ organizationId: 'ws-2' }))).handler({ app_id: APP, files: [{ path: 'frontend/src/a.tsx', content: 'x' }] } as any));
    expect(out).toMatch(/not found in this workspace/);
    expect(existsSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'demo', 'frontend', 'src', 'a.tsx'))).toBe(false);
  });

  it('by name: the project checks its own app, and another workspace\'s folder is not reachable', async () => {
    project(WORKSPACE, 'demo', APP);
    const refused = text(await codeAppReadFilesTool(other(async () => { throw new Error('403'); })).handler({ name: 'demo', paths: ['app.json'] } as any));
    expect(refused).toMatch(/not found in this workspace/);
    project('ws-2', 'theirs', THEIRS);
    expect(text(await codeAppReadFilesTool(codeContext()).handler({ name: 'theirs', paths: ['app.json'] } as any))).toMatch(/no app project/);
    expect(text(await codeAppReadFilesTool(codeContext()).handler({ app_id: THEIRS, paths: ['app.json'] } as any))).toMatch(/no Code mode project/);
  });

  it('a project with no app id is nobody\'s', async () => {
    const dir = project(WORKSPACE, 'demo', APP);
    writeFileSync(join(dir, 'app.json'), '{}');
    expect(text(await codeAppReadFilesTool(codeContext()).handler({ name: 'demo' } as any))).toMatch(/no app project/);
  });

  it('two workspaces can use one project name', async () => {
    const context2 = codeContext({ workspaceId: async () => 'ws-2', client: { getApp: async () => ({ organizationId: 'ws-2', editing_version: { id: VERSION } }) } as any });
    await codeAppScaffoldTool(codeContext()).handler({ name: 'tasks', display_name: 'Tasks', app_id: APP });
    await codeAppScaffoldTool(context2).handler({ name: 'tasks', display_name: 'Tasks', app_id: THEIRS });
    expect(existsSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'tasks', 'app.json'))).toBe(true);
    expect(existsSync(join(root, 'apps', DEPLOYMENT, 'ws-2', 'tasks', 'app.json'))).toBe(true);
  });

  it('a stranger\'s app id costs no install and no folder', async () => {
    const out = text(await codeAppScaffoldTool(other(async () => { throw new Error('404'); })).handler({ name: 'tasks', display_name: 'Tasks', app_id: APP }));
    expect(out).toMatch(/not found in this workspace/);
    expect(calls()).toEqual([]);
    expect(existsSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'tasks'))).toBe(false);
  });

  it('moves an older shared-folder project in, only for its owner', async () => {
    const old = project(undefined, 'older', APP);
    expect(text(await codeAppReadFilesTool(other(async () => { throw new Error('403'); })).handler({ name: 'older' } as any))).toMatch(/not found in this workspace/);
    expect(existsSync(old)).toBe(true);
    await codeAppReadFilesTool(codeContext()).handler({ name: 'older' } as any);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'older', 'app.json'))).toBe(true);
  });

  it('moves a per-workspace project from before deployment folders in, by app id and by name', async () => {
    const byId = legacyProject(WORKSPACE, 'by-id', APP);
    const out = JSON.parse(text(await codeAppReadFilesTool(codeContext()).handler({ app_id: APP } as any)));
    expect(out.project_dir).toBe(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'by-id'));
    expect(existsSync(byId)).toBe(false);
    const byName = legacyProject(WORKSPACE, 'by-name', THEIRS);
    await codeAppReadFilesTool(codeContext()).handler({ name: 'by-name' } as any);
    expect(existsSync(byName)).toBe(false);
    expect(existsSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'by-name', 'app.json'))).toBe(true);
  });

  it('stops when ToolJet refuses the stored code, rather than going on from the local copy', async () => {
    process.env.FAKE_PULL_REFUSED = '1';
    project(WORKSPACE, 'demo', APP);
    const out = text(await codeAppReadFilesTool(codeContext()).handler({ app_id: APP, paths: ['app.json'] } as any));
    expect(out).toMatch(/refused access/);
    expect(out).not.toContain(APP);
  });
});

describe('build limits', () => {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

  it('caps one workspace, and other workspaces still run', async () => {
    vi.stubEnv('MCP_CODE_BUILD_MAX_WORKSPACE', '1');
    vi.stubEnv('MCP_CODE_BUILD_WAIT_MS', '100');
    const base = join(root, 'apps');
    let release!: () => void;
    const holding = withBuildSlot(base, 'a', () => new Promise<void>((resolve) => { release = resolve; }));
    await wait();
    await expect(withBuildSlot(base, 'a', async () => 'ran')).rejects.toBeInstanceOf(BuildCapacityError);
    await expect(withBuildSlot(base, 'b', async () => 'ran')).resolves.toBe('ran');
    release();
    await holding;
    await expect(withBuildSlot(base, 'a', async () => 'ran')).resolves.toBe('ran');
    vi.unstubAllEnvs();
  });

  it('caps the host across workspaces', async () => {
    vi.stubEnv('MCP_CODE_BUILD_MAX_GLOBAL', '1');
    vi.stubEnv('MCP_CODE_BUILD_WAIT_MS', '100');
    const base = join(root, 'apps');
    let release!: () => void;
    const holding = withBuildSlot(base, 'a', () => new Promise<void>((resolve) => { release = resolve; }));
    await wait();
    await expect(withBuildSlot(base, 'b', async () => 'ran')).rejects.toBeInstanceOf(BuildCapacityError);
    release();
    await holding;
    vi.unstubAllEnvs();
  });

  it('waits for a slot rather than failing while one frees up', async () => {
    vi.stubEnv('MCP_CODE_BUILD_MAX_WORKSPACE', '1');
    const base = join(root, 'apps');
    const order: string[] = [];
    await Promise.all([
      withBuildSlot(base, 'a', async () => { order.push('first'); await new Promise((r) => setTimeout(r, 400)); order.push('first done'); }),
      (async () => { await wait(); await withBuildSlot(base, 'a', async () => { order.push('second'); }); })(),
    ]);
    expect(order).toEqual(['first', 'first done', 'second']);
    vi.unstubAllEnvs();
  });

  it('takes over a slot left by a dead process', async () => {
    vi.stubEnv('MCP_CODE_BUILD_MAX_WORKSPACE', '1');
    vi.stubEnv('MCP_CODE_BUILD_WAIT_MS', '100');
    const base = join(root, 'apps');
    mkdirSync(join(base, '.slots'), { recursive: true });
    writeFileSync(join(base, '.slots', 'ws-a-0'), '999999');
    await expect(withBuildSlot(base, 'a', async () => 'ran')).resolves.toBe('ran');
    vi.unstubAllEnvs();
  });

  it('counts builds through the Code tools', async () => {
    vi.stubEnv('MCP_CODE_BUILD_MAX_WORKSPACE', '1');
    vi.stubEnv('MCP_CODE_BUILD_WAIT_MS', '50');
    const base = join(root, 'apps');
    project(WORKSPACE, 'demo', APP);
    let release!: () => void;
    const holding = withBuildSlot(base, `${DEPLOYMENT}.${WORKSPACE}`, () => new Promise<void>((resolve) => { release = resolve; }));
    await wait();
    expect(text(await codeAppInstallTool(codeContext()).handler({ app_id: APP } as any))).toMatch(/Too many builds/);
    release();
    await holding;
    vi.unstubAllEnvs();
  });
});

describe('old project folders', () => {
  const age = (file: string, days: number) => {
    const then = new Date(Date.now() - days * 86_400_000);
    utimesSync(file, then, then);
  };

  it('removes only projects unused for the TTL, in deployment and workspace folders and the old shared one', () => {
    const base = join(root, 'apps');
    const old = project(WORKSPACE, 'old', APP);
    const recent = project(WORKSPACE, 'recent', APP);
    const flat = project(undefined, 'flat-old', APP);
    const perWorkspace = legacyProject(WORKSPACE, 'ws-old', APP);
    for (const dir of [old, flat, perWorkspace]) { touchProject(dir); age(join(dir, '.tooljet-last-used'), 20); }
    touchProject(recent);
    cleanOldProjects(base);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(flat)).toBe(false);
    expect(existsSync(perWorkspace)).toBe(false);
    expect(existsSync(recent)).toBe(true);
  });

  it('runs at most once an hour, and not at all when turned off', () => {
    const base = join(root, 'apps');
    const old = project(WORKSPACE, 'old', APP);
    touchProject(old);
    age(join(old, '.tooljet-last-used'), 20);
    vi.stubEnv('MCP_CODE_PROJECT_TTL_DAYS', '0');
    cleanOldProjects(base);
    expect(existsSync(old)).toBe(true);
    vi.unstubAllEnvs();
    writeFileSync(join(base, '.last-cleanup'), '');
    cleanOldProjects(base);
    expect(existsSync(old)).toBe(true);
  });
});
