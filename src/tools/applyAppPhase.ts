import { z } from 'zod';
import type { AppPlanInput } from '../appPlanSchema.js';
import { consumeAppPlan } from '../appPlanStore.js';
import { validatePersistedAppSummary } from '../appValidation.js';
import { prepareComponentBatch } from '../componentBatch.js';
import { validateEvents } from '../eventValidation.js';
import { expandQueryLifecycles } from '../queryLifecycle.js';
import { completedPartialWrites } from '../tooljetClient.js';
import type {
  AppSummary,
  EventSourceType,
  EventSpec,
  ToolJetClient,
} from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

interface LogicalTarget { id: string; name: string; type?: string }

function logicalRef(value: { client_ref?: string; name: string }): string {
  return value.client_ref ?? value.name;
}

function sourceTarget(
  sourceType: EventSourceType,
  ref: string,
  pages: Map<string, LogicalTarget>,
  queries: Map<string, LogicalTarget>,
  components: Map<string, LogicalTarget>
): LogicalTarget | undefined {
  if (sourceType === 'page') return pages.get(ref);
  if (sourceType === 'data_query') return queries.get(ref);
  return components.get(ref);
}

function resolveAction(
  raw: Record<string, unknown>,
  pages: Map<string, LogicalTarget>,
  queries: Map<string, LogicalTarget>,
  components: Map<string, LogicalTarget>
): Record<string, unknown> {
  const { target_ref: targetRef, ...action } = raw;
  if (targetRef === undefined) return action;
  if (typeof targetRef !== 'string') throw new Error('Event action target_ref must be a string.');
  const actionId = String(action.actionId);
  const target = actionId === 'run-query'
    ? queries.get(targetRef)
    : actionId === 'switch-page'
      ? pages.get(targetRef)
      : ['show-modal', 'close-modal', 'control-component', 'set-table-page', 'scroll-component-into-view']
          .includes(actionId)
        ? components.get(targetRef)
        : undefined;
  if (!target) throw new Error(`Action "${actionId}" has unknown or unsupported target_ref "${targetRef}".`);
  if (actionId === 'run-query') return { ...action, queryId: target.id, queryName: target.name };
  if (actionId === 'switch-page') return { ...action, pageId: target.id };
  if (actionId === 'show-modal' || actionId === 'close-modal') return { ...action, modal: target.id };
  if (actionId === 'control-component' || actionId === 'scroll-component-into-view') {
    return { ...action, componentId: target.id };
  }
  if (actionId === 'set-table-page') return { ...action, table: target.id };
  return action;
}

function refs(
  values: string[] | undefined,
  targets: Map<string, LogicalTarget>,
  label: string
): string[] | undefined {
  return values?.map((ref) => {
    const target = targets.get(ref);
    if (!target) throw new Error(`${label} ref "${ref}" does not exist.`);
    return target.id;
  });
}

function oneRef(
  value: string | undefined,
  targets: Map<string, LogicalTarget>,
  label: string
): string | undefined {
  if (!value) return undefined;
  const target = targets.get(value);
  if (!target) throw new Error(`${label} ref "${value}" does not exist.`);
  return target.id;
}

function appliedSummary(applied: Record<string, number>): string {
  return Object.entries(applied).map(([key, value]) => `${key}=${value}`).join(', ');
}

export function applyAppPhaseTool(client: ToolJetClient): ToolDef {
  return {
    name: 'apply_app_phase',
    description:
      'Consume one successful lint_app_spec plan_token and apply that exact phase once. The tool resolves logical refs, creates ' +
      'tables/pages/queries in dependency order, seeds rows, creates independent page component batches concurrently, combines ' +
      'ordinary events and mutation lifecycles into one bulk write, then returns persisted structural/contract validation. It never ' +
      'runs queries. ToolJet has no cross-resource transaction: a rare upstream partial failure reports the completed stage/counts ' +
      'and never auto-deletes user data. The one-time token prevents an accidental retry from duplicating objects.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      plan_token: z.string(),
    },
    async handler(args: { app_id: string; version_id: string; plan_token: string }) {
      const applied = { tables: 0, seed_rows: 0, pages: 0, queries: 0, components: 0, events: 0 };
      let stage = 'consume plan';
      try {
        const stored = consumeAppPlan(args.plan_token);
        const spec: AppPlanInput = stored.spec;
        if (spec.version_id && spec.version_id !== args.version_id) {
          throw new Error(`Plan version_id "${spec.version_id}" does not match "${args.version_id}".`);
        }

        stage = 'read current app context';
        const [initialSummary, existingTables, datasources] = await Promise.all([
          client.getAppSummary(args.app_id),
          client.listTables(),
          spec.queries?.length ? client.listDatasources(args.version_id) : Promise.resolve([]),
        ]);
        if (initialSummary.version_id && initialSummary.version_id !== args.version_id) {
          throw new Error(`App editing version is "${initialSummary.version_id}", not "${args.version_id}".`);
        }

        const plannedPageMatches = new Map<string, AppSummary['pages'][number]>();
        for (const page of spec.pages ?? []) {
          const match = initialSummary.pages.find((candidate) =>
            candidate.name === page.name || candidate.handle === (page.name === 'Home' ? 'home' : undefined)
          );
          if (match) plannedPageMatches.set(logicalRef(page), match);
          const existingNames = new Set((match?.components ?? []).map((component) => component.name).filter(Boolean));
          const collision = (page.components ?? []).find((component) => existingNames.has(component.name));
          if (collision) {
            throw new Error(`Page "${page.name}" already has a component named "${collision.name}".`);
          }
        }
        const existingQueryNames = new Set(initialSummary.queries.map((query) => query.name).filter(Boolean));
        const queryCollision = (spec.queries ?? []).find((query) => existingQueryNames.has(query.name));
        if (queryCollision) throw new Error(`App already has a query named "${queryCollision.name}".`);

        const existingTableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));

        stage = 'create tables and pages';
        const newPages = (spec.pages ?? []).filter((page) => !plannedPageMatches.has(logicalRef(page)));
        const [tableWrite, pageWrite] = await Promise.allSettled([
          spec.tables?.length
            ? client.createTables({
                tables: spec.tables.map((table) => ({
                  tableName: table.table_name,
                  columns: table.columns,
                  foreignKeys: table.foreign_keys,
                })),
              })
            : Promise.resolve([]),
          newPages.length
            ? client.createPages({
                appId: args.app_id,
                versionId: args.version_id,
                pages: newPages.map((page) => ({ name: page.name, icon: page.icon, hidden: page.hidden })),
              })
            : Promise.resolve([]),
        ]);
        const createdTables = tableWrite.status === 'fulfilled'
          ? tableWrite.value
          : completedPartialWrites<{ table_id: string; table_name: string }>(tableWrite.reason);
        const createdPages = pageWrite.status === 'fulfilled'
          ? pageWrite.value
          : completedPartialWrites<{ page_id: string; name: string; index: number; icon?: string; hidden?: boolean }>(pageWrite.reason);
        applied.tables = createdTables.length;
        applied.pages = createdPages.length;
        const foundationFailures = [
          ...(tableWrite.status === 'rejected'
            ? [`tables: ${tableWrite.reason instanceof Error ? tableWrite.reason.message : String(tableWrite.reason)}`]
            : []),
          ...(pageWrite.status === 'rejected'
            ? [`pages: ${pageWrite.reason instanceof Error ? pageWrite.reason.message : String(pageWrite.reason)}`]
            : []),
        ];
        if (foundationFailures.length) throw new Error(foundationFailures.join(' | '));

        const tableIds = new Map(existingTableIds);
        for (const table of createdTables) tableIds.set(table.table_name.toLowerCase(), table.table_id);
        const pageTargets = new Map<string, LogicalTarget>();
        for (const page of spec.pages ?? []) {
          const ref = logicalRef(page);
          const existing = plannedPageMatches.get(ref);
          const created = createdPages.find((candidate) => candidate.name === page.name);
          const id = existing?.id ?? created?.page_id;
          if (!id) throw new Error(`Could not resolve page "${page.name}" after creation.`);
          pageTargets.set(ref, { id, name: page.name });
        }

        const pageUpdates = (spec.pages ?? []).flatMap((page) => {
          const existing = plannedPageMatches.get(logicalRef(page));
          if (!existing) return [];
          const update = {
            pageId: existing.id,
            ...(existing.icon !== page.icon ? { icon: page.icon } : {}),
            ...(Boolean(existing.hidden) !== Boolean(page.hidden) ? { hidden: Boolean(page.hidden) } : {}),
          };
          return Object.keys(update).length > 1 ? [update] : [];
        });
        if (pageUpdates.length) {
          await client.updatePages({ appId: args.app_id, versionId: args.version_id, updates: pageUpdates });
        }

        stage = 'seed data and create queries';
        const queryInputs = (spec.queries ?? []).map((query) => {
          const kind = datasourceKinds.get(query.datasource_id);
          if (!kind) throw new Error(`Query "${query.name}" datasource "${query.datasource_id}" is unavailable.`);
          const options = structuredClone(query.options);
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId) throw new Error(`Query "${query.name}" has unknown table_ref "${query.table_ref}".`);
            options.table_id = tableId;
          }
          return { dataSourceId: query.datasource_id, name: query.name, options, kind };
        });
        const [seedWrite, queryWrite] = await Promise.allSettled([
          spec.seed_data?.length
            ? client.insertRowsBatch({
                tables: spec.seed_data.map((seed) => ({ tableName: seed.table_name, rows: seed.rows })),
              })
            : Promise.resolve([]),
          queryInputs.length
            ? client.createQueries({ versionId: args.version_id, queries: queryInputs })
            : Promise.resolve([]),
        ]);
        const seedResults = seedWrite.status === 'fulfilled'
          ? seedWrite.value
          : completedPartialWrites<{ table_name: string; processed_rows: number }>(seedWrite.reason);
        const createdQueries = queryWrite.status === 'fulfilled'
          ? queryWrite.value
          : completedPartialWrites<{ query_id: string; name: string }>(queryWrite.reason);
        applied.seed_rows = seedResults.reduce((total, result) => total + result.processed_rows, 0);
        applied.queries = createdQueries.length;
        const dataFailures = [
          ...(seedWrite.status === 'rejected'
            ? [`seed_data: ${seedWrite.reason instanceof Error ? seedWrite.reason.message : String(seedWrite.reason)}`]
            : []),
          ...(queryWrite.status === 'rejected'
            ? [`queries: ${queryWrite.reason instanceof Error ? queryWrite.reason.message : String(queryWrite.reason)}`]
            : []),
        ];
        if (dataFailures.length) throw new Error(dataFailures.join(' | '));
        const queryTargets = new Map<string, LogicalTarget>();
        (spec.queries ?? []).forEach((query, index) => {
          const created = createdQueries[index];
          if (!created) throw new Error(`Could not resolve query "${query.name}" after creation.`);
          queryTargets.set(logicalRef(query), { id: created.query_id, name: created.name });
        });

        stage = 'create page components';
        const preparedPages = (spec.pages ?? []).flatMap((page) => {
          if (!page.components?.length) return [];
          const target = pageTargets.get(logicalRef(page));
          if (!target) throw new Error(`Could not resolve component page "${page.name}".`);
          const prepared = prepareComponentBatch(page.components);
          if (prepared.errors.length) throw new Error(prepared.errors.join(' '));
          return [{ page, pageId: target.id, prepared }];
        });
        const componentWrites = await Promise.allSettled(preparedPages.map(async (page) => ({
          ...page,
          created: await client.createComponents({
            appId: args.app_id,
            versionId: args.version_id,
            pageId: page.pageId,
            components: page.prepared.components,
          }),
        })));
        const componentResults = componentWrites.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
        const componentFailures = componentWrites.flatMap((result, index) => result.status === 'rejected'
          ? [`page ${preparedPages[index]!.page.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
          : []);
        const componentTargets = new Map<string, LogicalTarget>();
        const warnings: string[] = [];
        for (const page of componentResults) {
          applied.components += page.created.length;
          warnings.push(...page.prepared.warnings.map((warning) => `Page ${page.page.name}: ${warning}`));
          page.prepared.components.forEach((component, index) => {
            const created = page.created[index];
            if (!created) throw new Error(`Could not resolve component "${component.name}" after creation.`);
            componentTargets.set(component.clientRef ?? component.name, {
              id: created.component_id,
              name: created.name,
              type: component.type,
            });
          });
        }
        if (componentFailures.length) throw new Error(componentFailures.join(' | '));

        stage = 'create events and lifecycles';
        const summaryBeforeEvents = await client.getAppSummary(args.app_id);
        const ordinaryEvents: EventSpec[] = (spec.events ?? []).map((event) => {
          const source = sourceTarget(event.source_type, event.source_ref, pageTargets, queryTargets, componentTargets);
          if (!source) throw new Error(`Event has unknown ${event.source_type} source_ref "${event.source_ref}".`);
          return {
            sourceId: source.id,
            sourceType: event.source_type,
            ref: event.ref,
            trigger: event.trigger,
            action: resolveAction(event.action, pageTargets, queryTargets, componentTargets),
            name: event.name,
          };
        });
        const lifecycleSpecs = (spec.lifecycles ?? []).map((lifecycle) => ({
          queryId: oneRef(lifecycle.query_ref, queryTargets, 'Lifecycle query')!,
          refreshQueryIds: refs(lifecycle.refresh_query_refs, queryTargets, 'Lifecycle refresh query'),
          clearComponentIds: refs(lifecycle.clear_component_refs, componentTargets, 'Lifecycle clear component'),
          closeModalId: oneRef(lifecycle.close_modal_ref, componentTargets, 'Lifecycle modal'),
          successAlert: lifecycle.success_alert
            ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type }
            : undefined,
          failureAlert: lifecycle.failure_alert
            ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type }
            : undefined,
          successActions: lifecycle.success_actions?.map((action) =>
            resolveAction(action, pageTargets, queryTargets, componentTargets)
          ),
          failureActions: lifecycle.failure_actions?.map((action) =>
            resolveAction(action, pageTargets, queryTargets, componentTargets)
          ),
        }));
        const expanded = expandQueryLifecycles(summaryBeforeEvents, lifecycleSpecs);
        warnings.push(...expanded.warnings);
        const allEvents = [...ordinaryEvents, ...expanded.events];
        const eventValidation = validateEvents(summaryBeforeEvents, allEvents);
        if (eventValidation.errors.length) throw new Error(eventValidation.errors.join(' '));
        warnings.push(...eventValidation.warnings);
        if (allEvents.length) {
          await client.createEvents({
            appId: args.app_id,
            versionId: args.version_id,
            events: allEvents,
            existingEvents: summaryBeforeEvents.events,
          });
          applied.events = allEvents.length;
        }

        stage = 'validate persisted phase';
        const validation = validatePersistedAppSummary(await client.getAppSummary(args.app_id));
        warnings.push(...validation.warnings);
        const relevantTableNames = new Set([
          ...(spec.tables ?? []).map((table) => table.table_name),
          ...(spec.seed_data ?? []).map((seed) => seed.table_name),
          ...(spec.queries ?? []).flatMap((query) => query.table_ref ? [query.table_ref] : []),
        ]);
        return ok({
          applied,
          refs: {
            tables: Object.fromEntries([...relevantTableNames].map((name) => [name, tableIds.get(name.toLowerCase())])),
            pages: Object.fromEntries([...pageTargets].map(([ref, target]) => [ref, target.id])),
            queries: Object.fromEntries([...queryTargets].map(([ref, target]) => [ref, target.id])),
            components: Object.fromEntries([...componentTargets].map(([ref, target]) => [ref, target.id])),
          },
          warnings: [...new Set(warnings)],
          validation,
        });
      } catch (error) {
        return fail(new Error(
          `apply_app_phase failed during ${stage}. Applied before failure: ${appliedSummary(applied)}. ` +
            `The one-time plan token is consumed and no resources were auto-deleted. ` +
            `${error instanceof Error ? error.message : String(error)}`
        ));
      }
    },
  };
}
