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
  };
}

export function pageSettingProperties(snapshot: AppSettingsSnapshot): Record<string, unknown> {
  return asRecord(asRecord(snapshot.page_settings).properties);
}

/** Inspect saved configuration only. Never fetch libraries or evaluate preload code here. */
export function projectJavascriptRuntime(snapshot: AppSettingsSnapshot): Record<string, unknown> {
  const global = snapshot.global_settings ?? {};
  const raw = asRecord(global.libraries).javascript;
  const entries = Array.isArray(raw) ? raw : [];
  const script = asRecord(global.preloadedScript).javascript;
  return {
    configuration_state: raw === undefined || (Array.isArray(raw) && !raw.length)
      ? 'not_configured' : Array.isArray(raw) ? 'configured' : 'unknown',
    total: Array.isArray(raw) ? raw.length : raw === undefined ? 0 : null,
    truncated: entries.length > 32,
    libraries: entries.slice(0, 32).map((value) => {
      const lib = asRecord(value);
      let sourceUrl: string | null = null;
      let redacted = false;
      let https = false;
      try {
        if (typeof lib.url === 'string' && lib.url.length <= 4096) {
          const url = new URL(lib.url);
          if (url.protocol === 'https:' || url.protocol === 'http:') {
            https = url.protocol === 'https:';
            redacted = Boolean(url.username || url.password || url.search || url.hash);
            url.username = ''; url.password = ''; url.search = ''; url.hash = '';
            sourceUrl = url.toString();
          }
        }
      } catch { /* Malformed configuration is evidence, not an inspection failure. */ }
      return {
        name: typeof lib.name === 'string' ? lib.name.slice(0, 128) : null,
        enabled: typeof lib.enabled === 'boolean' ? lib.enabled : null,
        source_url: sourceUrl,
        url_valid: sourceUrl !== null,
        url_redacted: redacted,
        https,
      };
    }),
    preloaded_script_present: typeof script === 'string' ? Boolean(script.trim()) : null,
    runtime_verified: false,
    guidance: 'Configuration is not proof of successful loading, export names, worker/CSP compatibility, or deployment support. ' +
      'In ToolJet versions with the native library loader, enabled HTTPS UMD/IIFE library exports are passed to RunJS as lexical parameters by their configured names, not guaranteed globalThis properties. ' +
      'Do not redeclare those parameter names with const/let. Preloaded script exports may add or override names; their code is intentionally omitted here. ' +
      'This MCP does not configure JavaScript libraries through update_app_settings. If required dependencies are missing, report the prerequisite and request supported setup instead of inventing globals or claiming OCR works. ' +
      'PDF.js rasterization, Tesseract worker initialization and actual image/PDF extraction still need runtime testing. Source URLs omit credentials, query strings and fragments; do not reuse redacted URLs as configuration.',
  };
}
