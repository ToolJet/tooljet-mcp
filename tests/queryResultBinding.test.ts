import { describe, it, expect, vi } from 'vitest';
import { runQueryTool, queryResultBindingHint } from '../src/tools/runQuery.js';
import { runQueriesTool } from '../src/tools/runQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

describe('observed SQL result binding contract', () => {
  it('does not infer SQL shapes for failures, other operations, or other datasources', () => {
    const query = {id: 'q', kind: 'tooljetdb', options: {operation: 'sql_execution'}};
    for (const result of [{status:'failed', data:{results:[]}}, {status:'ok', data:[]},
      {status:'ok', data:{results:null}}, {status:'ok', data:null}]) {
      expect(queryResultBindingHint(query, result)).toBeUndefined();
    }
    for (const changed of [{...query, kind:'postgresql'}, {...query, options:{operation:'list_rows'}}]) {
      expect(queryResultBindingHint(changed, {status:'ok', data:{results:[]}})).toBeUndefined();
    }
  });
  for (const batch of [false, true]) {
    for (const rows of [[], [{amount: 25}]]) {
      it(`preserves wrapped rows and gives a binding hint (${batch ? 'batch' : 'single'}, ${rows.length} rows)`, async () => {
        const query = {id: 'q', name: 'sales', kind: 'tooljetdb', options: {
          operation: 'sql_execution', sql_execution: {sqlQuery: 'SELECT amount FROM sales LIMIT 10'},
        }};
        const raw = {status: 'ok', data: {results: rows}};
        const client = {getQuery: vi.fn().mockResolvedValue(query), getQueries: vi.fn().mockResolvedValue([query]),
          getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('dev'), runQuery: vi.fn().mockResolvedValue(raw)};
        const response = batch
          ? await runQueriesTool(client as unknown as ToolJetClient).handler({query_ids: ['q'], version_id: 'v'})
          : await runQueryTool(client as unknown as ToolJetClient).handler({query_id: 'q', version_id: 'v'});
        const parsed = JSON.parse(response.content[0]!.text!);
        const result = batch ? parsed.queries[0] : parsed;
        expect(result.data).toEqual(raw.data);
        expect(result.binding_hint?.rows_path).toBe('data.results');
        expect(result.binding_hint?.guidance).toContain('queries.<name>.data.results');
        expect(raw).toEqual({status: 'ok', data: {results: rows}});
        expect(client.runQuery).toHaveBeenCalledOnce();
      });
    }
  }
});
