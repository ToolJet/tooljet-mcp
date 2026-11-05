import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkClaudePackage(directory) {
  const root = resolve(directory);
  const files = [];
  function walk(path) {
    const stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), 'Plugin must not contain symlinks');
    if (stat.isDirectory()) for (const name of readdirSync(path)) walk(resolve(path, name));
    else {
      assert(stat.isFile(), 'Plugin must contain regular files');
      files.push(relative(root, path).split(sep).join('/'));
    }
  }
  walk(root);
  assert(files.length <= 512, `Plugin has ${files.length} files; limit is 512`);
  const names = new Set();
  let largest = 0;
  for (const file of files) {
    assert(!names.has(file.toLowerCase()), `Case-insensitive file collision: ${file}`);
    names.add(file.toLowerCase());
    assert(/^(?:\.claude-plugin\/plugin\.json|README\.md|LICENSE|assets\/tooljet-icon\.png|skills\/tooljet-app-builder\/(?:SKILL\.md|references\/[\w-]+\.md|scripts\/browser-audit\.js))$/.test(file), `Unexpected package file: ${file}`);
    assert(!/(?:^|\/)(?:node_modules|package(?:-lock)?\.json|CLAUDE(?:\.local)?\.md|AGENTS\.md|\.env[^/]*|\.DS_Store|__MACOSX|\.git|\.npmrc)(?:\/|$)/i.test(file), `Development or credential file in package: ${file}`);
    assert(!/\.(?:zip|gz|wasm|node|pyc|exe|dll|dylib|so|bin|map)$/i.test(file), `Packed/binary artifact: ${file}`);
    assert(!/(?:^|\/)(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|\/|$)|[:]|[. ](?:\/|$)/i.test(file), `Nonportable filename: ${file}`);
    const bytes = readFileSync(resolve(root, file));
    if (file.endsWith('.png')) {
      assert(bytes.length < 2 * 1024 * 1024, 'Icon must be under 2 MiB');
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(bytes.readUInt32BE(16), 512);
      assert.equal(bytes.readUInt32BE(20), 512);
      continue;
    }
    largest = Math.max(largest, bytes.length);
    assert(bytes.length < 256 * 1024, `Oversized file: ${file}`);
    assert(!bytes.includes(0), `Non-text file: ${file}`);
    const text = bytes.toString('utf8');
    assert(!/(?:\/(?:Users|home)\/[^/\s"']+\/|\/(?:private\/)?(?:tmp|var\/folders)\/|[A-Za-z]:[\\/]+Users[\\/])/i.test(text), `Machine-specific path: ${file}`);
  }
  const manifest = JSON.parse(readFileSync(resolve(root, '.claude-plugin/plugin.json'), 'utf8'));
  for (const path of [manifest.icon, './README.md', './LICENSE', './skills/tooljet-app-builder/SKILL.md']) {
    assert(typeof path === 'string' && path.startsWith('./') && !path.includes('..') && existsSync(resolve(root, path)), `Missing/invalid package path: ${path}`);
  }
  assert.deepEqual(manifest.mcpServers, {
    tooljet: { type: 'http', url: 'https://mcp-oauth.tooljet.com/mcp' },
  }, 'Claude must use the hosted OAuth connection without local commands or credentials');
  const metadataKeys = new Set(['name', 'version', 'icon', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'mcpServers', 'privacyPolicyUrl']);
  for (const key of Object.keys(manifest)) assert(metadataKeys.has(key), `Unexpected manifest key: ${key}`);
  assert.equal(manifest.name, 'tooljet-app-builder');
  assert.equal(manifest.privacyPolicyUrl, 'https://tooljet.com/privacy');
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version), 'Invalid package version');
  const skillRoot = resolve(root, 'skills/tooljet-app-builder');
  const skill = readFileSync(resolve(skillRoot, 'SKILL.md'), 'utf8');
  for (const [reference] of skill.matchAll(/(?:references|scripts)\/[\w/-]+\.(?:md|js|json)/g)) {
    assert(existsSync(resolve(skillRoot, reference)), `Missing skill reference: ${reference}`);
  }
  return { version: manifest.version, files: files.length, largestTextBytes: largest, transport: 'http' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(checkClaudePackage(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../plugins/tooljet-claude')));
}
