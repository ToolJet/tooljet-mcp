import { describe, expect, it } from 'vitest';
import { lintComponentSpec } from '../src/lint.js';

const cols = (n: number, extra: Array<Record<string, unknown>> = []) =>
  [...Array.from({ length: n }, (_, i) => ({ name: `c${i}`, key: `c${i}`, columnType: 'string' })), ...extra];

describe('render traps found in the 2026-09-12 reviews', () => {
  it('rejects a ModalV2 that keeps the default trigger button', () => {
    const r = lintComponentSpec({ type: 'ModalV2', name: 'addMemberModal', properties: {}, layouts: { desktop: { top: 860, left: 10, width: 23, height: 430 } } });
    expect(r.errors.some((e) => e.includes('Launch Modal') && e.includes('top 860'))).toBe(true);
    const ok = lintComponentSpec({ type: 'ModalV2', name: 'm', properties: { useDefaultButton: { value: '{{false}}' } } });
    expect(ok.errors.some((e) => e.includes('Launch Modal'))).toBe(false);
  });

  it('warns about a labelled dropdown left on the catalog placeholder', () => {
    const r = lintComponentSpec({ type: 'DropdownV2', name: 'category', properties: { label: { value: 'Category' } } });
    expect(r.warnings.some((w) => w.includes('reads "Select"') && w.includes('All category'))).toBe(true);
    const ok = lintComponentSpec({ type: 'DropdownV2', name: 'category', properties: { label: { value: 'Category' }, placeholder: { value: 'All categories' } } });
    expect(ok.warnings.some((w) => w.includes('reads "Select"'))).toBe(false);
  });

  it('requires content wrap on tables with five or more columns', () => {
    const r = lintComponentSpec({ type: 'Table', name: 'vendorsTable', properties: { columns: { value: cols(6) } } });
    expect(r.errors.some((e) => e.includes('contentWrap') && e.includes('6 columns'))).toBe(true);
    const narrow = lintComponentSpec({ type: 'Table', name: 't', properties: { columns: { value: cols(4) } } });
    expect(narrow.errors.some((e) => e.includes('contentWrap'))).toBe(false);
    const wrapped = lintComponentSpec({ type: 'Table', name: 't', properties: { columns: { value: cols(6) } }, styles: { contentWrap: { value: '{{true}}' } } });
    expect(wrapped.errors.some((e) => e.includes('contentWrap'))).toBe(false);
  });

  it('warns when a multi-line Text is shorter than its lines', () => {
    const header = "<span style='font-size:12px;font-weight:600;'>MEDICAL CARD OPERATIONS</span><br><span style='font-size:22px;font-weight:700;'>Sales control centre</span>";
    const r = lintComponentSpec({ type: 'Text', name: 'dashTitle', properties: { text: { value: header } }, layouts: { desktop: { top: 40, left: 2, width: 39, height: 50 } } });
    expect(r.warnings.some((w) => w.includes('2 lines') && w.includes('cut off') && w.includes('at least 60'))).toBe(true);
    const tall = lintComponentSpec({ type: 'Text', name: 'dashTitle', properties: { text: { value: header } }, layouts: { desktop: { top: 40, left: 2, width: 39, height: 70 } } });
    expect(tall.warnings.some((w) => w.includes('cut off'))).toBe(false);
    const single = lintComponentSpec({ type: 'Text', name: 'title', properties: { text: { value: 'Today' } }, styles: { textSize: { value: 32 } }, layouts: { desktop: { top: 40, left: 2, width: 39, height: 50 } } });
    expect(single.warnings.some((w) => w.includes('cut off'))).toBe(false);
  });
});
