// The standalone install folder shares the checked-in runtime and host configuration.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { MAX_FILE_BYTES } from './reviewable-bundle.mjs';

export const PLUGIN_PACKAGE = 'plugins/tooljet-standalone';
const ENTRIES = [
  'bundle', 'data', 'lib', 'skills/tooljet-app-builder',
  '.claude-plugin/plugin.json', '.codex-plugin/plugin.json',
  '.mcp.json', 'mcp.json', 'plugin.json', 'README.md', 'LICENSE', 'PRIVACY.md',
];

export function packageFiles(directory) {
  const files = [];
  function walk(path) {
    const stat = lstatSync(path);
    if (stat.isDirectory()) for (const name of readdirSync(path).sort()) walk(resolve(path, name));
    else files.push(relative(directory, path));
  }
  walk(directory);
  return files;
}

export function checkFiles(directory, files, maxFiles, { followSymlinks = false } = {}) {
  const failures = [];
  if (maxFiles !== undefined && files.length > maxFiles) {
    failures.push(`${files.length} files exceeds the ${maxFiles}-file inspection limit`);
  }
  for (const file of files) {
    const path = resolve(directory, file);
    const stat = followSymlinks ? statSync(path) : lstatSync(path);
    if (!stat.isFile()) { failures.push(`${file}: expected a regular file`); continue; }
    const asset = /\.(?:png|jpe?g|gif|webp|woff2?|ttf|otf)$/i.test(file);
    if (!asset && stat.size >= MAX_FILE_BYTES) failures.push(`${file}: ${stat.size} bytes exceeds the inspection limit`);
    if (/\.(?:zip|gz|wasm|node|pyc|exe|dll|dylib|so|bin)$/i.test(file) || (!asset && readFileSync(path).includes(0))) {
      failures.push(`${file}: binary/packed artifact must not be in the published plugin`);
    }
  }
  if (failures.length) throw new Error(`Plugin packaging checks failed:\n${failures.join('\n')}`);
  return files.length;
}

export function packagePlugin(root) {
  const output = resolve(root, PLUGIN_PACKAGE);
  for (const entry of ENTRIES) {
    if (!existsSync(resolve(root, entry))) throw new Error(`Missing plugin input: ${entry}`);
  }
  const { name, version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  const offlineCatalog = resolve(root, 'skills/tooljet-app-builder/references/catalog');
  for (const entry of ENTRIES) {
    const destination = resolve(output, entry);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(resolve(root, entry), destination, {
      recursive: true, dereference: false,
      // Matches Git installs and the other host packages: MCP serves these contracts.
      filter: path => path !== offlineCatalog,
    });
  }
  // Preserve ESM loading without installing the source repository's development dependencies.
  writeFileSync(resolve(output, 'package.json'), JSON.stringify({ name, version, type: 'module', private: true }, null, 2) + '\n');
  const count = checkFiles(output, packageFiles(output), 512);
  console.log(`Standalone plugin: ${count} files, each below 256 KiB; no packed artifacts.`);
  return output;
}
