import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  codeAppAddDependencyTool, codeAppBuildTool, codeAppInstallTool, codeAppReadFilesTool, codeAppScaffoldTool, codeAppWriteFilesTool,
  deploymentKey, resetCodeSessionForTests,
} from '../src/tools/codeApp.js';
import { API_URL, codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

/*
  Changing a retained project (writing files, adding or removing a package, building, installing, scaffolding) needs
  ToolJet to say the caller may edit the app; reading it needs view only. ToolJet is asked again once a grant is older
  than MCP_CODE_APP_AUTH_TTL_MS. Projects are kept per ToolJet backend.
*/
const APP = '11111111-1111-4111-8111-111111111111';
const FAKE_CLI = `
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify({ args, cwd: process.cwd() }) + '\\n');
if (args[1] === 'init') {
  fs.mkdirSync(args[2] + '/frontend/src', { recursive: true });
  fs.writeFileSync(args[2] + '/app.json', '{}');
  fs.writeFileSync(args[2] + '/frontend/package.json', '{"dependencies":{}}');
  fs.writeFileSync(args[2] + '/frontend/src/tooljet.gen.ts', '// hooks');
}
if (args[1] === 'source-pull') console.log('No source is stored on ToolJet for this version yet');
if (args[1] === 'vet') console.log(JSON.stringify({ ok: true, packages: args.slice(2).filter((a) => !a.startsWith('-')).map((name) => ({ name, version: '1.0.0' })) }));
if (args[1] === 'check') console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } }));
`;

let root: string;
let log: string;
const env = { ...process.env };
const calls = () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line).args.join(' ') as string);
const text = (r: any) => r.content[0].text as string;
const projectAt = (dir: string) => {
  mkdirSync(join(dir, 'frontend', 'src'), { recursive: true });
  writeFileSync(join(dir, 'app.json'), JSON.stringify({ appId: APP }));
  writeFileSync(join(dir, 'frontend', 'package.json'), JSON.stringify({ dependencies: { react: '19.1.0', 'left-pad': '1.3.0' } }));
  writeFileSync(join(dir, 'frontend', 'src', 'App.tsx'), 'export default 1;');
  return dir;
};
const project = () => projectAt(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'demo'));
const pkg = () => readFileSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'demo', 'frontend', 'package.json'), 'utf8');

/** A caller ToolJet lets view the app; `editor` says whether it may also edit it (a function: asked each time). */
const caller = (editor: boolean | (() => boolean)) => {
  const canEditApp = vi.fn(async () => (typeof editor === 'function' ? editor() : editor));
  const getApp = vi.fn(async () => ({ organizationId: WORKSPACE }));
  return { context: codeContext({ client: { getApp, canEditApp } as any }), canEditApp, getApp };
};

beforeEach(() => {
  resetCodeSessionForTests();
  root = mkdtempSync(join(tmpdir(), 'code-permissions-'));
  log = join(root, 'calls.log');
  writeFileSync(log, '');
  writeFileSync(join(root, 'cli.js'), FAKE_CLI);
  mkdirSync(join(root, 'apps'));
  Object.assign(process.env, {
    TOOLJET_CLI: join(root, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(root, 'apps'), FAKE_CLI_LOG: log,
    MCP_CODE_CLI_ENV_PASS: 'FAKE_CLI_LOG', MCP_CODE_LEGACY_DEPLOYMENT_URL: API_URL,
  });
});
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe('a caller who can only view the app', () => {
  it('is refused a dependency change, and package.json and the install are untouched', async () => {
    project();
    const before = pkg();
    const { context } = caller(false);
    const out = text(await codeAppAddDependencyTool(context).handler({ app_id: APP, packages: ['date-fns'] } as any));
    expect(out).toMatch(/view app .* but not edit it/);
    expect(pkg()).toBe(before);
    expect(calls()).toEqual([]);
  });

  it('is refused a remove-only dependency change, which vets nothing', async () => {
    project();
    const before = pkg();
    const { context } = caller(false);
    const out = text(await codeAppAddDependencyTool(context).handler({ app_id: APP, packages: [], remove: ['left-pad'] } as any));
    expect(out).toMatch(/not edit it/);
    expect(pkg()).toBe(before);
    expect(calls()).toEqual([]);
  });

  it('is refused a build, an install, a write and a scaffold, by app id and by name', async () => {
    project();
    const { context } = caller(false);
    for (const out of [
      await codeAppBuildTool(context).handler({ app_id: APP } as any),
      await codeAppBuildTool(context).handler({ name: 'demo' } as any),
      await codeAppInstallTool(context).handler({ app_id: APP } as any),
      await codeAppWriteFilesTool(context).handler({ app_id: APP, files: [{ path: 'frontend/src/New.tsx', content: 'x' }] } as any),
      await codeAppScaffoldTool(context).handler({ name: 'other', display_name: 'Other', app_id: APP }),
    ]) expect(text(out)).toMatch(/not edit it/);
    expect(calls()).toEqual([]);
    expect(existsSync(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'demo', 'frontend', 'src', 'New.tsx'))).toBe(false);
  });

  it('can still read the project', async () => {
    project();
    const { context, canEditApp } = caller(false);
    const out = JSON.parse(text(await codeAppReadFilesTool(context).handler({ app_id: APP, paths: ['app.json'] } as any)));
    expect(out.files['app.json']).toContain(APP);
    expect(canEditApp).not.toHaveBeenCalled();
  });

  it('is refused when ToolJet cannot say whether the caller may edit', async () => {
    project();
    const context = codeContext({ client: { canEditApp: async () => { throw new Error('HTTP 500'); } } as any });
    expect(text(await codeAppBuildTool(context).handler({ app_id: APP } as any))).toMatch(/could not confirm/);
    expect(calls()).toEqual([]);
  });
});

describe('an editor of the app', () => {
  it('adds and removes packages', async () => {
    project();
    const { context, canEditApp } = caller(true);
    const out = JSON.parse(text(await codeAppAddDependencyTool(context).handler({ app_id: APP, packages: ['date-fns'], remove: ['left-pad'] } as any)));
    expect(out.added).toEqual(['date-fns@1.0.0']);
    expect(JSON.parse(pkg()).dependencies).toEqual({ 'date-fns': '1.0.0', react: '19.1.0' });
    expect(calls()).toEqual(['app vet date-fns --json', 'app install']);
    expect(canEditApp).toHaveBeenCalledWith(APP);
  });

  it('builds', async () => {
    project();
    const { context } = caller(true);
    const out = JSON.parse(text(await codeAppBuildTool(context).handler({ app_id: APP } as any)));
    expect(out.typescript_errors).toBe(0);
    expect(calls()).toContain('library build');
  });
});

describe('a grant is kept for a short time only', () => {
  it('reuses ToolJet\'s answer within the TTL', async () => {
    project();
    const { context, canEditApp, getApp } = caller(true);
    await codeAppBuildTool(context).handler({ app_id: APP } as any);
    await codeAppBuildTool(context).handler({ app_id: APP } as any);
    expect(canEditApp).toHaveBeenCalledOnce();
    expect(getApp).toHaveBeenCalledOnce();
  });

  it('refuses once edit permission is taken away and the TTL has passed', async () => {
    vi.stubEnv('MCP_CODE_APP_AUTH_TTL_MS', '40');
    project();
    let editor = true;
    const { context, canEditApp } = caller(() => editor);
    expect(JSON.parse(text(await codeAppBuildTool(context).handler({ app_id: APP } as any))).typescript_errors).toBe(0);
    editor = false;
    await new Promise((resolve) => setTimeout(resolve, 60));
    const before = pkg();
    expect(text(await codeAppAddDependencyTool(context).handler({ app_id: APP, packages: [], remove: ['left-pad'] } as any))).toMatch(/not edit it/);
    expect(pkg()).toBe(before);
    expect(canEditApp).toHaveBeenCalledTimes(2);
  });

  it('refuses once the app itself is taken away and the TTL has passed', async () => {
    vi.stubEnv('MCP_CODE_APP_AUTH_TTL_MS', '0');
    project();
    let visible = true;
    const context = codeContext({ client: { getApp: async () => { if (!visible) throw new Error('403'); return { organizationId: WORKSPACE }; } } as any });
    await codeAppReadFilesTool(context).handler({ app_id: APP } as any);
    visible = false;
    expect(text(await codeAppReadFilesTool(context).handler({ app_id: APP } as any))).toMatch(/not found in this workspace/);
  });
});

describe('projects are kept per ToolJet backend', () => {
  const OTHER = 'https://other-backend.example.com';

  it('names the folder after the backend, not anything the caller chose', () => {
    expect(deploymentKey('http://tooljet.test')).toBe(deploymentKey('http://TOOLJET.test/'));
    expect(deploymentKey('http://tooljet.test')).not.toBe(deploymentKey('http://tooljet.test:8080'));
    expect(deploymentKey('https://a.example.com/tooljet')).not.toBe(deploymentKey('https://a.example.com'));
    expect(deploymentKey('http://tooljet.test')).toMatch(/^d_[0-9a-f]{24}$/);
    expect(() => deploymentKey('')).toThrow(/no valid ToolJet backend/);
  });

  it('gives the same workspace and app ids on another backend a project of their own', async () => {
    project();
    const elsewhere = codeContext({ apiUrl: OTHER });
    expect(text(await codeAppReadFilesTool(elsewhere).handler({ app_id: APP } as any))).toMatch(/no Code mode project/);
    expect(text(await codeAppReadFilesTool(elsewhere).handler({ name: 'demo' } as any))).toMatch(/no app project/);
    await codeAppScaffoldTool(elsewhere).handler({ name: 'demo', display_name: 'Demo', app_id: APP });
    expect(existsSync(join(root, 'apps', deploymentKey(OTHER), WORKSPACE, 'demo', 'app.json'))).toBe(true);
    // The first backend's project is as it was.
    expect(JSON.parse(pkg()).dependencies).toEqual({ react: '19.1.0', 'left-pad': '1.3.0' });
  });

  it('finds an existing project from before backend folders, for the backend those folders belong to', async () => {
    const old = projectAt(join(root, 'apps', WORKSPACE, 'demo'));
    const out = JSON.parse(text(await codeAppReadFilesTool(codeContext()).handler({ app_id: APP } as any)));
    expect(out.project_dir).toBe(join(root, 'apps', DEPLOYMENT, WORKSPACE, 'demo'));
    expect(existsSync(old)).toBe(false);
  });

  it('leaves a project from before backend folders alone for any other backend', async () => {
    const old = projectAt(join(root, 'apps', WORKSPACE, 'demo'));
    const flat = projectAt(join(root, 'apps', 'flat'));
    const elsewhere = codeContext({ apiUrl: OTHER });
    expect(text(await codeAppReadFilesTool(elsewhere).handler({ app_id: APP } as any))).toMatch(/no Code mode project/);
    expect(text(await codeAppReadFilesTool(elsewhere).handler({ name: 'flat' } as any))).toMatch(/no app project/);
    expect(existsSync(old)).toBe(true);
    expect(existsSync(flat)).toBe(true);
  });

  it('takes the owner of old folders from TOOLJET_URL when no legacy backend is named', async () => {
    delete process.env.MCP_CODE_LEGACY_DEPLOYMENT_URL;
    process.env.TOOLJET_URL = OTHER;
    const old = projectAt(join(root, 'apps', WORKSPACE, 'demo'));
    expect(text(await codeAppReadFilesTool(codeContext()).handler({ app_id: APP } as any))).toMatch(/no Code mode project/);
    expect(existsSync(old)).toBe(true);
    await codeAppReadFilesTool(codeContext({ apiUrl: OTHER })).handler({ app_id: APP } as any);
    expect(existsSync(join(root, 'apps', deploymentKey(OTHER), WORKSPACE, 'demo', 'app.json'))).toBe(true);
  });
});
