import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createGatewayHttpServer } from '../src/index.js';

/* The two fixes below were flagged in review as untested and would regress silently: identity-object
   truthiness standing in for "a user was named" (index.ts's requireUserSession gate), and
   MCP_REQUIRE_REQUEST_URL living somewhere unreachable. Both are pre-handshake, early-return checks
   in the raw request handler, so plain fetch() is enough — no need for a full MCP client/handshake. */

const ENV_KEYS = [
  'MCP_SHARED_TOKEN',
  'MCP_REQUIRE_USER_SESSION',
  'MCP_REQUIRE_REQUEST_URL',
  'MCP_ALLOWED_API_ORIGINS',
  'TOOLJET_PAT',
  'TOOLJET_SESSION_TOKEN',
];

const runningServers: Server[] = [];

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

function initializeBody() {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'index-test-client', version: '1.0.0' },
    },
  });
}

const jsonHeaders = { accept: 'application/json, text/event-stream', 'content-type': 'application/json' };

beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(async () => {
  await Promise.allSettled(runningServers.splice(0).map((server) => new Promise((r) => server.close(r))));
});

describe('createGatewayHttpServer — mode selection', () => {
  it('reports gateway mode when MCP_SHARED_TOKEN is set', () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    expect(createGatewayHttpServer().gatewayMode).toBe(true);
  });

  it('reports direct mode when MCP_SHARED_TOKEN is unset', () => {
    expect(createGatewayHttpServer().gatewayMode).toBe(false);
  });
});

describe('gateway mode — bearer gate', () => {
  it('rejects a request with no bearer token', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), { method: 'POST', headers: jsonHeaders, body: initializeBody() });
    expect(res.status).toBe(401);
  });

  it('rejects a request with the wrong bearer token', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer wrong-token' },
      body: initializeBody(),
    });
    expect(res.status).toBe(401);
  });
});

/* The actual bypass: a request carrying ONLY x-tooljet-url (no session, no PAT) used to produce a
   truthy `identity` object (it has an apiUrl field), which satisfied `!identity` and walked straight
   past the "must act on behalf of a signed-in user" check with nobody actually signed in. */
describe('gateway mode — requireUserSession is not satisfied by an apiUrl-only identity', () => {
  it('refuses a request with only x-tooljet-url and no session, same as a request with nothing at all', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    // No TOOLJET_PAT/TOOLJET_SESSION_TOKEN on the server, so requireUserSession is implicitly on.
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        authorization: 'Bearer shared-secret',
        'x-tooljet-url': 'https://tj.example.com',
      },
      body: initializeBody(),
    });

    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/acts only on behalf of a signed-in user/);
  });

  it('still refuses a bare request with no identity headers at all', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer shared-secret' },
      body: initializeBody(),
    });

    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/acts only on behalf of a signed-in user/);
  });

  it('accepts a real session, which is what the gate is meant to require', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        authorization: 'Bearer shared-secret',
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
      },
      body: initializeBody(),
    });

    // Clears both the session gate and the request-URL gate (unset, so not required); whatever
    // happens next is the MCP handshake's concern, not this gate's.
    expect(res.status).not.toBe(400);
    expect(res.status).not.toBe(401);
  });
});

/* The other bypass: MCP_REQUIRE_REQUEST_URL used to live inside loadConfig's `if (identity)` branch,
   which a fully headerless request never reaches (identity arrives as undefined either way) — so the
   flag could never actually fire for the one case it exists to catch. */
describe('gateway mode — MCP_REQUIRE_REQUEST_URL is reachable', () => {
  it('refuses a request with a valid session but no x-tooljet-url when the flag is set', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    process.env.MCP_REQUIRE_REQUEST_URL = 'true';
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        authorization: 'Bearer shared-secret',
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
      },
      body: initializeBody(),
    });

    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/backend named in the request/);
  });

  it('does not require it when the flag is unset', async () => {
    process.env.MCP_SHARED_TOKEN = 'shared-secret';
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        authorization: 'Bearer shared-secret',
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
      },
      body: initializeBody(),
    });

    expect(res.status).not.toBe(400);
  });
});

describe('direct mode', () => {
  it('refuses a request with no credential anywhere', async () => {
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), { method: 'POST', headers: jsonHeaders, body: initializeBody() });
    expect(res.status).toBe(401);
    expect(await res.text()).toMatch(/No ToolJet credential/);
  });

  it('accepts a PAT sent as a bearer token', async () => {
    const { server } = createGatewayHttpServer();
    runningServers.push(server);
    const baseUrl = await listen(server);

    const res = await fetch(new URL('/', baseUrl), {
      method: 'POST',
      headers: { ...jsonHeaders, authorization: 'Bearer tj_pat_caller' },
      body: initializeBody(),
    });

    expect(res.status).not.toBe(401);
  });
});
