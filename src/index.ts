#!/usr/bin/env node
import { createServer } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer, buildUnconfiguredServer } from './server.js';
import { bearerValue, checkBearerToken } from './httpAuth.js';
import { identityFromHeaders, PAT_HEADER, SESSION_TOKEN_HEADER, type RequestIdentity } from './config.js';

async function serveHttp(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);
  const sharedToken = process.env.MCP_SHARED_TOKEN;

  /* Two deployment shapes, told apart by whether a shared token is configured.

     GATEWAY mode (MCP_SHARED_TOKEN set) — staging and cloud. One server fronts every user of the
     instance and is reachable off-box, so the bearer gate is what keeps strangers out. The caller is
     ToolJet's AI shim, and the acting user arrives per request in the session headers.

     DIRECT mode (no shared token) — a developer or coding agent running this server themselves.
     There is no shim to authenticate and no shared credential to protect: the caller's own PAT is
     both the proof and the identity, and ToolJet validates it on every call. Binds loopback by
     default precisely because that token now travels over the wire. */
  const gatewayMode = Boolean(sharedToken);
  const host = process.env.MCP_HTTP_HOST ?? (gatewayMode ? '0.0.0.0' : '127.0.0.1');

  /* Gateway mode serves EVERY user, so the acting user must arrive per request. Require it
     explicitly when asked: a deployment that also has a PAT configured would otherwise fall back to
     that shared identity the moment the caller forgot the header, and every build would still
     succeed, just attributed to the wrong person. Where no PAT is configured the requirement is
     already implicit, since there would be nothing to fall back to. Direct mode is exempt: its
     whole point is that one operator's own credential drives the server. */
  const requireUserSession =
    gatewayMode &&
    (/^(1|true|yes|on)$/i.test(process.env.MCP_REQUIRE_USER_SESSION ?? '') ||
      !(process.env.TOOLJET_PAT || process.env.TOOLJET_SESSION_TOKEN));

  const httpServer = createServer((req, res) => {
    // The bearer token authenticates the CALLER (that it is the trusted AI shim). The identity
    // headers below say which user it is acting for. Checked first: an unauthenticated caller must
    // never be able to name a user.
    if (gatewayMode && !checkBearerToken(req.headers.authorization, sharedToken as string)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' }).end('Unauthorized');
      return;
    }

    let identity: RequestIdentity | undefined;
    try {
      // Gateway mode serves every user, so only a ToolJet-minted session may name the actor.
      identity = identityFromHeaders(req.headers, { allowPat: !gatewayMode });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid identity headers';
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end(message);
      return;
    }

    if (!gatewayMode && !identity) {
      // Accept the PAT from Authorization as well as its own header: clients that cannot set
      // arbitrary headers can almost always set a bearer token. In gateway mode Authorization is
      // already spoken for by the shared token, which is why this is direct-mode only.
      const bearer = bearerValue(req.headers.authorization);
      if (bearer) identity = { pat: bearer };
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

    // Direct mode with nothing to act as: no PAT on the request and none in the environment. Say so
    // in the response rather than letting buildServer throw into a bare 500.
    if (!gatewayMode && !identity && !(process.env.TOOLJET_PAT || process.env.TOOLJET_SESSION_TOKEN)) {
      res
        .writeHead(401, { 'Content-Type': 'text/plain' })
        .end(
          `No ToolJet credential. Send your personal access token as \`Authorization: Bearer <token>\` ` +
            `or in the ${PAT_HEADER} header, or set TOOLJET_PAT on this server. Create a token in ` +
            'ToolJet under Settings → Access tokens.'
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
  console.error(
    `tooljet-mcp: listening on http://${host}:${port} (${gatewayMode ? 'gateway' : 'direct'} mode)`
  );
}

async function main(): Promise<void> {
  if (process.env.MCP_TRANSPORT === 'http') {
    await serveHttp();
    return;
  }

  /* A missing credential must not kill the process here. Exiting before the handshake leaves the
     client no channel to report on, so it surfaces as a bare -32603 while the actionable reason
     reaches only this stderr. Hand back a server that says why instead. */
  let server: McpServer;
  try {
    server = buildServer();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`tooljet-mcp: ${reason}`);
    server = buildUnconfiguredServer(reason);
  }
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
