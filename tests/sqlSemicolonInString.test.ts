import { describe, expect, it } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';

// cx-crm (2026-09-25): a ToolJet DB SQL read whose string literal held '&lt;br&gt;' was refused as "more than one
// statement" because of the semicolons inside the string; run_queries never ran it. Only a ; outside quotes separates.
describe('a semicolon inside a SQL string literal', () => {
  const read = (sql: string) => assessQueryRead({ kind: 'tooljetdb', options: { operation: 'sql_execution', sql_execution: { sqlQuery: sql } } } as never);
  it('is not a second statement', () => {
    expect(read("SELECT 'a;b' AS x, '%{x}&lt;br&gt;' AS y FROM t LIMIT 10").reason ?? '').not.toMatch(/more than one statement/);
  });
  it('a real second statement is still refused', () => {
    expect(read("SELECT 1 FROM t LIMIT 1; DELETE FROM t").reason).toMatch(/more than one statement/);
  });
});
