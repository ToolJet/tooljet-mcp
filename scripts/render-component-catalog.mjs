// Run after npm run build. Local projection of the same contracts served by the MCP:
// no listening server, credentials, network requests, or Python MCP package required.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getComponentCatalogTool } from '../dist/tools/getComponentCatalog.js';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tool = getComponentCatalogTool(undefined); // this tool never uses a ToolJet client
const sections = ['overview', 'properties', 'styles', 'events', 'actions', 'exposedVariables',
  'defaultChildren', 'renderingHints', 'authoringHints'];
async function contract(args) {
  const result = await tool.handler(args);
  if (result.isError) throw new Error('Offline catalog generation failed');
  return JSON.parse(result.content.filter((c) => c.type === 'text').map((c) => c.text).join(''));
}
const index = await contract({});
const files = new Map([['_index.json', index]]);
for (const { type } of index) {
  if (!/^[A-Za-z0-9_-]+$/.test(type)) throw new Error('Unsafe catalog type');
  files.set(type + '.json', await contract({ types: [type], sections, detail: 'full' }));
}
for (const host of ['skill', 'skills/tooljet-app-builder']) {
  const out = resolve(root, host, 'references/catalog');
  mkdirSync(out, { recursive: true });
  for (const [name, value] of files) writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + '\n');
}
console.log('Generated ' + files.size + ' offline catalog files per skill package, including rendering hints and default children.');
