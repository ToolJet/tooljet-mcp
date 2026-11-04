import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppInstallTool, codeAppReadFilesTool } from '../src/tools/codeApp.js';
import { codeContext, WORKSPACE } from './codeContext.js';

// A fake CLI that records its arguments and answers source-pull like the real one.
const FAKE_CLI = `
const fs = require('fs');
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
if (process.argv[3] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (process.argv[3] === 'source-pull') console.log(process.env.FAKE_PULL || 'Already at revision 1 (owner platform)');
else console.log('Open: http://localhost/editor');
`;

let skipPull = true; // the first-touch pull of the stored code is tested in codeAppSync.test.ts

describe('Code mode source on ToolJet', () => {
  let dir: string;
  const env = { ...process.env };
  const calls = () =>
    readFileSync(join(dir, 'cli.log'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .filter((args) => args[1] !== 'check' && !(args[1] === 'source-pull' && skipPull)); // the security scan install runs first (codeAppSecurity.test.ts)
  const result = (r: any) => JSON.parse(r.content[0].text);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-source-'));
    writeFileSync(join(dir, 'cli.js'), FAKE_CLI);
    mkdirSync(join(dir, 'apps', WORKSPACE, 'tasks', 'frontend', 'src'), { recursive: true });
    writeFileSync(join(dir, 'apps', WORKSPACE, 'tasks', 'app.json'), '{"appId":"app-1"}');
    process.env.TOOLJET_CLI = join(dir, 'cli.js');
    process.env.TOOLJET_CODE_APP_ROOT = join(dir, 'apps');
    process.env.FAKE_CLI_LOG = join(dir, 'cli.log');
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
  });

  it('installs with the source stored on ToolJet, owner platform', async () => {
    await codeAppInstallTool(codeContext()).handler({ name: 'tasks' } as any);
    expect(calls()).toEqual([['app', 'dev', '--once', '--source', 'platform']]);
  });

  it('brings Code panel edits down before reading, and says so', async () => {
    skipPull = false;
    process.env.FAKE_PULL = 'Pulled revision 3 (owner platform): 2 files written, 0 removed';
    const read = result(await codeAppReadFilesTool(codeContext()).handler({ name: 'tasks' } as any));
    expect(calls()[0]).toEqual(['app', 'source-pull']);
    expect(read.editor_edits).toMatch(/Pulled revision 3/);
    skipPull = true;
  });

  it('reads quietly when the project is already in step', async () => {
    const read = result(await codeAppReadFilesTool(codeContext()).handler({ name: 'tasks' } as any));
    expect(read).not.toHaveProperty('editor_edits');
    expect(read).not.toHaveProperty('sync_warning');
  });
});
