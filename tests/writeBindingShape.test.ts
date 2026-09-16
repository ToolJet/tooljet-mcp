import { describe, expect, it } from 'vitest';
import { primitiveWriteBindingEntries } from '../src/writeBindingShape.js';
import { validateQueryOptions } from '../src/queryValidation.js';

describe('ToolJet DB write bindings cannot bypass the record-map contract', () => {
  it('detects the actual volunteer signup shape before any write', () => {
    const create_row = "{{ {shift_id:components.shifts.selectedRow.id, volunteer_id:components.person.value, status:'active', attendance_status:'scheduled', signed_up_at:moment().format('YYYY-MM-DD HH:mm:ss')} }}";
    expect(primitiveWriteBindingEntries(create_row)).toEqual(['status','attendance_status']);
    expect(validateQueryOptions('tooljetdb',{operation:'create_row',table_id:'t',create_row}).errors.some(e=>e.code==='malformed_write_columns')).toBe(true);
    expect(validateQueryOptions('tooljetdb',{operation:'update_rows',table_id:'t',update_rows:{columns:create_row,where_filters:{'0':{column:'id',operator:'eq',value:1}}}}).errors.some(e=>e.code==='malformed_write_columns')).toBe(true);
  });
  it('leaves valid record maps, runtime records and ambiguous expressions alone', () => {
    for (const value of ["{{ {0:{column:'status',value:'active'}} }}", '{{queries.prepare.data}}', '{{({...variables.columns})}}', '{{ {entry:queries.clause.data} }}', '{{ (() => { throw new Error("must not execute") })() }}', '{{ bad syntax }}'])
      expect(primitiveWriteBindingEntries(value)).toEqual([]);
  });
  it('handles nested closing braces, false, zero and template strings without executing', () => {
    expect(primitiveWriteBindingEntries('{{ {active:false,count:0,description:`row ${components.row.value}`} }}')).toEqual(['active','count','description']);
    expect(primitiveWriteBindingEntries('{{ {0:{column:"x",value:{nested:1}}}}}')).toEqual([]);
  });
});
