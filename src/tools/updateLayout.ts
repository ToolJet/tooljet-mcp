import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const rect = z.object({ top: z.number(), left: z.number(), width: z.number(), height: z.number() });

export function updateLayoutTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_layout',
    description:
      'Move / resize existing components (batch) without touching their properties. `left`/`width` are ' +
      'in grid columns (43 desktop), `top`/`height` in grid rows. Provide desktop and/or mobile per ' +
      'component. Use this to fix overlaps or reflow a page. Set `parent` only to reparent into a ' +
      'container/tab.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      layouts: z
        .array(
          z.object({
            component_id: z.string(),
            desktop: rect.optional(),
            mobile: rect.optional(),
            parent: z.string().optional(),
          })
        )
        .min(1),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      layouts: Array<{
        component_id: string;
        desktop?: { top: number; left: number; width: number; height: number };
        mobile?: { top: number; left: number; width: number; height: number };
        parent?: string;
      }>;
    }) {
      try {
        const result = await client.updateLayouts({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          layouts: args.layouts.map((l) => ({
            componentId: l.component_id,
            desktop: l.desktop,
            mobile: l.mobile,
            parent: l.parent,
          })),
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
