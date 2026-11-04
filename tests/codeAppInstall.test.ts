import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppInstallTool } from '../src/tools/codeApp.js';
import { codeContext, WORKSPACE } from './codeContext.js';

// A fake CLI: `app publish -v X` fails with the server's "already exists" for the versions in FAKE_TAKEN.
const FAKE_CLI = `
const fs = require('fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, JSON.stringify(args) + '\\n');
if (process.argv[3] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
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

// One version line (user decision, 2026-11-02): a Code mode app is versioned like any app. Saving the version freezes
// its code server-side, so the install has no publish step of its own.
let skipPull = true; // the first-touch pull of the stored code is tested in codeAppSync.test.ts

describe('code_app_install', () => {
  let dir: string;
  const env = { ...process.env };
  const calls = () => readFileSync(join(dir, 'cli.log'), 'utf8').trim().split('\n').map((line) => JSON.parse(line)).filter((args) => args[1] !== 'check' && !(args[1] === 'source-pull' && skipPull));

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-install-'));
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

  it('has no publish option and never runs tooljet app publish', async () => {
    const tool = codeAppInstallTool(codeContext());
    expect(Object.keys(tool.inputSchema)).toEqual(['app_id', 'name']);
    await tool.handler({ name: 'tasks', publish: true } as any);
    expect(calls()).toEqual([['app', 'dev', '--once', '--source', 'platform']]);
    expect(tool.description).not.toMatch(/publish: true|published code version/);
  });
});

describe('Code mode tool descriptions', () => {
  it('end with the user vocabulary rule and do not teach internal words', async () => {
    const mod = await import('../src/tools/codeApp.js');
    const tools = [mod.codeAppScaffoldTool(codeContext()), mod.codeAppReadFilesTool(codeContext()), mod.codeAppWriteFilesTool(codeContext()), mod.codeAppBuildTool(codeContext()), mod.codeAppInstallTool(codeContext())];
    for (const tool of tools) {
      expect(tool.description.endsWith(mod.USER_WORDS)).toBe(true);
      const own = tool.description.slice(0, -mod.USER_WORDS.length);
      expect(own).not.toMatch(/root component|pins the app version|published revision/);
    }
  });
});
