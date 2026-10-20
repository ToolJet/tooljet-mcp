import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import { createOAuthHttpServer } from '../src/oauthHttp.js';
import { createGatewayHttpServer } from '../src/index.js';
import { createHttpMcpServer } from '../src/httpServer.js';
import { analyticsIdentity } from '../src/posthog.js';
import { recordHttpResponse, withToolTelemetry } from '../src/telemetry.js';
import { fail, ok } from '../src/tools/types.js';

const servers: Server[] = [];
const analyticsServers: ReturnType<typeof createOAuthHttpServer>[] = [];
const options = {
  issuer: 'https://tooljet.synthetic.example/api/mcp-oauth',
  resourceUrl: 'https://mcp.synthetic.example/mcp',
  apiUrl: 'https://api.synthetic.example',
  appUrl: 'https://tooljet.synthetic.example',
  exchangeSecret: 'synthetic-exchange-secret-at-least-32-characters',
};
const headers = {
  authorization: 'Bearer tj_oauth_at_synthetic_analytics_token',
  'content-type': 'application/json', accept: 'application/json, text/event-stream',
};
async function listen(server: Server) {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
async function collector() {
  const batches: any[] = [];
  const url = await listen(createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    batches.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"Ok"}');
  }));
  vi.stubEnv('POSTHOG_PROJECT_TOKEN', 'synthetic-project-token');
  vi.stubEnv('POSTHOG_HOST', url);
  return batches;
}
function exchangeResponse() {
  return new Response(JSON.stringify({
    access_token: 'synthetic-internal-delegation', organization_id: 'orchard-workspace',
    organization_slug: 'orchard', grant_id: 'orchard-grant',
  }), { headers: { 'content-type': 'application/json' } });
}
const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {
  protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'Codex synthetic client', version: '1' },
} };
beforeEach(() => {
  vi.stubEnv('POSTHOG_PROJECT_TOKEN', '');
  vi.stubEnv('POSTHOG_HOST', '');
  vi.stubEnv('POSTHOG_ENVIRONMENT', 'local-test');
  vi.stubEnv('MCP_OAUTH_ENABLED', '');
  vi.stubEnv('MCP_SHARED_TOKEN', '');
  vi.stubEnv('TOOLJET_URL', options.apiUrl);
  vi.stubEnv('TOOLJET_DEPLOYMENT_URL', options.appUrl);
  vi.stubEnv('MCP_REQUIRE_REQUEST_URL', '');
  vi.stubEnv('MCP_GATEWAY_URL', '');
  vi.stubEnv('MCP_GATEWAY_TOKEN', '');
});
afterEach(async () => {
  await Promise.all(analyticsServers.splice(0).map((server) => server.shutdownAnalytics()));
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('OAuth MCP with a local PostHog collector', () => {
  it.each([true, false])('serves real MCP requests with tracking enabled=%s', async (enabled) => {
    const batches: any[] = [];
    const receivedPaths: string[] = [];
    const collector = await listen(createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      batches.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      receivedPaths.push(`${req.method} ${req.url}`);
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"status":1}');
    }));
    vi.stubEnv('POSTHOG_PROJECT_TOKEN', enabled ? 'synthetic-project-token' : '');
    vi.stubEnv('POSTHOG_HOST', collector);
    const exchange = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      access_token: 'synthetic-internal-delegation', organization_id: 'orchard-workspace',
      organization_slug: 'orchard', grant_id: 'orchard-grant',
    }), { headers: { 'content-type': 'application/json' } }));
    const factory = () => {
      const server = new McpServer({ name: 'synthetic', version: '1' });
      server.registerTool('orchard_status', { inputSchema: z.object({ note: z.string(), mode: z.string() }).strict() }, async ({ mode }) =>
        withToolTelemetry('orchard_status', async () => {
          recordHttpResponse(new Response(null, { headers: { 'content-length': '23' } }));
          if (mode === 'throw') throw new Error('private thrown failure');
          if (mode === 'error') return fail(new Error('private reported failure'));
          return ok({ message: 'private tool output', warnings: ['private warning text'] });
        }));
      return server;
    };
    const server = createOAuthHttpServer({ ...options, fetchImpl: exchange, serverFactory: factory });
    analyticsServers.push(server);
    const base = await listen(server);
    const rpc = (body: unknown) => fetch(`${base}/mcp/orchard`, { method: 'POST', headers, body: JSON.stringify(body) });
    const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'Grok Build private suffix', version: '1' },
    } };
    expect((await rpc(initialize)).status).toBe(200);
    for (const mode of ['ok', 'error', 'throw']) {
      const response = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: {
        name: 'orchard_status', arguments: { note: 'private input note', mode },
      } });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.result.isError === true).toBe(mode !== 'ok');
    }
    // SDK validation happens before a tool handler, so these rejections are not handler metrics.
    for (const params of [
      { name: 'orchard_status', arguments: { note: 'synthetic input', mode: 'ok', unexpected: true } },
      { name: 'nonexistent_synthetic_tool', arguments: {} },
    ]) {
      const rejected = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params });
      const body = await rejected.json();
      expect(body.result?.isError || body.error).toBeTruthy();
    }
    // Discovery, unauthenticated requests, and malformed initialization do not count as usage.
    expect((await fetch(`${base}/health`)).status).toBe(200);
    expect((await fetch(`${base}/.well-known/oauth-protected-resource/mcp/orchard`)).status).toBe(200);
    expect((await fetch(`${base}/mcp/orchard`, { method: 'POST' })).status).toBe(401);
    await rpc({ jsonrpc: '2.0', id: 3, method: 'initialize', params: {} });
    exchange.mockImplementationOnce(async () => new Response(null, { status: 401 }));
    expect((await rpc(initialize)).status).toBe(401);
    await server.shutdownAnalytics();
    if (!enabled) {
      expect(batches).toEqual([]);
      return;
    }
    expect(receivedPaths).toEqual(['POST /batch/']);
    expect(batches[0].api_key).toBe('synthetic-project-token');
    const events = batches.flatMap((batch) => batch.batch);
    expect(events.map((event) => event.event)).toEqual([
      'mcp_client_initialized', 'mcp_tool_completed', 'mcp_tool_completed', 'mcp_tool_completed',
    ]);
    expect(events[0].properties.client_family).toBe('grok');
    expect(events.slice(1).map((event) => event.properties.error)).toEqual([false, true, true]);
    expect(events[1].properties).toMatchObject({
      tool_name: 'orchard_status', http_requests: 1, upstream_response_bytes: 23, warnings: 1,
    });
    const expectedIdentity = analyticsIdentity(options.issuer, 'orchard-grant', 'orchard-workspace');
    for (const event of events) {
      expect(event.distinct_id).toBe(expectedIdentity.connectionId);
      expect(event.properties.workspace_id).toBe(expectedIdentity.workspaceId);
    }
    expect(JSON.stringify(events)).not.toMatch(/private|synthetic_analytics_token|synthetic-internal-delegation|orchard-grant|orchard-workspace|tooljet.synthetic/);
  });

  it('counts completed handshakes, excluding notifications and including a single-item batch', async () => {
    const batches = await collector();
    const server = createOAuthHttpServer({
      ...options, fetchImpl: async () => exchangeResponse(),
      serverFactory: () => new McpServer({ name: 'synthetic', version: '1' }),
    });
    analyticsServers.push(server);
    const base = await listen(server);
    const rpc = (body: unknown) => fetch(`${base}/mcp/orchard`, { method: 'POST', headers, body: JSON.stringify(body) });
    const { id: _id, ...notification } = initialize;
    expect((await rpc(notification)).status).toBe(202);
    await server.shutdownAnalytics();
    expect(batches).toEqual([]);

    const batchServer = createOAuthHttpServer({
      ...options, fetchImpl: async () => exchangeResponse(),
      serverFactory: () => new McpServer({ name: 'synthetic', version: '1' }),
    });
    analyticsServers.push(batchServer);
    const batchBase = await listen(batchServer);
    const response = await fetch(`${batchBase}/mcp/orchard`, {
      method: 'POST', headers, body: JSON.stringify([initialize]),
    });
    expect(response.status).toBe(200);
    await batchServer.shutdownAnalytics();
    expect(batches.flatMap(batch => batch.batch).map(event => event.event)).toEqual(['mcp_client_initialized']);
  });

  it.each(['gateway', 'standalone'])('drains analytics and bounds shutdown with an open SSE stream via %s', async (entrypoint) => {
    const batches = await collector();
    vi.stubEnv('MCP_OAUTH_ENABLED', 'true');
    vi.stubEnv('MCP_OAUTH_ISSUER', options.issuer);
    vi.stubEnv('MCP_OAUTH_RESOURCE_URL', options.resourceUrl);
    vi.stubEnv('MCP_OAUTH_EXCHANGE_SECRET', options.exchangeSecret);
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, init) =>
      String(url) === `${options.issuer}/exchange` ? Promise.resolve(exchangeResponse()) : realFetch(url, init));
    const gateway = entrypoint === 'gateway' ? createGatewayHttpServer() : undefined;
    const standalone = entrypoint === 'standalone' ? createHttpMcpServer() : undefined;
    const server = gateway?.server ?? standalone!.server;
    const close = gateway?.closeGracefully ?? standalone!.close;
    if (gateway) expect(gateway.shutdownAnalytics).toBeTypeOf('function');
    const base = await listen(server);
    const abort = new AbortController();
    try {
      const stream = await fetch(`${base}/mcp/orchard`, { headers, signal: abort.signal });
      expect(stream.status).toBe(200);
      const result = await fetch(`${base}/mcp/orchard`, {
        method: 'POST', headers, body: JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'tools/call',
          params: { name: 'get_component_catalog', arguments: { types: ['Text'], sections: ['overview'] } },
        }),
      });
      expect((await result.json()).result.isError).not.toBe(true);
      const started = Date.now();
      const closing = close();
      expect(close()).toBe(closing);
      await closing;
      expect(Date.now() - started).toBeLessThan(7500);
      expect(batches.flatMap(batch => batch.batch).map(event => event.event)).toEqual(['mcp_tool_completed']);
    } finally {
      abort.abort();
      await close();
    }
  }, 8000);

  it('sends no analytics for real PAT, gateway, or standalone tool traffic', async () => {
    const batches = await collector();
    for (const mode of ['pat', 'gateway', 'standalone']) {
      vi.stubEnv('MCP_SHARED_TOKEN', mode === 'gateway' ? 'synthetic-gateway-token' : '');
      const standalone = mode === 'standalone' ? createHttpMcpServer() : undefined;
      const gateway = standalone ? undefined : createGatewayHttpServer();
      const server = standalone?.server ?? gateway!.server;
      if (gateway) expect(gateway.shutdownAnalytics).toBeUndefined();
      const base = await listen(server);
      const sdk = new Client({ name: 'Synthetic client', version: '1' });
      const requestHeaders = mode === 'gateway' ? {
        authorization: 'Bearer synthetic-gateway-token',
        'x-tooljet-session': 'synthetic-session', 'x-tooljet-workspace-id': 'orchard',
      } : { 'x-tooljet-pat': 'synthetic-pat' };
      try {
        await sdk.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
          requestInit: { headers: requestHeaders },
        }));
        const result = await sdk.callTool({
          name: 'get_component_catalog', arguments: { types: ['Text'], sections: ['overview'] },
        });
        expect(result.isError).not.toBe(true);
      } finally {
        await sdk.close();
        if (standalone) await standalone.close();
        else await new Promise<void>(resolve => server.close(() => resolve()));
      }
    }
    // Also catch a mistakenly queued event that was never drained by close().
    await new Promise(resolve => setTimeout(resolve, 5100));
    expect(batches).toEqual([]);
  }, 10000);
});
