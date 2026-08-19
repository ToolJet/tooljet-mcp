// Packages the MCP server + skill as a self-contained Claude Code plugin.
//
//   node scripts/build-plugin.mjs
//
// Produces (all committed, so the plugin installs from git with no build/npm step):
//   bundle/index.js                     — single-file esbuild bundle of the server (no node_modules)
//   skills/tooljet-app-builder/          — the generated skill (SKILL.md + references)
//   data/{component,datasource}-schemas.json — read at runtime as ../data relative to bundle/index.js
//
// The bundle is built from the tsc output (dist/), NOT src/, so the NodeNext `.js` import
// specifiers resolve to real files (esbuild can't map `./foo.js` → `foo.ts` on its own).
import { execSync } from 'node:child_process';
import { mkdirSync, copyFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
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

// 2. The two catalogs are read at runtime via `../data/*.json` relative to the bundle. Assert they ship.
for (const f of ['component-schemas.json', 'datasource-schemas.json']) {
  if (!existsSync(resolve(root, 'data', f))) {
    throw new Error(`build-plugin: missing data/${f} — run "npm run generate:catalogs" first.`);
  }
}

// 3. Copy the generated skill into the plugin's skills/<name>/ location.
const skillSrc = resolve(root, 'skill');
const skillDst = resolve(root, 'skills/tooljet-app-builder');
rmSync(skillDst, { recursive: true, force: true });
mkdirSync(resolve(skillDst, 'references'), { recursive: true });
copyFileSync(resolve(skillSrc, 'SKILL.md'), resolve(skillDst, 'SKILL.md'));
for (const f of readdirSync(resolve(skillSrc, 'references'))) {
  copyFileSync(resolve(skillSrc, 'references', f), resolve(skillDst, 'references', f));
}

console.log('✓ Plugin built: bundle/index.js + skills/tooljet-app-builder/ (data/ shipped from repo).');
