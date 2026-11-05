// Related component contracts share one file to keep the installable Git checkout within its file limit.
import { expressionOutsideBinding, htmlRootHasDarkBackground, lintComponentSlots, lintComponentSpec, lintComponents, lintHiddenModalHitTargets, lintInnerPageBands, lintRenderedGeometry, lintRenderedText, lintTableProjectionRender, lintToolbarButtonAlignment, type LintComponent, validateAppStructure } from '../src/lint.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';
import { describe, expect, it, vi } from 'vitest';
import { type AppSummary, type ToolJetClient } from '../src/tooljetClient.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { validateEvents } from '../src/eventValidation.js';
import { lintComponentStateBindings } from '../src/componentStateBindings.js';
import { getComponentSchema } from '../src/catalog.js';
import { readFileSync } from 'node:fs';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import { addComponentBatchesTool } from '../src/tools/addComponentBatches.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { addComponentTool } from '../src/tools/addComponent.js';
import { z } from 'zod';

// disabledStateAlias
{
describe('disabled state authoring alias', () => {
  it('preserves a Button eligibility guard instead of stripping isDisabled', () => {
    const guard = { value: "{{!variables.recordId || queries.save.isLoading}}" };
    const result = normalizeComponentSpec({
      type: 'Button', name: 'save', properties: { text: 'Save', isDisabled: guard },
    }, { stripUnknownKeys: true });
    expect(result.component.properties?.disabledState).toEqual(guard);
    expect(result.component.properties).not.toHaveProperty('isDisabled');
  });

  it('does not overwrite an explicitly authored canonical guard', () => {
    const result = normalizeComponentSpec({
      type: 'Button', name: 'save', properties: { isDisabled: true, disabledState: false },
    }, { stripUnknownKeys: true });
    expect(result.component.properties?.disabledState).toEqual({ value: false });
  });

  it('gives a precise correction on paths that lint before normalization', () => {
    const result = lintComponentSpec({
      type: 'Button', name: 'save', properties: { isDisabled: { value: true } },
    });
    expect(result.errors.join(' ')).toMatch(/isDisabled.*disabledState/);
  });
});
}

// tableTimezone
{
const warnings = (extra: Record<string, unknown> = {}) => lintComponentSpec({type:'Table', name:'appointments', properties:{columns:[{
  name:'Appointment',key:'starts_at',columnType:'datepicker',isTimeChecked:true,dateFormat:'DD/MM/YYYY',...extra,
}]}}).warnings;

describe('time display intent, without prescribing a timezone', () => {
  it('flags browser-local timed columns, not date-only or explicitly zoned columns', () => {
    expect(warnings().some(w=>w.includes('viewer\'s browser timezone'))).toBe(true);
    for(const extra of [{isTimeChecked:false},{columnVisibility:false},{timeZoneDisplay:'America/Sao_Paulo'},{timeZoneDisplay:'{{variables.businessZone}}'}])
      expect(warnings(extra).some(w=>w.includes('viewer\'s browser timezone'))).toBe(false);
  });
  it('flags duplicate clock formatting without mistaking escaped literal text for tokens', () => {
    expect(warnings({dateFormat:'DD/MM/YYYY HH:mm'}).some(w=>w.includes('time twice'))).toBe(true);
    expect(warnings({dateFormat:'DD/MM/YYYY [shift]'}).some(w=>w.includes('time twice'))).toBe(false);
    expect(warnings({dateFormat:'{{variables.format}}'}).some(w=>w.includes('time twice'))).toBe(false);
  });
  it('also checks time embedded in dateFormat when the native time toggle is off', () => {
    const result=warnings({isTimeChecked:false,dateFormat:'DD/MM/YYYY HH:mm'});
    expect(result.some(w=>w.includes("viewer's browser timezone"))).toBe(true);
    expect(result.some(w=>w.includes('time twice'))).toBe(false);
  });
});
}

// toolbarAlignment
{
const input = (name: string, left: number, top = 165) => ({
  type: 'TextInput', name,
  properties: { label: { value: 'Search' } },
  styles: { alignment: { value: 'top' } },
  layouts: { desktop: { top, left: left, width: 10, height: 40 } },
});
const button = (top: number, left = 33) => ({ type: 'Button', name: 'add', layouts: { desktop: { top, left, width: 8, height: 40 } } });

describe('toolbar button alignment', () => {
  it('flags a button authored at the top of a top-labelled input row', () => {
    const errors = lintToolbarButtonAlignment([input('search', 2), input('priority', 23), button(165)]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('top to 185');
    expect(errors[0]).toContain('label band');
  });

  it('accepts a button aligned with the field boxes', () => {
    expect(lintToolbarButtonAlignment([input('search', 2), button(185)])).toEqual([]);
  });

  it('ignores side-labelled inputs, other rows, and other parents', () => {
    const side = { ...input('side', 2), styles: { alignment: { value: 'side' } } };
    expect(lintToolbarButtonAlignment([side, button(165)])).toEqual([]);
    expect(lintToolbarButtonAlignment([input('search', 2), button(300)])).toEqual([]);
    expect(lintToolbarButtonAlignment([{ ...input('search', 2), parent: 'modal1' }, button(165)])).toEqual([]);
  });

  it('is part of the page geometry lint', () => {
    expect(lintRenderedGeometry([input('search', 2), button(165)]).some((e) => e.includes('label band'))).toBe(true);
  });
});
}

// lintDateLikeColumns
{
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
}

// tableHeightFloor
{
const table = (height: number, columns?: unknown[]) => ({ type: 'Table', name: 'records',
  properties: { enablePagination: {value:true}, rowsPerPage: {value:4}, dynamicHeight: {value:false},
    displaySearchBox: {value:false}, showFilterButton: {value:false}, showDownloadButton: {value:false},
    showAddNewRowButton: {value:false}, showBulkUpdateActions: {value:false},
    ...(columns ? { columns: { value: columns } } : {}) },
  styles: { contentWrap: {value:false}, cellSize: {value:'regular'} },
  layouts: { desktop: { top:0, left:0, width:39, height } },
});

it('uses the measured 49px chip-row minimum when a visible column renders chips', () => {
  const chips = [{ name: 'Status', key: 'status', columnType: 'tagsV2' }];
  expect(lintComponentSpec(table(262, chips)).warnings.join(' ')).toContain('too short to show');
  expect(lintComponentSpec(table(278, chips)).warnings.join(' ')).not.toContain('too short to show');
});

it('ignores hidden chip columns and plain text columns', () => {
  const hidden = [{ name: 'Status', key: 'status', columnType: 'tagsV2', columnVisibility: false }];
  const text = [{ name: 'Status', key: 'status', columnType: 'string' }];
  expect(lintComponentSpec(table(262, hidden)).warnings.join(' ')).not.toContain('too short to show');
  expect(lintComponentSpec(table(262, text)).warnings.join(' ')).not.toContain('too short to show');
});

const wrapped = (height: number) => {
  const spec = table(height);
  spec.styles.contentWrap = { value: true };
  return spec;
};

it('does not demand wrapping allowance when a table fits four single-line rows', () => {
  expect(lintComponentSpec(wrapped(262)).warnings.join(' ')).not.toContain('too short to show');
});

it('still warns when even four single-line rows cannot fit', () => {
  expect(lintComponentSpec(wrapped(230)).warnings.join(' ')).toContain('too short to show');
});
}

// tableHiddenTimestampWarning
{
const rawData = '{{ queries.tickets.data.map(r => ({ subject: r.subject, created_at: r.created_at })) }}';
const rawColumn = {
  id: 'queue-sel-created_at', name: 'created_at', key: 'created_at',
  columnType: 'string', columnSize: 100, columnVisibility: false,
};
const table = (columns: Record<string, unknown>[], data = rawData) => ({
  name: 'queue', type: 'Table', properties: { data: { value: data }, columns: { value: columns } },
});
const timestampWarnings = (spec: Parameters<typeof lintComponentSpec>[0]) =>
  lintComponentSpec(spec).warnings.filter(w => w.includes('raw ISO timestamp'));

describe('Table timestamp display diagnostics exclude known-hidden raw selection fields', () => {
  it.each([false, '{{false}}'])('does not warn for canonical hidden visibility %s or rewrite raw selectedRow data', columnVisibility => {
    const spec = table([{ ...rawColumn, columnVisibility }]);
    const before = JSON.stringify(spec);
    expect(timestampWarnings(spec)).toEqual([]);
    expect(spec.properties.data.value).toContain('created_at: r.created_at');
    expect(JSON.stringify(spec)).toBe(before);
  });

  it.each([undefined, true, '{{true}}', '{{variables.showCreated}}', '{{ !variables.hideCreated }}', null, 0, 'false', { value: false }])
    ('retains the display warning when visibility is not canonically known hidden: %j', columnVisibility => {
      const { columnVisibility: _hidden, ...visibleColumn } = rawColumn;
      const spec = table([{ ...visibleColumn, ...(columnVisibility === undefined ? {} : { columnVisibility }) }]);
      expect(timestampWarnings(spec)).toEqual([expect.stringContaining('"created_at" looks date/time-like')]);
    });

  it('suppresses only the hidden column, not a visible timestamp in the same table', () => {
    const spec = table([rawColumn, { id: 'updated', name: 'Updated', key: 'updated_at', columnType: 'string' }]);
    expect(timestampWarnings(spec)).toEqual([expect.stringContaining('"updated_at" looks date/time-like')]);
  });

  it('keeps required-field, unsupported/deprecated-type and button-schema diagnostics for hidden columns', () => {
    const result = lintComponentSpec(table([
      { columnVisibility: false, columnType: 'string' },
      { ...rawColumn, columnType: 'date' },
      { ...rawColumn, id: 'legacy', key: 'legacy_at', columnType: 'tags' },
      { ...rawColumn, id: 'action', key: 'action', columnType: 'button' },
    ]));
    expect(result.warnings.join(' ')).toMatch(/missing `name`/);
    expect(result.warnings.join(' ')).toMatch(/missing `key`/);
    expect(result.errors.join(' ')).toContain('unsupported columnType:"date"');
    expect(result.errors.join(' ')).toContain('deprecated columnType:"tags"');
    expect(result.warnings.join(' ')).toContain('button column needs a non-empty `buttons` array');
  });

  it('preserves visible formatted-field exemptions and datepicker columns', () => {
    expect(timestampWarnings(table([{ ...rawColumn, columnVisibility: true }],
      '{{ queries.tickets.data.map(r => ({ created_at: moment(r.created_at).format("DD MMM YYYY") })) }}'))).toEqual([]);
    expect(timestampWarnings(table([{ ...rawColumn, key: 'created_display', columnVisibility: true }]))).toEqual([]);
    expect(timestampWarnings(table([{ ...rawColumn, columnVisibility: true, columnType: 'datepicker',
      dateFormat: 'DD MMM YYYY', parseDateFormat: 'YYYY-MM-DDTHH:mm:ssZ' }]))).toEqual([]);
  });

  it('does not suppress the separate visible KeyValuePair timestamp diagnostic', () => {
    expect(timestampWarnings({ name: 'details', type: 'KeyValuePair', properties: {
      data: { value: '{{variables.ticket}}' },
      fields: { value: [{ id: 'created', name: 'Created', key: 'created_at', fieldType: 'string', autogenerated: false }] },
    } })).toEqual([expect.stringContaining('fieldType:"string"')]);
  });
});
}

// widgetSlotsAndItems
{
describe('Accordion slots', () => {
  it('take header and body children like a Container', () => {
    const slots = (parentType: string) => lintComponentSlots([
      { clientRef: 'acc', name: 'acc', type: parentType },
      { name: 'title', type: 'Text', parentRef: 'acc', slotName: 'header' },
      { name: 'detail', type: 'Text', parentRef: 'acc', slotName: 'body' },
    ] as never);
    expect(slots('Accordion')).toEqual([]);
    expect(slots('Table').join(' ')).toMatch(/header and body also to Accordion/);
  });
});

describe('Steps with advanced on', () => {
  // Steps.jsx reads advanced ? schema : steps, so a dynamic schema is authored items.
  it('reads its items from schema', () => {
    expect(lintRenderedText({ name: 's', type: 'Steps', properties: { advanced: { value: '{{true}}' }, schema: { value: '{{[{id:1,name:"A"}]}}' }, steps: { value: [] } } } as never)).toEqual([]);
    expect(lintRenderedText({ name: 's', type: 'Steps', properties: { steps: { value: [] } } } as never).join(' ')).toMatch(/placeholder items/);
  });
});
}

// renderedText
{
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
}

// hiddenModalHitTargets
{
describe('hidden modal click interception', () => {
  const modal={id:'modal-id',name:'projectModal',type:'ModalV2',properties:{useDefaultButton:false},layout:{left:32,top:20,width:10,height:40}};
  const button={name:'newProject',type:'Button',layout:{left:32,top:20,width:10,height:40}};
  it('warns about the invisible modal wrapper over a real button', () => {
    expect(lintHiddenModalHitTargets([button,modal])[0]).toMatch(/projectModal.*newProject.*intercept clicks/);
    expect(lintComponents([button,modal]).warnings.join(' ')).toContain('invisible wrapper');
  });
  it('recognizes wrapped static false and both component orders', () => {
    expect(lintHiddenModalHitTargets([{...modal,properties:{useDefaultButton:{value:'{{false}}'}}},button])).toHaveLength(1);
  });
  it('leaves separate footprints, children, display surfaces and visible triggers alone', () => {
    expect(lintHiddenModalHitTargets([modal,{...button,layout:{...button.layout,left:0}}])).toEqual([]);
    expect(lintHiddenModalHitTargets([modal,{...button,parent:'modal-id-body'}])).toEqual([]);
    expect(lintHiddenModalHitTargets([modal,{...button,type:'Text'}])).toEqual([]);
    expect(lintHiddenModalHitTargets([{...modal,properties:{useDefaultButton:true}},button])).toEqual([]);
  });
  it('does not prescribe or rewrite placement', () => {
    const components=[button,modal];const before=structuredClone(components);
    lintHiddenModalHitTargets(components);expect(components).toEqual(before);
  });
});
}

// innerPageBands
{
const html = (name: string, rawHtml: string, top = 16) => ({
  id: name,
  name,
  type: 'Html',
  properties: { rawHtml: { value: rawHtml } },
  layouts: { desktop: { top, left: 2, width: 39, height: 110 } },
});
const darkBand = '<div style="background:#0F172A;color:white;border-radius:12px;padding:18px"><div>Dock door board</div></div>';
const gradientBand = '<div style="height:100%;background:linear-gradient(105deg,#1F2937 0%,#5B4634 100%);color:#FAF9F7">Title</div>';
const brandBand = '<div style="background:var(--cc-primary-brand);color:#fff">Title</div>';
const masthead = '<div style="background:var(--cc-surface2-surface);border:1px solid var(--cc-default-border)">Title</div>';
const lightCardWithBadge = '<div style="background:#FBF8F2;padding:16px"><span style="background:#27231F;color:#fff">4</span></div>';

const summary = (pages: AppSummary['pages'], app_id = 'app-1'): AppSummary => ({ app_id, pages, queries: [], events: [] });

describe('htmlRootHasDarkBackground', () => {
  it('recognises flat dark, gradient and brand-filled roots', () => {
    expect(htmlRootHasDarkBackground(darkBand)).toBe(true);
    expect(htmlRootHasDarkBackground(gradientBand)).toBe(true);
    expect(htmlRootHasDarkBackground(brandBand)).toBe(true);
  });
  it('ignores light roots, token surfaces and dark children', () => {
    expect(htmlRootHasDarkBackground(masthead)).toBe(false);
    expect(htmlRootHasDarkBackground(lightCardWithBadge)).toBe(false);
    expect(htmlRootHasDarkBackground('<div>no style</div>')).toBe(false);
  });
});

describe('lintInnerPageBands', () => {
  it('warns for a dark band at the top of a non-home page and not for the home page', () => {
    const warnings = lintInnerPageBands(
      summary([
        { id: 'p1', name: 'Today', handle: 'home', components: [html('homeBand', darkBand)] },
        { id: 'p2', name: 'Dock Board', handle: 'dock-board', components: [html('dockHeader', darkBand)] },
        { id: 'p3', name: 'Exceptions', handle: 'exceptions', components: [html('exHeader', masthead)] },
      ] as AppSummary['pages'])
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Page "Dock Board": Html "dockHeader" is a dark or brand-filled header band');
  });
  it('treats the first planned page as home when no page is marked', () => {
    const warnings = lintInnerPageBands(
      summary(
        [
          { id: 'p1', name: 'Today Inbound', components: [html('band', darkBand)] },
          { id: 'p2', name: 'Dock Board', components: [html('band2', gradientBand)] },
        ] as AppSummary['pages'],
        'planned-app'
      )
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Dock Board');
  });
  it('ignores dark blocks lower on the page, nested blocks and narrow blocks', () => {
    const lower = html('panel', darkBand, 400);
    const nested = { ...html('child', darkBand), parent: 'container-1' };
    const narrow = { ...html('tile', darkBand), layouts: { desktop: { top: 16, left: 2, width: 12, height: 110 } } };
    const warnings = lintInnerPageBands(
      summary([
        { id: 'p1', name: 'Home', components: [] },
        { id: 'p2', name: 'Inner', components: [lower, nested, narrow] },
      ] as AppSummary['pages'])
    );
    expect(warnings).toEqual([]);
  });
});
}

// formSubmitButton
{
// ToolJet's Form submits when the Button whose component id is buttonToSubmit is clicked (Form.jsx). A plan cannot
// know that id before apply, so it names the Button by its client_ref and createComponents resolves it; lint makes
// sure the name is a Button inside that Form.
describe('lint of a Form button to submit', () => {
  const form = (buttonToSubmit: unknown) => ({ name: 'f', type: 'Form', clientRef: 'f', properties: { buttonToSubmit: { value: buttonToSubmit } } });
  const button = (name: string, parentRef?: string, slotName?: string) =>
    ({ name, type: 'Button', clientRef: name, parentRef, slotName, properties: {} });
  const submitErrors = (components: unknown[]) => lintComponents(components as never).errors.filter((e) => /buttonToSubmit/.test(e));

  it('accepts a Button in the form, by client_ref, in its body, header or footer', () => {
    expect(submitErrors([form('go'), button('go', 'f')])).toEqual([]);
    expect(submitErrors([form('go'), button('go', 'f', 'footer')])).toEqual([]);
    expect(submitErrors([form('go'), button('go', 'f', 'header')])).toEqual([]);
  });
  it('accepts a persisted parent written as the form id with its slot suffix', () => {
    const persisted = { id: 'form-id', name: 'f', type: 'Form', properties: { buttonToSubmit: { value: 'go' } } };
    expect(submitErrors([persisted, { name: 'go', type: 'Button', parent: 'form-id-footer', properties: {} }])).toEqual([]);
  });
  it('accepts an existing Button id, a binding and "none", and a form without the property', () => {
    expect(submitErrors([form('0b6b1c8e-7d0e-4a57-9d0c-2f8a1d3c4b5e')])).toEqual([]);
    expect(submitErrors([form('{{components.x.id}}')])).toEqual([]);
    expect(submitErrors([form('none')])).toEqual([]);
    expect(submitErrors([{ name: 'f', type: 'Form', properties: {} }])).toEqual([]);
  });
  it('refuses a name that is not a Button inside that form', () => {
    expect(submitErrors([form('go'), button('go')]).join(' ')).toMatch(/must name a Button inside this Form/);
    expect(submitErrors([form('nope')])).toHaveLength(1);
    expect(submitErrors([form('go'), { name: 'go', type: 'Text', clientRef: 'go', parentRef: 'f', properties: {} }])).toHaveLength(1);
    expect(submitErrors([form('go'), button('go', 'otherForm')])).toHaveLength(1);
  });
  it('does not also report the catalog allowed values for buttonToSubmit', () => {
    const errors = lintComponents([form('go'), button('go', 'f', 'footer')] as never).errors;
    expect(errors.join(' ')).not.toMatch(/buttonToSubmit/);
  });
});

// lintPlannedApp takes the plan as lint_app_spec maps it (camelCase refs).
describe('a plan with a Form that submits through its footer Button', () => {
  it('lints clean', () => {
    const result = lintPlannedApp({
      pages: [{ name: 'Shipments', icon: 'IconTruck', components: [
        { clientRef: 'f', name: 'newShipment', type: 'Form', properties: { buttonToSubmit: 'submitShipment', showHeader: false }, layout: { top: 10, left: 1, width: 20, height: 300 } },
        { clientRef: 'recipient', name: 'recipient', type: 'TextInput', parentRef: 'f', properties: { label: 'Recipient' }, styles: { alignment: 'top' }, layout: { top: 10, left: 1, width: 30, height: 40 } },
        { clientRef: 'submitShipment', name: 'submitShipment', type: 'Button', parentRef: 'f', slotName: 'footer', properties: { text: 'Create' }, layout: { top: 5, left: 30, width: 10, height: 40 } },
      ] }],
    } as never);
    expect(result.errors.filter((e) => /buttonToSubmit|allowed/i.test(e))).toEqual([]);
  });
  it('is refused when buttonToSubmit names a Button outside the Form', () => {
    const result = lintPlannedApp({
      pages: [{ name: 'Shipments', icon: 'IconTruck', components: [
        { clientRef: 'f', name: 'newShipment', type: 'Form', properties: { buttonToSubmit: 'submitShipment' }, layout: { top: 10, left: 1, width: 20, height: 300 } },
        { clientRef: 'submitShipment', name: 'submitShipment', type: 'Button', properties: { text: 'Create' }, layout: { top: 320, left: 1, width: 10, height: 40 } },
      ] }],
    } as never);
    expect(result.errors.join(' ')).toMatch(/buttonToSubmit "submitShipment" must name a Button inside this Form/);
  });
});
}

// tableProjectionRender
{
const table = (properties: string, map = '.map', type = 'html'): LintComponent => ({
  type: 'Table', name: 'preview',
  properties: {
    data: { value: '{{queries.rows.data' + map + '(r => ({' + properties + '}))}}' },
    columns: { value: [{ key: 'status', name: 'Status', columnType: type, columnSize: 150 }] },
  },
});
const result = (spec: LintComponent) => {
  const warnings: string[] = [];
  return { errors: lintTableProjectionRender(spec, warnings), warnings };
};

describe('AST-based Table projection render checks', () => {
  it.each([
    "title: r.first + ' ' + r.last, sub: r.note || r.status + ' (' + r.code + ')'",
    "title: r.first + ' ' + r.last, score: r.score || r.base + 1",
    "score: r.score || r.base + 1, title: r.first + ' ' + r.last",
    "score: r.score || (r.base + 1)",
    "status: r.title || r.first + ' ' + r.last",
    "status: r.amount + 1 || r.base + 2",
    "status: '<span>Ready</span>' || '<span>' + r.state + '</span>'",
    "status: '<span>Ready</span>' || ('<span style=' || 'x' + '>')",
    "status: true ? '<span>Ready</span>' : ('<span style=' || 'x' + '>')",
    "status: false ? ('<span style=' || 'x' + '>') : '<span>Ready</span>'",
    "status: '<span style=\"color:' + (colors[r.state] || '#EEE') + '\">' + r.state + '</span>'",
    "status: ('<span style=\"color:' + colors[r.state] || '#EEE') + '\">' + r.state + '</span>'",
    "status: '<span style=\"color:' + (colors[r.state] || r.defaultColor + '') + '\">'",
    "status: 'literal + lookup || fallback + text'",
    "status: /a\\|\\|b/.test(r.name) || r.first + r.last",
    "title: 'a,b:(' + r.last, status: r.note /* + fake */ || r.base + 1",
  ])('allows valid expressions: %s', (properties) => {
    const spec = table(properties);
    expect(result(spec)).toEqual({ errors: [], warnings: [] });
    expect(lintComponents([spec]).errors.filter((e) => e.includes('projection renders broken markup'))).toEqual([]);
  });

  it.each(['.map', '.map ', '["map"]', '?.map'])('blocks statically broken HTML through %s', (map) => {
    const spec = table("status: '<span style=\"color:' + {ok:'red'}['ok'] || 'blue' + '\">' + r.state + '</span>'", map);
    expect(result(spec).errors).toHaveLength(1);
    expect(lintComponents([spec]).errors).toContain(result(spec).errors[0]);
  });

  it('recognizes split literals, quoted keys, and > inside an attribute', () => {
    const spec = table("'status': '<' + 'span title=\"a > b\" style=\"color:' + 'red' || 'blue' + '\">'");
    expect(result(spec).errors[0]).toContain('column "status"');
  });

  it('finds broken literal HTML in conditional branches', () => {
    expect(result(table("status: r.active ? '<span style=\"color:' + 'red' || 'blue' + '\">' : '<span>Inactive</span>'")).errors).toHaveLength(1);
  });

  it.each([
    "status: '<span style=\"color:' + colors[r.state] || 'red' + '\">'",
    "status: '<span style=\"color:rgb(' + colors[r.state] || '0,0,0' + ')\">'",
    "status: '<span style=\"color:' + {'Open':'red'}[r.state] || 'blue' + '\">'",
    "status: '<span style=\"color:' + unknown() || 'blue' + '\">'",
    "status: '<span style=\"color:' + ({get ok(){throw new Error('must not execute')}}).ok || 'blue' + '\">'",
    "status: '<span style=\"color:' + ({__proto__:r.palette}).ok || 'blue' + '\">'",
  ])('warns, rather than blocking, when runtime values are unknown: %s', (properties) => {
    const spec = table(properties);
    expect(result(spec).errors).toEqual([]);
    expect(result(spec).warnings).toHaveLength(1);
    expect(lintComponents([spec]).warnings).toContain(result(spec).warnings[0]);
  });

  it('does not assume generated values are HTML when column rendering is not known', () => {
    expect(result(table("status: '<span ' + 'title=' || 'other' + '>'", '.map', 'string')).errors).toEqual([]);
  });

  it('keeps reports local to the correct property and deduplicates chained fallbacks', () => {
    const spec = table("title:r.first + r.last, status:'<span ' + 'title=' || 'blue' + ';color:' || 'red' + '>', score:r.score || r.base + 1");
    expect(result(spec).errors).toHaveLength(1);
    expect(result(spec).errors[0]).toContain('column "status"');
    expect(result(spec).warnings).toEqual([]);
  });

  it('does not execute bindings or inspect strings pretending to be map calls', () => {
    const spec = table("status: '<span ' + (() => { globalThis.__projectionProbe = true; return 'x'; })() || 'y' + '>'");
    const state = globalThis as any;
    delete state.__projectionProbe;
    expect(result(spec).errors).toEqual([]);
    expect(state.__projectionProbe).toBeUndefined();
    expect(result({ type:'Table', properties:{data:{value:"{{'rows.map(r => ({status: a + b || c + d}))'}}"}} })).toEqual({errors:[],warnings:[]});
  });

  it('leaves parse errors to the syntax validator', () => {
    expect(result({ type:'Table', properties:{data:{value:'{{rows.map(}}'}} })).toEqual({errors:[],warnings:[]});
  });

  it('does not block intermediate values that a later projection can replace', () => {
    const spec = table("status:'<span ' + r.title || 'x' + '>'");
    spec.properties!.data = { value: "{{queries.rows.data.map(r => ({status:'<span ' + 'title=' || 'x' + '>'})).map(r => ({status:'<span ' + r.title || 'x' + '>'}))}}" };
    expect(result(spec).errors).toEqual([]);
    expect(result(spec).warnings).toHaveLength(1);
  });

  it('uses the last duplicate property, not the overwritten value', () => {
    expect(result(table("status:'<span title=' || 'x>', status:'<span>Ready</span>'")))
      .toEqual({errors:[], warnings:[]});
    expect(result(table("status:'<span>Ready</span>', status:'<span title=' || 'x>'")).errors).toHaveLength(1);
  });

  it('does not block a value that a later spread can override', () => {
    expect(result(table("status:'<span title=' || 'x>', ...r")).errors).toEqual([]);
    expect(result(table("...r, status:'<span title=' || 'x>'")).errors).toHaveLength(1);
  });

  it('warns on a replaced intermediate map but still blocks a broken final map', () => {
    const spec = table("status:'<span>Ready</span>'");
    spec.properties!.data = {value:"{{rows.map(r => ({status:'<span title=' || 'x>'})).map(r => ({status:'<span>Ready</span>'}))}}"};
    expect(result(spec).errors).toEqual([]);
    spec.properties!.data = {value:"{{rows.map(r => ({status:'<span>Ready</span>'})).map(r => ({status:'<span title=' || 'x>'}))}}"};
    expect(result(spec).errors).toHaveLength(1);
  });
});
}

// widgetContracts
{
// Widget traps found in ToolJet's frontend source (2026-09-26): a plan can break these widgets silently, so the linter
// refuses them. The store unwraps a wrapped option flag only when it is falsy
// (componentsSlice: `if (keyValue?.value) keys.push('value')`), so a static {value: true} stays an object and a widget
// comparing `=== true` never sees it.
const at = (height: number, width = 20) => ({ layouts: { desktop: { top: 0, left: 1, width, height } } });
const errors = (c: Record<string, unknown>) => lintComponents([{ name: 'w', ...at(200), ...c } as never]).errors.join(' ');

describe('widget contracts in the linter', () => {
  it('RadioButton: a static preselection never shows', () => {
    const options = [{ label: 'Low', value: 'low', default: { value: true }, visible: { value: true }, disable: { value: false } }];
    expect(errors({ type: 'RadioButtonV2', properties: { advanced: { value: '{{false}}' }, options: { value: options } } })).toMatch(/preselect[\s\S]*schema/);
    expect(errors({ type: 'RadioButtonV2', properties: { advanced: { value: '{{true}}' }, schema: { value: '{{[{label:"Low",value:"low",default:true,visible:true}]}}' } } })).not.toMatch(/preselect/);
  });
  it('TreeSelect: wrapped flags in nested static options', () => {
    const options = [{ label: 'Europe', value: 'eu', children: [{ label: 'France', value: 'fr', visible: { value: false } }] }];
    expect(errors({ type: 'TreeSelect', properties: { options: { value: options } } })).toMatch(/TreeSelect[\s\S]*plain/);
  });
  it('Timer: a countdown from zero', () => {
    expect(errors({ type: 'Timer', properties: { type: { value: 'countDown' }, value: { value: '00:00:00:000' } } })).toMatch(/countDown/);
  });
  it('Pagination: a page count written as text', () => {
    expect(errors({ type: 'Pagination', properties: { numberOfPages: { value: '5' } } })).toMatch(/numberOfPages/);
    expect(errors({ type: 'Pagination', properties: { numberOfPages: { value: '{{5}}' } } })).not.toMatch(/numberOfPages/);
  });
  it('RangeSlider: enableTwoHandle is a mode name, not a boolean', () => {
    expect(errors({ type: 'RangeSliderV2', properties: { enableTwoHandle: { value: '{{true}}' } } })).toMatch(/rangeSlider/);
  });
  it('Navigation: an item written visible true is hidden', () => {
    const items = [{ id: 'a', label: 'Overview', visible: { value: true } }];
    expect(errors({ type: 'Navigation', properties: { menuItems: { value: items } } })).toMatch(/Navigation[\s\S]*\{\{false\}\}/);
    expect(errors({ type: 'Navigation', properties: { menuItems: { value: [{ id: 'a', label: 'Overview', visible: { value: '{{false}}' } }] } } })).not.toMatch(/Navigation/);
  });
  it('device and file widgets below their height', () => {
    expect(lintComponents([{ name: 'q', type: 'QrScanner', ...at(170, 20) } as never]).errors.join(' ')).toMatch(/QrScanner[\s\S]*height/);
    expect(lintComponents([{ name: 'c', type: 'Camera', ...at(170, 30) } as never]).errors.join(' ')).toMatch(/Camera[\s\S]*height/);
    expect(lintComponents([{ name: 'f', type: 'FilePicker', ...at(90, 20) } as never]).errors.join(' ')).toMatch(/FilePicker[\s\S]*height/);
  });
});

describe('QrScanner onDetect in a plan', () => {
  const plan = (action: Record<string, unknown>) => lintPlannedApp({
    app_id: 'a', version_id: 'v',
    pages: [{ clientRef: 'p', name: 'P', icon: 'IconHome', components: [{ name: 'scan', clientRef: 'scan', type: 'QrScanner', ...at(560, 20) }] }],
    events: [{ sourceRef: 'scan', sourceType: 'component', trigger: 'onDetect', action }],
  } as never);
  it('needs a debounce, or it reads the previous scan', () => {
    expect(plan({ actionId: 'set-custom-variable', key: 'code', value: '{{components.scan.lastDetectedValue}}' }).errors.join(' ')).toMatch(/debounce/);
    expect(plan({ actionId: 'set-custom-variable', key: 'code', value: '{{components.scan.lastDetectedValue}}', debounce: '300' }).errors.join(' ')).not.toMatch(/debounce/);
  });
});
}

// multiselectStateContract
{
const component = { id: 'stage', name: 'stageFilter', type: 'MultiselectV2' };
const components = [component];
const aliasErrors = (errors: string[]) => errors.filter(e => e.includes('MultiselectV2 "stageFilter" does not expose value.'));
// A personal filter over a multiselect, with no trace dependency or query execution.
const filter = '{{ (queries.deals.data || []).filter(r => { const chosen = components.stageFilter?.value || ["Proposal","Negotiation"]; return chosen.includes("All stages") || chosen.includes(r.stage); }) }}';

describe('MultiselectV2 typed selection reads', () => {
  it.each([
    '{{ components.stageFilter.value }}',
    '{{ components.stageFilter?.value }}',
    '{{ components?.stageFilter?.value ?? [] }}',
    '{{ components["stageFilter"]["value"] }}',
    '{{ components?.["stageFilter"]?.["value"] || [] }}',
    filter,
  ])('rejects a proven singular read, including fallback masking: %s', value => {
    const errors = lintComponentStateBindings(value, components, 'Component "deals".data');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Component "deals".data: MultiselectV2 "stageFilter" does not expose value.');
    expect(errors[0]).toContain('components.stageFilter.values');
    expect(errors[0]).toContain('fallback');
  });

  it('reports the exact Table binding through app validation without changing the plan', () => {
    const app: AppSummary = {
      app_id: 'offline', pages: [{ id: 'p', components: [component,
        { id: 't', name: 'deals', type: 'Table', properties: { data: { value: filter } } },
      ] }], queries: [{ id: 'q', name: 'deals' }], events: [],
    };
    const before = JSON.stringify(app);
    expect(aliasErrors(validateAppStructure(app).errors)).toEqual([
      expect.stringContaining('Component "deals".p.data.value:'),
    ]);
    expect(JSON.stringify(app)).toBe(before);
    const corrected = JSON.parse(before.replace('stageFilter?.value', 'stageFilter?.values')) as AppSummary;
    expect(aliasErrors(validateAppStructure(corrected).errors)).toEqual([]);
  });

  it('covers query bindings, RunJS, and event actions through their existing validators', () => {
    const app: AppSummary = {
      app_id: 'offline', pages: [{ id: 'p', components }], events: [],
      queries: [{ id: 'q', name: 'filtered', options: {
        code: 'return components.stageFilter?.value ?? [];',
        query: '{{ components.stageFilter.value }}',
      } }],
    };
    expect(aliasErrors(validateAppStructure(app).errors)).toHaveLength(2);
    const event = { sourceType: 'component' as const, sourceId: 'stage', trigger: 'onSelect',
      action: { actionId: 'set-custom-variable', key: 'stages', value: '{{ components.stageFilter?.value ?? [] }}' } };
    const before = JSON.stringify(event);
    expect(aliasErrors(validateEvents(app, [event]).errors)).toHaveLength(1);
    expect(JSON.stringify(event)).toBe(before);
    event.action.value = '{{ components.stageFilter?.values ?? [] }}';
    expect(validateEvents(app, [event]).errors).toEqual([]);
  });

  it('deduplicates repeated reads within a binding but retains separate source paths', () => {
    const value = '{{ components.stageFilter.value || components.stageFilter?.value }}';
    expect(lintComponentStateBindings(value, components, 'x')).toHaveLength(1);
    expect(lintComponentStateBindings({ first: value, second: [value] }, components, 'x'))
      .toEqual([expect.stringContaining('x.first:'), expect.stringContaining('x.second[0]:')]);
  });

  it.each([
    '{{ components.stageFilter.values }}',
    '{{ components.stageFilter?.["values"] ?? [] }}',
    '{{ components.stageFilter.selectedOptions.map(option => option.value) }}',
    '{{ components.stageFilter.options[0].value }}',
    '{{ components.stageFilter.values[0].value }}',
    '{{ queries.deals.data[0].value }}',
    '{{ components.stageFilter.futureField }}',
    '{{ components[variables.componentName].value }}',
    '{{ components.stageFilter[variables.propertyName] }}',
    '{{ "components.stageFilter.value" }}',
    '{{ /* components.stageFilter.value */ [] }}',
    '{{ ((components) => components.stageFilter.value)({}) }}',
    '{{ (({ components }) => components.stageFilter.value)({}) }}',
    '{{ (() => { const components = {}; return components.stageFilter.value; })() }}',
    '{{ (() => { try { throw {}; } catch (components) { return components.stageFilter.value; } })() }}',
    'Example: components.stageFilter.value',
    '{{ invalid syntax',
  ])('preserves valid, nested, shadowed or unknown reads: %s', value => {
    expect(lintComponentStateBindings(value, components, 'x')).toEqual([]);
  });

  it.each(['DropdownV2', 'TextInput', 'RadioButtonV2', 'DatePickerV2', 'CustomComponent', undefined])(
    'does not impose the plural property on %s', type => {
      expect(lintComponentStateBindings('{{ components.stageFilter.value }}', [{ name: 'stageFilter', type }], 'x')).toEqual([]);
    });

  it('preserves unknown components and shadowed scripts, not a global property allowlist', () => {
    expect(lintComponentStateBindings('{{ components.missing.value }}', components, 'x')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'const components = {}; return components.stageFilter.value;' }, components, 'q')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'return components.stageFilter.values;' }, components, 'q')).toEqual([]);
  });
});

describe('Multiselect catalog and generated skill contracts', () => {
  it('serves the contract through selective catalog requests without a live client', async () => {
    const result = await getComponentCatalogTool(undefined as any).handler({
      types: ['MultiselectV2'], sections: ['properties', 'exposedVariables'], property_keys: ['values', 'schema', 'value'],
    });
    expect(result.isError).not.toBe(true);
    const contract = JSON.parse(result.content[0].text).components[0];
    expect(contract.properties.map((p: any) => p.key).sort()).toEqual(['schema', 'value', 'values']);
    expect(contract.properties.find((p: any) => p.key === 'values').description).toContain('advanced=false');
    expect(contract.exposedVariables.map((v: any) => v.name)).toContain('values');
    expect(contract.exposedVariables.map((v: any) => v.name)).not.toContain('value');
  });

  it('advertises the runtime fields without a singular exposed alias', () => {
    const schema = getComponentSchema('MultiselectV2')!;
    const exposed = schema.exposedVariables!;
    expect(exposed.filter(v => v.name === 'values')).toEqual([
      expect.objectContaining({ name: 'values', valueType: 'array', semantics: expect.stringContaining('before onSelect') }),
    ]);
    expect(exposed.map(v => v.name)).toEqual(expect.arrayContaining(['values', 'selectedOptions', 'options', 'searchText']));
    expect(exposed.map(v => v.name)).not.toContain('value');
    expect(schema.properties.find(p => p.key === 'values')?.description).toMatch(/static.*advanced=false.*array/i);
    expect(schema.properties.find(p => p.key === 'schema')?.description).toMatch(/advanced=true.*visible.*default/i);
    expect(schema.properties.find(p => p.key === 'value')?.description).toMatch(/not.*runtime.*values/i);
  });

  it.each(['skill', 'skills/tooljet-app-builder'])('corrects only the per-type guidance in %s', host => {
    const read = (name: string) => readFileSync(new URL(`../${host}/references/${name}`, import.meta.url), 'utf8');
    const rules = JSON.parse(readFileSync(new URL('../data/component-binding-rules.json', import.meta.url), 'utf8'));
    const rule = rules.MultiselectV2;
    expect(rule).toContain('.values');
    expect(rule).toContain('.selectedOptions');
    expect(rule).not.toContain('there is no `.values`');
    const specific = read('components.md').split('### MultiselectV2\n')[1].split('\n### ')[0];
    expect(specific).toContain(rule);
    for (const file of ['forms.md', 'ui-layout.md', 'workflows.md']) {
      const doc = read(file);
      expect(doc).toContain('MultiselectV2');
      expect(doc).toContain('?.values');
      expect(doc).not.toContain('reference every filter as `components.<filter>?.value`');
      expect(doc).not.toContain('Read values from `components.<name>.value`');
    }
    // Generated Form option schema and scalar controls retain their distinct contracts.
    expect(read('forms.md')).toContain('Dropdown and multiselect fields use `values` plus `displayValues`');
    expect(read('components.md')).toContain('CURRENT SELECTION is `.value`');
  });
});

// Main-approved adjacent correction: only the stale RadioButtonV2 guidance, not its runtime/linter/catalog.
// RadioButtonV2.jsx:88–95 publishes value; :124 and :163–165 expose label as the field caption.
describe('RadioButtonV2 guidance agrees with the existing typed contract', () => {
  it.each(['skill', 'skills/tooljet-app-builder'])('publishes the corrected maintained rule in %s', host => {
    const rules = JSON.parse(readFileSync(new URL('../data/component-binding-rules.json', import.meta.url), 'utf8'));
    const rule = rules.RadioButtonV2;
    expect(rule).toContain('components.<name>?.value');
    expect(rule).toContain('caption');
    expect(rule).not.toContain('NO `.value`');
    const doc = readFileSync(new URL(`../${host}/references/components.md`, import.meta.url), 'utf8');
    expect(doc.split('### RadioButtonV2\n')[1].split('\n### ')[0]).toContain(rule);
    expect(getComponentSchema('RadioButtonV2')!.exposedVariables!.map(v => v.name)).toContain('value');
    const radios = [{ name: 'choice', type: 'RadioButtonV2' }];
    expect(lintComponentStateBindings('{{ components.choice?.value }}', radios, 'x')).toEqual([]);
    expect(lintComponentStateBindings('{{ components.choice?.label }}', radios, 'x'))
      .toEqual([expect.stringContaining('caption')]);
  });
});
}

// componentNames
{
const context = { app_id: 'dispatch-app', version_id: 'version-2', page_id: 'dispatch-page' };
const container = (name: unknown) => ({
  name, type: 'Container', properties: {}, layout: { top: 0, left: 2, width: 39, height: 420 },
});
const existing = { id: 'panel-1', ...container('shipmentDetails') };

function mockClient(components: unknown[] = []) {
  return {
    getAppSummary: vi.fn().mockResolvedValue({
      app_id: context.app_id, version_id: context.version_id,
      pages: [{ id: context.page_id, components }], queries: [], events: [],
    }),
    createComponent: vi.fn().mockResolvedValue({ component_id: 'created-1' }),
    createComponents: vi.fn().mockResolvedValue([{ component_id: 'created-1' }]),
    updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    updateLayouts: vi.fn(),
  };
}

function authoringInputs(client: ToolJetClient, name: unknown) {
  return [
    { tool: addComponentTool(client), args: { ...context, ...container(name) } },
    { tool: addComponentsTool(client), args: { ...context, components: [container(name)] } },
    { tool: addComponentBatchesTool(client), args: { ...context, pages: [
      { page_id: context.page_id, components: [container('dispatchSummary')] },
      { page_id: 'archive-page', components: [container(name)] },
    ] } },
    { tool: updateComponentsTool(client), args: { ...context, updates: [{ component_id: existing.id, name }] } },
    { tool: lintAppSpecTool(client), args: { pages: [{ name: 'Dispatch board', icon: 'IconHome', components: [container(name)] }] } },
  ];
}

describe('component names match App Builder', () => {
  it.each([
    '', ' ', 'Shipment drawer', 'drawer ', ' drawer', 'shipment\tdrawer', 'shipment\ndrawer',
    'drawer\n', 'drawer\r\n', 'drawer\f', 'drawer\u00a0', 'drawer\u200b', 'shipment.drawer',
    'shipment/drawer', 'drawer#1', 'drawer$1', 'café', 'drawer🚚', 'drawer\0',
  ])('rejects %j in every authoring schema', (name) => {
    for (const { tool, args } of authoringInputs({} as ToolJetClient, name)) {
      const parsed = z.object(tool.inputSchema).safeParse(args);
      expect(parsed.success, tool.name).toBe(false);
      if (!parsed.success) expect(parsed.error.issues.map(issue => issue.message).join(' ')).toMatch(/Component names.*letters.*hyphens/);
    }
  });

  it.each(['drawer', 'shipmentDetails', 'Shipment_2', 'shipment-detail', '9shipments', '9', '_', '-'])('accepts %j unchanged in every authoring schema', (name) => {
    for (const { tool, args } of authoringInputs({} as ToolJetClient, name)) {
      expect(z.object(tool.inputSchema).safeParse(args).success, tool.name).toBe(true);
    }
  });

  it.each([undefined, null, 123])('requires a string name on creation (%j)', (name) => {
    for (const { tool, args } of authoringInputs({} as ToolJetClient, name).filter(({ tool }) => tool.name !== 'update_components')) {
      expect(z.object(tool.inputSchema).safeParse(args).success, tool.name).toBe(false);
    }
  });

  it('keeps the name pattern in the model-facing JSON schema', () => {
    const schema = z.toJSONSchema(z.object(addComponentTool({} as ToolJetClient).inputSchema));
    expect(schema.properties?.name).toMatchObject({ pattern: '^[A-Za-z0-9_-]+$' });
  });

  it('refuses unsafe names before any write even when a handler is called directly', async () => {
    const mock = mockClient([existing]);
    for (const { tool, args } of authoringInputs(mock as unknown as ToolJetClient, 'Shipment drawer')) {
      const result = await tool.handler(args);
      expect(result.content[0]!.text, tool.name).toContain('Invalid component name');
      if (tool.name === 'lint_app_spec') {
        const body = JSON.parse(result.content[0]!.text);
        expect(body.ok).toBe(false);
        expect(body.plan_token).toBeUndefined();
      } else {
        expect(result.isError, tool.name).toBe(true);
      }
    }
    expect(mock.createComponent).not.toHaveBeenCalled();
    expect(mock.createComponents).not.toHaveBeenCalled();
    expect(mock.updateComponents).not.toHaveBeenCalled();
    expect(mock.updateLayouts).not.toHaveBeenCalled();
  });

  it('refuses a mixed create batch atomically, without silently sanitizing names', async () => {
    const mock = mockClient();
    const components = [container('dispatchSummary'), { ...container('Shipment drawer'), layout: { top: 460, left: 2, width: 39, height: 420 } }];
    const before = structuredClone(components);
    const result = await addComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, components });
    expect(result.isError).toBe(true);
    expect(mock.createComponents).not.toHaveBeenCalled();
    expect(components).toEqual(before);
  });

  it('rejects the entire update batch when a later rename is invalid', async () => {
    const mock = mockClient([existing, { ...existing, id: 'panel-2', name: 'dispatchSummary' }]);
    const result = await updateComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, updates: [
      { component_id: existing.id, definition: { properties: { visibility: true } } },
      { component_id: 'panel-2', name: 'Shipment drawer' },
    ] });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Nothing was saved');
    expect(mock.updateComponents).not.toHaveBeenCalled();
    expect(mock.updateLayouts).not.toHaveBeenCalled();
  });

  it('allows definition repairs and safe renames of legacy components with invalid names', async () => {
    const mock = mockClient([{ ...existing, name: 'Shipment drawer' }]);
    const tool = updateComponentsTool(mock as unknown as ToolJetClient);
    for (const patch of [{ definition: { properties: { visibility: true } } }, { name: 'shipmentDetails' }]) {
      const result = await tool.handler({ ...context, updates: [{ component_id: existing.id, ...patch }] });
      expect(result.isError).not.toBe(true);
    }
    expect(mock.updateComponents).toHaveBeenCalledTimes(2);
    expect(mock.updateComponents).toHaveBeenLastCalledWith(expect.objectContaining({
      updates: [expect.objectContaining({ componentId: existing.id, name: 'shipmentDetails' })],
    }));
  });

  it('persists the safe single-token drawer name and leaves readable text alone', async () => {
    const mock = mockClient();
    const result = await addComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, components: [
      { ...container('drawer'), client_ref: 'panel' },
      { name: 'shipmentTitle', type: 'Text', parent_ref: 'panel', properties: { text: 'Shipment activity' },
        layout: { top: 16, left: 2, width: 39, height: 40 } },
    ] });
    expect(result.isError).not.toBe(true);
    expect(mock.createComponents).toHaveBeenCalledWith(expect.objectContaining({ components: [
      expect.objectContaining({ name: 'drawer' }),
      expect.objectContaining({ name: 'shipmentTitle', properties: expect.objectContaining({ text: { value: 'Shipment activity' } }) }),
    ] }));
  });
});
}
