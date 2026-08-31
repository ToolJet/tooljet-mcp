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
  const versionId = request.version_id ?? fallbackVersionId;
  const datasourcesFor = async (vid: string) => {
    let pending = datasourceCache.get(vid);
    if (!pending) {
      pending = client.listDatasources(vid);
      datasourceCache.set(vid, pending);
    }
    return pending;
  };
  // Models routinely send both, and the two never actually conflict: datasource_id identifies one
  // saved datasource, kind merely restates its type. Erroring cost a full turn on five of five
  // measured OpenAI builds. Prefer the specific selector and drop the redundant one, matching how
  // inspect_datasource_schema already coalesces a top-level method with a `requests` batch.
  if (request.kind && request.datasource_id) {
    request = { ...request, kind: undefined };
  }
  if (!request.kind && !request.datasource_id) {
    // The frequent model mistake: version_id/operation/sections but no selector. Turn the error into
    // a one-shot recovery by naming the datasources available on this version, so the next call is correct.
    let hint = '';
    if (versionId) {
      try {
        const list = await datasourcesFor(versionId);
        if (list.length) {
          hint =
            ' Available on this version: ' +
            list.map((item) => `${item.kind} (datasource_id "${item.id}"${item.name ? `, "${item.name}"` : ''})`).join('; ') +
            '.';
        }
      } catch {
        /* fall through to the plain message if the datasource list can't be fetched */
      }
    }
    throw new Error(`Each schema request needs a \`kind\` or a \`datasource_id\`.${hint}`);
  }
  if (request.kind) return request.kind;
  if (!versionId) throw new Error('Resolving `datasource_id` requires `version_id`.');
  const datasource = (await datasourcesFor(versionId)).find((item) => item.id === request.datasource_id);
  if (!datasource) throw new Error(`Datasource "${request.datasource_id}" is not available on version "${versionId}".`);
  return datasource.kind;
}

export function getDatasourceQuerySchemaTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_datasource_query_schema',
    title: 'Get Datasource Query Schema',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'Get compact, operation-specific request contracts plus response shape/status when known. Unknown and runtime-dependent ' +
      'responses are labelled explicitly so callers know when a safe run or remote schema is still required. Call with no selector for the ' +
      'datasource palette; select by `kind`, or by `datasource_id` + `version_id` to resolve the kind automatically. ' +
      'Pass `operation` to avoid loading unrelated branches. `sections` defaults to summary/request/response for one ' +
      'operation; request raw plugin UI metadata only for diagnostics. `requests` batches up to 10 contracts; any ' +
      'top-level fields (kind/datasource_id/version_id/operation/sections) act as defaults for every entry, so mixing ' +
      'top-level and `requests` is fine.',
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
        const hasTopLevelSelector = !!args?.kind || !!args?.datasource_id;
        const hasBatch = !!args?.requests?.length;

        // No batch and no selector: the palette, or a misuse of operation/sections alone.
        if (!hasBatch && !hasTopLevelSelector) {
          if (args?.operation || args?.sections) {
            return fail(new Error('operation/sections require kind, datasource_id, or requests.'));
          }
          return ok(getDatasourceCatalog());
        }

        // Top-level fields act as defaults for every batch entry. Callers may put the selector
        // top-level, inside `requests`, or (as some models do) redundantly in both — each entry's
        // own fields win, and it inherits anything it omits from the top level. A per-entry selector
        // is atomic: if an entry names its own kind/datasource_id we don't graft the other kind of
        // selector onto it from the top level.
        const base = hasBatch ? args.requests! : [args];
        const requests: SchemaRequest[] = base.map((request) => {
          const hasOwnSelector = !!request.kind || !!request.datasource_id;
          return {
            kind: request.kind ?? (hasOwnSelector ? undefined : args.kind),
            datasource_id: request.datasource_id ?? (hasOwnSelector ? undefined : args.datasource_id),
            version_id: request.version_id ?? args.version_id,
            operation: request.operation ?? args.operation,
            sections: request.sections ?? args.sections,
          };
        });

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
        return ok(hasBatch ? { schemas } : schemas[0]);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
