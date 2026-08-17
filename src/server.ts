import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig } from './config.js';
import { createAuth } from './auth.js';
import { createClient } from './tooljetClient.js';
import { registerTools } from './tools/index.js';

export function buildServer(): McpServer {
  const config = loadConfig();
  const auth = createAuth(config);
  const client = createClient(auth, config);

  const server = new McpServer({ name: 'tooljet-mcp', version: '0.1.0' });

  registerTools(server, client);

  return server;
}
