import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHttpMcpServer, type HttpMcpServer } from '../src/httpServer.js';
import type { RequestIdentity } from '../src/config.js';

const runningServers: HttpMcpServer[] = [];

function testServerFactory(): McpServer {
  const server = new McpServer({ name: 'tooljet-mcp-http-test', version: '1.0.0' });
  server.registerTool('ping', { description: 'Returns pong' }, async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));
  return server;
}

async function listen(httpMcp: HttpMcpServer): Promise<URL> {
  await new Promise<void>((resolve, reject) => {
    httpMcp.server.once('error', reject);
    httpMcp.server.listen(0, '127.0.0.1', () => {
      httpMcp.server.off('error', reject);
      resolve();
    });
  });

  const address = httpMcp.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected an IP listener');
  return new URL(`http://127.0.0.1:${address.port}`);
}

afterEach(async () => {
  await Promise.allSettled(runningServers.splice(0).map((server) => server.close()));
});

describe('Streamable HTTP transport', () => {
  it('keeps a stateful MCP session from initialize through termination', async () => {
    const httpMcp = createHttpMcpServer({ serverFactory: testServerFactory });
    runningServers.push(httpMcp);
    const baseUrl = await listen(httpMcp);
    const client = new Client({ name: 'http-test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('/mcp', baseUrl));

    try {
      await client.connect(transport);
      expect(transport.sessionId).toBeTruthy();
      expect(httpMcp.sessionCount()).toBe(1);

      const result = await client.listTools();
      expect(result.tools.map((tool) => tool.name)).toContain('ping');

      await transport.terminateSession();
      expect(httpMcp.sessionCount()).toBe(0);
    } finally {
      await client.close();
    }
  });

  it('serves health and rejects non-initialize requests without a session', async () => {
    const httpMcp = createHttpMcpServer({ serverFactory: testServerFactory });
    runningServers.push(httpMcp);
    const baseUrl = await listen(httpMcp);

    const health = await fetch(new URL('/health', baseUrl));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok', transport: 'streamable-http' });

    const response = await fetch(new URL('/mcp', baseUrl), {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { message: 'Bad Request: No valid session ID provided' },
    });
  });
});

/* The shared-server case: one MCP serving every user, so the acting user has to arrive per request.
   These pin that it reaches the server factory and that a malformed identity is refused. */
describe('per-request identity over HTTP', () => {
  it('hands the acting user from the initialize headers to the server factory', async () => {
    const seen: Array<RequestIdentity | undefined> = [];
    const httpMcp = createHttpMcpServer({
      serverFactory: (identity) => {
        seen.push(identity);
        return testServerFactory();
      },
    });
    runningServers.push(httpMcp);
    const baseUrl = await listen(httpMcp);
    const client = new Client({ name: 'identity-test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL('/mcp', baseUrl), {
      requestInit: {
        headers: {
          'x-tooljet-session': 'SESSION',
          'x-tooljet-workspace-id': 'org-1',
          'x-tooljet-workspace-slug': 'acme',
        },
      },
    });

    try {
      await client.connect(transport);
      expect(seen).toEqual([{ sessionToken: 'SESSION', workspaceId: 'org-1', workspaceSlug: 'acme' }]);
    } finally {
      await client.close();
    }
  });

  it('builds no server for a half-supplied identity, refusing rather than falling back', async () => {
    let built = 0;
    const httpMcp = createHttpMcpServer({
      serverFactory: () => {
        built += 1;
        return testServerFactory();
      },
    });
    runningServers.push(httpMcp);
    const baseUrl = await listen(httpMcp);

    const response = await fetch(new URL('/mcp', baseUrl), {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        // Workspace withheld: acting on a guessed workspace is worse than not acting.
        'x-tooljet-session': 'SESSION',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'identity-test-client', version: '1.0.0' },
        },
      }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toMatch(/without x-tooljet-workspace-id/);
    expect(built).toBe(0);
  });
});
