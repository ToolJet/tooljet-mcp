import { describe, it, expect } from 'vitest';
import { lintBindingSyntax, multilineBindings } from '../src/bindingSyntax.js';

describe('multi-line bindings', () => {
  it('flags a line break inside an embedded Html binding', () => {
    const html = '<div>{{(()=>{\nconst rows=[1,2];\nreturn rows.length;\n})()}}</div>';
    const errors = lintBindingSyntax({ rawHtml: html }, 'Component "board".properties');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/line break/);
    expect(errors[0]).toMatch(/single line/);
  });

  it('flags a whole-value binding split across lines even when it is a simple expression', () => {
    expect(lintBindingSyntax('{{\n1 + 2\n}}', 'p', true)).toHaveLength(1);
  });

  it('accepts the same IIFE on one line and template literals', () => {
    const oneLine = '<div>{{(()=>{ const rows=[1,2]; return rows.length; })()}}</div>';
    expect(lintBindingSyntax({ rawHtml: oneLine }, 'p')).toEqual([]);
    expect(lintBindingSyntax('{{`Total: ${1 + 2}`}}', 'p', true)).toEqual([]);
  });

  it('lists every offending span, not just the first', () => {
    expect(multilineBindings('{{a\n}} and {{b}} and {{c\r\n}}')).toHaveLength(2);
  });
});
