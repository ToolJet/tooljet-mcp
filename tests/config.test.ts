import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, identityFromHeaders } from '../src/config.js';

describe('loadConfig', () => {
  beforeEach(() => {
    for (const k of [
      'TOOLJET_URL',
      'TOOLJET_APP_URL',
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

/* Staging and cloud run one shared MCP for every user, so identity arrives per request instead of
   from the environment. */
describe('per-request identity', () => {
  it('reads the acting user from headers', () => {
    expect(
      identityFromHeaders({
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
        'x-tooljet-workspace-slug': 'acme',
      })
    ).toEqual({ sessionToken: 'SESSION', workspaceId: 'org-1', workspaceSlug: 'acme' });
  });

  it('tolerates repeated headers and blank values', () => {
    expect(
      identityFromHeaders({
        'x-tooljet-session': ['SESSION', 'other'],
        'x-tooljet-workspace-id': 'org-1',
        'x-tooljet-workspace-slug': '   ',
      })
    ).toEqual({ sessionToken: 'SESSION', workspaceId: 'org-1', workspaceSlug: undefined });
  });

  it('returns undefined when the caller sent no identity at all', () => {
    expect(identityFromHeaders({ authorization: 'Bearer x' })).toBeUndefined();
  });

  /* Half an identity must fail loudly. Treating it as "no identity" would silently downgrade the
     request to the server's own shared credential — a build that looks right and is attributed to
     the wrong person, which is the one outcome this mechanism exists to prevent. */
  it('refuses a session with no workspace rather than falling back', () => {
    expect(() => identityFromHeaders({ 'x-tooljet-session': 'SESSION' })).toThrow(
      /without x-tooljet-workspace-id/
    );
  });

  it('refuses a workspace with no session', () => {
    expect(() => identityFromHeaders({ 'x-tooljet-workspace-id': 'org-1' })).toThrow(
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
  it('reads a caller-supplied PAT from its own header', () => {
    expect(identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_caller' })).toEqual({ pat: 'tj_pat_caller' });
  });

  it('needs no workspace header, because a PAT is pinned to the workspace it was issued in', () => {
    expect(() => identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_caller' })).not.toThrow();
  });

  it('refuses a PAT and a session together rather than picking one', () => {
    expect(() =>
      identityFromHeaders({
        'x-tooljet-pat': 'tj_pat_caller',
        'x-tooljet-session': 'SESSION',
        'x-tooljet-workspace-id': 'org-1',
      })
    ).toThrow(/not both/i);
  });

  it('makes the caller PAT the whole credential, never merging the process token', () => {
    process.env.TOOLJET_PAT = 'tj_pat_process';
    const c = loadConfig({ pat: 'tj_pat_caller' });
    expect(c.pat).toBe('tj_pat_caller');
    expect(c.sessionToken).toBeUndefined();
  });
});

describe('gateway servers refuse a PAT as identity', () => {
  it('rejects the PAT header outright when PATs are not allowed', () => {
    expect(() => identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_anyones' }, { allowPat: false })).toThrow(
      /not accepted by this server/i
    );
  });

  it('rejects it even alongside a valid session, so it can never be the credential that wins', () => {
    expect(() =>
      identityFromHeaders(
        { 'x-tooljet-pat': 'tj_pat_anyones', 'x-tooljet-session': 'S', 'x-tooljet-workspace-id': 'org-1' },
        { allowPat: false }
      )
    ).toThrow(/not accepted by this server/i);
  });

  it('still accepts a session, which is the only identity a shared server may act on', () => {
    expect(
      identityFromHeaders({ 'x-tooljet-session': 'S', 'x-tooljet-workspace-id': 'org-1' }, { allowPat: false })
    ).toEqual({ sessionToken: 'S', workspaceId: 'org-1', workspaceSlug: undefined });
  });

  it('defaults to allowing a PAT, so the direct path is unaffected', () => {
    expect(identityFromHeaders({ 'x-tooljet-pat': 'tj_pat_mine' })).toEqual({ pat: 'tj_pat_mine' });
  });
});

/* One shared MCP server can act on many different ToolJet backends, so the request itself may name
   its target. That header gets the caller's session/PAT attached and sent straight to it (auth.ts),
   so it needs real validation, not just a truthy string. */
describe('per-request target origin (x-tooljet-url)', () => {
  beforeEach(() => {
    delete process.env.TOOLJET_URL;
    delete process.env.MCP_ALLOWED_API_ORIGINS;
  });

  it('accepts an allowlisted bare https origin', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  /* ToolJet supports SUB_PATH hosting, so a self-hosted customer reverse-proxied under a path
     prefix is a legitimate target, not a malformed one. The allowlist names the host, not the path. */
  it('accepts a path prefix, for SUB_PATH-hosted self-hosted instances', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com/tooljet' })).toEqual({
      apiUrl: 'https://tj.example.com/tooljet',
    });
  });

  it('normalizes away a trailing slash rather than treating it as a different target', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com/tooljet/' })).toEqual({
      apiUrl: 'https://tj.example.com/tooljet',
    });
  });

  it('rejects plain http, which would send the session cookie or PAT in plaintext', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'http://tj.example.com' })).toThrow(/must use https/);
  });

  it('rejects a query string', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com/?x=1' })).toThrow(
      /query, hash, or credentials/
    );
  });

  it('rejects embedded credentials', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'https://user:pass@tj.example.com' })).toThrow(
      /query, hash, or credentials/
    );
  });

  it('rejects a value that does not parse as an absolute URL', () => {
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'not a url' })).toThrow(/valid absolute URL/);
  });

  /* https alone does not make a host trustworthy — an attacker's own domain has a valid cert too.
     Sending the session cookie or PAT there regardless of the allowlist is the exact exfiltration
     path this check exists to close. */
  it('rejects an origin not in MCP_ALLOWED_API_ORIGINS, even a well-formed https one', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com';
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'https://evil.example' })).toThrow(
      /not in MCP_ALLOWED_API_ORIGINS/
    );
  });

  it('rejects every https origin when the allowlist is unset — unset means empty, not "allow anything"', () => {
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toThrow(
      /not in MCP_ALLOWED_API_ORIGINS/
    );
  });

  it('accepts any origin named in a multi-entry, whitespace-tolerant allowlist', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = ' https://a.example.com , https://b.example.com ';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://b.example.com' })).toEqual({
      apiUrl: 'https://b.example.com',
    });
  });

  /* A raw string comparison would never match here: the request's origin is always in the form
     new URL(...).origin produces (lowercased, default port stripped, no trailing slash), so an
     allowlist entry written any other way has to be normalized the same way or it can never match —
     denying real traffic while looking, next to the error, like it should have worked. */
  it('normalizes an allowlist entry with different casing to the same origin', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://Tj.Example.com';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  it('normalizes an allowlist entry with a trailing slash', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com/';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  it('normalizes an allowlist entry carrying the default https port', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com:443';
    expect(identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toEqual({
      apiUrl: 'https://tj.example.com',
    });
  });

  it('throws, naming the bad entry, when MCP_ALLOWED_API_ORIGINS has an unparseable value', () => {
    process.env.MCP_ALLOWED_API_ORIGINS = 'https://tj.example.com, not a url';
    expect(() => identityFromHeaders({ 'x-tooljet-url': 'https://tj.example.com' })).toThrow(
      /not a valid URL: "not a url"/
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

describe('blank environment variables count as unset', () => {
  beforeEach(() => {
    for (const k of ['TOOLJET_URL', 'TOOLJET_APP_URL', 'TOOLJET_PAT', 'TOOLJET_SESSION_TOKEN', 'TOOLJET_WORKSPACE_ID'])
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

