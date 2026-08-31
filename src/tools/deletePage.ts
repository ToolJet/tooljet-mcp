import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { containsExactValue } from '../referenceSafety.js';
import { ok, fail, type ToolDef } from './types.js';

export function deletePageTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_page',
    title: 'Delete Page',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Permanently delete one non-Home page and its components. This is destructive: inspect the target, obtain explicit user ' +
      'approval for the named page, then pass confirm:true. The tool refuses pages still targeted by events outside that page, ' +
      'because ToolJet does not safely retarget those references. Group-wide deletion is disabled because ToolJet does not return ' +
      'a verifiable child-page deletion set; delete each inspected and approved page separately.',
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
        if (args.delete_associated_pages) {
          throw new Error(
            'delete_page: delete_associated_pages is disabled because the compact ToolJet delete response cannot prove ' +
              'which child pages were removed. Inspect and delete each named page separately with explicit approval.'
          );
        }
        if (page.handle === 'home' || page.name === 'Home') {
          throw new Error('delete_page: the native Home page cannot be deleted; rename, restyle, or reorder it with update_pages.');
        }

        const ownedSourceIds = new Set([page.id, ...page.components.map((component) => component.id)]);
        const incomingEvents = before.events.filter(
          (event) => !ownedSourceIds.has(event.sourceId ?? '') &&
            [...ownedSourceIds].some((targetId) => containsExactValue(event.event, targetId))
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
        const danglingSourceEvents = after.events.filter((event) => ownedSourceIds.has(event.sourceId ?? ''));
        if (danglingSourceEvents.length) {
          throw new Error(
            `delete_page: page was removed but source events remain: ` +
              danglingSourceEvents.map((event) => event.name ?? event.id).join(', ') +
              '. Delete those events before further authoring.'
          );
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
