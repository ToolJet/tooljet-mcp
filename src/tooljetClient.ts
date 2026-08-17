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
  layout?: ComponentLayout;
}

export interface CreateComponentResult {
  component_id: string;
}

/** One component in a batch (no app/version/page — those are shared across the batch). */
export interface ComponentSpec {
  name: string;
  type: string;
  properties: Record<string, unknown>;
  layout?: ComponentLayout;
}

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

export interface ToolJetClient {
  createApp(name: string): Promise<CreateAppResult>;
  getApp(appId: string): Promise<any>;
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
    const body = (await res.json()) as { data_sources: Datasource[] };
    return body.data_sources;
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

  async function createQuery(params: CreateQueryParams): Promise<CreateQueryResult> {
    const res = await auth.authedFetch(
      `/api/data-queries/data-sources/${params.dataSourceId}/versions/${params.versionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'tooljetdb', name: params.name, options: params.options }),
      }
    );
    await assertOk(res, 'createQuery');
    const body = (await res.json()) as { id: string; name: string };
    return { query_id: body.id, name: body.name };
  }

  // Batch: create many queries in one tool call. No native bulk-create endpoint, so fan out
  // (in parallel) to the single-create route — saves model round-trips even though it's N HTTP calls.
  async function createQueries(params: CreateQueriesParams): Promise<CreateQueryResult[]> {
    return Promise.all(
      params.queries.map((q) =>
        createQuery({ versionId: params.versionId, dataSourceId: q.dataSourceId, name: q.name, options: q.options })
      )
    );
  }

  function buildComponentDto(spec: ComponentSpec): Record<string, unknown> {
    const dto: Record<string, unknown> = {
      name: spec.name,
      type: spec.type,
      properties: spec.properties,
      styles: {},
      validation: {},
      others: {},
    };
    // layouts are keyed by resolution type (desktop/mobile) — a flat {top,left,...}
    // returns 422 "invalid input value for enum layout_type". Apply the same layout to both.
    if (spec.layout) dto.layouts = { desktop: spec.layout, mobile: spec.layout };
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
      components: [{ name: params.name, type: params.type, properties: params.properties, layout: params.layout }],
    });
    return { component_id: r.component_id };
  }

  return {
    createApp,
    getApp,
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
  };
}
