import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import { isSampleDatasource } from '../src/datasourcePolicy.js';
import type { Auth } from '../src/auth.js';

const sources = [
  { id: 'shared', name: 'Renamed training connection', kind: 'postgresql', type: 'sample' },
  { id: 'legacy', name: 'Sample data source', kind: 'postgresql' },
  { id: 'owned', name: 'Workshop inventory', kind: 'postgresql', type: 'default' },
  { id: 'local', name: 'tooljetdbdefault', kind: 'tooljetdb', type: 'static' },
];

function setup() {
  const fetch = vi.fn(async (path: string, init?: RequestInit) => {
    let body: unknown;
    if (path === '/api/app-environments') body = { environments: [{ id: 'dev', name: 'development' }] };
    else if (path.includes('/environments/dev/versions/')) body = { data_sources: sources };
    else if (path.startsWith('/api/data-sources/') && path.endsWith('/environment/dev')) {
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

  it('allows owned reads, new ToolJet DB queries, and repairing or deleting old sample queries', async () => {
    const { client, fetch } = setup();
    await expect(client.runQuery({ queryId: 'safe-read', versionId: 'version' })).resolves.toMatchObject({ status: 'ok' });
    await client.createQuery({ versionId: 'version', dataSourceId: 'local', name: 'fixtures', kind: 'tooljetdb', options: {} });
    await client.updateQueryDatasource({ queryId: 'old-read', versionId: 'version', dataSourceId: 'local' });
    await client.deleteQuery({ queryId: 'old-read', versionId: 'version' });
    expect(fetch.mock.calls.filter(([, init]) => init?.method).map(([, init]) => init?.method)).toEqual(['POST', 'POST', 'PUT', 'DELETE']);
  });
});
