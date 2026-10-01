import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

export function createAppVersionTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_app_version',
    title: 'Create App Version',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Create a new draft version of an existing ToolJet app by cloning a specified source version. ' +
      'Returns the app_id, new version_id, version_name, source_version_id, and available version metadata; ' +
      'recovered:true means an exact draft from a retry was reused. Before editing, inspect that returned ' +
      'version_id for its cloned resource IDs. Version names must be unique within the app.',
    inputSchema: {
      app_id: z.string().uuid(),
      version_name: z.string().trim().min(1).max(25),
      version_from_id: z.string().uuid(),
      version_description: z.string().max(500).optional(),
    },
    strictInput: true,
    async handler(args: {
      app_id: string;
      version_name: string;
      version_from_id: string;
      version_description?: string;
    }) {
      try {
        return ok(await client.createAppVersion({
          appId: args.app_id,
          versionName: args.version_name,
          versionFromId: args.version_from_id,
          ...(args.version_description !== undefined
            ? { versionDescription: args.version_description }
            : {}),
        }));
      } catch (err) {
        return fail(err);
      }
    },
  };
}
