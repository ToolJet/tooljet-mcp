import { describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { Config } from '../src/config.js';
import { lintComponentSpec } from '../src/lint.js';
import { createClient } from '../src/tooljetClient.js';
import { addComponentsTool } from '../src/tools/addComponents.js';

// QA DVRL-1 (feat/cc-packs, 2026-11-12): add_components wrote a ModuleViewer with properties {}. It names no module, so
// it draws nothing, and ToolJet failed every load of the app with a 500 "Cannot read properties of undefined (reading
// 'value')" (fixed in ToolJet as well; older servers still fail).

const layout = { top: 20, left: 2, width: 20, height: 200 };
const moduleId = '5b1f6c2e-8a51-4c2b-9d1e-0c6f3a7b9e10';

describe('a ModuleViewer names the module it shows', () => {
  it('is refused without properties.moduleAppId', () => {
    const { errors } = lintComponentSpec({ name: 'mod1', type: 'ModuleViewer', properties: {}, layout });
    expect(errors.join(' ')).toMatch(/ModuleViewer "mod1" needs properties\.moduleAppId/);
  });

  it('is refused with an empty moduleAppId', () => {
    const { errors } = lintComponentSpec({ name: 'mod1', type: 'ModuleViewer', properties: { moduleAppId: { value: ' ' } }, layout });
    expect(errors.join(' ')).toMatch(/needs properties\.moduleAppId/);
  });

  it('is accepted naming a module, as a raw value or as { value }', () => {
    for (const moduleAppId of [moduleId, { value: moduleId }]) {
      const { errors } = lintComponentSpec({ name: 'mod1', type: 'ModuleViewer', properties: { moduleAppId }, layout });
      expect(errors.join(' ')).not.toMatch(/moduleAppId/);
    }
  });

  it('add_components refuses one without a module before any write', async () => {
    const writes: string[] = [];
    const authedFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') !== 'GET') writes.push(`${init?.method} ${url}`);
      return new Response('{}', { status: 200 });
    });
    const real = createClient({ authedFetch } as unknown as Auth, {} as Config);
    const summary = { app_id: 'app1', pages: [{ id: 'p1', name: 'Home', components: [] }], queries: [], events: [] };
    const client = { ...real, getAppSummary: vi.fn().mockResolvedValue(summary), getAppSettings: vi.fn().mockResolvedValue({}) };

    const result = await addComponentsTool(client as never).handler({
      app_id: 'app1',
      version_id: 'v1',
      page_id: 'p1',
      components: [{ name: 'mod1', type: 'ModuleViewer', properties: {}, layout }],
    } as never);

    expect(result.isError).toBe(true);
    expect(String(result.content[0]?.text)).toMatch(/needs properties\.moduleAppId/);
    expect(writes).toEqual([]);
  });
});
