const MAX_BYTES = 60_000;
const size = (value: unknown) => Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
function bounded(value: unknown, budget: number): unknown {
  const bytes = size(value);
  return bytes <= budget ? value : { truncated: true, bytes, message: 'Payload omitted. Open the workflow in ToolJet to inspect this value.' };
}

/** Keep status, pagination and small node results usable even when one payload is huge. */
export function boundWorkflowExecutionResult(value: unknown): unknown {
  if (size(value) <= MAX_BYTES) return value;
  const data = record(value);
  if (data.execution_id !== undefined && data.nodes !== undefined) {
    const status = record(data.status);
    const page = record(data.nodes);
    const rows = Array.isArray(page.data) ? page.data : [];
    const budget = Math.floor(40_000 / Math.max(rows.length, 1));
    const nodes = rows.map(row => {
      if (size(row) <= budget) return row;
      const node = record(row);
      return {
        id: node.id, idOnWorkflowDefinition: node.idOnWorkflowDefinition,
        executed: node.executed, status: node.status, truncated: true,
        result: bounded(node.result, Math.floor(budget / 2)),
        message: 'Large node details omitted. Open the workflow in ToolJet for the full payload.',
      };
    });
    const result = {
      execution_id: data.execution_id, truncated: true,
      status: { status: status.status, logs: bounded(status.logs, 8_000) },
      page: data.page, per_page: data.per_page,
      nodes: { data: nodes, page: page.page, per_page: page.per_page, total: page.total, total_pages: page.total_pages },
    };
    if (size(result) <= MAX_BYTES) return result;
    return { ...result, nodes: { ...result.nodes, data: bounded(nodes, 40_000) } };
  }
  const execution = record(data.workflowExecution);
  return {
    truncated: true,
    execution_id: data.execution_id ?? execution.id,
    status: execution.status,
    executed: execution.executed,
    message: 'Result exceeds 60 KB. Use get_workflow_execution for status and paginated node results, or open the workflow in ToolJet.',
  };
}
