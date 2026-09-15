import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('migration reference packaging', () => {
  it('ships the maintained reference identically to both hosts and keeps detail out of the entrypoint', () => {
    const source = readFileSync(resolve(root, 'docs/app-migration.md'), 'utf8').trim();
    const outputs = ['skill', 'skills/tooljet-app-builder'].map(host => {
      const entry = readFileSync(resolve(root, host, 'SKILL.md'), 'utf8');
      const references = [...entry.matchAll(/`(references\/[^`]+\.md)`/g)].map(match => match[1]);
      expect(references).toContain('references/migration.md');
      // Follow the actual published route; missing files must fail packaging rather than silently
      // leave hosted sessions without the conditional instructions.
      for (const path of new Set(references)) expect(readFileSync(resolve(root, host, path), 'utf8').length).toBeGreaterThan(0);
      const published = readFileSync(resolve(root, host, 'references/migration.md'), 'utf8').trim();
      expect(published).toBe(source);
      expect(entry).not.toContain(source);
      return entry;
    });
    expect(outputs[0]).toBe(outputs[1]);
  });
});
