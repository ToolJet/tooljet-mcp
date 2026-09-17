import { expect, it } from 'vitest';
import { lintUninitializedWriteSelections } from '../src/editPrefillContract.js';
import type { AppSummary } from '../src/tooljetClient.js';

const fixture = () => ({pages:[{components:[{id:'stage-id',name:'stage',type:'DropdownV2',properties:{options:{value:[{label:'Open',value:'open'},{label:'Closed',value:'closed'}]}}}]}],queries:[{id:'q',name:'save',kind:'tooljetdb',options:{operation:'update_rows',update_rows:{columns:{'0':{column:'status',value:'{{components.stage.value}}'}},where_filters:{id:{column:'id',value:'{{variables.id}}'}}}}}],events:[]} as unknown as AppSummary);
it('warns before an uninitialized static selector clears an existing field',()=>{
  expect(lintUninitializedWriteSelections(fixture())).toHaveLength(1);
});
it('leaves explicit default, empty choice and advanced schemas alone',()=>{
  for(const mode of ['default','empty','advanced']) {
    const s=fixture(); const p=s.pages[0]!.components[0]!.properties as any;
    if(mode==='default') p.options.value[0].default=true;
    if(mode==='empty') p.options.value.push({label:'Clear',value:''});
    if(mode==='advanced') p.advanced={value:true};
    expect(lintUninitializedWriteSelections(s)).toEqual([]);
  }
});
it('leaves a selection guard, initializer and opaque RunJS path alone',()=>{
  for(const mode of ['guard','event','runjs']) {
    const s=fixture();
    if(mode==='guard') (s.queries[0]!.options as any).disableQuery='{{!components.stage.value}}';
    if(mode==='event') s.events.push({event:{componentId:'stage-id'}} as any);
    if(mode==='runjs') s.queries.push({kind:'runjs',options:{code:'components.stage.setValue("open")'}} as any);
    expect(lintUninitializedWriteSelections(s)).toEqual([]);
  }
});
it('does not apply to inserts or unrelated controls',()=>{
  const s=fixture(); (s.queries[0]!.options as any).operation='create_row';
  expect(lintUninitializedWriteSelections(s)).toEqual([]);
});
