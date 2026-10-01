import type { AppSummary, EventSpec } from './tooljetClient.js';

// Match the event runner's truthy gate before resolving runOnlyIf. Do not
// evaluate arbitrary JS or claim that a dynamic guard guarantees termination.
function unconditional(action: Record<string, unknown>): boolean {
  if (action.disabled) return false;
  const guard = action.runOnlyIf;
  return !guard || guard === true ||
    (typeof guard === 'string' && /^(?:true|\{\{\s*true\s*\}\})$/.test(guard.trim()));
}

/** Reject newly introduced unconditional success cycles, not unrelated existing
 * cycles or intentionally guarded refresh/retry flows. RunJS bodies are opaque. */
export function queryEventCycleErrors(summary: AppSummary, additions: EventSpec[], persisted: EventSpec[]): string[] {
  const names = new Map(summary.queries.map(q => [q.id, q.name ?? q.id]));
  const resolve = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    if (names.has(value)) return value;
    const matches = summary.queries.filter(q => q.name === value);
    return matches.length === 1 ? matches[0]!.id : undefined;
  };
  const edge = (event: EventSpec): [string, string] | undefined => {
    if (event.sourceType !== 'data_query' || !names.has(event.sourceId) ||
        event.action.actionId !== 'run-query' || !unconditional(event.action)) return undefined;
    const target = resolve(event.action.queryId);
    return target ? [event.sourceId, target] : undefined;
  };
  const graph = new Map<string, Set<string>>();
  for (const event of [...persisted, ...additions]) {
    if (event.trigger !== 'onDataQuerySuccess') continue;
    const pair = edge(event);
    if (!pair) continue;
    const targets = graph.get(pair[0]) ?? new Set<string>();
    targets.add(pair[1]); graph.set(pair[0], targets);
  }
  const reaches = (start: string, end: string): boolean => {
    const queue = [start], visited = new Set<string>();
    while (queue.length) {
      const current = queue.pop()!;
      if (current === end) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of graph.get(current) ?? []) queue.push(next);
    }
    return false;
  };
  const errors: string[] = [];
  for (const event of additions) {
    const pair = edge(event);
    if (!pair) continue;
    const [source, target] = pair;
    const successCycle = event.trigger === 'onDataQuerySuccess' && reaches(target, source);
    const failureSelfRetry = event.trigger === 'onDataQueryFailure' && source === target;
    if (successCycle || failureSelfRetry) errors.push(
      `Query "${names.get(source)}" -> "${names.get(target)}" creates an unconditional query ${failureSelfRetry ? 'failure retry' : 'success cycle'}. ` +
      'This can repeat queries and writes after one click. Refresh a separate read query with no return edge, or use an explicit bounded retry/termination guard.');
  }
  return [...new Set(errors)];
}
