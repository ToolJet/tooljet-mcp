import { z } from 'zod';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';
import { prepareSqlDiscoveryQueries, type SqlDiscoveryPurpose } from '../sqlDiscovery.js';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const purposes = ['count', 'preview', 'distinct', 'primary_keys', 'foreign_keys', 'indexes', 'views'] as const;

export function prepareSqlDiscoveryQueriesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'prepare_sql_discovery_queries',
    description:
      'Prepare—but do not create or run—read-only SQL query specs for a connected SQL datasource. Produces ' +
      'add_queries-compatible count, explicit-column bounded preview/distinct, and verified metadata queries for ' +
      'primary keys, foreign keys, indexes, and views where the dialect is curated. It never emits SELECT *; ' +
      'preview/distinct limits are hard-capped at 100. Add the returned specs in one add_queries call, then use ' +
      'run_query under its count/large/billable-read safeguards.',
    inputSchema: {
      version_id: z.string().min(1),
      datasource_id: z.string().min(1),
      schema: z.string().min(1).max(256).optional(),
      table: z.string().min(1).max(256).optional(),
      columns: z.array(z.string().min(1).max(256)).min(1).max(50).optional(),
      distinct_columns: z.array(z.string().min(1).max(256)).min(1).max(10).optional(),
      purposes: z.array(z.enum(purposes)).min(1).max(purposes.length).optional(),
      preview_limit: z.number().int().positive().max(100).optional(),
      name_prefix: z.string().min(1).max(40).optional(),
    },
    async handler(args: {
      version_id: string;
      datasource_id: string;
      schema?: string;
      table?: string;
      columns?: string[];
      distinct_columns?: string[];
      purposes?: SqlDiscoveryPurpose[];
      preview_limit?: number;
      name_prefix?: string;
    }) {
      try {
        const datasource = (await client.listDatasources(args.version_id))
          .find((candidate) => candidate.id === args.datasource_id);
        if (!datasource) throw new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`);
        if (!getDatasourceQuerySchema(datasource.kind)?.contracts.sql) {
          throw new Error(`Datasource kind "${datasource.kind}" does not publish a SQL-mode query contract.`);
        }
        const prepared = prepareSqlDiscoveryQueries({
          kind: datasource.kind,
          datasourceId: datasource.id,
          schema: args.schema,
          table: args.table,
          columns: args.columns,
          distinctColumns: args.distinct_columns,
          purposes: args.purposes ?? ['count', 'preview'],
          limit: args.preview_limit ?? 25,
          namePrefix: args.name_prefix,
        });
        return ok({
          datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind },
          ...prepared,
          safety: {
            created_or_executed: false,
            select_star_generated: false,
            next_step: 'Pass queries to add_queries in one batch. Run only selected saved reads with run_query.',
            server_side_pagination_threshold: 1000,
            billable_read_confirmation_required: ['bigquery', 'snowflake', 'redshift'].includes(datasource.kind),
          },
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
