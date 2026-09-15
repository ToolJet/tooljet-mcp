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
});
