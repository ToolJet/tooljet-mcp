import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestIdentity } from './config.js';

/**
 * Build tokens: a short-lived, opaque stand-in for one build's identity.
 *
 * A hosted harness (OpenAI's Agents API in full-offload mode) holds the MCP connection itself, so
 * the acting user's identity has to reach this server through that harness. Sending the user's own
 * ToolJet session in `transport.headers` fails two ways, both measured on 2026-09-12: the API rejects
 * any custom header on a service-origin MCP transport (the session dies mid-stream with an opaque
 * "An internal error occurred."), and even if it worked it would park a live user credential in a
 * third party's session configuration for the life of the build.
 *
 * So the shim mints a token here before the build starts, over its own authenticated channel, and
 * hands the harness only that token as the bearer — which the API does accept. The token names one
 * build, expires with it, and is worthless anywhere except this server.
 *
 * The store is in-process on purpose: a token is minted and redeemed by the same server that holds
 * the build's MCP sessions. A multi-replica deployment behind a load balancer needs a shared store
 * (Redis) or a signed stateless token; `MCP_BUILD_TOKEN_SECRET` is the seam for that.
 */

export const BUILD_TOKEN_PREFIX = 'tjb_';
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000; // a long build plus its repair turn
const MAX_TTL_MS = 6 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 5 * 60 * 1000;

interface StoredToken {
  identity: RequestIdentity;
  expiresAt: number;
}

const store = new Map<string, StoredToken>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [token, entry] of store) {
    if (entry.expiresAt <= now) store.delete(token);
  }
}

/** True for a value shaped like a build token. Cheap check before a store lookup. */
export function isBuildToken(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith(BUILD_TOKEN_PREFIX);
}

export interface MintedBuildToken {
  token: string;
  expiresAt: number;
}

/**
 * Mint a token for one build. `identity` is the real caller, resolved from the minting request's own
 * headers, so a token can never name someone the minter could not already act as.
 */
export function mintBuildToken(identity: RequestIdentity, ttlMs = DEFAULT_TTL_MS): MintedBuildToken {
  const now = Date.now();
  sweep(now);
  const ttl = Math.min(Math.max(ttlMs, 60_000), MAX_TTL_MS);
  const token = `${BUILD_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  const expiresAt = now + ttl;
  store.set(token, { identity, expiresAt });
  return { token, expiresAt };
}

/** The identity a build token names, or undefined when it is unknown or expired. */
export function resolveBuildToken(token: string | undefined): RequestIdentity | undefined {
  if (!isBuildToken(token)) return undefined;
  const now = Date.now();
  sweep(now);
  const entry = store.get(token as string);
  if (!entry) return undefined;
  if (entry.expiresAt <= now) {
    store.delete(token as string);
    return undefined;
  }
  return entry.identity;
}

/** Drop a token early: the build finished, or its session was cancelled. */
export function revokeBuildToken(token: string | undefined): boolean {
  if (!isBuildToken(token)) return false;
  return store.delete(token as string);
}

/** Test seam. */
export function clearBuildTokens(): void {
  store.clear();
  lastSweep = 0;
}

export function buildTokenCount(): number {
  return store.size;
}

/**
 * The shared secret that authorises minting, or undefined when minting is off. Off by default: an
 * unauthenticated mint route would let any caller name any user.
 */
export function mintSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const secret = env.MCP_BUILD_TOKEN_SECRET?.trim() || env.TOOLJET_MCP_TOKEN?.trim();
  return secret || undefined;
}

/** Constant-time bearer check against the mint secret. */
export function mintAuthorized(authHeader: string | undefined, secret: string): boolean {
  if (!authHeader) return false;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
