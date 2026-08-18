import { describe, it, expect } from 'vitest';
import { lintComponentSpec, detectOverlaps, lintComponents, lintModalChildren, minimumTextHeight, renderedHeight, validateAppStructure } from '../src/lint.js';
import type { AppSummary } from '../src/tooljetClient.js';
import { getComponentSchema } from '../src/catalog.js';

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

  it('warns when a large Text is shorter than its line box plus wrapper chrome', () => {
    const title = {
      name: 'pageTitle',
      type: 'Text',
      properties: { text: { value: 'Meridian Health · Security' } },
      styles: {
        textSize: { value: '{{24}}' },
        lineHeight: { value: '{{1.5}}' },
        fontWeight: { value: 'bold' },
      },
      layout: { top: 0, left: 2, width: 30, height: 40 },
    };
    expect(minimumTextHeight(title)).toBe(42);
    expect(lintComponents([title]).warnings.join(' ')).toMatch(
      /Text "pageTitle" is too short.*height 40px.*at least 42px.*use 50px.*descenders are clipped/i
    );

    expect(lintComponents([{ ...title, layout: { ...title.layout, height: 50 } }]).warnings).toEqual([]);
    expect(lintComponents([{
      ...title,
      properties: { ...title.properties, dynamicHeight: { value: '{{true}}' } },
    }]).warnings).toEqual([]);
    expect(lintComponents([{
      ...title,
      styles: { ...title.styles, textSize: { value: '{{variables.headingSize}}' } },
    }]).warnings).toEqual([]);
  });

  it('warns when a Chart keeps a non-empty title, but not when emptied', () => {
    expect(lintComponentSpec({ name: 'c', type: 'Chart', properties: { title: { value: 'Sales' } } }).warnings.join(' '))
      .toMatch(/can clip at dashboard sizes/);
    expect(lintComponentSpec({ name: 'c', type: 'Chart', properties: { title: { value: '' } } }).warnings)
      .toEqual([]);
  });

  it('warns when Html or Chart bindings nest map calls, but allows flat/sequential map chains', () => {
    const nested =
      '{{(queries.groups.data || []).map(group => group.items.map(item => `<b>${item.name}</b>`).join(""))' +
      '.join("") || "No items"}}';
    expect(lintComponentSpec({
      name: 'groupedCards',
      type: 'Html',
      properties: { html: { value: nested } },
    }).warnings.join(' ')).toMatch(/map\(\) inside another \.map\(\).*completely blank.*fallback.*filter\(\)\.map\(\)/i);
    expect(lintComponentSpec({
      name: 'groupedChart',
      type: 'Chart',
      properties: { title: { value: '' }, data: { value: nested } },
    }).warnings.join(' ')).toMatch(/component expression evaluator can throw/i);

    const flat = '{{(queries.items.data || []).filter(item => item.visible).map(item => `<b>${item.name}</b>`).join("")}}';
    const sequential = '{{(queries.items.data || []).map(item => item.name).map(name => name.toUpperCase())}}';
    expect(lintComponentSpec({ name: 'flatCards', type: 'Html', properties: { html: { value: flat } } }).warnings)
      .toEqual([]);
    expect(lintComponentSpec({ name: 'sequentialCards', type: 'Html', properties: { html: { value: sequential } } }).warnings)
      .toEqual([]);
  });

  it('warns when Statistics prose is placed in the narrow secondary value slot', () => {
    expect(lintComponentSpec({
      name: 'remainingCases',
      type: 'Statistics',
      properties: {
        secondaryValue: { value: 'cases' },
        secondaryValueLabel: { value: 'Assigned checks remaining' },
      },
    }).warnings.join(' ')).toMatch(/secondaryValue "cases" is prose.*wrap letter-by-letter.*secondaryValueLabel/i);

    expect(lintComponentSpec({
      name: 'passRateDelta',
      type: 'Statistics',
      properties: { secondaryValue: { value: '12%' } },
    }).warnings).toEqual([]);

    expect(lintComponentSpec({
      name: 'dynamicDelta',
      type: 'Statistics',
      properties: { secondaryValue: { value: '{{queries.delta.data}}' } },
    }).warnings).toEqual([]);
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

  it('warns when DropdownV2 custom data is authored on the inactive option surface', () => {
    const inactiveSchema = lintComponentSpec({
      name: 'priority',
      type: 'DropdownV2',
      properties: {
        schema: { value: '{{queries.priorities.data}}' },
        advanced: { value: '{{false}}' },
      },
    });
    expect(inactiveSchema.warnings.join(' ')).toMatch(/custom `schema` is silently ignored.*advanced.*true/i);

    const inactiveOptions = lintComponentSpec({
      name: 'priority',
      type: 'DropdownV2',
      properties: {
        options: { value: [{ label: 'High', value: 'high' }] },
        advanced: { value: '{{true}}' },
      },
    });
    expect(inactiveOptions.warnings.join(' ')).toMatch(/custom `options` are silently ignored.*advanced is true/i);
  });

  it('accepts the active DropdownV2 surface and its harmless persisted defaults', () => {
    expect(lintComponentSpec({
      name: 'priority',
      type: 'DropdownV2',
      properties: {
        schema: { value: '{{queries.priorities.data}}' },
        advanced: { value: '{{true}}' },
      },
    }).warnings).toEqual([]);

    const dropdown = getComponentSchema('DropdownV2')!;
    expect(lintComponentSpec({
      name: 'priority',
      type: 'DropdownV2',
      properties: {
        schema: { value: dropdown.properties.find((property) => property.key === 'schema')?.default },
        options: { value: dropdown.properties.find((property) => property.key === 'options')?.default },
        advanced: { value: '{{false}}' },
      },
    }).warnings).toEqual([]);
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

  it('does not treat Table identity maps or object spreads as safe projections', () => {
    const warningsFor = (data: string) => lintComponentSpec({
      name: 'requests',
      type: 'Table',
      properties: {
        data: { value: data },
        dataSourceSelector: { value: 'rawJson' },
        autogenerateColumns: { value: true },
        columns: { value: [{ name: 'Request', key: 'request' }] },
      },
    }).warnings.join(' ');

    expect(warningsFor('{{queries.requests.data.map(r => r)}}')).toMatch(/identity maps and object spreads/);
    expect(warningsFor('{{queries.requests.data.map(r => ({...r,request:r.request_number}))}}'))
      .toMatch(/identity maps and object spreads/);
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

  it('blocks Form filepicker/aliases/options and generated field types that cannot align cleanly', () => {
    const result = lintComponentSpec({
      name: 'incidentForm',
      type: 'Form',
      properties: {
        generateFormFrom: { value: 'jsonSchema' },
        newJsonSchema: { value: { properties: {
          evidence: { type: 'filepicker' },
          reporter: { type: 'email' },
          status: { type: 'dropdown', options: ['Open'], validation: { required: true } },
          description: { type: 'textarea' },
          occurred_on: { type: 'datepicker', value: null },
        } } },
      },
    });

    expect(result.errors.join(' ')).toMatch(/filepicker.*crashes the entire Form.*standalone FilePicker/is);
    expect(result.errors.join(' ')).toMatch(/unsupported type "email".*aliases such as email\/star\/file/is);
    expect(result.errors.join(' ')).toMatch(/dropdown uses "values" and "displayValues", not "options"/i);
    expect(result.warnings.join(' ')).toMatch(/required.*not a supported Form schema validator.*minLength.*customRule/is);
    expect(result.warnings.join(' ')).toMatch(/01\/01\/2022.*\{\{null\}\}/is);
    expect(result.errors.join(' ')).toMatch(/generated fields.*status \(dropdown\).*description \(textarea\).*not layout-safe.*standalone components.*alignment.*top/is);
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

  it('uses the extra 20px rendered by top-aligned form inputs', () => {
    const field = {
      name: 'subject',
      type: 'TextInput',
      properties: { label: { value: 'Subject' } },
      styles: { alignment: { value: 'top' } },
      layout: { top: 0, left: 0, width: 20, height: 62 },
    };
    expect(renderedHeight(field)).toBe(82);
    const warnings = detectOverlaps([
      field,
      { name: 'status', type: 'DropdownV2', layout: { top: 72, left: 0, width: 20, height: 62 } },
    ]).join(' ');
    expect(warnings).toMatch(/overlap at rendered desktop size/);
    expect(warnings).toMatch(/renders 82px tall \(authored 62px \+ 20px/);
  });

  it('uses the catalog-default auto label slot even when an authored label is empty', () => {
    expect(renderedHeight({
      name: 'notes',
      type: 'TextArea',
      properties: { label: { value: '' } },
      styles: { alignment: { value: 'top' } },
      layout: { top: 0, left: 0, width: 20, height: 62 },
    })).toBe(82);
  });

  it('tests both axes so side-by-side fields are not false positives', () => {
    expect(detectOverlaps([
      {
        name: 'first',
        type: 'TextInput',
        styles: { alignment: { value: 'top' } },
        layout: { top: 0, left: 0, width: 20, height: 62 },
      },
      { name: 'second', type: 'TextInput', layout: { top: 72, left: 20, width: 20, height: 62 } },
    ])).toEqual([]);
  });

  it('does not compare rectangles that belong to different parents', () => {
    expect(detectOverlaps([
      { name: 'modal', clientRef: 'm', layout: { top: 0, left: 0, width: 20, height: 200 } },
      { name: 'field', parentRef: 'm', layout: { top: 0, left: 0, width: 20, height: 60 } },
    ])).toEqual([]);
  });

  it('allows intentionally overlaid components with provably complementary visibility', () => {
    const layout = { top: 0, left: 0, width: 30, height: 200 };
    expect(detectOverlaps([
      {
        name: 'results', type: 'Table', layout,
        properties: { visibility: { value: '{{variables.hasResults}}' } },
      },
      {
        name: 'emptyState', type: 'Html', layout,
        properties: { visibility: { value: '{{!variables.hasResults}}' } },
      },
    ])).toEqual([]);
  });

  it('recognizes the standard loading-or-rows versus settled-empty visibility pair', () => {
    const layout = { top: 0, left: 0, width: 30, height: 200 };
    expect(detectOverlaps([
      {
        name: 'results', type: 'Table', layout,
        properties: {
          visibility: { value: '{{queries.listRows.isLoading || (queries.listRows.data || []).length > 0}}' },
        },
      },
      {
        name: 'emptyState', type: 'Html', layout,
        properties: {
          visibility: { value: '{{!queries.listRows.isLoading && (queries.listRows.data || []).length === 0}}' },
        },
      },
    ])).toEqual([]);
  });

  it('keeps overlap warnings for visibility expressions that are not proven exclusive', () => {
    const layout = { top: 0, left: 0, width: 30, height: 200 };
    expect(detectOverlaps([
      { name: 'first', layout, properties: { visibility: { value: '{{variables.showFirst}}' } } },
      { name: 'second', layout, properties: { visibility: { value: '{{variables.showSecond}}' } } },
    ])).toHaveLength(1);
  });
});

describe('lintModalChildren', () => {
  it('warns when ModalV2 reserves an empty header and keeps a title-like Text in its body', () => {
    const warnings = lintModalChildren([
      { name: 'createCase', type: 'ModalV2', clientRef: 'modal', properties: { showHeader: { value: true } } },
      {
        name: 'modalTitle', type: 'Text', parentRef: 'modal', properties: { text: { value: 'Add a test case' } },
        styles: { fontWeight: { value: 'bold' }, textSize: { value: 24 } },
        layout: { top: 20, left: 2, width: 30, height: 50 },
      },
    ]).join(' ');
    expect(warnings).toMatch(/native header slot is empty.*slot_name:"header"/i);
    expect(warnings).toMatch(/title-like Text "modalTitle" in the body.*Move.*slot_name:"header"/i);
  });

  it('recognizes explicit and persisted header slots and keeps their geometry separate from the body', () => {
    const components = [
      { id: 'modal-id', name: 'createCase', type: 'ModalV2', properties: { showHeader: { value: true }, showFooter: { value: false } } },
      {
        id: 'title-id', name: 'modalHeaderTitle', type: 'Text', parent: 'modal-id-header',
        properties: { text: { value: 'Add a test case' } }, styles: { fontWeight: { value: 'bold' } },
        layouts: { desktop: { top: 0, left: 2, width: 30, height: 50 } },
      },
      {
        id: 'field-id', name: 'caseTitle', type: 'TextInput', parent: 'modal-id',
        properties: { label: { value: 'Title' } }, styles: { alignment: { value: 'top' } },
        layouts: { desktop: { top: 0, left: 2, width: 30, height: 60 } },
      },
    ];
    expect(detectOverlaps(components)).toEqual([]);
    const warnings = lintModalChildren(components).join(' ');
    expect(warnings).not.toMatch(/native header slot is empty|title-like Text/);
  });

  it('warns for side labels and less than one 20px grid gap inside a modal', () => {
    const warnings = lintModalChildren([
      { name: 'modal', type: 'ModalV2', clientRef: 'm', properties: {} },
      { name: 'first', type: 'TextInput', parentRef: 'm', properties: {}, layout: { top: 20, left: 2, width: 18, height: 60 } },
      { name: 'second', type: 'TextInput', parentRef: 'm', properties: {}, layout: { top: 90, left: 2, width: 18, height: 60 } },
    ]);
    expect(warnings.join(' ')).toMatch(/SIDE-aligned label/);
    expect(warnings.join(' ')).toMatch(/only 10px vertical gap/);
  });

  it('warns when modalHeight cannot contain the rendered child bottom plus visible chrome', () => {
    const warnings = lintModalChildren([
      {
        name: 'editTicket',
        type: 'ModalV2',
        clientRef: 'modal',
        properties: {
          modalHeight: { value: '{{400}}' },
          showHeader: { value: '{{true}}' },
          showFooter: { value: '{{false}}' },
          headerHeight: { value: 80 },
        },
      },
      {
        name: 'status',
        type: 'DropdownV2',
        parentRef: 'modal',
        properties: { label: { value: 'Status' } },
        styles: { alignment: { value: 'top' } },
        layout: { top: 300, left: 2, width: 18, height: 62 },
      },
    ]).join(' ');
    expect(warnings).toMatch(/modalHeight 400px but needs at least 482px/);
    expect(warnings).toMatch(/rendered bottom 382px \+ 80px header \+ 0px footer \+ 20px bottom slack/);
  });

  it('accepts a modal tall enough for the rendered children and visible chrome', () => {
    const warnings = lintModalChildren([
      {
        id: 'modal-id',
        name: 'editTicket',
        type: 'ModalV2',
        properties: { modalHeight: { value: 500 }, showHeader: { value: true }, showFooter: { value: false } },
      },
      {
        id: 'status-id',
        name: 'status',
        type: 'DropdownV2',
        parent: 'modal-id',
        properties: { label: { value: 'Status' } },
        styles: { alignment: { value: 'top' } },
        layouts: { desktop: { top: 300, left: 2, width: 18, height: 62 } },
      },
    ]);
    expect(warnings.join(' ')).not.toMatch(/modalHeight/);
  });
});

describe('lintComponents (batch)', () => {
  it('blocks named slots on component types that do not expose native regions', () => {
    const result = lintComponents([
      { name: 'board', type: 'Kanban', clientRef: 'board' },
      { name: 'badHeader', type: 'Text', parentRef: 'board', slotName: 'header', properties: {} },
    ]);
    expect(result.errors.join(' ')).toMatch(/slot_name:"header".*Kanban parent.*only by ModalV2, Form, and Container/i);
  });

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

  it('warns when Home runs an app-load query a second time', () => {
    const duplicateLoad: AppSummary = {
      ...base,
      queries: [{ ...base.queries[0], options: { runOnPageLoad: true } }],
      events: [{
        id: 'e1',
        name: 'refresh rows',
        sourceId: 'p1',
        target: 'page',
        event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q1', queryName: 'getRows' },
      }],
    };
    expect(validateAppStructure(duplicateLoad).warnings.join(' ')).toMatch(
      /getRows.*runOnPageLoad=true.*Home\.onPageLoad.*executes it twice/i
    );
  });

  it('warns when RunJS relies on inferred query dependencies and accepts explicit success chains', () => {
    const runjs: AppSummary = {
      ...base,
      queries: [
        { id: 'q1', name: 'getRows', kind: 'tooljetdb', options: { runOnPageLoad: true } },
        {
          id: 'q2', name: 'metrics', kind: 'runjs',
          options: {
            code: 'return queries.getRows.data.length;',
            runOnDependencyChange: true,
          },
        },
      ],
      events: [],
    };
    expect(validateAppStructure(runjs).warnings.join(' ')).toMatch(
      /RunJS query "metrics".*runOnDependencyChange=true.*queries\.getRows.*does not infer.*onDataQuerySuccess/i
    );

    const chained: AppSummary = {
      ...runjs,
      events: [{
        id: 'e1', sourceId: 'q1', target: 'data_query',
        event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q2', queryName: 'metrics' },
      }],
    };
    expect(validateAppStructure(chained).warnings.join(' ')).not.toMatch(/does not infer.*reactive dependencies/i);
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

  it('warns when a persisted Kanban has no nested card body', () => {
    const blank = validateAppStructure({
      ...base,
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [{ id: 'board', name: 'ticketBoard', type: 'Kanban', properties: {} }],
      }],
      events: [],
    });
    expect(blank.warnings.join(' ')).toMatch(/Kanban "ticketBoard" has no nested card child components.*blank bodies/i);

    const populated = validateAppStructure({
      ...base,
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [
          { id: 'board', name: 'ticketBoard', type: 'Kanban', properties: {} },
          { id: 'card', name: 'ticketCard', type: 'Html', parent: 'board', properties: {} },
        ],
      }],
      events: [],
    });
    expect(populated.warnings.join(' ')).not.toMatch(/no nested card child components/i);
  });

  it('allows the Home fallback icon but warns when an added sidebar page has no icon', () => {
    const app: AppSummary = {
      ...base,
      pages: [
        { id: 'p2', name: 'Customers', handle: 'customers', components: [] },
        { ...base.pages[0], name: 'Home', handle: 'home', icon: undefined },
        { id: 'p3', name: 'Reports', handle: 'reports', icon: 'IconReportAnalytics', components: [] },
      ],
    };
    const warnings = validateAppStructure(app).warnings.join(' ');
    expect(warnings).toMatch(/Page "Customers" has no icon.*left sidebar.*IconFile/);
    expect(warnings).not.toMatch(/Page "Home" has no icon/);
    expect(warnings).not.toMatch(/Page "Reports" has no icon/);
  });

  it('finds rendered-height overlap and modal clipping in persisted app geometry', () => {
    const app: AppSummary = {
      ...base,
      pages: [{
        id: 'p1',
        name: 'Home',
        components: [
          {
            id: 'modal',
            name: 'editTicket',
            type: 'ModalV2',
            properties: { modalHeight: { value: 200 }, showHeader: { value: true }, showFooter: { value: false } },
          },
          {
            id: 'subject',
            name: 'subject',
            type: 'TextInput',
            parent: 'modal',
            properties: { label: { value: 'Subject' } },
            styles: { alignment: { value: 'top' } },
            layouts: { desktop: { top: 20, left: 2, width: 18, height: 62 } },
          },
          {
            id: 'status',
            name: 'status',
            type: 'DropdownV2',
            parent: 'modal',
            properties: { label: { value: 'Status' } },
            styles: { alignment: { value: 'top' } },
            layouts: { desktop: { top: 92, left: 2, width: 18, height: 62 } },
          },
        ],
      }],
      events: [],
    };
    const warnings = validateAppStructure(app).warnings.join(' ');
    expect(warnings).toMatch(/overlap at rendered desktop size/);
    expect(warnings).toMatch(/modalHeight 200px but needs at least 274px/);
  });
});
