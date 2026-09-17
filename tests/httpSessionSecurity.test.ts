import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHttpMcpServer, type HttpMcpServer, type HttpMcpServerOptions } from '../src/httpServer.js';
import { clearBuildTokens, mintBuildToken, revokeBuildToken } from '../src/buildTokens.js';

const running: HttpMcpServer[] = [];
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const body = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } } };
async function start(options: HttpMcpServerOptions = {}) {
  const factory = vi.fn(() => new McpServer({ name: 'test', version: '1' }));
  const http = createHttpMcpServer({ serverFactory: factory, ...options });
  running.push(http);
  await new Promise<void>((resolve) => http.server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + (http.server.address() as any).port;
  const init = async (auth: Record<string, string> = {}) => {
    const res = await fetch(base + '/mcp', { method: 'POST', headers: { ...headers, ...auth }, body: JSON.stringify(body) });
    await res.text();
    return res;
  };
  const request = (method: string, id: string, auth: Record<string, string> = {}) => fetch(base + '/mcp', {
    method, headers: { ...headers, 'mcp-session-id': id, ...auth },
    ...(method === 'POST' ? { body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) } : {}),
  });
  return { http, base, factory, init, request };
}
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(running.splice(0).map((s) => s.close()));
  clearBuildTokens();
});
const tokenAuth = () => ({ authorization: 'Bearer ' + mintBuildToken({ sessionToken: 'synthetic-session', workspaceId: 'test-workspace' }).token });

describe('stateful HTTP credential isolation and lifecycle', () => {
  it.each(['POST', 'GET', 'DELETE'])('requires the original bearer for %s', async (method) => {
    const { init, request, http } = await start();
    const auth = tokenAuth();
    const opened = await init(auth);
    const id = opened.headers.get('mcp-session-id')!;
    for (const incorrect of [{}, { authorization: 'Bearer different-user' }]) {
      const res = await request(method, id, incorrect);
      expect(res.status).toBe(401);
      await res.text();
      expect(http.sessionCount()).toBe(1); // someone else cannot terminate the owner's session
    }
    const valid = await request(method, id, auth);
    expect(valid.status).toBe(200);
    await valid.body?.cancel(); // GET is an SSE stream
  });

  it.each(['POST', 'GET', 'DELETE'])('refuses a revoked token on %s', async (method) => {
    const { init, request, http } = await start();
    const auth = tokenAuth();
    const id = (await init(auth)).headers.get('mcp-session-id')!;
    revokeBuildToken(auth.authorization.slice(7));
    expect((await request(method, id, auth)).status).toBe(401);
    expect(http.sessionCount()).toBe(0);
  });

  it('binds session and PAT headers even with a shared bearer', async () => {
    const { init, request } = await start();
    for (const user of [{ 'x-tooljet-pat': 'synthetic-pat' }, { 'x-tooljet-session': 'synthetic-session', 'x-tooljet-workspace-id': 'test-workspace' }]) {
      const auth = { authorization: 'Bearer shared-gate', ...user };
      const id = (await init(auth)).headers.get('mcp-session-id')!;
      const stolen = await request('POST', id, { authorization: 'Bearer shared-gate' });
      expect(stolen.status).toBe(401);
      expect((await request('POST', id, auth)).status).toBe(200);
    }
  });

  it('never lets URL or acting-user headers bypass a build token', async () => {
    vi.stubEnv('MCP_ALLOWED_API_ORIGINS', 'https://viewer.test');
    const { init, factory } = await start();
    const url = { 'x-tooljet-url': 'https://viewer.test' };
    expect((await init({ ...url, authorization: 'Bearer tjb_unknown' })).status).toBe(401);
    expect((await init(url)).status).toBe(401);
    expect(factory).not.toHaveBeenCalled();
    expect((await init({ ...url, ...tokenAuth(), 'x-tooljet-pat': 'wrong-user' })).status).toBe(200);
    expect(factory.mock.calls[0][0]).toMatchObject({ sessionToken: 'synthetic-session', workspaceId: 'test-workspace' });
  });

  it('bounds sessions, evicts idle sessions and closes their resources', async () => {
    let time = 0;
    const { init, http, factory } = await start({ maxSessions: 1, idleTimeoutMs: 100, now: () => time });
    expect((await init(tokenAuth())).status).toBe(200);
    const close = vi.spyOn(factory.mock.results[0].value, 'close');
    expect((await init(tokenAuth())).status).toBe(503);
    time = 101;
    expect((await init(tokenAuth())).status).toBe(200);
    expect(close).toHaveBeenCalled();
    expect(http.sessionCount()).toBe(1);
  });

  it('expires sessions at their maximum age despite recent activity', async () => {
    let time = 0;
    const { init, request, http } = await start({ maxSessionAgeMs: 100, idleTimeoutMs: 90, now: () => time });
    const auth = tokenAuth();
    const id = (await init(auth)).headers.get('mcp-session-id')!;
    time = 80;
    expect((await request('POST', id, auth)).status).toBe(200);
    time = 101;
    expect((await request('POST', id, auth)).status).toBe(401);
    expect(http.sessionCount()).toBe(0);
  });

  it('sweeps unused revoked sessions without another request', async () => {
    const { init, http } = await start({ sweepIntervalMs: 10 });
    const auth = tokenAuth();
    await init(auth);
    revokeBuildToken(auth.authorization.slice(7));
    await vi.waitFor(() => expect(http.sessionCount()).toBe(0));
  });
});
