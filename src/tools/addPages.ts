import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const pageSchema = z.object({
  name: z.string(),
  icon: z.string().min(1),
  hidden: z.boolean().optional(),
});

export function addPagesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_pages',
    description:
      'Add multiple pages to an app in one call. Names/handles are preflighted together, page order follows the input order, and ' +
      'sidebar icon/hidden metadata is persisted and verified with one final readback. Every page requires a relevant Tabler icon; ' +
      'set hidden:true for detail pages reached only through navigation. Returns {pages}.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      pages: z.array(pageSchema).min(1).max(50),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      pages: Array<{ name: string; icon: string; hidden?: boolean }>;
    }) {
      try {
        return ok({
          pages: await client.createPages({
            appId: args.app_id,
            versionId: args.version_id,
            pages: args.pages,
          }),
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
