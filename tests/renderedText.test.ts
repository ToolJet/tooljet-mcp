import { describe, it, expect } from 'vitest';
import { lintRenderedText, expressionOutsideBinding } from '../src/lint.js';

describe('rendered text that a customer would read as a bug', () => {
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
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: { tabs: [{ title: 'Overview', id: '0' }] } })).toEqual([]);
    expect(lintRenderedText({ type: 'Tabs', name: 'docsNav', properties: { tabs: '{{queries.sections.data}}' } })).toEqual([]);
  });

  it('leaves ordinary text alone', () => {
    expect(lintRenderedText({ type: 'Text', name: 't', properties: { text: "Today's production register" } })).toEqual([]);
    expect(lintRenderedText({ type: 'Html', name: 'h', properties: { rawHtml: '<div>{{(()=>{ return 1 + 2; })()}}</div>' } })).toEqual([]);
  });
});
