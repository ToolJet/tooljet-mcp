import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { WorkflowClient } from '../workflowClient.js';
import { normalizeQueryOptions, validateQueryOptions, issueMessages } from '../queryValidation.js';
import { compileGraph, validateGraph, type WorkflowSpec, type Compiled } from './graph.js';

interface Plan { scope: string; workflowId: string; versionId: string; spec: WorkflowSpec; ids: Compiled; expires: number }
// Scope is a digest of endpoint + credential + workspace. Stateless HTTP calls can resume plans
// without exposing another user's plan. Tokens expire, are bounded, and are consumed before writes.
const plans = new Map<string, Plan>();
const TTL = 30 * 60_000;
function prune() { for (const [key, plan] of plans) if (plan.expires <= Date.now()) plans.delete(key); }
export async function prepare(client: WorkflowClient, workflowId: string, versionId: string, spec: WorkflowSpec, ids?: Compiled) {
  const snapshot = await client.get(workflowId, versionId);
  if (!snapshot.editable) throw new Error('Only editable draft workflow versions can be changed.');
  const [queries, datasources] = await Promise.all([client.getQueries(versionId), client.listDatasources(versionId)]);
  const compiled = compileGraph(snapshot.definition, spec, ids);
  const warnings: string[] = [];
  const writes: Array<{ node_id: string; definition_id: string; existing_id?: string; name: string; dataSourceId: string; kind: string; options: Record<string, unknown> }> = [];
  const claimedNames = new Set<string>();
  for (const item of compiled.query_nodes) {
    const input = item.spec;
    if (input.type !== 'javascript' && input.type !== 'query') continue;
    const existingMapping = snapshot.definition.queries.find(q => q.idOnDefinition === item.definition_id);
    const oldQuery = queries.find(q => q.id === existingMapping?.id);
    if (existingMapping && !oldQuery) throw new Error(`Query ${existingMapping.id} is missing from the target version.`);
    if (oldQuery && snapshot.definition.nodes.filter(n => snapshot.definition.queries.some(q => q.id === oldQuery.id && q.idOnDefinition === n.data.idOnDefinition)).length > 1) throw new Error(`Query ${oldQuery.id} is shared by multiple nodes. Shared query editing is unsupported.`);
    // The workflow-node guard requires a datasource ID. RunJS is represented by ToolJet's
    // workspace static datasource, so resolve its real ID just like the visual editor does.
    const datasource = input.type === 'javascript'
      ? datasources.find(d => d.kind === 'runjs')
      : datasources.find(d => d.id === input.datasource_id);
    if (!datasource) throw new Error(`Datasource unavailable for node ${input.ref}.`);
    const kind = datasource.kind;
    const dataSourceId = datasource.id;
    if (oldQuery && (oldQuery.kind !== kind || oldQuery.data_source_id !== dataSourceId)) throw new Error('Changing an existing query datasource is unsupported; add a new node.');
    if (oldQuery?.name !== undefined && oldQuery.name !== input.name) throw new Error('Renaming existing queries is unsupported because code references cannot be rewritten safely.');
    if (claimedNames.has(input.name) || queries.some(q => q.name === input.name && q.id !== oldQuery?.id)) throw new Error(`Duplicate query name: ${input.name}`);
    claimedNames.add(input.name);
    const options = normalizeQueryOptions(kind, input.type === 'javascript' ? { ...(oldQuery?.options as Record<string, unknown> ?? {}), code: input.code } : input.options);
    const validation = validateQueryOptions(kind, options);
    if (validation.errors.length) throw new Error(issueMessages(validation.errors).join(' '));
    warnings.push(...issueMessages(validation.warnings));
    writes.push({ node_id: item.node_id, definition_id: item.definition_id, existing_id: oldQuery?.id, name: input.name, dataSourceId: dataSourceId ?? '', kind, options });
    if (!existingMapping) compiled.graph.queries.push({ idOnDefinition: item.definition_id, id: `pending:${item.node_id}` });
  }
  const queryIds = new Set([...queries.map(q => q.id), ...writes.filter(q => !q.existing_id).map(q => `pending:${q.node_id}`)]);
  const validation = validateGraph(compiled.graph, queryIds);
  return { snapshot, compiled, writes, validation, warnings };
}
export async function lint(client: WorkflowClient, workflowId: string, versionId: string, spec: WorkflowSpec) {
  const prepared = await prepare(client, workflowId, versionId, spec);
  if (prepared.validation.errors.length) return { ...prepared.validation, query_warnings: prepared.warnings };
  prune();
  while (plans.size >= 200) plans.delete(plans.keys().next().value!);
  const token = randomUUID();
  plans.set(token, { scope: await client.planScope(), workflowId, versionId, spec: structuredClone(spec), ids: prepared.compiled, expires: Date.now() + TTL });
  return { plan_token: token, expires_in_seconds: TTL / 1000, node_ids: prepared.compiled.node_ids, edge_ids: prepared.compiled.edge_ids, ...prepared.validation, query_warnings: prepared.warnings,
    changes: { node_upserts: spec.nodes.length, edge_upserts: spec.edges.length, node_removals: spec.remove_node_ids, edge_removals: spec.remove_edge_ids, queries: prepared.writes.map(q => ({ name: q.name, operation: q.existing_id ? 'update' : 'create' })) } };
}
export async function apply(client: WorkflowClient, token: string) {
  prune();
  const scope = await client.planScope();
  const plan = plans.get(token);
  if (!plan || plan.scope !== scope) throw new Error('Unknown, expired, consumed, or differently scoped plan. Run lint_workflow_spec again.');
  // Consume before any awaited revalidation so simultaneous calls cannot both apply the plan.
  plans.delete(token);
  const { compiled, snapshot, writes, validation } = await prepare(client, plan.workflowId, plan.versionId, plan.spec, plan.ids);
  if (validation.errors.length) throw new Error(JSON.stringify(validation.errors));
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
      if (!persisted || persisted.name !== write.name || !isDeepStrictEqual(persisted.options, write.options)) throw new Error(`Query ${id} readback differs from intended options.`);
    }
    if (validation.errors.length) throw new Error(JSON.stringify(validation.errors));
    return { workflow_id: plan.workflowId, version_id: plan.versionId, editor_url: saved.editor_url, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids, completed, validation };
  } catch (error) {
    return { failed: true, workflow_id: plan.workflowId, version_id: plan.versionId, phase, completed, attempted_query: attemptedQuery, node_ids: compiled.node_ids, edge_ids: compiled.edge_ids,
      graph_persistence: phase === 'queries' ? 'not_attempted' : phase === 'save' ? 'unknown' : 'saved',
      error: error instanceof Error ? error.message : String(error),
      recovery: 'Inspect get_workflow and its queries; reuse persisted IDs when replanning. Do not repeat creation blindly. No resources were automatically deleted.' };
  }
}
