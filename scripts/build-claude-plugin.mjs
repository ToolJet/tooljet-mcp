// Package the shared skill with the hosted OAuth connection, without a local server.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClaudePackage } from './check-claude-package.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'plugins/tooljet-claude');
// Remove obsolete runtime modules, catalogs and configuration on every rebuild.
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, '.claude-plugin'), { recursive: true });
for (const [from, to] of [
  ['integrations/claude/plugin.json', '.claude-plugin/plugin.json'],
  ['integrations/claude/README.md', 'README.md'],
  ['integrations/claude/assets', 'assets'],
  ['LICENSE', 'LICENSE'],
  ['skills/tooljet-app-builder', 'skills/tooljet-app-builder'],
]) {
  cpSync(resolve(root, from), resolve(output, to), {
    recursive: true,
    dereference: false,
    // Runtime catalogs come from the connected MCP server.
    filter: path => path !== resolve(root, 'skills/tooljet-app-builder/references/catalog'),
  });
}
const manifest = JSON.parse(readFileSync(resolve(output, '.claude-plugin/plugin.json'), 'utf8'));
const marketplacePath = resolve(root, '.claude-plugin/marketplace.json');
const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
const entry = marketplace.plugins.find(plugin => plugin.name === manifest.name);
if (!entry) throw new Error('Claude marketplace entry missing');
entry.source = './plugins/tooljet-claude';
entry.version = manifest.version;
entry.description = manifest.description;
writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n');
console.log(checkClaudePackage(output));
