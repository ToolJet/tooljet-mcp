// Isolated client compatibility probe. Binds loopback, uses synthetic tokens only,
// makes no outbound requests and records parameter names/booleans, never credentials.
import http from 'node:http';
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = Number(process.argv[2] ?? 12162);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const base = `http://127.0.0.1:${port}`;
const output = mkdtempSync(join(tmpdir(), 'tooljet-antigravity-refresh-'));
mkdirSync(join(output, '.agents'));
writeFileSync(join(output, '.agents/mcp_config.json'), JSON.stringify({
  mcpServers: { 'synthetic-oauth-refresh': { serverUrl: `${base}/mcp`, timeoutSeconds: 15 } },
}, null, 2));
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const record = value => appendFileSync(join(output, 'observations.ndjson'), JSON.stringify(value) + '\n');
const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, base).pathname;
    if (path === '/.well-known/oauth-protected-resource/mcp') return json(res, 200, {
      resource: `${base}/mcp`, authorization_servers: [base],
      scopes_supported: ['synthetic'], bearer_methods_supported: ['header'],
    });
    if (path === '/.well-known/oauth-authorization-server') return json(res, 200, {
      issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`, response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
      code_challenge_methods_supported: ['S256'], scopes_supported: ['synthetic'],
    });
    if (path === '/authorize') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Local synthetic fixture only. Enter synthetic-code in the CLI. No real access is granted.');
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 64 * 1024) return json(res, 413, { error: 'too_large' });
    }
    if (path === '/register') {
      const input = JSON.parse(body || '{}');
      const method = input.token_endpoint_auth_method || 'client_secret_basic';
      record({ stage: 'registration', token_endpoint_auth_method: method });
      return json(res, 201, {
        ...input, client_id: 'synthetic-refresh-probe', token_endpoint_auth_method: method,
        ...(method === 'none' ? {} : { client_secret: 'synthetic-only-not-real', client_secret_expires_at: 0 }),
      });
    }
    if (path === '/token') {
      const params = new URLSearchParams(body);
      const grantType = params.get('grant_type');
      record({ stage: 'token', grant_type: grantType, keys: [...params.keys()].sort(),
        resource_present: params.has('resource'), resource_matches: params.get('resource') === `${base}/mcp`,
        verifier_present: params.has('code_verifier'),
        redirect_matches: params.get('redirect_uri') === 'https://antigravity.google/oauth-callback',
        basic_auth_present: (req.headers.authorization || '').startsWith('Basic '),
      });
      return json(res, 200, {
        access_token: grantType === 'authorization_code' ? 'synthetic-initial' : 'synthetic-renewed',
        token_type: 'Bearer', expires_in: grantType === 'authorization_code' ? 1 : 600,
        refresh_token: 'synthetic-refresh', scope: 'synthetic',
      });
    }
    if (path === '/mcp') {
      if (!(req.headers.authorization || '').startsWith('Bearer synthetic-')) {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`);
        return json(res, 401, { error: 'invalid_token' });
      }
      const message = JSON.parse(body || '{}');
      if (message.method === 'notifications/initialized') { res.writeHead(202); return res.end(); }
      const result = message.method === 'initialize'
        ? { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'synthetic-only', version: '1' } }
        : message.method === 'tools/list'
          ? { tools: [{ name: 'synthetic_ping', description: 'Local fixture only', inputSchema: { type: 'object', properties: {} } }] }
          : {};
      return json(res, 200, { jsonrpc: '2.0', id: message.id, result });
    }
    return json(res, 404, { error: 'not_found' });
  } catch { if (!res.headersSent) json(res, 400, { error: 'invalid_synthetic_request' }); else res.end(); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Synthetic OAuth fixture: ${base}\nQA project: ${output}\nNo external requests or real credentials. Stop with Ctrl-C.`);
});
