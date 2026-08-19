import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { selectAppSummary, type AppSummarySection } from '../appSummarySelection.js';
import { ok, fail, type ToolDef } from './types.js';

const stringList = z.array(z.string()).min(1).optional();
const fieldList = z.array(z.string()).min(1).optional();

interface GetAppSummaryArgs {
  app_id: string;
  sections?: AppSummarySection[];
  detail?: 'structure' | 'full';
  include_components?: boolean;
  page_ids?: string[];
  page_names?: string[];
  page_handles?: string[];
  component_ids?: string[];
  component_names?: string[];
  component_types?: string[];
  query_ids?: string[];
  query_names?: string[];
  query_kinds?: string[];
  event_ids?: string[];
  event_source_ids?: string[];
  app_fields?: string[];
  page_fields?: string[];
  component_fields?: string[];
  query_fields?: string[];
  event_fields?: string[];
}

export function getAppSummaryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_app_summary',
    description:
      'Selective, bounded inspection of an app — use this instead of get_app. By default detail="structure" ' +
      'returns page/component/query/event identity and layout but omits bulky component values, query options, ' +
      'and event payloads. Filter by page/component/query/event ids or names and select exact top-level or dotted ' +
      'fields, e.g. component_fields:["id","properties.data.value","styles.textSize.value"]. ' +
      'Use detail="full" only after narrowing the target. Each component value is the ACTUAL bound value, never ' +
      'the full widget schema. Field roots: app(app_id/name/version_id), page(id/name/handle/icon/hidden/index/is_page_group/page_group_id), component' +
      '(id/name/type/layouts/properties/styles/others/parent), query(id/name/kind/data_source_id/options), and ' +
      'event(id/name/sourceId/target/event). sections can omit pages/queries/events; include_components:false ' +
      'returns page metadata only.',
    inputSchema: {
      app_id: z.string(),
      sections: z.array(z.enum(['pages', 'queries', 'events'])).optional(),
      detail: z.enum(['structure', 'full']).optional(),
      include_components: z.boolean().optional(),
      page_ids: stringList,
      page_names: stringList,
      page_handles: stringList,
      component_ids: stringList,
      component_names: stringList,
      component_types: stringList,
      query_ids: stringList,
      query_names: stringList,
      query_kinds: stringList,
      event_ids: stringList,
      event_source_ids: stringList,
      app_fields: fieldList,
      page_fields: fieldList,
      component_fields: fieldList,
      query_fields: fieldList,
      event_fields: fieldList,
    },
    async handler(args: GetAppSummaryArgs) {
      try {
        const summary = await client.getAppSummary(args.app_id);
        return ok(
          selectAppSummary(summary, {
            sections: args.sections,
            detail: args.detail,
            includeComponents: args.include_components,
            pageIds: args.page_ids,
            pageNames: args.page_names,
            pageHandles: args.page_handles,
            componentIds: args.component_ids,
            componentNames: args.component_names,
            componentTypes: args.component_types,
            queryIds: args.query_ids,
            queryNames: args.query_names,
            queryKinds: args.query_kinds,
            eventIds: args.event_ids,
            eventSourceIds: args.event_source_ids,
            appFields: args.app_fields,
            pageFields: args.page_fields,
            componentFields: args.component_fields,
            queryFields: args.query_fields,
            eventFields: args.event_fields,
          })
        );
      } catch (err) {
        return fail(err);
      }
    },
  };
}
