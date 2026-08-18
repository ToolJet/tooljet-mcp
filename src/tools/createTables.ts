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
        return ok({ tables: await client.createTables({ tables }) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
