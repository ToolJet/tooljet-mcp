import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { issueMessages, normalizeQueryOptions, validateQueryOptions } from '../queryValidation.js';
import { ok, fail, type ToolDef } from './types.js';

const querySchema = z.object({
  datasource_id: z.string(),
  name: z.string(),
  options: z.record(z.string(), z.any()),
  kind: z.string().optional(),
});

export function addQueriesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_queries',
    title: 'Add Queries',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      "Create MANY queries in a single call (all share version_id). Prefer this over repeated add_query " +
      'when building an app. Each query names its own datasource_id and options. Call get_datasource_query_schema ' +
      'for the operations you use before constructing those options. The batch resolves datasource kinds once, ' +
      'contract-validates every query before any writes, and returns {queries,warnings,validation}. ToolJet has no query bulk ' +
      'transaction: a rare partial failure names every persisted query; do not retry the whole batch.',
    inputSchema: {
      version_id: z.string(),
      queries: z
        .array(querySchema)
        .min(1),
    },
    async handler(args: {
      version_id: string;
      queries: Array<{ datasource_id: string; name: string; options: Record<string, unknown>; kind?: string }>;
    }) {
      try {
        const datasources = await client.listDatasources(args.version_id);
        const datasourceById = new Map(datasources.map((datasource) => [datasource.id, datasource]));
        const warnings: string[] = [];
        const validations: Array<{ name: string; kind: string; operation?: string; schema_found: boolean }> = [];
        const resolved = args.queries.map((query) => {
          const datasource = datasourceById.get(query.datasource_id);
          if (!datasource) {
            throw new Error(`Query "${query.name}": datasource "${query.datasource_id}" is not available on version "${args.version_id}".`);
          }
          // Repair a flat {column: value} write map before validating, so an unambiguous authoring
          // slip is fixed here instead of costing a build turn (the validator still errors on
          // anything this cannot confidently normalize).
          const options = normalizeQueryOptions(datasource.kind, query.options);
          if (options !== query.options) {
            warnings.push(
              `Query "${query.name}": rewrote the ${String(options.operation)} column map to ToolJet's ` +
                '{index: {column, value}} shape; the flat {column: value} form sends an empty body and fails at runtime.'
            );
          }
          const validation = validateQueryOptions(datasource.kind, options);
          if (validation.errors.length) {
            throw new Error(issueMessages(validation.errors, `Query "${query.name}"`).join(' '));
          }
          warnings.push(...issueMessages(validation.warnings, `Query "${query.name}"`));
          if (query.kind && query.kind !== datasource.kind) {
            warnings.push(
              `Query "${query.name}": caller kind "${query.kind}" was ignored; datasource kind is "${datasource.kind}".`
            );
          }
          validations.push({
            name: query.name,
            kind: datasource.kind,
            operation: validation.operation,
            schema_found: validation.schemaFound,
          });
          return { query: { ...query, options }, kind: datasource.kind };
        });
        const result = await client.createQueries({
          versionId: args.version_id,
          queries: resolved.map(({ query, kind }) => ({
            dataSourceId: query.datasource_id,
            name: query.name,
            options: query.options,
            kind,
          })),
        });
        return ok({ queries: result, warnings, validation: validations });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
