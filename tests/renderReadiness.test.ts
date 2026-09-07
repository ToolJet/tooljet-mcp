import { describe, it, expect } from 'vitest';
import {
  lintHtmlContentHeight,
  lintHtmlRootSurface,
  lintOversizedWidths,
  lintUnguardedComponentRefs,
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

describe('lintHtmlContentHeight', () => {
  const html = (rawHtml: string, height: number, extra: Record<string, unknown> = {}, width = 39) => ({
    name: 'kpis',
    type: 'Html',
    properties: { rawHtml: { value: rawHtml }, ...extra },
    layouts: { desktop: { left: 2, top: 10, width, height } },
  });
  const card = (padding: number, figure: number) =>
    `<div style="height:100%;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">` +
    `<div style="padding:${padding}px;border:1px solid var(--cc-default-border);border-radius:10px">` +
    `<div style="font-size:12px">Departures</div><div style="font-size:${figure}px;font-weight:800;margin-top:10px">{{queries.q.data.length}}</div>` +
    `<div style="font-size:12px;margin-top:4px">scheduled today</div></div></div>`;

  it('rejects a KPI strip whose cards need more than the authored height (the Luna max build)', () => {
    const errors = lintHtmlContentHeight(html(card(18, 34), 118));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/needs about 1\d\dpx/);
    expect(errors[0]).toMatch(/desktop height is 118px/);
    expect(errors[0]).toMatch(/Set height to 1[56]0px/);
    expect(lintComponentSpec(html(card(18, 34), 118)).errors.join(' ')).toMatch(/cut off behind a hidden scrollbar/);
  });

  it('accepts the same strip at a height that fits, and tighter cards at a lower one', () => {
    expect(lintHtmlContentHeight(html(card(18, 34), 160))).toEqual([]);
    expect(lintHtmlContentHeight(html(card(12, 29), 130))).toEqual([]);
    expect(lintHtmlContentHeight(html(card(12, 29), 100))[0]).toMatch(/needs about 1[12]\dpx/);
  });

  it('flags a vertically centred header whose lines exceed the box (clipped at both edges)', () => {
    const header =
      '<div style="height:100%;display:flex;align-items:center;justify-content:space-between;padding:22px 26px">' +
      '<div><div style="font-size:12px">Lufthansa Frankfurt hub</div><div style="font-size:30px;margin-top:6px">Operations control</div>' +
      '<div style="font-size:13px;margin-top:6px">Saturday, live operating picture</div></div></div>';
    expect(lintHtmlContentHeight(html(header, 80))[0]).toMatch(/needs about 9\dpx/);
    expect(lintHtmlContentHeight(html(header, 110))).toEqual([]);
  });

  it('counts wrapped lines at the authored width', () => {
    const note = '<div style="padding:12px;font-size:13px">Select a flight in the table, then update the delay code and minutes. The save action writes to the live flight record.</div>';
    expect(lintHtmlContentHeight(html(note, 50, {}, 39))).toEqual([]);
    expect(lintHtmlContentHeight(html(note, 50, {}, 9))[0]).toMatch(/needs about/);
  });

  it('skips dynamic-height blocks, empty markup, and reports a .map() estimate as a lower bound', () => {
    expect(lintHtmlContentHeight(html(card(18, 34), 118, { dynamicHeight: { value: true } }))).toEqual([]);
    expect(lintHtmlContentHeight(html('', 40))).toEqual([]);
    const rail = '<div style="padding:16px"><div style="font-size:16px">Open disruptions</div>{{queries.d.data.map(r => `<div style="padding:12px 0">${r.title}</div>`).join("")}}</div>';
    expect(lintHtmlContentHeight(html(rail, 300))).toEqual([]);
    expect(lintHtmlContentHeight(html(rail, 30))[0]).toMatch(/at least \(a \.map\(\) repeats rows\)/);
  });

  it('accepts a template-literal rawHtml and heights given in em', () => {
    const tpl = '{{`<div style="padding:1em;font-size:14px"><div style="font-size:2em">${queries.q.data.length}</div><div>flights</div></div>`}}';
    expect(lintHtmlContentHeight(html(tpl, 100))).toEqual([]);
    expect(lintHtmlContentHeight(html(tpl, 50))[0]).toMatch(/needs about/);
  });
});

describe('lintHtmlRootSurface', () => {
  const html = (rawHtml: string, extra: Record<string, unknown> = {}) => ({
    name: 'masthead',
    type: 'Html',
    properties: { rawHtml: { value: rawHtml }, ...extra },
    layouts: { desktop: { left: 2, top: 10, width: 39, height: 120 } },
  });
  const good = '<div style="height:100%;box-sizing:border-box;margin:0;background:var(--cc-appBackground-surface)"><div style="background:linear-gradient(135deg,#4B2928,#8F5E59);border-radius:22px;padding:24px;color:#fff">Maison Aurelie</div></div>';

  it('accepts a full-bleed root painted with the canvas surface and a card inside it', () => {
    expect(lintHtmlRootSurface(html(good))).toEqual([]);
    expect(lintComponentSpec(html(good)).errors).toEqual([]);
  });

  it('rejects the tinted rounded root every 2026-09-05 build wrote', () => {
    const rounded = '<div style="height:100%;background:linear-gradient(135deg,#4B2928,#8F5E59);border-radius:22px;padding:24px">Maison Aurelie</div>';
    const errors = lintHtmlRootSurface(html(rounded));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/background is "linear-gradient/);
    expect(errors[0]).toMatch(/border-radius 22px/);
    expect(errors[0]).toMatch(/paints its box white/);
    expect(errors[0]).toMatch(/var\(--cc-appBackground-surface\)/);
  });

  it('rejects a root with no height or background (the white block under a short header)', () => {
    const bare = '<div style="padding:12px"><h2>Agenda da clínica</h2></div>';
    const [error] = lintHtmlRootSurface(html(bare));
    expect(error).toMatch(/no height:100%/);
    expect(error).toMatch(/paints no background/);
    expect(lintComponentSpec(html(bare)).errors.join(' ')).toMatch(/full-bleed box/);
  });

  it('expects the card surface inside a container and accepts surface2 there', () => {
    const inside = '<div style="height:100%;box-sizing:border-box;margin:0;background:var(--cc-surface2-surface)">rail</div>';
    expect(lintHtmlRootSurface({ ...html(inside), parent: 'card-1' })).toEqual([]);
    const canvasTokenInside = '<div style="height:100%;background:var(--cc-appBackground-surface)">x</div>';
    expect(lintHtmlRootSurface({ ...html(canvasTokenInside), parentRef: 'card' })).toEqual([]);
    const literal = '<div style="height:100%;background:#FFFFFF">x</div>';
    expect(lintHtmlRootSurface({ ...html(literal), parent: 'card-1' })[0]).toMatch(/var\(--cc-surface1-surface\)/);
  });

  it('rejects several top-level nodes, a fixed width and a margin', () => {
    expect(lintHtmlRootSurface(html('<style>.a{}</style><div style="height:100%;background:var(--cc-appBackground-surface)">a</div><p>b</p>'))[0]).toMatch(/2 top-level nodes/);
    expect(lintHtmlRootSurface(html('<div style="height:100%;background:var(--cc-appBackground-surface);width:960px;margin:8px">a</div>'))[0]).toMatch(/margin 8px/);
    expect(lintHtmlRootSurface(html('<div style="height:100%;background:var(--cc-appBackground-surface);width:960px;margin:8px">a</div>'))[0]).toMatch(/width is "960px"/);
  });

  it('does not require height:100% on a dynamic-height block, and accepts a template-literal root', () => {
    const dyn = '<div style="background:var(--cc-appBackground-surface)">long prose</div>';
    expect(lintHtmlRootSurface(html(dyn, { dynamicHeight: { value: true } }))).toEqual([]);
    const tpl = '{{`<div style="height:100%;margin:0;background:var(--cc-appBackground-surface)">${queries.q.data.length}</div>`}}';
    expect(lintHtmlRootSurface(html(tpl))).toEqual([]);
  });
});

describe('lintUnguardedComponentRefs', () => {
  const tableWith = (data: string) => ({
    name: 'Tabela de Agendamentos',
    type: 'Table',
    properties: { data: { value: data } },
    layouts: { desktop: { left: 2, top: 10, width: 39, height: 400 } },
  });

  it('rejects the bracket and dot forms the Luna clinic build used', () => {
    const data = "{{queries.listar.data.filter(r => (!components['Buscar Cliente'].value || r.nome.includes(components['Buscar Cliente'].value)) && (!components.filtroData.value || r.data === components.filtroData.value))}}";
    const errors = lintUnguardedComponentRefs(tableWith(data));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/components\['Buscar Cliente'\]\.value/);
    expect(errors[0]).toMatch(/components\.filtroData\.value/);
    expect(errors[0]).toMatch(/Table shows No data/);
    expect(errors[0]).toMatch(/components\['Buscar Cliente'\]\?\.value, components\.filtroData\?\.value/);
    expect(lintComponentSpec(tableWith(data)).errors.join(' ')).toMatch(/optional chaining/);
  });

  it('accepts optional chaining and bindings without component references', () => {
    expect(lintUnguardedComponentRefs(tableWith("{{queries.q.data.filter(r => !components.search?.value || r.name.includes(components['Buscar']?.value))}}"))).toEqual([]);
    expect(lintUnguardedComponentRefs(tableWith('{{queries.q.data}}'))).toEqual([]);
    expect(lintUnguardedComponentRefs({ name: 'b', type: 'Button', properties: { text: { value: '{{components.x.value}}' } } })).toEqual([]);
  });

  it('covers Html and Text bindings and selectedRow reads', () => {
    expect(lintUnguardedComponentRefs({ name: 'panel', type: 'Html', properties: { rawHtml: { value: '<div>{{components.tbl.selectedRow.name}}</div>' } } })[0]).toMatch(/components\.tbl\?\.selectedRow/);
    expect(lintUnguardedComponentRefs({ name: 't', type: 'Text', properties: { text: { value: '{{components.tbl?.selectedRow?.name}}' } } })).toEqual([]);
  });
});
