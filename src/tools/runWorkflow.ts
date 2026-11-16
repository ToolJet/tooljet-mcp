import type { ToolJetClient } from '../tooljetClient.js';
import { boundWorkflowExecutionResult } from '../workflows/executionResult.js';
import { runWorkflowInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function runWorkflowTool(client: ToolJetClient): ToolDef {
  return {
    name: 'run_workflow',
    title: 'Run Workflow',
    description: 'Start one execution of an existing saved ToolJet workflow version in the selected environment, passing its input data in params. This calls the workflow-run API; params are workflow data, not an operation selector or executable graph. The saved workflow itself can perform datasource writes, send requests, and execute arbitrary code, so authorize that workflow and its effects before calling. This tool does not author or modify the workflow, publish it, or enable a disabled workflow. Never automatically retry a timeout: execution may have completed.',
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
