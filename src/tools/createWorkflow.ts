import type { ToolJetClient } from '../tooljetClient.js';
import { createWorkflowInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function createWorkflowTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_workflow',
    title: 'Create Workflow',
    description: 'Create an editable ToolJet workflow draft. Does not execute, publish, or configure triggers. Inspect get_workflow before adding its start node.',
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    inputSchema: createWorkflowInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = createWorkflowInputSchema.parse(args);
        return ok(await client.workflows.create(input.name));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
