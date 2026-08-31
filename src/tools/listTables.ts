import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listTablesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_tables',
    title: 'List ToolJet DB Tables',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      "List the ToolJet-DB tables in the workspace as [{ id, table_name }]. A ToolJet-DB (tooljetdb) query's options require the table's `id` as `table_id` (NOT the table name) — call this to resolve a table name to its id before add_query.",
    inputSchema: {},
    async handler() {
      try {
        const result = await client.listTables();
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
