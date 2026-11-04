import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { createServer, request, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { connect, createServer as createTcpServer, type AddressInfo } from 'node:net';
import { startEgressProxy, type EgressProxy } from '../src/renderEgressProxy.js';
import { auditPages } from '../src/tools/verifyPageRender.js';

/*
  The render check's browser reaches the network only through an egress proxy holding the audit origins, so a
  redirect from a static resource (which Playwright follows without calling the route handler) cannot leave them.
*/
const closers: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  await Promise.allSettled(closers.splice(0).map((close) => close()));
});

/** A local HTTP server that records the paths it was asked for. */
async function origin(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<{ url: string; seen: string[] }> {
  const seen: string[] = [];
  const server: Server = createServer((req, res) => {
    seen.push(req.url ?? '');
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  closers.push(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, seen };
}

async function proxy(origins: string[], blocked: string[] = []): Promise<EgressProxy> {
  const started = await startEgressProxy(new Set(origins), (destination) => blocked.push(destination));
  closers.push(started.close);
  return started;
}

/** One request through the proxy, as a browser sends it (absolute-form). */
const viaProxy = (proxyServer: string, url: string): Promise<{ status: number; location?: string; body: string }> =>
  new Promise((resolve, reject) => {
    const p = new URL(proxyServer);
    const req = request({ host: p.hostname, port: p.port, path: url, method: 'GET', headers: { host: new URL(url).host } }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, location: res.headers.location, body }));
    });
    req.on('error', reject);
    req.end();
  });

/** The proxy's answer to CONNECT host:port. */
const tunnelStatus = (proxyServer: string, authority: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const p = new URL(proxyServer);
    const socket = connect(Number(p.port), p.hostname, () => socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`));
    socket.once('data', (data) => {
      resolve(data.toString().split('\r\n')[0]!);
      socket.destroy();
    });
    socket.on('error', reject);
  });

describe('the render egress proxy', () => {
  it('passes a request to an audit origin and refuses one to any other, which never arrives', async () => {
    const allowed = await origin((_req, res) => res.end('ok'));
    const other = await origin((_req, res) => res.end('should not be reached'));
    const blocked: string[] = [];
    const p = await proxy([allowed.url], blocked);
    expect(await viaProxy(p.server, `${allowed.url}/main.js`)).toMatchObject({ status: 200, body: 'ok' });
    expect((await viaProxy(p.server, `${other.url}/x.png`)).status).toBe(403);
    expect(other.seen).toEqual([]);
    expect(blocked).toEqual([other.url]);
  });

  it('checks each hop of a redirect: the redirect comes back, its off-allowlist target is refused', async () => {
    const other = await origin((_req, res) => res.end('metadata'));
    const allowed = await origin((_req, res) => res.writeHead(302, { location: `${other.url}/latest/meta-data/` }).end());
    const p = await proxy([allowed.url]);
    const first = await viaProxy(p.server, `${allowed.url}/logo.png`);
    expect(first.status).toBe(302);
    expect((await viaProxy(p.server, first.location!)).status).toBe(403);
    expect(other.seen).toEqual([]);
  });

  it('holds the port as well as the host', async () => {
    const allowed = await origin((_req, res) => res.end('ok'));
    const sameHost = await origin((_req, res) => res.end('another service'));
    const p = await proxy([allowed.url]);
    expect((await viaProxy(p.server, `${sameHost.url}/`)).status).toBe(403);
    expect(sameHost.seen).toEqual([]);
  });

  it('opens tunnels (HTTPS, WebSocket) only to an audit origin\'s host and port', async () => {
    const tcp = createTcpServer((socket) => socket.end());
    await new Promise<void>((resolve) => tcp.listen(0, '127.0.0.1', resolve));
    closers.push(() => new Promise((resolve) => tcp.close(resolve)));
    const port = (tcp.address() as AddressInfo).port;
    const blocked: string[] = [];
    const p = await proxy([`https://127.0.0.1:${port}`, 'https://cdn.example.com'], blocked);
    expect(await tunnelStatus(p.server, `127.0.0.1:${port}`)).toBe('HTTP/1.1 200 Connection Established');
    expect(await tunnelStatus(p.server, '169.254.169.254:443')).toBe('HTTP/1.1 403 Forbidden');
    expect(await tunnelStatus(p.server, `127.0.0.1:${port + 1}`)).toBe('HTTP/1.1 403 Forbidden');
    expect(blocked).toEqual(['169.254.169.254:443', `127.0.0.1:${port + 1}`]);
  });
});

describe('the render check uses the proxy', () => {
  it('launches the browser and every context behind it, loopback included', async () => {
    const context = {
      route: vi.fn(), routeWebSocket: vi.fn(), close: vi.fn().mockResolvedValue(undefined),
      newPage: vi.fn().mockResolvedValue({
        goto: async () => ({ status: () => 200 }), waitForTimeout: vi.fn(), waitForFunction: vi.fn().mockResolvedValue(undefined),
        url: () => 'http://viewer.test/applications/app1/home', evaluate: vi.fn().mockResolvedValue({ widgets: 1, findings: [] }),
      }),
    };
    const browser = { newContext: vi.fn().mockResolvedValue(context), close: vi.fn() };
    const launch = vi.fn().mockResolvedValue(browser);
    await auditPages([{ page: 'home', url: 'http://viewer.test/applications/app1/home' }], {}, async () => ({ chromium: { launch } }));
    const proxied = expect.objectContaining({ proxy: { server: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/), bypass: '<-loopback>' } });
    expect(launch).toHaveBeenCalledWith(proxied);
    expect(browser.newContext).toHaveBeenCalledWith(proxied);
  });
});

/*
  In a real Chrome: an allowed origin serves the page, a script and an image, and also a script and an image that
  redirect to another local server outside the audit origins. Runs where MCP_RENDER_AUDIT_PLAYWRIGHT names a
  playwright-core and Chrome is installed; skipped elsewhere.
*/
const playwrightPath = process.env.MCP_RENDER_AUDIT_PLAYWRIGHT;
describe.skipIf(!playwrightPath || !existsSync(playwrightPath))('a static resource redirect in a real browser', () => {
  it('is blocked, while the app origin\'s and an allowed CDN\'s own assets load', async () => {
    const outside = await origin((_req, res) => res.end('/* outside */'));
    const cdn = await origin((_req, res) => res.writeHead(200, { 'content-type': 'text/javascript' }).end('window.cdnLoaded = true;'));
    const app = await origin((req, res) => {
      if (req.url?.startsWith('/applications/')) {
        res.writeHead(200, { 'content-type': 'text/html' }).end(
          `<!doctype html><html><body><div data-cy="draggable-widget-x">x</div>` +
            `<img src="/own.png"><script src="${cdn.url}/lib.js"></script>` +
            `<img src="/to-outside.png"><script src="/to-outside.js"></script></body></html>`
        );
      } else if (req.url?.startsWith('/to-outside')) res.writeHead(302, { location: `${outside.url}${req.url}` }).end();
      else res.writeHead(200, { 'content-type': 'image/png' }).end();
    });
    const [report] = await auditPages([{ page: 'home', url: `${app.url}/applications/app1/home` }], {
      allowedOrigins: new Set([app.url, cdn.url]), settleMs: 500, chartWaitMs: 100, contentWaitMs: 2000,
      executablePath: process.env.MCP_RENDER_AUDIT_EXECUTABLE, channel: process.env.MCP_RENDER_AUDIT_CHANNEL || 'chrome',
    });
    expect(outside.seen).toEqual([]);
    expect(app.seen).toEqual(expect.arrayContaining(['/own.png', '/to-outside.png', '/to-outside.js']));
    expect(cdn.seen).toEqual(['/lib.js']);
    expect(report.findings).toEqual(expect.arrayContaining([expect.objectContaining({ reason: 'redirect_blocked' })]));
  }, 60_000);
});
