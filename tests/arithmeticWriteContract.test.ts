import {describe,it,expect} from 'vitest';
import {arithmeticWriteWarning, conditionalWriteWarning} from '../src/arithmeticWriteContract.js';
import {validateQueryOptions} from '../src/queryValidation.js';
const options=(value: string, filters: unknown={})=>({operation:'update_rows',update_rows:{columns:{0:{column:'on_hand',value}},where_filters:filters}});
describe('client arithmetic write advisory',()=>{
  it('detects the receiving regression without rewriting the payload',()=>{
    const o=options('{{Number(components.receiveLines.selectedRow.item_on_hand||0)+Number(components.acceptedQty.value||0)}}');
    const before=structuredClone(o);expect(arithmeticWriteWarning('tooljetdb',o)).toContain('absent value defaulted to zero');expect(o).toEqual(before);
  });
  it('covers optional and literal bracket members',()=>{
    expect(arithmeticWriteWarning('tooljetdb',options("{{components['rows']?.selectedRow?.['on_hand'] - 2}}"))).toContain('atomic');
  });
  it('allows explicit expected-value guards',()=>{
    expect(arithmeticWriteWarning('tooljetdb',options('{{components.rows.selectedRow.on_hand + 2}}',{0:{column:'on_hand',operator:'eq',value:'{{variables.original}}'}}))).toBeUndefined();
  });
  it.each(['{{components.quantity.value}}','{{variables.original + 2}}','{{(components => components.rows.selectedRow.on_hand + 2)(local)}}','{{bad syntax + }}'])('leaves unproven expressions alone: %s',value=>{
    expect(arithmeticWriteWarning('tooljetdb',options(value))).toBeUndefined();
  });
  it('does not apply to other datasource kinds',()=>expect(arithmeticWriteWarning('postgresql',options('{{components.rows.selectedRow.on_hand+1}}'))).toBeUndefined());
});

describe('conditional write result contract',()=>{
  it('warns for stale stock and state guards without removing the predicate',()=>{
    const o=options('{{variables.review.counted_qty}}',{0:{column:'on_hand',operator:'eq',value:'{{variables.review.recorded_qty}}'}});
    const before=structuredClone(o);
    expect(conditionalWriteWarning('tooljetdb',o)).toContain('zero matching rows');
    expect(validateQueryOptions('tooljetdb',o).warnings.some(x=>x.code==='conditional_write_result')).toBe(true);
    expect(o).toEqual(before);
  });
  it('does not diagnose identity-only updates or unknown runtime predicates',()=>{
    for(const filters of [{0:{column:'id',operator:'eq',value:1}},'{{variables.where}}',{0:{column:'on_hand',operator:'gte',value:0}}])
      expect(conditionalWriteWarning('tooljetdb',options('{{components.qty.value}}',filters))).toBeUndefined();
    expect(conditionalWriteWarning('postgresql',options('1',{0:{column:'on_hand',operator:'eq',value:0}}))).toBeUndefined();
  });
});
