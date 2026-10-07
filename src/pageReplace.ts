import type { AppSummary } from './tooljetClient.js';
import { matchPlannedPage } from './pageMatch.js';

/**
 * A plan page marked `replace: true`: the app as the new plan should see it. The page's current components and
 * their events are replaced by the plan's, so a page is repaired by planning it whole again rather than by rounds
 * of update_components and add_events. lint_app_spec and apply_app_phase both check the plan against this view,
 * so none of their collision checks needs a special case.
 *
 * - The replaced page has no components: the plan recreates the ones it keeps (names, not ids, carry bindings).
 * - Events sourced from that page's components go; events on the page itself go only when the plan makes them again.
 * - Queries the plan defines again are updated in place when they are the page's own, keeping the ids that other
 *   pages' events hold. Of the events they source, the plan recreates alerts, variable writes and runs of its own
 *   queries; a run of a query the plan does not define (a chain another page set up) stays.
 */
export interface ReplaceView {
  summary: AppSummary;
  replacedPageIds: string[];
  componentsToDelete: Array<{ pageId: string; componentIds: string[] }>;
  eventsToDelete: string[];
  /** Query name -> persisted id, for queries the plan redefines. */
  queriesToUpdate: Map<string, string>;
  /** Events elsewhere (another page's button opening this page's modal) that point at a replaced component by
   *  id: kept, and re-pointed to the recreated component of the same name after the apply (a close-modal on
   *  another page broke otherwise). Hidden from the lint view, which has no such component. */
  eventsToRetarget: AppSummary['events'];
  /** Replaced component id -> its name. */
  replacedComponentNames: Map<string, string>;
  replacedPageNames: string[];
}

interface ReplacePlan {
  pages?: Array<{ name: string; client_ref?: string; replace?: boolean }>;
  queries?: Array<{ name: string; client_ref?: string }>;
  lifecycles?: Array<{
    query_ref: string; success_alert?: unknown; failure_alert?: unknown; refresh_query_refs?: string[];
    before_refresh_actions?: Array<Record<string, unknown>>; success_actions?: Array<Record<string, unknown>>;
    failure_actions?: Array<Record<string, unknown>>;
  }>;
  events?: Array<{ source_ref: string; source_type: string; trigger?: string; action?: Record<string, unknown> }>;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const idPattern = (ids: string[]) =>
  new RegExp(`(?<![\\w-])(?:${[...ids].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})(?![\\w-])`, 'g');

/** Whether serialized event JSON names this component id as a whole token (not inside a longer id). */
export function mentionsId(text: string, id: string): boolean {
  return idPattern([id]).test(text);
}

/** The text with every whole-token occurrence of an old id swapped for its new id in one pass, so a new id that
 *  happens to contain an old one is never rewritten twice. Ids without a new id are left and returned as missing. */
export function replaceIds(text: string, newIds: Map<string, string | undefined>): { text: string; missing: string[] } {
  const ids = [...newIds.keys()];
  if (!ids.length) return { text, missing: [] };
  const missing = new Set<string>();
  const replaced = text.replace(idPattern(ids), (id) => {
    const next = newIds.get(id);
    if (next) return next;
    missing.add(id);
    return id;
  });
  return { text: replaced, missing: [...missing] };
}

const readsQuery = (text: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`queries\\s*(?:\\?\\.|\\.)\\s*${escaped}(?![\\w$])|queries\\s*\\[\\s*['"]${escaped}['"]\\s*\\]`).test(text);
};

export function replaceView(summary: AppSummary, plan: ReplacePlan): ReplaceView | undefined {
  const replacedNames = new Set((plan.pages ?? []).filter((page) => page.replace).map((page) => page.name));
  const plannedNames = new Set((plan.pages ?? []).map((page) => page.name));
  const matched = new Set<string>();
  /** Replaced page id -> the plan's name for it (a Home plan page can stand for the page at handle home). */
  const plannedNameById = new Map<string, string>();
  for (const name of replacedNames) {
    const page = matchPlannedPage(summary.pages, name, plannedNames, matched);
    if (page) matched.add(page.id);
    if (page) plannedNameById.set(page.id, name);
  }
  const replacedPages = summary.pages.filter((page) => matched.has(page.id));
  const replacedPageIds = replacedPages.map((page) => page.id);
  const componentsToDelete = replacedPages
    .map((page) => ({ pageId: page.id, componentIds: page.components.map((component) => component.id) }))
    .filter((entry) => entry.componentIds.length);
  const replacedComponentIds = componentsToDelete.flatMap((entry) => entry.componentIds);
  const removedSources = new Set([...replacedPageIds, ...replacedComponentIds]);

  // Queries the plan defines again are updated in place only when they are this page's own: read by its
  // components, or run by its events. A query no page uses (left by an apply that failed before its page existed)
  // may be claimed too. Anything else is another page's query, and the plan's definition of that name stays a
  // collision: a replace of "Reports" must not rewrite the "rows" that Orders reads.
  const planQueryNames = new Set((plan.queries ?? []).map((query) => query.name));
  const replacedComponents = replacedPages.flatMap((page) => page.components);
  const otherComponents = summary.pages.filter((page) => !matched.has(page.id)).flatMap((page) => page.components);
  const componentText = (component: AppSummary['pages'][number]['components'][number]) =>
    JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
  const runsQuery = (event: AppSummary['events'][number], id: string) => JSON.stringify(event.event ?? {}).includes(`"${id}"`);
  const planQueryIds = new Set(summary.queries.filter((query) => query.name && planQueryNames.has(query.name)).map((query) => query.id));
  const pageOwns = (query: AppSummary['queries'][number]) =>
    replacedComponents.some((component) => readsQuery(componentText(component), query.name!)) ||
    summary.events.some((event) => event.sourceId && removedSources.has(event.sourceId) && runsQuery(event, query.id));
  const usedElsewhere = (query: AppSummary['queries'][number]) =>
    otherComponents.some((component) => readsQuery(componentText(component), query.name!)) ||
    summary.events.some((event) => event.sourceId !== query.id && !(event.sourceId && removedSources.has(event.sourceId)) &&
      !(event.sourceId && planQueryIds.has(event.sourceId)) && runsQuery(event, query.id)) ||
    summary.queries.some((other) => other.id !== query.id && !planQueryIds.has(other.id) && readsQuery(JSON.stringify(other.options ?? {}), query.name!));
  // A query read through the page's own queries is the page's too (a table reads a RunJS view that reads a list
  // query: redefining the list query must not collide with itself), unless any other page reaches it: directly,
  // through its events, or through its own queries' code (a query two pages read through their
  // views must not be claimed, or editing one page rewrites the other's data).
  const readsOf = (text: string) => summary.queries.filter((q) => q.name && readsQuery(text, q.name)).map((q) => q.id);
  // A success chain does not share a query: a list another page reads runs this page's view after it (after="jobs"),
  // and another page's write refreshes a summary only this page reads. Redefined in place, the query keeps its id,
  // so the chain still runs it (a dispatch build and an asset-register build, 2026-09-29).
  const reachedElsewhere = new Set<string>([
    ...otherComponents.flatMap((component) => readsOf(componentText(component))),
    ...summary.events.filter((event) => !(event.sourceId && (removedSources.has(event.sourceId) || summary.queries.some((q) => q.id === event.sourceId))))
      .flatMap((event) => summary.queries.filter((q) => runsQuery(event, q.id)).map((q) => q.id)),
  ]);
  for (let frontier = [...reachedElsewhere]; frontier.length; ) {
    const next = frontier.flatMap((id) => {
      const query = summary.queries.find((q) => q.id === id);
      return readsOf(JSON.stringify(query?.options ?? {}));
    }).filter((id) => !reachedElsewhere.has(id));
    next.forEach((id) => reachedElsewhere.add(id));
    frontier = next;
  }
  // Another page's consumer makes a query shared, however directly the replaced page reads it too.
  const owned = new Set(summary.queries.filter((query) => query.name && !reachedElsewhere.has(query.id) && pageOwns(query)).map((query) => query.id));
  for (let grew = true; grew; ) {
    grew = false;
    for (const query of summary.queries) {
      if (!query.name || owned.has(query.id) || reachedElsewhere.has(query.id)) continue;
      const readByOwned = summary.queries.some((other) => owned.has(other.id) && readsQuery(JSON.stringify(other.options ?? {}), query.name!));
      // Run by an owned query's success chain (the page's button runs savePatient, which runs saveBooking): its own too.
      const chainedByOwned = summary.events.some((event) => !!event.sourceId && owned.has(event.sourceId) && runsQuery(event, query.id));
      if (readByOwned || chainedByOwned) {
        owned.add(query.id);
        grew = true;
      }
    }
  }
  const queriesToUpdate = new Map(
    summary.queries
      .filter((query) => query.name && planQueryNames.has(query.name) && !reachedElsewhere.has(query.id) && (owned.has(query.id) || !usedElsewhere(query)))
      .map((query) => [query.name!, query.id])
  );
  if (!replacedPages.length && (!replacedNames.size || !queriesToUpdate.size)) return undefined;
  const redefinedIds = new Set(queriesToUpdate.values());

  // Events the plan will create, keyed by what they do, so the ones it creates again are dropped rather than
  // doubled: a chain into another page's query, a navigate or a setVar on a redefined query kept and created again
  // would run N+1 times after N replaces.
  const queryNameById = new Map(summary.queries.map((query) => [query.id, query.name ?? '']));
  const pageNameById = new Map(summary.pages.map((page) => [page.id, page.name ?? '']));
  const queryRefName = new Map((plan.queries ?? []).flatMap((query) => [[query.name, query.name], ...(query.client_ref ? [[query.client_ref, query.name]] : [])] as Array<[string, string]>));
  const pageRefName = new Map((plan.pages ?? []).flatMap((page) => [[page.name, page.name], ...(page.client_ref ? [[page.client_ref, page.name]] : [])] as Array<[string, string]>));
  const nameOfQuery = (ref: unknown) => typeof ref === 'string' ? queryRefName.get(ref) ?? queryNameById.get(ref) ?? ref : '';
  const nameOfPage = (ref: unknown) => typeof ref === 'string' ? pageRefName.get(ref) ?? pageNameById.get(ref) ?? ref : '';
  const actionKey = (action: Record<string, unknown>): string | undefined => {
    const id = action.actionId;
    if (id === 'run-query') return `run-query:${nameOfQuery(action.target_ref ?? action.queryName ?? action.queryId)}`;
    if (id === 'switch-page') return `switch-page:${nameOfPage(action.target_ref ?? action.pageId)}`;
    if (id === 'set-custom-variable' || id === 'set-page-variable') return `${id}:${String(action.key ?? '')}`;
    return undefined;
  };
  const planned = new Set<string>();
  const plan_ = (source: string, trigger: string | undefined, action: Record<string, unknown> | undefined) => {
    const key = action && actionKey(action);
    if (key) planned.add(`${source}|${trigger ?? ''}|${key}`);
  };
  for (const event of plan.events ?? []) {
    if (event.source_type === 'data_query') plan_(`q:${nameOfQuery(event.source_ref)}`, event.trigger, event.action);
    if (event.source_type === 'page') plan_(`p:${nameOfPage(event.source_ref)}`, event.trigger, event.action);
  }
  for (const lc of plan.lifecycles ?? []) {
    const source = `q:${nameOfQuery(lc.query_ref)}`;
    for (const ref of lc.refresh_query_refs ?? []) plan_(source, 'onDataQuerySuccess', { actionId: 'run-query', queryId: ref });
    for (const action of [...(lc.before_refresh_actions ?? []), ...(lc.success_actions ?? [])]) plan_(source, 'onDataQuerySuccess', action);
    for (const action of lc.failure_actions ?? []) plan_(source, 'onDataQueryFailure', action);
  }
  const replannedFrom = (source: string, action: Record<string, unknown>) => {
    const key = actionKey(action);
    return !!key && planned.has(`${source}|${String(action.eventId ?? '')}|${key}`);
  };

  // Of the events a redefined query sources, the plan recreates only its own: runs of the queries it defines, their
  // success flags, actions on the replaced page, the alerts it gives that query, and whatever it declares again.
  // Anything else (a chain or an alert another page's plan attached) stays.
  const alertedQueries = new Set([
    ...(plan.lifecycles ?? []).filter((lc) => lc.success_alert || lc.failure_alert).map((lc) => nameOfQuery(lc.query_ref)),
    ...(plan.events ?? []).filter((event) => event.source_type === 'data_query' && event.action?.actionId === 'show-alert').map((event) => nameOfQuery(event.source_ref)),
  ]);
  const eventsToDelete = summary.events.filter((event) => {
    const action = (event.event ?? {}) as Record<string, unknown>;
    if (event.sourceId && replacedComponentIds.includes(event.sourceId)) return true;
    // A page's own events go only when the plan makes them again, so a page event the plan does not declare (a
    // redirect guard added by hand) is kept.
    if (event.sourceId && replacedPageIds.includes(event.sourceId)) {
      if (replannedFrom(`p:${plannedNameById.get(event.sourceId)}`, action)) return true;
      return action.actionId === 'run-query' && typeof action.queryId === 'string' && redefinedIds.has(action.queryId);
    }
    if (!event.sourceId || !redefinedIds.has(event.sourceId)) return false;
    const text = JSON.stringify(action);
    if (replacedComponentIds.some((id) => mentionsId(text, id))) return true;
    if (replannedFrom(`q:${queryNameById.get(event.sourceId)}`, action)) return true;
    if (action.actionId === 'run-query') return typeof action.queryId === 'string' && redefinedIds.has(action.queryId);
    if (action.actionId === 'set-custom-variable') return typeof action.key === 'string' && action.key.startsWith('__ok_');
    if (action.actionId === 'show-alert') return alertedQueries.has(queryNameById.get(event.sourceId) ?? '');
    return false;
  }).map((event) => event.id);
  const deleted = new Set(eventsToDelete);
  const replacedComponentNames = new Map(
    replacedPages.flatMap((page) => page.components).filter((component) => component.name).map((component) => [component.id, component.name!])
  );
  const eventsToRetarget = summary.events.filter((event) => {
    if (deleted.has(event.id)) return false;
    const text = JSON.stringify(event.event ?? {});
    return [...replacedComponentNames.keys()].some((id) => mentionsId(text, id));
  });
  const retargeted = new Set(eventsToRetarget.map((event) => event.id));

  return {
    summary: {
      ...summary,
      pages: summary.pages.map((page) => (replacedPageIds.includes(page.id) ? { ...page, components: [] } : page)),
      // A redefined query stays under a placeholder name: its name is free for the plan's new definition, and
      // events that run it by id (from other pages) still resolve. Dropping it would orphan them.
      queries: summary.queries.map((query) => (redefinedIds.has(query.id) ? { ...query, name: `${query.name} (being replaced)` } : query)),
      events: summary.events.filter((event) => !deleted.has(event.id) && !retargeted.has(event.id)),
    },
    replacedPageIds,
    componentsToDelete,
    eventsToDelete,
    queriesToUpdate,
    eventsToRetarget,
    replacedComponentNames,
    replacedPageNames: replacedPages.map((page) => page.name ?? page.id),
  };
}

/** Other pages, events and queries that read or act on a component the replace drops: refused, since the replace
 *  would leave them dangling. */
export function danglingAfterReplace(
  summary: AppSummary, view: ReplaceView, plan: { pages?: Array<{ name: string; replace?: boolean; components?: Array<{ name?: string }> }> }
): string[] {
  const kept = new Set((plan.pages ?? []).filter((page) => page.replace).flatMap((page) => (page.components ?? []).map((c) => c.name ?? '')));
  const dropped = [...new Set(view.replacedComponentNames.values())].filter((name) => !kept.has(name));
  if (!dropped.length) return [];
  const errors: string[] = [];
  const reads = (text: string, name: string) =>
    new RegExp(`components\\s*(?:\\?\\.|\\.)\\s*${name.replace(/[$]/g, '\\$')}\\b|components\\s*\\[\\s*['"]${name.replace(/[$]/g, '\\$')}['"]\\s*\\]`).test(text);
  for (const page of summary.pages.filter((p) => !view.replacedPageIds.includes(p.id))) {
    for (const component of page.components) {
      const text = JSON.stringify([component.properties ?? {}, component.styles ?? {}]);
      for (const name of dropped) {
        if (reads(text, name)) errors.push(`Page "${page.name}": "${component.name ?? component.id}" reads components.${name}, which the replace of ` +
          `"${view.replacedPageNames.join('", "')}" drops. Keep ${name} in that page's plan, or change "${page.name}" first.`);
      }
    }
  }
  // An event elsewhere that acts on a dropped component by id (another page's button opening this page's modal):
  // apply can only re-point it to a recreated component of the same name, so a dropped one would leave it acting on
  // nothing.
  const droppedIds = [...view.replacedComponentNames].filter(([, name]) => dropped.includes(name));
  const sourceName = new Map(summary.pages.flatMap((p) => p.components.map((c) => [c.id, `${c.name ?? c.id}" on page "${p.name}`] as const)));
  for (const event of view.eventsToRetarget) {
    const text = JSON.stringify(event.event ?? {});
    for (const [id, name] of droppedIds) {
      if (!mentionsId(text, id)) continue;
      const source = event.sourceId ? sourceName.get(event.sourceId) ?? event.sourceId : 'the app';
      errors.push(`"${source}" has an event that acts on ${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. ` +
        `Keep ${name} in that page's plan, or change that event first.`);
    }
  }
  const redefined = new Set(view.queriesToUpdate.values());
  for (const query of summary.queries.filter((q) => !redefined.has(q.id))) {
    const text = JSON.stringify(query.options ?? {});
    for (const name of dropped) {
      if (reads(text, name)) errors.push(`Query "${query.name}" reads components.${name}, which the replace of "${view.replacedPageNames.join('", "')}" drops. ` +
        `Keep ${name} in that page's plan, or change the query first.`);
    }
  }
  return errors;
}

/** JSON with object keys sorted at every level, so the same state read twice (keys in another order) compares equal. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, (item as Record<string, unknown>)[key]]))
    : item);
}

/** The state a replace plan was linted against, in full: apply refuses when it differs, so an edit made between lint
 *  and apply (a component added, a label or width changed, a query or event edited in the editor) is never deleted or
 *  overwritten by a plan that never saw it. It covers
 *  - every component on a replaced page: id, name, type, parent and slot, properties, styles, layouts, validation, others;
 *  - every query the plan redefines: name, kind, datasource and options;
 *  - every event the replace depends on: those sourced by a replaced page, its components or a redefined query, and
 *    any other event that names one of them (another page's button opening this page's modal, a run of a redefined
 *    query), with its name, target, order and definition.
 *  A pre-write read, so a narrow race remains until the backend can check a revision atomically. */
export function replaceFingerprint(summary: AppSummary, view: ReplaceView): string {
  const pageIds = new Set(view.replacedPageIds);
  const replacedPages = summary.pages.filter((page) => pageIds.has(page.id));
  const pages = replacedPages.map((page) => ({
    id: page.id, name: page.name ?? null, handle: page.handle ?? null,
    icon: page.icon ?? null, hidden: page.hidden ?? false,
    components: [...page.components].sort((a, b) => a.id.localeCompare(b.id)).map((component) => ({
      id: component.id, name: component.name ?? null, type: component.type ?? null,
      parent: component.parent ?? null, slot_name: component.slot_name ?? null,
      properties: component.properties ?? {}, styles: component.styles ?? {}, layouts: component.layouts ?? {},
      validation: component.validation ?? {}, others: component.others ?? {},
    })),
  })).sort((a, b) => a.id.localeCompare(b.id));
  const redefined = new Set(view.queriesToUpdate.values());
  const queries = summary.queries.filter((query) => redefined.has(query.id))
    .map((query) => ({ id: query.id, name: query.name ?? null, kind: query.kind ?? null,
      data_source_id: query.data_source_id ?? null, options: query.options ?? {} }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const touched = [...pageIds, ...replacedPages.flatMap((page) => page.components.map((component) => component.id)), ...redefined];
  const touchedIds = new Set(touched);
  const names = touched.length ? new RegExp(idPattern(touched).source) : undefined;
  const events = summary.events.filter((event) =>
    (event.sourceId && touchedIds.has(event.sourceId)) || !!names?.test(JSON.stringify(event.event ?? {})))
    .map((event) => ({ id: event.id, name: event.name ?? null, sourceId: event.sourceId ?? null, target: event.target ?? null,
      index: event.index ?? null, event: event.event ?? {} }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return canonical({ pages, queries, events });
}
