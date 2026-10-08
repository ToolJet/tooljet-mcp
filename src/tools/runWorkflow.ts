import type { ToolJetClient } from '../tooljetClient.js';
import { boundWorkflowExecutionResult } from '../workflows/executionResult.js';
import { runWorkflowInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function runWorkflowTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_workflow',
    title: 'Run Workflow',
    description: 'Execute the explicitly selected workflow version/environment with real effects, including datasource writes and arbitrary code. Use only when execution is authorized. Never automatically retry a timeout: execution may have completed. Does not enable disabled workflows.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: runWorkflowInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = runWorkflowInputSchema.parse(args);
        const result = await client.workflows.run(input.workflow_id, input.version_id, input.environment_id, input.params);
        return ok(boundWorkflowExecutionResult(result));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
