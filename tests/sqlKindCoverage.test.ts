import { describe, it, expect } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { getDatasourceQuerySchema } from '../src/datasourceCatalog.js';

const assess = (kind: string, options: Record<string, unknown>) =>
  assessQueryRead({ kind, data_source_id: 'ds-1', options } as never);

const ADDED = ['databricks', 'athena', 'awsredshift', 'harperdb', 'ibmdb', 'saphana'];
const SQL_FIELD: Record<string, string> = {
  databricks: 'sql_query', awsredshift: 'sql_query', harperdb: 'sql_query',
  athena: 'query', ibmdb: 'query', saphana: 'query',
};
// Dialects assessSql already parses, each keeping its SQL in one operation.
const DIALECTS: Array<[string, string, string]> = [
  ['spanner', 'sql', 'select id from Singers where n = @p limit 100'],
  ['Presto', 'presto_sql_query', 'select id from hive.default.bugs limit 20'],
  ['cosmosdb', 'query', 'select c.id from c where c.type = "bug" limit 25'],
  ['couchbase', 'query', 'select meta().id from `travel` limit 10'],
  ['salesforce', 'soql_query', 'select Id, Name from Account limit 50'],
];

describe('SQL kinds newly covered by the generic classifier', () => {
  it('every added kind publishes a sql contract whose field name we read', () => {
    for (const kind of ADDED) {
      const contract = getDatasourceQuerySchema(kind)?.contracts.sql;
      expect(contract, kind).toBeDefined();
      expect(Object.keys(contract!.variants[0]!.fields), kind).toContain(SQL_FIELD[kind]);
    }
  });

  it('proves a bounded SELECT for each', () => {
    for (const kind of ADDED) {
      const a = assess(kind, { mode: 'sql', [SQL_FIELD[kind]!]: 'select id, name from bugs limit 25' });
      expect(a.provenRead, kind).toBe(true);
      expect(a.maxRows, kind).toBe(25);
      expect(a.source, kind).toEqual({ kind: 'sql_table', value: 'bugs' });
    }
  });

  it('refuses a write for each', () => {
    for (const kind of ADDED) {
      const a = assess(kind, { mode: 'sql', [SQL_FIELD[kind]!]: 'delete from bugs' });
      expect(a.provenRead, kind).toBe(false);
    }
  });

  it('reads SQL from sql_query, not only query', () => {
    const a = assess('databricks', { mode: 'sql', sql_query: 'select * from t limit 5' });
    expect(a.provenRead).toBe(true);
    expect(a.reason).not.toMatch(/SQL text is unavailable/);
  });

  it('treats Redshift under its real ToolJet kind string', () => {
    // SQL_KINDS carried `redshift`; ToolJet's kind is `awsredshift`, so this never fired.
    const a = assess('awsredshift', { mode: 'sql', sql_query: 'select id from events limit 10' });
    expect(a.provenRead).toBe(true);
    expect(a.requiresBillableReadConfirmation).toBe(true);
  });

  it('still refuses a harperdb operation that carries no SQL', () => {
    const a = assess('harperdb', { operation: 'search_by_hash', table: 'bugs' });
    expect(a.provenRead).toBe(false);
  });

  it('parses each additional SQL dialect and bounds it', () => {
    for (const [kind, field, sql] of DIALECTS) {
      const a = assess(kind, { [field]: sql });
      expect(a.provenRead, kind).toBe(true);
      expect(a.maxRows, kind).toBeGreaterThan(0);
    }
  });

  it('refuses the write operations of those kinds, which carry no SQL field', () => {
    for (const [kind, options] of [
      ['cosmosdb', { operation: 'delete_item', table: 't' }],
      ['couchbase', { operation: 'delete_document', id: '1' }],
      ['salesforce', { operation: 'crud', record: '{}' }],
    ] as Array<[string, Record<string, unknown>]>) {
      expect(assess(kind, options).provenRead, kind).toBe(false);
    }
  });

  it('matches Presto under the lowercased kind string', () => {
    // ToolJet's kind is `Presto`; the dispatch lowercases before the SQL_KINDS lookup.
    expect(assess('Presto', { presto_sql_query: 'select id from t limit 5' }).provenRead).toBe(true);
  });
});
