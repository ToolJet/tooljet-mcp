import type { ToolJetClient } from '../tooljetClient.js';
import { boundWorkflowExecutionResult } from '../workflows/executionResult.js';
import { getWorkflowExecutionInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function getWorkflowExecutionTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_workflow_execution',
    title: 'Get Workflow Execution',
    description: 'Inspect execution status and a bounded page of node results. Does not start or retry executions.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: getWorkflowExecutionInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = getWorkflowExecutionInputSchema.parse(args);
        const result = await client.workflows.execution(input.execution_id, input.page, input.per_page);
        return ok(boundWorkflowExecutionResult(result));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
