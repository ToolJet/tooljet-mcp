import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
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

export function addTableColumnTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_table_column',
    description:
      'Add one column to an existing ToolJet DB table without recreating it. Supports the same type aliases, ' +
      'constraints, default/configuration metadata, and optional foreign-key shape as create_table. Read the ' +
      'current schema with get_table_schema first. Existing rows must be compatible with non-null/default constraints.',
    inputSchema: {
      table_name: z.string(),
      column: columnSchema,
      foreign_keys: z.array(foreignKeySchema).optional(),
    },
    async handler(args: {
      table_name: string;
      column: z.infer<typeof columnSchema>;
      foreign_keys?: z.infer<typeof foreignKeySchema>[];
    }) {
      try {
        return ok(
          await client.addTableColumn({
            tableName: args.table_name,
            column: args.column,
            foreignKeys: args.foreign_keys,
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
