import { materializeRequiredDefaultChildren } from './defaultChildren.js';
import { validateEvents } from './eventValidation.js';
import { lintComponents, validateAppStructure } from './lint.js';
import { issueMessages, validateQueryOptions } from './queryValidation.js';
import { expandQueryLifecycles, type LifecycleAlert } from './queryLifecycle.js';
import { validateTableBatch } from './tableValidation.js';
import { encodeComponentParent } from './componentParent.js';
import { normalizeComponentSpec } from './componentNormalization.js';
import type {
  AppSummary,
  ComponentSpec,
  CreateTableParams,
  EventSourceType,
  EventSpec,
} from './tooljetClient.js';

export interface PlannedQuery {
  clientRef?: string;
  datasourceId?: string;
  name: string;
  kind?: string;
  options: Record<string, unknown>;
}

export interface PlannedPage {
  clientRef?: string;
  name: string;
  icon: string;
  hidden?: boolean;
  components?: ComponentSpec[];
}

export interface PlannedEvent {
  sourceRef: string;
  sourceType: EventSourceType;
  ref?: string;
  trigger: string;
  action: Record<string, unknown>;
  name?: string;
}

export interface PlannedLifecycle {
  queryRef: string;
  refreshQueryRefs?: string[];
  clearComponentRefs?: string[];
  closeModalRef?: string;
  successAlert?: LifecycleAlert;
  failureAlert?: LifecycleAlert;
  successActions?: Array<Record<string, unknown>>;
  failureActions?: Array<Record<string, unknown>>;
}

export interface PlannedAppSpec {
  tables?: CreateTableParams[];
  seedData?: Array<{ tableName: string; rows: Array<Record<string, unknown>> }>;
  queries?: PlannedQuery[];
  pages?: PlannedPage[];
  events?: PlannedEvent[];
  lifecycles?: PlannedLifecycle[];
}

export interface AppSpecLintResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checked: string[];
  not_checked: string[];
  counts: { tables: number; seed_rows: number; pages: number; components: number; queries: number; events: number; lifecycles: number };
}

/** Validate a complete logical app plan without performing any writes. */
export function lintPlannedApp(spec: PlannedAppSpec): AppSpecLintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checked: string[] = [];

  const tables = spec.tables ?? [];
  if (tables.length) {
    checked.push('ToolJet DB table names, columns, foreign keys, reserved names, and dependency order');
    errors.push(...validateTableBatch(tables));
  }

  const seedData = spec.seedData ?? [];
  const seedRows = seedData.reduce((total, seed) => total + seed.rows.length, 0);
  if (seedData.length) {
    checked.push('seed batches have unique table targets and non-empty rows');
    const seen = new Set<string>();
    for (const seed of seedData) {
      const key = seed.tableName.toLowerCase();
      if (seen.has(key)) errors.push(`Seed data targets table "${seed.tableName}" more than once.`);
      seen.add(key);
      if (!seed.rows.length) errors.push(`Seed data for table "${seed.tableName}" has no rows.`);
    }
  }

  const queryRefs = new Map<string, { id: string; name: string }>();
  const queryIds = new Map<string, { id: string; name: string }>();
  const queries = (spec.queries ?? []).map((query, index) => {
    const ref = query.clientRef ?? query.name;
    const id = `planned-query:${index}:${ref}`;
    registerRef(queryRefs, ref, { id, name: query.name }, 'query', errors);
    queryIds.set(id, { id, name: query.name });
    if (!query.kind) {
      errors.push(`Query "${query.name}" has no resolved datasource kind; pass kind or a resolvable datasource_id + version_id.`);
    } else {
      const validation = validateQueryOptions(query.kind, query.options);
      errors.push(...issueMessages(validation.errors, `Query "${query.name}"`));
      warnings.push(...issueMessages(validation.warnings, `Query "${query.name}"`));
    }
    return {
      id,
      name: query.name,
      kind: query.kind,
      data_source_id: query.datasourceId,
      options: query.options,
    };
  });
  if (queries.length) checked.push('datasource query option contracts and duplicate logical query references');

  const pageRefs = new Map<string, { id: string; name: string }>();
  const componentRefs = new Map<string, { id: string; name: string; type?: string }>();
  const pages: AppSummary['pages'] = [];
  let componentCount = 0;

  (spec.pages ?? []).forEach((plannedPage, pageIndex) => {
    const pageRef = plannedPage.clientRef ?? plannedPage.name;
    const pageId = `planned-page:${pageIndex}:${pageRef}`;
    registerRef(pageRefs, pageRef, { id: pageId, name: plannedPage.name }, 'page', errors);
    if (!plannedPage.icon.trim()) errors.push(`Page "${plannedPage.name}" needs a sidebar icon.`);

    const normalized = (plannedPage.components ?? []).map((component) => normalizeComponentSpec(component));
    warnings.push(...normalized.flatMap((item) => item.warnings));
    const expansion = materializeRequiredDefaultChildren(normalized.map((item) => item.component));
    warnings.push(...expansion.warnings);
    const componentLint = lintComponents(expansion.components);
    errors.push(...componentLint.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...componentLint.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));

    const localRefs = new Map<string, string>();
    const componentEntries = expansion.components.map((component, componentIndex) => {
      const ref = component.clientRef ?? component.name;
      const id = `planned-component:${pageIndex}:${componentIndex}:${ref}`;
      if (localRefs.has(ref)) errors.push(`Page "${plannedPage.name}" has duplicate component ref "${ref}".`);
      else localRefs.set(ref, id);
      registerRef(componentRefs, ref, { id, name: component.name, type: component.type }, 'component', errors);
      componentCount += 1;
      return { component, id };
    });

    pages.push({
      id: pageId,
      name: plannedPage.name,
      handle: plannedPage.name === 'Home' ? 'home' : slug(plannedPage.name),
      icon: plannedPage.icon,
      components: componentEntries.map(({ component, id }) => {
        let parent: string | undefined;
        if (component.parentRef) {
          parent = localRefs.get(component.parentRef);
          if (!parent) {
            errors.push(
              `Page "${plannedPage.name}" component "${component.name}" has unknown parent_ref "${component.parentRef}".`
            );
          }
        } else if (component.parent) {
          warnings.push(
            `Page "${plannedPage.name}" component "${component.name}" uses persisted parent id "${component.parent}"; ` +
              'its parent relationship cannot be verified in a pre-write plan. Prefer parent_ref.'
          );
          parent = component.parent;
        }
        if (parent) parent = encodeComponentParent(parent, component.slotName);
        return {
          id,
          name: component.name,
          type: component.type,
          properties: component.properties,
          styles: component.styles,
          others: component.others,
          layouts: component.layouts ?? (component.layout
            ? { desktop: component.layout, mobile: component.layout }
            : undefined),
          parent,
          ...(component.slotName && component.slotName !== 'body' ? { slot_name: component.slotName } : {}),
        };
      }),
    });
  });
  if (pages.length) checked.push('page icons, component contracts, bindings, rendered geometry, modal sizing, and nested refs');

  const eventSpecs: EventSpec[] = [];
  (spec.events ?? []).forEach((event, index) => {
    const source = sourceMap(event.sourceType, componentRefs, queryRefs, pageRefs).get(event.sourceRef);
    if (!source) errors.push(`Event[${index}] has unknown ${event.sourceType} source_ref "${event.sourceRef}".`);
    eventSpecs.push({
      sourceId: source?.id ?? `missing-source:${event.sourceRef}`,
      sourceType: event.sourceType,
      ref: event.ref,
      trigger: event.trigger,
      action: resolveAction(event.action, queryRefs, pageRefs, componentRefs, errors, `Event[${index}]`),
      name: event.name,
    });
  });

  if ((spec.lifecycles ?? []).length) {
    const lifecycleSpecs = (spec.lifecycles ?? []).flatMap((lifecycle, index) => {
      const source = queryRefs.get(lifecycle.queryRef);
      if (!source) {
        errors.push(`Lifecycle[${index}] has unknown query_ref "${lifecycle.queryRef}".`);
        return [];
      }
      return [{
        queryId: source.id,
        refreshQueryIds: resolveRefs(lifecycle.refreshQueryRefs, queryRefs, errors, `Lifecycle[${index}] refresh query`),
        clearComponentIds: resolveRefs(lifecycle.clearComponentRefs, componentRefs, errors, `Lifecycle[${index}] clear component`),
        closeModalId: resolveRef(lifecycle.closeModalRef, componentRefs, errors, `Lifecycle[${index}] modal`),
        successAlert: lifecycle.successAlert,
        failureAlert: lifecycle.failureAlert,
        successActions: lifecycle.successActions?.map((action, actionIndex) =>
          resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] success action[${actionIndex}]`)
        ),
        failureActions: lifecycle.failureActions?.map((action, actionIndex) =>
          resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] failure action[${actionIndex}]`)
        ),
      }];
    });
    try {
      const expanded = expandQueryLifecycles(
        { app_id: 'planned-app', pages, queries, events: [] },
        lifecycleSpecs
      );
      eventSpecs.push(...expanded.events);
      warnings.push(...expanded.warnings);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const summary: AppSummary = {
    app_id: 'planned-app',
    name: 'Planned app',
    version_id: 'planned-version',
    pages,
    queries,
    events: eventSpecs.map((event, index) => ({
      id: `planned-event:${index}`,
      name: event.name,
      sourceId: event.sourceId,
      target: event.sourceType,
      event: { eventId: event.trigger, ...(event.ref ? { ref: event.ref } : {}), ...event.action },
    })),
  };
  if (eventSpecs.length) {
    checked.push('event/lifecycle sources, triggers, action ids, and logical targets');
    const eventValidation = validateEvents(summary, eventSpecs);
    errors.push(...eventValidation.errors);
    warnings.push(...eventValidation.warnings);
  }

  const structure = validateAppStructure(summary);
  errors.push(...structure.errors);
  warnings.push(...structure.warnings);

  return {
    ok: unique(errors).length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
    checked,
    not_checked: [
      'server acceptance of writes or external datasource connectivity',
      'query execution results and mutation side effects',
      'browser event delivery, dynamic bindings, and visual rendering',
    ],
    counts: {
      tables: tables.length,
      seed_rows: seedRows,
      pages: pages.length,
      components: componentCount,
      queries: queries.length,
      events: eventSpecs.length,
      lifecycles: spec.lifecycles?.length ?? 0,
    },
  };
}

function registerRef<T>(map: Map<string, T>, ref: string, value: T, type: string, errors: string[]): void {
  if (map.has(ref)) errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
  else map.set(ref, value);
}

function sourceMap(
  sourceType: EventSourceType,
  components: Map<string, { id: string; name: string; type?: string }>,
  queries: Map<string, { id: string; name: string }>,
  pages: Map<string, { id: string; name: string }>
): Map<string, { id: string }> {
  if (sourceType === 'data_query') return queries;
  if (sourceType === 'page') return pages;
  return components;
}

function resolveAction(
  raw: Record<string, unknown>,
  queries: Map<string, { id: string; name: string }>,
  pages: Map<string, { id: string; name: string }>,
  components: Map<string, { id: string; name: string; type?: string }>,
  errors: string[],
  label: string
): Record<string, unknown> {
  const { target_ref: targetRef, ...action } = raw;
  if (targetRef === undefined) return action;
  if (typeof targetRef !== 'string') {
    errors.push(`${label} target_ref must be a string.`);
    return action;
  }
  const actionId = action.actionId;
  const target =
    actionId === 'run-query'
      ? queries.get(targetRef)
      : actionId === 'switch-page'
        ? pages.get(targetRef)
        : ['show-modal', 'close-modal', 'control-component', 'set-table-page', 'scroll-component-into-view'].includes(String(actionId))
          ? components.get(targetRef)
          : undefined;
  if (!target) {
    errors.push(`${label} action "${String(actionId)}" has unknown or unsupported target_ref "${targetRef}".`);
    return action;
  }
  if (actionId === 'run-query') return { ...action, queryId: target.id, queryName: target.name };
  if (actionId === 'switch-page') return { ...action, pageId: target.id };
  if (actionId === 'show-modal' || actionId === 'close-modal') return { ...action, modal: target.id };
  if (actionId === 'control-component' || actionId === 'scroll-component-into-view') {
    return { ...action, componentId: target.id };
  }
  if (actionId === 'set-table-page') return { ...action, table: target.id };
  return action;
}

function resolveRefs<T extends { id: string }>(
  refs: string[] | undefined,
  map: Map<string, T>,
  errors: string[],
  label: string
): string[] | undefined {
  return refs?.flatMap((ref) => {
    const value = map.get(ref);
    if (!value) {
      errors.push(`${label} ref "${ref}" does not exist.`);
      return [];
    }
    return [value.id];
  });
}

function resolveRef<T extends { id: string }>(
  ref: string | undefined,
  map: Map<string, T>,
  errors: string[],
  label: string
): string | undefined {
  if (!ref) return undefined;
  const value = map.get(ref);
  if (!value) {
    errors.push(`${label} ref "${ref}" does not exist.`);
    return undefined;
  }
  return value.id;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'page';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
