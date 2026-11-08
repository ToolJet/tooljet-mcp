import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';
import { parse } from '@babel/parser';

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
    if (file.endsWith('.mjs')) {
      const imports = [];
      function visit(node) {
        if (!node || typeof node !== 'object') return;
        if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) imports.push(node.source.value);
        if (node.type === 'CallExpression' && (node.callee.type === 'Import' || node.callee.name === 'require') && node.arguments[0]?.type === 'StringLiteral') imports.push(node.arguments[0].value);
        for (const value of Object.values(node)) {
          if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') visit(value);
        }
      }
      visit(parse(text, { sourceType: 'module' }).program);
      for (const specifier of imports) {
        if (specifier.startsWith('.')) {
          const target = resolve(root, dirname(file), specifier);
          assert(target.startsWith(root + sep) && existsSync(target), `Missing or escaping module in ${file}: ${specifier}`);
        } else {
          // The optional browser renderer is intentionally absent in this dependency-free package.
          assert(builtinModules.includes(specifier.replace(/^node:/, '')) || specifier === 'playwright-core', `Unbundled dependency: ${specifier}`);
        }
      }
    }
  }
  for (const file of ['.mcp.json', 'mcp.json', 'plugin.json']) assert(!existsSync(resolve(root, file)), `Unexpected alternate manifest: ${file}`);
  const manifest = JSON.parse(readFileSync(resolve(root, '.claude-plugin/plugin.json'), 'utf8'));
  for (const path of [manifest.icon, './README.md', './LICENSE', './skills/tooljet-app-builder/SKILL.md']) {
    assert(typeof path === 'string' && path.startsWith('./') && !path.includes('..') && existsSync(resolve(root, path)), `Missing/invalid package path: ${path}`);
  }
  assert.deepEqual(Object.keys(manifest.mcpServers), ['tooljet']);
  const server = manifest.mcpServers.tooljet;
  assert.deepEqual(server, {
    command: 'node',
    args: ['${CLAUDE_PLUGIN_ROOT}/bundle/index.mjs'],
    env: {
      TOOLJET_CLAUDE_API_URL: '${user_config.api_url}',
      TOOLJET_CLAUDE_DEPLOYMENT_URL: '${user_config.deployment_url}',
      TOOLJET_CLAUDE_PAT: '${user_config.personal_access_token}',
    },
  }, 'The Claude package must remain local stdio MCP with explicit user configuration');
  for (const reference of Object.values(server.env)) {
    const key = reference.match(/^\$\{user_config\.([a-z_]+)\}$/)?.[1];
    assert(key && manifest.userConfig[key], 'Every setting must come from declared Claude userConfig');
  }
  assert.deepEqual(Object.keys(manifest.userConfig).sort(), ['api_url', 'deployment_url', 'personal_access_token']);
  assert(manifest.userConfig.deployment_url.required);
  assert(manifest.userConfig.personal_access_token.required && manifest.userConfig.personal_access_token.sensitive);
  for (const key of ['hooks', 'dependencies', 'settings', 'user_config']) assert(!manifest[key], `Unexpected manifest key: ${key}`);
  const skillRoot = resolve(root, 'skills/tooljet-app-builder');
  const skill = readFileSync(resolve(skillRoot, 'SKILL.md'), 'utf8');
  for (const [reference] of skill.matchAll(/(?:references|scripts)\/[\w/-]+\.(?:md|js|json)/g)) {
    assert(existsSync(resolve(skillRoot, reference)), `Missing skill reference: ${reference}`);
  }
  return { version: manifest.version, files: files.length, largestTextBytes: largest };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(checkClaudePackage(process.argv[2] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../plugins/tooljet-claude')));
}
