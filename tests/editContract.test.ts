import { describe, expect, it, vi } from 'vitest';
import { generateEditContract, type EditContractInput } from '../src/editContract.js';
import { generateEditContractTool } from '../src/tools/generateEditContract.js';
import { lintSelectedRowProjections } from '../src/selectedRowProjection.js';
import { dbColumnTypeSchema } from '../src/dbColumnTypeSchema.js';

const spec: EditContractInput = {
  prefix: 'EditJob', source_query: 'rawJobs', table_component: 'queue',
  fields: [
    {field:'title', component:'titleInput',type:'text',required:true},
    {field:'due',component:'dueInput',type:'date_only',nullable:true},
    {field:'amount',component:'amountInput',type:'number'},
    {field:'enabled',component:'enabledInput',type:'boolean'},
    {field:'note',component:'noteInput',type:'text',nullable:true},
  ],
};
const row = {id:0,title:'Job',due:'2026-09-15T00:00:00Z',amount:0,enabled:false,note:'Keep this'};
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function context(rows: unknown[] = [structuredClone(row)]) {
  const variables: Record<string, any> = {};
  const components: Record<string, any> = {queue:{selectedRow:{id:0,due:'15 Sep 2026',amount:'$0'}}};
  const queries = {rawJobs:{data:rows}};
  const actions = {setVariable:vi.fn(async (key: string, value: unknown) => {variables[key]=value;})};
  const contract = generateEditContract(spec);
  const run = (index: number) => new AsyncFunction('components','queries','variables','actions', contract.queries[index]!.options.code)(components, queries, variables, actions);
  const change = (field: string, value: unknown) => {
    const input = contract.inputs.find(i => i.name === spec.fields.find(f=>f.field===field)!.component)!;
    components[input.name] = input.type === 'DatePickerV2' ? {selectedDate:value} : {value};
    const event = input.events[0]!.action;
    variables[event.key] = new Function('variables','components',`return (${event.value.slice(2,-2)});`)(variables,components);
  };
  return {variables, components,queries,actions,contract,run,change};
}

describe('safe edit contract generated runtime', () => {
  it('snapshots raw values; a no-change save writes nothing', async () => {
    const c=context(); await c.run(0);
    expect(c.variables.EditJobSnapshot).toEqual({id:0,values:{title:'Job',due:'2026-09-15',amount:0,enabled:false,note:'Keep this'}});
    expect(await c.run(1)).toEqual({id:0,patch:{},changed:false});
    expect(c.queries.rawJobs.data[0]).toEqual(row);
  });
  it('changes one field and preserves uninitialized dates, contacts and all untouched values', async () => {
    const c=context(); await c.run(0); c.change('title','Renamed');
    expect(await c.run(1)).toEqual({id:0,patch:{title:'Renamed'},changed:true});
  });
  it.each(['', '   ', null])('opens incomplete required data for correction, but refuses saving it unchanged: %s', async title => {
    const c=context([{...row,title}]); await c.run(0);
    c.change('amount',25);
    await expect(c.run(1)).rejects.toThrow('Required field: title');
    c.change('title','Corrected');
    expect((await c.run(1)).patch).toEqual({title:'Corrected',amount:25});
  });
  it('preserves false/zero and records both checkbox transitions', async () => {
    const c=context(); await c.run(0); c.change('enabled',true);
    expect((await c.run(1)).patch).toEqual({enabled:true});
    c.change('enabled',false); c.change('amount','0');
    expect((await c.run(1)).patch).toEqual({});
    expect(c.contract.inputs.find(i=>i.type==='Checkbox')!.events[0]!.trigger).toBe('onChange');
  });
  it('supports an explicit clear only for nullable fields', async () => {
    const c=context(); await c.run(0); c.change('due',''); c.change('note','');
    expect((await c.run(1)).patch).toEqual({due:null,note:null});
  });
  it.each([['title',''],['title','   '],['amount',''],['amount',undefined],['amount','1,200'],['amount',Infinity],['amount',' '],['enabled','false'],['due','15 Sep 2026'],['due','2026-02-30']])('fails safely on invalid %s=%s', async (field,value) => {
    const c=context(); await c.run(0); c.change(field as string,value);
    await expect(c.run(1)).rejects.toThrow();
    expect(c.variables.EditJobSnapshot.values.title).toBe('Job');
  });
  it('rejects a stale draft or changed selection',async()=>{
    const c=context();await c.run(0);c.change('title','Renamed');c.variables.EditJobDraft.id=99;
    await expect(c.run(1)).rejects.toThrow('another record');
    c.components.queue.selectedRow.id=1;
    await expect(c.run(1)).rejects.toThrow('Reopen');
  });
  it.each([[],[row,row],[{...row,due:'bad'}],[{id:0,title:'Missing fields'}]].map(rows=>({rows})))('invalidates old snapshot before failed open %#',async ({rows})=>{
    const c=context(rows);c.variables.EditJobSnapshot={id:7};
    await expect(c.run(0)).rejects.toThrow();expect(c.variables.EditJobSnapshot).toBeNull();
  });
  it('does not coerce the selected ID to a different type',async()=>{
    const c=context([{...row,id:'0'}]);await expect(c.run(0)).rejects.toThrow('exactly one');
  });
  it('rejects arbitrary/injected identifiers, duplicate fields and editable primary keys',()=>{
    expect(()=>generateEditContract({...spec,prefix:'x;evil()'})).toThrow();
    expect(()=>generateEditContract({...spec,fields:[...spec.fields,spec.fields[0]!]})).toThrow('Duplicate');
    expect(()=>generateEditContract({...spec,fields:[{field:'id',component:'ID',type:'text'}]})).toThrow('primary key');
    expect(()=>generateEditContract({...spec,fields:[{field:'__proto__',component:'ID',type:'text'}]})).toThrow();
  });
  it('returns a pure read-only tool with explicit persistence limitations',async()=>{
    const tool=generateEditContractTool();const result=await tool.handler(spec);
    expect(result.isError).not.toBe(true);expect(tool.annotations).toMatchObject({readOnlyHint:true,openWorldHint:false});
    expect(JSON.stringify(result)).toContain('optimistic concurrency');
  });
});

describe('typed selected-row defaults',()=>{
  const table={name:'queue',type:'Table',properties:{data:"{{queries.raw.data.map(r=>({id:r.id,due:moment(r.due).format('DD MMM YYYY'),amount:'$'+Number(r.amount).toLocaleString('en-US')}))}}"}};
  it('finds the date corruption and currency prefill patterns without rewriting',()=>{
    const components=[table,{name:'due',type:'DatePickerV2',properties:{defaultValue:"{{components.queue.selectedRow?.['due'] || ''}}",dateFormat:'YYYY-MM-DD'}},{name:'fee',type:'NumberInput',properties:{value:'{{components.queue.selectedRow.amount}}'}}];
    const before=JSON.stringify(components);
    expect(lintSelectedRowProjections(components).filter(w=>w.includes('display-formatted'))).toHaveLength(2);
    expect(JSON.stringify(components)).toBe(before);
  });
  it('allows matching date formats, explicit parsing and plain display',()=>{
    expect(lintSelectedRowProjections([table,
      {type:'DatePickerV2',properties:{defaultValue:'{{components.queue.selectedRow.due}}',dateFormat:'DD MMM YYYY'}},
      {type:'NumberInput',properties:{value:"{{Number(components.queue.selectedRow.amount.replace(/[^0-9.]/g,''))}}"}},
      {type:'Text',properties:{text:'{{components.queue.selectedRow.due}}'}},
    ])).toEqual([]);
  });
});

describe('ToolJet DB type contract',()=>{
  it.each(['number',' Number ','double precision','decimal','bool','JSON','timestamp with time zone','character varying'])('keeps existing alias %s',v=>expect(dbColumnTypeSchema.parse(v)).toBe(v));
  it.each(['numeric','decimal(10,2)','uuid','money'])('rejects unsupported %s without coercion',v=>expect(()=>dbColumnTypeSchema.parse(v)).toThrow('Unsupported ToolJet DB type'));
});
