import { describe, expect, it, vi } from 'vitest';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { addComponentBatchesTool } from '../src/tools/addComponentBatches.js';
import { addQueriesTool } from '../src/tools/addQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

function fixture() {
  return {
    getAppSummary: vi.fn().mockResolvedValue({ version_id: 'v1', pages: [], queries: [] }),
    getQueries: vi.fn().mockResolvedValue([]),
    listDatasources: vi.fn().mockResolvedValue([{ id: 'js', kind: 'runjs' }]),
    createComponents: vi.fn().mockResolvedValue([]),
    createQueries: vi.fn().mockResolvedValue([]),
  };
}
const field = () => ({ client_ref: 'input_alias', name: 'Project name', type: 'TextInput', properties: {label:'Project name'},
  layout: { left: 2, top: 0, width: 15, height: 60 } });
const button = () => ({ name: 'Save', type: 'Button', properties: { text: 'Save', disabledState: '{{!components.input_alias?.value}}' },
  layout: { left: 20, top: 0, width: 10, height: 40 } });
const context = { app_id: 'app', version_id: 'v1', page_id: 'p1' };
const text = (result: any) => JSON.parse(result.content[0].text);

describe('direct batch binding aliases', () => {
  it('normalizes single-page bindings before lint and persistence without mutating caller input', async () => {
    const mock = fixture(); const components = [field(), button()];
    const result = await addComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, components });
    expect(result.isError, JSON.stringify(result)).toBeUndefined();
    const saved = mock.createComponents.mock.calls[0]![0].components;
    expect(saved[1].properties.disabledState.value).toBe('{{!components["Project name"]?.value}}');
    expect(components[1]!.properties).toHaveProperty('disabledState', '{{!components.input_alias?.value}}');
    expect(mock.getAppSummary).toHaveBeenCalledOnce();
    expect(text(result).warnings.join(' ')).toContain('Resolved explicit binding alias');
  });
  it('resolves cross-page aliases only within the submitted multi-page batch', async () => {
    const mock = fixture();
    const result = await addComponentBatchesTool(mock as unknown as ToolJetClient).handler({ ...context,
      pages: [{ page_id: 'p1', components: [field()] }, { page_id: 'p2', components: [button()] }] });
    expect(result.isError, JSON.stringify(result)).toBeUndefined();
    expect(mock.getAppSummary).toHaveBeenCalledOnce();
    expect(mock.createComponents.mock.calls[1]![0].components[0].properties.disabledState.value).toContain('components["Project name"]');
  });
  it.each(['collision', 'unavailable', 'ambiguous'])('does not guess when component aliases are %s', async scenario => {
    const mock = fixture(); const components = [field(), button()];
    if (scenario === 'collision') mock.getAppSummary.mockResolvedValue({ version_id: 'v1', pages: [{id: 'other', components: [{name: 'input_alias'}]}], queries: [] });
    if (scenario === 'unavailable') mock.getAppSummary.mockRejectedValue(new Error('offline'));
    if (scenario === 'ambiguous') components.push({ ...field(), name: 'Second', layout: {left: 2, top: 100, width: 15, height: 60} });
    await addComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, components });
    expect(mock.createComponents).toHaveBeenCalledOnce();
    for (const [write] of mock.createComponents.mock.calls) expect(write.components[1].properties.disabledState.value).toContain('components.input_alias');
    expect(components[1]!.properties).toHaveProperty('disabledState', '{{!components.input_alias?.value}}');
  });
  it('rejects a multi-page alias write against another editing version', async () => {
    const mock = fixture(); mock.getAppSummary.mockResolvedValue({ version_id: 'v2', pages: [], queries: [] });
    const result = await addComponentBatchesTool(mock as unknown as ToolJetClient).handler({ ...context,
      pages: [{page_id:'p1',components:[field()]},{page_id:'p2',components:[button()]}] });
    expect(result.isError).toBe(true); expect(mock.createComponents).not.toHaveBeenCalled();
  });
  it('resolves query aliases in RunJS but leaves examples and shadowed namespaces alone', async () => {
    const mock = fixture(); const queries = [
      { client_ref: 'source_alias', name: 'Source rows', datasource_id: 'js', options: {code:'return [];'} },
      { name: 'Derived', datasource_id: 'js', options: {code:'return queries.source_alias.data; // queries.source_alias'} },
      { name: 'Example', datasource_id: 'js', options: {code:'const queries={source_alias:1}; return queries.source_alias;'} },
    ];
    const result = await addQueriesTool(mock as unknown as ToolJetClient).handler({version_id:'v1',queries});
    expect(result.isError).toBeUndefined();
    const saved = mock.createQueries.mock.calls[0]![0].queries;
    expect(saved[1].options.code).toBe('return queries["Source rows"].data; // queries.source_alias');
    expect(saved[2].options.code).toBe(queries[2]!.options.code);
    expect(queries[1]!.options.code).toContain('return queries.source_alias');
  });
  it.each(['collision', 'unavailable'])('preserves query bindings when namespace is %s', async scenario => {
    const mock = fixture();
    if (scenario === 'collision') mock.getQueries.mockResolvedValue([{id:'existing',name:'source_alias'}]);
    else mock.getQueries.mockRejectedValue(new Error('offline'));
    const result = await addQueriesTool(mock as unknown as ToolJetClient).handler({version_id:'v1',queries:[
      {client_ref:'source_alias',name:'Source',datasource_id:'js',options:{code:'return [];'}},
      {name:'Derived',datasource_id:'js',options:{code:'return queries.source_alias.data;'}},
    ]});
    expect(result.isError).toBeUndefined();
    expect(mock.createQueries.mock.calls[0]![0].queries[1].options.code).toBe('return queries.source_alias.data;');
  });
  it('does not add a query-list read to batches without explicit aliases', async () => {
    const mock = fixture();
    await addQueriesTool(mock as unknown as ToolJetClient).handler({version_id:'v1',queries:[{name:'Read',datasource_id:'js',options:{code:'return [];'}}]});
    expect(mock.getQueries).not.toHaveBeenCalled();
  });
});
