export interface Config {
  apiUrl: string;
  appUrl: string;
  /** Personal access token. Scoped, revocable, and works on SSO-only instances. The token also
   *  determines the workspace: a PAT session is pinned to the workspace the token was issued in and
   *  can reach no other. Used when this server is run standalone (a developer's MCP client). */
  pat?: string;
  /** A ToolJet session minted by ToolJet's own backend for the signed-in user, handed to us at
   *  startup instead of a token to exchange. This is the in-product path: the credential is already
   *  a session, so every write lands in the audit log under the person who asked for the build
   *  rather than under whoever owns a shared token. Short-lived by design — it is not renewable
   *  from here, and a 401 means the build outlived it. */
  sessionToken?: string;
  /** Workspace the session belongs to. Required with sessionToken, because a pre-minted session
   *  arrives without the exchange response that would otherwise carry it. */
  workspaceId?: string;
  /** Cosmetic: used to build user-facing datasource URLs. Falls back to workspaceId. */
  workspaceSlug?: string;
}

export function loadConfig(): Config {
  const pat = process.env.TOOLJET_PAT;
  const sessionToken = process.env.TOOLJET_SESSION_TOKEN;
  const workspaceId = process.env.TOOLJET_WORKSPACE_ID;

  if (!pat && !sessionToken) {
    throw new Error(
      'TOOLJET_SESSION_TOKEN or TOOLJET_PAT is required. For a standalone server, create a personal ' +
        'access token in ToolJet under Settings → Access tokens, in the workspace you want this ' +
        'server to act on, and set TOOLJET_PAT.'
    );
  }
  // A session cannot be interrogated for its workspace the way a PAT exchange response can, and
  // guessing it would silently act on the wrong one. Fail at startup instead.
  if (sessionToken && !workspaceId) {
    throw new Error('TOOLJET_WORKSPACE_ID is required alongside TOOLJET_SESSION_TOKEN.');
  }

  return {
    apiUrl: process.env.TOOLJET_URL ?? 'http://localhost:3000',
    appUrl: process.env.TOOLJET_APP_URL ?? 'http://localhost:8082',
    pat,
    sessionToken,
    workspaceId,
    workspaceSlug: process.env.TOOLJET_WORKSPACE_SLUG,
  };
}
