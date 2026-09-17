import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHttpMcpServer, type HttpMcpServer } from '../src/httpServer.js';
import { buildTokenCount, clearBuildTokens, mintBuildToken, resolveBuildToken, revokeBuildToken } from '../src/buildTokens.js';
import type { RequestIdentity } from '../src/config.js';

const runningServers: HttpMcpServer[] = [];
const SECRET = 'shared-mint-secret';
const SESSION = 'session-token-for-the-acting-user';
const WORKSPACE = '78b028f8-5994-4ccd-8ef9-abe4758241f6';

let seen: (RequestIdentity | undefined)[] = [];

function factory(identity?: RequestIdentity): McpServer {
  seen.push(identity);
  const server = new McpServer({ name: 'tooljet-mcp-build-token-test', version: '1.0.0' });
  server.registerTool('ping', { description: 'Returns pong' }, async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));
  return server;
}

async function listen(httpMcp: HttpMcpServer): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    httpMcp.server.once('error', reject);
    httpMcp.server.listen(0, '127.0.0.1', () => {
      httpMcp.server.off('error', reject);
      resolve();
    });
  });
  const address = httpMcp.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected an IP listener');
  return `http://127.0.0.1:${address.port}`;
}

async function start(): Promise<string> {
  const httpMcp = createHttpMcpServer({ serverFactory: factory });
  runningServers.push(httpMcp);
  return listen(httpMcp);
}

/** An initialize call carrying only a bearer, the way a hosted harness connects. */
async function initializeWithBearer(base: string, bearer: string): Promise<Response> {
  return fetch(`${base}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'probe', version: '0' } },
    }),
  });
}

beforeEach(() => {
  clearBuildTokens();
  seen = [];
  process.env.MCP_BUILD_TOKEN_SECRET = SECRET;
});

afterEach(async () => {
  delete process.env.MCP_BUILD_TOKEN_SECRET;
  clearBuildTokens();
  await Promise.allSettled(runningServers.splice(0).map((server) => server.close()));
});

describe('build tokens', () => {
  it('resolves to the identity it was minted for, and expires', () => {
    const { token } = mintBuildToken({ sessionToken: SESSION, workspaceId: WORKSPACE });
    expect(resolveBuildToken(token)?.sessionToken).toBe(SESSION);
    expect(resolveBuildToken('tjb_never-minted')).toBeUndefined();
    expect(resolveBuildToken(SESSION)).toBeUndefined(); // not token-shaped

    const expired = mintBuildToken({ sessionToken: SESSION, workspaceId: WORKSPACE }, 60_000);
    const realNow = Date.now;
    Date.now = () => realNow() + 61_000;
    try {
      expect(resolveBuildToken(expired.token)).toBeUndefined();
    } finally {
      Date.now = realNow;
    }
  });

  it('revokes early and never collides', () => {
    const { token } = mintBuildToken({ sessionToken: SESSION, workspaceId: WORKSPACE });
    expect(revokeBuildToken(token)).toBe(true);
    expect(resolveBuildToken(token)).toBeUndefined();
    expect(revokeBuildToken(token)).toBe(false);

    clearBuildTokens();
    const tokens = new Set(Array.from({ length: 200 }, () => mintBuildToken({ sessionToken: SESSION, workspaceId: WORKSPACE }).token));
    expect(tokens.size).toBe(200);
    expect(buildTokenCount()).toBe(200);
  });

  it('mints over HTTP for the caller named by the request headers', async () => {
    const base = await start();
    const response = await fetch(`${base}/build-token`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${SECRET}`,
        'x-tooljet-session': SESSION,
        'x-tooljet-workspace-id': WORKSPACE,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ttl_seconds: 900 }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { token: string; expires_at: string };
    expect(body.token.startsWith('tjb_')).toBe(true);
    expect(Date.parse(body.expires_at)).toBeGreaterThan(Date.now());
    expect(resolveBuildToken(body.token)?.workspaceId).toBe(WORKSPACE);
  });

  it('refuses to mint without the secret, and refuses a token that names nobody', async () => {
    const base = await start();
    const unauthorized = await fetch(`${base}/build-token`, {
      method: 'POST',
      headers: { authorization: 'Bearer wrong-secret', 'x-tooljet-session': SESSION, 'x-tooljet-workspace-id': WORKSPACE },
    });
    expect(unauthorized.status).toBe(401);

    const anonymous = await fetch(`${base}/build-token`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(anonymous.status).toBe(400);
    expect((await anonymous.json() as { error: string }).error).toMatch(/signed-in user/);

    const pat = await fetch(`${base}/build-token`, {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}`, 'x-tooljet-pat': 'a-personal-access-token' },
    });
    expect(pat.status).toBe(400);
  });

  it('is off entirely when no secret is configured', async () => {
    delete process.env.MCP_BUILD_TOKEN_SECRET;
    const previous = process.env.TOOLJET_MCP_TOKEN;
    delete process.env.TOOLJET_MCP_TOKEN;
    try {
      const base = await start();
      const response = await fetch(`${base}/build-token`, { method: 'POST', headers: { authorization: `Bearer ${SECRET}` } });
      expect(response.status).toBe(404);
    } finally {
      if (previous !== undefined) process.env.TOOLJET_MCP_TOKEN = previous;
    }
  });

  it('an MCP request carrying a build token acts as that user, not as a PAT holder', async () => {
    const base = await start();
    const { token } = mintBuildToken({ sessionToken: SESSION, workspaceId: WORKSPACE, apiUrl: 'https://example.tooljet.test' });

    const ok = await initializeWithBearer(base, token);
    expect(ok.status).toBe(200);
    expect(seen.at(-1)).toMatchObject({ sessionToken: SESSION, workspaceId: WORKSPACE });
    expect(seen.at(-1)?.pat).toBeUndefined();

    // A plain bearer is still treated as a PAT, so the two entry points keep agreeing.
    await initializeWithBearer(base, 'a-personal-access-token');
    expect(seen.at(-1)).toMatchObject({ pat: 'a-personal-access-token' });
  });

  it('refuses an unknown or expired build token instead of falling back to a PAT', async () => {
    const base = await start();
    const response = await initializeWithBearer(base, 'tjb_this-was-never-minted');
    expect(response.status).toBe(401);
    expect(seen.length).toBe(0);
  });

  it('revocation ends a session that is already open', async () => {
    // Identity is bound at initialize, but a token's VALIDITY is not: checking only at initialize
    // meant revoke-then-call still ran the tool on an open session, which is not revocation at all.
    const base = await start();
    const { token } = mintBuildToken({ sessionToken: SESSION, workspaceId: WORKSPACE });
    const opened = await initializeWithBearer(base, token);
    expect(opened.status).toBe(200);
    const sessionId = opened.headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();

    const call = () => fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-session-id': sessionId as string,
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
    });

    expect((await call()).status).toBe(200);
    expect(revokeBuildToken(token)).toBe(true);
    const afterRevoke = await call();
    expect(afterRevoke.status).toBe(401);
  });
});

describe('app visibility', () => {
  it('the client offers no way to publish an app', async () => {
    // Strict, and enforced by absence rather than by a flag: the render audit used to flip an app
    // public to reach a private page and flip it back, so a failed restore left it world-readable
    // with nothing watching. Visibility belongs to the owner, changed in the product.
    const client = await import('../src/tooljetClient.js');
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('../src/tools/verifyPageRender.ts', import.meta.url), 'utf8'));
    expect(Object.keys(client)).not.toContain('setAppPublic');
    expect(source).not.toMatch(/setAppPublic|is_public/);
    expect(source).not.toMatch(/MAKE_PUBLIC/);
  });
});
