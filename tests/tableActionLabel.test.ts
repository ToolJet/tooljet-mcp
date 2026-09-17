import { it, expect } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

it('preserves an authored action caption through the native buttonLabel key on new components', () => {
  const input={name:'slices',type:'Table',properties:{columns:[{name:'Investigate',key:'action',columnType:'button',buttons:[{id:'open',label:'Open investigation'}]}]}};
  const result=normalizeComponentSpec(input,{stripUnknownKeys:true});
  expect((result.component.properties?.columns as any).value[0].buttons).toEqual([{id:'open',buttonLabel:'Open investigation'}]);
  expect(input.properties.columns[0].buttons[0]).toEqual({id:'open',label:'Open investigation'});
  expect((normalizeComponentSpec(input).component.properties?.columns as any).value[0].buttons[0].label).toBe('Open investigation');
});

it('retains explicit native captions and leaves dynamic button collections unchanged', () => {
  const columns=[{name:'Action',key:'a',columnType:'button',buttons:[{id:'a',label:'Wrong alias',buttonLabel:'Keep me'}]},
    {name:'Dynamic',key:'d',columnType:'button',buttons:'{{queries.actions.data}}'}];
  const result=normalizeComponentSpec({name:'t',type:'Table',properties:{columns}},{stripUnknownKeys:true});
  expect((result.component.properties?.columns as any).value).toEqual(columns);
});
