import { createServer, request as httpRequest, type IncomingHttpHeaders, type IncomingMessage } from 'node:http';
import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, connect, isIP, type Socket } from 'node:net';
import type { Duplex } from 'node:stream';
import { renderAuditUrlAllowed } from './renderAuditPolicy.js';

/*
  The render check's browser connects to the network only through this proxy, so the audit origins hold for every
  connection it makes, not just the requests the route handler sees. Playwright follows a redirect of a request it
  passed through (route.continue) without calling the route handler again, so a script, style, image or font on an
  allowed origin could otherwise redirect the browser anywhere. Here each hop is a new connection and is checked:
  a plain-HTTP request by its origin, an HTTPS or WebSocket tunnel (CONNECT) by host and port. Anything else gets
  403 and never leaves this machine.

  A host name passes only to the addresses it resolves to here, and the connection goes to that address (pinned: a
  second lookup by the socket could answer differently, DNS rebinding). An address in a private, loopback, link-local,
  shared, reserved or cloud metadata range is refused, unless the origin is one the operator named as reachable there:
  `privateOrigins` (the ToolJet host the check is configured for, MCP_RENDER_AUDIT_PRIVATE_ORIGINS) or an origin
  written as an IP address or localhost, which says where it goes by itself. So an allowed host name whose DNS someone
  else controls cannot be pointed at an internal service.
*/
const INTERNAL = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) INTERNAL.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b:1::', 48], ['100::', 64], ['2001::', 23], ['2001:db8::', 32], ['2002::', 16],
  ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
] as const) INTERNAL.addSubnet(net, prefix, 'ipv6');

/** The IPv4 address an IPv6 one carries (mapped ::ffff:a.b.c.d, compatible ::a.b.c.d, NAT64 64:ff9b::a.b.c.d), if any. */
const embeddedIpv4 = (address: string): string | undefined => {
  const lower = address.toLowerCase();
  const dotted = /^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (dotted) return dotted[1];
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower);
  if (!hex) return undefined;
  const hi = parseInt(hex[1]!, 16);
  const lo = parseInt(hex[2]!, 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
};

/** Whether an address is somewhere a render check has no business reaching unless the operator said so. */
export function internalAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return INTERNAL.check(address, 'ipv4');
  if (family !== 6) return true;
  const v4 = embeddedIpv4(address);
  if (v4) return INTERNAL.check(v4, 'ipv4');
  return INTERNAL.check(address, 'ipv6');
}

/** Resolves a host name to every address it has, as dns.lookup({ all: true }) does. */
export type Resolver = (hostname: string) => Promise<Array<{ address: string; family: number }>>;
const systemResolver: Resolver = (hostname) => dnsLookup(hostname, { all: true, verbatim: true });

export interface EgressProxyOptions {
  /** Audit origins that may resolve to internal addresses (the configured ToolJet host on a private network). */
  privateOrigins?: Set<string>;
  /** Tests: a fake DNS. */
  resolve?: Resolver;
}

const literalHost = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return isIP(host) !== 0 || host === 'localhost' || host.endsWith('.localhost');
};
/** host:port of an http(s) or ws(s) URL, the way blocked connections are named; undefined when it is not one. */
export function connectionKey(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!/^(https?|wss?):$/.test(url.protocol)) return undefined;
    return `${url.hostname.toLowerCase()}:${url.port || defaultPort(url.protocol)}`;
  } catch {
    return undefined;
  }
}

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

/** onBlocked gets each refused destination as host:port (connectionKey). */
export async function startEgressProxy(
  origins: Set<string>,
  onBlocked: (destination: string) => void = () => {},
  options: EgressProxyOptions = {}
): Promise<EgressProxy> {
  const tunnels = tunnelTargets(origins);
  // host:port pairs that may resolve inside: named by the operator, or an IP address / localhost written in the origin.
  const mayBeInternal = tunnelTargets(new Set([...origins].filter((origin) => {
    try {
      return options.privateOrigins?.has(new URL(origin).origin) || literalHost(new URL(origin).hostname);
    } catch {
      return false;
    }
  })));
  const resolver = options.resolve ?? systemResolver;
  /** The one address to connect to for host:port, or undefined when it may not be reached. */
  const pin = async (host: string, port: number): Promise<string | undefined> => {
    const bare = unbracket(host);
    const internalOk = mayBeInternal.has(`${host.toLowerCase()}:${port}`);
    let addresses: string[];
    if (isIP(bare)) addresses = [bare];
    else {
      try {
        addresses = (await resolver(bare)).map((entry) => entry.address);
      } catch {
        return undefined;
      }
    }
    if (!addresses.length) return undefined;
    // Every answer is checked, not just the first: a name with one public and one internal address is refused.
    if (!internalOk && addresses.some(internalAddress)) return undefined;
    return addresses[0];
  };
  const sockets = new Set<Duplex>();
  const track = (socket: Duplex) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  };
  const refuseSocket = (socket: Duplex, destination: string) => {
    onBlocked(destination);
    socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
  };
  const tunnel = async (client: Duplex, host: string, port: number, destination: string, first: (upstream: Socket) => void) => {
    client.on('error', () => client.destroy());
    const address = await pin(host, port);
    if (client.destroyed) return;
    if (!address) {
      refuseSocket(client, destination);
      return;
    }
    const upstream = connect(port, address, () => {
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
      onBlocked(connectionKey(url.href) ?? url.origin);
      res.writeHead(403, { 'content-length': '0', connection: 'close' }).end();
      return;
    }
    const port = Number(url.port || 80);
    req.pause();
    void pin(url.hostname, port).then((address) => {
      if (!address) {
        onBlocked(connectionKey(url.href) ?? url.origin);
        res.writeHead(403, { 'content-length': '0', connection: 'close' }).end();
        return;
      }
      // To the pinned address; the Host header the browser sent still names the site.
      const upstream = httpRequest(
        { host: address, port, method: req.method, path: url.pathname + url.search, headers: forwardHeaders(req.headers) },
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
      req.resume();
    });
  });

  server.on('connection', track);
  server.on('connect', (req: IncomingMessage, client: Duplex, head: Buffer) => {
    const target = tunnelTarget(req.url);
    if (!target || !tunnels.has(target)) {
      refuseSocket(client, target ?? 'an unreadable tunnel target');
      return;
    }
    const at = target.lastIndexOf(':');
    void tunnel(client, target.slice(0, at), Number(target.slice(at + 1)), target, (upstream) => {
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
      refuseSocket(client, connectionKey(url.href) ?? url.origin);
      return;
    }
    void tunnel(client, url.hostname, Number(url.port || 80), connectionKey(url.href) ?? url.origin, (upstream) => {
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
