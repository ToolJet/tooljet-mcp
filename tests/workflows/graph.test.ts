import { describe, it, expect } from 'vitest';
import { compileGraph, definition, specSchema, validateGraph } from '../../src/workflows/graph.js';
const empty = () => definition({});
const basic = () => specSchema.parse({ nodes: [{ ref: 'start', type: 'start' }, { ref: 'response', type: 'response', code: 'return { ok: true };' }], edges: [{ ref: 'e', from: 'start', to: 'response', port: 'default' }] });
describe('workflow graph contracts', () => {
  it('compiles editor types and validates start to response', () => {
    const { graph } = compileGraph(empty(), basic());
    expect(graph.nodes.map(n => n.type)).toEqual(['input', 'output']);
    expect(graph.nodes[1].data.statusCode).toEqual({ fxActive: false, value: '200' });
    expect(validateGraph(graph).errors).toEqual([]);
  });
  it('preserves unknown data, definitions and existing positions when patching', () => {
    const c = compileGraph(empty(), basic());
    c.graph.setupScript = 'keep'; c.graph.nodes[1].data.custom = { snake_key: true };
    const before = structuredClone(c.graph);
    const result = compileGraph(c.graph, specSchema.parse({ nodes: [{ ref: 'response', existing_id: c.node_ids.response, type: 'response', code: 'return 2;' }] }));
    expect(result.graph.setupScript).toBe('keep');
    expect(result.graph.nodes[1].data.custom).toEqual({ snake_key: true });
    expect(result.graph.nodes[1].position).toEqual(before.nodes[1].position);
    expect(result.graph.edges).toEqual(before.edges);
    expect(c.graph).toEqual(before);
  });
  it('requires explicit removal of incident edges', () => {
    const c = compileGraph(empty(), basic());
    const result = compileGraph(c.graph, specSchema.parse({ remove_node_ids: [c.node_ids.response] }));
    expect(validateGraph(result.graph).errors.map(e => e.code)).toContain('missing_endpoint');
  });
  it('rejects duplicate logical refs', () => {
    const spec = basic(); spec.nodes.push(spec.nodes[0]);
    expect(() => compileGraph(empty(), spec)).toThrow('Duplicate');
  });
  it('rejects edits to unknown IDs and unsupported type changes', () => {
    const spec = basic(); spec.nodes[0].existing_id = 'unknown';
    expect(() => compileGraph(empty(), spec)).toThrow('Unknown');
    const c = compileGraph(empty(), basic());
    expect(() => compileGraph(c.graph, specSchema.parse({ nodes: [{ ref: 'x', existing_id: c.node_ids.response, type: 'start' }] }))).toThrow('Changing node type');
  });
  it('checks cycles, start ports and inbound start edges', () => {
    const c = compileGraph(empty(), basic());
    c.graph.edges.push({ id: 'bad', source: c.node_ids.response, target: c.node_ids.start, sourceHandle: 'true' });
    expect(validateGraph(c.graph).errors.map(e => e.code)).toEqual(expect.arrayContaining(['cycle', 'start_inbound', 'invalid_port']));
  });
  it('enables the query error handler for failure connections', () => {
    const spec = basic(); spec.nodes.push({ ref: 'q', type: 'javascript', name: 'query1', code: 'return 1;' });
    spec.edges.push({ ref: 'fail', from: 'q', to: 'response', port: 'failure' });
    const c = compileGraph(empty(), spec);
    expect(c.graph.nodes.find(n => n.id === c.node_ids.q)?.data.errorHandler).toBe(true);
    expect(validateGraph(c.graph).errors.map(e => e.code)).toContain('missing_mapping');
  });
  it('rejects query mappings from another version', () => {
    const c = compileGraph(empty(), basic()); c.graph.queries.push({ id: 'foreign', idOnDefinition: 'logical' });
    expect(validateGraph(c.graph, new Set()).errors.map(e => e.code)).toContain('missing_query');
  });
  it('preserves unsupported nodes and reports limited validation', () => {
    const c = compileGraph(empty(), basic()); c.graph.nodes.push({ id: 'agent', type: 'agent', data: { custom: true } });
    expect(validateGraph(c.graph).warnings.map(e => e.code)).toContain('unsupported_node');
    expect(compileGraph(c.graph, specSchema.parse({})).graph.nodes.at(-1)).toEqual(c.graph.nodes.at(-1));
  });
  it('rejects arbitrary raw configuration and invalid response codes', () => {
    expect(specSchema.safeParse({ nodes: [{ ref: 'r', type: 'response', code: 'return 1', raw: {}, status_code: 999 }] }).success).toBe(false);
  });
});
