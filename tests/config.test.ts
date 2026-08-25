import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../src/config.js';

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
