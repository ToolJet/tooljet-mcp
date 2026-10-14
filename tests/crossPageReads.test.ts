import { describe, expect, it } from 'vitest';
import { lintCrossPageComponentReads } from '../src/appSpecLint.js';

// DeepSeek's invoice app (2026-10-13): allInvoices ran at app start on Summary, its success ran invoiceRows, and
// invoiceRows read components.statusFilter.value from the Invoices page, which was not open: "Cannot read properties
// of undefined (reading 'value')", and opening Invoices never ran it again.
const page = (name: string, components: string[]) => ({ name, icon: 'x', components: components.map((n) => ({ name: n, type: 'ShadSelect' })) });
const base = {
  pages: [page('Summary', ['kpi']), page('Invoices', ['statusFilter', 'invoicesTable'])],
  queries: [
    { name: 'allInvoices', kind: 'tooljetdb', options: { operation: 'list_rows', runOnPageLoad: true } },
    { name: 'invoiceRows', kind: 'runjs', options: { code: "const s = components.statusFilter.value; return (queries.allInvoices.data || []).filter(r => s === 'all' || r.status === s);", runOnPageLoad: false } },
  ],
  events: [{ sourceRef: 'allInvoices', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'run-query', target_ref: 'invoiceRows' } }],
} as any;

describe('lintCrossPageComponentReads', () => {
  it('refuses a query that reads another page\'s component while that page may be closed', () => {
    const errors = lintCrossPageComponentReads(base);
    expect(errors.join(' ')).toMatch(/"invoiceRows" reads components\.statusFilter\.value.*"Invoices".*"allInvoices"/);
    expect(errors.join(' ')).toMatch(/components\.statusFilter\?\.value/);
  });

  it('accepts optional reads, home-page components and queries run from their own page', () => {
    const optional = structuredClone(base);
    optional.queries[1].options.code = "const s = components.statusFilter?.value ?? 'all'; return s;";
    expect(lintCrossPageComponentReads(optional)).toEqual([]);
    const home = structuredClone(base);
    home.pages.reverse();
    expect(lintCrossPageComponentReads(home)).toEqual([]);
    const ownPage = structuredClone(base);
    ownPage.events = [{ sourceRef: 'Invoices', sourceType: 'page', trigger: 'onPageLoad', action: { actionId: 'run-query', target_ref: 'invoiceRows' } }];
    expect(lintCrossPageComponentReads(ownPage)).toEqual([]);
  });

  it('also refuses a startup query and one run from another page\'s component', () => {
    const startup = structuredClone(base);
    startup.events = [];
    startup.queries[1].options.runOnPageLoad = true;
    expect(lintCrossPageComponentReads(startup).join(' ')).toMatch(/at app start/);
    const fromOther = structuredClone(base);
    fromOther.events = [{ sourceRef: 'kpi', sourceType: 'component', trigger: 'onClick', action: { actionId: 'run-query', target_ref: 'invoiceRows' } }];
    expect(lintCrossPageComponentReads(fromOther).join(' ')).toMatch(/from page "Summary"/);
  });
});
