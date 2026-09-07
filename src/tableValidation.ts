import { normalizeType, TOOLJET_DB_DATA_TYPES, type CreateTableParams } from './tooljetClient.js';

/** Column names ToolJet DB rejects as reserved keywords (its ReservedKeywordConstraint, case-insensitive). The
 *  list is the server's own; `data`, `date`, `count`, `default` and `action` are the ones models reach for. */
export const TOOLJET_DB_RESERVED_COLUMN_NAMES = new Set([
  'abort', 'abs', 'absolute', 'access', 'action', 'ada', 'add', 'admin', 'after', 'aggregate', 'all', 'allocate',
  'alter', 'analyse', 'analyze', 'and', 'any', 'are', 'array', 'as', 'asc', 'asensitive', 'assertion', 'assignment',
  'asymmetric', 'at', 'atomic', 'attribute', 'attributes', 'authorization', 'avg', 'backward', 'before', 'begin', 'bernoulli', 'between',
  'bigint', 'binary', 'bit', 'bit_length', 'bitvar', 'blob', 'boolean', 'both', 'breadth', 'by', 'c', 'cache',
  'call', 'called', 'cardinality', 'cascade', 'cascaded', 'case', 'cast', 'catalog', 'catalog_name', 'ceil', 'ceiling', 'chain',
  'char', 'char_length', 'character', 'character_length', 'character_set_catalog', 'character_set_name', 'character_set_schema', 'characteristics', 'characters', 'check', 'checked', 'checkpoint',
  'class', 'class_origin', 'clob', 'close', 'cluster', 'coalesce', 'cobol', 'collate', 'collation', 'collation_catalog', 'collation_name', 'collation_schema',
  'collect', 'column', 'column_name', 'command_function', 'command_function_code', 'comment', 'commit', 'committed', 'completion', 'condition', 'condition_number', 'connect',
  'connection', 'connection_name', 'constraint', 'constraint_catalog', 'constraint_name', 'constraint_schema', 'constraints', 'constructor', 'contains', 'continue', 'conversion', 'convert',
  'copy', 'corr', 'corresponding', 'count', 'covar_pop', 'covar_samp', 'create', 'createdb', 'createrole', 'createuser', 'cross', 'csv',
  'cube', 'cume_dist', 'current', 'current_date', 'current_default_transform_group', 'current_path', 'current_role', 'current_time', 'current_timestamp', 'current_transform_group_for_type', 'current_user', 'cursor',
  'cursor_name', 'cycle', 'data', 'database', 'date', 'datetime_interval_code', 'datetime_interval_precision', 'day', 'deallocate', 'dec', 'decimal', 'declare',
  'default', 'defaults', 'deferrable', 'deferred', 'defined', 'definer', 'delete', 'delimiter', 'delimiters', 'dense_rank', 'depth', 'deref',
  'derived', 'from',
]);

const RESERVED_SUGGESTIONS: Record<string, string> = {
  data: 'payload or details', date: 'event_date or scheduled_on', day: 'day_of_week', count: 'item_count',
  default: 'is_default', action: 'step_action', comment: 'note or result_comment', condition: 'item_condition',
  check: 'check_name', current: 'is_current', class: 'class_name', case: 'case_ref', begin: 'starts_at',
};

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

/** Validate a complete ToolJet DB table batch before any table is created. */
export function validateTableBatch(tables: CreateTableParams[]): string[] {
  const errors: string[] = [];
  const tablesByName = new Map<string, CreateTableParams>();

  for (const table of tables) {
    const tableKey = normalized(table.tableName);
    if (tablesByName.has(tableKey)) {
      errors.push(`Duplicate table name "${table.tableName}" in batch.`);
    } else {
      tablesByName.set(tableKey, table);
    }

    const columnsByName = new Map<string, string>();
    for (const column of table.columns) {
      const columnKey = normalized(column.name);
      if (columnsByName.has(columnKey)) {
        errors.push(`Table "${table.tableName}" has duplicate column name "${column.name}".`);
      } else {
        columnsByName.set(columnKey, column.name);
      }
      if (TOOLJET_DB_RESERVED_COLUMN_NAMES.has(columnKey)) {
        errors.push(
          `Table "${table.tableName}" uses reserved column name "${column.name}" (ToolJet DB rejects SQL keywords). ` +
            `Rename it, e.g. ${RESERVED_SUGGESTIONS[columnKey] ?? `${columnKey}_value`}.`
        );
      }
      const dataType = normalizeType(column.type);
      if (!TOOLJET_DB_DATA_TYPES.has(dataType)) {
        errors.push(
          `Table "${table.tableName}" column "${column.name}" has type "${column.type}", which ToolJet DB does not accept. ` +
            'Use one of: string, integer, bigint, serial, number (double precision), boolean, timestamp, jsonb.'
        );
      }
    }

    for (const foreignKey of table.foreignKeys ?? []) {
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) {
        errors.push(
          `Table "${table.tableName}" foreign key to "${foreignKey.referencedTable}" must have the same number ` +
            'of local and referenced columns.'
        );
      }
      const missingLocal = foreignKey.columns.filter((column) => !columnsByName.has(normalized(column)));
      if (missingLocal.length) {
        errors.push(
          `Table "${table.tableName}" foreign key references missing local columns: ${missingLocal.join(', ')}.`
        );
      }
    }
  }

  for (const table of tables) {
    for (const foreignKey of table.foreignKeys ?? []) {
      const referenced = tablesByName.get(normalized(foreignKey.referencedTable));
      if (!referenced) continue;
      const referencedColumns = new Set(referenced.columns.map((column) => normalized(column.name)));
      // An implicit serial `id` exists when the caller did not declare a primary key.
      if (!referenced.columns.some((column) => column.primaryKey)) referencedColumns.add('id');
      const missing = foreignKey.referencedColumns.filter((column) => !referencedColumns.has(normalized(column)));
      if (missing.length) {
        errors.push(
          `Table "${table.tableName}" foreign key references missing columns on ` +
            `"${foreignKey.referencedTable}": ${missing.join(', ')}.`
        );
      }
    }
  }

  try {
    tableCreationLevels(tables);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return [...new Set(errors)];
}

/** Return dependency-safe levels; tables in one level can be created concurrently. */
export function tableCreationLevels(tables: CreateTableParams[]): CreateTableParams[][] {
  const byName = new Map(tables.map((table) => [normalized(table.tableName), table]));
  const dependencies = new Map<string, Set<string>>();
  for (const table of tables) {
    const key = normalized(table.tableName);
    dependencies.set(
      key,
      new Set(
        (table.foreignKeys ?? [])
          .map((foreignKey) => normalized(foreignKey.referencedTable))
          .filter((referenced) => referenced !== key && byName.has(referenced))
      )
    );
  }

  const remaining = new Set(byName.keys());
  const completed = new Set<string>();
  const levels: CreateTableParams[][] = [];
  while (remaining.size) {
    const ready = [...remaining].filter((name) =>
      [...(dependencies.get(name) ?? [])].every((dependency) => completed.has(dependency))
    );
    if (!ready.length) {
      throw new Error(
        `Table batch contains a circular foreign-key dependency: ${[...remaining]
          .map((name) => byName.get(name)?.tableName ?? name)
          .join(', ')}. Create one side first, then add the circular foreign key as a column change.`
      );
    }
    levels.push(ready.map((name) => byName.get(name)!));
    ready.forEach((name) => {
      remaining.delete(name);
      completed.add(name);
    });
  }
  return levels;
}
