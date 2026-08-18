import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintRenderedGeometry, type LintComponent } from '../lint.js';
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
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page) return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const changes = new Map(args.layouts.map((layout) => [layout.component_id, layout]));
        const missing = args.layouts
          .filter((layout) => !page.components.some((component) => component.id === layout.component_id))
          .map((layout) => layout.component_id);
        if (missing.length) {
          return fail(new Error(`Components not found on page "${args.page_id}": ${missing.join(', ')}.`));
        }
        const projected = page.components.map((component) => {
          const change = changes.get(component.id);
          if (!change) return component as LintComponent;
          const currentLayouts = (component.layouts ?? {}) as LintComponent['layouts'];
          return {
            ...component,
            layouts: {
              ...currentLayouts,
              desktop: change.desktop ?? currentLayouts?.desktop,
              mobile: change.mobile ?? currentLayouts?.mobile,
            },
            parent: change.parent ?? component.parent,
          } as LintComponent;
        });
        const warnings = [...new Set(lintRenderedGeometry(projected))];
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
        return ok({ ...result, warnings });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
