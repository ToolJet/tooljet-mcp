import { describe, expect, it } from 'vitest';
import { validateEvents } from '../src/eventValidation.js';
import type { AppSummary, EventSpec } from '../src/tooljetClient.js';

function fixture() {
  const summary: AppSummary = {app_id:'app', pages:[{id:'home',name:'Home',handle:'home',components:[
    {id:'reason',name:'serviceReason',type:'TextArea',validation:{mandatory:true}},
    {id:'save',name:'saveService',type:'Button',properties:{disabledState:'{{queries.startService.isLoading}}'}},
  ]}],queries:[{id:'start',name:'startService',kind:'tooljetdb',options:{operation:'update_rows',update_rows:{columns:{0:{column:'reason',value:'{{components.serviceReason.value}}'}}}}}],events:[]};
  const event: EventSpec = {sourceId:'save',sourceType:'component',trigger:'onClick',action:{actionId:'run-query',queryId:'start'}};
  return {summary,event};
}
const warnings = (summary: AppSummary,event: EventSpec) => validateEvents(summary,[event]).warnings.filter(w=>w.includes('required marker alone'));

describe('required input mutation advisory',()=>{
  it('warns on an explicit non-empty text guard without requiring a mandatory marker',()=>{
    const {summary,event}=fixture();
    delete summary.pages[0]!.components[0]!.validation;
    summary.pages[0]!.components.push({id:'equipment',name:'serviceEquipment',type:'DropdownV2'});
    summary.pages[0]!.components[1]!.properties!.disabledState='{{queries.startService.isLoading || !components.serviceEquipment.value || !components.serviceReason.value}}';
    const result=validateEvents(summary,[event]);
    expect(result.warnings.join(' ')).toContain('Whitespace-only text');
    expect(result.errors).toEqual([]);
  });
  it('does not invent a non-empty requirement for optional unguarded text',()=>{
    const {summary,event}=fixture();
    delete summary.pages[0]!.components[0]!.validation;
    expect(validateEvents(summary,[event]).warnings.join(' ')).not.toContain('Whitespace-only text');
  });
  it('does not warn when a non-mandatory text guard already trims',()=>{
    const {summary,event}=fixture();
    delete summary.pages[0]!.components[0]!.validation;
    summary.pages[0]!.components[1]!.properties!.disabledState='{{!components.serviceReason.value.trim()}}';
    expect(validateEvents(summary,[event]).warnings.join(' ')).not.toContain('Whitespace-only text');
  });
  it('warns about the observed whitespace-only required note bypass',()=>{
    const {summary,event}=fixture();
    summary.pages[0]!.components[1]!.properties!.disabledState='{{queries.startService.isLoading || !components.serviceReason?.value}}';
    expect(validateEvents(summary,[event]).warnings.join(' ')).toContain('Whitespace-only text');
  });
  it.each(['{{components.serviceReason?.value?.trim().length > 0}}','{{components.serviceReason.isValid}}'])('does not second-guess a separate validation guard %s',guard=>{
    const {summary,event}=fixture();
    summary.pages[0]!.components[1]!.properties!.disabledState='{{queries.startService.isLoading || !components.serviceReason?.value}}';
    event.action.runOnlyIf=guard;
    expect(validateEvents(summary,[event]).warnings.join(' ')).not.toContain('Whitespace-only text');
  });
  it('does not apply text advice to numeric required inputs',()=>{
    const {summary,event}=fixture();summary.pages[0]!.components[0]!.type='NumberInput';
    summary.pages[0]!.components[1]!.properties!.disabledState='{{!components.serviceReason.value}}';
    expect(validateEvents(summary,[event]).warnings.join(' ')).not.toContain('Whitespace-only text');
  });
  it('catches a loading-only button that writes an empty mandatory field',()=>{
    const {summary,event}=fixture();
    expect(warnings(summary,event)).toHaveLength(1);
    expect(validateEvents(summary,[event]).errors).toEqual([]);
  });
  it.each(['{{components["serviceReason"]?.value}}','{{components.serviceReason?.value}}'])('supports bracket and optional reads %s',value=>{
    const {summary,event}=fixture();summary.queries[0]!.options={operation:'create_row',create_row:{value}};
    summary.pages[0]!.components[0]!.validation={mandatory:{value:true}};
    expect(warnings(summary,event)).toHaveLength(1);
  });
  it.each(['disabled','event'])('does not claim a visible %s guard is absent',where=>{
    const {summary,event}=fixture();
    if(where==='disabled') summary.pages[0]!.components[1]!.properties!.disabledState='{{!components.serviceReason?.isValid || !components.serviceReason?.value?.trim() || queries.startService.isLoading}}';
    else event.action.runOnlyIf='{{components["serviceReason"].value.trim().length > 0}}';
    expect(warnings(summary,event)).toEqual([]);
  });
  it('ignores optional fields, reads and validating query success chains',()=>{
    const {summary,event}=fixture();summary.pages[0]!.components[0]!.validation={mandatory:false};
    expect(warnings(summary,event)).toEqual([]);
    summary.pages[0]!.components[0]!.validation={mandatory:true};summary.queries[0]!.options={operation:'list_rows'};
    expect(warnings(summary,event)).toEqual([]);
    summary.queries[0]!.options={operation:'update_rows',value:'{{components.serviceReason.value}}'};
    summary.queries.push({id:'validate',name:'validate',kind:'runjs',options:{code:'return true'}});
    event.sourceId='validate';event.sourceType='data_query';event.trigger='onDataQuerySuccess';
    expect(warnings(summary,event)).toEqual([]);
  });
  it.each(['{{"components.serviceReason.value"}}','{{((components)=>components.serviceReason.value)({})}}','{{components[variables.field].value}}'])('leaves uncertain or literal bindings unverified %s',value=>{
    const {summary,event}=fixture();summary.queries[0]!.options={operation:'update_rows',value};
    expect(warnings(summary,event)).toEqual([]);
  });
});
