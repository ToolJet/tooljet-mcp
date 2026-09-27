import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';
import { selectDatasourceQuerySchema } from '../src/datasourceCatalog.js';
import { inspectDatasourceSchemaTool } from '../src/tools/inspectDatasourceSchema.js';
import { clearKindSpecCache } from '../src/specEndpointKinds.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// Stripe build (Luna, 2026-09-27): both arms stopped without building. The query schema said Stripe's operations live
// in its remote API spec and to "inspect the datasource in ToolJet or the spec itself", which a build cannot do, and
// inspect_datasource_schema offered no methods for the kind. Single-spec plugins whose editor is ToolJet's API-endpoint
// picker now get HubSpot's discovery: listTables finds endpoints, getEndpointSchema returns query_options to copy.
const spec = {
  openapi: '3.0.0',
  servers: [{ url: 'https://api.example.test/' }],
  paths: {
    '/v1/charges': {
      get: {
        summary: 'List all charges',
        tags: ['Charges'],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }, { name: 'starting_after', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { type: 'object' } }, has_more: { type: 'boolean' } } } } } } },
      },
    },
    '/v1/customers/{customer}': {
      get: { summary: 'Retrieve a customer', parameters: [{ name: 'customer', in: 'path', required: true, schema: { type: 'string' } }] },
    },
  },
};
const args = { version_id: 'version-test', datasource_id: 'source-pay' };
function client(kind: string) {
  return {
    listDatasources: vi.fn().mockResolvedValue([{ id: 'source-pay', kind }]),
    getPluginSpec: vi.fn().mockResolvedValue(JSON.stringify(spec)),
  };
}
const parsed = (result: { content: Array<{ text: string }> }) => JSON.parse(result.content[0]!.text);

afterEach(() => { vi.unstubAllGlobals(); clearKindSpecCache(); });

describe('endpoint discovery for single-spec plugins', () => {
  it('Stripe: finds endpoints in the remote spec and returns runtime query options without host or auth', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify(spec), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    const c = client('stripe');
    const tool = inspectDatasourceSchemaTool(c as unknown as ToolJetClient);
    const listed = parsed(await tool.handler({ ...args, method: 'listTables', search: 'charges' }));
    expect(JSON.stringify(listed)).toContain('/v1/charges');
    const endpoint = parsed(await tool.handler({ ...args, method: 'getEndpointSchema', table: '/v1/charges', args: { operation: 'get' } })).result;
    expect(endpoint.query_options).toEqual({ operation: 'get', path: '/v1/charges', params: { path: {}, query: {}, request: {} } });
    expect(validateQueryOptions('stripe', endpoint.query_options).errors).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // one fetch, cached across calls
    expect(c.getPluginSpec).not.toHaveBeenCalled();
  });
  it('a bundled spec (Gmail) is read from the ToolJet server', async () => {
    const c = client('gmail');
    const result = await inspectDatasourceSchemaTool(c as unknown as ToolJetClient).handler({ ...args, method: 'listTables' });
    expect(result.isError).not.toBe(true);
    expect(c.getPluginSpec).toHaveBeenCalledWith('gmail', expect.any(String));
  });
  it('the query schema says how to discover, not to inspect the spec by hand', () => {
    const schema = selectDatasourceQuerySchema('stripe') as Record<string, any>;
    expect(schema.operation_selection.description).toMatch(/inspect_datasource_schema/);
    expect(schema.operation_selection.description).toMatch(/getEndpointSchema/);
    expect(schema.introspection_methods ?? schema.operation_selection.introspection_methods).toEqual(expect.arrayContaining(['listTables', 'getEndpointSchema']));
  });
});

describe('query options for single-spec plugins', () => {
  const good = { operation: 'get', path: '/v1/charges', params: { path: {}, query: { limit: '100' }, request: {} } };
  it('accepts the editor shape', () => {
    expect(validateQueryOptions('stripe', good).errors).toEqual([]);
  });
  it('rejects a missing params bucket (the plugin reads every one), a made-up operation and a URL for a path', () => {
    const paths = (options: Record<string, unknown>) => validateQueryOptions('stripe', options).errors.map((e) => e.path);
    expect(paths({ ...good, params: { query: {} } })).toEqual(expect.arrayContaining(['params.path', 'params.request']));
    expect(paths({ ...good, operation: 'list_charges' })).toContain('operation');
    expect(paths({ ...good, path: 'https://api.stripe.com/v1/charges' })).toContain('path');
  });
});

// Same build: run_query refused every Stripe query ("no proven read classifier"), so neither arm could check a single
// query before handing over. A static GET is a remote read, previewed with confirmation, as HubSpot's is.
import { assessQueryRead } from '../src/queryExecutionSafety.js';
describe('previewing single-spec plugin queries', () => {
  const q = (options: Record<string, unknown>) => ({ id: 'q-pay', kind: 'stripe', options }) as never;
  const get = { operation: 'get', path: '/v1/customers', params: { path: {}, query: { limit: '100' }, request: {} } };
  it('a static GET is a proven remote read', () => {
    expect(assessQueryRead(q(get))).toMatchObject({ provenRead: true, directSafe: false, requiresRemoteReadConfirmation: true, datasourceKind: 'stripe' });
  });
  it('a write, a bound path or a malformed query is not', () => {
    expect(assessQueryRead(q({ ...get, operation: 'post' })).provenRead).toBe(false);
    expect(assessQueryRead(q({ ...get, params: { query: {} } })).provenRead).toBe(false);
  });
});
