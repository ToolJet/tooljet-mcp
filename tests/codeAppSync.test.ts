import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  changedLines,
  codeAppInstallTool,
  codeAppReadFilesTool,
  codeAppWriteFilesTool,
  resetCodeSessionForTests,
} from '../src/tools/codeApp.js';

/*
  A fake CLI with a stored copy of the code on "ToolJet" (FAKE_STORE: frontend/ plus store.json { revision }), numbered
  like the server: per version, so a new draft can sit at the same revision number as the project. source-pull skips
  when the numbers match, as the real one does; dev --once uploads the project and bumps the stored revision.
*/
const FAKE_CLI = `
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(args) + '\\n');
const store = process.env.FAKE_STORE;
const meta = path.join(store, 'store.json');
const local = path.join(process.cwd(), '.tooljet', 'source.json');
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[1] === 'source-pull') {
  const stored = read(meta);
  if (stored.revision === undefined) { console.log('No source is stored on ToolJet for this version yet'); process.exit(0); }
  if (read(local).revision === stored.revision) { console.log('Already at revision ' + stored.revision + ' (owner platform)'); process.exit(0); }
  fs.cpSync(path.join(store, 'frontend'), path.join(process.cwd(), 'frontend'), { recursive: true });
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, JSON.stringify({ revision: stored.revision, owner: 'platform' }));
  console.log('Pulled revision ' + stored.revision + ' (owner platform): 1 files written, 0 removed');
  process.exit(0);
}
if (args[1] === 'dev') {
  const revision = (read(meta).revision ?? 0) + 1;
  fs.rmSync(path.join(store, 'frontend'), { recursive: true, force: true });
  fs.cpSync(path.join(process.cwd(), 'frontend'), path.join(store, 'frontend'), { recursive: true });
  fs.writeFileSync(meta, JSON.stringify({ revision }));
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.writeFileSync(local, JSON.stringify({ revision, owner: 'platform' }));
  console.log('Open: http://localhost/editor');
  process.exit(0);
}
console.log('ok');
`;

const QUEUE = (header: string, button: string) =>
  [
    'export function QueuePage() {',
    '  return (',
    '    <div>',
    `      <header className="${header} px-4 py-3">`,
    '        <h1>Queue</h1>',
    `        <button>${button}</button>`,
    '      </header>',
    '    </div>',
    '  );',
    '}',
    '',
  ].join('\n');

// Maintenance request tracker (2026-11-02): the user set the Queue header to Muted in the Style inspector, saved the
// version, and asked for a button rename. The agent rewrote the file from its old copy and the Muted header was lost.
describe('Code mode edits start from the stored code', () => {
  let dir: string;
  const env = { ...process.env };
  const project = () => join(dir, 'apps', 'desk');
  const store = () => join(dir, 'store');
  const queue = 'frontend/src/App/QueuePage.tsx';
  const text = (r: any) => r.content[0].text as string;
  const json = (r: any) => JSON.parse(text(r));
  const write = (args: Record<string, unknown>) => codeAppWriteFilesTool().handler({ name: 'desk', ...args } as any);
  const read = (paths: string[]) => codeAppReadFilesTool().handler({ name: 'desk', paths } as any);
  const install = () => codeAppInstallTool().handler({ name: 'desk' } as any);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-sync-'));
    writeFileSync(join(dir, 'cli.js'), FAKE_CLI);
    writeFileSync(join(dir, 'cli.log'), '');
    mkdirSync(join(project(), 'frontend', 'src', 'App'), { recursive: true });
    mkdirSync(store(), { recursive: true });
    writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1' }));
    Object.assign(process.env, { TOOLJET_CLI: join(dir, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(dir, 'apps'), FAKE_CLI_LOG: join(dir, 'cli.log'), FAKE_STORE: store() });
    resetCodeSessionForTests();
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
    resetCodeSessionForTests();
  });

  /** The user's Save version and Style inspector edit: a new draft whose stored revision number equals the project's. */
  const userEditsTheDraft = () => {
    const revision = JSON.parse(readFileSync(join(store(), 'store.json'), 'utf8')).revision;
    writeFileSync(join(store(), queue), QUEUE('bg-muted', 'Report an issue'));
    writeFileSync(join(store(), 'store.json'), JSON.stringify({ revision })); // same number, new content
  };

  it('a user edit between two agent turns survives the second turn', async () => {
    // Turn 1: the agent builds the screen and installs it (stored revision 1).
    expect((await write({ files: [{ path: queue, content: QUEUE('bg-card', 'Report an issue') }] })).isError).toBeFalsy();
    expect((await install()).isError).toBeFalsy();
    userEditsTheDraft();

    // Turn 2, a new build: writing from its old copy is refused; the stored code is what it reads.
    resetCodeSessionForTests();
    const stale = await write({ files: [{ path: queue, content: QUEUE('bg-card', 'Report a problem') }] });
    expect(stale.isError).toBe(true);
    expect(text(stale)).toMatch(/has not been read in this build: read it/);
    const current = json(await read([queue])).files[queue];
    expect(current).toContain('bg-muted');
    expect((await write({ edits: [{ path: queue, find: 'Report an issue', replace: 'Report a problem' }] })).isError).toBeFalsy();
    await install();

    const stored = readFileSync(join(store(), queue), 'utf8');
    expect(stored).toContain('bg-muted'); // the user's edit
    expect(stored).toContain('Report a problem'); // the requested change
    expect(changedLines(QUEUE('bg-muted', 'Report an issue'), stored)).toBe(2); // one line out, one line in
  });

  it('refuses a write when the file changed in the editor after the agent read it', async () => {
    await write({ files: [{ path: queue, content: QUEUE('bg-card', 'Report an issue') }] });
    await install();
    resetCodeSessionForTests();
    await read([queue]);
    // The user edits in the Code panel while the agent works: a newer stored revision.
    writeFileSync(join(store(), queue), QUEUE('bg-muted', 'Report an issue'));
    writeFileSync(join(store(), 'store.json'), JSON.stringify({ revision: 5 }));
    const result = await write({ edits: [{ path: queue, find: 'Report an issue', replace: 'Report a problem' }] });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/changed on ToolJet \(an edit in the editor\) since you read it/);
    expect(readFileSync(join(project(), queue), 'utf8')).toContain('bg-muted'); // pulled, not overwritten
    // After reading again the same edit applies, on top of the user's change.
    await read([queue]);
    expect((await write({ edits: [{ path: queue, find: 'Report an issue', replace: 'Report a problem' }] })).isError).toBeFalsy();
    expect(readFileSync(join(project(), queue), 'utf8')).toMatch(/bg-muted[\s\S]*Report a problem/);
  });

  it('refuses a whole-file rewrite of an existing file for a small change, unless rewrite is asked for', async () => {
    const big = Array.from({ length: 60 }, (_, i) => `const line${i} = ${i};`).join('\n');
    await write({ files: [{ path: queue, content: big }] });
    await read([queue]);
    const regenerated = Array.from({ length: 60 }, (_, i) => `const row${i} = ${i};`).join('\n');
    const refused = await write({ files: [{ path: queue, content: regenerated }] });
    expect(text(refused)).toMatch(/replaces most of the file; change only what the request needs with edits/);
    expect(readFileSync(join(project(), queue), 'utf8')).toBe(big);
    expect((await write({ files: [{ path: queue, content: regenerated }], rewrite: true })).isError).toBeFalsy();
  });

  it('needs an edit to match exactly once, and changes nothing when one edit of a call fails', async () => {
    await write({ files: [{ path: queue, content: QUEUE('bg-card', 'Report an issue') }] });
    await read([queue]);
    const result = await write({ edits: [
      { path: queue, find: 'Report an issue', replace: 'Report a problem' },
      { path: queue, find: 'px-4', replace: 'px-6' },
      { path: queue, find: 'not in the file', replace: 'x' },
    ] });
    expect(text(result)).toMatch(/the find text appears 0 times/);
    expect(readFileSync(join(project(), queue), 'utf8')).toBe(QUEUE('bg-card', 'Report an issue'));
  });

  it('pulls the stored code once per build, not before every call', async () => {
    writeFileSync(join(store(), 'store.json'), JSON.stringify({ revision: 1 }));
    mkdirSync(join(store(), 'frontend', 'src', 'App'), { recursive: true });
    writeFileSync(join(store(), queue), QUEUE('bg-muted', 'Report an issue'));
    await read([queue]);
    await read([queue]);
    const pulls = readFileSync(join(dir, 'cli.log'), 'utf8').trim().split('\n').filter((l) => l.includes('source-pull')).length;
    expect(pulls).toBe(2); // the forced first pull, then the ordinary check, which finds nothing new
    expect(existsSync(join(project(), '.tooljet', 'source.json'))).toBe(true);
  });
});
