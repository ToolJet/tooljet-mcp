import { describe, it, expect } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';

/* Measured against a real 15,000-row table: with the value `P1' OR '1'='1`, the spliced form
   returned every row with the filter bypassed, while the parameterised form returned 0. */
const check = (query: string) => validateQueryOptions('postgresql', { mode: 'sql', query });
const messages = (query: string) => {
  const r = check(query);
  return [...r.errors, ...r.warnings].map((i) => i.message).join(' | ');
};

describe('SQL parameterisation guidance', () => {
  it('warns when a binding is spliced into the statement as quoted text', () => {
    const r = check("SELECT * FROM tickets WHERE priority = '{{components.dd.value}}'");
    expect(r.warnings.some((i) => i.code === 'interpolated_sql_binding')).toBe(true);
  });

  it('points at query_params rather than at more quoting', () => {
    expect(messages("SELECT 1 FROM t WHERE p = '{{components.dd.value}}'")).toMatch(/query_params/);
  });

  /* The unquoted rule used to recommend quoting, which is exactly the form the rule above flags.
     A remedy that produces the next defect is worse than no remedy. */
  it('no longer tells the model to fix an unquoted binding by quoting it', () => {
    const m = messages('SELECT 1 FROM t WHERE p = {{components.dd.value}}');
    expect(m).toMatch(/:name|query_params/);
    expect(m).not.toMatch(/Quote it/);
  });

  it('accepts a parameterised query without complaint', () => {
    const r = check('SELECT id FROM tickets WHERE priority = :priority LIMIT 100');
    expect(r.errors.some((i) => i.code === 'unquoted_sql_binding')).toBe(false);
    expect(r.warnings.some((i) => i.code === 'interpolated_sql_binding')).toBe(false);
  });

  /* A warning, not an error: a fixed dropdown is safe in practice, and blocking every such query
     would stall builds over a risk that depends on what is bound. */
  it('does not block the build', () => {
    const r = check("SELECT 1 FROM t WHERE p = '{{components.dd.value}}'");
    expect(r.errors.some((i) => i.code === 'interpolated_sql_binding')).toBe(false);
  });

  it('leaves SQL with no bindings alone', () => {
    const r = check("SELECT count(*) FROM tickets WHERE status = 'resolved'");
    expect(r.warnings.some((i) => i.code === 'interpolated_sql_binding')).toBe(false);
  });
});
