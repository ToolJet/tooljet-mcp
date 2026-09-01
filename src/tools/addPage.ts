import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function addPageTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_page',
    title: 'Add Page',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Add a page to an app. Returns { page_id, name }; pass that page_id to add_component(s) to place ' +
      'components on it. ToolJet auto-renders a left-sidebar navigation menu across pages, so you get page switching for ' +
      'free. Use multiple pages when it genuinely helps (e.g. list + detail, or separate dashboard/admin views) ' +
      "— don't fragment a simple app across many pages. " +
      'A relevant `icon` is required (a Tabler icon name, e.g. "IconLayoutDashboard", "IconUsers", "IconChartBar", ' +
      '"IconSettings") so every added page reads clearly in the sidebar. The auto-created Home page already falls back ' +
      'to IconHome2; other pages without an icon fall back to the generic IconFile. ' +
      'Set `hidden: true` for a page that is opened ONLY from another page (e.g. a detail page reached by row-click → ' +
      'switch-page) — it stays fully reachable but is removed from the sidebar nav so the menu stays clean.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      name: z.string(),
      icon: z.string().min(1),
      hidden: z.boolean().optional(),
    },
    async handler(args: { app_id: string; version_id: string; name: string; icon: string; hidden?: boolean }) {
      try {
        return ok(
          await client.createPage({
            appId: args.app_id,
            versionId: args.version_id,
            name: args.name,
            icon: args.icon,
            hidden: args.hidden,
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
