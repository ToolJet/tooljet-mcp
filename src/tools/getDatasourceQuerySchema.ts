import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import {
  getDatasourceCatalog,
  selectDatasourceQuerySchema,
  type DatasourceSchemaSection,
} from '../datasourceCatalog.js';
import { ok, fail, type ToolDef } from './types.js';

const SECTIONS = ['summary', 'request', 'response', 'raw', 'introspection'] as const;
const requestSchema = z.object({
  kind: z.string().optional(),
  datasource_id: z.string().optional(),
  version_id: z.string().optional(),
  operation: z.string().optional(),
  sections: z.array(z.enum(SECTIONS)).min(1).optional(),
});

interface SchemaRequest {
  kind?: string;
  datasource_id?: string;
  version_id?: string;
  operation?: string;
  sections?: DatasourceSchemaSection[];
}

async function resolveKind(
  client: ToolJetClient,
  request: SchemaRequest,
  fallbackVersionId?: string,
  datasourceCache = new Map<string, ReturnType<ToolJetClient['listDatasources']>>()
): Promise<string> {
  if (!!request.kind === !!request.datasource_id) {
    throw new Error('Each schema request needs exactly one of `kind` or `datasource_id`.');
  }
  if (request.kind) return request.kind;
  const versionId = request.version_id ?? fallbackVersionId;
  if (!versionId) throw new Error('Resolving `datasource_id` requires `version_id`.');
  let pending = datasourceCache.get(versionId);
  if (!pending) {
    pending = client.listDatasources(versionId);
    datasourceCache.set(versionId, pending);
  }
  const datasource = (await pending).find((item) => item.id === request.datasource_id);
  if (!datasource) throw new Error(`Datasource "${request.datasource_id}" is not available on version "${versionId}".`);
  return datasource.kind;
}

export function getDatasourceQuerySchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_datasource_query_schema',
    description:
      'Get compact, operation-specific request contracts plus response shape/status when known. Unknown and runtime-dependent ' +
      'responses are labelled explicitly so callers know when a safe run or remote schema is still required. Call with no selector for the ' +
      'datasource palette; select by `kind`, or by `datasource_id` + `version_id` to resolve the kind automatically. ' +
      'Pass `operation` to avoid loading unrelated branches. `sections` defaults to summary/request/response for one ' +
      'operation; request raw plugin UI metadata only for diagnostics. `requests` batches up to 10 contracts.',
    inputSchema: {
      kind: z.string().optional(),
      datasource_id: z.string().optional(),
      version_id: z.string().optional(),
      operation: z.string().optional(),
      sections: z.array(z.enum(SECTIONS)).min(1).optional(),
      requests: z.array(requestSchema).min(1).max(10).optional(),
    },
    async handler(args: SchemaRequest & { requests?: SchemaRequest[] }) {
      try {
        const hasSingleSelector = !!args?.kind || !!args?.datasource_id;
        if (args?.requests?.length && hasSingleSelector) {
          return fail(new Error('Pass either top-level kind/datasource_id or `requests`, not both.'));
        }
        if (!args?.requests?.length && !hasSingleSelector) {
          if (args?.operation || args?.sections) {
            return fail(new Error('operation/sections require kind, datasource_id, or requests.'));
          }
          return ok(getDatasourceCatalog());
        }

        const requests = args.requests ?? [args];
        const datasourceCache = new Map<string, ReturnType<ToolJetClient['listDatasources']>>();
        const schemas = [];
        for (const request of requests) {
          const kind = await resolveKind(client, request, args.version_id, datasourceCache);
          const selected = selectDatasourceQuerySchema(kind, {
            operation: request.operation,
            sections: request.sections,
          });
          schemas.push(
            selected ?? { error: `Unknown datasource kind "${kind}". Call with no selector to list known schemas.` }
          );
        }
        return ok(args.requests ? { schemas } : schemas[0]);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
