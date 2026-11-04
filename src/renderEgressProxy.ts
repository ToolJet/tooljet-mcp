import { createServer, request as httpRequest, type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import { connect, type Socket } from 'node:net';
import type { Duplex } from 'node:stream';
import { renderAuditUrlAllowed } from './renderAuditPolicy.js';

/*
  The render check's browser connects to the network only through this proxy, so the audit origins hold for every
  connection it makes, not just the requests the route handler sees. Playwright follows a redirect of a request it
  passed through (route.continue) without calling the route handler again, so a script, style, image or font on an
  allowed origin could otherwise redirect the browser anywhere. Here each hop is a new connection and is checked:
  a plain-HTTP request by its origin, an HTTPS or WebSocket tunnel (CONNECT) by host and port. Anything else gets
  403 and never leaves this machine.
*/
export interface EgressProxy {
  /** For Playwright's proxy option: http://127.0.0.1:<port>. */
  server: string;
  close: () => Promise<void>;
}

const HOP_BY_HOP = ['proxy-connection', 'proxy-authorization', 'connection', 'keep-alive', 'te', 'trailer', 'upgrade'];
const forwardHeaders = (headers: IncomingHttpHeaders): IncomingHttpHeaders => {
  const out = { ...headers };
  for (const name of HOP_BY_HOP) delete out[name];
  return out;
};

const defaultPort = (protocol: string): string => (protocol === 'https:' || protocol === 'wss:' ? '443' : '80');

/** host:port pairs a tunnel may open: one per audit origin. */
const tunnelTargets = (origins: Set<string>): Set<string> => {
  const targets = new Set<string>();
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      targets.add(`${url.hostname.toLowerCase()}:${url.port || defaultPort(url.protocol)}`);
    } catch {
      /* not an origin: nothing to allow */
    }
  }
  return targets;
};

/** The host:port of a CONNECT request line, normalized as URL does it, or undefined. */
const tunnelTarget = (authority: string | undefined): string | undefined => {
  if (!authority || !/:\d{1,5}$/.test(authority)) return undefined;
  try {
    const url = new URL(`http://${authority}`);
    const port = /:(\d{1,5})$/.exec(authority)![1];
    return url.username || url.password || url.pathname !== '/' ? undefined : `${url.hostname.toLowerCase()}:${port}`;
  } catch {
    return undefined;
  }
};

const unbracket = (hostname: string): string => hostname.replace(/^\[|\]$/g, '');

export async function startEgressProxy(origins: Set<string>, onBlocked: (destination: string) => void = () => {}): Promise<EgressProxy> {
  const tunnels = tunnelTargets(origins);
  const sockets = new Set<Duplex>();
  const track = (socket: Duplex) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  };
  const refuseSocket = (socket: Duplex, destination: string) => {
    onBlocked(destination);
    socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
  };
  const tunnel = (client: Duplex, host: string, port: number, first: (upstream: Socket) => void) => {
    const upstream = connect(port, unbracket(host), () => {
      first(upstream);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    track(upstream);
    upstream.on('error', () => client.destroy());
    client.on('error', () => upstream.destroy());
  };

  const server = createServer((req, res) => {
    let url: URL;
    try {
      url = new URL(req.url ?? '');
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (url.protocol !== 'http:' || !renderAuditUrlAllowed(url.href, origins)) {
      onBlocked(url.origin);
      res.writeHead(403, { 'content-length': '0', connection: 'close' }).end();
      return;
    }
    const upstream = httpRequest(
      { host: unbracket(url.hostname), port: url.port || 80, method: req.method, path: url.pathname + url.search, headers: forwardHeaders(req.headers) },
      (answer) => {
        const headers = { ...answer.headers };
        for (const name of ['connection', 'keep-alive', 'transfer-encoding']) delete headers[name];
        res.writeHead(answer.statusCode ?? 502, answer.statusMessage, headers);
        answer.pipe(res);
      }
    );
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502, { 'content-length': '0' });
      res.end();
    });
    req.pipe(upstream);
  });

  server.on('connection', track);
  server.on('connect', (req: IncomingMessage, client: Duplex, head: Buffer) => {
    const target = tunnelTarget(req.url);
    if (!target || !tunnels.has(target)) {
      refuseSocket(client, target ?? 'an unreadable tunnel target');
      return;
    }
    const at = target.lastIndexOf(':');
    tunnel(client, target.slice(0, at), Number(target.slice(at + 1)), (upstream) => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
    });
  });
  // A WebSocket over plain HTTP may come as an absolute-form upgrade request rather than a tunnel.
  server.on('upgrade', (req: IncomingMessage, client: Duplex, head: Buffer) => {
    let url: URL;
    try {
      url = new URL(req.url ?? '');
    } catch {
      refuseSocket(client, 'an unreadable upgrade target');
      return;
    }
    const asHttp = url.href.replace(/^ws:/i, 'http:');
    if (!/^(http|ws):$/i.test(url.protocol) || !renderAuditUrlAllowed(asHttp, origins)) {
      refuseSocket(client, url.origin);
      return;
    }
    tunnel(client, url.hostname, Number(url.port || 80), (upstream) => {
      const lines = [`${req.method} ${url.pathname}${url.search} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (!/^proxy-/i.test(req.rawHeaders[i]!)) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      upstream.write(lines.join('\r\n') + '\r\n\r\n');
      if (head.length) upstream.write(head);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('The render egress proxy has no address');
  return {
    server: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}
