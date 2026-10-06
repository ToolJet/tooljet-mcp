import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { credentialFromEnv, editJson, entryHoldsToken, jsonFileAdapter } from '../src/cli/agents/shared.js';
import { ADAPTERS, manualSetup, manualText } from '../src/cli/agents/index.js';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'tj-agents-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const launch = { command: '/usr/local/bin/node', args: ['/home/me/.tooljet-mcp/bundle/index.js'] };

describe('editing another program\'s JSON config', () => {
  it('changes only our entry, keeps a backup, and drops a stored token with the old entry', async () => {
    const file = join(dir, 'mcp_config.json');
    writeFileSync(file, JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x' }, tooljet: { command: 'node', env: { TOOLJET_PAT: 'tj_pat_old' } } } }));
    const adapter = jsonFileAdapter({ id: 't', name: 'T', detect: () => true, file: () => file, reload: '' });
    expect(adapter.status()).toEqual({ connected: 'yes', storedToken: true });

    await adapter.connect(launch);
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    expect(doc.theme).toBe('dark');
    expect(doc.mcpServers.other).toEqual({ command: 'x' });
    expect(doc.mcpServers.tooljet).toEqual({ command: launch.command, args: launch.args });
    expect(readFileSync(file, 'utf8')).not.toContain('tj_pat_old');
    expect(readFileSync(`${file}.tj.bak`, 'utf8')).toContain('tj_pat_old');
    expect(adapter.status()).toEqual({ connected: 'yes', storedToken: false });

    await adapter.disconnect();
    expect(JSON.parse(readFileSync(file, 'utf8')).mcpServers).toEqual({ other: { command: 'x' } });
  });

  it('creates the file when the agent has none yet', async () => {
    const file = join(dir, 'nested', 'mcp.json');
    await jsonFileAdapter({ id: 't', name: 'T', detect: () => true, file: () => file, reload: '' }).connect(launch);
    expect(JSON.parse(readFileSync(file, 'utf8')).mcpServers.tooljet.command).toBe(launch.command);
  });

  it('refuses a file with comments rather than deleting them', () => {
    const file = join(dir, 'settings.json');
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, '{\n  // my note\n  "a": 1\n}');
    expect(() => editJson(file, (d) => { d.b = 2; })).toThrow(/left untouched/);
    expect(readFileSync(file, 'utf8')).toContain('// my note');
    expect(existsSync(`${file}.tj.bak`)).toBe(false);
  });

  it('recognizes a stored token in env or headers, but not a placeholder', () => {
    expect(entryHoldsToken({ env: { TOOLJET_PAT: 'tj_pat_x' } })).toBe(true);
    expect(entryHoldsToken({ headers: { 'x-tooljet-pat': 'tj_pat_x' } })).toBe(true);
    expect(entryHoldsToken({ env: { TOOLJET_PAT: '${TOOLJET_PAT}' } })).toBe(false);
    expect(entryHoldsToken({ command: 'node' })).toBe(false);
  });
});

describe('existing setups', () => {
  it('reads the credential an agent already holds, and writes back only a label', async () => {
    const file = join(dir, 'mcp_config.json');
    writeFileSync(file, JSON.stringify({ mcpServers: { tooljet: { command: 'node', env: { TOOLJET_PAT: 'tj_pat_old', TOOLJET_URL: 'https://app.tooljet.ai' } } } }));
    const adapter = jsonFileAdapter({ id: 't', name: 'T', detect: () => true, file: () => file, reload: '' });
    expect(adapter.storedCredential!()).toEqual({ url: 'https://app.tooljet.ai', apiUrl: 'https://app.tooljet.ai', pat: 'tj_pat_old' });
    await adapter.connect({ ...launch, env: { TOOLJET_AGENT: 't' } });
    const entry = JSON.parse(readFileSync(file, 'utf8')).mcpServers.tooljet;
    expect(entry.env).toEqual({ TOOLJET_AGENT: 't' });
    expect(adapter.status().storedToken).toBe(false);
  });

  it('ignores placeholders and half-configured entries', () => {
    expect(credentialFromEnv({ TOOLJET_PAT: '${TOOLJET_PAT}', TOOLJET_URL: 'https://x.example' })).toBeUndefined();
    expect(credentialFromEnv({ TOOLJET_PAT: 'tj_pat_x' })).toBeUndefined();
  });
});

describe('manual setup for an agent that is not listed', () => {
  const url = 'https://github.com/ToolJet/tooljet-mcp.git';
  const mac = manualSetup(url, 'darwin');
  const linux = manualSetup(url, 'linux');
  const windows = manualSetup(url, 'win32');
  const all = [mac, linux, windows];

  it('tells everyone the same two steps: clone the repo, then hook up bundle/index.js', () => {
    for (const setup of all) {
      expect(setup.cloneCommand).toBe(`git clone ${url}`);
      expect(JSON.parse(setup.json)).toEqual({ mcpServers: { tooljet: { command: 'node', args: [setup.argument] } } });
      const text = manualText(setup);
      expect(text).toContain(setup.cloneCommand);
      expect(text).toContain('Command    node');
      expect(text).toContain(`Argument   ${setup.argument}`);
    }
  });

  it('uses a placeholder path, in each OS\'s own style, and no example path at all', () => {
    expect(mac).toMatchObject({ placeholder: '/path/to', argument: '/path/to/tooljet-mcp/bundle/index.js' });
    expect(linux).toMatchObject({ placeholder: '/path/to', argument: '/path/to/tooljet-mcp/bundle/index.js' });
    expect(windows).toMatchObject({ placeholder: 'C:/path/to', argument: 'C:/path/to/tooljet-mcp/bundle/index.js' });
    expect(manualText(windows)).toContain('Replace C:/path/to with the folder you cloned into.');
    // A path like /Users/<name>/ would trip the build's machine-path check, so there is none.
    for (const setup of all) expect(manualText(setup)).not.toMatch(/\/(Users|home)\//);
  });

  it('adapts the helper lines to the OS', () => {
    expect(manualText(mac)).toContain('run: which node');
    expect(manualText(mac)).toContain('Run pwd inside the tooljet-mcp folder');
    expect(manualText(windows)).toContain('run: where node');
    expect(manualText(windows)).toContain("File Explorer's address bar");
    // A backslash in JSON has to be doubled, which people get wrong — so Windows paths use forward slashes.
    expect(windows.json).not.toContain('\\');
    expect(manualText(windows)).toContain('keep the forward slashes, or double every backslash');
    expect(manualText(mac)).not.toContain('backslash');
  });

  it('says nothing about THIS machine: no home folder, user name, Node install path or working folder', () => {
    for (const setup of all) {
      const text = manualText(setup);
      for (const local of [homedir(), userInfo().username, process.execPath, process.cwd()]) expect(text).not.toContain(local);
      expect(text).not.toContain('You already have');
    }
  });

  it('never carries a token, an env block, or formats for agents tj connects itself', () => {
    for (const setup of all) {
      const text = manualText(setup);
      expect(text).not.toMatch(/TOOLJET_|tj_pat|"env"/);
      expect(text).not.toMatch(/VS Code|Codex|Cursor|context_servers|\[mcp_servers/);
    }
  });

  it('survives a copy and paste, and fits a 76-column window without wrapping', () => {
    for (const setup of all) {
      const text = manualText(setup);
      expect(text).not.toMatch(/[ \t]+$/m);
      expect(text).not.toMatch(/\x1b|[│┌└◆◇╮╯]/);
      for (const line of text.split('\n')) expect(line.length, line).toBeLessThanOrEqual(76);
    }
  });
});

describe('agent list', () => {
  it('has unique ids, and every agent says how to reload it', () => {
    expect(new Set(ADAPTERS.map((a) => a.id)).size).toBe(ADAPTERS.length);
    for (const a of ADAPTERS) expect(a.reload.length).toBeGreaterThan(10);
  });
});
