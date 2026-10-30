import { describe, expect, it } from 'vitest';
import { existsSync, lstatSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import { parse } from 'yaml';
import { buildAgentSkillPlugin } from '../scripts/build-skill-plugin.mjs';

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

describe('Gemini CLI and Kiro generated packages', () => {
const targets = [['gemini', ((root) => buildAgentSkillPlugin(root, 'gemini')), 'gemini-extension.json'], ['kiro', ((root) => buildAgentSkillPlugin(root, 'kiro')), 'plugin.json']];
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-gemini-kiro-'));
  t.onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'skills/tooljet-app-builder/references'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"version":"9.8.7"}');
  writeFileSync(join(dir, 'LICENSE'), 'license');
  writeFileSync(join(dir, 'README.md'), ['gemini', 'kiro'].map(name => `<!-- agent-guide:${name}:start -->\n${name} setup\n<!-- agent-guide:${name}:end -->`).join('\n'));
  writeFileSync(join(dir, 'skills/tooljet-app-builder/SKILL.md'), 'canonical skill');
  writeFileSync(join(dir, 'skills/tooljet-app-builder/references/qa.md'), 'canonical verification');
  return dir;
}

for (const [target, build, manifestName] of targets) {
  it(`${target} ships one shared skill with a native manifest and no credential/runtime hooks`, t => {
    const dir = fixture(t);
    const out = build(dir);
    const manifest = JSON.parse(readFileSync(join(out, manifestName)));
    assert.equal(manifest.name, 'tooljet');
    assert.equal(manifest.version, '9.8.7');
    assert.deepEqual(readdirSync(out).sort(), ['LICENSE', 'README.md', manifestName, 'skills'].sort());
    assert.equal(manifest.mcpServers, undefined);
    assert.equal(manifest.hooks, undefined);
    assert.equal(readFileSync(join(out, 'README.md'), 'utf8'), `${target} setup\n`);
    for (const name of ['SKILL.md', 'references/qa.md']) {
      assert.deepEqual(readFileSync(join(out, 'skills/tooljet-app-builder', name)), readFileSync(join(dir, 'skills/tooljet-app-builder', name)));
    }
    if (target === 'kiro') {
      assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
      for (const keyword of ['dashboards', 'internal-tools', 'spreadsheet', 'excel', 'back-office', 'workflow']) assert.ok(manifest.keywords.includes(keyword));
    } else assert.deepEqual(Object.keys(manifest).sort(), ['description', 'name', 'version']);
  });

  it(`${target} rebuild removes stale files and excludes env files and offline exports`, t => {
    const dir = fixture(t);
    const source = join(dir, 'skills/tooljet-app-builder');
    mkdirSync(join(source, 'references/catalog'));
    writeFileSync(join(source, 'references/catalog/unused.md'), 'offline');
    writeFileSync(join(source, '.env.local'), 'MUST_NOT_SHIP');
    const out = build(dir);
    writeFileSync(join(out, 'mcp.json'), 'stale credentials');
    writeFileSync(join(out, 'skills/tooljet-app-builder/references/stale.md'), 'obsolete');
    build(dir);
    for (const file of ['mcp.json', 'skills/tooljet-app-builder/references/stale.md', 'skills/tooljet-app-builder/references/catalog', 'skills/tooljet-app-builder/.env.local']) assert.equal(existsSync(join(out, file)), false);
  });

  it(`${target} rejects a skill symlink before replacing existing output`, t => {
    const dir = fixture(t);
    const out = build(dir);
    const manifest = readFileSync(join(out, manifestName));
    symlinkSync(join(dir, 'LICENSE'), join(dir, 'skills/tooljet-app-builder/external'));
    assert.throws(() => build(dir), /must not contain symlinks/);
    assert.deepEqual(readFileSync(join(out, manifestName)), manifest);
  });
}

it('documented Cloud connection examples are concrete templates, not shipped broken server configs', () => {
  for (const [target] of targets) {
    const doc = readFileSync(join(root, 'README.md'), 'utf8').split(`<!-- agent-guide:${target}:start -->`)[1].split(`<!-- agent-guide:${target}:end -->`)[0];
    const blocks = [...doc.matchAll(/```json\n([\s\S]*?)\n\s*```/g)];
    assert.equal(blocks.length, 1);
    const server = JSON.parse(blocks[0][1]).mcpServers.tooljet;
    assert.equal(server[target === 'gemini' ? 'httpUrl' : 'url'], 'https://mcp-oauth.tooljet.com/mcp/YOUR-WORKSPACE-UUID');
    assert.equal(server.headers, undefined);
    assert.equal(server.command, undefined);
    assert.ok(doc.includes('replacing'));
    assert.ok(doc.includes('personally') || doc.includes('Personally'));
  }
});

it('canonical skill metadata remains portable string-to-string Agent Skills metadata', () => {
  const text = readFileSync(join(root, 'skills/tooljet-app-builder/SKILL.md'), 'utf8');
  const frontmatter = parse(text.split('---')[1]);
  assert.equal(frontmatter.name, 'tooljet-app-builder');
  for (const value of Object.values(frontmatter.metadata)) assert.equal(typeof value, 'string');
  assert.match(frontmatter.metadata.sources, /Source-verified component binding rules/);
});

});
