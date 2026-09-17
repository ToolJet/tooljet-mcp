import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { WorkflowClient } from '../workflowClient.js';
import { normalizeQueryOptions, validateQueryOptions, issueMessages } from '../queryValidation.js';
import { compileGraph, specSchema, validateGraph, type WorkflowSpec, type Compiled } from './graph.js';
import { AI_DATASOURCE_KINDS } from './capabilities.js';
import { workflowReadiness } from './readiness.js';

interface Plan { scope: string; workflowId: string; versionId: string; spec: WorkflowSpec; ids: Compiled; allowDraft: boolean; expires: number }
interface QueryDeletion { node_id: string; definition_id: string; query_id: string }
// Scope is a digest of endpoint + credential + workspace. Stateless HTTP calls can resume plans
// without exposing another user's plan. Tokens expire, are bounded, and are consumed before writes.
const plans = new Map<string, Plan>();
const TTL = 30 * 60_000;
function prune() { for (const [key, plan] of plans) if (plan.expires <= Date.now()) plans.delete(key); }
export async function prepare(client: WorkflowClient, workflowId: string, versionId: string, spec: WorkflowSpec, ids?: Compiled) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.editable) throw new Error('Only editable draft workflow versions can be changed.');
  const [queries, datasources] = await Promise.all([client.getQueries(versionId), client.listDatasources(versionId)]);
  const compiled = compileGraph(snapshot.definition, spec, ids, new Map(datasources.map(datasource => [datasource.id, datasource.kind])));
  const warnings: string[] = [];
  const writes: Array<{ node_id: string; definition_id: string; existing_id?: string; name: string; dataSourceId: string; kind: string; options: Record<string, unknown> }> = [];
  const finalDefinitionIds = new Set(compiled.graph.nodes.map(node => node.data.idOnDefinition).filter((value): value is string => typeof value === 'string'));
  const removedDefinitionIds = new Set(snapshot.definition.nodes
    .map(node => node.data.idOnDefinition)
    .filter((value): value is string => typeof value === 'string' && !finalDefinitionIds.has(value)));
  const deletions: QueryDeletion[] = [];
  for (const mapping of snapshot.definition.queries) {
    if (!removedDefinitionIds.has(mapping.idOnDefinition)) continue;
    // A definition ID can only be deleted when no retained node still references it.
    if (compiled.graph.nodes.some((node) => node.data.idOnDefinition === mapping.idOnDefinition)) continue;
    const node = snapshot.definition.nodes.find((candidate) => candidate.data.idOnDefinition === mapping.idOnDefinition);
    if (!node) continue;
    if (!queries.some((query) => query.id === mapping.id)) throw new Error(`Query ${mapping.id} is missing from the target version.`);
    deletions.push({ node_id: node.id, definition_id: mapping.idOnDefinition, query_id: mapping.id });
  }
  const claimedNames = new Set<string>();
  for (const item of compiled.query_nodes) {
    const existingMapping = snapshot.definition.queries.find(q => q.idOnDefinition === item.definition_id);
    const oldQuery = queries.find(q => q.id === existingMapping?.id);
    if (existingMapping && !oldQuery) throw new Error(`Query ${existingMapping.id} is missing from the target version.`);
    if (oldQuery && snapshot.definition.nodes.filter(n => snapshot.definition.queries.some(q => q.id === oldQuery.id && q.idOnDefinition === n.data.idOnDefinition)).length > 1) throw new Error(`Query ${oldQuery.id} is shared by multiple nodes. Shared query editing is unsupported.`);
    // The workflow-node guard requires a datasource ID. RunJS is represented by ToolJet's
    // workspace static datasource, so resolve its real ID just like the visual editor does.
    const input = item.role === 'workflow-node' ? item.spec : undefined;
    const datasource = item.role === 'agent-model'
      ? datasources.find(d => d.id === item.datasource_id)
      : input!.type === 'javascript' || input!.type === 'loop'
        ? datasources.find(d => d.kind === 'runjs')
        : datasources.find(d => d.id === input!.datasource_id);
    const label = item.role === 'agent-model' ? 'Agent model' : `node ${input!.ref}`;
    if (!datasource) throw new Error(`Datasource unavailable for ${label}.`);
    if (item.role === 'agent-model' && !AI_DATASOURCE_KINDS.has(datasource.kind)) throw new Error(`Datasource ${datasource.id} is not an AI model datasource.`);
    const kind = datasource.kind;
    const dataSourceId = datasource.id;
    const name = item.role === 'agent-model' ? item.name : input!.name;
    if (oldQuery && (oldQuery.kind !== kind || oldQuery.data_source_id !== dataSourceId)) throw new Error(item.role === 'agent-model' ? 'Changing an Agent model datasource is unsupported; remove the model first, then add its replacement in a second phase.' : 'Changing an existing query datasource is unsupported; add a new node.');
    if (oldQuery?.name !== undefined && oldQuery.name !== name) throw new Error(item.role === 'agent-model' ? 'Renaming an Agent model query is unsupported; remove the model first, then add its replacement in a second phase.' : 'Renaming existing queries is unsupported because code references cannot be rewritten safely.');
    if (claimedNames.has(name) || queries.some(q => q.name === name && q.id !== oldQuery?.id)) throw new Error(`Duplicate query name: ${name}`);
    claimedNames.add(name);
    const requestedOptions = item.role === 'agent-model' ? item.options : input!.type === 'javascript' || input!.type === 'loop' ? { ...(oldQuery?.options as Record<string, unknown> ?? {}), code: input!.code } : input!.options;
    const options = item.role === 'agent-model' ? structuredClone(requestedOptions) : normalizeQueryOptions(kind, requestedOptions);
    if (item.role === 'workflow-node') {
      const validation = validateQueryOptions(kind, options);
      if (validation.errors.length) throw new Error(issueMessages(validation.errors).join(' '));
      warnings.push(...issueMessages(validation.warnings));
    }
    writes.push({ node_id: item.node_id, definition_id: item.definition_id, existing_id: oldQuery?.id, name, dataSourceId: dataSourceId ?? '', kind, options });
    if (!existingMapping && !compiled.graph.queries.some(mapping => mapping.idOnDefinition === item.definition_id)) compiled.graph.queries.push({ idOnDefinition: item.definition_id, id: `pending:${item.node_id}` });
  }
  const queryIds = new Set([...queries.map(q => q.id), ...writes.filter(q => !q.existing_id).map(q => `pending:${q.node_id}`)]);
  const validation = validateGraph(compiled.graph, queryIds);
  const readiness = workflowReadiness(compiled.graph, validation.errors);
  return { snapshot, compiled, writes, deletions, validation, readiness, warnings };
}
export async function lint(client: WorkflowClient, workflowId: string, versionId: string, spec: WorkflowSpec, allowDraft = false) {
  const prepared = await prepare(client, workflowId, versionId, spec);
  if (prepared.validation.errors.length || (prepared.readiness.runtime_readiness === 'draft_only' && !allowDraft)) return { ...prepared.validation, ...prepared.readiness, query_warnings: prepared.warnings };
  prune();
  while (plans.size >= 200) plans.delete(plans.keys().next().value!);
  const token = randomUUID();
  plans.set(token, { scope: await client.planScope(), workflowId, versionId, spec: structuredClone(spec), ids: prepared.compiled, allowDraft, expires: Date.now() + TTL });
  return { plan_token: token, expires_in_seconds: TTL / 1000, node_ids: prepared.compiled.node_ids, edge_ids: prepared.compiled.edge_ids, ...prepared.validation, ...prepared.readiness, query_warnings: prepared.warnings,
    changes: { node_upserts: spec.nodes.length, edge_upserts: spec.edges.length, node_removals: spec.remove_node_ids, edge_removals: spec.remove_edge_ids, queries: [...prepared.writes.map(q => ({ name: q.name, operation: q.existing_id ? 'update' : 'create' })), ...prepared.deletions.map(q => ({ query_id: q.query_id, operation: 'delete' }))] } };
}
export async function apply(client: WorkflowClient, token: string) {
  prune();
  const scope = await client.planScope();
  const plan = plans.get(token);
  if (!plan || plan.scope !== scope) throw new Error('Unknown, expired, consumed, or differently scoped plan. Run lint_workflow_spec again.');
  // Consume before any awaited revalidation so simultaneous calls cannot both apply the plan.
  plans.delete(token);
  const { compiled, snapshot, writes, deletions, validation, readiness } = await prepare(client, plan.workflowId, plan.versionId, plan.spec, plan.ids);
  if (validation.errors.length) throw new Error(JSON.stringify(validation.errors));
  if (readiness.runtime_readiness === 'draft_only' && !plan.allowDraft) throw new Error(JSON.stringify(readiness.blockers));
  const completed: Array<{ operation: string; query_id: string; node_id: string }> = [];
  let phase = 'queries';
  let attemptedQuery: { name: string; node_id: string; existing_id?: string } | undefined;
  try {
    for (const write of writes) {
      attemptedQuery = { name: write.name, node_id: write.node_id, existing_id: write.existing_id };
      const result = write.existing_id
        ? await client.updateQuery({ queryId: write.existing_id, versionId: plan.versionId, name: write.name, options: write.options })
        : await client.createWorkflowQuery({ workflowId: plan.workflowId, versionId: plan.versionId, name: write.name, dataSourceId: write.dataSourceId || undefined, kind: write.kind, options: write.options });
      completed.push({ operation: write.existing_id ? 'update' : 'create', query_id: result.query_id, node_id: write.node_id });
      compiled.graph.queries = compiled.graph.queries.filter(q => q.idOnDefinition !== write.definition_id);
      compiled.graph.queries.push({ idOnDefinition: write.definition_id, id: result.query_id });
      attemptedQuery = undefined;
    }
    phase = 'save';
    await client.save(snapshot, compiled.graph);
    phase = 'readback';
    const [saved, queries] = await Promise.all([client.get(plan.workflowId, plan.versionId), client.getQueries(plan.versionId)]);
    const validation = validateGraph(saved.definition, new Set(queries.map(q => q.id)));
    if (!isDeepStrictEqual(saved.definition, compiled.graph)) throw new Error('Saved definition differs from the intended graph. Inspect get_workflow before retrying.');
    for (const write of writes) {
      const id = completed.find(q => q.node_id === write.node_id)!.query_id;
      const persisted = queries.find(q => q.id === id);
      if (!persisted || persisted.name !== write.name || persisted.kind !== write.kind || persisted.data_source_id !== write.dataSourceId || !isDeepStrictEqual(persisted.options, write.options)) throw new Error(`Query ${id} readback differs from intended datasource, kind, name, or options.`);
    }
    if (validation.errors.length) throw new Error(JSON.stringify(validation.errors));
    phase = 'query_deletions';
    for (const deletion of deletions) {
      attemptedQuery = { name: deletion.query_id, node_id: deletion.node_id, existing_id: deletion.query_id };
      await client.deleteQuery({ queryId: deletion.query_id, versionId: plan.versionId });
      completed.push({ operation: 'delete', query_id: deletion.query_id, node_id: deletion.node_id });
      attemptedQuery = undefined;
    }
    return { workflow_id: plan.workflowId, version_id: plan.versionId, editor_url: saved.editor_url, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids, completed, validation, ...readiness };
  } catch (error) {
    return { failed: true, workflow_id: plan.workflowId, version_id: plan.versionId, phase, completed, attempted_query: attemptedQuery, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids,
      graph_persistence: phase === 'queries' ? 'not_attempted' : phase === 'save' ? 'unknown' : 'saved',
      error: error instanceof Error ? error.message : String(error),
      recovery: 'Inspect get_workflow and its queries; reuse persisted IDs when replanning. Do not repeat creation blindly. No resources were automatically deleted.' };
  }
}

/** Removes one workflow node and its incident edges. If the node owns a query, the graph is
 * saved first and the no-longer-referenced query is then deleted. */
export async function deleteNode(client: WorkflowClient, workflowId: string, versionId: string, nodeId: string) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.definition.nodes.some((node) => node.id === nodeId)) throw new Error(`Unknown workflow node: ${nodeId}`);
  const spec = specSchema.parse({ remove_node_ids: [nodeId], remove_edge_ids: snapshot.definition.edges
    .filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .map((edge) => edge.id) });
  const result = await lint(client, workflowId, versionId, spec);
  if (!('plan_token' in result)) throw new Error(JSON.stringify(result.errors));
  return apply(client, result.plan_token);
}
