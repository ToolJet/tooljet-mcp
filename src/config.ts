export interface Config {
  apiUrl: string;
  appUrl: string;
  /** Personal access token. Preferred over email/password: scoped, revocable, and it works on
   *  SSO-only instances where form login is not available at all. */
  pat?: string;
  /** Legacy form login. Kept as a fallback so existing deployments keep working. */
  email?: string;
  password?: string;
  /** Optional: pin the active workspace at startup (for multi-workspace users). id wins over slug.
   *  Ignored under PAT auth — a PAT session is pinned to the token's own workspace. */
  workspaceId?: string;
  workspaceSlug?: string;
}

export function loadConfig(): Config {
  const pat = process.env.TOOLJET_PAT;
  const email = process.env.TOOLJET_EMAIL;
  const password = process.env.TOOLJET_PASSWORD;
  // A PAT is sufficient on its own; email/password remain valid for instances that have not issued
  // tokens yet. Requiring one of the two keeps the failure at startup instead of on the first call.
  if (!pat && !(email && password)) {
    throw new Error(
      'Set TOOLJET_PAT (a personal access token, preferred), or TOOLJET_EMAIL + TOOLJET_PASSWORD. ' +
        'Create a token in ToolJet under Settings → Access tokens.'
    );
  }
  return {
    apiUrl: process.env.TOOLJET_URL ?? 'http://localhost:3000',
    appUrl: process.env.TOOLJET_APP_URL ?? 'http://localhost:8082',
    pat,
    email,
    password,
    workspaceId: process.env.TOOLJET_WORKSPACE_ID,
    workspaceSlug: process.env.TOOLJET_WORKSPACE_SLUG,
  };
}
