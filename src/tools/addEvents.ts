import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { validateEvents } from '../eventValidation.js';
import { ok, fail, type ToolDef } from './types.js';

const eventSchema = z
  .object({
    source_id: z.string().optional(),
    source_type: z.enum(['component', 'data_query', 'page', 'table_column', 'table_action']).optional(),
    /** Backward-compatible shorthand for source_type=component. */
    component_id: z.string().optional(),
    ref: z.string().min(1).optional(),
    trigger: z.string(),
    action: z.record(z.string(), z.any()),
    name: z.string().optional(),
  })
  .refine((event) => !!event.source_id || !!event.component_id, {
    message: 'Each event needs source_id or the backward-compatible component_id.',
  })
  .refine((event) => !(event.source_id && event.component_id), {
    message: 'Use source_id or component_id, not both.',
  })
  .refine((event) => !event.component_id || !event.source_type || event.source_type === 'component', {
    message: 'component_id can only be used with source_type=component; use source_id for query/page events.',
  })
  .refine(
    (event) => !['table_column', 'table_action'].includes(event.source_type ?? '') || !!event.ref,
    {
      message: 'table_column/table_action events require ref; Button columns use `<column key or name>::<button id>`.',
    }
  )
  .refine((event) => !event.ref || ['table_column', 'table_action'].includes(event.source_type ?? ''), {
    message: 'ref is only valid with source_type=table_column or the deprecated table_action.',
  });

type EventInput = {
  source_id?: string;
  source_type?: 'component' | 'data_query' | 'page' | 'table_column' | 'table_action';
  component_id?: string;
  ref?: string;
  trigger: string;
  action: Record<string, unknown>;
  name?: string;
};

export function addEventsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_events',
    title: 'Add Events',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Wire interactivity and lifecycle behavior to components, data queries, pages, or Table sub-elements. Each event uses ' +
      "{ source_id, source_type: 'component'|'data_query'|'page'|'table_column', trigger, action }; component_id remains a shorthand for component sources. " +
      "trigger is the component's event id (Button: 'onClick'; Table: 'onRowClicked'/'onSearch'/'onPageChanged'). " +
      "For a modern Table Button column use source_id='<table id>', source_type='table_column', ref='<column key or name>::<button id>', trigger='onClick'. " +
      "The legacy source_type='table_action' is accepted for existing deprecated properties.actions buttons only; do not use it for new apps. " +
      "Query lifecycle triggers are 'onDataQuerySuccess' and 'onDataQueryFailure'; page load is 'onPageLoad'. " +
      "action is { actionId, ...params } — use these EXACT ids (an invalid actionId silently does nothing):\n" +
      "  • run a query:   { actionId: 'run-query', queryId: '<id>', queryName: '<name>' }\n" +
      "  • switch page:   { actionId: 'switch-page', pageId: '<target page id>' }\n" +
      "  • show alert:    { actionId: 'show-alert', message: '...', alertType: 'success'|'info'|'warning'|'error' }\n" +
      "  • show/close modal: { actionId: 'show-modal', modal: '<id>' } / { actionId: 'close-modal', modal: '<id>' }\n" +
      "  • set a custom variable: { actionId: 'set-custom-variable', key: 'selectedRow', value: '{{components.<table>.selectedRow}}' }  (id is set-custom-variable, NOT set-variable; read back as {{variables.selectedRow}})\n" +
      "  • control a component:   { actionId: 'control-component', componentId: '<id>', componentSpecificActionHandle: '<get_component_catalog actions.handle>', componentSpecificActionParams: [{handle:'<required param>',value:'...'}] } (use [] for parameterless actions)\n" +
      "  • reset/change a Table page: { actionId: 'set-table-page', table: '<Table component id>', pageIndex: '{{1}}' }\n" +
      "  • other valid ids: unset-custom-variable, set-page-variable, copy-to-clipboard, generate-file, open-webpage, go-to-app, logout. generate-file CSV/plaintext works; PDF expects pre-formed PDF bytes and does not perform conversion.\n" +
      "For reliable mutations, let the submit/click event run only the mutation; attach refresh, success alert, reset/close actions to the mutation's onDataQuerySuccess and an error alert to onDataQueryFailure. " +
      "For master→detail, order handlers as set-custom-variable → optional run-query → switch-page. Navigation MUST be last because later same-trigger handlers do not run; a runOnPageLoad detail query does NOT re-run on page switch. " +
      'Create all of an app\'s events in one call. MCP validates source existence, component-specific triggers, ' +
      'Table Button-column refs, action ids, and action targets before writing.',
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
        const summary = await client.getAppSummary(args.app_id);
        const events = args.events.map((event) => ({
          sourceId: event.source_id ?? event.component_id!,
          sourceType: (event.source_type ?? 'component') as NonNullable<EventInput['source_type']>,
          ref: event.ref,
          trigger: event.trigger,
          action: event.action,
          name: event.name,
        }));
        const validation = validateEvents(summary, events);
        if (validation.errors.length) return fail(new Error(validation.errors.join(' ')));
        const result = await client.createEvents({
          appId: args.app_id,
          versionId: args.version_id,
          events,
          existingEvents: summary.events,
        });
        return ok({ ...result, warnings: validation.warnings });
      } catch (err) {
        return fail(err);
      }
    },
  };
}
