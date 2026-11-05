import { describe, expect, it, vi } from 'vitest';
import { getWorkflowNodeCatalogTool } from '../../src/tools/getWorkflowNodeCatalog.js';
import { getWorkflowCapabilitiesTool } from '../../src/tools/getWorkflowCapabilities.js';
import { listWorkflowsTool } from '../../src/tools/listWorkflows.js';
import { createWorkflowTool } from '../../src/tools/createWorkflow.js';
import { getWorkflowTool } from '../../src/tools/getWorkflow.js';
import { lintWorkflowSpecTool } from '../../src/tools/lintWorkflowSpec.js';
import { applyWorkflowSpecTool, workflowMutationTools } from '../../src/tools/applyWorkflowSpec.js';
import { deleteWorkflowNodeTool } from '../../src/tools/deleteWorkflowNode.js';
import { validateWorkflowTool } from '../../src/tools/validateWorkflow.js';
import { runWorkflowTool } from '../../src/tools/runWorkflow.js';
import { getWorkflowExecutionTool } from '../../src/tools/getWorkflowExecution.js';
import type { ToolJetClient } from '../../src/tooljetClient.js';

const planner = vi.hoisted(() => ({
  apply: vi.fn(),
  deleteNode: vi.fn(),
  lint: vi.fn(),
}));

vi.mock('../../src/workflows/planner.js', () => planner);

const VERSION_ID = '11111111-1111-4111-8111-111111111111';

describe('workflow tools', () => {
  const edits = [
    ['upsert_workflow_start_node', { node: { ref: 'begin' } }, { nodes: [{ ref: 'begin', type: 'start' }] }],
    ['upsert_workflow_javascript_node', { node: { ref: 'compute', name: 'computeMass', code: 'return 12;' } }, { nodes: [{ type: 'javascript' }] }],
    ['upsert_workflow_query_node', { node: { ref: 'read', name: 'readStars', datasource_id: 'catalog-source', options: { query: 'SELECT radius FROM stars LIMIT 4' } } }, { nodes: [{ type: 'query' }] }],
    ['upsert_workflow_loop_node', { node: { ref: 'loop', name: 'orbitLoop', iteration_values_code: 'return [3, 5];', code: 'return value;' } }, { nodes: [{ type: 'loop' }] }],
    ['upsert_workflow_condition_node', { node: { ref: 'check', code: 'true' } }, { nodes: [{ type: 'condition' }] }],
    ['upsert_workflow_response_node', { node: { ref: 'result', code: 'return { mass: 12 };' } }, { nodes: [{ type: 'response' }] }],
    ['upsert_workflow_agent_node', { node: { ref: 'assistant', system_prompt: 'Summarize synthetic star measurements.' } }, { nodes: [{ type: 'agent' }] }],
    ['upsert_workflow_edge', { edge: { ref: 'link', from: 'begin-node', to: 'read-node', port: 'default' } }, { edges: [{ ref: 'link' }] }],
    ['delete_workflow_edge', { edge_id: 'old-link' }, { remove_edge_ids: ['old-link'] }],
    ['set_workflow_test_parameters', { parameters: { radius: 4 } }, { test_parameters: { radius: 4 } }],
  ] as const;

  it.each(edits)('exposes the fixed authoring action %s through the existing planner', async (name, input, expected) => {
    planner.lint.mockReset().mockResolvedValue({ plan_token: VERSION_ID });
    planner.apply.mockReset().mockResolvedValue({ validation: { errors: [] } });
    const client = { workflows: {} } as unknown as ToolJetClient;
    const tool = workflowMutationTools(client).find(t => t.name === name)!;
    const args = { workflow_id: VERSION_ID, version_id: VERSION_ID, ...input };
    const result = await tool.handler(args);
    expect(result.isError).not.toBe(true);
    expect(planner.lint).toHaveBeenCalledOnce();
    expect(planner.lint.mock.calls[0]!.slice(0, 3)).toEqual([client.workflows, VERSION_ID, VERSION_ID]);
    expect(planner.lint.mock.calls[0]![3]).toMatchObject(expected);
    expect(planner.lint.mock.calls[0]![4]).toBe(true);
    expect(planner.apply).toHaveBeenCalledExactlyOnceWith(client.workflows, VERSION_ID);
    expect((await tool.handler({ ...args, spec: { remove_node_ids: ['unrelated-node'] } })).isError).toBe(true);
    if ('node' in args) expect((await tool.handler({ ...args, node: { ...args.node, type: 'query' } })).isError).toBe(true);
    expect(planner.apply).toHaveBeenCalledOnce();
  });

  it('does not apply a fixed authoring operation when lint rejects it', async () => {
    planner.lint.mockReset().mockResolvedValue({ errors: [{ message: 'Version is not editable' }] });
    planner.apply.mockReset();
    const tool = workflowMutationTools({ workflows: {} } as ToolJetClient)[0]!;
    const result = await tool.handler({ workflow_id: VERSION_ID, version_id: VERSION_ID, node: { ref: 'begin' } });
    expect(result.isError).toBe(true);
    expect(planner.apply).not.toHaveBeenCalled();
  });

  it('preserves failed partial writes from a fixed authoring operation', async () => {
    planner.lint.mockReset().mockResolvedValue({ plan_token: VERSION_ID });
    planner.apply.mockReset().mockResolvedValue({ failed: true, completed: [{ query_id: 'partial-query' }] });
    const tool = workflowMutationTools({ workflows: {} } as ToolJetClient)[0]!;
    const result = await tool.handler({ workflow_id: VERSION_ID, version_id: VERSION_ID, node: { ref: 'begin' } });
    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({ failed: true, completed: [{ query_id: 'partial-query' }] });
  });
  it('keeps one public factory per workflow tool', () => {
    const client = { workflows: {} } as unknown as ToolJetClient;
    const names = [
      getWorkflowNodeCatalogTool(client),
      getWorkflowCapabilitiesTool(client),
      listWorkflowsTool(client),
      createWorkflowTool(client),
      getWorkflowTool(client),
      lintWorkflowSpecTool(client),
      applyWorkflowSpecTool(client),
      deleteWorkflowNodeTool(client),
      validateWorkflowTool(client),
      runWorkflowTool(client),
      getWorkflowExecutionTool(client),
    ].map((tool) => tool.name);

    expect(names).toEqual([
      'get_workflow_node_catalog',
      'get_workflow_capabilities',
      'list_workflows',
      'create_workflow',
      'get_workflow',
      'lint_workflow_spec',
      'apply_workflow_spec',
      'delete_workflow_node',
      'validate_workflow',
      'run_workflow',
      'get_workflow_execution',
    ]);
  });

  it('returns configured workflow capabilities without secrets', async () => {
    const listDatasources = vi.fn(async () => [{
      id: '22222222-2222-4222-8222-222222222222',
      name: 'OpenAI',
      kind: 'openai',
      apiKey: 'secret',
      password: 'secret',
    }]);
    const client = { workflows: { listDatasources } } as unknown as ToolJetClient;
    const tool = getWorkflowCapabilitiesTool(client);

    const result = await tool.handler({ version_id: VERSION_ID });
    const body = JSON.parse(result.content[0].text);

    expect(body.datasources[0]).toEqual({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'OpenAI',
      kind: 'openai',
      capabilities: ['query', 'ai-model'],
    });
    expect(JSON.stringify(body)).not.toMatch(/apiKey|password|pat|token/i);
    expect(listDatasources).toHaveBeenCalledWith(VERSION_ID);
  });
  it('exposes explicit draft permission on workflow lint', () => {
    const client = { workflows: {} } as unknown as ToolJetClient;
    const tool = lintWorkflowSpecTool(client);
    expect(tool?.inputSchema).toHaveProperty('allow_draft');
    expect(tool?.description).toMatch(/runtime prerequisites.*allow_draft/is);
  });

  it('rejects unknown workflow capability inputs before calling ToolJet', async () => {
    const listDatasources = vi.fn();
    const tool = getWorkflowCapabilitiesTool({ workflows: { listDatasources } } as unknown as ToolJetClient);

    const result = await tool.handler({ version_id: VERSION_ID, unexpected: true });

    expect(result.isError).toBe(true);
    expect(listDatasources).not.toHaveBeenCalled();
  });

  it('uses the established list workflow defaults', async () => {
    const list = vi.fn(async () => ({ workflows: [] }));
    const tool = listWorkflowsTool({ workflows: { list } } as unknown as ToolJetClient);

    const result = await tool.handler({});

    expect(result.isError).toBeUndefined();
    expect(list).toHaveBeenCalledWith(1, '');
  });

  it('preserves partial apply recovery details as an MCP error', async () => {
    planner.apply.mockResolvedValueOnce({
      failed: true,
      completed: { node_ids: { start: 'node-1' } },
      recovery: 'Inspect the saved graph before retrying.',
    });
    const tool = applyWorkflowSpecTool({ workflows: {} } as unknown as ToolJetClient);

    const result = await tool.handler({ plan_token: VERSION_ID });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0]!.text)).toMatchObject({
      failed: true,
      completed: { node_ids: { start: 'node-1' } },
      recovery: 'Inspect the saved graph before retrying.',
    });
  });
});
