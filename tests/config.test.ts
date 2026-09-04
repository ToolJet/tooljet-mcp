import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, identityFromHeaders } from '../src/config.js';

describe('loadConfig', () => {
  beforeEach(() => {
    for (const k of [
      'TOOLJET_URL',
      'TOOLJET_APP_URL',
      'TOOLJET_DEPLOYMENT_URL',
      'TOOLJET_PAT',
      'TOOLJET_SESSION_TOKEN',
      'TOOLJET_WORKSPACE_ID',
      'TOOLJET_WORKSPACE_SLUG',
    ])
      delete process.env[k];
  });

  it('applies defaults for URLs and reads the token', () => {
    process.env.TOOLJET_PAT = 'tj_pat_test';
    const c = loadConfig();
    expect(c.apiUrl).toBe('http://localhost:3000');
    expect(c.appUrl).toBe('http://localhost:8082');
    expect(c.pat).toBe('tj_pat_test');
  });

  it('throws when no credential is configured', () => {
    expect(() => loadConfig()).toThrow(/TOOLJET_SESSION_TOKEN or TOOLJET_PAT/);
  });

  /* The in-product path: ToolJet's backend mints a session for the signed-in user and passes it
     here, so no PAT is configured at all. */
  it('accepts a backend-minted session in place of a token', () => {
    process.env.TOOLJET_SESSION_TOKEN = 'SESSION';
    process.env.TOOLJET_WORKSPACE_ID = 'org-1';
    process.env.TOOLJET_WORKSPACE_SLUG = 'acme';
    const c = loadConfig();
    expect(c.sessionToken).toBe('SESSION');
    expect(c.workspaceId).toBe('org-1');
    expect(c.workspaceSlug).toBe('acme');
    expect(c.pat).toBeUndefined();
  });

  /* A session cannot be interrogated for its workspace the way a PAT exchange response can. Guessing
     would mean acting on the wrong workspace, so this has to fail at startup rather than later. */
  it('refuses a session with no workspace rather than guessing one', () => {
    process.env.TOOLJET_SESSION_TOKEN = 'SESSION';
    expect(() => loadConfig()).toThrow(/TOOLJET_WORKSPACE_ID is required/);
  });
});

/* Most self-hosted instances serve the API and the UI from the same origin, so requiring a second
   URL for something used only to build a few cosmetic links is friction most deployments don't need. */
describe('appUrl defaults to the deployment origin', () => {
  beforeEach(() => {
    for (const k of [
      'TOOLJET_URL',
      'TOOLJET_APP_URL',
      'TOOLJET_DEPLOYMENT_URL',
      'TOOLJET_PAT',
      'TOOLJET_SESSION_TOKEN',
      'TOOLJET_WORKSPACE_ID',
    ])
      delete process.env[k];
  });

  it('falls back to TOOLJET_URL when neither app-URL variable is set', () => {
    process.env.TOOLJET_URL = 'https://tj.example.com';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().appUrl).toBe('https://tj.example.com');
  });

  it('still defaults to localhost:8082 when TOOLJET_URL itself is unset', () => {
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().appUrl).toBe('http://localhost:8082');
  });

  /* TOOLJET_APP_URL is the old name, kept working so nobody's existing config breaks. */
  it('prefers an explicit TOOLJET_APP_URL over the TOOLJET_URL fallback', () => {
    process.env.TOOLJET_URL = 'https://tj.example.com';
    process.env.TOOLJET_APP_URL = 'https://app.tj.example.com';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().appUrl).toBe('https://app.tj.example.com');
  });

  it('prefers TOOLJET_DEPLOYMENT_URL, the new name, over both TOOLJET_APP_URL and TOOLJET_URL', () => {
    process.env.TOOLJET_URL = 'https://tj.example.com';
    process.env.TOOLJET_APP_URL = 'https://old.example.com';
    process.env.TOOLJET_DEPLOYMENT_URL = 'https://new.example.com';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().appUrl).toBe('https://new.example.com');
  });

  /* A shared server acting for many different ToolJet backends has no single static app URL that
     could ever be right for all of them — its own TOOLJET_URL is just wherever ITS operator's config
     happens to point, unrelated to whoever the request is actually acting for. */
  it('follows the per-request apiUrl, not the server\'s own static TOOLJET_URL', () => {
    process.env.TOOLJET_URL = 'https://operators-own-instance.example.com';
    const c = loadConfig({
      sessionToken: 'SESSION',
      workspaceId: 'org-1',
      apiUrl: 'https://caller.example.com',
    });
    expect(c.appUrl).toBe('https://caller.example.com');
  });

  it('still lets an explicit TOOLJET_DEPLOYMENT_URL override the per-request apiUrl', () => {
    process.env.TOOLJET_DEPLOYMENT_URL = 'https://deliberately-different.example.com';
    const c = loadConfig({
      sessionToken: 'SESSION',
      workspaceId: 'org-1',
      apiUrl: 'https://caller.example.com',
    });
    expect(c.appUrl).toBe('https://deliberately-different.example.com');
  });

  /* Local dev with an identity but no request-named apiUrl and nothing configured: appUrl must land
     on the UI's own dev default (8082), the same as the no-identity/stdio branch below — not on
     apiUrl's internal 3000 default, which the identity branch would silently inherit via staticApiUrl
     if it fell through to that instead of explicitApiUrl. */
  it('falls back to localhost:8082, not apiUrl\'s own 3000 default, when nothing at all is configured', () => {
    const c = loadConfig({ sessionToken: 'SESSION', workspaceId: 'org-1' });
    expect(c.apiUrl).toBe('http://localhost:3000');
    expect(c.appUrl).toBe('http://localhost:8082');
  });
});

/* The reverse direction of the block above: most self-hosted instances serve the API and the UI from
   the same origin, so a deployment that only sets TOOLJET_DEPLOYMENT_URL shouldn't have to also set
   TOOLJET_URL to the identical value just to get an API origin. */
describe('apiUrl falls back to the deployment URL', () => {
  beforeEach(() => {
    for (const k of [
      'TOOLJET_URL',
      'TOOLJET_APP_URL',
      'TOOLJET_DEPLOYMENT_URL',
      'TOOLJET_PAT',
      'TOOLJET_SESSION_TOKEN',
      'TOOLJET_WORKSPACE_ID',
    ])
      delete process.env[k];
  });

  it('uses TOOLJET_DEPLOYMENT_URL as the API origin when TOOLJET_URL is unset', () => {
    process.env.TOOLJET_DEPLOYMENT_URL = 'https://tj.example.com';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().apiUrl).toBe('https://tj.example.com');
  });

  /* TOOLJET_APP_URL is the old name, kept working so nobody's existing config breaks. */
  it('also accepts the old TOOLJET_APP_URL name as the API origin fallback', () => {
    process.env.TOOLJET_APP_URL = 'https://tj.example.com';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().apiUrl).toBe('https://tj.example.com');
  });

  /* An explicit TOOLJET_URL is a deliberate override — e.g. the API and UI genuinely live on
     different origins — and must keep winning exactly as it did before this fallback existed. */
  it('still prefers an explicit TOOLJET_URL over TOOLJET_DEPLOYMENT_URL', () => {
    process.env.TOOLJET_URL = 'https://api.example.com';
    process.env.TOOLJET_DEPLOYMENT_URL = 'https://app.example.com';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().apiUrl).toBe('https://api.example.com');
  });

  it('still defaults to localhost:3000 when neither variable is set', () => {
    process.env.TOOLJET_PAT = 'tj_pat_test';
    expect(loadConfig().apiUrl).toBe('http://localhost:3000');
  });

  /* Same fallback, reached through the identity branch this time: an older ToolJet backend that
     doesn't yet send a per-request apiUrl should still get the deployment URL rather than silently
     landing on localhost:3000. */
  it('applies the same fallback for a request with no per-request apiUrl of its own', () => {
    process.env.TOOLJET_DEPLOYMENT_URL = 'https://tj.example.com';
    const c = loadConfig({ sessionToken: 'SESSION', workspaceId: 'org-1' });
    expect(c.apiUrl).toBe('https://tj.example.com');
  });
});

/* Staging and cloud run one shared MCP for every user, so identity arrives per request instead of
   from the environment. */
describe('per-request identity', () => {
  it('reads the acting user from headers', async () => {
    expect(
      await identityFromHeaders({
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
        'x-tooljet-workspace-slug': 'acme',
      })
    ).toEqual({ sessionToken: 'SESSION', workspaceId: 'org-1', workspaceSlug: 'acme' });
  });

  it('tolerates repeated headers and blank values', async () => {
    expect(
      await identityFromHeaders({
        'x-tooljet-session': ['SESSION', 'other'],
        'x-tooljet-workspace-id': 'org-1',
        'x-tooljet-workspace-slug': '   ',
      })
    ).toEqual({ sessionToken: 'SESSION', workspaceId: 'org-1', workspaceSlug: undefined });
  });

  it('returns undefined when the caller sent no identity at all', async () => {
    expect(await identityFromHeaders({ authorization: 'Bearer x' })).toBeUndefined();
  });

  /* Half an identity must fail loudly. Treating it as "no identity" would silently downgrade the
     request to the server's own shared credential — a build that looks right and is attributed to
     the wrong person, which is the one outcome this mechanism exists to prevent. */
  it('refuses a session with no workspace rather than falling back', async () => {
    await expect(identityFromHeaders({ 'x-tooljet-session': 'SESSION' })).rejects.toThrow(
      /without x-tooljet-workspace-id/
    );
  });

  it('refuses a workspace with no session', async () => {
    await expect(identityFromHeaders({ 'x-tooljet-workspace-id': 'org-1' })).rejects.toThrow(
      /without x-tooljet-session/
    );
  });

  /* The displacement rule: a shared server must not keep its own credential available while acting
     as someone else. */
  it('replaces a configured PAT rather than sitting alongside it', () => {
    process.env.TOOLJET_PAT = 'tj_pat_shared';
    const c = loadConfig({ sessionToken: 'SESSION', workspaceId: 'org-1' });
    expect(c.sessionToken).toBe('SESSION');
    expect(c.workspaceId).toBe('org-1');
    expect(c.pat).toBeUndefined();
  });

  it('needs no process credential at all when acting for a user', () => {
    expect(() => loadConfig({ sessionToken: 'SESSION', workspaceId: 'org-1' })).not.toThrow();
  });
});

describe('per-request PAT identity', () => {
  it('reads a caller-supplied PAT from its own header', async () => {
    expect(await identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_caller' })).toEqual({ pat: 'tj_pat_caller' });
  });

  it('needs no workspace header, because a PAT is pinned to the workspace it was issued in', async () => {
    await expect(identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_caller' })).resolves.not.toThrow();
  });

  it('refuses a PAT and a session together rather than picking one', async () => {
    await expect(
      identityFromHeaders({
        'x-tooljet-pat': 'tj_pat_caller',
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
      })
    ).rejects.toThrow(/not both/i);
  });

  it('makes the caller PAT the whole credential, never merging the process token', () => {
    process.env.TOOLJET_PAT = 'tj_pat_process';
    const c = loadConfig({ pat: 'tj_pat_caller' });
    expect(c.pat).toBe('tj_pat_caller');
    expect(c.sessionToken).toBeUndefined();
  });
});

describe('gateway servers refuse a PAT as identity', () => {
  it('rejects the PAT header outright when PATs are not allowed', async () => {
    await expect(
      identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_anyones' }, { allowPat: false })
    ).rejects.toThrow(/not accepted by this server/i);
  });

  it('rejects it even alongside a valid session, so it can never be the credential that wins', async () => {
    await expect(
      identityFromHeaders(
        { 'x-tooljet-pat': 'tj_pat_anyones', 'x-tooljet-session': 'S', 'x-tooljet-workspace-id': 'org-1' },
        { allowPat: false }
      )
    ).rejects.toThrow(/not accepted by this server/i);
  });

  it('still accepts a session, which is the only identity a shared server may act on', async () => {
    expect(
      await identityFromHeaders({ 'x-tooljet-session': 'S', 'x-tooljet-workspace-id': 'org-1' }, { allowPat: false })
    ).toEqual({ sessionToken: 'S', workspaceId: 'org-1', workspaceSlug: undefined });
  });

  it('defaults to allowing a PAT, so the direct path is unaffected', async () => {
    expect(await identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_mine' })).toEqual({ pat: 'tj_pat_mine' });
  });
});

/* One shared MCP server can act on many different ToolJet backends, so the request itself may name
   its target. That header gets the caller's session/PAT attached and sent straight to it (auth.ts),
   so it needs real validation, not just a truthy string. */
describe('per-request target origin (x-tooljet-url)', () => {
  beforeEach(() => {
    delete process.env.TOOLJET_URL;
    delete process.env.MCP_ALLOWED_API_ORIGINS;
    delete process.env.MCP_GATEWAY_URL;
    delete process.env.MCP_GATEWAY_TOKEN;
  });

  it('accepts an allowlisted bare https origin', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  /* ToolJet supports SUB_PATH hosting, so a self-hosted customer reverse-proxied under a path
     prefix is a legitimate target, not a malformed one. The allowlist names the host, not the path. */
  it('accepts a path prefix, for SUB_PATH-hosted self-hosted instances', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com/tooljet' })).toEqual({
      apiUrl: 'https://tj.example.com/tooljet',
    });
  });

  it('normalizes away a trailing slash rather than treating it as a different target', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com/tooljet/' })).toEqual({
      apiUrl: 'https://tj.example.com/tooljet',
    });
  });

  it('rejects plain http, which would send the session cookie or PAT in plaintext', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    await expect(identityFromHeaders({ 'x-tooljet-url': 'http://tj.example.com' })).rejects.toThrow(
      /must use https/
    );
  });

  it('rejects a query string', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com/?x=1' })).rejects.toThrow(
      /query, hash, or credentials/
    );
  });

  it('rejects embedded credentials', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://user:pass@tj.example.com' })).rejects.toThrow(
      /query, hash, or credentials/
    );
  });

  it('rejects a value that does not parse as an absolute URL', async () => {
    await expect(identityFromHeaders({ 'x-tooljet-url': 'not a url' })).rejects.toThrow(/valid absolute URL/);
  });

  /* https alone does not make a host trustworthy — an attacker's own domain has a valid cert too.
     Sending the session cookie or PAT there regardless of the allowlist is the exact exfiltration
     path this check exists to close. */
  it('rejects an origin not in MCP_ALLOWED_API_ORIGINS, even a well-formed https one', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://evil.example' })).rejects.toThrow(
      /not in MCP_ALLOWED_API_ORIGINS/
    );
  });

  it('rejects every https origin when the allowlist is unset — unset means empty, not "allow anything"', async () => {
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).rejects.toThrow(
      /not in MCP_ALLOWED_API_ORIGINS/
    );
  });

  it('accepts any origin named in a multi-entry, whitespace-tolerant allowlist', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = ' https://a.example.com , https://b.example.com ';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://b.example.com' })).toEqual({
      apiUrl: 'https://b.example.com',
    });
  });

  /* A raw string comparison would never match here: the request's origin is always in the form
     new URL(...).origin produces (lowercased, default port stripped, no trailing slash), so an
     allowlist entry written any other way has to be normalized the same way or it can never match —
     denying real traffic while looking, next to the error, like it should have worked. */
  it('normalizes an allowlist entry with different casing to the same origin', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://Tj.Example.com';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  it('normalizes an allowlist entry with a trailing slash', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com/';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  it('normalizes an allowlist entry carrying the default https port', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com:443';
    expect(await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  it('throws, naming the bad entry, when MCP_ALLOWED_API_ORIGINS has an unparseable value', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com, not a url';
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).rejects.toThrow(
      /not a valid URL: "not a url"/
    );
  });

  /* A request's own origin must already be https before it ever reaches the allowlist check
     (validateApiUrl), so a non-https allowlist entry — a typo'd "http://" — could never match
     anything. Silently keeping it would leave the operator with a dead entry and no signal it's
     wrong, the same shape of failure as the un-normalized entries this file already guards against. */
  it('throws, naming the bad entry, when MCP_ALLOWED_API_ORIGINS has a non-https entry', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'http://tj.example.com';
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).rejects.toThrow(
      /"http:\/\/tj\.example\.com" must use https/
    );
  });

  it('wins over a configured static TOOLJET_URL', () => {
    process.env.TOOLJET_URL = 'https://static.example.com';
    const c = loadConfig({ sessionToken: 'SESSION', workspaceId: 'org-1', apiUrl: 'https://request.example.com' });
    expect(c.apiUrl).toBe('https://request.example.com');
  });

  it('falls back to the static TOOLJET_URL when the request named none', () => {
    process.env.TOOLJET_URL = 'https://static.example.com';
    const c = loadConfig({ sessionToken: 'SESSION', workspaceId: 'org-1' });
    expect(c.apiUrl).toBe('https://static.example.com');
  });
});

/* The dynamic fallback for self-hosted customers: an origin outside the static allowlist is no
   longer rejected outright when the request also names a customerId — instead this asks the Gateway
   live. Real HTTP calls, hitting a local http server rather than mocking fetch, so the request shape
   (method, headers, body) is verified for real, not assumed. */
describe('per-request target origin — live Gateway fallback', () => {
  let gatewayServer: import('node:http').Server;
  let receivedRequests: Array<{ authorization?: string; body: unknown }>;
  let gatewayShouldAllow: boolean;

  beforeEach(async () => {
    delete process.env.TOOLJET_URL;
    delete process.env.MCP_ALLOWED_API_ORIGINS;
    receivedRequests = [];
    gatewayShouldAllow = true;
    const { createServer } = await import('node:http');
    gatewayServer = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        receivedRequests.push({ authorization: req.headers.authorization, body: JSON.parse(raw || '{}') });
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ allowed: gatewayShouldAllow }));
      });
    });
    await new Promise<void>((resolve) => gatewayServer.listen(0, resolve));
    const address = gatewayServer.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    process.env.MCP_GATEWAY_URL = `http://127.0.0.1:${port}`;
    process.env.MCP_GATEWAY_TOKEN = 'gateway-secret';
  });

  afterEach(async () => {
    delete process.env.MCP_GATEWAY_URL;
    delete process.env.MCP_GATEWAY_TOKEN;
    await new Promise<void>((resolve) => gatewayServer.close(() => resolve()));
  });

  it('accepts an origin outside the static allowlist when the Gateway says yes', async () => {
    expect(
      await identityFromHeaders({
        'x-tooljet-url': 'https://customer.example.com',
        'x-tooljet-customer-id': 'cust-1',
      })
    ).toEqual({ apiUrl: 'https://customer.example.com' });
    expect(receivedRequests).toEqual([
      { authorization: 'gateway-secret', body: { customer_id: 'cust-1', origin: 'https://customer.example.com' } },
    ]);
  });

  // Each test below names a distinct origin/customer — checkOriginWithGateway caches by
  // customer+origin at module scope, so reusing one across tests would read a stale cached verdict
  // from a previous test instead of exercising this one's gateway behavior.

  it('rejects when the Gateway says no', async () => {
    gatewayShouldAllow = false;
    await expect(
      identityFromHeaders({ 'x-tooljet-url': 'https://denied.example.com', 'x-tooljet-customer-id': 'cust-2' })
    ).rejects.toThrow(/not in MCP_ALLOWED_API_ORIGINS/);
  });

  it('rejects, without calling the Gateway, when no customer id was sent', async () => {
    await expect(identityFromHeaders({ 'x-tooljet-url': 'https://no-customer.example.com' })).rejects.toThrow(
      /not in MCP_ALLOWED_API_ORIGINS/
    );
    expect(receivedRequests).toEqual([]);
  });

  it('fails closed when MCP_GATEWAY_URL/TOKEN are unset even with a customer id', async () => {
    delete process.env.MCP_GATEWAY_URL;
    delete process.env.MCP_GATEWAY_TOKEN;
    await expect(
      identityFromHeaders({ 'x-tooljet-url': 'https://unconfigured.example.com', 'x-tooljet-customer-id': 'cust-3' })
    ).rejects.toThrow(/not in MCP_ALLOWED_API_ORIGINS/);
  });

  it('fails closed when the Gateway is unreachable', async () => {
    await new Promise<void>((resolve) => gatewayServer.close(() => resolve()));
    await expect(
      identityFromHeaders({ 'x-tooljet-url': 'https://unreachable.example.com', 'x-tooljet-customer-id': 'cust-4' })
    ).rejects.toThrow(/not in MCP_ALLOWED_API_ORIGINS/);
  });

  it('caches a Gateway response instead of calling it again for the same customer+origin', async () => {
    await identityFromHeaders({ 'x-tooljet-url': 'https://cached.example.com', 'x-tooljet-customer-id': 'cust-5' });
    await identityFromHeaders({ 'x-tooljet-url': 'https://cached.example.com', 'x-tooljet-customer-id': 'cust-5' });
    expect(receivedRequests).toHaveLength(1);
  });

  it('still checks the static allowlist first, without calling the Gateway at all', async () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(
      await identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com', 'x-tooljet-customer-id': 'cust-1' })
    ).toEqual({ apiUrl: 'https://tj.example.com' });
    expect(receivedRequests).toEqual([]);
  });
});

describe('blank environment variables count as unset', () => {
  beforeEach(() => {
    for (const k of [
      'TOOLJET_URL',
      'TOOLJET_APP_URL',
      'TOOLJET_DEPLOYMENT_URL',
      'TOOLJET_PAT',
      'TOOLJET_SESSION_TOKEN',
      'TOOLJET_WORKSPACE_ID',
    ])
      delete process.env[k];
  });

  it('falls back to defaults when a plugin host substitutes an unset var as an empty string', () => {
    process.env.TOOLJET_URL = '';
    process.env.TOOLJET_APP_URL = '';
    process.env.TOOLJET_PAT = 'tj_pat_test';
    const c = loadConfig();
    expect(c.apiUrl).toBe('http://localhost:3000');
    expect(c.appUrl).toBe('http://localhost:8082');
  });

  it('treats a whitespace-only credential as missing rather than authenticating with it', () => {
    process.env.TOOLJET_PAT = '   ';
    expect(() => loadConfig()).toThrow(/TOOLJET_PAT is required/);
  });
});
