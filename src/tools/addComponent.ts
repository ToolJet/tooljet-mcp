import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const layoutSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

export function addComponentTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_component',
    description:
      'Place a component on an app page. `name` is required. A Table binds data via ' +
      'properties.data.value = "{{queries.<queryName>.data}}".',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      name: z.string(),
      type: z.string(),
      properties: z.record(z.string(), z.any()),
      layout: layoutSchema,
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      name: string;
      type: string;
      properties: Record<string, unknown>;
      layout: { top: number; left: number; width: number; height: number };
    }) {
      try {
        const result = await client.createComponent({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          name: args.name,
          type: args.type,
          properties: args.properties,
          layout: args.layout,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
