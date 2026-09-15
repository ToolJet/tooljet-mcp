import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { collectPageIconNames } from '../scripts/generate-page-icons.mjs';
import { assertPageIcon, pageIconError, pageIconSchema } from '../src/pageIcons.js';
import { appPlanSchema } from '../src/appPlanSchema.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { validateAppStructure } from '../src/lint.js';
import { createClient, type AppSummary, type ToolJetClient } from '../src/tooljetClient.js';
import { addPageTool } from '../src/tools/addPage.js';
import { addPagesTool } from '../src/tools/addPages.js';
import { updatePagesTool } from '../src/tools/updatePages.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import type { Auth } from '../src/auth.js';

const observedMistakes = [
  ['layout-dashboard', 'IconLayoutDashboard'],
  ['chart-line', 'IconChartLine'],
  ['bed', 'IconBed'],
  ['users', 'IconUsers'],
  ['ban', 'IconBan'],
  ['arrows-exchange', 'IconArrowsExchange'],
  ['search', 'IconSearch'],
  ['file-description', 'IconFileDescription'],
  ['list-check', 'IconListCheck'],
  ['file-text', 'IconFileText'],
  ['shield-check', 'IconShieldCheck'],
  ['clock-hour-4', 'IconClockHour4'],
  ['category', 'IconCategory'],
  ['chart-bar', 'IconChartBar'],
];

function emptySummary(): AppSummary {
  return {
    app_id: 'app', version_id: 'v1',
    pages: [{ id: 'home', name: 'Home', handle: 'home', components: [] }],
    queries: [], events: [],
  };
}

// Simulate the deployment that ignores icon on POST and persists it only through PUT.
function fixture(pages: Array<Record<string, any>> = [{ id: 'home', name: 'Home', handle: 'home', index: 1 }]) {
  const authedFetch = vi.fn(async (path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (init?.method === 'POST') pages.push({ id: body.id, name: body.name, handle: body.handle, index: body.index });
    else if (init?.method === 'PUT' && path.endsWith('/reorder')) {
      pages = pages.map((page) => ({ ...page, ...body.diff[page.id] }));
    } else if (init?.method === 'PUT') {
      pages = pages.map((page) => page.id === body.pageId ? { ...page, ...body.diff } : page);
    }
    return new Response(JSON.stringify({ id: 'app', editing_version: { id: 'v1', home_page_id: 'home' }, pages }));
  });
  const auth = { authedFetch, getOrganizationId: vi.fn(), getOrganizationSlug: vi.fn() } as Auth;
  return { client: createClient(auth, { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082' }), authedFetch };
}

describe('page icon catalog', () => {
  it('contains exact exports across the full package, not a small design allowlist', () => {
    const catalog = JSON.parse(readFileSync(new URL('../data/page-icons.json', import.meta.url), 'utf8'));
    expect(catalog.package).toBe('@tabler/icons-react');
    expect(catalog.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(catalog.names.length).toBeGreaterThan(4000);
    expect(new Set(catalog.names).size).toBe(catalog.names.length);
    for (const name of catalog.names) expect(pageIconError(name)).toBeUndefined();
    for (const name of ['Icon2fa', 'IconAB2', 'IconAirTrafficControl', 'IconBrandOpenai', 'IconPhotoPlus']) {
      expect(pageIconSchema.parse(name)).toBe(name);
    }
  });

  it.each(observedMistakes)('rejects %s and suggests the actual export %s', (bad, good) => {
    const result = pageIconSchema.safeParse(bad);
    expect(result.success).toBe(false);
    expect(pageIconError(bad)).toContain(`Use "${good}"`);
    expect(pageIconSchema.parse(good)).toBe(good);
    expect(() => assertPageIcon(bad, 'Page "Reports"')).toThrow(/Page "Reports": Invalid page icon/);
  });

  it.each(['IconDefinitelyNotARealIcon', 'IconUserz', 'iconusers', ' IconUsers ', '{{variables.icon}}', '', ' ', null, undefined, 42])(
    'rejects an unsupported value without inventing an export: %s', (value) => {
      expect(pageIconSchema.safeParse(value).success).toBe(false);
      expect(pageIconError(value)).toBeDefined();
    }
  );

  it('keeps the advertised schema small instead of serializing thousands of names', () => {
    const schema = z.toJSONSchema(pageIconSchema);
    expect(schema.type).toBe('string');
    expect(schema).not.toHaveProperty('enum');
    expect(JSON.stringify(schema).length).toBeLessThan(600);
  });

  it('extracts numeric/acronym names and aliases, excluding helper exports and executable code', () => {
    const source = [
      "export { default as Icon2fa, default as IconTwoFactor } from './icons/Icon2fa.js';",
      "export { default as IconAB2 } from './icons/IconAB2.js';",
      "export { default as createReactComponent } from './createReactComponent.js';",
      "throw new Error('must never execute');",
    ].join('\n');
    expect(collectPageIconNames(source)).toEqual(['Icon2fa', 'IconAB2', 'IconTwoFactor']);
    expect(() => collectPageIconNames('export const helper = 1')).toThrow(/No Tabler icon exports/);
  });
});

describe('page icon entry points', () => {
  it('uses membership validation in single/batch create, update and phase schemas', () => {
    const { client } = fixture();
    expect(addPageTool(client).inputSchema.icon.safeParse('bed').success).toBe(false);
    expect(addPagesTool(client).inputSchema.pages.safeParse([{ name: 'Rooms', icon: 'bed' }]).success).toBe(false);
    expect(updatePagesTool(client).inputSchema.updates.safeParse([{ page_id: 'home', icon: 'users' }]).success).toBe(false);
    expect(appPlanSchema.safeParse({ pages: [{ name: 'Rooms', icon: 'bed' }] }).success).toBe(false);
    expect(updatePagesTool(client).inputSchema.updates.safeParse([{ page_id: 'home', name: 'Overview' }]).success).toBe(true);
    expect(appPlanSchema.parse({ pages: [{ name: 'Rooms', icon: 'IconBed' }] }).pages?.[0].icon).toBe('IconBed');
  });

  it('blocks invalid direct/hybrid tool calls before any deployment request', async () => {
    const { client, authedFetch } = fixture();
    const results = [
      await addPageTool(client).handler({ app_id: 'app', version_id: 'v1', name: 'Rooms', icon: 'bed' }),
      await addPagesTool(client).handler({ app_id: 'app', version_id: 'v1', pages: [
        { name: 'Valid', icon: 'IconUsers' }, { name: 'Invalid', icon: 'IconDefinitelyNotARealIcon' },
      ] }),
      await updatePagesTool(client).handler({ app_id: 'app', version_id: 'v1', updates: [
        { page_id: 'home', name: 'Overview' }, { page_id: 'home', icon: 'chart-line' },
      ], order: ['home'] }),
    ];
    for (const result of results) expect(result.isError).toBe(true);
    expect(authedFetch).not.toHaveBeenCalled();
  });

  it('persists valid distinct icons, permits deliberate reuse and supports explicit repair', async () => {
    const { client, authedFetch } = fixture();
    const pages = await client.createPages({ appId: 'app', versionId: 'v1', pages: [
      { name: 'Rooms', icon: 'IconBed' }, { name: 'Guests', icon: 'IconUsers' }, { name: 'Staff', icon: 'IconUsers' },
    ] });
    expect(pages.map((page) => page.icon)).toEqual(['IconBed', 'IconUsers', 'IconUsers']);
    const updated = await client.updatePages({ appId: 'app', versionId: 'v1', updates: [
      { pageId: pages[0].page_id, icon: 'IconBuilding' },
    ] });
    expect(updated.pages.find((page) => page.page_id === pages[0].page_id)?.icon).toBe('IconBuilding');
    expect(authedFetch.mock.calls.some(([, init]) =>
      init?.method === 'PUT' && String(init.body).includes('"icon":"IconBed"'))).toBe(true);
  });

  it('does not block a rename or reorder solely because an unchanged legacy icon is invalid', async () => {
    const { client, authedFetch } = fixture([{ id: 'home', name: 'Home', handle: 'home', icon: 'users', index: 0 }]);
    await expect(client.updatePages({ appId: 'app', versionId: 'v1', updates: [{ pageId: 'home', name: 'Overview' }], order: ['home'] }))
      .resolves.toMatchObject({ updated_fields: 1 });
    expect(authedFetch.mock.calls.some(([, init]) => String(init?.body).includes('"icon"'))).toBe(false);
  });

  it('repairs a legacy fallback by persisting the exact supported export', async () => {
    const { client } = fixture([{ id: 'home', name: 'Overview', handle: 'home', icon: 'chart-line', index: 0 }]);
    const result = await updatePagesTool(client).handler({
      app_id: 'app', version_id: 'v1', updates: [{ page_id: 'home', icon: 'IconChartLine' }],
    });
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text).pages[0].icon).toBe('IconChartLine');
  });

  it('rejects invalid plans and never returns a usable plan token', async () => {
    const pages = [{ name: 'Rooms', icon: 'bed' }];
    const lint = lintPlannedApp({ pages });
    expect(lint.errors.join(' ')).toContain('Use "IconBed"');
    const result = await lintAppSpecTool({} as ToolJetClient).handler({ pages });
    const body = JSON.parse(result.content[0].text);
    expect(body.ok).toBe(false);
    expect(body.plan_token).toBeUndefined();
    expect(pages[0].icon).toBe('bed');
  });

  it('reports persisted invalid icons, including Home, without blocking unrelated repairs', () => {
    const summary = emptySummary();
    summary.pages[0].icon = 'layout-dashboard';
    summary.pages.push({ id: 'rooms', name: 'Rooms', icon: 'bed', components: [] });
    const result = validateAppStructure(summary);
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).toContain('Use "IconLayoutDashboard"');
    expect(result.warnings.join(' ')).toContain('Use "IconBed"');
    expect(lintPlannedApp({ pages: [{ name: 'Guests', icon: 'IconUsers' }] }, summary).errors).toEqual([]);
    expect(validateAppStructure(emptySummary()).warnings.join(' ')).not.toContain('Invalid page icon');
  });
});
