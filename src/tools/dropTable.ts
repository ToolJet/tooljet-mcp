import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function dropTableTool(client: ToolJetClient): ToolDef {
  return {
    name: 'drop_table',
    title: 'Drop Table',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Permanently drop a ToolJet DB table and all its rows. This is destructive. Inspect dependent queries/components, ' +
      'obtain explicit user approval for the named table, then pass confirm:true in that same approved operation.',
    inputSchema: {
      table_name: z.string(),
      confirm: z.literal(true),
    },
    async handler(args: { table_name: string; confirm: true }) {
      try {
        return ok(await client.dropTable({ tableName: args.table_name }));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
