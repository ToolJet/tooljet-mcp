import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const columnSchema = z.object({
  name: z.string(),
  type: z.string(),
  primaryKey: z.boolean().optional(),
  notNull: z.boolean().optional(),
  unique: z.boolean().optional(),
});

export function createTableTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_table',
    description:
      'Create a ToolJet-DB table. Give a table_name and columns (each: name, type, and optional primaryKey/notNull/unique). ' +
      'Types accept tjdb values or friendly aliases: string, integer, number, bigint, boolean, timestamp, json, serial. ' +
      'If no column is marked primaryKey, a serial `id` primary key is added automatically. Returns { table_id, table_name }. ' +
      'For a NEW app, confirm the data model with the user before creating tables.',
    inputSchema: {
      table_name: z.string(),
      columns: z.array(columnSchema).min(1),
    },
    async handler(args: {
      table_name: string;
      columns: Array<{ name: string; type: string; primaryKey?: boolean; notNull?: boolean; unique?: boolean }>;
    }) {
      try {
        return ok(await client.createTable({ tableName: args.table_name, columns: args.columns }));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
