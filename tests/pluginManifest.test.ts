import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'integrations/claude/plugin.json'), 'utf8'));
const entry = readFileSync(resolve(root, 'src/claude.ts'), 'utf8');
const env = manifest.mcpServers.tooljet.env as Record<string, string>;

describe('Claude plugin manifest', () => {
  it('maps every server setting to an explicit host option read by the entry point', () => {
    for (const [key, reference] of Object.entries(env)) {
      expect(entry).toContain(`process.env.${key}`);
      const option = reference.match(/^\$\{user_config\.([a-z_]+)\}$/)?.[1];
      expect(option).toBeTruthy();
      expect(manifest.userConfig).toHaveProperty(option!);
    }
    expect(env.TOOLJET_CLAUDE_PAT).toBe('${user_config.personal_access_token}');
    expect(manifest.userConfig.personal_access_token).toMatchObject({ required: true, sensitive: true });
  });

  it('does not read ambient credentials or launch an HTTP server', () => {
    expect(entry).not.toMatch(/process\.env\.(?:TOOLJET_PAT|TOOLJET_SESSION_TOKEN|MCP_TRANSPORT|MCP_GATEWAY_TOKEN)/);
    expect(entry).toContain('StdioServerTransport');
    expect(manifest.mcpServers.tooljet.args).toEqual(['${CLAUDE_PLUGIN_ROOT}/bundle/index.mjs']);
  });
});
