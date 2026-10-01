import { describe, expect, it } from 'vitest';
import { lintHiddenModalHitTargets, lintComponents } from '../src/lint.js';

describe('hidden modal click interception', () => {
  const modal={id:'modal-id',name:'projectModal',type:'ModalV2',properties:{useDefaultButton:false},layout:{left:32,top:20,width:10,height:40}};
  const button={name:'newProject',type:'Button',layout:{left:32,top:20,width:10,height:40}};
  it('warns about the invisible modal wrapper over a real button', () => {
    expect(lintHiddenModalHitTargets([button,modal])[0]).toMatch(/projectModal.*newProject.*intercept clicks/);
    expect(lintComponents([button,modal]).warnings.join(' ')).toContain('invisible wrapper');
  });
  it('recognizes wrapped static false and both component orders', () => {
    expect(lintHiddenModalHitTargets([{...modal,properties:{useDefaultButton:{value:'{{false}}'}}},button])).toHaveLength(1);
  });
  it('leaves separate footprints, children, display surfaces and visible triggers alone', () => {
    expect(lintHiddenModalHitTargets([modal,{...button,layout:{...button.layout,left:0}}])).toEqual([]);
    expect(lintHiddenModalHitTargets([modal,{...button,parent:'modal-id-body'}])).toEqual([]);
    expect(lintHiddenModalHitTargets([modal,{...button,type:'Text'}])).toEqual([]);
    expect(lintHiddenModalHitTargets([{...modal,properties:{useDefaultButton:true}},button])).toEqual([]);
  });
  it('does not prescribe or rewrite placement', () => {
    const components=[button,modal];const before=structuredClone(components);
    lintHiddenModalHitTargets(components);expect(components).toEqual(before);
  });
});
