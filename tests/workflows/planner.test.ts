import { describe, it, expect, vi } from 'vitest';
import { lint, apply, deleteNode } from '../../src/workflows/planner.js';
import { definition, specSchema } from '../../src/workflows/graph.js';
import type { WorkflowClient, WorkflowSnapshot } from '../../src/workflowClient.js';
import type { QuerySummary } from '../../src/tooljetClient.js';
const spec = () => specSchema.parse({ nodes: [{ ref: 'start', type: 'start' }, { ref: 'q', type: 'javascript', name: 'calculate', code: 'return 42;' }, { ref: 'r', type: 'response', code: 'return {ok:true};' }], edges: [{ ref: 'e1', from: 'start', to: 'q', port: 'default' }, { ref: 'e2', from: 'q', to: 'r', port: 'success' }] });
function fixture() {
  let graph = definition({}); let scope = crypto.randomUUID();
  const queries: QuerySummary[] = [];
  const client = {
    planScope: async () => scope,
    get: vi.fn(async () => ({ workflow_id: 'w', version_id: 'v', workspace_id: 'org', environment_id: 'env', editable: true, enabled: true, editor_url: 'url', definition: structuredClone(graph) }) as WorkflowSnapshot),
    listDatasources: vi.fn(async () => [{ id: 'js', kind: 'runjs', name: 'JS', settings_url: '' }]),
    getQueries: vi.fn(async () => structuredClone(queries)),
    createWorkflowQuery: vi.fn(async (p) => { const id = crypto.randomUUID(); queries.push({ id, name: p.name, kind: p.kind, data_source_id: p.dataSourceId, options: p.options }); return { query_id: id, name: p.name }; }),
    updateQuery: vi.fn(async p => { Object.assign(queries.find(q => q.id === p.queryId)!, { name: p.name, options: p.options }); return { query_id: p.queryId }; }),
    deleteQuery: vi.fn(async ({ queryId }) => { const index = queries.findIndex((query) => query.id === queryId); if (index >= 0) queries.splice(index, 1); return { deleted: true }; }),
    save: vi.fn(async (_snapshot, value) => { graph = structuredClone(value); }),
  } as unknown as WorkflowClient;
  return { client, queries, setScope: () => { scope = crypto.randomUUID(); } };
}
async function token(client: WorkflowClient) { const result = await lint(client, 'w', 'v', spec()); expect(result).toHaveProperty('plan_token'); return (result as { plan_token: string }).plan_token; }
describe('workflow planning and recovery', () => {
  it('lint has no writes; apply persists mappings and verifies readback', async () => {
    const { client } = fixture(); const t = await token(client);
    expect(client.createWorkflowQuery).not.toHaveBeenCalled(); expect(client.save).not.toHaveBeenCalled();
    const result = await apply(client, t);
    expect(result).not.toHaveProperty('failed'); expect(client.createWorkflowQuery).toHaveBeenCalledTimes(1);
    expect((await client.get('w', 'v')).definition.queries[0].id).not.toMatch(/^pending:/);
    await expect(apply(client, t)).rejects.toThrow('consumed');
  });
  it('rejects a token from another identity/workspace', async () => {
    const { client, setScope } = fixture(); const t = await token(client); setScope();
    await expect(apply(client, t)).rejects.toThrow('scoped'); expect(client.createWorkflowQuery).not.toHaveBeenCalled();
  });
  it('only one simultaneous apply can consume a plan', async () => {
    const { client } = fixture(); const t = await token(client);
    const results = await Promise.allSettled([apply(client, t), apply(client, t)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(client.createWorkflowQuery).toHaveBeenCalledTimes(1);
  });
  it('reports created queries if the graph save fails, without deleting resources', async () => {
    const { client, queries } = fixture(); const t = await token(client);
    vi.mocked(client.save).mockRejectedValueOnce(new Error('network outcome unknown'));
    const result = await apply(client, t);
    expect(result).toMatchObject({ failed: true, phase: 'save', graph_persistence: 'unknown' });
    expect(result.completed).toHaveLength(1); expect(queries).toHaveLength(1);
  });
  it('reports uncertain query attempts and never retries them', async () => {
    const { client } = fixture(); const t = await token(client);
    vi.mocked(client.createWorkflowQuery).mockRejectedValueOnce(new Error('timeout'));
    const result = await apply(client, t);
    expect(result).toMatchObject({ failed: true, phase: 'queries', attempted_query: { name: 'calculate' } });
    expect(client.save).not.toHaveBeenCalled(); expect(client.createWorkflowQuery).toHaveBeenCalledTimes(1);
  });
  it('updates an existing query without creating another query or changing IDs', async () => {
    const { client } = fixture(); const first = await apply(client, await token(client));
    const original = (await client.get('w', 'v')).definition;
    const result = await lint(client, 'w', 'v', specSchema.parse({ nodes: [{ ref: 'q', existing_id: first.node_ids.q, type: 'javascript', name: 'calculate', code: 'return 100;' }] }));
    await apply(client, (result as { plan_token: string }).plan_token);
    expect(client.createWorkflowQuery).toHaveBeenCalledTimes(1); expect(client.updateQuery).toHaveBeenCalledTimes(1);
    expect((await client.get('w', 'v')).definition.nodes.map(n => n.id)).toEqual(original.nodes.map(n => n.id));
  });
  it('refuses noneditable versions before query writes', async () => {
    const { client } = fixture(); const t = await token(client);
    const value = await client.get('w', 'v'); vi.mocked(client.get).mockResolvedValue({ ...value, editable: false });
    await expect(apply(client, t)).rejects.toThrow('editable draft'); expect(client.createWorkflowQuery).not.toHaveBeenCalled();
  });
  it('does not issue a plan for invalid graph structure', async () => {
    const { client } = fixture(); const invalid = spec(); invalid.edges[0].port = 'true';
    const result = await lint(client, 'w', 'v', invalid);
    expect(result.errors.length).toBeGreaterThan(0); expect(result).not.toHaveProperty('plan_token');
  });
  it('deletes a query node, its incident edges, and its query after graph persistence', async () => {
    const { client, queries } = fixture(); const created = await apply(client, await token(client));
    const result = await deleteNode(client, 'w', 'v', created.node_ids.q);
    expect(result).not.toHaveProperty('failed');
    expect(client.deleteQuery).toHaveBeenCalledWith({ queryId: created.completed[0].query_id, versionId: 'v' });
    expect(queries).toEqual([]);
    const graph = (await client.get('w', 'v')).definition;
    expect(graph.nodes.map((node) => node.id)).not.toContain(created.node_ids.q);
    expect(graph.edges.some((edge) => edge.source === created.node_ids.q || edge.target === created.node_ids.q)).toBe(false);
    expect(graph.queries).toEqual([]);
  });
});
