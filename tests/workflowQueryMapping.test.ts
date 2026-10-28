import { describe, expect, it, vi } from 'vitest';
import { getDatasourceQuerySchema } from '../src/datasourceCatalog.js';
import { prepareQueryOptionsForWrite } from '../src/queryPersistence.js';
import { validatePersistedAppSummary } from '../src/appValidation.js';
import { addQueriesTool } from '../src/tools/addQueries.js';
import { updateQueryTool } from '../src/tools/updateQuery.js';
import { createClient, PartialWriteError, type AppSummary, type ToolJetClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';

const workflowId = 'cf57309d-c8f5-435c-832b-d7281f41397f';
const workflowVersionId = '8cb88571-7c70-47f4-832a-1f4a40ac18ec';
const otherWorkflowId = '629efb19-611d-4274-940a-e1409b7d55d7';
const toggles = { runOnPageLoad: false, runOnDependencyChange: false, requestConfirmation: false, showSuccessNotification: false };
const valid = { ...toggles, workflowId, workflowVersionId, syncExecution: true, params: [{ key: 'boxes', value: '{{[4, 7]}}' }] };
const summary = (options: Record<string, unknown>): AppSummary => ({
  app_id: 'packing-app', version_id: 'app-draft', pages: [{ id: 'home', name: 'Home', components: [] }],
  queries: [{ id: 'packing-query', name: 'calculatePacking', kind: 'workflows', data_source_id: 'workflows-source', options }],
  events: ['onDataQuerySuccess', 'onDataQueryFailure'].map((eventId, i) => ({
    id: `packing-event-${i}`, name: 'onQueryChange', sourceId: 'packing-query', target: 'data_query',
    event: { eventId, actionId: 'show-alert', message: i ? 'Packing failed' : 'Packing complete', alertType: i ? 'error' : 'success' },
  })),
});

describe('workflow query contract', () => {
  it('exposes the native mapping fields and requires a workflow ID', () => {
    const schema = getDatasourceQuerySchema('workflows')!;
    expect(schema.operationSelection?.mode).toBe('single');
    const contract = schema.contracts.default;
    expect(contract.variants[0].required).toEqual(['workflowId']);
    expect(Object.keys(contract.variants[0].fields).sort()).toEqual(['params', 'syncExecution', 'workflowId', 'workflowVersionId']);
  });

  it.each([undefined, null, '', ' ', 'Packing totals', {}, { value: workflowId }, '{{variables.workflow}}', 7])(
    'rejects an absent or malformed workflow target: %j', workflowId => {
      const result = prepareQueryOptionsForWrite('workflows', { ...valid, workflowId });
      expect(result.errors.join(' ')).toContain('workflowId');
    });

  it.each([{ workflow_id: workflowId }, { workflowId, workflow_version_id: workflowVersionId },
    { workflowId, sync_execution: true }, { workflowId, workflowVersionId: '' }, { workflowId, syncExecution: 'false' },
    { workflowId, params: { boxes: [4, 7] } }, { workflowId, params: [null] }, { workflowId, params: [{ key: 'boxes' }] }])(
    'rejects unsupported selector/parameter shapes: %j', options => {
      expect(prepareQueryOptionsForWrite('workflows', { ...toggles, ...options }).errors.length).toBeGreaterThan(0);
    });

  it.each([undefined, null, workflowVersionId])('keeps native targets and parameter bindings intact with version %s', version => {
    const options = { ...valid, workflowVersionId: version };
    const result = prepareQueryOptionsForWrite('workflows', options);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.options).toEqual(options);
    expect(result.validation?.schemaFound).toBe(true);
  });

  it('does not mistake success/failure handlers for an established workflow mapping', () => {
    const result = validatePersistedAppSummary(summary({ ...toggles, params: [] }));
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('workflowId');
    expect(validatePersistedAppSummary(summary(valid)).ok).toBe(true);
  });

  it('preflights the whole batch before creating any queries', async () => {
    const client = { listDatasources: vi.fn().mockResolvedValue([{ id: 'workflows-source', kind: 'workflows' }]), createQueries: vi.fn() };
    const result = await addQueriesTool(client as unknown as ToolJetClient).handler({ version_id: 'app-draft', queries: [
      { datasource_id: 'workflows-source', name: 'calculatePacking', options: valid },
      { datasource_id: 'workflows-source', name: 'calculateShipping', options: toggles },
    ] });
    expect(result.isError).toBe(true);
    expect(client.createQueries).not.toHaveBeenCalled();
  });

  it('refuses an update that would erase the existing workflow mapping', async () => {
    const client = { getAppSummary: vi.fn().mockResolvedValue(summary(valid)), updateQuery: vi.fn() };
    const result = await updateQueryTool(client as unknown as ToolJetClient).handler({
      app_id: 'packing-app', version_id: 'app-draft', query_id: 'packing-query', options: { ...toggles, params: [] },
    });
    expect(result.isError).toBe(true);
    expect(client.updateQuery).not.toHaveBeenCalled();
  });
});

function persistenceFixture(readback?: Record<string, unknown> | 'unavailable') {
  let saved = structuredClone(valid) as Record<string, unknown>;
  let wrote = false;
  const fetcher = vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/app-environments') return Response.json({ environments: [{ id: 'dev', name: 'development' }] });
    if (path.startsWith('/api/data-sources/')) return Response.json({ data_sources: [{ id: 'workflows-source', name: 'Workflows', kind: 'workflows' }] });
    if (init?.method === 'POST' || init?.method === 'PATCH') {
      saved = JSON.parse(String(init.body)).options;
      wrote = true;
      return Response.json({ id: 'packing-query', name: 'calculatePacking' });
    }
    if (path === '/api/data-queries/app-draft') {
      if (wrote && readback === 'unavailable') return new Response('temporarily unavailable', { status: 503 });
      return Response.json({ data_queries: summary(wrote && readback && readback !== 'unavailable' ? readback : saved).queries });
    }
    throw new Error(`Unexpected test request: ${path}`);
  });
  const auth = { authedFetch: fetcher, getOrganizationId: async () => 'workspace', getOrganizationSlug: async () => 'workspace' } as Auth;
  return { client: createClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082' }), fetcher };
}

describe('workflow mapping persistence', () => {
  it('blocks a bare-ID update even when the tool caller supplies no app or kind', async () => {
    const { client, fetcher } = persistenceFixture();
    const result = await updateQueryTool(client).handler({ query_id: 'packing-query', version_id: 'app-draft', options: toggles });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('options.workflowId');
    expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });

  it('reads back the saved target after creating and updating a query', async () => {
    const { client, fetcher } = persistenceFixture();
    await expect(client.createQuery({ versionId: 'app-draft', dataSourceId: 'workflows-source', name: 'calculatePacking', options: valid })).resolves.toEqual({ query_id: 'packing-query', name: 'calculatePacking' });
    await expect(client.updateQuery({ queryId: 'packing-query', versionId: 'app-draft', options: { ...valid, workflowId: otherWorkflowId } })).resolves.toEqual({ query_id: 'packing-query' });
    expect(fetcher.mock.calls.at(-1)?.[0]).toBe('/api/data-queries/app-draft');
  });

  it.each([{ ...valid, workflowId: otherWorkflowId }, { ...valid, workflowVersionId: null }, { ...toggles }, 'unavailable'] as const)(
    'reports persisted IDs instead of success or a blind-retry hint when creation readback fails: %j', async saved => {
      const { client, fetcher } = persistenceFixture(saved);
      let error: unknown;
      try {
        await client.createQueries({ versionId: 'app-draft', queries: [{ dataSourceId: 'workflows-source', name: 'calculatePacking', options: valid, kind: 'workflows' }] });
      } catch (caught) { error = caught; }
      expect(error).toBeInstanceOf(PartialWriteError);
      expect((error as PartialWriteError<unknown>).completed).toEqual([{ query_id: 'packing-query', name: 'calculatePacking' }]);
      expect(String(error)).toContain('repair it in place; do not recreate');
      expect(fetcher.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
    });

  it('does not claim a successful update when the server drops the target', async () => {
    const { client } = persistenceFixture(toggles);
    await expect(client.updateQuery({ queryId: 'packing-query', versionId: 'app-draft', options: valid })).rejects.toThrow('workflow mapping could not be verified');
  });
});
