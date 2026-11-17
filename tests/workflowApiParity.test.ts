import { describe, it, expect, vi } from 'vitest';
import { compileGraph, definition, specSchema, validateGraph } from '../src/workflows/graph.js';
import { workflowReadiness } from '../src/workflows/readiness.js';
import { prepare } from '../src/workflows/planner.js';
import { workflowOperations } from '../src/workflows/operations.js';
import { resolveWorkflowReference } from '../src/workflowReference.js';
const wid = '025c2bbc-2429-414f-b616-d5fdd6efac90';
const vid = '35b727d6-f5c1-49f9-9296-40abfe9e82a7';
const human = {
  ref: 'review',
  type: 'human',
  name: 'review',
  outcomes: [{ key: 'needs-review', label: 'Review' }],
  approvers: { tokenBypass: true },
  input_schema: [{ name: 'review-note', type: 'text' }],
};
const compile = (input: unknown, current = definition(null)) => compileGraph(current, specSchema.parse(input)).graph;
const edges = [
  { ref: 'a', from: 'start', to: 'first', port: 'default' },
  { ref: 'b', from: 'first', to: 'second', port: 'default' },
];
const filters = [
  { ref: 'start', type: 'start' },
  { ref: 'first', type: 'filter', name: 'first', input_expression: '[1,3]', predicate_expression: 'true' },
  { ref: 'second', type: 'filter', name: 'second', input_expression: 'first.data', predicate_expression: 'true' },
];
describe('workflow API parity', () => {
  it('accepts native input and approval keys without changing their spelling', () => {
    const g = compile({ nodes: [human], workflow_inputs: [{ key: 'shipment-id', type: 'string', required: true }] });
    expect(g.workflowInputs).toEqual([{ key: 'shipment-id', type: 'string', required: true }]);
    expect(g.nodes[0].data.outcomes).toEqual(human.outcomes);
  });
  it('rejects trimmed/case duplicate inputs and duplicate approval field names', () => {
    expect(() =>
      compile({
        workflow_inputs: [
          { key: 'zone', type: 'string', required: false },
          { key: ' Zone ', type: 'string', required: false },
        ],
      }),
    ).toThrow('Duplicate');
    expect(() =>
      compile({
        nodes: [
          {
            ...human,
            input_schema: [
              { name: 'answer', type: 'text' },
              { name: 'answer', type: 'number' },
            ],
          },
        ],
      }),
    ).toThrow('unique');
  });
  it('updates connected Filter references on rename while preserving explicit edits and unrelated expressions', () => {
    const g = compile({ nodes: filters, edges });
    const changed = compile({ nodes: [{ ...filters[1], existing_id: g.nodes[1].id, name: 'renamed' }] }, g);
    expect(changed.nodes[2].data.inputExpression).toBe('renamed.data');
    const explicit = compile(
      {
        nodes: [
          { ...filters[1], existing_id: g.nodes[1].id, name: 'renamed' },
          { ...filters[2], existing_id: g.nodes[2].id, input_expression: '[4,8]' },
        ],
      },
      g,
    );
    expect(explicit.nodes[2].data.inputExpression).toBe('[4,8]');
  });
  it('checks collisions across query and non-query output names before writes', async () => {
    const g = compile({
      nodes: [{ ...filters[0] }, { ...filters[1], name: 'shared' }, { ...filters[2], name: 'shared' }],
      edges,
    });
    const client = {
      get: vi.fn().mockResolvedValue({ editable: true, definition: g }),
      getQueries: vi.fn().mockResolvedValue([]),
      listDatasources: vi.fn().mockResolvedValue([]),
    };
    await expect(prepare(client as any, wid, vid, specSchema.parse({}))).rejects.toThrow(
      'Duplicate workflow node name',
    );
  });
  it('keeps invalid retained loops as drafts', () => {
    const g = definition({
      nodes: [
        { id: 's', type: 'input', data: { nodeType: 'start' } },
        { id: 'q', type: 'query', data: { idOnDefinition: 'd', looped: true, iterationValuesCode: ' ' } },
      ],
      edges: [{ id: 'e', source: 's', target: 'q' }],
      queries: [{ id: 'qid', idOnDefinition: 'd' }],
    });
    expect(workflowReadiness(g, validateGraph(g).errors).runtime_readiness).toBe('draft_only');
  });
  it('authors named condition results, dynamic status, setup and non-JS query loops', () => {
    const g = compile({
      setup_script: { javascript: 'return {testValue: 7};', python: 'test_value = 7' },
      nodes: [
        { ref: 'choice', type: 'condition', name: 'decision', code: 'true' },
        { ref: 'response', type: 'response', name: 'reply', code: 'return 1;', status_code_expression: '201' },
        {
          ref: 'query',
          type: 'query',
          name: 'fetchItems',
          datasource_id: 'source',
          options: {},
          looped: true,
          iteration_values_code: 'return [1,2];',
        },
      ],
    });
    expect(g.nodes[0].data.nodeName).toBe('decision');
    expect(g.nodes[1].data.statusCode).toEqual({ fxActive: true, value: '201' });
    expect(g.nodes[2].data).toMatchObject({ looped: true, iterationValuesCode: 'return [1,2];' });
    expect(g.setupScript).toEqual({ javascript: 'return {testValue: 7};', python: 'test_value = 7' });
  });
  it('attaches Agent tools with stable edge IDs on recompile', () => {
    const spec = specSchema.parse({
      nodes: [
        { ref: 'agent', type: 'agent' },
        {
          ref: 'tool',
          type: 'query',
          name: 'lookup',
          datasource_id: 'source',
          options: { toolDescription: 'Lookup synthetic inventory' },
        },
      ],
      agent_tools: [{ ref: 'toolEdge', from: 'tool', to: 'agent' }],
    });
    const compiled = compileGraph(definition(null), spec);
    const again = compileGraph(definition(null), spec, compiled);
    expect(again.graph.edges).toEqual(compiled.graph.edges);
    expect(again.graph.nodes[1].data).toMatchObject({ isChildOfAgent: true, agentConnectionType: 'tool' });
  });
  it('resolves native branch pins and normalizes legacy UUIDs through the backend', async () => {
    const auth = {
      authedFetch: vi.fn().mockResolvedValue(Response.json({ workflow_id: wid, version_id: vid, pin: 'v2' })),
    };
    const resolved = await resolveWorkflowReference(auth as any, { workflowId: wid, workflowVersionId: vid }, vid);
    expect(resolved.options.workflowVersionId).toBe('v2');
    expect(auth.authedFetch.mock.calls[0][0]).toContain(`consumer_version_id=${vid}`);
    auth.authedFetch.mockResolvedValue(Response.json({ workflow_id: wid, version_id: vid, pin: '__current_branch__' }));
    expect(
      (await resolveWorkflowReference(auth as any, { workflowId: wid, workflowVersionId: '__current_branch__' })).pin,
    ).toBe('__current_branch__');
  });
  it('fails closed if native resolution is unavailable', async () => {
    const auth = { authedFetch: vi.fn().mockResolvedValue(new Response('', { status: 404 })) };
    await expect(resolveWorkflowReference(auth as any, { workflowId: wid })).rejects.toThrow('HTTP 404');
  });
  it('uses native schedule/bundle routes and repeats filter query parameters', () => {
    const list = workflowOperations.list_workflow_executions;
    const path = list.path(list.schema.parse({ status: ['waiting', 'failed'] }));
    expect(path).toContain('status=waiting&status=failed');
    expect(workflowOperations.get_workflow_packages.path({ version_id: vid, language: 'python' })).toBe(
      `/api/workflows/${vid}/packages/python`,
    );
    const create = workflowOperations.create_workflow_schedule;
    const args = create.schema.parse({
      workflow_id: wid,
      workflowId: vid,
      environmentId: vid,
      name: 'Daily stock',
      type: 'interval',
      timezone: 'UTC',
      details: { frequency: 'hour', minutes: 10 },
    });
    expect(create.body(args)).toMatchObject({ workflowId: vid, active: false });
    expect(create.body(args)).not.toHaveProperty('workflow_id');
  });
});
