import type { ToolJetClient } from '../tooljetClient.js';
import { validateGraph } from '../workflows/graph.js';
import { validateWorkflowInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function validateWorkflowTool(client: ToolJetClient): ToolDef {
  return {
    name: 'validate_workflow',
    title: 'Validate Workflow',
    description: 'Check persisted graph structure and query ownership without execution. Does not prove runtime correctness.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: validateWorkflowInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = validateWorkflowInputSchema.parse(args);
        const snapshot = await client.workflows.get(input.workflow_id, input.version_id);
        const queries = await client.workflows.getQueries(input.version_id);
        return ok({
          workflow_id: input.workflow_id,
          version_id: input.version_id,
          ...validateGraph(snapshot.definition, new Set(queries.map((query) => query.id))),
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
