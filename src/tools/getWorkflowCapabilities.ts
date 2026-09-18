import type { ToolJetClient } from '../tooljetClient.js';
import { getWorkflowCapabilities } from '../workflows/capabilities.js';
import { capabilityRequestSchema } from '../workflows/capabilitySchema.js';
import { fail, ok, type ToolDef } from './types.js';

export function getWorkflowCapabilitiesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_workflow_capabilities',
    title: 'Get Workflow Capabilities',
    description: 'List authorable workflow node types and classify configured datasource instances for one workflow version: ordinary query, AI-model attachment, or email. This is not a datasource option contract. After choosing a datasource, call get_datasource_query_schema with datasource_id + version_id + operation for its exact query fields, allowed operations, response shape, and introspection methods. Does not inspect credentials, create resources, or execute queries.',
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
