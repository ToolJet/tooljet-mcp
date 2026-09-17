import { describe, expect, it, vi } from 'vitest';
import { invalidSeedTimestamps } from '../src/seedTimestampValidation.js';
import { createClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';

describe('seed timestamp prevention', () => {
  it('catches the workshop regression without changing the input', () => {
    const rows = [{ created_at: '2026-09-14T12:20:00+00:00' }, { created_at: '3' }];
    const original = structuredClone(rows);
    expect(invalidSeedTimestamps([{name:'created_at',type:'timestamp'}], rows)[0]).toContain('row(s) 2');
    expect(rows).toEqual(original);
  });
  it.each(['date', 'timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp(6) without time zone'])('checks obvious invalid %s literals', type => {
    expect(invalidSeedTimestamps([{name:'at',type}], [{at:true},{at:{}},{at:3},{at:' '},{at:'12'}])[0]).toContain('1, 2, 3, 4, 5');
  });
  it('does not impose ISO format or pretend to validate unknown syntax', () => {
    const dates=[null,undefined,'2026-09-16','2026-09-16T13:22:00Z','September 16, 2026','09/16/2026','990108','infinity','-infinity','now','{{variables.date}}'];
    expect(invalidSeedTimestamps([{name:'at',type:'timestamp'}],dates.map(at=>({at})))).toEqual([]);
    expect(invalidSeedTimestamps([{name:'code',type:'string'}],[{code:'3'}])).toEqual([]);
  });
  it('preflights the entire table batch before the first write', async () => {
    const authedFetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({result:{columns:[{column_name:'created_at',data_type:'timestamp with time zone'}]}}),{status:200}));
    const client=createClient({authedFetch,getOrganizationId:vi.fn().mockResolvedValue('org'),getOrganizationSlug:vi.fn().mockResolvedValue('org')} as unknown as Auth,{apiUrl:'http://localhost:3000',appUrl:'http://localhost:3000'});
    await expect(client.insertRows({tableName:'test_jobs',rows:[{created_at:'2026-09-16T00:00:00Z'},{created_at:'3'}]})).rejects.toThrow(/row\(s\) 2.*No rows/);
    expect(authedFetch).toHaveBeenCalledTimes(1); // schema GET only, no POST
  });
});
