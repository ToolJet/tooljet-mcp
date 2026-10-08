import { describe, expect, it, vi } from 'vitest';
import { getWorkflowNodeCatalogTool } from '../../src/tools/getWorkflowNodeCatalog.js';
import { getWorkflowCapabilitiesTool } from '../../src/tools/getWorkflowCapabilities.js';
import { listWorkflowsTool } from '../../src/tools/listWorkflows.js';
import { createWorkflowTool } from '../../src/tools/createWorkflow.js';
import { getWorkflowTool } from '../../src/tools/getWorkflow.js';
import { lintWorkflowSpecTool } from '../../src/tools/lintWorkflowSpec.js';
import { applyWorkflowSpecTool } from '../../src/tools/applyWorkflowSpec.js';
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
