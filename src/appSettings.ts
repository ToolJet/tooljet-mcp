import type { AppSettingsSnapshot, AppTheme } from './tooljetClient.js';
import { booleanBindingValue } from './bindings.js';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function bindingBoolean(value: unknown): boolean | unknown {
  return booleanBindingValue(value) ?? value;
}

export function compactTheme(theme: AppTheme | Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!theme) return null;
  return {
    ...(typeof theme.id === 'string' ? { id: theme.id } : {}),
    ...(typeof theme.name === 'string' ? { name: theme.name } : {}),
    ...(typeof theme.isDefault === 'boolean' ? { is_default: theme.isDefault } : {}),
    ...(typeof theme.isBasic === 'boolean' ? { is_basic: theme.isBasic } : {}),
    ...(typeof theme.isDisabled === 'boolean' ? { is_disabled: theme.isDisabled } : {}),
  };
}

export function projectAppSettings(snapshot: AppSettingsSnapshot): Record<string, unknown> {
  const global = snapshot.global_settings ?? {};
  const properties = pageSettingProperties(snapshot);
  const disableMenu = asRecord(properties.disableMenu);
  const theme = asRecord(global.theme);
  return {
    app_id: snapshot.app_id,
    version_id: snapshot.version_id,
    canvas: {
      background_color: global.canvasBackgroundColor,
      max_width: {
        value: global.canvasMaxWidth,
        unit: global.canvasMaxWidthType,
      },
      mode: global.appMode,
    },
    theme: compactTheme(theme),
    header: {
      hidden: properties.hideHeader,
      logo_hidden: properties.hideLogo,
      title: properties.name,
    },
    navigation: {
      hidden: bindingBoolean(disableMenu.value ?? properties.disableMenu),
      position: properties.position,
      style: properties.style,
      collapsible: properties.collapsable,
    },
    ...(snapshot.show_viewer_navigation !== undefined
      ? { show_viewer_navigation: snapshot.show_viewer_navigation }
      : {}),
  };
}

export function pageSettingProperties(snapshot: AppSettingsSnapshot): Record<string, unknown> {
  return asRecord(asRecord(snapshot.page_settings).properties);
}
