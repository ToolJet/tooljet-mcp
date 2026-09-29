import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearKindSpecCache, loadKindSpec, singleSpecRef } from '../src/specEndpointKinds.js';
import { createClient } from '../src/tooljetClient.js';
import type { Auth } from '../src/auth.js';

// One shared MCP process serves many ToolJet servers. A bundled plugin spec is read through the calling server, so a
// cached copy is only valid for that server: client B must never get client A's spec because A asked first.
const spec = (path: string) => JSON.stringify({ openapi: '3.0.0', paths: { [path]: { get: { summary: path } } } });

function server(scope: string | undefined, path: string, impl?: () => Promise<string>) {
  const getPluginSpec = vi.fn(impl ?? (async () => spec(path)));
  return { getPluginSpec, ...(scope === undefined ? {} : { specCacheScope: vi.fn(async () => scope) }) };
}

const bundled = singleSpecRef('gmail')!;

afterEach(() => { vi.unstubAllGlobals(); clearKindSpecCache(); });

describe('bundled plugin-spec cache is scoped to the ToolJet server', () => {
  it('uses a bundled reference for the fixture kind', () => {
    expect(bundled.location).toBe('bundled');
  });

  it('two servers returning different specs each get their own', async () => {
    const a = server('https://a.example.test#org-a', '/instance-a-only');
    const b = server('https://b.example.test#org-b', '/instance-b-only');
    expect(Object.keys((await loadKindSpec(a, 'gmail', bundled)).paths)).toEqual(['/instance-a-only']);
    expect(Object.keys((await loadKindSpec(b, 'gmail', bundled)).paths)).toEqual(['/instance-b-only']);
    expect(Object.keys((await loadKindSpec(a, 'gmail', bundled)).paths)).toEqual(['/instance-a-only']);
    expect(a.getPluginSpec).toHaveBeenCalledTimes(1);
    expect(b.getPluginSpec).toHaveBeenCalledTimes(1);
  });

  it('a new client for the same server reuses the cached spec', async () => {
    const first = server('https://a.example.test#org-a', '/a');
    const second = server('https://a.example.test#org-a', '/a');
    await loadKindSpec(first, 'gmail', bundled);
    await loadKindSpec(second, 'gmail', bundled);
    expect(first.getPluginSpec).toHaveBeenCalledTimes(1);
    expect(second.getPluginSpec).not.toHaveBeenCalled();
  });

  it('a client that cannot name its server is never served from, or stored in, the cache', async () => {
    const known = server('https://a.example.test#org-a', '/a');
    const anonymous = server(undefined, '/anonymous');
    await loadKindSpec(known, 'gmail', bundled);
    expect(Object.keys((await loadKindSpec(anonymous, 'gmail', bundled)).paths)).toEqual(['/anonymous']);
    await loadKindSpec(anonymous, 'gmail', bundled);
    expect(anonymous.getPluginSpec).toHaveBeenCalledTimes(2);
  });

  it('a failed load is not cached', async () => {
    let calls = 0;
    const flaky = server('https://a.example.test#org-a', '/a', async () => {
      calls += 1;
      if (calls === 1) throw new Error('503');
      if (calls === 2) return '<html>not a spec</html>';
      return spec('/recovered');
    });
    await expect(loadKindSpec(flaky, 'gmail', bundled)).rejects.toThrow(/could not be read \(ToolJet|503/);
    await expect(loadKindSpec(flaky, 'gmail', bundled)).rejects.toThrow(/not an OpenAPI document/);
    expect(Object.keys((await loadKindSpec(flaky, 'gmail', bundled)).paths)).toEqual(['/recovered']);
    expect(flaky.getPluginSpec).toHaveBeenCalledTimes(3);
  });

  it('concurrent loads share one read per server and never cross servers', async () => {
    const a = server('https://a.example.test#org-a', '/a');
    const b = server('https://b.example.test#org-b', '/b');
    const results = await Promise.all([a, b, a, b, a].map((c) => loadKindSpec(c, 'gmail', bundled)));
    expect(results.map((r) => Object.keys(r.paths)[0])).toEqual(['/a', '/b', '/a', '/b', '/a']);
    expect(a.getPluginSpec).toHaveBeenCalledTimes(1);
    expect(b.getPluginSpec).toHaveBeenCalledTimes(1);
  });

  it('a concurrent failed load is shared by its waiters and then dropped', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const failing = server('https://a.example.test#org-a', '/a', async () => { await gate; throw new Error('boom'); });
    const both = Promise.allSettled([loadKindSpec(failing, 'gmail', bundled), loadKindSpec(failing, 'gmail', bundled)]);
    release();
    expect((await both).map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(failing.getPluginSpec).toHaveBeenCalledTimes(1);
    const healthy = server('https://a.example.test#org-a', '/a');
    expect(Object.keys((await loadKindSpec(healthy, 'gmail', bundled)).paths)).toEqual(['/a']);
  });

  it('a public remote spec is cached once for every server', async () => {
    const remote = singleSpecRef('stripe')!;
    expect(remote.location).toBe('remote');
    const fetchSpy = vi.fn().mockImplementation(async () => new Response(spec('/v1/charges'), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);
    await loadKindSpec(server('https://a.example.test#org-a', '/a'), 'stripe', remote);
    await loadKindSpec(server('https://b.example.test#org-b', '/b'), 'stripe', remote);
    await loadKindSpec(server(undefined, '/c'), 'stripe', remote);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('the ToolJet client names its server for the spec cache', () => {
  const auth = (org: string): Auth => ({
    authedFetch: vi.fn(),
    getOrganizationId: vi.fn().mockResolvedValue(org),
    getOrganizationSlug: vi.fn().mockResolvedValue('slug'),
  }) as unknown as Auth;
  const config = (apiUrl: string) => ({ apiUrl, appUrl: apiUrl });

  it('by API URL and workspace', async () => {
    const one = await createClient(auth('org-1'), config('https://a.example.test')).specCacheScope!();
    const sameServer = await createClient(auth('org-1'), config('https://a.example.test/')).specCacheScope!();
    const otherServer = await createClient(auth('org-1'), config('https://b.example.test')).specCacheScope!();
    const otherWorkspace = await createClient(auth('org-2'), config('https://a.example.test')).specCacheScope!();
    expect(sameServer).toBe(one);
    expect(otherServer).not.toBe(one);
    expect(otherWorkspace).not.toBe(one);
  });

  it('not at all when the workspace cannot be read, so nothing is cached', async () => {
    const failing = { ...auth('x'), getOrganizationId: vi.fn().mockRejectedValue(new Error('no session')) } as unknown as Auth;
    const scope = await createClient(failing, config('https://a.example.test')).specCacheScope!();
    expect(scope).toBeUndefined();
  });
});
