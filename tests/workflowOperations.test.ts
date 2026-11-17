import { describe, it, expect, vi } from 'vitest';
import { createWorkflowClient } from '../src/workflowClient.js';
const wid = '55389179-e01a-4bed-bd53-c8d6747e2c49';
const vid = '5d0fa7c1-1a34-4c34-808c-dfece543ac8b';
const eid = 'fc18248c-3441-4157-8348-a82e0f0c06f7';
const nid = '4961414e-7c22-4421-820f-6883cf624268';
function setup() {
  const version = {
    id: vid,
    status: 'DRAFT',
    currentEnvironmentId: eid,
    workflowEnabled: false,
    definition: { nodes: [{ id: nid, type: 'input', data: { nodeType: 'start' } }], edges: [], queries: [] },
  };
  const app = {
    id: wid,
    type: 'workflow',
    organizationId: 'workspace',
    isMaintenanceOn: true,
    workflowEnabled: true,
    workflowApiToken: 'synthetic-secret',
    editing_version: version,
  };
  const fetcher = vi.fn(async (path: string, init?: any): Promise<Response> => {
    if (path === '/api/v2/resources/export')
      return Response.json({ app: [{ definition: { appV2: { ...app, appVersions: [version] } } }] });
    if (path.startsWith('/api/apps/') || path.startsWith('/api/v2/apps/')) return Response.json(app);
    return Response.json({ id: eid, status: false, execution_status: 'waiting', approval_request_id: nid });
  });
  const queries = {
    getQueries: vi.fn().mockResolvedValue([]),
    listDatasources: vi.fn().mockResolvedValue([]),
    assertDatasourceAllowed: vi.fn(),
    createQuery: vi.fn(),
    updateQuery: vi.fn(),
    deleteQuery: vi.fn(),
    getDevelopmentEnvironmentId: vi.fn(),
  };
  const client = createWorkflowClient(
    {
      authedFetch: fetcher,
      getOrganizationId: async () => 'workspace',
      getOrganizationSlug: async () => 'workspace',
    } as any,
    { apiUrl: 'http://localhost', appUrl: 'http://localhost', sessionToken: 'synthetic' } as any,
    queries,
  );
  return { client, fetcher, queries, version };
}
describe('workflow operation safety and payloads', () => {
  it('reads branch webhook enablement and keeps credentials opt-in', async () => {
    const { client } = setup();
    expect(await client.webhook(wid)).toMatchObject({ enabled: false });
    expect(await client.webhook(wid)).not.toHaveProperty('token');
    expect(await client.webhook(wid, true)).toHaveProperty('token', 'synthetic-secret');
  });
  it('allows stopping schedules even when datasource preflight would refuse new execution', async () => {
    const { client, fetcher, queries } = setup();
    queries.getQueries.mockRejectedValue(new Error('unavailable'));
    await client.manage('set_workflow_schedule_active', { schedule_id: eid, active: false });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].method).toBe('PUT');
  });
  it('refuses package mutation on published versions and language/type mismatches', async () => {
    const { client, version, fetcher } = setup();
    version.status = 'PUBLISHED';
    await expect(
      client.manage('set_workflow_packages', {
        workflow_id: wid,
        version_id: vid,
        language: 'javascript',
        dependencies: {},
      }),
    ).rejects.toThrow('editable draft');
    expect(fetcher.mock.calls.some(([path]) => path.includes('/packages/'))).toBe(false);
    version.status = 'DRAFT';
    await expect(
      client.manage('set_workflow_packages', {
        workflow_id: wid,
        version_id: vid,
        language: 'python',
        dependencies: {},
      }),
    ).rejects.toThrow('requirements text');
  });
  it('does not execute mismatched preview nodes or internal continuation state', async () => {
    const { client, fetcher } = setup();
    const args = { workflow_id: wid, version_id: vid, environment_id: eid, node_id: wid };
    await expect(client.manage('preview_workflow_node', args)).rejects.toThrow('does not belong');
    await expect(
      client.manage('preview_workflow_node', { ...args, node_id: nid, state: { __humanDecision: {} } }),
    ).rejects.toThrow('resume markers');
    expect(fetcher.mock.calls.some(([path]) => path.endsWith('/previewQueryNode'))).toBe(false);
  });
  it('refuses excluded datasources on preview before any execution', async () => {
    const { client, queries, fetcher } = setup();
    queries.getQueries.mockResolvedValue([{ id: 'query', data_source_id: 'source' }]);
    queries.assertDatasourceAllowed.mockRejectedValue(new Error('excluded'));
    await expect(
      client.manage('preview_workflow_node', { workflow_id: wid, version_id: vid, environment_id: eid, node_id: nid }),
    ).rejects.toThrow('excluded');
    expect(fetcher.mock.calls.some(([path]) => path.endsWith('/previewQueryNode'))).toBe(false);
  });
  it('keeps unknown mutation outcomes non-retriable and surfaces backend failure results', async () => {
    const { client, fetcher } = setup();
    fetcher.mockRejectedValueOnce(new Error('timeout'));
    await expect(client.manage('resolve_workflow_approval', { approval_id: eid, outcome: 'reviewed' })).rejects.toThrow(
      'outcome is unknown',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValueOnce(Response.json({ success: false, message: 'Cannot stop completed execution' }));
    await expect(client.manage('stop_workflow_execution', { execution_id: eid })).rejects.toThrow('Cannot stop');
  });
  it('preserves waiting status and approval identity on polling', async () => {
    const { client } = setup();
    expect((await client.execution(eid)).status).toMatchObject({
      execution_status: 'waiting',
      approval_request_id: nid,
    });
  });
  it('parses SSE frames across CRLF chunk boundaries and caps events', async () => {
    const { client, fetcher } = setup();
    fetcher.mockResolvedValueOnce(Response.json({ status: false }));
    const encoder = new TextEncoder();
    fetcher.mockResolvedValueOnce(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('data: {"node":"first"}\r'));
            controller.enqueue(
              encoder.encode('\n\r\n' + Array.from({ length: 120 }, (_, i) => `data: {"index":${i}}\r\n\r\n`).join('')),
            );
            controller.close();
          },
        }),
      ),
    );
    const result = await client.watch(eid, 1);
    expect(result.events).toHaveLength(100);
    expect(result.events[0]).toEqual({ node: 'first' });
  });
  it('checks the released and named versions before enabling webhooks, while disable stays available', async () => {
    const { client, fetcher, queries, version } = setup();
    const releasedId = 'a695fd06-fb92-4c08-93d7-d4592acdb177';
    const original = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (path, init) => {
      if (path.includes('/versions?includeDefaultBranchVersions=true'))
        return Response.json({ versions: [{ id: vid }, { id: releasedId }] });
      if (path === `/api/apps/${wid}`) {
        const response = await original(path, init);
        return Response.json({ ...(await response.json()), currentVersionId: releasedId });
      }
      if (path === `/api/v2/apps/${wid}/versions/${releasedId}`)
        return Response.json({
          id: wid,
          type: 'workflow',
          organizationId: 'workspace',
          editing_version: { ...version, id: releasedId },
        });
      if (path === '/api/v2/resources/export' && JSON.parse(init.body).app[0].search_params.version_id === releasedId)
        return Response.json({
          app: [
            {
              definition: {
                appV2: {
                  id: wid,
                  type: 'workflow',
                  organizationId: 'workspace',
                  appVersions: [{ ...version, id: releasedId }],
                },
              },
            },
          ],
        });
      return original(path, init);
    });
    queries.getQueries.mockImplementation(async (id) =>
      id === releasedId ? [{ id: 'released-query', data_source_id: 'restricted-source' }] : [],
    );
    queries.assertDatasourceAllowed.mockRejectedValue(new Error('excluded released datasource'));
    await expect(client.manage('set_workflow_webhook_enabled', { workflow_id: wid, enabled: true })).rejects.toThrow(
      'excluded released',
    );
    expect(fetcher.mock.calls.some(([path]) => path.startsWith('/api/v2/webhooks/'))).toBe(false);
    await client.manage('set_workflow_webhook_enabled', { workflow_id: wid, enabled: false });
    expect(fetcher.mock.calls.at(-1)![1].method).toBe('PATCH');
    expect((await client.webhook(wid)).default_trigger).toMatchObject({ version_id: releasedId });
  });
});
