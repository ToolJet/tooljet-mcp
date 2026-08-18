// Regenerate and install the ToolJet app-builder skill for local agent runtimes.
// Usage: node scripts/sync-skill.mjs [--all|--codex|--claude] [--skip-generate]
import { cpSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
if (args.has('--help')) {
  console.log('Usage: node scripts/sync-skill.mjs [--all|--codex|--claude] [--skip-generate]');
  process.exit(0);
}

const supported = new Set(['--all', '--codex', '--claude', '--skip-generate']);
const unknown = [...args].filter((arg) => !supported.has(arg));
if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!args.has('--skip-generate')) await import('./generate-skill.mjs');

const selected = args.has('--all') || (!args.has('--codex') && !args.has('--claude'))
  ? ['codex', 'claude']
  : ['codex', 'claude'].filter((runtime) => args.has(`--${runtime}`));
const runtimeHomes = {
  codex: process.env.CODEX_HOME || resolve(homedir(), '.codex'),
  claude: process.env.CLAUDE_HOME || resolve(homedir(), '.claude'),
};
const source = resolve(root, 'skill');

for (const runtime of selected) {
  const target = resolve(runtimeHomes[runtime], 'skills/tooljet-app-builder');
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
  console.log(`Synced tooljet-app-builder to ${runtime}: ${target}`);
}

console.log('Start a new agent session (or reload skills) before evaluating the updated skill.');
