import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  codeAppInstallTool, codeAppWriteFilesTool, concreteRoute, resetCodeSessionForTests, routesToCheck, type RenderRoute,
} from '../src/tools/codeApp.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

/*
  One check round (2026-11-04): code_app_install with verify builds, installs on a clean build and render-checks every
  route, in one call. The fake CLI's build fails while FAKE_BUILD_FAIL names a file that exists.
*/
const APP = '33333333-3333-4333-8333-333333333333';
const FAKE_CLI = `
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, args.join(' ') + '\\n');
if (args[0] === 'library' && args[1] === 'build') {
  if (fs.existsSync(process.env.FAKE_BUILD_FAIL)) { console.log("src/App/Home.tsx(3,7): error TS2322: Type 'string' is not assignable to type 'number'."); console.log('TypeScript compiled (1 errors)'); process.exit(1); }
  console.log('✓ TypeScript compiled (0 errors)'); process.exit(0);
}
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], accessibility: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[1] === 'source-pull') { console.log('No source is stored on ToolJet for this version yet'); process.exit(0); }
if (args[1] === 'dev') { console.log('[12:00] built in 4.1s, uploaded (212 KB)\\nOpen: http://localhost/editor'); process.exit(0); }
console.log('ok');
`;
const parse = (r: { content: { text: string }[] }) => JSON.parse(r.content[0]!.text);

describe('code_app_install with verify', () => {
  let root: string;
  let project: string;
  let failFlag: string;
  const env = { ...process.env };
  const calls = () => readFileSync(join(root, 'calls.log'), 'utf8').split('\n').filter(Boolean);

  beforeEach(() => {
    resetCodeSessionForTests();
    root = mkdtempSync(join(tmpdir(), 'code-app-verify-'));
    writeFileSync(join(root, 'calls.log'), '');
    writeFileSync(join(root, 'cli.js'), FAKE_CLI);
    failFlag = join(root, 'fail');
    project = join(root, 'apps', DEPLOYMENT, WORKSPACE, 'orders');
    mkdirSync(join(project, 'frontend', 'src', 'App'), { recursive: true });
    writeFileSync(join(project, 'app.json'), JSON.stringify({ appId: APP, routes: [
      { id: 'order', path: '/orders/:id' }, { id: 'orders', path: '/' }, { id: 'reports', path: '/reports' },
    ] }));
    writeFileSync(join(project, 'frontend', 'src', 'App', 'index.tsx'), 'export default 1;');
    Object.assign(process.env, {
      TOOLJET_CLI: join(root, 'cli.js'),
      TOOLJET_CODE_APP_ROOT: join(root, 'apps'),
      FAKE_CLI_LOG: join(root, 'calls.log'),
      MCP_CODE_CLI_ENV_PASS: `${env.MCP_CODE_CLI_ENV_PASS ?? ''},FAKE_BUILD_FAIL`,
      FAKE_BUILD_FAIL: failFlag,
      MCP_CODE_CLI_HANDSHAKE: '0',
      MCP_CODE_APP_SCAN_PREFETCH: '0',
    });
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(root, { recursive: true, force: true });
  });

  const page = (findings: object[] = [], accessibility: object[] = []) =>
    ({ content: [{ type: 'text', text: JSON.stringify({ pages: [{ page: 'home', findings, accessibility }], ok: findings.length === 0, findings: findings.length }) }] });

  it('builds, installs and checks every route once, in one report', async () => {
    const render = vi.fn<RenderRoute>().mockImplementation(async ({ route }) =>
      route === '/reports' ? page([{ kind: 'overflow', component: 'Table', detail: 'content wider than its box' }]) : page());
    const result = await codeAppInstallTool(codeContext(), { render }).handler({ app_id: APP, verify: true });
    expect(result.isError).toBeFalsy();
    const out = parse(result);
    expect(out).toMatchObject({ installed: true, linked: true, build: { ok: true, typescript_errors: 0 }, render_ok: false });
    expect(out.render.map((r: { route: string; width: number; ok: boolean }) => [r.route, r.width, r.ok]))
      .toEqual([['/', 1280, true], ['/orders/1', 1280, true], ['/reports', 1280, false]]);
    expect(out.next).toMatch(/\/reports at 1280 px/);
    expect(render.mock.calls.map(([args]) => args)).toEqual([
      { app_id: APP, route: '/' }, { app_id: APP, route: '/orders/1' }, { app_id: APP, route: '/reports' },
    ]);
    expect(calls().filter((line) => /^(library build|app dev)/.test(line))).toEqual(['library build', 'app dev --once --source platform']);
  });

  it('stops at the build when it has errors: nothing installed, nothing rendered', async () => {
    writeFileSync(failFlag, '1');
    const render = vi.fn<RenderRoute>();
    const result = await codeAppInstallTool(codeContext(), { render }).handler({ app_id: APP, verify: true });
    const out = parse(result);
    expect(out).toMatchObject({ ok: false, installed: false, typescript_errors: 1 });
    expect(out.next).toMatch(/^Not installed: the build has errors/);
    expect(render).not.toHaveBeenCalled();
    expect(calls().some((line) => line.startsWith('app dev'))).toBe(false);
  });

  it('checks only the routes and widths asked for, in a second round', async () => {
    const render = vi.fn<RenderRoute>().mockResolvedValue(page());
    const out = parse(await codeAppInstallTool(codeContext(), { render }).handler({ app_id: APP, verify: true, routes: ['/reports'], widths: [375, 1280] }));
    expect(out.render_ok).toBe(true);
    expect(render.mock.calls.map(([args]) => args)).toEqual([
      { app_id: APP, route: '/reports', viewport_width: 375 }, { app_id: APP, route: '/reports' },
    ]);
  });

  it('installs as before without verify, and says rendering is unverified where no browser is available', async () => {
    expect(parse(await codeAppInstallTool(codeContext()).handler({ app_id: APP })).render).toBeUndefined();
    const out = parse(await codeAppInstallTool(codeContext()).handler({ app_id: APP, verify: true }));
    expect(out).toMatchObject({ installed: true, render: 'not available here: rendering is unverified' });
  });

  it('takes the project from app_id when a different name comes with it', async () => {
    const result = await codeAppInstallTool(codeContext()).handler({ app_id: APP, name: 'olive-ledger-desk' });
    expect(result.isError).toBeFalsy();
  });

  it("lets a build send its own file whole again, and still refuses a whole rewrite of a file it did not write", async () => {
    const write = (args: object) => codeAppWriteFilesTool(codeContext()).handler({ app_id: APP, ...args } as never);
    const long = (word: string) => Array.from({ length: 40 }, (_, i) => `const ${word}${i} = ${i};`).join('\n');
    expect((await write({ files: [{ path: 'frontend/src/App/Home.tsx', content: long('a') }] })).isError).toBeFalsy();
    expect((await write({ files: [{ path: 'frontend/src/App/Home.tsx', content: long('b') }] })).isError).toBeFalsy();
    writeFileSync(join(project, 'frontend', 'src', 'App', 'Theirs.tsx'), long('c'));
    await (await import('../src/tools/codeApp.js')).codeAppReadFilesTool(codeContext()).handler({ app_id: APP, paths: ['frontend/src/App/Theirs.tsx'] });
    const refused = await write({ files: [{ path: 'frontend/src/App/Theirs.tsx', content: long('d') }] });
    expect(refused.content[0]!.text).toMatch(/replaces most of the file/);
  });
});

describe('routesToCheck', () => {
  it('opens each app.json route once, home first, with params as 1', () => {
    const dir = mkdtempSync(join(tmpdir(), 'routes-'));
    writeFileSync(join(dir, 'app.json'), JSON.stringify({ routes: [{ path: '/a/:id/b/:line' }, { path: '/' }, { path: '/' }, { id: 'x' }] }));
    expect(routesToCheck(dir)).toEqual(['/', '/a/1/b/1']);
    expect(routesToCheck(mkdtempSync(join(tmpdir(), 'routes-')))).toEqual(['/']);
    expect(concreteRoute('/orders/:orderId')).toBe('/orders/1');
  });
});
