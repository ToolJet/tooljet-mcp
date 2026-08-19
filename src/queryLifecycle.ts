import type { AppSummary, EventSpec } from './tooljetClient.js';

export interface LifecycleAlert {
  message: string;
  alertType?: 'success' | 'info' | 'warning' | 'error';
}

export interface QueryLifecycleSpec {
  queryId: string;
  refreshQueryIds?: string[];
  clearComponentIds?: string[];
  closeModalId?: string;
  successAlert?: LifecycleAlert;
  failureAlert?: LifecycleAlert;
  successActions?: Array<Record<string, unknown>>;
  failureActions?: Array<Record<string, unknown>>;
}

export interface ExpandedQueryLifecycles {
  events: EventSpec[];
  warnings: string[];
}

/** Expand concise mutation lifecycle declarations into ordinary, fully validated ToolJet events. */
export function expandQueryLifecycles(
  summary: AppSummary,
  lifecycles: QueryLifecycleSpec[]
): ExpandedQueryLifecycles {
  const queries = new Map(summary.queries.map((query) => [query.id, query]));
  const components = new Map(summary.pages.flatMap((page) => page.components).map((component) => [component.id, component]));
  const warnings: string[] = [];
  const events: EventSpec[] = [];
  const seenSources = new Set<string>();

  for (const lifecycle of lifecycles) {
    const query = queries.get(lifecycle.queryId);
    if (!query) throw new Error(`Query lifecycle source "${lifecycle.queryId}" does not exist.`);
    if (seenSources.has(lifecycle.queryId)) {
      throw new Error(`Query "${query.name ?? lifecycle.queryId}" has more than one lifecycle declaration in this batch.`);
    }
    seenSources.add(lifecycle.queryId);
    const sourceName = query.name ?? lifecycle.queryId;

    const refreshIds = unique(lifecycle.refreshQueryIds ?? [], `refresh query`, sourceName, warnings);
    const clearIds = unique(lifecycle.clearComponentIds ?? [], `clear component`, sourceName, warnings);

    for (const queryId of refreshIds) {
      const refresh = queries.get(queryId);
      if (!refresh) throw new Error(`Query "${sourceName}" lifecycle refresh target "${queryId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: 'data_query',
        trigger: 'onDataQuerySuccess',
        action: { actionId: 'run-query', queryId, queryName: refresh.name ?? queryId },
        name: `Refresh ${refresh.name ?? queryId} after ${sourceName}`,
      });
    }

    (lifecycle.successActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: 'data_query',
        trigger: 'onDataQuerySuccess',
        action,
        name: `${sourceName} success action ${index + 1}`,
      });
    });

    if (lifecycle.closeModalId) {
      const modal = components.get(lifecycle.closeModalId);
      if (!modal) throw new Error(`Query "${sourceName}" lifecycle modal "${lifecycle.closeModalId}" does not exist.`);
      if (!['Modal', 'ModalV2'].includes(modal.type ?? '')) {
        throw new Error(
          `Query "${sourceName}" lifecycle close target "${modal.name ?? modal.id}" is ${modal.type ?? 'unknown'}, not a Modal.`
        );
      }
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: 'data_query',
        trigger: 'onDataQuerySuccess',
        action: { actionId: 'close-modal', modal: lifecycle.closeModalId },
        name: `Close ${modal.name ?? modal.id} after ${sourceName}`,
      });
    }

    // Keep cosmetic cleanup after refresh/custom work and modal close. ToolJet stops the remaining
    // same-trigger chain when an event action throws, so this order degrades without trapping the
    // user in the modal. The runner expects params to be an array even for the parameterless clear.
    for (const componentId of clearIds) {
      const component = components.get(componentId);
      if (!component) throw new Error(`Query "${sourceName}" lifecycle clear target "${componentId}" does not exist.`);
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: 'data_query',
        trigger: 'onDataQuerySuccess',
        action: {
          actionId: 'control-component',
          componentId,
          componentSpecificActionHandle: 'clear',
          componentSpecificActionParams: [],
        },
        name: `Clear ${component.name ?? componentId} after ${sourceName}`,
      });
    }

    if (lifecycle.successAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, 'onDataQuerySuccess', lifecycle.successAlert, 'success'));
    }

    (lifecycle.failureActions ?? []).forEach((action, index) => {
      events.push({
        sourceId: lifecycle.queryId,
        sourceType: 'data_query',
        trigger: 'onDataQueryFailure',
        action,
        name: `${sourceName} failure action ${index + 1}`,
      });
    });
    if (lifecycle.failureAlert) {
      events.push(alertEvent(lifecycle.queryId, sourceName, 'onDataQueryFailure', lifecycle.failureAlert, 'error'));
    }
  }

  return { events, warnings };
}

function alertEvent(
  queryId: string,
  queryName: string,
  trigger: 'onDataQuerySuccess' | 'onDataQueryFailure',
  alert: LifecycleAlert,
  defaultType: 'success' | 'error'
): EventSpec {
  return {
    sourceId: queryId,
    sourceType: 'data_query',
    trigger,
    action: { actionId: 'show-alert', message: alert.message, alertType: alert.alertType ?? defaultType },
    name: trigger === 'onDataQuerySuccess' ? `Confirm ${queryName}` : `${queryName} failed`,
  };
}

function unique(values: string[], label: string, sourceName: string, warnings: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      warnings.push(`Query "${sourceName}" lifecycle listed ${label} "${value}" more than once; duplicate ignored.`);
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}
