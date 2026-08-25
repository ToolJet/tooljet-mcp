import { describe, it, expect } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';

/* A live build against a connected ServiceNow instance produced 1 page, 0 components and 1 query:
   every read was refused with "Datasource kind servicenow has no proven read classifier", so the
   agent could not run a single query to verify its work and gave up. */
const sn = (options: Record<string, unknown>) =>
  assessQueryRead({ kind: 'servicenow', data_source_id: 'ds-1', options } as never);

describe('ServiceNow read classification', () => {
  it('proves a bounded list_records read', () => {
    const a = sn({ operation: 'list_records', table: 'incident', sysparm_limit: '100' });
    expect(a.provenRead).toBe(true);
    expect(a.maxRows).toBe(100);
    expect(a.requiresCountPreflight).toBe(false);
  });

  it('never marks a remote read directSafe', () => {
    /* Same rule as REST GET: crossing into a remote system consumes quota and can surface data the
       user did not expect to expose, so it is confirmed rather than run silently. */
    const a = sn({ operation: 'list_records', table: 'incident', sysparm_limit: '10' });
    expect(a.directSafe).toBe(false);
    expect(a.requiresRemoteReadConfirmation).toBe(true);
  });

  it('refuses to call an unbounded list_records provably safe', () => {
    const a = sn({ operation: 'list_records', table: 'incident' });
    expect(a.provenRead).toBe(true);
    expect(a.requiresCountPreflight).toBe(true);
    expect(a.reason).toMatch(/no static sysparm_limit/);
  });

  it('treats a limit above the threshold as needing a preflight', () => {
    const a = sn({ operation: 'list_records', table: 'incident', sysparm_limit: '50000' });
    expect(a.requiresCountPreflight).toBe(true);
    expect(a.maxRows).toBe(50000);
  });

  it('bounds single-record and aggregate reads at one row', () => {
    expect(sn({ operation: 'get_record', table: 'incident', sys_id: 'abc' }).maxRows).toBe(1);
    const agg = sn({ operation: 'aggregate', table: 'incident', sysparm_count: 'true' });
    expect(agg.countOnly).toBe(true);
    expect(agg.maxRows).toBe(1);
  });

  it('allows metadata reads, which is how the agent learns the fields', () => {
    for (const operation of ['list_tables', 'get_table_schema', 'get_field_choices']) {
      expect(sn({ operation }).provenRead).toBe(true);
    }
  });

  it('refuses every operation that can change ServiceNow state', () => {
    for (const operation of ['create_record', 'update_record', 'delete_record', 'invoke_workflow', 'trigger_flow']) {
      const a = sn({ operation, table: 'incident' });
      expect(a.provenRead).toBe(false);
      expect(a.reason).toMatch(/can change ServiceNow state/);
    }
  });

  it('refuses an operation it does not recognise rather than assuming it is safe', () => {
    expect(sn({ operation: 'some_new_operation' }).provenRead).toBe(false);
    expect(sn({}).provenRead).toBe(false);
  });
});
