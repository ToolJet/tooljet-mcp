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

