// Batch e2e: builds an app using add_queries + add_components (multiple components in ONE call).
// node scripts/e2e-batch.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const parse = (r) => JSON.parse(r.content[0].text);

const client = new Client({ name: 'e2e-batch', version: '0.0.0' });
await client.connect(new StdioClientTransport({ command: 'node', args: [resolve(root, 'dist/index.js')], env }));
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(`${name}: ${r.content[0].text}`);
  return parse(r);
};

const app = await call('create_app', { name: `Batch Demo ${Date.now()}` });
const tables = await call('list_tables', {});
const tickets = tables.find((t) => t.table_name === 'tickets');

// ONE call → all queries
const [q] = await call('add_queries', {
  version_id: app.version_id,
  queries: [
    { datasource_id: (await call('list_datasources', { version_id: app.version_id })).find((d) => d.kind === 'tooljetdb').id,
      name: 'list_tickets',
      options: { operation: 'list_rows', table_id: tickets.id, list_rows: {}, runOnPageLoad: true } },
  ],
});

// ONE call → title + table together
const comps = await call('add_components', {
  app_id: app.app_id,
  version_id: app.version_id,
  page_id: app.home_page_id,
  components: [
    { name: 'title', type: 'Text',
      properties: { text: { value: 'Tickets' }, textFormat: { value: 'html' } },
      layout: { top: 10, left: 2, width: 40, height: 40 } },
    { name: 'ticketsTable', type: 'Table',
      properties: { data: { value: `{{queries.${q.name}.data}}` }, dataSourceSelector: { value: 'rawJson' }, autogenerateColumns: { value: true, generateNestedColumns: true } },
      layout: { top: 70, left: 2, width: 40, height: 360 } },
  ],
});

console.log(JSON.stringify({ app_url: app.app_url, query: q.query_id, components: comps.map((c) => c.name) }));
await client.close();
