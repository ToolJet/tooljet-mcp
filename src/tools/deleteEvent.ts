import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function deleteEventTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_event',
    title: 'Delete Event',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Delete one event handler by id (from list_events). Use this to remove wiring that points at a ' +
      'deleted component/query, or to drop an action you added by mistake.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      event_id: z.string(),
    },
    async handler(args: { app_id: string; version_id: string; event_id: string }) {
      try {
        const result = await client.deleteEvent({
          appId: args.app_id,
          versionId: args.version_id,
          eventId: args.event_id,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
