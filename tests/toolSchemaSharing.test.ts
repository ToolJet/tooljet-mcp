import { describe, expect, it } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { registerTools } from '../src/tools/index.js';

/* The HTTP transport registers every tool on a fresh server per request. A per-request copy of each input schema
   cost about 4 MB a server, held until the response closed, and open responses exhausted the hosted heap. */

interface Captured {
  inputSchema: unknown;
  callback: (args: unknown) => unknown;
}

function register(): Map<string, Captured> {
  const tools = new Map<string, Captured>();
  const server = {
    registerTool(name: string, config: { inputSchema: unknown }, callback: Captured['callback']) {
      tools.set(name, { inputSchema: config.inputSchema, callback });
    },
  } as unknown as McpServer;
  registerTools(server, {} as ToolJetClient);
  return tools;
}

describe('tool input schemas are built once per process', () => {
  it('registers the same schema object on every server', () => {
    const first = register();
    const second = register();
    expect(first.size).toBeGreaterThan(50);
    for (const [name, tool] of first) {
      expect(second.get(name)?.inputSchema, name).toBe(tool.inputSchema);
    }
  });

  it('keeps strict tools strict', () => {
    const schema = register().get('manage_workspace_users')!.inputSchema as { safeParse(v: unknown): { success: boolean } };
    expect(schema.safeParse({ action: 'archive', organization_user_id: crypto.randomUUID() }).success).toBe(true);
    expect(schema.safeParse({ action: 'archive', unexpected: true }).success).toBe(false);
  });
});
