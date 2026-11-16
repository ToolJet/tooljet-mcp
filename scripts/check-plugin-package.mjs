// Check repository file safety and the actual standalone plugin's inspection budget.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkClaudePackage } from './check-claude-package.mjs';
import { checkFiles, packageFiles, PLUGIN_PACKAGE } from './plugin-package.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root, encoding: 'utf8',
}).split('\0').filter((file) => file && existsSync(resolve(root, file))))];
// Preserve source-checkout symlinks such as CLAUDE.md -> AGENTS.md.
checkFiles(root, files, undefined, { followSymlinks: true });
console.log(`Repository: ${files.length} readable files, each below 256 KiB; no packed artifacts.`);
const output = resolve(root, PLUGIN_PACKAGE);
if (!existsSync(output)) throw new Error('Missing standalone plugin; run npm run build:plugin first.');
const count = checkFiles(output, packageFiles(output), 512);
console.log(`Standalone plugin: ${count} files within the 512-file inspection limit.`);
console.log('Claude install folder:', checkClaudePackage(resolve(root, 'plugins/tooljet-claude')));
