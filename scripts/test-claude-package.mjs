// Exercise an actual ZIP extracted outside the repo, without node_modules or a package.json.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { checkClaudePackage } from './check-claude-package.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? join(root, 'plugins/tooljet-claude'));
const temp = mkdtempSync(join(tmpdir(), 'tooljet-claude-test-'));
const extracted = join(temp, 'installed plugin');
const clients = [];
const requests = [];
const pat = 'tj_pat_synthetic_studio';
const session = 'synthetic-studio-session';
const workspace = 'studio-workspace';
const backend = createServer((req, res) => {
  requests.push({ path: req.url, authorization: req.headers.authorization, cookie: req.headers.cookie, workspace: req.headers['tj-workspace-id'] });
  res.setHeader('content-type', 'application/json');
  if (req.url === '/api/personal-access-tokens/session' && req.headers.authorization === `Bearer ${pat}`) {
    res.end(JSON.stringify({ authToken: session, organizationId: workspace, organizationSlug: 'studio' }));
  } else if (req.url === `/api/tooljet-db/organizations/${workspace}/tables` && req.headers.cookie === `tj_auth_token=${session}`) {
    res.end(JSON.stringify({ result: [{ id: 'table-fixture', table_name: 'studio_inventory' }] }));
  } else res.writeHead(403).end(JSON.stringify({ error: 'Unexpected request in synthetic fixture' }));
});
await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
const apiUrl = `http://127.0.0.1:${backend.address().port}`;

async function connect(entry, env, cwd) {
  const client = new Client({ name: 'claude-package-check', version: '1' });
  clients.push(client);
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry], cwd, env: { PATH: process.env.PATH ?? '', ...env }, stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', bytes => { stderr += bytes; });
  try { await client.connect(transport); }
  catch (error) { throw new Error(`MCP initialization failed (${entry.endsWith('.mjs') ? 'Claude' : 'baseline'}): ${stderr}`, { cause: error }); }
  return { client, stderr: () => stderr };
}

try {
  checkClaudePackage(source);
  const zip = join(temp, 'plugin.zip');
  execFileSync('zip', ['-q', '-r', zip, '.'], { cwd: source });
  mkdirSync(extracted);
  execFileSync('unzip', ['-q', zip, '-d', extracted]);
  const report = checkClaudePackage(extracted);
  const manifest = JSON.parse(readFileSync(join(extracted, '.claude-plugin/plugin.json'), 'utf8'));
  assert.deepEqual(manifest, JSON.parse(readFileSync(join(root, 'integrations/claude/plugin.json'), 'utf8')), 'Generated manifest must match its maintained source');
  const manifestPath = join(extracted, '.claude-plugin/plugin.json');
  writeFileSync(manifestPath, JSON.stringify({ ...manifest, mcpServers: { tooljet: { type: 'http', url: 'https://service.example.test/mcp' } } }));
  assert.throws(() => checkClaudePackage(extracted), /must remain local stdio MCP/);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const options = { deployment_url: 'https://studio.example.test', api_url: apiUrl, personal_access_token: pat };
  const env = Object.fromEntries(Object.entries(manifest.mcpServers.tooljet.env).map(([key, value]) => [key, value.replace(/\$\{user_config\.([a-z_]+)\}/g, (_, name) => options[name] ?? '')]));
  const entry = manifest.mcpServers.tooljet.args[0].replace('${CLAUDE_PLUGIN_ROOT}', extracted);
  const ambient = { TOOLJET_PAT: 'tj_pat_wrong_synthetic', TOOLJET_SESSION_TOKEN: 'wrong-session', TOOLJET_WORKSPACE_ID: 'wrong-workspace', TOOLJET_URL: 'http://127.0.0.1:1', MCP_TRANSPORT: 'http' };
  const { client, stderr } = await connect(entry, { ...ambient, ...env }, extracted);
  const baseline = await connect(join(root, 'bundle/index.js'), { MCP_TRANSPORT: 'stdio', TOOLJET_PAT: pat, TOOLJET_URL: apiUrl }, root);
  const tools = (await client.listTools()).tools;
  assert.deepEqual(tools, (await baseline.client.listTools()).tools, 'Claude and standard MCP tool schemas must match');
  assert(tools.length > 50 && tools.some(tool => tool.name === 'list_tables'), `Incomplete discovery: ${stderr()}`);
  for (const [name, args] of [
    ['get_component_catalog', { type: 'Table', detail: 'full' }],
    ['get_datasource_query_schema', { kind: 'postgresql', operation: 'sql' }],
    ['lint_app_spec', { pages: [{ name: 'Studio', icon: 'IconHome2', components: [{ name: 'status', type: 'Text', properties: { text: { value: '{{ [7, 9].join(", ") }}' } }, layout: { left: 0, top: 0, width: 43, height: 40 } }] }] }],
  ]) {
    const response = await client.callTool({ name, arguments: args });
    assert(!response.isError, JSON.stringify(response));
  }
  const resources = (await client.listResources()).resources;
  assert(resources.length >= 4);
  for (const resource of resources) {
    assert.deepEqual(await client.readResource({ uri: resource.uri }), await baseline.client.readResource({ uri: resource.uri }));
  }
  assert.equal(requests.length, 0, 'Discovery, catalogs and lint must not send credentials');
  const tables = await client.callTool({ name: 'list_tables', arguments: {} });
  assert(!tables.isError, JSON.stringify(tables));
  assert.equal(JSON.parse(tables.content[0].text).tables[0].table_name, 'studio_inventory');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].authorization, `Bearer ${pat}`);
  assert.equal(requests[1].cookie, `tj_auth_token=${session}`);
  assert.equal(requests[1].workspace, workspace);
  const missing = await connect(entry, { ...ambient, ...env, TOOLJET_CLAUDE_PAT: '' }, extracted);
  assert.deepEqual((await missing.client.listTools()).tools.map(tool => tool.name), ['tooljet_status']);
  const status = await missing.client.callTool({ name: 'tooljet_status', arguments: {} });
  assert(status.isError && status.content[0].text.includes('configuration dialog'));
  assert.equal(requests.length, 2, 'Unconfigured plugin must not use ambient identity');
  assert(!JSON.stringify(status).includes(pat));
  writeFileSync(entry, readFileSync(entry, 'utf8') + '\n// synthetic replacement build\n');
  const stale = await client.callTool({ name: 'get_runtime_info', arguments: {} });
  assert.equal(JSON.parse(stale.content[0].text).restart_required, true);
  const blocked = await client.callTool({ name: 'list_tables', arguments: {} });
  assert(blocked.isError && blocked.content[0].text.includes('MCP_RUNTIME_STALE'));
  assert.equal(requests.length, 2);
  console.log({ ...report, tools: tools.length, resources: resources.length, archiveRoundtrip: true, explicitIdentity: true, ambientIdentityRejected: true, staleRuntimeBlocked: true });
} finally {
  await Promise.all(clients.map(client => client.close()));
  await new Promise(resolve => backend.close(resolve));
  rmSync(temp, { recursive: true, force: true });
}
