// Harvests the component packs' default definitions (the shadcn/ui pack's generated widget configs) into
// data/pack-default-definitions.json.
//
// The server has no widget config for pack types, so it merges no defaults over them on read: a pack component
// created without a property simply lacks it, and the inspector shows it unset. create_component fills a pack
// component's definition from these defaults, as a drag and drop from the editor's panel does.
//
// Usage: node scripts/generate-pack-defaults.mjs   (env: TOOLJET_ROOT)
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLJET = process.env.TOOLJET_ROOT || resolve(root, '..', 'ToolJet');
const entry = resolve(TOOLJET, 'frontend/src/AppBuilder/WidgetManager/widgets/shadcn.js');
const SECTIONS = ['properties', 'styles', 'others'];

const dir = mkdtempSync(join(tmpdir(), 'tj-pack-config-'));
try {
  const outfile = join(dir, 'pack.mjs');
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  const { shadcnConfigs } = await import(pathToFileURL(outfile).href);
  const definitions = {};
  for (const widget of [...shadcnConfigs].sort((a, b) => a.component.localeCompare(b.component))) {
    const definition = widget.definition ?? {};
    definitions[widget.component] = Object.fromEntries(SECTIONS.filter((s) => definition[s]).map((s) => [s, definition[s]]));
  }
  writeFileSync(resolve(root, 'data/pack-default-definitions.json'), JSON.stringify({ definitions }, null, 1) + '\n');
  console.log(`✓ data/pack-default-definitions.json: ${Object.keys(definitions).length} pack widgets`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
