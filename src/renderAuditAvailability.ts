import { accessSync, constants } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/** Probe configured runtime dependencies without launching a browser for each MCP request. */
export function renderAuditAvailable(): boolean {
  if (process.env.MCP_RENDER_AUDIT_ENABLED === 'false') return false;
  try {
    const require = createRequire(import.meta.url);
    try {
      require.resolve(process.env.MCP_RENDER_AUDIT_PLAYWRIGHT || 'playwright-core');
    } catch {
      require.resolve('playwright-core'); // Match loadPlaywright's optional-path fallback.
    }
    const channel = process.env.MCP_RENDER_AUDIT_CHANNEL || 'chrome';
    if (!process.env.MCP_RENDER_AUDIT_CHROME && channel !== 'chrome') return true;
    const candidates = process.env.MCP_RENDER_AUDIT_CHROME ? [process.env.MCP_RENDER_AUDIT_CHROME] :
      channel === 'chrome' ? (process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : process.platform === 'win32'
          ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
            .filter((path): path is string => !!path).map(path => join(path, 'Google/Chrome/Application/chrome.exe'))
          : ['/opt/google/chrome/chrome', '/usr/bin/google-chrome']) : [];
    return candidates.some(path => { try { accessSync(path, constants.X_OK); return true; } catch { return false; } });
  } catch { return false; }
}
