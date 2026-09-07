import { describe, expect, it } from 'vitest';
import { lintBindingSyntax } from '../src/bindingSyntax.js';
import { lintComponentSpec } from '../src/lint.js';

describe('whole-value binding syntax', () => {
  it('rejects trailing corruption in boolean component bindings but accepts interpolated Text', () => {
    for (const key of ['disabledState', 'loadingState', 'visibility', 'collapseWhenHidden']) {
      const result = lintComponentSpec({name:'submit',type:'Button',properties:{[key]:{value:'{{queries.save.isLoading}}}}]}}]} stray'}}});
      expect(result.errors.join(' ')).toContain('expected one whole-value JavaScript binding');
    }
    expect(lintComponentSpec({name:'label',type:'Text',properties:{text:{value:'{{variables.label}} items'}}}).errors).toEqual([]);
    expect(lintBindingSyntax('{{false}} {{true}}','flag',true)[0]).toContain('invalid JavaScript binding syntax');
    expect(lintBindingSyntax('{{({nested:{value:1}}).nested.value === 1}}','flag',true)).toEqual([]);
  });
  it('rejects the Northlight extra closing parenthesis before a component write', () => {
    const value = '{{(queries.overdueLoans.data || []).map(r => ({id:r.id,status:r.status})) )}}';
    expect(lintComponentSpec({name:'overdueTable',type:'Table',properties:{data:{value}}}).errors.join(' '))
      .toMatch(/overdueTable.*properties.data.value: invalid JavaScript binding syntax/);
  });

  it('checks nested column styles and raw or enveloped component values', () => {
    for (const value of ['{{foo(}}', {value:'{{foo(}}'}, [{color:{value:'{{foo(}}'}}]]) {
      expect(lintBindingSyntax(value, 'root')).toHaveLength(1);
    }
  });

  it('accepts valid runtime expressions without needing their bindings', () => {
    for (const value of [
      '{{(queries.loans.data || []).map(r => ({id:r.id}))}}',
      '{{(() => { const ids = new Set(queries.loans.data.map(r => r.id)); return ids.size; })()}}',
      '{{components.name?.value ?? ""}}', '{{({nested:{value:1}})}}',
      '{{`Total ${queries.total.data[0]?.value}`}}', '{{/a{2}/.test(variables.text)}}',
    ]) expect(lintBindingSyntax(value,'root')).toEqual([]);
  });

  it('never evaluates code, getters, function calls, or assignments', () => {
    const target = globalThis as typeof globalThis & { __bindingSyntaxExecuted?: boolean };
    target.__bindingSyntaxExecuted = false;
    expect(lintBindingSyntax('{{(() => { globalThis.__bindingSyntaxExecuted = true; throw new Error("must not run"); })()}}','root')).toEqual([]);
    expect(target.__bindingSyntaxExecuted).toBe(false);
    delete target.__bindingSyntaxExecuted;
  });

  it('leaves mixed templates and literals untouched instead of misparsing their delimiters', () => {
    for (const value of ['Hello {{components.name.value}}', '{{a}} / {{b}}', '{{"}}"}}', '<div>{{a}}</div>', '', null, 3]) {
      expect(lintBindingSyntax(value,'root')).toEqual([]);
    }
  });
});
