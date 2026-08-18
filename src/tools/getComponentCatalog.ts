import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getCatalog, getComponentSchema } from '../catalog.js';
import { ok, fail, type ToolDef } from './types.js';

export function getComponentCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_component_catalog',
    description:
      'Discover ToolJet components. Call with no argument to list every component type + its purpose (the palette). Call with `type` (e.g. "Statistics", "Chart", "Table", "Form") to get its full authoring contract: properties/styles with defaults, event triggers, exposed runtime variables, component actions, default size, and semantic default children. Use this before add_component/add_events instead of guessing ids or bindings.',
    inputSchema: {
      type: z.string().optional(),
    },
    async handler(args: { type?: string }) {
      try {
        if (args?.type) {
          const schema = getComponentSchema(args.type);
          if (!schema) {
            return ok({ error: `Unknown component type "${args.type}". Call with no argument to list valid types.` });
          }
          return ok(schema);
        }
        return ok(getCatalog());
      } catch (err) {
        return fail(err);
      }
    },
  };
}
