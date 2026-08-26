import { timingSafeEqual } from 'node:crypto';

/** Constant-time check: does an `Authorization` header carry the expected bearer token? */
export function checkBearerToken(authHeader: string | undefined, expectedToken: string): boolean {
  if (!authHeader) return false;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token || token.length !== expectedToken.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}

/**
 * The token from an `Authorization: Bearer <token>` header, or undefined.
 *
 * Used by the direct (no-gateway) HTTP mode, where the bearer IS the caller's ToolJet PAT rather
 * than a shared secret to compare against. Every MCP client can set Authorization even when it
 * cannot set arbitrary headers, so this is the widest-compatibility way to carry a PAT.
 */
export function bearerValue(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;
  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
}
