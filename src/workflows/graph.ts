import { Script } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const ref = z.string().min(1).max(100);
const base = { ref, existing_id: z.string().uuid().optional(), label: z.string().max(100).optional(), position: z.object({ x: z.number().finite(), y: z.number().finite() }).optional() };
const query = { name: z.string().regex(/^[A-Za-z_$][\w$]*$/), datasource_id: z.string().min(1), options: z.record(z.string(), z.unknown()) };
export const nodeSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('start') }).strict(),
  z.object({ ...base, type: z.literal('javascript'), name: query.name, code: z.string().min(1) }).strict(),
  z.object({ ...base, type: z.literal('query'), ...query }).strict(),
  z.object({ ...base, type: z.literal('loop'), name: query.name, iteration_values_code: z.string().min(1), code: z.string().min(1) }).strict(),
  z.object({ ...base, type: z.literal('condition'), code: z.string().min(1) }).strict(),
  z.object({ ...base, type: z.literal('response'), code: z.string().min(1), status_code: z.number().int().min(100).max(599).default(200) }).strict(),
  z.object({ ...base, type: z.literal('agent'), system_prompt: z.string().optional(), user_prompt: z.string().optional(), output_format: z.record(z.string(), z.unknown()).nullable().optional() }).strict(),
]);
export const specSchema = z.object({
  schema_version: z.literal(1).default(1),
  nodes: z.array(nodeSchema).max(200).default([]),
  edges: z.array(z.object({ ref, existing_id: z.string().optional(), from: ref, to: ref, port: z.enum(['default', 'success', 'failure', 'true', 'false']) }).strict()).max(500).default([]),
  remove_node_ids: z.array(z.string()).default([]),
  remove_edge_ids: z.array(z.string()).default([]),
  test_parameters: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type WorkflowSpec = z.infer<typeof specSchema>;
export type NodeSpec = WorkflowSpec['nodes'][number];
export interface GraphNode { id: string; type: string; data: Record<string, unknown>; position?: { x: number; y: number }; [key: string]: unknown }
export interface GraphEdge { id: string; source: string; target: string; sourceHandle?: string | null; [key: string]: unknown }
export interface Definition { nodes: GraphNode[]; edges: GraphEdge[]; queries: Array<{ id: string; idOnDefinition: string; [key: string]: unknown }>; [key: string]: unknown }
export interface Issue { code: string; path: string; message: string }
export function definition(value: unknown): Definition {
  if (value == null) return { nodes: [], edges: [], queries: [] };
  const parsed = z.object({
    nodes: z.array(z.object({ id: z.string(), type: z.string(), data: z.record(z.string(), z.unknown()) }).passthrough()).default([]),
    edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string(), sourceHandle: z.string().nullable().optional() }).passthrough()).default([]),
    queries: z.array(z.object({ id: z.string(), idOnDefinition: z.string() }).passthrough()).default([]),
  }).passthrough().parse(value);
  return structuredClone(parsed) as Definition;
}
export function validateGraph(graph: Definition, queryIds?: Set<string>) {
  const errors: Issue[] = [], warnings: Issue[] = [];
  const error = (code: string, path: string, message: string) => errors.push({ code, path, message });
  const nodes = new Map(graph.nodes.map(n => [n.id, n]));
  if (nodes.size !== graph.nodes.length) error('duplicate_node', 'nodes', 'Node IDs must be unique.');
  if (new Set(graph.edges.map(e => e.id)).size !== graph.edges.length) error('duplicate_edge', 'edges', 'Edge IDs must be unique.');
  const starts = graph.nodes.filter(n => n.type === 'input' && n.data.nodeType === 'start');
  if (starts.length !== 1) error('start_count', 'nodes', 'Exactly one start node is required.');
  const mappings = new Map(graph.queries.map(q => [q.idOnDefinition, q.id]));
  if (mappings.size !== graph.queries.length) error('duplicate_mapping', 'queries', 'Query definition IDs must be unique.');
  for (const mapping of graph.queries) if (queryIds && !queryIds.has(mapping.id)) error('missing_query', 'queries', `Query ${mapping.id} does not belong to this version.`);
  for (const n of graph.nodes) {
    if (n.type === 'query' && !mappings.has(String(n.data.idOnDefinition))) error('missing_mapping', `nodes.${n.id}`, 'Query node has no query mapping.');
    if (!['input', 'query', 'if-condition', 'output', 'agent'].includes(n.type)) warnings.push({ code: 'unsupported_node', path: `nodes.${n.id}`, message: `Retained ${n.type} node; configuration not validated.` });
  }
  for (const edge of graph.edges) {
    const source = nodes.get(edge.source), target = nodes.get(edge.target), path = `edges.${edge.id}`;
    if (!source || !target) { error('missing_endpoint', path, 'Edge endpoint does not exist.'); continue; }
    if (target.type === 'input') error('start_inbound', path, 'Start cannot have inbound edges.');
    const ports: Record<string, Array<string | null | undefined>> = { input: [null, undefined], query: ['success', 'failure'], 'if-condition': ['true', 'false'], output: [], agent: ['output'] };
    if (ports[source.type] && !ports[source.type].includes(edge.sourceHandle)) error('invalid_port', path, `Invalid source port for ${source.type}.`);
    if (source.type === 'query' && edge.sourceHandle === 'failure' && !source.data.errorHandler) error('error_handler_disabled', path, 'Failure edge requires query error handling.');
  }
  const adjacency = new Map(graph.nodes.map(n => [n.id, graph.edges.filter(e => e.source === n.id).map(e => e.target)]));
  const visited = new Set<string>(), active = new Set<string>();
  const visit = (id: string): boolean => {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id); active.add(id);
    const cyclic = (adjacency.get(id) ?? []).some(visit); active.delete(id); return cyclic;
  };
  if (graph.nodes.some(n => visit(n.id))) error('cycle', 'edges', 'Cycles are unsupported in the basic node set.');
  const reachable = new Set<string>();
  const reach = (id: string) => { if (reachable.has(id)) return; reachable.add(id); (adjacency.get(id) ?? []).forEach(reach); };
  starts.forEach(n => reach(n.id));
  for (const n of graph.nodes) if (!reachable.has(n.id)) warnings.push({ code: 'unreachable', path: `nodes.${n.id}`, message: 'Node is unreachable from start.' });
  return { errors, warnings, runtime_verified: false };
}

export interface Compiled { graph: Definition; node_ids: Record<string, string>; edge_ids: Record<string, string>; query_nodes: Array<{ spec: NodeSpec; node_id: string; definition_id: string }> }
export function compileGraph(current: Definition, spec: WorkflowSpec, ids?: { node_ids: Record<string, string>; edge_ids: Record<string, string> }): Compiled {
  const graph = structuredClone(current);
  const node_ids: Record<string, string> = Object.create(null), edge_ids: Record<string, string> = Object.create(null);
  const query_nodes: Compiled['query_nodes'] = [];
  const checkUnique = (refs: string[]) => { if (new Set(refs).size !== refs.length) throw new Error('Duplicate logical refs.'); };
  checkUnique(spec.nodes.map(n => n.ref)); checkUnique(spec.edges.map(e => e.ref));
  for (const id of spec.remove_node_ids) if (!graph.nodes.some(n => n.id === id)) throw new Error(`Unknown node to remove: ${id}`);
  for (const id of spec.remove_edge_ids) if (!graph.edges.some(e => e.id === id)) throw new Error(`Unknown edge to remove: ${id}`);
  const removedDefinitionIds = graph.nodes.filter(n => spec.remove_node_ids.includes(n.id)).map(n => n.data.idOnDefinition);
  graph.nodes = graph.nodes.filter(n => !spec.remove_node_ids.includes(n.id));
  graph.edges = graph.edges.filter(e => !spec.remove_edge_ids.includes(e.id));
  const editedIds = new Set<string>();
  for (const input of spec.nodes) {
    if ('code' in input) {
      try { new Script(input.type === 'condition' ? `(${input.code})` : `(async function() {${input.code}\n})`); }
      catch { throw new Error(`Invalid JavaScript syntax in node ${input.ref}.`); }
    }
    if (input.type === 'loop') {
      try { new Script(`(async function() {${input.iteration_values_code}\n})`); }
      catch { throw new Error(`Invalid iteration JavaScript syntax in node ${input.ref}.`); }
    }
    const id = input.existing_id ?? ids?.node_ids[input.ref] ?? randomUUID();
    if (editedIds.has(id)) throw new Error('Multiple node edits target the same ID.');
    editedIds.add(id);
    const old = graph.nodes.find(n => n.id === id);
    if (input.existing_id && !old) throw new Error(`Unknown existing node: ${id}`);
    const type = { start: 'input', javascript: 'query', query: 'query', loop: 'query', condition: 'if-condition', response: 'output', agent: 'agent' }[input.type];
    if (old && old.type !== type) throw new Error('Changing node type is unsupported; remove and add explicitly.');
    const data: Record<string, unknown> = { ...old?.data, label: input.label ?? old?.data.label ?? input.ref };
    if (input.type !== 'condition') data.nodeType = input.type === 'javascript' || input.type === 'loop' ? 'query' : input.type;
    if (input.type === 'condition' || input.type === 'response') data.code = input.code;
    if (input.type === 'response') data.statusCode = { fxActive: false, value: String(input.status_code) };
    if (input.type === 'loop') {
      data.looped = true;
      data.iterationValuesCode = input.iteration_values_code;
    }
    if (input.type === 'agent') {
      const oldOptions = old?.data.options && typeof old.data.options === 'object' && !Array.isArray(old.data.options)
        ? old.data.options as Record<string, unknown> : {};
      data.nodeName = input.label ?? old?.data.nodeName ?? input.ref;
      data.options = {
        systemPrompt: input.system_prompt ?? oldOptions.systemPrompt ?? '',
        userPrompt: input.user_prompt ?? oldOptions.userPrompt ?? '',
        outputFormat: input.output_format === undefined ? oldOptions.outputFormat ?? null : input.output_format === null ? null : { example: input.output_format },
      };
    }
    if (input.type === 'query' || input.type === 'javascript' || input.type === 'loop') {
      const definitionId = typeof data.idOnDefinition === 'string' ? data.idOnDefinition : randomUUID();
      data.idOnDefinition = definitionId;
      query_nodes.push({ spec: input, node_id: id, definition_id: definitionId });
    }
    const node: GraphNode = { ...old, id, type, sourcePosition: 'right', targetPosition: 'left', deletable: false, data, position: input.position ?? old?.position ?? { x: 100 + graph.nodes.length * 320, y: 250 } };
    if (old) graph.nodes[graph.nodes.indexOf(old)] = node; else graph.nodes.push(node);
    node_ids[input.ref] = id;
  }
  const resolve = (ref: string) => node_ids[ref] ?? (graph.nodes.some(n => n.id === ref) ? ref : undefined);
  const editedEdges = new Set<string>();
  for (const input of spec.edges) {
    const id = input.existing_id ?? ids?.edge_ids[input.ref] ?? randomUUID();
    if (editedEdges.has(id)) throw new Error('Multiple edge edits target the same ID.');
    editedEdges.add(id);
    const old = graph.edges.find(e => e.id === id);
    if (input.existing_id && !old) throw new Error(`Unknown existing edge: ${id}`);
    const source = resolve(input.from), target = resolve(input.to);
    if (!source || !target) throw new Error(`Unknown endpoint in edge ${input.ref}. Use a supplied ref or existing node ID.`);
    const sourceNode = graph.nodes.find((node) => node.id === source);
    const sourceHandle = input.port === 'default' ? sourceNode?.type === 'agent' ? 'output' : null : input.port;
    const edge = { ...old, id, source, target, sourceHandle, type: 'custom' };
    if (old) graph.edges[graph.edges.indexOf(old)] = edge; else graph.edges.push(edge);
    edge_ids[input.ref] = id;
    if (input.port === 'failure') {
      const n = graph.nodes.find(n => n.id === source)!;
      if (n.type === 'query') n.data.errorHandler = true;
    }
  }
  graph.queries = graph.queries.filter(q => !removedDefinitionIds.includes(q.idOnDefinition) || graph.nodes.some(n => n.data.idOnDefinition === q.idOnDefinition));
  // Place new nodes by dependency depth, keeping editor-owned positions unchanged.
  const depths = new Map(graph.nodes.map(n => [n.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of graph.edges) {
      const next = (depths.get(edge.source) ?? 0) + 1;
      if (next > (depths.get(edge.target) ?? 0)) { depths.set(edge.target, next); changed = true; }
    }
    if (!changed) break;
  }
  const placed = graph.nodes.filter(n => current.nodes.some(old => old.id === n.id) || spec.nodes.some(input => node_ids[input.ref] === n.id && input.position));
  for (const n of graph.nodes.filter(n => !placed.includes(n))) {
    const x = 100 + (depths.get(n.id) ?? 0) * 320;
    let y = 250;
    while (placed.some(other => other.position && Math.abs(other.position.x - x) < 300 && Math.abs(other.position.y - y) < 160)) y += 180;
    n.position = { x, y }; placed.push(n);
  }
  if (spec.test_parameters !== undefined) graph.defaultParams = JSON.stringify(spec.test_parameters);
  return { graph, node_ids, edge_ids, query_nodes };
}
export const nodeCatalog = {
  schema_version: 1,
  nodes: [
    { type: 'start', renderer: 'input', ports: ['default'] },
    { type: 'javascript', renderer: 'query', ports: ['success', 'failure'], fields: ['name', 'code'] },
    { type: 'query', renderer: 'query', ports: ['success', 'failure'], fields: ['name', 'datasource_id', 'options'] },
    { type: 'loop', renderer: 'query', ports: ['success', 'failure'], fields: ['name', 'iteration_values_code', 'code'] },
    { type: 'condition', renderer: 'if-condition', ports: ['true', 'false'], fields: ['code'] },
    { type: 'response', renderer: 'output', ports: [], fields: ['code', 'status_code'] },
    { type: 'agent', renderer: 'agent', ports: ['output'], fields: ['system_prompt', 'user_prompt', 'output_format'] },
  ],
  edit_semantics: 'Patch. Use existing_id to edit nodes/edges; edge endpoints may use existing node IDs. Omitted objects are preserved. Removal requires explicit IDs and incident edge removal.',
  limitations: ['Agent AI-model and tool connections are not authored', 'No publishing or trigger setup', 'No concurrent-edit protection', 'No automatic execution during authoring', 'Advanced nodes are preserved but not authored'],
};
