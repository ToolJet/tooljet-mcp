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
      if (typeof modal !== 'string' || !components.has(modal)) {
        errors.push(`${label}: ${actionId} modal target "${String(modal)}" does not exist.`);
      }
    }
    if (actionId === 'control-component') {
      const componentId = event.action.componentId;
      if (typeof componentId !== 'string' || !components.has(componentId)) {
        errors.push(`${label}: control-component target "${String(componentId)}" does not exist.`);
      }
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

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function persistedEventSpecs(summary: AppSummary): EventSpec[] {
  return summary.events.flatMap((event) => {
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
