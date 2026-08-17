import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function insertRowsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'insert_rows',
    description:
      'Seed rows into a ToolJet-DB table (so a generated app is not empty). rows is an array of objects keyed by ' +
      'column name. You may omit an integer/serial primary key — sequential ids are assigned automatically. ' +
      'Returns { processed_rows }. Optional: only seed when the user wants sample data.',
    inputSchema: {
      table_name: z.string(),
      rows: z.array(z.record(z.string(), z.any())).min(1),
    },
    async handler(args: { table_name: string; rows: Array<Record<string, unknown>> }) {
      try {
        return ok(await client.insertRows({ tableName: args.table_name, rows: args.rows }));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
