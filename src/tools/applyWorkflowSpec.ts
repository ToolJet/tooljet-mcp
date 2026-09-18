import type { ToolJetClient } from '../tooljetClient.js';
import { apply } from '../workflows/planner.js';
import { applyWorkflowSpecInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function applyWorkflowSpecTool(client: ToolJetClient): ToolDef {
  return {
    name: 'apply_workflow_spec',
    title: 'Apply Workflow Spec',
    description: 'Apply a validated plan to an editable draft and verify readback. May edit/remove graph objects. Partial writes return IDs for recovery; never blindly retry creation. Does not execute or publish.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: applyWorkflowSpecInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = applyWorkflowSpecInputSchema.parse(args);
        const result = await apply(client.workflows, input.plan_token);
        return result && typeof result === 'object' && 'failed' in result && result.failed
          ? { ...ok(result), isError: true }
          : ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  };
}
