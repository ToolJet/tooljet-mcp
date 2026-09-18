import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { nodeCatalog, specSchema } from '../workflows/graph.js';
import { fail, ok, type ToolDef } from './types.js';

export function getWorkflowNodeCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_workflow_node_catalog',
    title: 'Get Workflow Node Catalog',
    description: 'Supported workflow node types, ports and exact authoring schema. Unsupported native nodes are preserved, not authored.',
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    inputSchema: {},
    async handler() {
      try {
        return ok({ ...nodeCatalog, spec_schema: z.toJSONSchema(specSchema) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
