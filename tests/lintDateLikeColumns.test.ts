import { describe, expect, it } from 'vitest';
import { lintComponentSpec } from '../src/lint.js';

const table = (data: string) => ({
  name: 't1',
  type: 'Table',
  properties: {
    data: { value: data },
    dataSourceSelector: { value: 'rawJson' },
    columns: { value: [{ id: 'c1', name: 'Date', key: 'date', columnType: 'string' }] },
  },
  layouts: { desktop: { top: 0, left: 2, width: 39, height: 430 } },
});
const dateLike = (data: string) => lintComponentSpec(table(data) as never).warnings.filter((w) => /looks date\/time-like/.test(w));

describe('date-like string columns', () => {
  it('warns when the column shows a raw field straight from the query', () => {
    expect(dateLike('{{ queries.q.data }}')).toHaveLength(1);
    expect(dateLike('{{ (queries.q.data || []).map(r => ({ date: r.date })) }}')).toHaveLength(1);
  });

  it('stays quiet when the author computed the value, since it is already formatted', () => {
    expect(dateLike('{{ (queries.q.data || []).map(r => ({ date: moment(r.day).format("DD MMM") })) }}')).toEqual([]);
    expect(dateLike('{{ ((queries.m.data?.rows || []).map(r => ({ date: r.date_label }))).map(r => ({ date: r.date })) }}')).toEqual([]);
  });
});

describe('projected table keys', () => {
  it('reads the outermost projection when the author maps rows and the binding projects them again', () => {
    const spec = {
      name: 't1', type: 'Table',
      properties: {
        data: { value: '{{ ((queries.q.data || []).map(r => ({ id: r.id, pct: r.pct, site: r.site })) || []).map(r => ({ id: r.id, site: r.site })) }}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: true },
        columns: { value: [{ id: 'c1', name: 'ID', key: 'id', columnType: 'string', columnVisibility: false }, { id: 'c2', name: 'Site', key: 'site', columnType: 'string' }] },
      },
      layouts: { desktop: { top: 0, left: 2, width: 39, height: 430 } },
    };
    const warnings = lintComponentSpec(spec as never).warnings.filter((w) => /no matching explicit column/.test(w));
    expect(warnings).toEqual([]);
  });
});
