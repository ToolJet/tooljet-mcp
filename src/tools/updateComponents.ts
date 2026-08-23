import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import {
  lintComponentSlots,
  lintComponentSpec,
  lintKanbanInteractions,
  lintRenderedGeometry,
  type LintComponent,
} from '../lint.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, encodeComponentParent } from '../componentParent.js';
import { ok, fail, type ToolDef } from './types.js';
import { normalizeComponentSpec } from '../componentNormalization.js';

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
  tab_id: z.string().min(1).optional(),
}).superRefine((update, context) => {
  if (update.slot_name && update.tab_id !== undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Use slot_name or tab_id, not both.' });
  }
});

export function updateComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_components',
    description:
      'Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves ' +
      'under `definition` (properties/styles/validation/general/general_styles/others) — ToolJet deep-merges, so untouched ' +
      'values are preserved. Leaves may be raw values or `{ value: ... }` envelopes; MCP canonicalizes them. ' +
      'NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are ' +
      'REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent/slot_name/tab_id per entry, ' +
      'not both. `slot_name` accepts header/body/footer and can move a child between native ModalV2/Form/Container ' +
      'regions. `tab_id` moves a child into that Tabs pane and must be the tab id, not its title. Omit parent ' +
      'with slot_name/tab_id to keep the current parent. Get component ids + current values from get_app_summary / get_component.',
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
        tab_id?: string;
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
          tabId?: string;
        }> = [];
        for (const update of args.updates) {
          const current = components.get(update.component_id);
          if (!current) {
            errors.push(`Component "${update.component_id}" does not exist on page "${args.page_id}".`);
            continue;
          }
          if (update.definition && (
            update.name !== undefined || update.parent !== undefined ||
            update.slot_name !== undefined || update.tab_id !== undefined
          )) {
            errors.push(
              `Component "${update.component_id}": set EITHER definition OR name/parent/slot_name/tab_id in one entry.`
            );
            continue;
          }
          let parent = update.parent;
          let slotName = update.slot_name;
          const tabId = update.tab_id;
          const placementChanging =
            update.parent !== undefined || update.slot_name !== undefined || update.tab_id !== undefined;
          if (slotName !== undefined || tabId !== undefined) {
            parent ??= current.parent_id ?? (current.parent ? decodeComponentParent(current.parent).parentId : undefined);
            if (!parent) {
              if (slotName === 'body' && tabId === undefined) {
                // Root/parentless component has no slots; "body" is the implicit default. Drop the
                // redundant slot_name and warn instead of erroring (a frequent model mistake that
                // otherwise triggers identical repair retries).
                warnings.push(
                  `Component "${update.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`
                );
                slotName = undefined;
              } else {
                errors.push(
                  `Component "${update.component_id}": ${tabId !== undefined ? `tab_id:"${tabId}"` : `slot_name:"${slotName}"`} ` +
                    'requires an existing or explicit parent.'
                );
                continue;
              }
            }
          }
          const definition = update.definition as {
            properties?: Record<string, unknown>;
            styles?: Record<string, unknown>;
            validation?: Record<string, unknown>;
            general?: Record<string, unknown>;
            general_styles?: Record<string, unknown>;
            others?: Record<string, unknown>;
          } | undefined;
          const next: LintComponent = {
            id: current.id,
            name: update.name ?? current.name ?? current.id,
            type: current.type,
            properties: { ...(current.properties ?? {}), ...(definition?.properties ?? {}) },
            styles: { ...(current.styles ?? {}), ...(definition?.styles ?? {}) },
            validation: { ...(current.validation ?? {}), ...(definition?.validation ?? {}) },
            general: { ...(current.general ?? {}), ...(definition?.general ?? {}) },
            generalStyles: { ...(current.generalStyles ?? {}), ...(definition?.general_styles ?? {}) },
            others: { ...(current.others ?? {}), ...(definition?.others ?? {}) },
            layouts: current.layouts as Parameters<typeof lintComponentSpec>[0]['layouts'],
            parent: parent !== undefined
              ? encodeComponentParent(parent, slotName, tabId)
              : current.parent,
            parentId: parent ?? current.parent_id,
            slotName: placementChanging ? slotName : current.slot_name,
            tabId: placementChanging ? tabId : current.tab_id,
          };
          const normalized = normalizeComponentSpec({
            id: next.id,
            name: next.name ?? current.id,
            type: next.type ?? current.type ?? '',
            properties: next.properties ?? {},
            styles: next.styles,
            validation: next.validation,
            general: next.general,
            generalStyles: next.generalStyles,
            others: next.others,
            layouts: next.layouts,
            parent: next.parent,
            parentId: next.parentId,
            slotName: next.slotName,
            tabId: next.tabId,
          });
          const normalizedNext = normalized.component as LintComponent;
          projected.set(current.id, normalizedNext);
          warnings.push(...normalized.warnings);
          let normalizedDefinition = update.definition;
          if (update.definition) {
            const { general_styles: generalStyles, ...definitionSections } = update.definition;
            normalizedDefinition = {
              ...definitionSections,
              ...(generalStyles ? { generalStyles } : {}),
            };
          }
          if (normalizedDefinition && Object.keys(normalized.patch).length) {
            for (const section of ['properties', 'styles', 'validation', 'general', 'generalStyles', 'others'] as const) {
              const sectionPatch = normalized.patch[section];
              if (!sectionPatch) continue;
              const inputSection = section === 'generalStyles' ? 'general_styles' : section;
              normalizedDefinition[section] = {
                ...((update.definition as Record<string, Record<string, unknown> | undefined>)[inputSection] ?? {}),
                ...sectionPatch,
              };
            }
          }
          const hasDefinition = !!normalizedDefinition && Object.keys(normalizedDefinition).length > 0;
          const hasRawUpdate =
            update.name !== undefined || parent !== undefined || slotName !== undefined || tabId !== undefined;
          if (hasDefinition || hasRawUpdate) {
            resolvedUpdates.push({
              componentId: update.component_id,
              definition: normalizedDefinition,
              name: update.name,
              parent,
              slotName,
              tabId,
            });
          }
          if (!update.definition) continue;
          const lint = lintComponentSpec(normalizedNext, {
            strictSuggestedKeys: {
              property: new Set(Object.keys(definition?.properties ?? {})),
              style: new Set(Object.keys(definition?.styles ?? {})),
            },
          });
          errors.push(...lint.errors);
          warnings.push(...lint.warnings);
        }
        errors.push(...lintComponentSlots([...projected.values()]));
        if (errors.length) return fail(new Error(errors.join(' ')));
        warnings.push(...lintRenderedGeometry([...projected.values()]));
        warnings.push(...lintKanbanInteractions([...projected.values()]));
        const result = resolvedUpdates.length
          ? await client.updateComponents({
              appId: args.app_id,
              versionId: args.version_id,
              pageId: args.page_id,
              updates: resolvedUpdates,
            })
          : { updated: 0 };
        return ok({ ...result, warnings: [...new Set(warnings)] });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
