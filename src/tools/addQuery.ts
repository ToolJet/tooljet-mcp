import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function addQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_query',
    description:
      "Create a data query on an app version's datasource. For a ToolJet-DB list query, options looks like " +
      '{ operation: "list_rows", table_name: "<table>", list_rows: {} }.',
    inputSchema: {
      version_id: z.string(),
      datasource_id: z.string(),
      name: z.string(),
      options: z.record(z.string(), z.any()),
    },
    async handler(args: {
      version_id: string;
      datasource_id: string;
      name: string;
      options: Record<string, unknown>;
    }) {
      try {
        const result = await client.createQuery({
          versionId: args.version_id,
          dataSourceId: args.datasource_id,
          name: args.name,
          options: args.options,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
