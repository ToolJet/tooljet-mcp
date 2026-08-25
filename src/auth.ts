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
  /* Set once the caller-supplied session has been installed. login() is re-entered by the 401
     retry path with `token` already cleared, so this — not `token` — is what tells us a supplied
     session has already been tried and failed. */
  let suppliedSessionUsed = false;
  let workspaceId: string | undefined;
  let workspaceSlug: string | undefined;
  let workspaceName: string | undefined;

  const datasourceManagementUrl = (slug: string, datasourceId?: string) =>
    `${config.appUrl}/${encodeURIComponent(slug)}/data-sources` +
    (datasourceId ? `/${encodeURIComponent(datasourceId)}` : '');

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
  async function login(): Promise<void> {
    /* In-product path: ToolJet's backend already minted a session for the signed-in user, so there
       is nothing to exchange — the credential IS the session. */
    if (config.sessionToken) {
      if (suppliedSessionUsed) {
        throw new Error(
          'The ToolJet session for this build is no longer valid (expired, or its token was revoked). ' +
            'It is minted per build and cannot be renewed from here — start a new build.'
        );
      }
      suppliedSessionUsed = true;
      token = config.sessionToken;
      workspaceId = config.workspaceId;
      // Slug is cosmetic (datasource URLs); the id is a usable stand-in when it was not supplied.
      workspaceSlug = config.workspaceSlug ?? config.workspaceId;
      return;
    }

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
            ? ' — this instance has no personal-access-token endpoint: it predates PAT support, or TOOLJET_URL is not the API origin. Upgrade the instance, or point TOOLJET_URL at one that has tokens.'
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
    // apps, data"), so /api/organizations 403s. Both scoped credentials — an exchanged PAT and a
    // backend-minted session — carry the same isPATLogin claim and the same pinning, so neither can
    // list workspaces. That is not a degraded mode worth reporting: the honest answer is the one
    // workspace this session can actually reach.
    if (config.pat || config.sessionToken) {
      if (!workspaceId) throw new Error('This session did not resolve a workspace.');
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

  /** A PAT session is minted for the token's own workspace and can reach no other, so there is no
   *  switch to perform. Selecting the current workspace succeeds (callers may confirm it); anything
   *  else states the constraint rather than failing later as an opaque 401. */
  async function switchWorkspace(id: string): Promise<Workspace> {
    if (!token) await login();
    const current = (await fetchWorkspaceList())[0]!;
    if (id !== current.id) {
      throw new Error(
        `This server is scoped to workspace "${current.slug}" (${current.id}) and cannot switch to ${id}. ` +
          (config.sessionToken
            ? 'Its session was minted for that workspace; start a build from the workspace you want to act on.'
            : 'Issue a personal access token in the target workspace and set TOOLJET_PAT to it.')
      );
    }
    return current;
  }

  return { authedFetch, getOrganizationId, getOrganizationSlug, listWorkspaces, switchWorkspace };
}
