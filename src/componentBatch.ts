import { suggestedHtmlHeight, type ReadinessComponent } from './renderReadiness.js';
import { z } from 'zod';
import { COMPONENT_SLOT_NAMES } from './componentParent.js';
import { materializeRequiredDefaultChildren } from './defaultChildren.js';
import { lintComponents } from './lint.js';
import { normalizeComponentSpec } from './componentNormalization.js';
import { normalizePlannedLayouts } from './layoutNormalization.js';
import type { ComponentSpec } from './tooljetClient.js';

const layoutSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

export const componentInputSchema = z.object({
  name: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()),
  styles: z.record(z.string(), z.any()).optional(),
  validation: z.record(z.string(), z.any()).optional(),
  others: z.record(z.string(), z.any()).optional(),
  layout: layoutSchema.optional(),
  layouts: z.object({ desktop: layoutSchema.optional(), mobile: layoutSchema.optional() }).optional(),
  client_ref: z.string().optional(),
  parent_ref: z.string().optional(),
  parent: z.string().optional(),
  slot_name: z.enum(COMPONENT_SLOT_NAMES).optional(),
});

export type ComponentInput = z.infer<typeof componentInputSchema>;

function containsListItemBinding(value: unknown): boolean {
  if (typeof value === 'string') return /\blistItem\b/.test(value);
  if (Array.isArray(value)) return value.some(containsListItemBinding);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsListItemBinding);
  }
  return false;
}

export interface PreparedComponentBatch {
  components: ComponentSpec[];
  errors: string[];
  warnings: string[];
}

/** Normalize and fully lint one page's component batch before any ToolJet write. */
export function prepareComponentBatch(inputs: ComponentInput[]): PreparedComponentBatch {
  const requested = inputs.map(({ client_ref, parent_ref, slot_name, ...component }) => ({
    ...component,
    clientRef: client_ref,
    parentRef: parent_ref,
    slotName: slot_name,
  }));
  // Same geometry fixes as lint_app_spec: a plan that linted clean must apply clean, so the stored plan
  // gets the identical height normalisation here (an earlier split let lint pass and apply reject).
  const normalized = requested.map((component) => {
    const definition = normalizeComponentSpec(component, { stripUnknownKeys: true });
    const geometry = normalizePlannedLayouts(definition.component);
    return { ...definition, component: geometry.component, warnings: [...definition.warnings, ...geometry.warnings] };
  });
  // A short Html block is raised to the height its markup needs rather than rejected; the plan path does
  // the same (and moves siblings). Here only the block itself changes, so the warning says to check below it.
  const heightFixes: string[] = [];
  for (const result of normalized) {
    const component = result.component as ReadinessComponent;
    const fix = suggestedHtmlHeight(component);
    if (!fix) continue;
    for (const rect of [component.layout, component.layouts?.desktop]) if (rect && typeof rect.height === 'number') rect.height = fix.to;
    heightFixes.push(
      `Html "${component.name ?? '?'}" needed about ${fix.needed}px for its markup but was ${fix.from}px; saved at ${fix.to}px. ` +
        `Anything placed within ${fix.to - fix.from}px below it now overlaps; move it down.`
    );
  }
  const expanded = materializeRequiredDefaultChildren(normalized.map((result) => result.component));
  const lint = lintComponents(expanded.components);
  const lateListviewChildWarnings = requested.flatMap((component) =>
    component.parent && containsListItemBinding({
      properties: component.properties,
      styles: component.styles,
      validation: component.validation,
      others: component.others,
    })
      ? [
          `Component "${component.name}" is being added under an existing parent and reads listItem. ` +
            'ToolJet can mount late-added Listview children with empty repeated values. Create the Listview and all ' +
            'listItem-bound children atomically in one component batch using client_ref/parent_ref.',
        ]
      : []
  );
  return {
    components: expanded.components,
    errors: lint.errors,
    warnings: [
      ...normalized.flatMap((item) => item.warnings),
      ...expanded.warnings,
      ...lint.warnings,
      ...heightFixes,
      ...lateListviewChildWarnings,
    ],
  };
}
