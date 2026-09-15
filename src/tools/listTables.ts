import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export function listTablesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_tables',
    title: 'List ToolJet DB Tables',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      "List the ToolJet-DB tables in the workspace as { tables: [{ id, table_name }], total, shown }. A ToolJet-DB (tooljetdb) query's options require the table's `id` as `table_id` (NOT the table name) — call this to resolve a table name to its id before add_query. " +
      'Pass `search` (a case-insensitive substring, usually the app\'s table prefix) so a busy workspace does not return hundreds of unrelated tables; at most `limit` rows come back (default 100).',
    inputSchema: {
      search: z.string().optional(),
      limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
    },
    async handler(args: { search?: string; limit?: number }) {
      try {
        // A workspace fills with tables over time (1,684 in the benchmark workspace, 130 kB of names): an
        // unfiltered listing sat in the model's context for every later turn. Filter and cap it here.
        const all = (await client.listTables()) as Array<{ id: string; table_name: string }>;
        const needle = (args.search ?? '').trim().toLowerCase();
        const matched = needle ? all.filter((t) => String(t.table_name ?? '').toLowerCase().includes(needle)) : all;
        const limit = args.limit ?? DEFAULT_LIMIT;
        const tables = matched.slice(0, limit);
        const result: Record<string, unknown> = { tables, total: matched.length, shown: tables.length };
        if (matched.length > tables.length) {
          result.hint = `${matched.length - tables.length} more tables match; pass search with the app's table prefix or a larger limit.`;
        }
        if (!needle && all.length > limit) {
          result.hint = `${all.length} tables in the workspace, ${tables.length} shown; pass search (the app's table prefix) to find yours.`;
        }
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
