import { describe, expect, it } from 'vitest';
import { listTablesTool } from '../src/tools/listTables.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const tables = Array.from({ length: 250 }, (_, i) => ({ id: `id-${i}`, table_name: i % 5 === 0 ? `fjord_orders_${i}` : `other_${i}` }));
const client = { listTables: async () => tables } as unknown as ToolJetClient;
const call = async (args: Record<string, unknown>) => JSON.parse((await listTablesTool(client).handler(args as any)).content[0]!.text as string);

describe('list_tables', () => {
  it('caps an unfiltered listing and says how to narrow it', async () => {
    const r = await call({});
    expect(r.shown).toBe(100);
    expect(r.total).toBe(250);
    expect(r.hint).toContain('search');
  });
  it('filters by a case-insensitive substring', async () => {
    const r = await call({ search: 'FJORD' });
    expect(r.total).toBe(50);
    expect(r.tables.every((t: { table_name: string }) => t.table_name.startsWith('fjord_'))).toBe(true);
    expect(r.hint).toBeUndefined();
  });
});
