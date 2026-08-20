import { z } from 'zod';
import { componentInputSchema } from './componentBatch.js';

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
  type: z.string(),
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
  datasource_id: z.string(),
  name: z.string(),
  kind: z.string().optional(),
  /** Resolve this planned/existing ToolJet DB table name into options.table_id during lint/apply. */
  table_ref: z.string().optional(),
  options: z.record(z.string(), z.any()),
});
export const plannedPageSchema = z.object({
  client_ref: z.string().optional(),
  name: z.string(),
  icon: z.string().min(1),
  hidden: z.boolean().optional(),
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
  tables: z.array(plannedTableSchema).max(50).optional(),
  seed_data: z.array(plannedSeedSchema).max(50).optional(),
  queries: z.array(plannedQuerySchema).max(200).optional(),
  pages: z.array(plannedPageSchema).max(50).optional(),
  events: z.array(plannedEventSchema).max(1000).optional(),
  lifecycles: z.array(plannedLifecycleSchema).max(200).optional(),
});

export type AppPlanInput = z.infer<typeof appPlanSchema>;
