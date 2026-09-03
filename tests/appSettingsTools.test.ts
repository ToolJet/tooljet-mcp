import { describe, expect, it, vi } from 'vitest';
import type { AppSettingsSnapshot, ToolJetClient } from '../src/tooljetClient.js';
import { getAppSettingsTool } from '../src/tools/getAppSettings.js';
import { listAppThemesTool } from '../src/tools/listAppThemes.js';
import { updateAppSettingsTool } from '../src/tools/updateAppSettings.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

const versionId = '22222222-2222-4222-8222-222222222222';
const themeId = '11111111-1111-4111-8111-111111111111';
const before: AppSettingsSnapshot = {
  app_id: 'app1',
  version_id: versionId,
  global_settings: {
    canvasBackgroundColor: '#ffffff', canvasMaxWidth: 100, canvasMaxWidthType: '%', appMode: 'light',
    theme: { id: 'old', name: 'ToolJet' },
  },
  page_settings: {
    properties: {
      hideHeader: false, hideLogo: false, name: 'App', disableMenu: { value: '{{false}}', fxActive: false },
      position: 'side', style: 'texticon', collapsable: true,
    },
  },
};

describe('app settings tools', () => {
  it('distinguishes the app header, whole navigation menu, and individual page visibility', () => {
    const tool = updateAppSettingsTool({} as ToolJetClient);
    expect(tool.description).toMatch(/hide_header controls the app header\/banner/i);
    expect(tool.description).toMatch(/navigation menu.*side or top.*navigation_hidden hides.*entire menu/i);
    expect(tool.description).toMatch(/one non-Home page.*update_pages\.hidden/i);
    expect(tool.inputSchema.hide_header.description).toMatch(/separate from.*page-navigation menu/i);
    expect(tool.inputSchema.navigation_hidden.description).toMatch(/entire.*page-navigation menu.*side or top/i);
  });

  it('projects compact settings without returning the full theme definition', async () => {
    const client = { getAppSettings: vi.fn().mockResolvedValue(before) } as unknown as ToolJetClient;
    const result = await getAppSettingsTool(client).handler({ app_id: 'app1', version_id: versionId });
    expect(textOf(result)).toMatchObject({
      canvas: { background_color: '#ffffff', max_width: { value: 100, unit: '%' }, mode: 'light' },
      theme: { id: 'old', name: 'ToolJet' },
      navigation: { hidden: false, position: 'side', style: 'texticon', collapsible: true },
    });
    expect(result.content[0]!.text).not.toContain('definition');
  });

  it('lists compact themes and preserves disabled status', async () => {
    const client = { listAppThemes: vi.fn().mockResolvedValue([
      { id: themeId, name: 'Ocean', definition: { colors: { primary: '#00f' } }, isDisabled: true },
    ]) } as unknown as ToolJetClient;
    const result = await listAppThemesTool(client).handler({});
    expect(textOf(result)).toEqual({ themes: [{ id: themeId, name: 'Ocean', is_disabled: true }] });
  });

  it('patches global and page settings once, resolves a theme, and verifies readback', async () => {
    const after: AppSettingsSnapshot = {
      ...before,
      global_settings: {
        ...before.global_settings,
        canvasBackgroundColor: '#f7f8fa', canvasMaxWidth: 1280, canvasMaxWidthType: 'px', appMode: 'auto',
        theme: { id: themeId, name: 'Ocean' },
      },
      page_settings: { properties: {
        ...((before.page_settings as any).properties),
        hideHeader: true, name: 'Operations', position: 'top', style: 'text',
      } },
    };
    const theme = { id: themeId, name: 'Ocean', definition: { colors: { primary: '#00f' } } };
    const client = {
      getAppSettings: vi.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after),
      listAppThemes: vi.fn().mockResolvedValue([theme]),
      updateAppSettings: vi.fn().mockResolvedValue(undefined),
    } as unknown as ToolJetClient;

    const result = await updateAppSettingsTool(client).handler({
      app_id: 'app1', version_id: versionId, canvas_background_color: '#f7f8fa',
      canvas_max_width: { value: 1280, unit: 'px' }, app_mode: 'auto', theme_id: themeId,
      hide_header: true, header_title: 'Operations', navigation_position: 'top', navigation_style: 'text',
    });

    expect(result.isError).not.toBe(true);
    expect(client.updateAppSettings).toHaveBeenCalledWith({
      appId: 'app1', versionId,
      globalSettings: {
        canvasBackgroundColor: '#f7f8fa', canvasMaxWidth: 1280, canvasMaxWidthType: 'px', appMode: 'auto', theme,
      },
      pageSettings: { properties: {
        hideHeader: true, name: 'Operations', position: 'top', style: 'text',
      } },
    });
    expect(textOf(result)).toMatchObject({ updated_fields: 8, warnings: [] });
  });

  it('fails when a setting is silently ignored on readback', async () => {
    const client = {
      getAppSettings: vi.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(before),
      updateAppSettings: vi.fn().mockResolvedValue(undefined),
    } as unknown as ToolJetClient;
    const result = await updateAppSettingsTool(client).handler({
      app_id: 'app1', version_id: versionId, hide_header: true,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/partially failed.*hide_header.*did not persist/i);
  });

  it('rejects unsupported top icon navigation before writing', async () => {
    const client = {
      getAppSettings: vi.fn().mockResolvedValue(before),
      updateAppSettings: vi.fn(),
    } as unknown as ToolJetClient;
    const result = await updateAppSettingsTool(client).handler({
      app_id: 'app1', version_id: versionId, navigation_position: 'top', navigation_style: 'icon',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/icon.*not supported.*top/i);
    expect(client.updateAppSettings).not.toHaveBeenCalled();
  });
});
