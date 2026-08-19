import type { AppSummary } from './tooljetClient.js';

export type AppSummarySection = 'pages' | 'queries' | 'events';
export type AppSummaryDetail = 'structure' | 'full';

export interface AppSummarySelection {
  /** Defaults to all sections. Pass [] to return only app metadata. */
  sections?: AppSummarySection[];
  /** `structure` omits component values/query options/event payloads unless explicitly selected. */
  detail?: AppSummaryDetail;
  includeComponents?: boolean;
  pageIds?: string[];
  pageNames?: string[];
  pageHandles?: string[];
  componentIds?: string[];
  componentNames?: string[];
  componentTypes?: string[];
  queryIds?: string[];
  queryNames?: string[];
  queryKinds?: string[];
  eventIds?: string[];
  eventSourceIds?: string[];
  /** Exact top-level or dotted paths to return, e.g. `properties.data.value`. */
  appFields?: string[];
  pageFields?: string[];
  componentFields?: string[];
  queryFields?: string[];
  eventFields?: string[];
}

const APP_FIELDS = ['app_id', 'name', 'version_id'] as const;
const PAGE_FIELDS = ['id', 'name', 'handle', 'icon', 'hidden', 'index'] as const;
const COMPONENT_FIELDS = [
  'id',
  'name',
  'type',
  'layouts',
  'properties',
  'styles',
  'others',
  'parent',
] as const;
const QUERY_FIELDS = ['id', 'name', 'kind', 'data_source_id', 'options'] as const;
const EVENT_FIELDS = ['id', 'name', 'sourceId', 'target', 'event'] as const;

const STRUCTURE_COMPONENT_FIELDS = ['id', 'name', 'type', 'layouts', 'parent'];
const STRUCTURE_QUERY_FIELDS = ['id', 'name', 'kind', 'data_source_id'];
const STRUCTURE_EVENT_FIELDS = ['id', 'name', 'sourceId', 'target'];
const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

function validatePaths(paths: string[], roots: readonly string[], label: string): void {
  const allowedRoots = new Set(roots);
  for (const path of paths) {
    const segments = path.split('.');
    if (!path || segments.some((segment) => !segment || UNSAFE_PATH_SEGMENTS.has(segment))) {
      throw new Error(`${label} contains an invalid path: "${path}".`);
    }
    if (!allowedRoots.has(segments[0]!)) {
      throw new Error(
        `${label} path "${path}" must start with one of: ${roots.join(', ')}.`
      );
    }
  }
}

function readPath(source: Record<string, unknown>, segments: string[]): { found: boolean; value?: unknown } {
  let cursor: unknown = source;
  for (const segment of segments) {
    if (
      cursor === null ||
      typeof cursor !== 'object' ||
      !Object.prototype.hasOwnProperty.call(cursor, segment)
    ) {
      return { found: false };
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return { found: true, value: cursor };
}

function writePath(target: Record<string, unknown>, segments: string[], value: unknown): void {
  let cursor = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!;
    const child = cursor[segment];
    if (child === null || typeof child !== 'object' || Array.isArray(child)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }
  cursor[segments.at(-1)!] = value;
}

function pickPaths(source: Record<string, unknown>, paths: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const path of paths) {
    const segments = path.split('.');
    const selected = readPath(source, segments);
    if (selected.found) writePath(result, segments, selected.value);
  }
  return result;
}

function matches(value: unknown, accepted?: string[]): boolean {
  return !accepted?.length || (typeof value === 'string' && accepted.includes(value));
}

/**
 * Return a bounded, caller-selected projection of the compact app summary.
 * The client still fetches the app once; this function controls what enters the MCP response/context.
 */
export function selectAppSummary(
  summary: AppSummary,
  selection: AppSummarySelection = {}
): Record<string, unknown> {
  const detail = selection.detail ?? 'structure';
  const sections = new Set(selection.sections ?? ['pages', 'queries', 'events']);
  const appFields = selection.appFields ?? [...APP_FIELDS];
  const pageFields = selection.pageFields ?? [...PAGE_FIELDS];
  const componentFields =
    selection.componentFields ??
    (detail === 'full' ? [...COMPONENT_FIELDS] : STRUCTURE_COMPONENT_FIELDS);
  const queryFields =
    selection.queryFields ?? (detail === 'full' ? [...QUERY_FIELDS] : STRUCTURE_QUERY_FIELDS);
  const eventFields =
    selection.eventFields ?? (detail === 'full' ? [...EVENT_FIELDS] : STRUCTURE_EVENT_FIELDS);

  validatePaths(appFields, APP_FIELDS, 'app_fields');
  validatePaths(pageFields, PAGE_FIELDS, 'page_fields');
  validatePaths(componentFields, COMPONENT_FIELDS, 'component_fields');
  validatePaths(queryFields, QUERY_FIELDS, 'query_fields');
  validatePaths(eventFields, EVENT_FIELDS, 'event_fields');

  const result = pickPaths(summary as unknown as Record<string, unknown>, appFields);

  if (sections.has('pages')) {
    result.pages = summary.pages
      .filter(
        (page) =>
          matches(page.id, selection.pageIds) &&
          matches(page.name, selection.pageNames) &&
          matches(page.handle, selection.pageHandles)
      )
      .map((page) => {
        const selectedPage = pickPaths(page as unknown as Record<string, unknown>, pageFields);
        if (selection.includeComponents !== false) {
          selectedPage.components = page.components
            .filter(
              (component) =>
                matches(component.id, selection.componentIds) &&
                matches(component.name, selection.componentNames) &&
                matches(component.type, selection.componentTypes)
            )
            .map((component) =>
              pickPaths(component as unknown as Record<string, unknown>, componentFields)
            );
        }
        return selectedPage;
      });
  }

  if (sections.has('queries')) {
    result.queries = summary.queries
      .filter(
        (query) =>
          matches(query.id, selection.queryIds) &&
          matches(query.name, selection.queryNames) &&
          matches(query.kind, selection.queryKinds)
      )
      .map((query) => pickPaths(query as unknown as Record<string, unknown>, queryFields));
  }

  if (sections.has('events')) {
    result.events = summary.events
      .filter(
        (event) =>
          matches(event.id, selection.eventIds) &&
          matches(event.sourceId, selection.eventSourceIds)
      )
      .map((event) => pickPaths(event as unknown as Record<string, unknown>, eventFields));
  }

  return result;
}
