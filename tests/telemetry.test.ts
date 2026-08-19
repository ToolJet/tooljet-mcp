import { describe, expect, it } from 'vitest';
import { recordHttpResponse, withToolTelemetry } from '../src/telemetry.js';
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
});
