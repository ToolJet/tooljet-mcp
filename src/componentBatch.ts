import { z } from 'zod';
import { getComponentAuthoringExclusion, getLegacyComponentReplacement } from './catalog.js';
import { COMPONENT_SLOT_NAMES } from './componentParent.js';
import { materializeRequiredDefaultChildren } from './defaultChildren.js';
import { lintComponents } from './lint.js';
import { normalizeComponentSpec } from './componentNormalization.js';
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
  general: z.record(z.string(), z.any()).optional(),
  general_styles: z.record(z.string(), z.any()).optional(),
  others: z.record(z.string(), z.any()).optional(),
  layout: layoutSchema.optional(),
  layouts: z.object({ desktop: layoutSchema.optional(), mobile: layoutSchema.optional() }).optional(),
  client_ref: z.string().optional(),
  parent_ref: z.string().optional(),
  parent: z.string().optional(),
  slot_name: z.enum(COMPONENT_SLOT_NAMES).optional(),
  /** Target one pane of a Tabs parent. Use the tab's persisted string id, not its title. */
  tab_id: z.string().min(1).optional(),
}).superRefine((component, context) => {
  if (component.slot_name && component.tab_id !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Use slot_name or tab_id, not both.',
    });
  }
  if (component.tab_id !== undefined && !component.parent && !component.parent_ref) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'tab_id requires parent or parent_ref.',
    });
  }
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
  const requested = inputs.map(({ client_ref, parent_ref, slot_name, tab_id, general_styles, ...component }) => ({
    ...component,
    generalStyles: general_styles,
    clientRef: client_ref,
    parentRef: parent_ref,
    slotName: slot_name,
    tabId: tab_id,
  }));
  const normalized = requested.map((component) => normalizeComponentSpec(component, { stripUnknownKeys: true }));
  const expanded = materializeRequiredDefaultChildren(normalized.map((result) => result.component));
  const lint = lintComponents(expanded.components);
  const authoringErrors = expanded.components.flatMap((component) => {
    const replacement = getLegacyComponentReplacement(component.type);
    if (replacement) {
      return [
        `Component "${component.name}": legacy type "${component.type}" cannot be created; use "${replacement}".`,
      ];
    }
    const exclusion = getComponentAuthoringExclusion(component.type);
    return exclusion ? [`Component "${component.name}": type "${component.type}" is not authorable here. ${exclusion}`] : [];
  });
  const lateListviewChildWarnings = requested.flatMap((component) =>
    component.parent && containsListItemBinding({
      properties: component.properties,
      styles: component.styles,
      validation: component.validation,
      general: component.general,
      generalStyles: component.generalStyles,
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
    errors: [...authoringErrors, ...lint.errors],
    warnings: [
      ...normalized.flatMap((item) => item.warnings),
      ...expanded.warnings,
      ...lint.warnings,
      ...lateListviewChildWarnings,
    ],
  };
}
