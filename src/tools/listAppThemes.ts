import type { ToolJetClient } from '../tooljetClient.js';
import { compactTheme } from '../appSettings.js';
import { fail, ok, type ToolDef } from './types.js';

export function listAppThemesTool(client: ToolJetClient): ToolDef {
  return {
    name: 'list_app_themes',
    title: 'List App Themes',
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      'List compact workspace themes available for app settings. Disabled themes are returned but cannot be ' +
      'selected by update_app_settings. Theme definitions are intentionally omitted to keep discovery small.',
    inputSchema: {},
    async handler() {
      try {
        return ok({ themes: (await client.listAppThemes()).map((theme) => compactTheme(theme)) });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
