import { loadInstalledPacks } from './packCatalog.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig, type RequestIdentity } from './config.js';
import { createAuth } from './auth.js';
import { createClient } from './tooljetClient.js';
import { registerTools } from './tools/index.js';
import { refreshCatalogResources, registerCatalogResources } from './catalogResources.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';

/**
 * One MCP server instance.
 *
 * `identity` scopes this instance to a single acting user — used by the shared HTTP transport, which
 * builds a fresh server per request so no credential is ever reused across users. Omitted for stdio,
 * where the process itself belongs to one build and the credential comes from its environment.
 */
/** Settles when the workspace's component packs are in the catalogue (or failed to load). */
export let packsReady: Promise<string[]> = Promise.resolve([]);

export function buildServer(identity?: RequestIdentity): McpServer {
  const config = loadConfig(identity);
  const auth = createAuth(config);
  const client = createClient(auth, config);
  // The workspace's component packs join the catalogue once read (packCatalog.ts); index.ts waits for it.
  packsReady = loadInstalledPacks(() => client.listComponentLibraries(), () => client.listBuiltinPacks())
    .then((packs) => {
      if (packs.length) {
        refreshCatalogResources();
        console.error(`tooljet-mcp: component packs: ${packs.join(', ')}`);
      }
      return packs;
    })
    .catch((err) => {
    console.error(`tooljet-mcp: component packs not read: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  });

  const server = new McpServer({ name: 'tooljet-mcp', version: TOOLJET_MCP_VERSION });

  registerTools(server, client);
  registerCatalogResources(server);

  return server;
}

/**
 * A server that completes the MCP handshake but can do no work, carrying the reason.
 *
 * Exiting the process on a config error instead means the client never gets a channel to report
 * on: it sees a bare transport failure (-32603) while the actual reason — always actionable, e.g.
 * "set TOOLJET_PAT" — reaches nothing but this process's stderr. That turns a thirty-second fix
 * into an outage nobody can diagnose from where they are standing. Handshaking and then refusing
 * loudly puts the reason in front of the person who can act on it.
 */
export function buildUnconfiguredServer(reason: string): McpServer {
  const message = `tooljet-mcp cannot reach ToolJet: ${reason}`;
  const server = new McpServer(
    { name: 'tooljet-mcp', version: TOOLJET_MCP_VERSION },
    { instructions: `${message}\n\nFix the configuration and restart this server; no tools will work until then.` }
  );
  server.registerTool(
    'tooljet_status',
    {
      title: 'ToolJet Connection Status',
      description: 'Why this ToolJet MCP server is not configured, and how to fix it.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: 'text' as const, text: message }], isError: true })
  );
  return server;
}
