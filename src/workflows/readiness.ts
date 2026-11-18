import { controlFlowEdges, type Definition, type Issue } from './graph.js';
import { humanConfigurationErrors } from './nodeContracts.js';

export type RuntimeReadiness = 'runnable' | 'draft_only' | 'blocked';

export function workflowReadiness(graph: Definition, structuralErrors: Issue[]): {
  runtime_readiness: RuntimeReadiness;
  blockers: Issue[];
} {
  if (structuralErrors.length) return { runtime_readiness: 'blocked', blockers: structuralErrors };

  const adjacency = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  for (const edge of controlFlowEdges(graph)) adjacency.get(edge.source)?.push(edge.target);
  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const target of adjacency.get(id) ?? []) visit(target);
  };
  for (const start of graph.nodes.filter(node => node.type === 'input' && node.data.nodeType === 'start')) visit(start.id);

  const blockers: Issue[] = [];
  for (const node of graph.nodes.filter(node => reachable.has(node.id))) {
    const issues: string[] = [];
    if (node.type === 'query' && node.data.looped === true && (typeof node.data.iterationValuesCode !== 'string' || !node.data.iterationValuesCode.trim())) issues.push('Loop requires an array expression.');
    if (node.type === 'human') issues.push(...humanConfigurationErrors(node.data));
    if (node.type === 'wait') {
      const duration = node.data.durationSeconds;
      if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 1 || duration > 2592000) issues.push('Wait duration must be between 1 second and 30 days.');
    }
    if (node.type === 'filter' && [node.data.inputExpression, node.data.predicateExpression].some(value => typeof value !== 'string' || !value.trim())) issues.push('Filter requires input and predicate expressions.');
    if (node.type === 'if-condition') {
      const conditions = Array.isArray(node.data.conditions) ? node.data.conditions : [{ code: node.data.code }];
      if (!conditions.length || conditions.some(branch => !branch || typeof branch.code !== 'string' || !branch.code.trim())) issues.push('Every condition branch requires an expression.');
    }
    for (const message of issues) blockers.push({ code: 'node_configuration', path: `nodes.${node.id}`, message });
  }
  for (const filter of graph.nodes.filter(node => node.type === 'filter')) {
    if (!controlFlowEdges(graph).some(edge => edge.target === filter.id)) blockers.push({
      code: 'filter_missing_input', path: `nodes.${filter.id}`,
      message: 'Filter requires one upstream connection before it can run.',
    });
  }
  for (const agent of graph.nodes.filter(node => node.type === 'agent' && reachable.has(node.id))) {
    const attachment = graph.edges.find(edge => edge.target === agent.id && edge.targetHandle === 'ai-model');
    const child = attachment && graph.nodes.find(node => node.id === attachment.source);
    const definitionId = child?.data.idOnDefinition;
    const mapping = typeof definitionId === 'string' && graph.queries.find(query => query.idOnDefinition === definitionId);
    if (!attachment || !child || !mapping) blockers.push({
      code: 'agent_missing_model',
      path: `nodes.${agent.id}.model`,
      message: 'Reachable Agent requires one configured AI model attachment.',
    });
  }
  return { runtime_readiness: blockers.length ? 'draft_only' : 'runnable', blockers };
}
