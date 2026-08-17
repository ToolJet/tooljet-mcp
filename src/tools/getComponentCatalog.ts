import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getCatalog, getComponentSchema } from '../catalog.js';
import { ok, fail, type ToolDef } from './types.js';

export function getComponentCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_component_catalog',
    description:
      'Discover ToolJet components. Call with no argument to list every component type + its purpose (the palette). Call with `type` (e.g. "Statistics", "Chart", "Table") to get that component\'s full property schema — its properties (key, type, default), defaultSize, and styles — so you can configure it correctly with add_component instead of guessing.',
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
