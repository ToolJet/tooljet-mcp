import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function getAppSummaryTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_app_summary',
    description:
      'Compact inspection of an app — use this instead of get_app for routine reads. Returns ' +
      '{ app_id, name, version_id, pages:[{id,name,handle,components:[{id,name,type,layouts,properties,styles,others}]}], ' +
      'queries:[{id,name,kind,data_source_id,options}], events:[{id,name,sourceId,target,event}] }. ' +
      'Each component carries only its ACTUAL bound values (properties/styles/others), not the full widget ' +
      'schema — typically ~10× smaller than get_app. Use the ids here for update_/delete_ tools.',
    inputSchema: {
      app_id: z.string(),
    },
    async handler(args: { app_id: string }) {
      try {
        const result = await client.getAppSummary(args.app_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
