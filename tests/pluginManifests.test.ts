import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/* Four ecosystems, each insisting on its own filename for the same facts: Claude Code
   (.claude-plugin/), Agent Plugins 1.0 for Copilot and VS Code (plugin.json + mcp.json), and Codex
   (.codex-plugin/ + .mcp.json + .agents/plugins/marketplace.json). Nothing stops one from drifting
   except this file, and a stale version or a wrong bundle path fails only at a user's install. */
const root = resolve(__dirname, '..');
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const AGENT_PLUGIN = read('plugin.json');
const CODEX_PLUGIN = read('.codex-plugin/plugin.json');
const CLAUDE_PLUGIN = read('.claude-plugin/plugin.json');
const CLAUDE_MARKET = read('.claude-plugin/marketplace.json');
const CODEX_MARKET = read('.agents/plugins/marketplace.json');

describe('plugin manifests agree across ecosystems', () => {
  it('names the same plugin everywhere, so the documented install commands resolve', () => {
    const names = [AGENT_PLUGIN.name, CODEX_PLUGIN.name, CLAUDE_PLUGIN.name];
    expect(new Set(names).size).toBe(1);
    expect(CLAUDE_MARKET.plugins.map((p: any) => p.name)).toContain(AGENT_PLUGIN.name);
    expect(CODEX_MARKET.plugins.map((p: any) => p.name)).toContain(AGENT_PLUGIN.name);
  });

  it('publishes one version, not three', () => {
    expect(new Set([AGENT_PLUGIN.version, CODEX_PLUGIN.version, CLAUDE_PLUGIN.version]).size).toBe(1);
  });

  it('declares the same MCP server in both filenames', () => {
    expect(read('.mcp.json')).toEqual(read('mcp.json'));
  });

  it('points every manifest at a bundle that exists', () => {
    const args: string[] = [
      ...read('mcp.json').mcpServers.tooljet.args,
      ...CLAUDE_PLUGIN.mcpServers.tooljet.args,
    ];
    for (const arg of args) {
      const rel = arg.replace(/\$\{[A-Z_]+\}\//, '');
      expect(existsSync(resolve(root, rel)), `${arg} -> ${rel}`).toBe(true);
    }
  });

  it('ships the skill at the path every ecosystem auto-discovers', () => {
    expect(existsSync(resolve(root, 'skills/tooljet-app-builder/SKILL.md'))).toBe(true);
  });

  it('declares the Codex discovery paths and required interface metadata', () => {
    expect(CODEX_PLUGIN).toMatchObject({
      skills: './skills/',
      mcpServers: './.mcp.json',
      interface: {
        displayName: 'ToolJet App Builder',
        shortDescription: expect.any(String),
        longDescription: expect.any(String),
        developerName: 'ToolJet',
        category: 'Productivity',
        capabilities: expect.arrayContaining(['Interactive', 'Write']),
        defaultPrompt: expect.any(Array),
      },
    });
  });

  it('requires the fields each marketplace format demands', () => {
    expect(CODEX_MARKET.interface?.displayName).toBeTruthy();
    for (const p of CODEX_MARKET.plugins) {
      expect(p.source?.source).toBeTruthy();
      expect(p.policy?.installation).toBeTruthy();
      expect(p.policy?.authentication).toBeTruthy();
      expect(p.category).toBeTruthy();
    }
  });
});
