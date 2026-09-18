import type { ToolJetClient } from '../tooljetClient.js';
import { lint } from '../workflows/planner.js';
import { lintWorkflowSpecInputSchema } from '../workflows/toolSchemas.js';
import { fail, ok, type ToolDef } from './types.js';

export function lintWorkflowSpecTool(client: ToolJetClient): ToolDef {
  return {
    name: 'lint_workflow_spec',
    title: 'Lint Workflow Spec',
    description: 'Validate graph edits, query options, and runtime prerequisites without executing or saving. Returns a scoped one-use plan token when runnable, or for an editable draft only when allow_draft is true. Omitted nodes/edges are preserved; removals require explicit IDs.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: lintWorkflowSpecInputSchema.shape,
    async handler(args: unknown) {
      try {
        const input = lintWorkflowSpecInputSchema.parse(args);
        return ok(await lint(client.workflows, input.workflow_id, input.version_id, input.spec, input.allow_draft));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
