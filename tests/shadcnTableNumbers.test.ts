import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

const table = (tableLook: string | undefined, columns: unknown[]) => ({
  type: 'Table',
  name: 'orders',
  properties: { data: { value: '{{queries.q.data}}' }, columns: { value: columns } },
  styles: tableLook ? { tableLook: { value: tableLook } } : {},
});

describe('shadcn-look Table numbers', () => {
  it('right-aligns number columns that set no alignment, like a shadcn data table', () => {
    const result = normalizeComponentSpec(
      table('shadcn', [
        { id: 'a', key: 'name', name: 'Name', columnType: 'string' },
        { id: 'b', key: 'total', name: 'Total', columnType: 'number' },
        { id: 'c', key: 'qty', name: 'Qty', columnType: 'number', horizontalAlignment: 'center' },
      ])
    );
    const columns = (result.component.properties?.columns as { value: Record<string, unknown>[] }).value;
    expect(columns.map((c) => c.horizontalAlignment)).toEqual([undefined, 'right', 'center']);
    expect(columns.map((c) => c.thousandSeparator)).toEqual([undefined, true, true]);
  });

  it('leaves the ToolJet look as it is', () => {
    const result = normalizeComponentSpec(table(undefined, [{ id: 'b', key: 'total', name: 'Total', columnType: 'number' }]));
    const columns = (result.component.properties?.columns as { value: Record<string, unknown>[] }).value;
    expect(columns[0]!.horizontalAlignment).toBeUndefined();
    expect(columns[0]!.thousandSeparator).toBeUndefined();
  });
});

describe('a short shadcn-look table', () => {
  const short = (height: number, extra: Record<string, unknown> = {}) =>
    normalizeComponentSpec({
      type: 'Table',
      name: 'incidents',
      properties: { data: { value: '{{queries.q.data}}' }, ...extra },
      styles: { tableLook: { value: 'shadcn' } },
      layout: { top: 0, left: 0, width: 20, height },
    } as never);
  it('fits its rows when the drawn height shows fewer than three (an incident console showed a row and a half)', () => {
    const result = short(245);
    expect((result.component.properties?.dynamicHeight as { value: unknown }).value).toBe('{{true}}');
  });
  it('shows as many rows per page as fit when three or more do', () => {
    const result = short(400);
    expect((result.component.properties?.rowsPerPage as { value: unknown }).value).toBe('{{5}}');
  });
  it('leaves a tall table, dynamic height and server paging alone', () => {
    expect(short(700).component.properties?.rowsPerPage).toBeUndefined();
    expect(short(245, { dynamicHeight: { value: '{{true}}' } }).component.properties?.rowsPerPage).toBeUndefined();
    expect(short(245, { serverSidePagination: { value: true } }).component.properties?.dynamicHeight).toBeUndefined();
  });
});

describe('a single state drawn as a multi-select', () => {
  it('becomes a single select when read-only (it showed "Select.." on every row)', () => {
    const result = normalizeComponentSpec(
      table(undefined, [
        { id: 's', key: 'severity', name: 'Severity', columnType: 'newMultiSelect', options: [{ label: 'High', value: 'High' }] },
        { id: 't', key: 'tags', name: 'Tags', columnType: 'newMultiSelect' },
      ])
    );
    const columns = (result.component.properties?.columns as { value: Record<string, unknown>[] }).value;
    expect(columns.map((c) => c.columnType)).toEqual(['select', 'newMultiSelect']);
  });
});

describe('row selection in a shadcn-look table', () => {
  const t = (extra: Record<string, unknown> = {}, look = 'shadcn') =>
    normalizeComponentSpec({
      type: 'Table',
      name: 't',
      properties: { data: { value: '{{queries.q.data}}' }, ...extra },
      styles: { tableLook: { value: look } },
    } as never).component.properties as Record<string, { value: unknown } | undefined>;
  it('highlights the selected row instead of drawing a checkbox per row', () => {
    expect(t().highlightSelectedRow?.value).toBe('{{true}}');
  });
  it('keeps checkboxes for bulk selection, an explicit choice, and the ToolJet look', () => {
    expect(t({ showBulkSelector: { value: '{{true}}' } }).highlightSelectedRow).toBeUndefined();
    expect(t({ highlightSelectedRow: { value: false } }).highlightSelectedRow?.value).toBe(false);
    expect(t({}, 'default').highlightSelectedRow).toBeUndefined();
  });
});
