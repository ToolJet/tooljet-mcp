import { describe, expect, it } from 'vitest';
import { unifyChartAccents, lintChartAccents } from '../src/chartAccentLint.js';
import type { ComponentSpec } from '../src/tooljetClient.js';

const chart = (name: string, type: string, properties: Record<string, unknown> = {}, styles: Record<string, unknown> = {}): ComponentSpec =>
  ({ name, type, clientRef: name, properties, styles }) as ComponentSpec;
const colorsOf = (cs: ComponentSpec[], name: string) =>
  ((cs.find((c) => c.name === name)?.properties?.colors as { value?: unknown })?.value);

describe('unifyChartAccents', () => {
  it('gives the odd one-colour chart the page majority accent (two teal charts and a #2563EB one)', () => {
    const input = [
      chart('revenue', 'ShadAreaChart', { colors: { value: ['#0F766E'] } }),
      chart('jobType', 'ShadBarChart', { colors: { value: ['#2563EB'] } }),
      chart('tech', 'ShadBarChart', { colors: { value: ['#0F766E'] } }),
    ];
    const { components, warnings } = unifyChartAccents(input);
    expect(colorsOf(components, 'jobType')).toEqual(['#0F766E']);
    expect(warnings.join(' ')).toContain('jobType');
  });

  it('sets the majority chartColor style on an outlier that uses the style', () => {
    const input = [
      chart('a', 'ShadLineChart', {}, { chartColor: { value: '#0F766E' } }),
      chart('b', 'ShadLineChart', {}, { chartColor: { value: '#0F766E' } }),
      chart('c', 'ShadBarChart', {}, { chartColor: { value: '#2563EB' } }),
    ];
    const { components } = unifyChartAccents(input);
    expect((components[2].styles?.chartColor as { value?: unknown }).value).toBe('#0F766E');
  });

  it('leaves multi-series colours, theme-following charts and a page in one accent alone', () => {
    const multi = [
      chart('a', 'ShadBarChart', { colors: { value: ['#16a34a', '#dc2626'] }, yFields: { value: ['won', 'lost'] } }),
      chart('b', 'ShadBarChart', { colors: { value: ['#2563EB'] } }),
      chart('c', 'ShadAreaChart'),
    ];
    expect(unifyChartAccents(multi).components).toEqual(multi);
    const same = [chart('a', 'ShadBarChart', { colors: { value: ['#0F766E'] } }), chart('b', 'ShadAreaChart', { colors: { value: ['#0f766e'] } })];
    expect(unifyChartAccents(same).warnings).toEqual([]);
  });

  it('the lint now counts a one-colour colors list as the chart accent', () => {
    expect(
      lintChartAccents([
        chart('a', 'ShadBarChart', { colors: { value: ['#0F766E'] } }),
        chart('b', 'ShadBarChart', { colors: { value: ['#2563EB'] } }),
      ]).length
    ).toBe(1);
  });
});
