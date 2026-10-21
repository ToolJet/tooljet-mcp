import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';

/** Bounded per-process IP buckets. Only an explicitly configured trusted proxy chain is read. */
export function createExchangeLimiter(limit = 300, trustedProxyHops = 0) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000 ||
      !Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 10) {
    throw new Error('Invalid MCP OAuth exchange rate limit or trusted proxy hop count');
  }
  const buckets = new Map<string, { count: number; reset: number }>();
  let nextSweep = 0;
  const address = (req: IncomingMessage) => {
    let ip = req.socket.remoteAddress || 'unknown';
    const forwarded = req.headers['x-forwarded-for'];
    if (trustedProxyHops && typeof forwarded === 'string') {
      const chain = [...forwarded.split(',').map(value => value.trim()), ip];
      const candidate = chain[chain.length - 1 - trustedProxyHops];
      if (candidate && isIP(candidate)) ip = candidate;
    }
    return ip;
  };
  return {
    retryAfter(req: IncomingMessage, now = Date.now()): number {
      const bucket = buckets.get(address(req));
      return bucket && bucket.reset > now && bucket.count >= limit
        ? Math.max(1, Math.ceil((bucket.reset - now) / 1000)) : 0;
    },
    failed(req: IncomingMessage, now = Date.now()): void {
      if (now >= nextSweep) {
        for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key);
        nextSweep = now + 60000;
      }
      const ip = address(req);
      let bucket = buckets.get(ip);
      if (!bucket || bucket.reset <= now) {
        // Bound memory even under distributed junk traffic. Edge rate limits remain required.
        if (buckets.size >= 10000) buckets.delete(buckets.keys().next().value!);
        bucket = { count: 0, reset: now + 60000 };
        buckets.set(ip, bucket);
      }
      bucket.count++;
    },
  };
}
