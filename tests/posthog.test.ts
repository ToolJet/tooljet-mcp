import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsIdentity, PostHogAnalytics, postHogFromEnv } from '../src/posthog.js';
import type { ToolTelemetryMetrics } from '../src/telemetry.js';

const identity = analyticsIdentity('https://issuer.example', 'orchard-grant', 'orchard-workspace');
const metrics: ToolTelemetryMetrics = {
  tool: 'orchard_status', duration_ms: 12, http_requests: 2,
  upstream_response_bytes: 42, result_bytes: 80, warnings: 1, error: false,
};
const clients: PostHogAnalytics[] = [];
function client(fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))) {
  const analytics = new PostHogAnalytics('synthetic-project-token', 'https://collector.example', 'test', fetchImpl);
  clients.push(analytics);
  return { analytics, fetchImpl };
}
function payload(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>, call = 0) {
  return JSON.parse(fetchImpl.mock.calls[call][1]!.body as string);
}
beforeEach(() => {
  vi.stubEnv('POSTHOG_PROJECT_TOKEN', '');
  vi.stubEnv('POSTHOG_HOST', '');
  vi.stubEnv('POSTHOG_ENVIRONMENT', '');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
  await Promise.all(clients.splice(0).map((analytics) => analytics.shutdown()));
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('hosted MCP PostHog analytics', () => {
  it('stays disabled without a project token and refuses invalid ingestion hosts', () => {
    const request = vi.spyOn(globalThis, 'fetch');
    vi.stubEnv('POSTHOG_HOST', 'https://collector.example');
    expect(postHogFromEnv()).toBeUndefined();
    expect(console.error).not.toHaveBeenCalled();
    vi.stubEnv('POSTHOG_PROJECT_TOKEN', 'synthetic-project-token');
    for (const host of ['', 'invalid', 'http://collector.example', 'https://user:pass@collector.example',
      'https://collector.example?token=private', 'https://collector.example#private']) {
      vi.stubEnv('POSTHOG_HOST', host);
      expect(postHogFromEnv()).toBeUndefined();
    }
    expect(request).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/private|synthetic-project-token/);
  });

  it('accepts HTTPS ingestion or a loopback collector and normalizes the trailing slash', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubEnv('POSTHOG_PROJECT_TOKEN', ' synthetic-project-token ');
    for (const host of ['https://collector.example/', 'http://127.0.0.1:1234/']) {
      vi.stubEnv('POSTHOG_HOST', host);
      const analytics = postHogFromEnv()!;
      clients.push(analytics);
      analytics.initialized(identity, 'Example client');
      await analytics.shutdown();
      expect(request).toHaveBeenLastCalledWith(`${host}batch/`, expect.anything());
      const body = JSON.parse(request.mock.lastCall![1]!.body as string);
      expect(body.api_key).toBe('synthetic-project-token');
      expect(body.batch[0].properties.environment).toBe('unspecified');
    }
  });

  it('uses stable connection/workspace hashes, separating grants and installations', () => {
    expect(analyticsIdentity('https://issuer.example', 'orchard-grant', 'orchard-workspace')).toEqual(identity);
    expect(analyticsIdentity('https://issuer.example', 'another-grant', 'orchard-workspace')).toEqual({
      connectionId: expect.not.stringMatching(identity.connectionId), workspaceId: identity.workspaceId,
    });
    const anotherIssuer = analyticsIdentity('https://another.example', 'orchard-grant', 'orchard-workspace');
    expect(anotherIssuer.connectionId).not.toBe(identity.connectionId);
    expect(anotherIssuer.workspaceId).not.toBe(identity.workspaceId);
    expect(JSON.stringify(identity)).not.toMatch(/orchard|issuer/);
  });

  it('sends only allowed metadata, never caller names, tool contents, or raw identity', async () => {
    const { analytics, fetchImpl } = client();
    analytics.initialized(identity, 'Private Orchard assistant owner@example.test');
    analytics.toolCompleted(identity, { ...metrics, inputs: 'private input', output: 'private output' } as ToolTelemetryMetrics);
    await analytics.flush();
    expect(fetchImpl).toHaveBeenCalledWith('https://collector.example/batch/', expect.objectContaining({
      method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' },
    }));
    const body = payload(fetchImpl);
    expect(body.api_key).toBe('synthetic-project-token');
    expect(body.batch).toHaveLength(2);
    expect(body.batch[0]).toMatchObject({
      event: 'mcp_client_initialized', distinct_id: identity.connectionId,
      uuid: expect.any(String), timestamp: expect.any(String),
      properties: { client_family: 'other', workspace_id: identity.workspaceId, environment: 'test',
        transport: 'oauth_http', $process_person_profile: false, $geoip_disable: true },
    });
    expect(body.batch[1].properties).toEqual({
      tool_name: metrics.tool, duration_ms: 12, http_requests: 2, upstream_response_bytes: 42,
      result_bytes: 80, warnings: 1, error: false, workspace_id: identity.workspaceId,
      environment: 'test', transport: 'oauth_http', mcp_version: expect.any(String),
      $process_person_profile: false, $geoip_disable: true,
    });
    expect(JSON.stringify(body.batch)).not.toMatch(/Private Orchard|owner@|private input|private output|orchard-grant|orchard-workspace/);
  });

  it('buckets known client names without passing arbitrary metadata through', async () => {
    const { analytics, fetchImpl } = client();
    for (const name of ['Claude Code', 'OpenAI Codex', 'Cursor', 'Grok Build', 'Windsurf', 'Visual Studio Code', 'Unknown']) {
      analytics.initialized(identity, name);
    }
    await analytics.flush();
    expect(payload(fetchImpl).batch.map((event: any) => event.properties.client_family)).toEqual([
      'claude', 'codex', 'cursor', 'grok', 'windsurf', 'vscode', 'other',
    ]);
  });

  it('flushes low-volume traffic on the timer', async () => {
    vi.useFakeTimers();
    const { analytics, fetchImpl } = client();
    analytics.toolCompleted(identity, metrics);
    expect(fetchImpl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('drains full batches after a burst and waits only for the final partial batch', async () => {
    vi.useFakeTimers();
    const { analytics, fetchImpl } = client();
    for (let n = 0; n < 65; n++) analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.flatMap((call) => JSON.parse(call[1]!.body as string).batch)).toHaveLength(60);
    await vi.advanceTimersByTimeAsync(4999);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(payload(fetchImpl, 3).batch).toHaveLength(5);
  });

  it('pauses burst draining after a collector failure instead of retrying in a tight loop', async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    const { analytics } = client(request);
    for (let n = 0; n < 60; n++) analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(4999);
    expect(request).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(4);
    expect(payload(request, 3).batch.map((event: any) => event.uuid))
      .toEqual(payload(request).batch.map((event: any) => event.uuid));
  });

  it.each([429, 503, 'network'] as const)('retries %s failures at most three times with the same event UUID', async (failure) => {
    vi.useFakeTimers();
    const request = failure === 'network'
      ? vi.fn<typeof fetch>().mockRejectedValue(new Error('sensitive response body'))
      : vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: failure }));
    const { analytics } = client(request);
    analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(10000);
    await vi.advanceTimersByTimeAsync(30000);
    expect(request).toHaveBeenCalledTimes(3);
    expect(payload(request, 2).batch[0].uuid).toBe(payload(request).batch[0].uuid);
    expect(console.error).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('sensitive');
  });

  it.each(['12', 'Thu, 01 Jan 1970 00:00:12 GMT'])('honors Retry-After %s despite continuous captures', async (retryAfter) => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const request = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(null, { status: 429, headers: { 'retry-after': retryAfter } }));
    const { analytics } = client(request);
    for (let n = 0; n < 20; n++) analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    for (let second = 0; second < 11; second++) {
      await vi.advanceTimersByTimeAsync(1000);
      for (let n = 0; n < 20; n++) analytics.toolCompleted(identity, metrics);
      await analytics.flush();
      expect(request).toHaveBeenCalledOnce();
    }
    await vi.advanceTimersByTimeAsync(1000);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially during continuous 503 responses', async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 503 }));
    const { analytics } = client(request);
    for (let n = 0; n < 20; n++) analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    for (let second = 1; second <= 15; second++) {
      await vi.advanceTimersByTimeAsync(1000);
      analytics.toolCompleted(identity, metrics);
      await analytics.flush();
      expect(request).toHaveBeenCalledTimes(second < 5 ? 1 : second < 15 ? 2 : 3);
    }
  });

  it('rate-limits safe warning categories and reports recurring failures again', async () => {
    vi.useFakeTimers();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 401 }));
    const { analytics } = client(request);
    for (let n = 0; n < 2; n++) {
      analytics.toolCompleted(identity, metrics);
      await analytics.flush();
    }
    expect(console.error).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenLastCalledWith(expect.stringContaining('HTTP 401'));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    expect(console.error).toHaveBeenCalledTimes(2);
  });

  it('does not retry rejected project tokens', async () => {
    const { analytics, fetchImpl } = client(vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 })));
    analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    await analytics.flush();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('queues without waiting, bounds memory while a collector is stalled, and drains on shutdown', async () => {
    let release!: (response: Response) => void;
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    request.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const { analytics } = client(request);
    for (let n = 0; n < 1200; n++) analytics.toolCompleted(identity, metrics);
    expect(request).toHaveBeenCalledOnce();
    expect(payload(request).batch).toHaveLength(20);
    release(new Response(null, { status: 200 }));
    await analytics.shutdown();
    const events = request.mock.calls.flatMap((call) => JSON.parse(call[1]!.body as string).batch);
    expect(events).toHaveLength(1020); // At most 1,000 queued plus the 20 already in flight.
    analytics.toolCompleted(identity, metrics);
    await analytics.flush();
    expect(request).toHaveBeenCalledTimes(51);
  });

  it('times out a stalled collector without exposing a rejection to callers', async () => {
    const request = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new Error('collector timed out')), { once: true });
    }));
    const { analytics } = client(request);
    analytics.toolCompleted(identity, metrics);
    const started = Date.now();
    await expect(analytics.shutdown()).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(6000);
    expect(request).toHaveBeenCalledOnce(); // Remaining backoff does not fit in the shutdown budget.
  }, 7000);
});
