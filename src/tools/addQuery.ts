import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { issueMessages, normalizeQueryOptions, validateQueryOptions } from '../queryValidation.js';
import { ok, fail, type ToolDef } from './types.js';

export function addQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_query',
    title: 'Add Query',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      "Create a query on an app version's datasource (ANY datasource — ToolJet DB, Postgres, RunJS, ServiceNow, …). " +
      'The query kind is resolved from datasource_id. Options are contract-validated before the write; known-invalid ' +
      'operations/missing required fields block, while unknown keys are returned in `warnings` because ToolJet may ' +
      'silently drop them. Call get_datasource_query_schema with datasource_id + version_id + operation first.',
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
        const datasource = (await client.listDatasources(args.version_id)).find(
          (item) => item.id === args.datasource_id
        );
        if (!datasource) {
          return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
        }
        // See addQueries.ts: repair a flat {column: value} write map before validating so the
        // persisted query is never the shape that silently sends an empty body at runtime.
        const options = normalizeQueryOptions(datasource.kind, args.options);
        const validation = validateQueryOptions(datasource.kind, options);
        if (validation.errors.length) return fail(new Error(issueMessages(validation.errors).join(' ')));
        const warnings = issueMessages(validation.warnings);
        if (options !== args.options) {
          warnings.push(
            `Rewrote the ${String(options.operation)} column map to ToolJet's {index: {column, value}} shape; ` +
              'the flat {column: value} form sends an empty body and fails at runtime.'
          );
        }
        if (args.kind && args.kind !== datasource.kind) {
          warnings.push(
            `Caller kind "${args.kind}" was ignored; datasource "${args.datasource_id}" is kind "${datasource.kind}".`
          );
        }
        const result = await client.createQuery({
          versionId: args.version_id,
          dataSourceId: args.datasource_id,
          name: args.name,
          options: options,
          kind: datasource.kind,
        });
        return ok({
          ...result,
          warnings,
          validation: { kind: datasource.kind, operation: validation.operation, schema_found: validation.schemaFound },
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
