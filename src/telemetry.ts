import { AsyncLocalStorage } from 'node:async_hooks';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ToolResult } from './tools/types.js';

export interface ToolTelemetryMetrics {
  tool: string;
  duration_ms: number;
  http_requests: number;
  upstream_response_bytes: number;
  result_bytes: number;
  warnings: number;
  error: boolean;
}

interface ToolTelemetryContext {
  httpRequests: number;
  upstreamResponseBytes: number;
}

const storage = new AsyncLocalStorage<ToolTelemetryContext>();
const observers = new AsyncLocalStorage<(metrics: ToolTelemetryMetrics) => void>();

/** Install an observer only for this authenticated request and its asynchronous tool calls. */
export function observeToolTelemetry<T>(observer: (metrics: ToolTelemetryMetrics) => void, handler: () => T): T {
  return observers.run(observer, handler);
}

/** Attribute a ToolJet HTTP response to the currently running MCP tool without consuming its body. */
export function recordHttpResponse(response: Response): void {
  const context = storage.getStore();
  if (!context) return;
  context.httpRequests += 1;
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 0) {
    context.upstreamResponseBytes += contentLength;
  }
}

function countWarnings(result: ToolResult): number {
  try {
    const value = JSON.parse(result.content.map((item) => item.text).join('')) as { warnings?: unknown };
    return Array.isArray(value.warnings) ? value.warnings.length : 0;
  } catch {
    return 0;
  }
}

async function optionallyLog(metrics: ToolTelemetryMetrics): Promise<void> {
  const path = process.env.TOOLJET_TELEMETRY_PATH;
  if (!path) return;
  try {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify({ ts: new Date().toISOString(), ...metrics })}\n`, 'utf8');
  } catch {
    // Observability must never turn a successful ToolJet operation into a failed MCP call.
  }
}

/** Add compact timing metadata to every result. Set TOOLJET_TELEMETRY_PATH for metrics-only JSONL. */
export async function withToolTelemetry(
  tool: string,
  handler: () => Promise<ToolResult>
): Promise<ToolResult> {
  const context: ToolTelemetryContext = { httpRequests: 0, upstreamResponseBytes: 0 };
  const started = performance.now();
  const finish = async (result?: ToolResult): Promise<ToolTelemetryMetrics> => {
    const metrics: ToolTelemetryMetrics = {
      tool,
      duration_ms: Math.round((performance.now() - started) * 10) / 10,
      http_requests: context.httpRequests,
      upstream_response_bytes: context.upstreamResponseBytes,
      result_bytes: result ? Buffer.byteLength(result.content.map((item) => item.text).join(''), 'utf8') : 0,
      warnings: result ? countWarnings(result) : 0,
      error: !result || result.isError === true,
    };
    try { observers.getStore()?.(metrics); } catch { /* Analytics must not affect tool execution. */ }
    await optionallyLog(metrics);
    return metrics;
  };
  let result: ToolResult;
  try {
    result = await storage.run(context, handler);
  } catch (error) {
    await finish();
    throw error;
  }
  const metrics = await finish(result);
  return { ...result, _meta: { ...(result._meta ?? {}), tooljet_metrics: metrics } };
}
