// Packages the MCP server + skill as a self-contained Claude Code plugin.
//
//   node scripts/build-plugin.mjs
//
// Produces (all committed, so the runtime needs no build or installed dependencies):
//   bundle/index.js                     — readable ESM entry and dependency chunks of the server (no node_modules)
//   skills/tooljet-app-builder/          — the generated skill (SKILL.md + references)
//   data component/datasource schemas + compatibility metadata — read at runtime as ../data
//
// The bundle is built from the tsc output (dist/), NOT src/, so the NodeNext `.js` import
// specifiers resolve to real files (esbuild can't map `./foo.js` → `foo.ts` on its own).
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { reviewableBundle } from './reviewable-bundle.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

// 1. Compile TS → dist/ (real .js files with resolvable imports), then bundle to readable modules.
run('npm run build');
run('node scripts/render-component-catalog.mjs');
const modules = await reviewableBundle();
rmSync(resolve(root, 'bundle'), { recursive: true, force: true });
mkdirSync(resolve(root, 'bundle'), { recursive: true });
for (const file of modules) writeFileSync(resolve(root, 'bundle', file.name), file.code);

// 2. Runtime catalogs and compatibility metadata live at `../data/*.json`. Assert they ship.
for (const f of ['component-schemas.json', 'component-compatibility.json', 'component-default-definitions.json', 'datasource-schemas.json', 'default-theme.json', 'page-icons.json']) {
  if (!existsSync(resolve(root, 'data', f))) {
    const generate = f === 'page-icons.json' ? 'generate:page-icons' : 'generate:catalogs';
    throw new Error(`build-plugin: missing data/${f} — run "npm run ${generate}" first.`);
  }
}

// 3. The skill generator writes both canonical and packaged host outputs from one source.
// Assert that focused references are present instead of silently copying a possibly stale tree.
for (const f of [
  'SKILL.md',
  'references/workflows.md',
  'references/workflow-builder.md',
  'references/migration.md',
  'references/ui-layout.md',
  'references/tables.md',
  'references/forms.md',
  'references/events.md',
  'references/datasources.md',
  'references/security.md',
  'references/qa.md',
  'references/components.md',
  'references/themes.md',
  'scripts/browser-audit.js',
]) {
  if (!existsSync(resolve(root, 'skills/tooljet-app-builder', f))) {
    throw new Error(`build-plugin: missing skills/tooljet-app-builder/${f} — run "npm run generate:skill" first.`);
  }
}

// Verify the emitted module graph and catalogs without node_modules or real credentials.
run('node scripts/test-plugin-package.mjs');

console.log('✓ Plugin built: bundle/index.js + skills/tooljet-app-builder/ (data/ shipped from repo).');
