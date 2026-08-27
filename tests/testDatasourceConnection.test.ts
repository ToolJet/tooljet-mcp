import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { testDatasourceConnectionTool } from '../src/tools/testDatasourceConnection.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

function clientWith(overrides: Partial<Record<string, unknown>> = {}): ToolJetClient {
  return {
    listDatasources: vi.fn().mockResolvedValue([
      { id: 'pg1', name: 'Postgres', kind: 'postgresql', settings_url: 'http://tj/ws/data-sources/pg1' },
    ]),
    getDatasourceConnectionDetails: vi.fn().mockResolvedValue({
      kind: 'postgresql',
      options: { host: { value: 'localhost' }, password: { credential_id: 'cred-1' } },
    }),
    testDatasourceConnection: vi.fn().mockResolvedValue({ status: 'ok' }),
    ...overrides,
  } as unknown as ToolJetClient;
}

describe('test_datasource_connection tool', () => {
  it('posts the stored options and reports a healthy connection', async () => {
    const client = clientWith();
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(client.testDatasourceConnection).toHaveBeenCalledWith({
      dataSourceId: 'pg1',
      kind: 'postgresql',
      options: { host: { value: 'localhost' }, password: { credential_id: 'cred-1' } },
    });
    expect(textOf(result)).toMatchObject({ status: 'ok', supported: true, datasource: { kind: 'postgresql' } });
  });

  it('omits plugin_id for core datasources and forwards it for marketplace plugins', async () => {
    const client = clientWith({
      getDatasourceConnectionDetails: vi.fn().mockResolvedValue({
        kind: 'openai',
        pluginId: '11111111-1111-1111-1111-111111111111',
        options: { apiKey: { credential_id: 'cred-2' } },
      }),
    });
    await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(client.testDatasourceConnection).toHaveBeenCalledWith(
      expect.objectContaining({ pluginId: '11111111-1111-1111-1111-111111111111' })
    );
  });

  it('reports an unsupported kind instead of a broken connection', async () => {
    const client = clientWith({
      testDatasourceConnection: vi
        .fn()
        .mockResolvedValue({ status: 'failed', message: 'testConnection method not implemented' }),
    });
    const parsed = textOf(
      await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' })
    );
    expect(parsed.supported).toBe(false);
    expect(parsed.status).toBe('unsupported');
    expect(parsed.message).toMatch(/does not implement a connection test/);
    expect(parsed.recovery).toBeUndefined();
  });

  it('returns a repair handoff on a genuine connection failure', async () => {
    const client = clientWith({
      testDatasourceConnection: vi
        .fn()
        .mockResolvedValue({ status: 'failed', message: 'connection refused\n        ' }),
    });
    const parsed = textOf(
      await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' })
    );
    expect(parsed).toMatchObject({
      status: 'failed',
      supported: true,
      message: 'connection refused',
      recovery: { action: 'open_datasource_settings', url: 'http://tj/ws/data-sources/pg1' },
    });
  });

  it('separates a permission denial from a connection fault', async () => {
    const client = clientWith({
      testDatasourceConnection: vi
        .fn()
        .mockRejectedValue(new Error('ToolJet testDatasourceConnection failed (403): Forbidden')),
    });
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toMatchObject({ status: 'not_permitted' });
  });

  it('rejects a datasource that is not on this version', async () => {
    const client = clientWith();
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'nope' });
    expect(result.isError).toBe(true);
    expect(client.testDatasourceConnection).not.toHaveBeenCalled();
  });
});
