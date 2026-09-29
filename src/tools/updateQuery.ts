import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { prepareQueryOptionsForWrite } from '../queryPersistence.js';
import { ok, fail, type ToolDef } from './types.js';
import { resolveRef } from '../refResolution.js';
import { inspectUpdateCompatibility } from '../tableQueryCompatibility.js';

export function updateQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_query',
    title: 'Update Query',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Change an existing query in place. `options` REPLACES the stored options wholesale — send the ' +
      'FULL options object, not a partial. Pass app_id so the existing query kind is resolved and options are ' +
      'validated. To repoint a query, also pass datasource_id; validation happens before the datasource changes, ' +
      'and MCP attempts to roll back the source if the subsequent option update fails. The query toggles (runOnPageLoad, ' +
      'runOnDependencyChange, requestConfirmation, showSuccessNotification) must be true or false on every call.',
    inputSchema: {
      query_id: z.string().optional().describe('the query id, or its name; with only name given, name picks the query'),
      version_id: z.string(),
      app_id: z.string().optional(),
      datasource_id: z.string().optional(),
      kind: z.string().optional(),
      options: z.record(z.string(), z.any()),
      name: z.string().optional(),
    },
    async handler(input: {
      query_id?: string;
      version_id: string;
      app_id?: string;
      datasource_id?: string;
      kind?: string;
      options: Record<string, unknown>;
      name?: string;
    }) {
      try {
        // name without query_id picks the query (cy-grants rg3 called update_query with name only and lost a turn to
        // "expected string, received undefined at query_id"); name beside query_id stays a rename.
        if (!input.query_id && !input.name) return fail(new Error('update_query needs query_id (the query id or name).'));
        let args = { ...input, query_id: (input.query_id ?? input.name)!, name: input.query_id ? input.name : undefined };
        if (args.datasource_id && !args.app_id) {
          return fail(new Error('Changing datasource_id requires app_id so MCP can validate and roll back safely.'));
        }
        const resolutionWarnings: string[] = [];
        let currentDatasourceId: string | undefined;
        let kind = args.kind;
        if (args.app_id) {
          const summary = await client.getAppSummary(args.app_id);
          // Accept a query NAME as query_id: the name is the handle the model authored and what every
          // binding uses ({{queries.createVehicle.data}}). Matching on id alone produced a FALSE
          // "was not found" for a query that plainly exists — observed live, where the model then tried
          // to CREATE a duplicate and the next lint answered "App already has a query named X",
          // flatly contradicting the error it had just been given. See src/refResolution.ts.
          const resolution = resolveRef(summary.queries, args.query_id, 'Query', `in app "${args.app_id}"`);
          if (!resolution.ok) return fail(new Error(resolution.error));
          if (resolution.warning) resolutionWarnings.push(resolution.warning);
          const query = resolution.target;
          args = { ...args, query_id: query.id };
          currentDatasourceId = query.data_source_id;
          kind = query.kind ?? kind;
        }
        if (args.datasource_id) {
          if (!currentDatasourceId) {
            return fail(
              new Error(`Query "${args.query_id}" has no current datasource id in the app summary; refusing an unrollbackable repoint.`)
            );
          }
          const datasource = (await client.listDatasources(args.version_id)).find(
            (item) => item.id === args.datasource_id
          );
          if (!datasource) {
            return fail(new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`));
          }
          kind = datasource.kind;
        }

        // The shared write preparation. Its toggle rules hold with or without a kind; the kind's normalization and
        // contract only when this call can resolve it (a bare query_id + version_id update cannot).
        const prepared = prepareQueryOptionsForWrite(kind, args.options);
        if (prepared.errors.length) return fail(new Error(prepared.errors.join(' ')));
        const warnings: string[] = [...resolutionWarnings, ...prepared.warnings];
        const { options, validation } = prepared;
        if (!kind) warnings.push('Query options were not contract-validated; pass app_id or kind on update_query.');

        warnings.push(...await inspectUpdateCompatibility(client, [{ name: args.name ?? args.query_id, kind, options }]));
        if (args.datasource_id && args.datasource_id !== currentDatasourceId) {
          await client.updateQueryDatasource({
            queryId: args.query_id,
            versionId: args.version_id,
            dataSourceId: args.datasource_id,
          });
        }
        let result;
        try {
          result = await client.updateQuery({
            queryId: args.query_id,
            versionId: args.version_id,
            options: options,
            name: args.name,
          });
        } catch (error) {
          if (args.datasource_id && currentDatasourceId && args.datasource_id !== currentDatasourceId) {
            try {
              await client.updateQueryDatasource({
                queryId: args.query_id,
                versionId: args.version_id,
                dataSourceId: currentDatasourceId,
              });
            } catch {
              throw new Error(
                `Query update failed after changing datasource, and rollback to ${currentDatasourceId} also failed: ${String(error)}`
              );
            }
          }
          throw error;
        }
        return ok({
          ...result,
          ...(args.datasource_id ? { datasource_id: args.datasource_id } : {}),
          warnings,
          validation: validation
            ? { kind, operation: validation.operation, schema_found: validation.schemaFound }
            : { schema_found: false },
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
