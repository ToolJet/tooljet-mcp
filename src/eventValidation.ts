import { getComponentSchema } from './catalog.js';
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

export function validateEvents(summary: AppSummary, events: EventSpec[]): EventValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const queries = new Set(summary.queries.map((query) => query.id));
  const pages = new Set(summary.pages.map((page) => page.id));

  events.forEach((event, index) => {
    const label = event.name ? `Event "${event.name}"` : `Event[${index}]`;
    if (event.sourceType === 'component') {
      const source = components.get(event.sourceId);
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
              'ToolJet returns before it sets lastSelectedCard or fires the event. Enable the native card modal, ' +
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
    if (actionId === 'run-query') {
      const queryId = event.action.queryId;
      if (typeof queryId !== 'string' || !queries.has(queryId)) {
        errors.push(`${label}: run-query target "${String(queryId)}" does not exist.`);
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

  const chains = new Map<string, Array<{ event: EventSpec; index: number }>>();
  events.forEach((event, index) => {
    const key = [event.sourceType, event.sourceId, event.ref ?? '', event.trigger].join('\u0000');
    const chain = chains.get(key) ?? [];
    chain.push({ event, index });
    chains.set(key, chain);
  });
  for (const chain of chains.values()) {
    const navigationIndex = chain.findIndex(({ event }) => event.action.actionId === 'switch-page');
    if (navigationIndex === -1 || navigationIndex === chain.length - 1) continue;
    const navigation = chain[navigationIndex]!;
    const later = chain.slice(navigationIndex + 1).map(({ event }) => String(event.action.actionId)).join(', ');
    const label = navigation.event.name ? `Event "${navigation.event.name}"` : `Event[${navigation.index}]`;
    errors.push(
      `${label}: switch-page must be the LAST handler for the same source and trigger; ` +
        `ToolJet does not run later handlers (${later}). Put state updates and run-query actions before navigation.`
    );
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
