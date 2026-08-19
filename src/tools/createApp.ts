import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function createAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_app',
    description:
      'Create a new ToolJet app with a first version and home page. Returns app_id, version_id, ' +
      'home_page_id, editor_url, viewer_url, datasources_url, and app_url (a backward-compatible alias for editor_url).',
    inputSchema: {
      name: z.string().min(1),
    },
    async handler(args: { name: string }) {
      try {
        const result = await client.createApp(args.name);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
