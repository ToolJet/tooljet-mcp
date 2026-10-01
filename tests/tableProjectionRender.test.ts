import { describe, expect, it } from 'vitest';
import { lintComponents, lintTableProjectionRender, type LintComponent } from '../src/lint.js';

const table = (properties: string, map = '.map', type = 'html'): LintComponent => ({
  type: 'Table', name: 'preview',
  properties: {
    data: { value: '{{queries.rows.data' + map + '(r => ({' + properties + '}))}}' },
    columns: { value: [{ key: 'status', name: 'Status', columnType: type, columnSize: 150 }] },
  },
});
const result = (spec: LintComponent) => {
  const warnings: string[] = [];
  return { errors: lintTableProjectionRender(spec, warnings), warnings };
};

describe('AST-based Table projection render checks', () => {
  it.each([
    "title: r.first + ' ' + r.last, sub: r.note || r.status + ' (' + r.code + ')'",
    "title: r.first + ' ' + r.last, score: r.score || r.base + 1",
    "score: r.score || r.base + 1, title: r.first + ' ' + r.last",
    "score: r.score || (r.base + 1)",
    "status: r.title || r.first + ' ' + r.last",
    "status: r.amount + 1 || r.base + 2",
    "status: '<span>Ready</span>' || '<span>' + r.state + '</span>'",
    "status: '<span>Ready</span>' || ('<span style=' || 'x' + '>')",
    "status: true ? '<span>Ready</span>' : ('<span style=' || 'x' + '>')",
    "status: false ? ('<span style=' || 'x' + '>') : '<span>Ready</span>'",
    "status: '<span style=\"color:' + (colors[r.state] || '#EEE') + '\">' + r.state + '</span>'",
    "status: ('<span style=\"color:' + colors[r.state] || '#EEE') + '\">' + r.state + '</span>'",
    "status: '<span style=\"color:' + (colors[r.state] || r.defaultColor + '') + '\">'",
    "status: 'literal + lookup || fallback + text'",
    "status: /a\\|\\|b/.test(r.name) || r.first + r.last",
    "title: 'a,b:(' + r.last, status: r.note /* + fake */ || r.base + 1",
  ])('allows valid expressions: %s', (properties) => {
    const spec = table(properties);
    expect(result(spec)).toEqual({ errors: [], warnings: [] });
    expect(lintComponents([spec]).errors.filter((e) => e.includes('projection renders broken markup'))).toEqual([]);
  });

  it.each(['.map', '.map ', '["map"]', '?.map'])('blocks statically broken HTML through %s', (map) => {
    const spec = table("status: '<span style=\"color:' + {ok:'red'}['ok'] || 'blue' + '\">' + r.state + '</span>'", map);
    expect(result(spec).errors).toHaveLength(1);
    expect(lintComponents([spec]).errors).toContain(result(spec).errors[0]);
  });

  it('recognizes split literals, quoted keys, and > inside an attribute', () => {
    const spec = table("'status': '<' + 'span title=\"a > b\" style=\"color:' + 'red' || 'blue' + '\">'");
    expect(result(spec).errors[0]).toContain('column "status"');
  });

  it('finds broken literal HTML in conditional branches', () => {
    expect(result(table("status: r.active ? '<span style=\"color:' + 'red' || 'blue' + '\">' : '<span>Inactive</span>'")).errors).toHaveLength(1);
  });

  it.each([
    "status: '<span style=\"color:' + colors[r.state] || 'red' + '\">'",
    "status: '<span style=\"color:rgb(' + colors[r.state] || '0,0,0' + ')\">'",
    "status: '<span style=\"color:' + {'Open':'red'}[r.state] || 'blue' + '\">'",
    "status: '<span style=\"color:' + unknown() || 'blue' + '\">'",
    "status: '<span style=\"color:' + ({get ok(){throw new Error('must not execute')}}).ok || 'blue' + '\">'",
    "status: '<span style=\"color:' + ({__proto__:r.palette}).ok || 'blue' + '\">'",
  ])('warns, rather than blocking, when runtime values are unknown: %s', (properties) => {
    const spec = table(properties);
    expect(result(spec).errors).toEqual([]);
    expect(result(spec).warnings).toHaveLength(1);
    expect(lintComponents([spec]).warnings).toContain(result(spec).warnings[0]);
  });

  it('does not assume generated values are HTML when column rendering is not known', () => {
    expect(result(table("status: '<span ' + 'title=' || 'other' + '>'", '.map', 'string')).errors).toEqual([]);
  });

  it('keeps reports local to the correct property and deduplicates chained fallbacks', () => {
    const spec = table("title:r.first + r.last, status:'<span ' + 'title=' || 'blue' + ';color:' || 'red' + '>', score:r.score || r.base + 1");
    expect(result(spec).errors).toHaveLength(1);
    expect(result(spec).errors[0]).toContain('column "status"');
    expect(result(spec).warnings).toEqual([]);
  });

  it('does not execute bindings or inspect strings pretending to be map calls', () => {
    const spec = table("status: '<span ' + (() => { globalThis.__projectionProbe = true; return 'x'; })() || 'y' + '>'");
    const state = globalThis as any;
    delete state.__projectionProbe;
    expect(result(spec).errors).toEqual([]);
    expect(state.__projectionProbe).toBeUndefined();
    expect(result({ type:'Table', properties:{data:{value:"{{'rows.map(r => ({status: a + b || c + d}))'}}"}} })).toEqual({errors:[],warnings:[]});
  });

  it('leaves parse errors to the syntax validator', () => {
    expect(result({ type:'Table', properties:{data:{value:'{{rows.map(}}'}} })).toEqual({errors:[],warnings:[]});
  });

  it('does not block intermediate values that a later projection can replace', () => {
    const spec = table("status:'<span ' + r.title || 'x' + '>'");
    spec.properties!.data = { value: "{{queries.rows.data.map(r => ({status:'<span ' + 'title=' || 'x' + '>'})).map(r => ({status:'<span ' + r.title || 'x' + '>'}))}}" };
    expect(result(spec).errors).toEqual([]);
    expect(result(spec).warnings).toHaveLength(1);
  });

  it('uses the last duplicate property, not the overwritten value', () => {
    expect(result(table("status:'<span title=' || 'x>', status:'<span>Ready</span>'")))
      .toEqual({errors:[], warnings:[]});
    expect(result(table("status:'<span>Ready</span>', status:'<span title=' || 'x>'")).errors).toHaveLength(1);
  });

  it('does not block a value that a later spread can override', () => {
    expect(result(table("status:'<span title=' || 'x>', ...r")).errors).toEqual([]);
    expect(result(table("...r, status:'<span title=' || 'x>'")).errors).toHaveLength(1);
  });

  it('warns on a replaced intermediate map but still blocks a broken final map', () => {
    const spec = table("status:'<span>Ready</span>'");
    spec.properties!.data = {value:"{{rows.map(r => ({status:'<span title=' || 'x>'})).map(r => ({status:'<span>Ready</span>'}))}}"};
    expect(result(spec).errors).toEqual([]);
    spec.properties!.data = {value:"{{rows.map(r => ({status:'<span>Ready</span>'})).map(r => ({status:'<span title=' || 'x>'}))}}"};
    expect(result(spec).errors).toHaveLength(1);
  });
});
