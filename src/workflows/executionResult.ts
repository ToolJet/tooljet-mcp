/** Keep structured data intact when output is large. Never truncate serialized JSON midway. */
export function boundWorkflowExecutionResult(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (serialized.length <= 60_000) return value;
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const execution = data.workflowExecution as Record<string, unknown> | undefined;
  return {
    truncated: true,
    execution_id: data.execution_id ?? execution?.id,
    message: 'Result exceeds 60 KB. Inspect a smaller node-result page or open the workflow in ToolJet.',
  };
}
