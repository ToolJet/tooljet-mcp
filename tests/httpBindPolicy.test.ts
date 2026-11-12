import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHttpMcpServer, isLoopbackHost, standaloneHttpPolicy, type HttpMcpServer } from '../src/httpServer.js';
import { createGatewayHttpServer } from '../src/index.js';
import type { RequestIdentity } from '../src/config.js';

/*
  A standalone HTTP server reachable beyond loopback must not act for a caller with the credential configured on its
  own process: src/http.ts refuses such a bind unless every request brings its own credential (or OAuth is on), and
  index.ts's direct mode off loopback refuses requests that bring none.
*/
const running: Array<{ close: () => Promise<unknown> }> = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.allSettled(running.splice(0).map((s) => s.close()));
});

async function listen(server: Server): Promise<URL> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected an IP listener');
  return new URL(`http://127.0.0.1:${address.port}`);
}

const initialize = (headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json', ...headers },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'bind-test', version: '1.0.0' } } }),
});

describe('which bind addresses are loopback', () => {
  it.each(['127.0.0.1', '127.1.2.3', 'localhost', '::1', '[::1]', '::ffff:127.0.0.1'])('%s is', (host) => expect(isLoopbackHost(host)).toBe(true));
  it.each(['0.0.0.0', '::', '10.0.0.5', '192.168.1.10', 'mcp.example.com', '128.0.0.1'])('%s is not', (host) => expect(isLoopbackHost(host)).toBe(false));
});

describe('the standalone HTTP entry point (src/http.ts)', () => {
  it('refuses to listen beyond loopback with the process credential', () => {
    expect(() => standaloneHttpPolicy('0.0.0.0', { TOOLJET_PAT: 'static' })).toThrow(/Refusing to listen on 0\.0\.0\.0/);
    expect(() => standaloneHttpPolicy('10.0.0.5', {})).toThrow(/Refusing/);
  });

  it('listens beyond loopback when every request must bring its own credential, or OAuth is on', () => {
    expect(standaloneHttpPolicy('0.0.0.0', { TOOLJET_MCP_HTTP_REQUIRE_IDENTITY: '1' })).toEqual({ requireIdentity: true });
    expect(standaloneHttpPolicy('0.0.0.0', { MCP_OAUTH_ENABLED: 'true' })).toEqual({ requireIdentity: false });
  });

  it('keeps loopback development as it was', () => {
    expect(standaloneHttpPolicy('127.0.0.1', { TOOLJET_PAT: 'static' })).toEqual({ requireIdentity: false });
  });

  const recordingFactory = (seen: Array<RequestIdentity | undefined>) => (identity?: RequestIdentity) => {
    seen.push(identity);
    return new McpServer({ name: 'bind-test', version: '1.0.0' });
  };

  it('with identity required, refuses an initialize that brings no credential, before any server is built', async () => {
    const seen: Array<RequestIdentity | undefined> = [];
    const httpMcp: HttpMcpServer = createHttpMcpServer({ requireIdentity: true, serverFactory: recordingFactory(seen) });
    running.push(httpMcp);
    const base = await listen(httpMcp.server);
    const res = await fetch(new URL('/mcp', base), initialize());
    expect(res.status).toBe(401);
    expect(await res.text()).toMatch(/own ToolJet credential/);
    expect(seen).toEqual([]);
  });

  it('with identity required, serves a caller that brings its own PAT', async () => {
    const seen: Array<RequestIdentity | undefined> = [];
    const httpMcp = createHttpMcpServer({ requireIdentity: true, serverFactory: recordingFactory(seen) });
    running.push(httpMcp);
    const base = await listen(httpMcp.server);
    const res = await fetch(new URL('/mcp', base), initialize({ authorization: 'Bearer caller-pat' }));
    expect(res.status).toBe(200);
    expect(seen).toEqual([expect.objectContaining({ pat: 'caller-pat' })]);
  });

  it('on loopback without the requirement, still opens a credential-free local session', async () => {
    const seen: Array<RequestIdentity | undefined> = [];
    const httpMcp = createHttpMcpServer({ serverFactory: recordingFactory(seen) });
    running.push(httpMcp);
    const base = await listen(httpMcp.server);
    expect((await fetch(new URL('/mcp', base), initialize())).status).toBe(200);
    expect(seen).toEqual([undefined]);
  });
});

describe('index.ts direct mode bound beyond loopback', () => {
  const start = async (bindHost?: string) => {
    const { server } = createGatewayHttpServer({ bindHost });
    running.push({ close: () => new Promise((resolve) => server.close(resolve)) });
    return listen(server);
  };

  it('never lets the process TOOLJET_PAT act for a request that brings none', async () => {
    vi.stubEnv('MCP_SHARED_TOKEN', '');
    vi.stubEnv('TOOLJET_PAT', 'static-process-pat');
    vi.stubEnv('TOOLJET_URL', 'http://127.0.0.1:9');
    const base = await start('0.0.0.0');
    const res = await fetch(new URL('/mcp', base), initialize());
    expect(res.status).toBe(401);
    expect(await res.text()).not.toMatch(/set TOOLJET_PAT/);
  });

  it('on loopback keeps the operator\'s configured credential', async () => {
    vi.stubEnv('MCP_SHARED_TOKEN', '');
    vi.stubEnv('TOOLJET_PAT', 'static-process-pat');
    vi.stubEnv('TOOLJET_URL', 'http://127.0.0.1:9');
    for (const host of [undefined, '127.0.0.1']) {
      const base = await start(host);
      const res = await fetch(new URL('/mcp', base), initialize());
      expect(res.status).not.toBe(401);
    }
  });
});
