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
  // Exercise validation through the shipped module graph, with synthetic plans and no API writes.
  for (const [expression, valid] of [
    ['{{ [3, 5].map(value => value * 2).join(", ") }}', true],
    ['{{ 1 + }}', false],
  ]) {
    const response = await client.callTool({ name: 'lint_app_spec', arguments: {
      pages: [{ name: 'Workshop', icon: 'IconHome2', components: [{
        name: 'summary', type: 'Text', properties: { text: { value: expression } },
        layout: { left: 0, top: 0, width: 43, height: 40 },
      }] }],
    } });
    assert(!response.isError, JSON.stringify(response));
    const plan = JSON.parse(response.content[0].text);
    assert.equal(plan.ok, valid);
    assert.equal(typeof plan.plan_token === 'string', valid);
    assert.equal(response._meta.tooljet_metrics.http_requests, 0);
    if (!valid) assert(plan.errors.some((error) => error.includes('invalid JavaScript')));
  }
  // RunJS lint exercises Babel in the final split/reprinted bundle. Omitting the
  // version deliberately prevents datasource lookup while syntax is still checked.
  for (const [code, parses] of [
    ['return [4, 6].map(value => value * 2);', true],
    ['const = ;', false],
  ]) {
    const response = await client.callTool({ name: 'lint_app_spec', arguments: {
      queries: [{ name: 'transformReadings', kind: 'runjs', datasource_id: 'js-fixture', options: { code } }],
    } });
    assert(!response.isError, JSON.stringify(response));
    const plan = JSON.parse(response.content[0].text);
    assert.equal(plan.ok, false);
    assert(plan.errors.includes('version_id is required when a plan contains queries.'));
    assert.equal(plan.errors.some((error) => error.includes('JavaScript does not parse')), !parses);
    assert.equal(response._meta.tooljet_metrics.http_requests, 0);
  }
  // Changing the entry after startup must block use of an old module graph.
  const entry = join(directory, 'bundle/index.js');
  writeFileSync(entry, readFileSync(entry, 'utf8') + '\n// replacement build\n');
  const status = await client.callTool({ name: 'get_runtime_info', arguments: {} });
  assert.equal(JSON.parse(status.content[0].text).restart_required, true);
  const blocked = await client.callTool({ name: 'get_component_catalog', arguments: { type: 'Table' } });
  assert.equal(blocked.isError, true);
  assert.match(blocked.content[0].text, /MCP_RUNTIME_STALE/);
  console.log(`Standalone plugin ${version}: initialized, ${tools.length} tools, catalogs/hashes, valid/invalid app plans and stale-runtime blocking passed.`);
} finally {
  await client.close();
  rmSync(directory, { recursive: true, force: true });
}
