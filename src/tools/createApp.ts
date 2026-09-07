import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { AppTheme, CreateAppResult, ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';

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
  name: z.string().trim().min(1).max(100),
  definition: z.record(z.string(), z.any()),
});
type DerivedTheme = z.infer<typeof derivedThemeSchema>;

export type CreateAppThemeChoice = 'standard' | 'workspace_default' | string | DerivedTheme;

export interface CreateAppToolResult extends CreateAppResult {
  theme: {
    /** "standard" = the shipped theme, "derived" = created from the request, "named" = an existing workspace theme, "workspace_default" = untouched. */
    mode: 'standard' | 'derived' | 'workspace_default' | 'named';
    id?: string;
    name?: string;
    /** Set when the requested theme could not be applied; the app still exists and uses the workspace default. */
    warning?: string;
  };
}

/**
 * Find (or create) the theme to apply. Themes are matched by name so repeated builds in one workspace reuse a
 * single object; the workspace default is never changed here.
 */
async function resolveTheme(client: ToolJetClient, choice: CreateAppThemeChoice): Promise<AppTheme> {
  const themes = await client.listAppThemes();
  const wanted: DerivedTheme | undefined =
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
      'and the theme that was applied. Decide the theme before calling: when the request names a brand, an industry ' +
      'or a customer type, derive a theme (see references/themes.md) and pass theme:{name, definition}; it is created ' +
      'once per workspace by name and applied. Otherwise the app gets the standard theme ("ToolJet Modern": neutral ' +
      'greys, hairline borders, 8/6/12 radii, blue primary). Pass theme:"workspace_default" to leave the app on the ' +
      'workspace default, or an existing theme name/id to reuse one. No theme is ever set as the workspace default. ' +
      'If a theme cannot be created (for example a licence gate) the app is still created and the result carries a ' +
      'theme warning.',
    inputSchema: {
      name: z.string().min(1),
      theme: z.union([z.string().min(1), derivedThemeSchema]).optional(),
    },
    async handler(args: { name: string; theme?: string | DerivedTheme }) {
      try {
        const created = await client.createApp(args.name);
        const choice: CreateAppThemeChoice = args.theme ?? 'standard';
        const result: CreateAppToolResult = { ...created, theme: { mode: 'workspace_default' } };
        if (choice === 'workspace_default') return ok(result);
        const label = typeof choice === 'object' ? choice.name : choice;
        try {
          const theme = await resolveTheme(client, choice);
          await client.updateAppSettings({
            appId: created.app_id,
            versionId: created.version_id,
            globalSettings: { theme },
          });
          const mode = choice === 'standard' ? 'standard' : typeof choice === 'object' ? 'derived' : 'named';
          result.theme = { mode, id: theme.id, name: theme.name };
        } catch (themeErr) {
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
