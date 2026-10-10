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
  });

  it('leaves the ToolJet look as it is', () => {
    const result = normalizeComponentSpec(table(undefined, [{ id: 'b', key: 'total', name: 'Total', columnType: 'number' }]));
    const columns = (result.component.properties?.columns as { value: Record<string, unknown>[] }).value;
    expect(columns[0]!.horizontalAlignment).toBeUndefined();
  });
});
