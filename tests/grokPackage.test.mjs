import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildGrokPlugin } from '../scripts/build-grok-plugin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-grok-package-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'skills', 'tooljet-app-builder'), { recursive: true });
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'package.json'), '{"version":"9.8.7"}');
  writeFileSync(join(dir, 'LICENSE'), 'fixture license');
  writeFileSync(join(dir, 'docs', 'grok-build.md'), 'fixture setup');
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', 'SKILL.md'), 'canonical guidance');
  return dir;
}

test('Cloud package has one native OAuth transport and no credential or runtime fallback', t => {
  const dir = fixture(t); const out = buildGrokPlugin(dir);
  const config = JSON.parse(readFileSync(join(out, '.mcp.json')));
  assert.deepEqual(config, { mcpServers: { tooljet: {
    type: 'http', url: 'https://mcp-oauth.tooljet.com/mcp/${TOOLJET_WORKSPACE_ID}',
  } } });
  const manifest = JSON.parse(readFileSync(join(out, '.grok-plugin', 'plugin.json')));
  assert.equal(manifest.version, '9.8.7');
  assert.equal(manifest.license, 'ISC');
  assert.equal(manifest.hooks, undefined);
  assert.equal(existsSync(join(out, 'bundle')), false);
});

test('copies maintained guidance and license without unrelated files or credentials', t => {
  const dir = fixture(t);
  writeFileSync(join(dir, '.env'), 'MUST_NOT_SHIP=secret');
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', '.env.local'), 'MUST_NOT_SHIP=secret');
  const out = buildGrokPlugin(dir);
  assert.equal(readFileSync(join(out, 'skills', 'tooljet-app-builder', 'SKILL.md'), 'utf8'), 'canonical guidance');
  assert.equal(readFileSync(join(out, 'LICENSE'), 'utf8'), 'fixture license');
  assert.equal(existsSync(join(out, '.env')), false);
  assert.equal(existsSync(join(out, 'skills', 'tooljet-app-builder', '.env.local')), false);
});

test('rejects symlinks that could escape the canonical skill tree', t => {
  const dir = fixture(t);
  symlinkSync(join(dir, 'LICENSE'), join(dir, 'skills', 'tooljet-app-builder', 'external'));
  assert.throws(() => buildGrokPlugin(dir), /must not contain symlinks/);
});

test('real generated package preserves canonical skill bytes and leaves other host configs alone', t => {
  const dir = fixture(t);
  cpSync(join(root, 'skills', 'tooljet-app-builder'), join(dir, 'skills', 'tooljet-app-builder'), { recursive: true });
  const before = readFileSync(join(root, '.mcp.json'));
  const out = buildGrokPlugin(dir);
  assert.deepEqual(readFileSync(join(out, 'skills', 'tooljet-app-builder', 'SKILL.md')), readFileSync(join(root, 'skills', 'tooljet-app-builder', 'SKILL.md')));
  assert.deepEqual(readFileSync(join(root, '.mcp.json')), before);
});
