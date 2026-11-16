import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { getDatasourceQuerySchemaTool } from '../src/tools/getDatasourceQuerySchema.js';

// 19 refusals in 20 Code builds (2026-11-04) were a datasource_id sent without version_id: its kind does not depend on it.
describe('get_datasource_query_schema with a datasource_id and no version_id', () => {
  it('resolves the kind from the workspace datasource', async () => {
    const client = { datasourceKind: vi.fn().mockResolvedValue('tooljetdb'), listDatasources: vi.fn() } as unknown as ToolJetClient;
    const result = await getDatasourceQuerySchemaTool(client).handler({ datasource_id: 'tjdb', operation: 'list_rows' } as never);
    expect(result.isError).toBeFalsy();
    expect(client.listDatasources).not.toHaveBeenCalled();
  });

  it('says what to send when the kind cannot be found', async () => {
    const client = { datasourceKind: vi.fn().mockRejectedValue(new Error('403')) } as unknown as ToolJetClient;
    const result = await getDatasourceQuerySchemaTool(client).handler({ datasource_id: 'x' } as never);
    expect(result.content[0]!.text).toMatch(/needs `version_id` \(or pass `kind`/);
  });
});
