import { z } from 'zod';
import type { AppTheme, ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const colorPair = z.object({
  light: z.string().trim().min(1).max(100).describe('Color used in light mode; hex is recommended.'),
  dark: z.string().trim().min(1).max(100).describe('Color used in dark mode; hex is recommended.'),
}).strict();

const themeDefinition = z.object({
  brand: z.object({
    colors: z.object({
      primary: colorPair,
      secondary: colorPair.optional(),
      tertiary: colorPair.optional(),
    }).strict(),
  }).strict(),
  text: z.object({
    font: z.string().trim().min(1).max(200),
    colors: z.object({
      primary: colorPair,
      placeholder: colorPair.optional(),
      disabled: colorPair.optional(),
    }).strict(),
  }).strict(),
  border: z.object({
    radius: z.object({
      default: z.number().nonnegative(),
      small: z.number().nonnegative(),
      large: z.number().nonnegative(),
    }).strict(),
    colors: z.object({
      default: colorPair,
      weak: colorPair.optional(),
      disabled: colorPair.optional(),
    }).strict(),
  }).strict(),
  systemStatus: z.object({
    colors: z.object({
      success: colorPair,
      error: colorPair.optional(),
      warning: colorPair.optional(),
    }).strict(),
  }).strict(),
  surface: z.object({
    colors: z.object({
      appBackground: colorPair,
      surface1: colorPair,
      surface2: colorPair,
      surface3: colorPair,
    }).strict(),
  }).strict(),
}).strict();

type Args = {
  action: 'list' | 'create' | 'set_default' | 'update_definition' | 'rename' | 'delete';
  theme_id?: string;
  name?: string;
  definition?: z.infer<typeof themeDefinition>;
  is_default?: boolean;
  confirm?: boolean;
};

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`manage_theme requires ${label} for this action.`);
  return value;
}

async function readTheme(client: ToolJetClient, themeId: string): Promise<AppTheme> {
  const theme = (await client.listAppThemes()).find((candidate) => candidate.id === themeId);
  if (!theme) throw new Error(`Theme "${themeId}" is not available in the active workspace.`);
  return theme;
}

export function manageThemeTool(client: ToolJetClient): ToolDef {
  return {
    name: 'manage_theme',
    description:
      'Manage workspace theme objects through ToolJet\'s typed theme API. Actions: list, create, set_default, ' +
      'update_definition, rename, delete. Definitions contain brand, text, border, systemStatus, and surface tokens ' +
      'with light/dark values. Creating a theme does not apply it to an app; use update_app_settings(theme_id) for that. ' +
      'Delete requires confirm:true after exact-target approval.',
    inputSchema: {
      action: z.enum(['list', 'create', 'set_default', 'update_definition', 'rename', 'delete']),
      theme_id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(100).optional(),
      definition: themeDefinition.optional(),
      is_default: z.boolean().optional(),
      confirm: z.boolean().optional(),
    },
    async handler(args: Args) {
      try {
        if (args.action === 'list') {
          return ok({ themes: await client.listAppThemes() });
        }

        if (args.action === 'create') {
          const name = requireValue(args.name, 'name');
          if (name.length < 5) throw new Error('Theme name must contain at least 5 characters.');
          if (name === 'ToolJet') throw new Error('The reserved theme name "ToolJet" cannot be used.');
          const created = await client.createAppTheme({
            name,
            definition: requireValue(args.definition, 'definition'),
            isDefault: args.is_default ?? false,
          });
          return ok({ theme: created });
        }

        const themeId = requireValue(args.theme_id, 'theme_id');
        await readTheme(client, themeId);

        if (args.action === 'set_default') {
          await client.setDefaultAppTheme(themeId, args.is_default ?? true);
          return ok({ theme: await readTheme(client, themeId) });
        }

        if (args.action === 'update_definition') {
          await client.updateAppThemeDefinition(themeId, requireValue(args.definition, 'definition'));
          return ok({ theme: await readTheme(client, themeId) });
        }

        if (args.action === 'rename') {
          await client.renameAppTheme(themeId, requireValue(args.name, 'name'));
          return ok({ theme: await readTheme(client, themeId) });
        }

        if (args.confirm !== true) {
          throw new Error(`Deleting theme "${themeId}" requires confirm:true after exact-target user approval.`);
        }
        await client.deleteAppTheme(themeId);
        return ok({ deleted: true, theme_id: themeId });
      } catch (error) {
        return fail(error);
      }
    },
  };
}

