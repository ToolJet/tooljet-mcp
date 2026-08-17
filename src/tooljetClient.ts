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

export interface ToolJetClient {
  createApp(name: string): Promise<CreateAppResult>;
  getApp(appId: string): Promise<any>;
  getDevelopmentEnvironmentId(): Promise<string>;
  listDatasources(versionId: string): Promise<Datasource[]>;
  listTables(): Promise<Array<{ id: string; table_name: string }>>;
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
    getDevelopmentEnvironmentId,
    listDatasources,
    listTables,
    createQuery,
    createQueries,
    createComponent,
    createComponents,
  };
}
