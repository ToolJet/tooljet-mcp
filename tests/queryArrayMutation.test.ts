import {describe,it,expect} from 'vitest';
import {lintQueryArrayMutations} from '../src/reactiveBindingContract.js';
import {lintComponents} from '../src/lint.js';
const lint=(s:string)=>lintQueryArrayMutations(s,'Table data');
describe('shared query array mutation advisory',()=>{
  it.each([
    '{{queries.rows.data.sort((a,b)=>a.id-b.id)}}',
    "{{(queries['List claims'].data || []).sort((a,b)=>String(b.incident_date).localeCompare(String(a.incident_date))).map(r=>({id:r.id}))}}",
    '{{(queries.rows?.data ?? []).reverse()}}',
    '{{queries.rows.data["sort"]()}}',
  ])('warns without rewriting %s',binding=>{
    expect(lint(binding).join(' ')).toContain('mutates the shared query array');
  });
  it.each([
    '{{queries.rows.data.slice().sort()}}','{{[...queries.rows.data].reverse()}}',
    '{{queries.rows.data.filter(r=>r.active).sort()}}','{{queries.rows.data.map(r=>r).sort()}}',
    '{{Array.from(queries.rows.data).sort()}}','{{queries.rows.data.toSorted()}}',
    '{{[2,1].sort()}}','{{((queries)=>queries.rows.data.sort())({})}}',
    '{{queries[variables.query].data.sort()}}','{{"queries.rows.data.sort()"}}',
  ])('leaves copies, local/shadowed and unknown receivers alone %s',binding=>expect(lint(binding)).toEqual([]));
  it('is advisory-only in the component lint pipeline',()=>{
    const components=[{name:'claims',type:'Table',properties:{data:'{{queries.rows.data.sort()}}'}}];
    const original=JSON.stringify(components);const result=lintComponents(components);
    expect(result.warnings.join(' ')).toContain('shared query array');
    expect(result.errors.join(' ')).not.toContain('shared query array');
    expect(JSON.stringify(components)).toBe(original);
  });
  it('reproduces the failure with frozen query rows and preserves order when copied',()=>{
    const rows=Object.freeze([{id:2},{id:1}]);
    expect(()=>(rows as unknown as Array<{id:number}>).sort((a,b)=>a.id-b.id)).toThrow();
    expect(rows.slice().sort((a,b)=>a.id-b.id)).toEqual([{id:1},{id:2}]);
    expect(rows.map(r=>r.id)).toEqual([2,1]);
  });
});
