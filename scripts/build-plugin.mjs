// Packages the MCP server + skill as a self-contained Claude Code plugin.
//
//   node scripts/build-plugin.mjs
//
// Produces (all committed, so the plugin installs from git with no build/npm step):
//   bundle/index.js                     — single-file esbuild bundle of the server (no node_modules)
//   skills/tooljet-app-builder/          — the generated skill (SKILL.md + references)
//   data component/datasource schemas + compatibility metadata — read at runtime as ../data
//
// The bundle is built from the tsc output (dist/), NOT src/, so the NodeNext `.js` import
// specifiers resolve to real files (esbuild can't map `./foo.js` → `foo.ts` on its own).
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

// 1. Compile TS → dist/ (real .js files with resolvable imports), then bundle to one file.
run('npm run build');
mkdirSync(resolve(root, 'bundle'), { recursive: true });
run(
  'npx --no-install esbuild dist/index.js --bundle --platform=node --format=esm ' +
    '--outfile=bundle/index.js --legal-comments=none'
);

// 2. Runtime catalogs and compatibility metadata live at `../data/*.json`. Assert they ship.
for (const f of ['component-schemas.json', 'component-compatibility.json', 'datasource-schemas.json', 'event-action-schemas.json']) {
  if (!existsSync(resolve(root, 'data', f))) {
    throw new Error(`build-plugin: missing data/${f} — run "npm run generate:catalogs" first.`);
  }
}

// 3. The skill generator writes both canonical and packaged host outputs from one source.
// Assert that focused references are present instead of silently copying a possibly stale tree.
for (const f of [
  'SKILL.md',
  'references/workflows.md',
  'references/ui-layout.md',
  'references/tables.md',
  'references/forms.md',
  'references/events.md',
  'references/datasources.md',
  'references/security.md',
  'references/qa.md',
  'references/components.md',
  'scripts/browser-audit.js',
]) {
  if (!existsSync(resolve(root, 'skills/tooljet-app-builder', f))) {
    throw new Error(`build-plugin: missing skills/tooljet-app-builder/${f} — run "npm run generate:skill" first.`);
  }
}

console.log('✓ Plugin built: bundle/index.js + skills/tooljet-app-builder/ (data/ shipped from repo).');
