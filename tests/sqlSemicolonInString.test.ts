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

// cy-leases b7: `due_date &lt; '...'` was stored as SQL and refused as a second statement; the refusal names the entity.
describe('an HTML entity in SQL outside a string', () => {
  const read = (sql: string) => assessQueryRead({ kind: 'tooljetdb', options: { operation: 'sql_execution', sql_execution: { sqlQuery: sql } } } as never);
  it('is named, with the character to write instead', () => {
    const reason = read("SELECT id FROM leases WHERE due_date &lt; '2026-10-01' LIMIT 10").reason ?? '';
    expect(reason).toMatch(/HTML entity &lt;.*write the character itself/);
    expect(reason).not.toMatch(/more than one statement/);
  });
});
