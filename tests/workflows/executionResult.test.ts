import { describe, it, expect } from 'vitest';
import { boundWorkflowExecutionResult } from '../../src/workflows/executionResult.js';

describe('bounded workflow execution inspection', () => {
  it('keeps status, pagination, and small node results when logs and another result are large', () => {
    const input = {
      execution_id: 'execution', status: { status: true, logs: ['log'.repeat(30_000)] }, page: 3, per_page: 2,
      nodes: { data: [
        { id: 'large-node', executed: true, result: { label: '📦'.repeat(40_000) }, definition: { code: 'x'.repeat(80_000) } },
        { id: 'small-node', executed: true, result: { parcel_count: 17 } },
      ], page: 3, per_page: 2, total: 6, total_pages: 3 },
    };
    const result = boundWorkflowExecutionResult(input);
    expect(result).toMatchObject({ execution_id: 'execution', truncated: true, status: { status: true, logs: { truncated: true } }, page: 3, per_page: 2,
      nodes: { total: 6, total_pages: 3, data: [{ id: 'large-node', executed: true, result: { truncated: true } }, input.nodes.data[1]] } });
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(60_000);
    expect(input.nodes.data[0].result).toHaveProperty('label');
  });
  it('preserves small inspection results verbatim', () => {
    const result = { execution_id: 'small', status: { status: false }, nodes: { data: [] }, page: 1 };
    expect(boundWorkflowExecutionResult(result)).toBe(result);
  });
  it('preserves the execution receipt when run output is too large', () => {
    expect(boundWorkflowExecutionResult({ workflowExecution: { id: 'receipt', executed: true, status: 'completed' }, result: 'x'.repeat(70_000) })).toMatchObject({ execution_id: 'receipt', executed: true, status: 'completed', truncated: true });
  });
});
