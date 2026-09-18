import type { ToolJetClient } from '../tooljetClient.js';
import { getWorkflowCapabilities } from '../workflows/capabilities.js';
import { capabilityRequestSchema } from '../workflows/capabilitySchema.js';
import { fail, ok, type ToolDef } from './types.js';

export function getWorkflowCapabilitiesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_workflow_capabilities',
    title: 'Get Workflow Capabilities',
    description: 'List authorable workflow node types and configured datasource capabilities for one workflow version. Does not inspect credentials, create resources, or execute queries.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: capabilityRequestSchema.shape,
    async handler(args: unknown) {
      try {
        return ok(await getWorkflowCapabilities(client, capabilityRequestSchema.parse(args)));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
