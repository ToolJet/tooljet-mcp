import { suggestedHtmlHeight } from '../renderReadiness.js';
import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import {
  introducedLintFindings,
  lintComponentSlots,
  lintComponentSpec,
  lintKanbanInteractions,
  lintRenderedGeometry,
  lintStandardSingleLineInputHeight,
  lintTextGeometry,
  lintUnusableTextGeometry,
  type LintComponent,
} from '../lint.js';
import { COMPONENT_SLOT_NAMES, decodeComponentParent, encodeComponentParent } from '../componentParent.js';
import { ok, fail, type ToolDef } from './types.js';
import { normalizeComponentSpec } from '../componentNormalization.js';
import { resolveRef } from '../refResolution.js';
import { hasNonEmptyDefinition, strictEntry } from '../strictEntry.js';

const DEFINITION_SECTIONS = ['properties', 'styles', 'validation', 'general', 'general_styles', 'others'] as const;

const definitionSchema = strictEntry(
  {
    properties: z.record(z.string(), z.any()).optional(),
    styles: z.record(z.string(), z.any()).optional(),
    validation: z.record(z.string(), z.any()).optional(),
    general: z.record(z.string(), z.any()).optional(),
    general_styles: z.record(z.string(), z.any()).optional(),
    others: z.record(z.string(), z.any()).optional(),
  },
  (key) =>
    key === 'layout' || key === 'layouts'
      ? `definition."${key}" is not a component definition section; move/resize with update_layout instead.`
      : `definition."${key}" is not a component definition section; use one of ${DEFINITION_SECTIONS.join('/')}.`
);

// Unknown entry keys are rejected, never stripped: a stripped `properties` produced an empty diff
// that ToolJet accepted with 200 and the tool reported as updated (see src/strictEntry.ts).
const updateSchema = strictEntry(
  {
    component_id: z.string(),
    definition: definitionSchema.optional(),
    name: z.string().optional(),
    parent: z.string().optional(),
    slot_name: z.enum(COMPONENT_SLOT_NAMES).optional(),
  },
  (key) => {
    if ((DEFINITION_SECTIONS as readonly string[]).includes(key)) {
      return `Update entry key "${key}" must be nested under \`definition\` (e.g. { component_id, definition: { ${key}: {...} } }); top-level ${key} would write nothing.`;
    }
    if (key === 'layout' || key === 'layouts') {
      return `Update entry key "${key}" is not accepted by update_components; move/resize with update_layout instead.`;
    }
    return `Unknown update entry key "${key}"; accepted keys are component_id, definition, name, parent, slot_name.`;
  }
);

export function updateComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_components',
    title: 'Update Components',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves ' +
      'under `definition` (properties/styles/validation/others) — ToolJet deep-merges, so untouched ' +
      'values are preserved. Leaves may be raw values or `{ value: ... }` envelopes; MCP canonicalizes them. ' +
      'NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are ' +
      'REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent/slot_name per entry, ' +
      'not both. `slot_name` accepts header/body/footer and can move a child between native ModalV2/Form/Container ' +
      'regions; omit parent to keep the current parent. Unknown entry keys are rejected (a top-level properties/styles ' +
      'patch is an error, not a silent no-op), and an entry that changes nothing fails. Get component ids + current ' +
      'values from get_app_summary / get_component.',
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
        const projected = new Map(page.components.map((component) => [component.id, component as LintComponent]));
        const warnings: string[] = [];
        const errors: string[] = [];
        const changedComponents: Array<{ before: LintComponent; after: LintComponent }> = [];
        let placementChanged = false;
        const layoutFixes: Array<{ componentId: string; desktop: never }> = [];
        const resolvedUpdates: Array<{
          componentId: string;
          definition?: Record<string, unknown>;
          name?: string;
          parent?: string;
          slotName?: 'body' | 'header' | 'footer';
        }> = [];
        for (const update of args.updates) {
          // Models routinely pass the component NAME here — it is the stable handle they authored and
          // what every binding uses, and sibling tools (get_app_summary, delete_components) speak names
          // too. Looking up only by id and then reporting "does not exist" is actively misleading: the
          // component DOES exist, so the model re-reads the page, sees it, retries the same call, and
          // loops. Observed live burning >1M tokens on a single build. Resolve an unambiguous name to
          // its id instead, and when nothing matches say what is actually on the page.
          const resolution = resolveRef(page.components, update.component_id, 'Component', `on page "${args.page_id}"`);
          if (!resolution.ok) {
            errors.push(resolution.error);
            continue;
          }
          if (resolution.warning) warnings.push(resolution.warning);
          const current = resolution.target;
          const componentId = current.id;
          if (update.definition && (update.name !== undefined || update.parent !== undefined || update.slot_name !== undefined)) {
            errors.push(
              `Component "${update.component_id}": set EITHER definition OR name/parent/slot_name in one entry.`
            );
            continue;
          }
          // An entry with nothing to write must fail here. Letting it through produced an empty diff
          // that ToolJet accepted with 200 and this tool reported as `updated`, so a model kept
          // believing edits had landed when nothing was persisted.
          if (
            !hasNonEmptyDefinition(update.definition) &&
            update.name === undefined && update.parent === undefined && update.slot_name === undefined
          ) {
            errors.push(
              `Component "${update.component_id}": nothing to update. Send the changed leaves under definition ` +
                '(properties/styles/validation/others) or a name/parent/slot_name change.'
            );
            continue;
          }
          let parent = update.parent;
          let slotName = update.slot_name;
          if (slotName !== undefined) {
            parent ??= current.parent ? decodeComponentParent(current.parent).parentId : undefined;
            if (!parent) {
              if (slotName === 'body') {
                // Root/parentless component has no slots; "body" is the implicit default. Drop the
                // redundant slot_name and warn instead of erroring (a frequent model mistake that
                // otherwise triggers identical repair retries).
                warnings.push(
                  `Component "${update.component_id}": slot_name:"body" ignored on a root component (it has no parent slots).`
                );
                slotName = undefined;
              } else {
                errors.push(`Component "${update.component_id}": slot_name:"${slotName}" requires an existing or explicit parent.`);
                continue;
              }
            }
          }
          const definition = update.definition as {
            properties?: Record<string, unknown>;
            styles?: Record<string, unknown>;
            validation?: Record<string, unknown>;
            others?: Record<string, unknown>;
          } | undefined;
          const next: LintComponent = {
            id: current.id,
            name: update.name ?? current.name ?? current.id,
            type: current.type,
            properties: { ...(current.properties ?? {}), ...(definition?.properties ?? {}) },
            styles: { ...(current.styles ?? {}), ...(definition?.styles ?? {}) },
            layouts: current.layouts as Parameters<typeof lintComponentSpec>[0]['layouts'],
            parent: parent !== undefined
              ? encodeComponentParent(parent, slotName)
              : current.parent,
            slotName: slotName,
          };
          const normalized = normalizeComponentSpec({
            name: next.name ?? current.id,
            type: next.type ?? current.type ?? '',
            properties: next.properties ?? {},
            styles: next.styles,
            validation: definition?.validation,
            others: { ...(current.others ?? {}), ...(definition?.others ?? {}) },
            layouts: next.layouts,
            parent: next.parent,
          });
          const normalizedNext = { ...normalized.component, id: current.id } as LintComponent;
          // New markup that no longer fits its box: raise the box (a second, layout write) instead of
          // rejecting the update. The plan and add paths do the same.
          const heightFix = update.definition ? suggestedHtmlHeight(normalizedNext as never) : null;
          const desktopRect = (current.layouts as { desktop?: Record<string, unknown> } | undefined)?.desktop;
          if (heightFix && desktopRect && typeof desktopRect.top === 'number') {
            normalizedNext.layouts = { ...(normalizedNext.layouts ?? {}), desktop: { ...(desktopRect as object), height: heightFix.to } } as LintComponent['layouts'];
            layoutFixes.push({ componentId: current.id, desktop: { ...(desktopRect as object), height: heightFix.to } as never });
            warnings.push(
              `Html "${normalizedNext.name ?? current.id}" needed about ${heightFix.needed}px for its new markup but was ${heightFix.from}px; ` +
                `its height is now ${heightFix.to}px. Anything within ${heightFix.to - heightFix.from}px below it now overlaps; move it down.`
            );
          }
          projected.set(current.id, normalizedNext);
          if (update.definition) changedComponents.push({ before: current as LintComponent, after: normalizedNext });
          placementChanged ||= update.parent !== undefined || update.slot_name !== undefined;
          warnings.push(...normalized.warnings);
          let normalizedDefinition = update.definition;
          if (update.definition && Object.keys(normalized.patch).length) {
            normalizedDefinition = { ...update.definition };
            for (const section of ['properties', 'styles', 'validation', 'others'] as const) {
              const sectionPatch = normalized.patch[section];
              if (!sectionPatch) continue;
              normalizedDefinition[section] = {
                ...((update.definition as Record<string, Record<string, unknown> | undefined>)[section] ?? {}),
                ...sectionPatch,
              };
            }
          }
          resolvedUpdates.push({
            componentId,
            definition: normalizedDefinition,
            name: update.name,
            parent,
            slotName: update.slot_name,
          });
          if (!update.definition) continue;
          errors.push(...introducedLintFindings(
            lintComponentSpec(current as LintComponent).errors,
            lintComponentSpec(normalizedNext).errors
          ));
          warnings.push(...introducedLintFindings(
            lintComponentSpec(current as LintComponent).warnings,
            lintComponentSpec(normalizedNext).warnings
          ));
        }
        const allComponents = [...projected.values()];
        const introducedForChanged = (lint: (components: LintComponent[]) => string[]) =>
          changedComponents.flatMap(({ before, after }) =>
            introducedLintFindings(lint([before]), lint([after]))
          );
        if (placementChanged) {
          errors.push(...introducedLintFindings(
            lintComponentSlots(page.components as LintComponent[]),
            lintComponentSlots(allComponents)
          ));
        }
        errors.push(...introducedForChanged(lintUnusableTextGeometry));
        if (errors.length) return fail(new Error(errors.join(' ')));
        warnings.push(...introducedForChanged((items) => items.flatMap(lintStandardSingleLineInputHeight)));
        warnings.push(...introducedForChanged(lintTextGeometry));
        warnings.push(...lintRenderedGeometry(allComponents));
        warnings.push(...lintKanbanInteractions(allComponents));
        const result = await client.updateComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          updates: resolvedUpdates,
        });
        if (layoutFixes.length) {
          await client.updateLayouts({ appId: args.app_id, versionId: args.version_id, pageId: args.page_id, layouts: layoutFixes });
        }
        return ok({ ...result, warnings: [...new Set(warnings)] });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
