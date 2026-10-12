import { describe, expect, it } from 'vitest';
import { polishFlexRows } from '../src/flexPolish.js';
import type { ComponentSpec } from '../src/tooljetClient.js';

const row = (ref: string, properties: Record<string, unknown> = {}, extra: Partial<ComponentSpec> = {}): ComponentSpec => ({
  name: ref,
  type: 'FlexContainer',
  clientRef: ref,
  properties: { direction: { value: 'row' }, ...properties },
  ...extra,
});
const child = (ref: string, type: string, parentRef: string, properties: Record<string, unknown> = {}): ComponentSpec => ({
  name: ref,
  type,
  clientRef: ref,
  parentRef,
  properties,
});
const prop = (components: ComponentSpec[], ref: string, key: string) =>
  (components.find((c) => c.clientRef === ref)?.properties?.[key] as { value?: unknown } | undefined)?.value;
const order = (components: ComponentSpec[], parentRef: string) =>
  components.filter((c) => c.parentRef === parentRef).map((c) => c.clientRef);

describe('polishFlexRows: rows of labelled fields', () => {
  it('aligns a badge or button beside labelled fields to the field boxes', () => {
    const input = [
      row('filters', { alignItems: { value: 'center' } }),
      child('base', 'ShadSelect', 'filters', { label: { value: 'Base' } }),
      child('day', 'ShadDatePicker', 'filters', { label: { value: 'Day' } }),
      child('count', 'ShadBadge', 'filters', { text: { value: '300 planned flights' } }),
    ];
    const { components, warnings } = polishFlexRows(input);
    // Bottom-aligned: every field box ends on one line whatever its label or value (baselines differed by 6px between
    // a text input and a select, so their labels and boxes sat at different heights).
    expect(prop(components, 'filters', 'alignItems')).toBe('flex-end');
    expect(warnings.join(' ')).toMatch(/filters/);
  });

  it('bottom-aligns a row of labelled fields only, so a text input and selects share one line', () => {
    // A filter row of a search input and three selects on "last baseline" sat the input 8px below the selects (their
    // last text baselines differ), labels and boxes both (2026-10-12).
    const { components, warnings } = polishFlexRows([
      row('filtersRow', { alignItems: { value: 'last baseline' } }),
      child('search', 'ShadInput', 'filtersRow', { label: { value: 'Search leads' } }),
      child('stage', 'ShadSelect', 'filtersRow', { label: { value: 'Stage' } }),
      child('followups', 'ShadSelect', 'filtersRow', { label: { value: 'Follow-ups' } }),
    ]);
    expect(prop(components, 'filtersRow', 'alignItems')).toBe('flex-end');
    expect(warnings.join(' ')).toMatch(/filtersRow/);
  });

  it('leaves a single labelled field alone', () => {
    const { components } = polishFlexRows([
      row('one', { alignItems: { value: 'center' } }),
      child('search', 'ShadInput', 'one', { label: { value: 'Search' } }),
    ]);
    expect(prop(components, 'one', 'alignItems')).toBe('center');
  });

  it('also fixes a row left at the default alignment', () => {
    const { components } = polishFlexRows([
      row('filters'),
      child('date', 'ShadDatePicker', 'filters', { label: { value: 'Schedule date' } }),
      child('note', 'ShadText', 'filters', { text: { value: '5 confirmed meetings' } }),
      child('refresh', 'ShadButton', 'filters', { text: { value: 'Refresh' } }),
    ]);
    expect(prop(components, 'filters', 'alignItems')).toBe('flex-end');
  });

  it('leaves rows of unlabelled controls, and rows holding containers, alone', () => {
    const unlabelled = polishFlexRows([
      row('bar', { alignItems: { value: 'center' } }),
      child('search', 'ShadInput', 'bar', { label: { value: '' } }),
      child('go', 'ShadButton', 'bar'),
    ]);
    expect(prop(unlabelled.components, 'bar', 'alignItems')).toBe('center');
    expect(unlabelled.warnings).toEqual([]);
    const mixed = polishFlexRows([
      row('mixed', { alignItems: { value: 'center' } }),
      child('field', 'ShadInput', 'mixed', { label: { value: 'Name' } }),
      child('card', 'FlexContainer', 'mixed', { cardStyle: { value: 'shadcnCard' } }),
    ]);
    expect(prop(mixed.components, 'mixed', 'alignItems')).toBe('center');
  });

  it('ignores column containers', () => {
    const { components } = polishFlexRows([
      row('col', { direction: { value: 'column' }, alignItems: { value: 'center' } }),
      child('f', 'ShadInput', 'col', { label: { value: 'Name' } }),
      child('b', 'ShadButton', 'col'),
    ]);
    expect(prop(components, 'col', 'alignItems')).toBe('center');
  });
});

describe('polishFlexRows: rows of cards', () => {
  it('stretches sibling cards to one height', () => {
    const { components, warnings } = polishFlexRows([
      row('content'),
      child('left', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
      child('right', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
    ]);
    expect(prop(components, 'content', 'alignItems')).toBe('stretch');
    expect(warnings.join(' ')).toMatch(/content/);
  });

  it('counts a container with its own background as a card', () => {
    const input = [
      row('content', { alignItems: { value: 'flex-start' } }),
      { ...child('a', 'FlexContainer', 'content'), styles: { backgroundColor: { value: '#ffffff' } } },
      child('b', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
    ];
    expect(prop(polishFlexRows(input).components, 'content', 'alignItems')).toBe('stretch');
  });

  it('stretches even an explicitly centred row of cards (unequal heights side by side read as broken), not a single card', () => {
    const centred = polishFlexRows([
      row('content', { alignItems: { value: 'center' } }),
      child('a', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
      child('b', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
    ]);
    expect(prop(centred.components, 'content', 'alignItems')).toBe('stretch');
    const single = polishFlexRows([row('content'), child('a', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } })]);
    expect(prop(single.components, 'content', 'alignItems')).toBeUndefined();
  });

  it('leaves transparent layout containers alone', () => {
    const { components } = polishFlexRows([
      row('content'),
      child('a', 'FlexContainer', 'content'),
      child('b', 'FlexContainer', 'content'),
    ]);
    expect(prop(components, 'content', 'alignItems')).toBeUndefined();
  });
});

describe('polishFlexRows: header actions', () => {
  it('moves an action placed before the title to after it', () => {
    const input = [
      row('header'),
      child('newBooking', 'ShadButton', 'header', { text: { value: 'New booking' } }),
      child('intro', 'FlexContainer', 'header', { direction: { value: 'column' } }),
      child('title', 'ShadHeading', 'intro', { text: { value: 'Room bookings' } }),
      child('subtitle', 'ShadText', 'intro'),
    ];
    const { components, warnings } = polishFlexRows(input);
    expect(order(components, 'header')).toEqual(['intro', 'newBooking']);
    expect(order(components, 'intro')).toEqual(['title', 'subtitle']);
    expect(warnings.join(' ')).toMatch(/newBooking/);
  });

  it('rewrites an authored child order', () => {
    const { components } = polishFlexRows([
      row('header', { childOrder: { value: ['export', 'title', 'search'] } }),
      child('title', 'ShadHeading', 'header'),
      child('export', 'ShadButton', 'header'),
      child('search', 'ShadInput', 'header'),
    ]);
    expect(prop(components, 'header', 'childOrder')).toEqual(['title', 'search', 'export']);
  });

  it('leaves a header whose actions already follow the title alone', () => {
    const input = [row('header'), child('title', 'ShadHeading', 'header'), child('cta', 'ShadButton', 'header')];
    const { components, warnings } = polishFlexRows(input);
    expect(order(components, 'header')).toEqual(['title', 'cta']);
    expect(warnings).toEqual([]);
  });

  it('keeps every component and never throws on junk', () => {
    const junk = [
      row('r', { alignItems: 42, childOrder: { value: 'nope' } }),
      { name: 'x', type: 'ShadButton', parentRef: 'r', properties: null } as unknown as ComponentSpec,
      child('h', 'ShadHeading', 'r'),
    ];
    expect(() => polishFlexRows(junk)).not.toThrow();
    expect(polishFlexRows(junk).components).toHaveLength(3);
    expect(polishFlexRows([]).components).toEqual([]);
  });
});

describe('polishFlexRows: headings in rows', () => {
  const sized = (c: ComponentSpec, widthPx: number): ComponentSpec => ({
    ...c,
    layout: { top: 0, left: 0, width: 8, height: 34, fillWidth: false, widthPx } as ComponentSpec['layout'],
  });
  const widthOf = (components: ComponentSpec[], ref: string) =>
    (components.find((c) => c.clientRef === ref)?.layout as { widthPx?: number } | undefined)?.widthPx;

  it('widens a fixed-width heading too narrow for one line of its text', () => {
    const { components, warnings } = polishFlexRows([
      row('summary'),
      sized(child('queueHeading', 'ShadHeading', 'summary', { text: { value: 'Ticket queue' }, level: { value: 'h2' } }), 170),
      child('count', 'ShadText', 'summary', { text: { value: '29 tickets' } }),
    ]);
    expect(widthOf(components, 'queueHeading')).toBeGreaterThanOrEqual(200);
    expect(warnings.join(' ')).toMatch(/queueHeading/);
  });

  it('leaves a heading that fits, and one bound to an expression, alone', () => {
    const fits = polishFlexRows([
      row('summary'),
      sized(child('h', 'ShadHeading', 'summary', { text: { value: 'Queue' }, level: { value: 'h4' } }), 170),
      child('c', 'ShadText', 'summary'),
    ]);
    expect(widthOf(fits.components, 'h')).toBe(170);
    const bound = polishFlexRows([
      row('summary'),
      sized(child('h', 'ShadHeading', 'summary', { text: { value: '{{queries.q.data.title}}' }, level: { value: 'h1' } }), 120),
      child('c', 'ShadText', 'summary'),
    ]);
    expect(widthOf(bound.components, 'h')).toBe(120);
  });

  it('puts a heading and its meta text on one baseline', () => {
    const { components } = polishFlexRows([
      row('summary', { alignItems: { value: 'center' } }),
      child('h', 'ShadHeading', 'summary', { text: { value: 'Ticket queue' } }),
      child('meta', 'ShadText', 'summary', { text: { value: '29 tickets · 19 active' } }),
    ]);
    expect(prop(components, 'summary', 'alignItems')).toBe('last baseline');
  });

  it('keeps a heading row with actions centred', () => {
    const { components } = polishFlexRows([
      row('header', { alignItems: { value: 'center' } }),
      child('h', 'ShadHeading', 'header'),
      child('meta', 'ShadText', 'header'),
      child('cta', 'ShadButton', 'header'),
    ]);
    expect(prop(components, 'header', 'alignItems')).toBe('center');
  });
});

describe('polishFlexRows: a plain row fits its tallest child', () => {
  const h = (components: ComponentSpec[], ref: string) => components.find((c) => c.clientRef === ref)?.layout?.height;
  it('raises a button row drawn at its button height (the editor clipped and scrolled the button by 2px)', () => {
    const input = [
      row('actions', { padding: { value: 0 } }, { layout: { top: 0, left: 0, width: 10, height: 40 } }),
      { ...child('newBtn', 'ShadButton', 'actions'), layout: { top: 0, left: 0, width: 6, height: 36 } },
    ];
    const { components, warnings } = polishFlexRows(input);
    expect(h(components, 'actions')).toBe(42);
    expect(warnings.join(' ')).toMatch(/actions/);
  });

  it('counts the row padding and leaves a tall enough row and a card alone', () => {
    const padded = polishFlexRows([
      row('bar', { padding: { value: 8 } }, { layout: { top: 0, left: 0, width: 10, height: 60 } }),
      { ...child('b', 'ShadButton', 'bar'), layout: { top: 0, left: 0, width: 6, height: 36 } },
    ]).components;
    expect(h(padded, 'bar')).toBe(60);
    const card = polishFlexRows([
      row('card', { cardStyle: { value: 'shadcnCard' }, padding: { value: 0 } }, { layout: { top: 0, left: 0, width: 10, height: 30 } }),
      { ...child('b', 'ShadButton', 'card'), layout: { top: 0, left: 0, width: 6, height: 36 } },
    ]).components;
    expect(h(card, 'card')).toBe(30);
  });
});

describe('polishFlexRows: a button in a row keeps its own width', () => {
  it('stops a header button from filling half the row (it drew at the middle of the header)', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      { ...child('title', 'ShadHeading', 'header', { text: { value: 'Bed management' } }), layout: { top: 0, left: 0, width: 20, height: 40, fillWidth: true } },
      { ...child('assign', 'ShadButton', 'header', { text: { value: 'Assign a free bed' } }), layout: { top: 0, left: 0, width: 20, height: 36, fillWidth: true } },
    ];
    const { components, warnings } = polishFlexRows(input as ComponentSpec[]);
    const btn = components.find((c) => c.clientRef === 'assign')!.layout as Record<string, unknown>;
    expect(btn.fillWidth).toBe(false);
    expect(btn.widthPx).toBeGreaterThanOrEqual(150);
    expect((components.find((c) => c.clientRef === 'title')!.layout as Record<string, unknown>).fillWidth).toBe(true);
    expect(warnings.join(' ')).toMatch(/assign/);
  });
});

describe('polishFlexRows: an empty card takes the widget placed beside it', () => {
  it('moves a chart parented to the row into the empty titled card before it (the card drew empty)', () => {
    const input = [
      row('serviceAndBacklog'),
      { ...child('serviceCard', 'FlexContainer', 'serviceAndBacklog', { cardStyle: { value: 'shadcnCard' }, cardTitle: { value: 'Response times' }, direction: { value: 'column' } }) },
      child('serviceTrend', 'ShadAreaChart', 'serviceCard'),
      { ...child('backlogCard', 'FlexContainer', 'serviceAndBacklog', { cardStyle: { value: 'shadcnCard' }, cardTitle: { value: 'Open backlog trend' }, direction: { value: 'column' } }) },
      child('backlogTrend', 'ShadAreaChart', 'serviceAndBacklog'),
    ];
    const { components, warnings } = polishFlexRows(input);
    expect(components.find((c) => c.clientRef === 'backlogTrend')!.parentRef).toBe('backlogCard');
    expect(components.find((c) => c.clientRef === 'serviceTrend')!.parentRef).toBe('serviceCard');
    expect(warnings.join(' ')).toMatch(/backlogTrend/);
  });

  it('leaves a row of plain widgets and a card with content alone', () => {
    const input = [
      row('r'),
      { ...child('card', 'FlexContainer', 'r', { cardStyle: { value: 'shadcnCard' }, cardTitle: { value: 'A' } }) },
      child('inside', 'ShadText', 'card'),
      child('chart', 'ShadBarChart', 'r'),
    ];
    expect(polishFlexRows(input).components.find((c) => c.clientRef === 'chart')!.parentRef).toBe('r');
  });
});

describe('polishFlexRows: a chart in the shorter of two stretched cards fills it', () => {
  const card = (ref: string, parentRef: string) =>
    child(ref, 'FlexContainer', parentRef, { cardStyle: { value: 'shadcnCard' }, direction: { value: 'column' }, gap: { value: 8 } });
  const sized = (c: ComponentSpec, height: number) => ({ ...c, layout: { top: 0, left: 0, width: 10, height } });
  it('grows the chart by the difference so no band is left under it', () => {
    const input = [
      row('row', { alignItems: { value: 'stretch' } }),
      card('trendCard', 'row'),
      sized(child('trend', 'ShadAreaChart', 'trendCard'), 300),
      card('mixCard', 'row'),
      sized(child('donut', 'ShadPieChart', 'mixCard'), 200),
      sized(child('mixTable', 'Table', 'mixCard'), 300),
    ];
    const { components, warnings } = polishFlexRows(input);
    // mixCard content: 200 + 8 + 300 = 508; trendCard: 300. The trend chart grows by 208.
    expect(components.find((c) => c.clientRef === 'trend')!.layout!.height).toBe(508);
    expect(components.find((c) => c.clientRef === 'donut')!.layout!.height).toBe(200);
    expect(warnings.join(' ')).toMatch(/trend/);
  });

  it('leaves a card whose last widget is not a chart, and near-equal cards, alone', () => {
    const input = [
      row('row', { alignItems: { value: 'stretch' } }),
      card('a', 'row'),
      sized(child('t', 'Table', 'a'), 300),
      card('b', 'row'),
      sized(child('c', 'ShadBarChart', 'b'), 290),
    ];
    const { components } = polishFlexRows(input);
    expect(components.find((c) => c.clientRef === 't')!.layout!.height).toBe(300);
    expect(components.find((c) => c.clientRef === 'c')!.layout!.height).toBe(290);
  });
});

describe('polishFlexRows: a header title takes the free space', () => {
  it('lets the title grow so a badge and a button sit together at the right (the badge floated mid-header)', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      { ...child('title', 'ShadHeading', 'header', { text: { value: "Today's appointments" } }), layout: { top: 0, left: 0, width: 20, height: 40, fillWidth: false, widthPx: 400 } },
      { ...child('count', 'ShadBadge', 'header', { text: { value: '3 clinicians' } }), layout: { top: 0, left: 0, width: 4, height: 24 } },
      { ...child('refresh', 'ShadButton', 'header', { text: { value: 'Refresh' } }), layout: { top: 0, left: 0, width: 4, height: 36 } },
    ];
    const { components, warnings } = polishFlexRows(input as ComponentSpec[]);
    expect((components.find((c) => c.clientRef === 'title')!.layout as Record<string, unknown>).fillWidth).toBe(true);
    expect(warnings.join(' ')).toMatch(/header/);
  });

  it('leaves a two-item header alone', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      { ...child('title', 'ShadHeading', 'header', { text: { value: 'Stock' } }), layout: { top: 0, left: 0, width: 20, height: 40, fillWidth: false, widthPx: 300 } },
      { ...child('add', 'ShadButton', 'header', { text: { value: 'Add' } }), layout: { top: 0, left: 0, width: 4, height: 36 } },
    ];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect((components.find((c) => c.clientRef === 'title')!.layout as Record<string, unknown>).fillWidth).toBe(false);
  });
});

describe('polishFlexRows: a table in a narrow card fits its columns', () => {
  const card = (ref: string) =>
    child(ref, 'FlexContainer', 'board', { cardStyle: { value: 'shadcnCard' }, direction: { value: 'column' }, padding: { value: 12 } });
  const table = (ref: string, parent: string, sizes: number[]) =>
    child(ref, 'Table', parent, {
      columns: { value: sizes.map((columnSize, i) => ({ id: `c${i}`, key: `k${i}`, name: `C${i}`, columnSize })) },
    });
  it('scales the columns of a table in a quarter-width card so the last one is not clipped', () => {
    const input = [
      row('board', { gap: { value: 16 } }),
      ...['a', 'b', 'c', 'd'].flatMap((r) => [card(r), table(`${r}T`, r, [100, 140, 160])]),
    ];
    const { components, warnings } = polishFlexRows(input);
    const sizes = ((components.find((c) => c.clientRef === 'aT')!.properties!.columns as { value: { columnSize: number }[] }).value).map((c) => c.columnSize);
    const total = sizes.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThanOrEqual(Math.floor((1280 - 16 * 3) / 4) - 28);
    expect(sizes[2]).toBeGreaterThan(sizes[0]);
    expect(warnings.join(' ')).toMatch(/aT/);
  });

  it('fits a table card beside a chart, to its own width when it sets one', () => {
    const fixedCard = { ...card('t'), layout: { top: 0, left: 0, width: 14, height: 300, fillWidth: false, widthPx: 390 } };
    const input = [
      row('board', { gap: { value: 16 } }),
      child('trend', 'ShadBarChart', 'board'),
      fixedCard as ComponentSpec,
      table('tT', 't', [130, 200, 145, 120, 120, 200]),
    ];
    const { components, warnings } = polishFlexRows(input);
    // Six columns cannot be read in 360px: the build is told to show fewer instead of each being squeezed.
    expect(warnings.join(' ')).toMatch(/tT.*fewer columns/);
    const four = polishFlexRows([
      row('board', { gap: { value: 16 } }),
      child('trend', 'ShadBarChart', 'board'),
      { ...card('t'), layout: { top: 0, left: 0, width: 14, height: 300, fillWidth: false, widthPx: 420 } } as ComponentSpec,
      table('tT', 't', [120, 160, 120, 140]),
    ]).components;
    const sizes = ((four.find((c) => c.clientRef === 'tT')!.properties!.columns as { value: { columnSize: number }[] }).value).map((c) => c.columnSize);
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(420 - 24);
    void components;
  });

  it('leaves a table that already fits, and a lone card, alone', () => {
    const fits = polishFlexRows([row('board'), card('a'), table('aT', 'a', [100, 100]), card('b'), table('bT', 'b', [100])]).components;
    expect(((fits.find((c) => c.clientRef === 'aT')!.properties!.columns as { value: { columnSize: number }[] }).value)[0].columnSize).toBe(100);
  });
});

describe('polishFlexRows: children drawn full-width in a row share it', () => {
  it('makes full-width children fill (five KPI cards each 43 columns wide stacked one per line)', () => {
    const tile = (ref: string) => ({ ...child(ref, 'FlexContainer', 'metrics', { cardStyle: { value: 'shadcnCard' } }), layout: { top: 0, left: 0, width: 43, height: 120, minWidthPx: 185 } });
    const input = [row('metrics', { flexWrap: { value: true } }), tile('a'), tile('b'), tile('c')];
    const { components, warnings } = polishFlexRows(input as ComponentSpec[]);
    for (const ref of ['a', 'b', 'c']) expect((components.find((c) => c.clientRef === ref)!.layout as Record<string, unknown>).fillWidth).toBe(true);
    expect(warnings.join(' ')).toMatch(/metrics/);
  });
  it('leaves narrower children alone', () => {
    const input = [row('r'), { ...child('a', 'ShadBadge', 'r'), layout: { top: 0, left: 0, width: 6, height: 24 } }, { ...child('b', 'ShadBadge', 'r'), layout: { top: 0, left: 0, width: 6, height: 24 } }];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect((components.find((c) => c.clientRef === 'a')!.layout as Record<string, unknown>).fillWidth).toBeUndefined();
  });
});

describe('polishFlexRows: a page root grows with its content', () => {
  it('turns dynamic height on for a top-level container (a gym page root clipped its cards)', () => {
    const input = [{ name: 'pageRoot', type: 'FlexContainer', clientRef: 'pageRoot', properties: { direction: { value: 'column' }, dynamicHeight: { value: false } } }];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect(prop(components, 'pageRoot', 'dynamicHeight')).toBe('{{true}}');
  });
  it('leaves nested containers to their own setting', () => {
    const input = [row('outer'), { ...child('inner', 'FlexContainer', 'outer', { dynamicHeight: { value: false } }) }];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect(prop(components, 'inner', 'dynamicHeight')).toBe(false);
  });
});

describe('polishFlexRows: a button with no fill flag', () => {
  it('keeps its own width (an unset flag fills by default and drew the button mid-header)', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      { ...child('title', 'FlexContainer', 'header', { direction: { value: 'column' } }), layout: { top: 0, left: 0, width: 28, height: 72, fillWidth: true } },
      { ...child('log', 'ShadButton', 'header', { text: { value: 'Log workout' } }), layout: { top: 0, left: 0, width: 6, height: 36, widthPx: 160 } },
    ];
    const btn = polishFlexRows(input as ComponentSpec[]).components.find((c) => c.clientRef === 'log')!.layout as Record<string, unknown>;
    expect(btn.fillWidth).toBe(false);
    expect(btn.widthPx).toBe(160);
  });
});

describe('polishFlexRows: a badge beside a title', () => {
  it('keeps its own width instead of filling (a "3 clinicians" badge floated mid-header)', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      { ...child('title', 'ShadHeading', 'header', { text: { value: "Today's appointments" } }), layout: { top: 0, left: 0, width: 20, height: 40 } },
      { ...child('count', 'ShadBadge', 'header', { text: { value: '3 clinicians' } }), layout: { top: 0, left: 0, width: 4, height: 24 } },
    ];
    const badge = polishFlexRows(input as ComponentSpec[]).components.find((c) => c.clientRef === 'count')!.layout as Record<string, unknown>;
    expect(badge.fillWidth).toBe(false);
    expect(badge.widthPx).toBeGreaterThan(80);
  });
});

describe('polishFlexRows: a header with one item after its title', () => {
  const rect = (c: ComponentSpec | undefined) => (c?.layout ?? {}) as { fillWidth?: boolean; widthPx?: number };
  const withLayout = (c: ComponentSpec): ComponentSpec => ({ ...c, layout: { top: 0, left: 0, width: 20, height: 40 } });

  it('lets the title fill and the actions group keep its own width (the action floated mid-header)', () => {
    const { components } = polishFlexRows([
      row('topBar', { justifyContent: { value: 'space-between' } }),
      withLayout({ ...child('titleBlock', 'FlexContainer', 'topBar', { direction: { value: 'column' } }) }),
      child('pageTitle', 'ShadHeading', 'titleBlock', { text: { value: 'Recipe Book' } }),
      withLayout(row('topActions', { justifyContent: { value: 'flex-end' } }, { parentRef: 'topBar' })),
      withLayout(child('addRecipe', 'ShadButton', 'topActions', { text: { value: 'Add recipe' } })),
    ]);
    expect(rect(components.find((c) => c.clientRef === 'titleBlock')).fillWidth).toBe(true);
    const actions = rect(components.find((c) => c.clientRef === 'topActions'));
    expect(actions.fillWidth).toBe(false);
    expect(actions.widthPx).toBeGreaterThanOrEqual(96);
  });

  it('keeps short meta text beside a heading at its own width', () => {
    const { components } = polishFlexRows([
      row('panelHeader', { justifyContent: { value: 'space-between' } }),
      withLayout(child('panelTitle', 'ShadHeading', 'panelHeader', { text: { value: 'Recipes' } })),
      withLayout(child('count', 'ShadText', 'panelHeader', { text: { value: '{{(queries.r.data || []).length}} saved' } })),
    ]);
    expect(rect(components.find((c) => c.clientRef === 'panelTitle')).fillWidth).toBe(true);
    expect(rect(components.find((c) => c.clientRef === 'count')).fillWidth).toBe(false);
  });

  it('lays a column of buttons beside a title out as a row', () => {
    const { components } = polishFlexRows([
      row('header'),
      withLayout(child('title', 'ShadHeading', 'header', { text: { value: 'Vaccination tracker' } })),
      withLayout({ ...child('buttons', 'FlexContainer', 'header', { direction: { value: 'column' } }) }),
      withLayout(child('addPet', 'ShadButton', 'buttons', { text: { value: 'Add a pet' } })),
      withLayout(child('record', 'ShadButton', 'buttons', { text: { value: 'Record vaccination' } })),
    ]);
    expect(prop(components, 'buttons', 'direction')).toBe('row');
  });
});

describe('polishFlexRows: a row of only buttons placed at its end', () => {
  it('gives its buttons their own width, so they sit at the end', () => {
    const { components } = polishFlexRows([
      row('actions', { justifyContent: { value: 'flex-end' } }),
      { ...child('add', 'ShadButton', 'actions', { text: { value: 'Add recipe' } }), layout: { top: 0, left: 0, width: 9, height: 36 } },
    ]);
    expect((components.find((c) => c.clientRef === 'add')!.layout as Record<string, unknown>).fillWidth).toBe(false);
  });
  it('leaves a plain row of buttons alone', () => {
    const { components } = polishFlexRows([
      row('pair'),
      { ...child('a', 'ShadButton', 'pair', { text: { value: 'One' } }), layout: { top: 0, left: 0, width: 9, height: 36 } },
      { ...child('b', 'ShadButton', 'pair', { text: { value: 'Two' } }), layout: { top: 0, left: 0, width: 9, height: 36 } },
    ]);
    expect((components.find((c) => c.clientRef === 'a')!.layout as Record<string, unknown>).fillWidth).toBeUndefined();
  });
});

describe('polishFlexRows: cards fit their content and share a row height', () => {
  const card = (ref: string, parentRef: string, height: number, extra: Record<string, unknown> = {}) =>
    ({
      ...child(ref, 'FlexContainer', parentRef, { cardStyle: { value: 'shadcnCard' }, direction: { value: 'column' }, padding: { value: 20 }, gap: { value: 6 }, ...extra }),
      layout: { top: 0, left: 0, width: 10, height },
    }) as ComponentSpec;
  const leaf = (ref: string, type: string, parentRef: string, height: number) =>
    ({ ...child(ref, type, parentRef), layout: { top: 0, left: 0, width: 10, height } }) as ComponentSpec;
  const h = (components: ComponentSpec[], ref: string) => components.find((c) => c.clientRef === ref)!.layout!.height;

  it('trims a card drawn taller than its content (85px empty under a KPI figure)', () => {
    const { components, warnings } = polishFlexRows([
      row('kpis', { gap: { value: 16 } }),
      card('today', 'kpis', 170),
      leaf('todayLabel', 'ShadText', 'today', 26),
      leaf('todayValue', 'ShadHeading', 'today', 56),
    ]);
    // 26 + 6 + 56 content, 20px padding each side, 6px chrome
    expect(h(components, 'today')).toBe(134);
    expect(warnings.join(' ')).toMatch(/today/);
  });

  it('keeps a card that fits, a card with unmeasured children, and a card title band', () => {
    const fits = polishFlexRows([row('r'), card('a', 'r', 140), leaf('x', 'ShadText', 'a', 26), leaf('y', 'ShadHeading', 'a', 56)]);
    expect(h(fits.components, 'a')).toBe(140);
    const titled = polishFlexRows([row('r'), card('a', 'r', 200, { cardTitle: { value: 'Revenue' }, cardExtra: { value: 'This week' } }), leaf('y', 'ShadHeading', 'a', 56)]);
    // 56 content + 40 padding + 6 chrome + 70 title band
    expect(h(titled.components, 'a')).toBe(172);
  });

  it('stretches a row of cards to one height whatever alignment the build gave it', () => {
    const { components } = polishFlexRows([
      row('kpis', { alignItems: { value: 'center' } }),
      card('a', 'kpis', 120),
      card('b', 'kpis', 140),
    ]);
    expect(prop(components, 'kpis', 'alignItems')).toBe('stretch');
  });
});

describe('polishFlexRows: a side sheet holding a row of fields', () => {
  it('opens at the wide sheet size, so two fields side by side fit (480px cut the right column off)', () => {
    const sheet = { name: 'newLeadDialog', type: 'ShadDialog', clientRef: 'sheet', properties: { variant: { value: 'sheet' }, size: { value: 'lg' } } } as ComponentSpec;
    const form = { ...child('form', 'FlexContainer', 'sheet', { direction: { value: 'column' } }) } as ComponentSpec;
    const { components, warnings } = polishFlexRows([
      sheet,
      form,
      row('pair', {}, { parentRef: 'form' }),
      child('name', 'ShadInput', 'pair', { label: { value: 'Name' } }),
      child('company', 'ShadInput', 'pair', { label: { value: 'Company' } }),
    ]);
    expect(prop(components, 'sheet', 'size')).toBe('xl');
    expect(warnings.join(' ')).toMatch(/newLeadDialog/);
  });
  it('leaves a centred dialog and a sheet of single fields alone', () => {
    const dialog = { name: 'd', type: 'ShadDialog', clientRef: 'd', properties: { variant: { value: 'dialog' }, size: { value: 'lg' } } } as ComponentSpec;
    const single = { name: 's', type: 'ShadDialog', clientRef: 's', properties: { variant: { value: 'sheet' }, size: { value: 'lg' } } } as ComponentSpec;
    const { components } = polishFlexRows([
      dialog, row('pair', {}, { parentRef: 'd' }), child('a', 'ShadInput', 'pair', { label: { value: 'A' } }), child('b', 'ShadInput', 'pair', { label: { value: 'B' } }),
      single, child('c', 'ShadInput', 's', { label: { value: 'C' } }),
    ]);
    expect(prop(components, 'd', 'size')).toBe('lg');
    expect(prop(components, 's', 'size')).toBe('lg');
  });
});

describe('polishFlexRows: cards side by side on the page grid', () => {
  it('gives cards that share a top on the grid one height (200 and 124px KPI cards side by side)', () => {
    const tile = (ref: string, left: number, height: number) =>
      ({ name: ref, type: 'FlexContainer', clientRef: ref, properties: { cardStyle: { value: 'shadcnCard' } }, layout: { top: 120, left, width: 8, height } }) as ComponentSpec;
    const { components, warnings } = polishFlexRows([tile('a', 1, 200), tile('b', 9, 124), tile('c', 17, 200), tile('far', 1, 90)].map((c, i) => (i === 3 ? { ...c, layout: { ...c.layout!, top: 600 } } : c)));
    const h = (ref: string) => components.find((c) => c.clientRef === ref)!.layout!.height;
    expect([h('a'), h('b'), h('c')]).toEqual([200, 200, 200]);
    expect(h('far')).toBe(90);
    expect(warnings.join(' ')).toMatch(/one height/);
  });
});

describe('polishFlexRows: no empty band at the top of the page', () => {
  const at = (c: ComponentSpec, top: number, height: number): ComponentSpec => ({ ...c, layout: { top, left: 0, width: 43, height } });
  it('takes dialogs out of a container that holds only them, and lifts the page into the space it left', () => {
    const { components, warnings } = polishFlexRows([
      at({ name: 'modalsHost', type: 'FlexContainer', clientRef: 'modalsHost', properties: {} } as ComponentSpec, 10, 80),
      at({ name: 'recipeDialog', type: 'ShadDialog', clientRef: 'recipeDialog', parentRef: 'modalsHost', properties: {} } as ComponentSpec, 0, 60),
      at({ name: 'title', type: 'ShadHeading', clientRef: 'title', parentRef: 'recipeDialog', slotName: 'header', properties: {} } as ComponentSpec, 12, 32),
      at({ name: 'homeRoot', type: 'FlexContainer', clientRef: 'homeRoot', properties: { direction: { value: 'column' } } } as ComponentSpec, 110, 1500),
    ]);
    expect(components.find((c) => c.clientRef === 'modalsHost')).toBeUndefined();
    expect(components.find((c) => c.clientRef === 'recipeDialog')!.parentRef).toBeUndefined();
    expect(components.find((c) => c.clientRef === 'title')!.parentRef).toBe('recipeDialog');
    expect(components.find((c) => c.clientRef === 'homeRoot')!.layout!.top).toBeLessThanOrEqual(10);
    expect(warnings.join(' ')).toMatch(/modalsHost/);
  });
  it('leaves a page that starts at the top, and a container that holds more than dialogs', () => {
    const { components } = polishFlexRows([
      at({ name: 'host', type: 'FlexContainer', clientRef: 'host', properties: {} } as ComponentSpec, 0, 80),
      at({ name: 'd', type: 'ShadDialog', clientRef: 'd', parentRef: 'host', properties: {} } as ComponentSpec, 0, 60),
      at({ name: 'note', type: 'ShadText', clientRef: 'note', parentRef: 'host', properties: {} } as ComponentSpec, 0, 24),
    ]);
    expect(components.find((c) => c.clientRef === 'host')).toBeDefined();
    expect(components.find((c) => c.clientRef === 'host')!.layout!.top).toBe(0);
  });
});

describe('polishFlexRows: header buttons stay on one line', () => {
  it('turns wrapping off for a group of buttons beside a title (the second button wrapped and was clipped to a strip)', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      child('title', 'ShadHeading', 'header', { text: { value: "Today's dispatch" } }),
      row('actions', { justifyContent: { value: 'flex-end' } }, { parentRef: 'header' }),
      child('addCustomer', 'ShadButton', 'actions', { text: { value: 'Add customer' } }),
      child('bookJob', 'ShadButton', 'actions', { text: { value: 'Book a job' } }),
    ];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect(prop(components, 'actions', 'flexWrap')).toBe('{{false}}');
  });

  it('leaves a row of cards free to wrap', () => {
    const input = [
      row('header', { justifyContent: { value: 'space-between' } }),
      child('title', 'ShadHeading', 'header', { text: { value: 'Rooms' } }),
      row('cards', {}, { parentRef: 'header' }),
      child('a', 'ShadCard', 'cards'),
      child('b', 'ShadCard', 'cards'),
    ];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect(prop(components, 'cards', 'flexWrap')).toBeUndefined();
  });
});

describe('polishFlexRows: a labelled field beside a button in a header', () => {
  it('bottom-aligns the row so the button lines up with the field box (a header with a title block left it 20px high)', () => {
    const input = [
      row('pageHeader', { alignItems: { value: 'center' }, justifyContent: { value: 'space-between' } }),
      row('titleStack', { direction: { value: 'column' } }, { parentRef: 'pageHeader' }),
      child('pageTitle', 'ShadHeading', 'titleStack', { text: { value: 'Room bookings' } }),
      child('dayFilter', 'ShadDatePicker', 'pageHeader', { label: { value: 'Schedule date' } }),
      child('newBooking', 'ShadButton', 'pageHeader', { text: { value: 'Reserve a room' } }),
    ];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect(prop(components, 'pageHeader', 'alignItems')).toBe('flex-end');
  });

  it('leaves a header with only a title and buttons centred', () => {
    const input = [
      row('header', { alignItems: { value: 'center' }, justifyContent: { value: 'space-between' } }),
      child('title', 'ShadHeading', 'header', { text: { value: 'Rooms' } }),
      child('add', 'ShadButton', 'header', { text: { value: 'Add room' } }),
    ];
    const { components } = polishFlexRows(input as ComponentSpec[]);
    expect(prop(components, 'header', 'alignItems')).toBe('center');
  });
});

describe('polishFlexRows: a header action group with a status line', () => {
  const rect = (c: ComponentSpec | undefined) => (c?.layout ?? {}) as { fillWidth?: boolean; widthPx?: number };
  const withLayout = (c: ComponentSpec): ComponentSpec => ({ ...c, layout: { top: 0, left: 0, width: 43, height: 40, fillWidth: true } as ComponentSpec['layout'] });

  // To-do build (2026-10-12): "21 active · 7 finished" and "New task" sat in an actions group that filled half the header,
  // and the status line, filling the group, started mid-page. Blind review: "the summary text floats mid-header".
  it('keeps the group and its status line at their own widths, so both sit at the right beside the action', () => {
    const { components, warnings } = polishFlexRows([
      row('topBar', { justifyContent: { value: 'space-between' } }),
      withLayout({ ...child('welcome', 'FlexContainer', 'topBar', { direction: { value: 'column' } }) }),
      child('welcomeTitle', 'ShadHeading', 'welcome', { text: { value: 'A little progress, every day.' } }),
      withLayout(row('topBarActions', { justifyContent: { value: 'flex-end' } }, { parentRef: 'topBar' })),
      withLayout(child('statusSummary', 'ShadText', 'topBarActions', { text: { value: "{{rows.filter(r => r.open).length + ' active · ' + done + ' finished'}}" } })),
      withLayout(child('newTask', 'ShadButton', 'topBarActions', { text: { value: 'New task' } })),
    ]);
    const group = rect(components.find((c) => c.clientRef === 'topBarActions'));
    expect(group.fillWidth).toBe(false);
    expect(group.widthPx).toBeGreaterThan(200);
    const status = rect(components.find((c) => c.clientRef === 'statusSummary'));
    expect(status.fillWidth).toBe(false);
    expect(status.widthPx).toBeGreaterThan(40);
    const statusSpec = components.find((c) => c.clientRef === 'statusSummary')!;
    expect((statusSpec.styles?.textAlign as { value?: string } | undefined)?.value).toBe('right');
    expect(rect(components.find((c) => c.clientRef === 'welcome')).fillWidth).toBe(true);
    expect(warnings.join(' ')).toMatch(/topBarActions/);
  });

  it('leaves a group of long prose alone', () => {
    const long = 'A long explanation of what this page is for and how the numbers on it are worked out each week.';
    const { components } = polishFlexRows([
      row('topBar', { justifyContent: { value: 'space-between' } }),
      withLayout(child('title', 'ShadHeading', 'topBar', { text: { value: 'Ledger' } })),
      withLayout(row('aside', {}, { parentRef: 'topBar' })),
      withLayout(child('note', 'ShadText', 'aside', { text: { value: long } })),
      withLayout(child('go', 'ShadButton', 'aside', { text: { value: 'Go' } })),
    ]);
    expect(rect(components.find((c) => c.clientRef === 'aside')).fillWidth).toBe(true);
  });
});

describe('polishFlexRows: a card titled twice', () => {
  // To-do build (2026-10-12): a card titled "Your tasks / Keep the next step in view" opened with a heading "The list" and
  // its own caption. Blind review: "the doubled section headers nest a card in a card".
  it('warns when a titled card opens with a heading of its own', () => {
    const { warnings } = polishFlexRows([
      { ...child('tasksPanel', 'FlexContainer', '', { direction: { value: 'column' }, cardStyle: { value: 'shadcnCard' }, cardTitle: { value: 'Your tasks' } }), parentRef: undefined },
      { ...child('toolbar', 'FlexContainer', 'tasksPanel', { direction: { value: 'row' } }) },
      { ...child('intro', 'FlexContainer', 'toolbar', { direction: { value: 'column' } }) },
      child('heading', 'ShadHeading', 'intro', { text: { value: 'The list' } }),
      child('grid', 'ShadCardGrid', 'tasksPanel'),
    ]);
    expect(warnings.join(' ')).toMatch(/"tasksPanel".*"Your tasks".*"The list"/);
  });

  it('says nothing for an untitled card, or a heading further down the card', () => {
    const untitled = polishFlexRows([
      { ...child('panel', 'FlexContainer', '', { direction: { value: 'column' }, cardStyle: { value: 'shadcnCard' } }), parentRef: undefined },
      child('heading', 'ShadHeading', 'panel', { text: { value: 'The list' } }),
    ]).warnings;
    const later = polishFlexRows([
      { ...child('panel', 'FlexContainer', '', { direction: { value: 'column' }, cardStyle: { value: 'shadcnCard' }, cardTitle: { value: 'Tasks' } }), parentRef: undefined },
      child('grid', 'ShadCardGrid', 'panel'),
      child('heading', 'ShadHeading', 'panel', { text: { value: 'Archive' } }),
    ]).warnings;
    expect([...untitled, ...later].join(' ')).not.toMatch(/titled twice|already titled/);
  });
});

describe('polishFlexRows: a bound count beside a heading', () => {
  // Recipe build (2026-10-12): "{{queries.getRecipes.data.length + ' recipes in your book'}}" was measured as four
  // characters, kept at 56px, and wrapped into a narrow column. Blind review: "squeezed into a narrow wrapping column".
  it('is as wide as the words quoted in the binding', () => {
    const { components } = polishFlexRows([
      row('collectionRow', { justifyContent: { value: 'space-between' } }),
      { ...child('heading', 'ShadHeading', 'collectionRow', { text: { value: 'Your recipes' } }), layout: { top: 0, left: 0, width: 20, height: 40 } },
      { ...child('count', 'ShadText', 'collectionRow', { text: { value: "{{queries.getRecipes.data.length + ' recipes in your book'}}" } }), layout: { top: 0, left: 0, width: 20, height: 30 } },
    ]);
    const rect = components.find((c) => c.clientRef === 'count')!.layout as { widthPx?: number };
    expect(rect.widthPx).toBeGreaterThanOrEqual(' recipes in your book'.length * 7);
  });
});
