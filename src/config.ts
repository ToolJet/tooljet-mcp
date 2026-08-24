export interface Config {
  apiUrl: string;
  appUrl: string;
  email: string;
  password: string;
  /** Instance-wide ToolJet external API token used only by user/workspace management tools. */
  externalApiAccessToken?: string;
  /** Optional: pin the active workspace at startup (for multi-workspace users). id wins over slug. */
  workspaceId?: string;
  workspaceSlug?: string;
}

export function loadConfig(): Config {
  const email = process.env.TOOLJET_EMAIL;
  const password = process.env.TOOLJET_PASSWORD;
  if (!email) throw new Error('TOOLJET_EMAIL is required');
  if (!password) throw new Error('TOOLJET_PASSWORD is required');
  return {
    apiUrl: process.env.TOOLJET_URL ?? 'http://localhost:3000',
    appUrl: process.env.TOOLJET_APP_URL ?? 'http://localhost:8082',
    email,
    password,
    externalApiAccessToken:
      process.env.TOOLJET_EXTERNAL_API_ACCESS_TOKEN ??
      process.env.TOOLJET_ACCESS_TOKEN ??
      process.env.EXTERNAL_API_ACCESS_TOKEN,
    workspaceId: process.env.TOOLJET_WORKSPACE_ID,
    workspaceSlug: process.env.TOOLJET_WORKSPACE_SLUG,
  };
}
