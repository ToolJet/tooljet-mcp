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
    expect(prop(components, 'filters', 'alignItems')).toBe('last baseline');
    expect(warnings.join(' ')).toMatch(/filters/);
  });

  it('also fixes a row left at the default alignment', () => {
    const { components } = polishFlexRows([
      row('filters'),
      child('date', 'ShadDatePicker', 'filters', { label: { value: 'Schedule date' } }),
      child('note', 'ShadText', 'filters', { text: { value: '5 confirmed meetings' } }),
      child('refresh', 'ShadButton', 'filters', { text: { value: 'Refresh' } }),
    ]);
    expect(prop(components, 'filters', 'alignItems')).toBe('last baseline');
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

  it('respects an explicit centre or end alignment, and rows with a single card', () => {
    const centred = polishFlexRows([
      row('content', { alignItems: { value: 'center' } }),
      child('a', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
      child('b', 'FlexContainer', 'content', { cardStyle: { value: 'shadcnCard' } }),
    ]);
    expect(prop(centred.components, 'content', 'alignItems')).toBe('center');
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
