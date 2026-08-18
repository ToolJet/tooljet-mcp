import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function getTableSchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_table_schema',
    description:
      "Get a ToolJet-DB table's columns, including primary/not-null/unique constraints, defaults, configurations, and foreign-key relationships. Use before building queries, " +
      'columns, forms, or filters on an existing table, or to verify a table you just created.',
    inputSchema: { table_name: z.string() },
    async handler(args: { table_name: string }) {
      try {
        return ok(await client.getTableSchema(args.table_name));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
