import { normalizeType, type TableColumn } from './tooljetClient.js';

/** Planned-table counterpart of insertRows' generated-PK guard. Only call with a known
 * planned schema: an existing table named `id` need not have a generated key. */
export function invalidPlannedGeneratedPrimaryKeySeeds(
  columns: readonly TableColumn[],
  rows: readonly Record<string, unknown>[],
): string[] {
  // createTable prepends a serial PRIMARY KEY id only when no PK was declared.
  // Its auxiliary serial id on business-key tables is NOT a primary key.
  const primaryKeys: readonly TableColumn[] = columns.some(column => column.primaryKey)
    ? columns.filter(column => column.primaryKey)
    : [{ name: 'id', type: 'serial', primaryKey: true }];
  const errors: string[] = [];
  for (const column of primaryKeys) {
    if (normalizeType(column.type) !== 'serial' &&
        !/^nextval\(/i.test(String(column.defaultValue ?? '').trim())) continue;
    const supplied = rows.flatMap((row, index) => column.name in row ? [index + 1] : []);
    if (supplied.length) {
      errors.push(`Omit generated primary key "${column.name}" from seed row(s) ${supplied.slice(0, 12).join(', ')}` +
        `${supplied.length > 12 ? ` and ${supplied.length - 12} more` : ''}. ` +
        'ToolJet allocates it from the table sequence; explicit keys can collide or desynchronize future inserts. ' +
        'No seed values were removed or rewritten.');
    }
  }
  return errors;
}
