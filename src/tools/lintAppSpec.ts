import type { ToolJetClient } from '../tooljetClient.js';
import { lintPlannedApp, type AppSpecLintResult } from '../appSpecLint.js';
import { appPlanSchema, type AppPlanInput } from '../appPlanSchema.js';
import { storeAppPlan } from '../appPlanStore.js';
import { ok, fail, type ToolDef } from './types.js';
import { updateRowsCompatibilityWarning, bulkPrimaryKeyWarning } from '../tableQueryCompatibility.js';
import { arithmeticWriteWarning } from '../arithmeticWriteContract.js';
import { suggestedHtmlHeight } from '../renderReadiness.js';
import { normalizePlanBindingAliases } from '../planBindingAliases.js';
import { missingCreateRowColumns, type RequiredColumn } from '../createRowRequiredColumns.js';
import { invalidSeedTimestamps } from '../seedTimestampValidation.js';
import { replaceView, danglingAfterReplace, replaceFingerprint } from '../pageReplace.js';
import { COMPONENT_FX_GUIDANCE } from '../componentFxGuidance.js';
import { frozenAppRefusal } from '../frozenApp.js';
import { mapKeyRefusal } from '../mapKeyGuard.js';
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
      'ToolJet DB table by its actual table_name into options.table_id (not a client_ref or alias). For each query use either ' +
      'the exact datasource_id or the exact unique datasource_name from list_datasources(version_id); names are pinned to IDs ' +
      'during this preflight, never guessed from kind. Set app_name when the target app should be renamed in the same governed phase. ' +
      'For repair/continuation phases, pass app_id so persisted page/component/query refs ' +
      'are included and can be targeted without redeclaring them. To rebuild an existing page whole, mark its plan page replace: true ' +
      '(with app_id): the plan is checked against the app with that page emptied, the page\'s own queries may be defined again ' +
      '(updated in place on apply), and a component another page, event or query still reads must be kept under its name. ' +
      'A Form submits through a Button inside it: set the Form\'s properties.buttonToSubmit to that Button\'s client_ref in the ' +
      'same plan (resolved to its id on apply). ' +
      'On success it returns a one-time 30-minute plan_token for apply_app_phase. ' +
      'Treat this call as an awaited barrier; it never mutates ToolJet. ' + COMPONENT_FX_GUIDANCE,
    inputSchema: appPlanSchema.shape,
    async handler(args: AppPlanInput) {
      try {
        if (!args.app_name && ![args.tables, args.seed_data, args.queries, args.pages, args.events, args.lifecycles]
          .some((items) => items?.length)) {
          return fail(new Error('lint_app_spec needs at least one table, seed_data batch, query, page, event, or lifecycle.'));
        }

        const columnless = (args.tables ?? []).filter((table) => !Array.isArray((table as { columns?: unknown }).columns));
        if (columnless.length) {
          return fail(new Error(
            `tables: ${columnless.map((t) => `"${(t as { table_name?: string }).table_name ?? '?'}"`).join(', ')} has no columns. ` +
              'List only new tables here, each with its columns; an existing table needs no entry (queries reach it by table_ref).'
          ));
        }
        const preflightErrors: string[] = [];
        const preflightWarnings: string[] = [];
        // replace empties an existing page, which only a plan linted against that app can know about.
        const replacePages = (args.pages ?? []).filter((page) => page.replace).map((page) => `"${page.name}"`);
        if (replacePages.length && !args.app_id) {
          preflightErrors.push(`pages ${replacePages.join(', ')}: replace needs app_id, so the plan is checked against the page it replaces.`);
        }
        const mapRefusal = await mapKeyRefusal(client, (args.pages ?? []).flatMap((page) => (page.components ?? []).map((c) => String(c.type))));
        if (mapRefusal) preflightErrors.push(mapRefusal);
        const needsTables = Boolean(
          args.tables?.length ||
          args.seed_data?.length ||
          args.queries?.some((query) => query.table_ref || typeof query.options?.table_id === 'string')
        );
        const [existingTables, fetchedSummary] = await Promise.all([
          needsTables ? client.listTables() : Promise.resolve([]),
          args.app_id ? client.getAppSummary(args.app_id) : Promise.resolve(undefined),
        ]);
        // A promoted (frozen) version refuses writes: say so before the plan is linted, not part-way through an apply.
        const frozen = frozenAppRefusal(fetchedSummary);
        if (frozen) return fail(new Error(frozen));
        // A plan page marked replace is checked against the app with that page emptied and the queries the plan
        // redefines renamed out of the way: the same names are its new definition, not collisions.
        const view = fetchedSummary ? replaceView(fetchedSummary, args) : undefined;
        const existingSummary = view?.summary ?? fetchedSummary;
        if (view && fetchedSummary) preflightErrors.push(...danglingAfterReplace(fetchedSummary, view, args));
        if (args.version_id && existingSummary?.version_id && args.version_id !== existingSummary.version_id) {
          preflightErrors.push(
            `App "${args.app_id}" editing version is "${existingSummary.version_id}", not "${args.version_id}".`
          );
        }
        const tableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        // Seed rows for a table that already exists and already has rows would insert them again: merch m18
        // hand-seeded its tables, then sent the same rows in every plan, and the apply failed on a unique key
        // after creating its queries. Unknown (no reader, or the read failed) is not a finding.
        const plannedNew = new Set((args.tables ?? []).map((table) => table.table_name.toLowerCase()));
        const seededExisting = [...new Set((args.seed_data ?? []).map((seed) => seed.table_name))]
          .filter((name) => tableIds.has(name.toLowerCase()) && !plannedNew.has(name.toLowerCase()));
        const withRows = await Promise.all(seededExisting.map(async (name) =>
          (await client.hasRows?.(tableIds.get(name.toLowerCase())!).catch(() => undefined)) === true ? name : undefined));
        for (const name of withRows.filter(Boolean)) {
          preflightErrors.push(`Seed data targets "${name}", which already has rows (seeded earlier), so they would be inserted ` +
            'again: leave that table out of seed_data.');
        }
        for (const table of args.tables ?? []) {
          const key = table.table_name.toLowerCase();
          if (tableIds.has(key)) {
            // SQL can name multiple tables, independently of table_ref/table_id. Without resolving
            // SQL identifiers, even a query without table_ref may depend on the colliding name.
            // Require a coherent revised plan rather than silently splitting seeds and SQL targets.
            const hasSql = args.queries?.some((query) =>
              query.options?.operation === 'sql_execution' || query.options?.sql_execution !== undefined
            );
            if (hasSql) {
              preflightErrors.push(
                `Planned table "${table.table_name}" already exists and this plan contains SQL queries. ` +
                  'Rename the planned table and update all SQL references, seed data, table_ref and foreign keys together, ' +
                  'then lint again. To reuse the existing table, remove it from tables instead.'
              );
              continue;
            }
            // A name already in the workspace used to fail the plan; every model then spent a turn inventing
            // a prefix (seven of twelve order-desk builds, 2026-09-07). Suffix it here and carry the new name
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
            preflightErrors.push(...invalidSeedTimestamps(plannedTable.columns, seed.rows)
              .map(error => `Seed data for planned table "${seed.table_name}": ${error}`));
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
        const uniqueDatasourceNames = new Map(datasources.filter(source =>
          datasources.filter(other => other.name === source.name).length === 1
        ).map(source => [source.name, source.kind]));
        preflightWarnings.push(...normalizePlanBindingAliases(args, existingSummary, datasourceKinds, uniqueDatasourceNames));
        const resolvedQueryIds = new Map<number, string>();
        const queries = (args.queries ?? []).map((query, index) => {
          let datasourceId = query.datasource_id;
          const hasId = query.datasource_id !== undefined;
          const hasName = query.datasource_name !== undefined;
          if (hasId === hasName) {
            preflightErrors.push(`Query "${query.name}" must provide exactly one of datasource_id or datasource_name.`);
          } else if (hasName) {
            const matches = datasources.filter(source => source.name === query.datasource_name);
            if (!query.datasource_name || matches.length !== 1) {
              preflightErrors.push(
                `Query "${query.name}" datasource_name "${query.datasource_name}" must match exactly one source in this version ` +
                `(found ${matches.length}). Use the exact name or id returned by list_datasources(version_id).`
              );
            } else datasourceId = matches[0]!.id;
          }
          const datasourceKind = datasourceKinds.get(datasourceId ?? '');
          if (args.version_id && !datasourceKind) {
            preflightErrors.push(`Query "${query.name}" datasource "${datasourceId ?? query.datasource_name ?? ''}" is not available.`);
          }
          if (datasourceId && datasourceKind) resolvedQueryIds.set(index, datasourceId);
          if (query.kind && datasourceKind && query.kind !== datasourceKind) {
            preflightErrors.push(
              `Query "${query.name}" kind "${query.kind}" does not match datasource kind "${datasourceKind}".`
            );
          }
          const options = structuredClone(query.options);
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId) preflightErrors.push(`Query "${query.name}" has unknown table_ref "${query.table_ref}". Use the actual table_name from tables[] or list_tables, not a client_ref, alias, or UUID.`);
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
            datasourceId: datasourceId ?? '',
            name: query.name,
            kind: datasourceKind ?? query.kind,
            options,
          };
        });

        // Inspect only tables actually targeted by this phase's structured writes.
        // Metadata reads only; no query execution and no broad workspace schema scan.
        const schemas = new Map<string, string[] | undefined>();
        const insertSchemas = new Map<string, RequiredColumn[]>();
        for (const table of args.tables ?? []) {
          const columns = table.columns.map(column => column.name);
          if (!table.columns.some(column => column.primaryKey)) columns.push('id');
          schemas.set(`planned-table:${table.table_name}`, columns);
          insertSchemas.set(`planned-table:${table.table_name}`, table.columns.some(column => column.primaryKey)
            ? table.columns : [...table.columns, {name:'id',type:'serial',primaryKey:true}]);
        }
        const updateTableIds = new Set(queries.filter(query =>
          query.kind === 'tooljetdb' && ['update_rows', 'create_row', 'bulk_upsert_with_primary_key'].includes(String(query.options.operation)) &&
          typeof query.options.table_id === 'string'
        ).map(query => query.options.table_id as string));
        await Promise.all([...updateTableIds].map(async tableId => {
          if (schemas.has(tableId)) return;
          const table = existingTables.find(item => item.id === tableId);
          if (!table) return;
          try {
            const schema = await client.getTableSchema(table.table_name);
            schemas.set(tableId, schema.map(column => column.name));
            insertSchemas.set(tableId, schema.map(column => ({name:column.name,type:column.type,
              primaryKey:column.isPrimaryKey,notNull:column.isNotNull,defaultValue:column.defaultValue})));
          } catch {
            preflightWarnings.push(`Could not inspect write target "${table.table_name}"; required insert columns were not checked and update_rows primary-key compatibility was not checked. Inspect its schema before relying on the save workflow.`);
          }
        }));
        for (const query of queries) {
          const tableId = query.options.table_id as string;
          const tableName = existingTables.find(table => table.id === tableId)?.table_name ??
            (args.tables ?? []).find(table => `planned-table:${table.table_name}` === tableId)?.table_name ?? tableId;
          const warning = updateRowsCompatibilityWarning(query.kind, query.options, tableName, schemas.get(tableId));
          if (warning) preflightWarnings.push(`Query "${query.name}": ${warning}`);
          const arithmetic = arithmeticWriteWarning(query.kind, query.options);
          if (arithmetic) preflightWarnings.push(`Query "${query.name}": ${arithmetic}`);
          const bulkWarning = bulkPrimaryKeyWarning(query.kind, query.options, tableName, insertSchemas.get(tableId));
          if (bulkWarning) (tableId.startsWith('planned-table:') ? preflightErrors : preflightWarnings).push(`Query "${query.name}": ${bulkWarning}`);
          if (query.kind === 'tooljetdb' && insertSchemas.has(tableId)) {
            const missing = missingCreateRowColumns(query.options, insertSchemas.get(tableId)!);
            if (missing?.length) {
              const message = `Query "${query.name}": create_row for "${tableName}" omits required non-generated column(s) ${missing.map(name => JSON.stringify(name)).join(', ')}. ` +
                'Seed rows do not supply values for future user-created records. Include the required values in this insert, or use a generated/defaulted key when designing a new table. Never recreate an existing table or change its key merely to fix this query.';
              if (tableId.startsWith('planned-table:')) preflightErrors.push(message);
              else preflightWarnings.push(message + ' Metadata does not verify database triggers; if an existing trigger supplies these fields, confirm that contract instead.');
            }
          }
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
            beforeRefreshActions: lifecycle.before_refresh_actions,
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
        if (!result.ok) return ok(result);
        // Store the concrete ID, not a name to re-resolve at apply. A rename or duplicate created
        // after lint must never silently retarget the authorized phase to another datasource.
        const resolvedSpec: AppPlanInput = { ...args, queries: args.queries?.map((query, index) => {
          const { datasource_name: _name, ...rest } = query;
          return { ...rest, datasource_id: resolvedQueryIds.get(index)! };
        }) };
        // A replace plan is bound to the replaced pages' state now; apply refuses it if that state changes first.
        const stored = storeAppPlan(resolvedSpec, result, view && fetchedSummary ? replaceFingerprint(fetchedSummary, view) : undefined);
        return ok({ ...result, ...stored });
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
 *  the same amount, instead of failing the plan. Roughly a third of all lint rounds on an order-desk
 *  same-prompt run were Html blocks a few pixels short; at max reasoning effort each round cost a minute. */
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
