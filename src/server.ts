import { loadInstalledPacks } from './packCatalog.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadConfig, type RequestIdentity } from './config.js';
import { createAuth } from './auth.js';
import { createClient } from './tooljetClient.js';
import { registerTools } from './tools/index.js';
import { refreshCatalogResources, registerCatalogResources } from './catalogResources.js';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';
import { inPackSet, newPackSet, type PackSet } from './packScope.js';

/**
 * One MCP server instance.
 *
 * `identity` scopes this instance to a single acting user — used by the shared HTTP transport, which
 * builds a fresh server per request so no credential is ever reused across users. Omitted for stdio,
 * where the process itself belongs to one build and the credential comes from its environment.
 */
/** Settles when the workspace's component packs are in the catalogue (or failed to load): the last server built. */
export let packsReady: Promise<string[]> = Promise.resolve([]);

/** How long a tool call waits for its workspace's packs before it runs with the offline catalogue. */
const PACKS_WAIT_MS = 8000;

/**
 * Every tool and resource handler of this server runs inside its own pack set (packScope.ts), after its workspace's
 * packs are read (bounded), so a request sees its own workspace's packs and never another's.
 */
function scopeHandlers(server: McpServer, packs: PackSet, ready: Promise<unknown>): void {
  let done = false;
  void ready.finally(() => (done = true));
  const settled = async (): Promise<void> => {
    if (done) return;
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([ready, new Promise((resolve) => (timer = setTimeout(resolve, PACKS_WAIT_MS)))]);
    clearTimeout(timer);
  };
  const registerTool = server.registerTool.bind(server) as (...args: unknown[]) => unknown;
  (server as unknown as { registerTool: unknown }).registerTool = (name: string, config: unknown, callback: (...args: unknown[]) => unknown) =>
    registerTool(name, config, async (...args: unknown[]) => {
      await settled();
      return inPackSet(packs, () => callback(...args));
    });
  const registerResource = server.registerResource.bind(server) as (...args: unknown[]) => unknown;
  (server as unknown as { registerResource: unknown }).registerResource = (...args: unknown[]) => {
    const callback = args[args.length - 1] as (...a: unknown[]) => unknown;
    return registerResource(...args.slice(0, -1), async (...a: unknown[]) => {
      await settled();
      return inPackSet(packs, () => callback(...a));
    });
  };
}

/**
 * `hosted`: this request came over HTTP, so only the credential it brought may act for it. On stdio the process belongs to
 * one build and its configured credential is that build's.
 */
export function buildServer(
  identity?: RequestIdentity,
  { hosted = false, requireIdentity = false }: { hosted?: boolean; requireIdentity?: boolean } = {}
): McpServer {
  // requireIdentity: a shared server's request with no identity must never fall back to this process's credential.
  if (requireIdentity && !identity) throw new Error('This request names no user, and this server never acts with its own credential.');
  const config = loadConfig(identity);
  const auth = createAuth(config);
  const client = createClient(auth, config);
  // The workspace's component packs join this server's catalogue once read (packCatalog.ts, packScope.ts); index.ts
  // waits for it on stdio, and each tool call waits for it (bounded) on HTTP.
  const packSet = newPackSet();
  const ready = inPackSet(packSet, () =>
    loadInstalledPacks(() => client.listComponentLibraries(), () => client.listBuiltinPacks())
      .then((packs) => {
        if (packs.length) {
          refreshCatalogResources();
          console.error(`tooljet-mcp: component packs: ${packs.join(', ')}`);
        }
        return packs;
      })
      .catch((err) => {
        console.error(`tooljet-mcp: component packs not read: ${err instanceof Error ? err.message : String(err)}`);
        return [] as string[];
      })
  );
  packsReady = ready;

  const server = new McpServer({ name: 'tooljet-mcp', version: TOOLJET_MCP_VERSION });
  scopeHandlers(server, packSet, ready);

  registerTools(server, client, undefined, {
    client,
    workspaceId: () => auth.getOrganizationId(),
    credential: hosted
      ? { sessionToken: identity?.sessionToken, pat: identity?.pat }
      : { sessionToken: config.sessionToken, pat: config.pat },
    apiUrl: config.apiUrl,
    appUrl: config.appUrl,
  });
  inPackSet(packSet, () => registerCatalogResources(server));

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
