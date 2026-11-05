import { createExchangeLimiter, createVerifiedExchangeCache } from './oauthExchangeLimiter.js';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { buildServer } from './server.js';
import type { RequestIdentity } from './config.js';

// Match the capability ceiling of a workspace PAT; current user permissions still apply.
const INITIAL_SCOPES = ['apps', 'data', 'workflows', 'workspace_users'];
// A supported 10 MiB chat image becomes roughly 13.4 MiB when embedded in component JSON.
export const OAUTH_MAX_BODY_BYTES = 15 * 1024 * 1024;
export interface OAuthHttpOptions {
  issuer: string;
  resourceUrl: string;
  apiUrl: string;
  appUrl: string;
  exchangeSecret: string;
  allowedOrigins?: string[];
  fetchImpl?: typeof fetch;
  serverFactory?: (identity: RequestIdentity) => McpServer;
  maxBodyBytes?: number;
}
function checkedUrl(value: string, name: string): string {
  const url = new URL(value);
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
  ) {
    throw new Error(
      `${name} must be HTTPS (HTTP is allowed only on loopback), without credentials, query or fragment`,
    );
  }
  return url.href.replace(/\/$/, '');
}
export function oauthHttpOptionsFromEnv(): OAuthHttpOptions | undefined {
  if (process.env.MCP_OAUTH_ENABLED !== 'true') return undefined;
  if (process.env.MCP_SHARED_TOKEN)
    throw new Error('Run public OAuth and internal MCP gateway modes in separate processes');
  const required = (name: string) => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`${name} is required for MCP OAuth`);
    return value;
  };
  return {
    issuer: required('MCP_OAUTH_ISSUER'),
    resourceUrl: required('MCP_OAUTH_RESOURCE_URL'),
    exchangeSecret: required('MCP_OAUTH_EXCHANGE_SECRET'),
    apiUrl: process.env.TOOLJET_URL?.trim() || required('TOOLJET_DEPLOYMENT_URL'),
    appUrl: required('TOOLJET_DEPLOYMENT_URL'),
    allowedOrigins: (process.env.MCP_OAUTH_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
function sendOAuthJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
class BodyTooLarge extends Error {}

async function readOAuthBody(req: IncomingMessage, maxBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  if (Number(req.headers['content-length']) > maxBytes) {
    req.resume();
    throw new BodyTooLarge();
  }
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const part = Buffer.from(chunk);
    bytes += part.length;
    if (bytes > maxBytes) {
      // Discard the rest without buffering it, and leave the response socket usable for HTTP 413.
      req.resume();
      throw new BodyTooLarge();
    }
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** Both HTTP entry points use this same stateless, authenticated transport in OAuth mode.
 * A new server per request also means an MCP session ID can never substitute for a credential. */
export function createOAuthHttpServer(options: OAuthHttpOptions): Server {
  const issuer = checkedUrl(options.issuer, 'issuer');
  const resourceBase = checkedUrl(options.resourceUrl, 'resourceUrl');
  const apiUrl = checkedUrl(options.apiUrl, 'apiUrl');
  const appUrl = checkedUrl(options.appUrl, 'appUrl');
  if (options.exchangeSecret.length < 32)
    throw new Error('OAuth exchange secret must contain at least 32 characters');
  const resource = new URL(resourceBase);
  const factory = options.serverFactory ?? buildServer;
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBodyBytes = options.maxBodyBytes ?? OAUTH_MAX_BODY_BYTES;
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes <= 0) throw new Error('Invalid OAuth request body limit');
  const allowedOrigins = new Set((options.allowedOrigins || []).map((origin) => {
    const checked = checkedUrl(origin, 'allowedOrigin');
    if (new URL(checked).origin !== checked) throw new Error('OAuth allowed origins must not include a path');
    return checked;
  }));
  const resourcePath = resource.pathname.replace(/\/$/, '');
  const metadataPrefix = `/.well-known/oauth-protected-resource${resourcePath}/`;
  const pathPrefix = `${resourcePath}/`;
  const exchangeLimit = createExchangeLimiter(Number(process.env.MCP_OAUTH_EXCHANGE_RATE_LIMIT ?? 300),
    Number(process.env.MCP_OAUTH_TRUST_PROXY_HOPS ?? 0));
  const verifiedExchanges = createVerifiedExchangeCache();
  let exchangesInFlight = 0;
  const httpServer = createServer((req, res) => {
    let exchangeFailure: 'exchange_request_failed' | 'invalid_delegation_response' | undefined;
    void (async () => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (url.pathname === '/health' && req.method === 'GET') {
        sendOAuthJson(res, 200, { status: 'ok', transport: 'streamable-http', authorization: 'oauth' });
        return;
      }
      const metadata = url.pathname.startsWith(metadataPrefix);
      const prefix = metadata ? metadataPrefix : pathPrefix;
      const workspace = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(workspace)) {
        sendOAuthJson(res, 404, { error: 'not_found' });
        return;
      }
      const canonicalResource = `${resourceBase}/${workspace}`;
      const metadataUrl = `${resource.origin}${metadataPrefix}${workspace}`;
      if (metadata && req.method === 'GET') {
        res.setHeader('access-control-allow-origin', '*');
        sendOAuthJson(res, 200, {
          resource: canonicalResource,
          authorization_servers: [issuer],
          scopes_supported: INITIAL_SCOPES,
          bearer_methods_supported: ['header'],
          resource_name: 'ToolJet workspace',
        });
        return;
      }
      if (metadata) {
        sendOAuthJson(res, 405, { error: 'method_not_allowed' });
        return;
      }
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.has(origin)) {
        sendOAuthJson(res, 403, { error: 'origin_not_allowed' });
        return;
      }
      if (origin) {
        res.setHeader('access-control-allow-origin', origin);
        res.setHeader('vary', 'Origin');
        res.setHeader(
          'access-control-expose-headers',
          'WWW-Authenticate, MCP-Session-Id, MCP-Protocol-Version',
        );
      }
      if (req.method === 'OPTIONS') {
        res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
        res.setHeader(
          'access-control-allow-headers',
          'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID',
        );
        res.writeHead(204).end();
        return;
      }
      if (req.method !== 'POST') {
        res.setHeader('allow', 'POST, OPTIONS');
        sendOAuthJson(res, 405, { error: 'method_not_allowed' });
        return;
      }
      const token = /^Bearer (tj_oauth_at_[A-Za-z0-9_-]+)$/i.exec(req.headers.authorization || '')?.[1];
      const challenge = (error?: string) => res.setHeader('www-authenticate',
        `Bearer resource_metadata="${metadataUrl}", scope="${INITIAL_SCOPES.join(' ')}"` +
        (error ? `, error="${error}"` : ''));
      // Match the backend stringParam ceiling without sending oversized junk to exchange.
      if (!token || token.length > 4096 || url.searchParams.has('access_token')) {
        challenge(token ? 'invalid_token' : undefined);
        sendOAuthJson(res, 401, { error: 'invalid_token' });
        return;
      }
      const retryAfter = verifiedExchanges.has(token, canonicalResource) ? 0 : exchangeLimit.retryAfter(req);
      if (retryAfter) {
        res.setHeader('retry-after', String(retryAfter));
        sendOAuthJson(res, 429, { error: 'temporarily_unavailable' });
        return;
      }
      if (exchangesInFlight >= 64) {
        res.setHeader('retry-after', '1');
        sendOAuthJson(res, 503, { error: 'temporarily_unavailable' });
        return;
      }
      // Configured backend only. Never use caller-supplied x-tooljet-url, PAT, or session headers.
      exchangeFailure = 'exchange_request_failed';
      exchangesInFlight++;
      let exchange: Response;
      let exchangeBody: any;
      try {
        exchange = await fetchImpl(`${issuer}/exchange`, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: { authorization: `Bearer ${options.exchangeSecret}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
          subject_token: token,
          resource: canonicalResource,
        }),
      });
        exchangeFailure = 'invalid_delegation_response';
        exchangeBody = await exchange.json().catch(() => undefined);
      } finally { exchangesInFlight--; }
      if (!exchange.ok) {
        // A token bound to another resource is invalid here; requesting more scopes cannot repair it.
        const errorCode: unknown = exchangeBody?.error;
        const invalidToken = [400, 401, 403].includes(exchange.status) &&
          typeof errorCode === 'string' && ['invalid_token', 'invalid_grant', 'invalid_target'].includes(errorCode);
        const unavailable = !invalidToken;
        if (unavailable) {
          // Only log fixed diagnostic codes. Backend bodies may contain credentials or private details.
          const safeCode = ['invalid_client', 'invalid_request', 'server_error', 'temporarily_unavailable']
            .find((code) => code === errorCode) ?? 'unexpected_response';
          console.error('[mcp-oauth] Credential exchange unavailable', { status: exchange.status, error: safeCode });
        }
        if (invalidToken) {
          verifiedExchanges.forget(token, canonicalResource);
          exchangeLimit.failed(req);
          challenge('invalid_token');
        }
        sendOAuthJson(res, unavailable ? 503 : 401, { error: unavailable ? 'temporarily_unavailable' : 'invalid_token' });
        return;
      }
      const credentials = exchangeBody as Record<string, unknown>;
      if (
        !credentials || typeof credentials.access_token !== 'string' ||
        typeof credentials.organization_id !== 'string' ||
        typeof credentials.grant_id !== 'string' || !credentials.grant_id
      ) {
        throw new Error('Invalid delegation response');
      }
      const browserUrl = typeof credentials.browser_url === 'string'
        ? checkedUrl(credentials.browser_url, 'browser_url')
        : appUrl;
      verifiedExchanges.remember(token, canonicalResource);
      exchangeFailure = undefined;
      let requestBody: unknown;
      if (req.method === 'POST') {
        try {
          requestBody = await readOAuthBody(req, maxBodyBytes);
        } catch (error) {
          sendOAuthJson(res, error instanceof BodyTooLarge ? 413 : 400, {
            error: error instanceof BodyTooLarge ? 'request_too_large' : 'invalid_request',
          });
          return;
        }
      }
      const server = factory({
        sessionToken: credentials.access_token,
        isOAuthDelegation: true,
        oauthGrantId: credentials.grant_id,
        workspaceId: credentials.organization_id,
        workspaceSlug:
          typeof credentials.organization_slug === 'string' ? credentials.organization_slug : undefined,
        apiUrl,
        appUrl: browserUrl,
        viewerUrl: appUrl,
      });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.once('close', () => {
        void transport.close().catch(() => {});
        void server.close().catch(() => {});
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, requestBody);
    })().catch(() => {
      // Fixed categories only: fetch errors and malformed successes can contain private details.
      if (exchangeFailure) console.error('[mcp-oauth] Credential exchange unavailable', { error: exchangeFailure });
      if (!res.headersSent) sendOAuthJson(res, 503, { error: 'temporarily_unavailable' });
      else res.end();
    });
  });
  httpServer.requestTimeout = 60_000;
  httpServer.headersTimeout = 15_000;
  return httpServer;
}
