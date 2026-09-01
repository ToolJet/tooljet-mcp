import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function dropTableColumnTool(client: ToolJetClient): ToolDef {
  return {
    name: 'drop_table_column',
    title: 'Drop Table Column',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Permanently drop a ToolJet DB column and its stored values. This is destructive. Inspect the schema and ' +
      'query/component bindings first, obtain explicit user approval, then pass confirm:true in that same approved operation.',
    inputSchema: {
      table_name: z.string(),
      column_name: z.string(),
      confirm: z.literal(true),
    },
    async handler(args: { table_name: string; column_name: string; confirm: true }) {
      try {
        return ok(await client.dropTableColumn({ tableName: args.table_name, columnName: args.column_name }));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
