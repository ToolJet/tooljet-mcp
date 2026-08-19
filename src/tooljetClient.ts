import { randomUUID } from 'node:crypto';
import type { Auth, Workspace } from './auth.js';
import type { Config } from './config.js';
import { STYLE_KEYS_IN_PROPERTIES } from './lint.js';
import { decodeComponentParent, encodeComponentParent, type ComponentSlotName } from './componentParent.js';
import { tableCreationLevels, TOOLJET_DB_RESERVED_COLUMN_NAMES } from './tableValidation.js';

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

/** A multi-request batch persisted some items before an upstream failure. Callers must report
 * completed items and must not retry the whole batch or auto-delete user resources. */
export class PartialWriteError<T> extends Error {
  readonly completed: T[];
  readonly failures: string[];

  constructor(operation: string, completed: T[], failures: string[]) {
    super(
      `ToolJet ${operation} partially failed. Persisted before failure: ${JSON.stringify(completed)}. ` +
        `Failed: ${failures.join(' | ')}. Persisted resources were not deleted automatically.`
    );
    this.name = 'PartialWriteError';
    this.completed = completed;
    this.failures = failures;
  }
}

export function completedPartialWrites<T>(error: unknown): T[] {
  return error instanceof PartialWriteError ? error.completed as T[] : [];
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
  /** Caller-stable reference used only inside one createComponents batch. */
  clientRef?: string;
  /** Parent another component in the same batch by its clientRef. */
  parentRef?: string;
  /** Parent an already-existing component by its ToolJet component id. */
  parent?: string;
  /** Logical parent slot. ToolJet stores header/footer as suffixed parent ids; the client translates it. */
  slotName?: ComponentSlotName;
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
  /** Database default. False, 0, and empty strings are preserved. */
  defaultValue?: unknown;
  /** Type-specific ToolJet DB metadata, for example a timestamp timezone. */
  configurations?: Record<string, unknown>;
}

function assertAllowedToolJetDbColumnNames(operation: 'createTable' | 'addTableColumn', columns: TableColumn[]): void {
  const reserved = columns
    .map((column) => column.name)
    .filter((name) => TOOLJET_DB_RESERVED_COLUMN_NAMES.has(name.toLowerCase()));
  if (reserved.length) {
    throw new Error(
      `ToolJet ${operation} failed: reserved column name${reserved.length === 1 ? '' : 's'}: ${reserved.join(', ')}. ` +
        'Use a descriptive name such as step_action or result_comment.'
    );
  }
}

export type ForeignKeyAction = 'RESTRICT' | 'NO ACTION' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT';

export interface TableForeignKey {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: ForeignKeyAction;
  onUpdate?: ForeignKeyAction;
}

export interface CreateTableParams {
  tableName: string;
  columns: TableColumn[];
  foreignKeys?: TableForeignKey[];
}

export interface CreateTableResult {
  table_id: string;
  table_name: string;
}

export interface CreateTablesParams {
  tables: CreateTableParams[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue?: unknown;
  configurations?: Record<string, unknown>;
  foreignKeys: TableForeignKey[];
}

export interface InsertRowsParams {
  tableName: string;
  rows: Array<Record<string, unknown>>;
}

export interface InsertRowsBatchParams {
  tables: InsertRowsParams[];
}

export interface InsertRowsBatchResult {
  table_name: string;
  processed_rows: number;
}

export interface CreatePageParams {
  appId: string;
  versionId: string;
  name: string;
  /** Tabler icon name, e.g. "IconLayoutDashboard". Defaults to ToolJet's "IconFile" if omitted. */
  icon?: string;
  /** Hide the page from the auto-generated sidebar nav (still reachable via switch-page). For detail/sub-pages. */
  hidden?: boolean;
}

export interface CreatePageResult {
  page_id: string;
  name: string;
  index: number;
  icon?: string;
  hidden?: boolean;
}

export interface CreatePagesParams {
  appId: string;
  versionId: string;
  pages: Array<{ name: string; icon?: string; hidden?: boolean }>;
}

export interface UpdatePageSpec {
  pageId: string;
  name?: string;
  icon?: string;
  hidden?: boolean;
}

export interface DeletePageParams {
  appId: string;
  versionId: string;
  pageId: string;
  deleteAssociatedPages?: boolean;
}

export interface UpdatePagesParams {
  appId: string;
  versionId: string;
  updates?: UpdatePageSpec[];
  /** Complete ordered list of the app's current page ids. */
  order?: string[];
}

export interface UpdatePagesResult {
  updated_fields: number;
  reordered: boolean;
  pages: Array<{
    page_id: string;
    name?: string;
    handle?: string;
    icon?: string;
    hidden: boolean;
    index?: number;
  }>;
}

export interface AddTableColumnParams {
  tableName: string;
  column: TableColumn;
  foreignKeys?: TableForeignKey[];
}

export interface InvokeDatasourceMethodParams {
  dataSourceId: string;
  method: string;
  environmentId?: string;
  args?: Record<string, unknown>;
}

export type EventSourceType = 'component' | 'data_query' | 'page' | 'table_column' | 'table_action';

/** One event handler: a trigger on a component, query, page, or component sub-element + an action. */
export interface EventSpec {
  /** The component, data query, or page id the event is attached to. Table sub-elements use the Table id. */
  sourceId: string;
  /** Source kind. Modern Table row buttons use table_column; table_action is legacy/deprecated. */
  sourceType: EventSourceType;
  /** Sub-element reference. Table Button columns use `<column key or name>::<button id>`. */
  ref?: string;
  /** The trigger event id, e.g. onClick, onDataQuerySuccess, onDataQueryFailure, onPageLoad. */
  trigger: string;
  /** The action: { actionId, ...params }, e.g. { actionId: 'run-query', queryId, queryName }. */
  action: Record<string, unknown>;
  /** Optional readable event name. A deterministic name is generated when omitted. */
  name?: string;
}

export interface CreateEventsParams {
  appId: string;
  versionId: string;
  events: EventSpec[];
  /** Persisted events from a fresh app summary, used to append deterministic indices. */
  existingEvents: AppSummary['events'];
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
  parent?: string;
  /** Present for persisted header/footer children. Body children use the plain parent id. */
  slot_name?: ComponentSlotName;
}

/** Compact projection of a whole app — what an authoring agent needs, without the ~10× schema bloat
 *  that the raw GET /api/apps/:id carries (each component embeds its full widget property schema). */
export interface AppSummary {
  app_id: string;
  name?: string;
  version_id?: string;
  pages: Array<{
    id: string;
    name?: string;
    handle?: string;
    icon?: string;
    hidden?: boolean;
    index?: number;
    is_page_group?: boolean;
    page_group_id?: string;
    components: ComponentSummary[];
  }>;
  queries: Array<{ id: string; name?: string; kind?: string; data_source_id?: string; options?: unknown }>;
  events: Array<{ id: string; name?: string; sourceId?: string; target?: string; event?: unknown; index?: number }>;
}

export interface QuerySummary {
  id: string;
  name?: string;
  kind?: string;
  data_source_id?: string;
  options?: unknown;
}

export interface ToolJetClient {
  listWorkspaces(): Promise<Workspace[]>;
  useWorkspace(workspaceId: string): Promise<Workspace>;
  createApp(name: string): Promise<CreateAppResult>;
  getApp(appId: string): Promise<any>;
  getAppSummary(appId: string): Promise<AppSummary>;
  getComponent(appId: string, componentId: string): Promise<ComponentSummary & { page_id: string }>;
  createPage(params: CreatePageParams): Promise<CreatePageResult>;
  createPages(params: CreatePagesParams): Promise<CreatePageResult[]>;
  updatePages(params: UpdatePagesParams): Promise<UpdatePagesResult>;
  deletePage(params: DeletePageParams): Promise<{ deleted: boolean }>;
  createEvents(params: CreateEventsParams): Promise<{ created: number }>;
  getDevelopmentEnvironmentId(): Promise<string>;
  listDatasources(versionId: string): Promise<Datasource[]>;
  listTables(): Promise<Array<{ id: string; table_name: string }>>;
  createTable(params: CreateTableParams): Promise<CreateTableResult>;
  createTables(params: CreateTablesParams): Promise<CreateTableResult[]>;
  addTableColumn(params: AddTableColumnParams): Promise<{ added: boolean }>;
  dropTableColumn(params: { tableName: string; columnName: string }): Promise<{ dropped: boolean }>;
  dropTable(params: { tableName: string }): Promise<{ dropped: boolean }>;
  getTableSchema(tableName: string): Promise<SchemaColumn[]>;
  insertRows(params: InsertRowsParams): Promise<{ processed_rows: number }>;
  insertRowsBatch(params: InsertRowsBatchParams): Promise<InsertRowsBatchResult[]>;
  createQuery(params: CreateQueryParams): Promise<CreateQueryResult>;
  createQueries(params: CreateQueriesParams): Promise<CreateQueryResult[]>;
  createComponent(params: CreateComponentParams): Promise<CreateComponentResult>;
  createComponents(params: CreateComponentsParams): Promise<Array<CreateComponentResult & { name: string }>>;
  updateComponents(params: UpdateComponentsParams): Promise<{ updated: number }>;
  deleteComponents(params: DeleteComponentsParams): Promise<{ deleted: number }>;
  updateLayouts(params: UpdateLayoutsParams): Promise<{ updated: number }>;
  updateQuery(params: UpdateQueryParams): Promise<{ query_id: string }>;
  updateQueryDatasource(params: { queryId: string; versionId: string; dataSourceId: string }): Promise<void>;
  deleteQuery(params: { queryId: string; versionId: string }): Promise<{ deleted: boolean }>;
  getQueries(versionId: string): Promise<QuerySummary[]>;
  getQuery(queryId: string, versionId: string): Promise<QuerySummary>;
  runQuery(params: { queryId: string; versionId: string; environmentId?: string }): Promise<RunQueryResult>;
  invokeDatasourceMethod(params: InvokeDatasourceMethodParams): Promise<RunQueryResult>;
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
  slotName?: ComponentSlotName;
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
  layouts: Array<{
    componentId: string;
    desktop?: ComponentLayout;
    mobile?: ComponentLayout;
    parent?: string;
    slotName?: ComponentSlotName;
  }>;
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

function tableColumnDto(column: TableColumn): Record<string, unknown> {
  return {
    column_name: column.name,
    data_type: normalizeType(column.type),
    constraints_type: {
      is_not_null: !!column.notNull || !!column.primaryKey,
      is_primary_key: !!column.primaryKey,
      is_unique: !!column.unique || !!column.primaryKey,
    },
    ...(column.defaultValue !== undefined ? { column_default: column.defaultValue } : {}),
    ...(column.configurations ? { configurations: column.configurations } : {}),
  };
}

function tableForeignKeyDto(foreignKey: TableForeignKey): Record<string, unknown> {
  return {
    column_names: foreignKey.columns,
    referenced_table_name: foreignKey.referencedTable,
    referenced_column_names: foreignKey.referencedColumns,
    ...(foreignKey.onDelete ? { on_delete: foreignKey.onDelete } : {}),
    ...(foreignKey.onUpdate ? { on_update: foreignKey.onUpdate } : {}),
  };
}

export function createClient(auth: Auth, config: Config): ToolJetClient {
  let developmentEnvironmentIdPromise: Promise<string> | undefined;
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
    const persistedParent = typeof c.parent === 'string' ? c.parent : undefined;
    const decodedParent = persistedParent ? decodeComponentParent(persistedParent) : undefined;
    return {
      id,
      name: c.name,
      type: c.component,
      layouts: entry?.layouts,
      properties: def.properties,
      styles: def.styles,
      others: def.others,
      ...(persistedParent ? { parent: persistedParent } : {}),
      ...(decodedParent && decodedParent.slotName !== 'body' ? { slot_name: decodedParent.slotName } : {}),
    };
  }

  async function getAppSummary(appId: string): Promise<AppSummary> {
    const full = await getApp(appId);
    const pages = (full.pages ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      handle: p.handle,
      icon: p.icon,
      hidden: p.hidden?.value === true,
      ...(typeof p.index === 'number' ? { index: p.index } : {}),
      ...(typeof p.isPageGroup === 'boolean' ? { is_page_group: p.isPageGroup } : {}),
      ...(typeof p.pageGroupId === 'string' ? { page_group_id: p.pageGroupId } : {}),
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
      ...(typeof e.index === 'number' ? { index: e.index } : {}),
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

  async function listWorkspaces(): Promise<Workspace[]> {
    return auth.listWorkspaces();
  }

  async function useWorkspace(workspaceId: string): Promise<Workspace> {
    return auth.switchWorkspace(workspaceId);
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

  async function createPages(params: CreatePagesParams): Promise<CreatePageResult[]> {
    // Page order = append after existing pages. Precompute ids/indexes and create the batch concurrently.
    const app = await getApp(params.appId);
    const existingPages = app.pages ?? [];
    const highestPersistedIndex = existingPages.reduce(
      (highest: number, page: any) =>
        typeof page.index === 'number' && Number.isFinite(page.index)
          ? Math.max(highest, page.index)
          : highest,
      0
    );
    // ToolJet's initial Home page starts at index 1. Older payloads can omit index, so fall back
    // to the current page count instead of reusing an occupied index.
    const startIndex = Math.max(highestPersistedIndex, existingPages.length) + 1;
    const handleOf = (name: string): string =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'page';
    const existingNames = new Set((app.pages ?? []).map((page: any) => String(page.name).toLowerCase()));
    const existingHandles = new Set((app.pages ?? []).map((page: any) => String(page.handle).toLowerCase()));
    const seenNames = new Set<string>();
    const seenHandles = new Set<string>();
    const entries = params.pages.map((page, offset) => {
      const nameKey = page.name.toLowerCase();
      const handle = handleOf(page.name);
      if (existingNames.has(nameKey) || seenNames.has(nameKey)) {
        throw new Error(`ToolJet createPages failed: duplicate page name "${page.name}".`);
      }
      if (existingHandles.has(handle) || seenHandles.has(handle)) {
        throw new Error(`ToolJet createPages failed: page "${page.name}" resolves to duplicate handle "${handle}".`);
      }
      seenNames.add(nameKey);
      seenHandles.add(handle);
      return { ...page, id: randomUUID(), handle, index: startIndex + offset };
    });

    const createSettled = await Promise.allSettled(entries.map(async (page) => {
      const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: page.id,
          name: page.name,
          handle: page.handle,
          index: page.index,
          ...(page.icon ? { icon: page.icon } : {}),
        }),
      });
      await assertOk(res, `createPages "${page.name}"`);
      return page;
    }));
    const createdEntries = createSettled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const failures = createSettled.flatMap((result, index) => result.status === 'rejected'
      ? [`${entries[index]!.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
      : []);

    // ToolJet's create-page service ignores `icon` and `hidden`, even though the DTO accepts them.
    // Persist them via the update route — which applies a single-field diff (a diff with >1 key throws
    // "Can not update multiple pages"), so send ONE field per call. `hidden: { value: true }` removes the
    // page from the sidebar nav. Read back afterwards so a silent drop cannot look successful.
    const metadataTasks = createdEntries.flatMap((page) => [
      ...(page.icon
        ? [{ page, field: 'icon', promise: persistFieldForPage(page.id, 'icon', page.icon, `createPages "${page.name}" icon update`) }]
        : []),
      ...(page.hidden
        ? [{ page, field: 'hidden', promise: persistFieldForPage(page.id, 'hidden', { value: true }, `createPages "${page.name}" hidden update`) }]
        : []),
    ]);
    const metadataSettled = await Promise.allSettled(metadataTasks.map((task) => task.promise));
    failures.push(...metadataSettled.flatMap((result, index) => result.status === 'rejected'
      ? [`${metadataTasks[index]!.page.name} ${metadataTasks[index]!.field}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
      : []));

    let persistedById = new Map<string, any>();
    if (createdEntries.some((page) => page.icon || page.hidden)) {
      try {
        const refreshed = await getApp(params.appId);
        persistedById = new Map((refreshed.pages ?? []).map((page: any) => [page.id, page]));
        for (const entry of createdEntries) {
          const page = persistedById.get(entry.id);
          if (entry.icon && page?.icon !== entry.icon) {
            failures.push(`page "${entry.name}" exists, but sidebar icon "${entry.icon}" did not persist`);
          }
          if (entry.hidden && page?.hidden?.value !== true) {
            failures.push(`page "${entry.name}" exists, but hidden-from-sidebar did not persist`);
          }
        }
      } catch (error) {
        failures.push(`page metadata readback: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const completed = createdEntries.map((page) => ({
      page_id: page.id,
      name: page.name,
      index: page.index,
      ...(persistedById.get(page.id)?.icon ? { icon: persistedById.get(page.id).icon as string } : {}),
      ...(persistedById.get(page.id)?.hidden?.value === true ? { hidden: true } : {}),
    }));
    if (failures.length) throw new PartialWriteError('createPages', completed, failures);
    return completed;

    async function persistFieldForPage(pageId: string, field: string, value: unknown, label: string): Promise<void> {
      const r = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, diff: { [field]: value } }),
      });
      await assertOk(r, label);
    }
  }

  async function createPage(params: CreatePageParams): Promise<CreatePageResult> {
    const [page] = await createPages({
      appId: params.appId,
      versionId: params.versionId,
      pages: [{ name: params.name, icon: params.icon, hidden: params.hidden }],
    });
    return page;
  }

  async function updatePages(params: UpdatePagesParams): Promise<UpdatePagesResult> {
    const updates = params.updates ?? [];
    const order = params.order;
    if (!updates.length && !order) {
      throw new Error('ToolJet updatePages failed: provide at least one page update or a complete page order.');
    }

    const app = await getApp(params.appId);
    const pages: any[] = app.pages ?? [];
    const pagesById = new Map(pages.map((page) => [String(page.id), page]));
    const seenUpdateIds = new Set<string>();
    for (const update of updates) {
      if (!pagesById.has(update.pageId)) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" does not exist.`);
      }
      if (seenUpdateIds.has(update.pageId)) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" is updated more than once.`);
      }
      seenUpdateIds.add(update.pageId);
      if (update.name === undefined && update.icon === undefined && update.hidden === undefined) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" has no changed fields.`);
      }
      if (update.name !== undefined && !update.name.trim()) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" has an empty name.`);
      }
      if (update.icon !== undefined && !update.icon.trim()) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" has an empty icon.`);
      }
    }

    const requestedNames = new Map(updates.map((update) => [update.pageId, update.name]));
    const finalNames = pages.map((page) => {
      const kind = page.isPageGroup === true ? 'group' : 'page';
      const name = String(requestedNames.get(String(page.id)) ?? page.name ?? '').trim().toLowerCase();
      return `${kind}:${name}`;
    });
    if (new Set(finalNames).size !== finalNames.length) {
      throw new Error('ToolJet updatePages failed: page names must remain unique.');
    }

    if (order) {
      const orderedIds = new Set(order);
      if (order.length !== pages.length || orderedIds.size !== order.length) {
        throw new Error('ToolJet updatePages failed: order must contain every current page id exactly once.');
      }
      const missing = pages.filter((page) => !orderedIds.has(String(page.id))).map((page) => page.id);
      if (missing.length || order.some((pageId) => !pagesById.has(pageId))) {
        throw new Error('ToolJet updatePages failed: order must contain every current page id exactly once.');
      }
    }

    const fieldUpdates: Array<{ pageId: string; field: string; value: unknown }> = [];
    for (const update of updates) {
      const current = pagesById.get(update.pageId);
      if (update.name !== undefined && update.name !== current.name) {
        fieldUpdates.push({ pageId: update.pageId, field: 'name', value: update.name });
      }
      if (update.icon !== undefined && update.icon !== current.icon) {
        fieldUpdates.push({ pageId: update.pageId, field: 'icon', value: update.icon });
      }
      if (update.hidden !== undefined && update.hidden !== (current.hidden?.value === true)) {
        fieldUpdates.push({ pageId: update.pageId, field: 'hidden', value: { value: update.hidden } });
      }
    }

    // ToolJet's page update service accepts one changed field per request.
    await Promise.all(fieldUpdates.map(async ({ pageId, field, value }) => {
      const response = await auth.authedFetch(
        `/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId, diff: { [field]: value } }),
        }
      );
      await assertOk(response, `updatePages ${pageId}.${field}`);
    }));

    if (order) {
      const diff = Object.fromEntries(order.map((pageId, index) => [pageId, { index }]));
      const response = await auth.authedFetch(
        `/api/v2/apps/${params.appId}/versions/${params.versionId}/pages/reorder`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diff }),
        }
      );
      await assertOk(response, 'updatePages reorder');
    }

    const refreshed = await getApp(params.appId);
    const refreshedPages: any[] = refreshed.pages ?? [];
    const refreshedById = new Map(refreshedPages.map((page) => [String(page.id), page]));
    for (const update of updates) {
      const page = refreshedById.get(update.pageId);
      if (update.name !== undefined && page?.name !== update.name) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" name did not persist.`);
      }
      if (update.icon !== undefined && page?.icon !== update.icon) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" icon did not persist.`);
      }
      if (update.hidden !== undefined && (page?.hidden?.value === true) !== update.hidden) {
        throw new Error(`ToolJet updatePages failed: page "${update.pageId}" hidden state did not persist.`);
      }
    }
    if (order) {
      for (const [index, pageId] of order.entries()) {
        if (refreshedById.get(pageId)?.index !== index) {
          throw new Error(`ToolJet updatePages failed: page order did not persist at index ${index}.`);
        }
      }
    }

    return {
      updated_fields: fieldUpdates.length,
      reordered: order !== undefined,
      pages: refreshedPages
        .slice()
        .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
        .map((page) => ({
          page_id: page.id,
          name: page.name,
          handle: page.handle,
          icon: page.icon,
          hidden: page.hidden?.value === true,
          ...(typeof page.index === 'number' ? { index: page.index } : {}),
        })),
    };
  }

  async function createEvents(params: CreateEventsParams): Promise<{ created: number }> {
    // Each event → { event: { eventId: <trigger>, ref?, ...action }, eventType, attachedTo, index }.
    // index is ordered independently for each source; component sub-elements also scope it by ref,
    // matching EventManager's per-button ordering for Table column buttons.
    const indexBySource: Record<string, number> = {};
    for (const existing of params.existingEvents) {
      if (!existing.sourceId || !existing.target || typeof existing.index !== 'number') continue;
      const raw = existing.event && typeof existing.event === 'object' && !Array.isArray(existing.event)
        ? existing.event as Record<string, unknown>
        : undefined;
      const ref = typeof raw?.ref === 'string' ? raw.ref : '';
      const sourceKey = `${existing.target}:${existing.sourceId}:${ref}`;
      indexBySource[sourceKey] = Math.max(indexBySource[sourceKey] ?? 0, existing.index + 1);
    }
    const events = params.events.map((e) => {
      const sourceKey = `${e.sourceType}:${e.sourceId}:${e.ref ?? ''}`;
      const index = indexBySource[sourceKey] ?? 0;
      indexBySource[sourceKey] = index + 1;
      const action =
        e.action.actionId === 'control-component' && e.action.componentSpecificActionParams === undefined
          ? { ...e.action, componentSpecificActionParams: [] }
          : e.action;
      return {
        // name is NOT NULL server-side (the DTO marks it optional but the column requires it).
        name: e.name ?? `${e.trigger} → ${(e.action.actionId as string) ?? 'action'}`,
        event: { eventId: e.trigger, ...(e.ref ? { ref: e.ref } : {}), ...action },
        eventType: e.sourceType,
        attachedTo: e.sourceId,
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
    if (!developmentEnvironmentIdPromise) {
      developmentEnvironmentIdPromise = (async () => {
        const res = await auth.authedFetch('/api/app-environments');
        await assertOk(res, 'getDevelopmentEnvironmentId');
        const body = await res.json();
        const envs: Array<{ id: string; name: string }> = Array.isArray(body) ? body : body.environments;
        const dev = envs.find((e) => e.name === 'development');
        if (!dev) {
          throw new Error('ToolJet getDevelopmentEnvironmentId failed: no development environment found');
        }
        return dev.id;
      })().catch((error) => {
        developmentEnvironmentIdPromise = undefined;
        throw error;
      });
    }
    return developmentEnvironmentIdPromise;
  }

  async function listDatasources(versionId: string): Promise<Datasource[]> {
    const [orgId, envId] = await Promise.all([auth.getOrganizationId(), getDevelopmentEnvironmentId()]);
    // The route retains versionId for API compatibility, but ToolJet resolves workspace/global sources
    // available to this user + environment; a new app does not need a per-app datasource-link operation.
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
    assertAllowedToolJetDbColumnNames('createTable', params.columns);
    const columnNames = new Set(params.columns.map((column) => column.name));
    for (const foreignKey of params.foreignKeys ?? []) {
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) {
        throw new Error(
          `ToolJet createTable failed: foreign key columns and referencedColumns must have the same length.`
        );
      }
      const missing = foreignKey.columns.filter((column) => !columnNames.has(column));
      if (missing.length) {
        throw new Error(`ToolJet createTable failed: foreign key references missing local columns: ${missing.join(', ')}`);
      }
    }
    const orgId = await auth.getOrganizationId();
    let cols = params.columns.map(tableColumnDto);
    // Every tjdb table needs a primary key; if none was specified, prepend a serial `id`.
    if (!params.columns.some((column) => column.primaryKey)) {
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
      body: JSON.stringify({
        table_name: params.tableName,
        columns: cols,
        ...(params.foreignKeys?.length
          ? {
              foreign_keys: params.foreignKeys.map(tableForeignKeyDto),
            }
          : {}),
      }),
    });
    await assertOk(res, 'createTable');
    const body = (await res.json()) as { result: { id: string; table_name: string } };
    return { table_id: body.result.id, table_name: body.result.table_name };
  }

  async function createTables(params: CreateTablesParams): Promise<CreateTableResult[]> {
    const levels = tableCreationLevels(params.tables);
    const created: CreateTableResult[] = [];
    for (const level of levels) {
      const settled = await Promise.allSettled(level.map((table) => createTable(table)));
      const failures: string[] = [];
      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') created.push(result.value);
        else failures.push(`${level[index].tableName}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      });
      if (failures.length) {
        throw new PartialWriteError('createTables', created, failures);
      }
    }
    const byName = new Map(created.map((table) => [table.table_name.toLowerCase(), table]));
    return params.tables.map((table) => byName.get(table.tableName.toLowerCase())!);
  }

  async function addTableColumn(params: AddTableColumnParams): Promise<{ added: boolean }> {
    assertAllowedToolJetDbColumnNames('addTableColumn', [params.column]);
    for (const foreignKey of params.foreignKeys ?? []) {
      if (!foreignKey.columns.includes(params.column.name)) {
        throw new Error(
          `ToolJet addTableColumn failed: foreign key must include the new column "${params.column.name}".`
        );
      }
      if (foreignKey.columns.length !== foreignKey.referencedColumns.length) {
        throw new Error(
          'ToolJet addTableColumn failed: foreign key columns and referencedColumns must have the same length.'
        );
      }
    }
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(
      `/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}/column`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column: tableColumnDto(params.column),
          foreign_keys: (params.foreignKeys ?? []).map(tableForeignKeyDto),
        }),
      }
    );
    await assertOk(res, 'addTableColumn');
    return { added: true };
  }

  async function dropTableColumn(params: {
    tableName: string;
    columnName: string;
  }): Promise<{ dropped: boolean }> {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(
      `/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}/column/${encodeURIComponent(params.columnName)}`,
      { method: 'DELETE' }
    );
    await assertOk(res, 'dropTableColumn');
    return { dropped: true };
  }

  async function dropTable(params: { tableName: string }): Promise<{ dropped: boolean }> {
    const orgId = await auth.getOrganizationId();
    const res = await auth.authedFetch(
      `/api/tooljet-db/organizations/${orgId}/table/${encodeURIComponent(params.tableName)}`,
      { method: 'DELETE' }
    );
    await assertOk(res, 'dropTable');
    return { dropped: true };
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
          column_default?: unknown;
          configurations?: Record<string, unknown>;
          constraints_type?: { is_primary_key?: boolean; is_not_null?: boolean; is_unique?: boolean };
        }>;
        foreign_keys?: Array<{
          column_names: string[];
          referenced_table_name: string;
          referenced_column_names: string[];
          on_delete?: ForeignKeyAction;
          on_update?: ForeignKeyAction;
        }>;
        configurations?: {
          columns?: {
            column_names?: Record<string, string>;
            configurations?: Record<string, Record<string, unknown>>;
          };
        };
      };
    };
    return body.result.columns.map((c) => {
      const columnUuid = body.result.configurations?.columns?.column_names?.[c.column_name];
      const configurations =
        c.configurations ??
        (columnUuid ? body.result.configurations?.columns?.configurations?.[columnUuid] : undefined);
      return {
        name: c.column_name,
        type: c.data_type,
        isPrimaryKey: !!c.constraints_type?.is_primary_key,
        isNotNull: !!c.constraints_type?.is_not_null,
        isUnique: !!c.constraints_type?.is_unique,
        ...(c.column_default !== undefined ? { defaultValue: c.column_default } : {}),
        ...(configurations ? { configurations } : {}),
        foreignKeys: (body.result.foreign_keys ?? [])
          .filter((foreignKey) => foreignKey.column_names.includes(c.column_name))
          .map((foreignKey) => ({
            columns: foreignKey.column_names,
            referencedTable: foreignKey.referenced_table_name,
            referencedColumns: foreignKey.referenced_column_names,
            ...(foreignKey.on_delete ? { onDelete: foreignKey.on_delete } : {}),
            ...(foreignKey.on_update ? { onUpdate: foreignKey.on_update } : {}),
          })),
      };
    });
  }

  async function insertRows(params: InsertRowsParams): Promise<{ processed_rows: number }> {
    if (!params.rows.length) return { processed_rows: 0 };
    const schema = await getTableSchema(params.tableName);
    const rows = params.rows.map((r) => ({ ...r }));
    const generatedPrimaryKey = schema.find(
      (column) => column.isPrimaryKey && (
        /serial/i.test(column.type) || /^nextval\(/i.test(String(column.defaultValue ?? ''))
      )
    );
    if (generatedPrimaryKey && rows.some((row) => generatedPrimaryKey.name in row)) {
      throw new Error(
        `insertRows: omit generated primary key "${generatedPrimaryKey.name}" for table "${params.tableName}". ` +
          'ToolJet will allocate it from the real table sequence; explicit generated ids can collide or desynchronize future inserts.'
      );
    }

    const table = (await listTables()).find((candidate) => candidate.table_name === params.tableName);
    if (!table) throw new Error(`insertRows: ToolJet DB table "${params.tableName}" was not found in the active workspace.`);

    // Use PostgREST's ordinary INSERT path. Unlike bulk-upload, this endpoint does not upsert on
    // primary-key conflicts, and omitted serial/generated keys use the table's real sequence.
    const res = await auth.authedFetch(
      `/api/tooljet-db/proxy/${encodeURIComponent(table.id)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      }
    );
    await assertOk(res, 'insertRows');
    const inserted = await res.json().catch(() => undefined);
    return { processed_rows: Array.isArray(inserted) ? inserted.length : rows.length };
  }

  async function insertRowsBatch(params: InsertRowsBatchParams): Promise<InsertRowsBatchResult[]> {
    const results: InsertRowsBatchResult[] = [];
    for (const table of params.tables) {
      try {
        const result = await insertRows(table);
        results.push({ table_name: table.tableName, processed_rows: result.processed_rows });
      } catch (error) {
        throw new PartialWriteError('insertRowsBatch', results, [
          `${table.tableName}: ${error instanceof Error ? error.message : String(error)}`,
        ]);
      }
    }
    return results;
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
    const settled = await Promise.allSettled(
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
    const completed = settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
    const failures = settled.flatMap((result, index) => result.status === 'rejected'
      ? [`${params.queries[index]!.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
      : []);
    if (failures.length) throw new PartialWriteError('createQueries', completed, failures);
    return completed;
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
    const refToId = new Map<string, string>();
    for (const e of entries) {
      if (!e.spec.clientRef) continue;
      if (refToId.has(e.spec.clientRef)) {
        throw new Error(`createComponents: duplicate clientRef "${e.spec.clientRef}".`);
      }
      refToId.set(e.spec.clientRef, e.id);
    }
    const diff: Record<string, unknown> = {};
    for (const e of entries) {
      if (e.spec.parent && e.spec.parentRef) {
        throw new Error(`createComponents "${e.spec.name}": set EITHER parent or parentRef, not both.`);
      }
      const dto = buildComponentDto(e.spec);
      const resolvedParent = e.spec.parentRef ? refToId.get(e.spec.parentRef) : e.spec.parent;
      if (e.spec.parentRef && !resolvedParent) {
        throw new Error(
          `createComponents "${e.spec.name}": parentRef "${e.spec.parentRef}" does not match a clientRef in this batch.`
        );
      }
      if (e.spec.slotName && !resolvedParent) {
        throw new Error(`createComponents "${e.spec.name}": slotName requires parent or parentRef.`);
      }
      if (resolvedParent) dto.parent = encodeComponentParent(resolvedParent, e.spec.slotName);
      diff[e.id] = dto;
    }

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
      const hasRaw = u.name !== undefined || u.parent !== undefined || u.slotName !== undefined;
      if (hasDef && hasRaw) {
        throw new Error(
          `updateComponents "${u.componentId}": set EITHER definition (properties/styles/…) OR name/parent/slotName ` +
            `in one entry — ToolJet applies only one path. Split into two update calls.`
        );
      }
      if (u.slotName !== undefined && u.parent === undefined) {
        throw new Error(`updateComponents "${u.componentId}": slotName requires parent.`);
      }
      if (hasDef) {
        diff[u.componentId] = { component: { definition: u.definition } };
      } else {
        diff[u.componentId] = {
          component: {
            ...(u.name !== undefined ? { name: u.name } : {}),
            ...(u.parent !== undefined ? { parent: encodeComponentParent(u.parent, u.slotName) } : {}),
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
      if (l.slotName !== undefined && l.parent === undefined) {
        throw new Error(`updateLayouts "${l.componentId}": slotName requires parent.`);
      }
      if (l.parent !== undefined) entry.component = { parent: encodeComponentParent(l.parent, l.slotName) };
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

  async function updateQueryDatasource(params: {
    queryId: string;
    versionId: string;
    dataSourceId: string;
  }): Promise<void> {
    const res = await auth.authedFetch(
      `/api/data-queries/${params.queryId}/versions/${params.versionId}/data-source`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_source_id: params.dataSourceId }),
      }
    );
    await assertOk(res, 'updateQueryDatasource');
  }

  async function deleteQuery(params: { queryId: string; versionId: string }): Promise<{ deleted: boolean }> {
    const res = await auth.authedFetch(
      `/api/data-queries/${params.queryId}/versions/${params.versionId}`,
      { method: 'DELETE' }
    );
    await assertOk(res, 'deleteQuery');
    return { deleted: true };
  }

  async function deletePage(params: DeletePageParams): Promise<{ deleted: boolean }> {
    const res = await auth.authedFetch(
      `/api/v2/apps/${params.appId}/versions/${params.versionId}/pages`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: params.pageId,
          deleteAssociatedPages: params.deleteAssociatedPages ?? false,
        }),
      }
    );
    await assertOk(res, 'deletePage');
    return { deleted: true };
  }

  async function getQueries(versionId: string): Promise<QuerySummary[]> {
    const res = await auth.authedFetch(`/api/data-queries/${versionId}`);
    await assertOk(res, 'getQueries');
    const body = (await res.json()) as { data_queries?: QuerySummary[] };
    return body.data_queries ?? [];
  }

  async function getQuery(queryId: string, versionId: string): Promise<QuerySummary> {
    const query = (await getQueries(versionId)).find((candidate) => candidate.id === queryId);
    if (!query) throw new Error(`ToolJet getQuery failed: query ${queryId} not found in version ${versionId}`);
    return query;
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

  async function invokeDatasourceMethod(params: InvokeDatasourceMethodParams): Promise<RunQueryResult> {
    const environmentId = params.environmentId ?? (await getDevelopmentEnvironmentId());
    const res = await auth.authedFetch(`/api/data-sources/${params.dataSourceId}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: params.method,
        environmentId,
        ...(params.args ? { args: params.args } : {}),
      }),
    });
    await assertOk(res, 'invokeDatasourceMethod');
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
    listWorkspaces,
    useWorkspace,
    createApp,
    getApp,
    getAppSummary,
    getComponent,
    createPage,
    createPages,
    updatePages,
    deletePage,
    createEvents,
    getDevelopmentEnvironmentId,
    listDatasources,
    listTables,
    createTable,
    createTables,
    addTableColumn,
    dropTableColumn,
    dropTable,
    getTableSchema,
    insertRows,
    insertRowsBatch,
    createQuery,
    createQueries,
    createComponent,
    createComponents,
    updateComponents,
    deleteComponents,
    updateLayouts,
    updateQuery,
    updateQueryDatasource,
    deleteQuery,
    getQueries,
    getQuery,
    runQuery,
    invokeDatasourceMethod,
    listEvents,
    updateEvents,
    deleteEvent,
  };
}
