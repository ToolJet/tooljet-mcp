import { describe, it, expect } from 'vitest';
import { lintComponentSpec, detectOverlaps, lintComponents, validateAppStructure } from '../src/lint.js';
import type { AppSummary } from '../src/tooljetClient.js';

describe('lintComponentSpec', () => {
  it('ERRORS when style keys are placed under properties', () => {
    const r = lintComponentSpec({ name: 'title', type: 'Text', properties: { textColor: { value: '#111' } } });
    expect(r.errors.join(' ')).toMatch(/style keys \["textColor"\] are under `properties`/);
    expect(r.warnings).toEqual([]);
  });

  it('warns when a Chart has no explicit (empty) title — the default clips', () => {
    const r = lintComponentSpec({ name: 'c', type: 'Chart', properties: { data: { value: [] } } });
    expect(r.warnings.join(' ')).toMatch(/native title defaults to a non-empty string that clips/);
  });

  it('warns when a Chart keeps a non-empty title, but not when emptied', () => {
    expect(lintComponentSpec({ name: 'c', type: 'Chart', properties: { title: { value: 'Sales' } } }).warnings.join(' '))
      .toMatch(/can clip at dashboard sizes/);
    expect(lintComponentSpec({ name: 'c', type: 'Chart', properties: { title: { value: '' } } }).warnings)
      .toEqual([]);
  });

  it('warns when a Table binds data without rawJson / without columns', () => {
    const r = lintComponentSpec({
      name: 't',
      type: 'Table',
      properties: { data: { value: '{{queries.q.data}}' } },
    });
    expect(r.warnings.join(' ')).toMatch(/dataSourceSelector is not "rawJson"/);
    expect(r.warnings.join(' ')).toMatch(/neither autogenerateColumns:true nor an explicit columns array/);
  });

  it('is clean for a correctly-bound Table', () => {
    const r = lintComponentSpec({
      name: 't',
      type: 'Table',
      properties: {
        data: { value: '{{queries.q.data}}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: true },
      },
    });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('warns when a narrow form input keeps a side-aligned label; clean when top-aligned or wide', () => {
    // narrow + default (side) alignment → warn
    const narrow = lintComponentSpec({
      name: 'amount',
      type: 'CurrencyInput',
      properties: { label: { value: 'Requested amount (USD)' } },
      layout: { top: 0, left: 0, width: 12, height: 5 },
    });
    expect(narrow.warnings.join(' ')).toMatch(/SIDE-aligned label .* eats the input width.*alignment.*"top"/);

    // narrow but explicitly top-aligned (style) → clean
    const topAligned = lintComponentSpec({
      name: 'amount',
      type: 'CurrencyInput',
      styles: { alignment: { value: 'top' } },
      properties: {},
      layout: { top: 0, left: 0, width: 12, height: 5 },
    });
    expect(topAligned.warnings).toEqual([]);

    // wide field → side label is fine, no warning
    const wide = lintComponentSpec({
      name: 'amount',
      type: 'CurrencyInput',
      properties: {},
      layout: { top: 0, left: 0, width: 30, height: 5 },
    });
    expect(wide.warnings).toEqual([]);
  });

  it('validates explicit Table columns shape and headerCasing enum', () => {
    const r = lintComponentSpec({
      name: 't',
      type: 'Table',
      properties: {
        data: { value: '{{queries.q.data}}' },
        dataSourceSelector: { value: 'rawJson' },
        columns: { value: [{ name: 'Title', key: 'title', headerCasing: 'capitalize' }, { key: 'x' }] },
      },
    });
    expect(r.warnings.join(' ')).toMatch(/headerCasing "capitalize" is invalid — use "none" .* or "uppercase"/);
    expect(r.warnings.join(' ')).toMatch(/column\[1\]: missing `name`/);
  });
});

describe('detectOverlaps', () => {
  it('flags two components that overlap on the desktop canvas', () => {
    const w = detectOverlaps([
      { name: 'a', layout: { top: 0, left: 0, width: 10, height: 10 } },
      { name: 'b', layout: { top: 5, left: 5, width: 10, height: 10 } },
    ]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/"a" and "b" overlap/);
  });

  it('does not flag non-overlapping components', () => {
    expect(
      detectOverlaps([
        { name: 'a', layout: { top: 0, left: 0, width: 10, height: 10 } },
        { name: 'b', layout: { top: 0, left: 10, width: 10, height: 10 } },
      ])
    ).toEqual([]);
  });
});

describe('lintComponents (batch)', () => {
  it('aggregates per-component results and overlaps', () => {
    const { errors, warnings } = lintComponents([
      { name: 'chart', type: 'Chart', properties: {}, layout: { top: 0, left: 0, width: 10, height: 10 } },
      { name: 'over', type: 'Text', properties: {}, layout: { top: 5, left: 5, width: 10, height: 10 } },
    ]);
    expect(errors).toEqual([]);
    expect(warnings.join(' ')).toMatch(/native title/);
    expect(warnings.join(' ')).toMatch(/overlap/);
  });
});

describe('validateAppStructure', () => {
  const base: AppSummary = {
    app_id: 'app1',
    name: 'App',
    version_id: 'v1',
    pages: [
      {
        id: 'p1',
        name: 'Home',
        components: [
          {
            id: 'c1',
            name: 'table1',
            type: 'Table',
            properties: {
              data: { value: '{{queries.getRows.data}}' },
              dataSourceSelector: { value: 'rawJson' },
              autogenerateColumns: { value: true },
            },
          },
        ],
      },
    ],
    queries: [{ id: 'q1', name: 'getRows', kind: 'tooljetdb', options: {} }],
    events: [{ id: 'e1', name: 'run', sourceId: 'c1', target: 'component', event: { actionId: 'run-query', queryId: 'q1' } }],
  };

  it('passes a well-formed app', () => {
    const r = validateAppStructure(base);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('errors on an event whose query no longer exists', () => {
    const bad: AppSummary = { ...base, events: [{ id: 'e1', name: 'run', sourceId: 'c1', target: 'component', event: { actionId: 'run-query', queryId: 'GONE' } }] };
    expect(validateAppStructure(bad).errors.join(' ')).toMatch(/runs a query \(GONE\) that no longer exists/);
  });

  it('errors on an event attached to a missing source', () => {
    const bad: AppSummary = { ...base, events: [{ id: 'e1', name: 'orphan', sourceId: 'GONE', target: 'component', event: {} }] };
    expect(validateAppStructure(bad).errors.join(' ')).toMatch(/attached to a source \(GONE\) that no longer exists/);
  });

  it('warns on a binding to a non-existent query', () => {
    const bad: AppSummary = {
      ...base,
      pages: [
        {
          id: 'p1',
          name: 'Home',
          components: [
            { id: 'c1', name: 'table1', type: 'Table', properties: { data: { value: '{{queries.missing.data}}' }, dataSourceSelector: { value: 'rawJson' }, autogenerateColumns: { value: true } } },
          ],
        },
      ],
    };
    expect(validateAppStructure(bad).warnings.join(' ')).toMatch(/binds \{\{queries\.missing…\}\} but no query is named "missing"/);
  });

  it('warns on duplicate component names within a page', () => {
    const bad: AppSummary = {
      ...base,
      pages: [
        {
          id: 'p1',
          name: 'Home',
          components: [
            { id: 'c1', name: 'dup', type: 'Text', properties: {} },
            { id: 'c2', name: 'dup', type: 'Text', properties: {} },
          ],
        },
      ],
    };
    expect(validateAppStructure(bad).warnings.join(' ')).toMatch(/2 components named "dup"/);
  });
});
