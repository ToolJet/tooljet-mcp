import { describe, expect, it, vi } from 'vitest';
import { getWorkflowCapabilities } from '../../src/workflows/capabilities.js';
import type { ToolJetClient } from '../../src/tooljetClient.js';

const VERSION_ID = '11111111-1111-4111-8111-111111111111';

function fixtureClient(datasources: Array<{ id: string; name: string; kind: string }>) {
  return {
    workflows: { listDatasources: vi.fn(async () => datasources) },
    listTables: vi.fn(),
  } as unknown as ToolJetClient;
}

describe('workflow capability discovery', () => {
  it('classifies only verified provider kinds', async () => {
    const client = fixtureClient([
      { id: 'ai', name: 'AI', kind: 'openai' },
      { id: 'mail', name: 'Mail', kind: 'smtp' },
      { id: 'named-ai', name: 'OpenAI-like', kind: 'restapi' },
    ]);

    const result = await getWorkflowCapabilities(client, { version_id: VERSION_ID });

    expect(result.datasources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'ai', capabilities: ['query', 'ai-model'] }),
      expect.objectContaining({ id: 'mail', capabilities: ['query', 'email'] }),
      expect.objectContaining({ id: 'named-ai', capabilities: ['query'] }),
    ]));
  });

  it('reads no table metadata and sanitizes datasource output', async () => {
    const client = fixtureClient([]);

    const result = await getWorkflowCapabilities(client, { version_id: VERSION_ID });

    expect(client.listTables).not.toHaveBeenCalled();
    expect(result.authorable_node_types).toContain('agent');
  });
});
