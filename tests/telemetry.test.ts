import { describe, expect, it, vi } from 'vitest';
import { observeToolTelemetry, recordHttpResponse, withToolTelemetry } from '../src/telemetry.js';
import { fail, ok } from '../src/tools/types.js';

describe('tool telemetry', () => {
  it('returns timing, HTTP, payload, warning, and error metadata without changing content', async () => {
    const result = await withToolTelemetry('demo_tool', async () => {
      recordHttpResponse(new Response('abc', { headers: { 'content-length': '3' } }));
      return ok({ value: 1, warnings: ['check me'] });
    });

    expect(JSON.parse(result.content[0]!.text)).toEqual({ value: 1, warnings: ['check me'] });
    expect(result._meta?.tooljet_metrics).toMatchObject({
      tool: 'demo_tool',
      http_requests: 1,
      upstream_response_bytes: 3,
      warnings: 1,
      error: false,
    });
    expect((result._meta?.tooljet_metrics as { duration_ms: number }).duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('marks failed tool results', async () => {
    const result = await withToolTelemetry('broken_tool', async () => fail(new Error('broken')));
    expect(result.isError).toBe(true);
    expect(result._meta?.tooljet_metrics).toMatchObject({ tool: 'broken_tool', error: true });
  });

  it('keeps metrics observers isolated between concurrent authenticated requests', async () => {
    const first = vi.fn();
    const second = vi.fn();
    await Promise.all([
      observeToolTelemetry(first, () => withToolTelemetry('first_tool', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        recordHttpResponse(new Response(null, { headers: { 'content-length': '9' } }));
        return ok({ value: 'first output' });
      })),
      observeToolTelemetry(second, () => withToolTelemetry('second_tool', async () => fail(new Error('second error')))),
    ]);
    expect(first).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ tool: 'first_tool', http_requests: 1, error: false }));
    expect(second).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ tool: 'second_tool', http_requests: 0, error: true }));
    await withToolTelemetry('unobserved_tool', async () => ok({ value: 'unobserved' }));
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('reports thrown failures while preserving the original exception and excluding its message', async () => {
    const observer = vi.fn();
    const failure = new Error('synthetic private backend message');
    await expect(observeToolTelemetry(observer, () => withToolTelemetry('throwing_tool', async () => {
      throw failure;
    }))).rejects.toBe(failure);
    expect(observer).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      tool: 'throwing_tool', error: true, result_bytes: 0,
    }));
    expect(JSON.stringify(observer.mock.calls)).not.toContain(failure.message);
  });

  it('does not let analytics observer failures break a successful tool', async () => {
    const result = await observeToolTelemetry(() => { throw new Error('collector failed'); },
      () => withToolTelemetry('working_tool', async () => ok({ saved: true })));
    expect(JSON.parse(result.content[0]!.text)).toEqual({ saved: true });
    expect(result.isError).not.toBe(true);
  });
});
