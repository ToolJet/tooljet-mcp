import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
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
});

export function updateComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_components',
    description:
      'Edit existing components IN PLACE instead of deleting + re-adding. Send only the CHANGED leaves ' +
      'under `definition` (properties/styles/validation/others) — ToolJet deep-merges, so untouched ' +
      'values are preserved. NOTE: array values (Table `columns`, DropdownV2 `options`/`schema`) are ' +
      'REPLACED wholesale, so send the full array. Set EITHER `definition` OR name/parent per entry, ' +
      'not both. Get component ids + current values from get_app_summary / get_component.',
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
      }>;
    }) {
      try {
        const result = await client.updateComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          updates: args.updates.map((u) => ({
            componentId: u.component_id,
            definition: u.definition,
            name: u.name,
            parent: u.parent,
          })),
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
