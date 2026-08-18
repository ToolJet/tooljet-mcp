import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintComponentSlots, lintRenderedGeometry, type LintComponent } from '../lint.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, encodeComponentParent } from '../componentParent.js';
import { ok, fail, type ToolDef } from './types.js';

const rect = z.object({ top: z.number(), left: z.number(), width: z.number(), height: z.number() });

export function updateLayoutTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_layout',
    description:
      'Move / resize existing components (batch) without touching their properties. `left`/`width` are ' +
      'in grid columns (43 desktop), `top`/`height` in grid rows. Provide desktop and/or mobile per ' +
      'component. Use this to fix overlaps or reflow a page. Set `parent` to reparent; use `slot_name` ' +
      '(header/body/footer) for native ModalV2/Form/Container regions. `slot_name` alone keeps the current parent.',
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
            slot_name: z.enum(COMPONENT_SLOT_NAMES).optional(),
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
        slot_name?: 'body' | 'header' | 'footer';
      }>;
    }) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page) return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const components = new Map(page.components.map((component) => [component.id, component]));
        const missing = args.layouts
          .filter((layout) => !page.components.some((component) => component.id === layout.component_id))
          .map((layout) => layout.component_id);
        if (missing.length) {
          return fail(new Error(`Components not found on page "${args.page_id}": ${missing.join(', ')}.`));
        }
        const resolvedLayouts = args.layouts.map((layout) => {
          const current = components.get(layout.component_id)!;
          let parent = layout.parent;
          if (layout.slot_name !== undefined) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : undefined;
            if (!parent) {
              throw new Error(`Component "${layout.component_id}": slot_name requires an existing or explicit parent.`);
            }
          }
          return { ...layout, parent };
        });
        const changes = new Map(resolvedLayouts.map((layout) => [layout.component_id, layout]));
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
            parent: change.parent !== undefined
              ? encodeComponentParent(change.parent, change.slot_name)
              : component.parent,
            slotName: change.slot_name,
          } as LintComponent;
        });
        const slotErrors = lintComponentSlots(projected);
        if (slotErrors.length) return fail(new Error(slotErrors.join(' ')));
        const warnings = [...new Set(lintRenderedGeometry(projected))];
        const result = await client.updateLayouts({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          layouts: resolvedLayouts.map((l) => ({
            componentId: l.component_id,
            desktop: l.desktop,
            mobile: l.mobile,
            parent: l.parent,
            slotName: l.slot_name,
          })),
        });
        return ok({ ...result, warnings });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
