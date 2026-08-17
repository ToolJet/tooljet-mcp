import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const querySchema = z.object({
  datasource_id: z.string(),
  name: z.string(),
  options: z.record(z.string(), z.any()),
  kind: z.string().optional(),
});

export function addQueriesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_queries',
    description:
      "Create MANY queries in a single call (all share version_id). Prefer this over repeated add_query " +
      'when building an app. Each query names its own datasource_id and options (for a ToolJet-DB list: ' +
      '{ operation: "list_rows", table_id: "<table id from list_tables>", list_rows: {}, runOnPageLoad: true }). ' +
      'Returns [{ query_id, name }].',
    inputSchema: {
      version_id: z.string(),
      queries: z
        .array(querySchema)
        .min(1),
    },
    async handler(args: {
      version_id: string;
      queries: Array<{ datasource_id: string; name: string; options: Record<string, unknown>; kind?: string }>;
    }) {
      try {
        const result = await client.createQueries({
          versionId: args.version_id,
          queries: args.queries.map((q) => ({
            dataSourceId: q.datasource_id,
            name: q.name,
            options: q.options,
            kind: q.kind,
          })),
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
