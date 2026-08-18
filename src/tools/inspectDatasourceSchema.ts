import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';
import { ok, fail, type ToolDef } from './types.js';

export function inspectDatasourceSchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'inspect_datasource_schema',
    description:
      'Invoke one read-only metadata method advertised by a connected datasource plugin (for example listSchemas, ' +
      'listTables, listColumns, or listCollections). This avoids creating/running ad-hoc information_schema queries. ' +
      'Use get_datasource_query_schema with sections:["introspection"] to discover exact methods. Common schema/table/' +
      'search/page/limit inputs are converted to ToolJet selector args; `args` adds plugin-specific fields. Only the ' +
      'requested metadata method is called.',
    inputSchema: {
      version_id: z.string(),
      datasource_id: z.string(),
      method: z.string().min(1),
      schema: z.string().optional(),
      table: z.string().optional(),
      search: z.string().optional(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      args: z.record(z.string(), z.any()).optional(),
    },
    async handler(args: {
      version_id: string;
      datasource_id: string;
      method: string;
      schema?: string;
      table?: string;
      search?: string;
      page?: number;
      limit?: number;
      args?: Record<string, unknown>;
    }) {
      try {
        const datasource = (await client.listDatasources(args.version_id)).find(
          (candidate) => candidate.id === args.datasource_id
        );
        if (!datasource) {
          return fail(
            new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`)
          );
        }
        const contract = getDatasourceQuerySchema(datasource.kind);
        const methods = contract?.introspectionMethods ?? [];
        if (!methods.includes(args.method)) {
          return fail(
            new Error(
              `Datasource kind "${datasource.kind}" does not advertise introspection method "${args.method}". ` +
                `Available methods: ${methods.length ? methods.join(', ') : 'none'}.`
            )
          );
        }
        const customValues =
          args.args?.values && typeof args.args.values === 'object' && !Array.isArray(args.args.values)
            ? (args.args.values as Record<string, unknown>)
            : {};
        const values = {
          ...customValues,
          ...(args.schema !== undefined ? { schema: args.schema } : {}),
          ...(args.table !== undefined ? { table: args.table } : {}),
        };
        const invokeArgs: Record<string, unknown> = {
          ...(args.args ?? {}),
          ...(Object.keys(values).length ? { values } : {}),
          ...(args.search !== undefined ? { search: args.search } : {}),
          ...(args.page !== undefined ? { page: args.page } : {}),
          ...(args.limit !== undefined ? { limit: args.limit } : {}),
        };
        const result = await client.invokeDatasourceMethod({
          dataSourceId: args.datasource_id,
          method: args.method,
          ...(Object.keys(invokeArgs).length ? { args: invokeArgs } : {}),
        });
        return ok({ datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind }, method: args.method, result });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
