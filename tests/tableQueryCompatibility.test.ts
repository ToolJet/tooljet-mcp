import { describe, expect, it, vi } from 'vitest';
import { updateRowsCompatibilityWarning, inspectUpdateCompatibility, bulkPrimaryKeyWarning } from '../src/tableQueryCompatibility.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

describe('bulk upsert primary-key compatibility', () => {
  const columns = [{name:'id',primaryKey:true},{name:'finding_key',primaryKey:false}];
  const options = (keys: unknown) => ({operation:'bulk_upsert_with_primary_key',bulk_upsert_with_primary_key:{primary_key:keys}});
  it('rejects a unique business key without rewriting it', () => {
    const value=options(['finding_key']); const before=structuredClone(value);
    expect(bulkPrimaryKeyWarning('tooljetdb',value,'findings',columns)).toContain('UNIQUE business reference is not sufficient');
    expect(value).toEqual(before);
  });
  it.each([['id'], '{{variables.keys}}', ['{{variables.key}}'], []])('leaves valid or dynamic keys alone: %j', keys => {
    expect(bulkPrimaryKeyWarning('tooljetdb',options(keys),'findings',columns)).toBeUndefined();
  });
  it('does not apply to other providers or unavailable metadata', () => {
    expect(bulkPrimaryKeyWarning('postgresql',options(['finding_key']),'findings',columns)).toBeUndefined();
    expect(bulkPrimaryKeyWarning('tooljetdb',options(['finding_key']),'findings',undefined)).toBeUndefined();
  });
});

describe('update_rows schema compatibility', () => {
  it('identifies the known no-id failure without rewriting conditional targeting', () => {
    const options = { operation: 'update_rows', update_rows: { where_filters: { state: 'Pending' } } };
    const before = structuredClone(options);
    const warning = updateRowsCompatibilityWarning('tooljetdb', options, 'returns', ['return_id', 'state']);
    expect(warning).toContain('Table "returns" has no id column');
    expect(warning).toContain('order=id');
    expect(warning).toContain('never drop expected-state');
    expect(options).toEqual(before);
  });

  it.each([undefined, [], ['id'], ['return_id', 'id']])('does not invent missing-id evidence for %j', columns => {
    expect(updateRowsCompatibilityWarning('tooljetdb', { operation: 'update_rows' }, 'returns', columns)).toBeUndefined();
  });

  it.each(['list_rows', 'create_row', 'bulk_update_with_primary_key'])('does not flag %s', operation => {
    expect(updateRowsCompatibilityWarning('tooljetdb', { operation }, 'returns', ['return_id'])).toBeUndefined();
  });

  it('does not apply ToolJet DB assumptions to other datasources', () => {
    expect(updateRowsCompatibilityWarning('postgresql', { operation: 'update_rows' }, 'returns', ['return_id'])).toBeUndefined();
  });
});

describe('shared structured-write metadata inspection', () => {
  it('reuses one schema for different insert payloads and update queries without reusing their verdicts', async () => {
    const client={listTables:vi.fn().mockResolvedValue([{id:'t',table_name:'jobs'},{id:'other',table_name:'unrelated'}]),
      getTableSchema:vi.fn().mockResolvedValue([{name:'job_key',type:'string',isPrimaryKey:true},{name:'notes',type:'string'}])} as unknown as ToolJetClient;
    const good={operation:'create_row',table_id:'t',create_row:{0:{column:'job_key',value:'{{variables.newKey}}'}}};
    const warnings=await inspectUpdateCompatibility(client,[{name:'bad',kind:'tooljetdb',options:{...good,create_row:{0:{column:'notes',value:''}}}},
      {name:'good',kind:'tooljetdb',options:good},{name:'update',kind:'tooljetdb',options:{operation:'update_rows',table_id:'t'}},
      {name:'read',kind:'tooljetdb',options:{operation:'list_rows',table_id:'other'}}]);
    expect(client.getTableSchema).toHaveBeenCalledExactlyOnceWith('jobs');
    expect(warnings).toHaveLength(2);
    expect(warnings.join(' ')).toContain('Query "bad": create_row');
    expect(warnings.join(' ')).toContain('Query "update": Table "jobs" has no id');
    expect(warnings.join(' ')).not.toContain('Query "good"');
  });
  it('leaves unreadable and dynamic targets explicitly unverified without executing queries', async () => {
    const client={listTables:vi.fn().mockResolvedValue([{id:'t',table_name:'jobs'}]),getTableSchema:vi.fn().mockRejectedValue(new Error('offline'))} as unknown as ToolJetClient;
    const warnings=await inspectUpdateCompatibility(client,[{name:'dynamic',kind:'tooljetdb',options:{operation:'create_row',table_id:'{{variables.table}}'}},
      {name:'unknown',kind:'tooljetdb',options:{operation:'create_row',table_id:'other'}},
      {name:'unreadable',kind:'tooljetdb',options:{operation:'create_row',table_id:'t'}}]);
    expect(warnings).toHaveLength(3);
    expect(warnings.every(w=>w.includes('not checked'))).toBe(true);
    expect(warnings.join(' ')).not.toContain('omits required');
  });
});
