import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildCopilotPlugin(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const source = join(root, 'skills', 'tooljet-app-builder');
  const out = join(root, 'plugins', 'tooljet-copilot');
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
  writeFileSync(join(out, 'plugin.json'), JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'tooljet', version,
    description: 'Build and edit ToolJet internal tools, dashboards and business applications using an existing ToolJet MCP connection and the maintained app-builder skill.',
    author: { name: 'ToolJet', url: 'https://tooljet.com' },
    homepage: 'https://tooljet.com/mcp',
    repository: 'https://github.com/ToolJet/tooljet-mcp',
    license: 'ISC',
    keywords: ['tooljet', 'internal-tools', 'dashboards', 'business-apps', 'app-builder', 'mcp'],
  }, null, 2) + '\n');
  cpSync(source, join(out, 'skills', 'tooljet-app-builder'), {
    recursive: true,
    filter: path => !path.split(/[\\/]/).some(part => part === 'catalog' || part.startsWith('.env')),
  });
  cpSync(join(root, 'LICENSE'), join(out, 'LICENSE'));
  cpSync(join(root, 'docs', 'copilot.md'), join(out, 'README.md'));
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${buildCopilotPlugin()}`);
}
