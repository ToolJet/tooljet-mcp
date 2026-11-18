import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { workflowOperations, type WorkflowOperationName } from '../workflows/operations.js';
import { ok, fail, type ToolDef } from './types.js';

export function workflowOperationTools(client: ToolJetClient): ToolDef[] {
  const tools: ToolDef[] = Object.entries(workflowOperations).map(([name, operation]) => ({
    name,
    title: name.replaceAll('_', ' '),
    description:
      operation.description +
      ' Uses the signed-in user, current workspace and server permissions. Do not retry a mutation automatically after a timeout.',
    strictInput: true,
    inputSchema: operation.schema.shape,
    annotations: {
      readOnlyHint: operation.method === 'GET' || name === 'get_workflow_execution_states',
      destructiveHint: operation.method !== 'GET' && name !== 'get_workflow_execution_states',
      openWorldHint:
        ('execution' in operation && operation.execution === true) ||
        [
          'set_workflow_packages',
          'rebuild_workflow_bundle',
          'search_workflow_packages',
          'get_workflow_package',
        ].includes(name),
    },
    async handler(input: unknown) {
      try {
        return ok(await client.workflows.manage(name as WorkflowOperationName, input));
      } catch (error) {
        return fail(error);
      }
    },
  }));
  const webhook = z
    .object({ workflow_id: z.string().uuid(), include_credentials: z.boolean().default(false) })
    .strict();
  const watch = z
    .object({ execution_id: z.string().uuid(), seconds: z.number().int().min(1).max(30).default(10) })
    .strict();
  tools.push({
    name: 'get_workflow_webhook',
    title: 'Get workflow webhook',
    description:
      'Read webhook configuration. include_credentials exposes its bearer token only when explicitly needed; never share it.',
    strictInput: true,
    inputSchema: webhook.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    async handler(input: unknown) {
      try {
        const a = webhook.parse(input);
        return ok(await client.workflows.webhook(a.workflow_id, a.include_credentials));
      } catch (e) {
        return fail(e);
      }
    },
  });
  tools.push({
    name: 'watch_workflow_execution',
    title: 'Watch workflow execution',
    description:
      'Collect up to 30 seconds of live SSE execution events, bounded to 100 events and 60 KB. Does not run or retry the workflow. Call get_workflow_execution for the final state.',
    strictInput: true,
    inputSchema: watch.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    async handler(input: unknown) {
      try {
        const a = watch.parse(input);
        return ok(await client.workflows.watch(a.execution_id, a.seconds));
      } catch (e) {
        return fail(e);
      }
    },
  });
  return tools;
}
