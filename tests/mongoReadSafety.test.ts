import { describe, it, expect, vi } from 'vitest';
import { assessQueryRead, LARGE_READ_ROW_THRESHOLD } from '../src/queryExecutionSafety.js';
import { runQueryTool } from '../src/tools/runQuery.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const mongo = (options: Record<string, unknown>) =>
  assessQueryRead({ kind: 'mongodb', data_source_id: 'ds-1', options } as never);

describe('MongoDB read classification', () => {
  it('proves a bounded find_many', () => {
    const a = mongo({ operation: 'find_many', collection: 'bugs', filter: '{}', options: '{"limit": 50}' });
    expect(a.provenRead).toBe(true);
    expect(a.maxRows).toBe(50);
    expect(a.requiresCountPreflight).toBe(false);
    expect(a.directSafe).toBe(true);
    expect(a.requiresRemoteReadConfirmation).toBeUndefined();
    expect(a.source).toEqual({ kind: 'gui_table', value: 'bugs' });
  });

  it('accepts the options document as an object as well as JSON text', () => {
    const a = mongo({ operation: 'find_many', collection: 'bugs', options: { limit: 10 } });
    expect(a.maxRows).toBe(10);
    expect(a.directSafe).toBe(true);
  });

  it('proves an unlimited find_many a read, but requires a count preflight', () => {
    const a = mongo({ operation: 'find_many', collection: 'bugs' });
    expect(a.provenRead).toBe(true);
    expect(a.directSafe).toBe(false);
    expect(a.requiresCountPreflight).toBe(true);
    expect(a.reason).toMatch(/no statically provable row limit/);
  });

  it('requires a preflight above the row threshold', () => {
    const a = mongo({ operation: 'find_many', collection: 'bugs', options: `{"limit": ${LARGE_READ_ROW_THRESHOLD + 1}}` });
    expect(a.requiresCountPreflight).toBe(true);
    expect(a.directSafe).toBe(false);
  });

  it('treats find_one as a single-row read', () => {
    const a = mongo({ operation: 'find_one', collection: 'bugs', filter: '{"_id": "1"}' });
    expect(a).toMatchObject({ provenRead: true, directSafe: true, maxRows: 1 });
  });

  it('marks an unfiltered count as a full-source count and a filtered one as not', () => {
    expect(mongo({ operation: 'count', collection: 'bugs', filter: '{}' }))
      .toMatchObject({ countOnly: true, fullSourceCount: true, maxRows: 1 });
    expect(mongo({ operation: 'count', collection: 'bugs', filter: '{"open": true}' }))
      .toMatchObject({ countOnly: true, fullSourceCount: false });
  });

  it('refuses every write operation', () => {
    for (const operation of ['insert_one', 'insert_many', 'update_one', 'update_many', 'delete_one',
      'delete_many', 'replace_one', 'bulk_write', 'create_collection', 'find_one_delete']) {
      const a = mongo({ operation, collection: 'bugs' });
      expect(a.provenRead, operation).toBe(false);
      expect(a.reason, operation).toMatch(/is not a proven bounded read/);
    }
  });

  it('refuses an aggregate pipeline that writes a collection', () => {
    for (const stage of ['$out', '$merge']) {
      const a = mongo({ operation: 'aggregate', collection: 'bugs', pipeline: `[{"${stage}": "archive"}]` });
      expect(a.provenRead, stage).toBe(false);
      expect(a.reason, stage).toMatch(/writes a collection/);
    }
  });

  it('allows a read-only aggregate bounded by a final pipeline limit', () => {
    const bounded = mongo({
      operation: 'aggregate', collection: 'bugs',
      pipeline: '[{"$match": {"open": true}}, {"$limit": 20}]', options: '{}',
    });
    expect(bounded).toMatchObject({ provenRead: true, directSafe: true, maxRows: 20 });
    expect(bounded.simpleSourceRead).toBeUndefined();

    const unbounded = mongo({ operation: 'aggregate', collection: 'bugs', pipeline: '[{"$match": {}}]' });
    expect(unbounded).toMatchObject({ provenRead: true, requiresCountPreflight: true });
  });

  it('refuses a collection that is missing or comes from a binding', () => {
    expect(mongo({ operation: 'find_many' }).reason).toMatch(/collection is missing/);
    expect(mongo({ operation: 'find_many', collection: '{{ components.sel.value }}' }).reason)
      .toMatch(/not statically known/);
  });

  it.each([
    { out: 'sensor_archive' },
    '{out:"sensor_archive"}',
    String.raw`{"\u006fut":"sensor_archive"}`,
    '{{variables.aggregateSettings}}',
    { out: '{{variables.destination}}' },
    { let: { threshold: '{{variables.threshold}}' } },
    String.raw`{"let":{"threshold":"\u007b\u007bvariables.threshold}}"}`,
    '{out:',
    '[]',
    'null',
    12,
  ])('refuses unsafe aggregate options before either execution tool runs: %j', async (options) => {
    const query = { id: 'sensor-preview', kind: 'mongodb', data_source_id: 'sensor-db',
      options: { operation: 'aggregate', collection: 'sensor_samples', pipeline: '[{$limit:7}]', options } };
    expect(assessQueryRead(query)).toMatchObject({ provenRead: false, directSafe: false });
    const client = {
      getQuery: vi.fn().mockResolvedValue(query),
      getQueries: vi.fn().mockResolvedValue([query]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('development'),
      runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: [] }),
    };
    const singular = await runQueryTool(client as unknown as ToolJetClient).handler({
      query_id: query.id, version_id: 'sensor-version',
      user_confirmed_large_read: true, user_confirmed_remote_read: true,
      user_confirmed_billable_read: true,
    });
    const batch = await runQueriesTool(client as unknown as ToolJetClient).handler({
      query_ids: [query.id], version_id: 'sensor-version',
    });
    expect(singular.isError).toBe(true);
    expect(batch.isError).toBe(true);
    expect(client.runQuery).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', {}, '{}', '{allowDiskUse:true, maxTimeMS:500, /* bounded read */}',
    { allowDiskUse: true, let: { threshold: 3 } },
  ])('preserves bounded aggregation with static read options: %j', (options) => {
    expect(mongo({ operation: 'aggregate', collection: 'sensor_samples',
      pipeline: '[{$limit:7}]', options,
    })).toMatchObject({ provenRead: true, directSafe: true, maxRows: 7 });
  });
});
