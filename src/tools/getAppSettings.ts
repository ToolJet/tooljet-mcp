import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { projectAppSettings, projectJavascriptRuntime } from '../appSettings.js';
import { fail, ok, type ToolDef } from './types.js';

export function getAppSettingsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'get_app_settings',
    title: 'Get App Settings',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'Read the current editing version\'s compact app-wide visual settings: canvas background/width/mode, ' +
      'selected theme, header/logo/title, and navigation visibility/layout. Use before update_app_settings; ' +
      'this omits theme definitions and other large raw app data. Set include_libraries for bounded, read-only ' +
      'JavaScript library configuration and RunJS scope guidance before authoring library-dependent queries; this never loads or executes code.',
    inputSchema: {
      app_id: z.string().min(1),
      version_id: z.string().min(1),
      include_libraries: z.boolean().optional().describe('Inspect stored JavaScript dependencies, not runtime readiness. Omitted by default.'),
    },
    async handler(args: { app_id: string; version_id: string; include_libraries?: boolean }) {
      try {
        const snapshot = await client.getAppSettings(args.app_id, args.version_id);
        return ok({ ...projectAppSettings(snapshot),
          ...(args.include_libraries ? { javascript_runtime: projectJavascriptRuntime(snapshot) } : {}),
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
