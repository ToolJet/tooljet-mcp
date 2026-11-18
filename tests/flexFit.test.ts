import { describe, expect, it } from 'vitest';
import { polishFlexRows } from '../src/flexPolish.js';
import { fitFlexHeights } from '../src/flexFit.js';
import type { ComponentSpec } from '../src/tooljetClient.js';

// The editor draws a FlexContainer at its saved height; the app fits a card, and a UI 2.0 row, to its content. A row
// left at ToolJet's 300px default around a stat and a line of text showed 150px of empty space in the editor only, and
// the next section started that much lower there (2026-10-22). Saved height = content + padding x 2 + 6px (box padding
// and border) + the card header.
const CHROME = 6;
const flex = (ref: string, properties: Record<string, unknown>, layout: Partial<NonNullable<ComponentSpec['layout']>>, parentRef?: string): ComponentSpec => ({
  name: ref,
  type: 'FlexContainer',
  clientRef: ref,
  ...(parentRef ? { parentRef } : {}),
  properties: Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, { value: v }])),
  layout: { top: 0, left: 0, width: 20, height: 300, ...layout },
});
const leaf = (ref: string, type: string, parentRef: string | undefined, height: number, extra: Record<string, unknown> = {}, properties: Record<string, unknown> = {}): ComponentSpec => ({
  name: ref,
  type,
  clientRef: ref,
  ...(parentRef ? { parentRef } : {}),
  properties: Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, { value: v }])),
  layout: { top: 0, left: 0, width: 10, height, ...extra },
});
const fit = (components: ComponentSpec[]) => {
  const warnings: string[] = [];
  const fitted = fitFlexHeights(components, warnings);
  return { components, warnings, fitted };
};
const h = (components: ComponentSpec[], ref: string) => components.find((c) => c.clientRef === ref)!.layout!.height;
const top = (components: ComponentSpec[], ref: string) => components.find((c) => c.clientRef === ref)!.layout!.top;

describe('fitFlexHeights: a row', () => {
  it('drawn at the 300px default is saved at its tallest child, and the section below moves up with it', () => {
    const { components, warnings } = fit([
      flex('row', { direction: 'row', layoutVersion: '2', padding: 12 }, { top: 140 }),
      leaf('stat', 'ShadStat', 'row', 120),
      leaf('note', 'ShadText', 'row', 32),
      leaf('after', 'ShadText', undefined, 32, { top: 460 }),
      leaf('beside', 'ShadText', undefined, 32, { top: 200, left: 22 }),
    ]);
    expect(h(components, 'row')).toBe(120 + 12 * 2 + CHROME);
    // The old bottom was 440: what started below it moves up by 150; what sits beside the row stays.
    expect(top(components, 'after')).toBe(460 - 150);
    expect(top(components, 'beside')).toBe(200);
    expect(warnings.join(' ')).toMatch(/Row "row" was 300px tall; it is now 150px.*moved up 150px/);
  });

  it('with its catalog defaults: a 12px padding and gap, wrapping, direction row', () => {
    const { components } = fit([flex('row', {}, {}), leaf('a', 'ShadStat', 'row', 120), leaf('b', 'ShadStat', 'row', 100)]);
    expect(h(components, 'row')).toBe(120 + 24 + CHROME);
  });

  it('packs a wrapping page-level row into lines at the minimum widths of its children', () => {
    const tiles = (minWidthPx: number) => fit([
      flex('tiles', { direction: 'row', gap: 16, padding: 0 }, { width: 43 }),
      leaf('a', 'ShadStat', 'tiles', 120, { minWidthPx }),
      leaf('b', 'ShadStat', 'tiles', 130, { minWidthPx }),
      leaf('c', 'ShadStat', 'tiles', 110, { minWidthPx }),
    ]).components;
    // 820px tiles take a line each on a 1100px canvas and on a 1600px one.
    expect(h(tiles(820), 'tiles')).toBe(120 + 16 + 130 + 16 + 110 + CHROME);
    // 500px tiles pack two a line at 1100px and three at 1600px: the height depends on the window, so it stays as drawn.
    expect(h(tiles(500), 'tiles')).toBe(300);
  });

  it('leaves a nested wrapping row whose line packing depends on a width not known here', () => {
    const { components } = fit([
      flex('outer', { direction: 'column', padding: 0 }, {}),
      flex('tiles', { direction: 'row', gap: 16 }, { height: 400 }, 'outer'),
      leaf('a', 'ShadStat', 'tiles', 120, { minWidthPx: 500 }),
      leaf('b', 'ShadStat', 'tiles', 120, { minWidthPx: 500 }),
    ]);
    expect(h(components, 'tiles')).toBe(400);
  });

  it('keeps the height of a row saved before the UI 2.0 layout (the app keeps its drawn height)', () => {
    const { components } = fit([flex('row', { direction: 'row', layoutVersion: '1', dynamicHeight: false }, {}), leaf('a', 'ShadStat', 'row', 120)]);
    expect(h(components, 'row')).toBe(300);
  });

  it('counts no hidden child and no dialog', () => {
    const { components } = fit([
      flex('row', { direction: 'row', padding: 0 }, {}),
      leaf('a', 'ShadText', 'row', 32),
      leaf('gone', 'ShadStat', 'row', 200, {}, { visibility: '{{false}}' }),
      leaf('dlg', 'ShadDialog', 'row', 400),
    ]);
    expect(h(components, 'row')).toBe(32 + CHROME);
  });
});

describe('fitFlexHeights: a column', () => {
  it('sums its children and gaps; a plain column is only raised, as the app keeps its saved height as a floor', () => {
    const tall = fit([flex('col', { direction: 'column', gap: 10, padding: 0 }, { height: 400 }), leaf('a', 'ShadText', 'col', 32), leaf('b', 'ShadText', 'col', 32)]);
    expect(h(tall.components, 'col')).toBe(400);
    expect(tall.warnings).toEqual([]);
    const short = fit([flex('col', { direction: 'column', gap: 10, padding: 0 }, { height: 40 }), leaf('a', 'ShadText', 'col', 32), leaf('b', 'ShadText', 'col', 32)]);
    expect(h(short.components, 'col')).toBe(32 + 10 + 32 + CHROME);
    expect(short.warnings.join(' ')).toMatch(/does not cut its content off/);
  });

  it('leaves a column with dynamic height off at its drawn height', () => {
    const { components } = fit([flex('col', { direction: 'column', dynamicHeight: '{{false}}' }, { height: 40 }), leaf('a', 'ShadText', 'col', 200)]);
    expect(h(components, 'col')).toBe(40);
  });
});

describe('fitFlexHeights: a card', () => {
  it('is saved at its header, padding, content and chrome: 48px for a title, 70px with a description', () => {
    const titled = fit([flex('c', { direction: 'column', cardStyle: 'shadcnCard', cardTitle: 'Notes', padding: 12 }, {}), leaf('t', 'ShadText', 'c', 32)]);
    expect(h(titled.components, 'c')).toBe(48 + 24 + 32 + CHROME);
    const described = fit([flex('c', { direction: 'column', cardStyle: 'shadcnCard', cardTitle: 'Notes', cardExtra: 'This week', padding: 12 }, {}), leaf('t', 'ShadText', 'c', 32)]);
    expect(h(described.components, 'c')).toBe(70 + 24 + 32 + CHROME);
    const bare = fit([flex('c', { direction: 'column', cardStyle: 'shadcnCard', padding: 12 }, {}), leaf('t', 'ShadText', 'c', 32)]);
    expect(h(bare.components, 'c')).toBe(24 + 32 + CHROME);
  });

  it('with no box padding when its padding style is none', () => {
    const c = flex('c', { direction: 'column', cardStyle: 'shadcnCard', padding: 0 }, {});
    c.styles = { padding: { value: 'none' } };
    const { components } = fit([c, leaf('t', 'ShadText', 'c', 32)]);
    expect(h(components, 'c')).toBe(32 + 2);
  });
});

describe('fitFlexHeights: nested containers', () => {
  it('fit from the inside out; the cards of an Equal heights row share its line height', () => {
    const { components } = fit([
      flex('page', { direction: 'column', gap: 20, padding: 0 }, { height: 900 }),
      flex('kpis', { direction: 'row', gap: 16, padding: 0, flexWrap: false }, { height: 300 }, 'page'),
      flex('k1', { direction: 'column', cardStyle: 'shadcnCard', cardTitle: 'Open', padding: 12 }, { height: 300 }, 'kpis'),
      leaf('v1', 'ShadText', 'k1', 32),
      flex('k2', { direction: 'column', cardStyle: 'shadcnCard', cardTitle: 'Late', cardExtra: 'Past due', padding: 12 }, { height: 300 }, 'kpis'),
      leaf('v2', 'ShadText', 'k2', 32),
    ]);
    const k2 = 70 + 24 + 32 + CHROME;
    expect(h(components, 'k2')).toBe(k2);
    expect(h(components, 'k1')).toBe(k2);
    expect(h(components, 'kpis')).toBe(k2 + CHROME);
    // The page column keeps its taller saved height (the app keeps it as a floor).
    expect(h(components, 'page')).toBe(900);
  });

  it('says nothing of a card already at its line height, though its own content is shorter', () => {
    // As compiled pages arrive: a short card saved at the height its row stretches it to.
    const card = (ref: string, height: number) => flex(ref, { direction: 'column', cardStyle: 'shadcnCard', cardTitle: ref, padding: 12 }, { height }, 'tiles');
    const { components, warnings } = fit([
      flex('tiles', { direction: 'row', gap: 16, padding: 0, flexWrap: false }, { height: 116 }),
      card('a', 110),
      leaf('ta', 'ShadText', 'a', 32),
      card('c', 110),
      leaf('tc', 'ShadText', 'c', 28),
    ]);
    expect(h(components, 'c')).toBe(110);
    expect(h(components, 'tiles')).toBe(116);
    expect(warnings).toEqual([]);
  });

  it('leaves cards their own heights when Equal heights is off and the row does not stretch', () => {
    const { components } = fit([
      flex('kpis', { direction: 'row', gap: 16, padding: 0, equalHeights: '{{false}}', alignItems: 'flex-start' }, {}),
      flex('k1', { direction: 'column', cardStyle: 'shadcnCard', padding: 12 }, {}, 'kpis'),
      leaf('v1', 'ShadText', 'k1', 32),
      flex('k2', { direction: 'column', cardStyle: 'shadcnCard', padding: 12 }, {}, 'kpis'),
      leaf('v2', 'ShadText', 'k2', 80),
    ]);
    expect(h(components, 'k1')).toBe(24 + 32 + CHROME);
    expect(h(components, 'k2')).toBe(24 + 80 + CHROME);
    expect(h(components, 'kpis')).toBe(24 + 80 + CHROME + CHROME);
  });
});

describe('polishFlexRows fits the batch', () => {
  it('as add_components and lint_app_spec run it: a card and a row at the 300px default', () => {
    const { components, warnings } = polishFlexRows([
      flex('detail', { direction: 'column', cardStyle: 'shadcnCard', cardTitle: 'Request details' }, { top: 200, width: 15 }),
      leaf('who', 'ShadText', 'detail', 32),
      leaf('what', 'ShadText', 'detail', 32),
      // Not page-wide, so it keeps its 12px padding (a page-wide root gets the 24px page margin).
      flex('fields', { direction: 'row', layoutVersion: '2' }, { top: 520, left: 4, width: 30 }),
      leaf('a', 'ShadInput', 'fields', 64, {}, { label: 'Name' }),
      leaf('b', 'ShadInput', 'fields', 64, {}, { label: 'Email' }),
      leaf('footer', 'ShadText', undefined, 32, { top: 840 }),
    ]);
    const detail = 48 + 24 + 32 + 12 + 32 + CHROME;
    expect(h(components, 'detail')).toBe(detail);
    expect(h(components, 'fields')).toBe(64 + 24 + CHROME);
    // The row started at 520, under the card's old bottom (500): it moved up with the card, and the text under the row
    // moved up with both.
    expect(top(components, 'fields')).toBe(520 - (300 - detail));
    expect(top(components, 'footer')).toBe(840 - (300 - detail) - (300 - (64 + 24 + CHROME)));
    expect(warnings.join(' ')).toMatch(/Card "detail"/);
    expect(warnings.join(' ')).toMatch(/Row "fields"/);
  });

  it('does not equalize a fitted card with a taller one beside it on the grid', () => {
    const { components } = polishFlexRows([
      flex('a', { direction: 'column', cardStyle: 'shadcnCard', padding: 12 }, { top: 120, left: 1, width: 8, height: 200 }),
      leaf('ta', 'ShadText', 'a', 32),
      flex('b', { direction: 'column', cardStyle: 'shadcnCard', padding: 12 }, { top: 120, left: 9, width: 8, height: 200 }),
      leaf('tb', 'ShadText', 'b', 100),
    ]);
    expect(h(components, 'a')).toBe(24 + 32 + CHROME);
    expect(h(components, 'b')).toBe(24 + 100 + CHROME);
  });
});
