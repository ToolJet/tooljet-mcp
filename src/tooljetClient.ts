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
  type: string;
  properties: Record<string, unknown>;
  layout?: ComponentLayout;
}

export interface CreateComponentResult {
  component_id: string;
}

export interface ToolJetClient {
  createApp(name: string): Promise<CreateAppResult>;
  getApp(appId: string): Promise<any>;
  getDevelopmentEnvironmentId(): Promise<string>;
  listDatasources(versionId: string): Promise<Datasource[]>;
  createQuery(params: CreateQueryParams): Promise<CreateQueryResult>;
  createComponent(params: CreateComponentParams): Promise<CreateComponentResult>;
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
    const created = (await createRes.json()) as { id: string };

    const app = await getApp(created.id);
    const versionId: string = app.editing_version.id;
    const pages: Array<{ id: string; name: string }> = app.pages ?? [];
    const homePage = pages.find((p) => p.name === 'Home') ?? pages[0];
    if (!homePage) {
      throw new Error('ToolJet createApp failed: app has no pages');
    }

    return {
      app_id: created.id,
      version_id: versionId,
      home_page_id: homePage.id,
      app_url: `${config.appUrl}/apps/${created.id}`,
    };
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

  async function createComponent(params: CreateComponentParams): Promise<CreateComponentResult> {
    const componentId = randomUUID();
    const componentDto: Record<string, unknown> = {
      type: params.type,
      properties: params.properties,
      styles: {},
      validation: {},
      others: {},
    };
    if (params.layout) {
      componentDto.layouts = params.layout;
    }

    const res = await auth.authedFetch(`/api/v2/apps/${params.appId}/versions/${params.versionId}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_user_switched_version: false,
        pageId: params.pageId,
        diff: { [componentId]: componentDto },
      }),
    });
    await assertOk(res, 'createComponent');
    return { component_id: componentId };
  }

  return { createApp, getApp, getDevelopmentEnvironmentId, listDatasources, createQuery, createComponent };
}
