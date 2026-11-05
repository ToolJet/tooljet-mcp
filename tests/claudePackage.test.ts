import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const manifest = read('integrations/claude/plugin.json');

describe('Claude directory plugin', () => {
  it('connects through hosted OAuth without local execution or credential configuration', () => {
    expect(manifest.mcpServers).toEqual({
      tooljet: { type: 'http', url: 'https://mcp-oauth.tooljet.com/mcp' },
    });
    expect(manifest).not.toHaveProperty('userConfig');
    expect(manifest).not.toHaveProperty('hooks');
  });

  it('installs only the dedicated package with the existing plugin identity', () => {
    const entry = read('.claude-plugin/marketplace.json').plugins.find((plugin: any) => plugin.name === manifest.name);
    expect(entry).toMatchObject({ name: 'tooljet-app-builder', source: './plugins/tooljet-claude', version: manifest.version, description: manifest.description });
    expect(read('plugins/tooljet-claude/.claude-plugin/plugin.json')).toEqual(manifest);
  });
});
