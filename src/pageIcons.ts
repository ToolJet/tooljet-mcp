import { readFileSync } from 'node:fs';
import { z } from 'zod';

interface PageIconCatalog {
  package: string;
  version: string;
  names: string[];
}

let cached: { catalog: PageIconCatalog; names: Set<string>; aliases: Map<string, string[]> } | undefined;
const normalizedName = (value: string): string =>
  value.trim().replace(/^icon/i, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

function icons() {
  if (cached) return cached;
  const catalog = JSON.parse(readFileSync(new URL('../data/page-icons.json', import.meta.url), 'utf8')) as PageIconCatalog;
  if (catalog.package !== '@tabler/icons-react' || !catalog.version || !Array.isArray(catalog.names) ||
      !catalog.names.length || !catalog.names.every((name) => typeof name === 'string' && /^Icon[A-Za-z0-9]+$/.test(name))) {
    throw new Error('Invalid page icon catalog; regenerate data/page-icons.json from ToolJet frontend dependencies.');
  }
  const aliases = new Map<string, string[]>();
  for (const name of catalog.names) {
    const key = normalizedName(name);
    aliases.set(key, [...(aliases.get(key) ?? []), name]);
  }
  return cached = { catalog, names: new Set(catalog.names), aliases };
}

/** No normalization on write: only suggest exact known exports, never silently pick a different icon. */
export function pageIconError(value: unknown): string | undefined {
  const { catalog, names, aliases } = icons();
  if (typeof value === 'string' && names.has(value)) return undefined;
  const suggestions = typeof value === 'string' && value.length <= 128
    ? aliases.get(normalizedName(value))?.slice(0, 3)
    : undefined;
  const correction = suggestions?.length
    ? ` Use ${suggestions.map((name) => JSON.stringify(name)).join(' or ')}.`
    : ' Use an exact exported Tabler name such as "IconLayoutDashboard", "IconUsers" or "IconChartBar".';
  const label = typeof value === 'string' ? JSON.stringify(value.slice(0, 128)) : String(value);
  return `Invalid page icon ${label}: not in the ToolJet @tabler/icons-react@${catalog.version} catalog.` +
    correction + ' Invalid names render a generic fallback icon; names are case-sensitive, not kebab-case.' +
    ' If the deployment uses newer icons, refresh the catalog from its frontend dependencies.';
}

export function assertPageIcon(value: unknown, context: string): void {
  const error = pageIconError(value);
  if (error) throw new Error(`${context}: ${error}`);
}

// Keep the MCP/JSON Schema compact. A multi-thousand-name enum would inflate every tool prompt.
// Runtime refinements and the client guard enforce membership even if a harness drops refinements.
export const pageIconSchema = z.string().min(1).superRefine((value, ctx) => {
  const error = pageIconError(value);
  if (error) ctx.addIssue({ code: 'custom', message: error });
}).describe('Exact case-sensitive Tabler React export, e.g. IconLayoutDashboard, IconUsers, IconChartLine. Not layout-dashboard/users/chart-line.');
