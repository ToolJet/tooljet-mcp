import { describe, expect, it } from 'vitest';
import { lintRenderedGeometryAdvisory, validateAppStructure } from '../src/lint.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';

// Trace review, 2026-09-24: "Primary Button ... likely outside the initial desktop viewport" started a re-layout tail
// every time it appeared (merch m2 two re-plans; update_components on m8: two 14- and 16-component re-layouts and
// rowsPerPage cut to 4). It is a scroll, not a defect: no tool raises it.
describe('the fold advice', () => {
  it('is not part of the geometry advice the tools report', () => {
    const warnings = lintRenderedGeometryAdvisory([
      { name: 'history', type: 'Table', clientRef: 'history', layout: { top: 100, left: 2, width: 39, height: 900 } },
      { name: 'save', type: 'Button', clientRef: 'save', styles: { type: { value: 'primary' } }, layout: { top: 1020, left: 2, width: 8, height: 40 } },
    ] as never).join(' ');
    expect(warnings).not.toMatch(/outside the initial desktop viewport/);
  });
});

// Merch m9: validate_app failed a clean apply because a table button column's loadingState held
// {{queries.<id>.isLoading && components.<id>...}}. ToolJet saves references by id and shows names on load,
// so an id that belongs to an existing query or component is valid, not a missing name.
describe('validate_app and references saved by id', () => {
  it('accepts a binding that names an existing query or component by id', () => {
    const summary = {
      app_id: 'a', version_id: 'v', events: [],
      queries: [{ id: '36d64e4b-7c35-454c-8d1b-530da234a473', name: 'draftPO', kind: 'tooljetdb', options: {} }],
      pages: [{ id: 'p', name: 'Home', handle: 'home', components: [{
        id: '8be1b657-731b-4dc1-beb5-5ff892314a1a', name: 'stockRisks', type: 'Table',
        properties: { columns: { value: [{ id: 'c', name: 'Act', key: 'act', columnType: 'button', buttons: [{ id: 'b', buttonLabel: 'Draft',
          loadingState: '{{queries["36d64e4b-7c35-454c-8d1b-530da234a473"].isLoading && components["8be1b657-731b-4dc1-beb5-5ff892314a1a"]?.selectedRow}}' }] }] } },
        layouts: { desktop: { top: 0, left: 0, width: 40, height: 400 } },
      }] }],
    };
    const errors = validateAppStructure(summary as never).errors.join(' ');
    expect(errors).not.toMatch(/no query is named|no component is named/);
    const bad = JSON.parse(JSON.stringify(summary));
    bad.pages[0].components[0].properties.columns.value[0].buttons[0].loadingState = '{{queries.draftPo.isLoading}}';
    expect(validateAppStructure(bad as never).errors.join(' ')).toMatch(/no query is named "draftPo"/);
  });
});

// Merch m14 and m16: a table's seed rows split over two entries (each is capped at 40 rows), and the plan
// lint then refused "targets table more than once": three lint rounds before any page. Entries insert one after
// another, so a table may take several.
describe('seed data split across entries', () => {
  it('lints a table seeded by two entries', async () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `r${i}` }));
    const out = await lintAppSpecTool({ listTables: async () => [] } as never).handler({
      tables: [{ table_name: 'mx_hist', columns: [{ name: 'name', type: 'varchar' }] }],
      seed_data: [{ table_name: 'mx_hist', rows: rows(40) }, { table_name: 'mx_hist', rows: rows(12) }],
    } as never);
    const body = JSON.parse(String((out.content[0] as { text?: string }).text));
    expect(body.errors).toEqual([]);
    expect(typeof body.plan_token).toBe('string');
  });
});

// Merch m18: the tables were seeded by hand, then every plan sent the same rows again, and the apply failed on a
// unique key ("ME-001 already exists") after creating ten queries. Seed rows for an existing table that already has
// rows are refused at lint.
describe('seed data for a table that already has rows', () => {
  it('is refused before anything is written', async () => {
    const client = { listTables: async () => [{ id: 't1', table_name: 'mx_products' }, { id: 't2', table_name: 'mx_empty' }], hasRows: async (id: string) => id === 't1' };
    const run = async (table: string) => JSON.parse(String((await lintAppSpecTool(client as never).handler({ seed_data: [{ table_name: table, rows: [{ sku: 'ME-001' }] }] } as never)).content[0]!.text));
    expect(JSON.stringify((await run('mx_products')).errors)).toMatch(/mx_products.*already has rows/);
    expect((await run('mx_empty')).errors ?? []).toEqual([]);
  });
});
