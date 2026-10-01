import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';
import { lintComponentSpec, validateAppStructure } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import type { AppSummary } from '../src/tooljetClient.js';

describe('safe numeric-contract normalization', () => {
  it('moves explicit bounds only on new NumberInput definitions and keeps zero', () => {
    const result = normalizeComponentSpec({name:'fee',type:'NumberInput',properties:{minValue:0,maxValue:100}}, {stripUnknownKeys:true});
    expect(result.component.properties).not.toHaveProperty('minValue');
    expect(result.component.validation).toEqual({minValue:{value:0},maxValue:{value:100}});
    expect(result.patch.validation).toEqual(result.component.validation);
    expect(lintComponentSpec(result.component).errors.filter(x=>x.includes('ignored by the renderer'))).toEqual([]);
  });
  it('does not guess conflicting bounds or change legacy update semantics', () => {
    const conflict = normalizeComponentSpec({name:'fee',type:'NumberInput',properties:{minValue:0},validation:{minValue:5}}, {stripUnknownKeys:true});
    expect(conflict.component.validation!.minValue).toEqual({value:5});
    expect(lintComponentSpec(conflict.component).errors.some(x=>x.includes('properties.minValue'))).toBe(true);
    const legacy = normalizeComponentSpec({name:'fee',type:'NumberInput',properties:{minValue:0}});
    expect(legacy.component.properties!.minValue).toEqual({value:0});
  });
});

describe('binding contracts cover validation and other sections', () => {
  it('catches missing names in a custom validation rule before and after write', () => {
    const component={id:'i',name:'input',type:'TextInput',validation:{customRule:{value:'{{components.missing.value}}'}}};
    const summary:AppSummary={app_id:'a',pages:[{id:'p',name:'Home',components:[component]}],queries:[],events:[]};
    expect(validateAppStructure(summary).errors.join(' ')).toContain('components.missing');
    expect(lintPlannedApp({pages:[{name:'Home',icon:'IconHome2',components:[component]}]}).errors.join(' ')).toContain('components.missing');
  });
});

// Execute only repository-authored recipe code; never generated app code or external input.
const forms = readFileSync(new URL('../skill/references/forms.md',import.meta.url),'utf8');
function recipe(name:string): (...args:any[])=>any {
  const code=[...forms.matchAll(/```js\n([\s\S]*?)\n```/g)].find(match=>match[1]!.includes(`function ${name}(`))?.[1];
  if (!code) throw new Error(`Missing recipe ${name}`);
  return vm.runInNewContext(`${code}; ${name}`,{}, {timeout:1000});
}
describe('published workflow recipes', () => {
  it('preserves untouched fields while accepting intentional empty, zero, false and null edits', () => {
    const changedFields=recipe('changedFields');
    const before={id:1,name:'Original',fee:10,active:true,note:'text',owner:4};
    const draft={...before,id:2,name:'',fee:0,active:false,note:null,owner:undefined};
    expect(changedFields(before,draft,['name','fee','active','note','owner'])).toEqual({name:'',fee:0,active:false,note:null});
    expect(changedFields(before,{...before},['name','fee'])).toEqual({});
    expect(()=>changedFields(null,draft,['name'])).toThrow();
    expect(before.owner).toBe(4);
  });
  it('requires eligible identity, source status and a real completion note', () => {
    const canComplete=recipe('canComplete');
    for (const note of ['', '   ', '\n\t', null, undefined, 1]) expect(canComplete({id:1,status:'In progress'},note,['In progress'])).toBe(false);
    expect(canComplete({id:1,status:'Done'},'done',['In progress'])).toBe(false);
    expect(canComplete({id:'',status:'In progress'},'done',['In progress'])).toBe(false);
    expect(canComplete(null,'done',['In progress'])).toBe(false);
    expect(canComplete({id:1,status:'In progress'},'  Evidence recorded  ',['In progress'])).toBe(true);
  });
});
