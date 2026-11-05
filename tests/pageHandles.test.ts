import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';

const { uuidState } = vi.hoisted(() => ({ uuidState: { n: 0 } }));
vi.mock('node:crypto', () => ({ randomUUID: () => `page-uuid-${++uuidState.n}` }));

const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', email: 'a@b.com', password: 'pw' };
const res = (json: unknown) => ({ status: 200, ok: true, json: async () => json, text: async () => '', clone() { return this; } }) as unknown as Response;

describe('page handles', () => {
  let auth: { authedFetch: ReturnType<typeof vi.fn>; getOrganizationId: ReturnType<typeof vi.fn>; getOrganizationSlug: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    uuidState.n = 0;
    auth = { authedFetch: vi.fn(), getOrganizationId: vi.fn().mockResolvedValue('org1'), getOrganizationSlug: vi.fn().mockResolvedValue('ws') };
  });

  const create = async (existing: unknown[], names: string[]) => {
    auth.authedFetch
      .mockResolvedValueOnce(res({ id: 'app1', pages: existing }))
      .mockResolvedValue(res({}));
    await createClient(auth as never, config).createPages({ appId: 'app1', versionId: 'v1', pages: names.map((name) => ({ name })) });
    return auth.authedFetch.mock.calls
      .filter(([, init]) => init?.method === 'POST')
      .map(([, init]) => JSON.parse(init.body).handle);
  };

  it('keeps non-Latin letters', async () => {
    expect(await create([], ['الملف الشخصي', 'プロフィール', 'Профиль'])).toEqual(['الملف-الشخصي', 'プロフィール', 'профиль']);
  });

  it('suffixes clashing handles instead of failing', async () => {
    const existing = [{ id: 'p1', name: 'Home', handle: 'home', index: 1 }];
    expect(await create(existing, ['home!', '🏠', '⭐'])).toEqual(['home-2', 'page', 'page-2']);
  });
});
