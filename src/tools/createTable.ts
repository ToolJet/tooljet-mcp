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

export function createTableTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_table',
    description:
      'Create a ToolJet-DB table. Give table_name and columns (name, type, optional primaryKey/notNull/unique/defaultValue/configurations). ' +
      'Optional foreign_keys supports single or composite relationships with columns, referencedTable, referencedColumns, onDelete, and onUpdate. ' +
      'Types accept tjdb values or friendly aliases: string, integer, number, bigint, boolean, timestamp, json, serial. ' +
      'Known ToolJet DB reserved column names are rejected locally with a rename suggestion before any API request. ' +
      'If no column is marked primaryKey, a serial `id` primary key is added automatically. Returns { table_id, table_name }. ' +
      'For a NEW app, confirm the data model with the user before creating tables.',
    inputSchema: {
      table_name: z.string(),
      columns: z.array(columnSchema).min(1),
      foreign_keys: z.array(foreignKeySchema).optional(),
    },
    async handler(args: {
      table_name: string;
      columns: Array<{
        name: string;
        type: string;
        primaryKey?: boolean;
        notNull?: boolean;
        unique?: boolean;
        defaultValue?: unknown;
        configurations?: Record<string, unknown>;
      }>;
      foreign_keys?: Array<{
        columns: string[];
        referencedTable: string;
        referencedColumns: string[];
        onDelete?: 'RESTRICT' | 'NO ACTION' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
        onUpdate?: 'RESTRICT' | 'NO ACTION' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';
      }>;
    }) {
      try {
        const errors = validateTableBatch([{ tableName: args.table_name, columns: args.columns, foreignKeys: args.foreign_keys }]);
        if (errors.length) return fail(new Error(errors.join(' ')));
        return ok(
          await client.createTable({ tableName: args.table_name, columns: args.columns, foreignKeys: args.foreign_keys })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
