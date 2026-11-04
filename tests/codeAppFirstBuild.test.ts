import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codeAppInstallTool, codeAppReadFilesTool, codeAppScaffoldTool, codeAppWriteFilesTool, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { codeContext, WORKSPACE } from './codeContext.js';

/* The write path of a first build, from the 10 builds of 2026-11-03. */
const APP = '11111111-1111-4111-8111-111111111111';
const FAKE_CLI = `
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, args.join(' ') + '\\n');
if (args[1] === 'init') {
  const dir = path.join(process.cwd(), args[2]);
  fs.mkdirSync(path.join(dir, 'frontend', 'src', 'App'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.json'), '{"name":"x"}');
  fs.writeFileSync(path.join(dir, 'frontend', 'src', 'tooljet.gen.ts'), '// hooks');
  fs.writeFileSync(path.join(dir, 'frontend', 'src', 'App', 'index.tsx'), Array.from({ length: 60 }, (_, i) => 'template ' + i).join('\\n'));
  process.exit(0);
}
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[1] === 'source-pull') {
  console.log(fs.existsSync(process.env.FAKE_STORED) ? 'Already at revision 1 (owner platform)' : 'No source is stored on ToolJet for this version yet');
  process.exit(0);
}
if (args[1] === 'dev') { fs.writeFileSync(process.env.FAKE_STORED, '1'); console.log('Open: http://localhost/editor'); process.exit(0); }
console.log('ok');
`;
const ENTRY = 'frontend/src/App/index.tsx';
const other = Array.from({ length: 60 }, (_, i) => `screen ${i}`).join('\n');
const text = (r: any) => r.content[0].text as string;

describe('a first build', () => {
  let root: string;
  let log: string;
  const env = { ...process.env };
  const pulls = () => readFileSync(log, 'utf8').split('\n').filter((l) => l.startsWith('app source-pull')).length;
  const write = (args: object) => codeAppWriteFilesTool(codeContext()).handler({ app_id: APP, ...args } as any).then(text);
  const read = (paths: string[]) => codeAppReadFilesTool(codeContext()).handler({ app_id: APP, paths } as any);

  beforeEach(async () => {
    resetCodeSessionForTests();
    root = mkdtempSync(join(tmpdir(), 'code-app-first-'));
    log = join(root, 'calls.log');
    writeFileSync(log, '');
    writeFileSync(join(root, 'cli.js'), FAKE_CLI);
    mkdirSync(join(root, 'apps'));
    Object.assign(process.env, { TOOLJET_CLI: join(root, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(root, 'apps'), FAKE_CLI_LOG: log, FAKE_STORED: join(root, 'stored') });
    await codeAppScaffoldTool(codeContext()).handler({ name: 'first', display_name: 'First', app_id: APP });
    await read([ENTRY]);
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(root, { recursive: true, force: true });
  });

  it('replaces a file still as the template left it without rewrite: true', async () => {
    expect(await write({ files: [{ path: ENTRY, content: other }] })).toMatch(/"written"/);
  });

  it('still asks for rewrite: true once the file holds code the agent wrote', async () => {
    await write({ files: [{ path: ENTRY, content: other }] });
    const again = Array.from({ length: 60 }, (_, i) => `again ${i}`).join('\n');
    expect(await write({ files: [{ path: ENTRY, content: again }] })).toMatch(/replaces most of the file/);
    expect(await write({ files: [{ path: ENTRY, content: again }], rewrite: true })).toMatch(/"written"/);
  });

  it('says a call with no code sent no code, and that rewrite carries none', async () => {
    const out = await write({ rewrite: true });
    expect(out).toMatch(/Nothing was written: this call had no files and no edits/);
    expect(out).toMatch(/rewrite: true only allows a rewrite/);
  });

  it('does not pull on writes while nothing is stored, and pulls every time after the first install', async () => {
    const start = pulls();
    expect(start).toBe(1);
    await write({ files: [{ path: 'frontend/src/App/a.tsx', content: 'a' }] });
    await write({ files: [{ path: 'frontend/src/App/b.tsx', content: 'b' }] });
    expect(pulls()).toBe(start);
    expect(text(await codeAppInstallTool(codeContext()).handler({ app_id: APP } as any))).toMatch(/"linked":true/);
    await write({ files: [{ path: 'frontend/src/App/c.tsx', content: 'c' }] });
    expect(pulls()).toBe(start + 1);
    await write({ files: [{ path: 'frontend/src/App/d.tsx', content: 'd' }] });
    expect(pulls()).toBe(start + 2);
  });

  it('pulls on writes when the first check finds stored code', async () => {
    resetCodeSessionForTests();
    writeFileSync(join(root, 'stored'), '1');
    await read([ENTRY]);
    const start = pulls();
    await write({ files: [{ path: 'frontend/src/App/e.tsx', content: 'e' }] });
    expect(pulls()).toBe(start + 1);
  });
});
