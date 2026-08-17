import type { ToolJetClient } from '../tooljetClient.js';
import { getCatalog } from '../catalog.js';
import { ok, fail, type ToolDef } from './types.js';

export function getComponentCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_component_catalog',
    description:
      'List the component types that can be placed with add_component, and their key properties (including which properties accept ToolJet bindings).',
    inputSchema: {},
    async handler(_args: Record<string, never>) {
      try {
        return ok(getCatalog());
      } catch (err) {
        return fail(err);
      }
    },
  };
}
