import type { Config } from './config.js';

/** Only values explicitly mapped from Claude's userConfig are accepted. No credential-file lookup. */
export function claudePluginConfig(values: Record<string, string | undefined>): Config {
  const value = (key: string) => {
    const input = values[key]?.trim();
    return input && !input.includes('${') ? input : undefined;
  };
  const pat = value('TOOLJET_CLAUDE_PAT');
  const deployment = value('TOOLJET_CLAUDE_DEPLOYMENT_URL');
  if (!pat || !deployment) {
    throw new Error('Configure the ToolJet deployment URL and personal access token in the plugin configuration dialog, then reload the plugin.');
  }
  const url = (input: string, label: string) => {
    let parsed: URL;
    try { parsed = new URL(input); } catch { throw new Error(`${label} must be an absolute HTTP or HTTPS URL.`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error(`${label} must be an HTTP or HTTPS URL without embedded credentials, query parameters, or a fragment.`);
    }
    return input.replace(/\/+$/, '');
  };
  const appUrl = url(deployment, 'Deployment URL');
  const apiUrl = url(value('TOOLJET_CLAUDE_API_URL') ?? deployment, 'API URL');
  return { pat, apiUrl, appUrl, viewerUrl: appUrl };
}
