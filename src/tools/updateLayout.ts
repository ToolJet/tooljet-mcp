import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintComponentSlots, lintComponentSpec, lintRenderedGeometry, type LintComponent } from '../lint.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, encodeComponentParent } from '../componentParent.js';
import { ok, fail, type ToolDef } from './types.js';

const rect = z.object({ top: z.number(), left: z.number(), width: z.number(), height: z.number() });

export function updateLayoutTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_layout',
    description:
      'Move / resize existing components (batch) without touching their properties. `left`/`width` are ' +
      'in grid columns (43 desktop); `top`/`height` are pixels snapped to ToolJet\'s 10px grid. Provide desktop and/or mobile per ' +
      'component. Use this to fix overlaps or reflow a page. Set `parent` to reparent; use `slot_name` ' +
      '(header/body/footer) for native ModalV2/Form/Container regions, or `tab_id` for a Tabs pane. ' +
      '`slot_name`/`tab_id` alone keeps the current parent.',
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
            tab_id: z.string().min(1).optional(),
          }).superRefine((layout, context) => {
            if (layout.slot_name && layout.tab_id !== undefined) {
              context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use slot_name or tab_id, not both.' });
            }
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
        tab_id?: string;
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
        const rootSlotWarnings: string[] = [];
        const resolvedLayouts = args.layouts.map((layout) => {
          const current = components.get(layout.component_id)!;
          let parent = layout.parent;
          let slot_name = layout.slot_name;
          const tab_id = layout.tab_id;
          if (slot_name !== undefined || tab_id !== undefined) {
            parent ??= current.parent_id ?? (current.parent ? decodeComponentParent(current.parent).parentId : undefined);
            if (!parent) {
              if (slot_name === 'body' && tab_id === undefined) {
                // A root/parentless component has no slots; "body" is the implicit default, so
                // slot_name:"body" here is a redundant no-op. Drop it and warn instead of erroring —
                // a frequent model mistake that otherwise triggers identical repair retries.
                rootSlotWarnings.push(
                  `Component "${layout.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`
                );
                slot_name = undefined;
              } else {
                throw new Error(
                  `Component "${layout.component_id}": ${tab_id !== undefined ? `tab_id:"${tab_id}"` : `slot_name:"${slot_name}"`} ` +
                    'requires an existing or explicit parent.'
                );
              }
            }
          }
          return { ...layout, parent, slot_name, tab_id };
        });
        const changes = new Map(resolvedLayouts.map((layout) => [layout.component_id, layout]));
        const projected = page.components.map((component) => {
          const change = changes.get(component.id);
          if (!change) return component as LintComponent;
          const currentLayouts = (component.layouts ?? {}) as LintComponent['layouts'];
          const placementChanging = change.parent !== undefined;
          const {
            parent_id: _currentParentId,
            tab_id: _currentTabId,
            slot_name: _currentSlotName,
            ...componentWithoutPersistedPlacement
          } = component;
          return {
            ...(placementChanging ? componentWithoutPersistedPlacement : component),
            layouts: {
              ...currentLayouts,
              desktop: change.desktop ?? currentLayouts?.desktop,
              mobile: change.mobile ?? currentLayouts?.mobile,
            },
            ...(placementChanging
              ? {
                  parent: encodeComponentParent(change.parent!, change.slot_name, change.tab_id),
                  parentId: change.parent,
                  slotName: change.slot_name,
                  tabId: change.tab_id,
                }
              : {}),
          } as LintComponent;
        });
        const slotErrors = lintComponentSlots(projected);
        if (slotErrors.length) return fail(new Error(slotErrors.join(' ')));
        const changedIds = new Set(resolvedLayouts.map((layout) => layout.component_id));
        const warnings = [...new Set([
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
            tabId: l.tab_id,
          })),
        });
        return ok({ ...result, warnings });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
