import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getDatasourceCatalog, getDatasourceQuerySchema } from '../datasourceCatalog.js';
import { ok, fail, type ToolDef } from './types.js';

export function getDatasourceQuerySchemaTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_datasource_query_schema',
    description:
      'Discover the exact `options` contract for add_query/add_queries. Call without `kind` for a compact list of datasource kinds and operations; call with a kind from list_datasources (for example postgresql, mongodb, restapi, or tooljetdb) for defaults and the complete first-party query schema. Use this before generating queries, especially pagination/filter/sort and bulk operations.',
    inputSchema: { kind: z.string().optional() },
    async handler(args: { kind?: string }) {
      try {
        if (!args?.kind) return ok(getDatasourceCatalog());
        const schema = getDatasourceQuerySchema(args.kind);
        if (!schema) return ok({ error: `Unknown datasource kind "${args.kind}". Call without kind to list known schemas.` });
        return ok(schema);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
