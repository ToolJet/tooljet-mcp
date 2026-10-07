import { describe, expect, it } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';

// A BigQuery telemetry dashboard (2026-09-28) wrote its reads as WITH ... SELECT, the usual shape for analytics SQL,
// and every one was refused as "not a single proven read statement", so nothing was checked before handoff.
const q = (query: string, kind = 'postgresql') => assessQueryRead({ id: 'q', name: 'q', kind, options: { query } } as never);

describe('a WITH (CTE) read', () => {
  it('is assessed by its final SELECT', () => {
    const r = q('WITH latest AS (SELECT deployment_id, max(ts) AS last_seen FROM pings GROUP BY 1) SELECT deployment_id, last_seen FROM latest ORDER BY last_seen DESC LIMIT 25');
    expect(r.provenRead).toBe(true);
    expect(r.maxRows).toBe(25);
    expect(r.directSafe).toBe(true);
  });
  it('keeps the billable-read confirmation for BigQuery', () => {
    const r = q('WITH w AS (SELECT DATE_TRUNC(ts, WEEK) AS wk, id FROM t.pings) SELECT wk, COUNT(DISTINCT id) AS n FROM w GROUP BY wk ORDER BY wk LIMIT 60', 'bigquery');
    expect(r.provenRead).toBe(true);
    expect(r.requiresBillableReadConfirmation).toBe(true);
  });
  it('allows WITH RECURSIVE and several CTEs', () => {
    expect(q('WITH RECURSIVE a AS (SELECT 1 AS n), b AS (SELECT n FROM a) SELECT n FROM b LIMIT 5').provenRead).toBe(true);
  });
  it('still refuses a data-modifying CTE, a final SELECT *, and a LIMIT only inside a CTE', () => {
    expect(q('WITH d AS (DELETE FROM t RETURNING id) SELECT id FROM d LIMIT 5').provenRead).toBe(false);
    expect(q('WITH a AS (SELECT id FROM t) SELECT * FROM a LIMIT 5').selectStar).toBe(true);
    const inner = q('WITH a AS (SELECT id FROM t LIMIT 5) SELECT id FROM a');
    expect(inner.maxRows).toBeUndefined();
    expect(inner.directSafe).toBe(false);
  });
});
