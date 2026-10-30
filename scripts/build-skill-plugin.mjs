// Package the generated skill without registering or bundling an MCP server.
// Run via npm run build:skill-plugin so the skill and references are fresh.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildAgentSkillPlugin(root, target) {
  if (!['copilot', 'cursor', 'gemini', 'kiro'].includes(target)) throw new Error('Unsupported agent skill target');
  const source = join(root, 'skills', 'tooljet-app-builder');
  const out = join(root, 'plugins', `tooljet-${target}`);
  if (!existsSync(join(source, 'SKILL.md'))) throw new Error('Missing canonical app-builder skill');
  function checkTree(path) {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Skill package must not contain symlinks');
    if (stat.isDirectory()) for (const name of readdirSync(path)) checkTree(join(path, name));
  }
  checkTree(source);
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const manifest = {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'tooljet', version,
    description: 'Build and edit ToolJet internal tools, dashboards and business applications using an existing ToolJet MCP connection and the maintained app-builder skill.',
    author: { name: 'ToolJet', url: 'https://tooljet.com' },
    homepage: 'https://tooljet.com/mcp',
    repository: 'https://github.com/ToolJet/tooljet-mcp',
    license: 'ISC',
    keywords: ['tooljet', 'internal-tools', 'dashboards', 'business-apps', 'app-builder', 'mcp'],
  };
  if (target === 'kiro') {
    manifest.keywords.push('dashboard', 'internal tools', 'business applications', 'spreadsheet', 'excel', 'back-office', 'back office', 'operations', 'workflow');
  }
  // Gemini discovers skills from the same directory, but has its own manifest format.
  // Connection settings stay in each user's native MCP configuration for all targets.
  const gemini = target === 'gemini';
  writeFileSync(join(out, gemini ? 'gemini-extension.json' : 'plugin.json'), JSON.stringify(
    gemini ? { name: manifest.name, version, description: manifest.description } : manifest,
    null, 2,
  ) + '\n');
  cpSync(source, join(out, 'skills', 'tooljet-app-builder'), {
    recursive: true,
    filter: path => !path.split(/[\\/]/).some(part => part === 'catalog' || part.startsWith('.env')),
  });
  cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
  if (['gemini', 'kiro'].includes(target)) {
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    const start = `<!-- agent-guide:${target}:start -->`;
    const end = `<!-- agent-guide:${target}:end -->`;
    if (!readme.includes(start) || !readme.includes(end)) throw new Error('Missing native client guide');
    writeFileSync(join(out, 'README.md'), readme.split(start)[1].split(end)[0].trim().replace(/^##/gm, '#') + '\n');
  } else cpSync(join(root, 'docs', `${target}.md`), join(out, 'README.md'));
  return out;
}


export function buildSkillPlugin(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
const name = 'tooljet-app-builder-skills';
const output = resolve(root, 'plugins', name);
const source = resolve(root, 'skills/tooljet-app-builder');
const offlineCatalog = resolve(source, 'references/catalog');
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const version = readJson('package.json').version;
const description = 'App-building guidance for an existing ToolJet MCP connection, including remote OAuth. No bundled MCP server.';
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
    shortDescription: 'Build apps using your ToolJet MCP connection.',
    longDescription: description,
  },
});
// Keep published discovery metadata aligned with the generated package version.
for (const path of ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json']) {
  const marketplace = readJson(path);
  const entry = marketplace.plugins.find(plugin => plugin.name === name);
  if (!entry) throw new Error(`Missing ${name} entry in ${path}`);
  if (Object.hasOwn(entry, 'version')) {
    entry.version = version;
    writeFileSync(resolve(root, path), JSON.stringify(marketplace, null, 2) + '\n');
  }
}
verifyTree(output);
console.log(`Built plugins/${name}: skill, references, and manifests; no MCP server.`);

}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2]) console.log(`Built ${buildAgentSkillPlugin(resolve(dirname(fileURLToPath(import.meta.url)), '..'), process.argv[2])}`);
  else buildSkillPlugin();
}
