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
});
