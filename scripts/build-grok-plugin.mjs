import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildGrokPlugin(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const out = join(root, 'plugins', 'tooljet-grok');
  const source = join(root, 'skills', 'tooljet-app-builder');
  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  if (!existsSync(join(source, 'SKILL.md'))) throw new Error('Missing canonical app-builder skill');
  function checkTree(path) {
    if (lstatSync(path).isSymbolicLink()) throw new Error('Skill package must not contain symlinks');
    if (lstatSync(path).isDirectory()) for (const name of readdirSync(path)) checkTree(join(path, name));
  }
  checkTree(source);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, '.grok-plugin'), { recursive: true });
  const manifest = {
    name: 'tooljet', version,
    description: 'Build and edit ToolJet dashboards, internal tools and business applications with visual components, connected data and workflows.',
    author: { name: 'ToolJet', url: 'https://tooljet.com' },
    homepage: 'https://tooljet.com/mcp',
    repository: 'https://github.com/ToolJet/tooljet-mcp',
    license: 'ISC',
    keywords: ['tooljet', 'tooljet apps', 'tooljet mcp'],
    skills: ['./skills/'],
  };
  writeFileSync(join(out, '.grok-plugin', 'plugin.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(out, '.mcp.json'), JSON.stringify({ mcpServers: { tooljet: {
    type: 'http', url: 'https://mcp-oauth.tooljet.com/mcp/${TOOLJET_WORKSPACE_ID}',
  } } }, null, 2) + '\n');
  cpSync(source, join(out, 'skills', 'tooljet-app-builder'), {
    recursive: true,
    filter: path => !path.split(/[\\/]/).some(part => part === 'catalog' || part.startsWith('.env')),
  });
  cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
  cpSync(join(root, 'docs', 'grok-build.md'), join(out, 'README.md'));
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${buildGrokPlugin()}`);
}
