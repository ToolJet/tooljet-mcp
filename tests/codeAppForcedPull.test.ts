import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';
import { codeAppInstallTool, codeAppReadFilesTool, codeAppWriteFilesTool, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { ProjectBusyError, withProjectLock } from '../src/codeProjectSafety.js';

/*
  The first pull of a build takes ToolJet's code over a stale local copy (--force), so a Code panel edit is not lost.
  It used to decide "first" from a per-process set, so a build's own writes were replaced, and install reported success
  without them: after a failed first pull, by a second build on the same app, or after a restart. Now a marker in
  .tooljet records writes not yet installed, and while it stands no pull is forced.
*/
const FAKE_CLI = fileURLToPath(new URL('./fixtures/fake-source-cli.cjs', import.meta.url));

let base: string;
const project = () => join(base, 'apps', DEPLOYMENT, WORKSPACE, 'desk');
const store = () => join(base, 'store');
const text = (r: any) => r.content[0].text as string;
const json = (r: any) => JSON.parse(text(r));
const calls = () => readFileSync(join(base, 'cli.log'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).join(' '));
const forced = () => calls().filter((c) => c.includes('source-pull') && c.includes('--force'));
const write = (args: Record<string, unknown>) => codeAppWriteFilesTool(codeContext()).handler({ name: 'desk', ...args } as any);
const read = (paths?: string[]) => codeAppReadFilesTool(codeContext()).handler({ name: 'desk', ...(paths ? { paths } : {}) } as any);
const install = () => codeAppInstallTool(codeContext()).handler({ name: 'desk' } as any);
const marker = () => join(project(), '.tooljet', 'agent-writes.json');
const stored = (rel: string) => (existsSync(join(store(), 'src', rel)) ? readFileSync(join(store(), 'src', rel), 'utf8') : undefined);

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'code-app-forced-pull-'));
  mkdirSync(join(project(), 'frontend', 'src', 'App'), { recursive: true });
  mkdirSync(join(store(), 'src', 'App'), { recursive: true });
  writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1' }));
  writeFileSync(join(project(), 'frontend', 'src', 'App', 'index.tsx'), 'export const App = 1;\n');
  writeFileSync(join(store(), 'src', 'App', 'index.tsx'), 'export const App = 1;\n');
  writeFileSync(join(store(), 'store.json'), JSON.stringify({ revision: 2 }));
  mkdirSync(join(project(), '.tooljet'), { recursive: true });
  writeFileSync(join(project(), '.tooljet', 'source.json'), JSON.stringify({ revision: 2, owner: 'platform' }));
  writeFileSync(join(base, 'cli.log'), '');
  Object.assign(process.env, {
    TOOLJET_CLI: FAKE_CLI,
    TOOLJET_CODE_APP_ROOT: join(base, 'apps'),
    FAKE_CLI_LOG: join(base, 'cli.log'),
    FAKE_STORE: store(),
    FAKE_FAIL: join(base, 'fail-next-pull'),
    MCP_CODE_APP_SCAN_PREFETCH: '0',
  });
  resetCodeSessionForTests();
});
afterEach(() => {
  rmSync(base, { recursive: true, force: true });
  for (const k of ['TOOLJET_CLI', 'TOOLJET_CODE_APP_ROOT', 'FAKE_CLI_LOG', 'FAKE_STORE', 'FAKE_FAIL', 'MCP_CODE_APP_SCAN_PREFETCH']) delete process.env[k];
  resetCodeSessionForTests();
});

describe('the first pull never replaces a build\'s own writes', () => {
  it('a first pull that failed, then a write: the install keeps the write and forces nothing', async () => {
    writeFileSync(join(base, 'fail-next-pull'), '1');
    const w = await write({ files: [{ path: 'frontend/src/App/Reports.tsx', content: 'export const Reports = "agent work";\n' }] });
    expect(w.isError).toBeFalsy();
    expect(json(w).sync_warning).toMatch(/ECONNRESET/);
    expect(existsSync(marker())).toBe(true);
    const i = await install();
    expect(i.isError).toBeFalsy();
    expect(forced()).toEqual([]);
    expect(existsSync(join(project(), 'frontend', 'src', 'App', 'Reports.tsx'))).toBe(true);
    expect(stored('App/Reports.tsx')).toBe('export const Reports = "agent work";\n');
    expect(existsSync(marker())).toBe(false); // stored: the next build may take ToolJet's code again
  });

  it('a second build on the same app does not force a pull over the first build\'s uninstalled writes', async () => {
    // Build A: reads (its first touch), then writes an edit and a new screen.
    await read(['frontend/src/App/index.tsx']);
    const w = await write({
      files: [{ path: 'frontend/src/App/Reports.tsx', content: 'export const Reports = "A";\n' }],
      edits: [{ path: 'frontend/src/App/index.tsx', find: 'App = 1', replace: 'App = 2 /* A */' }],
    });
    expect(w.isError).toBeFalsy();
    const before = forced().length;
    // Build B, its own process on the same folder: its first touch is a read.
    resetCodeSessionForTests();
    expect((await read()).isError).toBeFalsy();
    expect(forced().length).toBe(before);
    // Build A installs: both of its changes reach the stored code.
    expect((await install()).isError).toBeFalsy();
    expect(stored('App/index.tsx')).toBe('export const App = 2 /* A */;\n');
    expect(stored('App/Reports.tsx')).toBe('export const Reports = "A";\n');
  });

  it('a restart of the MCP server mid-build keeps the writes (the marker is on disk)', async () => {
    await write({ files: [{ path: 'frontend/src/App/Reports.tsx', content: 'export const Reports = "before restart";\n' }] });
    const before = forced().length;
    resetCodeSessionForTests(); // a new process: nothing in memory
    expect((await install()).isError).toBeFalsy();
    expect(forced().length).toBe(before);
    expect(stored('App/Reports.tsx')).toBe('export const Reports = "before restart";\n');
  });

  it('a stale copy with no pending writes is still replaced by ToolJet\'s code on the first touch (the Code panel edit wins)', async () => {
    writeFileSync(join(store(), 'src', 'App', 'index.tsx'), 'export const App = "user edit";\n'); // same revision number, new content
    writeFileSync(join(project(), 'frontend', 'src', 'App', 'index.tsx'), 'export const App = "stale copy";\n');
    const r = json(await read(['frontend/src/App/index.tsx']));
    expect(r.files['frontend/src/App/index.tsx']).toBe('export const App = "user edit";\n');
    expect(forced().length).toBe(1);
    expect(r.before_pull_copy).toMatch(/\.tooljet\/before-pull\/revision-2-/);
  });
});

describe('copies a forced pull keeps', () => {
  it('keeps the last 3 and the install names them', async () => {
    for (let n = 0; n < 5; n++) {
      resetCodeSessionForTests();
      // A stale local copy, never written by a build (no marker): the first touch forces and keeps a copy.
      writeFileSync(join(project(), 'frontend', 'src', 'App', 'index.tsx'), `export const App = "stale ${n}";\n`);
      const r = json(await read());
      expect(r.before_pull_copy, `round ${n}`).toMatch(/last 3 copies are kept/);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(readdirSync(join(project(), '.tooljet', 'before-pull'))).toHaveLength(3);
    const i = json(await install());
    expect(i.before_pull_copies.kept).toHaveLength(3);
    expect(i.before_pull_copies.note).toMatch(/last 3 kept/);
  });
});

describe('one tool call at a time per project', () => {
  it('runs concurrent work on one project one after the other', async () => {
    const lock = join(base, 'locks', 'p');
    const events: string[] = [];
    const job = (name: string) => withProjectLock(lock, async () => {
      events.push(`${name} start`);
      await new Promise((resolve) => setTimeout(resolve, 30));
      events.push(`${name} end`);
    }, { pollMs: 5 });
    await Promise.all([job('a'), job('b')]);
    expect(events).toEqual(['a start', 'a end', 'b start', 'b end']);
    expect(existsSync(lock)).toBe(false);
  });

  it('takes over a lock whose process is gone, and gives up on a busy one', async () => {
    const lock = join(base, 'locks', 'p');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'owner'), JSON.stringify({ pid: 2 ** 22 + 12345, at: Date.now() }));
    expect(await withProjectLock(lock, async () => 'ran', { pollMs: 5 })).toBe('ran');
    mkdirSync(lock, { recursive: true });
    writeFileSync(join(lock, 'owner'), JSON.stringify({ pid: process.pid, at: Date.now(), token: 'other' }));
    await expect(withProjectLock(lock, async () => 'ran', { waitMs: 30, pollMs: 5 })).rejects.toBeInstanceOf(ProjectBusyError);
  });

  it('a write waits while another build holds the project', async () => {
    const lock = join(base, 'apps', '.locks', `${DEPLOYMENT}.${WORKSPACE}.desk`);
    let release!: () => void;
    const held = withProjectLock(lock, () => new Promise<void>((resolve) => (release = resolve)));
    await new Promise((resolve) => setTimeout(resolve, 10));
    let done = false;
    const pending = write({ files: [{ path: 'frontend/src/App/New.tsx', content: 'export const New = 1;\n' }] }).then((r) => {
      done = true;
      return r;
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(done).toBe(false);
    release();
    await held;
    expect((await pending).isError).toBeFalsy();
  });
});
