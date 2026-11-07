import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuth } from '../src/auth.js';
import type { Config } from '../src/config.js';

const config: Config = {
  apiUrl: 'http://localhost:3000',
  appUrl: 'http://localhost:8082',
  pat: 'tj_pat_test',
};

function mockResponse(opts: { status?: number; ok?: boolean; json?: unknown; text?: string }) {
  const status = opts.status ?? 200;
  return {
    status,
    ok: opts.ok ?? (status >= 200 && status < 300),
    headers: { get: () => null, getSetCookie: () => [] },
    json: async () => opts.json ?? {},
    text: async () => opts.text ?? '',
  } as unknown as Response;
}

/** The PAT exchange returns the session JWT in the BODY (isPatLogin) and sets no cookie. */
function sessionResponse(org = 'org1', token = 'TOKEN') {
  return mockResponse({
    status: 201,
    json: { authToken: token, organizationId: org, organizationSlug: 'acme', organizationName: 'Acme' },
  });
}


describe('createAuth (personal access token)', () => {
  let fetchImpl: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchImpl = vi.fn();
  });

  it('exchanges the PAT for a session, then sends the JWT as the session cookie', async () => {
    fetchImpl
      .mockResolvedValueOnce(sessionResponse('org1', 'TOKEN'))
      .mockResolvedValueOnce(mockResponse({ json: { ok: true } }));

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    const res = await auth.authedFetch('/api/some-resource');
    expect(res.status).toBe(200);

    const [exchangeUrl, exchangeInit] = fetchImpl.mock.calls[0];
    expect(exchangeUrl).toContain('/api/personal-access-tokens/session');
    expect((exchangeInit as RequestInit).method).toBe('POST');
    expect((exchangeInit as any).headers.Authorization).toBe('Bearer tj_pat_test');

    const headers = (fetchImpl.mock.calls[1][1] as RequestInit).headers as Headers;
    expect(headers.get('Cookie')).toBe('tj_auth_token=TOKEN');
    expect(headers.get('tj-workspace-id')).toBe('org1');
  });

  it('re-exchanges exactly once on a 401 and retries', async () => {
    fetchImpl
      .mockResolvedValueOnce(sessionResponse())
      .mockResolvedValueOnce(mockResponse({ status: 401, text: 'expired' }))
      .mockResolvedValueOnce(sessionResponse())
      .mockResolvedValueOnce(mockResponse({ json: { ok: true } }));

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    expect((await auth.authedFetch('/api/x')).status).toBe(200);
    const exchanges = fetchImpl.mock.calls.filter((c) => String(c[0]).includes('personal-access-tokens/session'));
    expect(exchanges).toHaveLength(2);
  });

  it('resolves the workspace from the exchange, without calling /api/organizations', async () => {
    // PAT scopes exclude the Organization module, so that endpoint 403s — the workspace must come
    // from the exchange payload instead.
    fetchImpl.mockResolvedValue(sessionResponse('org-7'));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    expect(await auth.getOrganizationId()).toBe('org-7');
    expect(await auth.getOrganizationSlug()).toBe('acme');

    const list = await auth.listWorkspaces();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'org-7', slug: 'acme', is_current: true });
    expect(fetchImpl.mock.calls.some((c) => String(c[0]).includes('/api/organizations'))).toBe(false);
  });

  it('accepts selecting the workspace the token is scoped to', async () => {
    fetchImpl.mockResolvedValue(sessionResponse('org-7'));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.switchWorkspace('org-7')).resolves.toMatchObject({ id: 'org-7' });
  });

  it('refuses another workspace, naming the one it is scoped to', async () => {
    fetchImpl.mockResolvedValue(sessionResponse('org-7'));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.switchWorkspace('org-other')).rejects.toThrow(/scoped to workspace "acme"/i);
  });

  it('explains a rejected or expired token', async () => {
    fetchImpl.mockResolvedValue(mockResponse({ status: 401, text: 'Invalid personal access token' }));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(/expired or revoked/i);
  });

  it('explains an instance with no PAT endpoint rather than a bare 404', async () => {
    fetchImpl.mockResolvedValue(mockResponse({ status: 404, text: 'Not Found' }));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(/no personal-access-token endpoint/i);
  });

  it('fails clearly when the exchange returns no token', async () => {
    fetchImpl.mockResolvedValue(mockResponse({ status: 201, json: { organizationId: 'org1' } }));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(/returned no authToken/i);
  });
});

/* The in-product path. ToolJet's backend has already minted a session for the signed-in user, so
   the credential IS the session: there is nothing to exchange, and the agent's writes land in the
   audit log under the person who asked for the build. */
describe('createAuth (backend-minted session)', () => {
  const sessionConfig: Config = {
    apiUrl: 'http://localhost:3000',
    appUrl: 'http://localhost:8082',
    sessionToken: 'SESSION_JWT',
    workspaceId: 'org-9',
    workspaceSlug: 'acme',
  };

  let fetchImpl: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchImpl = vi.fn();
  });

  it('uses the supplied session directly, making no exchange request', async () => {
    fetchImpl.mockResolvedValueOnce(mockResponse({ json: { ok: true } }));

    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    await auth.authedFetch('/api/some-resource');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).not.toContain('/personal-access-tokens/session');
    const headers = (init as RequestInit).headers as Headers;
    expect(headers.get('Cookie')).toBe('tj_auth_token=SESSION_JWT');
    expect(headers.get('tj-workspace-id')).toBe('org-9');
  });

  /* The PAT path answers a 401 by re-exchanging. There is nothing to re-exchange here, so retrying
     would just replay the same dead token — once against the retry, and forever if login() were
     ever called again. Fail with something a user can act on instead. */
  it('reports an expired session instead of retrying a credential it cannot renew', async () => {
    fetchImpl.mockResolvedValue(mockResponse({ status: 401, text: 'Unauthorized' }));

    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(/no longer valid.*start a new build/is);
    // The 401 handler clears the token and re-enters login(), which refuses — so the retry request
    // is never sent. One call total, not two, and not a loop.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  /* Listing workspaces needs the Organization module, which the PAT bundles exclude — and a minted
     session carries the same isPATLogin claim, so it is equally barred. Synthesise rather than 403. */
  it('reports the one reachable workspace without calling the organizations API', async () => {
    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    const workspaces = await auth.listWorkspaces();

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toMatchObject({ id: 'org-9', slug: 'acme', is_current: true });
  });

  it('falls back to the workspace id when no slug was supplied', async () => {
    const auth = createAuth(
      { ...sessionConfig, workspaceSlug: undefined },
      fetchImpl as unknown as typeof fetch
    );
    await expect(auth.getOrganizationSlug()).resolves.toBe('org-9');
  });

  it('refuses another workspace, and does not tell an in-product caller to set TOOLJET_PAT', async () => {
    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    await expect(auth.switchWorkspace('org-other')).rejects.toThrow(/start a build from the workspace/i);
    await expect(auth.switchWorkspace('org-other')).rejects.not.toThrow(/TOOLJET_PAT/);
  });
});

// Reading log (2026-11-02): in-product builds run on the relay's ai_builder session (no PAT), whose scope ceiling blocks
// the viewer's boot reads, so every render check came back unreachable. The server mints a render session for it.
describe('viewerSession for the render check', () => {
  const sessionConfig: Config = {
    apiUrl: 'http://localhost:3000',
    appUrl: 'http://localhost:8082',
    sessionToken: 'SESSION_JWT',
    workspaceId: 'org-9',
  };
  const minted = (token: string, msFromNow: number) =>
    mockResponse({ status: 201, json: { authToken: token, expiresAt: new Date(Date.now() + msFromNow).toISOString(), appId: 'app-1' } });

  it('with a session token, mints a render session through the relay route and caches it', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(minted('RENDER_1', 10 * 60_000));
    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    expect(await auth.viewerSession!('app-1')).toBe('RENDER_1');
    expect(await auth.viewerSession!('app-1')).toBe('RENDER_1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/personal-access-tokens/ai-render-session');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ appId: 'app-1' });
    expect(((init as RequestInit).headers as Headers).get('Cookie')).toBe('tj_auth_token=SESSION_JWT');
  });

  it('re-mints shortly before the render session expires', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(minted('RENDER_1', 30_000)).mockResolvedValueOnce(minted('RENDER_2', 10 * 60_000));
    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    expect(await auth.viewerSession!('app-1')).toBe('RENDER_1');
    expect(await auth.viewerSession!('app-1')).toBe('RENDER_2'); // under a minute left: a new one
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([404, 401, 403])('refuses, never the build session, when the route answers %s, and keeps the build session', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(mockResponse({ status })).mockResolvedValue(mockResponse({ json: { ok: true } }));
    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    await expect(auth.viewerSession!('app-1')).rejects.toThrow(/own read-only session/);
    // A refused render session never clears or "expires" the build's own session.
    await auth.authedFetch('/api/apps/app-1');
    expect(((fetchImpl.mock.calls[1][1] as RequestInit).headers as Headers).get('Cookie')).toBe('tj_auth_token=SESSION_JWT');
  });

  it('with a PAT, refuses rather than use the automation session when the pinned session cannot be minted', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(sessionResponse('org1', 'AUTOMATION')).mockResolvedValue(mockResponse({ status: 403 }));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await auth.getOrganizationId();
    await expect(auth.viewerSession!('app-1')).rejects.toThrow(/own read-only session/);
  });

  it('with a PAT, still mints the app-pinned session from the PAT and never calls the relay route', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(sessionResponse('org1', 'PINNED'));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    expect(await auth.viewerSession!('app-1')).toBe('PINNED');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/personal-access-tokens/session');
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ appId: 'app-1' });
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes('ai-render-session'))).toBe(false);
  });

  it('never writes the render token to the console', async () => {
    const spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m as 'log').mockImplementation(() => {}));
    const fetchImpl = vi.fn().mockResolvedValueOnce(minted('SECRET_RENDER_TOKEN', 10 * 60_000));
    await createAuth(sessionConfig, fetchImpl as unknown as typeof fetch).viewerSession!('app-1');
    for (const spy of spies) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain('SECRET_RENDER_TOKEN');
      spy.mockRestore();
    }
  });
});

describe('ai-render-session final contract (code-app-demo d103a8349a)', () => {
  const sessionConfig: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', sessionToken: 'SESSION_JWT', workspaceId: 'org-9' };

  it('takes the full response and uses authToken for the viewer', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(mockResponse({ status: 201, json: {
      authToken: 'RENDER', organizationId: 'org-9', organizationSlug: 'acme', organizationName: 'Acme',
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), appId: 'app-1' } }));
    const auth = createAuth(sessionConfig, fetchImpl as unknown as typeof fetch);
    expect(await auth.viewerSession!('app-1')).toBe('RENDER');
    expect(((fetchImpl.mock.calls[0][1] as RequestInit).headers as Headers).get('tj-workspace-id')).toBe('org-9');
    // The build's own session is untouched: later API calls still use it.
    fetchImpl.mockResolvedValueOnce(mockResponse({ json: { ok: true } }));
    await auth.authedFetch('/api/apps/app-1');
    expect(((fetchImpl.mock.calls[1][1] as RequestInit).headers as Headers).get('Cookie')).toBe('tj_auth_token=SESSION_JWT');
  });

  it('refuses on a 403 refusal (another app, not an ai_builder session)', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(mockResponse({ status: 403, json: { message: 'This session cannot render another app' } }));
    await expect(createAuth(sessionConfig, fetchImpl as unknown as typeof fetch).viewerSession!('app-2')).rejects.toThrow(/own read-only session/);
  });
});
