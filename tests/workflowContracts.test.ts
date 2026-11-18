import { describe, it, expect } from 'vitest';
import { compileGraph, definition, specSchema, validateGraph } from '../src/workflows/graph.js';
import { workflowMutationTools } from '../src/tools/applyWorkflowSpec.js';
const id = '32bbd9d6-709b-4538-8744-a4fa1cc2ddef';
const graph = () => definition({ nodes: [
  { id: 'start', type: 'input', data: { nodeType: 'start' } },
  { id, type: 'if-condition', data: { conditions: [{ id: 'route_cold', code: '4 < 7', label: 'Cold' }], elseBranch: { enabled: true }, retained: 42 } },
  { id: 'end', type: 'output', data: { code: 'return 1;' } },
], edges: [{ id: 'in', source: 'start', target: id }, { id: 'out', source: id, target: 'end', sourceHandle: 'route_cold' }], queries: [] });
const compile = (spec: unknown, current = graph()) => compileGraph(current, specSchema.parse(spec));
describe('current workflow authoring contracts', () => {
 it('accepts persisted named branches and rejects unknown handles', () => {
  expect(validateGraph(graph()).errors).toEqual([]);
  const g = graph(); g.edges[1]!.sourceHandle = 'missing';
  expect(validateGraph(g).errors).toContainEqual(expect.objectContaining({ code: 'invalid_port' }));
 });
 it('updates active conditions and preserves unrelated editor fields', () => {
  const g = compile({ nodes: [{ ref: 'choice', existing_id: id, type: 'condition', conditions: [{ id: 'route_cold', code: '9 < 2', label: 'Cold' }] }] }).graph;
  expect(g.nodes[1]!.data).toMatchObject({ conditions: [{ id: 'route_cold', code: '9 < 2' }], retained: 42, elseBranch: { enabled: true } });
  expect(g.nodes[1]!.data.code).toBeUndefined();
 });
 it('refuses code-only edits of modern conditions instead of reporting false success', () => {
  expect(() => compile({ nodes: [{ ref: 'choice', existing_id: id, type: 'condition', code: 'false' }] })).toThrow('ordered conditions');
 });
 it('preserves legacy conditions and refuses ambiguous definitions', () => {
  const g = compile({ nodes: [{ ref: 'legacy', type: 'condition', code: '6 > 3' }] }, definition(null)).graph;
  expect(g.nodes[0]!.data.code).toBe('6 > 3');
  expect(() => compile({ nodes: [{ ref: 'bad', type: 'condition', code: 'true', conditions: [{ id: 'yes', code: 'true', label: 'Yes' }] }] })).toThrow('not both');
 });
 it('compiles new nodes and validates outcome handles without creating query mappings', () => {
  const g = compile({ nodes: [{ ref: 's', type: 'start' }, { ref: 'f', type: 'filter', name: 'activeItems', input_expression: '[1,2,3]', predicate_expression: 'value > 1' }, { ref: 'w', type: 'wait', name: 'pause', duration_seconds: 3 }, { ref: 'h', type: 'human', name: 'review', outcomes: [{ key: 'accept', label: 'Accept' }], approvers: { tokenBypass: true } }, { ref: 'r', type: 'response', code: 'return true;' }], edges: [{ ref: 'a', from: 's', to: 'f', port: 'default' }, { ref: 'b', from: 'f', to: 'w', port: 'default' }, { ref: 'c', from: 'w', to: 'h', port: 'default' }, { ref: 'd', from: 'h', to: 'r', port: 'accept' }] }, definition(null));
  expect(g.query_nodes).toEqual([]); expect(validateGraph(g.graph).errors).toEqual([]);
  expect(g.graph.nodes.find(n => n.type === 'filter')!.data).toMatchObject({ inputExpression: '[1,2,3]', predicateExpression: 'value > 1', nodeName: 'activeItems' });
 });
 it('checks wait bounds and filter expression syntax', () => {
  for (const duration_seconds of [0, Infinity, 2592001]) expect(() => compile({ nodes: [{ ref: 'w', type: 'wait', name: 'pause', duration_seconds }] })).toThrow();
  expect(() => compile({ nodes: [{ ref: 'f', type: 'filter', name: 'items', input_expression: 'return []', predicate_expression: 'true' }] })).toThrow();
 });
 it('rejects invalid human configuration before any save', () => {
  const node = { ref: 'h', type: 'human', name: 'review', outcomes: [{ key: 'accept', label: 'Accept' }], approvers: { tokenBypass: false } };
  expect(() => compile({ nodes: [node] })).toThrow('approver');
  expect(() => compile({ nodes: [{ ...node, approvers: { tokenBypass: true }, timeout: { enabled: true, durationSeconds: 5, onExpire: 'branch', timeoutOutcome: 'absent' } }] })).toThrow('existing outcome');
 });
 it('preserves or replaces typed inputs explicitly and validates defaults', () => {
  const g = graph(); g.workflowInputs = [{ key: 'quantity', type: 'number', required: true, defaultValue: 3 }];
  expect(compile({}, g).graph.workflowInputs).toEqual(g.workflowInputs);
  expect(compile({ workflow_inputs: [] }, g).graph.workflowInputs).toEqual([]);
  expect(() => compile({ workflow_inputs: [{ key: 'quantity', type: 'number', required: true, defaultValue: 'three' }] })).toThrow();
 });
 it('preserves disabled Else edges and literal default outcome handles', () => {
  const g = graph(); g.nodes[1]!.data.elseBranch = { enabled: false }; g.edges[1]!.sourceHandle = 'false';
  expect(validateGraph(g).errors).toEqual([]);
  const compiled = compile({ nodes: [{ ref: 's', type: 'start' }, { ref: 'h', type: 'human', name: 'review', outcomes: [{ key: 'default', label: 'Default' }], approvers: { tokenBypass: true } }, { ref: 'r', type: 'response', code: 'return 1;' }], edges: [{ ref: 'a', from: 's', to: 'h', port: 'default' }, { ref: 'b', from: 'h', to: 'r', port: 'default' }] }, definition(null));
  expect(compiled.graph.edges[1]!.sourceHandle).toBe('default');
  expect(validateGraph(compiled.graph).errors).toEqual([]);
 });
 it('exposes standalone authoring tools for all new contracts', () => {
  expect(workflowMutationTools({} as any).map(t => t.name)).toEqual(expect.arrayContaining(['upsert_workflow_human_node', 'upsert_workflow_filter_node', 'upsert_workflow_wait_node', 'set_workflow_inputs']));
 });
});
