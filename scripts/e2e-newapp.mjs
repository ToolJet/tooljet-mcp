// e2e: build an app on a NEW table — create_tables → insert_rows_batch → get_table_schema → query → UI.
// node scripts/e2e-newapp.mjs
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
const client = new Client({ name: 'e2e-newapp', version: '0.0.0' });
await client.connect(new StdioClientTransport({ command: 'node', args: [resolve(root, 'dist/index.js')], env }));
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(`${name}: ${r.content[0].text}`);
  return parse(r);
};

const stamp = Date.now();
const tableName = `projects_${stamp}`;

const app = await call('create_app', { name: `Projects ${stamp}` });

// NEW data model
const created = await call('create_tables', {
  tables: [{
    table_name: tableName,
    columns: [
      { name: 'title', type: 'string', notNull: true },
      { name: 'owner', type: 'string' },
      { name: 'status', type: 'string' },
      { name: 'budget', type: 'number' },
    ],
  }],
});
const table = created.tables[0];
console.error('create_tables →', table);

// seed sample rows (no id — auto-filled)
const seeded = await call('insert_rows_batch', {
  tables: [{
    table_name: tableName,
    rows: [
      { title: 'Website revamp', owner: 'Alice', status: 'Active', budget: 12000 },
      { title: 'Mobile app', owner: 'Bob', status: 'Planning', budget: 30000 },
      { title: 'Data migration', owner: 'Carol', status: 'Active', budget: 8000 },
      { title: 'Security audit', owner: 'Dan', status: 'Done', budget: 15000 },
    ],
  }],
});
console.error('insert_rows_batch →', seeded);

const schema = await call('get_table_schema', { table_name: tableName });
console.error('get_table_schema →', schema.map((c) => `${c.name}:${c.type}`).join(', '));

const tjdb = (await call('list_datasources', { version_id: app.version_id })).find((d) => d.kind === 'tooljetdb');
const [q] = await call('add_queries', {
  version_id: app.version_id,
  queries: [{ datasource_id: tjdb.id, name: 'list_projects', options: { operation: 'list_rows', table_id: table.table_id, list_rows: {}, runOnPageLoad: true } }],
});

await call('add_components', {
  app_id: app.app_id, version_id: app.version_id, page_id: app.home_page_id,
  components: [
    { name: 'title', type: 'Text', properties: { text: { value: 'Projects' }, textFormat: { value: 'html' } }, layout: { top: 10, left: 2, width: 40, height: 40 } },
    { name: 'projectsTable', type: 'Table', properties: { data: { value: `{{queries.${q.name}.data}}` }, dataSourceSelector: { value: 'rawJson' }, autogenerateColumns: { value: true, generateNestedColumns: true } }, layout: { top: 70, left: 2, width: 40, height: 340 } },
  ],
});

console.log(JSON.stringify({ app_url: app.app_url, table: tableName, table_id: table.table_id, seeded: seeded.processed_rows }));
await client.close();
