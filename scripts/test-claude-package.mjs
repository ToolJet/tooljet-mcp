// Check the actual extracted install and guard against reintroducing directory holds.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClaudePackage } from './check-claude-package.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(root, 'plugins/tooljet-claude'));
const temp = mkdtempSync(join(tmpdir(), 'tooljet-claude-test-'));
const extracted = join(temp, 'installed plugin');
const manifestPath = '.claude-plugin/plugin.json';
const write = (path, text) => {
  mkdirSync(dirname(join(extracted, path)), { recursive: true });
  writeFileSync(join(extracted, path), text);
};
const changeManifest = change => {
  const manifest = JSON.parse(readFileSync(join(extracted, manifestPath), 'utf8'));
  change(manifest);
  write(manifestPath, JSON.stringify(manifest));
};

try {
  checkClaudePackage(source);
  const zip = join(temp, 'plugin.zip');
  execFileSync('zip', ['-q', '-r', zip, '.'], { cwd: source });
  mkdirSync(extracted);
  execFileSync('unzip', ['-q', zip, '-d', extracted]);
  const report = checkClaudePackage(extracted);
  function compareTree(path = '') {
    for (const entry of readdirSync(join(extracted, path), { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) compareTree(file);
      else {
        assert.deepEqual(readFileSync(join(extracted, file)), readFileSync(join(source, file)), `Archive changed ${file}`);
        if (file.startsWith('skills/')) assert.deepEqual(readFileSync(join(extracted, file)), readFileSync(join(root, file)), `Shared skill drift: ${file}`);
      }
    }
  }
  compareTree();

  const cases = [
    ['lockfile install', () => { write('package.json', '{}'); write('package-lock.json', '{}'); }, /Unexpected package file/],
    ['root instructions', () => write('CLAUDE.md', '# Development only'), /Unexpected package file/],
    ['shadow local server', () => write('.mcp.json', '{"mcpServers":{"local":{"command":"node","args":["server.js"]}}}'), /Unexpected package file/],
    ['foreign manifest', () => write('plugin.json', '{}'), /Unexpected package file/],
    ['local server', () => changeManifest(m => { m.mcpServers.tooljet = { command: 'node', args: ['server.js'] }; }), /hosted OAuth/],
    ['ambient credential', () => changeManifest(m => { m.mcpServers.tooljet.headers = { Authorization: '${SYNTHETIC_TOKEN}' }; }), /hosted OAuth/],
    ['startup hook', () => changeManifest(m => { m.hooks = './hooks.json'; }), /Unexpected manifest key/],
    ['credential configuration', () => changeManifest(m => { m.userConfig = { token: { type: 'string', sensitive: true } }; }), /Unexpected manifest key/],
    ['oversized file', () => write('README.md', 'x'.repeat(256 * 1024)), /Oversized file/],
    ['missing skill reference', () => rmSync(join(extracted, 'skills/tooljet-app-builder/references/qa.md')), /Missing skill reference/],
    ['symlink', () => { rmSync(join(extracted, 'LICENSE')); symlinkSync(join(source, 'LICENSE'), join(extracted, 'LICENSE')); }, /symlinks/],
  ];
  for (const [name, mutate, error] of cases) {
    rmSync(extracted, { recursive: true, force: true });
    cpSync(source, extracted, { recursive: true });
    mutate();
    assert.throws(() => checkClaudePackage(extracted), error, `Did not reject ${name}`);
  }
  console.log({ ...report, archiveVerified: true, boundaryTests: cases.length });
} finally {
  rmSync(temp, { recursive: true, force: true });
}
