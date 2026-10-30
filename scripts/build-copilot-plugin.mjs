import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAgentSkillPlugin } from './build-agent-skill-plugin.mjs';

export function buildCopilotPlugin(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  return buildAgentSkillPlugin(root, 'copilot');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${buildCopilotPlugin()}`);
}
