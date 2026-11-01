import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';
import { buildAgentSkillPlugin } from '../scripts/build-agent-skill-plugin.mjs';
import { buildCursorPlugin } from '../scripts/build-cursor-plugin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Cursor and Copilot share the same portable guidance without runtime or credential hooks', t => {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-cursor-package-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'skills', 'tooljet-app-builder'), { recursive: true });
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'package.json'), '{"version":"0.10.0"}');
  writeFileSync(join(dir, 'LICENSE'), 'license');
  for (const target of ['cursor', 'copilot']) writeFileSync(join(dir, 'docs', `${target}.md`), `${target} setup`);
  writeFileSync(join(dir, 'skills', 'tooljet-app-builder', 'SKILL.md'), 'one maintained skill');
  const cursor = buildCursorPlugin(dir);
  const copilot = buildAgentSkillPlugin(dir, 'copilot');
  assert.deepEqual(readFileSync(join(cursor, 'plugin.json')), readFileSync(join(copilot, 'plugin.json')));
  assert.deepEqual(readFileSync(join(cursor, 'skills', 'tooljet-app-builder', 'SKILL.md')), readFileSync(join(copilot, 'skills', 'tooljet-app-builder', 'SKILL.md')));
  assert.equal(readFileSync(join(cursor, 'README.md'), 'utf8'), 'cursor setup');
  assert.equal(readFileSync(join(copilot, 'README.md'), 'utf8'), 'copilot setup');
  assert.deepEqual(readdirSync(cursor).sort(), ['LICENSE', 'README.md', 'plugin.json', 'skills']);
  for (const file of ['mcp.json', '.mcp.json', 'hooks', 'bundle']) assert.equal(existsSync(join(cursor, file)), false);
});

test('a bad packaging target cannot delete another output path', t => {
  const dir = mkdtempSync(join(tmpdir(), 'tooljet-cursor-target-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'keep.txt'), 'preserved');
  assert.throws(() => buildAgentSkillPlugin(dir, '../../'), /Unsupported agent skill target/);
  assert.equal(readFileSync(join(dir, 'keep.txt'), 'utf8'), 'preserved');
});

test('registry metadata describes only the public workspace-templated OAuth service', () => {
  const listing = JSON.parse(readFileSync(join(root, 'registry/server.json')));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json')));
  assert.equal(listing.name, 'io.github.ToolJet/tooljet-mcp');
  assert.equal(listing.version, pkg.version);
  assert.ok(listing.description.length <= 100);
  assert.equal(listing.repository.url, 'https://github.com/ToolJet/tooljet-mcp');
  assert.equal(listing.packages, undefined);
  assert.equal(listing.remotes.length, 1);
  const remote = listing.remotes[0];
  assert.equal(remote.type, 'streamable-http');
  assert.equal(remote.url, 'https://mcp-oauth.tooljet.com/mcp/{workspace_id}');
  assert.equal(remote.headers, undefined);
  assert.equal(remote.variables.workspace_id.isRequired, true);
  assert.equal(remote.variables.workspace_id.isSecret, false);
  assert.equal(remote.variables.workspace_id.default, undefined);
  assert.equal(remote.variables.workspace_id.value, undefined);
  assert.deepEqual(Object.keys(remote.variables), ['workspace_id']);
});

test('registry publication is manual and limited to the exact reviewed main-branch listing', () => {
  const workflow = parse(readFileSync(join(root, '.github/workflows/publish-mcp-registry.yml'), 'utf8'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.deepEqual(workflow.jobs.publish.permissions, { contents: 'read', 'id-token': 'write' });
  const gate = new Function('github', 'inputs', `return (${workflow.jobs.publish.if});`);
  const expected = { repository: 'ToolJet/tooljet-mcp', ref: 'refs/heads/main' };
  const confirmation = { server_name: 'io.github.ToolJet/tooljet-mcp' };
  assert.equal(gate(expected, confirmation), true);
  for (const github of [
    { ...expected, repository: 'fork/tooljet-mcp' },
    { ...expected, ref: 'refs/heads/feature' },
    { ...expected, ref: 'refs/pull/112/merge' },
  ]) assert.equal(gate(github, confirmation), false);
  assert.equal(gate(expected, { server_name: 'io.github.ToolJet/other-server' }), false);
});
