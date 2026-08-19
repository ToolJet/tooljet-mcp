import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { persistedEventSpecs, validateEvents } from '../eventValidation.js';
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
        const updateType = args.update_type ?? 'update';
        const summary = await client.getAppSummary(args.app_id);
        const updatesById = new Map(args.events.map((event) => [event.event_id, event]));
        const missingIds = args.events
          .filter((event) => !summary.events.some((persisted) => persisted.id === event.event_id))
          .map((event) => event.event_id);
        if (missingIds.length) return fail(new Error(`Event ids do not exist in this app: ${missingIds.join(', ')}.`));
        if (updateType === 'update') {
          const missing = args.events.filter((event) => !event.name || !event.event);
          if (missing.length) {
            return fail(new Error('update_events with update_type="update" requires name and the full event blob for every entry.'));
          }
        } else if (args.events.some((event) => event.index === undefined)) {
          return fail(new Error('update_events with update_type="reorder" requires index for every entry.'));
        }
        const changedSummary = {
          ...summary,
          events: summary.events.map((event) => {
            const update = updatesById.get(event.id);
            if (!update) return event;
            return updateType === 'update'
              ? { ...event, name: update.name, event: update.event }
              : { ...event, index: update.index };
          }),
        };
        // The projected list already contains every persisted event exactly once. Validate that
        // complete future state without merging the original persisted chains a second time.
        const validation = validateEvents(
          changedSummary,
          persistedEventSpecs(changedSummary),
          { includePersistedChains: false }
        );
        if (validation.errors.length) return fail(new Error(validation.errors.join(' ')));
        const result = await client.updateEvents({
          appId: args.app_id,
          versionId: args.version_id,
          updateType,
          events: args.events.map((e) => ({
            eventId: e.event_id,
            name: e.name,
            event: e.event,
            index: e.index,
          })),
        });
        return ok({ ...result, warnings: validation.warnings });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
