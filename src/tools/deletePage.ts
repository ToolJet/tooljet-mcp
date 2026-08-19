import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

function containsValue(value: unknown, expected: string): boolean {
  if (value === expected) return true;
  if (Array.isArray(value)) return value.some((entry) => containsValue(entry, expected));
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) => containsValue(entry, expected));
  }
  return false;
}

export function deletePageTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_page',
    description:
      'Permanently delete one non-Home page and its components. This is destructive: inspect the target, obtain explicit user ' +
      'approval for the named page, then pass confirm:true. The tool refuses pages still targeted by events outside that page, ' +
      'because ToolJet does not safely retarget those references. Set delete_associated_pages:true only when explicitly deleting a page group and its children.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      delete_associated_pages: z.boolean().optional(),
      confirm: z.literal(true),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      delete_associated_pages?: boolean;
      confirm: true;
    }) {
      try {
        const before = await client.getAppSummary(args.app_id);
        const page = before.pages.find((candidate) => candidate.id === args.page_id);
        if (!page) throw new Error(`delete_page: page ${args.page_id} was not found in app ${args.app_id}.`);
        if (page.handle === 'home' || page.name === 'Home') {
          throw new Error('delete_page: the native Home page cannot be deleted; rename, restyle, or reorder it with update_pages.');
        }

        const ownedSourceIds = new Set([page.id, ...page.components.map((component) => component.id)]);
        const incomingEvents = before.events.filter(
          (event) => !ownedSourceIds.has(event.sourceId ?? '') && containsValue(event.event, page.id)
        );
        if (incomingEvents.length) {
          throw new Error(
            `delete_page: page "${page.name ?? page.id}" is still targeted by external event(s): ` +
              incomingEvents.map((event) => event.name ?? event.id).join(', ') +
              '. Update or delete those events first so the app does not retain dangling navigation.'
          );
        }

        await client.deletePage({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          deleteAssociatedPages: args.delete_associated_pages,
        });
        const after = await client.getAppSummary(args.app_id);
        if (after.pages.some((candidate) => candidate.id === args.page_id)) {
          throw new Error(`delete_page: ToolJet returned success but page ${args.page_id} still exists.`);
        }
        const deletedEventCount = before.events.filter((event) => ownedSourceIds.has(event.sourceId ?? '')).length;
        return ok({
          deleted: true,
          page_id: page.id,
          page_name: page.name,
          components_deleted: page.components.length,
          source_events_deleted: deletedEventCount,
          delete_associated_pages: args.delete_associated_pages ?? false,
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
