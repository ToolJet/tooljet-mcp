import { expect, it, vi } from 'vitest';
import { createClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';
import type { Auth } from '../src/auth.js';

const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', pat: 'fixture-pat' };
function makeAuth(): Auth & { authedFetch: ReturnType<typeof vi.fn> } {
  return {
    authedFetch: vi.fn(async (_path: string, init?: RequestInit) => new Response(JSON.stringify(
      !init?.method || init.method === 'GET' ? { id: 'app1', editing_version: { id: 'v1' }, pages: [{ id: 'p1', components: {} }] } : {}
    ), { status: 200, headers: { 'Content-Type': 'application/json' } })),
    getOrganizationId: vi.fn().mockResolvedValue('org1'),
    getOrganizationSlug: vi.fn().mockResolvedValue('ws'),
  };
}
const posted = (auth: { authedFetch: ReturnType<typeof vi.fn> }) => auth.authedFetch.mock.calls
  .filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST')
  .map(([, init]) => JSON.parse(String((init as RequestInit).body)))[0].diff;

it('stores a pack component with its full default definition, as a drag and drop does, the caller winning', async () => {
  const auth = makeAuth();
  await createClient(auth, config).createComponents({
    appId: 'app1', versionId: 'v1', pageId: 'p1',
    components: [{ name: 'tabs', type: 'ShadTabs', properties: { variant: { value: 'underline' } }, styles: { borderRadius: { value: '{{4}}' } }, layout: { top: 0, left: 2, width: 20, height: 300 } }],
  });
  const dto = Object.values(posted(auth))[0] as { properties: Record<string, { value: unknown }>; styles: Record<string, { value: unknown }> };
  expect(dto.properties.variant.value).toBe('underline');
  expect(dto.properties.visibility.value).toBe('{{true}}');
  expect(dto.properties.showStepNav.value).toBe('{{true}}');
  expect(Array.isArray(dto.properties.tabItems.value)).toBe(true);
  expect(dto.styles.borderRadius.value).toBe('{{4}}');
  expect(dto.styles.showBorder.value).toBe(true);
});

it('leaves a native component to the server defaults', async () => {
  const auth = makeAuth();
  await createClient(auth, config).createComponents({
    appId: 'app1', versionId: 'v1', pageId: 'p1',
    components: [{ name: 'label', type: 'Text', properties: { text: { value: 'Hi' } }, layout: { top: 0, left: 2, width: 10, height: 30 } }],
  });
  const dto = Object.values(posted(auth))[0] as { properties: Record<string, unknown> };
  expect(Object.keys(dto.properties)).toEqual(['text']);
});

it('skips sample content defaults beside the caller\'s own data', async () => {
  const auth = makeAuth();
  await createClient(auth, config).createComponents({
    appId: 'app1', versionId: 'v1', pageId: 'p1',
    components: [{ name: 't', type: 'ShadTable', properties: { data: { value: '{{[{ sku: 1 }]}}' } }, layout: { top: 0, left: 2, width: 20, height: 300 } }],
  });
  const dto = Object.values(posted(auth))[0] as { properties: Record<string, { value: unknown }> };
  expect(dto.properties.columns).toBeUndefined();
  expect(dto.properties.enablePagination.value).toBe('{{true}}');
});
