import { describe, expect, it } from 'vitest';
import { invalidSeedTimestamps } from '../src/seedTimestampValidation.js';

// cx-crm (2026-09-25): a seed row dated 2026-06-31 failed at row 24 of the insert (22008 out of range), after 60 rows
// had been written, and the whole first apply was lost. A day the month does not have is caught before any write.
describe('a seed date that is not on the calendar', () => {
  const cols = [{ name: 'at', type: 'timestamp with time zone' }];
  it('is refused', () => {
    expect(invalidSeedTimestamps(cols, [{ at: '2026-06-31T10:00:00.000Z' }]).join(' ')).toMatch(/row\(s\) 1/);
    expect(invalidSeedTimestamps(cols, [{ at: '2026-02-29' }]).join(' ')).toMatch(/row\(s\) 1/);
    expect(invalidSeedTimestamps(cols, [{ at: '2026-13-01' }]).join(' ')).toMatch(/row\(s\) 1/);
  });
  it('real dates pass', () => {
    expect(invalidSeedTimestamps(cols, [{ at: '2028-02-29T09:00:00Z' }, { at: '2026-06-30' }, { at: '2026-09-25 18:30:00+05:30' }])).toEqual([]);
  });
});

// cy-leases b8 (2026-09-26): lease end dates stored as text included 2027-02-30 on three rows; the table showed
// "Invalid date" and the RunJS view compared it as a string. Date checks only ran for date/timestamp columns.
describe('an impossible date in a text column', () => {
  it('is refused like one in a date column', () => {
    const errors = invalidSeedTimestamps([{ name: 'end_date', type: 'character varying' }, { name: 'code', type: 'text' }],
      [{ end_date: '2027-02-30', code: 'A' }, { end_date: '2027-02-28', code: '2027-02-30-B' }, { end_date: '2026-06-31T09:00:00Z', code: 'C' }]);
    expect(errors.join(' ')).toMatch(/end_date[\s\S]*row\(s\) 1, 3/);
    expect(errors.join(' ')).not.toMatch(/"code"/);
  });
});
