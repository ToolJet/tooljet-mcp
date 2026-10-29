import { afterAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../plugins/tooljet-antigravity/', import.meta.url);
const build = (...args: string[]) => execFileSync(process.execPath,
  ['scripts/build-antigravity-plugin.mjs', ...args], { cwd: root, stdio: 'pipe' });
const read = (name: string) => readFileSync(new URL(name, output), 'utf8');
const config = () => JSON.parse(read('mcp_config.json')).mcpServers;

describe.sequential('Antigravity authentication package boundary', () => {
  afterAll(() => { build(); });

  it('builds one explicit Cloud OAuth connection without PAT or local-server variables', () => {
    build('--auth=oauth');
    const servers = config();
    expect(Object.keys(servers)).toEqual(['tooljet']);
    expect(servers.tooljet.serverUrl).toBe('https://mcp-oauth.tooljet.com/mcp/${TOOLJET_WORKSPACE_ID}');
    expect(servers.tooljet.variables.map((v: { name: string }) => v.name)).toEqual(['TOOLJET_WORKSPACE_ID']);
    expect(servers.tooljet).not.toHaveProperty('command');
    expect(servers.tooljet).not.toHaveProperty('headers');
    expect(servers.tooljet).not.toHaveProperty('env');
    expect(read('README.md')).toContain('No PAT or local Node.js server is required');
    expect(read('skills/tooljet-app-builder/SKILL.md')).toBe(readFileSync(
      new URL('../skills/tooljet-app-builder/SKILL.md', import.meta.url), 'utf8'));
  });

  it('keeps one PAT connection as default and never registers both transports', () => {
    build();
    const servers = config();
    expect(Object.keys(servers)).toEqual(['tooljet']);
    expect(servers.tooljet.command).toBe('node');
    expect(servers.tooljet.args).toEqual(['${PLUGIN_ROOT}/bundle/index.js']);
    expect(servers.tooljet.env.TOOLJET_PAT).toBe('${TOOLJET_PAT}');
    expect(servers.tooljet).not.toHaveProperty('serverUrl');
    expect(servers.tooljet).not.toHaveProperty('headers');
    expect(read('README.md')).toContain('Node.js 20 or later');
  });

  it('rejects unknown or conflicting modes before replacing an existing package', () => {
    build();
    const previous = read('mcp_config.json');
    expect(() => build('--auth=both')).toThrow();
    expect(() => build('--auth=oauth', '--auth=pat')).toThrow();
    expect(read('mcp_config.json')).toBe(previous);
  });
});
