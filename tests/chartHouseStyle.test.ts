import { describe, expect, it } from 'vitest';
import { lintChartHouseStyle, lintComponentSpec } from '../src/lint.js';

describe('chart house style', () => {
  it('advises on native chart styling without rejecting it', () => {
    const warnings: string[] = [];
    const r = lintChartHouseStyle({ type: 'Chart', name: 'stageChart', properties: { type: { value: 'bar' }, data: { value: '[]' } } }, warnings);
    expect(r).toEqual([]);
    expect(warnings[0]).toContain('Plotly');
    expect(warnings[0]).toContain('plotFromJson');
  });
  it('advises on explicit theme fonts without enforcing one font', () => {
    const warnings: string[] = [];
    const bare = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: "{{ {data:[{type:'bar',x:[1],y:[2]}], layout:{}} }}" } }, styles: { padding: { value: 16 } } }, warnings);
    expect(bare).toEqual([]);
    expect(warnings[0]).toContain('layout.font');
    const ok = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: "{{ {data:[{type:'bar',x:[1],y:[2]}], layout:{font:{family:'IBM Plex Sans',size:12,color:'#6B7280'}, margin:{l:36,r:12,t:8,b:40}, paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)'}} }}" } }, styles: { padding: { value: 16 } } });
    expect(ok).toEqual([]);
  });
  it('is part of the component spec lint', () => {
    const r = lintComponentSpec({ type: 'Chart', name: 'pieChart', properties: { type: { value: 'pie' } } });
    expect(r.warnings.some((e) => e.includes('rainbow'))).toBe(true);
    expect(r.errors.some((e) => e.includes('rainbow'))).toBe(false);
  });
  it('rejects a static trace that carries no data', () => {
    const desc = JSON.stringify({ data: [{ type: 'bar', marker: { color: '#0369A1' } }], layout: { font: { family: 'IBM Plex Sans', size: 12, color: '#6B7280' }, margin: { l: 40, r: 16, t: 24, b: 40 }, paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF' } });
    const r = lintChartHouseStyle({ type: 'Chart', name: 'metricsChart', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } }, styles: { padding: { value: 16 } } });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('carry no data');
    const good = JSON.stringify({ data: [{ type: 'bar', x: ['a'], y: [1] }], layout: { font: { family: 'IBM Plex Sans', size: 12, color: '#6B7280' }, margin: { l: 40, r: 16, t: 24, b: 40 }, paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF' } });
    expect(lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: good } }, styles: { padding: { value: 16 } } })).toEqual([]);
  });
  it('warns on plot margins without rejecting room deliberately reserved for labels', () => {
    const warnings: string[] = [];
    const desc = "{{ {data:[{type:'bar',x:[1],y:[2]}], layout:{font:{family:'IBM Plex Sans',size:12,color:'#6B7280'}}} }}";
    const unset = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } } }, warnings);
    expect(unset).toEqual([]);
    expect(warnings[0]).toContain('styles.padding is unset');
    const dflt = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } }, styles: { padding: { value: 'default' } } }, warnings);
    expect(dflt).toEqual([]);
    expect(warnings[1]).toContain('"default"');
    const ok = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } }, styles: { padding: { value: 16 } } });
    expect(ok).toEqual([]);
  });
  it('rejects data set to a mapped list of points', () => {
    const bad = "{{JSON.stringify({data:queries.q_sales.data.map(r=>({x:r.sale_month,y:Number(r.sale_amount)})),layout:{font:{family:'Inter',size:12,color:'#64748B'}}})}}";
    const r = lintChartHouseStyle({ type: 'Chart', name: 'd_sales', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: bad } }, styles: { padding: { value: 16 } } });
    expect(r[0]).toContain('list of points');
    const good = "{{JSON.stringify({data:[{type:'bar',x:queries.q_sales.data.map(r=>r.sale_month),y:queries.q_sales.data.map(r=>Number(r.sale_amount)),cliponaxis:false}],layout:{font:{family:'Inter',size:12,color:'#64748B'}}})}}";
    expect(lintChartHouseStyle({ type: 'Chart', name: 'd_sales', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: good } }, styles: { padding: { value: 16 } } })).toEqual([]);
  });

  it('style warnings do not mask malformed data when fonts and padding are omitted', () => {
    const warnings: string[] = [];
    const r = lintChartHouseStyle({
      type: 'Chart', name: 'empty',
      properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: JSON.stringify({data:[{type:'bar'}],layout:{}}) } },
    }, warnings);
    expect(warnings.some(w => w.includes('padding'))).toBe(true);
    expect(warnings.some(w => w.includes('layout.font'))).toBe(true);
    expect(r.some(e => e.includes('carry no data'))).toBe(true);
  });
});
