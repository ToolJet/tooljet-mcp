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
    const units = cols([
      { id: 'a', key: 'total_minutes', name: 'Total (min)', columnType: 'number' },
      { id: 'b', key: 'total_reps', name: 'Total reps', columnType: 'number' },
      { id: 'c', key: 'total', name: 'Total', columnType: 'number' },
    ]);
    expect(units.map((c) => c.decimalPlaces)).toEqual([undefined, undefined, 2]);
  });

  it('gives an email column room for an address on one line', () => {
    const [email, plain] = cols([
      { id: 'a', key: 'email', name: 'Email', columnType: 'string', columnSize: 185 },
      { id: 'b', key: 'company', name: 'Company', columnType: 'string', columnSize: 150 },
    ]);
    expect(email!.columnSize).toBeGreaterThanOrEqual(240);
    expect(plain!.columnSize).toBe(150);
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

describe('shadcn-look Table rows', () => {
  const cols = (columns: unknown[], look = 'shadcn') =>
    (normalizeComponentSpec(table(look, columns)).component.properties?.columns as { value: Record<string, unknown>[] }).value;

  it('draws a default-coloured row action as an outline button, like shadcn row actions', () => {
    const [actions] = cols([
      {
        id: 'x', key: 'actions', name: 'Actions', columnType: 'button',
        buttons: [
          { id: 'edit', buttonLabel: 'Update', buttonType: 'solid', buttonBackgroundColor: 'var(--cc-primary-brand)' },
          { id: 'del', buttonLabel: 'Delete', buttonType: 'solid', buttonBackgroundColor: 'var(--cc-error-systemStatus)' },
          { id: 'view', buttonLabel: 'View' },
        ],
      },
    ]);
    expect((actions!.buttons as Record<string, unknown>[]).map((b) => b.buttonType)).toEqual(['outline', 'solid', 'outline']);
    const [plain] = cols([{ id: 'x', key: 'a', name: 'Actions', columnType: 'button', buttons: [{ id: 'e', buttonLabel: 'Edit' }] }], 'default');
    expect((plain!.buttons as Record<string, unknown>[])[0]!.buttonType).toBeUndefined();
  });

  it('fits columns wider than a page into it', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, key: `f${i}`, name: `F${i}`, columnType: 'string', columnSize: 170 }));
    const columns = cols([...many, { id: 'h', key: 'hidden', name: 'Hidden', columnSize: 400, columnVisibility: false }]);
    const total = columns.filter((c) => c.columnVisibility !== false).reduce((s, c) => s + Number(c.columnSize), 0);
    expect(total).toBeLessThanOrEqual(1240);
    expect(columns[9]!.columnSize).toBe(400);
    const few = cols([{ id: 'a', key: 'a', name: 'A', columnSize: 300 }]);
    expect(few[0]!.columnSize).toBe(300);
  });
});

describe('shadcn-look Table people', () => {
  const cols = (columns: unknown[], look = 'shadcn') =>
    (normalizeComponentSpec(table(look, columns)).component.properties?.columns as { value: Record<string, unknown>[] }).value;
  it('shows an avatar beside the first column of people', () => {
    const columns = cols([
      { id: 'a', key: 'ticket', name: 'Ticket', columnType: 'string' },
      { id: 'b', key: 'requester', name: 'Requester', columnType: 'string' },
      { id: 'c', key: 'assignee', name: 'Assignee', columnType: 'string' },
      { id: 'd', key: 'requester_email', name: 'Email', columnType: 'string' },
    ]);
    expect(columns.map((c) => c.displayAvatar)).toEqual([undefined, true, undefined, undefined]);
  });
  it('leaves names of things, explicit choices and editable columns alone', () => {
    expect(cols([{ id: 'a', key: 'name', name: 'Product', columnType: 'string' }])[0]!.displayAvatar).toBeUndefined();
    expect(cols([{ id: 'a', key: 'owner', name: 'Owner', displayAvatar: false }])[0]!.displayAvatar).toBe(false);
    expect(cols([{ id: 'a', key: 'owner', name: 'Owner', isEditable: true }])[0]!.displayAvatar).toBeUndefined();
    expect(cols([{ id: 'a', key: 'owner', name: 'Owner' }], 'default')[0]!.displayAvatar).toBeUndefined();
  });
});
