import { timingSafeEqual } from 'node:crypto';

/** Constant-time check: does an `Authorization` header carry the expected bearer token? */
export function checkBearerToken(authHeader: string | undefined, expectedToken: string): boolean {
  if (!authHeader) return false;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token || token.length !== expectedToken.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
}
