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
