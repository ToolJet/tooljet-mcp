import type { Config } from './config.js';

const COOKIE_PREFIX = 'tj_auth_token=';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  is_default?: boolean;
  /** True for the workspace that is currently active for this session. */
  is_current?: boolean;
}

export interface Auth {
  authedFetch(path: string, init?: RequestInit): Promise<Response>;
  getOrganizationId(): Promise<string>;
  getOrganizationSlug(): Promise<string>;
  /** The workspaces this user belongs to (id, name, slug, is_default, is_current). */
  listWorkspaces(): Promise<Workspace[]>;
  /** Switch the ACTIVE workspace for all subsequent calls; re-issues the session cookie. */
  switchWorkspace(workspaceId: string): Promise<Workspace>;
}

export function createAuth(config: Config, fetchImpl: typeof fetch = fetch): Auth {
  let token: string | undefined;
  let workspaceId: string | undefined;
  let workspaceSlug: string | undefined;
  let workspaceName: string | undefined;

  function captureCookie(res: Response): void {
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith(COOKIE_PREFIX));
    if (cookie) token = cookie.slice(COOKIE_PREFIX.length).split(';')[0];
  }

  async function login(): Promise<void> {
    const res = await fetchImpl(`${config.apiUrl}/api/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });

    // Surface the REAL cause — a 401 (bad creds / SSO-only), a 404 (wrong URL), etc. all otherwise
    // collapse into the generic "no cookie" message below, which is misleading.
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      const hint =
        res.status === 401
          ? ' — TOOLJET_EMAIL / TOOLJET_PASSWORD were rejected by this instance (or this workspace requires SSO, not form login).'
          : res.status === 404
            ? ' — check TOOLJET_URL is the API origin with no path, e.g. https://your-instance.tooljet.com.'
            : '';
      throw new Error(`ToolJet login failed (HTTP ${res.status})${hint}${detail ? ` Response: ${detail}` : ''}`);
    }

    captureCookie(res);
    if (!token) {
      throw new Error(
        `ToolJet login returned HTTP ${res.status} but no tj_auth_token cookie — the instance authenticated ` +
          `without setting the session cookie (e.g. a redirect, a non-form login mode, or a secure/cross-origin cookie the client can't read).`
      );
    }

    const body = (await res.json()) as {
      current_organization_id?: string;
      current_organization_slug?: string;
      current_organization_name?: string;
    };
    workspaceId = body.current_organization_id;
    workspaceSlug = body.current_organization_slug;
    workspaceName = body.current_organization_name;

    // Optional startup pin: if a specific workspace is configured, switch into it now.
    await applyConfiguredWorkspace();
  }

  // Low-level authed fetch that assumes a token already exists (no re-login) — used by the
  // workspace helpers so switching/listing during login() doesn't recurse.
  async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Cookie', `tj_auth_token=${token}`);
    if (workspaceId) headers.set('tj-workspace-id', workspaceId);
    return fetchImpl(`${config.apiUrl}${path}`, { ...init, headers });
  }

  async function fetchWorkspaceList(): Promise<Workspace[]> {
    const res = await rawFetch('/api/organizations?status=active');
    if (!res.ok) {
      throw new Error(`ToolJet listWorkspaces failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { organizations?: Array<Record<string, unknown>> };
    return (body.organizations ?? []).map((o) => ({
      id: o.id as string,
      name: o.name as string,
      slug: o.slug as string,
      is_default: !!o.is_default,
      is_current: o.id === workspaceId,
    }));
  }

  async function switchTo(targetId: string): Promise<Workspace> {
    const res = await rawFetch(`/api/switch/${targetId}`);
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(
        `ToolJet switchWorkspace failed (${res.status}) for workspace ${targetId}: ${msg}` +
          (res.status === 401 ? " — the user may not have access to that workspace." : '')
      );
    }
    captureCookie(res); // switch re-issues an org-scoped tj_auth_token
    const body = (await res.json().catch(() => ({}))) as {
      current_organization_id?: string;
      current_organization_slug?: string;
      current_organization_name?: string;
    };
    workspaceId = body.current_organization_id ?? targetId;
    workspaceSlug = body.current_organization_slug ?? workspaceSlug;
    workspaceName = body.current_organization_name ?? workspaceName;
    // If the switch payload didn't carry slug/name, backfill from the list.
    if (!body.current_organization_slug || !body.current_organization_name) {
      const found = (await fetchWorkspaceList()).find((w) => w.id === workspaceId);
      if (found) {
        workspaceSlug = found.slug;
        workspaceName = found.name;
      }
    }
    return { id: workspaceId!, name: workspaceName ?? '', slug: workspaceSlug ?? '', is_current: true };
  }

  async function applyConfiguredWorkspace(): Promise<void> {
    let targetId = config.workspaceId;
    if (!targetId && config.workspaceSlug) {
      const match = (await fetchWorkspaceList()).find((w) => w.slug === config.workspaceSlug);
      if (!match) {
        throw new Error(
          `ToolJet: configured TOOLJET_WORKSPACE_SLUG "${config.workspaceSlug}" is not one of this user's workspaces.`
        );
      }
      targetId = match.id;
    }
    if (targetId && targetId !== workspaceId) {
      await switchTo(targetId);
    }
  }

  async function doFetch(path: string, init?: RequestInit): Promise<Response> {
    return rawFetch(path, init);
  }

  async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
    if (!token) await login();
    let res = await doFetch(path, init);
    if (res.status === 401) {
      token = undefined;
      await login();
      res = await doFetch(path, init);
      if (res.status === 401) throw new Error('ToolJet auth failed: ' + (await res.text()));
    }
    return res;
  }

  async function getOrganizationId(): Promise<string> {
    if (!workspaceId) await login();
    if (!workspaceId) throw new Error('ToolJet getOrganizationId failed: no organization id available after login');
    return workspaceId;
  }

  async function getOrganizationSlug(): Promise<string> {
    if (!workspaceSlug) await login();
    if (!workspaceSlug) throw new Error('ToolJet getOrganizationSlug failed: no organization slug available after login');
    return workspaceSlug;
  }

  async function listWorkspaces(): Promise<Workspace[]> {
    if (!token) await login();
    return fetchWorkspaceList();
  }

  async function switchWorkspace(id: string): Promise<Workspace> {
    if (!token) await login();
    return switchTo(id);
  }

  return { authedFetch, getOrganizationId, getOrganizationSlug, listWorkspaces, switchWorkspace };
}
