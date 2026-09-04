import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const updateSchema = z.object({
  page_id: z.string().min(1),
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  hidden: z.boolean().optional().describe(
    'Hide or show only this non-Home page in the generated navigation menu. ' +
    'This does not hide the whole menu; use update_app_settings.navigation_hidden for that.'
  ),
});

export function updatePagesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_pages',
    title: 'Update Pages',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Update existing page sidebar metadata and/or reorder pages, with one final readback verification. ' +
      'Use updates to rename pages, set a relevant Tabler icon, or toggle one non-Home page in the menu. ' +
      'The Home page can be renamed, restyled, and reordered, but cannot be hidden. To hide or show the entire ' +
      'generated navigation menu, use update_app_settings.navigation_hidden instead. Use order only with the ' +
      'complete ordered list of every current page id (available from create_app/get_app_summary); partial ' +
      'orders are rejected to prevent duplicate indexes.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      updates: z.array(updateSchema).min(1).max(50).optional(),
      order: z.array(z.string().min(1)).min(1).max(50).optional(),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      updates?: Array<{ page_id: string; name?: string; icon?: string; hidden?: boolean }>;
      order?: string[];
    }) {
      try {
        return ok(await client.updatePages({
          appId: args.app_id,
          versionId: args.version_id,
          updates: args.updates?.map((update) => ({
            pageId: update.page_id,
            name: update.name,
            icon: update.icon,
            hidden: update.hidden,
          })),
          order: args.order,
        }));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
