import { describe, expect, it, vi } from 'vitest';
import { workflowTools } from '../../src/tools/workflows.js';
import type { ToolJetClient } from '../../src/tooljetClient.js';

const VERSION_ID = '11111111-1111-4111-8111-111111111111';

describe('workflow tools', () => {
  it('returns configured workflow capabilities without secrets', async () => {
    const listDatasources = vi.fn(async () => [{
      id: '22222222-2222-4222-8222-222222222222',
      name: 'OpenAI',
      kind: 'openai',
      apiKey: 'secret',
      password: 'secret',
    }]);
    const client = { workflows: { listDatasources } } as unknown as ToolJetClient;
    const tool = workflowTools(client).find((candidate) => candidate.name === 'get_workflow_capabilities');

    expect(tool).toBeDefined();
    const result = await tool!.handler({ version_id: VERSION_ID });
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
    const tool = workflowTools(client).find((candidate) => candidate.name === 'lint_workflow_spec');
    expect(tool?.inputSchema).toHaveProperty('allow_draft');
    expect(tool?.description).toMatch(/runtime prerequisites.*allow_draft/is);
  });
});
