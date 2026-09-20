import { homedir } from 'node:os';
import { join } from 'node:path';

/** One home for profiles and the installed server. TOOLJET_MCP_HOME overrides it (tests, containers). */
export function homeDir(): string {
  const override = process.env.TOOLJET_MCP_HOME?.trim();
  return override ? override : join(homedir(), '.tooljet-mcp');
}

export const profilesPath = (): string => join(homeDir(), 'profiles.json');
/** The stable copy of the server that every agent's config points at — see setup.ts. */
export const installedBundlePath = (): string => join(homeDir(), 'bundle', 'index.js');
