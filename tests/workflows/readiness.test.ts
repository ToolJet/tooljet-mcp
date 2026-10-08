import { describe, expect, it } from 'vitest';
import { compileGraph, definition, specSchema, validateGraph } from '../../src/workflows/graph.js';
import { workflowReadiness } from '../../src/workflows/readiness.js';

describe('workflow runtime readiness', () => {
  it('marks a reachable Agent without a model draft_only', () => {
    const graph = compileGraph(definition({}), specSchema.parse({ nodes: [
      { ref: 'start', type: 'start' },
      { ref: 'agent', type: 'agent' },
    ], edges: [{ ref: 'flow', from: 'start', to: 'agent', port: 'default' }] })).graph;
    expect(workflowReadiness(graph, validateGraph(graph).errors)).toMatchObject({
      runtime_readiness: 'draft_only',
      blockers: [expect.objectContaining({ code: 'agent_missing_model' })],
    });
  });

  it('marks structural graph errors blocked', () => {
    const graph = definition({});
    expect(workflowReadiness(graph, validateGraph(graph).errors).runtime_readiness).toBe('blocked');
  });
});
