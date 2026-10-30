import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';
import { buildGeminiExtension } from '../scripts/build-gemini-extension.mjs';
import { buildKiroPower } from '../scripts/build-kiro-power.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = [['gemini', buildGeminiExtension, 'gemini-extension.json'], ['kiro', buildKiroPower, 'plugin.json']];
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-gemini-kiro-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'skills/tooljet-app-builder/references'), { recursive: true });
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'package.json'), '{"version":"9.8.7"}');
  writeFileSync(join(dir, 'LICENSE'), 'license');
  for (const name of ['gemini', 'kiro']) writeFileSync(join(dir, 'docs', `${name}.md`), `${name} setup`);
  writeFileSync(join(dir, 'skills/tooljet-app-builder/SKILL.md'), 'canonical skill');
  writeFileSync(join(dir, 'skills/tooljet-app-builder/references/qa.md'), 'canonical verification');
  return dir;
}

for (const [target, build, manifestName] of targets) {
  test(`${target} ships one shared skill with a native manifest and no credential/runtime hooks`, t => {
    const dir = fixture(t);
    const out = build(dir);
    const manifest = JSON.parse(readFileSync(join(out, manifestName)));
    assert.equal(manifest.name, 'tooljet');
    assert.equal(manifest.version, '9.8.7');
    assert.deepEqual(readdirSync(out).sort(), ['LICENSE', 'README.md', manifestName, 'skills'].sort());
    assert.equal(manifest.mcpServers, undefined);
    assert.equal(manifest.hooks, undefined);
    assert.equal(readFileSync(join(out, 'README.md'), 'utf8'), `${target} setup`);
    for (const name of ['SKILL.md', 'references/qa.md']) {
      assert.deepEqual(readFileSync(join(out, 'skills/tooljet-app-builder', name)), readFileSync(join(dir, 'skills/tooljet-app-builder', name)));
    }
    if (target === 'kiro') {
      assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
      for (const keyword of ['dashboards', 'internal-tools', 'spreadsheet', 'excel', 'back-office', 'workflow']) assert.ok(manifest.keywords.includes(keyword));
    } else assert.deepEqual(Object.keys(manifest).sort(), ['description', 'name', 'version']);
  });

  test(`${target} rebuild removes stale files and excludes env files and offline exports`, t => {
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

  test(`${target} rejects a skill symlink before replacing existing output`, t => {
    const dir = fixture(t);
    const out = build(dir);
    const manifest = readFileSync(join(out, manifestName));
    symlinkSync(join(dir, 'LICENSE'), join(dir, 'skills/tooljet-app-builder/external'));
    assert.throws(() => build(dir), /must not contain symlinks/);
    assert.deepEqual(readFileSync(join(out, manifestName)), manifest);
  });
}

test('documented Cloud connection examples are concrete templates, not shipped broken server configs', () => {
  for (const [target] of targets) {
    const doc = readFileSync(join(root, 'docs', `${target}.md`), 'utf8');
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

test('canonical skill metadata remains portable string-to-string Agent Skills metadata', () => {
  const text = readFileSync(join(root, 'skills/tooljet-app-builder/SKILL.md'), 'utf8');
  const frontmatter = parse(text.split('---')[1]);
  assert.equal(frontmatter.name, 'tooljet-app-builder');
  for (const value of Object.values(frontmatter.metadata)) assert.equal(typeof value, 'string');
  assert.match(frontmatter.metadata.sources, /Source-verified component binding rules/);
});
