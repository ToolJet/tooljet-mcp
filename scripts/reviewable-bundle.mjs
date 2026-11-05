// Compile readable ESM modules, bounded by the directory's per-file inspection limit.
// No minification, compression, eval, runtime downloads, or installed dependencies.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname, basename, posix, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
import { rollup } from 'rollup';
import { parse } from '@babel/parser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const MAX_FILE_BYTES = 256 * 1024;

// Rollup checks resolved IDs too. Windows drive/UNC paths are local modules,
// just like POSIX absolute paths; only bare package/builtin imports stay external.
export const isExternalBundleImport = (id) =>
  !id.startsWith('.') && !posix.isAbsolute(id) && !win32.isAbsolute(id);

function dependencyNotices(inputs) {
  const packages = new Map();
  for (const input of [...Object.keys(inputs), 'node_modules/@babel/parser/lib/index.js']) {
    if (!input.startsWith('node_modules/')) continue;
    let directory = dirname(resolve(root, input));
    while (directory !== root && directory !== dirname(directory)) {
      const manifest = resolve(directory, 'package.json');
      if (existsSync(manifest)) {
        const metadata = JSON.parse(readFileSync(manifest, 'utf8'));
        if (metadata.name && metadata.version) {
          const name = `${metadata.name}@${metadata.version}`;
          const licenses = readdirSync(directory).filter((file) => /^(?:licen[sc]e|copying)(?:$|[.-])/i.test(file));
          if (!licenses.length && !metadata.license) throw new Error(`Missing license notice for bundled dependency ${name}`);
          // Some packages (charcodes) publish only SPDX/author metadata, not a LICENSE file.
          packages.set(name, licenses.length
            ? licenses.map((file) => readFileSync(resolve(directory, file), 'utf8')).join('\n')
            : JSON.stringify({ license: metadata.license, author: metadata.author, repository: metadata.repository }, null, 2));
          break;
        }
      }
      directory = dirname(directory);
    }
  }
  return [...packages].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, license]) => `${name}\n${license}`).join('\n\n');
}

/** Babel's npm entry is monolithic. Its source map contains the original source modules.
 * Use those exact sources, plus its pinned, compile-time-only enum, instead of packing
 * unreadable bytes or downloading code at plugin installation time. */
export function parserSourcePlugin() {
  const installed = JSON.parse(readFileSync(require.resolve('@babel/parser/package.json'), 'utf8'));
  if (installed.version !== '7.29.8') throw new Error('Review the parser source adapter before updating @babel/parser.');
  const entry = require.resolve('@babel/parser');
  const map = JSON.parse(readFileSync(`${entry}.map`, 'utf8'));
  const sources = new Map(map.sources.map((name, i) => [posix.normalize(`parser/lib/${name}`), map.sourcesContent[i]]));
  sources.set('parser/src/util/scopeflags.ts', readFileSync(resolve(root, 'scripts/vendor/babel-parser-scopeflags.ts'), 'utf8'));
  sources.set('babel-helper-validator-identifier/src/index.ts', 'export * from "./identifier.ts"; export * from "./keyword.ts";');

  // State uses Babel's internal @bit build macro. Reuse the already-expanded class
  // from the same published package, retaining the source module's enum and imports.
  const published = readFileSync(entry, 'utf8');
  const state = parse(published).program.body.find((node) => node.type === 'ClassDeclaration' && node.id.name === 'State');
  const stateSource = sources.get('parser/src/tokenizer/state.ts');
  if (!state || !stateSource?.includes('export default class State {')) throw new Error('Parser State layout changed.');
  sources.set('parser/src/tokenizer/state.ts',
    'import { types } from "./context.ts";\n' +
    stateSource.slice(0, stateSource.indexOf('export default class State {')) +
    'export default ' + published.slice(state.start, state.end));

  return {
    name: 'reviewable-parser-source',
    setup(builder) {
      builder.onResolve({ filter: /^@babel\/parser$/ }, () => ({ path: 'parser/src/index.ts', namespace: 'parser-source' }));
      builder.onResolve({ filter: /.*/, namespace: 'parser-source' }, (args) => {
        if (args.path === '@babel/helper-string-parser') return { path: 'babel-helper-string-parser/src/index.ts', namespace: 'parser-source' };
        if (args.path === '@babel/helper-validator-identifier') return { path: 'babel-helper-validator-identifier/src/index.ts', namespace: 'parser-source' };
        if (args.path.startsWith('.')) return { path: posix.normalize(posix.join(posix.dirname(args.importer), args.path)), namespace: 'parser-source' };
        // Keep symlinked dependency paths portable, and use charcodes' published ESM
        // entry so the parser's hot loops read constants without CommonJS getters.
        return builder.resolve(args.path === 'charcodes' ? 'charcodes/lib/index.mjs' : args.path, {
          kind: args.kind, resolveDir: root,
        });
      });
      builder.onLoad({ filter: /.*/, namespace: 'parser-source' }, async (args) => {
        if (!sources.has(args.path)) throw new Error(`Missing published parser source: ${args.path}`);
        // Match Babel's published production build without changing NODE_ENV checks
        // in the MCP server or any other dependency.
        const compiled = await transform(sources.get(args.path), {
          loader: 'ts', target: 'node20', define: { 'process.env.NODE_ENV': '"production"' },
        });
        return { contents: compiled.code, loader: 'js', resolveDir: root };
      });
      builder.onResolve({ filter: /^split:/ }, (args) => {
        const name = args.path.slice(6);
        return name.startsWith('parser-source:')
          ? { path: name.slice('parser-source:'.length), namespace: 'parser-source' }
          : { path: resolve(root, name) };
      });
    },
  };
}

/** Discover module boundaries from esbuild's dependency graph; never cut JavaScript text. */
export async function reviewableBundle(entry = './dist/index.js') {
  const entryPoints = { index: entry };
  let result;
  const plugin = parserSourcePlugin();
  for (let iteration = 0; iteration < 128; iteration++) {
    result = await build({
      absWorkingDir: root, entryPoints, bundle: true, platform: 'node', target: 'node20',
      format: 'esm', outdir: 'bundle', chunkNames: 'chunk-[hash]', splitting: true,
      write: false, metafile: true, preserveSymlinks: true, external: ['playwright-core'],
      legalComments: 'none', plugins: [plugin],
      define: { 'process.env.BABEL_8_BREAKING': 'false', 'process.env.IS_PUBLISH': 'true' },
      banner: { js: 'import { createRequire as __bundleRequire } from "node:module"; const require = __bundleRequire(import.meta.url);' },
    });
    const oversized = Object.entries(result.metafile.outputs)
      .filter(([, output]) => output.bytes >= 250 * 1024).sort((a, b) => b[1].bytes - a[1].bytes);
    if (!oversized.length) break;
    const candidate = Object.entries(oversized[0][1].inputs)
      .sort((a, b) => b[1].bytesInOutput - a[1].bytesInOutput)
      .find(([name]) => !Object.values(entryPoints).includes(`split:${name}`));
    if (!candidate || iteration === 127) throw new Error(`Cannot split ${oversized[0][0]} into reviewable modules.`);
    entryPoints[`part-${iteration}`] = `split:${candidate[0]}`;
  }

  // Auxiliary entry points force real ESM boundaries. Drop their unused export facades
  // and coalesce small modules so the plugin also stays below the 512-file limit.
  const files = new Map(result.outputFiles.map((file) => [file.path, file.text]));
  const groups = new Map();
  const bins = [];
  // Merge contiguous ranges in dependency order. Size-only bin packing creates
  // circular imports and can evaluate subclasses before their base classes.
  const ordered = [];
  const visited = new Set();
  const active = new Set();
  function visit(name) {
    if (active.has(name)) throw new Error(`Circular split-module graph: ${name}`);
    if (visited.has(name)) return;
    active.add(name);
    const output = result.metafile.outputs[name];
    for (const dependency of output.imports) if (!dependency.external) visit(dependency.path);
    active.delete(name);
    visited.add(name);
    if (!output.entryPoint) ordered.push([name, output]);
  }
  visit('bundle/index.js');
  for (const [name, output] of ordered) {
    let bin = bins.at(-1);
    if (bin && bin.bytes + output.bytes >= 230 * 1024) bin = null;
    if (!bin) { bin = { name: `module-${bins.length}`, bytes: 0 }; bins.push(bin); }
    bin.bytes += output.bytes;
    groups.set(resolve(root, name), bin.name);
  }
  const bundle = await rollup({
    input: resolve(root, 'bundle/index.js'),
    external: isExternalBundleImport,
    plugins: [{ name: 'in-memory-chunks', resolveId: (id, importer) =>
      id.startsWith('.') && importer ? resolve(dirname(importer), id) : files.has(id) ? id : null,
      load: (id) => files.get(id) ?? null }],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'CYCLIC_CROSS_CHUNK_REEXPORT') throw new Error(warning.message);
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return; // writer-only imports are removed from the runtime catalog reader
      warn(warning);
    },
  });
  try {
    const { output } = await bundle.generate({
      format: 'esm', manualChunks: (id) => groups.get(id), onlyExplicitManualChunks: true,
      entryFileNames: 'index.js', chunkFileNames: 'chunk-[hash].js',
    });
    for (const file of output) {
      // Reprint through a JS parser: trimming text would corrupt whitespace inside
      // template literals. This removes Rollup's leftover whitespace without minifying.
      if (file.type === 'chunk') file.code = (await transform(file.code, {
        format: 'esm', target: 'node20', legalComments: 'none',
      })).code;
      if (file.type !== 'chunk' || Buffer.byteLength(file.code) >= MAX_FILE_BYTES) {
        throw new Error(`Output exceeds the inspection limit: ${file.fileName}`);
      }
      if (/(?:\/(?:Users|home)\/[^/\s"']+\/|\/(?:private\/)?(?:tmp|var\/folders)\/|[A-Za-z]:[\\/]+Users[\\/])/i.test(file.code)) {
        throw new Error(`Machine-specific path in ${file.fileName}`);
      }
    }
    const notices = dependencyNotices(result.metafile.inputs);
    if (Buffer.byteLength(notices) >= MAX_FILE_BYTES) throw new Error('Split third-party license notices.');
    return [...output.map((file) => ({ name: basename(file.fileName), code: file.code })),
      { name: 'THIRD_PARTY_NOTICES.txt', code: notices }];
  } finally { await bundle.close(); }
}
