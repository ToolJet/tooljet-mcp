import type { ToolJetClient } from '../tooljetClient.js';
import { lintPlannedApp, type AppSpecLintResult } from '../appSpecLint.js';
import { appPlanSchema, type AppPlanInput } from '../appPlanSchema.js';
import { storeAppPlan } from '../appPlanStore.js';
import { ok, fail, type ToolDef } from './types.js';
import { updateRowsCompatibilityWarning } from '../tableQueryCompatibility.js';
import { suggestedHtmlHeight } from '../renderReadiness.js';
const TABLE_NAME_MAX = 31; // ToolJet DB table names are at most 31 characters

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function lintAppSpecTool(client: ToolJetClient): ToolDef {
  return {
    name: 'lint_app_spec',
    title: 'Lint App Spec (Dry Run)',
    // The dry run half of the governed phase: it never mutates ToolJet.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
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
        const preflightWarnings: string[] = [];
        const needsTables = Boolean(
          args.tables?.length ||
          args.seed_data?.length ||
          args.queries?.some((query) => query.table_ref || typeof query.options?.table_id === 'string')
        );
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
          if (tableIds.has(key)) {
            // A name already in the workspace used to fail the plan; every model then spent a turn inventing
            // a prefix (seven of twelve Nordlicht builds, 2026-09-07). Suffix it here and carry the new name
            // into seed data, table_ref and foreign keys, since they all name the table.
            const oldName = table.table_name;
            const newName = nextTableName(oldName, tableIds);
            table.table_name = newName;
            for (const seed of args.seed_data ?? []) if (seed.table_name === oldName) seed.table_name = newName;
            for (const query of args.queries ?? []) if (query.table_ref === oldName) query.table_ref = newName;
            for (const other of args.tables ?? []) {
              for (const fk of other.foreign_keys ?? []) {
                const ref = fk as unknown as Record<string, unknown>;
                for (const field of ['referencedTable', 'referenced_table', 'references_table']) {
                  if (ref[field] === oldName) ref[field] = newName;
                }
              }
            }
            preflightWarnings.push(
              `Planned table "${oldName}" already exists in this workspace, so it is created as "${newName}"; seed data, ` +
                'table_ref and foreign keys were updated to match. To reuse the existing table instead, drop it from ' +
                'tables and point queries at it with table_ref.'
            );
            tableIds.set(newName.toLowerCase(), `planned-table:${newName}`);
          } else tableIds.set(key, `planned-table:${table.table_name}`);
        }
        preflightWarnings.push(...autoFitHtmlHeights(args));
        // Empty pages left by an earlier phase must be filled or deleted, not shadowed by new pages with
        // near-identical names (a Luna build ended with Orders, Orders Archive and Orders Desk; Gemini Pro
        // with nine pages, five empty). Only pages the plan does not target count.
        if (existingSummary) {
          const plannedNames = new Set((args.pages ?? []).map((page) => page.name.toLowerCase()));
          const createsPages = (args.pages ?? []).some((page) =>
            !existingSummary.pages.some((existing) => existing.name?.toLowerCase() === page.name.toLowerCase() || (page.name === 'Home' && existing.handle === 'home'))
          );
          const abandoned = existingSummary.pages.filter((page) =>
            page.components.length === 0 && page.handle !== 'home' && page.name && !plannedNames.has(page.name.toLowerCase())
          );
          if (createsPages && abandoned.length) {
            preflightErrors.push(
              `App already has ${abandoned.length} empty page(s) this plan does not touch: ${abandoned.map((page) => `"${page.name}"`).join(', ')}. ` +
                'Build on them (use the exact existing name in pages[]) or delete them with delete_page before creating new pages, ' +
                'so the app does not end up with duplicates.'
            );
          }
        }
        const plannedTables = new Map(
          (args.tables ?? []).map((table) => [table.table_name.toLowerCase(), table])
        );
        for (const seed of args.seed_data ?? []) {
          if (!tableIds.has(seed.table_name.toLowerCase())) {
            preflightErrors.push(`Seed data targets unknown planned/existing table "${seed.table_name}".`);
          }
          const plannedTable = plannedTables.get(seed.table_name.toLowerCase());
          if (plannedTable) {
            const requiredColumns = plannedTable.columns.filter((column) =>
              (column.primaryKey || column.notNull) &&
              column.defaultValue === undefined &&
              !/serial/i.test(column.type)
            );
            for (const column of requiredColumns) {
              const missingRows = seed.rows.reduce<number[]>((indexes, row, index) => {
                if (!(column.name in row) || row[column.name] === null || row[column.name] === undefined) {
                  indexes.push(index + 1);
                }
                return indexes;
              }, []);
              if (!missingRows.length) continue;
              // An integer primary key that no seed row supplies is a generated key the model forgot to
              // declare (three of four Grok builds in one evening lost a full lint round trip to this).
              // The intent is unambiguous, so make it serial and say so instead of failing the plan.
              if (
                column.primaryKey &&
                /^(integer|bigint|int|int4|int8)$/i.test(column.type) &&
                missingRows.length === seed.rows.length
              ) {
                column.type = 'serial';
                preflightWarnings.push(
                  `Planned table "${seed.table_name}": primary key "${column.name}" was declared ${JSON.stringify(column.type)} ` +
                  'with no value in any seed row, so it is created as "serial" (auto-generated). Omit it from inserts.'
                );
                continue;
              }
              preflightErrors.push(
                `Seed data for planned table "${seed.table_name}" omits required non-generated column ` +
                `"${column.name}" in row(s) ${missingRows.join(', ')}. Use type "serial" for a generated key, ` +
                'add a defaultValue, or provide explicit values.'
              );
            }
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
          } else if ((datasourceKind ?? query.kind) === 'tooljetdb' && typeof options.table_id === 'string') {
            // A raw table_id must be one of this workspace's tables. Small models splice UUIDs when they
            // copy them (one table's prefix with another's tail), which lints clean and then returns no rows.
            const known = new Set(existingTables.map((table) => table.id));
            if (!known.has(options.table_id)) {
              const prefix = options.table_id.slice(0, 8);
              const nearest = existingTables
                .filter((table) => table.id.startsWith(prefix))
                .map((table) => `${table.table_name} (${table.id})`);
              preflightErrors.push(
                `Query "${query.name}": table_id "${options.table_id}" is not a table in this workspace` +
                (nearest.length ? `; the closest id is ${nearest.join(', ')}` : '') +
                '. Use table_ref with the table name and let the server resolve the id instead of copying UUIDs.'
              );
            }
          }
          return {
            clientRef: query.client_ref,
            datasourceId: query.datasource_id,
            name: query.name,
            kind: datasourceKind ?? query.kind,
            options,
          };
        });

        // Inspect only tables actually targeted by this phase's update_rows queries.
        // Metadata reads only; no query execution and no broad workspace schema scan.
        const schemas = new Map<string, string[] | undefined>();
        for (const table of args.tables ?? []) {
          const columns = table.columns.map(column => column.name);
          if (!table.columns.some(column => column.primaryKey)) columns.push('id');
          schemas.set(`planned-table:${table.table_name}`, columns);
        }
        const updateTableIds = new Set(queries.filter(query =>
          query.kind === 'tooljetdb' && query.options.operation === 'update_rows' &&
          typeof query.options.table_id === 'string'
        ).map(query => query.options.table_id as string));
        await Promise.all([...updateTableIds].map(async tableId => {
          if (schemas.has(tableId)) return;
          const table = existingTables.find(item => item.id === tableId);
          if (!table) return;
          try {
            schemas.set(tableId, (await client.getTableSchema(table.table_name)).map(column => column.name));
          } catch {
            preflightWarnings.push(`Could not inspect update_rows target "${table.table_name}"; primary-key compatibility was not checked. Inspect its schema before relying on the save workflow.`);
          }
        }));
        for (const query of queries) {
          const tableId = query.options.table_id as string;
          const tableName = existingTables.find(table => table.id === tableId)?.table_name ??
            (args.tables ?? []).find(table => `planned-table:${table.table_name}` === tableId)?.table_name ?? tableId;
          const warning = updateRowsCompatibilityWarning(query.kind, query.options, tableName, schemas.get(tableId));
          if (warning) preflightWarnings.push(`Query "${query.name}": ${warning}`);
        }

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
          warnings: unique([...preflightWarnings, ...lint.warnings]),
        };
        return ok(result.ok ? { ...result, ...storeAppPlan(args, result) } : result);
      } catch (error) {
        return fail(error);
      }
    },
  };
}

function nextTableName(name: string, taken: Map<string, string>): string {
  for (let n = 2; n < 100; n++) {
    const suffix = `_${n}`;
    const candidate = `${name.slice(0, Math.max(1, TABLE_NAME_MAX - suffix.length))}${suffix}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${name.slice(0, TABLE_NAME_MAX - 7)}_${Date.now().toString(36).slice(-6)}`;
}

/** Raise every short Html block to the height its markup needs and move the components under it down by
 *  the same amount, instead of failing the plan. Roughly a third of all lint rounds on the Nordlicht
 *  benchmark were Html blocks a few pixels short; at max reasoning effort each round cost a minute. */
function autoFitHtmlHeights(args: AppPlanInput): string[] {
  const warnings: string[] = [];
  for (const page of args.pages ?? []) {
    const components = page.components ?? [];
    for (const component of components) {
      if (component.type !== 'Html') continue;
      const rect = component.layouts?.desktop ?? component.layout;
      if (!rect || typeof rect.height !== 'number' || typeof rect.top !== 'number') continue;
      const fix = suggestedHtmlHeight(component as never);
      if (!fix) continue;
      const delta = fix.to - fix.from;
      const oldBottom = rect.top + fix.from;
      const parentOf = (c: typeof component) => c.parent_ref ?? c.parent ?? '';
      const moved: string[] = [];
      for (const sibling of components) {
        if (sibling === component || parentOf(sibling) !== parentOf(component)) continue;
        for (const r of [sibling.layout, sibling.layouts?.desktop, sibling.layouts?.mobile]) {
          if (r && typeof r.top === 'number' && r.top >= oldBottom - 4) r.top += delta;
        }
        const r0 = sibling.layouts?.desktop ?? sibling.layout;
        if (r0 && typeof r0.top === 'number' && r0.top - delta >= oldBottom - 4) moved.push(sibling.name ?? sibling.client_ref ?? '?');
      }
      for (const r of [component.layout, component.layouts?.desktop]) if (r && typeof r.height === 'number') r.height = fix.to;
      warnings.push(
        `Page "${page.name}": Html "${component.name ?? component.client_ref ?? '?'}" needed about ${fix.needed}px for its markup but was ` +
          `${fix.from}px, so its height is now ${fix.to}px` +
          (moved.length ? ` and ${moved.length} component(s) below it moved down ${delta}px (${[...new Set(moved)].join(', ')})` : '') +
          '. The plan was applied with these values.'
      );
    }
  }
  return warnings;
}
