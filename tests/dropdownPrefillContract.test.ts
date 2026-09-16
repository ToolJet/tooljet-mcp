import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';
import { lintComponentSpec } from '../src/lint.js';
import { dropdownDefaultVisibilityWarning } from '../src/dropdownDefaultContract.js';

describe('DropdownV2 preselection contract',()=>{
  it.each(['value','defaultValue'])('preserves invalid %s for an actionable error instead of silently stripping it',key=>{
    const input={name:'editClient',type:'DropdownV2',properties:{label:'Client',[key]:'{{variables.rawClientId}}'}};
    const normalized=normalizeComponentSpec(input,{stripUnknownKeys:true});
    expect(normalized.component.properties).toHaveProperty(key);
    expect(lintComponentSpec(normalized.component).errors.join(' ')).toContain(`properties.${key} is not a supported preselection`);
  });
  it('keeps dynamic option defaults and supported TextInput values unchanged',()=>{
    const schema='{{queries.clients.data.map(row=>({label:row.name,value:row.id,visible:true,default:row.id === variables.rawClientId}))}}';
    const normalized=normalizeComponentSpec({name:'editClient',type:'DropdownV2',properties:{label:'Client',advanced:true,schema}},{stripUnknownKeys:true});
    expect(normalized.component.properties?.schema).toEqual({value:schema});
    expect(lintComponentSpec(normalized.component).errors).toEqual([]);
    expect(normalizeComponentSpec({name:'name',type:'TextInput',properties:{value:'Hello'}},{stripUnknownKeys:true}).component.properties?.value).toEqual({value:'Hello'});
  });
});

describe('DropdownV2 default visibility', () => {
  it('warns on the benchmark dynamic default without visible without rewriting it', () => {
    const schema="{{[{label:'Active',value:'active',default:components.carrierTable?.selectedRow?.status === 'active'},{label:'Suspended',value:'suspended',default:components.carrierTable?.selectedRow?.status === 'suspended'}]}}";
    const input = {name:'editCarrierStatus',type:'DropdownV2',properties:{advanced:true,schema}};
    expect(lintComponentSpec(input).warnings.join(' ')).toContain('default but omits visible');
    expect(input.properties.schema).toBe(schema);
  });
  it('warns on static defaults and closed mapped options', () => {
    expect(dropdownDefaultVisibilityWarning([{label:'A',value:1,default:true}], 'status')).toHaveLength(1);
    expect(dropdownDefaultVisibilityWarning('{{queries.rows.data.map(r=>({label:r.name,value:r.id,default:r.id === variables.id}))}}', 'status')).toHaveLength(1);
  });
  it.each([
    [{label:'A',value:1,default:true,visible:true}],
    [{label:'A',value:1,default:true,visible:false}],
    [{label:'A',value:1,default:false}],
    '{{[{label:"A",value:1,default:false}]}}',
    '{{[{label:"A",value:1,default:true,visible:components.show.value}]}}',
    '{{queries.options.data}}',
    '{{queries.options.data.map(r=>({...r,default:true}))}}',
    '{{queries.options.data.map(r=>({[variables.key]:true,default:true}))}}',
    '{{queries.options.data.map(r=>{return {default:true};})}}',
  ])('leaves explicit visibility, non-defaults and unknown shapes unverified: %j', value => {
    expect(dropdownDefaultVisibilityWarning(value, 'status')).toEqual([]);
  });
  it('does not inspect the inactive option mode', () => {
    expect(lintComponentSpec({name:'s',type:'DropdownV2',properties:{advanced:true,options:[{label:'A',value:1,default:true}],schema:'{{queries.options.data}}'}}).warnings.join(' ')).not.toContain('default but omits visible');
  });
  it('reproduces the native difference between menu visibility and default lookup', () => {
    const options=[{label:'Active',value:'active',default:true}];
    const findDefault=(items:Array<{value:string;default:boolean;visible?:boolean}>)=>items.find(o=>o.visible === true && o.default === true)?.value;
    expect(options.filter((o:{visible?:boolean})=>o.visible ?? true)).toHaveLength(1);
    expect(findDefault(options)).toBeUndefined();
    expect(findDefault(options.map(o=>({...o,visible:true})))).toBe('active');
  });
});
