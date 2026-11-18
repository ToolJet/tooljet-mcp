import { describe, it, expect } from 'vitest';
import { claudePluginConfig } from '../src/claudeConfig.js';

const explicit = {
  TOOLJET_CLAUDE_PAT: 'tj_pat_synthetic_workshop',
  TOOLJET_CLAUDE_DEPLOYMENT_URL: 'https://workshop.example.test/',
};
describe('Claude explicit plugin configuration', () => {
  it('uses only the supplied PAT and target, preserving split-origin deployments', () => {
    expect(claudePluginConfig(explicit)).toEqual({
      pat: explicit.TOOLJET_CLAUDE_PAT, apiUrl: 'https://workshop.example.test',
      appUrl: 'https://workshop.example.test', viewerUrl: 'https://workshop.example.test',
    });
    expect(claudePluginConfig({ ...explicit, TOOLJET_CLAUDE_API_URL: 'https://api.workshop.example.test/' }).apiUrl).toBe('https://api.workshop.example.test');
    expect(claudePluginConfig({ ...explicit, TOOLJET_CLAUDE_DEPLOYMENT_URL: 'http://127.0.0.1:4581' }).apiUrl).toBe('http://127.0.0.1:4581');
  });
  it('never falls back to ambient PAT/session/gateway credentials', () => {
    expect(() => claudePluginConfig({
      TOOLJET_PAT: 'tj_pat_ambient_synthetic', TOOLJET_SESSION_TOKEN: 'ambient-session',
      TOOLJET_WORKSPACE_ID: 'ambient-workspace', MCP_GATEWAY_TOKEN: 'ambient-gateway',
      TOOLJET_DEPLOYMENT_URL: 'https://other.example.test',
    })).toThrow(/configuration dialog/);
  });
  it.each(['', ' ', '${user_config.personal_access_token}'])('rejects an unset token (%s)', token => {
    expect(() => claudePluginConfig({ ...explicit, TOOLJET_CLAUDE_PAT: token })).toThrow(/configuration dialog/);
  });
  it.each(['file:///workspace', 'https://username:password@example.test', 'https://example.test/?token=fixture', 'invalid'])('rejects unsafe/malformed URLs (%s) without echoing their values', input => {
    expect(() => claudePluginConfig({ ...explicit, TOOLJET_CLAUDE_API_URL: input })).toThrow(/URL/);
    try { claudePluginConfig({ ...explicit, TOOLJET_CLAUDE_API_URL: input }); } catch (e) { expect(String(e)).not.toContain(input); }
  });
});
