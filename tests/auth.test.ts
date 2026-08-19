import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuth } from '../src/auth.js';
import type { Config } from '../src/config.js';

const config: Config = {
  apiUrl: 'http://localhost:3000',
  appUrl: 'http://localhost:8082',
  email: 'a@b.com',
  password: 'pw',
};

function mockResponse(opts: {
  status?: number;
  ok?: boolean;
  setCookie?: string[];
  json?: unknown;
  text?: string;
}) {
  const status = opts.status ?? 200;
  return {
    status,
    ok: opts.ok ?? (status >= 200 && status < 300),
    headers: {
      get: (_name: string) => null,
      getSetCookie: () => opts.setCookie ?? [],
    },
    json: async () => opts.json ?? {},
    text: async () => opts.text ?? '',
  } as unknown as Response;
}

function loginResponse(org = 'org1', token = 'TOKEN') {
  return mockResponse({
    status: 201,
    setCookie: [`tj_auth_token=${token}; Path=/; HttpOnly`],
    json: { current_organization_id: org },
  });
}

describe('createAuth', () => {
  let fetchImpl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchImpl = vi.fn();
  });

  it('logs in first, then sends Cookie + tj-workspace-id header on the actual request', async () => {
    fetchImpl
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN'))
      .mockResolvedValueOnce(mockResponse({ status: 200, json: { ok: true } }));

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    const res = await auth.authedFetch('/api/some-resource');

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const [loginUrl] = fetchImpl.mock.calls[0];
    expect(loginUrl).toContain('/api/authenticate');

    const [actualUrl, actualInit] = fetchImpl.mock.calls[1];
    expect(actualUrl).toBe('http://localhost:3000/api/some-resource');
    const headers = new Headers(actualInit.headers);
    expect(headers.get('Cookie')).toBe('tj_auth_token=TOKEN');
    expect(headers.get('tj-workspace-id')).toBe('org1');
  });

  it('captures the cookie via getSetCookie() and the org id from the JSON body', async () => {
    fetchImpl
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN'))
      .mockResolvedValueOnce(mockResponse({ status: 200 }));

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await auth.authedFetch('/api/some-resource');

    const [, actualInit] = fetchImpl.mock.calls[1];
    const headers = new Headers(actualInit.headers);
    expect(headers.get('Cookie')).toBe('tj_auth_token=TOKEN');
    expect(headers.get('tj-workspace-id')).toBe('org1');
  });

  it('on a 401 from the actual request, re-logs in exactly once and retries', async () => {
    fetchImpl
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN')) // initial login
      .mockResolvedValueOnce(mockResponse({ status: 401, text: 'unauthorized' })) // first attempt -> 401
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN2')) // re-login
      .mockResolvedValueOnce(mockResponse({ status: 200, json: { ok: true } })); // retry succeeds

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    const res = await auth.authedFetch('/api/some-resource');

    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    expect(fetchImpl.mock.calls[0][0]).toContain('/api/authenticate');
    expect(fetchImpl.mock.calls[2][0]).toContain('/api/authenticate');

    const [, retryInit] = fetchImpl.mock.calls[3];
    const headers = new Headers(retryInit.headers);
    expect(headers.get('Cookie')).toBe('tj_auth_token=TOKEN2');
  });

  it('throws when a second consecutive 401 occurs after the retry', async () => {
    fetchImpl
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN')) // initial login
      .mockResolvedValueOnce(mockResponse({ status: 401, text: 'first unauthorized' })) // first attempt -> 401
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN2')) // re-login
      .mockResolvedValueOnce(mockResponse({ status: 401, text: 'second unauthorized' })); // retry -> 401 again

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);

    await expect(auth.authedFetch('/api/some-resource')).rejects.toThrow(
      /ToolJet auth failed: second unauthorized/
    );
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('getOrganizationId logs in if needed and returns the captured org id', async () => {
    fetchImpl.mockResolvedValueOnce(loginResponse('org1', 'TOKEN'));

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    const orgId = await auth.getOrganizationId();

    expect(orgId).toBe('org1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/authenticate');
  });

  it('getOrganizationId reuses the org id from a prior login without logging in again', async () => {
    fetchImpl
      .mockResolvedValueOnce(loginResponse('org1', 'TOKEN'))
      .mockResolvedValueOnce(mockResponse({ status: 200, json: { ok: true } }));

    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await auth.authedFetch('/api/some-resource');
    const orgId = await auth.getOrganizationId();

    expect(orgId).toBe('org1');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('surfaces a 401 (with a credentials/SSO hint) instead of the generic no-cookie error', async () => {
    fetchImpl.mockResolvedValueOnce(mockResponse({ status: 401, text: 'Invalid credentials' }));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(
      /login failed \(HTTP 401\).*rejected by this instance.*Response: Invalid credentials/
    );
  });

  it('surfaces a 404 with a URL hint', async () => {
    fetchImpl.mockResolvedValueOnce(mockResponse({ status: 404, text: 'Not Found' }));
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(/login failed \(HTTP 404\).*TOOLJET_URL is the API origin/);
  });

  it('distinguishes "authenticated but no cookie" (200 without Set-Cookie)', async () => {
    fetchImpl.mockResolvedValueOnce(mockResponse({ status: 200, json: {} })); // ok, but no setCookie
    const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
    await expect(auth.authedFetch('/api/x')).rejects.toThrow(
      /HTTP 200 but no tj_auth_token cookie/
    );
  });

  describe('workspaces', () => {
    const orgList = {
      organizations: [
        { id: 'org1', name: 'Acme', slug: 'acme', is_default: true },
        { id: 'org2', name: 'Beta', slug: 'beta', is_default: false },
      ],
    };

    it('listWorkspaces maps the org list and marks the current one', async () => {
      fetchImpl
        .mockResolvedValueOnce(loginResponse('org1', 'TOKEN'))
        .mockResolvedValueOnce(mockResponse({ status: 200, json: orgList }));

      const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
      const ws = await auth.listWorkspaces();

      expect(fetchImpl.mock.calls[1][0]).toBe('http://localhost:3000/api/organizations?status=active');
      expect(ws).toEqual([
        {
          id: 'org1', name: 'Acme', slug: 'acme',
          datasources_url: 'http://localhost:8082/acme/data-sources',
          is_default: true, is_current: true,
        },
        {
          id: 'org2', name: 'Beta', slug: 'beta',
          datasources_url: 'http://localhost:8082/beta/data-sources',
          is_default: false, is_current: false,
        },
      ]);
    });

    it('switchWorkspace hits /api/switch/:id, re-captures the cookie, and later calls use the new workspace', async () => {
      fetchImpl
        .mockResolvedValueOnce(loginResponse('org1', 'TOKEN'))
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            setCookie: ['tj_auth_token=TOKEN2; Path=/; HttpOnly'],
            json: { current_organization_id: 'org2', current_organization_slug: 'beta', current_organization_name: 'Beta' },
          })
        )
        .mockResolvedValueOnce(mockResponse({ status: 200, json: { ok: true } }));

      const auth = createAuth(config, fetchImpl as unknown as typeof fetch);
      const active = await auth.switchWorkspace('org2');
      expect(active).toEqual({
        id: 'org2', name: 'Beta', slug: 'beta',
        datasources_url: 'http://localhost:8082/beta/data-sources',
        is_current: true,
      });
      expect(fetchImpl.mock.calls[1][0]).toBe('http://localhost:3000/api/switch/org2');

      await auth.authedFetch('/api/apps');
      const [, init] = fetchImpl.mock.calls[2];
      const headers = new Headers(init.headers);
      expect(headers.get('Cookie')).toBe('tj_auth_token=TOKEN2');
      expect(headers.get('tj-workspace-id')).toBe('org2');
    });

    it('pins the configured workspace (TOOLJET_WORKSPACE_ID) at login', async () => {
      fetchImpl
        .mockResolvedValueOnce(loginResponse('org1', 'TOKEN')) // authenticate → default org1
        .mockResolvedValueOnce(
          mockResponse({
            status: 200,
            setCookie: ['tj_auth_token=TOKEN2; Path=/; HttpOnly'],
            json: { current_organization_id: 'org2', current_organization_slug: 'beta', current_organization_name: 'Beta' },
          })
        ) // switch → org2
        .mockResolvedValueOnce(mockResponse({ status: 200, json: { ok: true } })); // actual request

      const auth = createAuth({ ...config, workspaceId: 'org2' }, fetchImpl as unknown as typeof fetch);
      await auth.authedFetch('/api/apps');

      expect(fetchImpl.mock.calls[1][0]).toBe('http://localhost:3000/api/switch/org2');
      const [, init] = fetchImpl.mock.calls[2];
      expect(new Headers(init.headers).get('tj-workspace-id')).toBe('org2');
    });
  });
});
