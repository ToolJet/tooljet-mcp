/** Conservative literal-only preflight, not a PostgreSQL date parser. Leave
 * alternate date formats, expressions, infinity and relative dates to the DB.
 * This catches obviously non-date literals before a sequential insert partially
 * commits. Do not rewrite values or invent a replacement date. */
export function invalidSeedTimestamps(
  columns: readonly { name: string; type: string }[],
  rows: readonly Record<string, unknown>[]
): string[] {
  const dates = columns.filter(c => /^(date|timestamp(?:tz)?(?:\(\d+\))?(?: (?:with|without) time zone)?)$/i.test(c.type.trim()));
  const errors: string[] = [];
  for (const column of dates) {
    const invalid: number[] = [];
    for (const [index, row] of rows.entries()) {
      const value = row[column.name];
      if (value == null) continue; // Nullability/defaults have a separate contract.
      const obvious = typeof value === 'boolean' || typeof value === 'object' ||
        (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) < 100)) ||
        (typeof value === 'string' && (!value.trim() || /^[+-]?\d{1,2}$/.test(value.trim())));
      if (obvious || (typeof value === 'string' && notOnCalendar(value))) invalid.push(index + 1);
    }
    if (invalid.length) errors.push(`Column "${column.name}" (${column.type}) has non-date literals in seed row(s) ${invalid.slice(0, 12).join(', ')}${invalid.length > 12 ? ` and ${invalid.length - 12} more` : ''}. Supply actual date/timestamp values (prefer ISO 8601), or null only when permitted. No values were rewritten.`);
  }
  // A date kept in a text column is still a date: one that does not exist (2027-02-30) renders "Invalid date" and
  // compares wrongly (cy-leases b8). Only values that are exactly an ISO date or timestamp are checked.
  for (const column of columns.filter(c => /^(text|character varying|varchar)(\(\d+\))?$/i.test(c.type.trim()))) {
    const invalid = rows.flatMap((row, index) => {
      const value = row[column.name];
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value.trim()) && notOnCalendar(value) ? [index + 1] : [];
    });
    if (invalid.length) errors.push(`Column "${column.name}" (${column.type}) has dates that do not exist in seed row(s) ${invalid.slice(0, 12).join(', ')}${invalid.length > 12 ? ` and ${invalid.length - 12} more` : ''} (a month has no such day). Supply real dates. No values were rewritten.`);
  }
  return errors;
}

/** An ISO-style date whose month or day does not exist (2026-06-31, 2026-02-29): the database refuses it mid-insert
 * (cx-crm lost a whole apply at row 24 of 60). Anything not starting YYYY-MM-DD is left to the database. */
function notOnCalendar(value: string): boolean {
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?![\d])/);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1) return true;
  return day > new Date(Date.UTC(year, month, 0)).getUTCDate();
}
