import type { ToolJetClient } from '../tooljetClient.js';
import { lintPlannedApp, type AppSpecLintResult } from '../appSpecLint.js';
import { appPlanSchema, type AppPlanInput } from '../appPlanSchema.js';
import { storeAppPlan } from '../appPlanStore.js';
import { ok, fail, type ToolDef } from './types.js';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function lintAppSpecTool(client: ToolJetClient): ToolDef {
  return {
    name: 'lint_app_spec',
    description:
      'Dry-run an exact app phase before any writes. It validates optional ToolJet DB tables/seed_data, datasource queries, ' +
      'pages/components, events, and concise query lifecycles together. Give pages, queries, and components stable client_ref ' +
      'values; events use source_ref and targeted actions use target_ref. A query can use table_ref to resolve a planned/existing ' +
      'ToolJet DB table into options.table_id. Set app_name when the target app should be renamed in the same governed phase. ' +
      'For repair/continuation phases, pass app_id so persisted page/component/query refs ' +
      'are included and can be targeted without redeclaring them. On success it returns a one-time 30-minute plan_token for apply_app_phase. ' +
      'Treat this call as an awaited barrier; it never mutates ToolJet.',
    inputSchema: appPlanSchema.shape,
    async handler(args: AppPlanInput) {
      try {
        if (!args.app_name && ![args.tables, args.seed_data, args.queries, args.pages, args.events, args.lifecycles]
          .some((items) => items?.length)) {
          return fail(new Error('lint_app_spec needs at least one table, seed_data batch, query, page, event, or lifecycle.'));
        }

        const preflightErrors: string[] = [];
        const needsTables = Boolean(args.tables?.length || args.seed_data?.length || args.queries?.some((query) => query.table_ref));
        const [existingTables, existingSummary] = await Promise.all([
          needsTables ? client.listTables() : Promise.resolve([]),
          args.app_id ? client.getAppSummary(args.app_id) : Promise.resolve(undefined),
        ]);
        if (args.version_id && existingSummary?.version_id && args.version_id !== existingSummary.version_id) {
          preflightErrors.push(
            `App "${args.app_id}" editing version is "${existingSummary.version_id}", not "${args.version_id}".`
          );
        }
        const tableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        for (const table of args.tables ?? []) {
          const key = table.table_name.toLowerCase();
          if (tableIds.has(key)) preflightErrors.push(`Planned table "${table.table_name}" already exists.`);
          else tableIds.set(key, `planned-table:${table.table_name}`);
        }
        for (const seed of args.seed_data ?? []) {
          if (!tableIds.has(seed.table_name.toLowerCase())) {
            preflightErrors.push(`Seed data targets unknown planned/existing table "${seed.table_name}".`);
          }
        }

        if (args.queries?.length && !args.version_id) {
          preflightErrors.push('version_id is required when a plan contains queries.');
        }
        const datasources = args.queries?.length && args.version_id
          ? await client.listDatasources(args.version_id)
          : [];
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        const queries = (args.queries ?? []).map((query) => {
          const datasourceKind = datasourceKinds.get(query.datasource_id);
          if (args.version_id && !datasourceKind) {
            preflightErrors.push(`Query "${query.name}" datasource "${query.datasource_id}" is not available.`);
          }
          if (query.kind && datasourceKind && query.kind !== datasourceKind) {
            preflightErrors.push(
              `Query "${query.name}" kind "${query.kind}" does not match datasource kind "${datasourceKind}".`
            );
          }
          const options = structuredClone(query.options);
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId) preflightErrors.push(`Query "${query.name}" has unknown table_ref "${query.table_ref}".`);
            else options.table_id = tableId;
          }
          return {
            clientRef: query.client_ref,
            datasourceId: query.datasource_id,
            name: query.name,
            kind: datasourceKind ?? query.kind,
            options,
          };
        });

        const lint = lintPlannedApp({
          tables: args.tables?.map((table) => ({
            tableName: table.table_name,
            columns: table.columns,
            foreignKeys: table.foreign_keys,
          })),
          seedData: args.seed_data?.map((seed) => ({ tableName: seed.table_name, rows: seed.rows })),
          queries,
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
        }, existingSummary);
        const result: AppSpecLintResult = {
          ...lint,
          ok: lint.ok && preflightErrors.length === 0,
          errors: unique([...preflightErrors, ...lint.errors]),
        };
        return ok(result.ok ? { ...result, ...storeAppPlan(args, result) } : result);
      } catch (error) {
        return fail(error);
      }
    },
  };
}
