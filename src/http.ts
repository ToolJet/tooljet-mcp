#!/usr/bin/env node
import { createHttpMcpServer } from './httpServer.js';

function readPort(): number {
  const rawPort = process.env.TOOLJET_MCP_HTTP_PORT ?? process.env.PORT ?? '3001';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Invalid HTTP port: ${rawPort}`);
  }

  return port;
}

async function main(): Promise<void> {
  const host = process.env.TOOLJET_MCP_HTTP_HOST ?? '127.0.0.1';
  const port = readPort();
  const httpMcp = createHttpMcpServer();

  await new Promise<void>((resolve, reject) => {
    httpMcp.server.once('error', reject);
    httpMcp.server.listen(port, host, () => {
      httpMcp.server.off('error', reject);
      resolve();
    });
  });

  const address = httpMcp.server.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  console.error(`ToolJet MCP Streamable HTTP server listening at http://${host}:${boundPort}/mcp`);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    await httpMcp.close();
  };

  process.once('SIGINT', () => void shutdown().then(() => process.exit(0)));
  process.once('SIGTERM', () => void shutdown().then(() => process.exit(0)));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
