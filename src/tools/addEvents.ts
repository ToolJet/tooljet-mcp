import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const eventSchema = z.object({
  component_id: z.string(),
  trigger: z.string(),
  action: z.record(z.string(), z.any()),
});

export function addEventsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_events',
    description:
      'Wire interactivity: attach event handlers (a trigger + an action) to components. This is how apps DO things ' +
      '(navigate, run queries, show modals/alerts). Each event: { component_id, trigger, action }. ' +
      "trigger is the component's event id (Button: 'onClick'; Table: 'onRowClicked'/'onSearch'/'onPageChanged'). " +
      "action is { actionId, ...params }:\n" +
      "  • run a query:   { actionId: 'run-query', queryId: '<id>', queryName: '<name>' }\n" +
      "  • switch page:   { actionId: 'switch-page', pageId: '<target page id>', queryParams: [['id','{{components.table1.selectedRow.id}}']] }  (queryParams passes variables — array of [key,value])\n" +
      "  • show alert:    { actionId: 'show-alert', message: '...', alertType: 'success'|'info'|'warning'|'error' }\n" +
      "  • show modal:    { actionId: 'show-modal', modal: '<modal component id>' }\n" +
      "  • set variable:  { actionId: 'set-variable', key: '...', value: '...' }\n" +
      'Create all of an app\'s events in one call.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      events: z.array(eventSchema).min(1),
    },
    async handler(args: {
      app_id: string;
      version_id: string;
      events: Array<{ component_id: string; trigger: string; action: Record<string, unknown> }>;
    }) {
      try {
        return ok(
          await client.createEvents({
            appId: args.app_id,
            versionId: args.version_id,
            events: args.events.map((e) => ({ componentId: e.component_id, trigger: e.trigger, action: e.action })),
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
