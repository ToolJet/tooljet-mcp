import { describe, expect, it, vi } from 'vitest';
import { ToolJetHttpError, type ToolJetClient } from '../src/tooljetClient.js';
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

  it('trusts a failed verdict when the catalog confirms the plugin supports the test', async () => {
    const client = clientWith({
      testDatasourceConnection: vi
        .fn()
        .mockResolvedValue({ status: 'failed', message: 'testConnection method not implemented' }),
    });
    const parsed = textOf(
      await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' })
    );
    expect(parsed.supported).toBe(true);
    expect(parsed.status).toBe('failed');
    expect(parsed.recovery).toMatchObject({ action: 'open_datasource_settings' });
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
        .mockRejectedValue(new ToolJetHttpError(403, 'testDatasourceConnection', 'Forbidden')),
    });
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toMatchObject({ status: 'not_permitted' });
  });

  it('short-circuits a kind the catalog knows has no connection test', async () => {
    const client = clientWith({
      listDatasources: vi.fn().mockResolvedValue([
        { id: 'api1', name: 'REST', kind: 'restapi', settings_url: 'http://tj/ws/data-sources/api1' },
      ]),
    });
    const parsed = textOf(
      await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'api1' })
    );
    expect(parsed).toMatchObject({ supported: false, status: 'unsupported' });
    expect(parsed.message).toMatch(/does not implement a connection test/);
    // The whole point of the flag: no HTTP round-trip to learn "not applicable".
    expect(client.getDatasourceConnectionDetails).not.toHaveBeenCalled();
    expect(client.testDatasourceConnection).not.toHaveBeenCalled();
  });

  it('still tests a kind the catalog does not know, rather than assuming', async () => {
    const client = clientWith({
      listDatasources: vi.fn().mockResolvedValue([
        { id: 'x1', name: 'Unlisted', kind: 'not-in-the-catalog', settings_url: 'http://tj/ws/data-sources/x1' },
      ]),
    });
    const parsed = textOf(
      await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'x1' })
    );
    // An undefined flag is a stale catalog, not a claim that the plugin lacks the method.
    expect(client.testDatasourceConnection).toHaveBeenCalled();
    expect(parsed.status).toBe('ok');
  });

  it('keeps a failed result inconclusive when the catalog cannot prove test support', async () => {
    const client = clientWith({
      listDatasources: vi.fn().mockResolvedValue([
        { id: 'x1', name: 'Unlisted', kind: 'not-in-the-catalog', settings_url: 'http://tj/ws/data-sources/x1' },
      ]),
      testDatasourceConnection: vi.fn().mockResolvedValue({ status: 'failed', message: 'unknown result' }),
    });
    const parsed = textOf(
      await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'x1' })
    );
    expect(parsed.status).toBe('inconclusive');
    expect(parsed.verification).toMatchObject({ requires_user_approval: true });
  });

  it.each([401, 403, 500])('keeps a %i connection-detail failure as an MCP error', async (status) => {
    const client = clientWith({
      getDatasourceConnectionDetails: vi
        .fn()
        .mockRejectedValue(new ToolJetHttpError(status, 'getDatasourceConnectionDetails', 'Request failed')),
    });
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain(`failed (${status})`);
    expect(client.testDatasourceConnection).not.toHaveBeenCalled();
  });

  it.each([404, 501])('reports a %i from the test endpoint as unsupported', async (status) => {
    const client = clientWith({
      testDatasourceConnection: vi
        .fn()
        .mockRejectedValue(new ToolJetHttpError(status, 'testDatasourceConnection', 'Unavailable')),
    });
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toMatchObject({ status: 'unsupported', supported: false });
  });

  it.each([401, 408, 429, 500])('keeps a %i test-endpoint failure as an MCP error', async (status) => {
    const client = clientWith({
      testDatasourceConnection: vi
        .fn()
        .mockRejectedValue(new ToolJetHttpError(status, 'testDatasourceConnection', 'Request failed')),
    });
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain(`failed (${status})`);
  });

  it('keeps a transport failure as an MCP error', async () => {
    const client = clientWith({ testDatasourceConnection: vi.fn().mockRejectedValue(new Error('fetch failed')) });
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'pg1' });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toBe('Error: fetch failed');
  });

  it('rejects a datasource that is not on this version', async () => {
    const client = clientWith();
    const result = await testDatasourceConnectionTool(client).handler({ version_id: 'v1', datasource_id: 'nope' });
    expect(result.isError).toBe(true);
    expect(client.testDatasourceConnection).not.toHaveBeenCalled();
  });
});
