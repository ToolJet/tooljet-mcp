import { describe, it, expect } from 'vitest';
import { getDatasourceCatalog, getDatasourceQuerySchema, selectDatasourceQuerySchema } from '../src/datasourceCatalog.js';
import { getDatasourceQuerySchemaTool } from '../src/tools/getDatasourceQuerySchema.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

function textOf(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe('datasource query catalog', () => {
  it('covers first-party plugins plus ToolJet static datasources', () => {
    const kinds = getDatasourceCatalog().map((source) => source.kind);
    expect(kinds.length).toBeGreaterThanOrEqual(90);
    expect(kinds).toEqual(expect.arrayContaining([
      'postgresql', 'mysql', 'mongodb', 'restapi', 'runjs', 'runpy', 'tooljetdb', 'openai', 'anthropic',
    ]));
  });

  it('serves database GUI operations and generic pagination fields', () => {
    const postgres = getDatasourceQuerySchema('postgresql')!;
    expect(postgres.defaults).toMatchObject({ mode: 'sql' });
    expect(postgres.operations).toEqual(expect.arrayContaining(['list_rows', 'bulk_update_pkey', 'bulk_upsert_pkey']));
    expect(postgres.properties).toHaveProperty('gui.list_rows');

    const tooljetdb = getDatasourceQuerySchema('tooljetdb')!;
    expect(tooljetdb.operations).toEqual(expect.arrayContaining(['join_tables', 'bulk_update_with_primary_key']));
    expect(tooljetdb.properties).toHaveProperty('list_rows.fields.offset');
  });

  it('publishes wrapper-specific AI request and response contracts', () => {
    const openai = selectDatasourceQuerySchema('openai', { operation: 'chat' }) as any;
    expect(openai.request.variants[0].required).toEqual(expect.arrayContaining(['operation', 'model', 'prompt']));
    expect(openai.request.variants[0].fields).toHaveProperty('prompt');
    expect(openai.request.variants[0].fields).not.toHaveProperty('messages');
    expect(openai.response.type).toBe('string|null');

    const anthropic = selectDatasourceQuerySchema('anthropic', { operation: 'chat-v2' }) as any;
    expect(anthropic.request.variants[0].required).toEqual(expect.arrayContaining(['prompt', 'max_size']));
    expect(anthropic.response.type).toBe('array<object>');
  });

  it('tool returns a compact palette, operation contract, and datasource-resolved batch', async () => {
    const client = {
      listDatasources: async () => [
        { id: 'openai-1', name: 'OpenAI', kind: 'openai' },
        { id: 'pg-1', name: 'Postgres', kind: 'postgresql' },
      ],
    } as unknown as ToolJetClient;
    const tool = getDatasourceQuerySchemaTool(client);
    expect(textOf(await tool.handler({}))).toEqual(getDatasourceCatalog());
    expect(textOf(await tool.handler({ kind: 'openai', operation: 'chat' }))).toEqual(
      selectDatasourceQuerySchema('openai', { operation: 'chat' })
    );
    const batched = textOf(await tool.handler({
      version_id: 'v1',
      requests: [
        { datasource_id: 'openai-1', operation: 'chat' },
        { datasource_id: 'pg-1', operation: 'sql', sections: ['request'] },
      ],
    })) as any;
    expect(batched.schemas[0]).toMatchObject({ kind: 'openai' });
    expect(batched.schemas[1]).toHaveProperty('request');
  });
});
