import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLJET_MCP_VERSION } from './runtimeFreshness.js';

const iconPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/icon.png');

/** Clients render icons themselves, often on another machine, so the file is sent as a data URI. */
function loadIcons() {
  try {
    return [{ src: `data:image/png;base64,${readFileSync(iconPath).toString('base64')}`, mimeType: 'image/png', sizes: ['512x512'] }];
  } catch {
    return undefined; // no icon file: introduce ourselves without one
  }
}

const icons = loadIcons();

/** serverInfo for every server this package starts: name, brand icon, and website. */
export const SERVER_INFO = {
  name: 'tooljet-mcp',
  title: 'ToolJet',
  version: TOOLJET_MCP_VERSION,
  websiteUrl: 'https://tooljet.com',
  ...(icons ? { icons } : {}),
};
