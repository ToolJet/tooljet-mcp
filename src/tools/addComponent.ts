import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintComponents } from '../lint.js';
import { materializeRequiredDefaultChildren } from '../defaultChildren.js';
import { normalizeComponentSpec } from '../componentNormalization.js';
import { ok, fail, type ToolDef } from './types.js';

const layoutSchema = z.object({
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number(),
});

const layoutsSchema = z.object({
  desktop: layoutSchema.optional(),
  mobile: layoutSchema.optional(),
});

export function addComponentTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_component',
    description:
      'Place a component on an app page. `name` is required. A Table binds data via ' +
      'properties.data.value = "{{queries.<queryName>.data}}". ' +
      'Property/style/validation/other leaves may be supplied as concise raw values or canonical ' +
      '`{ value: ... }` envelopes; MCP persists the canonical ToolJet shape. ' +
      'IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, …) ' +
      'in the top-level `styles` object, NOT under `properties` — ToolJet silently ignores styles nested ' +
      'in properties (and this tool will reject them). Provide either `layout` (one rectangle applied to ' +
      'both resolutions) or `layouts:{desktop,mobile}` for per-resolution placement. Kanban automatically ' +
      'gets its catalog card children; use add_components with client_ref/parent_ref when you need a custom ' +
      'card body such as wrapped Html.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      name: z.string(),
      type: z.string(),
      properties: z.record(z.string(), z.any()),
      styles: z.record(z.string(), z.any()).optional(),
      validation: z.record(z.string(), z.any()).optional(),
      others: z.record(z.string(), z.any()).optional(),
      layout: layoutSchema.optional(),
      layouts: layoutsSchema.optional(),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      name: string;
      type: string;
      properties: Record<string, unknown>;
      styles?: Record<string, unknown>;
      validation?: Record<string, unknown>;
      others?: Record<string, unknown>;
      layout?: { top: number; left: number; width: number; height: number };
      layouts?: {
        desktop?: { top: number; left: number; width: number; height: number };
        mobile?: { top: number; left: number; width: number; height: number };
      };
    }) {
      const requested = {
        name: args.name,
        type: args.type,
        properties: args.properties,
        styles: args.styles,
        validation: args.validation,
        others: args.others,
        layout: args.layout,
        layouts: args.layouts,
      };
      const normalized = normalizeComponentSpec(requested, { applyVisualDefaults: true });
      const expanded = materializeRequiredDefaultChildren([normalized.component]);
      const { errors, warnings } = lintComponents(expanded.components);
      if (errors.length) return fail(new Error(errors.join(' ')));
      try {
        if (expanded.materializedChildren) {
          const [parent, ...defaultChildren] = await client.createComponents({
            appId: args.app_id,
            versionId: args.version_id,
            pageId: args.page_id,
            components: expanded.components,
          });
          return ok({
            ...parent,
            default_children: defaultChildren,
            warnings: [...normalized.warnings, ...expanded.warnings, ...warnings],
          });
        }
        const component = expanded.components[0]!;
        const result = await client.createComponent({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          name: component.name,
          type: component.type,
          properties: component.properties,
          styles: component.styles,
          validation: component.validation,
          others: component.others,
          layout: component.layout,
          layouts: component.layouts,
        });
        return ok({ ...result, warnings: [...normalized.warnings, ...expanded.warnings, ...warnings] });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
