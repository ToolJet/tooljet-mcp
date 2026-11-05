// Inspect the files a Git checkout publishes, including newly generated files in CI.
import { execFileSync } from 'node:child_process';
import { statSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_FILE_BYTES } from './reviewable-bundle.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8',
}).split('\0').filter((file) => file && existsSync(resolve(root, file))))];
const failures = [];
if (files.length > 512) failures.push(`${files.length} files exceeds the 512-file inspection limit`);
for (const file of files) {
  const path = resolve(root, file);
  const stat = statSync(path);
  if (!stat.isFile()) { failures.push(`${file}: expected a regular file`); continue; }
  const asset = /\.(?:png|jpe?g|gif|webp|woff2?|ttf|otf)$/i.test(file);
  if (!asset && stat.size >= MAX_FILE_BYTES) failures.push(`${file}: ${stat.size} bytes exceeds the inspection limit`);
  if (/\.(?:zip|gz|wasm|node|pyc|exe|dll|dylib|so|bin)$/i.test(file) || (!asset && readFileSync(path).includes(0))) {
    failures.push(`${file}: binary/packed artifact must not be in the published plugin`);
  }
}
if (failures.length) throw new Error(`Plugin packaging checks failed:\n${failures.join('\n')}`);
console.log(`Plugin packaging: ${files.length} readable files, each below 256 KiB; no packed artifacts.`);
