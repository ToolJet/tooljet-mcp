import { describe, it, expect, vi } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { hubspotSpecs } from '../src/hubspotQuery.js';
import { inspectDatasourceSchemaTool } from '../src/tools/inspectDatasourceSchema.js';
import { runQueryTool } from '../src/tools/runQuery.js';
import { batchSafeRead } from '../src/tools/runQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// Independent synthetic support-desk schema; no customer records or trace payloads.
const spec = {
  openapi: '3.0.0',
  paths: {
    '/crm/v3/objects/tickets': {
      get: {
        summary: 'List service cases',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { content: { 'application/json': { schema: {
          type: 'object', properties: { results: { type: 'array', items: { type: 'object' } } },
        } } } } },
      },
      post: { requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', properties: { properties: { type: 'object' } },
      } } } } },
    },
    '/crm/v3/objects/tickets/{ticketId}': {
      patch: { parameters: [{ name: 'ticketId', in: 'path', required: true, schema: { type: 'string' } }] },
    },
  },
};
const options = () => ({
  specType: 'tickets', operation: 'get', path: '/crm/v3/objects/tickets',
  params: { path: {}, query: { limit: 7 }, request: {} },
});
const query = (patch = {}) => ({ id: 'query-cases', kind: 'hubspot', options: { ...options(), ...patch } });
function fakeClient() {
  return {
    listDatasources: vi.fn().mockResolvedValue([{ id: 'source-cases', kind: 'hubspot' }]),
    getPluginSpec: vi.fn().mockResolvedValue(JSON.stringify(spec)),
    getQuery: vi.fn().mockResolvedValue(query()),
    getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env-test'),
    runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: { results: [] } }),
  };
}

describe('HubSpot endpoint discovery', () => {
  const args = { version_id: 'version-test', datasource_id: 'source-cases' };
  it('lists all spec groups without fetching records or the documents', async () => {
    const c = fakeClient();
    const result = await inspectDatasourceSchemaTool(c as unknown as ToolJetClient).handler({ ...args, method: 'listTables' });
    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text);
    expect(data.result.specs).toHaveLength(35);
    expect(data.result.specs).toContainEqual({ name: 'tickets', label: 'Tickets', specType: 'tickets' });
    expect(c.getPluginSpec).not.toHaveBeenCalled();
    expect(c.runQuery).not.toHaveBeenCalled();
  });
  it('returns runtime-compatible options and response schema from an installed spec', async () => {
    const c = fakeClient();
    const result = await inspectDatasourceSchemaTool(c as unknown as ToolJetClient).handler({
      ...args, schema: 'Tickets', method: 'getEndpointSchema', table: '/crm/v3/objects/tickets', args: { operation: 'get' },
    });
    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text).result;
    expect(data.query_options).toEqual({ ...options(), params: { path: {}, query: {}, request: {} } });
    expect(data.response.schema.properties.results.type).toBe('array');
    expect(validateQueryOptions('hubspot', data.query_options).errors).toEqual([]);
    expect(c.getPluginSpec).toHaveBeenCalledWith('hubspot', 'tickets');
  });
  it('shares one spec fetch across a metadata batch and includes write parameters', async () => {
    const c = fakeClient();
    const result = await inspectDatasourceSchemaTool(c as unknown as ToolJetClient).handler({ ...args, requests: [
      { schema: 'tickets', method: 'listTables' },
      { schema: 'tickets', method: 'getEndpointSchema', table: '/crm/v3/objects/tickets', args: { operation: 'post' } },
    ] });
    expect(result.isError).not.toBe(true);
    expect(c.getPluginSpec).toHaveBeenCalledTimes(1);
    expect(result.content[0]!.text).toContain('requestBody');
    expect(c.runQuery).not.toHaveBeenCalled();
  });
  it('rejects unknown specs and endpoints rather than returning invented contracts', async () => {
    const c = fakeClient(); const tool = inspectDatasourceSchemaTool(c as unknown as ToolJetClient);
    expect((await tool.handler({ ...args, method: 'listTables', schema: '../../other' })).isError).toBe(true);
    expect(c.getPluginSpec).not.toHaveBeenCalled();
    expect((await tool.handler({ ...args, method: 'getEndpointSchema', schema: 'tickets', table: '/missing', args: { operation: 'get' } })).isError).toBe(true);
    c.getPluginSpec.mockResolvedValue('<html>not a spec</html>');
    expect((await tool.handler({ ...args, method: 'listTables', schema: 'tickets' })).isError).toBe(true);
  });
  it('preserves the exact serialized editor keys for multiword and camel-case labels', () => {
    expect(hubspotSpecs()).toContainEqual({ name: 'webhooks', label: 'WebHooks', specType: 'web_hooks' });
    expect(hubspotSpecs()).toContainEqual({ name: 'blog-posts', label: 'Blog Posts', specType: 'blog _posts' });
  });
});

describe('HubSpot query authoring', () => {
  it('rejects a category selector without an executable endpoint', () => {
    const result = validateQueryOptions('hubspot', { hubspot_operation: 'Tickets', runOnPageLoad: true });
    expect(result.errors.map((e) => e.path)).toEqual(expect.arrayContaining(['operation', 'path', 'specType', 'params.path']));
  });
  it.each(['update', 'create', null, 'GET'])('rejects invalid HTTP operation %s', (operation) => {
    expect(validateQueryOptions('hubspot', { ...options(), operation }).errors.length).toBeGreaterThan(0);
  });
  it('rejects misplaced write inputs and missing path parameters', () => {
    const invalid = { ...options(), operation: 'patch', path: '/crm/v3/objects/tickets/{ticketId}', objectId: 'case-19', properties: { subject: 'Routine maintenance' } };
    const errors = validateQueryOptions('hubspot', invalid).errors;
    expect(errors.map((e) => e.path)).toEqual(expect.arrayContaining(['objectId', 'properties', 'params.path.ticketId']));
  });
  it('accepts a correctly shaped button-triggered write with component bindings', () => {
    const value = { ...options(), operation: 'patch', path: '/crm/v3/objects/tickets/{ticketId}', params: {
      path: { ticketId: '{{components.Cases.selectedRow.id}}' }, query: {},
      request: { properties: { subject: '{{components.Subject.value}}' } },
    } };
    expect(validateQueryOptions('hubspot', value).errors).toEqual([]);
    expect(validateQueryOptions('hubspot', { ...value, runOnPageLoad: true }).errors.map((e) => e.code)).toContain('automatic_hubspot_write');
  });
});

describe('HubSpot execution policy', () => {
  it('recognizes static GET as a remote read, never as batch-safe', () => {
    expect(assessQueryRead(query())).toMatchObject({ provenRead: true, directSafe: false, requiresRemoteReadConfirmation: true, datasourceKind: 'hubspot' });
    expect(batchSafeRead(query()).safe).toBe(false);
  });
  it.each(['post', 'patch', 'put', 'delete'])('refuses %s during MCP verification', (operation) => {
    expect(assessQueryRead(query({ operation })).provenRead).toBe(false);
  });
  it('refuses malformed options and dynamic request parameters', () => {
    expect(assessQueryRead(query({ params: undefined })).provenRead).toBe(false);
    expect(assessQueryRead(query({ params: { path: {}, query: { limit: '{{components.PageSize.value}}' }, request: {} } })).provenRead).toBe(false);
  });
  it('executes a saved GET only after explicit remote-read approval', async () => {
    const c = fakeClient(); const tool = runQueryTool(c as unknown as ToolJetClient);
    const args = { query_id: 'query-cases', version_id: 'version-test' };
    expect((await tool.handler(args)).isError).toBe(true);
    expect(c.runQuery).not.toHaveBeenCalled();
    expect((await tool.handler({ ...args, user_confirmed_remote_read: true })).isError).not.toBe(true);
    expect(c.runQuery).toHaveBeenCalledTimes(1);
    c.getQuery.mockResolvedValue(query({ operation: 'post' }));
    expect((await tool.handler({ ...args, user_confirmed_remote_read: true })).isError).toBe(true);
    expect(c.runQuery).toHaveBeenCalledTimes(1);
  });
});
