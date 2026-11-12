import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codeAppReadFilesTool, codeAppScaffoldTool, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

/*
  A new project folder for an app that already has code on ToolJet. The template's folder names a new library id with
  the app's name; a plain source-pull refused to overwrite the template, so the agent rebuilt the app over the stored
  code and the install was refused ("a library named ... already exists").
*/
const APP = '11111111-1111-4111-8111-111111111111';
const OWN = '55555555-5555-4555-8555-555555555551';
const FAKE_CLI = `
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, args.join(' ') + '\\n');
const write = (dir, rel, content) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
};
if (args[1] === 'init') {
  const dir = path.join(process.cwd(), args[2]);
  write(dir, 'app.json', '{"name":"x"}');
  write(dir, 'frontend/package.json', '{"dependencies":{}}');
  write(dir, 'frontend/.tooljet/config.json', JSON.stringify({ libraryName: 'Spend Approvals', correlationId: 'template-id' }));
  write(dir, 'frontend/src/tooljet.gen.ts', '// hooks');
  write(dir, 'frontend/src/App/index.tsx', 'template');
  process.exit(0);
}
if (args[1] === 'source-pull') {
  if (!fs.existsSync(process.env.FAKE_STORED)) { console.log('No source is stored on ToolJet for this version yet'); process.exit(0); }
  if (!args.includes('--force')) { console.log('Not pulled. These files differ from ToolJet\\'s code'); process.exit(1); }
  const dir = process.cwd();
  write(dir, 'frontend/package.json', '{"dependencies":{"recharts":"2.12.7"}}');
  write(dir, 'frontend/.tooljet/config.json', JSON.stringify({ libraryName: 'Spend Approvals', correlationId: '${OWN}' }));
  write(dir, 'frontend/src/App/index.tsx', 'stored screens');
  console.log('Pulled revision 3: 3 files written, 0 removed');
  process.exit(0);
}
console.log('ok');
`;
const text = (r: any) => r.content[0].text as string;

describe('scaffolding a new project for an app that has code on ToolJet', () => {
  let root: string;
  let log: string;
  const env = { ...process.env };
  const calls = () => readFileSync(log, 'utf8').trim().split('\n');
  const project = () => join(root, 'apps', DEPLOYMENT, WORKSPACE, 'spend');
  const scaffold = async () =>
    JSON.parse(text(await codeAppScaffoldTool(codeContext()).handler({ name: 'spend', display_name: 'Spend Approvals', app_id: APP })));

  beforeEach(() => {
    resetCodeSessionForTests();
    root = mkdtempSync(join(tmpdir(), 'code-app-rescaffold-'));
    log = join(root, 'calls.log');
    writeFileSync(log, '');
    writeFileSync(join(root, 'cli.js'), FAKE_CLI);
    mkdirSync(join(root, 'apps'));
    Object.assign(process.env, {
      TOOLJET_CLI: join(root, 'cli.js'),
      TOOLJET_CODE_APP_ROOT: join(root, 'apps'),
      FAKE_CLI_LOG: log,
      FAKE_STORED: join(root, 'stored'),
    });
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(root, { recursive: true, force: true });
  });

  it("brings the stored code down over the template, so the project names the app's library", async () => {
    writeFileSync(join(root, 'stored'), '1');
    const out = await scaffold();
    expect(out.stored_code).toMatch(/already has code on ToolJet/);
    expect(JSON.parse(readFileSync(join(project(), 'frontend/.tooljet/config.json'), 'utf8')).correlationId).toBe(OWN);
    expect(readFileSync(join(project(), 'frontend/src/App/index.tsx'), 'utf8')).toBe('stored screens');
    // The stored package.json differs from the template's: its packages are installed.
    expect(calls().filter((c) => c === 'app install')).toHaveLength(2);
    expect(calls()).toContain('app source-pull --force');
    // The first read of the build does not pull again.
    const before = calls().length;
    await codeAppReadFilesTool(codeContext()).handler({ app_id: APP, paths: ['frontend/src/App/index.tsx'] } as any);
    expect(calls().slice(before).filter((c) => c.startsWith('app source-pull'))).toEqual([]);
  });

  it('keeps the template for an app with no code yet', async () => {
    const out = await scaffold();
    expect(out).not.toHaveProperty('stored_code');
    expect(readFileSync(join(project(), 'frontend/src/App/index.tsx'), 'utf8')).toBe('template');
    expect(calls().filter((c) => c === 'app install')).toHaveLength(1);
  });

  it('never replaces the files of a project the app already has', async () => {
    await scaffold();
    writeFileSync(join(project(), 'frontend/src/App/index.tsx'), 'work in progress');
    writeFileSync(join(root, 'stored'), '1');
    const out = await scaffold();
    expect(out.existing_project).toBe('spend');
    expect(readFileSync(join(project(), 'frontend/src/App/index.tsx'), 'utf8')).toBe('work in progress');
    expect(existsSync(join(project(), '.tooljet', 'before-pull'))).toBe(false);
  });
});
