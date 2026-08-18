import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function addPageTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_page',
    description:
      'Add a page to an app. Returns { page_id, name }; pass that page_id to add_component(s) to place ' +
      'components on it. ToolJet auto-renders a navigation menu across pages, so you get page switching for ' +
      'free. Use multiple pages when it genuinely helps (e.g. list + detail, or separate dashboard/admin views) ' +
      "— don't fragment a simple app across many pages. " +
      'Pass a relevant `icon` (a Tabler icon name, e.g. "IconLayoutDashboard", "IconUsers", "IconChartBar", ' +
      '"IconSettings") — in a multi-page app EVERY page should have a meaningful icon so the nav menu reads well; ' +
      'omitting it falls back to a generic file icon.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      name: z.string(),
      icon: z.string().optional(),
    },
    async handler(args: { app_id: string; version_id: string; name: string; icon?: string }) {
      try {
        return ok(
          await client.createPage({
            appId: args.app_id,
            versionId: args.version_id,
            name: args.name,
            icon: args.icon,
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
