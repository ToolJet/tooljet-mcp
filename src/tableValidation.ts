import type { CreateTableParams } from './tooljetClient.js';

/** Column names the ToolJet DB API has explicitly rejected as reserved keywords. */
export const TOOLJET_DB_RESERVED_COLUMN_NAMES = new Set(['action', 'comment', 'condition']);

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
          `Table "${table.tableName}" uses reserved column name "${column.name}". ` +
            'Use a descriptive name such as step_action, result_comment, or item_condition.'
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
