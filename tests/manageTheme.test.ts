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
