import { afterEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHttpMcpServer, type HttpMcpServer } from '../src/httpServer.js';

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
