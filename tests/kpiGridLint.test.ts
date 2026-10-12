import { describe, expect, it } from 'vitest';
import { lintKpiCardGrids } from '../src/kpiGridLint.js';

const grid = (name: string, props: Record<string, string>) => ({
  name,
  type: 'ShadCardGrid',
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { value: v }])),
});

describe('lintKpiCardGrids', () => {
  it('flags a card grid that draws figures (an AC dashboard put values in subtitleField and deltas in badgeField)', () => {
    const w = lintKpiCardGrids([
      grid('dashboardKpis', { titleField: 'label', subtitleField: 'value', badgeField: 'comparison', descriptionField: 'detail' }),
    ]);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('dashboardKpis');
    expect(w[0]).toContain('ShadSummaryStrip');
    expect(w[0]).toContain('ShadStat');
  });

  it('flags a grid named for KPIs even with neutral field names', () => {
    expect(lintKpiCardGrids([grid('kpi_cards', { titleField: 'label', subtitleField: 'metric' })])).toHaveLength(1);
  });

  it('leaves record grids alone (recipes, rooms, products)', () => {
    expect(
      lintKpiCardGrids([
        grid('recipeGrid', { titleField: 'name', subtitleField: 'cuisine', badgeField: 'course', descriptionField: 'note' }),
        grid('roomCards', { titleField: 'room', subtitleField: 'floor', badgeField: 'status' }),
      ])
    ).toEqual([]);
  });
});
