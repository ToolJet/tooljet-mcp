import { randomUUID } from 'node:crypto';
import type { Auth } from './auth.js';
import type { Config } from './config.js';

export interface CreateAppResult {
  app_id: string;
  version_id: string;
  home_page_id: string;
  app_url: string;
}

export interface Datasource {
  id: string;
  name: string;
  kind: string;
}

export interface CreateQueryParams {
  versionId: string;
  dataSourceId: string;
  name: string;
  options: Record<string, unknown>;
  /** Query kind = the datasource's kind (tooljetdb/postgresql/runjs/servicenow/…). Resolved from the datasource if omitted. */
  kind?: string;
}

export interface CreateQueryResult {
  query_id: string;
  name: string;
}

export interface ComponentLayout {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
}

export interface CreateComponentParams {
  appId: string;
  versionId: string;
  pageId: string;
  /** Component name — REQUIRED by ToolJet (NOT NULL); a missing name returns 422 "name is required". */
  name: string;
  type: string;
  properties: Record<string, unknown>;
  styles?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  others?: Record<string, unknown>;
  layout?: ComponentLayout;
  layouts?: { desktop?: ComponentLayout; mobile?: ComponentLayout };
}

export interface CreateComponentResult {
  component_id: string;
}

/** One component in a batch (no app/version/page — those are shared across the batch). */
export interface ComponentSpec {
  name: string;
  type: string;
  properties: Record<string, unknown>;
  /** Native styling (textSize, fontWeight, textColor, backgroundColor, …). Read by ToolJet's
   *  renderer from `definition.styles` — putting these under `properties` is silently ignored. */
  styles?: Record<string, unknown>;
  validation?: Record<string, unknown>;
  /** e.g. `{ showOnMobile: {...}, showOnDesktop: {...} }`. */
  others?: Record<string, unknown>;
  /** Convenience: one rectangle applied to both resolutions. */
  layout?: ComponentLayout;
  /** Explicit per-resolution layout; takes precedence over `layout` for the resolution it sets. */
  layouts?: { desktop?: ComponentLayout; mobile?: ComponentLayout };
}

/** Style-ish keys that ToolJet's renderer reads from `definition.styles`, NOT `properties`.
 *  If any appear under `properties` we reject with an actionable error instead of silently dropping them. */
const STYLE_KEYS_IN_PROPERTIES = new Set([
  'styles',
  'textSize',
  'fontWeight',
  'textColor',
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'textAlign',
  'fontVariant',
  'padding',
  'accentColor',
  'iconColor',
]);

export interface CreateComponentsParams {
  appId: string;
  versionId: string;
  pageId: string;
  components: ComponentSpec[];
}

/** One query in a batch (versionId is shared across the batch). */
export interface QuerySpec {
  dataSourceId: string;
  name: string;
  options: Record<string, unknown>;
  kind?: string;
}

export interface CreateQueriesParams {
  versionId: string;
  queries: QuerySpec[];
}

/** A column when creating a ToolJet-DB table. */
export interface TableColumn {
  name: string;
  /** tjdb data type. Common: "character varying", "integer", "bigint", "double precision", "boolean", "timestamp with time zone", "jsonb", "serial". Friendly aliases (string/number/bool/…) are normalized. */
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
}

export interface CreateTableParams {
  tableName: string;
  columns: TableColumn[];
}

export interface CreateTableResult {
  table_id: string;
  table_name: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNotNull: boolean;
}

export interface InsertRowsParams {
  tableName: string;
  rows: Array<Record<string, unknown>>;
}

export interface CreatePageParams {
  appId: string;
  versionId: string;
  name: string;
}

export interface CreatePageResult {
  page_id: string;
  name: string;
}

/** One event handler: a trigger on a component + an action to run. */
export interface EventSpec {
  /** The component the event is attached to. */
  componentId: string;
  /** The trigger event id, e.g. 'onClick' (Button), 'onRowClicked' (Table). */
  trigger: string;
  /** The action: { actionId, ...params }, e.g. { actionId: 'run-query', queryId, queryName }. */
  action: Record<string, unknown>;
}

export interface CreateEventsParams {
  appId: string;
  versionId: string;
  events: EventSpec[];
}

/** Compact projection of one placed component — actual bound values only, no widget schema. */
export interface ComponentSummary {
  id: string;
  name?: string;
  type?: string;
  layouts?: unknown;
  /** Bound property values, e.g. { text: { value: 'Hello' } }. */
  properties?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  others?: Record<string, unknown>;
}

/** Compact projection of a whole app — what an authoring agent needs, without the ~10× schema bloat
 *  that the raw GET /api/apps/:id carries (each component embeds its full widget property schema). */
export interface AppSummary {
  app_id: string;
  name?: string;
  version_id?: string;
  pages: Array<{ id: string; name?: string; handle?: string; components: ComponentSummary[] }>;
  queries: Array<{ id: string; name?: string; kind?: string; data_source_id?: string; options?: unknown }>;
  events: Array<{ id: string; name?: string; sourceId?: string; target?: string; event?: unknown }>;
}

export interface ToolJetClient {
  createApp(name: string): Promise<CreateAppResult>;
  getApp(appId: string): Promise<any>;
  getAppSummary(appId: string): Promise<AppSummary>;
  getComponent(appId: string, componentId: string): Promise<ComponentSummary & { page_id: string }>;
  createPage(params: CreatePageParams): Promise<CreatePageResult>;
  createEvents(params: CreateEventsParams): Promise<{ created: number }>;
  getDevelopmentEnvironmentId(): Promise<string>;
  listDatasources(versionId: string): Promise<Datasource[]>;
  listTables(): Promise<Array<{ id: string; table_name: string }>>;
  createTable(params: CreateTableParams): Promise<CreateTableResult>;
  getTableSchema(tableName: string): Promise<SchemaColumn[]>;
  insertRows(params: InsertRowsParams): Promise<{ processed_rows: number }>;
  createQuery(params: CreateQueryParams): Promise<CreateQueryResult>;
  createQueries(params: CreateQueriesParams): Promise<CreateQueryResult[]>;
  createComponent(params: CreateComponentParams): Promise<CreateComponentResult>;
  createComponents(params: CreateComponentsParams): Promise<Array<CreateComponentResult & { name: string }>>;
  updateComponents(params: UpdateComponentsParams): Promise<{ updated: number }>;
  deleteComponents(params: DeleteComponentsParams): Promise<{ deleted: number }>;
  updateLayouts(params: UpdateLayoutsParams): Promise<{ updated: number }>;
  updateQuery(params: UpdateQueryParams): Promise<{ query_id: string }>;
  deleteQuery(params: { queryId: string; versionId: string }): Promise<{ deleted: boolean }>;
  runQuery(params: { queryId: string; versionId: string; environmentId?: string }): Promise<RunQueryResult>;
  listEvents(params: { appId: string; versionId: string; sourceId?: string }): Promise<EventSummary[]>;
  updateEvents(params: UpdateEventsParams): Promise<{ updated: number }>;
  deleteEvent(params: { appId: string; versionId: string; eventId: string }): Promise<{ deleted: boolean }>;
}

/** A single component definition-or-rename update. Set EITHER `definition` (property/style edits,
 *  deep-merged; array values like Table columns / DropdownV2 options are REPLACED) OR name/parent — not
 *  both in one entry (ToolJet applies only one path). */
export interface UpdateComponentSpec {
  componentId: string;
  definition?: {
    properties?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    general?: Record<string, unknown>;
    general_styles?: Record<string, unknown>;
    others?: Record<string, unknown>;
  };
  name?: string;
  parent?: string;
}
export interface UpdateComponentsParams {
  appId: string;
  versionId: string;
  pageId: string;
  updates: UpdateComponentSpec[];
}
export interface DeleteComponentsParams {
  appId: string;
  versionId: string;
  pageId: string;
  componentIds: string[];
}
export interface UpdateLayoutsParams {
  appId: string;
  versionId: string;
  pageId: string;
  layouts: Array<{ componentId: string; desktop?: ComponentLayout; mobile?: ComponentLayout; parent?: string }>;
}
export interface UpdateQueryParams {
  queryId: string;
  versionId: string;
  /** REPLACES the stored options wholesale — send the full options object, not a partial. */
  options: Record<string, unknown>;
  name?: string;
}
/** Run/preview result — `status` is 'ok' or 'failed' (HTTP is 200 either way); rows under `data`. */
export interface RunQueryResult {
  status: string;
  data?: unknown;
  message?: string;
  [k: string]: unknown;
}
export interface EventSummary {
  id: string;
  name?: string;
  index?: number;
  event?: unknown;
  sourceId?: string;
  target?: string;
}
export interface UpdateEventsParams {
  appId: string;
  versionId: string;
  /** For 'update': name + event required (name becomes null if omitted). For 'reorder': index used. */
  events: Array<{ eventId: string; name?: string; event?: Record<string, unknown>; index?: number }>;
  updateType?: 'update' | 'reorder';
}

async function assertOk(res: Response, method: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`ToolJet ${method} failed (${res.status}): ${await res.text()}`);
  }
}

// Friendly aliases → tjdb data types, so callers can say "string"/"number"/"bool".
const TYPE_ALIASES: Record<string, string> = {
  string: 'character varying',
  text: 'character varying',
  varchar: 'character varying',
  int: 'integer',
  integer: 'integer',
  number: 'double precision',
  float: 'double precision',
  decimal: 'double precision',
  double: 'double precision',
  bigint: 'bigint',
  bool: 'boolean',
  boolean: 'boolean',
  timestamp: 'timestamp with time zone',
  datetime: 'timestamp with time zone',
  date: 'timestamp with time zone',
  json: 'jsonb',
  jsonb: 'jsonb',
  serial: 'serial',
};
const normalizeType = (t: string): string => TYPE_ALIASES[t.trim().toLowerCase()] ?? t;

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
  return lines.join('\n') + '\n';
}

export function createClient(auth: Auth, config: Config): ToolJetClient {
  async function getApp(appId: string): Promise<any> {
    const res = await auth.authedFetch(`/api/apps/${appId}`);
    await assertOk(res, 'getApp');
    return res.json();
  }

  // In GET /api/apps/:id, each placed component lives at pages[].components[<id>] as
  // { component: { name, component: <type>, definition: { properties, styles, others } }, layouts }.
  // `component.definition` holds the ACTUAL bound values; `component.properties`/`styles` is the full
  // widget schema (the bulk). Project to values-only.
  function projectComponent(id: string, entry: any): ComponentSummary {
    const c = entry?.component ?? {};
    const def = c.definition ?? {};
    return {
      id,
      name: c.name,
      type: c.component,
      layouts: entry?.layouts,
      properties: def.properties,
      styles: def.styles,
      others: def.others,
    };
  }

  async function getAppSummary(appId: string): Promise<AppSummary> {
    const full = await getApp(appId);
    const pages = (full.pages ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      handle: p.handle,
      components: Object.entries(p.components ?? {}).map(([id, entry]) => projectComponent(id, entry)),
    }));
    const queries = (full.data_queries ?? []).map((q: any) => ({
      id: q.id,
      name: q.name,
      kind: q.kind,
      data_source_id: q.data_source_id,
      options: q.options,
    }));
    const events = (full.events ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      sourceId: e.sourceId,
      target: e.target,
      event: e.event,
    }));
    return { app_id: full.id, name: full.name, version_id: full.editing_version?.id, pages, queries, events };
  }

  async function getComponent(
    appId: string,
    componentId: string
  ): Promise<ComponentSummary & { page_id: string }> {
    const full = await getApp(appId);
    for (const p of full.pages ?? []) {
      const entry = (p.components ?? {})[componentId];
      if (entry) return { ...projectComponent(componentId, entry), page_id: p.id };
    }
    throw new Error(
      `ToolJet getComponent failed: component ${componentId} not found in app ${appId}`
    );
  }

  async function createApp(name: string): Promise<CreateAppResult> {
    const createRes = await auth.authedFetch('/api/apps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'front-end' }),
    });
    await assertOk(createRes, 'createApp');
    const created = (await createRes.json()) as { id: string; slug?: string };

    const app = await getApp(created.id);
    const versionId: string = app.editing_version.id;
    const pages: Array<{ id: string; name: string }> = app.pages ?? [];
    const homePage = pages.find((p) => p.name === 'Home') ?? pages[0];
    if (!homePage) {
      throw new Error('ToolJet createApp failed: app has no pages');
    }

    // Editor URL is /<workspace-slug>/apps/<app-slug> — the workspace segment is required.
    const orgSlug = await auth.getOrganizationSlug();
    const appSlug = created.slug ?? created.id;

    return {
      app_id: created.id,
      version_id: versionId,
      home_page_id: homePage.id,
      app_url: `${config.appUrl}/${orgSlug}/apps/${appSlug}`,
    };
  }

  async function listTables(): Promise<Array<{ id: string; table_name: string }>> {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/tables`);
    await assertOk(res, 'listTables');
    const body = (await res.json()) as { result: Array<{ id: string; table_name: string }> };
    return body.result ?? [];
  }

  async function createPage(params: CreatePageParams): Promise<CreatePageResult> {
    // Page order = append after existing pages. The client generates the page id (like components).
    const app = await getApp(params.appId);
    const index = (app.pages ?? []).length;
    const pageId = randomUUID();
    const handle =
      params.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'page';
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pageId, name: params.name, handle, index }),
    });
    await assertOk(res, 'createPage');
    return { page_id: pageId, name: params.name };
  }

  async function createEvents(params: CreateEventsParams): Promise<{ created: number }> {
    // Each event → { event: { eventId: <trigger>, ...action }, eventType: 'component', attachedTo, index }.
    // index is per-component ordering; for a fresh build start at 0 and increment per component.
    const indexByComponent: Record<string, number> = {};
    const events = params.events.map((e) => {
      const index = indexByComponent[e.componentId] ?? 0;
      indexByComponent[e.componentId] = index + 1;
      return {
        // name is NOT NULL server-side (the DTO marks it optional but the column requires it).
        name: `${e.trigger} → ${(e.action.actionId as string) ?? 'action'}`,
        event: { eventId: e.trigger, ...e.action },
        eventType: 'component',
        attachedTo: e.componentId,
        index,
      };
    });
    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/events/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    await assertOk(res, 'createEvents');
    return { created: events.length };
  }

  async function getDevelopmentEnvironmentId(): Promise<string> {
    const res = await auth.authedFetch('/api/app-environments');
    await assertOk(res, 'getDevelopmentEnvironmentId');
    const body = await res.json();
    const envs: Array<{ id: string; name: string }> = Array.isArray(body) ? body : body.environments;
    const dev = envs.find((e) => e.name === 'development');
    if (!dev) {
      throw new Error('ToolJet getDevelopmentEnvironmentId failed: no development environment found');
    }
    return dev.id;
  }

  async function listDatasources(versionId: string): Promise<Datasource[]> {
    const [orgId, envId] = await Promise.all([auth.getOrganizationId(), getDevelopmentEnvironmentId()]);
    const res = await auth.authedFetch(
      `/api/data-sources/${orgId}/environments/${envId}/versions/${versionId}`
    );
    await assertOk(res, 'listDatasources');
    // The API returns fully-hydrated datasource objects (options, plugin, scope, …) — ~22KB in a
    // typical app. The agent only needs {id,name,kind}; strip the rest at runtime (the TS type does
    // NOT strip fields on its own).
    const body = (await res.json()) as { data_sources: Array<Datasource & Record<string, unknown>> };
    return body.data_sources.map((d) => ({ id: d.id, name: d.name, kind: d.kind }));
  }

  async function createTable(params: CreateTableParams): Promise<CreateTableResult> {
    const orgId = await auth.getOrganizationId();
    let cols = params.columns.map((c) => ({
      column_name: c.name,
      data_type: normalizeType(c.type),
      constraints_type: {
        is_not_null: !!c.notNull || !!c.primaryKey,
        is_primary_key: !!c.primaryKey,
        is_unique: !!c.unique || !!c.primaryKey,
      },
    }));
    // Every tjdb table needs a primary key; if none was specified, prepend a serial `id`.
    if (!cols.some((c) => c.constraints_type.is_primary_key)) {
      cols = [
        {
          column_name: 'id',
          data_type: 'serial',
          constraints_type: { is_not_null: true, is_primary_key: true, is_unique: true },
        },
        ...cols,
      ];
    }
    const res = await auth.authedFetch(`/api/tooljet-db/organizations/${orgId}/table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: params.tableName, columns: cols }),
    });
    await assertOk(res, 'createTable');
    const body = (await res.json()) as { result: { id: string; table_name: string } };
    return { table_id: body.result.id, table_name: body.result.table_name };
  }

  async function getTableSchema(tableName: string): Promise<SchemaColumn[]> {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(
      `/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(tableName)}`
    );
    await assertOk(res, 'getTableSchema');
    const body = (await res.json()) as {
      result: {
        columns: Array<{
          column_name: string;
          data_type: string;
          constraints_type?: { is_primary_key?: boolean; is_not_null?: boolean };
        }>;
      };
    };
    return body.result.columns.map((c) => ({
      name: c.column_name,
      type: c.data_type,
      isPrimaryKey: !!c.constraints_type?.is_primary_key,
      isNotNull: !!c.constraints_type?.is_not_null,
    }));
  }

  async function insertRows(params: InsertRowsParams): Promise<{ processed_rows: number }> {
    if (!params.rows.length) return { processed_rows: 0 };
    const orgId = await auth.getOrganizationId();
    const schema = await getTableSchema(params.tableName);
    const pk = schema.find((c) => c.isPrimaryKey);
    // bulk-upload upserts by PK and does NOT auto-fill serial ids — if the rows omit an
    // integer PK, assign sequential values so seeding "just works".
    const rows = params.rows.map((r) => ({ ...r }));
    if (pk && !(pk.name in (rows[0] ?? {})) && /int|serial|numeric/i.test(pk.type)) {
      rows.forEach((r, i) => (r[pk.name] = i + 1));
    }
    const keys = new Set<string>();
    for (const r of rows) Object.keys(r).forEach((k) => keys.add(k));
    const headers = [
      ...schema.map((c) => c.name).filter((n) => keys.has(n)),
      ...[...keys].filter((k) => !schema.some((c) => c.name === k)),
    ];

    const form = new FormData();
    form.append('file', new Blob([toCsv(headers, rows)], { type: 'text/csv' }), 'seed.csv');
    const res = await auth.authedFetch(
      `/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}/bulk-upload`,
      { method: 'POST', body: form }
    );
    await assertOk(res, 'insertRows');
    const body = (await res.json()) as { result?: { processed_rows?: number } };
    return { processed_rows: body.result?.processed_rows ?? rows.length };
  }

  // The query's kind must match its datasource's kind. Resolve it from the datasource list
  // when the caller didn't pass one (so it works for any datasource, not just ToolJet DB).
  async function resolveDatasourceKind(versionId: string, dataSourceId: string): Promise<string> {
    const ds = (await listDatasources(versionId)).find((d) => d.id === dataSourceId);
    if (!ds) throw new Error(`ToolJet createQuery failed: datasource ${dataSourceId} not found for this app version`);
    return ds.kind;
  }

  async function createQuery(params: CreateQueryParams): Promise<CreateQueryResult> {
    const kind = params.kind ?? (await resolveDatasourceKind(params.versionId, params.dataSourceId));
    const res = await auth.authedFetch(
      `/api/data-queries/data-sources/${params.dataSourceId}/versions/${params.versionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name: params.name, options: params.options }),
      }
    );
    await assertOk(res, 'createQuery');
    const body = (await res.json()) as { id: string; name: string };
    return { query_id: body.id, name: body.name };
  }

  // Batch: create many queries in one tool call. No native bulk-create endpoint, so fan out
  // (in parallel) to the single-create route — saves model round-trips even though it's N HTTP calls.
  async function createQueries(params: CreateQueriesParams): Promise<CreateQueryResult[]> {
    // Resolve datasource kinds once for the whole batch (only if any query omitted its kind), then fan out.
    const needResolve = params.queries.some((q) => !q.kind);
    const dsList = needResolve ? await listDatasources(params.versionId) : [];
    const kindOf = (id: string): string | undefined => dsList.find((d) => d.id === id)?.kind;
    return Promise.all(
      params.queries.map((q) =>
        createQuery({
          versionId: params.versionId,
          dataSourceId: q.dataSourceId,
          name: q.name,
          options: q.options,
          kind: q.kind ?? kindOf(q.dataSourceId),
        })
      )
    );
  }

  function buildComponentDto(spec: ComponentSpec): Record<string, unknown> {
    // Guard: styling nested under `properties` is silently discarded by ToolJet (its renderer
    // reads styles from `definition.styles`). Reject early with an actionable message.
    const misplaced = Object.keys(spec.properties ?? {}).filter((k) => STYLE_KEYS_IN_PROPERTIES.has(k));
    if (misplaced.length) {
      throw new Error(
        `Component "${spec.name}": style keys ${JSON.stringify(misplaced)} were placed under \`properties\`, ` +
          `where ToolJet silently ignores them. Move them to the top-level \`styles\` object instead.`
      );
    }
    const dto: Record<string, unknown> = {
      name: spec.name,
      type: spec.type,
      properties: spec.properties,
      styles: spec.styles ?? {},
      validation: spec.validation ?? {},
      others: spec.others ?? {},
    };
    // layouts are keyed by resolution type (desktop/mobile) — a flat {top,left,...} returns 422
    // "invalid input value for enum layout_type". Explicit per-resolution `layouts` wins; otherwise
    // the flat `layout` convenience is applied to both.
    const desktop = spec.layouts?.desktop ?? spec.layout;
    const mobile = spec.layouts?.mobile ?? spec.layout;
    if (desktop || mobile) {
      dto.layouts = { ...(desktop ? { desktop } : {}), ...(mobile ? { mobile } : {}) };
    }
    return dto;
  }

  // Batch: create many components on one page in a SINGLE request. ToolJet's create endpoint
  // takes a diff MAP keyed by component id, so N components = one HTTP call.
  async function createComponents(
    params: CreateComponentsParams
  ): Promise<Array<CreateComponentResult & { name: string }>> {
    const entries = params.components.map((spec) => ({ id: randomUUID(), spec }));
    const diff: Record<string, unknown> = {};
    for (const e of entries) diff[e.id] = buildComponentDto(e.spec);

    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff }),
    });
    await assertOk(res, 'createComponents');
    return entries.map((e) => ({ component_id: e.id, name: e.spec.name }));
  }

  async function createComponent(params: CreateComponentParams): Promise<CreateComponentResult> {
    const [r] = await createComponents({
      appId: params.appId,
      versionId: params.versionId,
      pageId: params.pageId,
      components: [
        {
          name: params.name,
          type: params.type,
          properties: params.properties,
          styles: params.styles,
          validation: params.validation,
          others: params.others,
          layout: params.layout,
          layouts: params.layouts,
        },
      ],
    });
    return { component_id: r.component_id };
  }

  // Update = PUT /components. The diff value is wrapped in `component` (NOT the flat create shape) and
  // partial: send only changed leaves under `definition`. Server deep-merges, except arrays (Table
  // columns / dropdown options) which it REPLACES. Renames/reparents go as raw column changes with no
  // `definition` key. pageId is required by the DTO even though the update handler ignores it.
  async function updateComponents(params: UpdateComponentsParams): Promise<{ updated: number }> {
    const diff: Record<string, unknown> = {};
    for (const u of params.updates) {
      const hasDef = !!u.definition && Object.keys(u.definition).length > 0;
      const hasRaw = u.name !== undefined || u.parent !== undefined;
      if (hasDef && hasRaw) {
        throw new Error(
          `updateComponents "${u.componentId}": set EITHER definition (properties/styles/…) OR name/parent ` +
            `in one entry — ToolJet applies only one path. Split into two update calls.`
        );
      }
      if (hasDef) {
        diff[u.componentId] = { component: { definition: u.definition } };
      } else {
        diff[u.componentId] = {
          component: {
            ...(u.name !== undefined ? { name: u.name } : {}),
            ...(u.parent !== undefined ? { parent: u.parent } : {}),
          },
        };
      }
    }
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/components`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff }),
      }
    );
    await assertOk(res, 'updateComponents');
    return { updated: params.updates.length };
  }

  // Delete = DELETE /components with a JSON body whose `diff` is a bare array of component ids.
  async function deleteComponents(params: DeleteComponentsParams): Promise<{ deleted: number }> {
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/components`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_user_switched_version: false,
          pageId: params.pageId,
          diff: params.componentIds,
        }),
      }
    );
    await assertOk(res, 'deleteComponents');
    return { deleted: params.componentIds.length };
  }

  // Move/resize = PUT /components/layout; diff keyed by id → { layouts:{desktop?,mobile?}, component?:{parent} }.
  async function updateLayouts(params: UpdateLayoutsParams): Promise<{ updated: number }> {
    const diff: Record<string, unknown> = {};
    for (const l of params.layouts) {
      const entry: Record<string, unknown> = {
        layouts: {
          ...(l.desktop ? { desktop: l.desktop } : {}),
          ...(l.mobile ? { mobile: l.mobile } : {}),
        },
      };
      if (l.parent !== undefined) entry.component = { parent: l.parent };
      diff[l.componentId] = entry;
    }
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/components/layout`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_user_switched_version: false, pageId: params.pageId, diff }),
      }
    );
    await assertOk(res, 'updateLayouts');
    return { updated: params.layouts.length };
  }

  // Update query = PATCH /:id/versions/:versionId. `options` REPLACES the stored options wholesale.
  async function updateQuery(params: UpdateQueryParams): Promise<{ query_id: string }> {
    const body: Record<string, unknown> = { options: params.options };
    if (params.name !== undefined) body.name = params.name;
    const res = await auth.authedFetch(
      `/api/data-queries/${params.queryId}/versions/${params.versionId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    await assertOk(res, 'updateQuery');
    return { query_id: params.queryId };
  }

  async function deleteQuery(params: { queryId: string; versionId: string }): Promise<{ deleted: boolean }> {
    const res = await auth.authedFetch(
      `/api/data-queries/${params.queryId}/versions/${params.versionId}`,
      { method: 'DELETE' }
    );
    await assertOk(res, 'deleteQuery');
    return { deleted: true };
  }

  // Run a SAVED query and return its result — the browser-free way to see real rows. Executes the query
  // as stored in the DB; `options:{}` avoids persisting anything back. Response { status:'ok', data:[…] }
  // on success, { status:'failed', message } on error — HTTP is 200 either way, so callers inspect status.
  async function runQuery(params: {
    queryId: string;
    versionId: string;
    environmentId?: string;
  }): Promise<RunQueryResult> {
    const envId = params.environmentId ?? (await getDevelopmentEnvironmentId());
    const res = await auth.authedFetch(
      `/api/data-queries/${params.queryId}/versions/${params.versionId}/run/${envId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedOptions: {}, options: {} }),
      }
    );
    await assertOk(res, 'runQuery');
    return (await res.json()) as RunQueryResult;
  }

  async function listEvents(params: {
    appId: string;
    versionId: string;
    sourceId?: string;
  }): Promise<EventSummary[]> {
    const qs = params.sourceId ? `?sourceId=${encodeURIComponent(params.sourceId)}` : '';
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/events${qs}`
    );
    await assertOk(res, 'listEvents');
    const body = (await res.json()) as any[];
    return (Array.isArray(body) ? body : []).map((e) => ({
      id: e.id,
      name: e.name,
      index: e.index,
      event: e.event,
      sourceId: e.sourceId,
      target: e.target,
    }));
  }

  // Update = PUT /events, body { events:[{event_id, diff}], updateType }. For 'update' the server reads
  // diff.name + diff.event (name becomes null if omitted); for 'reorder' it reads diff.index.
  async function updateEvents(params: UpdateEventsParams): Promise<{ updated: number }> {
    const updateType = params.updateType ?? 'update';
    const events = params.events.map((e) =>
      updateType === 'reorder'
        ? { event_id: e.eventId, diff: { index: e.index } }
        : {
            event_id: e.eventId,
            diff: {
              name: e.name,
              event: e.event,
              ...(e.index !== undefined ? { index: e.index } : {}),
            },
          }
    );
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/events`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, updateType }),
      }
    );
    await assertOk(res, 'updateEvents');
    return { updated: params.events.length };
  }

  async function deleteEvent(params: {
    appId: string;
    versionId: string;
    eventId: string;
  }): Promise<{ deleted: boolean }> {
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/events/${params.eventId}`,
      { method: 'DELETE' }
    );
    await assertOk(res, 'deleteEvent');
    return { deleted: true };
  }

  return {
    createApp,
    getApp,
    getAppSummary,
    getComponent,
    createPage,
    createEvents,
    getDevelopmentEnvironmentId,
    listDatasources,
    listTables,
    createTable,
    getTableSchema,
    insertRows,
    createQuery,
    createQueries,
    createComponent,
    createComponents,
    updateComponents,
    deleteComponents,
    updateLayouts,
    updateQuery,
    deleteQuery,
    runQuery,
    listEvents,
    updateEvents,
    deleteEvent,
  };
}
