// End-to-end driver: connects to the built tooljet-mcp server over stdio (as an MCP
// client, exactly like Codex would) and runs the slice-1 recipe against live ToolJet.
// Usage: node scripts/e2e-drive.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// load .env into a plain object
const env = { ...process.env };
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const parse = (res) => JSON.parse(res.content[0].text);

const transport = new StdioClientTransport({
  command: 'node',
  args: [resolve(root, 'dist/index.js')],
  env,
});
const client = new Client({ name: 'e2e-driver', version: '0.0.0' });
await client.connect(transport);

const tools = await client.listTools();
console.error('tools:', tools.tools.map((t) => t.name).join(', '));

const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  if (res.isError) throw new Error(`${name} failed: ${res.content[0].text}`);
  return parse(res);
};

const app = await call('create_app', { name: `Tickets Dashboard (e2e ${Date.now()})` });
console.error('create_app →', app);

const datasources = await call('list_datasources', { version_id: app.version_id });
const tjdb = datasources.find((d) => d.kind === 'tooljetdb');
console.error('tjdb datasource →', tjdb.id);

const tables = await call('list_tables', {});
const tickets = tables.find((t) => t.table_name === 'tickets');
console.error('tickets table →', tickets.id);

const query = await call('add_query', {
  version_id: app.version_id,
  datasource_id: tjdb.id,
  name: 'list_tickets',
  options: { operation: 'list_rows', table_id: tickets.id, list_rows: {}, runOnPageLoad: true },
});
console.error('add_query →', query);

const component = await call('add_component', {
  app_id: app.app_id,
  version_id: app.version_id,
  page_id: app.home_page_id,
  name: 'ticketsTable',
  type: 'Table',
  properties: {
    data: { value: '{{queries.list_tickets.data}}' },
    dataSourceSelector: { value: 'rawJson' }, // REQUIRED with data or the table renders nothing
    autogenerateColumns: { value: true, generateNestedColumns: true },
  },
  layout: { top: 10, left: 2, width: 40, height: 400 },
});
console.error('add_component →', component);

console.log(JSON.stringify({ app_id: app.app_id, app_url: app.app_url, query_id: query.query_id, component_id: component.component_id }));

await client.close();
