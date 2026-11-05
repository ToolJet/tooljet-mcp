// Build the single folder installed by Claude. Source, CI and other host configs stay outside it.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reviewableBundle } from './reviewable-bundle.mjs';
import { checkClaudePackage } from './check-claude-package.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'plugins/tooljet-claude');
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
const modules = await reviewableBundle('./dist/claude.js', '.mjs');
rmSync(output, { recursive: true, force: true });
mkdirSync(resolve(output, 'bundle'), { recursive: true });
mkdirSync(resolve(output, '.claude-plugin'), { recursive: true });
for (const file of modules) writeFileSync(resolve(output, 'bundle', file.name), file.code);
for (const [from, to] of [
  ['integrations/claude/plugin.json', '.claude-plugin/plugin.json'],
  ['integrations/claude/README.md', 'README.md'],
  ['integrations/claude/assets', 'assets'],
  ['LICENSE', 'LICENSE'],
  ['data', 'data'],
  ['skills/tooljet-app-builder', 'skills/tooljet-app-builder'],
]) {
  cpSync(resolve(root, from), resolve(output, to), {
    recursive: true,
    dereference: false,
    // Runtime MCP catalogs are included. Duplicate offline skill exports are generated locally.
    filter: path => path !== resolve(root, 'skills/tooljet-app-builder/references/catalog'),
  });
}
const manifest = JSON.parse(readFileSync(resolve(output, '.claude-plugin/plugin.json'), 'utf8'));
// Preserve explicit root/path installs while the marketplace installs only the curated folder.
// The repository root remains a development checkout and is not the directory submission target.
const rootManifest = structuredClone(manifest);
rootManifest.icon = './integrations/claude/assets/tooljet-icon.png';
rootManifest.mcpServers.tooljet.args = ['${CLAUDE_PLUGIN_ROOT}/plugins/tooljet-claude/bundle/index.mjs'];
writeFileSync(resolve(root, '.claude-plugin/plugin.json'), JSON.stringify(rootManifest, null, 2) + '\n');
const marketplacePath = resolve(root, '.claude-plugin/marketplace.json');
const marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
const entry = marketplace.plugins.find(plugin => plugin.name === manifest.name);
if (!entry) throw new Error('Claude marketplace entry missing');
entry.source = './plugins/tooljet-claude';
entry.version = manifest.version;
entry.description = manifest.description;
writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n');
console.log(checkClaudePackage(output));
