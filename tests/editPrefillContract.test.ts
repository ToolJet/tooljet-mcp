import { describe, it, expect } from 'vitest';
import { lintEditPrefill } from '../src/editPrefillContract.js';
import type { AppSummary } from '../src/tooljetClient.js';

function summary(): AppSummary {
  return { pages:[{id:'p',components:[
    {id:'a',name:'Contact',type:'TextInput',properties:{}},
    {id:'b',name:'Email',type:'EmailInput',properties:{value:{value:''}}},
  ]}], queries:[{id:'q',name:'save',kind:'tooljetdb',options:{operation:'update_rows',update_rows:{
    where_filters:{id:{column:'id',operator:'eq',value:'{{variables.customerId}}'}},
    columns:{a:{column:'contact',value:'{{components.Contact.value}}'},b:{column:'email',value:'{{components.Email.value}}'}},
  }}}],events:[] } as unknown as AppSummary;
}
describe('existing-row edit prefill advisory',()=>{
  it('flags multiple empty controls feeding a selected record update',()=>{
    expect(lintEditPrefill(summary())).toEqual([expect.stringContaining('blank controls "Contact", "Email"')]);
  });
  it('allows explicit defaults, preparation queries, control events and single-field actions',()=>{
    const a=summary(); a.pages[0]!.components[0]!.properties={value:{value:'{{variables.draft.contact}}'}};
    expect(lintEditPrefill(a)).toEqual([]);
    const b=summary(); b.queries.push({id:'prep',kind:'runjs',options:{code:'await components.Contact.setValue(raw.contact);'}} as AppSummary['queries'][number]);
    expect(lintEditPrefill(b)).toEqual([]);
    const c=summary(); c.events.push({id:'e',event:{actionId:'control-component',componentId:'a'}} as AppSummary['events'][number]);
    expect(lintEditPrefill(c)).toEqual([]);
  });
  it('does not infer create, arbitrary SQL or unscoped updates as edit forms',()=>{
    const a=summary(); (a.queries[0]!.options as Record<string,unknown>).operation='create_row'; expect(lintEditPrefill(a)).toEqual([]);
    const b=summary(); b.queries[0]!.kind='postgresql'; expect(lintEditPrefill(b)).toEqual([]);
    const c=summary(); ((c.queries[0]!.options as Record<string,unknown>).update_rows as Record<string,unknown>).where_filters={}; expect(lintEditPrefill(c)).toEqual([]);
  });
  it('does not treat a fixed-state workflow with new inputs as a contact edit',()=>{
    for (const value of ['Completed', false, 0, null]) {
      const a=summary();
      const update=(a.queries[0]!.options as Record<string,unknown>).update_rows as Record<string,unknown>;
      (update.columns as Record<string,unknown>).transition={column:'state',value};
      expect(lintEditPrefill(a)).toEqual([]);
    }
  });
});
