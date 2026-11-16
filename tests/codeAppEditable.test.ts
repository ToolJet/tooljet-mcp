import { describe, expect, it } from 'vitest';
import { editable } from '../src/tools/codeApp.js';

describe('code_app_write_files paths', () => {
  const dir = '/tmp/apps/demo';
  it('allows app.json, frontend/src and the two style files', () => {
    for (const p of ['app.json', 'frontend/src/App/index.tsx', 'frontend/styles/theme.css', 'frontend/styles/global.css']) {
      expect(editable(dir, p)).toBe(`${dir}/${p}`);
    }
  });
  it('refuses generated hooks, package.json, other styles and paths outside the project', () => {
    for (const p of ['frontend/src/tooljet.gen.ts', 'frontend/package.json', 'frontend/styles/other.css', '../x/app.json', 'frontend/.npmrc']) {
      expect(() => editable(dir, p)).toThrow(/not editable/);
    }
  });
});
