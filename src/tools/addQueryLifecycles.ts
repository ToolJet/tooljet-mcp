import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { validateEvents } from '../eventValidation.js';
import { expandQueryLifecycles } from '../queryLifecycle.js';
import { ok, fail, type ToolDef } from './types.js';

const alertSchema = z.object({
  message: z.string().min(1),
  alert_type: z.enum(['success', 'info', 'warning', 'error']).optional(),
});
const lifecycleSchema = z
  .object({
    query_id: z.string(),
    refresh_query_ids: z.array(z.string()).optional(),
    clear_component_ids: z.array(z.string()).optional(),
    close_modal_id: z.string().optional(),
    success_alert: alertSchema.optional(),
    failure_alert: alertSchema.optional(),
    success_actions: z.array(z.record(z.string(), z.any())).optional(),
    failure_actions: z.array(z.record(z.string(), z.any())).optional(),
  })
  .refine(
    (value) =>
      Boolean(
        value.refresh_query_ids?.length ||
          value.clear_component_ids?.length ||
          value.close_modal_id ||
          value.success_alert ||
          value.failure_alert ||
          value.success_actions?.length ||
          value.failure_actions?.length
      ),
    { message: 'Each lifecycle must declare at least one success or failure action.' }
  );

type LifecycleInput = z.infer<typeof lifecycleSchema>;

export function addQueryLifecyclesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'add_query_lifecycles',
    description:
      'Create standard mutation success/failure behavior for many queries in one call. For each query, declare refresh_query_ids, ' +
      'clear_component_ids, close_modal_id, success_alert, and/or failure_alert; MCP expands them into normal ordered ToolJet events, ' +
      'validates every source/target/action, then performs one bulk event write. Optional success_actions/failure_actions accept ordinary ' +
      'event action objects for uncommon extras; use add_events when custom action ordering is required. This helper is datasource-neutral.',
    inputSchema: {
      app_id: z.string(),
      version_id: z.string(),
      lifecycles: z.array(lifecycleSchema).min(1).max(100),
    },
    async handler(args: { app_id: string; version_id: string; lifecycles: LifecycleInput[] }) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        const expanded = expandQueryLifecycles(
          summary,
          args.lifecycles.map((lifecycle) => ({
            queryId: lifecycle.query_id,
            refreshQueryIds: lifecycle.refresh_query_ids,
            clearComponentIds: lifecycle.clear_component_ids,
            closeModalId: lifecycle.close_modal_id,
            successAlert: lifecycle.success_alert
              ? { message: lifecycle.success_alert.message, alertType: lifecycle.success_alert.alert_type }
              : undefined,
            failureAlert: lifecycle.failure_alert
              ? { message: lifecycle.failure_alert.message, alertType: lifecycle.failure_alert.alert_type }
              : undefined,
            successActions: lifecycle.success_actions,
            failureActions: lifecycle.failure_actions,
          }))
        );
        const validation = validateEvents(summary, expanded.events);
        if (validation.errors.length) return fail(new Error(validation.errors.join(' ')));
        const result = await client.createEvents({
          appId: args.app_id,
          versionId: args.version_id,
          events: expanded.events,
        });
        return ok({
          ...result,
          lifecycles: args.lifecycles.length,
          warnings: [...new Set([...expanded.warnings, ...validation.warnings])],
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
