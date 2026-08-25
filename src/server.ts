import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig, type RequestIdentity } from './config.js';
import { createAuth } from './auth.js';
import { createClient } from './tooljetClient.js';
import { registerTools } from './tools/index.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';

/**
 * One MCP server instance.
 *
 * `identity` scopes this instance to a single acting user — used by the shared HTTP transport, which
 * builds a fresh server per request so no credential is ever reused across users. Omitted for stdio,
 * where the process itself belongs to one build and the credential comes from its environment.
 */
export function buildServer(identity?: RequestIdentity): McpServer {
  const config = loadConfig(identity);
  const auth = createAuth(config);
  const client = createClient(auth, config);

  const server = new McpServer({ name: 'tooljet-mcp', version: TOOLJET_MCP_VERSION });

  registerTools(server, client);

  return server;
}
