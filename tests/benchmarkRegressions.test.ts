import { describe, expect, it } from 'vitest';
import { lintComponentSpec } from '../src/lint.js';

describe('benchmark date and option contracts', () => {
  const date = (defaultValue: unknown, dateFormat: unknown = 'DD MMM YYYY') =>
    lintComponentSpec({ type: 'DatePickerV2', name: 'periodStart', properties: {
      defaultValue: { value: defaultValue }, dateFormat: { value: dateFormat },
    } });

  it('blocks known ISO defaults parsed with an incompatible display format without rewriting the app', () => {
    for (const value of ['2026-09-14', "{{'2026-09-14'}}", '{{"2026-09-14"}}']) {
      expect(date(value).errors.join(' ')).toContain('does not match dateFormat');
    }
  });

  it('accepts matching, empty, numeric and unknown dynamic dates', () => {
    for (const [value, format] of [
      ['2026-09-14', 'YYYY-MM-DD'], ['14 Sep 2026', 'DD MMM YYYY'],
      ['2026-09-14', 'YYYY-M-D'], ['2026-09-14', 'YYYY/MM/DD'],
      ['{{null}}', 'DD MMM YYYY'], [1789344000000, 'DD MMM YYYY'],
      ['{{variables.selectedDate}}', 'DD MMM YYYY'], ['2026-09-14', '{{variables.dateFormat}}'],
    ]) {
      expect(date(value, format).errors.join(' ')).not.toContain('does not match dateFormat');
    }
  });

  it('warns rather than rejecting ambiguous formatting logic', () => {
    expect(date("{{moment().format('YYYY-MM-DD')}}").warnings.join(' ')).toContain('parser and display share dateFormat');
    expect(date("{{moment().format('DD MMM YYYY')}}").warnings.join(' ')).not.toContain('parser and display share dateFormat');
  });

  it('rejects nested template delimiters and trailing prose in advanced dropdown schemas', () => {
    for (const schema of [
      "{{[{label:'A',value:{{variables.id}}}]}}",
      "{{queries.staff.data.map(r => ({label:r.name,value:r.id}))} }",
    ]) {
      const result = lintComponentSpec({ type: 'DropdownV2', name: 'technician', properties: {
        advanced: { value: '{{true}}' }, schema: { value: schema },
      } });
      expect(result.errors.join(' ')).toMatch(/binding syntax|whole-value JavaScript binding/);
    }
  });

  it('accepts valid advanced options including nested objects and leaves inactive schemas alone', () => {
    for (const schema of [
      "{{(queries.staff.data || []).map(r => ({label:r.name,value:r.id}))}}",
      [{label:'Sam',value:'Sam'}],
    ]) {
      expect(lintComponentSpec({ type:'DropdownV2', properties: {
        advanced:{value:true}, schema:{value:schema},
      }}).errors.join(' ')).not.toMatch(/binding syntax|whole-value JavaScript binding/);
    }
    expect(lintComponentSpec({type:'DropdownV2', properties:{
      advanced:{value:false}, schema:{value:'{{stale } }'},
    }}).errors.join(' ')).not.toContain('whole-value JavaScript binding');
  });
});
