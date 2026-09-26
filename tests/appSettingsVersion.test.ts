import { describe, expect, it } from 'vitest';
import { getAppSettingsTool } from '../src/tools/getAppSettings.js';

// Depth run restaurant x4 (2026-09-25): get_app_settings without version_id failed schema validation; the app's
// editing version is known, as other tools resolve it.
describe('get_app_settings', () => {
  it('defaults version_id to the editing version', async () => {
    const seen: string[] = [];
    const client = {
      getAppSummary: async () => ({ app_id: 'a', version_id: 'ver-7', pages: [], queries: [], events: [] }),
      getAppSettings: async (_app: string, version: string) => { seen.push(version); return {}; },
    };
    await getAppSettingsTool(client as never).handler({ app_id: 'a' } as never);
    expect(seen).toEqual(['ver-7']);
  });
});
