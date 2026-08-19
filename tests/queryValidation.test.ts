import { describe, expect, it } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';

describe('validateQueryOptions', () => {
  it('accepts the ToolJet OpenAI wrapper shape and returns the operation', () => {
    const result = validateQueryOptions('openai', {
      operation: 'chat',
      model: 'gpt-4o-mini',
      prompt: 'Summarize this ticket',
      max_tokens: 200,
    });
    expect(result.operation).toBe('chat');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('accepts a dynamic datasource selector and validates fields common to every runtime variant', () => {
    const result = validateQueryOptions('openai', {
      operation: 'chat',
      model: '{{components.model.value}}',
      prompt: 'Summarize this ticket',
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'runtime_selector_binding', path: 'model' }),
    ]));
  });

  it('blocks missing required wrapper options', () => {
    const result = validateQueryOptions('openai', { operation: 'chat', model: 'gpt-4o-mini' });
    expect(result.errors.map((issue) => issue.code)).toContain('missing_required_option');
    expect(result.errors.map((issue) => issue.path)).toContain('prompt');
  });

  it('warns when upstream API knowledge produces an unknown wrapper key', () => {
    const result = validateQueryOptions('openai', {
      operation: 'chat',
      model: 'gpt-4o-mini',
      prompt: 'hello',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown_option_key', path: 'messages' })])
    );
  });

  it('suggests the cross-cutting camelCase run-on-load key', () => {
    const result = validateQueryOptions('postgresql', {
      mode: 'sql',
      query: 'select 1',
      run_on_page_load: true,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ignored_or_misplaced_option_key', path: 'run_on_page_load' }),
      ])
    );
    expect(result.warnings.map((issue) => issue.message).join(' ')).toMatch(/runOnPageLoad/);
  });

  it('reports invalid operations before any datasource call', () => {
    const result = validateQueryOptions('openai', { operation: 'not-real' });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid_operation', path: 'operation' })])
    );
  });

  it('selects a REST contract from method without inventing an operation option', () => {
    const result = validateQueryOptions('restapi', {
      method: 'get',
      url: '/repos/facebook/react/releases/latest',
      url_params: [['per_page', '3']],
    });

    expect(result.operation).toBe('get');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('does not silently accept the legacy MCP-only REST operation key', () => {
    const result = validateQueryOptions('restapi', {
      operation: 'get',
      method: 'get',
      url: '/repos/facebook/react/releases/latest',
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown_option_key', path: 'operation' }),
    ]));
  });

  it('warns when a ToolJet DB order-filter map key differs from its inner id', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'list_rows',
      table_id: 'table-1',
      list_rows: {
        limit: 25,
        order_filters: {
          'sort-created': { id: 'different-id', column: 'created_at', order: 'desc' },
        },
      },
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'mismatched_record_id',
          path: 'list_rows.order_filters.sort-created.id',
        }),
      ])
    );
    expect(result.warnings.map((issue) => issue.message).join(' ')).toMatch(/silently ignore.*same stable value/i);
  });

  it('accepts a ToolJet DB order filter whose map key matches its inner id', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'list_rows',
      table_id: 'table-1',
      list_rows: {
        limit: 25,
        order_filters: {
          'sort-created': { id: 'sort-created', column: 'created_at', order: 'desc' },
        },
      },
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('warns when a server-side Table offset can become NaN before pageIndex is published', () => {
    const result = validateQueryOptions('postgresql', {
      mode: 'sql',
      query: 'select id, status from orders limit 25 offset {{(components.ordersTable.pageIndex - 1) * 25}}',
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unguarded_table_page_index', path: 'query' }),
    ]));
    expect(result.warnings.map((issue) => issue.message).join(' ')).toMatch(/undefined.*NaN.*pageIndex \|\| 1/i);
  });

  it('accepts a first-load-safe server-side Table offset', () => {
    const result = validateQueryOptions('postgresql', {
      mode: 'sql',
      query: 'select id, status from orders limit 25 offset {{((components.ordersTable.pageIndex || 1) - 1) * 25}}',
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('warns before saving SELECT star or an unbounded row read', () => {
    const star = validateQueryOptions('postgresql', {
      mode: 'sql', query: 'SELECT * FROM orders LIMIT 25',
    });
    expect(star.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'select_star_read', path: 'query' }),
    ]));

    const unbounded = validateQueryOptions('postgresql', {
      mode: 'sql', query: 'SELECT id, status FROM orders',
    });
    expect(unbounded.warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unbounded_read', path: 'query' }),
    ]));
    expect(unbounded.warnings.map((issue) => issue.message).join(' ')).toMatch(
      /Count the same table.*bounded preview.*server-side pagination/i
    );
  });

  it('blocks unbounded or billable reads from running automatically', () => {
    const unbounded = validateQueryOptions('postgresql', {
      mode: 'sql', query: 'SELECT id, status FROM orders', runOnPageLoad: true,
    });
    expect(unbounded.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsafe_automatic_unbounded_read', path: 'runOnPageLoad' }),
    ]));

    const billable = validateQueryOptions('bigquery', {
      query: 'SELECT id FROM dataset.orders LIMIT 25', runOnDependencyChange: true,
    });
    expect(billable.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsafe_automatic_billable_read', path: 'runOnDependencyChange' }),
    ]));
  });

  it('allows a statically bounded non-warehouse read to run on page load', () => {
    const result = validateQueryOptions('postgresql', {
      mode: 'sql', query: 'SELECT id, status FROM orders LIMIT 25', runOnPageLoad: true,
    });
    expect(result.errors).toEqual([]);
  });
});
