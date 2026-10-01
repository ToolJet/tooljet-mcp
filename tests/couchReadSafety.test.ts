import { describe, it, expect } from 'vitest';
import { assessQueryRead, LARGE_READ_ROW_THRESHOLD } from '../src/queryExecutionSafety.js';

/* Thread efa42b82 turns 5 and 6 (demo-prod) both died with PartialBuildError: the persisted query
   `sample_couchdb_records` could not be verified because couchdb had no classifier. Turn 5 also
   shows the documented escape hatch failing — run_query with user_confirmed_remote_read:true is
   refused too, because provenRead is checked before any confirmation flag. */
const couch = (options: Record<string, unknown>) =>
  assessQueryRead({ kind: 'couchdb', data_source_id: 'ds-1', options } as never);

describe('CouchDB read classification', () => {
  it('bounds list_records and get_view by their limit field', () => {
    for (const operation of ['list_records', 'get_view']) {
      expect(couch({ operation, limit: 50 }), operation)
        .toMatchObject({ provenRead: true, directSafe: true, maxRows: 50, requiresCountPreflight: false });
    }
  });

  it('reads the Mango limit out of the find body', () => {
    expect(couch({ operation: 'find', body: '{"selector": {"open": true}, "limit": 25}' }))
      .toMatchObject({ provenRead: true, maxRows: 25 });
    expect(couch({ operation: 'find', body: { selector: {}, limit: 5 } }).maxRows).toBe(5);
  });

  it('treats retrieve_record as a single document read', () => {
    expect(couch({ operation: 'retrieve_record', record_id: 'abc' }))
      .toMatchObject({ provenRead: true, directSafe: true, maxRows: 1 });
  });

  it('preflights an unbounded read and one above the threshold', () => {
    const a = couch({ operation: 'list_records' });
    expect(a).toMatchObject({ provenRead: true, requiresCountPreflight: true, directSafe: false });
    expect(a.reason).toMatch(/no statically provable row limit/);
    expect(couch({ operation: 'find', body: '{"selector": {}}' }).reason).toMatch(/limit in the request body/);
    expect(couch({ operation: 'get_view', limit: LARGE_READ_ROW_THRESHOLD + 1 }))
      .toMatchObject({ requiresCountPreflight: true });
  });

  it('refuses every write', () => {
    for (const operation of ['create_record', 'update_record', 'delete_record']) {
      expect(couch({ operation, record_id: 'a' }).provenRead, operation).toBe(false);
    }
    expect(couch({}).reason).toMatch(/<missing>/);
  });
});
