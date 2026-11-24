import { describe, expect, it, vi } from 'vitest';
import { prepareQueryOptionsForWrite } from '../src/queryPersistence.js';
import { validateQueryOptions } from '../src/queryValidation.js';
import { validateAppTool } from '../src/tools/validateApp.js';
import { updateQueryTool } from '../src/tools/updateQuery.js';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';

const options = (code: string) => ({
  code, runOnPageLoad: false, runOnDependencyChange: false, requestConfirmation: false, showSuccessNotification: false,
});

describe('Run Python module results', () => {
  it.each([
    ['if bins:\n    return len(bins)', 2],
    ['def volume():\r\n    return 14\r\nreturn volume()', 3],
    ['def make_bin():\n    class Bin:\n        return 7', 3],
    ['class Bin:\r    return 7', 2],
  ] as const)('blocks a return outside the nearest function on write', (code, line) => {
    expect(prepareQueryOptionsForWrite('runpy', options(code)).errors.join(' ')).toContain(`line ${line}: 'return' outside function`);
  });

  it('keeps valid module text intact, including nested returns, strings and comments', () => {
    const code = 'class Rack:\r\n    async def count(self):\r\n        return 4\r\n\r\n# return the label\r\n(await Rack().count(), "return")';
    const result = prepareQueryOptionsForWrite('runpy', options(code));
    expect(result.errors).toEqual([]);
    expect(result.options.code).toBe(code);
  });

  it('preserves Python form-feed indentation when checking function scope', () => {
    const code = 'def slots():\n\f    return 12\nslots()';
    const result = prepareQueryOptionsForWrite('runpy', options(code));
    expect(result.errors).toEqual([]);
    expect(result.options.code).toBe(code);
  });

  it('applies the same return scope during workflow lint', () => {
    expect(validateQueryOptions('runpy', options('return 6'), 'workflow').errors)
      .toContainEqual(expect.objectContaining({ code: 'runpy_return_outside_function' }));
    const code = 'def total():\n    def quantity():\n        return 6\n    return quantity()\ntotal()';
    expect(validateQueryOptions('runpy', options(code), 'workflow').errors).toEqual([]);
  });

  it('uses the saved kind to reject invalid bare-ID updates and persist a valid repair', async () => {
    const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
      if (path === '/api/data-queries/rack-query/versions/draft' && init?.method === 'PATCH') return Response.json({});
      if (path === '/api/data-queries/draft') return Response.json({ data_queries: [
        { id: 'rack-query', name: 'countRacks', kind: 'runpy', data_source_id: 'py', options: options('12') },
      ] });
      if (path === '/api/app-environments') return Response.json({ environments: [{ id: 'dev', name: 'development' }] });
      if (path.startsWith('/api/data-sources/')) return Response.json({ data_sources: [{ id: 'py', kind: 'runpy', name: 'Python' }] });
      throw new Error(`Unexpected request ${path}`);
    });
    const auth = { authedFetch: fetcher, getOrganizationId: async () => 'workspace', getOrganizationSlug: async () => 'workspace' } as Auth;
    const client = createClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082' });
    const result = await updateQueryTool(client).handler({ query_id: 'rack-query', version_id: 'draft', options: options('return 12') });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("'return' outside function");
    expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
    const repair = options('def rack_size():\n    return 12\nrack_size()');
    const valid = await updateQueryTool(client).handler({ query_id: 'rack-query', version_id: 'draft', options: repair });
    expect(valid.isError).toBeFalsy();
    const patches = fetcher.mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(JSON.parse(String(patches[0]?.[1]?.body))).toEqual({ options: repair });
  });

  it('fails the saved app verdict until the same query is repaired', async () => {
    const query = { id: 'rack-query', name: 'countRacks', kind: 'runpy', options: options('qty = 6\nreturn qty') };
    const client = { getAppSummary: vi.fn(async () => ({
      pages: [{ id: 'racks', name: 'Racks', components: [] }], queries: [query], events: [],
    })) } as unknown as ToolJetClient;
    const check = async () => JSON.parse((await validateAppTool(client).handler({ app_id: 'warehouse' })).content[0].text);
    expect(await check()).toMatchObject({ ok: false, errors: [expect.stringContaining("line 2: 'return' outside function")] });
    query.options = options('qty = 6\nqty');
    expect(await check()).toMatchObject({ ok: true, errors: [] });
  });
});
