import { describe, expect, it } from 'vitest';
import { lintChartHouseStyle, lintComponentSpec } from '../src/lint.js';

describe('chart house style', () => {
  it('rejects a native chart', () => {
    const r = lintChartHouseStyle({ type: 'Chart', name: 'stageChart', properties: { type: { value: 'bar' }, data: { value: '[]' } } });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('Plotly');
    expect(r[0]).toContain('plotFromJson');
  });
  it('requires the house layout keys in jsonDescription', () => {
    const bare = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: "{{ {data:[{type:'bar',x:[1],y:[2]}], layout:{}} }}" } }, styles: { padding: { value: 16 } } });
    expect(bare[0]).toContain('layout.font');
    const ok = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: "{{ {data:[{type:'bar',x:[1],y:[2]}], layout:{font:{family:'IBM Plex Sans',size:12,color:'#6B7280'}, margin:{l:36,r:12,t:8,b:40}, paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'rgba(0,0,0,0)'}} }}" } }, styles: { padding: { value: 16 } } });
    expect(ok).toEqual([]);
  });
  it('is part of the component spec lint', () => {
    const r = lintComponentSpec({ type: 'Chart', name: 'pieChart', properties: { type: { value: 'pie' } } });
    expect(r.errors.some((e) => e.includes('rainbow'))).toBe(true);
  });
  it('rejects a static trace that carries no data', () => {
    const desc = JSON.stringify({ data: [{ type: 'bar', marker: { color: '#0369A1' } }], layout: { font: { family: 'IBM Plex Sans', size: 12, color: '#6B7280' }, margin: { l: 40, r: 16, t: 24, b: 40 }, paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF' } });
    const r = lintChartHouseStyle({ type: 'Chart', name: 'metricsChart', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } }, styles: { padding: { value: 16 } } });
    expect(r).toHaveLength(1);
    expect(r[0]).toContain('carry no data');
    const good = JSON.stringify({ data: [{ type: 'bar', x: ['a'], y: [1] }], layout: { font: { family: 'IBM Plex Sans', size: 12, color: '#6B7280' }, margin: { l: 40, r: 16, t: 24, b: 40 }, paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF' } });
    expect(lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: good } }, styles: { padding: { value: 16 } } })).toEqual([]);
  });
  it('requires a small styles.padding because the wrapper uses it as the Plotly margin', () => {
    const desc = "{{ {data:[{type:'bar',x:[1],y:[2]}], layout:{font:{family:'IBM Plex Sans',size:12,color:'#6B7280'}}} }}";
    const unset = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } } });
    expect(unset[0]).toContain('styles.padding is unset');
    const dflt = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } }, styles: { padding: { value: 'default' } } });
    expect(dflt[0]).toContain('"default"');
    const ok = lintChartHouseStyle({ type: 'Chart', name: 'c', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: desc } }, styles: { padding: { value: 16 } } });
    expect(ok).toEqual([]);
  });
});
