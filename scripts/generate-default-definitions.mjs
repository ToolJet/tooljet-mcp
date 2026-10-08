// Harvests each widget's default definition from ToolJet's server into data/component-default-definitions.json.
//
// ToolJet stores a component exactly as it was sent and, on every read, merges it over the widget's default
// definition (server/src/modules/apps/util.service.ts, buildComponentMetaDefinition). A page replace compares a
// plan with the page as read, so it needs the same defaults to tell "the plan leaves this component as it is" from
// "the plan changes it" (src/pageReplaceInPlace.ts).
//
// Usage: node scripts/generate-default-definitions.mjs   (env: TOOLJET_ROOT)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLJET = process.env.TOOLJET_ROOT || resolve(root, '..', 'ToolJet');
const entry = resolve(TOOLJET, 'server/src/modules/apps/services/widget-config/index.js');
const SECTIONS = ['properties', 'styles', 'validation', 'others', 'general', 'generalStyles'];

const dir = mkdtempSync(join(tmpdir(), 'tj-widget-config-'));
try {
  const outfile = join(dir, 'widget-config.mjs');
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
  const { componentTypes } = await import(pathToFileURL(outfile).href);
  const definitions = {};
  for (const widget of [...componentTypes].sort((a, b) => String(a.component).localeCompare(String(b.component)))) {
    const definition = widget.definition ?? {};
    definitions[widget.component] = Object.fromEntries(SECTIONS.filter((s) => definition[s] !== undefined).map((s) => [s, definition[s]]));
  }
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: TOOLJET, encoding: 'utf8' }).trim();
  writeFileSync(resolve(root, 'data/component-default-definitions.json'),
    JSON.stringify({ source: 'ToolJet/ToolJet', revision, definitions }, null, 1) + '\n');
  console.log(`✓ data/component-default-definitions.json: ${Object.keys(definitions).length} widgets at ${revision.slice(0, 10)}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
