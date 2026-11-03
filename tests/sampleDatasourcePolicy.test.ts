import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import { updateQueryTool } from '../src/tools/updateQuery.js';
import { isSampleDatasource } from '../src/datasourcePolicy.js';
import type { Auth } from '../src/auth.js';

const sources = [
  { id: 'shared', name: 'Renamed training connection', kind: 'postgresql', type: 'sample' },
  { id: 'legacy', name: 'Sample data source', kind: 'postgresql' },
  { id: 'owned', name: 'Workshop inventory', kind: 'postgresql', type: 'default' },
  { id: 'local', name: 'tooljetdbdefault', kind: 'tooljetdb', type: 'static' },
];

function setup({ inventory = sources, denyIdentity = false } = {}) {
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    let body: unknown;
    if (path === '/api/app-environments') body = { environments: [{ id: 'dev', name: 'development' }] };
    else if (path.includes('/environments/dev/versions/')) body = { data_sources: inventory };
    else if (path.startsWith('/api/data-sources/') && path.endsWith('/environment/dev')) {
      if (denyIdentity) return new Response('Settings permission denied', { status: 403 });
      body = sources.find(source => path.includes(`/${source.id}/`));
      if (!body) return new Response('Unavailable', { status: 404 });
    } else if (path === '/api/data-queries/version') {
      body = { data_queries: [
        { id: 'old-read', data_source_id: 'shared', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT label FROM fixtures LIMIT 4' } },
        { id: 'safe-read', data_source_id: 'owned', kind: 'postgresql' },
        { id: 'missing-source', kind: 'postgresql' },
      ] };
    } else if (init?.method) body = { id: 'new-query', name: 'fixtures', status: 'ok', data: [{ label: 'Clamp' }] };
    else throw new Error(`Unexpected request ${path}`);
    return new Response(JSON.stringify(body));
  });
  const auth = { authedFetch: fetch, getOrganizationId: async () => 'workshop', getOrganizationSlug: async () => 'workshop' } as Auth;
  return { client: createClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082' }), fetch };
}

describe('AI sample datasource boundary', () => {
  it('filters by authoritative type and legacy name without excluding customer PostgreSQL or ToolJet DB', async () => {
    const { client } = setup();
    expect((await client.listDatasources('version')).map(d => d.id)).toEqual(['owned', 'local']);
    expect(isSampleDatasource({ name: ' SAMPLE Data_Source ' })).toBe(true);
    expect(isSampleDatasource({ name: 'Workshop sample inventory' })).toBe(false);
  });

  it.each(['shared', 'legacy'])('blocks %s even when the caller supplies a safe-looking kind', async id => {
    const { client, fetch } = setup();
    await expect(client.createQuery({ versionId: 'version', dataSourceId: id, name: 'fixtures', kind: 'tooljetdb',
      options: { mode: 'sql', query: 'CREATE TABLE fixture_bins (label text)' } })).rejects.toThrow('ToolJet Database');
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('rejects a mixed batch before writing any safe or blocked query', async () => {
    const { client, fetch } = setup();
    await expect(client.createQueries({ versionId: 'version', queries: ['owned', 'shared'].map(dataSourceId => ({
      dataSourceId, name: `read_${dataSourceId}`, kind: 'postgresql', options: { mode: 'sql', query: 'SELECT 1' },
    })) })).rejects.toThrow('ToolJet Database');
    expect(fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it.each(['run', 'update', 'repoint', 'inspect', 'details', 'test'])('blocks direct %s access without prior discovery', async operation => {
    const { client, fetch } = setup();
    const call = {
      run: () => client.runQuery({ queryId: 'old-read', versionId: 'version' }),
      update: () => client.updateQuery({ queryId: 'old-read', versionId: 'version', options: { mode: 'sql', query: 'SELECT 1' } }),
      repoint: () => client.updateQueryDatasource({ queryId: 'safe-read', versionId: 'version', dataSourceId: 'shared' }),
      inspect: () => client.invokeDatasourceMethod({ dataSourceId: 'shared', method: 'listSchemas' }),
      details: () => client.getDatasourceConnectionDetails('shared'),
      test: () => client.testDatasourceConnection({ dataSourceId: 'shared', kind: 'postgresql', options: {} }),
    }[operation]!;
    await expect(call()).rejects.toThrow('Sample data source');
    expect(fetch.mock.calls.some(([, init]) => init?.method)).toBe(false);
  });

  it('fails closed when a saved query or datasource identity cannot be verified', async () => {
    const { client, fetch } = setup();
    await expect(client.runQuery({ queryId: 'missing-source', versionId: 'version' })).rejects.toThrow('Cannot verify');
    await expect(client.invokeDatasourceMethod({ dataSourceId: 'unknown', method: 'listTables' })).rejects.toThrow();
    expect(fetch.mock.calls.some(([, init]) => init?.method)).toBe(false);
  });

  it('does not require settings permission for query use authorized by the version inventory', async () => {
    const { client, fetch } = setup({ denyIdentity: true });
    await client.runQuery({ queryId: 'safe-read', versionId: 'version' });
    await client.updateQuery({ queryId: 'safe-read', versionId: 'version', options: {} });
    await client.createQuery({ versionId: 'version', dataSourceId: 'owned', name: 'fixtures', kind: 'postgresql', options: {} });
    expect(fetch.mock.calls.some(([path]) => path.includes('/environment/'))).toBe(false);
  });

  it('verifies an app-local datasource by identity when the global inventory omits it', async () => {
    const { client, fetch } = setup({ inventory: [] });
    await client.assertDatasourceAllowed('owned', 'version');
    expect(fetch.mock.calls.some(([path]) => path === '/api/data-sources/owned/environment/dev')).toBe(true);
    await expect(client.assertDatasourceAllowed('shared', 'version')).rejects.toThrow('Sample data source');
  });

  it('reports a failed repair without attempting to restore an excluded original datasource', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({ queries: [{ id: 'old-read', name: 'fixtures', data_source_id: 'shared', kind: 'postgresql' }] }),
      listDatasources: vi.fn().mockResolvedValue([{ id: 'owned', name: 'Workshop inventory', kind: 'postgresql' }]),
      assertDatasourceAllowed: vi.fn().mockRejectedValue(new Error('Sample data source is unavailable to AI.')),
      updateQueryDatasource: vi.fn().mockResolvedValue(undefined),
      updateQuery: vi.fn().mockRejectedValue(new Error('Backend rejected options')),
    };
    const result = await updateQueryTool(client as any).handler({ app_id: 'app', version_id: 'version', query_id: 'old-read',
      datasource_id: 'owned', options: { mode: 'sql', query: 'SELECT 1 AS probe LIMIT 1' } });
    expect(result.isError).toBe(true);
    expect(client.updateQueryDatasource).toHaveBeenCalledExactlyOnceWith({ queryId: 'old-read', versionId: 'version', dataSourceId: 'owned' });
    expect(JSON.stringify(result)).toContain('query remains on the new datasource with its previous options');
  });

  it('can restore a verified app-local source after a failed repoint', async () => {
    const client = {
      getAppSummary: vi.fn().mockResolvedValue({ queries: [{ id: 'legacy-read', name: 'fixtures', data_source_id: 'app-local', kind: 'postgresql' }] }),
      listDatasources: vi.fn().mockResolvedValue([{ id: 'owned', name: 'Workshop inventory', kind: 'postgresql' }]),
      assertDatasourceAllowed: vi.fn().mockResolvedValue(undefined),
      updateQueryDatasource: vi.fn().mockResolvedValue(undefined),
      updateQuery: vi.fn().mockRejectedValue(new Error('Backend rejected options')),
    };
    const result = await updateQueryTool(client as any).handler({ app_id: 'app', version_id: 'version', query_id: 'legacy-read',
      datasource_id: 'owned', options: { mode: 'sql', query: 'SELECT 1 AS probe LIMIT 1' } });
    expect(result.isError).toBe(true);
    expect(client.assertDatasourceAllowed).toHaveBeenCalledWith('app-local', 'version');
    expect(client.updateQueryDatasource).toHaveBeenLastCalledWith({ queryId: 'legacy-read', versionId: 'version', dataSourceId: 'app-local' });
    expect(client.updateQueryDatasource).toHaveBeenCalledTimes(2);
  });

  it('allows owned reads, new ToolJet DB queries, and repairing or deleting old sample queries', async () => {
    const { client, fetch } = setup();
    await expect(client.runQuery({ queryId: 'safe-read', versionId: 'version' })).resolves.toMatchObject({ status: 'ok' });
    await client.createQuery({ versionId: 'version', dataSourceId: 'local', name: 'fixtures', kind: 'tooljetdb', options: {} });
    await client.updateQueryDatasource({ queryId: 'old-read', versionId: 'version', dataSourceId: 'local' });
    await client.deleteQuery({ queryId: 'old-read', versionId: 'version' });
    expect(fetch.mock.calls.filter(([, init]) => init?.method).map(([, init]) => init?.method)).toEqual(['POST', 'POST', 'PUT', 'DELETE']);
  });
});
