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
  it('is as tall as its rows unless it says otherwise', () => {
    const result = short(245);
    expect((result.component.properties?.dynamicHeight as { value: unknown }).value).toBe('{{true}}');
    expect(result.component.properties?.rowsPerPage).toBeUndefined();
  });
  it('with dynamic height off, shows the rows that fit, or fits its rows when fewer than three do', () => {
    const off = { dynamicHeight: { value: '{{false}}' } };
    expect((short(400, off).component.properties?.rowsPerPage as { value: unknown }).value).toBe('{{5}}');
    expect((short(245, off).component.properties?.dynamicHeight as { value: unknown }).value).toBe('{{true}}');
    expect(short(700, off).component.properties?.rowsPerPage).toBeUndefined();
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

describe('a pack card', () => {
  it('fits its content even when the build turned dynamic height off', () => {
    const props = normalizeComponentSpec({
      type: 'FlexContainer',
      name: 'riskCard',
      properties: { cardStyle: { value: 'shadcnCard' }, dynamicHeight: { value: false } },
    } as never).component.properties as Record<string, { value: unknown }>;
    expect(props.dynamicHeight.value).toBe('{{true}}');
  });
  it('leaves a plain container alone', () => {
    const props = normalizeComponentSpec({
      type: 'FlexContainer',
      name: 'rail',
      properties: { dynamicHeight: { value: false } },
    } as never).component.properties as Record<string, { value: unknown }>;
    expect(props.dynamicHeight.value).toBe(false);
  });
});

describe('shadcn-look Table finish', () => {
  const cols = (columns: unknown[], look: string | undefined = 'shadcn') =>
    (normalizeComponentSpec(table(look, columns)).component.properties?.columns as { value: Record<string, unknown>[] }).value;

  it('draws a read-only state column as a status chip', () => {
    const columns = cols([
      { id: 'a', key: 'status', name: 'Status', columnType: 'string' },
      { id: 'b', key: 'stock_status', name: 'Stock status' },
      { id: 'c', key: 'priority', name: 'Priority', columnType: 'string', isEditable: true },
      { id: 'd', key: 'stage', name: 'Stage', columnType: 'string', displayAsChip: false },
      { id: 'e', key: 'name', name: 'Name', columnType: 'string' },
    ]);
    expect(columns.map((c) => c.displayAsChip)).toEqual([true, true, undefined, false, undefined]);
    expect(cols([{ id: 'a', key: 'status', name: 'Status', columnType: 'string' }], 'default')[0]!.displayAsChip).toBeUndefined();
  });

  it('shows money with two decimals unless the column says otherwise', () => {
    const columns = cols([
      { id: 'a', key: 'retail_price', name: 'Retail price', columnType: 'number' },
      { id: 'b', key: 'amount', name: 'Amount', columnType: 'number', decimalPlaces: 0 },
      { id: 'c', key: 'qty', name: 'Qty', columnType: 'number' },
    ]);
    expect(columns.map((c) => c.decimalPlaces)).toEqual([2, 0, undefined]);
  });

  it('gives a column room for its header, and an editable one room for the pencil too', () => {
    const columns = cols([
      { id: 'a', key: 'on_hand', name: 'On hand', columnType: 'number', columnSize: 60, isEditable: true },
      { id: 'b', key: 'sku', name: 'SKU', columnType: 'string', columnSize: 80 },
      { id: 'c', key: 'duration', name: 'Duration', columnType: 'string', columnSize: 70 },
    ]);
    expect(columns[0]!.columnSize).toBeGreaterThanOrEqual(100);
    expect(columns[1]!.columnSize).toBe(80);
    expect(columns[2]!.columnSize).toBeGreaterThanOrEqual(86);
  });
});
