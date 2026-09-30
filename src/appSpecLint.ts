import { materializeRequiredDefaultChildren } from './defaultChildren.js';
import { matchPlannedPage } from './pageMatch.js';
import { validateEvents } from './eventValidation.js';
import { lintComponents, validateAppStructure, type LintComponent } from './lint.js';
import { prepareQueryOptionsForWrite } from './queryPersistence.js';
import { expandQueryLifecycles, type LifecycleAlert } from './queryLifecycle.js';
import { validateTableBatch } from './tableValidation.js';
import { encodeComponentParent } from './componentParent.js';
import { normalizeComponentSpec } from './componentNormalization.js';
import { normalizePlannedLayouts } from './layoutNormalization.js';
import { containsNamedBinding } from './referenceSafety.js';
import { pageIconError } from './pageIcons.js';
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
  beforeRefreshActions?: Array<Record<string, unknown>>;
  refreshQueryRefs?: string[];
  clearComponentRefs?: string[];
  closeModalRef?: string;
  successAlert?: LifecycleAlert;
  failureAlert?: LifecycleAlert;
  successActions?: Array<Record<string, unknown>>;
  failureActions?: Array<Record<string, unknown>>;
}

const CHART_QUERY_BINDING = /^\s*\{\{\s*queries\.([A-Za-z_$][\w$]*)\.data\s*\}\}\s*$/;

/**
 * A Chart whose jsonDescription is a bare query binding renders whatever that query returns. On 2026-09-12
 * five of six charts on a sales dashboard drew empty axes because their JavaScript queries returned arrays
 * of points instead of { data, layout }. The query's code must build the whole chart object with the house
 * layout; the check is textual (the linter cannot run the query).
 */
export function lintQueryFedCharts(components: LintComponent[], queries: PlannedQuery[]): string[] {
  const errors: string[] = [];
  for (const component of components) {
    if (component.type !== 'Chart') continue;
    const raw = component.properties?.jsonDescription as { value?: unknown } | string | undefined;
    const description = typeof raw === 'string' ? raw : raw && typeof raw === 'object' && 'value' in raw ? String(raw.value ?? '') : '';
    const match = CHART_QUERY_BINDING.exec(description);
    if (!match) continue;
    const query = queries.find((candidate) => candidate.name === match[1] || candidate.clientRef === match[1]);
    if (!query) continue; // an existing query the plan does not carry; validate_app covers persisted apps
    if (query.kind !== 'runjs') continue; // REST/SQL may return a figure; their result is not JavaScript source.
    const code = String((query.options as Record<string, unknown>)?.code ?? '');
    const label = component.name ?? 'Chart';
    if (!code.trim()) {
      errors.push(`Chart "${label}" is bound to query "${query.name}", which has no JavaScript code to build the chart object.`);
      continue;
    }
    if (/textposition\s*:\s*['"]outside['"]/.test(code) && !/cliponaxis\s*:\s*false/.test(code)) {
      errors.push(
        `Chart "${label}" is bound to query "${query.name}", whose bar trace places its text outside without cliponaxis:false, so the ` +
          'tallest bar\'s value label is cut in half by the plot area. Add cliponaxis:false to the trace.'
      );
    }
    const missing = ['data', 'layout'].filter((key) => !code.includes(key));
    if (missing.length) {
      errors.push(
        `Chart "${label}" is bound to query "${query.name}", whose code never mentions ${missing.join(', ')}: a query feeding a chart ` +
          'must return the whole { data: [trace], layout: { font, xaxis, yaxis, ... } } object from references/ui-layout.md. ' +
          'A bare array of points draws empty axes in Plotly\'s default font.'
      );
    }
  }
  return errors;
}

const QUERY_DATA_REF = /queries\.([A-Za-z_$][\w$]*)\.data\b/g;
const isStaticTrue = (value: unknown): boolean => value === true || value === 'true' || value === '{{true}}';

/**
 * A JavaScript query that reads another query's data and also runs on page load races it: on first load the
 * other query has not answered, the code reads undefined (and usually throws), and the chart or table it feeds
 * stays empty. Round eight (2026-09-12): a pipeline chart query did exactly this. The fix is to run it from
 * the source query's success (a lifecycle refresh or an onDataQuerySuccess run-query event) with
 * runOnPageLoad off.
 */
export function lintRunjsLoadOrder(spec: PlannedAppSpec): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const queries = spec.queries ?? [];
  const byRef = new Map<string, PlannedQuery>();
  for (const query of queries) {
    byRef.set(query.name, query);
    if (query.clientRef) byRef.set(query.clientRef, query);
  }
  const chained = new Set<string>();
  for (const lifecycle of spec.lifecycles ?? []) {
    for (const target of lifecycle.refreshQueryRefs ?? []) chained.add(`${lifecycle.queryRef}->${target}`);
  }
  for (const event of spec.events ?? []) {
    const action = event.action ?? {};
    if (event.sourceType !== 'data_query' || event.trigger !== 'onDataQuerySuccess' || action.actionId !== 'run-query') continue;
    const target = String(action.target_ref ?? action.queryName ?? action.queryId ?? '');
    if (target) chained.add(`${event.sourceRef}->${target}`);
  }
  const keysOf = (query: PlannedQuery) => [query.name, ...(query.clientRef ? [query.clientRef] : [])];
  for (const query of queries) {
    if (query.kind !== 'runjs') continue;
    const code = String((query.options as Record<string, unknown> | undefined)?.code ?? '');
    if (!isStaticTrue((query.options as Record<string, unknown> | undefined)?.runOnPageLoad)) continue;
    const refs = new Set([...code.matchAll(QUERY_DATA_REF)].map((match) => match[1]));
    for (const ref of refs) {
      const source = byRef.get(ref);
      if (!source || source === query) continue;
      const isChained = keysOf(source).some((from) => keysOf(query).some((to) => chained.has(`${from}->${to}`)));
      if (isChained) {
        warnings.push(
          `Query "${query.name}" is already run from "${source.name}"'s success but also has runOnPageLoad on, so it runs twice and the ` +
            `first run reads queries.${ref}.data before it exists. Set runOnPageLoad to false.`
        );
      } else {
        errors.push(
          `Query "${query.name}" reads queries.${ref}.data and runs on page load, so it races "${source.name}" and reads undefined on first ` +
            `load (the chart or table it feeds stays empty). Set runOnPageLoad to false and run it from "${source.name}"'s success: a ` +
            `lifecycle { queryRef: "${source.clientRef ?? source.name}", refreshQueryRefs: ["${query.clientRef ?? query.name}"] } or an ` +
            'onDataQuerySuccess run-query event.'
        );
      }
    }
  }
  return { errors, warnings };
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
/** A server-side-paginated Table whose data query BOTH runs on page load AND self-references the
 *  table's own runtime state (components.<table>.pageIndex/searchText/...) is a load-order race: at
 *  first load the table is not registered yet, so those bindings resolve to "undefined" and the query
 *  fails (e.g. Postgres `column "undefined" does not exist`). The table then renders "No data" even
 *  though the record count is non-zero — a silently broken app. Caught statically so the model fixes it
 *  before writing. Legitimate server-side pagination drives the data query from the table's
 *  onPageChanged/onSearch events (runOnPageLoad:false), so it only fires on the racy on-load pattern. */
/** A Chart needs NUMERIC y values. SQL drivers hand back many numeric types as STRINGS — BigQuery
 * INT64 from `COUNT(*)` is the common one — so `y: r.cnt` becomes "1248" and the chart renders a
 * blank plot with no error anywhere. The query succeeded, validation passed, and a Statistics tile
 * fed by the same column looks fine (it just prints the string), which is exactly how this hides:
 * observed live on a BigQuery telemetry dashboard where the KPIs were right and all four charts were
 * empty. Casting in SQL (CAST(COUNT(*) AS FLOAT64), COUNT(*)::float) is the fix the skill already
 * asks for; this makes it enforced rather than advisory. */
function lintChartNumericBindings(
  pages: AppSummary['pages'],
  queries: Array<{ name?: string; options?: unknown }>
): string[] {
  const warnings: string[] = [];
  const sqlByName = new Map<string, string>();
  for (const query of queries) {
    const sql = (query.options as { query?: unknown } | undefined)?.query;
    if (query.name && typeof sql === 'string') sqlByName.set(query.name, sql);
  }
  if (!sqlByName.size) return warnings;

  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== 'Chart') continue;
      const properties = (component as { properties?: Record<string, unknown> }).properties;
      const entry = properties?.data as { value?: unknown } | undefined;
      const binding = typeof entry?.value === 'string' ? entry.value : typeof entry === 'string' ? entry : '';
      if (!binding.includes('{{')) continue;
      // y: r.<column> — the value the chart must plot numerically.
      const yMatch = binding.match(/y\s*:\s*(?:\w+\.)?([A-Za-z_]\w*)/);
      const queryMatch = binding.match(/queries\.([A-Za-z_$][\w$]*)/);
      if (!yMatch || !queryMatch) continue;
      const column = yMatch[1];
      const sql = sqlByName.get(queryMatch[1]);
      if (!sql) continue;
      // Is that column produced by an aggregate, and is it cast anywhere?
      const aggregate = new RegExp(
        `\\b(count|sum|avg|min|max)\\s*\\([^)]*\\)\\s+as\\s+${column}\\b`,
        'i'
      ).test(sql);
      if (!aggregate) continue;
      const cast = new RegExp(`(cast\\s*\\(|::\\s*(float|numeric|decimal|int|bigint|double))`, 'i').test(sql);
      const coerced = /Number\s*\(|parseFloat\s*\(|parseInt\s*\(|\+\s*r\./.test(binding);
      if (cast || coerced) continue;
      warnings.push(
        `Chart "${component.name ?? component.id}" plots y from "${column}", an uncast SQL aggregate in ` +
          `query "${queryMatch[1]}". Many drivers return numeric aggregates as STRINGS (BigQuery INT64 ` +
          `from COUNT(*) especially), and a Chart given string y values renders blank with no error. ` +
          `Cast in SQL (CAST(... AS FLOAT64) / ::float) or coerce in the binding (y: Number(r.${column})).`
      );
    }
  }
  return warnings;
}

function lintServerSidePaginationRace(
  pages: AppSummary['pages'],
  queries: Array<{ name?: string; options?: unknown }>
): string[] {
  const errors: string[] = [];
  const queryByName = new Map<string, { name?: string; options?: unknown }>();
  for (const query of queries) if (query.name) queryByName.set(query.name, query);

  const propValue = (properties: Record<string, unknown> | undefined, key: string): unknown => {
    const entry = properties?.[key] as { value?: unknown } | undefined;
    return entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
  };
  const isTrue = (value: unknown): boolean =>
    value === true || (typeof value === 'string' && value.replace(/\s+/g, '').toLowerCase() === '{{true}}');
  const runsOnPageLoad = (options: unknown): boolean => {
    const opts = options as Record<string, unknown> | undefined;
    return !!opts && (opts.runOnPageLoad === true || opts.runOnPageLoad === '{{true}}');
  };
  const referencedQueryNames = (dataBinding: unknown): string[] => {
    if (typeof dataBinding !== 'string') return [];
    const names = new Set<string>();
    for (const match of dataBinding.matchAll(/queries\.([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
    return [...names];
  };

  for (const page of pages) {
    for (const component of page.components) {
      if (component.type !== 'Table' || !component.name) continue;
      const properties = (component as { properties?: Record<string, unknown> }).properties;
      if (!isTrue(propValue(properties, 'serverSidePagination'))) continue;
      for (const queryName of referencedQueryNames(propValue(properties, 'data'))) {
        const query = queryByName.get(queryName);
        if (!query) continue;
        if (runsOnPageLoad(query.options) && containsNamedBinding(query.options, 'components', component.name)) {
          errors.push(
            `Table "${component.name}" uses server-side pagination and its data query "${queryName}" runs on page load ` +
              `while referencing components.${component.name}.* in its SQL. On first load the table is not registered yet, ` +
              `so those bindings resolve to "undefined" and the query fails (e.g. column "undefined" does not exist) — the ` +
              `table then shows "No data" even though the record count is non-zero. For a bounded result set, prefer ` +
              `client-side pagination: set serverSidePagination:false, bind the table data to the full query, and drop the ` +
              `separate count query. If server-side pagination is genuinely needed, set the data query's runOnPageLoad:false ` +
              `and drive it from the table's onPageChanged/onSearch events so it runs after the table mounts.`
          );
        }
      }
    }
  }
  return errors;
}

/** The existing pages (other than the plan's) whose components read queries.<name> or whose events run the query. */
export function pagesUsingQuery(summary: AppSummary | undefined, name: string, planPages: Set<string>): string[] {
  if (!summary) return [];
  const query = (summary.queries ?? []).find((q) => q.name === name);
  const reads = new RegExp(`queries\\??\\.${name.replace(/[$]/g, '\\$&')}\\b`);
  return (summary.pages ?? []).filter((page) => {
    if (!page.name || planPages.has(page.name)) return false;
    const ids = new Set(page.components.map((component) => component.id));
    return page.components.some((component) => reads.test(JSON.stringify([component.properties ?? {}, component.styles ?? {}]))) ||
      (!!query && (summary.events ?? []).some((event) => !!event.sourceId && (ids.has(event.sourceId) || event.sourceId === page.id) &&
        JSON.stringify(event.event ?? {}).includes(`"${query.id}"`)));
  }).map((page) => page.name as string);
}

export function lintPlannedApp(spec: PlannedAppSpec, existingSummary?: AppSummary, options: { canvasColor?: string } = {}): AppSpecLintResult {
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
    // A table may take several entries: each is capped at 40 rows and they insert one after another (merch m14
    // and m16 split a table's rows and then lost three lint rounds to a "more than once" rule).
    checked.push('seed batches have non-empty rows');
    for (const seed of seedData) {
      if (!seed.rows.length) errors.push(`Seed data for table "${seed.tableName}" has no rows.`);
    }
  }

  const queryRefs = new Map<string, { id: string; name: string }>();
  const queryIds = new Map<string, { id: string; name: string }>();
  const existingQueries = existingSummary?.queries ?? [];
  const existingQueryNames = new Set<string>();
  for (const query of existingQueries) {
    const target = { id: query.id, name: query.name ?? query.id };
    queryRefs.set(query.id, target);
    queryIds.set(query.id, target);
    if (query.name) {
      if (existingQueryNames.has(query.name)) errors.push(`Existing app has duplicate query name "${query.name}".`);
      existingQueryNames.add(query.name);
      queryRefs.set(query.name, target);
    }
  }
  const plannedQueries = (spec.queries ?? []).map((query, index) => {
    const ref = query.clientRef ?? query.name;
    const id = `planned-query:${index}:${ref}`;
    if (existingQueryNames.has(query.name)) {
      // A replace redefines only the replaced page's own queries (pageReplace.ts); a query another page also reaches
      // stays a collision, so say how to use or change it instead, naming the pages that use it: told only "replace
      // the page that owns it", a build spent five compiles, three of them probing the compiler (2026-09-29).
      const users = pagesUsingQuery(existingSummary, query.name, new Set((spec.pages ?? []).map((page) => page.name)));
      errors.push(`App already has a query named "${query.name}"` +
        (users.length ? `, which page${users.length > 1 ? 's' : ''} ${users.map((u) => `"${u}"`).join(', ')} also read${users.length > 1 ? '' : 's'} or run${users.length > 1 ? '' : 's'}. ` +
          'To use it as it is, refer to it by name here without defining it. To change it for every page that reads it, ' +
          'mark this definition update: true.'
          : '. To use it as it is, refer to it by name without defining it in this plan; to change it, mark this definition update: true.'));
    }
    registerRef(queryRefs, ref, { id, name: query.name }, 'query', errors);
    if (ref !== query.name) registerRef(queryRefs, query.name, { id, name: query.name }, 'query', errors);
    queryIds.set(id, { id, name: query.name });
    // The same preparation apply_app_phase and the direct query tools persist through: toggles become booleans (or
    // are refused) whether or not the kind resolved; with a kind, the write column map is repaired and the contract
    // checked, so the phase this lint hands to apply persists the shape ToolJet actually reads.
    if (!query.kind) {
      errors.push(`Query "${query.name}" has no resolved datasource kind; pass kind or a resolvable datasource_id + version_id.`);
    }
    const prepared = prepareQueryOptionsForWrite(query.kind, query.options, `Query "${query.name}"`);
    const options = prepared.options;
    errors.push(...prepared.errors);
    warnings.push(...prepared.warnings);
    return {
      id,
      name: query.name,
      kind: query.kind,
      data_source_id: query.datasourceId,
      options,
    };
  });
  const queries = [...existingQueries, ...plannedQueries];
  if (plannedQueries.length) checked.push('datasource query option contracts and duplicate logical query references');
  {
    const loadOrder = lintRunjsLoadOrder(spec);
    errors.push(...loadOrder.errors);
    warnings.push(...loadOrder.warnings);
  }

  const pageRefs = new Map<string, { id: string; name: string }>();
  const componentRefs = new Map<string, { id: string; name: string; type?: string }>();
  const pages: AppSummary['pages'] = (existingSummary?.pages ?? []).map((page) => ({
    ...page,
    components: page.components.map((component) => ({ ...component })),
  }));
  const componentNameCounts = new Map<string, number>();
  for (const page of pages) {
    bindRef(pageRefs, page.id, { id: page.id, name: page.name ?? page.id });
    if (page.name) bindRef(pageRefs, page.name, { id: page.id, name: page.name });
    if (page.handle) bindRef(pageRefs, page.handle, { id: page.id, name: page.name ?? page.handle });
    for (const component of page.components) {
      const target = { id: component.id, name: component.name ?? component.id, type: component.type };
      bindRef(componentRefs, component.id, target);
      if (component.name) componentNameCounts.set(component.name, (componentNameCounts.get(component.name) ?? 0) + 1);
    }
  }
  for (const page of pages) {
    for (const component of page.components) {
      if (component.name && componentNameCounts.get(component.name) === 1) {
        bindRef(componentRefs, component.name, { id: component.id, name: component.name, type: component.type });
      }
    }
  }
  let componentCount = 0;

  (spec.pages ?? []).forEach((plannedPage, pageIndex) => {
    const pageRef = plannedPage.clientRef ?? plannedPage.name;
    // The same match apply_app_phase makes: by name, and handle "home" only when no page is named Home.
    const existingPage = matchPlannedPage(pages, plannedPage.name, new Set((spec.pages ?? []).map((page) => page.name)));
    const pageId = existingPage?.id ?? `planned-page:${pageIndex}:${pageRef}`;
    bindRef(pageRefs, pageRef, { id: pageId, name: plannedPage.name }, 'page', errors);
    const iconError = pageIconError(plannedPage.icon);
    if (iconError) errors.push(`Page "${plannedPage.name}": ${iconError}`);

    const normalized = (plannedPage.components ?? []).map((component) => {
      const definition = normalizeComponentSpec(component, { stripUnknownKeys: true });
      const geometry = normalizePlannedLayouts(definition.component);
      return { component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
    });
    warnings.push(...normalized.flatMap((item) => item.warnings));
    const expansion = materializeRequiredDefaultChildren(normalized.map((item) => item.component));
    warnings.push(...expansion.warnings);
    const componentLint = lintComponents(expansion.components, options);
    errors.push(...componentLint.errors.map((message) => `Page "${plannedPage.name}": ${message}`));
    errors.push(...lintQueryFedCharts(expansion.components, spec.queries ?? []).map((message) => `Page "${plannedPage.name}": ${message}`));
    warnings.push(...componentLint.warnings.map((message) => `Page "${plannedPage.name}": ${message}`));

    const localRefs = new Map<string, string>();
    for (const component of existingPage?.components ?? []) {
      if (component.name) localRefs.set(component.name, component.id);
      localRefs.set(component.id, component.id);
    }
    const componentEntries = expansion.components.map((component, componentIndex) => {
      const ref = component.clientRef ?? component.name;
      const id = `planned-component:${pageIndex}:${componentIndex}:${ref}`;
      if ((existingPage?.components ?? []).some((candidate) => candidate.name === component.name)) {
        errors.push(`Page "${plannedPage.name}" already has a component named "${component.name}".`);
      }
      if (localRefs.has(ref)) errors.push(`Page "${plannedPage.name}" has duplicate component ref "${ref}".`);
      else localRefs.set(ref, id);
      registerRef(componentRefs, ref, { id, name: component.name, type: component.type }, 'component', errors);
      componentCount += 1;
      return { component, id };
    });

    const plannedComponents = componentEntries.map(({ component, id }) => {
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
        validation: component.validation,
        others: component.others,
        layouts: component.layouts ?? (component.layout
          ? { desktop: component.layout, mobile: component.layout }
          : undefined),
        parent,
        ...(component.slotName && component.slotName !== 'body' ? { slot_name: component.slotName } : {}),
      };
    });
    const pageSummary = existingPage ?? {
      id: pageId,
      name: plannedPage.name,
      handle: plannedPage.name === 'Home' ? 'home' : slug(plannedPage.name),
      icon: plannedPage.icon,
      components: [],
    };
    pageSummary.name = plannedPage.name;
    pageSummary.icon = plannedPage.icon;
    if (plannedPage.hidden !== undefined) pageSummary.hidden = plannedPage.hidden;
    pageSummary.components.push(...plannedComponents);
    if (!existingPage) pages.push(pageSummary);
  });
  if (pages.length) checked.push('page icons, component contracts, bindings, rendered geometry, modal sizing, and nested refs');
  errors.push(...lintServerSidePaginationRace(pages, queries));
  warnings.push(...lintChartNumericBindings(pages, queries));

  const eventSpecs: EventSpec[] = [];
  // QrScanner awaits its onDetect handler before it sets lastDetectedValue: an undelayed action reads the previous scan.
  const scanners = new Set((spec.pages ?? []).flatMap((p) => (p.components ?? []).filter((c) => c.type === 'QrScanner').flatMap((c) => [c.clientRef, c.name].filter(Boolean) as string[])));
  (spec.events ?? []).forEach((event, index) => {
    if (event.sourceType === 'component' && event.trigger === 'onDetect' && scanners.has(String(event.sourceRef)) && !(event.action as Record<string, unknown> | undefined)?.debounce) {
      errors.push(`Event[${index}] (QrScanner "${event.sourceRef}" onDetect): add debounce: "300" to the action. The scanner runs onDetect before it ` +
        'sets lastDetectedValue, so an undelayed action reads the previous scan (nothing on the first).');
    }
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
        beforeRefreshActions: lifecycle.beforeRefreshActions?.map((action, actionIndex) =>
          resolveAction(action, queryRefs, pageRefs, componentRefs, errors, `Lifecycle[${index}] before refresh action[${actionIndex}]`)
        ),
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
        { app_id: existingSummary?.app_id ?? 'planned-app', pages, queries, events: existingSummary?.events ?? [] },
        lifecycleSpecs
      );
      eventSpecs.push(...expanded.events);
      warnings.push(...expanded.warnings);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const summary: AppSummary = {
    app_id: existingSummary?.app_id ?? 'planned-app',
    name: existingSummary?.name ?? 'Planned app',
    version_id: existingSummary?.version_id ?? 'planned-version',
    pages,
    queries,
    events: [
      ...(existingSummary?.events ?? []),
      ...eventSpecs.map((event, index) => ({
        id: `planned-event:${index}`,
        name: event.name,
        sourceId: event.sourceId,
        target: event.sourceType,
        event: { eventId: event.trigger, ...(event.ref ? { ref: event.ref } : {}), ...event.action },
      })),
    ],
  };
  if (eventSpecs.length) {
    checked.push('event/lifecycle sources, triggers, action ids, and logical targets');
    // `eventSpecs` are supplied separately below. Keep only genuinely persisted events in the
    // chain context; including the planned rows in `summary.events` duplicates every handler and
    // makes a sole final switch-page look as though another switch-page follows it.
    const eventValidation = validateEvents(
      { ...summary, events: existingSummary?.events ?? [] },
      eventSpecs
    );
    errors.push(...eventValidation.errors);
    warnings.push(...eventValidation.warnings);
  }

  const structure = validateAppStructure(summary, options);
  const forward = splitForwardComponentRefs(structure.errors, existingQueryNames);
  errors.push(...forward.errors);
  warnings.push(...structure.warnings, ...forward.notes);

  // The per-page component lint and the whole-app structure lint both run the render-readiness
  // checks, so an Html height or root error arrived twice: once as `Page "Home": Html "X": …` and
  // once as `Html "X": …`. Each copy is ~400 characters the model has to read; keep the page-prefixed one.
  const deduped = dropUnprefixedDuplicates(errors);
  return {
    ok: deduped.length === 0,
    errors: deduped,
    warnings: dropUnprefixedDuplicates(warnings),
    checked,
    not_checked: [
      'server acceptance of writes or external datasource connectivity',
      'query execution results and mutation side effects',
      'browser event delivery, dynamic bindings, and visual rendering',
    ],
    counts: {
      tables: tables.length,
      seed_rows: seedRows,
      pages: spec.pages?.length ?? 0,
      components: componentCount,
      queries: plannedQueries.length,
      events: eventSpecs.length,
      lifecycles: spec.lifecycles?.length ?? 0,
    },
  };
}

// A persisted query this plan does not touch may read components that a later page will build
// (the model created every query up front, then builds page by page). This plan cannot fix that,
// so failing it forced whole-app phases; validate_app still rejects it on the finished app.
function splitForwardComponentRefs(
  structureErrors: string[],
  existingQueryNames: Set<string>
): { errors: string[]; notes: string[] } {
  const errors: string[] = [];
  const missing = new Map<string, string[]>();
  for (const error of structureErrors) {
    const m =
      error.match(/^Query "([^"]+)" references components\.([^,]+), but no component is named /) ??
      error.match(/^RunJS query "([^"]+)" references components\["([^"]+)"\], but no component is named /);
    if (m && existingQueryNames.has(m[1]!)) {
      const names = missing.get(m[1]!) ?? [];
      if (!names.includes(m[2]!)) names.push(m[2]!);
      missing.set(m[1]!, names);
    } else {
      errors.push(error);
    }
  }
  const notes = [...missing].map(([query, names]) =>
    `Query "${query}" reads ${names.map((n) => `components.${n}`).join(', ')}, which no page has yet. ` +
      'Build them on a later page with that exact name, or the query reads undefined.'
  );
  return { errors, notes };
}

function bindRef<T extends { id: string }>(
  map: Map<string, T>,
  ref: string,
  value: T,
  type?: string,
  errors?: string[]
): void {
  const existing = map.get(ref);
  if (!existing || existing.id === value.id) map.set(ref, value);
  else if (type && errors) errors.push(`Duplicate ${type} client_ref/name "${ref}" in planned app.`);
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
  const { target_ref: explicitRef, ...action } = raw;
  const targetRef = explicitRef ?? (action.actionId === 'run-query' ? action.queryId ?? action.queryName : undefined);
  if (Object.values(action).some((value) => typeof value === 'string' && /^planned-(query|page|component):/.test(value))) {
    errors.push(`${label}: synthetic planned ids cannot be saved. Use action.target_ref with the logical client_ref or name.`);
    return action;
  }
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

function dropUnprefixedDuplicates(values: string[]): string[] {
  const distinct = unique(values);
  const stripped = new Set(distinct.map((value) => value.replace(/^Page "[^"]*": /, '')).filter((value, i) => value !== distinct[i]));
  return distinct.filter((value) => value.startsWith('Page "') || !stripped.has(value));
}
