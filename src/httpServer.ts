import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer } from './server.js';
import { identityFromHeaders, type RequestIdentity } from './config.js';
import { bearerValue } from './httpAuth.js';

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
}

export interface HttpMcpServerOptions {
  /** Creates one isolated MCP server instance for each Streamable HTTP session. Receives the acting
   *  user parsed from the initialize request's headers, when the caller sent one. */
  serverFactory?: (identity?: RequestIdentity) => McpServer;
  /** Maximum accepted JSON request size. Defaults to 1 MiB. */
  maxBodyBytes?: number;
}

export interface HttpMcpServer {
  server: Server;
  close: () => Promise<void>;
  sessionCount: () => number;
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.headersSent) return;

  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function writeError(res: ServerResponse, status: number, message: string): void {
  writeJson(res, status, {
    jsonrpc: '2.0',
    error: { code: -32000, message },
    id: null,
  });
}

function getSessionId(req: IncomingMessage): string | undefined {
  const value = req.headers['mcp-session-id'];
  return Array.isArray(value) ? value[0] : value;
}

async function readJsonBody(req: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;

    if (totalBytes > maxBodyBytes) {
      throw new Error(`Request body exceeds ${maxBodyBytes} bytes`);
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) throw new Error('Request body is required');
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

export function createHttpMcpServer(options: HttpMcpServerOptions = {}): HttpMcpServer {
  const serverFactory = options.serverFactory ?? buildServer;
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const sessions = new Map<string, Session>();

  const handlePost = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    let body: unknown;

    try {
      body = await readJsonBody(req, maxBodyBytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON request body';
      writeError(res, 400, message);
      return;
    }

    const sessionId = getSessionId(req);
    const existingSession = sessionId ? sessions.get(sessionId) : undefined;

    if (existingSession) {
      await existingSession.transport.handleRequest(req, res, body);
      return;
    }

    if (sessionId || !isInitializeRequest(body)) {
      writeError(res, 400, 'Bad Request: No valid session ID provided');
      return;
    }

    /* Identity is bound at initialize and belongs to the session from then on: one MCP session is
       one build for one user, and later requests carry only the session id. NOTE this transport has
       no bearer gate of its own (src/http.ts binds it to loopback) — do not expose it off-box
       without one, or any local caller could name a user. */
    let identity: RequestIdentity | undefined;
    try {
      identity = await identityFromHeaders(req.headers);
    } catch (error) {
      writeError(res, 400, error instanceof Error ? error.message : 'Invalid identity headers');
      return;
    }

    // Same fallback as the bundle's direct HTTP mode: a client that cannot set arbitrary headers can
    // still send its PAT as a bearer. Kept identical so the two HTTP entry points do not disagree
    // about what authenticates a request.
    if (!identity) {
      const bearer = bearerValue(req.headers.authorization);
      if (bearer) identity = { pat: bearer };
    }

    const mcpServer = serverFactory(identity);
    let transport: StreamableHTTPServerTransport;

    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        sessions.set(newSessionId, { server: mcpServer, transport });
      },
    });

    transport.onclose = () => {
      const closedSessionId = transport.sessionId;
      if (closedSessionId) sessions.delete(closedSessionId);
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);
  };

  const handleSessionRequest = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
    const sessionId = getSessionId(req);
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      writeError(res, 400, 'Invalid or missing session ID');
      return;
    }

    await session.transport.handleRequest(req, res);
  };

  const server = createServer((req, res) => {
    void (async () => {
      const requestUrl = new URL(req.url ?? '/', 'http://localhost');

      if (requestUrl.pathname === '/health' && req.method === 'GET') {
        writeJson(res, 200, { status: 'ok', transport: 'streamable-http' });
        return;
      }

      if (requestUrl.pathname !== '/mcp') {
        writeJson(res, 404, { error: 'Not found' });
        return;
      }

      if (req.method === 'POST') {
        await handlePost(req, res);
        return;
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        await handleSessionRequest(req, res);
        return;
      }

      res.setHeader('allow', 'GET, POST, DELETE');
      writeJson(res, 405, { error: 'Method not allowed' });
    })().catch((error: unknown) => {
      console.error('Error handling MCP HTTP request:', error);
      writeError(res, 500, 'Internal server error');
    });
  });

  const close = async (): Promise<void> => {
    await Promise.allSettled(Array.from(sessions.values(), ({ transport }) => transport.close()));
    sessions.clear();

    if (!server.listening) return;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };

  return {
    server,
    close,
    sessionCount: () => sessions.size,
  };
}
