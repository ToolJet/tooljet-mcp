import { describe, it, expect } from 'vitest';
import {
  lintOversizedWidths,
  lintTableColumnsShape,
  lintTextFormat,
  lintUntriggeredDataQueries,
} from '../src/renderReadiness.js';
import { lintComponents, lintComponentSpec, validateAppStructure } from '../src/lint.js';
import type { AppSummary } from '../src/tooljetClient.js';

const table = (extra: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'tbl_flights',
  type: 'Table',
  properties: {
    data: { value: '{{queries.get_flights.data}}' },
    dataSourceSelector: { value: 'rawJson' },
    autogenerateColumns: { value: true },
    ...extra,
  },
  layouts: { desktop: { left: 2, top: 10, width: 39, height: 500 } },
});

function summary(overrides: Partial<AppSummary>): AppSummary {
  return {
    app_id: 'a',
    pages: [{ id: 'p1', name: 'Home', handle: 'home', components: [table()] }],
    queries: [{ id: 'q1', name: 'get_flights', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't' } }],
    events: [],
    ...overrides,
  };
}

describe('lintTableColumnsShape', () => {
  it('rejects a stringified columns array (the Gemini Pro crash)', () => {
    const errors = lintTableColumnsShape(table({ columns: { value: '[\n { "name": "Flight", "key": "flight_number" }\n]' } }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/JSON string that happens to parse as an array/);
    expect(errors[0]).toMatch(/real array value/);
  });

  it('rejects a non-array, non-string value and accepts arrays and absence', () => {
    expect(lintTableColumnsShape(table({ columns: { value: { key: 'x' } } }))[0]).toMatch(/must be an array/);
    expect(lintTableColumnsShape(table({ columns: { value: [{ key: 'x', name: 'X' }] } }))).toEqual([]);
    expect(lintTableColumnsShape(table())).toEqual([]);
  });

  it('is part of the per-component lint', () => {
    const result = lintComponentSpec(table({ columns: { value: '[]' } }));
    expect(result.errors.join(' ')).toMatch(/columns.value is a JSON string/);
  });
});

describe('lintTextFormat', () => {
  const text = (value: string, textFormat?: string) => ({
    name: 'title',
    type: 'Text',
    properties: { text: { value }, ...(textFormat ? { textFormat: { value: textFormat } } : {}) },
    layouts: { desktop: { left: 2, top: 2, width: 39, height: 40 } },
  });

  it('flags markdown in the default html format and in plain text', () => {
    expect(lintTextFormat(text('## Crew Control'))[0]).toMatch(/textFormat is "html"/);
    expect(lintTextFormat(text('**Member:** {{components.crew.selectedRow.name}}', 'plainText'))[0]).toMatch(/textFormat is "plainText"/);
  });

  it('accepts markdown format, html, and arithmetic inside bindings', () => {
    expect(lintTextFormat(text('## Crew Control', 'markdown'))).toEqual([]);
    expect(lintTextFormat(text('<h2>Crew Control</h2>'))).toEqual([]);
    expect(lintTextFormat(text('Total {{2 ** 3}} items'))).toEqual([]);
    expect(lintTextFormat(text('Plain sentence about crew.'))).toEqual([]);
  });
});

describe('lintOversizedWidths', () => {
  it('rejects pixel widths on the column grid, exempting modals', () => {
    const errors = lintOversizedWidths([
      { name: 'scheduleTable', type: 'Table', layouts: { desktop: { left: 20, width: 1160, top: 306, height: 650 } } },
      { name: 'filter', type: 'DropdownV2', layouts: { desktop: { left: 30, width: 20, top: 0, height: 40 } } },
      { name: 'ok', type: 'Button', layouts: { desktop: { left: 2, width: 39, top: 0, height: 40 } } },
      { name: 'modal', type: 'ModalV2', layouts: { desktop: { left: 0, width: 60, top: 0, height: 40 } } },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/left 20 \+ width 1160 exceeds/);
    expect(errors[1]).toMatch(/"filter"/);
  });

  it('is part of the batch lint', () => {
    const result = lintComponents([
      { name: 'a', type: 'Button', properties: { text: { value: 'x' } }, layouts: { desktop: { left: 20, width: 260, top: 0, height: 40 } } },
    ]);
    expect(result.errors.join(' ')).toMatch(/exceeds ToolJet's 43-column grid/);
  });
});

describe('lintUntriggeredDataQueries', () => {
  it('errors when a Table query has no trigger at all (the Gemini Flash gap)', () => {
    const result = lintUntriggeredDataQueries(summary({}));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/nothing runs "get_flights"/);
    expect(validateAppStructure(summary({})).errors.join(' ')).toMatch(/nothing runs "get_flights"/);
  });

  it('accepts runOnPageLoad, a page onPageLoad event, and a chain from an automatic query', () => {
    const onLoad = summary({
      queries: [{ id: 'q1', name: 'get_flights', kind: 'tooljetdb', options: { operation: 'list_rows', runOnPageLoad: true } }],
    });
    expect(lintUntriggeredDataQueries(onLoad).errors).toEqual([]);

    const pageEvent = summary({
      events: [{ id: 'e1', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q1' } }],
    });
    expect(lintUntriggeredDataQueries(pageEvent).errors).toEqual([]);

    const chained = summary({
      queries: [
        { id: 'q0', name: 'count', kind: 'tooljetdb', options: { operation: 'list_rows', runOnPageLoad: '{{true}}' } },
        { id: 'q1', name: 'get_flights', kind: 'tooljetdb', options: { operation: 'list_rows' } },
      ],
      events: [{ id: 'e1', sourceId: 'q0', target: 'data_query', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'q1' } }],
    });
    expect(lintUntriggeredDataQueries(chained).errors).toEqual([]);
    expect(lintUntriggeredDataQueries(chained).warnings).toEqual([]);
  });

  it('warns, not errors, when the only trigger is a user event', () => {
    const clickOnly = summary({
      events: [{ id: 'e1', sourceId: 'btn', target: 'component', event: { eventId: 'onClick', actionId: 'run-query', queryId: 'q1' } }],
    });
    const result = lintUntriggeredDataQueries(clickOnly);
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]).toMatch(/only runs from component onClick/);
  });

  it('resolves planned event refs by query name and downgrades non-Table components to warnings', () => {
    const chart = summary({
      pages: [{ id: 'p1', name: 'Home', components: [{ id: 'ch', name: 'chart', type: 'Chart', properties: { data: { value: '{{queries.get_flights.data}}' } } }] }],
      events: [{ id: 'e1', sourceId: 'p1', target: 'page', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'get_flights' } }],
    });
    expect(lintUntriggeredDataQueries(chart).errors).toEqual([]);
    const untriggeredChart = summary({
      pages: [{ id: 'p1', name: 'Home', components: [{ id: 'ch', name: 'chart', type: 'Chart', properties: { data: { value: '{{queries.get_flights.data}}' } } }] }],
    });
    expect(lintUntriggeredDataQueries(untriggeredChart).errors).toEqual([]);
    expect(lintUntriggeredDataQueries(untriggeredChart).warnings[0]).toMatch(/nothing runs "get_flights"/);
  });
});
