import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { checkFiles, packageFiles, packagePlugin, PLUGIN_PACKAGE } from '../scripts/plugin-package.mjs';

const directories: string[] = [];
const temporary = () => {
  const path = mkdtempSync(join(tmpdir(), 'plugin-boundary-'));
  directories.push(path);
  return path;
};
const write = (root: string, file: string, value: string | Buffer) => {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), value);
};
afterEach(() => directories.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));

function fixture() {
  const root = temporary();
  write(root, 'package.json', JSON.stringify({ name: 'sample-widget-tools', version: '1.2.3',
    type: 'module', files: ['bundle', 'data', 'lib', 'skills', 'plugins'],
    dependencies: { 'unused-development-package': '1.0.0' }, scripts: { dev: 'exit 1' } }));
  for (const file of ['bundle/index.js', 'data/catalog/part.json', 'lib/catalog.js',
    'skills/tooljet-app-builder/SKILL.md', 'README.md', 'LICENSE', 'PRIVACY.md']) write(root, file, 'fixture');
  for (const file of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.mcp.json', 'mcp.json', 'plugin.json']) {
    write(root, file, JSON.stringify({ marker: file, env: { SAMPLE_TOKEN: '${SAMPLE_TOKEN}' } }));
  }
  write(root, 'plugins/.npmignore', readFileSync(resolve(import.meta.dirname, '../plugins/.npmignore')));
  return root;
}

describe('standalone plugin boundary', () => {
  it('keeps install configuration and runtime files while source growth stays outside the package', () => {
    const root = fixture();
    for (let i = 0; i < 520; i++) write(root, `tests/case-${i}.ts`, 'test fixture');
    write(root, 'node_modules/dev/index.js', 'development only');
    write(root, 'skills/tooljet-app-builder/references/catalog/stale.json', '{}');
    write(root, `${PLUGIN_PACKAGE}/removed.js`, 'stale output');
    const output = packagePlugin(root);
    const files = packageFiles(output);
    expect(files).toContain('data/catalog/part.json');
    expect(files).toContain('skills/tooljet-app-builder/SKILL.md');
    expect(files.some(file => /tests|node_modules|stale|removed/.test(file))).toBe(false);
    for (const file of ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json', '.mcp.json', 'mcp.json', 'plugin.json']) {
      expect(readFileSync(join(output, file))).toEqual(readFileSync(join(root, file)));
    }
    expect(JSON.parse(readFileSync(join(output, 'package.json'), 'utf8'))).toEqual({
      name: 'sample-widget-tools', version: '1.2.3', type: 'module', private: true,
    });
    expect(checkFiles(output, files, 512)).toBe(files.length);
  });

  it('does not duplicate the standalone distribution in the existing npm package', () => {
    const root = fixture();
    const packedFiles = () => JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'],
      { cwd: root, encoding: 'utf8' }))[0].files.map((file: { path: string }) => file.path).sort();
    const before = packedFiles();
    packagePlugin(root);
    expect(packedFiles()).toEqual(before);
  });

  it('refuses an incomplete runtime input', () => {
    const root = fixture();
    rmSync(join(root, 'bundle'), { recursive: true });
    expect(() => packagePlugin(root)).toThrow('Missing plugin input: bundle');
  });

  it('accepts exactly 512 files and refuses 513 in the install folder', () => {
    const root = temporary();
    for (let i = 0; i < 512; i++) write(root, `part-${i}.js`, 'export {};');
    expect(checkFiles(root, packageFiles(root), 512)).toBe(512);
    write(root, 'extra.js', 'export {};');
    expect(() => checkFiles(root, packageFiles(root), 512)).toThrow('513 files exceeds the 512-file inspection limit');
    expect(checkFiles(root, packageFiles(root))).toBe(513);
  });

  it.each([undefined, 512])('still refuses oversized and binary files with budget %s', budget => {
    const root = temporary();
    write(root, 'large.js', Buffer.alloc(256 * 1024, 'a'));
    expect(() => checkFiles(root, ['large.js'], budget)).toThrow('bytes exceeds the inspection limit');
    write(root, 'small.js', Buffer.from([0]));
    expect(() => checkFiles(root, ['small.js'], budget)).toThrow('binary/packed artifact');
  });

  it('refuses symlinks in the install folder while preserving source-checkout symlinks', () => {
    const root = temporary();
    write(root, 'AGENTS.md', 'project guidance');
    symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'));
    expect(() => checkFiles(root, ['CLAUDE.md'], 512)).toThrow('expected a regular file');
    expect(checkFiles(root, ['CLAUDE.md'], undefined, { followSymlinks: true })).toBe(1);
  });
});
