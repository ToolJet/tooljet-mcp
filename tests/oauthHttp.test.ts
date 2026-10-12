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
const success = () =>
  new Response(
    JSON.stringify({
      access_token: 'synthetic-internal-delegation',
      organization_id: 'garden-workspace',
      organization_slug: 'garden',
      grant_id: 'garden-grant',
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
    const exchange = vi.fn().mockImplementation(success);
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
        appUrl: options.appUrl,
        sessionToken: 'synthetic-internal-delegation',
        isOAuthDelegation: true,
        oauthGrantId: 'garden-grant',
        workspaceId: 'garden-workspace',
      }),
    );
    expect(loadConfig(factory.mock.calls[0][0]).oauthGrantId).toBe('garden-grant');
  });
  it.each(['GET', 'POST', 'DELETE'])(
    'authenticates %s even when a caller supplies an MCP session id',
    async (method) => {
      const exchange = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
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
  it('supports tool discovery and calls after initialization while rechecking every request', async () => {
    let active = true;
    const exchange = vi.fn(() => Promise.resolve(active ? success() : new Response('', { status: 401 })));
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
  it('mints only a separate app-pinned viewer credential with the fixed OAuth identity', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'synthetic-readonly-viewer', token_type: 'Bearer', expires_in: 120,
      organization_id: 'garden-id', app_id: 'synthetic-app',
    })));
    const config = {
      apiUrl: options.apiUrl, appUrl: options.appUrl, sessionToken: 'synthetic-delegation',
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
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 401 }));
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
