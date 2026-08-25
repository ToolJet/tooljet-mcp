#!/usr/bin/env node
import { createServer } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from './server.js';
import { checkBearerToken } from './httpAuth.js';
import { identityFromHeaders, SESSION_TOKEN_HEADER, type RequestIdentity } from './config.js';

async function serveHttp(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);
  const host = '0.0.0.0';
  const sharedToken = process.env.MCP_SHARED_TOKEN;
  if (!sharedToken) {
    throw new Error('MCP_SHARED_TOKEN is required when MCP_TRANSPORT=http (this port is reachable off-box)');
  }

  /* This port serves EVERY user of the instance, so the acting user arrives per request rather than
     from the environment. Require it explicitly when asked: a deployment that also has a PAT
     configured would otherwise fall back to that shared identity the moment the caller forgot the
     header, and every build would still succeed — just attributed to the wrong person. Where no PAT
     is configured the requirement is already implicit, since there would be nothing to fall back to. */
  const requireUserSession =
    /^(1|true|yes|on)$/i.test(process.env.MCP_REQUIRE_USER_SESSION ?? '') ||
    !(process.env.TOOLJET_PAT || process.env.TOOLJET_SESSION_TOKEN);

  const httpServer = createServer((req, res) => {
    // The bearer token authenticates the CALLER (that it is the trusted AI shim). The identity
    // headers below say which user it is acting for. Checked first: an unauthenticated caller must
    // never be able to name a user.
    if (!checkBearerToken(req.headers.authorization, sharedToken)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' }).end('Unauthorized');
      return;
    }

    let identity: RequestIdentity | undefined;
    try {
      identity = identityFromHeaders(req.headers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid identity headers';
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end(message);
      return;
    }

    if (!identity && requireUserSession) {
      res
        .writeHead(400, { 'Content-Type': 'text/plain' })
        .end(
          `This server acts only on behalf of a signed-in user: send the ${SESSION_TOKEN_HEADER} ` +
            'header (with x-tooljet-workspace-id). Refusing rather than using a shared identity.'
        );
      return;
    }

    // Stateless: a fresh server+transport per request. A shared McpServer only tolerates
    // one `initialize` handshake for its whole lifetime — reusing one across independent
    // dev clients breaks every client after the first. It also means `identity` cannot leak
    // between users: nothing built here outlives the response.
    const server = buildServer(identity);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close();
      server.close();
    });

    server
      .connect(transport)
      .then(() => transport.handleRequest(req, res))
      .catch((err) => {
        console.error('tooljet-mcp: request failed', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Internal Server Error');
        }
      });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, host, resolve);
  });
  console.error(`tooljet-mcp: listening on http://${host}:${port}`);
}

async function main(): Promise<void> {
  if (process.env.MCP_TRANSPORT === 'http') {
    await serveHttp();
    return;
  }

  await buildServer().connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
