import { describe, expect, it } from 'vitest';
import { rollup } from 'rollup';
import { isExternalBundleImport } from '../scripts/reviewable-bundle.mjs';

describe('bundle dependency paths', () => {
  it.each(['node:fs', 'playwright-core'])('keeps %s external', (id) => {
    expect(isExternalBundleImport(id)).toBe(true);
  });

  it.each([
    './chunk.js', '../chunk.js', '/synthetic/bundle/chunk.js',
    'C:/synthetic/bundle/chunk.js', 'C:\\synthetic\\bundle\\chunk.js',
    '\\\\fixture-server\\share\\bundle\\chunk.js',
  ])('bundles local dependency %s', (id) => {
    expect(isExternalBundleImport(id)).toBe(false);
  });

  it('includes resolved Windows modules instead of emitting machine-path imports', async () => {
    const entry = 'C:\\synthetic\\bundle\\index.js';
    const dependency = 'C:\\synthetic\\bundle\\chunk.js';
    const bundle = await rollup({
      input: entry,
      external: isExternalBundleImport,
      plugins: [{
        name: 'synthetic-windows-files',
        resolveId: (id) => id === './chunk.js' ? dependency : id,
        load: (id) => id === entry
          ? 'import { value } from "./chunk.js"; export { value };'
          : 'export const value = 7;',
      }],
    });
    try {
      const { output } = await bundle.generate({ format: 'esm', entryFileNames: 'index.js' });
      expect(output).toHaveLength(1);
      expect(output[0].type).toBe('chunk');
      if (output[0].type !== 'chunk') throw new Error('Expected a JavaScript chunk');
      expect(output[0].imports).toEqual([]);
      expect(output[0].code).toContain('value = 7');
      expect(output[0].code).not.toContain('synthetic');
    } finally {
      await bundle.close();
    }
  });
});
