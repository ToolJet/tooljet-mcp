import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { containsExactValue, containsNamedBinding } from '../referenceSafety.js';
import { ok, fail, type ToolDef } from './types.js';
import { resolveRef } from '../refResolution.js';

export function deleteQueryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_query',
    description:
      'Permanently delete one query. Inspect the target and obtain explicit approval, then pass app_id and confirm:true. ' +
      'The tool refuses component bindings, dependent query bindings, and external events that still reference it, verifies ' +
      'the query disappeared, and never deletes dependencies automatically.',
    inputSchema: {
      app_id: z.string(),
      query_id: z.string(),
      version_id: z.string(),
      confirm: z.literal(true),
    },
    async handler(args: { app_id: string; query_id: string; version_id: string; confirm: true }) {
      try {
        const before = await client.getAppSummary(args.app_id);
        // Accept a query NAME as well as an id (see refResolution.ts): an absolute "was not found" for a
        // query that exists under its name sends the model re-reading instead of correcting.
        const queryResolution = resolveRef(before.queries, args.query_id, "Query", `in app "${args.app_id}"`);
        if (!queryResolution.ok) throw new Error(`delete_query: ${queryResolution.error}`);
        const query = queryResolution.target;
        args = { ...args, query_id: query.id };
        const references: string[] = [];
        if (query.name) {
          for (const component of before.pages.flatMap((page) => page.components)) {
            if (containsNamedBinding([component.properties, component.styles, component.others], 'queries', query.name)) {
              references.push(`component ${component.name ?? component.id} binds queries.${query.name}`);
            }
          }
          for (const dependent of before.queries) {
            if (dependent.id !== query.id && containsNamedBinding(dependent.options, 'queries', query.name)) {
              references.push(`query ${dependent.name ?? dependent.id} binds queries.${query.name}`);
            }
          }
        }
        for (const event of before.events) {
          if (event.sourceId === query.id) continue;
          if (containsExactValue(event.event, query.id) ||
              (query.name ? containsNamedBinding(event.event, 'queries', query.name) : false)) {
            references.push(`event ${event.name ?? event.id} targets ${query.name ?? query.id}`);
          }
        }
        if (references.length) {
          throw new Error(
            `delete_query: refusing dangling references: ${[...new Set(references)].join('; ')}. ` +
              'Update or delete those references first.'
          );
        }
        const result = await client.deleteQuery({ queryId: args.query_id, versionId: args.version_id });
        const after = await client.getAppSummary(args.app_id);
        if (after.queries.some((candidate) => candidate.id === query.id)) {
          throw new Error(`delete_query: ToolJet returned success but query ${query.id} still exists.`);
        }
        const danglingSourceEvents = after.events.filter((event) => event.sourceId === query.id);
        if (danglingSourceEvents.length) {
          throw new Error(
            `delete_query: query was removed but lifecycle events remain: ` +
              danglingSourceEvents.map((event) => event.name ?? event.id).join(', ') +
              '. Delete those events before further authoring.'
          );
        }
        const sourceEventsDeleted = before.events.filter((event) => event.sourceId === query.id).length;
        return ok({
          ...result,
          query_id: query.id,
          query_name: query.name,
          source_events_deleted: sourceEventsDeleted,
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
