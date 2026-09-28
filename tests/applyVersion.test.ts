import { describe, expect, it } from 'vitest';
import { storeAppPlan, consumeAppPlan } from '../src/appPlanStore.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';

// h2-receiving pf (2026-09-25): the model's version id was malformed, it dropped the argument, and apply failed schema
// validation; the page was never applied. apply takes the version its plan was linted for, and checks the ids before
// it consumes the one-time token, so a wrong id no longer costs the linted plan.
const plan = () => storeAppPlan({ app_id: 'app-1', version_id: 'ver-1', pages: [] } as never, { ok: true, errors: [], warnings: [] } as never).plan_token;
const stopAtContext = {
  getAppSummary: async () => { throw new Error('reached app context'); },
  listTables: async () => [], listDatasources: async () => [],
};
const run = async (args: Record<string, unknown>) =>
  String((await applyAppPhaseTool(stopAtContext as never).handler(args as never) as { content: Array<{ text: string }> }).content[0]!.text);

describe('apply_app_phase ids', () => {
  it('defaults version_id to the plan', async () => {
    const out = await run({ app_id: 'app-1', plan_token: plan() });
    expect(out).toMatch(/reached app context/);
  });
  it('a mismatched id leaves the plan token usable', async () => {
    const token = plan();
    const out = await run({ app_id: 'app-1', version_id: 'ver-9', plan_token: token });
    expect(out).toMatch(/ver-9/);
    expect(consumeAppPlan(token).spec.version_id).toBe('ver-1');
  });
});
