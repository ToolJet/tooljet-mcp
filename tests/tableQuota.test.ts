import { describe, expect, it, vi } from 'vitest';
import { createClient, PartialWriteError, ToolJetHttpError } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { TableQuotaError } from '../src/tableQuotaError.js';
import { createTablesTool } from '../src/tools/createTables.js';
import { fail } from '../src/tools/types.js';

const tables = Array.from({ length: 10 }, (_, i) => ({
  tableName: `museum_${i}`, columns: [{ name: 'label', type: 'string' }],
}));

function fixture(status: number) {
  let calls = 0;
  const auth = {
    getOrganizationId: vi.fn().mockResolvedValue('museum-workspace'),
    authedFetch: vi.fn(async () => {
      const n = calls++;
      return n === 0
        ? new Response(JSON.stringify({ result: { id: 'saved-gallery', table_name: 'museum_0' } }))
        : new Response(JSON.stringify({ message: 'Synthetic capacity denial' }), { status });
    }),
  } as unknown as Auth;
  return { auth, client: createClient(auth, {} as Config) };
}

describe('table quota failures', () => {
  it('stops scheduling batches, preserves successes and returns a non-retryable tool error', async () => {
    const { auth, client } = fixture(451);
    client.listTables = vi.fn().mockResolvedValue([]);
    const result = await createTablesTool(client).handler({
      tables: tables.map(t => ({ table_name: t.tableName, columns: t.columns })),
    });
    expect(auth.authedFetch).toHaveBeenCalledTimes(4);
    expect(result.isError).toBe(true);
    const error = JSON.parse(result.content[0].text).error;
    expect(error).toMatchObject({ code: 'TJDB_TABLE_LIMIT_REACHED', status: 451, retryable: false });
    expect(error.details).toContain('saved-gallery');
    expect(error.message).toContain('do not delete tables automatically');
  });

  it('does not start dependent tables after a quota failure', async () => {
    const { auth, client } = fixture(451);
    await expect(client.createTables({ tables: [
      ...tables.slice(0, 2),
      { tableName: 'museum_child', columns: [{ name: 'parent_id', type: 'integer' }],
        foreignKeys: [{ columns: ['parent_id'], referencedTable: 'museum_1', referencedColumns: ['id'] }] },
    ] })).rejects.toBeInstanceOf(PartialWriteError);
    expect(auth.authedFetch).toHaveBeenCalledTimes(2);
  });

  it('does not classify transient errors or other licence gates as table quota', async () => {
    const { client } = fixture(500);
    let error: unknown;
    try { await client.createTables({ tables: tables.slice(0, 2) }); } catch (caught) { error = caught; }
    expect(fail(error).content[0].text).not.toContain('TJDB_TABLE_LIMIT_REACHED');
    expect(fail(new ToolJetHttpError(451, 'createTheme', 'Synthetic plan restriction')).content[0].text)
      .not.toContain('TJDB_TABLE_LIMIT_REACHED');
  });

  it('preserves classification through a phase wrapper', () => {
    const batch = new PartialWriteError('createTables', [], ['blocked'], new TableQuotaError());
    const error = JSON.parse(fail(new Error('phase failed', { cause: batch })).content[0].text).error;
    expect(error).toMatchObject({ code: 'TJDB_TABLE_LIMIT_REACHED', retryable: false, details: 'phase failed' });
  });
});
