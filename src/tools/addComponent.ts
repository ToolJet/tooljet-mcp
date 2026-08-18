import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const layoutSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

const layoutsSchema = z.object({
  desktop: layoutSchema.optional(),
  mobile: layoutSchema.optional(),
});

export function addComponentTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_component',
    description:
      'Place a component on an app page. `name` is required. A Table binds data via ' +
      'properties.data.value = "{{queries.<queryName>.data}}". ' +
      'IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, …) ' +
      'in the top-level `styles` object, NOT under `properties` — ToolJet silently ignores styles nested ' +
      'in properties (and this tool will reject them). Provide either `layout` (one rectangle applied to ' +
      'both resolutions) or `layouts:{desktop,mobile}` for per-resolution placement.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      name: z.string(),
      type: z.string(),
      properties: z.record(z.string(), z.any()),
      styles: z.record(z.string(), z.any()).optional(),
      validation: z.record(z.string(), z.any()).optional(),
      others: z.record(z.string(), z.any()).optional(),
      layout: layoutSchema.optional(),
      layouts: layoutsSchema.optional(),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      name: string;
      type: string;
      properties: Record<string, unknown>;
      styles?: Record<string, unknown>;
      validation?: Record<string, unknown>;
      others?: Record<string, unknown>;
      layout?: { top: number; left: number; width: number; height: number };
      layouts?: {
        desktop?: { top: number; left: number; width: number; height: number };
        mobile?: { top: number; left: number; width: number; height: number };
      };
    }) {
      try {
        const result = await client.createComponent({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          name: args.name,
          type: args.type,
          properties: args.properties,
          styles: args.styles,
          validation: args.validation,
          others: args.others,
          layout: args.layout,
          layouts: args.layouts,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
