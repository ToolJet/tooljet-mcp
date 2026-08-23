import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';
import { ok, fail, type ToolDef } from './types.js';

const requestSchema = z.object({
  method: z.string().min(1),
  schema: z.string().optional(),
  table: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  args: z.record(z.string(), z.any()).optional(),
});

type SchemaRequest = z.infer<typeof requestSchema>;

function invokeArgs(request: SchemaRequest): Record<string, unknown> {
  const customValues =
    request.args?.values && typeof request.args.values === 'object' && !Array.isArray(request.args.values)
      ? request.args.values as Record<string, unknown>
      : {};
  const values = {
    ...customValues,
    ...(request.schema !== undefined ? { schema: request.schema } : {}),
    ...(request.table !== undefined ? { table: request.table } : {}),
  };
  return {
    ...(request.args ?? {}),
    ...(Object.keys(values).length ? { values } : {}),
    ...(request.search !== undefined ? { search: request.search } : {}),
    ...(request.page !== undefined ? { page: request.page } : {}),
    ...(request.limit !== undefined ? { limit: request.limit } : {}),
  };
}

export function inspectDatasourceSchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'inspect_datasource_schema',
    description:
      'Invoke one read-only metadata method advertised by a connected datasource plugin (for example listSchemas, ' +
      'listTables, listColumns, or listCollections). This avoids creating/running ad-hoc information_schema queries. ' +
      'Use get_datasource_query_schema with sections:["introspection"] to discover exact methods. Common schema/table/' +
      'search/page/limit inputs are converted to ToolJet selector args; `args` adds plugin-specific fields. Only the ' +
      'requested metadata method is called. Use requests (up to 20) to batch independent table/column lookups ' +
      'after the schema/table names are known; every method is validated before any invocation.',
    inputSchema: {
      version_id: z.string(),
      datasource_id: z.string(),
      method: z.string().min(1).optional(),
      schema: z.string().optional(),
      table: z.string().optional(),
      search: z.string().optional(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      args: z.record(z.string(), z.any()).optional(),
      requests: z.array(requestSchema).min(1).max(20).optional(),
    },
    async handler(args: {
      version_id: string;
      datasource_id: string;
      method?: string;
      schema?: string;
      table?: string;
      search?: string;
      page?: number;
      limit?: number;
      args?: Record<string, unknown>;
      requests?: SchemaRequest[];
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
        // Coalesce a top-level method and a `requests` batch into one deduped list, so callers
        // can pass either or (as some models do) both without hitting a mutual-exclusion error.
        const topLevel: SchemaRequest[] = args.method
          ? [{ method: args.method, schema: args.schema, table: args.table, search: args.search,
               page: args.page, limit: args.limit, args: args.args }]
          : [];
        const seenRequests = new Set<string>();
        const requests: SchemaRequest[] = [...(args.requests ?? []), ...topLevel].filter((request) => {
          if (!request.method) return false;
          const key = JSON.stringify([request.method, request.schema ?? null, request.table ?? null, request.search ?? null]);
          if (seenRequests.has(key)) return false;
          seenRequests.add(key);
          return true;
        });
        if (!requests.length) {
          return fail(new Error('Provide a `method` or a `requests` batch.'));
        }
        const asBatch = !!args.requests?.length || requests.length > 1;
        const unsupported = [...new Set(requests.map((request) => request.method).filter((method) => !methods.includes(method)))];
        if (unsupported.length) {
          return fail(
            new Error(
              `Datasource kind "${datasource.kind}" does not advertise introspection method(s) ${unsupported.map((method) => `"${method}"`).join(', ')}. ` +
                `Available methods: ${methods.length ? methods.join(', ') : 'none'}.`
            )
          );
        }
        const results = await Promise.all(requests.map(async (request) => {
          const converted = invokeArgs(request);
          const result = await client.invokeDatasourceMethod({
            dataSourceId: args.datasource_id,
            method: request.method,
            ...(Object.keys(converted).length ? { args: converted } : {}),
          });
          return { method: request.method, ...(request.schema ? { schema: request.schema } : {}),
            ...(request.table ? { table: request.table } : {}), result };
        }));
        const header = { datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind } };
        return asBatch
          ? ok({ ...header, results })
          : ok({ ...header, method: results[0]!.method, result: results[0]!.result });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
