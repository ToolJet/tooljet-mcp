import { describe, expect, it } from 'vitest';
import { lintQueryFedCharts } from '../src/appSpecLint.js';

const chart = (name: string, query: string) => ({ type: 'Chart', name, properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: `{{queries.${query}.data}}` } } });

describe('query-fed charts', () => {
  it('rejects a query that returns bare points', () => {
    const errors = lintQueryFedCharts([chart('Monthly revenue', 'q_monthly_chart')], [
      { name: 'q_monthly_chart', kind: 'runjs', options: { code: "const rows = queries.base.data || []; return rows.map(r => ({x: r.month, y: r.revenue}));" } },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('layout');
    expect(errors[0]).toContain('empty axes');
  });
  it('accepts a query that builds the whole chart object', () => {
    const errors = lintQueryFedCharts([chart('Monthly revenue', 'q_monthly_chart')], [
      { name: 'q_monthly_chart', kind: 'runjs', options: { code: "return { data: [{type:'bar', x, y}], layout: { font: {family:'IBM Plex Sans', size: 12, color: '#6B7280'}, margin: {l:36,r:12,t:8,b:40}, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)' } };" } },
    ]);
    expect(errors).toEqual([]);
  });
  it('ignores charts bound to queries outside the plan', () => {
    expect(lintQueryFedCharts([chart('c', 'existing')], [])).toEqual([]);
  });
});
