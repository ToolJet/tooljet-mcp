import type { Config } from './config.js';
import { recordHttpResponse } from './telemetry.js';

const COOKIE_PREFIX = 'tj_auth_token=';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  /** User-facing ToolJet page for connecting or repairing workspace datasources. */
  datasources_url: string;
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

  const datasourceManagementUrl = (slug: string, datasourceId?: string) =>
    `${config.appUrl}/${encodeURIComponent(slug)}/data-sources` +
    (datasourceId ? `/${encodeURIComponent(datasourceId)}` : '');

  function captureCookie(res: Response): void {
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith(COOKIE_PREFIX));
    if (cookie) token = cookie.slice(COOKIE_PREFIX.length).split(';')[0];
  }

  /** Exchange a personal access token for a session.
   *
   * The server mints a normal session from the PAT (POST /api/personal-access-tokens/session,
   * `Authorization: Bearer <pat>`) so every existing guard keeps working and nothing downstream has
   * to learn a second credential type. Note it returns the JWT in the BODY rather than setting a
   * cookie (isPatLogin), so unlike form login there is no Set-Cookie to capture — we read authToken
   * and then present it as tj_auth_token exactly as before.
   *
   * A PAT session is pinned to the token's own workspace ("this session can reach no other"), which
   * is why switchWorkspace refuses under PAT auth instead of failing obscurely later. */
  async function loginWithPat(): Promise<void> {
    const res = await fetchImpl(`${config.apiUrl}/api/personal-access-tokens/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.pat}` },
    });
    recordHttpResponse(res);

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      const hint =
        res.status === 401
          ? ' — TOOLJET_PAT was rejected: check it is not expired or revoked, and that it was copied whole.'
          : res.status === 404
            ? ' — this instance has no personal-access-token endpoint (it predates PAT support, or TOOLJET_URL is wrong). Use TOOLJET_EMAIL/TOOLJET_PASSWORD instead.'
            : '';
      throw new Error(`ToolJet PAT session exchange failed (HTTP ${res.status})${hint}${detail ? ` Response: ${detail}` : ''}`);
    }

    const body = (await res.json()) as {
      authToken?: string;
      organizationId?: string;
      organizationSlug?: string | null;
      organizationName?: string | null;
    };
    if (!body.authToken) {
      throw new Error('ToolJet PAT session exchange succeeded but returned no authToken.');
    }
    token = body.authToken;
    workspaceId = body.organizationId;
    workspaceSlug = body.organizationSlug ?? undefined;
    workspaceName = body.organizationName ?? undefined;

    if (config.workspaceId || config.workspaceSlug) {
      // Not an error: the token already determines the workspace, so a configured pin is simply
      // inert. Say so rather than letting the caller assume it took effect.
      console.error(
        `[tooljet-mcp] TOOLJET_WORKSPACE_ID/SLUG ignored under PAT auth — this token is scoped to ` +
          `workspace ${workspaceSlug ?? workspaceId}. Issue the token in the workspace you want.`
      );
    }
  }

  async function loginWithPassword(): Promise<void> {
    const res = await fetchImpl(`${config.apiUrl}/api/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });
    recordHttpResponse(res);

    // Surface the REAL cause — a 401 (bad creds / SSO-only), a 404 (wrong URL), etc. all otherwise
    // collapse into the generic "no cookie" message below, which is misleading.
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      const hint =
        res.status === 401
          ? ' — TOOLJET_EMAIL / TOOLJET_PASSWORD were rejected by this instance (or this workspace requires SSO, not form login). Prefer TOOLJET_PAT, which works on SSO-only instances.'
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

  async function login(): Promise<void> {
    if (config.pat) return loginWithPat();
    return loginWithPassword();
  }

  // Low-level authed fetch that assumes a token already exists (no re-login) — used by the
  // workspace helpers so switching/listing during login() doesn't recurse.
  async function rawFetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set('Cookie', `tj_auth_token=${token}`);
    if (workspaceId) headers.set('tj-workspace-id', workspaceId);
    const response = await fetchImpl(`${config.apiUrl}${path}`, { ...init, headers });
    recordHttpResponse(response);
    return response;
  }

  async function fetchWorkspaceList(): Promise<Workspace[]> {
    // PAT scopes deliberately exclude the Organization module ("Workspace tokens are limited to:
    // apps, data"), so /api/organizations 403s. That is not a degraded mode worth reporting: a PAT
    // session is pinned to its own workspace anyway, so the honest answer is the one workspace this
    // token can actually reach, synthesised from the session exchange rather than fetched.
    if (config.pat) {
      if (!workspaceId) throw new Error('PAT session did not resolve a workspace.');
      return [
        {
          id: workspaceId,
          name: workspaceName ?? workspaceSlug ?? workspaceId,
          slug: workspaceSlug ?? workspaceId,
          datasources_url: datasourceManagementUrl(workspaceSlug ?? workspaceId),
          is_current: true,
          is_default: true,
        },
      ];
    }
    const res = await rawFetch('/api/organizations?status=active');
    if (!res.ok) {
      throw new Error(`ToolJet listWorkspaces failed (${res.status}): ${await res.text()}`);
    }
    const body = (await res.json()) as { organizations?: Array<Record<string, unknown>> };
    return (body.organizations ?? []).map((o) => ({
      id: o.id as string,
      name: o.name as string,
      slug: o.slug as string,
      datasources_url: datasourceManagementUrl(o.slug as string),
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
    return {
      id: workspaceId!,
      name: workspaceName ?? '',
      slug: workspaceSlug ?? '',
      datasources_url: datasourceManagementUrl(workspaceSlug ?? ''),
      is_current: true,
    };
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
    // A PAT session is minted for the token's own workspace and "can reach no other" — the server
    // will not re-issue it against a different org. Refusing here turns what would otherwise be a
    // confusing downstream 401/empty-result into a statement of the actual constraint.
    if (config.pat && id !== workspaceId) {
      throw new Error(
        `Cannot switch workspace under PAT auth: this token is scoped to workspace ` +
          `${workspaceSlug ?? workspaceId}. Issue a personal access token in the target workspace ` +
          `and set TOOLJET_PAT to it, or use TOOLJET_EMAIL/TOOLJET_PASSWORD for multi-workspace access.`
      );
    }
    return switchTo(id);
  }

  return { authedFetch, getOrganizationId, getOrganizationSlug, listWorkspaces, switchWorkspace };
}
