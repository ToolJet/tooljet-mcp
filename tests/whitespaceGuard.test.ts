import { expect,it } from 'vitest';
import { lintWhitespaceGuards } from '../src/whitespaceGuard.js';
import type { AppSummary } from '../src/tooljetClient.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';
function check(binding:string,type='TextArea') {
  return lintWhitespaceGuards({pages:[{components:[{id:'r',name:'reason',type},{id:'b',name:'Reject',type:'Button',properties:{disabledState:{value:binding}}}]}],queries:[],events:[]} as unknown as AppSummary);
}
it('warns on whitespace-permitting multiline note guards',()=>{
  expect(check('{{!components.reason?.value || !variables.selectedId}}')).toHaveLength(1);
  expect(check('{{!components["reason"].value}}')).toHaveLength(1);
});
it('leaves trimmed, unrelated, dynamic, quoted and shadowed expressions alone',()=>{
  expect(check('{{!String(components.reason?.value ?? "").trim()}}')).toEqual([]);
  expect(check('{{!components.reason.value}}','Checkbox')).toEqual([]);
  expect(check('{{!components[key].value}}')).toEqual([]);
  expect(check('{{"!components.reason.value"}}')).toEqual([]);
  expect(check('{{((components)=>!components.reason.value)({reason:{value:""}})}}')).toEqual([]);
});
it('preserves a disabled alias guard and exposes it to whitespace analysis',()=>{
  const guard='{{!components.reason?.value || queries.reject.isLoading}}';
  const result=normalizeComponentSpec({type:'Button',name:'Reject',properties:{disabled:{value:guard}}},{stripUnknownKeys:true});
  expect(result.component.properties?.disabledState).toEqual({value:guard});
  expect(result.component.properties).not.toHaveProperty('disabled');
  expect(lintWhitespaceGuards({pages:[{components:[{id:'r',name:'reason',type:'TextArea'},result.component]}],queries:[],events:[]} as unknown as AppSummary)).toHaveLength(1);
});
it('keeps the explicit canonical disabled guard when both names are present',()=>{
  const result=normalizeComponentSpec({type:'Button',name:'Save',properties:{disabled:true,disabledState:false}},{stripUnknownKeys:true});
  expect(result.component.properties?.disabledState).toEqual({value:false});
});
it('routes a disable alias to styles for legacy components whose schema owns it there',()=>{
  const result=normalizeComponentSpec({type:'Map',name:'Route',properties:{disabled:true}},{stripUnknownKeys:true});
  expect(result.component.styles?.disabledState).toEqual({value:true});
  expect(result.component.properties).not.toHaveProperty('disabledState');
});
