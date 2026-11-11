import { describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/auth.js';
import { branchIdFor, withBranchContext } from '../src/branchContext.js';
import { createClient } from '../src/tooljetClient.js';
import { consumeAppPlan, storeAppPlan } from '../src/appPlanStore.js';
import { identityFromHeaders, loadConfig } from '../src/config.js';

const config = { apiUrl: 'https://example.test', appUrl: 'https://example.test', sessionToken: 'test-session', workspaceId: 'workspace' };
const branch = '11111111-1111-4111-8111-111111111111';

describe('branch context', () => {
  it('carries a gateway branch and does not inherit a server-wide branch for another identity', async () => {
    vi.stubEnv('TOOLJET_BRANCH_ID', branch);
    try {
      const identity = await identityFromHeaders({ 'x-tooljet-session': 'session', 'x-tooljet-workspace-id': 'workspace', 'x-tooljet-branch-id': branch });
      expect(loadConfig(identity).branchId).toBe(branch);
      expect(loadConfig({ sessionToken: 'other', workspaceId: 'other-workspace' }).branchId).toBeUndefined();
    } finally { vi.unstubAllEnvs(); }
  });
  it('isolates concurrent tool calls and preserves existing query parameters', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    const auth = createAuth(config, fetcher as typeof fetch);
    await Promise.all(['draft-a', 'draft-b'].map(id => withBranchContext(id, async () => {
      await Promise.resolve();
      await auth.authedFetch('/api/apps?page=2');
    })));
    expect(fetcher.mock.calls.map(call => String(call[0])).sort()).toEqual([
      'https://example.test/api/apps?page=2&branch_id=draft-a',
      'https://example.test/api/apps?page=2&branch_id=draft-b',
    ]);
    await auth.authedFetch('/api/apps');
    expect(fetcher.mock.calls.at(-1)?.[0]).toBe('https://example.test/api/apps');
  });

  it('refuses to override an in-product build branch', () => {
    expect(() => withBranchContext('different', () => branchIdFor({ branchId: branch }))).toThrow(/branch/i);
    expect(withBranchContext(branch, () => branchIdFor({ branchId: branch }))).toBe(branch);
  });

  it('does not turn branch context into a PostgREST row filter', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    const auth = createAuth({ ...config, branchId: branch }, fetcher as typeof fetch);
    await auth.authedFetch('/api/tooljet-db/proxy/table?limit=1', { method: 'POST', body: '{"title":"Garden check"}' });
    expect(fetcher.mock.calls[0][0]).toBe('https://example.test/api/tooljet-db/proxy/table?limit=1');
    expect((fetcher.mock.calls[0][1]?.headers as Headers).get('x-branch-id')).toBe(branch);
  });

  it('keeps a linted plan usable only on its original branch', () => {
    const plan = withBranchContext(branch, () => storeAppPlan({}, {} as any));
    expect(() => withBranchContext('other', () => consumeAppPlan(plan.plan_token))).toThrow(/different branch/);
    expect(withBranchContext(branch, () => consumeAppPlan(plan.plan_token))).toMatchObject({ branchId: branch });
  });

  it('sends branchId in app creation as well as branch_id on subsequent reads', async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response(JSON.stringify(init?.method === 'POST' ? { id: 'app' } : {
        editing_version: { id: 'version', name: 'draft-version', version_type: 'branch', branch: { name: 'feature/garden' } }, pages: [{ id: 'home', name: 'Home' }],
      }));
    });
    const client = createClient(createAuth(config, fetcher as typeof fetch), config);
    const result = await withBranchContext(branch, () => client.createApp('Garden tasks'));
    expect(JSON.parse(String(calls[0][1]?.body))).toMatchObject({ name: 'Garden tasks', branchId: branch });
    expect(calls[1][0]).toContain('branch_id=' + branch);
    expect(result).toMatchObject({ app_id: 'app', version_id: 'version', branch_id: branch });
    expect(result.editor_url).toContain('?branch=feature%2Fgarden');
    expect(result.viewer_url).toContain('?env=development&version=draft-version&branch=feature%2Fgarden');
  });
});
