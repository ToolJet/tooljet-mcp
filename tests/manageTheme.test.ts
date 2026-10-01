import { describe, expect, it, vi } from 'vitest';
import { ToolJetHttpError, type ToolJetClient } from '../src/tooljetClient.js';
import { manageThemeTool, THEME_LICENCE_USER_MESSAGE } from '../src/tools/manageTheme.js';

const definition = {
  brand: { colors: { primary: { light: '#2563EB', dark: '#3B82F6' } } },
  text: { font: 'Inter', colors: { primary: { light: '#111827', dark: '#F9FAFB' } } },
  border: { radius: { default: 8, small: 6, large: 12 }, colors: { default: { light: '#E5E7EB', dark: '#374151' } } },
  systemStatus: { colors: { success: { light: '#16A34A', dark: '#4ADE80' } } },
  surface: {
    colors: {
      appBackground: { light: '#F9FAFB', dark: '#111827' },
      surface1: { light: '#FFFFFF', dark: '#1F2937' },
      surface2: { light: '#F3F4F6', dark: '#111827' },
      surface3: { light: '#E5E7EB', dark: '#0B1220' },
    },
  },
};

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('manage_theme create on an unlicensed instance', () => {
  it('returns a plain result with the user-facing message instead of an error', async () => {
    const client = {
      listAppThemes: vi.fn().mockResolvedValue([]),
      createAppTheme: vi.fn().mockRejectedValue(new ToolJetHttpError(451, 'createAppTheme', 'Feature not licensed')),
    } as unknown as ToolJetClient;
    const result = await manageThemeTool(client).handler({ action: 'create', name: 'Acme Ops theme', definition } as never);
    expect(result.isError).toBeFalsy();
    const body = textOf(result);
    expect(body.theme).toBeNull();
    expect(body.licensed).toBe(false);
    expect(body.user_message).toBe(THEME_LICENCE_USER_MESSAGE);
    expect(body.warnings.join(' ')).toMatch(/Do not retry theme creation/);
  });

  it('still surfaces other failures as errors', async () => {
    const client = {
      listAppThemes: vi.fn().mockResolvedValue([]),
      createAppTheme: vi.fn().mockRejectedValue(new ToolJetHttpError(500, 'createAppTheme', 'boom')),
    } as unknown as ToolJetClient;
    const result = await manageThemeTool(client).handler({ action: 'create', name: 'Acme Ops theme', definition } as never);
    expect(result.isError).toBe(true);
  });
});

// The UI creates the app before the build, so create_app (which themes in one call) is not used: builds spent
// list_app_themes, manage_theme and update_app_settings on it (2026-09-30). create now applies to a given app.
describe('manage_theme create applied to an app in the same call', () => {
  const client = () => ({
    listAppThemes: vi.fn().mockResolvedValue([]),
    createAppTheme: vi.fn().mockImplementation(async (input: { name: string }) => ({ id: 'th1', name: input.name })),
    updateAppSettings: vi.fn().mockResolvedValue(undefined),
  });

  it('creates the theme and sets it on the app version', async () => {
    const c = client();
    const body = textOf(await manageThemeTool(c as unknown as ToolJetClient).handler(
      { action: 'create', name: 'Rialto Foyer', definition, app_id: 'a1', version_id: 'v1' } as never));
    expect(c.updateAppSettings).toHaveBeenCalledWith({ appId: 'a1', versionId: 'v1', globalSettings: { theme: expect.objectContaining({ id: 'th1' }) } });
    expect(body.applied).toEqual({ app_id: 'a1', version_id: 'v1' });
  });

  it('opens the app in dark mode when the theme paints a dark canvas in light mode', async () => {
    const c = client();
    const dark = { ...definition, surface: { colors: { ...definition.surface.colors, appBackground: { light: '#0B1020', dark: '#0B1020' } } } };
    const body = textOf(await manageThemeTool(c as unknown as ToolJetClient).handler(
      { action: 'create', name: 'Relay console dark', definition: dark, app_id: 'a1', version_id: 'v1' } as never));
    expect(c.updateAppSettings).toHaveBeenCalledWith(expect.objectContaining({ globalSettings: expect.objectContaining({ appMode: 'dark' }) }));
    expect(body.applied).toEqual({ app_id: 'a1', version_id: 'v1', app_mode: 'dark' });
  });

  it('applies a reused theme of the same name too', async () => {
    const c = client();
    c.listAppThemes.mockResolvedValue([{ id: 'old', name: 'Rialto Foyer', definition }]);
    const body = textOf(await manageThemeTool(c as unknown as ToolJetClient).handler(
      { action: 'create', name: 'Rialto Foyer', definition, app_id: 'a1', version_id: 'v1' } as never));
    expect(body.reused).toBe(true);
    expect(c.updateAppSettings).toHaveBeenCalledWith(expect.objectContaining({ globalSettings: { theme: expect.objectContaining({ id: 'old' }) } }));
  });

  it('does not touch the app without app_id', async () => {
    const c = client();
    await manageThemeTool(c as unknown as ToolJetClient).handler({ action: 'create', name: 'Rialto Foyer', definition } as never);
    expect(c.updateAppSettings).not.toHaveBeenCalled();
  });
});
