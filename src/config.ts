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
}

export const SESSION_TOKEN_HEADER = 'x-tooljet-session';
export const WORKSPACE_ID_HEADER = 'x-tooljet-workspace-id';
export const WORKSPACE_SLUG_HEADER = 'x-tooljet-workspace-slug';
export const PAT_HEADER = 'x-tooljet-pat';
export const BASE_URL_HEADER = 'x-tooljet-url';
/** Comma-separated https origins this server will accept as a request-named target. */
export const ALLOWED_API_ORIGINS_VAR = 'MCP_ALLOWED_API_ORIGINS';

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

/**
 * Validate the request-supplied target origin, or throw.
 *
 * Gets the caller's session/PAT attached and sent straight to it (auth.ts) — a bearer-grade
 * credential, not just traffic. https alone does not make a host trustworthy: an attacker's own
 * domain has a valid cert too. So beyond parse+scheme (garbage input, http downgrade), the origin
 * must also appear in MCP_ALLOWED_API_ORIGINS. Unset means empty, not "allow anything" — a shared
 * deployment must opt in to which backends it will ever write into.
 *
 * A path prefix is allowed (not just a bare origin): ToolJet supports SUB_PATH hosting, so a
 * self-hosted customer reverse-proxied at e.g. https://tj.example.com/tooljet is a legitimate target,
 * not a malformed one. The allowlist matches on origin only — the path is the operator's own
 * reverse-proxy detail, not the trust boundary. Query, hash, and credentials are rejected outright.
 */
function validateApiUrl(raw: string): string {
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
  if (!allowedApiOrigins().includes(parsed.origin)) {
    throw new Error(
      `${BASE_URL_HEADER} origin "${parsed.origin}" is not in ${ALLOWED_API_ORIGINS_VAR}. Add it to that ` +
        'comma-separated list to let this server write into that backend.'
    );
  }
  // A trailing slash is cosmetic; normalize it away so "https://x.com/tooljet" and
  // "https://x.com/tooljet/" resolve to the same target instead of being treated as different ones.
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
  return parsed.origin + path;
}

/**
 * Extract the acting user from request headers, or undefined when the caller sent none.
 *
 * A session WITHOUT a workspace throws rather than returning undefined. Returning undefined would
 * silently downgrade the request to this process's shared credential — producing a build that looks
 * correct but is attributed to the wrong user, which is the single failure this whole mechanism
 * exists to prevent. Failing the request is recoverable; mis-attributing it is not.
 */
export function identityFromHeaders(
  headers: HeaderBag,
  { allowPat = true }: { allowPat?: boolean } = {}
): RequestIdentity | undefined {
  const sessionToken = readHeader(headers, SESSION_TOKEN_HEADER);
  const workspaceId = readHeader(headers, WORKSPACE_ID_HEADER);
  const pat = readHeader(headers, PAT_HEADER);
  const rawApiUrl = readHeader(headers, BASE_URL_HEADER);
  const apiUrl = rawApiUrl ? validateApiUrl(rawApiUrl) : undefined;

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
    return { pat, apiUrl };
  }

  if (!sessionToken && !workspaceId) return apiUrl ? { apiUrl } : undefined;
  if (!sessionToken) {
    throw new Error(`${WORKSPACE_ID_HEADER} was sent without ${SESSION_TOKEN_HEADER}.`);
  }
  if (!workspaceId) {
    throw new Error(`${SESSION_TOKEN_HEADER} was sent without ${WORKSPACE_ID_HEADER}.`);
  }

  return { sessionToken, workspaceId, workspaceSlug: readHeader(headers, WORKSPACE_SLUG_HEADER), apiUrl };
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
  const staticApiUrl = explicitApiUrl ?? 'http://localhost:3000';
  // TOOLJET_APP_URL is the old name — "app" read as "one ToolJet app" more often than "the ToolJet
  // deployment", which is what this actually is. TOOLJET_DEPLOYMENT_URL is preferred; the old name
  // keeps working so nobody's existing config breaks. An explicit value here always wins — it is a
  // deliberate override, not a guess — falling through only when the operator hasn't set one.
  const explicitAppUrl = env('TOOLJET_DEPLOYMENT_URL') ?? env('TOOLJET_APP_URL');

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
    const appUrl = explicitAppUrl ?? identity.apiUrl ?? staticApiUrl;

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
