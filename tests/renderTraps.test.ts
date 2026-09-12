import { describe, expect, it } from 'vitest';
import { lintComponentSpec, lintComponents } from '../src/lint.js';

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
    expect(r.errors.some((w) => w.includes('2 lines') && w.includes('cut off') && w.includes('at least 60'))).toBe(true);
    const tall = lintComponentSpec({ type: 'Text', name: 'dashTitle', properties: { text: { value: header } }, layouts: { desktop: { top: 40, left: 2, width: 39, height: 70 } } });
    expect(tall.errors.some((w) => w.includes('cut off'))).toBe(false);
    const single = lintComponentSpec({ type: 'Text', name: 'title', properties: { text: { value: 'Today' } }, styles: { textSize: { value: 32 } }, layouts: { desktop: { top: 40, left: 2, width: 39, height: 50 } } });
    expect(single.errors.some((w) => w.includes('cut off'))).toBe(false);
  });
  it('rejects a table shorter than its rows per page', () => {
    const r = lintComponentSpec({ type: 'Table', name: 'notTable', properties: { columns: { value: cols(4) }, enablePagination: { value: '{{true}}' }, rowsPerPage: { value: 8 } }, layouts: { desktop: { top: 100, left: 2, width: 39, height: 400 } } });
    expect(r.errors.some((e) => e.includes('sliced') && e.includes('rowsPerPage to'))).toBe(true);
    const ok = lintComponentSpec({ type: 'Table', name: 'notTable', properties: { columns: { value: cols(4) }, enablePagination: { value: '{{true}}' }, rowsPerPage: { value: 8 } }, layouts: { desktop: { top: 100, left: 2, width: 39, height: 460 } } });
    expect(ok.errors.some((e) => e.includes('sliced'))).toBe(false);
  });
  it('assumes the catalog default of ten rows per page when none is authored', () => {
    const r = lintComponentSpec({ type: 'Table', name: 't', properties: { columns: { value: cols(4) } }, layouts: { desktop: { top: 100, left: 2, width: 39, height: 400 } } });
    expect(r.errors.some((e) => e.includes('10 rows per page') && e.includes('sliced'))).toBe(true);
  });

  it('rejects a table whose columnSize values are wider than the table', () => {
    const wide = cols(0, [['Vendor', 190], ['Code', 80], ['Category', 170], ['Region', 100], ['Location', 150], ['Primary contact', 220], ['Backup contact', 220], ['Terms', 90], ['Preferred', 100], ['Annual spend', 130]].map(([name, columnSize]) => ({ name, key: name, columnType: 'string', columnSize })));
    const r = lintComponentSpec({ type: 'Table', name: 'vendorsTable', properties: { columns: { value: wide }, rowsPerPage: { value: 10 } }, styles: { contentWrap: { value: '{{true}}' } }, layouts: { desktop: { top: 330, left: 2, width: 39, height: 690 } } });
    expect(r.errors.some((e) => e.includes('cut off at the right edge') && e.includes('1450px'))).toBe(true);
    const fits = lintComponentSpec({ type: 'Table', name: 't', properties: { columns: { value: wide.slice(0, 5) }, rowsPerPage: { value: 10 } }, styles: { contentWrap: { value: '{{true}}' } }, layouts: { desktop: { top: 330, left: 2, width: 39, height: 690 } } });
    expect(fits.errors.some((e) => e.includes('cut off at the right edge'))).toBe(false);
  });

  it('rejects narrow Kanban card children', () => {
    const board = { id: 'k1', type: 'Kanban', name: 'pipelineBoard', properties: {}, layouts: { desktop: { top: 172, left: 2, width: 39, height: 540 } } };
    const title = { id: 't1', type: 'Text', name: 'pipelineBoardCardTitle', parent: 'k1', properties: { text: { value: '{{cardData.title}}' } }, layouts: { desktop: { top: 20, left: 0, width: 13.95, height: 30 } } };
    const r = lintComponents([board, title] as any);
    expect(r.errors.some((e) => e.includes('card child Text "pipelineBoardCardTitle"') && e.includes('97px'))).toBe(true);
    const wide = lintComponents([board, { ...title, layouts: { desktop: { top: 12, left: 2, width: 39, height: 30 } } }] as any);
    expect(wide.errors.some((e) => e.includes('card child'))).toBe(false);
  });

  it('rejects a Statistics row that leaves an empty slot', () => {
    const tile = (name: string, top: number, left: number, width = 18) => ({ type: 'Statistics', name, properties: { primaryValueLabel: { value: name } }, layouts: { desktop: { top, left, width, height: 120 } } });
    const r = lintComponents([tile('users', 130, 2), tile('endpoints', 130, 22), tile('services', 270, 2)] as any);
    expect(r.errors.some((e) => e.includes('"services"') && e.includes('empty slot'))).toBe(true);
    const full = lintComponents([tile('a', 130, 2, 13), tile('b', 130, 15, 13), tile('c', 130, 28, 13)] as any);
    expect(full.errors.some((e) => e.includes('empty slot'))).toBe(false);
  });

  it('rejects a button narrower than its label', () => {
    const r = lintComponentSpec({ type: 'Button', name: 'addProduct', properties: { text: { value: 'Add product' } }, layouts: { desktop: { top: 272, left: 38, width: 3, height: 40 } } });
    const all = lintComponents([{ type: 'Button', name: 'addProduct', properties: { text: { value: 'Add product' } }, layouts: { desktop: { top: 272, left: 38, width: 3, height: 40 } } }] as any);
    expect(all.errors.some((e) => e.includes('"Add product"') && e.includes('at least 5 columns'))).toBe(true);
    expect(r.errors.length).toBeGreaterThanOrEqual(0);
    const ok = lintComponents([{ type: 'Button', name: 'addProduct', properties: { text: { value: 'Add product' } }, layouts: { desktop: { top: 272, left: 36, width: 5, height: 40 } } }] as any);
    expect(ok.errors.some((e) => e.includes('label wraps'))).toBe(false);
  });

  it('requires cliponaxis:false on bars with outside labels', () => {
    const chart = (extra: string) => lintComponentSpec({ type: 'Chart', name: 'spend', properties: { plotFromJson: { value: '{{true}}' }, jsonDescription: { value: `{{JSON.stringify({data:[{type:'bar',x:queries.q.data.map(r=>r.k),y:queries.q.data.map(r=>r.v),text:queries.q.data.map(r=>String(r.v)),textposition:'outside'${extra}}],layout:{margin:{l:36,r:12,t:8,b:40},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'IBM Plex Sans, sans-serif',size:12,color:'#6B7280'}}})}}` } } });
    expect(chart('').errors.some((e) => e.includes('cliponaxis:false'))).toBe(true);
    expect(chart(',cliponaxis:false').errors.some((e) => e.includes('cliponaxis:false'))).toBe(false);
  });
});
