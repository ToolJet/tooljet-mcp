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
