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
      if (obvious) invalid.push(index + 1);
    }
    if (invalid.length) errors.push(`Column "${column.name}" (${column.type}) has non-date literals in seed row(s) ${invalid.slice(0, 12).join(', ')}${invalid.length > 12 ? ` and ${invalid.length - 12} more` : ''}. Supply actual date/timestamp values (prefer ISO 8601), or null only when permitted. No values were rewritten.`);
  }
  return errors;
}
