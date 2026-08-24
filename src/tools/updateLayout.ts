import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintComponentSlots, lintComponentSpec, lintRenderedGeometry, type LintComponent } from '../lint.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, encodeComponentParent } from '../componentParent.js';
import { ok, fail, type ToolDef } from './types.js';
import { resolveRef } from '../refResolution.js';

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
        // Accept a component NAME as component_id — the same slip that made update_components loop
        // forever on a false "does not exist". Resolved ids are substituted below so the write is
        // unaffected. See src/refResolution.ts for why this matters.
        const layoutWarnings: string[] = [];
        const resolveErrors: string[] = [];
        const resolvedIds = new Map<string, string>();
        for (const layout of args.layouts) {
          if (resolvedIds.has(layout.component_id)) continue;
          const resolution = resolveRef(page.components, layout.component_id, 'Component', `on page "${args.page_id}"`);
          if (!resolution.ok) {
            resolveErrors.push(resolution.error);
            continue;
          }
          resolvedIds.set(layout.component_id, resolution.target.id);
          if (resolution.warning) layoutWarnings.push(resolution.warning);
        }
        if (resolveErrors.length) return fail(new Error(resolveErrors.join(' ')));
        args = {
          ...args,
          layouts: args.layouts.map((layout) => ({
            ...layout,
            component_id: resolvedIds.get(layout.component_id) ?? layout.component_id,
          })),
        };
        const rootSlotWarnings: string[] = [];
        const resolvedLayouts = args.layouts.map((layout) => {
          const current = components.get(layout.component_id)!;
          let parent = layout.parent;
          let slot_name = layout.slot_name;
          if (slot_name !== undefined) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : undefined;
            if (!parent) {
              if (slot_name === 'body') {
                // A root/parentless component has no slots; "body" is the implicit default, so
                // slot_name:"body" here is a redundant no-op. Drop it and warn instead of erroring —
                // a frequent model mistake that otherwise triggers identical repair retries.
                rootSlotWarnings.push(
                  `Component "${layout.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`
                );
                slot_name = undefined;
              } else {
                throw new Error(`Component "${layout.component_id}": slot_name:"${slot_name}" requires an existing or explicit parent.`);
              }
            }
          }
          return { ...layout, parent, slot_name };
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
        const changedIds = new Set(resolvedLayouts.map((layout) => layout.component_id));
        const warnings = [...new Set([
          ...layoutWarnings,
          ...rootSlotWarnings,
          ...projected
            .filter((component) => component.id && changedIds.has(component.id))
            .flatMap((component) => lintComponentSpec(component).warnings),
          ...lintRenderedGeometry(projected),
        ])];
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
