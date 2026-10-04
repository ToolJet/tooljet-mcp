import { describe, expect, it } from 'vitest';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';

// A build passed a table it had already created as tables=[{table_name, table_id}]; every lint crashed with
// "Cannot read properties of undefined (reading 'map')" and the model retried seven times.
describe('lint_app_spec with a table that has no columns', () => {
  it('reports it instead of crashing', async () => {
    const client = { listTables: async () => [], getAppSummary: async () => ({ app_id: 'app1', version_id: 'v1', pages: [], queries: [], events: [] }) };
    const out = await lintAppSpecTool(client as never).handler({ app_id: 'app1', version_id: 'v1', tables: [{ table_name: 'x_new' }] } as never);
    const text = String((out.content[0] as { text?: string }).text);
    expect(out.isError).toBe(true);
    expect(text).not.toMatch(/reading 'map'/);
    expect(text).toMatch(/"x_new" has no columns.*List only new tables/);
  });
});
