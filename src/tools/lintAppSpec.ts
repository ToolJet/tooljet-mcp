import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintPlannedApp } from '../appSpecLint.js';
import { ok, fail, type ToolDef } from './types.js';
import { COMPONENT_SLOT_NAMES } from '../componentParent.js';

const layoutSchema = z.object({ top: z.number(), left: z.number(), width: z.number(), height: z.number() });
const componentSchema = z.object({
  name: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()),
  styles: z.record(z.string(), z.any()).optional(),
  validation: z.record(z.string(), z.any()).optional(),
  others: z.record(z.string(), z.any()).optional(),
  layout: layoutSchema.optional(),
  layouts: z.object({ desktop: layoutSchema.optional(), mobile: layoutSchema.optional() }).optional(),
  client_ref: z.string().optional(),
  parent_ref: z.string().optional(),
  parent: z.string().optional(),
  slot_name: z.enum(COMPONENT_SLOT_NAMES).optional(),
});
const columnSchema = z.object({
  name: z.string(), type: z.string(), primaryKey: z.boolean().optional(), notNull: z.boolean().optional(),
  unique: z.boolean().optional(), defaultValue: z.any().optional(), configurations: z.record(z.string(), z.any()).optional(),
});
const foreignKeyAction = z.enum(['RESTRICT', 'NO ACTION', 'CASCADE', 'SET NULL', 'SET DEFAULT']);
const foreignKeySchema = z.object({
  columns: z.array(z.string()).min(1), referencedTable: z.string(), referencedColumns: z.array(z.string()).min(1),
  onDelete: foreignKeyAction.optional(), onUpdate: foreignKeyAction.optional(),
});
const tableSchema = z.object({
  table_name: z.string(), columns: z.array(columnSchema).min(1), foreign_keys: z.array(foreignKeySchema).optional(),
});
const querySchema = z.object({
  client_ref: z.string().optional(), datasource_id: z.string().optional(), name: z.string(), kind: z.string().optional(),
  options: z.record(z.string(), z.any()),
});
const pageSchema = z.object({
  client_ref: z.string().optional(), name: z.string(), icon: z.string().min(1), hidden: z.boolean().optional(),
  components: z.array(componentSchema).optional(),
});
const eventSchema = z.object({
  source_ref: z.string(),
  source_type: z.enum(['component', 'data_query', 'page', 'table_column', 'table_action']),
  ref: z.string().optional(),
  trigger: z.string(),
  action: z.record(z.string(), z.any()),
  name: z.string().optional(),
});
const alertSchema = z.object({
  message: z.string().min(1), alert_type: z.enum(['success', 'info', 'warning', 'error']).optional(),
});
const lifecycleSchema = z.object({
  query_ref: z.string(),
  refresh_query_refs: z.array(z.string()).optional(),
  clear_component_refs: z.array(z.string()).optional(),
  close_modal_ref: z.string().optional(),
  success_alert: alertSchema.optional(),
  failure_alert: alertSchema.optional(),
  success_actions: z.array(z.record(z.string(), z.any())).optional(),
  failure_actions: z.array(z.record(z.string(), z.any())).optional(),
});

type ToolArgs = {
  version_id?: string;
  tables?: Array<z.infer<typeof tableSchema>>;
  queries?: Array<z.infer<typeof querySchema>>;
  pages?: Array<z.infer<typeof pageSchema>>;
  events?: Array<z.infer<typeof eventSchema>>;
  lifecycles?: Array<z.infer<typeof lifecycleSchema>>;
};

export function lintAppSpecTool(client: ToolJetClient): ToolDef {
  return {
    name: 'lint_app_spec',
    description:
      'Dry-run a planned app before any writes. It validates optional tables, queries, pages/components, events, and concise query ' +
      'lifecycles together. Give pages, queries, and components stable client_ref values (name is the fallback); events use source_ref, ' +
      'and actions that target another planned object use target_ref. Query kind can be supplied directly, or resolved from datasource_id ' +
      'when version_id is present. Returns structured {ok,errors,warnings,checked,not_checked,counts}; it never mutates ToolJet.',
    inputSchema: {
      version_id: z.string().optional(),
      tables: z.array(tableSchema).max(50).optional(),
      queries: z.array(querySchema).max(200).optional(),
      pages: z.array(pageSchema).max(50).optional(),
      events: z.array(eventSchema).max(1000).optional(),
      lifecycles: z.array(lifecycleSchema).max(200).optional(),
    },
    async handler(args: ToolArgs) {
      try {
        if (![args.tables, args.queries, args.pages, args.events, args.lifecycles].some((items) => items?.length)) {
          return fail(new Error('lint_app_spec needs at least one table, query, page, event, or lifecycle.'));
        }
        const needsDatasourceResolution = (args.queries ?? []).some((query) => !query.kind && query.datasource_id);
        const datasources = needsDatasourceResolution && args.version_id
          ? await client.listDatasources(args.version_id)
          : [];
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        return ok(lintPlannedApp({
          tables: args.tables?.map((table) => ({
            tableName: table.table_name,
            columns: table.columns,
            foreignKeys: table.foreign_keys,
          })),
          queries: args.queries?.map((query) => ({
            clientRef: query.client_ref,
            datasourceId: query.datasource_id,
            name: query.name,
            kind: query.kind ?? (query.datasource_id ? datasourceKinds.get(query.datasource_id) : undefined),
            options: query.options,
          })),
          pages: args.pages?.map((page) => ({
            clientRef: page.client_ref,
            name: page.name,
            icon: page.icon,
            hidden: page.hidden,
            components: page.components?.map((component) => ({
              name: component.name,
              type: component.type,
              properties: component.properties,
              styles: component.styles,
              validation: component.validation,
              others: component.others,
              layout: component.layout,
              layouts: component.layouts,
              clientRef: component.client_ref,
              parentRef: component.parent_ref,
              parent: component.parent,
              slotName: component.slot_name,
            })),
          })),
          events: args.events?.map((event) => ({
            sourceRef: event.source_ref,
            sourceType: event.source_type,
            ref: event.ref,
            trigger: event.trigger,
            action: event.action,
            name: event.name,
          })),
          lifecycles: args.lifecycles?.map((lifecycle) => ({
            queryRef: lifecycle.query_ref,
            refreshQueryRefs: lifecycle.refresh_query_refs,
            clearComponentRefs: lifecycle.clear_component_refs,
            closeModalRef: lifecycle.close_modal_ref,
            successAlert: lifecycle.success_alert
              ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type }
              : undefined,
            failureAlert: lifecycle.failure_alert
              ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type }
              : undefined,
            successActions: lifecycle.success_actions,
            failureActions: lifecycle.failure_actions,
          })),
        }));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
