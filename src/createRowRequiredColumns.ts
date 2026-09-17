export interface RequiredColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  defaultValue?: unknown;
}

/** Inspect only a literal create_row column map; no expression execution and no
 * inference about dynamic column names or SQL inserts. False/zero/empty defaults
 * count as defaults, whereas a null default cannot fill a NOT NULL column. */
export function missingCreateRowColumns(options: Record<string, unknown>, columns: readonly RequiredColumn[]): string[] | undefined {
  if (options.operation !== 'create_row') return;
  const map = options.create_row;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return;
  const entries = Object.values(map);
  if (entries.some(entry => !entry || typeof entry !== 'object' ||
    typeof entry.column !== 'string' || !entry.column || entry.column.includes('{{'))) return;
  const supplied = new Set(entries.filter(entry => entry.value !== undefined && entry.value !== null).map(entry => entry.column));
  return columns.filter(column => (column.primaryKey || column.notNull) &&
    column.defaultValue == null && !/^(smallserial|serial|bigserial|serial2|serial4|serial8)$/i.test(column.type) &&
    !supplied.has(column.name)).map(column => column.name);
}
