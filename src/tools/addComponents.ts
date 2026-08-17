import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const layoutSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

const componentSchema = z.object({
  name: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()),
  layout: layoutSchema,
});

export function addComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_components',
    description:
      'Place MANY components on one page in a single call (all share app_id/version_id/page_id). ' +
      'Prefer this over repeated add_component when building an app — it is one request. Returns ' +
      '[{ component_id, name }]. Note: the batch is atomic — if one component is invalid (e.g. missing ' +
      'name), the whole call fails; fix that component and retry.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      components: z.array(componentSchema).min(1),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      components: Array<{
        name: string;
        type: string;
        properties: Record<string, unknown>;
        layout: { top: number; left: number; width: number; height: number };
      }>;
    }) {
      try {
        const result = await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          components: args.components,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
