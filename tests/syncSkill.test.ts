import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const tempRoots: string[] = [];

afterEach(() => {
  for (const path of tempRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('sync-skill', () => {
  it('copies the generated skill to explicit Codex and Claude homes', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'tooljet-skill-sync-'));
    tempRoots.push(tempRoot);
    const codexHome = join(tempRoot, 'codex');
    const claudeHome = join(tempRoot, 'claude');

    execFileSync(process.execPath, [
      resolve(root, 'scripts/sync-skill.mjs'),
      '--all',
      '--skip-generate',
    ], {
      cwd: root,
      env: { ...process.env, CODEX_HOME: codexHome, CLAUDE_HOME: claudeHome },
    });

    const expected = readFileSync(resolve(root, 'skill/SKILL.md'), 'utf8');
    expect(readFileSync(join(codexHome, 'skills/tooljet-app-builder/SKILL.md'), 'utf8')).toBe(expected);
    expect(readFileSync(join(claudeHome, 'skills/tooljet-app-builder/SKILL.md'), 'utf8')).toBe(expected);
    const references = readdirSync(resolve(root, 'skill/references')).sort();
    for (const name of references) {
      const expectedReference = readFileSync(resolve(root, 'skill/references', name), 'utf8');
      expect(readFileSync(join(codexHome, 'skills/tooljet-app-builder/references', name), 'utf8')).toBe(expectedReference);
      expect(readFileSync(join(claudeHome, 'skills/tooljet-app-builder/references', name), 'utf8')).toBe(expectedReference);
    }
  });
});
