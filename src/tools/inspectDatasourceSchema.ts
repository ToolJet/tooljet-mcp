import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';
import { extractSpec, listEndpoints, endpointParameters, specHost, rankEndpoints, endpointTagCounts } from '../openapiSpec.js';
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


/* The parsed spec, cached by the exact text it was parsed from.
 *
 * A spec is fetched, not free: it lives in the datasource's options row, so one read is
 * unavoidable. Parsing it is the expensive half — GitHub's public spec is ~10MB of YAML and takes
 * seconds — and a build calls getEndpointSchema once per endpoint it wires, so the same document
 * would otherwise be re-parsed on every call.
 *
 * Keying on the raw text rather than the datasource id makes the cache self-invalidating: a spec
 * edited between calls hashes differently and is re-parsed, so a stale document can never be
 * served. The map is bounded because a build touches only a handful of datasources. */
const specCache = new Map<string, Record<string, any>>();

function specText(entry: unknown): string | undefined {
  const raw = entry && typeof entry === 'object' && 'value' in (entry as any) ? (entry as any).value : entry;
  return typeof raw === 'string' ? raw : undefined;
}

function parseSpecCached(options: Record<string, unknown>): Record<string, any> | undefined {
  // Whichever key holds the document is the cache key; extractSpec decides which one wins.
  const key = specText(options.spec) ?? specText(options.definition);
  if (key === undefined) return extractSpec(options);
  const hit = specCache.get(key);
  if (hit) return hit;
  const parsed = extractSpec(options);
  if (parsed) {
    if (specCache.size > 8) specCache.clear();
    specCache.set(key, parsed);
  }
  return parsed;
}

/* openapi advertises listTables/getEndpointSchema but its plugin has no `invokeMethod`, so the
   /invoke route these normally use answers 400. Serve them from the stored spec instead.

   The spec is resolved once per tool invocation and passed in, not fetched per request: a batch of
   getEndpointSchema calls asks about several endpoints of the *same* document. */
function openapiIntrospection(
  spec: Record<string, any>,
  request: SchemaRequest
): unknown {
  if (request.method === 'listTables') {
    const endpoints = listEndpoints(spec);
    const host = specHost(spec);
    const header = { total: endpoints.length, ...(host ? { host } : {}) };

    if (request.search) {
      const ranked = rankEndpoints(spec, endpoints, request.search);
      const limit = request.limit ?? 25;
      return {
        ...header,
        search: request.search,
        matched: ranked.length,
        ...(ranked.length > limit ? { returned: limit } : {}),
        // Ordered by relevance, not spec order: the caller should read from the top.
        endpoints: ranked.slice(0, limit).map(({ score, ...endpoint }) => endpoint),
        ...(ranked.length ? {} : { hint: 'No endpoint matched. Retry with a broader term, or omit `search` to see the spec\'s tags.' }),
      };
    }

    // No query: a truncated alphabetical slice of a large spec teaches nothing, so lead with the
    // spec's own table of contents and let the caller search within it.
    const limit = request.limit ?? 200;
    if (endpoints.length > limit) {
      return {
        ...header,
        tags: endpointTagCounts(spec, endpoints),
        returned: limit,
        truncated: true,
        next_step: `This spec has ${endpoints.length} endpoints. Call listTables again with \`search\` describing what you need (a phrase is fine, it is ranked by relevance), or with a tag name from \`tags\`.`,
        endpoints: endpoints.slice(0, limit),
      };
    }
    return { ...header, endpoints };
  }
  /* getEndpointSchema: `table` carries the path, `args.<something>` the HTTP method.
     The method arrives under whichever name the caller reaches for — a real build asked with
     `args.httpMethod`, lost a round trip to the error below, and retried with `operation`. For a
     kind whose `operation` IS the HTTP method, every one of these spellings is unambiguous, so
     accept them rather than spending a call teaching the caller our preferred one. */
  const path = request.table ?? (typeof request.args?.path === 'string' ? request.args.path : undefined);
  const method = ['operation', 'method', 'httpMethod', 'http_method', 'verb']
    .map((key) => request.args?.[key])
    .find((value): value is string => typeof value === 'string' && !!value);
  if (!path || !method) {
    throw new Error(
      'getEndpointSchema needs the endpoint path and HTTP method: pass the path as `table` and the method as ' +
        '`args.operation` (for example table:"/pets/{petId}", args:{operation:"get"}); `args.httpMethod` and '+
        '`args.method` are accepted too.'
    );
  }
  const result = endpointParameters(spec, path, method);
  if (!result.found) {
    throw new Error(`The spec has no ${method.toLowerCase()} operation on path "${path}". Call listTables first.`);
  }
  const buckets: Record<string, string[]> = {};
  for (const parameter of result.parameters) {
    const bucket = parameter.in === 'header' ? 'params.header'
      : parameter.in === 'path' ? 'params.path'
      : parameter.in === 'query' ? 'params.query'
      : `unsupported:${parameter.in}`;
    (buckets[bucket] ??= []).push(parameter.name);
  }
  if (result.requestBody) buckets['params.request'] = ['<request body>'];
  const operation = method.toLowerCase();
  const host = specHost(spec);
  return {
    path,
    operation,
    /* A runnable skeleton, not just a description: copy it and fill the buckets.
       All four buckets are present even when empty because the plugin destructures every one of
       them and calls Object.entries(params.path) unguarded — omitting a bucket fails the query with
       "Cannot convert undefined or null to object" before the request is ever built. */
    query_options: {
      ...(host ? { host } : {}),
      path,
      operation,
      params: { request: {}, query: {}, header: {}, path: {} },
    },
    // Which query-option bucket each parameter belongs in, so the caller does not have to infer it.
    buckets,
    parameters: result.parameters,
    ...(result.requestBody ? { requestBody: result.requestBody } : {}),
    ...(host ? {} : { host_warning: 'This spec declares no server URL. The query needs an explicit `host`, or the request fails with "Invalid URL".' }),
  };
}

export function inspectDatasourceSchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'inspect_datasource_schema',
    title: 'Inspect Datasource Schema',
    // Invokes only plugin-advertised read-only metadata methods.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
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
        // One read + one parse for the whole batch, whatever it asks about.
        let openapiSpec: Record<string, any> | undefined;
        if (datasource.kind === 'openapi') {
          const details = await client.getDatasourceConnectionDetails(args.datasource_id);
          openapiSpec = parseSpecCached(details.options);
          if (!openapiSpec) {
            return fail(new Error(
              'This OpenAPI datasource has no readable spec stored in its options, so its endpoints cannot be listed. ' +
                'Re-save the datasource with a valid OpenAPI/Swagger (JSON or YAML) document.'
            ));
          }
        }
        const results = await Promise.all(requests.map(async (request) => {
          if (openapiSpec) {
            const result = openapiIntrospection(openapiSpec, request);
            return { method: request.method, ...(request.table ? { table: request.table } : {}), result };
          }
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
