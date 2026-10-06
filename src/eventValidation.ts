import { getComponentSchema } from './catalog.js';
import { resolveRef } from './refResolution.js';
import { decodeComponentParent } from './componentParent.js';
import { lintComponentStateBindings } from './componentStateBindings.js';
import { requiredMutationGuardWarnings } from './requiredMutationGuard.js';
import { queryEventCycleErrors } from './queryEventCycles.js';
import type { AppSummary, EventSpec, EventSourceType } from './tooljetClient.js';

export interface EventValidationResult {
  errors: string[];
  warnings: string[];
}

const ACTION_IDS = new Set([
  'run-query',
  'switch-page',
  'show-alert',
  'show-modal',
  'close-modal',
  'set-custom-variable',
  'unset-custom-variable',
  'set-page-variable',
  'set-table-page',
  'copy-to-clipboard',
  'generate-file',
  'open-webpage',
  'go-to-app',
  'logout',
  'control-component',
  'set-localstorage-value',
  'scroll-component-into-view',
]);

function propVal(properties: Record<string, unknown> | undefined, key: string): unknown {
  const value = properties?.[key] as { value?: unknown } | undefined;
  return value && typeof value === 'object' && 'value' in value ? value.value : value;
}

function isFalseBinding(value: unknown): boolean {
  return value === false || value === 'false' || value === '{{false}}';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// Navigation dispatches an item's exact ref, followed by unreferenced component handlers.
// Groups expose no item events. Dynamic menus cannot prove membership without runtime state.
function navigationItemRef(source: AppSummary['pages'][number]['components'][number], ref: string): 'valid' | 'invalid' | 'unknown' {
  let unknown = false;
  let found = false;
  let group = false;
  const visit = (items: unknown) => {
    if (typeof items === 'string' && items.includes('{{')) { unknown = true; return; }
    if (!Array.isArray(items)) { if (items == null) unknown = true; return; }
    for (const item of items) {
      if (!isRecord(item)) continue;
      if (item.id === ref) {
        if (item.isGroup) group = true;
        else found = true;
      }
      if (typeof item.id === 'string' && item.id.includes('{{')) unknown = true;
      if (item.isGroup) visit(item.children ?? []);
    }
  };
  visit(propVal(source.properties, 'menuItems'));
  return group ? 'invalid' : found ? 'valid' : unknown ? 'unknown' : 'invalid';
}

// Match serialization: a ref nested in action overrides the outer event ref, even if null.
function effectiveRef(event: EventSpec): unknown {
  return Object.prototype.hasOwnProperty.call(event.action, 'ref') ? event.action.ref : event.ref;
}

function validateTableColumnRef(
  source: AppSummary['pages'][number]['components'][number],
  ref: string | undefined
): string | undefined {
  if (!ref) return 'Table Button-column events require ref "<column key or name>::<button id>".';
  const separator = ref.lastIndexOf('::');
  if (separator <= 0 || separator === ref.length - 2) return `Table Button-column ref "${ref}" is malformed.`;
  const columnRef = ref.slice(0, separator);
  const buttonId = ref.slice(separator + 2);
  const columns = propVal(source.properties, 'columns');
  if (!Array.isArray(columns)) return `Table "${source.name ?? source.id}" has no explicit columns array for ref "${ref}".`;
  const column = columns.find((candidate) => {
    const item = candidate as Record<string, unknown> | null;
    return item?.key === columnRef || item?.name === columnRef;
  }) as Record<string, unknown> | undefined;
  if (!column || column.columnType !== 'button') {
    return `Table "${source.name ?? source.id}" has no Button column keyed/named "${columnRef}".`;
  }
  if (!Array.isArray(column.buttons) || !column.buttons.some((button) => (button as Record<string, unknown>)?.id === buttonId)) {
    return `Table Button column "${columnRef}" has no button id "${buttonId}".`;
  }
  return undefined;
}

// GUI write operations, keyed by the operation ids ToolJet actually ships (data/datasource-schemas.json).
// Names differ per datasource kind, so this is deliberately a UNION: 'update_row' and the '*_pkey' forms
// are real SQL-plugin ops, while ToolJet DB uses 'update_rows' and the '*_with_primary_key' forms.
// 'update_rows' was missing, so the single most common write — an Approve/Save button on ToolJet DB —
// was invisible to every mutation-aware check here, including the double-submit guard.
// Over-inclusion is safe (an extra advisory warning); omission silently drops the guard.
const MUTATION_OPERATIONS = new Set([
  'create_row',
  'update_row',
  'update_rows',
  'upsert_rows',
  'delete_row',
  'delete_rows',
  'bulk_insert',
  'bulk_update_pkey',
  'bulk_upsert_pkey',
  'bulk_update_with_primary_key',
  'bulk_upsert_with_primary_key',
]);

/** A query that writes data (GUI mutation op, or a SQL statement that begins with a write keyword). */
function isMutationQuery(query: { options?: unknown }): boolean {
  const options = (query.options ?? {}) as Record<string, unknown>;
  const operation = typeof options.operation === 'string' ? options.operation.toLowerCase() : undefined;
  if (operation && MUTATION_OPERATIONS.has(operation)) return true;
  const sqlExecution = options.sql_execution as { sqlQuery?: unknown } | undefined;
  const sql =
    typeof options.query === 'string' ? options.query
    : typeof options.sql === 'string' ? options.sql
    : typeof sqlExecution?.sqlQuery === 'string' ? sqlExecution.sqlQuery
    : undefined;
  return typeof sql === 'string' && /^\s*(insert|update|delete|merge|upsert|replace)\b/i.test(sql);
}

export function validateEvents(
  summary: AppSummary,
  events: EventSpec[],
  options: { includePersistedChains?: boolean; navigationMovedLast?: boolean } = {}
): EventValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const queries = new Set(summary.queries.map((query) => query.id));
  const queryById = new Map(summary.queries.map((query) => [query.id, query]));
  const pages = new Set(summary.pages.map((page) => page.id));
  const pageOfComponent = new Map(summary.pages.flatMap((page) => page.components.map((c) => [c.id, page.id] as const)));
  const pageName = new Map(summary.pages.map((page) => [page.id, page.name ?? page.handle ?? page.id]));
  // Which pages run a query on load: page onPageLoad run-query events (persisted and in this batch),
  // component events on a page, and runOnPageLoad (which fires on every page). Used to reject a
  // query-success action aimed at a component that may not be mounted when the query finishes.
  const queryTriggerPages = new Map<string, Set<string>>(); // '*' = every page
  const noteTrigger = (queryId: string | undefined, pageId: string | undefined) => {
    if (!queryId) return;
    const set = queryTriggerPages.get(queryId) ?? new Set<string>();
    set.add(pageId ?? '*');
    queryTriggerPages.set(queryId, set);
  };
  for (const query of summary.queries) {
    const opts = (query.options && typeof query.options === 'object' ? query.options : {}) as Record<string, unknown>;
    const onLoad = (opts.runOnPageLoad as { value?: unknown } | boolean | string | undefined);
    const raw = onLoad && typeof onLoad === 'object' ? onLoad.value : onLoad;
    if (raw === true || String(raw ?? '').replace(/[{}\s]/g, '').toLowerCase() === 'true') noteTrigger(query.id, undefined);
  }
  for (const persisted of summary.events ?? []) {
    const payload = persisted.event && typeof persisted.event === 'object' ? (persisted.event as Record<string, unknown>) : undefined;
    if (!payload || payload.actionId !== 'run-query') continue;
    const queryId = String(payload.queryId ?? '');
    if (persisted.target === 'page') noteTrigger(queryId, persisted.sourceId);
    else if (persisted.target === 'component' && persisted.sourceId) noteTrigger(queryId, pageOfComponent.get(persisted.sourceId));
  }
  for (const event of events) {
    if (event.action?.actionId !== 'run-query') continue;
    const queryId = String(event.action.queryId ?? '');
    if (event.sourceType === 'page') noteTrigger(queryId, event.sourceId);
    else if (event.sourceType === 'component' || event.sourceType === 'table_column') noteTrigger(queryId, pageOfComponent.get(event.sourceId));
  }
  const pageScopedTarget = (action: Record<string, unknown>): string | undefined => {
    const id = action.actionId;
    if (id === 'set-table-page') return typeof action.table === 'string' ? action.table : undefined;
    if (id === 'control-component' || id === 'scroll-component-into-view') return typeof action.componentId === 'string' ? action.componentId : undefined;
    if (id === 'show-modal' || id === 'close-modal') return typeof action.modal === 'string' ? action.modal : undefined;
    return undefined;
  };

  events.forEach((event, index) => {
    const label = event.name ? `Event "${event.name}"` : `Event[${index}]`;
    errors.push(...lintComponentStateBindings(event.action, [...components.values()], label));
    if (event.sourceType === 'component') {
      // Invented Button refs once hid three duplicate submit handlers. An action's ref
      // reaches the same payload field on write, so nesting it must not bypass this check.
      // Query events may carry runtime refs; only ordinary component events are restricted here.
      const source = components.get(event.sourceId);
      for (const ref of new Set([event.ref, event.action.ref].filter((ref) => ref != null && ref !== ''))) {
        if (source?.type !== 'Navigation' || event.trigger !== 'onClick') {
          errors.push(`${label}: ordinary component events cannot use ref; use name to label the handler. Only Navigation onClick item refs and Table Button-column refs have component sub-element scopes.`);
        } else if (!nonEmptyString(ref) || ref.includes('{{')) {
          errors.push(`${label}: Navigation onClick ref must be a literal non-empty item id.`);
        } else {
          const membership = navigationItemRef(source, ref);
          if (membership === 'invalid') errors.push(`${label}: Navigation ref "${ref}" does not identify a non-group menu item.`);
          if (membership === 'unknown') warnings.push(`${label}: Navigation ref "${ref}" membership cannot be verified because menuItems are unresolved/dynamic. Verify the runtime item id; no item membership was inferred.`);
        }
      }
      if (!source) errors.push(`${label}: component source "${event.sourceId}" does not exist.`);
      else if (source.type) {
        const schema = getComponentSchema(source.type);
        const validTriggers = schema?.events?.map((item) => item.id) ?? [];
        if (schema && !validTriggers.includes(event.trigger)) {
          errors.push(
            `${label}: trigger "${event.trigger}" is not valid for ${source.type}. Valid triggers: ${validTriggers.join(', ') || 'none'}.`
          );
        }
        if (
          source.type === 'Kanban' &&
          event.trigger === 'onCardSelected' &&
          isFalseBinding(propVal(source.properties, 'openModalOnCardClick'))
        ) {
          errors.push(
            `${label}: Kanban onCardSelected cannot fire while openModalOnCardClick is false; ` +
              'ToolJet returns before it sets lastSelectedCard or fires the event. Enable the native card modal AND populate it with children parented to the Kanban using slot_name:"modal", ' +
              'or remove this handler and use a separate supported detail flow.'
          );
        }
      }
    } else if (event.sourceType === 'data_query') {
      if (!queries.has(event.sourceId)) errors.push(`${label}: query source "${event.sourceId}" does not exist.`);
      if (!['onDataQuerySuccess', 'onDataQueryFailure'].includes(event.trigger)) {
        errors.push(`${label}: query trigger must be onDataQuerySuccess or onDataQueryFailure, not "${event.trigger}".`);
      }
    } else if (event.sourceType === 'page') {
      if (!pages.has(event.sourceId)) errors.push(`${label}: page source "${event.sourceId}" does not exist.`);
      if (event.trigger !== 'onPageLoad') errors.push(`${label}: page trigger must be onPageLoad, not "${event.trigger}".`);
    } else if (event.sourceType === 'table_column') {
      const source = components.get(event.sourceId);
      if (!source) errors.push(`${label}: Table source "${event.sourceId}" does not exist.`);
      else if (source.type !== 'Table') errors.push(`${label}: table_column source must be a Table, not ${source.type ?? 'unknown'}.`);
      else {
        if (event.trigger !== 'onClick') errors.push(`${label}: Table Button-column trigger must be onClick.`);
        const refError = validateTableColumnRef(source, event.ref);
        if (refError) errors.push(`${label}: ${refError}`);
      }
    } else if (event.sourceType === 'table_action') {
      errors.push(
        `${label}: deprecated table_action handlers are not authored reliably. Use a columnType:"button" column with source_type:"table_column".`
      );
    }

    const actionId = event.action.actionId;
    if (typeof actionId !== 'string' || !ACTION_IDS.has(actionId)) {
      errors.push(`${label}: unknown actionId "${String(actionId)}"; ToolJet silently ignores invalid action ids.`);
      return;
    }
    // A page-scoped action (set a Table page, control a component, open a modal) reaches only what is
    // mounted: the components of the open page. Aimed at another page it fails at runtime with
    // "exposedValue.setPage is not a function" (seen 2026-09-05 in a Sales Performance app whose
    // page-load queries reset tables on three other pages).
    const targetId = pageScopedTarget(event.action as Record<string, unknown>);
    const targetPage = targetId ? pageOfComponent.get(targetId) : undefined;
    if (targetId && targetPage) {
      const targetLabel = `${components.get(targetId)?.type ?? 'component'} "${components.get(targetId)?.name ?? targetId}" on page "${pageName.get(targetPage)}"`;
      const sourcePage =
        event.sourceType === 'page'
          ? event.sourceId
          : event.sourceType === 'component' || event.sourceType === 'table_column'
            ? pageOfComponent.get(event.sourceId)
            : undefined;
      if (sourcePage && sourcePage !== targetPage) {
        errors.push(
          `${label}: ${actionId} targets ${targetLabel} from page "${pageName.get(sourcePage)}". A page-scoped action ` +
            'only reaches components on the page that is open; on another page the target is not mounted and the ' +
            `action fails at runtime. Put this handler on page "${pageName.get(targetPage)}" (its onPageLoad, or a ` +
            'component there), or drop it: switch-page mounts that page fresh.'
        );
      } else if (event.sourceType === 'data_query') {
        const triggerPages = queryTriggerPages.get(event.sourceId);
        const elsewhere = triggerPages ? [...triggerPages].filter((page) => page !== targetPage) : [];
        if (elsewhere.length) {
          const where = elsewhere.includes('*') ? 'on every page load (runOnPageLoad)' : `from page "${elsewhere.map((p) => pageName.get(p) ?? p).join('", "')}"`;
          errors.push(
            `${label}: ${actionId} targets ${targetLabel}, but query "${queryById.get(event.sourceId)?.name ?? event.sourceId}" runs ${where}, ` +
              'where that component is not mounted, so the success handler fails at runtime. Move the action to ' +
              `page "${pageName.get(targetPage)}" (its onPageLoad, or the filter\'s own event there), or run the query only from that page.`
          );
        }
      }
    }
    if (actionId === 'run-query') {
      let queryId = event.action.queryId;
      // Accept a query NAME here: it is the handle the model authored and what every binding uses
      // ({{queries.getUsers.data}}), and the tool's own description offers `queryName` alongside
      // `queryId`. Matching on id alone and answering "does not exist" is false when the query is
      // present under its name, and sends the model into a re-read/retry loop. Resolve it instead —
      // and because add_events fails the WHOLE batch on any error, one such slip otherwise rejects an
      // app's entire event wiring. See src/refResolution.ts.
      if (typeof queryId === 'string' && !queries.has(queryId)) {
        const resolution = resolveRef(summary.queries, queryId, 'Query', 'in this app');
        if (resolution.ok) {
          if (resolution.warning) warnings.push(`${label}: ${resolution.warning}`);
          queryId = resolution.target.id;
          event.action.queryId = queryId;
        }
      }
      if (typeof queryId !== 'string' || !queries.has(queryId)) {
        const available = summary.queries.map((q) => `${q.name ?? '(unnamed)'}=${q.id}`).join(', ');
        errors.push(
          `${label}: no query with id or name "${String(queryId)}" in this app. ` +
            `Do not re-read — the app currently has: ${available || '(no queries)'}.`
        );
      } else if (event.sourceType === 'component' && event.trigger === 'onClick') {
        // Double-submit guard: a button that fires a mutation query on click should disable itself while
        // that query runs, or the user can submit the same create/update several times.
        const source = components.get(event.sourceId);
        const query = queryById.get(queryId);
        if (source?.type === 'Button' && query && isMutationQuery(query)) {
          warnings.push(...requiredMutationGuardWarnings(source, query, event.action, [...components.values()]));
          const disabled = propVal(source.properties, 'disabledState');
          const guarded = typeof disabled === 'string' && disabled.includes('{{') && /isloading/i.test(disabled);
          if (!guarded) {
            warnings.push(
              `Button "${source.name ?? source.id}" runs the mutation query "${query.name ?? queryId}" on click ` +
                `but its disabledState does not gate on the query's loading state, so it can be double-submitted. ` +
                `Set disabledState to {{queries.${query.name ?? queryId}.isLoading}}.`
            );
          }
        }
      }
    }
    if (actionId === 'switch-page') {
      const pageId = event.action.pageId;
      if (typeof pageId !== 'string' || !pages.has(pageId)) {
        errors.push(`${label}: switch-page target "${String(pageId)}" does not exist.`);
      }
    }
    if (['show-modal', 'close-modal'].includes(actionId)) {
      const modal = event.action.modal;
      const target = typeof modal === 'string' ? components.get(modal) : undefined;
      if (!target) {
        errors.push(`${label}: ${actionId} modal target "${String(modal)}" does not exist.`);
      } else if (!['Modal', 'ModalV2'].includes(target.type ?? '')) {
        errors.push(
          `${label}: ${actionId} target must be a Modal or ModalV2, not ${target.type ?? 'unknown'} ` +
            `"${target.name ?? target.id}".`
        );
      }
    }
    if (actionId === 'control-component') {
      const componentId = event.action.componentId;
      const target = typeof componentId === 'string' ? components.get(componentId) : undefined;
      if (!target) {
        errors.push(`${label}: control-component target "${String(componentId)}" does not exist.`);
      } else {
        const handle = event.action.componentSpecificActionHandle;
        const schema = target.type ? getComponentSchema(target.type) : null;
        const componentAction = typeof handle === 'string'
          ? schema?.actions?.find((candidate) => candidate.handle === handle)
          : undefined;
        if (!nonEmptyString(handle)) {
          errors.push(`${label}: control-component requires componentSpecificActionHandle.`);
        } else if (!componentAction) {
          errors.push(
            `${label}: control-component action "${handle}" is not valid for ${target.type ?? 'unknown'} ` +
              `"${target.name ?? target.id}". Valid actions: ${schema?.actions?.map((candidate) => candidate.handle).join(', ') || 'none'}.`
          );
        } else {
          const params = event.action.componentSpecificActionParams;
          if (params !== undefined && !Array.isArray(params)) {
            errors.push(`${label}: componentSpecificActionParams must be an array.`);
          } else if (Array.isArray(params)) {
            const supplied = new Set(params.flatMap((param) =>
              isRecord(param) && nonEmptyString(param.handle) ? [param.handle] : []
            ));
            if (params.some((param) => !isRecord(param) || !nonEmptyString(param.handle))) {
              errors.push(`${label}: every componentSpecificActionParams entry requires a string handle.`);
            }
            const requiredHandles = (componentAction.params ?? []).flatMap((param) =>
              nonEmptyString(param.handle) ? [param.handle] : []
            );
            const missing = requiredHandles.filter((required) => !supplied.has(required));
            if (missing.length) {
              errors.push(
                `${label}: control-component action "${handle}" is missing parameter handles: ${missing.join(', ')}.`
              );
            }
          } else if ((componentAction.params?.length ?? 0) > 0) {
            errors.push(
              `${label}: control-component action "${handle}" requires componentSpecificActionParams for ` +
                `${componentAction.params!.map((param) => String(param.handle)).join(', ')}.`
            );
          }
        }
      }
    }
    if (actionId === 'scroll-component-into-view') {
      const componentId = event.action.componentId;
      if (typeof componentId !== 'string' || !components.has(componentId)) {
        errors.push(`${label}: scroll-component-into-view target "${String(componentId)}" does not exist.`);
      }
    }
    if (actionId === 'show-alert') {
      if (!nonEmptyString(event.action.message)) errors.push(`${label}: show-alert requires a non-empty message.`);
      if (!['success', 'info', 'warning', 'error'].includes(String(event.action.alertType))) {
        errors.push(`${label}: show-alert alertType must be success, info, warning, or error.`);
      }
    }
    if (['set-custom-variable', 'set-page-variable', 'set-localstorage-value'].includes(actionId)) {
      if (!nonEmptyString(event.action.key)) errors.push(`${label}: ${actionId} requires a non-empty key.`);
      if (!Object.prototype.hasOwnProperty.call(event.action, 'value')) errors.push(`${label}: ${actionId} requires value.`);
    }
    if (actionId === 'unset-custom-variable' && !nonEmptyString(event.action.key)) {
      errors.push(`${label}: unset-custom-variable requires a non-empty key.`);
    }
    if (actionId === 'open-webpage' && !nonEmptyString(event.action.url)) {
      errors.push(`${label}: open-webpage requires a non-empty url.`);
    }
    if (actionId === 'copy-to-clipboard' && !Object.prototype.hasOwnProperty.call(event.action, 'contentToCopy')) {
      errors.push(`${label}: copy-to-clipboard requires contentToCopy.`);
    }
    if (actionId === 'set-table-page') {
      const tableId = event.action.table;
      const table = typeof tableId === 'string' ? components.get(tableId) : undefined;
      if (!table) {
        errors.push(`${label}: set-table-page Table target "${String(tableId)}" does not exist.`);
      } else if (table.type !== 'Table') {
        errors.push(`${label}: set-table-page target must be a Table, not ${table.type ?? 'unknown'}.`);
      }
      const pageIndex = event.action.pageIndex;
      if (!['string', 'number'].includes(typeof pageIndex) || String(pageIndex).trim() === '') {
        errors.push(`${label}: set-table-page requires a numeric value or binding in pageIndex.`);
      }
    }
    if (actionId === 'generate-file') {
      const format = ['fileType', 'type', 'format', 'extension']
        .map((key) => event.action[key])
        .find((value): value is string => typeof value === 'string');
      if (format && /\bpdf\b/i.test(format)) {
        warnings.push(
          `${label}: generate-file PDF is a pass-through and expects pre-formed PDF bytes; it does not convert text/HTML/data into a PDF. ` +
            'Use CSV/plaintext, or supply and browser-verify real PDF bytes.'
        );
      }
    }
  });

  const chainKey = (event: Pick<EventSpec, 'sourceType' | 'sourceId' | 'ref' | 'trigger'>): string =>
    [event.sourceType, event.sourceId, event.ref ?? '', event.trigger].join('\u0000');
  const touchedChains = new Set(events.map(chainKey));
  const chains = new Map<string, Array<{ event: EventSpec; index: number; persisted: boolean }>>();
  for (const persisted of options.includePersistedChains === false ? [] : summary.events) {
    const raw = isRecord(persisted.event) ? persisted.event : undefined;
    const sourceType = persisted.target as EventSourceType | undefined;
    const trigger = raw?.eventId;
    if (!raw || !persisted.sourceId || !sourceType || !nonEmptyString(trigger)) continue;
    const event: EventSpec = {
      sourceId: persisted.sourceId,
      sourceType,
      ref: nonEmptyString(raw.ref) ? raw.ref : undefined,
      trigger,
      action: raw,
      name: persisted.name,
    };
    const key = chainKey(event);
    if (!touchedChains.has(key)) continue;
    const chain = chains.get(key) ?? [];
    chain.push({ event, index: persisted.index ?? 0, persisted: true });
    chains.set(key, chain);
  }
  events.forEach((event, index) => {
    const key = chainKey(event);
    const chain = chains.get(key) ?? [];
    const lastPersistedIndex = chain.reduce((maximum, item) => item.persisted ? Math.max(maximum, item.index) : maximum, -1);
    chain.push({ event, index: lastPersistedIndex + index + 1, persisted: false });
    chains.set(key, chain);
  });
  for (const chain of chains.values()) {
    chain.sort((left, right) => left.index - right.index || Number(right.persisted) - Number(left.persisted));
    // A closed ModalV2 unmounts its children. Imperative prefill before show-modal is lost
    // when those controls mount with their defaults (observed in the Luna UI benchmark).
    chain.forEach(({ event }, index) => {
      if (event.action.actionId !== 'control-component' ||
          !['selectOption', 'selectOptions', 'setText', 'setValue'].includes(String(event.action.componentSpecificActionHandle))) return;
      let child = components.get(String(event.action.componentId));
      const visited = new Set<string>();
      while (child?.parent && !visited.has(child.id)) {
        visited.add(child.id);
        const parent = components.get(decodeComponentParent(child.parent).parentId);
        if (!parent) break;
        if (parent.type === 'ModalV2' && chain.slice(index + 1).some(({ event: later }) =>
          later.action.actionId === 'show-modal' && later.action.modal === parent.id)) {
          errors.push(`Event "${event.name ?? index}": prefill targets a child of ModalV2 "${parent.name ?? parent.id}" ` +
            'before show-modal. Closed modal children are not mounted; these values can be lost. ' +
            'Bind input defaults to the selected record, or initialize after the modal opens.');
          break;
        }
        child = parent;
      }
    });
    const navigationIndex = chain.findIndex(({ event }) => event.action.actionId === 'switch-page');
    if (navigationIndex === -1 || navigationIndex === chain.length - 1) continue;
    const navigation = chain[navigationIndex]!;
    // apply_app_phase moves a saved page switch behind the handlers its plan adds (navigationReorders), so a saved
    // switch followed only by this plan's new handlers is fine there (a site inspection build lost four compiles to it,
    // 2026-10-04). Where nothing reorders (add_events), it is still an error.
    const afterNavigation = chain.slice(navigationIndex + 1);
    if (options.navigationMovedLast && navigation.persisted &&
        afterNavigation.every((item) => !item.persisted && item.event.action.actionId !== 'switch-page')) continue;
    const later = chain.slice(navigationIndex + 1).map(({ event }) => String(event.action.actionId)).join(', ');
    const label = navigation.event.name
      ? `${navigation.persisted ? 'Persisted event' : 'Event'} "${navigation.event.name}"`
      : `${navigation.persisted ? 'Persisted event' : 'Event'}[${navigation.index}]`;
    errors.push(
      `${label}: switch-page must be the LAST handler for the same source and trigger; ` +
        `ToolJet does not run later handlers (${later}). Put state updates and run-query actions before navigation.`
    );
  }

  errors.push(...queryEventCycleErrors(summary, events, options.includePersistedChains === false ? [] : persistedEventSpecs(summary)));
  // One click, one run of a query. A handler planned again with a slightly different guard is not an exact match of
  // the one the app holds, so it was created beside it and the click ran the write twice (2026-09-30).
  const persistedMode = options.includePersistedChains === false;
  // Invalid ordinary refs cannot partition a click, even in data persisted before this check.
  // Table buttons and Navigation items retain their scopes. Navigation's component-wide handler
  // runs after EVERY clicked item's handlers, so its null scope overlaps each item scope.
  const isNavigation = (sourceType: string, sourceId: string, trigger: unknown) =>
    sourceType === 'component' && components.get(sourceId)?.type === 'Navigation' && trigger === 'onClick';
  const runKey = (sourceType: string, sourceId: string, trigger: unknown, queryId: unknown) =>
    JSON.stringify([sourceType, sourceId, trigger, queryId]);
  const runScope = (sourceType: string, sourceId: string, trigger: unknown, ref: unknown) =>
    sourceType === 'table_column' || isNavigation(sourceType, sourceId, trigger) ? ref || null : null;
  const overlaps = (left: unknown, right: unknown, navigation: boolean) =>
    left === right || (navigation && (left === null || right === null));
  const payloadKey = (payload: Record<string, unknown>) => JSON.stringify(Object.keys(payload).filter((k) => k !== 'index' && k !== 'name').sort().map((k) => [k, payload[k]]));
  const heldRuns = new Map<string, { id: string; payload: string; scope: unknown }[]>();
  if (!persistedMode) {
    for (const held of summary.events ?? []) {
      const payload = held.event && typeof held.event === 'object' ? (held.event as Record<string, unknown>) : undefined;
      if (!payload || payload.actionId !== 'run-query' || !held.sourceId) continue;
      if (held.target !== 'component' && held.target !== 'table_column') continue;
      const key = runKey(held.target, held.sourceId, payload.eventId, payload.queryId);
      const scope = runScope(held.target, held.sourceId, payload.eventId, payload.ref);
      heldRuns.set(key, [...(heldRuns.get(key) ?? []), { id: held.id, payload: payloadKey(payload), scope }]);
    }
  }
  const plannedRuns = new Map<string, unknown[]>();
  for (const event of events) {
    if (event.action?.actionId !== 'run-query') continue;
    if (event.sourceType !== 'component' && event.sourceType !== 'table_column') continue;
    const key = runKey(event.sourceType, event.sourceId, event.trigger, event.action.queryId);
    const scope = runScope(event.sourceType, event.sourceId, event.trigger, effectiveRef(event));
    const navigation = isNavigation(event.sourceType, event.sourceId, event.trigger);
    const sourceName = components.get(event.sourceId)?.name ?? event.sourceId;
    const queryName = queryById.get(String(event.action.queryId ?? ''))?.name ?? String(event.action.queryName ?? event.action.queryId);
    const mine = payloadKey({ eventId: event.trigger, ...(event.ref ? { ref: event.ref } : {}), ...event.action });
    const held = (heldRuns.get(key) ?? []).filter((h) => overlaps(h.scope, scope, navigation));
    // An exact match of a held handler is not created again (withoutExistingEvents), so it is not a second run.
    if (held.length && !held.some((h) => h.payload === mine)) {
      errors.push(
        `"${sourceName}" ${event.trigger} already runs query "${queryName}" (event ${held[0].id}); a second handler would run it twice on one ${event.trigger}. ` +
          'Change that handler with update_events, or delete it with delete_event before adding this one.'
      );
    } else if ((plannedRuns.get(key) ?? []).some((previous) => overlaps(previous, scope, navigation))) {
      (persistedMode ? warnings : errors).push(
        `"${sourceName}" ${event.trigger} runs query "${queryName}" twice: two handlers on it run the same query, so one ${event.trigger} runs it two times. Keep one.`
      );
    }
    plannedRuns.set(key, [...(plannedRuns.get(key) ?? []), scope]);
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function persistedEventSpecs(summary: AppSummary): EventSpec[] {
  return summary.events
    .map((event, position) => ({ event, position }))
    .sort((left, right) => (left.event.index ?? left.position) - (right.event.index ?? right.position))
    .flatMap(({ event }) => {
    if (!event.sourceId || !event.target || !event.event || typeof event.event !== 'object') return [];
    const payload = event.event as Record<string, unknown>;
    if (typeof payload.eventId !== 'string') return [];
    const { eventId, ref, ...action } = payload;
    // Keep malformed ordinary refs visible to validation instead of silently dropping them.
    // String refs retain the normal representation, including runtime query and table refs.
    if (event.target === 'component' && ref != null && typeof ref !== 'string') action.ref = ref;
    return [{
      sourceId: event.sourceId,
      sourceType: event.target as EventSourceType,
      ...(typeof ref === 'string' ? { ref } : {}),
      trigger: eventId,
      action,
      name: event.name,
    }];
    });
}


/** Saved page switches that are no longer last in their chain (source, trigger, ref), moved to the end: what
 *  apply_app_phase sends as a reorder after it adds a phase's handlers. ToolJet runs nothing after a switch-page. */
/**
 * The saved page switches that are no longer last in their chain, moved to the end. `touched` limits this to the chains
 * a phase added handlers to (source, ref and trigger): reordering every chain in the app also moved handlers the plan
 * never approved, and could make an unreachable write run (round-3 review, 2026-10-04). Untouched chains that end
 * out of order are reported in `diagnostics` instead.
 */
export function navigationReorders(
  summary: AppSummary,
  touched?: EventSpec[],
  diagnostics?: string[],
): Array<{ eventId: string; index: number }> {
  const touchedKeys = touched
    ? new Set(touched.map((event) => [event.sourceType, event.sourceId, event.ref ?? '', event.trigger].join('\u0000')))
    : undefined;
  const chains = new Map<string, Array<{ id: string; index: number; nav: boolean }>>();
  for (const saved of summary.events ?? []) {
    const raw = isRecord(saved.event) ? saved.event : undefined;
    if (!raw || !saved.sourceId || !nonEmptyString(raw.eventId)) continue;
    const key = [saved.target, saved.sourceId, nonEmptyString(raw.ref) ? raw.ref : '', raw.eventId].join('\u0000');
    const chain = chains.get(key) ?? [];
    chain.push({ id: saved.id, index: saved.index ?? 0, nav: raw.actionId === 'switch-page' });
    chains.set(key, chain);
  }
  const moves: Array<{ eventId: string; index: number }> = [];
  for (const [key, chain] of chains) {
    chain.sort((a, b) => a.index - b.index);
    const navs = chain.filter((item) => item.nav);
    if (!navs.length || chain.slice(-navs.length).every((item) => item.nav)) continue;
    if (touchedKeys && !touchedKeys.has(key)) {
      const [, sourceId, ref, trigger] = key.split('\u0000');
      diagnostics?.push(`The saved ${trigger} chain of "${sourceId}"${ref ? ` (${ref})` : ''} has a page switch before other handlers, ` +
        'so those never run; this phase did not touch it, so it was left as it is.');
      continue;
    }
    let next = Math.max(...chain.map((item) => item.index)) + 1;
    for (const nav of navs) moves.push({ eventId: nav.id, index: next++ });
  }
  return moves;
}
