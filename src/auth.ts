import type { Config } from './config.js';

const COOKIE_PREFIX = 'tj_auth_token=';

export interface Auth {
  authedFetch(path: string, init?: RequestInit): Promise<Response>;
  getOrganizationId(): Promise<string>;
  getOrganizationSlug(): Promise<string>;
}

export function createAuth(config: Config, fetchImpl: typeof fetch = fetch): Auth {
  let token: string | undefined;
  let workspaceId: string | undefined;
  let workspaceSlug: string | undefined;

  async function login(): Promise<void> {
    const res = await fetchImpl(`${config.apiUrl}/api/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });

    const setCookies = res.headers.getSetCookie();
    const cookie = setCookies.find((c) => c.startsWith(COOKIE_PREFIX));
    if (!cookie) {
      throw new Error('ToolJet login failed: no tj_auth_token cookie in response');
    }
    token = cookie.slice(COOKIE_PREFIX.length).split(';')[0];

    const body = (await res.json()) as { current_organization_id?: string; current_organization_slug?: string };
    workspaceId = body.current_organization_id;
    workspaceSlug = body.current_organization_slug;
  }

  async function doFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Cookie', `tj_auth_token=${token}`);
    if (workspaceId) headers.set('tj-workspace-id', workspaceId);
    return fetchImpl(`${config.apiUrl}${path}`, { ...init, headers });
  }

  async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
    if (!token) {
      await login();
    }

    let res = await doFetch(path, init);

    if (res.status === 401) {
      token = undefined;
      await login();
      res = await doFetch(path, init);

      if (res.status === 401) {
        throw new Error('ToolJet auth failed: ' + (await res.text()));
      }
    }

    return res;
  }

  async function getOrganizationId(): Promise<string> {
    if (!workspaceId) {
      await login();
    }
    if (!workspaceId) {
      throw new Error('ToolJet getOrganizationId failed: no organization id available after login');
    }
    return workspaceId;
  }

  async function getOrganizationSlug(): Promise<string> {
    if (!workspaceSlug) {
      await login();
    }
    if (!workspaceSlug) {
      throw new Error('ToolJet getOrganizationSlug failed: no organization slug available after login');
    }
    return workspaceSlug;
  }

  return { authedFetch, getOrganizationId, getOrganizationSlug };
}
