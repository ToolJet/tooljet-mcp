import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PACKAGE_SPEC,
  codeAppAddDependencyTool,
  codeAppBuildTool,
  codeAppInstallTool,
  mustFix,
  parseReport,
  withDependencies,
} from '../src/tools/codeApp.js';

const FAKE_CLI = fileURLToPath(new URL('./fixtures/fake-tooljet-cli.mjs', import.meta.url));

const finding = (severity: string, over: Record<string, unknown> = {}) => ({
  ruleId: 'tj-code/no-external-fetch',
  severity,
  message: 'fetch() to https://collect.example.net leaves the ToolJet instance.',
  location: 'frontend/src/App/index.tsx:6',
  blocking: severity === 'critical' || severity === 'high',
  ...over,
});
const checkReport = (findings: unknown[], problems: unknown[] = []) => ({
  ok: !problems.length && !findings.some((f: any) => f.blocking),
  problems,
  accessibility: [{ file: 'frontend/src/App/index.tsx', line: 3, message: 'img needs alt', rule: 'jsx-a11y/alt-text' }],
  security: {
    gate: findings.some((f: any) => f.blocking) ? 'fail' : 'pass',
    counts: { critical: 0, high: findings.length, medium: 0, low: 0 },
    notRun: [{ id: 'osv', reason: 'offline' }],
    tools: [{ name: 'eslint', version: '9.39.5' }],
    findings,
  },
});

let root: string;
let log: string;
const text = (r: { content: { text: string }[] }) => r.content[0].text;
const calls = () =>
  readFileSync(log, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l).args.join(' '))
    .filter((c) => c !== 'app source-pull'); // the first-touch pull of the stored code (codeAppSync.test.ts)
const replies = (r: Record<string, { code: number; output: unknown }>) => {
  process.env.FAKE_CLI_REPLIES = JSON.stringify(r);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'code-app-security-'));
  log = join(root, 'calls.log');
  writeFileSync(log, '');
  mkdirSync(join(root, 'demo', 'frontend'), { recursive: true });
  writeFileSync(join(root, 'demo', 'app.json'), '{"appId":"app-1"}\n');
  writeFileSync(join(root, 'demo', 'frontend', 'package.json'), JSON.stringify({ name: 'demo', dependencies: { react: '19.1.0' } }, null, 2) + '\n');
  writeFileSync(join(root, 'demo', 'frontend', 'package-lock.json'), '{"before":true}\n');
  Object.assign(process.env, { TOOLJET_CODE_APP_ROOT: root, TOOLJET_CLI: FAKE_CLI, FAKE_CLI_LOG: log });
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const k of ['TOOLJET_CODE_APP_ROOT', 'TOOLJET_CLI', 'FAKE_CLI_LOG', 'FAKE_CLI_REPLIES']) delete process.env[k];
});

describe('report helpers', () => {
  it('parses the JSON report out of CLI output and ignores anything else', () => {
    expect(parseReport('warning: x\n{"ok":true}\n')).toEqual({ ok: true });
    expect(parseReport('Error: no project')).toBeNull();
    expect(parseReport('{ broken')).toBeNull();
  });
  it('must fix critical and high only', () => {
    const list = [finding('critical'), finding('high'), finding('medium'), finding('low')];
    expect(mustFix({ findings: list }).map((f) => f.severity)).toEqual(['critical', 'high']);
    expect(mustFix(undefined)).toEqual([]);
  });
  it('pins vetted packages to the exact version, sorted', () => {
    expect(withDependencies({ dependencies: { react: '19.1.0', zod: '^3' } }, [{ name: 'date-fns', version: '4.1.0' }, { name: 'zod', version: '3.25.0' }]))
      .toEqual({ dependencies: { 'date-fns': '4.1.0', react: '19.1.0', zod: '3.25.0' } });
  });
  it('accepts registry specs and refuses URLs, paths and flags', () => {
    for (const ok of ['zod', 'date-fns@4', '@tanstack/react-table@8.21.3', 'lodash@^4.17.21', 'react@next']) expect(PACKAGE_SPEC.test(ok)).toBe(true);
    for (const bad of ['--registry=http://evil', 'git+https://github.com/x/y', '../local', 'file:../x', 'https://x.test/a.tgz', 'Upper'])
      expect(PACKAGE_SPEC.test(bad)).toBe(false);
  });
});

describe('code_app_build', () => {
  it('returns the security findings next to the build and check errors', async () => {
    replies({
      'library build': { code: 0, output: 'TypeScript compiled (0 errors)\nBuilt' },
      'app check': { code: 1, output: checkReport([finding('high')], [{ file: 'frontend/src/App/index.tsx', line: 9, message: 'no query "orders"' }]) },
    });
    const result = JSON.parse(text(await codeAppBuildTool().handler({ name: 'demo' })));
    expect(calls()).toContain('app check --offline --json');
    expect(result).toMatchObject({
      ok: false,
      check: ['frontend/src/App/index.tsx:9  no query "orders"'],
      a11y_warnings: 1,
      security: { gate: 'fail', not_run: ['osv: offline'], findings: [{ ruleId: 'tj-code/no-external-fetch', severity: 'high' }] },
    });
  });
});

describe('code_app_install', () => {
  it('refuses on critical or high findings, lists them, and uploads nothing', async () => {
    replies({ 'app check': { code: 1, output: checkReport([finding('high'), finding('medium', { ruleId: 'tj-code/no-token-storage' })]) } });
    const result = await codeAppInstallTool().handler({ name: 'demo' });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/1 critical or high finding/);
    expect(text(result)).toMatch(/HIGH tj-code\/no-external-fetch frontend\/src\/App\/index.tsx:6/);
    expect(text(result)).not.toMatch(/no-token-storage/);
    expect(calls()).toEqual(['app check --json']);
  });
  it('refuses when the scan did not run', async () => {
    replies({ 'app check': { code: 1, output: { ok: false, problems: [], security: { error: 'The security scan did not run: x' } } } });
    const result = await codeAppInstallTool().handler({ name: 'demo' });
    expect(text(result)).toMatch(/did not run, so nothing was installed/);
    expect(calls()).toEqual(['app check --json']);
  });
  it('installs when only medium and low remain', async () => {
    replies({
      'app check': { code: 0, output: checkReport([finding('medium')]) },
      'app dev': { code: 0, output: 'Linked\nOpen: http://tj.test/apps/app-1' },
    });
    const result = JSON.parse(text(await codeAppInstallTool().handler({ name: 'demo' })));
    expect(calls()).toEqual(['app check --json', 'app dev --once --source platform']);
    expect(result).toMatchObject({ linked: true, editor_url: 'http://tj.test/apps/app-1', security: { findings: [{ severity: 'medium' }] } });
  });
});

describe('code_app_add_dependency', () => {
  const pkgFile = () => join(root, 'demo', 'frontend', 'package.json');
  const lockFile = () => join(root, 'demo', 'frontend', 'package-lock.json');

  it('writes nothing when a package fails the check (malware, CVE or cooldown)', async () => {
    const before = readFileSync(pkgFile(), 'utf8');
    replies({
      'app vet': {
        code: 1,
        output: {
          ok: false,
          gate: 'fail',
          packages: [{ name: 'fresh-pkg', version: '1.0.0' }],
          findings: [{ ruleId: 'tj-deps/new-release', severity: 'high', message: 'published 2 days ago', location: 'fresh-pkg@1.0.0', package: 'fresh-pkg@1.0.0' }],
        },
      },
    });
    const result = await codeAppAddDependencyTool().handler({ name: 'demo', packages: ['fresh-pkg'] });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/Not added: fresh-pkg@1.0.0 fails the package check/);
    expect(text(result)).toMatch(/HIGH tj-deps\/new-release fresh-pkg@1.0.0: published 2 days ago/);
    expect(readFileSync(pkgFile(), 'utf8')).toBe(before);
    expect(calls()).toEqual(['app vet fresh-pkg --json']);
  });
  it('pins and installs packages that pass', async () => {
    replies({ 'app vet': { code: 0, output: { ok: true, gate: 'pass', packages: [{ name: 'date-fns', version: '4.1.0' }], findings: [], notRun: [] } } });
    const result = JSON.parse(text(await codeAppAddDependencyTool().handler({ name: 'demo', packages: ['date-fns@4'] })));
    expect(result.added).toEqual(['date-fns@4.1.0']);
    expect(JSON.parse(readFileSync(pkgFile(), 'utf8')).dependencies).toEqual({ 'date-fns': '4.1.0', react: '19.1.0' });
    expect(calls()).toEqual(['app vet date-fns@4 --json', 'app install']);
  });
  it('restores package.json and the lockfile when the install fails', async () => {
    const before = readFileSync(pkgFile(), 'utf8');
    replies({
      'app vet': { code: 0, output: { ok: true, packages: [{ name: 'date-fns', version: '4.1.0' }] } },
      'app install': { code: 1, output: 'npm ERR! network' },
    });
    const result = await codeAppAddDependencyTool().handler({ name: 'demo', packages: ['date-fns'] });
    expect(text(result)).toMatch(/install failed, package.json restored/);
    expect(readFileSync(pkgFile(), 'utf8')).toBe(before);
    expect(readFileSync(lockFile(), 'utf8')).toBe('{"before":true}\n');
  });
  // Fix with AI on a dependency finding: upgrade in place, or replace the package (the old one out, the new one vetted).
  it('upgrades a vulnerable package to a fixed version, found by app id', async () => {
    writeFileSync(pkgFile(), JSON.stringify({ name: 'demo', dependencies: { lodash: '4.17.20', react: '19.1.0' } }, null, 2) + '\n');
    replies({ 'app vet': { code: 0, output: { ok: true, packages: [{ name: 'lodash', version: '4.17.21' }], findings: [] } } });
    const result = JSON.parse(text(await codeAppAddDependencyTool().handler({ app_id: 'app-1', packages: ['lodash@4.17.21'] } as any)));
    expect(result.added).toEqual(['lodash@4.17.21']);
    expect(JSON.parse(readFileSync(pkgFile(), 'utf8')).dependencies.lodash).toBe('4.17.21');
    expect(readFileSync(lockFile(), 'utf8')).toBe('{"installed":true}\n'); // refreshed by the install
  });
  it('replaces a package: removes the old one and adds the vetted replacement in one install', async () => {
    writeFileSync(pkgFile(), JSON.stringify({ name: 'demo', dependencies: { moment: '2.29.1', react: '19.1.0' } }, null, 2) + '\n');
    replies({ 'app vet': { code: 0, output: { ok: true, packages: [{ name: 'date-fns', version: '4.1.0' }], findings: [] } } });
    const result = JSON.parse(text(await codeAppAddDependencyTool().handler({ name: 'demo', packages: ['date-fns@4'], remove: ['moment'] } as any)));
    expect(result).toMatchObject({ added: ['date-fns@4.1.0'], removed: ['moment'] });
    expect(JSON.parse(readFileSync(pkgFile(), 'utf8')).dependencies).toEqual({ 'date-fns': '4.1.0', react: '19.1.0' });
    expect(calls()).toEqual(['app vet date-fns@4 --json', 'app install']);
  });
  it('removes a package without vetting anything', async () => {
    writeFileSync(pkgFile(), JSON.stringify({ name: 'demo', dependencies: { 'left-pad': '1.3.0', react: '19.1.0' } }, null, 2) + '\n');
    const result = JSON.parse(text(await codeAppAddDependencyTool().handler({ name: 'demo', packages: [], remove: ['left-pad'] } as any)));
    expect(result.removed).toEqual(['left-pad']);
    expect(JSON.parse(readFileSync(pkgFile(), 'utf8')).dependencies).toEqual({ react: '19.1.0' });
    expect(calls()).toEqual(['app install']);
  });
  it('refuses when the check could not run', async () => {
    replies({ 'app vet': { code: 1, output: 'Error: nope@9: no such package or version' } });
    const result = await codeAppAddDependencyTool().handler({ name: 'demo', packages: ['nope@9'] });
    expect(text(result)).toMatch(/did not run, so nothing was added: Error: nope@9/);
  });
});
