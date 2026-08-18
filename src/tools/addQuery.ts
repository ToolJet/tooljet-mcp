import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { issueMessages, validateQueryOptions } from '../queryValidation.js';
import { ok, fail, type ToolDef } from './types.js';

export function addQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_query',
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
        const validation = validateQueryOptions(datasource.kind, args.options);
        if (validation.errors.length) return fail(new Error(issueMessages(validation.errors).join(' ')));
        const warnings = issueMessages(validation.warnings);
        if (args.kind && args.kind !== datasource.kind) {
          warnings.push(
            `Caller kind "${args.kind}" was ignored; datasource "${args.datasource_id}" is kind "${datasource.kind}".`
          );
        }
        const result = await client.createQuery({
          versionId: args.version_id,
          dataSourceId: args.datasource_id,
          name: args.name,
          options: args.options,
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
