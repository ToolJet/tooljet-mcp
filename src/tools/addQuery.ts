import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function addQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_query',
    description:
      "Create a query on an app version's datasource (ANY datasource — ToolJet DB, Postgres, RunJS, ServiceNow, …). " +
      'The query kind is taken from the datasource automatically (or pass `kind`). `options` differ per datasource kind: ' +
      'tooljetdb list = { operation: "list_rows", table_id, list_rows: {} }; runjs = { code }; postgresql = { mode: "sql", query, query_params: [] }.',
    inputSchema: {
      version_id: z.string(),
      datasource_id: z.string(),
      name: z.string(),
      options: z.record(z.string(), z.any()),
      kind: z.string().optional(),
    },
    async handler(args: {
      version_id: string;
      datasource_id: string;
      name: string;
      options: Record<string, unknown>;
      kind?: string;
    }) {
      try {
        const result = await client.createQuery({
          versionId: args.version_id,
          dataSourceId: args.datasource_id,
          name: args.name,
          options: args.options,
          kind: args.kind,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
