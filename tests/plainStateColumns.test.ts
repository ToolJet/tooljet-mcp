import { describe, expect, it } from 'vitest';
import { lintPlainStateColumns } from '../src/lint.js';

const table = (columns: unknown[], look = 'shadcn') => ({
  type: 'Table',
  name: 'rooms',
  properties: { columns: { value: columns } },
  styles: { tableLook: { value: look } },
});

describe('state shown as plain text in a shadcn table', () => {
  it('advises a chip for a status or priority column left as text', () => {
    const w = lintPlainStateColumns(table([{ key: 'room', name: 'Room' }, { key: 'status', name: 'Status', columnType: 'string' }]) as never);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/"Status".*chip/);
  });
  it('stays quiet for chips, other columns and the ToolJet look', () => {
    expect(lintPlainStateColumns(table([{ key: 'status', name: 'Status', columnType: 'html' }]) as never)).toEqual([]);
    expect(lintPlainStateColumns(table([{ key: 'room', name: 'Room' }]) as never)).toEqual([]);
    expect(lintPlainStateColumns(table([{ key: 'status', name: 'Status' }], 'default') as never)).toEqual([]);
  });
});

describe('money without a currency sign in a shadcn table', () => {
  it('asks for the prefix', async () => {
    const { lintBareMoneyColumns } = await import('../src/lint.js');
    const w = lintBareMoneyColumns(table([{ key: 'retail_price', name: 'Retail price', columnType: 'number' }, { key: 'qty', name: 'Qty', columnType: 'number' }]) as never);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/"Retail price".*prefix/);
    expect(lintBareMoneyColumns(table([{ key: 'amount', name: 'Amount', columnType: 'number', prefix: '$' }]) as never)).toEqual([]);
  });
  it('is quiet once the column is a status chip', () => {
    expect(lintPlainStateColumns(table([{ key: 'status', name: 'Status', displayAsChip: true }]) as never)).toEqual([]);
  });
});
