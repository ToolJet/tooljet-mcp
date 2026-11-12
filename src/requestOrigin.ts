/*
  DNS rebinding and cross-site requests on the local HTTP transports.

  A server on 127.0.0.1 is reachable from any web page the developer opens: the page's own host name, rebound to
  127.0.0.1, sends the request, and the browser calls it same-origin. The server then acted with the developer's PAT
  (direct mode) or stored CLI login (src/http.ts). So every request must name this server in its Host header (a
  loopback name, the address it is bound to, or MCP_ALLOWED_HOSTS), and a browser request (one with an Origin header)
  must come from a loopback origin, this server's own host, or MCP_ALLOWED_ORIGINS. Requests without an Origin header
  (MCP clients, the AI shim) are not browser requests and pass the Origin check.

  A server bound to every interface (0.0.0.0, ::) is reached under names this process cannot know (a load balancer's),
  so its Host header is checked only when MCP_ALLOWED_HOSTS is set; its Origin header always is.
*/
import type { IncomingMessage, ServerResponse } from 'node:http';

const list = (value: string | undefined): string[] =>
  (value ?? '').split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean);

const bare = (host: string): string => host.trim().toLowerCase().replace(/^\[|\]$/g, '');

/** The host name of a Host header (no port, no brackets). */
function hostName(header: string): string {
  const value = header.trim().toLowerCase();
  if (value.startsWith('[')) return value.slice(1, value.indexOf(']') > 0 ? value.indexOf(']') : undefined);
  const colon = value.lastIndexOf(':');
  return colon > 0 && value.indexOf(':') === colon ? value.slice(0, colon) : value;
}

/** A name that always means this machine: localhost (and its subdomains), 127.0.0.0/8, ::1. */
export function isLoopbackName(name: string): boolean {
  const host = bare(name);
  return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127(\.\d{1,3}){3}$/.test(host) ||
    /^::ffff:127(\.\d{1,3}){3}$/.test(host);
}

const isWildcard = (bind: string): boolean => ['0.0.0.0', '::', '[::]', ''].includes(bare(bind));

export interface RequestOriginPolicy {
  /** The address the server listens on. */
  bindHost: string;
  env?: NodeJS.ProcessEnv;
}

/** Why this request is refused (a foreign Host or Origin), or undefined when it may go on. */
export function foreignRequest(req: Pick<IncomingMessage, 'headers'>, { bindHost, env = process.env }: RequestOriginPolicy): string | undefined {
  const allowedHosts = list(env.MCP_ALLOWED_HOSTS).map((entry) => hostName(entry));
  const ownHost = isWildcard(bindHost) ? undefined : bare(bindHost);
  const known = (name: string): boolean => isLoopbackName(name) || name === ownHost || allowedHosts.includes(name);

  const hostHeader = req.headers.host;
  if (hostHeader && (!isWildcard(bindHost) || allowedHosts.length)) {
    const name = hostName(hostHeader);
    if (!known(name)) return `Host "${hostHeader.slice(0, 100)}" is not this server`;
  }

  const origin = req.headers.origin;
  if (origin !== undefined) {
    if (list(env.MCP_ALLOWED_ORIGINS).includes(origin.trim().toLowerCase())) return undefined;
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      return `Origin "${String(origin).slice(0, 100)}" is not allowed`;
    }
    // Not "the same host as the Host header": under DNS rebinding both name the attacker's domain.
    if (!known(bare(parsed.hostname))) return `Origin "${origin.slice(0, 100)}" is not allowed`;
  }
  return undefined;
}

/** Answer 403 and return true when the request is refused. */
export function refuseForeignRequest(req: IncomingMessage, res: ServerResponse, policy: RequestOriginPolicy): boolean {
  const why = foreignRequest(req, policy);
  if (!why) return false;
  if (!res.headersSent) {
    res.writeHead(403, { 'content-type': 'application/json' }).end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: `Forbidden: ${why}. Set MCP_ALLOWED_HOSTS or MCP_ALLOWED_ORIGINS to allow it.` },
      id: null,
    }));
  }
  return true;
}
