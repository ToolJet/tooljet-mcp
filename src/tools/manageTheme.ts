import { z } from 'zod';
import { ToolJetHttpError, type AppTheme, type ToolJetClient } from '../tooljetClient.js';

/** Shown to the end user, verbatim, when the instance's plan has no custom-themes feature. */
export const THEME_LICENCE_USER_MESSAGE =
  'Custom themes are not included in your current ToolJet plan, so this app uses the workspace default theme. ' +
  'Upgrading your plan enables branded themes; the app can be re-themed in one request afterwards.';
import { exposeActions, fail, ok, type ActionTool, type ToolDef } from './types.js';
import { paintsDarkCanvasInLightMode } from '../appSettings.js';

const colorPair = z.object({
  light: z.string().trim().min(1).max(100).describe('Color used in light mode; hex is recommended.'),
  dark: z.string().trim().min(1).max(100).describe('Color used in dark mode; hex is recommended.'),
}).strict();

export const themeDefinition = z.object({
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
  include_definitions?: boolean;
  app_id?: string;
  version_id?: string;
};

/** Sets the theme on an app version, in dark mode when the theme's light-mode canvas is dark (as create_app does). */
async function applyToApp(client: ToolJetClient, theme: AppTheme, args: Args, definition: unknown) {
  if (!args.app_id || !args.version_id) return undefined;
  const dark = paintsDarkCanvasInLightMode(definition);
  await client.updateAppSettings({ appId: args.app_id, versionId: args.version_id,
    globalSettings: { theme, ...(dark ? { appMode: 'dark' as const } : {}) } });
  return { app_id: args.app_id, version_id: args.version_id, ...(dark ? { app_mode: 'dark' as const } : {}) };
}

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
    title: 'Manage Workspace Theme',
    // list/create/rename are safe, but the same tool also deletes a theme, so the hint covers its widest action.
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
    description:
      'Manage workspace theme objects through ToolJet\'s typed theme API. Actions: list, create, set_default, ' +
      'update_definition, rename, delete. Definitions contain brand, text, border, systemStatus, and surface tokens ' +
      'with light/dark values. create with app_id and version_id also applies the theme to that app (in dark mode when ' +
      'its light-mode canvas is dark), so a new app needs no update_app_settings call; create reuses a theme of the same ' +
      'name, so there is no need to list themes first. ' +
      'Delete requires confirm:true after exact-target approval. list returns id, name and flags only; pass ' +
      'include_definitions:true (or theme_id) to get a definition.',
    inputSchema: {
      action: z.enum(['list', 'create', 'set_default', 'update_definition', 'rename', 'delete']),
      theme_id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(100).optional(),
      definition: themeDefinition.optional(),
      is_default: z.boolean().optional(),
      confirm: z.boolean().optional(),
      include_definitions: z.boolean().optional(),
      app_id: z.string().uuid().optional().describe('create only: apply the theme to this app as well'),
      version_id: z.string().uuid().optional().describe('create only, with app_id: the app version to apply it to'),
    },
    async handler(args: Args) {
      try {
        if (args.action === 'list') {
          const themes = await client.listAppThemes();
          // A workspace with a couple of dozen themes returns ~12k chars of token definitions, and the
          // caller almost always only needs to know which names exist. Definitions on request only.
          if (args.include_definitions) return ok({ themes });
          if (args.theme_id) {
            const one = themes.find((theme) => theme.id === args.theme_id);
            return one ? ok({ themes: [one] }) : fail(new Error(`Theme "${args.theme_id}" not found.`));
          }
          return ok({
            themes: themes.map(({ id, name, isDefault, isBasic, isDisabled }) => ({ id, name, isDefault, isBasic, isDisabled })),
            note: 'Definitions omitted; pass include_definitions:true or theme_id to read one.',
          });
        }

        if (args.action === 'create') {
          const name = requireValue(args.name, 'name');
          if (name.length < 5) throw new Error('Theme name must contain at least 5 characters.');
          if (name === 'ToolJet') throw new Error('The reserved theme name "ToolJet" cannot be used.');
          // Theme names are unique per workspace and the skill derives them from the brand, so a second
          // build for the same brand hits the same name. Returning the existing theme keeps create
          // idempotent instead of costing the caller a 422 and a retry turn.
          const existing = (await client.listAppThemes()).find((theme) => theme.name === name && !theme.isDisabled);
          if (existing) {
            const applied = await applyToApp(client, existing, args, (existing as { definition?: unknown }).definition ?? args.definition);
            return ok({
              theme: existing,
              reused: true,
              ...(applied ? { applied } : {}),
              warnings: [
                `Theme "${name}" already exists in this workspace; returned it instead of creating a duplicate. ` +
                  (applied ? 'It is applied to the app.' : 'Apply it with update_app_settings, or use update_definition to change it.'),
              ],
            });
          }
          try {
            const created = await client.createAppTheme({
              name,
              definition: requireValue(args.definition, 'definition'),
              isDefault: args.is_default ?? false,
            });
            const applied = await applyToApp(client, created, args, args.definition);
            return ok({ theme: created, ...(applied ? { applied } : {}) });
          } catch (error) {
            // Custom themes are a licensed feature; Community Edition answers 451. That is a fact about
            // the customer's plan, not a mistake in the call, so it must not read as an error the model
            // should repair (retrying under another name, guessing a theme id). Return a plain result
            // that says what happened and what to tell the user.
            if (error instanceof ToolJetHttpError && error.status === 451) {
              return ok({
                theme: null,
                licensed: false,
                user_message: THEME_LICENCE_USER_MESSAGE,
                warnings: [
                  'Custom themes are not included in this ToolJet plan (HTTP 451). The app keeps the workspace ' +
                    'default theme. Do not retry theme creation or guess a theme id; build the app on the default ' +
                    'theme and repeat `user_message` to the user in the closing handoff.',
                ],
              });
            }
            throw error;
          }
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

const themes: ActionTool[] = [
  { action: 'list', name: 'list_workspace_themes', title: 'List Workspace Theme Definitions',
    description: 'Read workspace themes with id, name, and flags. Unlike list_app_themes, this also supports include_definitions:true for all definitions or theme_id for one full definition. Does not change themes.',
    required: [], optional: ['theme_id', 'include_definitions'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { action: 'create', name: 'create_workspace_theme', title: 'Create Workspace Theme',
    description: 'Create a custom workspace theme, or reuse an existing active theme of the same name. Supply a name of at least five characters and a full definition for a new theme. is_default can replace the workspace default. With both app_id and version_id, applies it to that app and selects dark mode for a dark light-mode canvas. License gates apply.',
    required: ['name'], optional: ['definition', 'is_default', 'app_id', 'version_id'],
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { action: 'set_default', name: 'set_default_workspace_theme', title: 'Set Default Workspace Theme',
    description: 'Change whether an existing workspace theme is the default. is_default defaults to true; false removes its default status. Changes the workspace default used by apps.',
    required: ['theme_id'], optional: ['is_default'], annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { action: 'update_definition', name: 'update_workspace_theme_definition', title: 'Update Workspace Theme Definition',
    description: 'Replace the full token definition of an existing workspace theme, affecting apps using it. Definitions require brand, text, border, systemStatus, and surface tokens with light/dark colors. License gates apply.',
    required: ['theme_id', 'definition'], annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { action: 'rename', name: 'rename_workspace_theme', title: 'Rename Workspace Theme',
    description: 'Replace the name of an existing workspace theme. Requires a theme_id from the active workspace; ToolJet permissions and license gates apply.',
    required: ['theme_id', 'name'], annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { action: 'delete', name: 'delete_workspace_theme', title: 'Delete Workspace Theme',
    description: 'Delete an existing workspace theme only after explicit approval of that exact theme. Requires confirm:true. ToolJet permissions and license gates apply.',
    required: ['theme_id', 'confirm'], annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
];

export function themeActionTools(source: ToolDef): ToolDef[] {
  return exposeActions(source, themes);
}
