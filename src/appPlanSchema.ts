import { z } from 'zod';
import { dbColumnTypeSchema } from './dbColumnTypeSchema.js';
import { componentInputSchema } from './componentBatch.js';
import { pageIconSchema } from './pageIcons.js';

const foreignKeyAction = z.enum(['RESTRICT', 'NO ACTION', 'CASCADE', 'SET NULL', 'SET DEFAULT']);
const foreignKeySchema = z.object({
  columns: z.array(z.string()).min(1),
  referencedTable: z.string(),
  referencedColumns: z.array(z.string()).min(1),
  onDelete: foreignKeyAction.optional(),
  onUpdate: foreignKeyAction.optional(),
});
const columnSchema = z.object({
  name: z.string(),
  type: dbColumnTypeSchema,
  primaryKey: z.boolean().optional(),
  notNull: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.any().optional(),
  configurations: z.record(z.string(), z.any()).optional(),
});
export const plannedTableSchema = z.object({
  table_name: z.string(),
  columns: z.array(columnSchema).min(1),
  foreign_keys: z.array(foreignKeySchema).optional(),
});
export const plannedSeedSchema = z.object({
  table_name: z.string(),
  rows: z.array(z.record(z.string(), z.any())).min(1).max(40),
});
export const plannedQuerySchema = z.object({
  client_ref: z.string().optional(),
  datasource_id: z.string().optional().describe('Exact id returned by list_datasources(version_id). Provide this OR datasource_name, not both.'),
  datasource_name: z.string().optional().describe('Exact, case-sensitive unique name returned by list_datasources(version_id). Alternative to datasource_id; resolved and pinned to that id at lint time.'),
  name: z.string(),
  kind: z.string().optional(),
  /** Resolve this planned/existing ToolJet DB table name into options.table_id during lint/apply. */
  table_ref: z.string().optional().describe('Actual table_name of a planned or existing ToolJet DB table, not a client_ref, alias, or UUID.'),
  options: z.record(z.string(), z.any()),
  /** The app's query of this name is updated in place with this definition: see pageReplace.ts. */
  update: z.boolean().optional().describe(
    'true: when the app already has a query of this name, it is updated in place with this definition, keeping its id ' +
      'and the events that run it, for every page that reads it (needs app_id). Without it, defining an existing name ' +
      'again is refused unless the definition is identical (then the existing query is used) or a replaced page owns it.'
  ),
});
export const plannedPageSchema = z.object({
  client_ref: z.string().optional(),
  name: z.string(),
  icon: pageIconSchema,
  hidden: z.boolean().optional(),
  /** The existing page of this name is replaced whole: see pageReplace.ts. */
  replace: z.boolean().optional().describe(
    'true: the existing page of this name ends up holding exactly this plan\'s components and the events on them ' +
      '(needs app_id). It is written as a difference: a component the plan leaves as it is is not rewritten, one that ' +
      'only moved is moved, and one that changed keeps its id. Queries of that page the plan defines again are updated ' +
      'in place, keeping their ids. Refused when another page, event or query reads a component the plan drops. Not ' +
      'atomic: use it on draft or otherwise recoverable pages.'
  ),
  components: z.array(componentInputSchema).optional(),
});
export const plannedEventSchema = z.object({
  source_ref: z.string(),
  source_type: z.enum(['component', 'data_query', 'page', 'table_column', 'table_action']),
  ref: z.string().optional(),
  trigger: z.string(),
  action: z.record(z.string(), z.any()),
  name: z.string().optional(),
});
const alertSchema = z.object({
  message: z.string().min(1),
  alert_type: z.enum(['success', 'info', 'warning', 'error']).optional(),
});
export const plannedLifecycleSchema = z.object({
  query_ref: z.string(),
  before_refresh_actions: z.array(z.record(z.string(), z.any())).optional(),
  refresh_query_refs: z.array(z.string()).optional(),
  clear_component_refs: z.array(z.string()).optional(),
  close_modal_ref: z.string().optional(),
  success_alert: alertSchema.optional(),
  failure_alert: alertSchema.optional(),
  success_actions: z.array(z.record(z.string(), z.any())).optional(),
  failure_actions: z.array(z.record(z.string(), z.any())).optional(),
});

export const appPlanSchema = z.object({
  /** Existing app context for repair phases. Lets lint/apply resolve persisted refs safely. */
  app_id: z.string().optional(),
  version_id: z.string().optional(),
  /** Rename the target app as part of the same governed phase. */
  app_name: z.string().trim().min(1).max(100).optional(),
  tables: z.array(plannedTableSchema).max(50).optional(),
  seed_data: z.array(plannedSeedSchema).max(50).optional(),
  queries: z.array(plannedQuerySchema).max(200).optional(),
  pages: z.array(plannedPageSchema).max(50).optional(),
  events: z.array(plannedEventSchema).max(1000).optional(),
  lifecycles: z.array(plannedLifecycleSchema).max(200).optional(),
});

export type AppPlanInput = z.infer<typeof appPlanSchema>;
