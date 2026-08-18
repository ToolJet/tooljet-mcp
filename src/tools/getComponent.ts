import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

export function getComponentTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_component',
    description:
      'Fetch ONE placed component by id — its actual bound values only: ' +
      '{ id, name, type, page_id, layouts, properties, styles, others }. Cheaper than get_app_summary ' +
      'when you only need to inspect or diff a single component before update_component.',
    inputSchema: {
      app_id: z.string(),
      component_id: z.string(),
    },
    async handler(args: { app_id: string; component_id: string }) {
      try {
        const result = await client.getComponent(args.app_id, args.component_id);
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
