import { describe, expect, it } from 'vitest';
import { polishFlexRows } from '../src/flexPolish.js';
import { fitPackHeights, reportPackHeights } from '../src/packFit.js';
import type { ComponentSpec } from '../src/tooljetClient.js';

// A planned UI 2.0 widget is saved at the height the app draws it (it fits its content there), as the page compiler saves
// the widgets it places: drawn in the viewer on staging, 2026-10-22, in the default theme.
const w = (name: string, type: string, properties: Record<string, unknown>, layout: Partial<NonNullable<ComponentSpec['layout']>> = {}, parentRef?: string): ComponentSpec => ({
  name,
  type,
  clientRef: name,
  ...(parentRef ? { parentRef } : {}),
  properties: Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, { value: v }])),
  layout: { top: 0, left: 2, width: 20, height: 100, ...layout },
});
const fit = (components: ComponentSpec[]) => {
  const warnings: string[] = [];
  reportPackHeights(fitPackHeights(components), warnings);
  return { components, warnings };
};
const h = (components: ComponentSpec[], name: string) => components.find((c) => c.name === name)!.layout!.height;
const top = (components: ComponentSpec[], name: string) => components.find((c) => c.name === name)!.layout!.top;

describe('fitPackHeights', () => {
  it('saves a stat card at its drawn 124px and moves what sits below it', () => {
    const { components, warnings } = fit([
      w('kpi', 'ShadStat', { label: 'Revenue', value: '{{1250}}' }, { top: 20, height: 120 }),
      w('after', 'ShadText', { text: 'Below' }, { top: 156, height: 32 }),
    ]);
    expect(h(components, 'kpi')).toBe(124);
    expect(top(components, 'after')).toBe(160);
    expect(warnings.join(' ')).toMatch(/ShadStat "kpi" was 120px tall; it is now 124px.*moved down 4px/);
  });

  it('reads the parts a stat shows, and the catalog default of what the plan leaves unset', () => {
    const { components } = fit([
      w('a', 'ShadStat', { label: 'Budget', value: '{{60}}', progress: '{{60}}', progressLabel: '60% used' }, { height: 150 }),
      w('b', 'ShadStat', { label: 'Revenue', value: '{{1}}', footnote: 'Updated', trendData: '{{[1,3,2]}}' }, { top: 300, height: 134 }),
      w('c', 'ShadStat', { label: 'Revenue', value: '{{1}}', card: '{{false}}' }, { top: 600, height: 120 }),
    ]);
    expect([h(components, 'a'), h(components, 'b'), h(components, 'c')]).toEqual([160, 196, 82]);
  });

  it('sizes fields by their label and description, headings by level, alerts by their parts', () => {
    const { components } = fit([
      w('in', 'ShadInput', { label: 'Name' }, { height: 64 }),
      w('bare', 'ShadSelect', { label: '' }, { top: 100, height: 64 }),
      w('desc', 'ShadInput', { label: 'Email', description: 'Never shared.' }, { top: 200, height: 64 }),
      w('h1', 'ShadHeading', { text: 'Orders', level: 'h1' }, { top: 300, height: 36 }),
      w('al', 'ShadAlert', { title: 'Heads up', description: 'Check the totals.', actionLabel: 'Fix' }, { top: 400, height: 60 }),
    ]);
    expect(['in', 'bare', 'desc', 'h1', 'al'].map((n) => h(components, n))).toEqual([62, 40, 88, 44, 120]);
  });

  it('counts the items of a list written out in the plan', () => {
    const rows = JSON.stringify(Array.from({ length: 3 }, (_, i) => ({ id: i, customer: `C${i}`, status: 'Open', total: i })));
    const { components } = fit([
      w('rl', 'ShadRecordList', { data: `{{${rows}}}`, titleField: 'customer', statusField: 'status', valueField: 'total' }, { height: 340 }),
      w('kv', 'ShadKeyValue', { data: '{{[{ label: "A", value: 1 }, { label: "B", value: 2 }]}}' }, { top: 400, height: 248 }),
    ]);
    expect(h(components, 'rl')).toBe(3 * 61 + 5);
    expect(h(components, 'kv')).toBe(2 * 41 + 3);
  });

  it('keeps what the plan alone does not decide: data from a query, a bound text, a filling flex child that wraps', () => {
    const { components, warnings } = fit([
      w('rl', 'ShadRecordList', { data: '{{queries.orders.data}}', titleField: 'customer' }, { height: 340 }),
      w('t', 'ShadText', { text: '{{queries.notes.data[0].body}}' }, { top: 400, height: 80 }),
      w('row', 'FlexContainer', { direction: 'row' }, { top: 500 }),
      w('note', 'ShadText', { text: 'A note in a row' }, { height: 50 }, 'row'),
    ]);
    expect([h(components, 'rl'), h(components, 't'), h(components, 'note')]).toEqual([340, 80, 50]);
    expect(warnings).toEqual([]);
  });

  it('keeps a widget with dynamic height off, and a box-sized one', () => {
    const { components } = fit([
      w('t', 'ShadText', { text: 'Fixed', dynamicHeight: '{{false}}' }, { height: 60 }),
      w('b', 'ShadButton', { text: 'Save' }, { top: 100, height: 48 }),
    ]);
    expect([h(components, 't'), h(components, 'b')]).toEqual([60, 48]);
  });
});

describe('polishFlexRows', () => {
  it('fits the widgets first, then the row that holds them', () => {
    const { components } = polishFlexRows([
      w('kpis', 'FlexContainer', { direction: 'row', padding: 0, gap: 16 }, { left: 4, width: 30, height: 120 }),
      w('a', 'ShadStat', { label: 'Open', value: '{{3}}' }, { height: 120 }, 'kpis'),
      w('b', 'ShadStat', { label: 'Late', value: '{{1}}' }, { height: 120 }, 'kpis'),
    ]);
    expect(h(components, 'a')).toBe(124);
    expect(h(components, 'kpis')).toBe(124 + 6);
  });

  it('stretches the stat cards of an Equal heights row to their line, as the app does', () => {
    const { components } = polishFlexRows([
      w('kpis', 'FlexContainer', { direction: 'row', padding: 0, gap: 16 }, { left: 4, width: 30, height: 200 }),
      w('a', 'ShadStat', { label: 'Open', value: '{{3}}' }, { height: 120 }, 'kpis'),
      w('b', 'ShadStat', { label: 'Revenue', value: '{{9}}', footnote: 'This month' }, { height: 120 }, 'kpis'),
    ]);
    expect([h(components, 'a'), h(components, 'b')]).toEqual([150, 150]);
    expect(h(components, 'kpis')).toBe(150 + 6);
  });

  it('reports a stat card by the height it ends at, and nothing for one already at its line height', () => {
    const { warnings } = polishFlexRows([
      w('kpis', 'FlexContainer', { direction: 'row', padding: 0, gap: 16 }, { left: 4, width: 30, height: 156 }),
      w('a', 'ShadStat', { label: 'Open', value: '{{3}}' }, { height: 150 }, 'kpis'),
      w('b', 'ShadStat', { label: 'Revenue', value: '{{9}}', footnote: 'This month' }, { height: 150 }, 'kpis'),
    ]);
    expect(warnings.join(' ')).not.toMatch(/ShadStat/);
  });
});
