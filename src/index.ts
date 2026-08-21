#!/usr/bin/env node
import { createServer } from 'node:http';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildServer } from './server.js';
import { checkBearerToken } from './httpAuth.js';

async function serveHttp(): Promise<void> {
  const port = Number(process.env.PORT ?? 8787);
  const host = '0.0.0.0';
  const sharedToken = process.env.MCP_SHARED_TOKEN;
  if (!sharedToken) {
    throw new Error('MCP_SHARED_TOKEN is required when MCP_TRANSPORT=http (this port is reachable off-box)');
  }

  const httpServer = createServer((req, res) => {
    if (!checkBearerToken(req.headers.authorization, sharedToken)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' }).end('Unauthorized');
      return;
    }

    // Stateless: a fresh server+transport per request. A shared McpServer only tolerates
    // one `initialize` handshake for its whole lifetime — reusing one across independent
    // dev clients breaks every client after the first.
    const server = buildServer();
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
