import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { getEventActionCatalog, getEventActionSchema } from '../eventActionCatalog.js';
import { fail, ok, type ToolDef } from './types.js';

export function getEventActionCatalogTool(_client: ToolJetClient): ToolDef {
  return {
    name: 'get_event_action_catalog',
    description:
      'Discover the active ToolJet event action ids and their persisted payload contracts. With no action_id, ' +
      'returns the compact source-derived palette. Pass action_id for its required/optional fields, allowed values, ' +
      'target kind, and runtime caveats. Component-specific control actions remain in ' +
      'get_component_catalog(type, sections:["actions"]). Never guess an action id or payload field.',
    inputSchema: {
      action_id: z.string().optional(),
    },
    async handler(args: { action_id?: string }) {
      try {
        if (!args.action_id) {
          return ok(getEventActionCatalog().map(({ id, name, group, target }) => ({
            id,
            name,
            ...(group ? { group } : {}),
            ...(target ? { target } : {}),
          })));
        }
        const schema = getEventActionSchema(args.action_id);
        return schema
          ? ok(schema)
          : ok({ error: `Unknown event action "${args.action_id}". Call with no action_id to list valid ids.` });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
