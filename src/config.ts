export interface Config {
  apiUrl: string;
  /** Where a human opens ToolJet in a browser — used only to build user-facing links (a datasource's
   *  settings page, an app's editor/viewer URL). Most self-hosted instances serve the API and the UI
   *  from the same origin, so this defaults to `apiUrl` rather than requiring a second setting. */
  appUrl: string;
  /** Personal access token. Scoped, revocable, and works on SSO-only instances. The token also
   *  determines the workspace: a PAT session is pinned to the workspace the token was issued in and
   *  can reach no other. Used when this server is run standalone (a developer's MCP client). */
  pat?: string;
  /** A ToolJet session minted by ToolJet's own backend for the signed-in user, handed to us instead
   *  of a token to exchange. This is the in-product path: the credential is already a session, so
   *  every write lands in the audit log under the person who asked for the build rather than under
   *  whoever owns a shared token. Short-lived by design — it is not renewable from here, and a 401
   *  means the build outlived it. */
  sessionToken?: string;
  /** Workspace the session belongs to. Required with sessionToken, because a pre-minted session
   *  arrives without the exchange response that would otherwise carry it. */
  workspaceId?: string;
  /** Cosmetic: used to build user-facing datasource URLs. Falls back to workspaceId. */
  workspaceSlug?: string;
}

/**
 * Who a request is acting as, supplied per-request instead of by this process's environment.
 *
 * Needed because staging and cloud run ONE shared MCP over HTTP for every user, so identity cannot
 * come from the environment the way it does for a per-build stdio subprocess. The caller (ToolJet's
 * AI shim) proves it is trusted with the MCP_SHARED_TOKEN bearer gate, and these headers say which
 * user it is acting for. The two are deliberately separate: the bearer token authenticates the
 * caller, the session authorises the work.
 */
export interface RequestIdentity {
  sessionToken?: string;
  workspaceId?: string;
  workspaceSlug?: string;
  /** A ToolJet PAT belonging to the caller, sent per request rather than living in this process's
   *  environment. This is how a coding agent talks to an HTTP server it runs itself: the token is
   *  the agent's own, so the server holds no credential and every write is attributed to the token's
   *  owner. Mutually exclusive with `sessionToken` — see identityFromHeaders. */
  pat?: string;
  /** The calling ToolJet instance's own API origin, sent per request. One shared MCP server (staging,
   *  cloud) can act on behalf of many different ToolJet backends — self-hosted and cloud alike — so
   *  the target can't be this process's own fixed TOOLJET_URL. Wins over that static value when
   *  present — see loadConfig. */
  apiUrl?: string;
  /** Real customer, resolve mode, no host on file — lets the caller relax MCP_REQUIRE_REQUEST_URL. */
  customerVerified?: boolean;
}

export const SESSION_TOKEN_HEADER = 'x-tooljet-session';
export const WORKSPACE_ID_HEADER = 'x-tooljet-workspace-id';
export const WORKSPACE_SLUG_HEADER = 'x-tooljet-workspace-slug';
export const PAT_HEADER = 'x-tooljet-pat';
export const BASE_URL_HEADER = 'x-tooljet-url';
/** Self-hosted customer ID, forwarded by tooljet-agent — lets validateApiUrl check an origin outside
 *  the static allowlist against the Gateway instead of rejecting it outright. */
export const CUSTOMER_ID_HEADER = 'x-tooljet-customer-id';
/** Comma-separated https origins this server will accept as a request-named target. */
export const ALLOWED_API_ORIGINS_VAR = 'MCP_ALLOWED_API_ORIGINS';
/** Gateway origin-verification endpoint + bearer secret. Unset means the dynamic check is off. */
const GATEWAY_URL_VAR = 'MCP_GATEWAY_URL';
const GATEWAY_TOKEN_VAR = 'MCP_GATEWAY_TOKEN';

/** An environment variable, or undefined when unset OR blank. */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * MCP_ALLOWED_API_ORIGINS, normalized to the same form `new URL(...).origin` produces for a request's
 * x-tooljet-url — lowercased, default port stripped, no trailing slash. Comparing raw config strings
 * against a normalized origin means "https://Foo.com" or "https://foo.com:443" in the env var would
 * never match a request that is, in every way that matters, the same host — denying real traffic while
 * looking, to whoever reads the config next to the error, like it should have matched. Throws rather
 * than silently keeping an entry nothing can ever match: a misconfigured allowlist should fail loudly
 * where an operator is looking (startup), not blend into "not in the allowlist" for the first caller.
 */
export function allowedApiOrigins(): string[] {
  const raw = env(ALLOWED_API_ORIGINS_VAR);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      let parsed: URL;
      try {
        parsed = new URL(entry);
      } catch {
        throw new Error(`${ALLOWED_API_ORIGINS_VAR} contains an entry that is not a valid URL: "${entry}".`);
      }
      // A request's origin is required to be https (validateApiUrl) before it ever reaches this
      // allowlist, so a non-https entry here — a typo, e.g. "http://" — could never match anything.
      // Silently keeping it would leave the operator with a dead entry and no signal it's wrong.
      if (parsed.protocol !== 'https:') {
        throw new Error(`${ALLOWED_API_ORIGINS_VAR} entry "${entry}" must use https — it could never match a request.`);
      }
      return parsed.origin;
    });
}

type HeaderBag = Record<string, string | string[] | undefined>;

function readHeader(headers: HeaderBag, name: string): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Last Gateway verdict per customer+origin. A revoked customer can stay "allowed" up to the TTL. */
const gatewayOriginCache = new Map<string, { allowed: boolean; expiresAt: number }>();
const GATEWAY_CACHE_TTL_MS = 60_000;

/** Live fallback for an origin outside MCP_ALLOWED_API_ORIGINS. Fails closed on any error/timeout. */
async function checkOriginWithGateway(customerId: string, origin: string): Promise<boolean> {
  const cacheKey = `${customerId} ${origin}`;
  const cached = gatewayOriginCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.allowed;

  const gatewayUrl = env(GATEWAY_URL_VAR);
  const gatewayToken = env(GATEWAY_TOKEN_VAR);
  if (!gatewayUrl || !gatewayToken) return false;

  let allowed = false;
  try {
    const res = await fetch(new URL('/internal/mcp/verify-origin', gatewayUrl), {
      method: 'POST',
      headers: { authorization: gatewayToken, 'content-type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, origin }),
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const body = (await res.json()) as { allowed?: boolean };
      allowed = body.allowed === true;
    }
  } catch {
    allowed = false;
  }
  gatewayOriginCache.set(cacheKey, { allowed, expiresAt: Date.now() + GATEWAY_CACHE_TTL_MS });
  return allowed;
}

interface ResolvedOrigin {
  /** Undefined when there's no host on file, the Gateway is unreachable, or customer_id isn't real. */
  url: string | undefined;
  /** True only when the Gateway confirmed this customer_id is real, even with no host on file. */
  verified: boolean;
}

/** Last resolved origin per customer. */
const gatewayResolveCache = new Map<string, { result: ResolvedOrigin; expiresAt: number }>();

/** Resolve fallback when x-tooljet-url is absent. Fails closed on any error/timeout. */
async function resolveApiUrlFromGateway(customerId: string): Promise<ResolvedOrigin> {
  const cached = gatewayResolveCache.get(customerId);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const gatewayUrl = env(GATEWAY_URL_VAR);
  const gatewayToken = env(GATEWAY_TOKEN_VAR);
  let result: ResolvedOrigin = { url: undefined, verified: false };
  if (gatewayUrl && gatewayToken) {
    try {
      const res = await fetch(new URL('/internal/mcp/verify-origin', gatewayUrl), {
        method: 'POST',
        headers: { authorization: gatewayToken, 'content-type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId }),
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const body = (await res.json()) as { host_name?: string | null; subpath?: string | null };
        // 'host_name' present = real customer (verify-mode's {allowed:false} has no such key).
        if ('host_name' in body) {
          const path = body.subpath ? `/${body.subpath.replace(/^\/+|\/+$/g, '')}` : '';
          result = { url: body.host_name ? `https://${body.host_name}${path}` : undefined, verified: true };
        }
      }
    } catch {
      result = { url: undefined, verified: false };
    }
  }
  gatewayResolveCache.set(customerId, { result, expiresAt: Date.now() + GATEWAY_CACHE_TTL_MS });
  return result;
}

/**
 * Validate the request-supplied target origin, or throw.
 *
 * Gets the caller's session/PAT attached and sent straight to it (auth.ts) — a bearer-grade
 * credential, not just traffic. https alone does not make a host trustworthy: an attacker's own
 * domain has a valid cert too. So beyond parse+scheme (garbage input, http downgrade), the origin
 * must also appear in MCP_ALLOWED_API_ORIGINS, or — when the request names a customerId — pass a
 * live check against the Gateway. Neither set means "allow anything": a shared deployment must
 * opt in to which backends it will ever write into.
 *
 * A path prefix is allowed (not just a bare origin): ToolJet supports SUB_PATH hosting, so a
 * self-hosted customer reverse-proxied at e.g. https://tj.example.com/tooljet is a legitimate target,
 * not a malformed one. Both checks match on origin only — the path is the operator's own
 * reverse-proxy detail, not the trust boundary. Query, hash, and credentials are rejected outright.
 */
async function validateApiUrl(
  raw: string,
  customerId?: string
): Promise<{ apiUrl: string; customerVerified?: true }> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${BASE_URL_HEADER} must be a valid absolute URL.`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`${BASE_URL_HEADER} must use https.`);
  }
  if (parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(`${BASE_URL_HEADER} must carry no query, hash, or credentials.`);
  }
  const inStaticList = allowedApiOrigins().includes(parsed.origin);
  // Same Gateway confirmation as resolve mode — a customer verified this way should bypass
  // MCP_REQUIRE_USER_SESSION too, not just the origin check that verified them.
  const verifiedViaGateway = !inStaticList && customerId ? await checkOriginWithGateway(customerId, parsed.origin) : false;
  if (!inStaticList && !verifiedViaGateway) {
    throw new Error(
      `${BASE_URL_HEADER} origin "${parsed.origin}" is not in ${ALLOWED_API_ORIGINS_VAR} and did not verify ` +
        `against the Gateway. Add it to that comma-separated list, or confirm ${CUSTOMER_ID_HEADER} is being sent.`
    );
  }
  // A trailing slash is cosmetic; normalize it away so "https://x.com/tooljet" and
  // "https://x.com/tooljet/" resolve to the same target instead of being treated as different ones.
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
  return { apiUrl: parsed.origin + path, customerVerified: verifiedViaGateway ? true : undefined };
}

/**
 * Extract the acting user from request headers, or undefined when the caller sent none.
 *
 * A session WITHOUT a workspace throws rather than returning undefined. Returning undefined would
 * silently downgrade the request to this process's shared credential — producing a build that looks
 * correct but is attributed to the wrong user, which is the single failure this whole mechanism
 * exists to prevent. Failing the request is recoverable; mis-attributing it is not.
 */
export async function identityFromHeaders(
  headers: HeaderBag,
  { allowPat = true }: { allowPat?: boolean } = {}
): Promise<RequestIdentity | undefined> {
  const sessionToken = readHeader(headers, SESSION_TOKEN_HEADER);
  const workspaceId = readHeader(headers, WORKSPACE_ID_HEADER);
  const pat = readHeader(headers, PAT_HEADER);
  const rawApiUrl = readHeader(headers, BASE_URL_HEADER);
  const customerId = readHeader(headers, CUSTOMER_ID_HEADER);
  let apiUrl: string | undefined;
  let customerVerified: true | undefined;
  if (rawApiUrl) {
    const validated = await validateApiUrl(rawApiUrl, customerId);
    apiUrl = validated.apiUrl;
    customerVerified = validated.customerVerified;
  } else if (customerId) {
    const resolved = await resolveApiUrlFromGateway(customerId);
    apiUrl = resolved.url;
    customerVerified = resolved.verified ? true : undefined;
  }

  if (pat) {
    /* A PAT names whoever owns it and lives for weeks; a session names the person this request is
       for and expires with the build. A shared server must accept only the latter, so refuse the
       header rather than ignoring it: accepting one would satisfy a "signed-in user required" check
       with the wrong person, and silently acting as someone else is the failure this whole mechanism
       exists to prevent. */
    if (!allowPat) {
      throw new Error(
        `${PAT_HEADER} is not accepted by this server. It acts only on behalf of a signed-in user: ` +
          `send ${SESSION_TOKEN_HEADER} with ${WORKSPACE_ID_HEADER}.`
      );
    }
    // Two credentials that may name two different people is precisely the mis-attribution this
    // mechanism exists to prevent, so refuse rather than silently prefer one.
    if (sessionToken) throw new Error(`Send either ${PAT_HEADER} or ${SESSION_TOKEN_HEADER}, not both.`);
    // A PAT is pinned to the workspace it was issued in, so unlike a session it needs no companion.
    return { pat, apiUrl, customerVerified };
  }

  if (!sessionToken && !workspaceId) {
    return apiUrl || customerVerified ? { apiUrl, customerVerified } : undefined;
  }
  if (!sessionToken) {
    throw new Error(`${WORKSPACE_ID_HEADER} was sent without ${SESSION_TOKEN_HEADER}.`);
  }
  if (!workspaceId) {
    throw new Error(`${SESSION_TOKEN_HEADER} was sent without ${WORKSPACE_ID_HEADER}.`);
  }

  return {
    sessionToken,
    workspaceId,
    workspaceSlug: readHeader(headers, WORKSPACE_SLUG_HEADER),
    apiUrl,
    customerVerified,
  };
}

/**
 * Build the config for one request (HTTP) or one process (stdio).
 *
 * When `identity` is given it REPLACES this process's PAT rather than sitting alongside it, so a
 * shared server can never fall back to its own credential midway through acting as a user.
 */
export function loadConfig(identity?: RequestIdentity): Config {
  // `??` is wrong here: a plugin host substitutes an unset ${VAR} as an empty string, which is not
  // nullish, so it would beat the default and every request would go to "". Treat blank as unset.
  const explicitApiUrl = env('TOOLJET_URL');
  // TOOLJET_APP_URL is the old name — "app" read as "one ToolJet app" more often than "the ToolJet
  // deployment", which is what this actually is. TOOLJET_DEPLOYMENT_URL is preferred; the old name
  // keeps working so nobody's existing config breaks. An explicit value here always wins — it is a
  // deliberate override, not a guess — falling through only when the operator hasn't set one.
  const explicitAppUrl = env('TOOLJET_DEPLOYMENT_URL') ?? env('TOOLJET_APP_URL');
  // Most self-hosted deployments serve the API and the UI from the same origin, so TOOLJET_URL and
  // TOOLJET_DEPLOYMENT_URL/TOOLJET_APP_URL end up set to the identical value — one variable set
  // twice. Let TOOLJET_DEPLOYMENT_URL/TOOLJET_APP_URL double as the API origin when TOOLJET_URL
  // itself is unset, so a single-origin deployment only has to configure one of them. An explicit
  // TOOLJET_URL still always wins when both are set — same override precedence as explicitAppUrl.
  const staticApiUrl = explicitApiUrl ?? explicitAppUrl ?? 'http://localhost:3000';

  if (identity) {
    // The request's own apiUrl wins when present — same precedence as the session/PAT identity
    // above it. One shared server must be able to act on many different ToolJet backends; the
    // static TOOLJET_URL is only ever a fallback for it, never the source of truth.
    //
    // MCP_REQUIRE_REQUEST_URL is enforced in index.ts, not here: this function can't tell a genuine
    // stdio call (identity omitted, one operator, static URL is correct) apart from an HTTP request
    // that simply sent no headers (identity also arrives as undefined) — only the HTTP layer that
    // built `identity` from a real request knows which case it is.
    const apiUrl = identity.apiUrl ?? staticApiUrl;
    // appUrl must follow the SAME per-request target apiUrl just resolved above, not the server's own
    // static config: a shared server acting for many different ToolJet backends has no single static
    // app URL that could ever be right for all of them. Most self-hosted instances serve the API and
    // the UI from the same origin, so the request's own apiUrl is the right default here too.
    //
    // Falls through to explicitApiUrl, NOT staticApiUrl: staticApiUrl silently includes apiUrl's own
    // internal localhost:3000 default, which would make an unconfigured deployment's appUrl land on
    // the API's dev port instead of the UI's (localhost:8082) — the exact default the no-identity
    // branch below already gets right. Only a genuinely-set TOOLJET_URL should stand in for appUrl.
    const appUrl = explicitAppUrl ?? identity.apiUrl ?? explicitApiUrl ?? 'http://localhost:8082';

    if (identity.pat) return { apiUrl, appUrl, pat: identity.pat };
    return {
      apiUrl,
      appUrl,
      sessionToken: identity.sessionToken,
      workspaceId: identity.workspaceId,
      workspaceSlug: identity.workspaceSlug,
    };
  }

  const apiUrl = staticApiUrl;
  const appUrl = explicitAppUrl ?? explicitApiUrl ?? 'http://localhost:8082';

  const pat = env('TOOLJET_PAT');
  const sessionToken = env('TOOLJET_SESSION_TOKEN');
  const workspaceId = env('TOOLJET_WORKSPACE_ID');

  if (!pat && !sessionToken) {
    throw new Error(
      'TOOLJET_SESSION_TOKEN or TOOLJET_PAT is required. For a standalone server, create a personal ' +
        'access token in ToolJet under Settings → Access tokens, in the workspace you want this ' +
        'server to act on, and set TOOLJET_PAT. A shared HTTP server instead receives the acting ' +
        `user per request via the ${SESSION_TOKEN_HEADER} header.`
    );
  }
  // A session cannot be interrogated for its workspace the way a PAT exchange response can, and
  // guessing it would silently act on the wrong one. Fail at startup instead.
  if (sessionToken && !workspaceId) {
    throw new Error('TOOLJET_WORKSPACE_ID is required alongside TOOLJET_SESSION_TOKEN.');
  }

  return {
    apiUrl,
    appUrl,
    pat,
    sessionToken,
    workspaceId,
    workspaceSlug: env('TOOLJET_WORKSPACE_SLUG'),
  };
}
