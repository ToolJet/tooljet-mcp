// Package the generated skill without registering or bundling an MCP server.
// Run via npm run build:skill-plugin so the skill and references are fresh.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = 'tooljet-app-builder-skills';
const output = resolve(root, 'plugins', name);
const source = resolve(root, 'skills/tooljet-app-builder');
const offlineCatalog = resolve(source, 'references/catalog');
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const version = readJson('package.json').version;
const description = 'Build dashboards, internal tools and team operations apps using an existing ToolJet MCP connection. Guidance only; no bundled MCP server.';
const metadata = {
  name, version, description,
  author: { name: 'ToolJet' },
  homepage: 'https://github.com/ToolJet/tooljet-mcp',
  repository: 'https://github.com/ToolJet/tooljet-mcp',
  license: 'ISC',
  keywords: ['tooljet', 'app-builder', 'skills', 'oauth'],
};

// Refuse symlinks and machine-specific paths instead of shipping checkout-dependent files.
function verifyTree(dir) {
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    if (path === offlineCatalog) continue;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Skill package must not contain symlinks: ${entry}`);
    if (stat.isDirectory()) verifyTree(path);
    else if (/(?:\/(?:Users|home)\/[^/\s"']+\/|\/(?:private\/)?(?:tmp|var\/folders)\/|[A-Za-z]:[\\/]+Users[\\/])/i.test(readFileSync(path, 'utf8'))) {
      throw new Error(`Skill package contains a machine-specific path: ${entry}`);
    }
  }
}
for (const file of ['SKILL.md', 'scripts/browser-audit.js']) {
  if (!existsSync(resolve(source, file))) throw new Error(`Missing ${file}; run npm run generate:skill first.`);
}
verifyTree(source);

// Recreate only this generated package: removed references or old MCP configs cannot linger.
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
// The connected MCP supplies component contracts. Keep generated offline exports
// out of this package even when another build has populated them locally.
cpSync(source, resolve(output, 'skills/tooljet-app-builder'), {
  recursive: true,
  filter: (path) => path !== offlineCatalog,
});
const writeJson = (path, value) => {
  const target = resolve(output, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
};
writeJson('.claude-plugin/plugin.json', metadata);
writeJson('plugin.json', {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', ...metadata,
});
writeJson('.codex-plugin/plugin.json', {
  ...metadata,
  skills: './skills/',
  interface: {
    ...readJson('.codex-plugin/plugin.json').interface,
    displayName: 'ToolJet App Builder Skills',
    shortDescription: 'Build team apps with your ToolJet connection.',
    longDescription: description,
  },
});
verifyTree(output);
console.log(`Built plugins/${name}: skill, references, and manifests; no MCP server.`);
