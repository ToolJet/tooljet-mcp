import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const root = resolve(__dirname, '..');
const plugin = resolve(root, 'plugins/tooljet-app-builder-skills');
const read = (file: string) => JSON.parse(readFileSync(resolve(plugin, file), 'utf8'));
function files(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    expect(lstatSync(path).isSymbolicLink(), `${prefix}${name} must survive installation into a cache`).toBe(false);
    return lstatSync(path).isDirectory() ? files(path, `${prefix}${name}/`) : [`${prefix}${name}`];
  });
}

describe('standalone app-builder skill plugin', () => {
  it('keeps shared skill metadata compatible with the Agent Skills specification', () => {
    const skill = readFileSync(resolve(plugin, 'skills/tooljet-app-builder/SKILL.md'), 'utf8');
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
    expect(frontmatter).not.toBeNull();
    const { metadata } = parse(frontmatter![1]);
    expect(Object.values(metadata).every(value => typeof value === 'string')).toBe(true);
  });

  it('cannot auto-register a server or run install hooks in any supported client', () => {
    expect(readdirSync(plugin).sort()).toEqual(['.claude-plugin', '.codex-plugin', 'plugin.json', 'skills']);
    for (const file of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'plugin.json']) {
      const manifest = read(file);
      for (const key of ['mcpServers', 'hooks', 'dependencies', 'userConfig', 'settings']) {
        expect(manifest).not.toHaveProperty(key);
      }
    }
    expect(files(plugin).filter((file) => /(?:^|\/)(?:\.?mcp\.json|\.env|settings\.json)$/.test(file))).toEqual([]);
  });

  it('ships the canonical skill and guidance without copying offline catalogs', () => {
    const canonical = resolve(root, 'skills/tooljet-app-builder');
    const packaged = resolve(plugin, 'skills/tooljet-app-builder');
    const guidanceFiles = files(canonical).filter((file) => !file.startsWith('references/catalog/'));
    expect(existsSync(resolve(packaged, 'references/catalog'))).toBe(false);
    expect(files(packaged).sort()).toEqual(guidanceFiles.sort());
    for (const file of guidanceFiles) {
      expect(readFileSync(resolve(packaged, file)).equals(readFileSync(resolve(canonical, file))), file).toBe(true);
    }
    const skill = readFileSync(resolve(packaged, 'SKILL.md'), 'utf8');
    for (const [reference] of skill.matchAll(/(?:references|scripts)\/[\w/-]+\.(?:md|js|json)/g)) {
      expect(existsSync(resolve(packaged, reference)), reference).toBe(true);
    }
  });

  it('is independently discoverable and versioned in both marketplaces', () => {
    const manifest = read('.claude-plugin/plugin.json');
    expect(manifest.name).toBe('tooljet-app-builder-skills');
    for (const file of ['.codex-plugin/plugin.json', 'plugin.json']) {
      expect(read(file)).toMatchObject({ name: manifest.name, version: manifest.version });
    }
    expect(read('.codex-plugin/plugin.json').skills).toBe('./skills/');
    for (const file of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) {
      const marketplace = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
      const entry = marketplace.plugins.find((p: { name: string }) => p.name === manifest.name);
      expect(entry).toBeDefined();
      expect(resolve(root, typeof entry.source === 'string' ? entry.source : entry.source.path)).toBe(plugin);
      if (entry.version) expect(entry.version).toBe(manifest.version);
    }
  });
});
