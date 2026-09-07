import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { createClient, PartialWriteError } from '../src/tooljetClient.js';

const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:3000' };
const response = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function setup(insert: (row: Record<string, unknown>) => Promise<Response>) {
  const authedFetch = vi.fn()
    .mockResolvedValueOnce(response(200, { result: { columns: [
      { column_name: 'id', data_type: 'serial', constraints_type: { is_primary_key: true } },
      { column_name: 'name', data_type: 'character varying' },
    ] } }))
    .mockResolvedValueOnce(response(200, { result: [{ id: 'people-id', table_name: 'people' }] }))
    .mockImplementation((_path, init) => insert(JSON.parse(init.body)));
  const auth = {
    authedFetch,
    getOrganizationId: vi.fn().mockResolvedValue('org'),
    getOrganizationSlug: vi.fn().mockResolvedValue('org'),
  } as Auth;
  return { client: createClient(auth, config), authedFetch };
}

describe('insert retry safety', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([408, 500, 502, 503, 504, 520, 524, 527])(
    'does not replay a committed insert when the response is HTTP %i', async (status) => {
      const committed: Record<string, unknown>[] = [];
      const { client, authedFetch } = setup(async (row) => {
        committed.push({ id: committed.length + 1, ...row });
        return response(status, { message: 'upstream response lost' });
      });
      const pending = client.insertRows({ tableName: 'people', rows: [{ name: 'A' }] }).catch((e) => e);
      await vi.runAllTimersAsync();
      const error = await pending;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatch(/outcome unknown.*may already have been inserted.*verify.*retry/i);
      expect(committed).toEqual([{ id: 1, name: 'A' }]);
      expect(authedFetch).toHaveBeenCalledTimes(3); // two reads, one insert
      expect(authedFetch.mock.calls[2][1].signal).toBeInstanceOf(AbortSignal);
    }
  );

  it.each(['TimeoutError', 'AbortError', 'TypeError'])(
    'does not replay a committed insert after a transport %s', async (name) => {
      const committed: Record<string, unknown>[] = [];
      const { client, authedFetch } = setup(async (row) => {
        committed.push({ id: committed.length + 1, ...row });
        throw Object.assign(new Error('response lost'), { name });
      });
      const pending = client.insertRows({ tableName: 'people', rows: [{ name: 'A' }] }).catch((e) => e);
      await vi.runAllTimersAsync();
      const error = await pending;
      expect(error.message).toMatch(/outcome unknown.*may already have been inserted/i);
      expect(committed).toEqual([{ id: 1, name: 'A' }]);
      expect(authedFetch).toHaveBeenCalledTimes(3);
    }
  );

  it.each([400, 404])('still retries a rejected schema-cache request with HTTP %i', async (status) => {
    const committed: Record<string, unknown>[] = [];
    let attempts = 0;
    const { client } = setup(async (row) => {
      attempts += 1;
      if (attempts === 1) return response(status, { code: 'PGRST205', message: 'Table missing from schema cache' });
      committed.push({ id: 1, ...row });
      return response(201, committed);
    });
    const pending = client.insertRows({ tableName: 'people', rows: [{ name: 'A' }] });
    await vi.runAllTimersAsync();
    expect(await pending).toEqual({ processed_rows: 1 });
    expect(attempts).toBe(2);
    expect(committed).toEqual([{ id: 1, name: 'A' }]);
  });

  it('bounds retries when the schema cache never catches up', async () => {
    const { client, authedFetch } = setup(async () => response(404, { code: 'PGRST205' }));
    const pending = client.insertRows({ tableName: 'people', rows: [{ name: 'A' }] }).catch((e) => e);
    await vi.runAllTimersAsync();
    expect((await pending).message).toContain('PGRST205');
    expect(authedFetch).toHaveBeenCalledTimes(8); // two reads, six rejected inserts
  });

  it('reports confirmed rows and stops the batch at an uncertain insert', async () => {
    const committed: Record<string, unknown>[] = [];
    const { client } = setup(async (row) => {
      committed.push({ id: committed.length + 1, ...row });
      return response(row.name === 'B' ? 524 : 201, {});
    });
    const pending = client.insertRowsBatch({ tables: [
      { tableName: 'people', rows: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
    ] }).catch((e) => e);
    await vi.runAllTimersAsync();
    const error = await pending;
    expect(error).toBeInstanceOf(PartialWriteError);
    expect(error.completed).toEqual([{ table_name: 'people', processed_rows: 1 }]);
    expect(error.message).toMatch(/row 2\/3.*outcome unknown/i);
    expect(committed).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
  });
});
