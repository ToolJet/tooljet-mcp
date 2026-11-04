import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppInstallTool, followDraft, inCodeScopeForTests } from '../src/tools/codeApp.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

// A fake CLI: `app checkout --list` marks the pinned version with its status (FAKE_STATUS); --editing unpins it.
const FAKE_CLI = `
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(args) + '\\n');
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[1] === 'checkout' && args[2] === '--list') {
  console.log('* v1  ' + process.env.FAKE_STATUS + '  ver-1');
  console.log('  v2  draft  ver-2');
  process.exit(0);
}
if (args[1] === 'checkout' && args[2] === '--editing') {
  const file = process.cwd() + '/app.json';
  const app = JSON.parse(fs.readFileSync(file, 'utf8')); delete app.version; fs.writeFileSync(file, JSON.stringify(app));
  console.log('Checked out the editing version'); process.exit(0);
}
console.log('Open: http://localhost/editor');
`;

// One version line (2026-11-02): after Save version the draft is a new version; an edit must go into it, never into
// the saved one a project may still pin.
describe('Code mode tools follow the draft after a Save version', () => {
  let dir: string;
  const env = { ...process.env };
  const project = () => join(dir, 'apps', DEPLOYMENT, WORKSPACE, 'tasks');
  const calls = () => readFileSync(join(dir, 'cli.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).slice(0, 3).join(' '));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-draft-'));
    writeFileSync(join(dir, 'cli.js'), FAKE_CLI);
    writeFileSync(join(dir, 'cli.log'), '');
    mkdirSync(join(project(), 'frontend', 'src'), { recursive: true });
    Object.assign(process.env, { TOOLJET_CLI: join(dir, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(dir, 'apps'), FAKE_CLI_LOG: join(dir, 'cli.log') });
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
  });

  it('moves off a saved pinned version to the draft before installing', async () => {
    writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1', version: { id: 'ver-1', name: 'v1' } }));
    process.env.FAKE_STATUS = 'published';
    const result = JSON.parse((await codeAppInstallTool(codeContext()).handler({ name: 'tasks' } as any)).content[0].text);
    expect(calls()).toEqual(['app checkout --list', 'app checkout --editing', 'app source-pull', 'app check --json', 'app dev --once']);
    expect(result.draft).toMatch(/v1 is saved, so the code now goes into the app's draft/);
    expect(JSON.parse(readFileSync(join(project(), 'app.json'), 'utf8')).version).toBeUndefined();
  });

  it('leaves a pinned draft and an unpinned project alone', async () => {
    writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1', version: { id: 'ver-1', name: 'v1' } }));
    process.env.FAKE_STATUS = 'draft';
    expect(await inCodeScopeForTests(codeContext(), () => followDraft(project()))).toBeUndefined();
    expect(calls()).toEqual(['app checkout --list']);
    writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1' }));
    expect(await inCodeScopeForTests(codeContext(), () => followDraft(project()))).toBeUndefined();
    expect(calls()).toEqual(['app checkout --list']); // no CLI call without a pin
  });
});
