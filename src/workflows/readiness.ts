import { controlFlowEdges, type Definition, type Issue } from './graph.js';

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
