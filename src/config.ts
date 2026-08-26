export interface Config {
  apiUrl: string;
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
}

export const SESSION_TOKEN_HEADER = 'x-tooljet-session';
export const WORKSPACE_ID_HEADER = 'x-tooljet-workspace-id';
export const WORKSPACE_SLUG_HEADER = 'x-tooljet-workspace-slug';
export const PAT_HEADER = 'x-tooljet-pat';

type HeaderBag = Record<string, string | string[] | undefined>;

function readHeader(headers: HeaderBag, name: string): string | undefined {
  const raw = headers[name] ?? headers[name.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
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
    return { pat };
  }

  if (!sessionToken && !workspaceId) return undefined;
  if (!sessionToken) {
    throw new Error(`${WORKSPACE_ID_HEADER} was sent without ${SESSION_TOKEN_HEADER}.`);
  }
  if (!workspaceId) {
    throw new Error(`${SESSION_TOKEN_HEADER} was sent without ${WORKSPACE_ID_HEADER}.`);
  }

  return { sessionToken, workspaceId, workspaceSlug: readHeader(headers, WORKSPACE_SLUG_HEADER) };
}

/**
 * Build the config for one request (HTTP) or one process (stdio).
 *
 * When `identity` is given it REPLACES this process's PAT rather than sitting alongside it, so a
 * shared server can never fall back to its own credential midway through acting as a user.
 */
export function loadConfig(identity?: RequestIdentity): Config {
  const apiUrl = process.env.TOOLJET_URL ?? 'http://localhost:3000';
  const appUrl = process.env.TOOLJET_APP_URL ?? 'http://localhost:8082';

  if (identity) {
    if (identity.pat) return { apiUrl, appUrl, pat: identity.pat };
    return {
      apiUrl,
      appUrl,
      sessionToken: identity.sessionToken,
      workspaceId: identity.workspaceId,
      workspaceSlug: identity.workspaceSlug,
    };
  }

  const pat = process.env.TOOLJET_PAT;
  const sessionToken = process.env.TOOLJET_SESSION_TOKEN;
  const workspaceId = process.env.TOOLJET_WORKSPACE_ID;

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
    workspaceSlug: process.env.TOOLJET_WORKSPACE_SLUG,
  };
}
