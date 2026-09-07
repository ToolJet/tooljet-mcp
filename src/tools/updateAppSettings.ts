import { z } from 'zod';
import { pageSettingProperties, projectAppSettings } from '../appSettings.js';
import type { AppSettingsSnapshot, ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

type Args = {
  app_id: string;
  version_id: string;
  canvas_background_color?: string;
  canvas_max_width?: { value: number; unit: '%' | 'px' };
  app_mode?: 'auto' | 'light' | 'dark';
  theme_id?: string;
  hide_header?: boolean;
  hide_logo?: boolean;
  header_title?: string;
  navigation_hidden?: boolean;
  navigation_position?: 'side' | 'top';
  navigation_style?: 'texticon' | 'text' | 'icon';
  navigation_collapsible?: boolean;
};

const SETTING_KEYS: Array<keyof Omit<Args, 'app_id' | 'version_id'>> = [
  'canvas_background_color', 'canvas_max_width', 'app_mode', 'theme_id', 'hide_header', 'hide_logo',
  'header_title', 'navigation_hidden', 'navigation_position', 'navigation_style', 'navigation_collapsible',
];

function persistenceMismatches(args: Args, snapshot: AppSettingsSnapshot): string[] {
  const global = snapshot.global_settings;
  const page = pageSettingProperties(snapshot);
  const mismatches: string[] = [];
  const expectEqual = (label: string, actual: unknown, expected: unknown) => {
    if (actual !== expected) mismatches.push(`${label} did not persist (expected ${JSON.stringify(expected)}, read back ${JSON.stringify(actual)})`);
  };
  if (args.canvas_background_color !== undefined) expectEqual('canvas_background_color', global.canvasBackgroundColor, args.canvas_background_color);
  if (args.canvas_max_width !== undefined) {
    expectEqual('canvas_max_width.value', global.canvasMaxWidth, args.canvas_max_width.value);
    expectEqual('canvas_max_width.unit', global.canvasMaxWidthType, args.canvas_max_width.unit);
  }
  if (args.app_mode !== undefined) expectEqual('app_mode', global.appMode, args.app_mode);
  if (args.theme_id !== undefined) {
    const theme = global.theme as Record<string, unknown> | undefined;
    expectEqual('theme_id', theme?.id, args.theme_id);
  }
  if (args.hide_header !== undefined) expectEqual('hide_header', page.hideHeader, args.hide_header);
  if (args.hide_logo !== undefined) expectEqual('hide_logo', page.hideLogo, args.hide_logo);
  if (args.header_title !== undefined) expectEqual('header_title', page.name, args.header_title);
  if (args.navigation_hidden !== undefined) {
    const disableMenu = page.disableMenu as Record<string, unknown> | undefined;
    expectEqual('navigation_hidden', disableMenu?.value, `{{${args.navigation_hidden}}}`);
  }
  if (args.navigation_position !== undefined) expectEqual('navigation_position', page.position, args.navigation_position);
  if (args.navigation_style !== undefined) expectEqual('navigation_style', page.style, args.navigation_style);
  if (args.navigation_collapsible !== undefined) expectEqual('navigation_collapsible', page.collapsable, args.navigation_collapsible);
  return mismatches;
}

export function updateAppSettingsTool(client: ToolJetClient): ToolDef {
  return {
    name: 'update_app_settings',
    title: 'Update App Settings',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    },
    description:
      'Patch app-wide visual settings on the current editing version in one version update, then read them back. ' +
      'Supports canvas background/width/mode, a theme selected from list_app_themes, header/logo/title, and ' +
      'navigation visibility/layout. hide_header controls the app header/banner. The separate generated page-navigation ' +
      'menu can be positioned on the side or top; navigation_hidden hides that entire menu in either position. ' +
      'To hide only one non-Home page from that menu, use update_pages.hidden. ' +
      'Omitted fields are preserved. Every requested field is read back; the tool returns an error instead of ' +
      'success if any field did not persist.',
    inputSchema: {
      app_id: z.string().min(1),
      version_id: z.string().min(1),
      canvas_background_color: z.string().max(200).optional(),
      canvas_max_width: z.object({
        value: z.number().positive().max(100_000),
        unit: z.enum(['%', 'px']),
      }).optional(),
      app_mode: z.enum(['auto', 'light', 'dark']).optional(),
      theme_id: z.string().uuid().optional(),
      hide_header: z.boolean().optional().describe(
        'Hide or show the app header/banner. This is separate from the generated page-navigation menu.'
      ),
      hide_logo: z.boolean().optional(),
      header_title: z.string().trim().min(1).max(32).optional(),
      navigation_hidden: z.boolean().optional().describe(
        'Hide or show the entire generated page-navigation menu, whether it is positioned on the side or top. ' +
        'To hide only one non-Home page from the menu, use update_pages.hidden.'
      ),
      navigation_position: z.enum(['side', 'top']).optional(),
      navigation_style: z.enum(['texticon', 'text', 'icon']).optional(),
      navigation_collapsible: z.boolean().optional(),
    },
    async handler(args: Args) {
      try {
        const changed = SETTING_KEYS.filter((key) => args[key] !== undefined);
        if (!changed.length) throw new Error('update_app_settings requires at least one setting field.');
        if (args.canvas_max_width?.unit === '%' && args.canvas_max_width.value > 100) {
          throw new Error('canvas_max_width.value cannot exceed 100 when unit is "%".');
        }

        // Validate app/version before any write, and resolve a theme to the exact persisted object.
        const current = await client.getAppSettings(args.app_id, args.version_id);
        const currentPage = pageSettingProperties(current);
        const finalPosition = args.navigation_position ?? currentPage.position;
        const finalStyle = args.navigation_style ?? currentPage.style;
        if (finalPosition === 'top' && finalStyle === 'icon') {
          throw new Error('navigation_style "icon" is not supported when navigation_position is "top"; use "text" or "texticon".');
        }
        let theme: Record<string, unknown> | undefined;
        if (args.theme_id) {
          const themes = await client.listAppThemes();
          const selected = themes.find((candidate) => candidate.id === args.theme_id);
          if (!selected) throw new Error(`Theme "${args.theme_id}" is not available in the active workspace.`);
          if (selected.isDisabled) throw new Error(`Theme "${selected.name}" is disabled and cannot be selected.`);
          theme = selected;
        }

        const globalSettings: Record<string, unknown> = {
          ...(args.canvas_background_color !== undefined ? { canvasBackgroundColor: args.canvas_background_color } : {}),
          ...(args.canvas_max_width !== undefined
            ? { canvasMaxWidth: args.canvas_max_width.value, canvasMaxWidthType: args.canvas_max_width.unit }
            : {}),
          ...(args.app_mode !== undefined ? { appMode: args.app_mode } : {}),
          ...(theme ? { theme } : {}),
        };
        const properties: Record<string, unknown> = {
          ...(args.hide_header !== undefined ? { hideHeader: args.hide_header } : {}),
          ...(args.hide_logo !== undefined ? { hideLogo: args.hide_logo } : {}),
          ...(args.header_title !== undefined ? { name: args.header_title } : {}),
          ...(args.navigation_hidden !== undefined
            ? { disableMenu: { value: `{{${args.navigation_hidden}}}`, fxActive: false } }
            : {}),
          ...(args.navigation_position !== undefined ? { position: args.navigation_position } : {}),
          ...(args.navigation_style !== undefined ? { style: args.navigation_style } : {}),
          ...(args.navigation_collapsible !== undefined ? { collapsable: args.navigation_collapsible } : {}),
        };

        await client.updateAppSettings({
          appId: args.app_id,
          versionId: args.version_id,
          ...(Object.keys(globalSettings).length ? { globalSettings } : {}),
          ...(Object.keys(properties).length ? { pageSettings: { properties } } : {}),
        });
        const persisted = await client.getAppSettings(args.app_id, args.version_id);
        const mismatches = persistenceMismatches(args, persisted);
        if (mismatches.length) {
          throw new Error(
            `update_app_settings partially failed readback: ${mismatches.join('; ')}. ` +
            'Other requested fields may already have persisted; inspect get_app_settings before retrying.'
          );
        }
        return ok({
          updated_fields: changed.length,
          settings: projectAppSettings(persisted),
          warnings: [],
        });
      } catch (error) {
        return fail(error);
      }
    },
  };
}
