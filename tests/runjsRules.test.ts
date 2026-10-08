import { describe, expect, it } from 'vitest';
import { validateQueryOptions, runjsSyntaxError } from '../src/queryValidation.js';
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
