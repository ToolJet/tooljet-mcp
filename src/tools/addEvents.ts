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
      "action is { actionId, ...params } — use these EXACT ids (an invalid actionId silently does nothing):\n" +
      "  • run a query:   { actionId: 'run-query', queryId: '<id>', queryName: '<name>' }\n" +
      "  • switch page:   { actionId: 'switch-page', pageId: '<target page id>' }\n" +
      "  • show alert:    { actionId: 'show-alert', message: '...', alertType: 'success'|'info'|'warning'|'error' }\n" +
      "  • show/close modal: { actionId: 'show-modal', modal: '<id>' } / { actionId: 'close-modal', modal: '<id>' }\n" +
      "  • set a custom variable: { actionId: 'set-custom-variable', key: 'selectedRow', value: '{{components.<table>.selectedRow}}' }  (id is set-custom-variable, NOT set-variable; read back as {{variables.selectedRow}})\n" +
      "  • control a component:   { actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: 'setValue'|'clear'|'setVisibility'|'setDisable'|'setLoading', ... }\n" +
      "  • other valid ids: unset-custom-variable, set-page-variable, set-table-page, copy-to-clipboard, generate-file, open-webpage, go-to-app, logout.\n" +
      "For master→detail, pass the row with set-custom-variable then switch-page (a runOnPageLoad detail query does NOT re-run on page switch). " +
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
