import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function getAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_app',
    description: 'Fetch a ToolJet app by id, including its pages, versions, and editing version details.',
    inputSchema: {
      app_id: z.string(),
    },
    async handler(args: { app_id: string }) {
      try {
        const result = await client.getApp(args.app_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
