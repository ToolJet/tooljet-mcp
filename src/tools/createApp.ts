import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function createAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_app',
    description:
      'Create a new ToolJet app with a first version and home page. Returns app_id, version_id, home_page_id, and app_url needed by other tools.',
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
