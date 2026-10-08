import type { ToolJetClient } from '../tooljetClient.js';
import { deleteNode } from '../workflows/planner.js';
import { deleteWorkflowNodeInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function deleteWorkflowNodeTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_workflow_node',
    title: 'Delete Workflow Node',
    description: 'Delete one workflow node and all incident edges. Saves the graph before deleting a query only when no remaining mapping references it. Incomplete drafts can be cleaned up; remaining runtime blockers are returned. Does not execute or publish. A failed query deletion leaves only an orphaned query; inspect the returned recovery details before retrying.',
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    inputSchema: deleteWorkflowNodeInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = deleteWorkflowNodeInputSchema.parse(args);
        const result = await deleteNode(client.workflows, input.workflow_id, input.version_id, input.node_id);
        return result && typeof result === 'object' && 'failed' in result && result.failed
          ? { ...ok(result), isError: true }
          : ok(result);
      } catch (error) {
        return fail(error);
      }
    },
  };
}
