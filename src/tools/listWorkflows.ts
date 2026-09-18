import type { ToolJetClient } from '../tooljetClient.js';
import { listWorkflowsInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function listWorkflowsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_workflows',
    title: 'List Workflows',
    description: 'List workflows in the active workspace.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: listWorkflowsInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = listWorkflowsInputSchema.parse(args);
        return ok(await client.workflows.list(input.page, input.search));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
