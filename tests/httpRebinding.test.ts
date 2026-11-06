import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createGatewayHttpServer } from '../src/index.js';
import { createHttpMcpServer } from '../src/httpServer.js';
import { foreignRequest, isLoopbackName } from '../src/requestOrigin.js';

/*
  The local HTTP transports accepted any Host and Origin, so a web page whose host name was rebound to 127.0.0.1 could
  call a developer's MCP server, which acted with the operator's PAT (direct mode) or stored CLI login (src/http.ts).
  And gateway mode fell back to the process PAT for a request that named no user, unless MCP_REQUIRE_USER_SESSION was set.
*/
const ENV_KEYS = ['MCP_SHARED_TOKEN', 'MCP_REQUIRE_USER_SESSION', 'TOOLJET_PAT', 'TOOLJET_URL', 'MCP_ALLOWED_HOSTS', 'MCP_ALLOWED_ORIGINS', 'MCP_OAUTH_ENABLED'];
const running: Server[] = [];
const seen: string[] = [];

const listen = async (server: Server): Promise<number> => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  running.push(server);
  return (server.address() as AddressInfo).port;
};

/** A raw POST, so the Host header is exactly what a rebound browser sends. */
const post = (port: number, headers: Record<string, string>, body: unknown): Promise<{ status: number; text: string }> =>
  new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: '/mcp', method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers } }, (res) => {
      let text = '';
      res.on('data', (chunk) => (text += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
    });
    req.on('error', reject);
    req.end(JSON.stringify(body));
  });

const toolsCall = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_workspaces', arguments: {} } };
const init = { jsonrpc: '2.0', id: 0, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'x', version: '1' } } };

let backendUrl: string;
beforeEach(async () => {
  for (const k of ENV_KEYS) delete process.env[k];
  seen.length = 0;
  const backend = createServer((req, res) => {
    seen.push(`${req.url} ${req.headers.authorization ?? ''}`);
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/personal-access-tokens/session') return res.end(JSON.stringify({ authToken: 'jwt', organizationId: 'ws-op', organizationSlug: 'op' }));
    res.end('{"organizations":[]}');
  });
  backendUrl = `http://127.0.0.1:${await listen(backend)}`;
});
afterEach(async () => {
  for (const k of ENV_KEYS) delete process.env[k];
  await Promise.allSettled(running.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe('Host and Origin rules', () => {
  it('knows loopback names', () => {
    for (const name of ['localhost', 'app.localhost', '127.0.0.1', '127.1.2.3', '::1', '[::1]']) expect(isLoopbackName(name), name).toBe(true);
    for (const name of ['attacker.example', '10.0.0.1', 'localhost.attacker.example', '0.0.0.0']) expect(isLoopbackName(name), name).toBe(false);
  });

  it('refuses a foreign Host on a loopback server and a foreign Origin everywhere', () => {
    const loopback = { bindHost: '127.0.0.1', env: {} };
    expect(foreignRequest({ headers: { host: '127.0.0.1:8787' } }, loopback)).toBeUndefined();
    expect(foreignRequest({ headers: { host: 'localhost:8787', origin: 'http://localhost:6274' } }, loopback)).toBeUndefined();
    expect(foreignRequest({ headers: { host: 'attacker.example:8787' } }, loopback)).toMatch(/Host/);
    expect(foreignRequest({ headers: { host: '127.0.0.1:8787', origin: 'http://attacker.example' } }, loopback)).toMatch(/Origin/);
    expect(foreignRequest({ headers: { host: '127.0.0.1:8787', origin: 'null' } }, loopback)).toMatch(/Origin/);
    // A wildcard bind is reached under names it cannot know, so only its Origin is checked (unless hosts are configured).
    expect(foreignRequest({ headers: { host: 'mcp.tooljet.example' } }, { bindHost: '0.0.0.0', env: {} })).toBeUndefined();
    expect(foreignRequest({ headers: { host: 'mcp.tooljet.example', origin: 'https://mcp.tooljet.example' } }, { bindHost: '0.0.0.0', env: {} })).toMatch(/Origin/);
    expect(foreignRequest({ headers: { host: 'evil.example' } }, { bindHost: '0.0.0.0', env: { MCP_ALLOWED_HOSTS: 'mcp.tooljet.example' } })).toMatch(/Host/);
    expect(foreignRequest({ headers: { host: 'mcp.tooljet.example:443', origin: 'https://app.tooljet.example' } },
      { bindHost: '0.0.0.0', env: { MCP_ALLOWED_HOSTS: 'mcp.tooljet.example', MCP_ALLOWED_ORIGINS: 'https://app.tooljet.example' } })).toBeUndefined();
    // The configured bind address itself is a valid Host.
    expect(foreignRequest({ headers: { host: '10.0.0.5:8787' } }, { bindHost: '10.0.0.5', env: {} })).toBeUndefined();
  });
});

describe('direct mode (src/index.ts) on loopback with the operator PAT', () => {
  beforeEach(() => Object.assign(process.env, { TOOLJET_PAT: 'OPERATOR-PAT', TOOLJET_URL: backendUrl }));

  it('refuses a rebound request (foreign Host and Origin) before ToolJet is called', async () => {
    const port = await listen(createGatewayHttpServer({ bindHost: '127.0.0.1' }).server);
    const res = await post(port, { host: 'attacker.example:8787', origin: 'http://attacker.example:8787' }, toolsCall);
    expect(res.status).toBe(403);
    expect(seen).toEqual([]);
  });

  it('refuses a cross-site page posting to 127.0.0.1', async () => {
    const port = await listen(createGatewayHttpServer().server);
    const res = await post(port, { host: `127.0.0.1:${port}`, origin: 'https://attacker.example' }, toolsCall);
    expect(res.status).toBe(403);
    expect(seen).toEqual([]);
  });

  it('serves a local client (no Origin, or a localhost Origin)', async () => {
    const port = await listen(createGatewayHttpServer().server);
    expect((await post(port, { host: `127.0.0.1:${port}` }, init)).status).toBe(200);
    expect((await post(port, { host: `localhost:${port}`, origin: 'http://localhost:6274' }, init)).status).toBe(200);
  });
});

describe('src/http.ts transport (httpServer.ts)', () => {
  it('refuses a rebound initialize and serves a local one', async () => {
    Object.assign(process.env, { TOOLJET_PAT: 'OPERATOR-PAT', TOOLJET_URL: backendUrl });
    const port = await listen(createHttpMcpServer({ bindHost: '127.0.0.1' }).server);
    const rebound = await post(port, { host: 'attacker.example:3001', origin: 'http://attacker.example:3001' }, init);
    expect(rebound.status).toBe(403);
    expect(rebound.text).not.toMatch(/mcp-session-id/i);
    expect((await post(port, { host: `127.0.0.1:${port}` }, init)).status).toBe(200);
  });
});

describe('gateway mode never acts with the process PAT', () => {
  it('refuses a shared-bearer request that names no user, even with TOOLJET_PAT set and MCP_REQUIRE_USER_SESSION unset', async () => {
    Object.assign(process.env, { TOOLJET_PAT: 'OPERATOR-PAT', TOOLJET_URL: backendUrl, MCP_SHARED_TOKEN: 'shared-secret' });
    const port = await listen(createGatewayHttpServer().server);
    const res = await post(port, { authorization: 'Bearer shared-secret' }, toolsCall);
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/acts only on behalf of a signed-in user/);
    expect(seen.some((line) => line.includes('OPERATOR-PAT'))).toBe(false);
  });

  it('still serves a request that names its user', async () => {
    Object.assign(process.env, { TOOLJET_PAT: 'OPERATOR-PAT', TOOLJET_URL: backendUrl, MCP_SHARED_TOKEN: 'shared-secret' });
    const port = await listen(createGatewayHttpServer().server);
    const res = await post(port, { authorization: 'Bearer shared-secret', 'x-tooljet-session': 'SESSION', 'x-tooljet-workspace-id': 'org-1' }, init);
    expect(res.status).toBe(200);
  });
});
