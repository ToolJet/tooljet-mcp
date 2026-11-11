import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuth } from '../src/auth.js';
import { branchIdFor, withBranchContext, identityFromHeaders, loadConfig, type Config } from '../src/config.js';
import { createClient } from '../src/tooljetClient.js';
import { consumeAppPlan, storeAppPlan } from '../src/appPlanStore.js';

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

describe('branch context', () => {
  const config = { apiUrl: 'https://example.test', appUrl: 'https://example.test', sessionToken: 'test-session', workspaceId: 'workspace' };
  const branch = '11111111-1111-4111-8111-111111111111';
  it('carries a gateway branch and does not inherit a server-wide branch for another identity', async () => {
    vi.stubEnv('TOOLJET_BRANCH_ID', branch);
    try {
      const identity = await identityFromHeaders({ 'x-tooljet-session': 'session', 'x-tooljet-workspace-id': 'workspace', 'x-tooljet-branch-id': branch });
      expect(loadConfig(identity).branchId).toBe(branch);
      expect(loadConfig({ sessionToken: 'other', workspaceId: 'other-workspace' }).branchId).toBeUndefined();
    } finally { vi.unstubAllEnvs(); }
  });
  it('isolates concurrent tool calls and preserves existing query parameters', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    const auth = createAuth(config, fetcher as typeof fetch);
    await Promise.all(['draft-a', 'draft-b'].map(id => withBranchContext(id, async () => {
      await Promise.resolve();
      await auth.authedFetch('/api/apps?page=2');
    })));
    expect(fetcher.mock.calls.map(call => String(call[0])).sort()).toEqual([
      'https://example.test/api/apps?page=2&branch_id=draft-a',
      'https://example.test/api/apps?page=2&branch_id=draft-b',
    ]);
    await auth.authedFetch('/api/apps');
    expect(fetcher.mock.calls.at(-1)?.[0]).toBe('https://example.test/api/apps');
  });

  it('refuses to override an in-product build branch', () => {
    expect(() => withBranchContext('different', () => branchIdFor({ branchId: branch }))).toThrow(/branch/i);
    expect(withBranchContext(branch, () => branchIdFor({ branchId: branch }))).toBe(branch);
  });

  it('does not turn branch context into a PostgREST row filter', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    const auth = createAuth({ ...config, branchId: branch }, fetcher as typeof fetch);
    await auth.authedFetch('/api/tooljet-db/proxy/table?limit=1', { method: 'POST', body: '{"title":"Garden check"}' });
    expect(fetcher.mock.calls[0][0]).toBe('https://example.test/api/tooljet-db/proxy/table?limit=1');
    expect((fetcher.mock.calls[0][1]?.headers as Headers).get('x-branch-id')).toBe(branch);
  });

  it('keeps a linted plan usable only on its original branch', () => {
    const plan = withBranchContext(branch, () => storeAppPlan({}, {} as any));
    expect(() => withBranchContext('other', () => consumeAppPlan(plan.plan_token))).toThrow(/different branch/);
    expect(withBranchContext(branch, () => consumeAppPlan(plan.plan_token))).toMatchObject({ branchId: branch });
  });

  it('sends branchId in app creation as well as branch_id on subsequent reads', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response(JSON.stringify(init?.method === 'POST' ? { id: 'app' } : {
        editing_version: { id: 'version', name: 'draft-version', version_type: 'branch', branch: { name: 'feature/garden' } }, pages: [{ id: 'home', name: 'Home' }],
      }));
    });
    const client = createClient(createAuth(config, fetcher as typeof fetch), config);
    const result = await withBranchContext(branch, () => client.createApp('Garden tasks'));
    expect(JSON.parse(String(calls[0][1]?.body))).toMatchObject({ name: 'Garden tasks', branchId: branch });
    expect(calls[1][0]).toContain('branch_id=' + branch);
    expect(result).toMatchObject({ app_id: 'app', version_id: 'version', branch_id: branch });
    expect(result.editor_url).toContain('?branch=feature%2Fgarden');
    expect(result.viewer_url).toContain('?env=development&version=draft-version&branch=feature%2Fgarden');
  });
});
