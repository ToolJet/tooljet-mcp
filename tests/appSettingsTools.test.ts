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
  it('inspects library configuration only on request without loading code or exposing scripts', async () => {
    const snapshot = { ...before, global_settings: { ...before.global_settings,
      libraries: { javascript: [
        { name: 'Tesseract', enabled: true, url: 'https://cdn.example/tesseract@5.1.1/dist/tesseract.min.js' },
        { name: 'pdfjsLib', enabled: false, url: 'https://user:secret@cdn.example/pdf.js?token=private#secret' },
      ] }, preloadedScript: { javascript: 'return { privateValue: "do-not-expose" };' } } };
    const client = { getAppSettings: vi.fn().mockResolvedValue(snapshot) } as unknown as ToolJetClient;
    const tool = getAppSettingsTool(client);
    expect(textOf(await tool.handler({ app_id: 'app1', version_id: versionId }))).not.toHaveProperty('javascript_runtime');
    const result = textOf(await tool.handler({ app_id: 'app1', version_id: versionId, include_libraries: true }));
    expect(result.javascript_runtime).toMatchObject({ configuration_state: 'configured', total: 2,
      truncated: false, preloaded_script_present: true, runtime_verified: false,
      libraries: [
        { name: 'Tesseract', enabled: true, source_url: 'https://cdn.example/tesseract@5.1.1/dist/tesseract.min.js', url_redacted: false },
        { name: 'pdfjsLib', enabled: false, source_url: 'https://cdn.example/pdf.js', url_redacted: true },
      ] });
    expect(result.javascript_runtime.guidance).toMatch(/lexical.*not.*globalThis/);
    expect(result.javascript_runtime.guidance).toMatch(/does not configure/);
    expect(JSON.stringify(result)).not.toMatch(/do-not-expose|token=private|user:secret/);
    expect(client.getAppSettings).toHaveBeenLastCalledWith('app1', versionId);
  });

  it('keeps missing and malformed library configuration distinct from runtime readiness', async () => {
    for (const [value, expected] of [[undefined, 'not_configured'], [[], 'not_configured'], [{}, 'unknown']]) {
      const client = { getAppSettings: vi.fn().mockResolvedValue({ ...before,
        global_settings: { libraries: { javascript: value } } }) } as unknown as ToolJetClient;
      const result = textOf(await getAppSettingsTool(client).handler({ app_id: 'app1', version_id: versionId, include_libraries: true }));
      expect(result.javascript_runtime.configuration_state).toBe(expected);
      expect(result.javascript_runtime.runtime_verified).toBe(false);
    }
  });

  it('bounds library inspection and does not copy unrecognized or malformed fields', async () => {
    const client = { getAppSettings: vi.fn().mockResolvedValue({ ...before, global_settings: {
      libraries: { javascript: Array.from({ length: 50 }, () => ({ name: 'lib', enabled: true, url: 'not-a-url', secret: 'hidden' })) },
    } }) } as unknown as ToolJetClient;
    const result = textOf(await getAppSettingsTool(client).handler({ app_id: 'app1', version_id: versionId, include_libraries: true }));
    expect(result.javascript_runtime).toMatchObject({ total: 50, truncated: true });
    expect(result.javascript_runtime.libraries).toHaveLength(32);
    expect(result.javascript_runtime.libraries[0]).toMatchObject({ source_url: null, url_valid: false });
    expect(JSON.stringify(result.javascript_runtime)).not.toMatch(/not-a-url|hidden/);
  });

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
    expect(result.content[0]!.text).not.toContain('show_viewer_navigation');
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
