import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function listEventsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_events',
    description:
      'List event handlers for a version, optionally filtered to one source (component/query id). ' +
      'Returns [{ id, name, index, event, sourceId, target }] where `event` is the { eventId(trigger), ' +
      'ref?, actionId, ...params } blob. target may be component, data_query, page, table_column, or legacy ' +
      'table_action. Table Button columns use ref=`<column key or name>::<button id>`. Use the ids with ' +
      'update_events / delete_event to fix or remove wiring ' +
      'without rebuilding.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      source_id: z.string().optional(),
    },
    async handler(args: { app_id: string; version_id: string; source_id?: string }) {
      try {
        const result = await client.listEvents({
          appId: args.app_id,
          versionId: args.version_id,
          sourceId: args.source_id,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
