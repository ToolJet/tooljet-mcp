import { describe, expect, it } from 'vitest';
import { lintPlannedApp } from '../src/appSpecLint.js';

const chart = (dataBinding: string) => ({
  client_ref: 'p', name: 'Overview', icon: 'IconHome2',
  components: [{ client_ref: 'c', name: 'ovChartVersion', type: 'Chart',
    properties: { type: { value: 'bar' }, data: { value: dataBinding } },
    layouts: { desktop: { top: 0, left: 0, width: 20, height: 10 } } }],
} as any);

describe('chart numeric binding', () => {
  it('warns on an uncast COUNT(*) aggregate (the live BigQuery blank-chart case)', () => {
    const r = lintPlannedApp({
      queries: [{ name: 'version_breakdown', kind: 'bigquery', datasourceId: 'd',
        options: { query: 'SELECT installed_version, COUNT(*) AS cnt FROM `t.subscribers` GROUP BY installed_version LIMIT 50' } }],
      pages: [chart('{{queries.version_breakdown.data.map(r => ({x: r.installed_version, y: r.cnt}))}}')],
    } as any);
    expect(r.warnings.some((w) => /renders blank/.test(w))).toBe(true);
  });

  it('stays quiet when the aggregate is cast in SQL', () => {
    const r = lintPlannedApp({
      queries: [{ name: 'q', kind: 'bigquery', datasourceId: 'd',
        options: { query: 'SELECT v, CAST(COUNT(*) AS FLOAT64) AS cnt FROM `t` GROUP BY v LIMIT 50' } }],
      pages: [chart('{{queries.q.data.map(r => ({x: r.v, y: r.cnt}))}}')],
    } as any);
    expect(r.warnings.some((w) => /renders blank/.test(w))).toBe(false);
  });

  it('stays quiet when the binding coerces with Number()', () => {
    const r = lintPlannedApp({
      queries: [{ name: 'q', kind: 'bigquery', datasourceId: 'd',
        options: { query: 'SELECT v, COUNT(*) AS cnt FROM `t` GROUP BY v LIMIT 50' } }],
      pages: [chart('{{queries.q.data.map(r => ({x: r.v, y: Number(r.cnt)}))}}')],
    } as any);
    expect(r.warnings.some((w) => /renders blank/.test(w))).toBe(false);
  });
});
