import { describe, expect, it } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { batchSafeRead } from '../src/tools/runQueries.js';
import { selectDatasourceQuerySchema } from '../src/datasourceCatalog.js';

const read = (query: string) => assessQueryRead({ id: 'cache-read', kind: 'redis', options: { query } });

describe('Redis command reads', () => {
  it.each(['PING', 'DBSIZE', 'GET session:one', 'TYPE session:one', 'HGET profile:one label', 'MGET a b', 'HMGET profile:one label city', 'LRANGE queue 0 19', 'ZRANGE scores 5 14'])(
    'accepts a known static read: %s', (query) => expect(read(query)).toMatchObject({ provenRead: true, directSafe: true }),
  );
  it.each(['SET a b', 'GETDEL a', 'EVAL return 1 0', 'FCALL_RO fn 0', 'FLUSHDB', 'CONFIG GET *', 'KEYS *', 'GET {{variables.key}}', 'GET a\nSET b c', ' GET a', 'GET  a', 'LRANGE queue 0 -1', 'ZRANGE scores 0 10000', 'GET', 'MGET'])(
    'refuses writes, scripts and unproven commands: %s', (query) => expect(read(query).provenRead).toBe(false),
  );
  it.each(['SCAN 0 MATCH session:* COUNT 20', 'HSCAN profile:one 0 COUNT 10', 'HGETALL profile:one', 'SMEMBERS team:one'])(
    'requires singular confirmation for collection reads: %s', (query) => {
      expect(read(query)).toMatchObject({ provenRead: true, directSafe: false, requiresRemoteReadConfirmation: true });
      expect(batchSafeRead({ id: 'scan', kind: 'redis', options: { query } }).safe).toBe(false);
    },
  );
  it.each(['SCAN 0 COUNT nope', 'SCAN 0 COUNT 0', 'SCAN 0 COUNT 1001', 'SCAN 0 MATCH', 'SCAN 0 COUNT 1 COUNT 2', 'HSCAN key 0 TYPE hash'])(
    'rejects invalid scan options: %s', (query) => expect(read(query).provenRead).toBe(false),
  );
  it('recovers an invented operation with the actual single-form contract', () => {
    expect(selectDatasourceQuerySchema('redis', { operation: 'query' })).toMatchObject({
      operations: [], available_contracts: ['default'], recovery: expect.stringContaining('operation:"default"'),
    });
    expect(selectDatasourceQuerySchema('redis', { operation: 'default' })).toHaveProperty('request');
  });
});
