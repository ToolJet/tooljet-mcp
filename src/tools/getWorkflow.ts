import type { ToolJetClient } from '../tooljetClient.js';
import { getWorkflowInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function getWorkflowTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_workflow',
    title: 'Get Workflow',
    description: 'Read a workflow graph and query options. Use returned node IDs as existing_id when editing. Omitted version selects the current editing version, which may be read-only.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: getWorkflowInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = getWorkflowInputSchema.parse(args);
        const snapshot = await client.workflows.get(input.workflow_id, input.version_id);
        return ok({ ...snapshot, queries: await client.workflows.getQueries(snapshot.version_id) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
