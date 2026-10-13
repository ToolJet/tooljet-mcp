import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { AppTheme, CreateAppResult, ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';
import { themeDefinition } from './manageTheme.js';
import { accentWarning } from '../themeAccent.js';
import type { ComponentLibrary } from '../componentLibrary.js';

// The standard theme's primary, for the accent note (a stock blue reads plain).
const STANDARD_PRIMARY = { brand: { colors: { primary: { light: '#2563EB' } } } };

interface StandardThemeFile {
  name: string;
  definition: Record<string, unknown>;
}

// Resolves to <repo>/data/default-theme.json from src/tools (tsx), dist/tools (tsc) or bundle/ (esbuild).
const here = dirname(fileURLToPath(import.meta.url));
const standardThemeCandidates = [
  resolve(here, '../../data/default-theme.json'),
  resolve(here, '../data/default-theme.json'),
];
let standardThemeCache: StandardThemeFile | undefined;

export function loadStandardTheme(): StandardThemeFile {
  if (!standardThemeCache) {
    const path = standardThemeCandidates.find((candidate) => existsSync(candidate));
    if (!path) {
      throw new Error(`standard theme file not found (looked in ${standardThemeCandidates.join(', ')})`);
    }
    standardThemeCache = JSON.parse(readFileSync(path, 'utf8')) as StandardThemeFile;
  }
  return standardThemeCache;
}

/** A theme derived from the request (brand, industry, audience): created once per workspace by name, then applied. */
const derivedThemeSchema = z.object({
  name: z.string().trim().min(5).max(100),
  definition: themeDefinition,
}).strict();
type DerivedTheme = z.infer<typeof derivedThemeSchema>;

export type CreateAppThemeChoice = 'standard' | 'workspace_default' | string | DerivedTheme;

export interface CreateAppToolResult extends CreateAppResult {
  /** The library the app is built in, saved on the app: "ui2" (ToolJet UI 2.0) unless the call asked for "ui1". */
  component_library: ComponentLibrary;
  /** Set when the library could not be saved; the app still exists. */
  component_library_warning?: string;
  theme: {
    /** "standard" = the shipped theme, "derived" = created from the request, "named" = an existing workspace theme, "workspace_default" = untouched. */
    mode: 'standard' | 'derived' | 'workspace_default' | 'named';
    id?: string;
    name?: string;
    /** "dark" when the app was opened in dark mode because the derived theme's canvas is dark in light mode. */
    app_mode?: 'light' | 'dark';
    /** Set when the requested theme could not be applied; the app still exists and uses the workspace default. */
    warning?: string;
    /** Set when the theme's primary is near-black, grey or the stock blue: names the accent menu. */
    accent_note?: string;
  };
}

/**
 * Find (or create) the theme to apply. Themes are matched by name so repeated builds in one workspace reuse a
 * single object; the workspace default is never changed here.
 */
async function resolveTheme(client: ToolJetClient, choice: CreateAppThemeChoice): Promise<AppTheme> {
  const themes = await client.listAppThemes();
  const wanted: StandardThemeFile | DerivedTheme | undefined =
    choice === 'standard' ? loadStandardTheme() : typeof choice === 'object' ? choice : undefined;
  if (wanted) {
    const existing = themes.find((theme) => theme.name === wanted.name && !theme.isDisabled);
    if (existing) return existing;
    return client.createAppTheme({ name: wanted.name, definition: wanted.definition, isDefault: false });
  }
  const named = themes.find((theme) => theme.name === choice || theme.id === choice);
  if (!named) throw new Error(`Theme "${String(choice)}" is not available in the active workspace.`);
  if (named.isDisabled) throw new Error(`Theme "${named.name}" is disabled and cannot be selected.`);
  return named;
}

/** A derived theme whose light-mode canvas is dark: the request wants a dark app. Left in light mode, ToolJet draws
 *  its own light-mode parts (table tags, inputs' chrome) for a light surface, and they read dark on dark. */
export function paintsDarkCanvasInLightMode(definition: unknown): boolean {
  const light = (definition as { surface?: { colors?: { appBackground?: { light?: unknown } } } })?.surface?.colors?.appBackground?.light;
  const hex = typeof light === 'string' ? /^#([0-9a-f]{6})$/i.exec(light.trim())?.[1] : undefined;
  if (!hex) return false;
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 0.18;
}

export function createAppTool(client: ToolJetClient): ToolDef {
  return {
    name: 'create_app',
    title: 'Create App',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    },
    description:
      'Create a new ToolJet app with a first version and home page. Returns app_id, version_id, ' +
      'home_page_id, editor_url, viewer_url, datasources_url, app_url (a backward-compatible alias for editor_url), ' +
      'and the theme that was applied. Honor explicit or selected themes first. Otherwise derive a theme from a brand, ' +
      'industry or customer type (see references/themes.md) and pass theme:{name, definition}; include complete brand, ' +
      'text, border, systemStatus and surface tokens with light/dark values, not a font-only or partial definition. It is created ' +
      'once per workspace by name and applied. Otherwise the app gets the standard theme ("ToolJet Modern": neutral ' +
      'greys, hairline borders, 8/6/12 radii, blue primary). Pass theme:"workspace_default" to leave the app on the ' +
      'workspace default, or an existing theme name/id to reuse one. No theme is ever set as the workspace default. ' +
      'If a theme cannot be created (for example a licence gate) the app is still created and the result carries a ' +
      'theme warning. New apps are built in ToolJet UI 2.0 (component_library "ui2": types starting with Shad, laid out ' +
      'in FlexContainers); pass component_library "ui1" only when the user asks for the classic ToolJet widgets.',
    inputSchema: {
      name: z.string().min(1),
      theme: z.union([z.string().min(1), derivedThemeSchema]).optional(),
      app_mode: z.enum(['light', 'dark']).optional().describe(
        "Open the app in this mode. Pass 'dark' when the request asks for a dark app, so the theme's dark values paint " +
        'every surface; never paint dark backgrounds by hand on a light-mode app.'),
      component_library: z.enum(['ui1', 'ui2']).optional().describe(
        'The component library the app is built in, saved on the app (the components panel lists it). Default "ui2", ' +
          'ToolJet UI 2.0; "ui1" (ToolJet UI 1.0, the native widgets) only when the user asks for it.'),
    },
    async handler(args: { name: string; theme?: string | DerivedTheme; app_mode?: 'light' | 'dark'; component_library?: ComponentLibrary }) {
      try {
        // Internal callers can bypass MCP input validation. Reject incomplete themes before creating
        // even an empty app; a theme name alone does not prove that its requested palette was applied.
        if (typeof args.theme === 'object') derivedThemeSchema.parse(args.theme);
        const created = await client.createApp(args.name);
        const componentLibrary: ComponentLibrary = args.component_library ?? 'ui2';
        const choice: CreateAppThemeChoice = args.theme ?? 'standard';
        const result: CreateAppToolResult = { ...created, component_library: componentLibrary, theme: { mode: 'workspace_default' } };
        // Saved explicitly, not left to the server's default for new apps: older ToolJet servers create apps without it.
        // A failure never fails the call: the app exists, and a retried create_app would make a second one.
        const saveLibrary = () => Promise.resolve().then(() => client.updateAppSettings({
          appId: created.app_id,
          versionId: created.version_id,
          globalSettings: { componentLibrary },
        })).catch((libraryErr: unknown) => {
          result.component_library_warning = `Could not save component_library "${componentLibrary}": ` +
            `${libraryErr instanceof Error ? libraryErr.message : String(libraryErr)}. Build in it anyway.`;
        });
        if (choice === 'workspace_default') {
          await saveLibrary();
          return ok(result);
        }
        const label = typeof choice === 'object' ? choice.name : choice;
        try {
          const theme = await resolveTheme(client, choice);
          const appMode =
            args.app_mode ??
            (typeof choice === 'object' && paintsDarkCanvasInLightMode(choice.definition) ? 'dark' : undefined);
          await client.updateAppSettings({
            appId: created.app_id,
            versionId: created.version_id,
            globalSettings: { theme, componentLibrary, ...(appMode ? { appMode } : {}) },
          });
          const mode = choice === 'standard' ? 'standard' : typeof choice === 'object' ? 'derived' : 'named';
          const accentNote = mode === 'standard' ? accentWarning(STANDARD_PRIMARY) : mode === 'derived' ? accentWarning((choice as DerivedTheme).definition) : null;
          result.theme = { mode, id: theme.id, name: theme.name, ...(appMode ? { app_mode: appMode } : {}), ...(accentNote ? { accent_note: accentNote } : {}) };
        } catch (themeErr) {
          await saveLibrary();
          result.theme = {
            mode: 'workspace_default',
            warning:
              `Could not apply theme "${label}": ${themeErr instanceof Error ? themeErr.message : String(themeErr)}. ` +
              'The app was created on the workspace default theme.',
          };
        }
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  };
}
