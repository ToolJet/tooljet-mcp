import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppInstallTool, nextRevision } from '../src/tools/codeApp.js';

// A fake CLI: `app publish -v X` fails with the server's "already exists" for the versions in FAKE_TAKEN.
const FAKE_CLI = `
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(args) + '\\n');
if (args[1] === 'publish') {
  const version = args[args.indexOf('-v') + 1];
  if ((process.env.FAKE_TAKEN || '').split(',').includes(version)) {
    console.log('✗ Error : Version "' + version + '" already exists for this library, choose a different version.');
    process.exit(1);
  }
  if (process.env.FAKE_FAIL) { console.log(process.env.FAKE_FAIL); process.exit(1); }
  console.log("✓ Published " + version + " and pinned the app's editing version to it");
} else console.log('Open: http://localhost/editor');
`;

// UX review (2026-11-02): an AI-built app stayed pinned to a developer preview, so Save version and release were blocked
// and the agent told the user to run `tooljet app publish` on the server. The tool publishes it here instead.
describe('code_app_install publish', () => {
  let dir: string;
  const env = { ...process.env };
  const calls = () => readFileSync(join(dir, 'cli.log'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const result = (r: any) => JSON.parse(r.content[0].text);
  const project = () => join(dir, 'apps', 'tasks');

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-publish-'));
    writeFileSync(join(dir, 'cli.js'), FAKE_CLI);
    mkdirSync(join(project(), 'frontend', 'src'), { recursive: true });
    writeFileSync(join(project(), 'app.json'), '{}');
    process.env.TOOLJET_CLI = join(dir, 'cli.js');
    process.env.TOOLJET_CODE_APP_ROOT = join(dir, 'apps');
    process.env.FAKE_CLI_LOG = join(dir, 'cli.log');
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
  });

  it('numbers revisions 1.0.0, 1.0.1, ...', () => {
    expect(nextRevision()).toBe('1.0.0');
    expect(nextRevision('1.0.0')).toBe('1.0.1');
    expect(nextRevision('2.3.9')).toBe('2.3.10');
    expect(nextRevision('not a version')).toBe('1.0.0');
  });

  it('publishes with the source stored on ToolJet and remembers the revision', async () => {
    const first = result(await codeAppInstallTool().handler({ name: 'tasks', publish: true } as any));
    expect(first).toMatchObject({ published: true, revision: '1.0.0' });
    expect(calls()).toEqual([['app', 'publish', '-v', '1.0.0', '-m', 'Published by the AI builder', '--source', 'platform']]);
    const second = result(await codeAppInstallTool().handler({ name: 'tasks', publish: true } as any));
    expect(second.revision).toBe('1.0.1');
    expect(JSON.parse(readFileSync(join(project(), 'frontend', '.tooljet', 'published.json'), 'utf8')).version).toBe('1.0.1');
  });

  it('skips a revision number the library already has', async () => {
    process.env.FAKE_TAKEN = '1.0.0,1.0.1';
    const published = result(await codeAppInstallTool().handler({ name: 'tasks', publish: true } as any));
    expect(published.revision).toBe('1.0.2');
    expect(calls().map((c) => c[3])).toEqual(['1.0.0', '1.0.1', '1.0.2']);
  });

  it('reports any other failure (a failed security gate) without retrying or remembering a revision', async () => {
    process.env.FAKE_FAIL = '✗ The security scan fails the gate. Fix the findings above.';
    const res: any = await codeAppInstallTool().handler({ name: 'tasks', publish: true } as any);
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res)).toMatch(/security scan fails the gate/);
    expect(calls()).toHaveLength(1);
    expect(existsSync(join(project(), 'frontend', '.tooljet', 'published.json'))).toBe(false);
  });

  it('still installs to the dev track without publish', async () => {
    await codeAppInstallTool().handler({ name: 'tasks' } as any);
    expect(calls()).toEqual([['app', 'dev', '--once', '--source', 'platform']]);
  });
});
