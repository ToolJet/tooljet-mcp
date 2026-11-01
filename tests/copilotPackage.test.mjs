import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildCopilotPlugin } from '../scripts/build-copilot-plugin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-copilot-package-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'skills', 'tooljet-app-builder'), { recursive: true });
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'package.json'), '{"version":"9.8.7"}');
  writeFileSync(join(dir, 'LICENSE'), 'fixture license');
  writeFileSync(join(dir, 'docs', 'copilot.md'), 'fixture setup');
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', 'SKILL.md'), 'canonical guidance');
  return dir;
}

test('portable skill package contains no broken workspace template or credential/runtime hook', t => {
  const out = buildCopilotPlugin(fixture(t));
  const manifest = JSON.parse(readFileSync(join(out, 'plugin.json')));
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(manifest.version, '9.8.7');
  for (const field of ['hooks', 'mcpServers', 'skills']) assert.equal(manifest[field], undefined);
  for (const file of ['mcp.json', '.mcp.json', 'bundle', 'hooks']) assert.equal(existsSync(join(out, file)), false);
});

test('packages shared references and license while excluding offline catalogs and env files', t => {
  const dir = fixture(t);
  mkdirSync(join(dir, 'skills', 'tooljet-app-builder', 'references', 'catalog'), { recursive: true });
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', 'references', 'qa.md'), 'shared QA');
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', 'references', 'catalog', 'unused.md'), 'offline catalog');
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', '.env.local'), 'MUST_NOT_SHIP=secret');
  const out = buildCopilotPlugin(dir);
  assert.equal(readFileSync(join(out, 'skills', 'tooljet-app-builder', 'references', 'qa.md'), 'utf8'), 'shared QA');
  assert.equal(readFileSync(join(out, 'LICENSE'), 'utf8'), 'fixture license');
  assert.equal(existsSync(join(out, 'skills', 'tooljet-app-builder', 'references', 'catalog')), false);
  assert.equal(existsSync(join(out, 'skills', 'tooljet-app-builder', '.env.local')), false);
});

test('rejects symbolic links outside the shared skill', t => {
  const dir = fixture(t);
  symlinkSync(join(dir, 'LICENSE'), join(dir, 'skills', 'tooljet-app-builder', 'external'));
  assert.throws(() => buildCopilotPlugin(dir), /must not contain symlinks/);
});

test('preserves the actual canonical skill and existing MCP configuration', t => {
  const dir = fixture(t);
  cpSync(join(root, 'skills', 'tooljet-app-builder'), join(dir, 'skills', 'tooljet-app-builder'), { recursive: true });
  const existing = readFileSync(join(root, '.mcp.json'));
  const out = buildCopilotPlugin(dir);
  assert.deepEqual(readFileSync(join(out, 'skills', 'tooljet-app-builder', 'SKILL.md')), readFileSync(join(root, 'skills', 'tooljet-app-builder', 'SKILL.md')));
  assert.deepEqual(readFileSync(join(root, '.mcp.json')), existing);
});
