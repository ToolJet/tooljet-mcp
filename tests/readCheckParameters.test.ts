import { describe, expect, it, vi } from 'vitest';
import { checkPlanReads, parametersWithoutValue } from '../src/applyReadCheck.js';
import { declaredParameterDefaults, resolveStaticBindings } from '../src/staticBindings.js';

// Third Code mode QA round (2026-11-05): a Code app's queries take {{parameters.x}} with declared defaults, and the
// browser-free resolver never filled them, so every parameter reached ToolJet as undefined. The automatic check said
// "an undefined integer parameter" on paged lists that work in the app, and ran ten detail reads that could only fail.
const page = {
  operation: 'list_rows', table_id: 't1',
  list_rows: { limit: 25, offset: '{{parameters.offset}}', where_filters: {
    0: { column: 'customer', operator: 'ilike', value: '%{{parameters.q}}%' },
    1: { column: 'site_id', operator: '{{parameters.site_id ? "eq" : "neq"}}', value: '{{parameters.site_id || 0}}' },
  } },
  parameters: [{ name: 'offset', defaultValue: '0' }, { name: 'q', defaultValue: '' }, { name: 'site_id', defaultValue: '' }],
};
const detail = {
  operation: 'list_rows', table_id: 't1',
  list_rows: { limit: 1, where_filters: { 0: { column: 'id', operator: 'eq', value: '{{parameters.id}}' } } },
  parameters: [{ name: 'id', defaultValue: '' }],
};

describe('declared parameters in a browser-free run', () => {
  it('resolve to their defaults, as the viewer runs them with no values', () => {
    const { resolved, unresolved } = resolveStaticBindings(page);
    expect(resolved['{{parameters.offset}}']).toBe('0');
    expect(resolved['%{{parameters.q}}%']).toBe('%%');
    expect(resolved['{{parameters.site_id ? "eq" : "neq"}}']).toBe('neq');
    expect(resolved['{{parameters.site_id || 0}}']).toBe(0);
    expect(unresolved).toEqual([]);
  });

  it('leave an undeclared parameter, or one without a default, unresolved', () => {
    const { resolved, unresolved } = resolveStaticBindings({
      value: '{{parameters.missing}}', other: '{{parameters.constructor}}', none: '{{parameters.x}}',
      parameters: [{ name: 'x' }],
    });
    expect(resolved).toEqual({});
    expect(unresolved.sort()).toEqual(['{{parameters.constructor}}', '{{parameters.missing}}', '{{parameters.x}}']);
    expect(declaredParameterDefaults({ parameters: [{ name: 'n', defaultValue: 5 }, { name: 'd', defaultValue: '{{1 + 1}}' }] }))
      .toEqual(Object.assign(Object.create(null), { n: 5, d: 2 }));
  });
});

describe('a one-record read with no value for its parameter', () => {
  it('is named, in a GUI filter, raw SQL or a bound SQL placeholder', () => {
    expect(parametersWithoutValue(detail)).toEqual(['id']);
    expect(parametersWithoutValue({ query: 'SELECT * FROM t WHERE id = {{parameters.id}}', parameters: [{ name: 'id' }] })).toEqual(['id']);
    expect(parametersWithoutValue({ query: 'SELECT * FROM t WHERE id = :id', query_params: [['id', '{{parameters.order}}']],
      parameters: [{ name: 'order', defaultValue: '' }] })).toEqual(['order']);
    expect(parametersWithoutValue(page)).toEqual([]);
    expect(parametersWithoutValue({ ...detail, parameters: [{ name: 'id', defaultValue: '1' }] })).toEqual([]);
  });

  it('is reported as not checked instead of being run', async () => {
    const client = {
      getQueries: vi.fn(async () => [
        { id: 'q-page', name: 'orders_page', kind: 'tooljetdb', options: page },
        { id: 'q-detail', name: 'order_detail', kind: 'tooljetdb', options: detail },
      ]),
      getDevelopmentEnvironmentId: vi.fn(async () => 'env-dev'),
      runQuery: vi.fn(async () => ({ status: 'ok', data: [{ id: 1 }] })),
    };
    const check = await checkPlanReads(client as never, { versionId: 'v1', queryIds: ['q-page', 'q-detail'] });
    expect(client.runQuery).toHaveBeenCalledTimes(1);
    const sent = (client.runQuery.mock.calls[0] as unknown as [{ queryId: string; resolvedOptions: Record<string, unknown> }])[0];
    expect(sent.queryId).toBe('q-page');
    expect(sent.resolvedOptions['{{parameters.offset}}']).toBe('0');
    expect(check!.not_run).toEqual([{ name: 'order_detail', reason: expect.stringMatching(/^not checked: needs a value for parameters\.id/) }]);
    expect(check!.queries).toEqual([
      { name: 'orders_page', status: 'checked', outcome: 'passed' },
      { name: 'order_detail', status: 'skipped', reason: expect.stringContaining('no default') },
    ]);
  });
});
