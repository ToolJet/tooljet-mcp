import { describe, it, expect } from 'vitest';
import { getDatasourceCatalog, getDatasourceQuerySchema } from '../src/datasourceCatalog.js';
import { getDatasourceQuerySchemaTool } from '../src/tools/getDatasourceQuerySchema.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

function textOf(result: { content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse(result.content[0]!.text);
}

describe('datasource query catalog', () => {
  it('covers first-party plugins plus ToolJet static datasources', () => {
    const kinds = getDatasourceCatalog().map((source) => source.kind);
    expect(kinds.length).toBeGreaterThanOrEqual(45);
    expect(kinds).toEqual(expect.arrayContaining(['postgresql', 'mysql', 'mongodb', 'restapi', 'runjs', 'runpy', 'tooljetdb']));
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

  it('tool returns a compact palette or one full schema', async () => {
    const tool = getDatasourceQuerySchemaTool({} as ToolJetClient);
    expect(textOf(await tool.handler({}))).toEqual(getDatasourceCatalog());
    expect(textOf(await tool.handler({ kind: 'restapi' }))).toEqual(getDatasourceQuerySchema('restapi'));
  });
});
