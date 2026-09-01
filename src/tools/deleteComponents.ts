import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { containsExactValue, containsNamedBinding } from '../referenceSafety.js';
import { ok, fail, type ToolDef } from './types.js';

export function deleteComponentsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'delete_components',
    title: 'Delete Components',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Permanently remove named components from one page. Inspect the targets and obtain explicit approval, then pass confirm:true. ' +
      'The tool refuses surviving child components, component/query bindings, and external events that still reference a target. ' +
      'It verifies every requested id disappeared and never deletes dependencies automatically.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      page_id: z.string(),
      component_ids: z.array(z.string()).min(1),
      confirm: z.literal(true),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      page_id: string;
      component_ids: string[];
      confirm: true;
    }) {
      try {
        const before = await client.getAppSummary(args.app_id);
        const page = before.pages.find((candidate) => candidate.id === args.page_id);
        if (!page) throw new Error(`delete_components: page ${args.page_id} was not found.`);
        const requested = new Set(args.component_ids);
        if (requested.size !== args.component_ids.length) {
          throw new Error('delete_components: component_ids must be unique.');
        }
        const targets = page.components.filter((component) => requested.has(component.id));
        const missing = args.component_ids.filter((id) => !targets.some((component) => component.id === id));
        if (missing.length) {
          throw new Error(`delete_components: component ids are not on page ${args.page_id}: ${missing.join(', ')}.`);
        }
        const descendants = page.components.filter(
          (component) => component.parent &&
            [...requested].some((targetId) => component.parent === targetId || component.parent?.startsWith(`${targetId}::`)) &&
            !requested.has(component.id)
        );
        if (descendants.length) {
          throw new Error(
            `delete_components: surviving child components still belong to a target: ` +
              descendants.map((component) => component.name ?? component.id).join(', ') +
              '. Include them in the explicitly approved deletion or reparent them first.'
          );
        }

        const survivingComponents = before.pages.flatMap((candidate) => candidate.components)
          .filter((component) => !requested.has(component.id));
        const references: string[] = [];
        for (const target of targets) {
          if (target.name) {
            for (const component of survivingComponents) {
              if (containsNamedBinding([component.properties, component.styles, component.others], 'components', target.name)) {
                references.push(`component ${component.name ?? component.id} binds components.${target.name}`);
              }
            }
            for (const query of before.queries) {
              if (containsNamedBinding(query.options, 'components', target.name)) {
                references.push(`query ${query.name ?? query.id} binds components.${target.name}`);
              }
            }
          }
          for (const event of before.events) {
            if (requested.has(event.sourceId ?? '')) continue;
            if (containsExactValue(event.event, target.id) ||
                (target.name ? containsNamedBinding(event.event, 'components', target.name) : false)) {
              references.push(`event ${event.name ?? event.id} targets ${target.name ?? target.id}`);
            }
          }
        }
        if (references.length) {
          throw new Error(
            `delete_components: refusing dangling references: ${[...new Set(references)].join('; ')}. ` +
              'Update or delete those references first.'
          );
        }

        const result = await client.deleteComponents({
          appId: args.app_id,
          versionId: args.version_id,
          pageId: args.page_id,
          componentIds: args.component_ids,
        });
        const after = await client.getAppSummary(args.app_id);
        const remaining = after.pages.flatMap((candidate) => candidate.components)
          .filter((component) => requested.has(component.id));
        if (remaining.length) {
          throw new Error(
            `delete_components: ToolJet returned success but these components still exist: ` +
              remaining.map((component) => component.id).join(', ')
          );
        }
        const danglingSourceEvents = after.events.filter((event) => requested.has(event.sourceId ?? ''));
        if (danglingSourceEvents.length) {
          throw new Error(
            `delete_components: components were removed but source events remain: ` +
              danglingSourceEvents.map((event) => event.name ?? event.id).join(', ') +
              '. Delete those events before further authoring.'
          );
        }
        const sourceEventsDeleted = before.events.filter((event) => requested.has(event.sourceId ?? '')).length;
        return ok({
          ...result,
          component_ids: args.component_ids,
          component_names: targets.map((component) => component.name).filter(Boolean),
          source_events_deleted: sourceEventsDeleted,
        });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
