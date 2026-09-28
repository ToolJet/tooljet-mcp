import { describe, expect, it } from 'vitest';
import { lintRenderedGeometryAdvisory } from '../src/lint.js';

// Trace review, 2026-09-24: "Primary Button ... likely outside the initial desktop viewport" started a re-layout tail
// every time it appeared (merch m2 two re-plans; update_components on m8: two 14- and 16-component re-layouts and
// rowsPerPage cut to 4). It is a scroll, not a defect: no tool raises it.
describe('the fold advice', () => {
  it('is not part of the geometry advice the tools report', () => {
    const warnings = lintRenderedGeometryAdvisory([
      { name: 'history', type: 'Table', clientRef: 'history', layout: { top: 100, left: 2, width: 39, height: 900 } },
      { name: 'save', type: 'Button', clientRef: 'save', styles: { type: { value: 'primary' } }, layout: { top: 1020, left: 2, width: 8, height: 40 } },
    ] as never).join(' ');
    expect(warnings).not.toMatch(/outside the initial desktop viewport/);
  });
});
