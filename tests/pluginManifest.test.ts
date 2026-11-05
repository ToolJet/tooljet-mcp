import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* The plugin manifest is the install surface: whatever it puts in `env` is what a user's MCP server
   actually starts with. It is not exercised by any other test, which is how it kept passing
   TOOLJET_EMAIL/TOOLJET_PASSWORD for a whole release after password auth was removed. Installing the
   plugin then failed immediately with "TOOLJET_SESSION_TOKEN or TOOLJET_PAT is required". */
const manifest = JSON.parse(readFileSync(resolve(__dirname, '../.claude-plugin/plugin.json'), 'utf8'));
const config = readFileSync(resolve(__dirname, '../src/config.ts'), 'utf8');
const env = manifest.mcpServers.tooljet.env as Record<string, string>;

describe('plugin manifest', () => {
  it('supplies a credential the server actually accepts', () => {
    expect(Object.keys(env)).toContain('TOOLJET_PAT');
  });

  it('does not offer credentials the server no longer reads', () => {
    expect(Object.keys(env)).not.toContain('TOOLJET_EMAIL');
    expect(Object.keys(env)).not.toContain('TOOLJET_PASSWORD');
  });

  /* Guards the drift directly: every credential the manifest passes must be one config.ts looks up,
     so removing an auth method from the server fails here instead of at a user's first install. */
  it('passes only credentials config.ts reads', () => {
    for (const key of Object.keys(env)) {
      expect(config, `${key} is in the manifest but config.ts never reads it`).toContain(key);
    }
  });

  it('points the server at the bundle it ships', () => {
    expect(manifest.mcpServers.tooljet.args[0]).toContain('${CLAUDE_PLUGIN_ROOT}/bundle/index.js');
  });
});
