import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { runQueryTool } from '../src/tools/runQuery.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import { redactQueryText, redactRunResult, redactUrl } from '../src/resultRedaction.js';

/*
  run_query returned a REST query's metadata.request (URL with ?api_key=, headers the plugin did not recognise as
  secret), metadata.queryDefinition (the URL again) and, on a failure, requestObject.requestHeaders and the raw
  responseHeaders with Set-Cookie. The rows stay; the credentials around them go.
*/
const SECRET = 'synthetic-redaction-marker';
const restResult = () => ({
  status: 'ok',
  data: [{ id: 1, email: 'row@example.com' }],
  metadata: {
    request: {
      url: `https://api.example.com/v1/orders?page=2&api_key=${SECRET}`,
      method: 'GET',
      headers: { 'X-Custom-Auth': SECRET, authorization: `Bearer ${SECRET}`, Accept: 'application/json' },
      params: { page: '2', api_key: SECRET },
    },
    response: { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': `sid=${SECRET}`, 'X-Total-Count': '42', 'X-Internal-Token': SECRET } },
    queryDefinition: `https://user:${SECRET}@api.example.com/v1/orders?token=${SECRET}&page=2`,
  },
});
const failedResult = () => ({
  status: 'failed',
  message: `Query could not be completed: GET https://api.example.com/x?access_token=${SECRET} failed`,
  description: `401 for https://api.example.com/x?apikey=${SECRET}`,
  data: {
    requestObject: { requestUrl: 'https://api.example.com/x', requestHeaders: { 'x-api-key': SECRET, Cookie: `a=${SECRET}` }, requestParams: { apikey: SECRET, q: 'open' } },
    responseObject: { statusCode: 401, responseBody: '{"error":"bad key"}', headers: { 'set-cookie': `s=${SECRET}`, 'content-type': 'application/json' } },
    responseHeaders: { 'set-cookie': `s=${SECRET}`, 'retry-after': '30' },
  },
  metadata: { request: { requestUrl: 'https://api.example.com/x', requestHeaders: { Authorization: `Basic ${SECRET}` } } },
});

describe('redactRunResult', () => {
  it('keeps the rows, status, paging and the allowlisted response headers, and drops every secret', () => {
    const out = redactRunResult(restResult());
    const text = JSON.stringify(out);
    expect(text).not.toContain(SECRET);
    expect(out.data).toEqual([{ id: 1, email: 'row@example.com' }]);
    expect(out.metadata.request).toEqual({ method: 'GET', url: 'https://api.example.com/v1/orders?page=2&api_key=%5Bredacted%5D', params: { page: '2', api_key: '[redacted]' } });
    expect(out.metadata.response).toEqual({ statusCode: 200, headers: { 'Content-Type': 'application/json', 'X-Total-Count': '42' } });
    expect(out.metadata.queryDefinition).toBe('https://api.example.com/v1/orders?token=%5Bredacted%5D&page=2');
  });

  it('cleans a failed REST run: request headers, cookies, URL secrets in the message', () => {
    const out = redactRunResult(failedResult());
    expect(JSON.stringify(out)).not.toContain(SECRET);
    expect(out.data.requestObject).toEqual({ requestUrl: 'https://api.example.com/x', requestParams: { apikey: '[redacted]', q: 'open' } });
    expect(out.data.responseObject).toEqual({ statusCode: 401, responseBody: '{"error":"bad key"}', headers: { 'content-type': 'application/json' } });
    expect(out.data.responseHeaders).toEqual({ 'retry-after': '30' });
    expect(out.message).toContain('access_token=[redacted]');
  });

  it('redacts URLs and free text', () => {
    expect(redactUrl('postgres://admin:hunter2@db.internal:5432/app')).not.toContain('hunter2');
    expect(redactQueryText('connect postgres://admin:hunter2@db.internal/app failed')).not.toContain('hunter2');
    expect(redactQueryText('header Authorization: Bearer abcdefghijklmnop')).not.toContain('abcdefghijklmnop');
    expect(redactQueryText('GET /orders?page=2&limit=10')).toBe('GET /orders?page=2&limit=10');
  });
});

describe('run_query and run_queries return redacted results', () => {
  const restQuery = {
    id: 'q1', name: 'orders', kind: 'restapi', data_source_id: 'ds',
    options: { method: 'get', url: 'https://api.example.com/v1/orders', url_params: [['page', '2']] },
  };
  it('run_query, a confirmed REST read', async () => {
    const client = { getQuery: vi.fn().mockResolvedValue(restQuery), runQuery: vi.fn().mockResolvedValue(restResult()) };
    const result = await runQueryTool(client as unknown as ToolJetClient).handler({ query_id: 'q1', version_id: 'v1', user_confirmed_remote_read: true });
    const text = result.content[0]!.text;
    expect(result.isError).toBeFalsy();
    expect(text).not.toContain(SECRET);
    expect(text).toContain('row@example.com');
  });

  it('run_queries, an automatic read that failed', async () => {
    const sql = { id: 'q2', name: 'list', kind: 'postgresql', data_source_id: 'pg', options: { mode: 'sql', query: 'SELECT id FROM orders ORDER BY id LIMIT 5' } };
    const client = {
      getQueries: vi.fn().mockResolvedValue([sql]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env'),
      runQuery: vi.fn().mockResolvedValue(failedResult()),
      getDataSourceSchema: vi.fn().mockResolvedValue(undefined),
    };
    const result = await runQueriesTool(client as unknown as ToolJetClient).handler({ app_id: 'a', version_id: 'v1', query_ids: ['q2'] } as any);
    expect(client.runQuery).toHaveBeenCalledOnce();
    expect(result.content[0]!.text).toContain('requestParams');
    expect(result.content[0]!.text).not.toContain(SECRET);
  });
});
