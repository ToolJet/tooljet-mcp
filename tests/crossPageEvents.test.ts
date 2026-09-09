import { describe, expect, it } from 'vitest';
import { validateEvents } from '../src/eventValidation.js';
import type { AppSummary, EventSpec } from '../src/tooljetClient.js';

/** A Sales Performance app built on 2026-09-05 reset Tables on three other pages from its page-load
 *  queries and from Overview buttons; every one failed at runtime with
 *  "exposedValue.setPage is not a function" because the target was not mounted. */
const summary: AppSummary = {
  app_id: 'a',
  pages: [
    { id: 'overview', name: 'Overview', handle: 'home', components: [{ id: 'btn', name: 'openOrders', type: 'Button' }, { id: 'regionTable', name: 'regionTable', type: 'Table' }] },
    { id: 'orders', name: 'Orders', handle: 'orders', components: [{ id: 'ordersTable', name: 'ordersTable', type: 'Table' }, { id: 'statusFilter', name: 'statusFilter', type: 'DropdownV2' }] },
  ],
  queries: [
    { id: 'q_orders', name: 'orderLines', kind: 'tooljetdb', options: { operation: 'list_rows', runOnPageLoad: true } },
    { id: 'q_lazy', name: 'orderDetail', kind: 'tooljetdb', options: { operation: 'list_rows' } },
  ],
  events: [
    { id: 'e1', sourceId: 'orders', target: 'page', event: { eventId: 'onPageLoad', actionId: 'run-query', queryId: 'q_lazy' } },
  ],
};

describe('page-scoped actions across pages', () => {
  it('rejects a set-table-page aimed at a Table on another page from a component', () => {
    const fromOverview: EventSpec = { sourceId: 'btn', sourceType: 'component', trigger: 'onClick', action: { actionId: 'set-table-page', table: 'ordersTable', pageIndex: '{{1}}' } };
    const [error] = validateEvents(summary, [fromOverview]).errors;
    expect(error).toMatch(/targets Table "ordersTable" on page "Orders" from page "Overview"/);
    expect(error).toMatch(/not mounted/);
  });

  it('rejects a success handler of a page-load query that resets a Table on one page', () => {
    const onSuccess: EventSpec = { sourceId: 'q_orders', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'set-table-page', table: 'ordersTable', pageIndex: '{{1}}' } };
    const [error] = validateEvents(summary, [onSuccess]).errors;
    expect(error).toMatch(/query "orderLines" runs on every page load \(runOnPageLoad\)/);
    expect(error).toMatch(/Move the action to page "Orders"/);
  });

  it('accepts the same actions on the page that owns the target, and a query run only from that page', () => {
    const onPage: EventSpec = { sourceId: 'statusFilter', sourceType: 'component', trigger: 'onSelect', action: { actionId: 'set-table-page', table: 'ordersTable', pageIndex: '{{1}}' } };
    const lazySuccess: EventSpec = { sourceId: 'q_lazy', sourceType: 'data_query', trigger: 'onDataQuerySuccess', action: { actionId: 'set-table-page', table: 'ordersTable', pageIndex: '{{1}}' } };
    const pageLoad: EventSpec = { sourceId: 'orders', sourceType: 'page', trigger: 'onPageLoad', action: { actionId: 'control-component', componentId: 'statusFilter', componentSpecificActionHandle: 'clear', componentSpecificActionParams: [] } };
    expect(validateEvents(summary, [onPage, lazySuccess, pageLoad]).errors).toEqual([]);
  });

  it('still allows switching pages and running queries across pages', () => {
    const go: EventSpec = { sourceId: 'btn', sourceType: 'component', trigger: 'onClick', action: { actionId: 'switch-page', pageId: 'orders' } };
    const run: EventSpec = { sourceId: 'btn', sourceType: 'component', trigger: 'onClick', action: { actionId: 'run-query', queryId: 'q_lazy' } };
    expect(validateEvents(summary, [run, go]).errors).toEqual([]);
  });
});
