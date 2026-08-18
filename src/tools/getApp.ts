import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function getAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_app',
    description:
      'Fetch the FULL raw ToolJet app by id (pages, versions, every component with its complete widget ' +
      'schema). This is large (100KB+ for a real app) — for routine inspection prefer get_app_summary, ' +
      'which returns the same structure with actual values only. Use get_app only when you need raw fields ' +
      'the summary omits.',
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
