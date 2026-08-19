import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { projectAppSettings } from '../appSettings.js';
import { fail, ok, type ToolDef } from './types.js';

export function getAppSettingsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_app_settings',
    description:
      'Read the current editing version\'s compact app-wide visual settings: canvas background/width/mode, ' +
      'selected theme, header/logo/title, and navigation visibility/layout. Use before update_app_settings; ' +
      'this omits theme definitions and other large raw app data.',
    inputSchema: {
      app_id: z.string().min(1),
      version_id: z.string().min(1),
    },
    async handler(args: { app_id: string; version_id: string }) {
      try {
        return ok(projectAppSettings(await client.getAppSettings(args.app_id, args.version_id)));
      } catch (error) {
        return fail(error);
      }
    },
  };
}
