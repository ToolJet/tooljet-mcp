import { describe, expect, it } from 'vitest';
import { normalizeQueryOptions, validateQueryOptions } from '../src/queryValidation.js';

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

  it('rejects object-shaped REST parameters before ToolJet can ignore or mangle them', () => {
    const result = validateQueryOptions('restapi', {
      method: 'get',
      url: '/issues',
      url_params: [{ key: 'state', value: 'open' }],
    });

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_option_shape', path: 'url_params[0]' }),
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

describe('tooljetdb write column maps', () => {
  // Regression: ToolJet reduces create_row / update_rows.columns with
  // Object.values(cols).reduce((acc, c) => ...c.column...), so a flat {column: value} map reduces to
  // an EMPTY body. PostgREST then answers PGRST102 "Empty or invalid json" and the write fails only
  // when a user clicks — after the app has already passed validation.
  it('rejects a flat update_rows column map that would send an empty body', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: {
        columns: { status: 'Approved' },
        where_filters: { 0: { column: 'id', operator: 'eq', value: 28 } },
      },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_write_columns' })])
    );
  });

  it('rejects a flat create_row column map', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'create_row',
      table_id: 't1',
      create_row: { full_name: '{{components.nameInput.value}}' },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_write_columns' })])
    );
  });

  it('accepts the correct {index: {column, value}} shape', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: {
        columns: { 0: { column: 'status', value: 'Approved' } },
        where_filters: { 0: { column: 'id', operator: 'eq', value: 28 } },
      },
    });
    expect(result.errors.filter((e) => e.code === 'malformed_write_columns')).toEqual([]);
  });

  it('normalizes a flat update_rows map into the shape ToolJet reads', () => {
    const normalized = normalizeQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: { columns: { status: 'Approved' }, where_filters: {} },
    });
    expect((normalized.update_rows as any).columns).toEqual({ 0: { column: 'status', value: 'Approved' } });
    // and the normalized result must now pass validation
    expect(validateQueryOptions('tooljetdb', normalized).errors.filter((e) => e.code === 'malformed_write_columns')).toEqual([]);
  });

  it('normalizes a flat create_row map and preserves multiple columns in order', () => {
    const normalized = normalizeQueryOptions('tooljetdb', {
      operation: 'create_row',
      table_id: 't1',
      create_row: { full_name: 'Ada', department: 'Eng' },
    });
    expect(normalized.create_row).toEqual({
      0: { column: 'full_name', value: 'Ada' },
      1: { column: 'department', value: 'Eng' },
    });
  });

  it('leaves an already-correct map untouched (same object identity)', () => {
    const options = {
      operation: 'create_row',
      table_id: 't1',
      create_row: { 0: { column: 'full_name', value: 'Ada' } },
    };
    expect(normalizeQueryOptions('tooljetdb', options)).toBe(options);
  });
});

describe('tooljetdb write filters (mass-update guard)', () => {
  // Regression: buildPostgrestQuery silently drops any clause missing column/operator. If every
  // clause is dropped, updateRows issues an UNFILTERED PATCH that rewrites EVERY ROW and returns
  // status:ok. deleteRows always refused this; update_rows did not.
  it('rejects a flat where_filters map on update_rows', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: {
        columns: { 0: { column: 'status', value: 'Approved' } },
        where_filters: { id: '{{components.table1.selectedRow.id}}' },
      },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_where_filters' })])
    );
    expect(result.errors.find((e) => e.code === 'malformed_where_filters')!.message).toContain('EVERY ROW');
  });

  it('rejects a clause missing the operator (assuming an eq default)', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: { columns: { 0: { column: 'status', value: 'x' } }, where_filters: { 0: { column: 'id', value: 28 } } },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_where_filters' })])
    );
  });

  it('rejects update_rows with where_filters omitted entirely', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: { columns: { 0: { column: 'status', value: 'x' } } },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_where_filters' })])
    );
  });

  it('accepts a well-formed {column, operator, value} filter', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'update_rows',
      table_id: 't1',
      update_rows: {
        columns: { 0: { column: 'status', value: 'Approved' } },
        where_filters: { 0: { column: 'id', operator: 'eq', value: 28 } },
      },
    });
    expect(result.errors.filter((e) => e.code === 'malformed_where_filters')).toEqual([]);
  });

  it('applies the same guard to delete_rows', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'delete_rows',
      table_id: 't1',
      delete_rows: { where_filters: { id: 5 } },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_where_filters' })])
    );
  });
});

describe('SQL create_row blank-row guard', () => {
  // Regression: the shared SQL builder skips entries without a usable `column` and, if none survive,
  // emits `INSERT INTO <table> DEFAULT VALUES` — a BLANK ROW inserted with status ok.
  it('rejects the ToolJet DB shape carried across to a SQL datasource', () => {
    const result = validateQueryOptions('postgresql', {
      operation: 'create_row',
      create_row: { 0: { column: 'title', value: 'x' } }, // belongs under create_row.columns
    });
    const err = result.errors.find((e) => e.code === 'malformed_write_columns');
    expect(err).toBeTruthy();
    expect(err!.message).toContain('BLANK ROW');
  });

  it('rejects a flat SQL create_row.columns map', () => {
    const result = validateQueryOptions('postgresql', {
      operation: 'create_row',
      create_row: { columns: { title: 'x' } },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'malformed_write_columns' })])
    );
  });

  it('accepts the correct SQL shape', () => {
    const result = validateQueryOptions('postgresql', {
      operation: 'create_row',
      create_row: { columns: { 0: { column: 'title', value: 'x' } } },
    });
    expect(result.errors.filter((e) => e.code === 'malformed_write_columns')).toEqual([]);
  });

  it('does not fire on ToolJet DB, which legitimately puts the map at create_row', () => {
    const result = validateQueryOptions('tooljetdb', {
      operation: 'create_row',
      table_id: 't1',
      create_row: { 0: { column: 'title', value: 'x' } },
    });
    expect(result.errors.filter((e) => e.code === 'malformed_write_columns')).toEqual([]);
  });
});

describe('unquoted SQL bindings', () => {
  // Regression: ToolJet splices {{...}} into SQL as raw text. The plausible null-safe idiom
  // `col = {{components.filter.value}} OR {{!components.filter.value}}` executes as `col =  OR true`
  // the moment the filter is empty — its state on page load — so the query dies with a SQL syntax
  // error and the table renders "No data". Found by building a Postgres analytics app end-to-end.
  it('catches the exact filter query that failed live', () => {
    const r = validateQueryOptions('postgresql', {
      query:
        'SELECT order_id FROM sample_data_orders WHERE (region = {{components.regionFilter.value}} ' +
        'OR {{!components.regionFilter.value}})',
    });
    const e = r.errors.find((x) => x.code === 'unquoted_sql_binding');
    expect(e).toBeTruthy();
    expect(e!.message).toContain('raw text');
  });

  it('accepts the quoted form, where the empty case is a valid comparison', () => {
    const r = validateQueryOptions('postgresql', {
      query: "SELECT order_id FROM t WHERE (region = '{{components.regionFilter.value}}' OR '{{components.regionFilter.value}}' = '')",
    });
    expect(r.errors.filter((x) => x.code === 'unquoted_sql_binding')).toEqual([]);
  });

  it('does not fire on binding-free aggregation SQL', () => {
    const r = validateQueryOptions('postgresql', {
      query: 'SELECT category, SUM(sales) FROM t GROUP BY category ORDER BY 2 DESC LIMIT 50',
    });
    expect(r.errors.filter((x) => x.code === 'unquoted_sql_binding')).toEqual([]);
  });

  it('catches an unquoted ILIKE binding too', () => {
    const r = validateQueryOptions('postgresql', {
      query: 'SELECT a FROM t WHERE name ILIKE {{components.searchInput.value}}',
    });
    expect(r.errors.some((x) => x.code === 'unquoted_sql_binding')).toBe(true);
  });
});
