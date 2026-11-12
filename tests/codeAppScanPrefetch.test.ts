import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeAppBuildTool, codeAppInstallTool, prefetchedScanForTests, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

/*
  A passing build starts the install's full scan in the background; the install uses it only when no project file
  changed since (2026-11-03: the full scan was 3.7 s of each install).
*/
const FAKE_CLI = fileURLToPath(new URL('./fixtures/fake-tooljet-cli.mjs', import.meta.url));
const passing = { problems: [], security: { gate: 'pass', counts: { critical: 0, high: 0 }, notRun: [], findings: [] } };

let root: string;
let dir: string;
let log: string;
const fullScans = () =>
  readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).args.join(' ')).filter((c) => c === 'app check --json').length;
const text = (r: { content: { text: string }[] }) => r.content[0].text;
const replies = (r: Record<string, { code: number; output: unknown }>) => {
  process.env.FAKE_CLI_REPLIES = JSON.stringify(r);
};
const build = async () => {
  const result = JSON.parse(text(await codeAppBuildTool(codeContext()).handler({ name: 'demo' })));
  await prefetchedScanForTests(dir);
  return result;
};
const install = async () => text(await codeAppInstallTool(codeContext()).handler({ name: 'demo' }));

beforeEach(() => {
  resetCodeSessionForTests();
  root = mkdtempSync(join(tmpdir(), 'code-app-scan-'));
  dir = join(root, DEPLOYMENT, WORKSPACE, 'demo');
  log = join(root, 'calls.log');
  writeFileSync(log, '');
  mkdirSync(join(dir, 'frontend', 'src', 'App'), { recursive: true });
  mkdirSync(join(dir, 'frontend', 'node_modules', 'react'), { recursive: true });
  writeFileSync(join(dir, 'app.json'), '{"appId":"app-1"}\n');
  writeFileSync(join(dir, 'frontend', 'package.json'), '{"name":"demo"}\n');
  writeFileSync(join(dir, 'frontend', 'src', 'App', 'index.tsx'), 'export default () => null;\n');
  Object.assign(process.env, { TOOLJET_CODE_APP_ROOT: root, TOOLJET_CLI: FAKE_CLI, FAKE_CLI_LOG: log });
  replies({ 'library build': { code: 0, output: 'TypeScript compiled (0 errors)' }, 'app check': { code: 0, output: passing }, 'app dev': { code: 0, output: 'Open: http://localhost/editor' } });
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const k of ['TOOLJET_CODE_APP_ROOT', 'TOOLJET_CLI', 'FAKE_CLI_LOG', 'FAKE_CLI_REPLIES', 'MCP_CODE_APP_SCAN_PREFETCH', 'MCP_CODE_APP_SCAN_REUSE_MS']) delete process.env[k];
});

describe('the full scan a passing build starts', () => {
  it('is the one the install uses when nothing changed', async () => {
    expect((await build()).ok).toBe(true);
    expect(fullScans()).toBe(1);
    expect(await install()).toMatch(/"linked":true/);
    expect(fullScans()).toBe(1);
  });

  it('is dropped when a file changed after the build, and the install scans again', async () => {
    await build();
    writeFileSync(join(dir, 'frontend', 'src', 'App', 'index.tsx'), 'fetch("https://collect.example.net");\n');
    replies({ 'app check': { code: 0, output: { ...passing, security: { ...passing.security, gate: 'fail', findings: [{ ruleId: 'tj-code/no-external-fetch', severity: 'high', message: 'fetch leaves the instance', location: 'frontend/src/App/index.tsx:1' }] } } } });
    expect(await install()).toMatch(/Not installed: the security scan has 1 critical or high finding/);
    expect(fullScans()).toBe(2);
  });

  it('ignores node_modules, dist and .tooljet (which the check itself rewrites) when telling whether anything changed', async () => {
    await build();
    mkdirSync(join(dir, '.tooljet'), { recursive: true });
    writeFileSync(join(dir, '.tooljet', 'snapshot.json'), '{"pulledAt":"now"}');
    mkdirSync(join(dir, 'frontend', 'dist'), { recursive: true });
    writeFileSync(join(dir, 'frontend', 'dist', 'bundle.js'), 'built');
    writeFileSync(join(dir, 'frontend', 'node_modules', 'react', 'index.js'), 'cache');
    await install();
    expect(fullScans()).toBe(1);
  });

  it('is not used when it did not run, and the install scans again', async () => {
    replies({ 'library build': { code: 0, output: 'TypeScript compiled (0 errors)' }, 'app check': { code: 0, output: { problems: [], security: { error: 'OSV API unreachable' } } } });
    await build();
    replies({ 'app check': { code: 0, output: passing }, 'app dev': { code: 0, output: 'Open: http://localhost/editor' } });
    expect(await install()).toMatch(/"linked":true/);
    expect(fullScans()).toBe(2);
  });

  it('is not started for a failing build, nor when turned off, nor reused once stale', async () => {
    replies({ 'library build': { code: 1, output: 'TypeScript compiled (2 errors)' }, 'app check': { code: 0, output: passing } });
    expect((await build()).ok).toBe(false);
    expect(fullScans()).toBe(0);

    replies({ 'library build': { code: 0, output: 'TypeScript compiled (0 errors)' }, 'app check': { code: 0, output: passing } });
    process.env.MCP_CODE_APP_SCAN_PREFETCH = '0';
    await build();
    expect(fullScans()).toBe(0);
    delete process.env.MCP_CODE_APP_SCAN_PREFETCH;

    process.env.MCP_CODE_APP_SCAN_REUSE_MS = '0';
    await build();
    await install();
    expect(fullScans()).toBe(2);
  });
});
