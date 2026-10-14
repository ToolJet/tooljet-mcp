import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

// A budget tracker's purchase orders: 8 condensed rows in 472px (toolbar 64, header 41, footer and borders 47, rows
// 40px, as measured in the viewer) were cut to "fits 6 rows" by a 45px row estimate, leaving a band under the rows
// (2026-10-14). The look's measured sizes decide how many rows fit.
describe('rows that fit a shadcn-look table', () => {
  const table = (height: number, cellSize: string, rowsPerPage: number) => ({
    name: 'orders',
    type: 'Table',
    properties: { rowsPerPage: { value: `{{${rowsPerPage}}}` }, dynamicHeight: { value: '{{false}}' }, displaySearchBox: { value: true } },
    styles: { tableLook: { value: 'shadcn' }, cellSize: { value: cellSize } },
    layouts: { desktop: { top: 0, left: 0, width: 40, height } },
  });
  const rows = (result: { component: { properties?: Record<string, { value?: unknown }> } }) =>
    String(result.component.properties?.rowsPerPage?.value);

  it('counts condensed rows at 40px', () => {
    expect(rows(normalizeComponentSpec(table(64 + 41 + 47 + 8 * 40, 'condensed', 8) as never) as never)).toBe('{{8}}');
  });

  it('counts regular rows at 46px', () => {
    expect(rows(normalizeComponentSpec(table(64 + 41 + 47 + 11 * 46, 'regular', 11) as never) as never)).toBe('{{11}}');
    expect(rows(normalizeComponentSpec(table(64 + 41 + 47 + 9 * 46, 'regular', 11) as never) as never)).toBe('{{9}}');
  });
});
