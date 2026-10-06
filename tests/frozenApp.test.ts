import { describe, expect, it } from 'vitest';

// Batch 3 edits (2026-09-25): two apps promoted to production before the AI was asked to change them. ToolJet
// refuses query writes to a promoted version ("You cannot create queries in the promoted version") and freezes its
// editor; the builds created tables and seeded 30 rows first, then failed part-way. A frozen app is refused before
// any write, saying what to do.
const frozenSummary = { app_id: 'app-z', version_id: 'v', editor_frozen: true, environment: 'production', pages: [], queries: [], events: [] };
const client = {
  getAppSummary: async () => frozenSummary,
  listDatasources: async () => [], listTables: async () => [], getTableSchema: async () => [],
};
const text = (out: { content: Array<{ text?: string }> }) => String(out.content[0]!.text);

describe('an app whose editor is frozen (promoted version)', () => {
  it('lint_app_spec refuses', async () => {
    const { lintAppSpecTool } = await import('../src/tools/lintAppSpec.js');
    const out = text(await lintAppSpecTool(client as never).handler({ app_id: 'app-z', version_id: 'v', pages: [{ name: 'A', components: [] }] } as never) as never);
    expect(out).toMatch(/production/);
  });
  it('apply_app_phase refuses before any write', async () => {
    const { storeAppPlan } = await import('../src/appPlanStore.js');
    const { applyAppPhaseTool } = await import('../src/tools/applyAppPhase.js');
    const token = storeAppPlan({ app_id: 'app-z', version_id: 'v', tables: [{ table_name: 't_new', columns: [{ name: 'a', type: 'string' }] }] } as never,
      { ok: true, errors: [], warnings: [] } as never).plan_token;
    const writes = { createTable: async () => { throw new Error('wrote a table'); } };
    const out = text(await applyAppPhaseTool({ ...client, ...writes } as never).handler({ app_id: 'app-z', version_id: 'v', plan_token: token }) as never);
    expect(out).toMatch(/read-only/);
    expect(out).not.toMatch(/wrote a table/);
  });
  it('the summary says so', async () => {
    const { selectAppSummary } = await import('../src/appSummarySelection.js');
    expect(selectAppSummary(frozenSummary as never, {})).toMatchObject({ editor_frozen: true, environment: 'production' });
  });
});
