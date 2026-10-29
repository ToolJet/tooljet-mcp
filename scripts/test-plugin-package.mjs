// Exercise the actual release artifact outside the repo, with no node_modules or credentials.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readCatalogBytes } from '../lib/catalogFiles.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(join(tmpdir(), 'tooljet-plugin-smoke-'));
const client = new Client({ name: 'packaging-smoke', version: '1' });
try {
  cpSync(resolve(root, 'bundle'), join(directory, 'bundle'), { recursive: true });
  cpSync(resolve(root, 'data'), join(directory, 'data'), { recursive: true });
  writeFileSync(join(directory, 'package.json'), '{"type":"module"}\n');
  const transport = new StdioClientTransport({
    command: process.execPath, args: [join(directory, 'bundle/index.js')], cwd: directory,
    env: {
      PATH: process.env.PATH ?? '', MCP_TRANSPORT: 'stdio',
      // Synthetic identity only: catalog tools never contact a ToolJet instance.
      TOOLJET_PAT: 'tj_pat_packaging_fixture', TOOLJET_URL: 'http://127.0.0.1:1',
    },
    stderr: 'pipe',
  });
  let stderr = '';
  await client.connect(transport);
  transport.stderr?.on('data', (chunk) => { stderr += chunk; });
  const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
  assert.equal(client.getServerVersion().version, version);
  const { tools } = await client.listTools();
  assert(tools.some((tool) => tool.name === 'lint_app_spec'));
  for (const [name, args] of [
    ['get_runtime_info', {}],
    ['get_component_catalog', { type: 'Table', detail: 'full' }],
    ['get_datasource_query_schema', { kind: 'postgresql', operation: 'sql' }],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert(!result.isError, `${name}: ${JSON.stringify(result)}\n${stderr}`);
  }
  const resources = {
    components: 'component-schemas.json', 'component-compatibility': 'component-compatibility.json',
    datasources: 'datasource-schemas.json', 'page-icons': 'page-icons.json',
  };
  for (const [name, file] of Object.entries(resources)) {
    const response = await client.readResource({ uri: `tooljet://catalog/${name}` });
    const payload = JSON.parse(response.contents[0].text);
    const bytes = readCatalogBytes(resolve(root, 'data', file));
    assert.deepEqual(payload.data, JSON.parse(bytes.toString('utf8')));
    assert.equal(payload.data_version, createHash('sha256').update(bytes).digest('hex').slice(0, 12));
  }
  // Changing the entry after startup must block use of an old module graph.
  const entry = join(directory, 'bundle/index.js');
  writeFileSync(entry, readFileSync(entry, 'utf8') + '\n// replacement build\n');
  const status = await client.callTool({ name: 'get_runtime_info', arguments: {} });
  assert.equal(JSON.parse(status.content[0].text).restart_required, true);
  console.log(`Standalone plugin ${version}: initialized, ${tools.length} tools, catalogs/hashes and stale-runtime detection passed.`);
} finally {
  await client.close();
  rmSync(directory, { recursive: true, force: true });
}
