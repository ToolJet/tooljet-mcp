import { env } from '../config.js';

/** Agent ids match the `tj agents` adapters. Patterns are tried against the MCP client's announced name. */
const CLIENT_PATTERNS: [string, RegExp][] = [
  ['claude-desktop', /claude[-_ ]?(ai|desktop)/i],
  ['claude-code', /claude/i],
  ['codex', /codex/i],
  ['antigravity', /antigravity/i],
  ['gemini-cli', /gemini/i],
  ['cursor', /cursor/i],
  ['vscode', /visual studio code|vscode|copilot/i],
  ['windsurf', /windsurf|codeium/i],
  ['kiro', /kiro/i],
];

export const AGENT_LABEL_VAR = 'TOOLJET_AGENT';

/** Which agent launched this server: the label `tj` wrote into its entry, else the MCP client name. */
export function identifyAgent(clientName?: string): string | undefined {
  const label = env(AGENT_LABEL_VAR);
  if (label) return label;
  return clientName ? CLIENT_PATTERNS.find(([, pattern]) => pattern.test(clientName))?.[0] : undefined;
}
