import { describe, it, expect } from 'vitest';
import { lintRenderedText, expressionOutsideBinding, lintComponentSpec } from '../src/lint.js';

describe('rendered text that a customer would read as a bug', () => {
  it('warns when Text silently falls back to the catalog greeting without constraining copy or layout', () => {
    const absent = lintComponentSpec({ type: 'Text', name: 'reviewTitle', properties: { textFormat: 'html' } });
    expect(absent.warnings.some(w => w.includes('default greeting'))).toBe(true);
    for (const text of ['', 'Review workspace', '{{queries.header.data}}', { value: '' }]) {
      expect(lintComponentSpec({ type: 'Text', properties: { text } }).warnings.some(w => w.includes('default greeting'))).toBe(false);
    }
    expect(lintComponentSpec({ type: 'Container', properties: {} }).warnings.some(w => w.includes('default greeting'))).toBe(false);
  });

  it('rejects a literal backslash-n in a Text value', () => {
    const errors = lintRenderedText({ type: 'Text', name: 'totalCard', properties: { text: 'TOTAL PRODUCTS\\n{{queries.list.data.length}}' } });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/backslash-n/);
  });

  it('rejects an expression left outside its braces', () => {
    const html = "<div>Live register · '+moment().format('DD MMM YYYY')+'</div>";
    const errors = lintRenderedText({ type: 'Html', name: 'header', properties: { rawHtml: html } });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/outside a \{\{ \}\} binding/);
    expect(expressionOutsideBinding('<b>{{moment().format("DD MMM")}}</b>')).toBeNull();
    expect(expressionOutsideBinding("{{'Total: ' + queries.a.data.length}}")).toBeNull();
  });

  it('rejects a Tabs component whose tabs were never authored', () => {
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: {} })).toHaveLength(1);
    // tabs alone is not enough: ToolJet reads tabs only with useDynamicOptions on
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: { tabs: [{ title: 'Overview', id: '0' }] } })).toHaveLength(1);
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: { tabs: [{ title: 'Overview', id: '0' }], useDynamicOptions: '{{true}}' } })).toEqual([]);
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: { tabs: '{{queries.sections.data}}', useDynamicOptions: true } })).toEqual([]);
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: { tabItems: [{ title: 'Overview', id: 't0' }] } })).toEqual([]);
  });

  it('leaves ordinary text alone', () => {
    expect(lintRenderedText({ type: 'Text', name: 't', properties: { text: "Today's production register" } })).toEqual([]);
    expect(lintRenderedText({ type: 'Html', name: 'h', properties: { rawHtml: '<div>{{(()=>{ return 1 + 2; })()}}</div>' } })).toEqual([]);
  });
});

describe('Tabs item surfaces', () => {
  it('rejects authored tabs when useDynamicOptions is off, and accepts either surface done right', () => {
    const bad = lintComponentSpec({ type: 'Tabs', name: 'docsNav', properties: { tabs: { value: [{ id: 'a', title: 'Getting started' }] }, useDynamicOptions: { value: false } } });
    expect(bad.errors.some((e: string) => e.includes('tabItems') && e.includes('ignored'))).toBe(true);
    const dyn = lintComponentSpec({ type: 'Tabs', name: 'docsNav', properties: { tabs: { value: [{ id: 'a', title: 'Getting started' }] }, useDynamicOptions: { value: '{{true}}' } } });
    expect(dyn.errors.some((e: string) => e.includes('Tab 1'))).toBe(false);
    const stat = lintComponentSpec({ type: 'Tabs', name: 'docsNav', properties: { tabItems: { value: [{ id: 't0', title: 'Getting started' }, { id: 't1', title: 'Products' }] } } });
    expect(stat.errors.some((e: string) => e.includes('Tab 1'))).toBe(false);
    const defaults = lintComponentSpec({ type: 'Tabs', name: 'docsNav', properties: { tabItems: { value: [{ id: 't0', title: 'Tab 1' }, { id: 't1', title: 'Tab 2' }] } } });
    expect(defaults.errors.some((e: string) => e.includes('Tab 1'))).toBe(true);
  });
});
