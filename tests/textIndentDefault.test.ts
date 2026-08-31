import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

const text = (styles?: Record<string, unknown>, properties?: Record<string, unknown>) =>
  normalizeComponentSpec({
    name: 'label1',
    type: 'Text',
    properties: { text: 'Total revenue', ...(properties ?? {}) },
    ...(styles ? { styles } : {}),
  } as never, { applyVisualDefaults: true });

describe('Text default indent', () => {
  it('indents a Text that left textIndent unset', () => {
    expect(text().component.styles?.textIndent).toEqual({ value: '{{10}}' });
  });

  it('keeps an explicit textIndent, including {{0}}', () => {
    expect(text({ textIndent: { value: '{{0}}' } }).component.styles?.textIndent).toEqual({ value: '{{0}}' });
    expect(text({ textIndent: '{{24}}' }).component.styles?.textIndent).toEqual({ value: '{{24}}' });
  });

  it('skips centred and right-aligned text (text-indent would shift it)', () => {
    expect(text({ textAlign: 'center' }).component.styles?.textIndent).toBeUndefined();
    expect(text(undefined, { textAlign: 'right' }).component.styles?.textIndent).toBeUndefined();
  });

  it('does not restyle an existing Text on an in-place update (no visual defaults)', () => {
    const updated = normalizeComponentSpec({ name: 'label1', type: 'Text', properties: {}, styles: {} } as never);
    expect(updated.component.styles?.textIndent).toBeUndefined();
  });

  it('leaves other component types alone', () => {
    const button = normalizeComponentSpec({ name: 'b', type: 'Button', properties: {} } as never, {
      applyVisualDefaults: true,
    });
    expect(button.component.styles?.textIndent).toBeUndefined();
  });
});

describe('Text default indent skips multi-line text', () => {
  const norm = (spec: Record<string, unknown>) =>
    normalizeComponentSpec(spec as never, { applyVisualDefaults: true }).component.styles?.textIndent;

  it('skips a Text whose box has room for a second line', () => {
    // 14px * 1.5 * 2 + 6 = 48, so a 60px box is authored to wrap.
    expect(norm({ name: 'p', type: 'Text', properties: { text: 'short' }, layout: { height: 60 } })).toBeUndefined();
  });

  it('still indents a single-line box, including a large heading', () => {
    expect(norm({ name: 'h', type: 'Text', properties: { text: 'Discovery Dashboard' }, layout: { height: 40 } }))
      .toEqual({ value: '{{10}}' });
    // 24px bold title in a 50px box: one line box is 42px, two is 78px.
    expect(norm({
      name: 'h2', type: 'Text', properties: { text: 'Discovery Dashboard' },
      styles: { textSize: '{{24}}' }, layouts: { desktop: { height: 50 } },
    })).toEqual({ value: '{{10}}' });
  });

  it('skips dynamic-height text (the box grows with the content)', () => {
    expect(norm({ name: 'p', type: 'Text', properties: { text: 'x', dynamicHeight: '{{true}}' } })).toBeUndefined();
  });

  it('skips prose by length or markup even when the height is unknown', () => {
    expect(norm({ name: 'p', type: 'Text', properties: { text: 'Lorem ipsum '.repeat(20) } })).toBeUndefined();
    expect(norm({ name: 'p', type: 'Text', properties: { text: '<p>One</p><p>Two</p>' } })).toBeUndefined();
    expect(norm({ name: 'p', type: 'Text', properties: { text: 'Line one\nLine two' } })).toBeUndefined();
  });
});
