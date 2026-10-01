import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';

const { uuidState } = vi.hoisted(() => ({ uuidState: { n: 0 } }));
vi.mock('node:crypto', () => ({ randomUUID: () => `page-uuid-${++uuidState.n}` }));

const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', email: 'a@b.com', password: 'pw' };
const res = (json: unknown) => ({ status: 200, ok: true, json: async () => json, text: async () => '', clone() { return this; } }) as unknown as Response;

// ToolJet EE with the page-groups licence stores a created page's order in pageGroupIndex and writes
// index = 999 as a placeholder. The summary reported 999, so builds saw "Today 1, Patients 999,
// Billing 999" and spent update_pages calls reordering pages that were already in order.
describe('page order on a page-groups licence', () => {
  let auth: { authedFetch: ReturnType<typeof vi.fn>; getOrganizationId: ReturnType<typeof vi.fn>; getOrganizationSlug: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    uuidState.n = 0;
    auth = { authedFetch: vi.fn(), getOrganizationId: vi.fn().mockResolvedValue('org1'), getOrganizationSlug: vi.fn().mockResolvedValue('ws') };
  });
  const licensedPages = [
    { id: 'today', name: 'Today', handle: 'home', index: 1, pageGroupIndex: 1, components: {} },
    { id: 'billing', name: 'Billing', handle: 'billing', index: 999, pageGroupIndex: 3, components: {} },
    { id: 'patients', name: 'Patients', handle: 'patients', index: 999, pageGroupIndex: 2, components: {} },
  ];

  it('reports the order the viewer uses', async () => {
    auth.authedFetch.mockResolvedValue(res({ id: 'app1', name: 'Vet', pages: licensedPages, events: [], data_queries: [] }));
    const summary = await createClient(auth as never, config).getAppSummary('app1');
    expect(summary.pages.map((p) => [p.name, p.index])).toEqual([['Today', 1], ['Billing', 3], ['Patients', 2]]);
  });

  it('appends new pages after the real last position, not after the 999 placeholder', async () => {
    auth.authedFetch
      .mockResolvedValueOnce(res({ id: 'app1', pages: licensedPages }))
      .mockResolvedValue(res({}));
    const created = await createClient(auth as never, config).createPages({ appId: 'app1', versionId: 'v1', pages: [{ name: 'Reports' }] });
    expect(created[0]!.index).toBe(4);
  });
});
