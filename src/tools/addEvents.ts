import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

const eventSchema = z
  .object({
    source_id: z.string().optional(),
    source_type: z.enum(['component', 'data_query', 'page']).optional(),
    /** Backward-compatible shorthand for source_type=component. */
    component_id: z.string().optional(),
    trigger: z.string(),
    action: z.record(z.string(), z.any()),
    name: z.string().optional(),
  })
  .refine((event) => !!event.source_id || !!event.component_id, {
    message: 'Each event needs source_id or the backward-compatible component_id.',
  })
  .refine((event) => !(event.source_id && event.component_id), {
    message: 'Use source_id or component_id, not both.',
  });

type EventInput = {
  source_id?: string;
  source_type?: 'component' | 'data_query' | 'page';
  component_id?: string;
  trigger: string;
  action: Record<string, unknown>;
  name?: string;
};

export function addEventsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_events',
    description:
      'Wire interactivity and lifecycle behavior to components, data queries, or pages. Each event uses ' +
      "{ source_id, source_type: 'component'|'data_query'|'page', trigger, action }; component_id remains a shorthand for component sources. " +
      "trigger is the component's event id (Button: 'onClick'; Table: 'onRowClicked'/'onSearch'/'onPageChanged'). " +
      "Query lifecycle triggers are 'onDataQuerySuccess' and 'onDataQueryFailure'; page load is 'onPageLoad'. " +
      "action is { actionId, ...params } — use these EXACT ids (an invalid actionId silently does nothing):\n" +
      "  • run a query:   { actionId: 'run-query', queryId: '<id>', queryName: '<name>' }\n" +
      "  • switch page:   { actionId: 'switch-page', pageId: '<target page id>' }\n" +
      "  • show alert:    { actionId: 'show-alert', message: '...', alertType: 'success'|'info'|'warning'|'error' }\n" +
      "  • show/close modal: { actionId: 'show-modal', modal: '<id>' } / { actionId: 'close-modal', modal: '<id>' }\n" +
      "  • set a custom variable: { actionId: 'set-custom-variable', key: 'selectedRow', value: '{{components.<table>.selectedRow}}' }  (id is set-custom-variable, NOT set-variable; read back as {{variables.selectedRow}})\n" +
      "  • control a component:   { actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: 'setValue'|'clear'|'setVisibility'|'setDisable'|'setLoading', ... }\n" +
      "  • other valid ids: unset-custom-variable, set-page-variable, set-table-page, copy-to-clipboard, generate-file, open-webpage, go-to-app, logout.\n" +
      "For reliable mutations, let the submit/click event run only the mutation; attach refresh, success alert, reset/close actions to the mutation's onDataQuerySuccess and an error alert to onDataQueryFailure. " +
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
      events: EventInput[];
    }) {
      try {
        return ok(
          await client.createEvents({
            appId: args.app_id,
            versionId: args.version_id,
            events: args.events.map((event) => ({
              sourceId: event.source_id ?? event.component_id!,
              sourceType: event.source_type ?? 'component',
              trigger: event.trigger,
              action: event.action,
              name: event.name,
            })),
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
