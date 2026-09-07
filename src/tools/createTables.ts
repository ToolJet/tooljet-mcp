import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { validateTableBatch } from '../tableValidation.js';
import { ok, fail, type ToolDef } from './types.js';

const columnSchema = z.object({
  name: z.string(),
  type: z.string(),
  primaryKey: z.boolean().optional(),
  notNull: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.any().optional(),
  configurations: z.record(z.string(), z.any()).optional(),
});
const foreignKeyAction = z.enum(['RESTRICT', 'NO ACTION', 'CASCADE', 'SET NULL', 'SET DEFAULT']);
const foreignKeySchema = z.object({
  columns: z.array(z.string()).min(1),
  referencedTable: z.string(),
  referencedColumns: z.array(z.string()).min(1),
  onDelete: foreignKeyAction.optional(),
  onUpdate: foreignKeyAction.optional(),
});
const tableSchema = z.object({
  table_name: z.string(),
  columns: z.array(columnSchema).min(1),
  foreign_keys: z.array(foreignKeySchema).optional(),
});

type TableInput = z.infer<typeof tableSchema>;

export function createTablesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_tables',
    title: 'Create Tables',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Create multiple ToolJet-DB tables in one call. The complete batch is preflighted before writes for duplicate/reserved names, ' +
      'foreign-key column mistakes, and circular dependencies. Tables are then created in dependency order, with independent tables ' +
      'created concurrently. Returns {tables}. ToolJet has no atomic multi-table endpoint: if an upstream request fails, the error names ' +
      'any tables already created; MCP never deletes them automatically.',
    inputSchema: { tables: z.array(tableSchema).min(1).max(50) },
    async handler(args: { tables: TableInput[] }) {
      try {
        const tables = args.tables.map((table) => ({
          tableName: table.table_name,
          columns: table.columns,
          foreignKeys: table.foreign_keys,
        }));
        const errors = validateTableBatch(tables);
        if (errors.length) return fail(new Error(errors.join(' ')));
        // A taken name gets a counter instead of a failure, the same way create_app and the plan lint do.
        const warnings: string[] = [];
        const taken = new Set((await client.listTables()).map((table) => table.table_name.toLowerCase()));
        for (const table of tables) {
          if (!taken.has(table.tableName.toLowerCase())) { taken.add(table.tableName.toLowerCase()); continue; }
          const oldName = table.tableName;
          let candidate = oldName;
          for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${oldName.slice(0, 31 - `_${n}`.length)}_${n}`;
          table.tableName = candidate;
          taken.add(candidate.toLowerCase());
          for (const other of tables) for (const fk of other.foreignKeys ?? []) if (fk.referencedTable === oldName) fk.referencedTable = candidate;
          warnings.push(`Table "${oldName}" already exists in this workspace; created "${candidate}" instead (foreign keys updated). Use the returned name.`);
        }
        return ok({ tables: await client.createTables({ tables }), ...(warnings.length ? { warnings } : {}) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
