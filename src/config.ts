export interface Config {
  apiUrl: string;
  appUrl: string;
  /** Personal access token — the only supported credential. Scoped, revocable, and works on
   *  SSO-only instances. The token also determines the workspace: a PAT session is pinned to the
   *  workspace the token was issued in and can reach no other. */
  pat: string;
}

export function loadConfig(): Config {
  const pat = process.env.TOOLJET_PAT;
  if (!pat) {
    throw new Error(
      'TOOLJET_PAT is required. Create a personal access token in ToolJet under ' +
        'Settings → Access tokens, in the workspace you want this server to act on.'
    );
  }
  return {
    apiUrl: process.env.TOOLJET_URL ?? 'http://localhost:3000',
    appUrl: process.env.TOOLJET_APP_URL ?? 'http://localhost:8082',
    pat,
  };
}
