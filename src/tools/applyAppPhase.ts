import { prepareQueryOptionsForWrite } from '../queryPersistence.js';
import { frozenAppRefusal } from '../frozenApp.js';
import { peekAppPlan } from '../appPlanStore.js';
import { tableQuotaError } from '../tableQuotaError.js';
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
import { matchPlannedPage } from '../pageMatch.js';
import { danglingAfterReplace, replaceFingerprint, replaceIds, replaceView } from '../pageReplace.js';
import { diffPageInPlace, type InPlaceDiff } from '../pageReplaceInPlace.js';
import { checkPlanReads, type ReadCheck } from '../applyReadCheck.js';
import { literalCanvasColor } from '../appSettings.js';

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
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === 'run-query' ? action.queryId ?? action.queryName : undefined);
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

const TABLE_READY_DELAYS_MS = [100, 200, 400, 800, 1000];

async function waitForCreatedTables(
  client: ToolJetClient,
  tableNames: string[]
): Promise<void> {
  await Promise.all(tableNames.map(async (tableName) => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= TABLE_READY_DELAYS_MS.length; attempt += 1) {
      try {
        const [tables, schema] = await Promise.all([client.listTables(), client.getTableSchema(tableName)]);
        if (!tables.some((table) => table.table_name === tableName)) {
          throw new Error(`table is not visible in list_tables yet`);
        }
        if (!schema.length) throw new Error('schema has no columns yet');
        return;
      } catch (error) {
        lastError = error;
        const delay = TABLE_READY_DELAYS_MS[attempt];
        if (delay === undefined) break;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error(
      `Created table "${tableName}" did not become readable before seeding: ` +
        `${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }));
}

export function applyAppPhaseTool(client: ToolJetClient): ToolDef {
  return {
    name: 'apply_app_phase',
    title: 'Apply App Phase',
    // Creates, and amends page metadata or the app name when the approved plan says to. It drops no table and deletes
    // no row; the one delete path is a plan page marked replace, whose old components and events it removes.
    annotations: {
      readOnlyHint: false,
      // A plan page marked replace has its components and their events deleted before the plan's are created.
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Consume one successful lint_app_spec plan_token and apply that exact phase once. The tool resolves logical refs, creates ' +
      'tables/pages/queries in dependency order, seeds rows, creates independent page component batches concurrently, combines ' +
      'ordinary events and mutation lifecycles into one bulk write, then returns persisted structural/contract validation. It then ' +
      'runs the proven read queries the phase created or updated once and reports them in read_check (failed: fix the query; ' +
      'inconclusive: the read takes a component value a browser-free run leaves empty; not_run: writes, remote or paid calls and ' +
      'RunJS, which are never run here). A failing read does not fail the phase. ToolJet has no cross-resource transaction: a rare ' +
      'upstream partial failure reports the completed stage/counts and never auto-deletes user data, except for a plan page marked ' +
      'replace: that page ends up holding exactly the plan\'s components. It is written as a difference: a component the plan ' +
      'leaves as it is is not rewritten, one that only moved is moved, one that changed is created again under its own id, and ' +
      'one the plan drops is deleted, with the events on the page\'s components replaced by the plan\'s (page events and query ' +
      'events only where the plan declares them again); queries the plan defines again are updated in place keeping their ids. ' +
      'A replace is refused before any write if the page changed since lint (any component, redefined query or related event ' +
      'edited), and every component and event ref is prepared before the first write. A replace is not atomic: a failure midway ' +
      'leaves the page to be repaired (the result says what was removed; there is no rollback), so use replace on draft or ' +
      'otherwise recoverable pages. ' +
      'The one-time token prevents an accidental retry from duplicating objects.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string().optional().describe('Defaults to the version the plan was linted for.'),
      plan_token: z.string(),
      check_reads: z.boolean().optional().describe(
        'Default true: after the phase is written, the proven read queries it created or updated are run once and ' +
          'the result carries read_check {ran, rows, failed, inconclusive, not_run}. Writes, remote or paid calls and ' +
          'RunJS are never run. false skips the check.'
      ),
    },
    async handler(input: { app_id: string; version_id?: string; plan_token: string; check_reads?: boolean }) {
      // The ids are checked before the one-time token is spent, so a mistyped id does not cost the linted plan, and
      // an omitted version is the plan's (h2-receiving: a malformed version id, then none, and the page never applied).
      const peeked = peekAppPlan(input.plan_token);
      if (peeked) {
        const planVersion = peeked.spec.version_id;
        const mismatch = peeked.spec.app_id && peeked.spec.app_id !== input.app_id
          ? `Plan app_id "${peeked.spec.app_id}" does not match "${input.app_id}".`
          : input.version_id && planVersion && planVersion !== input.version_id
            ? `Plan version_id "${planVersion}" does not match "${input.version_id}". Omit version_id to use the plan's.`
            : undefined;
        if (mismatch) return { content: [{ type: 'text' as const, text: `Error: ${mismatch} The plan_token is still valid.` }], isError: true };
      }
      const version = input.version_id ?? peeked?.spec.version_id;
      if (!version) {
        return { content: [{ type: 'text' as const, text: 'Error: apply_app_phase needs version_id: neither the call nor the plan names one.' }], isError: true };
      }
      const args = { ...input, version_id: version };
      const applied = { app_metadata: 0, tables: 0, seed_rows: 0, pages: 0, queries: 0, components: 0, events: 0,
        queries_updated: 0, events_removed: 0, components_removed: 0, components_kept: 0, components_moved: 0 };
      let stage = 'consume plan';
      let createdPageIds: string[] = [];
      let replacedPageNames: string[] = [];
      let retargetPending: string[] = [];
      /** Events elsewhere still pointing at a removed component, named for the failure message. */
      let notRetargeted: string[] | undefined;
      try {
        const stored = consumeAppPlan(args.plan_token);
        const spec: AppPlanInput = stored.spec;
        if (spec.app_id && spec.app_id !== args.app_id) {
          throw new Error(`Plan app_id "${spec.app_id}" does not match "${args.app_id}".`);
        }
        if (spec.version_id && spec.version_id !== args.version_id) {
          throw new Error(`Plan version_id "${spec.version_id}" does not match "${args.version_id}".`);
        }

        stage = 'read current app context';
        const [initialSummary, existingTables, datasources] = await Promise.all([
          client.getAppSummary(args.app_id),
          client.listTables(),
          spec.queries?.length ? client.listDatasources(args.version_id) : Promise.resolve([]),
        ]);
        const frozen = frozenAppRefusal(initialSummary);
        if (frozen) return fail(new Error(frozen));
        if (initialSummary.version_id && initialSummary.version_id !== args.version_id) {
          throw new Error(`App editing version is "${initialSummary.version_id}", not "${args.version_id}".`);
        }

        // A plan page marked replace (see pageReplace.ts): checked against the app with that page emptied,
        // and its old components and events removed just before the new ones are created.
        // The plan is bound to the state it was linted against: a page that gained a component, event or query edit
        // since (or that did not exist, or was not read, at lint) is never emptied by a plan that did not see it.
        const replacing = replaceView(initialSummary, spec);
        if (replacing && replaceFingerprint(initialSummary, replacing) !== stored.replaceFingerprint) {
          const pages = replacing.replacedPageNames.length ? `"${replacing.replacedPageNames.join('", "')}"` : 'The queries this plan redefines';
          return fail(new Error(`apply_app_phase refused before any write: ${pages} changed since this plan was linted ` +
            '(a component, event or query was edited, or the plan was linted without app_id). Run lint_app_spec with app_id ' +
            'again so the plan sees the current state.'));
        }
        if (replacing) {
          // The app may have changed since lint: a replace that would leave another page reading or acting on a
          // dropped component stops here, before anything is written.
          const dangling = danglingAfterReplace(initialSummary, replacing, spec as never);
          if (dangling.length) return fail(new Error(`apply_app_phase refused before any write: ${dangling.join(' ')}`));
        }
        const planSummary = replacing?.summary ?? initialSummary;
        replacedPageNames = replacing?.replacedPageNames ?? [];
        retargetPending = (replacing?.eventsToRetarget ?? []).map((event) => `"${event.name ?? event.id}"`);

        // Prepare every query's options before the first write (the rename below included): the same shared step the
        // lint and the direct query tools use, so a plan that reaches apply by any route cannot persist a toggle ToolJet
        // would read as on, or options its datasource contract refuses.
        stage = 'prepare queries';
        const datasourceKinds = new Map(datasources.map((datasource) => [datasource.id, datasource.kind]));
        const preparedQueryOptions = (spec.queries ?? []).map((query) => {
          if (!query.datasource_id) throw new Error(`Query "${query.name}" has no pinned datasource_id. Lint the phase again.`);
          const kind = datasourceKinds.get(query.datasource_id);
          if (!kind) throw new Error(`Query "${query.name}" datasource "${query.datasource_id}" is unavailable.`);
          const options = structuredClone(query.options);
          // The lint validated these with the table_ref resolved; the created table's id replaces this before the write.
          if (query.table_ref) options.table_id = `planned-table:${query.table_ref}`;
          const prepared = prepareQueryOptionsForWrite(kind, options, `Query "${query.name}"`);
          if (prepared.errors.length) throw new Error(`${prepared.errors.join(' ')} Nothing was written; lint the phase again.`);
          return { kind, options: prepared.options };
        });

        const plannedPageMatches = new Map<string, AppSummary['pages'][number]>();
        const claimedPageIds = new Set<string>();
        const reusableHome = initialSummary.pages.length === 1 && initialSummary.pages[0]?.handle === 'home' &&
          initialSummary.pages[0].components.length === 0
          ? initialSummary.pages[0]
          : undefined;
        const plannedPageNames = new Set((spec.pages ?? []).map((page) => page.name));
        for (const page of spec.pages ?? []) {
          // By name first: "Home" also matching handle home took "Dashboard" over a real Home page (review 2026-09-25).
          let match = matchPlannedPage(planSummary.pages, page.name, plannedPageNames, claimedPageIds);
          if (!match && reusableHome && !claimedPageIds.has(reusableHome.id)) match = reusableHome;
          if (match) plannedPageMatches.set(logicalRef(page), match);
          if (match) claimedPageIds.add(match.id);
          const existingNames = new Set((match?.components ?? []).map((component) => component.name).filter(Boolean));
          const collision = (page.components ?? []).find((component) => existingNames.has(component.name));
          if (collision) {
            throw new Error(`Page "${page.name}" already has a component named "${collision.name}".`);
          }
        }
        const existingQueryNames = new Set(planSummary.queries.map((query) => query.name).filter(Boolean));
        const queryCollision = (spec.queries ?? []).find((query) => existingQueryNames.has(query.name));
        if (queryCollision) throw new Error(`App already has a query named "${queryCollision.name}".`);

        const existingTableIds = new Map(existingTables.map((table) => [table.table_name.toLowerCase(), table.id]));

        // Every event and lifecycle ref resolved against the given targets: once with placeholders for what this phase
        // creates, before the first write, and again with the persisted ids once everything exists.
        const resolvePlannedEvents = (pageTargets: Map<string, LogicalTarget>, queryTargets: Map<string, LogicalTarget>,
          targets: Map<string, LogicalTarget>) => {
          const ordinaryEvents: EventSpec[] = (spec.events ?? []).map((event) => {
            const source = sourceTarget(event.source_type, event.source_ref, pageTargets, queryTargets, targets);
            if (!source) throw new Error(`Event has unknown ${event.source_type} source_ref "${event.source_ref}".`);
            return {
              sourceId: source.id,
              sourceType: event.source_type,
              ref: event.ref,
              trigger: event.trigger,
              action: resolveAction(event.action, pageTargets, queryTargets, targets),
              name: event.name,
            };
          });
          const lifecycleSpecs = (spec.lifecycles ?? []).map((lifecycle) => ({
            queryId: oneRef(lifecycle.query_ref, queryTargets, 'Lifecycle query')!,
            beforeRefreshActions: lifecycle.before_refresh_actions?.map((action) =>
              resolveAction(action, pageTargets, queryTargets, targets)
            ),
            refreshQueryIds: refs(lifecycle.refresh_query_refs, queryTargets, 'Lifecycle refresh query'),
            clearComponentIds: refs(lifecycle.clear_component_refs, targets, 'Lifecycle clear component'),
            closeModalId: oneRef(lifecycle.close_modal_ref, targets, 'Lifecycle modal'),
            successAlert: lifecycle.success_alert
              ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type }
              : undefined,
            failureAlert: lifecycle.failure_alert
              ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type }
              : undefined,
            successActions: lifecycle.success_actions?.map((action) =>
              resolveAction(action, pageTargets, queryTargets, targets)
            ),
            failureActions: lifecycle.failure_actions?.map((action) =>
              resolveAction(action, pageTargets, queryTargets, targets)
            ),
          }));
          return { ordinaryEvents, lifecycleSpecs };
        };

        // Everything the phase will write is prepared before its first write (the rename included): every page's
        // components, and every event and lifecycle ref against placeholders for the pages, queries and components this
        // phase creates. A plan that cannot apply fails here with the app untouched; queries used to be created and
        // updated before the components were prepared, so a plan whose page could not be built still rewrote them.
        stage = 'prepare page components';
        // The same surface lint_app_spec checked against: a root painted with the app's literal canvas colour linted
        // clean and then failed here without it (a 5-page build lost two applies to it, 2026-09-28).
        const canvasColor = await literalCanvasColor(client, args.app_id, initialSummary.version_id ?? args.version_id);
        const preparedBatches = new Map<string, ReturnType<typeof prepareComponentBatch>>();
        for (const page of spec.pages ?? []) {
          if (!page.components?.length) continue;
          const prepared = prepareComponentBatch(page.components, { canvasColor });
          if (prepared.errors.length) throw new Error(`Page "${page.name}": ${prepared.errors.join(' ')}`);
          preparedBatches.set(logicalRef(page), prepared);
        }
        stage = 'resolve event refs';
        {
          const pages = persistedTargets(
            initialSummary.pages.map((page) => ({ id: page.id, name: page.name ?? page.id, aliases: [page.handle] }))
          );
          for (const page of spec.pages ?? []) {
            const id = plannedPageMatches.get(logicalRef(page))?.id ?? `planned-page:${logicalRef(page)}`;
            pages.set(logicalRef(page), { id, name: page.name });
          }
          const queries = persistedTargets(planSummary.queries.map((query) => ({ id: query.id, name: query.name ?? query.id })));
          for (const query of spec.queries ?? []) {
            const target = { id: replacing?.queriesToUpdate.get(query.name) ?? `planned-query:${query.name}`, name: query.name };
            queries.set(logicalRef(query), target);
            queries.set(query.name, target);
          }
          const components = persistedTargets(
            planSummary.pages.flatMap((page) => page.components).map((component) => ({
              id: component.id, name: component.name ?? component.id, type: component.type,
            }))
          );
          for (const prepared of preparedBatches.values()) {
            for (const component of prepared.components) {
              components.set(component.clientRef ?? component.name, { id: `planned:${component.name}`, name: component.name, type: component.type });
            }
          }
          resolvePlannedEvents(pages, queries, components);
        }

        let renameWarning: string | undefined;
        if (spec.app_name && spec.app_name !== initialSummary.name) {
          stage = 'rename target app';
          try {
            await client.renameApp(args.app_id, args.version_id, spec.app_name);
          } catch (error) {
            // App names are unique per workspace. A collision is not worth failing the whole phase
            // (and consuming the plan token) over: suffix the name the way ToolJet's own create flow does.
            const message = error instanceof Error ? error.message : String(error);
            if (!/exist|unique|duplicate|taken|conflict|409|422/i.test(message)) throw error;
            const fallback = `${spec.app_name} ${Math.random().toString(36).slice(2, 5)}`;
            await client.renameApp(args.app_id, args.version_id, fallback);
            renameWarning = `App name "${spec.app_name}" is already used in this workspace; the app was named "${fallback}" instead.`;
          }
          applied.app_metadata = 1;
        }

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
        createdPageIds = createdPages.map((page) => page.page_id);
        const foundationFailures = [
          ...(tableWrite.status === 'rejected'
            ? [`tables: ${tableWrite.reason instanceof Error ? tableWrite.reason.message : String(tableWrite.reason)}`]
            : []),
          ...(pageWrite.status === 'rejected'
            ? [`pages: ${pageWrite.reason instanceof Error ? pageWrite.reason.message : String(pageWrite.reason)}`]
            : []),
        ];
        if (foundationFailures.length) throw new Error(foundationFailures.join(' | '), {
          cause: tableWrite.status === 'rejected' ? tableQuotaError(tableWrite.reason) : undefined,
        });

        const tableIds = new Map(existingTableIds);
        for (const table of createdTables) tableIds.set(table.table_name.toLowerCase(), table.table_id);
        const newlyCreatedSeedTables = createdTables
          .map((table) => table.table_name)
          .filter((tableName) => spec.seed_data?.some((seed) => seed.table_name === tableName));
        if (newlyCreatedSeedTables.length) {
          stage = 'wait for created table schemas';
          await waitForCreatedTables(client, newlyCreatedSeedTables);
        }
        const pageTargets = persistedTargets(
          initialSummary.pages.map((page) => ({ id: page.id, name: page.name ?? page.id, aliases: [page.handle] }))
        );
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
            ...(existing.name !== page.name ? { name: page.name } : {}),
            ...(existing.icon !== page.icon ? { icon: page.icon } : {}),
            ...(page.hidden !== undefined && Boolean(existing.hidden) !== page.hidden ? { hidden: page.hidden } : {}),
          };
          return Object.keys(update).length > 1 ? [update] : [];
        });
        if (pageUpdates.length) {
          await client.updatePages({ appId: args.app_id, versionId: args.version_id, updates: pageUpdates });
        }

        stage = 'seed data and create queries';
        const queryInputs = (spec.queries ?? []).map((query, index) => {
          const { kind, options } = preparedQueryOptions[index]!;
          if (query.table_ref) {
            const tableId = tableIds.get(query.table_ref.toLowerCase());
            if (!tableId) throw new Error(`Query "${query.name}" has unknown table_ref "${query.table_ref}".`);
            options.table_id = tableId;
          }
          return { dataSourceId: query.datasource_id!, name: query.name, options, kind };
        });
        // A query the replaced page defines again keeps its id (other pages' events hold it): updated in place.
        const updateInputs = queryInputs.filter((query) => replacing?.queriesToUpdate.has(query.name));
        const createInputs = queryInputs.filter((query) => !replacing?.queriesToUpdate.has(query.name));
        const [seedWrite, queryWrite] = await Promise.allSettled([
          spec.seed_data?.length
            ? client.insertRowsBatch({
                tables: spec.seed_data.map((seed) => ({ tableName: seed.table_name, rows: seed.rows })),
              })
            : Promise.resolve([]),
          createInputs.length
            ? client.createQueries({ versionId: args.version_id, queries: createInputs })
            : Promise.resolve([]),
        ]);
        for (const query of updateInputs) {
          const queryId = replacing!.queriesToUpdate.get(query.name)!;
          // A redefinition on another datasource (ToolJet DB into RunJS) moves the query too; updating the options
          // alone would leave the old datasource attached.
          const current = initialSummary.queries.find((candidate) => candidate.id === queryId);
          if (current && query.dataSourceId && current.data_source_id !== query.dataSourceId) {
            await client.updateQueryDatasource({ queryId, versionId: args.version_id, dataSourceId: query.dataSourceId });
          }
          await client.updateQuery({ queryId, versionId: args.version_id, options: query.options });
          applied.queries_updated += 1;
        }
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
        const queryTargets = persistedTargets(
          planSummary.queries.map((query) => ({ id: query.id, name: query.name ?? query.id }))
        );
        let createdIndex = 0;
        (spec.queries ?? []).forEach((query) => {
          const updatedId = replacing?.queriesToUpdate.get(query.name);
          const target = updatedId ? { query_id: updatedId, name: query.name } : createdQueries[createdIndex++];
          if (!target) throw new Error(`Could not resolve query "${query.name}" after creation.`);
          queryTargets.set(logicalRef(query), { id: target.query_id, name: target.name });
          queryTargets.set(query.name, { id: target.query_id, name: target.name });
        });

        const preparedPages = (spec.pages ?? []).flatMap((page) => {
          const prepared = preparedBatches.get(logicalRef(page));
          if (!prepared) return [];
          const target = pageTargets.get(logicalRef(page));
          if (!target) throw new Error(`Could not resolve component page "${page.name}".`);
          return [{ page, pageId: target.id, prepared }];
        });

        // A replaced page is written as its difference from what it holds (pageReplaceInPlace.ts): a component the
        // plan leaves as it is is not written, one that moved gets a layout update, and one that changed is created
        // again under its own id, so ids survive a replace and a one-line change is a small write.
        const inPlace = new Map<string, InPlaceDiff>();
        if (replacing) {
          for (const page of preparedPages) {
            if (!replacing.replacedPageIds.includes(page.pageId)) continue;
            const held = initialSummary.pages.find((existing) => existing.id === page.pageId)?.components ?? [];
            inPlace.set(page.pageId, diffPageInPlace(held, page.prepared.components));
          }
        }

        if (replacing) {
          stage = 'remove the replaced page\'s components and events';
          for (const eventId of replacing.eventsToDelete) {
            await client.deleteEvent({ appId: args.app_id, versionId: args.version_id, eventId });
            applied.events_removed += 1;
          }
          for (const { pageId, componentIds } of replacing.componentsToDelete) {
            const ids = inPlace.get(pageId)?.deleteIds ?? componentIds;
            if (!ids.length) continue;
            const removed = await client.deleteComponents({ appId: args.app_id, versionId: args.version_id, pageId, componentIds: ids });
            applied.components_removed += removed.deleted ?? ids.length;
          }
        }

        stage = 'create page components';
        const componentWrites = await Promise.allSettled(preparedPages.map(async (page) => {
          const diff = inPlace.get(page.pageId);
          if (!diff) {
            const created = await client.createComponents({
              appId: args.app_id,
              versionId: args.version_id,
              pageId: page.pageId,
              components: page.prepared.components,
            });
            return { ...page, created, written: created.length };
          }
          if (diff.create.length) {
            await client.createComponents({ appId: args.app_id, versionId: args.version_id, pageId: page.pageId, components: diff.create });
          }
          if (diff.relayout.length) {
            await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: page.pageId, layouts: diff.relayout });
          }
          applied.components_kept += diff.keep.length;
          applied.components_moved += diff.relayout.length;
          // Every planned component has its id now, written or not: events and other pages refer to them by it.
          const created = page.prepared.components.map((component) => ({
            component_id: diff.ids.get(component.clientRef ?? component.name)!, name: component.name,
          }));
          return { ...page, created, written: diff.create.length };
        }));
        const componentResults = componentWrites.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
        const componentFailures = componentWrites.flatMap((result, index) => result.status === 'rejected'
          ? [`page ${preparedPages[index]!.page.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
          : []);
        const componentTargets = persistedTargets(
          planSummary.pages.flatMap((page) => page.components).map((component) => ({
            id: component.id,
            name: component.name ?? component.id,
            type: component.type,
          }))
        );
        const warnings: string[] = [];
        if (renameWarning) warnings.push(renameWarning);
        for (const page of componentResults) {
          applied.components += page.written;
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
        // Re-pointing runs even when a page's components failed: other pages' events then hold whatever was
        // recreated, not ids that no longer exist.
        if (replacing?.eventsToRetarget.length) {
          // Events elsewhere that pointed at a replaced component by id now point at the recreated component of
          // the same name; one whose component the replace dropped is left as it was, with a note.
          stage = 'point other events at the recreated components';
          const newIdByName = new Map(componentResults.flatMap((page) =>
            page.prepared.components.map((component, index) => [component.name, page.created[index]?.component_id] as const)));
          const updates: Array<{ eventId: string; name?: string; event: Record<string, unknown> }> = [];
          const missingTargets: string[] = [];
          for (const event of replacing.eventsToRetarget) {
            const newIds = new Map([...replacing.replacedComponentNames].map(([oldId, name]) => [oldId, newIdByName.get(name)] as const));
            const original = JSON.stringify(event.event ?? {});
            const swapped = replaceIds(original, newIds);
            const text = swapped.text;
            const missing = swapped.missing.map((id) => replacing.replacedComponentNames.get(id) ?? id);
            if (missing.length) {
              missingTargets.push(`"${event.name ?? event.id}" (${missing.join(', ')})`);
              warnings.push(`Event "${event.name ?? event.id}" targets ${missing.map((n) => `"${n}"`).join(', ')}, which the replaced page no longer has; it was left as it was.`);
            } else if (text !== original) {
              // A component replaced in place kept its id: the event already points at it.
              updates.push({ eventId: event.id, ...(event.name ? { name: event.name } : {}), event: JSON.parse(text) });
            }
          }
          if (updates.length) await client.updateEvents({ appId: args.app_id, versionId: args.version_id, events: updates });
          notRetargeted = missingTargets;
        }
        if (componentFailures.length) throw new Error(componentFailures.join(' | '));

        stage = 'create events and lifecycles';
        const summaryBeforeEvents = await client.getAppSummary(args.app_id);
        const { ordinaryEvents, lifecycleSpecs } = resolvePlannedEvents(pageTargets, queryTargets, componentTargets);
        const expanded = expandQueryLifecycles(summaryBeforeEvents, lifecycleSpecs);
        warnings.push(...expanded.warnings);
        const allEvents = [...ordinaryEvents, ...expanded.events];
        const eventValidation = validateEvents(summaryBeforeEvents, allEvents);
        if (eventValidation.errors.length) throw new Error(eventValidation.errors.join(' '));
        warnings.push(...eventValidation.warnings);
        const newEvents = withoutExistingEvents(allEvents, summaryBeforeEvents.events);
        if (newEvents.length) {
          await client.createEvents({
            appId: args.app_id,
            versionId: args.version_id,
            events: newEvents,
            existingEvents: summaryBeforeEvents.events,
          });
          applied.events = newEvents.length;
        }

        stage = 'validate persisted phase';
        const persisted = await client.getAppSummary(args.app_id);
        const validation = validatePersistedAppSummary(persisted, { canvasColor: await literalCanvasColor(client, args.app_id, persisted.version_id) });
        warnings.push(...validation.warnings);
        const relevantTableNames = new Set([
          ...(spec.tables ?? []).map((table) => table.table_name),
          ...(spec.seed_data ?? []).map((seed) => seed.table_name),
          ...(spec.queries ?? []).flatMap((query) => query.table_ref ? [query.table_ref] : []),
        ]);
        // The reads this phase wrote, run once (applyReadCheck.ts): a query that fails on first load is reported
        // here by name, instead of reaching the app's users. Never a reason to fail a phase that is already written.
        let readCheck: ReadCheck | { error: string } | undefined;
        if (input.check_reads !== false) {
          stage = 'check the phase\'s reads';
          try {
            const written = (spec.queries ?? []).flatMap((query) => {
              const target = queryTargets.get(logicalRef(query));
              return target ? [target.id] : [];
            });
            readCheck = await checkPlanReads(client, { versionId: args.version_id, queryIds: written });
          } catch (error) {
            readCheck = { error: `The phase applied; its reads could not be checked (${error instanceof Error ? error.message : String(error)}). Run them with run_queries.` };
          }
        }
        return ok({
          applied,
          ...(readCheck ? { read_check: readCheck } : {}),
          refs: {
            tables: Object.fromEntries([...relevantTableNames].map((name) => [name, tableIds.get(name.toLowerCase())])),
            pages: selectedRefs(pageTargets, (spec.pages ?? []).map(logicalRef)),
            queries: selectedRefs(queryTargets, (spec.queries ?? []).map(logicalRef)),
            components: selectedRefs(
              componentTargets,
              (spec.pages ?? []).flatMap((page) => (page.components ?? []).map(logicalRef))
            ),
          },
          warnings: [...new Set(warnings)],
          validation,
        });
      } catch (error) {
        let recovery = '';
        // A phase that died in its foundation stage leaves empty pages behind, and the next plan then
        // recreates them under new names (Gemini Pro on an order-desk same-prompt run ended with nine pages, five
        // empty). Pages with nothing on them are safe to remove; created tables stay, since seed rows may
        // already be in them and the next plan can reuse them through table_ref.
        const onlyFoundation = applied.components === 0 && applied.queries === 0 && applied.events === 0;
        if (onlyFoundation && createdPageIds.length) {
          const removed: string[] = [];
          for (const pageId of createdPageIds) {
            try {
              await client.deletePage({ appId: args.app_id, versionId: args.version_id, pageId });
              removed.push(pageId);
            } catch { /* leave it for the recovery listing below */ }
          }
          if (removed.length) {
            applied.pages -= removed.length;
            recovery += ` Removed the ${removed.length} empty page(s) this phase had created, so the next plan can recreate them under the same names.`;
          }
        }
        if (Object.values(applied).some((count) => count > 0)) {
          try {
            const current = await client.getAppSummary(args.app_id);
            recovery = ' Persisted resources for targeted repair (do not recreate): ' + JSON.stringify({
              pages: current.pages.map((page) => ({ id: page.id, name: page.name,
                components: page.components.map((c) => ({ id: c.id, name: c.name })) })),
              queries: current.queries.map((q) => ({ id: q.id, name: q.name })),
            }).slice(0, 12000);
          } catch { /* Preserve the original failure if even the recovery read is unavailable. */ }
        }
        // A replace removes the page's old components before creating the new ones; after that point the message
        // must say so, and what is left to repair (it used to claim nothing had been deleted).
        const removedNote = applied.components_removed || applied.events_removed
          ? `The replace had already removed the old content of ${replacedPageNames.map((name) => `"${name}"`).join(', ')} ` +
            `(${applied.components_removed} component(s), ${applied.events_removed} event(s)); that page now holds only what this ` +
            'phase created (listed below). Repair it by linting the whole page again with replace: true and applying that plan. ' +
            (notRetargeted === undefined && retargetPending.length
              ? `Events on other pages that pointed at its old components were not re-pointed: ${retargetPending.join(', ')}; they still hold the removed ids, so point them at the recreated components with update_events. `
              : notRetargeted?.length ? `Events on other pages still point at components that were not recreated: ${notRetargeted.join(', ')}; recreate those or change the events with update_events. ` : '')
          : 'nothing with content on it was auto-deleted. ';
        return fail(new Error(
          `apply_app_phase failed during ${stage}. Applied before failure: ${appliedSummary(applied)}. ` +
            `The one-time plan token is consumed; ${removedNote}` +
            `${error instanceof Error ? error.message : String(error)}` + recovery,
          { cause: error }
        ));
      }
    },
  };
}

function persistedTargets(
  values: Array<LogicalTarget & { aliases?: Array<string | undefined> }>
): Map<string, LogicalTarget> {
  const targets = new Map<string, LogicalTarget>();
  const nameCounts = new Map<string, number>();
  values.forEach((value) => nameCounts.set(value.name, (nameCounts.get(value.name) ?? 0) + 1));
  for (const { aliases, ...value } of values) {
    targets.set(value.id, value);
    if (nameCounts.get(value.name) === 1) targets.set(value.name, value);
    for (const alias of aliases ?? []) if (alias && !targets.has(alias)) targets.set(alias, value);
  }
  return targets;
}

function selectedRefs(targets: Map<string, LogicalTarget>, refs: string[]): Record<string, string> {
  return Object.fromEntries(refs.flatMap((ref) => {
    const target = targets.get(ref);
    return target ? [[ref, target.id]] : [];
  }));
}

/** Planned events the app already has, the same source, trigger and action, dropped: a phase that re-plans the events
 *  of queries the app keeps (a page replace updates its queries in place) created them again, and each then fired
 *  twice (ds-tower d1). Only exact matches; a changed action is created. */
export function withoutExistingEvents(planned: EventSpec[], existing: AppSummary['events']): EventSpec[] {
  const key = (sourceType: unknown, sourceId: unknown, payload: Record<string, unknown>) =>
    JSON.stringify([sourceType, sourceId, Object.keys(payload).sort().map((k) => [k, payload[k]])]);
  const have = new Set(existing.flatMap((e) => {
    const raw = e.event && typeof e.event === 'object' && !Array.isArray(e.event) ? e.event as Record<string, unknown> : undefined;
    if (!raw) return [];
    const { index: _index, name: _name, ...payload } = raw;
    return [key(e.target, e.sourceId, payload)];
  }));
  return planned.filter((e) => !have.has(key(e.sourceType, e.sourceId, { eventId: e.trigger, ...(e.ref ? { ref: e.ref } : {}), ...e.action })));
}
