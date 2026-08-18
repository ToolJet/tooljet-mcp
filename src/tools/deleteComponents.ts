import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function deleteComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_components',
    description:
      'Remove components from a page by id (batch). Use this to clean up mistakes instead of leaving ' +
      'orphaned/duplicate components. If a deleted component is referenced by events, delete or update ' +
      'those events too (list_events → delete_event) so nothing points at a removed component.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      component_ids: z.array(z.string()).min(1),
    },
    async handler(args: { app_id: string; version_id: string; page_id: string; component_ids: string[] }) {
      try {
        const result = await client.deleteComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          componentIds: args.component_ids,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
