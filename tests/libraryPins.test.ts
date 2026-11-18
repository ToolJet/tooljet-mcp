import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import { libraryPinErrors } from '../src/appValidation.js';
import { registerLibraryPacks, type LibraryPack } from '../src/libraryPack.js';
import { createClient, type ToolJetClient } from '../src/tooljetClient.js';
import { validateAppTool } from '../src/tools/validateApp.js';
import type { Config } from '../src/config.js';

const library: LibraryPack = {
  pack: 'shadcn',
  prefix: 'Lib_shadcn_',
  kind: 'library',
  libraryId: 'lib-1',
  correlationId: 'aaaa-bbbb',
  libraryName: 'shadcn UI',
  version: '2.1.29',
  components: { Text: { type: 'Lib_shadcn_Text', props: [], events: [] } },
};
const shipped: LibraryPack = { ...library, pack: 'antd', prefix: 'Lib_antd_', kind: 'builtin', correlationId: 'cccc', components: { Button: { type: 'Lib_antd_Button', props: [], events: [] } } };

/** A ToolJet that merges globalSettings one level deep, as the versions endpoint does. */
function fakeServer(globalSettings: Record<string, unknown>, { failSettings = false } = {}) {
  const calls: Array<{ method: string; url: string; body?: any }> = [];
  const authedFetch = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    if (url.endsWith('/components')) return new Response('{}', { status: 200 });
    if (failSettings) return new Response('{}', { status: 500 });
    if (method === 'PUT') Object.assign(globalSettings, body.globalSettings);
    return new Response(JSON.stringify({ editing_version: { id: 'v1', global_settings: globalSettings } }), { status: 200 });
  });
  const client = createClient({ authedFetch } as unknown as Auth, {} as Config);
  const settingsCalls = () => calls.filter((c) => !c.url.endsWith('/components'));
  return { client, calls, settingsCalls, globalSettings };
}

const write = (client: ToolJetClient, type: string, name = 'one') =>
  client.createComponents({ appId: 'a1', versionId: 'v1', pageId: 'p1', components: [{ name, type, properties: {}, layout: { top: 0, left: 0, width: 4, height: 4 } } as never] });

afterEach(() => registerLibraryPacks([]));

describe('writing a library component', () => {
  it('pins its library on a version that lacks the pin, keeping the other settings and pins', async () => {
    registerLibraryPacks([library]);
    const { client, globalSettings } = fakeServer({ theme: 'x', customComponentLibraries: { other: 'v3' } });
    await write(client, 'Lib_shadcn_Text');
    expect(globalSettings).toEqual({ theme: 'x', customComponentLibraries: { other: 'v3', aaaabbbb: '2.1.29' } });
  });

  it('leaves a pin the builder chose, dashed or not', async () => {
    registerLibraryPacks([library]);
    for (const pins of [{ aaaabbbb: 'dev:u1' }, { 'aaaa-bbbb': '1.0.0' }]) {
      const { client, settingsCalls } = fakeServer({ customComponentLibraries: pins });
      await write(client, 'Lib_shadcn_Text');
      expect(settingsCalls().filter((c) => c.method === 'PUT')).toEqual([]);
    }
  });

  it('checks a version once, however many components follow', async () => {
    registerLibraryPacks([library]);
    const { client, settingsCalls } = fakeServer({});
    await Promise.all([write(client, 'Lib_shadcn_Text', 'a'), write(client, 'Lib_shadcn_Text', 'b')]);
    await write(client, 'Lib_shadcn_Text', 'c');
    expect(settingsCalls().map((c) => c.method)).toEqual(['GET', 'PUT']);
  });

  it('makes no settings call for a shipped pack or a native component', async () => {
    registerLibraryPacks([shipped]);
    const { client, settingsCalls } = fakeServer({});
    await write(client, 'Lib_antd_Button');
    await write(client, 'Text', 'plain');
    expect(settingsCalls()).toEqual([]);
  });

  it('still reports the write when the pin cannot be saved, and tries again on the next write', async () => {
    registerLibraryPacks([library]);
    const { client, settingsCalls } = fakeServer({}, { failSettings: true });
    await expect(write(client, 'Lib_shadcn_Text', 'a')).resolves.toHaveLength(1);
    await expect(write(client, 'Lib_shadcn_Text', 'b')).resolves.toHaveLength(1);
    expect(settingsCalls()).toHaveLength(2);
  });
});

const libraryComponent = (name: string, extra: Record<string, unknown> = {}) => ({
  id: name,
  name,
  type: 'LibraryComponent',
  properties: { correlationId: { value: 'aaaa-bbbb' }, libraryName: { value: 'shadcn UI' }, ...extra },
});
const summaryWith = (...components: unknown[]) =>
  ({ app_id: 'a1', version_id: 'v1', pages: [{ id: 'p1', components }], queries: [], events: [] }) as never;

describe('library pins in validate_app', () => {
  it('names the library and its components when the pin is missing', () => {
    const [error] = libraryPinErrors(summaryWith(libraryComponent('a'), libraryComponent('b')), {});
    expect(error).toMatch(/Library "shadcn UI" is not pinned.*2 of its components.*"Slot".*\(a, b\)/);
  });

  it('accepts a pin in either form, a shipped pack, and a code page root', () => {
    expect(libraryPinErrors(summaryWith(libraryComponent('a')), { aaaabbbb: '1' })).toEqual([]);
    expect(libraryPinErrors(summaryWith(libraryComponent('a')), { 'aaaa-bbbb': '1' })).toEqual([]);
    expect(libraryPinErrors(summaryWith({ name: 'p', type: 'PackComponent', properties: { pack: { value: 'antd' } } }), {})).toEqual([]);
    expect(libraryPinErrors(summaryWith(libraryComponent('root', { codePage: { value: '{{true}}' } })), {})).toEqual([]);
  });

  const run = (summary: never, getAppSettings: () => Promise<unknown>) => {
    const client = { getAppSummary: vi.fn().mockResolvedValue(summary), getAppSettings: vi.fn(getAppSettings) };
    return { client, result: validateAppTool(client as unknown as ToolJetClient).handler({ app_id: 'a1' }) };
  };
  const parsed = async (result: unknown) => JSON.parse((await (result as Promise<{ content: Array<{ text: string }> }>)).content[0].text);

  it('fails the app and reports ok false when a pin is missing', async () => {
    const { result } = run(summaryWith(libraryComponent('a')), async () => ({ global_settings: {} }));
    const out = await parsed(result);
    expect(out.ok).toBe(false);
    expect(out.errors.join(' ')).toMatch(/not pinned/);
  });

  it('raises no error on a pinned app, and says so when the settings cannot be read', async () => {
    const pinned = await parsed(run(summaryWith(libraryComponent('a')), async () => ({ global_settings: { customComponentLibraries: { aaaabbbb: '1' } } })).result);
    expect(pinned.errors).toEqual([]);
    expect(pinned.checked).toContain('library pins');
    const unread = await parsed(run(summaryWith(libraryComponent('a')), async () => { throw new Error('nope'); }).result);
    expect(unread.errors).toEqual([]);
    expect(unread.not_checked.join(' ')).toMatch(/library pins/);
  });
});
