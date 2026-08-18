import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintComponentSlots, lintComponentSpec, lintRenderedGeometry, type LintComponent } from '../lint.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, encodeComponentParent } from '../componentParent.js';
import { ok, fail, type ToolDef } from './types.js';

const updateSchema = z.object({
  component_id: z.string(),
  definition: z
    .object({
      properties: z.record(z.string(), z.any()).optional(),
      styles: z.record(z.string(), z.any()).optional(),
      validation: z.record(z.string(), z.any()).optional(),
      general: z.record(z.string(), z.any()).optional(),
      general_styles: z.record(z.string(), z.any()).optional(),
      others: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  name: z.string().optional(),
  parent: z.string().optional(),
  slot_name: z.enum(COMPONENT_SLOT_NAMES).optional(),
});

export function updateComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_components',
    description:
      'Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves ' +
      'under `definition` (properties/styles/validation/others) — ToolJet deep-merges, so untouched ' +
      'values are preserved. NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are ' +
      'REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent/slot_name per entry, ' +
      'not both. `slot_name` accepts header/body/footer and can move a child between native ModalV2/Form/Container ' +
      'regions; omit parent to keep the current parent. Get component ids + current values from get_app_summary / get_component.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      updates: z.array(updateSchema).min(1),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      updates: Array<{
        component_id: string;
        definition?: Record<string, unknown>;
        name?: string;
        parent?: string;
        slot_name?: 'body' | 'header' | 'footer';
      }>;
    }) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const page = summary.pages.find((candidate) => candidate.id === args.page_id);
        if (!page) return fail(new Error(`Page "${args.page_id}" does not exist in app "${args.app_id}".`));
        const components = new Map(page.components.map((component) => [component.id, component]));
        const projected = new Map(page.components.map((component) => [component.id, component as LintComponent]));
        const warnings: string[] = [];
        const errors: string[] = [];
        const resolvedUpdates: Array<{
          componentId: string;
          definition?: Record<string, unknown>;
          name?: string;
          parent?: string;
          slotName?: 'body' | 'header' | 'footer';
        }> = [];
        for (const update of args.updates) {
          const current = components.get(update.component_id);
          if (!current) {
            errors.push(`Component "${update.component_id}" does not exist on page "${args.page_id}".`);
            continue;
          }
          if (update.definition && (update.name !== undefined || update.parent !== undefined || update.slot_name !== undefined)) {
            errors.push(
              `Component "${update.component_id}": set EITHER definition OR name/parent/slot_name in one entry.`
            );
            continue;
          }
          let parent = update.parent;
          if (update.slot_name !== undefined) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : undefined;
            if (!parent) {
              errors.push(`Component "${update.component_id}": slot_name requires an existing or explicit parent.`);
              continue;
            }
          }
          const definition = update.definition as {
            properties?: Record<string, unknown>;
            styles?: Record<string, unknown>;
          } | undefined;
          const next: LintComponent = {
            id: current.id,
            name: update.name ?? current.name ?? current.id,
            type: current.type,
            properties: { ...(current.properties ?? {}), ...(definition?.properties ?? {}) },
            styles: { ...(current.styles ?? {}), ...(definition?.styles ?? {}) },
            layouts: current.layouts as Parameters<typeof lintComponentSpec>[0]['layouts'],
            parent: parent !== undefined
              ? encodeComponentParent(parent, update.slot_name)
              : current.parent,
            slotName: update.slot_name,
          };
          projected.set(current.id, next);
          resolvedUpdates.push({
            componentId: update.component_id,
            definition: update.definition,
            name: update.name,
            parent,
            slotName: update.slot_name,
          });
          if (!update.definition) continue;
          const lint = lintComponentSpec(next);
          errors.push(...lint.errors);
          warnings.push(...lint.warnings);
        }
        errors.push(...lintComponentSlots([...projected.values()]));
        if (errors.length) return fail(new Error(errors.join(' ')));
        warnings.push(...lintRenderedGeometry([...projected.values()]));
        const result = await client.updateComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          updates: resolvedUpdates,
        });
        return ok({ ...result, warnings: [...new Set(warnings)] });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
