// Snapshot the exact exports used by ToolJet's TablerIcon renderer, not guessed PascalCase names.
// TOOLJET_ROOT=/path/to/ToolJet npm run generate:page-icons
// Requires the checkout's frontend dependencies to be installed. No React/SVG code is executed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function collectPageIconNames(source) {
  const ast = parse(source, { sourceType: 'module' });
  const names = new Set();
  for (const statement of ast.program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || !statement.source?.value.includes('/icons/')) continue;
    for (const specifier of statement.specifiers) {
      const name = specifier.exported?.name ?? specifier.exported?.value;
      if (typeof name === 'string' && /^Icon[A-Za-z0-9]+$/.test(name)) names.add(name);
    }
  }
  if (!names.size) throw new Error('No Tabler icon exports found; inspect the package format before updating the catalog.');
  return [...names].sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tooljet = process.env.TOOLJET_ROOT || resolve(root, '..', 'ToolJet');
  const require = createRequire(resolve(tooljet, 'frontend/package.json'));
  const manifestPath = require.resolve('@tabler/icons-react/package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const names = collectPageIconNames(readFileSync(resolve(dirname(manifestPath), manifest.module), 'utf8'));
  const catalog = { package: manifest.name, version: manifest.version, names };
  writeFileSync(resolve(root, 'data/page-icons.json'), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Generated ${names.length} page icons from ${manifest.name}@${manifest.version}`);
}
