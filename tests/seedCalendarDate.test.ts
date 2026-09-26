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
