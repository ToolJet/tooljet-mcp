import { describe, it, expect } from 'vitest';
import { assessQueryRead, LARGE_READ_ROW_THRESHOLD } from '../src/queryExecutionSafety.js';

const sheets = (options: Record<string, unknown>) =>
  assessQueryRead({ kind: 'googlesheetsv2', data_source_id: 'ds-1', options } as never);
const dynamo = (options: Record<string, unknown>) =>
  assessQueryRead({ kind: 'dynamodb', data_source_id: 'ds-1', options } as never);

/* Google Sheets was the most requested datasource in the Sep 1-12 window — 29 asks, 0 queries. */
describe('Google Sheets v2 read classification', () => {
  it('bounds a read by its A1 row range', () => {
    const a = sheets({ operation: 'read', spreadsheet_id: 'abc', sheet: 'Bugs', spreadsheet_range: 'A1:D100' });
    expect(a).toMatchObject({ provenRead: true, maxRows: 100, requiresCountPreflight: false });
    expect(a.source).toEqual({ kind: 'remote_endpoint', value: 'googlesheets:abc:Bugs' });
  });

  it('accepts a sheet-qualified range', () => {
    expect(sheets({ operation: 'read', spreadsheet_id: 'abc', spreadsheet_range: 'Bugs!A2:D51' }).maxRows).toBe(50);
  });

  it('never marks a Google read directSafe', () => {
    const a = sheets({ operation: 'read', spreadsheet_id: 'abc', spreadsheet_range: 'A1:D10' });
    expect(a.directSafe).toBe(false);
    expect(a.requiresRemoteReadConfirmation).toBe(true);
  });

  it('requires a preflight without a static range, and above the threshold', () => {
    expect(sheets({ operation: 'read', spreadsheet_id: 'abc' }))
      .toMatchObject({ provenRead: true, requiresCountPreflight: true });
    expect(sheets({ operation: 'list_all', spreadsheet_id: 'abc' }))
      .toMatchObject({ provenRead: true, requiresCountPreflight: true });
    expect(sheets({ operation: 'read', spreadsheet_id: 'abc', spreadsheet_range: `A1:D${LARGE_READ_ROW_THRESHOLD + 2}` }))
      .toMatchObject({ requiresCountPreflight: true });
  });

  it('treats info and list_all_spreadsheets as metadata reads', () => {
    for (const operation of ['info', 'list_all_spreadsheets']) {
      expect(sheets({ operation, spreadsheet_id: 'abc' }), operation)
        .toMatchObject({ provenRead: true, maxRows: 1 });
    }
  });

  it('refuses writes and a non-static spreadsheet', () => {
    for (const operation of ['append', 'update', 'delete_row', 'delete_by_range', 'delete_by_filter',
      'create', 'update_spreadsheet', 'copy_spreadsheet', 'bulk_update_by_primary_key']) {
      expect(sheets({ operation, spreadsheet_id: 'abc' }).provenRead, operation).toBe(false);
    }
    expect(sheets({ operation: 'read', spreadsheet_id: '{{ components.x.value }}' }).reason)
      .toMatch(/not statically known/);
  });
});

describe('DynamoDB read classification', () => {
  it('treats get_item and describe_table as single-row reads', () => {
    for (const operation of ['get_item', 'describe_table']) {
      expect(dynamo({ operation, table: 'Bugs' }), operation)
        .toMatchObject({ provenRead: true, directSafe: true, maxRows: 1 });
    }
  });

  it('proves query_table and scan_table reads but always preflights them', () => {
    for (const operation of ['query_table', 'scan_table']) {
      const a = dynamo({ operation, table: 'Bugs' });
      expect(a, operation).toMatchObject({ provenRead: true, requiresCountPreflight: true, directSafe: false });
      expect(a.reason, operation).toMatch(/no statically provable row limit/);
    }
  });

  it('refuses writes and a non-static table', () => {
    for (const operation of ['put_item', 'update_item', 'delete_item', 'create_table']) {
      expect(dynamo({ operation, table: 'Bugs' }).provenRead, operation).toBe(false);
    }
    expect(dynamo({ operation: 'scan_table', table: '{{ components.t.value }}' }).reason)
      .toMatch(/not statically known/);
  });
});
