import { describe, expect, it } from 'vitest';
import { lintSelectedRowProjections } from '../src/selectedRowProjection.js';
import { lintComponents, type LintComponent } from '../src/lint.js';

const table = (data: string): LintComponent => ({ name: 'queue', type: 'Table', properties: { data: { value: data } } });
const consumer = (value: string): LintComponent => ({ name: 'editor', type: 'TextInput', properties: { value } });
const closed = '{{queries.jobs.data.map(r => ({id:r.id, title:r.title}))}}';

describe('selectedRow projection contract', () => {
  it('catches the maintenance owner prefill loss without blocking', () => {
    const components = [table(closed), consumer('{{components.queue?.selectedRow?.technician_id || ""}}')];
    const before = JSON.stringify(components);
    const result = lintComponents(components);
    expect(result.warnings.join(' ')).toContain('omits "technician_id"');
    expect(result.errors.join(' ')).not.toContain('omits "technician_id"');
    expect(JSON.stringify(components)).toBe(before);
  });
  it('catches the missing expense explanation behind a fallback', () => {
    expect(lintSelectedRowProjections([table(closed), consumer('{{components.queue.selectedRow.explanation || "No explanation provided."}}')]).join(' ')).toContain('omits "explanation"');
  });
  it('checks literal bracket/optional access and wrapped nested properties', () => {
    const c = consumer('');
    c.properties = { schema: { value: { default: "{{components['queue']?.selectedRow?.['note']}}" } } };
    expect(lintSelectedRowProjections([table(closed), c])).toHaveLength(1);
  });
  it('accepts hidden raw fields, shorthand and literal object keys', () => {
    const data = '{{queries.jobs.data.map(id => ({id, "note": id.note}))}}';
    expect(lintSelectedRowProjections([table(data), consumer('{{components.queue.selectedRow.note}}')])).toEqual([]);
  });
  it.each([
    '{{queries.jobs.data}}',
    '{{queries.jobs.data.map(r => ({...r, title:r.title}))}}',
    '{{queries.jobs.data.map(r => ({[variables.key]:r.id}))}}',
    '{{queries.jobs.data.map(r => { return {id:r.id}; })}}',
    '{{queries.jobs.data.map(r => ({id:r.id})).map(enrich)}}',
    '{{queries.jobs.data.map(r => ({__proto__:r}))}}',
    '{{invalid!}}',
  ])('does not guess unknown projections: %s', data => {
    expect(lintSelectedRowProjections([table(data), consumer('{{components.queue.selectedRow.note}}')])).toEqual([]);
  });
  it.each([
    '{{components.queue.selectedRow.id}}',
    '{{components.queue.selectedRow[variables.field]}}',
    '{{components.queue.selectedRow.toString()}}',
    '{{"components.queue.selectedRow.note"}}',
    '{{((components) => components.queue.selectedRow.note)({})}}',
    '{{(() => { const components = {}; return components.queue.selectedRow.note; })()}}',
    '{{queries.jobs.data.find(r => r.id === components.queue.selectedRow.id)?.note}}',
  ])('ignores supported fields, dynamic keys, strings, shadows and raw lookup: %s', binding => {
    expect(lintSelectedRowProjections([table(closed), consumer(binding)])).toEqual([]);
  });
  it('skips duplicate table names and absent tables in a partial batch', () => {
    const c = consumer('{{components.queue.selectedRow.note}}');
    expect(lintSelectedRowProjections([c])).toEqual([]);
    expect(lintSelectedRowProjections([table(closed), table(closed), c])).toEqual([]);
  });
  it('also examines query/event bindings supplied by whole-app validation', () => {
    expect(lintSelectedRowProjections([table(closed)], [{label:'Query "save"',value:{options:{owner:'{{components.queue.selectedRow.owner}}'}}}]).join(' ')).toContain('Query "save"');
  });
});
// Regression: the equipment control copied a row without `active` to a variable;
// a name-only edit then silently retired the equipment.
describe('selected row snapshots through variables', () => {
  const components = [
    {name:'EquipmentTable',type:'Table',properties:{data:'{{queries.raw.data.map(row => ({id:row.id,active_label:row.active ? "Active" : "Retired"}))}}'}},
    {name:'ActiveToggle',type:'ToggleSwitchV2',properties:{defaultValue:'{{variables.selectedEquipment ? variables.selectedEquipment.active : true}}'}},
  ];
  const assignment = {label:'Event "Edit"',value:{actionId:'set-custom-variable',key:'selectedEquipment',value:'{{components.EquipmentTable.selectedRow}}'}};
  it('warns for omitted boolean fields in a known row snapshot',()=>{
    const result=lintSelectedRowProjections(components,[assignment,{label:'Event "Add"',value:{actionId:'set-custom-variable',key:'selectedEquipment',value:'{{null}}'}}]);
    expect(result.join(' ')).toContain('variables.selectedEquipment.active');
    expect(result.join(' ')).toContain('blank/false');
  });
  it('does not follow mixed assignments, RunJS writers or raw-record lookups',()=>{
    expect(lintSelectedRowProjections(components,[assignment,{label:'Other',value:{...assignment.value,value:'{{queries.raw.data[0]}}'}}])).toEqual([]);
    expect(lintSelectedRowProjections(components,[{...assignment,value:{...assignment.value,value:'{{queries.raw.data.find(r => r.id === components.EquipmentTable.selectedRow.id)}}'}}])).toEqual([]);
    expect(lintSelectedRowProjections(components,[assignment,{label:'Query',value:{code:'await actions.setVariable("selectedEquipment", raw)'}}])).toEqual([]);
  });
  it('does not flag fields present in the projection or local shadowed variables',()=>{
    const present=structuredClone(components);present[0]!.properties={data:'{{queries.raw.data.map(row=>({id:row.id,active:row.active}))}}'};
    expect(lintSelectedRowProjections(present,[assignment])).toEqual([]);
    expect(lintSelectedRowProjections([components[0]!,{name:'text',type:'Text',properties:{text:'{{((variables)=>variables.selectedEquipment.active)({})}}'}}],[assignment])).toEqual([]);
  });
  it('checks each known table feeding a shared review variable',()=>{
    const second={...components[0]!,name:'OtherQueue'};
    const another={label:'Review',value:{...assignment.value,value:'{{components.OtherQueue.selectedRow}}'}};
    const warnings=lintSelectedRowProjections([...components,second],[assignment,another]);
    expect(warnings.filter(w=>w.includes('omits "active"'))).toHaveLength(2);
    expect(warnings.join(' ')).toContain('Table "OtherQueue"');
    const complete={...second,properties:{data:'{{queries.raw.data.map(r=>({id:r.id,active:r.active}))}}'}};
    expect(lintSelectedRowProjections([...components,complete],[assignment,another])).toHaveLength(1);
  });
  it('does not restore a known alias after an unknown writer or certify open projections',()=>{
    const unknown={label:'Other',value:{...assignment.value,value:'{{queries.raw.data[0]}}'}};
    expect(lintSelectedRowProjections(components,[unknown,assignment])).toEqual([]);
    const open={...components[0]!,name:'OpenQueue',properties:{data:'{{queries.raw.data}}'}};
    const another={label:'Review',value:{...assignment.value,value:'{{components.OpenQueue.selectedRow}}'}};
    const warnings=lintSelectedRowProjections([...components,open],[assignment,another]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Table "EquipmentTable"');
  });
});

describe('display placeholder edit contamination',()=>{
  const data='{{queries.raw.data.map(r=>({id:r.id,notes:r.notes || "No notes"}))}}';
  it('warns for direct and aliased editable fallback values without changing them',()=>{
    const direct=[table(data),consumer('{{components.queue.selectedRow.notes || ""}}')];
    const before=JSON.stringify(direct);
    expect(lintSelectedRowProjections(direct).join(' ')).toContain('non-empty display fallback');
    expect(JSON.stringify(direct)).toBe(before);
    expect(lintSelectedRowProjections([table(data),consumer('{{variables.editingRow?.notes}}')],[
      {label:'Edit',value:{actionId:'set-custom-variable',key:'editingRow',value:'{{components.queue.selectedRow}}'}},
    ]).join(' ')).toContain('non-empty display fallback');
  });
  it('leaves read-only displays, raw fields, empty fallbacks and explicit conversions alone',()=>{
    expect(lintSelectedRowProjections([table(data),{name:'display',type:'Text',properties:{text:'{{components.queue.selectedRow.notes}}'}}])).toEqual([]);
    for(const field of ['r.notes','r.notes || ""']) expect(lintSelectedRowProjections([
      table('{{queries.raw.data.map(r=>({id:r.id,notes:'+field+'}))}}'),consumer('{{components.queue.selectedRow.notes}}'),
    ])).toEqual([]);
    expect(lintSelectedRowProjections([table(data),consumer('{{queries.raw.data.find(r=>r.id===components.queue.selectedRow.id)?.notes}}')])).toEqual([]);
  });
});

describe('raw table date edit parser contract',()=>{
  const dateTable = (): LintComponent => ({name:'queue',type:'Table',properties:{
    data:'{{queries.raw.data.map(r=>({id:r.id,expiry:r.expiry}))}}',
    columns:[{key:'expiry',columnType:'datepicker',parseDateFormat:'YYYY-MM-DD',dateFormat:'MMM D, YYYY'}],
  }});
  const dateEditor = (value='{{components.queue.selectedRow.expiry}}',format='MMM D, YYYY'): LintComponent => ({
    name:'expiryEditor',type:'DatePickerV2',properties:{defaultValue:value,dateFormat:format},
  });
  it('warns about the raw ISO to display-format parsing mismatch without rewriting',()=>{
    const input=[dateTable(),dateEditor()];const original=JSON.stringify(input);
    expect(lintSelectedRowProjections(input).join(' ')).toContain('Table column declares parseDateFormat "YYYY-MM-DD"');
    expect(JSON.stringify(input)).toBe(original);
  });
  it('follows an unambiguous declarative edit snapshot',()=>{
    expect(lintSelectedRowProjections([dateTable(),dateEditor('{{variables.editRow?.expiry}}')],[
      {label:'Edit',value:{actionId:'set-custom-variable',key:'editRow',value:'{{components.queue.selectedRow}}'}},
    ]).join(' ')).toContain('silently change the date');
  });
  it('leaves matching formats and explicit consumer conversions alone',()=>{
    expect(lintSelectedRowProjections([dateTable(),dateEditor(undefined,'YYYY-MM-DD')])).toEqual([]);
    expect(lintSelectedRowProjections([dateTable(),dateEditor('{{moment(components.queue.selectedRow.expiry).format("MMM D, YYYY")}}')])).toEqual([]);
  });
  it('does not warn for an ISO timestamp consumed as an ISO date-only value',()=>{
    const source=dateTable();source.properties!.columns=[{key:'expiry',columnType:'datepicker',parseDateFormat:'YYYY-MM-DDTHH:mm:ssZ'}];
    expect(lintSelectedRowProjections([source,dateEditor(undefined,'YYYY-MM-DD')])).toEqual([]);
  });
  it('does not infer unknown row projections, source formats or field names',()=>{
    const source=dateTable();source.properties!.data='{{queries.raw.data}}';
    expect(lintSelectedRowProjections([source,dateEditor()])).toEqual([]);
    source.properties!.data=dateTable().properties!.data;source.properties!.columns=[{key:'expiry',columnType:'string'}];
    expect(lintSelectedRowProjections([source,dateEditor()])).toEqual([]);
    source.properties!.columns=[{key:'expiry',columnType:'datepicker',parseDateFormat:'{{variables.format}}'}];
    expect(lintSelectedRowProjections([source,dateEditor()])).toEqual([]);
  });
  it('skips duplicate tables and ambiguous column parse formats',()=>{
    expect(lintSelectedRowProjections([dateTable(),dateTable(),dateEditor()])).toEqual([]);
    const source=dateTable();source.properties!.columns=[...(source.properties!.columns as unknown[]),{key:'expiry',columnType:'datepicker',parseDateFormat:'DD/MM/YYYY'}];
    expect(lintSelectedRowProjections([source,dateEditor()])).toEqual([]);
  });
});
