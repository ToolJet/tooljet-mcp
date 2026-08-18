import { describe, it, expect } from 'vitest';
import { lintComponentSpec, detectOverlaps, lintComponents, lintModalChildren, validateAppStructure } from '../src/lint.js';
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

  it('errors when Table column keys are duplicated because ToolJet keeps only the last one', () => {
    const result = lintComponentSpec({
      name: 'tickets',
      type: 'Table',
      properties: {
        columns: { value: [{ name: 'Status', key: 'status' }, { name: 'State', key: 'status' }] },
      },
    });
    expect(result.errors.join(' ')).toMatch(/duplicate column key "status".*silently keeps the last column/);
  });

  it('validates Table Button-column button ids and nested shape', () => {
    const warnings = lintComponentSpec({
      name: 'orders',
      type: 'Table',
      properties: {
        data: { value: '{{queries.orders.data}}' },
        dataSourceSelector: { value: 'rawJson' },
        columns: {
          value: [
            { id: 'empty-actions', name: 'Actions', key: 'actions', columnType: 'button', buttons: [] },
            {
              id: 'bad-actions',
              name: 'More',
              key: 'more',
              columnType: 'button',
              buttons: [{ buttonLabel: 'Open' }, { id: 'same' }, { id: 'same' }],
            },
          ],
        },
      },
    }).warnings.join(' ');
    expect(warnings).toMatch(/button column needs a non-empty `buttons` array/);
    expect(warnings).toMatch(/missing string `id`/);
    expect(warnings).toMatch(/duplicate button id "same"/);
  });

  it('warns when explicit Table columns still allow autogenerated columns', () => {
    const r = lintComponentSpec({
      name: 'requests',
      type: 'Table',
      properties: {
        data: { value: '{{queries.requests.data}}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: true },
        columns: { value: [{ name: 'Request', key: 'request_number' }] },
      },
    });
    expect(r.warnings.join(' ')).toMatch(/append undeclared datasource fields.*Project the Table data binding/);
  });

  it('accepts explicit Table columns when the data binding projects only intended keys', () => {
    const r = lintComponentSpec({
      name: 'requests',
      type: 'Table',
      properties: {
        data: { value: '{{queries.requests.data.map(r => ({request:r.request_number,status:r.status}))}}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: true },
        columns: { value: [
          { name: 'Request', key: 'request' },
          { name: 'Status', key: 'status' },
        ] },
      },
    });
    expect(r.warnings).toEqual([]);
  });

  it('warns when server-side Table pagination is missing its page size or total count', () => {
    const warnings = lintComponentSpec({
      name: 'orders',
      type: 'Table',
      properties: {
        data: { value: '{{queries.orders.data}}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: true },
        serverSidePagination: { value: '{{true}}' },
      },
    }).warnings.join(' ');
    expect(warnings).toMatch(/serverSideRowsPerPage/);
    expect(warnings).toMatch(/totalRecords/);
  });

  it('warns when schema-generated Forms omit their source schema/data', () => {
    expect(lintComponentSpec({ name: 'f', type: 'Form', properties: { generateFormFrom: { value: 'jsonSchema' } } }).warnings.join(' '))
      .toMatch(/newJsonSchema/);
    expect(lintComponentSpec({ name: 'f', type: 'Form', properties: { generateFormFrom: { value: 'rawJson' } } }).warnings.join(' '))
      .toMatch(/JSONData/);
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

  it('does not compare rectangles that belong to different parents', () => {
    expect(detectOverlaps([
      { name: 'modal', clientRef: 'm', layout: { top: 0, left: 0, width: 20, height: 200 } },
      { name: 'field', parentRef: 'm', layout: { top: 0, left: 0, width: 20, height: 60 } },
    ])).toEqual([]);
  });
});

describe('lintModalChildren', () => {
  it('warns for side labels and less than one 20px grid gap inside a modal', () => {
    const warnings = lintModalChildren([
      { name: 'modal', type: 'ModalV2', clientRef: 'm', properties: {} },
      { name: 'first', type: 'TextInput', parentRef: 'm', properties: {}, layout: { top: 20, left: 2, width: 18, height: 60 } },
      { name: 'second', type: 'TextInput', parentRef: 'm', properties: {}, layout: { top: 90, left: 2, width: 18, height: 60 } },
    ]);
    expect(warnings.join(' ')).toMatch(/SIDE-aligned label/);
    expect(warnings.join(' ')).toMatch(/only 10px vertical gap/);
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

  it('validates event sources against their declared component, query, or page target', () => {
    const valid: AppSummary = {
      ...base,
      events: [
        { id: 'e1', sourceId: 'q1', target: 'data_query', event: { eventId: 'onDataQuerySuccess' } },
        { id: 'e2', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad' } },
      ],
    };
    expect(validateAppStructure(valid).errors).toEqual([]);

    const wrongTarget: AppSummary = {
      ...base,
      events: [{ id: 'e1', sourceId: 'q1', target: 'component', event: { eventId: 'onClick' } }],
    };
    expect(validateAppStructure(wrongTarget).errors.join(' ')).toMatch(/source \(q1\) that no longer exists/);
  });

  it('validates table_column event sources as Table component ids', () => {
    const valid: AppSummary = {
      ...base,
      events: [{ id: 'e1', sourceId: 'c1', target: 'table_column', event: { eventId: 'onClick', ref: 'actions::view' } }],
    };
    expect(validateAppStructure(valid).errors).toEqual([]);

    const missing: AppSummary = {
      ...base,
      events: [{ id: 'e1', sourceId: 'GONE', target: 'table_column', event: { eventId: 'onClick', ref: 'actions::view' } }],
    };
    expect(validateAppStructure(missing).errors.join(' ')).toMatch(/source \(GONE\) that no longer exists/);
  });

  it('warns when a static Table Button column has no matching table_column ref', () => {
    const table = {
      ...base.pages[0].components[0],
      properties: {
        data: { value: '{{queries.getRows.data}}' },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: false },
        columns: {
          value: [
            { id: 'name', name: 'Name', key: 'name', columnType: 'string' },
            {
              id: 'actions-column',
              name: 'Actions',
              key: 'actions',
              columnType: 'button',
              buttons: [{ id: 'view-action', buttonLabel: 'View' }],
            },
          ],
        },
      },
    };
    const missing = validateAppStructure({
      ...base,
      pages: [{ ...base.pages[0], components: [table] }],
      events: [],
    });
    expect(missing.warnings.join(' ')).toMatch(/no table_column onClick event with ref "actions::view-action"/);

    const wired = validateAppStructure({
      ...base,
      pages: [{ ...base.pages[0], components: [table] }],
      events: [
        { id: 'e1', sourceId: 'c1', target: 'table_column', event: { eventId: 'onClick', ref: 'actions::view-action' } },
      ],
    });
    expect(wired.warnings.join(' ')).not.toMatch(/no table_column onClick event/);
  });

  it('warns when enabled server-side Table behaviors have no refresh event', () => {
    const app: AppSummary = {
      ...base,
      pages: [{
        ...base.pages[0],
        components: [{
          ...base.pages[0].components[0],
          properties: {
            ...base.pages[0].components[0].properties,
            serverSidePagination: { value: '{{true}}' },
            serverSideRowsPerPage: { value: '{{25}}' },
            totalRecords: { value: '{{queries.count.data[0].count}}' },
            serverSideSort: { value: '{{true}}' },
          },
        }],
      }],
    };
    const warnings = validateAppStructure(app).warnings.join(' ');
    expect(warnings).toMatch(/no onPageChanged event/);
    expect(warnings).toMatch(/no onSort event/);
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

  it('allows the Home fallback icon but warns when an added sidebar page has no icon', () => {
    const app: AppSummary = {
      ...base,
      pages: [
        { ...base.pages[0], icon: undefined },
        { id: 'p2', name: 'Customers', handle: 'customers', components: [] },
        { id: 'p3', name: 'Reports', handle: 'reports', icon: 'IconReportAnalytics', components: [] },
      ],
    };
    const warnings = validateAppStructure(app).warnings.join(' ');
    expect(warnings).toMatch(/Page "Customers" has no icon.*left sidebar.*IconFile/);
    expect(warnings).not.toMatch(/Page "Home" has no icon/);
    expect(warnings).not.toMatch(/Page "Reports" has no icon/);
  });
});
