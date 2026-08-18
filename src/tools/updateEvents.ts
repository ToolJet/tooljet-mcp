import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function updateEventsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_events',
    description:
      'Edit existing event handlers (batch) — e.g. change an action or its params — instead of deleting ' +
      'and re-adding. For updateType "update" you MUST include `name` and the full `event` blob ({ eventId, ' +
      'actionId, ...params }) per entry (name becomes null if omitted). For "reorder" only `index` is used. ' +
      'Get event ids from list_events.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      events: z
        .array(
          z.object({
            event_id: z.string(),
            name: z.string().optional(),
            event: z.record(z.string(), z.any()).optional(),
            index: z.number().optional(),
          })
        )
        .min(1),
      update_type: z.enum(['update', 'reorder']).optional(),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      events: Array<{ event_id: string; name?: string; event?: Record<string, unknown>; index?: number }>;
      update_type?: 'update' | 'reorder';
    }) {
      try {
        const result = await client.updateEvents({
          appId: args.app_id,
          versionId: args.version_id,
          updateType: args.update_type,
          events: args.events.map((e) => ({
            eventId: e.event_id,
            name: e.name,
            event: e.event,
            index: e.index,
          })),
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
