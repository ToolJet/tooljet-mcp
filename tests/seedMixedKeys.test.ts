import { describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { createClient } from '../src/tooljetClient.js';

/*
  PostgREST rejects a list whose rows have different keys. A batch with an optional column left out of some rows went one
  row per request: 7 of 46 seed calls, 19 to 31 s each against about 2 s (10 builds, 2026-11-03).
*/
const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:3000' };
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function setup() {
  const posts: any[] = [];
  const authedFetch = vi.fn()
    .mockResolvedValueOnce(response(200, { result: { columns: [
      { column_name: 'id', data_type: 'serial', column_default: "nextval('s')", constraints_type: { is_primary_key: true } },
      { column_name: 'po', data_type: 'character varying' },
      { column_name: 'paid_date', data_type: 'character varying', column_default: null },
      { column_name: 'status', data_type: 'character varying', column_default: "'open'" },
    ] } }))
    .mockResolvedValueOnce(response(200, { result: [{ id: 'orders-id', table_name: 'orders' }] }))
    .mockImplementation((_path, init) => {
      const body = JSON.parse(init.body);
      posts.push(body);
      // What PostgREST does with a list whose rows differ.
      if (Array.isArray(body) && new Set(body.map((r: object) => Object.keys(r).sort().join())).size > 1)
        return Promise.resolve(response(400, { code: 'PGRST102', message: 'All object keys must match' }));
      return Promise.resolve(response(201, []));
    });
  const auth = { authedFetch, getOrganizationId: vi.fn().mockResolvedValue('org'), getOrganizationSlug: vi.fn().mockResolvedValue('org') } as unknown as Auth;
  return { client: createClient(auth, config), posts };
}

describe('seed rows with different keys', () => {
  it('stay in one list when the column left out has no default, sending null for it', async () => {
    const { client, posts } = setup();
    const rows = [{ po: 'A', paid_date: '2026-01-02' }, { po: 'B' }, { po: 'C', paid_date: '2026-01-03' }, { po: 'D' }];
    await expect(client.insertRows({ tableName: 'orders', rows })).resolves.toEqual({ processed_rows: 4 });
    expect(posts).toHaveLength(1);
    expect(posts[0].map((r: any) => r.po)).toEqual(['A', 'B', 'C', 'D']);
    expect(posts[0][1].paid_date).toBeNull();
  });

  it('never send null over a column default: those rows go in separate lists, in order', async () => {
    const { client, posts } = setup();
    const rows = [{ po: 'A', status: 'paid' }, { po: 'B', status: 'late' }, { po: 'C' }, { po: 'D' }, { po: 'E', status: 'paid' }];
    await expect(client.insertRows({ tableName: 'orders', rows })).resolves.toEqual({ processed_rows: 5 });
    expect(posts.flat().map((r: any) => r.po)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(posts.map((p) => p.length ?? 1)).toEqual([2, 2, 1]);
    expect(posts[1][0]).not.toHaveProperty('status');
  });

  it('do not change rows that already match', async () => {
    const { client, posts } = setup();
    await client.insertRows({ tableName: 'orders', rows: [{ po: 'A' }, { po: 'B' }] });
    expect(posts).toEqual([[{ po: 'A' }, { po: 'B' }]]);
  });
});
