import { z } from 'zod';
import { ToolJetHttpError, type AppTheme, type ToolJetClient } from '../tooljetClient.js';

/** Shown to the end user, verbatim, when the instance's plan has no custom-themes feature. */
export const THEME_LICENCE_USER_MESSAGE =
  'Custom themes are not included in your current ToolJet plan, so this app uses the workspace default theme. ' +
  'Upgrading your plan enables branded themes; the app can be re-themed in one request afterwards.';
import { fail, ok, type ToolDef } from './types.js';
import { loadStandardTheme, paintsDarkCanvasInLightMode } from './createApp.js';
import { accentWarning, hsl } from '../themeAccent.js';
import { themeDefinition } from './themeDefinition.js';

export { themeDefinition };

type Args = {
  action: 'list' | 'create' | 'set_default' | 'update_definition' | 'rename' | 'delete';
  theme_id?: string;
  name?: string;
  definition?: z.infer<typeof themeDefinition>;
  primary?: string;
  font?: string;
  radius?: number;
  is_default?: boolean;
  confirm?: boolean;
  include_definitions?: boolean;
  app_id?: string;
  version_id?: string;
  app_mode?: 'light' | 'dark';
};

/** Sets the theme on an app version, in dark mode when the theme's light-mode canvas is dark (as create_app does). */
async function applyToApp(client: ToolJetClient, theme: AppTheme, args: Args, definition: unknown) {
  if (!args.app_id || !args.version_id) return undefined;
  const mode = args.app_mode ?? (paintsDarkCanvasInLightMode(definition) ? 'dark' : undefined);
  await client.updateAppSettings({ appId: args.app_id, versionId: args.version_id,
    globalSettings: { theme, ...(mode ? { appMode: mode } : {}) } });
  return { app_id: args.app_id, version_id: args.version_id, ...(mode ? { app_mode: mode } : {}) };
}

const hex = (h: number, s: number, l: number): string => {
  const channel = (n: number): string => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

/**
 * A theme from the few choices that make it this app's. DeepSeek left `definition` out of 62 of 63 failed calls in 9 of 10
 * builds (2026-11-04). Keeping the standard theme's greys around the chosen accent made apps look alike, and they graded
 * 7.71 on design against 8.00 for full themes, so the neutrals and accents here all come from the accent's hue.
 */
export function definitionFromChoices(args: Pick<Args, 'primary' | 'font' | 'radius'>): z.infer<typeof themeDefinition> | undefined {
  const accent = args.primary ? hsl(args.primary) : null;
  if (!args.primary || !accent) return undefined;
  const { h, s: sat, l } = accent;
  const pair = (light: [number, number], dark: [number, number], hue = h) => ({ light: hex(hue, light[0], light[1]), dark: hex(hue, dark[0], dark[1]) });
  const base = loadStandardTheme().definition as z.infer<typeof themeDefinition>;
  const radius = args.radius ?? base.border.radius.default;
  return {
    brand: {
      colors: {
        primary: { light: args.primary, dark: hex(h, sat, Math.max(l, 0.62)) },
        secondary: pair([0.45, 0.22], [0.4, 0.78]),
        tertiary: pair([0.65, 0.42], [0.65, 0.68], (h + 35) % 360),
      },
    },
    text: {
      font: args.font ?? base.text.font,
      colors: { primary: pair([0.28, 0.13], [0.18, 0.94]), placeholder: pair([0.12, 0.45], [0.1, 0.65]), disabled: pair([0.1, 0.68], [0.08, 0.45]) },
    },
    border: {
      radius: { default: radius, small: Math.max(radius - 2, 0), large: radius + 4 },
      colors: { default: pair([0.22, 0.86], [0.12, 0.24]), weak: pair([0.24, 0.91], [0.12, 0.19]), disabled: pair([0.16, 0.82], [0.1, 0.28]) },
    },
    systemStatus: base.systemStatus,
    surface: {
      colors: {
        appBackground: pair([0.3, 0.965], [0.16, 0.075]),
        surface1: { light: '#ffffff', dark: hex(h, 0.14, 0.11) },
        surface2: pair([0.28, 0.94], [0.13, 0.145]),
        surface3: pair([0.24, 0.9], [0.12, 0.19]),
      },
    },
  };
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
      openWorldHint: true,
    },
    description:
      'Manage workspace theme objects through ToolJet\'s typed theme API. Actions: list, create, set_default, ' +
      'update_definition, rename, delete. Definitions contain brand, text, border, systemStatus, and surface tokens ' +
      'with light/dark values. create with app_id and version_id also applies the theme to that app (in app_mode, else ' +
      'in dark mode when its light-mode canvas is dark), so a new app needs no update_app_settings call; create reuses a theme of the same ' +
      'name, so there is no need to list themes first. ' +
      'Delete requires confirm:true after exact-target approval. list returns id, name and flags only; pass ' +
      'include_definitions:true (or theme_id) to get a definition.',
    inputSchema: {
      action: z.enum(['list', 'create', 'set_default', 'update_definition', 'rename', 'delete']),
      theme_id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(100).optional(),
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe('create: the accent colour as a hex. With font and radius, this is all a theme needs; the rest is derived from its hue'),
      font: z.string().trim().min(1).max(100).optional().describe('create, with primary: one font family name'),
      radius: z.number().min(0).max(32).optional().describe('create, with primary: corner radius in px'),
      definition: themeDefinition.optional(),
      is_default: z.boolean().optional(),
      confirm: z.boolean().optional(),
      include_definitions: z.boolean().optional(),
      app_id: z.string().uuid().optional().describe('create only: apply the theme to this app as well'),
      version_id: z.string().uuid().optional().describe('create only, with app_id: the app version to apply it to'),
      app_mode: z.enum(['light', 'dark']).optional().describe(
        "create only, with app_id: open the app in this mode. Pass 'dark' when the request asks for a dark app: the " +
        "theme's dark values then paint every surface, and ToolJet's own parts (tables, inputs) draw for them. Never " +
        'paint dark backgrounds by hand on a light-mode app.'),
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
            const definition = requireValue(args.definition ?? definitionFromChoices(args), 'primary (a hex colour; font and radius are optional)');
            const created = await client.createAppTheme({
              name,
              definition,
              isDefault: args.is_default ?? false,
            });
            const applied = await applyToApp(client, created, args, definition);
            const accent = accentWarning(definition);
            return ok({ theme: created, ...(applied ? { applied } : {}), ...(accent ? { warnings: [accent] } : {}) });
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
          const accent = accentWarning(args.definition);
          return ok({ theme: await readTheme(client, themeId), ...(accent ? { warnings: [accent] } : {}) });
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
