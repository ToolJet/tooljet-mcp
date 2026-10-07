import { describe, expect, it, vi } from 'vitest';
import { checkPlanReads } from '../src/applyReadCheck.js';

// A built app reached its users with four queries that failed on first load: the build applied them and the model
// ran one query in forty-two tool calls (2026-09-29). apply_app_phase knows which queries a phase wrote, so it runs
// the ones that are proven reads itself and reports what failed, by name, in its result.
const saved = [
  { id: 'q-list', name: 'orders', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't1', list_rows: { limit: 100 } } },
  { id: 'q-bad', name: 'returns', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't2', list_rows: { limit: 100 } } },
  { id: 'q-js', name: 'view', kind: 'runjs', options: { code: 'return 1' } },
  { id: 'q-write', name: 'saveOrder', kind: 'tooljetdb', options: { operation: 'create_row', table_id: 't1', create_row: { 0: { column: 'name', value: 'x' } } } },
  { id: 'q-filtered', name: 'byStatus', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't1', list_rows: { limit: 50, where_filters: { 0: { column: 'status', operator: 'eq', value: '{{components.status.value}}' } } } } },
  { id: 'q-other', name: 'untouched', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't3', list_rows: { limit: 100 } } },
];
const client = (results: Record<string, unknown>) => ({
  getQueries: vi.fn(async () => saved),
  getDevelopmentEnvironmentId: vi.fn(async () => 'env-dev'),
  runQuery: vi.fn(async ({ queryId }: { queryId: string }) => results[queryId] ?? { status: 'ok', data: [{ id: 1 }, { id: 2 }] }),
});

describe('the reads a phase wrote are run after it is applied', () => {
  it('reports a failing read by name with its message, and counts the ones that ran', async () => {
    const c = client({ 'q-bad': { status: 'failed', message: 'column "reason" does not exist' } });
    const check = await checkPlanReads(c as never, { versionId: 'v1', queryIds: ['q-list', 'q-bad'] });
    expect(check.ran).toBe(2);
    expect(check.failed).toEqual([expect.objectContaining({ name: 'returns', message: 'column "reason" does not exist' })]);
    expect(check.rows).toEqual({ orders: 2 });
    expect(c.runQuery).toHaveBeenCalledTimes(2);
    expect(c.runQuery.mock.calls.map((call) => call[0].queryId).sort()).toEqual(['q-bad', 'q-list']);
  });

  it('never runs a write or a RunJS query, and says why each was not checked', async () => {
    const c = client({});
    const check = await checkPlanReads(c as never, { versionId: 'v1', queryIds: ['q-js', 'q-write', 'q-list'] });
    expect(c.runQuery.mock.calls.map((call) => call[0].queryId)).toEqual(['q-list']);
    expect(check.not_run.map((entry) => entry.name).sort()).toEqual(['saveOrder', 'view']);
    expect(check.failed).toEqual([]);
  });

  it('a read that takes a component’s value is run, and its failure is reported as inconclusive', async () => {
    const c = client({ 'q-filtered': { status: 'failed', message: 'invalid input syntax' } });
    const check = await checkPlanReads(c as never, { versionId: 'v1', queryIds: ['q-filtered'] });
    expect(check.failed).toEqual([]);
    expect(check.inconclusive).toEqual([expect.objectContaining({ name: 'byStatus', message: 'invalid input syntax' })]);
    expect(check.inconclusive[0]!.note).toMatch(/components/);
  });

  it('only runs the queries the phase wrote, ten at most, and survives a read that throws', async () => {
    const c = client({});
    c.runQuery.mockImplementationOnce(async () => { throw new Error('connection refused'); });
    const check = await checkPlanReads(c as never, { versionId: 'v1', queryIds: ['q-list'] });
    expect(check.failed).toEqual([expect.objectContaining({ name: 'orders', message: 'connection refused' })]);
    expect(c.runQuery).toHaveBeenCalledTimes(1);
    const many = await checkPlanReads(client({}) as never, { versionId: 'v1', queryIds: Array.from({ length: 14 }, () => 'q-list') });
    expect(many.ran).toBeLessThanOrEqual(10);
  });

  it('is empty for a phase that wrote no query', async () => {
    const c = client({});
    expect(await checkPlanReads(c as never, { versionId: 'v1', queryIds: [] })).toBeUndefined();
    expect(c.getQueries).not.toHaveBeenCalled();
  });
});

// s61 (2026-09-30): four reads run at once, and one came back "JWT issued at future": ToolJet minted the token a
// moment ahead of PostgREST's clock. The model then re-ran that query to find nothing wrong with it.
describe('a read refused for clock skew', () => {
  it('is run again once and reported by its second answer', async () => {
    const c = client({});
    let calls = 0;
    c.runQuery.mockImplementation(async ({ queryId }: { queryId: string }) => {
      if (queryId === 'q-bad' && calls++ === 0) return { status: 'failed', message: 'JWT issued at future' };
      return { status: 'ok', data: [{ id: 1 }] };
    });
    const check = await checkPlanReads(c as never, { versionId: 'v1', queryIds: ['q-bad'], retryDelayMs: 0 } as never);
    expect(check.failed).toEqual([]);
    expect(check.rows).toEqual({ returns: 1 });
    expect(c.runQuery).toHaveBeenCalledTimes(2);
  });

  it('is reported as failed when the second run is refused as well', async () => {
    const c = client({ 'q-bad': { status: 'failed', message: 'JWT issued at future' } });
    const check = await checkPlanReads(c as never, { versionId: 'v1', queryIds: ['q-bad'], retryDelayMs: 0 } as never);
    expect(check.failed).toEqual([expect.objectContaining({ name: 'returns' })]);
    expect(c.runQuery).toHaveBeenCalledTimes(2);
  });
});
