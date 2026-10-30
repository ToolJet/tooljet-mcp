import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  cpSync(join(root, 'docs', `${target}.md`), join(out, 'README.md'));
  return out;
}
