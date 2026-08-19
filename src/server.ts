import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { createAuth } from './auth.js';
import { createClient } from './tooljetClient.js';
import { registerTools } from './tools/index.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';

export function buildServer(): McpServer {
  const config = loadConfig();
  const auth = createAuth(config);
  const client = createClient(auth, config);

  const server = new McpServer({ name: 'tooljet-mcp', version: TOOLJET_MCP_VERSION });

  registerTools(server, client);

  return server;
}
