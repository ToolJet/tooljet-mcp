import { describe, expect, it } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';

// Catalog sweep (2026-09-26): only a few kinds had hand-written option checks, so an invented operation or field on any
// other plugin passed validation and lint, then failed or read the wrong thing at runtime.
const codes = (kind: string, options: Record<string, unknown>) => validateQueryOptions(kind, options).errors.map((e) => `${e.code}:${e.message}`).join(' | ');

describe('query options against the datasource catalog', () => {
  it('refuses an operation the plugin does not have, naming the real ones', () => {
    expect(codes('googlesheetsv2', { operation: 'list_rows', spreadsheet_id: 'x' })).toMatch(/invalid_operation[\s\S]*list_rows[\s\S]*read/);
    expect(codes('supabase', { operation: 'select', get_table_name: 't' })).toMatch(/invalid_operation[\s\S]*get_rows/);
  });
  it('refuses a field no operation of the plugin has, and names the fields it does', () => {
    expect(codes('supabase', { operation: 'get_rows', table: 'orders', get_limit: 10 })).toMatch(/unknown_option_key[\s\S]*"table"[\s\S]*get_table_name/);
  });
  it('accepts a correct query and common ToolJet settings', () => {
    expect(codes('supabase', { operation: 'get_rows', get_table_name: 'orders', get_limit: 10, runOnPageLoad: true, showSuccessNotification: false })).toBe('');
    expect(codes('mongodb', { operation: 'find_many', collection: 'a', filter: '{}', options: '{}', enableTransformation: true, transformation: 'return data' })).toBe('');
    expect(codes('restapi', { method: 'get', url: 'https://example.com/x', url_params: [], headers: [] })).toBe('');
  });
});
