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

// Sweep pilot (2026-09-26): `{operation: "get_rows"}` on Supabase and `{operation: "read"}` on Google Sheets passed: the
// catalog marks only the selector required, so a query naming no table or spreadsheet looked complete.
describe('a query that names no target', () => {
  it('is an error when the operation has target fields and none is set', () => {
    expect(codes('supabase', { operation: 'get_rows' })).toMatch(/missing_target[\s\S]*get_table_name/);
    expect(codes('googlesheetsv2', { operation: 'read' })).toMatch(/missing_target[\s\S]*spreadsheet_id/);
    expect(codes('mongodb', { operation: 'find_many', filter: '{}' })).toMatch(/missing_target[\s\S]*collection/);
  });
  it('passes when a target is set, and for operations without targets', () => {
    expect(codes('supabase', { operation: 'get_rows', get_table_name: 'orders' })).toBe('');
    expect(codes('googlesheetsv2', { operation: 'read', spreadsheet_id: 'x' })).toBe('');
    expect(codes('googlesheetsv2', { operation: 'list_all_spreadsheets' })).toBe('');
  });
});
