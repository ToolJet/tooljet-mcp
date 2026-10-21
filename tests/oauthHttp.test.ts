import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOAuthHttpServer, oauthHttpOptionsFromEnv, OAUTH_MAX_BODY_BYTES } from '../src/oauthHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createGatewayHttpServer } from '../src/index.js';
import { createHttpMcpServer } from '../src/httpServer.js';
import { createAuth } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { createServer } from 'node:http';
import { z } from 'zod';
import { createClient } from '../src/tooljetClient.js';
import { verifyPageRenderTool } from '../src/tools/verifyPageRender.js';

const servers: Server[] = [];
const accessToken = 'tj_oauth_at_synthetic_access_token_for_http';
const resourceBase = 'https://mcp.synthetic.example/mcp';
const options = {
  issuer: 'https://tooljet.synthetic.example/api/mcp-oauth',
  resourceUrl: resourceBase,
  apiUrl: 'https://api.synthetic.example',
  appUrl: 'https://tooljet.synthetic.example',
  exchangeSecret: 'synthetic-service-secret-with-32-characters',
};
const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: { name: 'Synthetic client', version: '1' },
  },
};
const headers = {
  authorization: `Bearer ${accessToken}`,
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
};
const success = (browserUrl?: string) =>
  new Response(
    JSON.stringify({
      access_token: 'synthetic-internal-delegation',
      organization_id: 'garden-workspace',
      organization_slug: 'garden',
      grant_id: 'garden-grant',
      ...(browserUrl ? { browser_url: browserUrl } : {}),
    }),
    { headers: { 'content-type': 'application/json' } },
  );
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe('public MCP OAuth HTTP boundary', () => {
  it('publishes resource metadata and challenges clients with its exact discovery URL', async () => {
    const exchange = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange }));
    const challenge = await fetch(`${base}/mcp/garden`, { method: 'POST' });
    expect(challenge.status).toBe(401);
    expect(challenge.headers.get('www-authenticate')).toContain(
      'https://mcp.synthetic.example/.well-known/oauth-protected-resource/mcp/garden',
    );
    const metadata = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp/garden`)).json();
    expect(metadata.resource).toBe(`${resourceBase}/garden`);
    expect(metadata.authorization_servers).toEqual([options.issuer]);
    expect(metadata.scopes_supported).toEqual(['apps', 'data', 'workflows', 'workspace_users']);
    expect(challenge.headers.get('www-authenticate')).toContain('scope="apps data workflows workspace_users"');
    expect(exchange).not.toHaveBeenCalled();
  });
  it('exchanges credentials using configured endpoints and ignores injected identity/target headers', async () => {
    const customBrowser = 'https://garden.synthetic.example/tools';
    const exchange = vi.fn().mockImplementation(() => success(customBrowser));
    const factory = vi.fn(() => new McpServer({ name: 'synthetic', version: '1' }));
    const base = await listen(
      createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }),
    );
    const response = await fetch(`${base}/mcp/garden`, {
      method: 'POST',
      headers: {
        ...headers,
        'x-tooljet-url': 'https://attacker.example',
        'x-tooljet-session': 'injected-session',
        'x-tooljet-pat': 'injected-pat',
        'x-tooljet-oauth-grant-id': 'injected-grant',
      },
      body: JSON.stringify(initialize),
    });
    expect(response.status).toBe(200);
    expect(exchange.mock.calls[0][0]).toBe(`${options.issuer}/exchange`);
    expect(JSON.parse(exchange.mock.calls[0][1].body).resource).toBe(`${resourceBase}/garden`);
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: options.apiUrl,
        appUrl: customBrowser,
        viewerUrl: options.appUrl,
        sessionToken: 'synthetic-internal-delegation',
        isOAuthDelegation: true,
        oauthGrantId: 'garden-grant',
        workspaceId: 'garden-workspace',
      }),
    );
    expect(loadConfig(factory.mock.calls[0][0]).oauthGrantId).toBe('garden-grant');
    expect(loadConfig(factory.mock.calls[0][0])).toMatchObject({
      apiUrl: options.apiUrl,
      appUrl: customBrowser,
      viewerUrl: options.appUrl,
    });
  });
  it.each(['POST'])(
    'authenticates %s even when a caller supplies an MCP session id',
    async (method) => {
      const exchange = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 }));
      const factory = vi.fn();
      const base = await listen(
        createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }),
      );
      const unauthenticated = await fetch(`${base}/mcp/garden`, {
        method,
        headers: { 'mcp-session-id': 'stolen-session' },
      });
      expect(unauthenticated.status).toBe(401);
      const revoked = await fetch(`${base}/mcp/garden`, {
        method,
        headers: { ...headers, 'mcp-session-id': 'stolen-session' },
      });
      expect(revoked.status).toBe(401);
      expect(exchange).toHaveBeenCalledOnce();
      expect(factory).not.toHaveBeenCalled();
    },
  );
  it.each(['GET', 'DELETE', 'PUT'])('rejects unsupported %s before exchanging credentials or creating a server', async (method) => {
    const exchange = vi.fn();
    const factory = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }));
    for (const requestHeaders of [{}, headers]) {
      const response = await fetch(`${base}/mcp/garden`, { method, headers: requestHeaders });
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST, OPTIONS');
      expect(response.headers.get('www-authenticate')).toBeNull();
      expect(await response.json()).toEqual({ error: 'method_not_allowed' });
    }
    expect(exchange).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
  });
  it.each([
    [401, 'private deployment detail', 'unexpected_response'],
    [401, JSON.stringify({ error: 'invalid_client', error_description: 'private deployment detail' }), 'invalid_client'],
    [503, JSON.stringify({ error: 'temporarily_unavailable', error_description: 'private deployment detail' }), 'temporarily_unavailable'],
    [429, JSON.stringify({ error: 'private deployment detail' }), 'unexpected_response'],
  ])('reports exchange service failure %s without a login challenge or sensitive logs', async (status, body, expectedCode) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exchange = vi.fn().mockResolvedValue(new Response(body as string, { status: status as number }));
    const factory = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }));
    const response = await fetch(`${base}/mcp/garden`, { method: 'POST', headers });
    expect(response.status).toBe(503);
    expect(response.headers.get('www-authenticate')).toBeNull();
    expect(await response.json()).toEqual({ error: 'temporarily_unavailable' });
    expect(log).toHaveBeenCalledWith('[mcp-oauth] Credential exchange unavailable', {
      status, error: expectedCode,
    });
    const logged = JSON.stringify(log.mock.calls);
    for (const value of ['private deployment detail', accessToken, options.exchangeSecret]) expect(logged).not.toContain(value);
    expect(factory).not.toHaveBeenCalled();
  });
  it('rejects oversized tokens before exchange without logging private credentials', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exchange = vi.fn();
    const factory = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }));
    const response = await fetch(`${base}/mcp/garden`, {
      method: 'POST', headers: { authorization: `Bearer tj_oauth_at_${'x'.repeat(4096)}` },
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('invalid_token');
    expect(await response.json()).toEqual({ error: 'invalid_token' });
    expect(exchange).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
  it.each([
    ['network', 'exchange_request_failed'],
    ['non-json', 'invalid_delegation_response'],
    ['missing-credential', 'invalid_delegation_response'],
    ['invalid-browser-url', 'invalid_delegation_response'],
  ])('logs only a fixed category for %s exchange failures', async (failure, expectedCode) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const privateDetail = `private backend detail ${accessToken} ${options.exchangeSecret}`;
    const exchange = vi.fn(async () => {
      if (failure === 'network') throw new Error(privateDetail);
      if (failure === 'non-json') return new Response(privateDetail);
      if (failure === 'missing-credential') return new Response(JSON.stringify({ privateDetail }));
      return success('http://private-backend.example');
    });
    const factory = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }));
    const response = await fetch(`${base}/mcp/garden`, { method: 'POST', headers });
    expect(response.status).toBe(503);
    expect(response.headers.get('www-authenticate')).toBeNull();
    expect(await response.json()).toEqual({ error: 'temporarily_unavailable' });
    expect(log).toHaveBeenCalledExactlyOnceWith('[mcp-oauth] Credential exchange unavailable', { error: expectedCode });
    const logged = JSON.stringify(log.mock.calls);
    for (const value of ['private backend detail', 'private-backend.example', accessToken, options.exchangeSecret]) {
      expect(logged).not.toContain(value);
    }
    expect(factory).not.toHaveBeenCalled();
  });
  it('supports tool discovery and calls after initialization while rechecking every request', async () => {
    let active = true;
    const exchange = vi.fn(() => Promise.resolve(active ? success() : new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 })));
    const factory = () => {
      const server = new McpServer({ name: 'synthetic', version: '1' });
      server.registerTool('garden_status', { inputSchema: {} }, async () => ({
        content: [{ type: 'text', text: 'Garden ready' }],
      }));
      return server;
    };
    const base = await listen(
      createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }),
    );
    const rpc = (message: unknown) =>
      fetch(`${base}/mcp/garden`, { method: 'POST', headers, body: JSON.stringify(message) });
    expect((await rpc(initialize)).status).toBe(200);
    const list = await (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })).json();
    expect(list.result.tools[0].name).toBe('garden_status');
    const call = await (
      await rpc({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'garden_status', arguments: {} },
      })
    ).json();
    expect(call.result.content[0].text).toBe('Garden ready');
    active = false;
    expect((await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: {} })).status).toBe(401);
    expect(exchange).toHaveBeenCalledTimes(4);
  });
  it('rejects PATs and query-string tokens instead of falling back to server credentials', async () => {
    const exchange = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange }));
    for (const [suffix, auth] of [
      ['', 'Bearer tj_pat_example'],
      ['?access_token=token', headers.authorization],
    ]) {
      const response = await fetch(`${base}/mcp/garden${suffix}`, {
        method: 'POST',
        headers: { authorization: auth },
      });
      expect(response.status).toBe(401);
    }
    expect(exchange).not.toHaveBeenCalled();
  });
  it('rejects unapproved browser origins and exposes authorization headers to approved ones', async () => {
    const exchange = vi.fn();
    const base = await listen(
      createOAuthHttpServer({
        ...options,
        fetchImpl: exchange,
        allowedOrigins: ['https://client.synthetic.example'],
      }),
    );
    const blocked = await fetch(`${base}/mcp/garden`, { headers: { origin: 'https://attacker.example' } });
    expect(blocked.status).toBe(403);
    const allowed = await fetch(`${base}/mcp/garden`, {
      method: 'OPTIONS',
      headers: { origin: 'https://client.synthetic.example' },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(allowed.headers.get('access-control-expose-headers')).toContain('WWW-Authenticate');
    expect(exchange).not.toHaveBeenCalled();
  });
  it('fails closed on exchange failures without echoing token/error responses', async () => {
    const exchange = vi.fn().mockResolvedValue(new Response('secret backend detail', { status: 500 }));
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange }));
    const response = await fetch(`${base}/mcp/garden`, { method: 'POST', headers });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
  });
  it('treats a token for another workspace as invalid, without suggesting broader scopes', async () => {
    const exchange = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_target' }), { status: 403 }));
    const factory = vi.fn();
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }));
    const response = await fetch(`${base}/mcp/garden`, { method: 'POST', headers });
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('error="invalid_token"');
    expect(await response.json()).toEqual({ error: 'invalid_token' });
    expect(factory).not.toHaveBeenCalled();
  });
  it('supports a rotated access token on the next stateless request', async () => {
    const exchange = vi.fn().mockImplementation(success);
    const factory = vi.fn(() => new McpServer({ name: 'synthetic', version: '1' }));
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory }));
    for (const token of [accessToken, 'tj_oauth_at_synthetic_rotated_access']) {
      const response = await fetch(`${base}/mcp/garden`, {
        method: 'POST', headers: { ...headers, authorization: `Bearer ${token}` }, body: JSON.stringify(initialize),
      });
      expect(response.status).toBe(200);
    }
    expect(exchange.mock.calls.map((call) => JSON.parse(call[1].body).subject_token)).toEqual([
      accessToken, 'tj_oauth_at_synthetic_rotated_access',
    ]);
    expect(factory).toHaveBeenCalledTimes(2);
  });
  it('accepts a supported 10 MiB image encoded into a tool request and rejects an over-limit body', async () => {
    const factory = () => {
      const server = new McpServer({ name: 'synthetic', version: '1' });
      server.registerTool('measure_sample', { inputSchema: { sample: z.string() } }, async ({ sample }) => ({
        content: [{ type: 'text', text: String(sample.length) }],
      }));
      return server;
    };
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: vi.fn().mockImplementation(success), serverFactory: factory }));
    const sample = Buffer.alloc(10 * 1024 * 1024, 0).toString('base64');
    const response = await fetch(`${base}/mcp/garden`, {
      method: 'POST', headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'measure_sample', arguments: { sample } } }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).result.content[0].text).toBe(String(sample.length));
    const oversized = await fetch(`${base}/mcp/garden`, { method: 'POST', headers, body: 'x'.repeat(OAUTH_MAX_BODY_BYTES + 1) });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ error: 'request_too_large' });
  });
  it('rejects a streamed body over the byte limit without Content-Length', async () => {
    const factory = vi.fn();
    const server = createOAuthHttpServer({ ...options, maxBodyBytes: 1024,
      fetchImpl: vi.fn().mockImplementation(success), serverFactory: factory });
    let receivedHeaders: import('node:http').IncomingHttpHeaders | undefined;
    server.once('request', (request) => { receivedHeaders = request.headers; });
    const base = await listen(server);
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(600)));
        controller.enqueue(new TextEncoder().encode('y'.repeat(600)));
        controller.close();
      },
    });
    const response = await fetch(`${base}/mcp/garden`, {
      method: 'POST', headers, body, duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    expect(receivedHeaders?.['content-length']).toBeUndefined();
    expect(receivedHeaders?.['transfer-encoding']).toBe('chunked');
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'request_too_large' });
    expect(factory).not.toHaveBeenCalled();
  });
  it('mints only a separate app-pinned viewer credential with the fixed OAuth identity', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'synthetic-readonly-viewer', token_type: 'Bearer', expires_in: 120,
      organization_id: 'garden-id', app_id: 'synthetic-app',
    })));
    const config = {
      apiUrl: options.apiUrl, appUrl: 'https://garden.synthetic.example', viewerUrl: options.appUrl,
      sessionToken: 'synthetic-delegation',
      workspaceId: 'garden-id', isOAuthDelegation: true,
    };
    const auth = createAuth(config, fetchImpl);
    const viewer = await auth.viewerSession?.('synthetic-app');
    expect(viewer).toMatchObject({ cookieName: 'tj_oauth_viewer', token: 'synthetic-readonly-viewer', origin: options.appUrl });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0]).toBe(`${options.apiUrl}/api/mcp-oauth/viewer`);
    const init = fetchImpl.mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({ app_id: 'synthetic-app' });
    expect(init.headers.get('x-tooljet-delegation')).toBe('synthetic-delegation');
    expect(init.headers.get('tj-workspace-id')).toBe('garden-id');
    expect(init.headers.get('cookie')).toBeNull();
    expect(init.redirect).toBe('error');
  });
  it.each([
    { app_id: 'another-app' }, { organization_id: 'another-workspace' },
    { access_token: 'synthetic-delegation' }, { expires_in: 121 }, { expires_in: 0 },
  ])('rejects an incorrectly scoped viewer response without browser or PAT fallback: %j', async (change) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'synthetic-readonly-viewer', token_type: 'Bearer', expires_in: 120,
      organization_id: 'garden-id', app_id: 'synthetic-app', ...change,
    })));
    const auth = createAuth({ apiUrl: options.apiUrl, appUrl: options.appUrl, sessionToken: 'synthetic-delegation',
      workspaceId: 'garden-id', isOAuthDelegation: true, pat: 'synthetic-unused-pat' }, fetchImpl);
    await expect(auth.viewerSession?.('synthetic-app')).rejects.toThrow('Invalid scoped OAuth viewer credential');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
  it('stops OAuth rendering before launching a browser when scoped viewer minting fails', async () => {
    const driver = vi.fn();
    const client = { browserRenderOrigin: options.appUrl,
      getAppSummary: async () => ({ pages: [{ handle: 'home' }] }),
      viewerSession: async () => { throw new Error('OAuth viewer authorization failed'); },
    } as any;
    const result = await verifyPageRenderTool(client, () => options.appUrl, driver).handler({ app_id: 'synthetic-app' });
    expect(result.isError).toBe(true);
    expect(driver).not.toHaveBeenCalled();
  });
  it('does not use an alternate configured viewer origin for an OAuth connection', async () => {
    vi.stubEnv('MCP_RENDER_AUDIT_ALLOWED_ORIGINS', 'https://alternate.synthetic.example');
    const auth = createAuth({ apiUrl: options.apiUrl, appUrl: options.appUrl, sessionToken: 'synthetic-delegation',
      workspaceId: 'garden-id', isOAuthDelegation: true }, vi.fn());
    const driver = vi.fn();
    const result = await verifyPageRenderTool(createClient(auth, { apiUrl: options.apiUrl, appUrl: options.appUrl, isOAuthDelegation: true }),
      () => options.appUrl, driver).handler({ app_id: 'synthetic-app', viewer_url: 'https://alternate.synthetic.example' });
    expect(result.isError).toBe(true);
    expect(driver).not.toHaveBeenCalled();
  });
  it('does not retry a revoked delegation as a fallback PAT or carry another identity', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 }));
    const auth = createAuth({
      apiUrl: options.apiUrl, appUrl: options.appUrl, sessionToken: 'synthetic-delegation',
      workspaceId: 'garden-id', isOAuthDelegation: true, pat: 'tj_pat_synthetic_fallback',
    }, fetchImpl);
    await expect(auth.authedFetch('/api/apps', {
      headers: { Cookie: 'tj_auth_token=other', Authorization: 'Bearer other', tj_auth_token: 'other' },
    })).rejects.toThrow('OAuth connection expired or lost access');
    expect(fetchImpl).toHaveBeenCalledOnce();
    const sent = fetchImpl.mock.calls[0][1].headers as Headers;
    expect(sent.get('x-tooljet-delegation')).toBe('synthetic-delegation');
    expect(sent.get('cookie')).toBeNull();
    expect(sent.get('authorization')).toBeNull();
    expect(sent.get('tj_auth_token')).toBeNull();
    await expect(auth.viewerSession?.()).rejects.toThrow('An app is required');
  });
  it.each(['gateway', 'stateful'])(
    'the %s entry point selects the same OAuth-only boundary',
    async (entry) => {
      for (const [name, value] of Object.entries({
        MCP_OAUTH_ENABLED: 'true',
        MCP_OAUTH_ISSUER: options.issuer,
        MCP_OAUTH_RESOURCE_URL: resourceBase,
        MCP_OAUTH_EXCHANGE_SECRET: options.exchangeSecret,
        TOOLJET_DEPLOYMENT_URL: options.appUrl,
        TOOLJET_URL: options.apiUrl,
      }))
        vi.stubEnv(name, value);
      vi.stubEnv('MCP_SHARED_TOKEN', '');
      const server = entry === 'gateway' ? createGatewayHttpServer().server : createHttpMcpServer().server;
      const base = await listen(server);
      const response = await fetch(`${base}/mcp/garden`, {
        method: 'POST',
        headers: { authorization: 'Bearer tj_pat_example' },
      });
      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toContain('resource_metadata');
    },
  );
  it('rejects mixed internal-gateway/public-OAuth configuration', () => {
    vi.stubEnv('MCP_OAUTH_ENABLED', 'true');
    vi.stubEnv('MCP_SHARED_TOKEN', 'internal-secret');
    expect(() => oauthHttpOptionsFromEnv()).toThrow('separate processes');
  });
  it('sends only the delegation header and never follows an API redirect with that credential', async () => {
    const redirectedRequest = vi.fn();
    const otherBackend = await listen(createServer((req, res) => {
      redirectedRequest(req.headers);
      res.writeHead(200).end();
    }));
    const requestHeaders: Record<string, unknown>[] = [];
    const api = await listen(createServer((req, res) => {
      requestHeaders.push(req.headers);
      res.writeHead(302, { location: otherBackend }).end();
    }));
    const auth = createAuth({
      apiUrl: api,
      appUrl: options.appUrl,
      sessionToken: 'synthetic-internal-delegation',
      isOAuthDelegation: true,
      workspaceId: 'garden-id',
    });
    await expect(auth.authedFetch('/api/apps')).rejects.toThrow();
    expect(requestHeaders[0]['x-tooljet-delegation']).toBe('synthetic-internal-delegation');
    expect(requestHeaders[0]['tj-workspace-id']).toBe('garden-id');
    expect(requestHeaders[0].cookie).toBeUndefined();
    expect(redirectedRequest).not.toHaveBeenCalled();
  });
});

describe('exchange admission', () => {
  it('rejects excess requests before backend exchange even with rotating junk tokens', async () => {
    vi.stubEnv('MCP_OAUTH_EXCHANGE_RATE_LIMIT', '2');
    const exchange = vi.fn(async () => new Response('{"error":"invalid_token"}', { status: 401 }));
    const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange }));
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${base}/mcp/garden`, { method: 'POST',
        headers: { ...headers, authorization: `Bearer tj_oauth_at_synthetic_junk_${i}` }, body: '{}' });
      expect(response.status).toBe(i < 2 ? 401 : 429);
      if (i === 2) {
        expect(response.headers.get('retry-after')).toBeTruthy();
        expect(response.headers.get('www-authenticate')).toBeNull();
      }
    }
    expect(exchange).toHaveBeenCalledTimes(2);
  });
});

it('successful exchanges sharing an IP do not consume the failed-token budget', async () => {
  vi.stubEnv('MCP_OAUTH_EXCHANGE_RATE_LIMIT', '2');
  const exchange = vi.fn(async () => success());
  const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange,
    serverFactory: () => new McpServer({ name: 'synthetic-shared-ip', version: '1.0.0' }) }));
  for (let i = 0; i < 10; i++) {
    const response = await fetch(`${base}/mcp/garden`, { method: 'POST', headers, body: JSON.stringify(initialize) });
    expect(response.status).toBe(200);
  }
  expect(exchange).toHaveBeenCalledTimes(10);
});
it('caps concurrent exchanges before calling the backend and releases capacity afterward', async () => {
  let release: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const exchange = vi.fn(async () => { await hold; return new Response('{"error":"invalid_token"}', { status: 401 }); });
  const base = await listen(createOAuthHttpServer({ ...options, fetchImpl: exchange }));
  const pending = Array.from({ length: 64 }, () => fetch(`${base}/mcp/garden`, { method: 'POST', headers, body: '{}' }));
  try {
    await vi.waitFor(() => expect(exchange).toHaveBeenCalledTimes(64));
    const excess = await fetch(`${base}/mcp/garden`, { method: 'POST', headers, body: '{}' });
    expect(excess.status).toBe(503);
    expect(excess.headers.get('retry-after')).toBe('1');
    expect(exchange).toHaveBeenCalledTimes(64);
  } finally { release!(); await Promise.all(pending); }
  const next = await fetch(`${base}/mcp/garden`, { method: 'POST', headers, body: '{}' });
  expect(next.status).toBe(401);
  expect(exchange).toHaveBeenCalledTimes(65);
});
