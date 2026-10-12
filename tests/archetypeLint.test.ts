import { describe, expect, it } from 'vitest';
import { lintPageArchetype } from '../src/archetypeLint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';

const v = (value: unknown) => ({ value });
const c = (name: string, type: string, parentRef?: string, properties: Record<string, unknown> = {}) => ({
  name,
  clientRef: name,
  type,
  ...(parentRef ? { parentRef } : {}),
  properties: Object.fromEntries(Object.entries(properties).map(([k, x]) => [k, v(x)])),
});

// The hand-built recipe page that scored 8 blind (benchmarks/2026-10-12-direct/plan3.py), reduced to its structure.
const catalogPage = () => [
  c('page', 'FlexContainer', undefined, { direction: 'column' }),
  c('hero', 'ShadHero', 'page', { title: 'Larder', actionLabel: 'Add a recipe', background: 'image' }),
  c('bar', 'FlexContainer', 'page', { direction: 'row' }),
  c('search', 'ShadInput', 'bar', { placeholder: 'Search recipes' }),
  c('course', 'ShadToggleGroup', 'bar'),
  c('grid', 'ShadCardGrid', 'page', { titleField: 'name', imageField: 'image_url' }),
  c('sheet', 'ShadDialog'),
  c('sheetPhoto', 'ShadImage', 'sheet'),
];

describe('lintPageArchetype', () => {
  it('passes the blind-graded catalog page', () => {
    expect(lintPageArchetype('catalog', catalogPage())).toEqual([]);
  });

  it('is silent without an archetype and for other', () => {
    expect(lintPageArchetype(undefined, [c('chart', 'ShadBarChart')])).toEqual([]);
    expect(lintPageArchetype('other', [c('chart', 'ShadBarChart')])).toEqual([]);
  });

  it('names an unknown archetype', () => {
    expect(lintPageArchetype('dashboard', [])[0]).toContain('not one of catalog');
  });

  it('warns when a chart opens a catalog above the grid', () => {
    const page = catalogPage();
    page.splice(2, 0, c('byCourse', 'ShadBarChart', 'page', { yFields: ['count'] }));
    const w = lintPageArchetype('catalog', page);
    expect(w.some((m) => m.includes('chart "byCourse" comes before "grid"'))).toBe(true);
  });

  it('asks a catalog for photos, a filter bar and a detail sheet', () => {
    const page = [c('page', 'FlexContainer'), c('grid', 'ShadCardGrid', 'page', { titleField: 'name' })];
    const w = lintPageArchetype('catalog', page).join('\n');
    expect(w).toContain('no imageField');
    expect(w).toContain('no search or filter bar');
    expect(w).toContain('no detail sheet');
  });

  it('reports a missing main surface', () => {
    expect(lintPageArchetype('register', [c('hero', 'ShadHero')])[0]).toContain('records table');
  });

  it('wants explicit distinct colours on a donut and a two-series chart, not on a single series', () => {
    const page = [
      c('strip', 'ShadSummaryStrip'),
      c('budget', 'ShadStat', undefined, { progress: 40 }),
      c('donut', 'ShadPieChart', undefined, { donut: true }),
      c('trend', 'ShadAreaChart', undefined, { yFields: ['This month', 'Last month'], colors: ['#0F766E', '#0f766e'] }),
      c('single', 'ShadBarChart', undefined, { yFields: ['spent'] }),
    ];
    const w = lintPageArchetype('personal-overview', page).join('\n');
    expect(w).toContain('"donut" draws each slice in the default palette');
    expect(w).toContain('"trend" repeats a colour');
    expect(w).not.toContain('"single"');
    const fixed = page.map((x) =>
      x.name === 'donut' ? c('donut', 'ShadPieChart', undefined, { colors: ['#0F766E', '#14B8A6', '#99F6E4'] }) : x
    );
    expect(lintPageArchetype('personal-overview', fixed).join('\n')).not.toContain('"donut"');
  });

  it('keeps one action in the header', () => {
    const hero = [c('hero', 'ShadHero', undefined, { actionLabel: 'Add', secondaryActionLabel: 'Export' }), ...catalogPage().slice(2)];
    expect(lintPageArchetype('catalog', hero).join('\n')).toContain('two actions');
    const row = [
      c('head', 'FlexContainer', undefined, { direction: 'row' }),
      c('title', 'ShadHeading', 'head', { text: 'Service desk' }),
      c('actions', 'FlexContainer', 'head', { direction: 'row' }),
      c('a', 'ShadButton', 'actions'),
      c('b', 'ShadButton', 'actions'),
      c('strip', 'ShadSummaryStrip'),
      c('attention', 'ShadRecordList'),
    ];
    expect(lintPageArchetype('queue-board', row).join('\n')).toContain('holds 2 buttons');
  });

  it('asks a queue board for its counts strip and a personal overview for progress', () => {
    expect(lintPageArchetype('queue-board', [c('list', 'ShadRecordList')]).join('\n')).toContain('no ShadSummaryStrip');
    expect(lintPageArchetype('personal-overview', [c('strip', 'ShadSummaryStrip')]).join('\n')).toContain('no progress grid');
  });

  it('flags a long component list', () => {
    const page = [c('strip', 'ShadSummaryStrip'), c('list', 'ShadRecordList'), ...Array.from({ length: 40 }, (_, i) => c(`t${i}`, 'ShadText'))];
    expect(lintPageArchetype('queue-board', page).join('\n')).toContain('42 components outside dialogs');
  });

  it('ignores what sits inside a dialog', () => {
    const page = [...catalogPage(), c('sheetChart', 'ShadBarChart', 'sheet', { yFields: ['a'] })];
    expect(lintPageArchetype('catalog', page)).toEqual([]);
  });
});

describe('lintPlannedApp with a page archetype', () => {
  it('reports archetype warnings under the page name', () => {
    const result = lintPlannedApp({
      pages: [
        {
          name: 'Recipes',
          icon: 'IconBook',
          archetype: 'catalog',
          components: [
            {
              name: 'grid',
              clientRef: 'grid',
              type: 'ShadCardGrid',
              properties: { data: v('{{[]}}'), titleField: v('name') },
              layout: { top: 0, left: 0, width: 43, height: 400 },
            },
          ],
        },
      ],
    });
    expect(result.warnings.some((w) => w.startsWith('Page "Recipes": Archetype "catalog": card grid "grid" has no imageField'))).toBe(true);
  });
});
