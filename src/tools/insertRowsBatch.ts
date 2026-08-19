import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const seedSchema = z.object({
  table_name: z.string(),
  rows: z.array(z.record(z.string(), z.any())).min(1),
});

export function insertRowsBatchTool(client: ToolJetClient): ToolDef {
  return {
    name: 'insert_rows_batch',
    description:
      'Seed multiple ToolJet-DB tables in one call. Entries are processed in the listed order so parent rows can be inserted before ' +
      'foreign-key children. Writes are insert-only: omit generated serial keys; explicit duplicate keys fail rather than updating rows. ' +
      'Returns {tables:[{table_name,processed_rows}],processed_rows}. A partial failure reports completed table/row counts; do not ' +
      'retry completed seeds. Keep initial demo data representative and small.',
    inputSchema: { tables: z.array(seedSchema).min(1).max(50) },
    async handler(args: { tables: Array<{ table_name: string; rows: Array<Record<string, unknown>> }> }) {
      try {
        const results = await client.insertRowsBatch({
          tables: args.tables.map((table) => ({ tableName: table.table_name, rows: table.rows })),
        });
        return ok({
          tables: results,
          processed_rows: results.reduce((total, result) => total + result.processed_rows, 0),
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
