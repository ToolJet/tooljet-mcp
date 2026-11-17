import { describe, expect, it } from 'vitest';
import { compileGraph, definition, specSchema, validateGraph } from '../src/workflows/graph.js';
import { workflowReadiness } from '../src/workflows/readiness.js';

describe('workflow review regressions', () => {
  it('promotes a legacy condition when configuring Else without changing its true handle', () => {
    const id = '24c5975d-5635-43d4-92a1-58f4c5464018';
    const current = definition({ nodes: [{ id, type: 'if-condition', data: { code: '6 > 3' } }], edges: [], queries: [] });
    const graph = compileGraph(current, specSchema.parse({ nodes: [{ ref: 'choice', existing_id: id, type: 'condition', else_branch: { enabled: false } }] })).graph;
    expect(graph.nodes[0]!.data).toMatchObject({ conditions: [{ id: 'true', code: '6 > 3' }], elseBranch: { enabled: false } });
    expect(graph.nodes[0]!.data.code).toBeUndefined();
  });
  it.each([
    ['wait', { durationSeconds: 0 }],
    ['human', { outcomes: [{ key: 'accept' }], timeout: { enabled: true, durationSeconds: 0 } }],
    ['filter', { inputExpression: '', predicateExpression: 'true' }],
    ['if-condition', { conditions: [{ id: 'true', code: '' }] }],
  ])('does not report retained invalid %s configuration runnable', (type, data) => {
    const graph = definition({ nodes: [{ id: 'start', type: 'input', data: { nodeType: 'start' } }, { id: 'node', type, data }], edges: [{ id: 'edge', source: 'start', target: 'node' }], queries: [] });
    expect(workflowReadiness(graph, validateGraph(graph).errors)).toMatchObject({ runtime_readiness: 'draft_only', blockers: [expect.objectContaining({ code: 'node_configuration' })] });
  });
  it('marks an unconnected Filter as an editable draft until it has input', () => {
    const graph = compileGraph(definition(null), specSchema.parse({ nodes: [{ ref: 'start', type: 'start' }, { ref: 'screen', type: 'filter', name: 'screen', input_expression: '[1,3]', predicate_expression: 'value > 1' }] })).graph;
    expect(workflowReadiness(graph, validateGraph(graph).errors)).toMatchObject({ runtime_readiness: 'draft_only', blockers: [{ code: 'filter_missing_input' }] });
    graph.edges.push({ id: 'connect', source: graph.nodes[0]!.id, target: graph.nodes[1]!.id });
    expect(workflowReadiness(graph, validateGraph(graph).errors).runtime_readiness).toBe('runnable');
  });
});
