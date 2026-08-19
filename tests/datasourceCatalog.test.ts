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

  it('expands ToolJet DB list_rows nested records and aggregate response aliases', () => {
    const listRows = selectDatasourceQuerySchema('tooljetdb', { operation: 'list_rows' }) as any;
    const fields = listRows.request.variants[0].fields;

    expect(fields['list_rows.where_filters'].shape['<filter-id>']).toMatchObject({
      column: 'string',
      operator: expect.stringContaining('ilike'),
    });
    expect(fields['list_rows.order_filters'].shape['<sort-id>'].order).toBe('asc|desc');
    expect(fields['list_rows.order_filters'].description).toMatch(/outer map key.*match.*inner id.*silently ignore/i);
    expect(fields['list_rows.aggregates'].shape['<aggregate-id>'].aggFx).toBe('sum|count');
    expect(fields['list_rows.group_by'].example).toEqual({ 'group-status': ['status'] });
    expect(listRows.response.description).toContain('<table_name>_<column>_<aggFx>');
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

  it('publishes exact REST tuple fields, current raw body, and diagnostic metadata', () => {
    const rest = selectDatasourceQuerySchema('restapi', { operation: 'get' }) as any;
    const fields = rest.request.variants[0].fields;

    expect(fields.url_params).toMatchObject({
      type: 'array<[string,unknown]>',
      shape: { '<index>': ['string|binding', 'unknown|binding'] },
      example: [['state', 'open'], ['per_page', '25']],
    });
    expect(fields.headers.shape['<index>']).toHaveLength(2);
    expect(fields.cookies.shape['<index>']).toHaveLength(2);
    expect(fields.body.shape['<index>']).toHaveLength(2);
    expect(fields.raw_body.description).toMatch(/preferred raw request body/i);
    expect(fields.json_body.description).toMatch(/legacy/i);
    expect(rest.response).toMatchObject({
      type: 'object|array|string',
      status: 'runtime-dependent',
      metadata: {
        status: 'known',
        shape: {
          request: { url: 'string', params: 'record<string,unknown>' },
          response: { statusCode: 'number' },
        },
      },
    });
    expect(rest.request.notes.join(' ')).toMatch(/do not add an operation key/i);
  });

  it('publishes source-derived SQL response shapes and explicit uncertainty', () => {
    const postgres = selectDatasourceQuerySchema('postgresql', { operation: 'list_rows' }) as any;
    expect(postgres.response).toMatchObject({
      type: 'array<object>',
      status: 'known',
      source: 'curated-tooljet-source',
    });

    const mysqlDelete = selectDatasourceQuerySchema('mysql', { operation: 'delete_rows' }) as any;
    expect(mysqlDelete.response).toMatchObject({
      type: 'object',
      status: 'known',
      shape: { deletedRecords: 'number' },
    });

    const runjs = selectDatasourceQuerySchema('runjs', { operation: 'default' }) as any;
    expect(runjs.response).toMatchObject({
      type: 'unknown',
      status: 'runtime-dependent',
      source: 'user-code',
    });
  });

  it('gives every generated operation an honest response status', () => {
    for (const source of getDatasourceCatalog()) {
      const schema = getDatasourceQuerySchema(source.kind)!;
      for (const contract of Object.values(schema.contracts)) {
        expect(contract.response).toBeDefined();
        expect(['known', 'runtime-dependent', 'unknown']).toContain(contract.response!.status);
        expect(contract.response!.source).toBeTruthy();
      }
    }
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
