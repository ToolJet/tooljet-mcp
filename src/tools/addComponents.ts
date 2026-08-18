import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { lintComponents } from '../lint.js';
import { materializeRequiredDefaultChildren } from '../defaultChildren.js';
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

const componentSchema = z.object({
  name: z.string(),
  type: z.string(),
  properties: z.record(z.string(), z.any()),
  styles: z.record(z.string(), z.any()).optional(),
  validation: z.record(z.string(), z.any()).optional(),
  others: z.record(z.string(), z.any()).optional(),
  layout: layoutSchema.optional(),
  layouts: layoutsSchema.optional(),
  client_ref: z.string().optional(),
  parent_ref: z.string().optional(),
  parent: z.string().optional(),
});

export function addComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_components',
    description:
      'Place MANY components on one page in a single call (all share app_id/version_id/page_id). ' +
      'Prefer this over repeated add_component when building an app — it is one request. Returns ' +
      '[{ component_id, name }]. Note: the batch is atomic — if one component is invalid (e.g. missing ' +
      'name), the whole call fails; fix that component and retry. ' +
      'IMPORTANT: put native styling (textSize, fontWeight, textColor, backgroundColor, borderRadius, …) ' +
      'in each component’s top-level `styles` object, NOT under `properties` — ToolJet silently ignores ' +
      'styles nested in properties (and this tool will reject them). Provide either `layout` (one rectangle ' +
      'for both resolutions) or `layouts:{desktop,mobile}`. To create a modal/container and its children ' +
      'atomically, give the parent a unique `client_ref` and each child the matching `parent_ref`; child ' +
      'coordinates are relative to that parent. A Kanban with no explicit child automatically gets its ' +
      'catalog card children so cards are not blank; supplying a child with its `parent_ref` suppresses ' +
      'those defaults (use Html for wrapped multi-line card content).',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      components: z.array(componentSchema).min(1),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      components: Array<{
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
        client_ref?: string;
        parent_ref?: string;
        parent?: string;
      }>;
    }) {
      const requested = args.components.map(({ client_ref, parent_ref, ...component }) => ({
        ...component,
        clientRef: client_ref,
        parentRef: parent_ref,
      }));
      const expanded = materializeRequiredDefaultChildren(requested);
      const components = expanded.components;
      const { errors, warnings } = lintComponents(components);
      if (errors.length) return fail(new Error(errors.join(' ')));
      try {
        const result = await client.createComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          components,
        });
        return ok({ components: result, warnings: [...expanded.warnings, ...warnings] });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
