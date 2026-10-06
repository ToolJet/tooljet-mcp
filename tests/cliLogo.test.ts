import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MARK } from '../src/cli/ui.js';

describe('the menu banner mark', () => {
  it('is plain ASCII stars, safe in every terminal font', () => {
    for (const row of MARK) {
      expect(row).toMatch(/^[ *]+$/);
      expect(row).not.toMatch(/ $/);
    }
  });

  it('leaves room for an info line in a 76-column terminal', () => {
    const width = Math.max(...MARK.map((r) => r.length));
    expect(width + 3 + 'default: cloud-templates · app.tooljet.ai'.length).toBeLessThanOrEqual(76);
  });

  it('is the same art in the shipped bundle — edit src, then run: npm run build:plugin', () => {
    const bundle = readFileSync(join(resolve(__dirname, '..'), 'bundle/cli/index.js'), 'utf8');
    for (const row of MARK) expect(bundle, 'bundle/cli/index.js is stale').toContain(row);
  });
});
