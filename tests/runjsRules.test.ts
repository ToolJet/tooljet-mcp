import { describe, expect, it } from 'vitest';
import { validateQueryOptions, runjsSyntaxError, runjsUndeclaredNames } from '../src/queryValidation.js';
import { lintPlannedApp, lintRunjsLoadOrder } from '../src/appSpecLint.js';

describe('JavaScript query rules from round eight (2026-09-12)', () => {
  it('reports a JavaScript query that does not parse', () => {
    expect(runjsSyntaxError("return {data:[], layout:{plot_bgcolor:'rgba(0,0,0,0')}};")).toMatch(/Unexpected|missing|Invalid/);
    expect(runjsSyntaxError('const rows = queries.q.data || []; return { data: rows, layout: {} };')).toBeUndefined();
    expect(runjsSyntaxError('await queries.q.run(); return queries.q.data;')).toBeUndefined();
    const r = validateQueryOptions('runjs', { code: "return {a:'x')}" });
    expect(r.errors.some((e) => e.code === 'runjs_syntax_error')).toBe(true);
  });

  // ds-tower d1: `const actions = ...` parsed here and failed in the viewer ("Identifier 'actions' has already been
  // declared"), emptying a view and three tables. ToolJet passes these names to every RunJS query.
  it('refuses a top-level declaration of a name ToolJet passes the query', () => {
    expect(runjsSyntaxError('const actions = [1, 2];\nreturn actions;')).toMatch(/declares `actions`.*Rename it/);
    expect(runjsSyntaxError('{ const actions = [1, 2]; return actions; }')).toBeUndefined();
    expect(runjsSyntaxError('const rows = queries.q.data; return rows;')).toBeUndefined();
  });

  it('says where a syntax error is: line, column and an excerpt', () => {
    const message = runjsSyntaxError("const rows = queries.q.data || [];\nconst total = rows.reduce((s, r) => s + r.amount, 0;\nreturn total;");
    expect(message).toMatch(/at line 2 column \d+: .*reduce/);
  });

  it('rejects a chart query that reads another query on page load without being chained', () => {
    const spec = {
      queries: [
        { name: 'deals_list', kind: 'tooljetdb', options: { operation: 'list_rows', table_name: 'deals', runOnPageLoad: true } },
        { name: 'pipeline_chart', kind: 'runjs', options: { code: 'return queries.deals_list.data.map(r => r.stage);', runOnPageLoad: true } },
      ],
    } as any;
    const r = lintRunjsLoadOrder(spec);
    expect(r.errors.some((e) => e.includes('"pipeline_chart"') && e.includes('races "deals_list"'))).toBe(true);
    const chained = lintRunjsLoadOrder({ ...spec, lifecycles: [{ queryRef: 'deals_list', refreshQueryRefs: ['pipeline_chart'] }] });
    expect(chained.errors.length).toBe(0);
    expect(chained.warnings.some((w) => w.includes('runs twice'))).toBe(true);
    const off = lintRunjsLoadOrder({ queries: [spec.queries[0], { ...spec.queries[1], options: { ...spec.queries[1].options, runOnPageLoad: false } }] } as any);
    expect(off.errors.length + off.warnings.length).toBe(0);
    const viaEvent = lintRunjsLoadOrder({ ...spec, events: [{ sourceRef: 'deals_list', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'run-query', target_ref: 'pipeline_chart' } }] });
    expect(viaEvent.errors.length).toBe(0);
  });

  it('surfaces the load-order race through lintPlannedApp', () => {
    const r = lintPlannedApp({
      queries: [
        { name: 'deals_list', kind: 'tooljetdb', options: { operation: 'list_rows', table_name: 'deals', runOnPageLoad: true } },
        { name: 'pipeline_chart', kind: 'runjs', options: { code: 'return queries.deals_list.data;', runOnPageLoad: true } },
      ],
      pages: [],
    } as any);
    expect(r.errors.some((e) => e.includes('races "deals_list"'))).toBe(true);
  });
});

// A cinema build (2026-10-04): a view script returned `seatsFigure`, a name it never declared. The query threw a
// ReferenceError on every run and two pages bound to it rendered empty; the syntax check passed it.
describe('names a JavaScript query uses but never declares', () => {
  it('reports one', () => {
    expect(runjsUndeclaredNames('const rows = queries.q.data || [];\nreturn { rows, seats: seatsFigure };')).toEqual(['seatsFigure']);
    const r = validateQueryOptions('runjs', { code: 'const total = 1;\nreturn totl;' });
    expect(r.errors.find((e) => e.code === 'runjs_undeclared_name')?.message).toMatch(/totl/);
  });
  it('accepts declared names, ToolJet\'s own names and JavaScript globals', () => {
    expect(runjsUndeclaredNames(`
      const rows = queries.q.data || [];
      const today = moment().format('YYYY-MM-DD');
      function sum(list, key) { return list.reduce((s, r) => s + Number(r[key] || 0), 0); }
      const byId = Object.fromEntries(rows.map(({ id, ...rest }) => [id, rest]));
      let total = 0; for (const r of rows) { total += sum([r], 'amount'); }
      try { JSON.parse('{}'); } catch (err) { console.log(err.message); }
      const fmt = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
      await actions.setVariable('x', variables.y ?? globals.currentUser.email);
      label: for (const k of Object.keys(byId)) { if (!k) continue label; }
      const o = { today, total, fmt: fmt.format(total), first: _.first(rows), at: Date.now(), page: page.handle, c: constants.X, s: components.t.value };
      return typeof missingButGuarded === 'undefined' ? o : null;
    `)).toEqual([]);
  });
  it('accepts a name declared later in the code or in another block (hoisting is not checked)', () => {
    expect(runjsUndeclaredNames('return helper(1);\nfunction helper(x) { return x; }')).toEqual([]);
    expect(runjsUndeclaredNames('if (true) { var late = 1; }\nreturn late;')).toEqual([]);
  });
  it('accepts parameters and input, which ToolJet passes when a query has parameters or runs in a module', () => {
    expect(runjsUndeclaredNames('return [parameters.id, input.value];')).toEqual([]);
  });
  it('reports each name once, in order', () => {
    expect(runjsUndeclaredNames('return [a, b, a];')).toEqual(['a', 'b']);
  });
});

// A site inspection build (2026-10-04) bound a table to queries.findings.data.filter(r.status === "Open").map(r => ...):
// the filter lost its "r =>", so r is undefined there and the table stayed empty. The later .map(r => ...) declares
// an r of its own, which must not count for the filter: a name is declared only inside the function that declares it.
describe('names are resolved in the function that declares them', () => {
  it('reports a parameter used outside its arrow', () => {
    expect(runjsUndeclaredNames('return rows.filter(r.status === "Open").map(r => r.id);')).toEqual(['rows', 'r']);
  });
  it('accepts parameters, closures, hoisted functions and catch params in scope', () => {
    expect(runjsUndeclaredNames(`
      const rows = [];
      const byId = (id) => rows.find((row) => row.id === id);
      function later() { return helper(); }
      function helper() { const inner = 1; return [inner, byId(1)]; }
      try { later(); } catch (err) { return err.message; }
      return rows.map((r, i) => ({ r, i, f: function named() { return named; } }));
    `)).toEqual([]);
  });
  it('does not let one function see another function\'s locals', () => {
    expect(runjsUndeclaredNames('function a() { const secret = 1; return secret; }\nreturn [a(), secret];')).toEqual(['secret']);
  });
});

describe('a {{ }} binding that reads a name nothing declares', () => {
  it('is reported with the property path and the name', async () => {
    const { lintBindingNames } = await import('../src/queryValidation.js');
    const props = { data: { value: '{{ (queries.findings.data || []).filter(r.status === "Open").map(r => r.id) }}' }, visible: { value: '{{ allJobs.data.length > 0 }}' } };
    const errors = lintBindingNames(props, 'Component "openFindings"');
    expect(errors.join('\n')).toMatch(/openFindings.*data.*`r`/);
    expect(errors.join('\n')).toMatch(/visible.*`allJobs`.*queries\.allJobs/);
  });
  it('accepts ToolJet state, column and list context names, and saved id references', async () => {
    const { lintBindingNames } = await import('../src/queryValidation.js');
    expect(lintBindingNames({
      a: { value: '{{ components.t.selectedRow.id + queries.q.data.length + variables.x + globals.currentUser.email + page.handle }}' },
      b: { value: '{{ rowData.status === "Late" ? cellValue : listItem.name ?? cardData.title }}' },
      c: { value: '{{ components.d883eafc-af1c-4381-bdf1-bb7d5ace80e5.value }}' },
      d: { value: 'plain text with no binding' },
    }, 'x')).toEqual([]);
  });
});

// Codex review (2026-10-04) of the first version of this check: method and constructor parameters were reported as
// undeclared, and a name declared inside one function hid an outer read of it. Kept as regression cases.
describe('scope cases from the Codex review', () => {
  it.each([
    ['object method parameter', 'const f = { twice(x) { return x * 2; } };\nreturn f.twice(4);'],
    ['class constructor parameter and getter', 'class A { constructor(v) { this.v = v; } get double() { return this.v * 2; } }\nreturn new A(2).double;'],
    ['class field arrow', 'class B { add = (a, b) => a + b; }\nreturn new B().add(1, 2);'],
    ['destructured parameter with defaults', 'const h = ({ a = 1, b } = {}) => a + b;\nreturn h({ b: 2 });'],
    ['computed key and getter', 'const k = "a"; const o = { [k]: 1, get v() { return 2; } };\nreturn o.v;'],
  ])('accepts %s', (_label, code) => { expect(runjsUndeclaredNames(code)).toEqual([]); });
  it('does not let a name declared inside one function cover a read outside it', () => {
    expect(runjsUndeclaredNames('function g() { const secret = 1; return secret; }\nreturn secret;')).toEqual(['secret']);
  });
});
